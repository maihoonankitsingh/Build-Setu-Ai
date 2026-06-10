// BUILDSETU_POLYGON_GEOMETRY_SKILL_V2
// External OSS skill dependency: polygon-clipping

import * as polygonClippingImport from "polygon-clipping";
import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import { bsuNumber, bsuRoomBounds } from "./buildsetu-skill-utils";

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

type PolygonClippingApi = {
  intersection: (...geometries: MultiPolygon[]) => MultiPolygon;
};

function getPolygonClippingApi(): PolygonClippingApi | null {
  const mod = polygonClippingImport as unknown as Record<string, unknown>;
  const directIntersection = mod.intersection;
  const defaultExport = mod.default as Record<string, unknown> | undefined;
  const defaultIntersection = defaultExport?.intersection;

  const intersection =
    typeof directIntersection === "function"
      ? directIntersection
      : typeof defaultIntersection === "function"
        ? defaultIntersection
        : null;

  if (!intersection) return null;

  return {
    intersection: intersection as PolygonClippingApi["intersection"],
  };
}

function rectMultiPolygon(x: number, y: number, w: number, h: number): MultiPolygon {
  const right = x + w;
  const bottom = y + h;

  return [[[
    [x, y],
    [right, y],
    [right, bottom],
    [x, bottom],
    [x, y],
  ]]];
}

function ringArea(ring: Ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function polygonArea(polygon: Polygon) {
  return polygon.reduce((total, ring, index) => {
    const area = ringArea(ring);
    return index === 0 ? total + area : total - area;
  }, 0);
}

function multiPolygonArea(multi: MultiPolygon) {
  return multi.reduce((sum, polygon) => sum + Math.max(0, polygonArea(polygon)), 0);
}

function safeIntersectionArea(api: PolygonClippingApi | null, a: MultiPolygon, b: MultiPolygon) {
  if (!api) return Number.NaN;

  try {
    const result = api.intersection(a, b);
    return multiPolygonArea(Array.isArray(result) ? result : []);
  } catch {
    return Number.NaN;
  }
}

function roomName(room: BuildSetuPlanningRoom) {
  return room.name || room.id || "room";
}

export const buildSetuPolygonGeometrySkill: BuildSetuPlanningSkill = {
  id: "buildsetu.polygon-geometry.v1",
  name: "BuildSetu Polygon Geometry Skill",
  version: "1.0.1",
  category: "geometry",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 0);
    const height = bsuNumber(context.plot?.drawingHeightFt || context.plot?.depthFt || 0);

    const api = getPolygonClippingApi();
    const checks: BuildSetuSkillCheck[] = [];
    const plot = rectMultiPolygon(0, 0, width, height);

    checks.push({
      id: "polygon-clipping-api-ready",
      check: "polygon-clipping intersection API should be available",
      status: api ? "pass" : "fail",
      note: api ? "polygon-clipping intersection API resolved." : "polygon-clipping intersection API could not be resolved.",
      severity: api ? "info" : "blocker",
    });

    const invalidRooms: string[] = [];
    const outsideRooms: string[] = [];

    for (const room of rooms) {
      const bounds = bsuRoomBounds(room);
      if (bounds.w <= 0 || bounds.h <= 0 || bounds.area <= 0) {
        invalidRooms.push(roomName(room));
        continue;
      }

      const roomPoly = rectMultiPolygon(bounds.x, bounds.y, bounds.w, bounds.h);
      const clippedArea = safeIntersectionArea(api, roomPoly, plot);

      if (!Number.isFinite(clippedArea)) {
        invalidRooms.push(`${roomName(room)} polygon intersection failed`);
        continue;
      }

      if (Math.abs(clippedArea - bounds.area) > 0.1) {
        outsideRooms.push(`${roomName(room)} area=${Math.round(bounds.area)} clipped=${Math.round(clippedArea)}`);
      }
    }

    checks.push({
      id: "polygon-room-validity",
      check: "Rooms should produce valid rectangular polygons",
      status: invalidRooms.length ? "fail" : "pass",
      note: invalidRooms.length ? `Invalid room polygons: ${invalidRooms.join("; ")}` : "All room polygons are valid.",
      severity: invalidRooms.length ? "blocker" : "info",
    });

    checks.push({
      id: "polygon-plot-containment",
      check: "Room polygons must be fully contained inside plot polygon",
      status: outsideRooms.length ? "fail" : "pass",
      note: outsideRooms.length ? `Rooms outside plot polygon: ${outsideRooms.join("; ")}` : "All room polygons are contained inside plot polygon.",
      severity: outsideRooms.length ? "blocker" : "info",
    });

    const overlappingPairs: string[] = [];

    for (let i = 0; i < rooms.length; i += 1) {
      for (let j = i + 1; j < rooms.length; j += 1) {
        const a = bsuRoomBounds(rooms[i]);
        const b = bsuRoomBounds(rooms[j]);

        if (a.area <= 0 || b.area <= 0) continue;

        const area = safeIntersectionArea(
          api,
          rectMultiPolygon(a.x, a.y, a.w, a.h),
          rectMultiPolygon(b.x, b.y, b.w, b.h),
        );

        if (Number.isFinite(area) && area > 0.25) {
          overlappingPairs.push(`${roomName(rooms[i])} overlaps ${roomName(rooms[j])}: ${Math.round(area)} sq ft`);
        }
      }
    }

    checks.push({
      id: "polygon-room-overlap",
      check: "Room polygons must not overlap",
      status: overlappingPairs.length ? "fail" : "pass",
      note: overlappingPairs.length ? overlappingPairs.join("; ") : "No polygon overlap detected.",
      severity: overlappingPairs.length ? "blocker" : "info",
    });

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: {
        externalLibrary: "polygon-clipping",
        apiResolved: Boolean(api),
        plotPolygonArea: width * height,
        roomCount: rooms.length,
      },
    });
  },
};
