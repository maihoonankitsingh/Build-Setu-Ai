// BUILDSETU_COMPACTNESS_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import {
  bsuFindRoom,
  bsuRoomsNear,
  bsuRoomBounds,
  bsuNumber,
} from "./buildsetu-skill-utils";

function label(room: BuildSetuPlanningRoom | null) {
  return room?.name || room?.id || "missing";
}

function nearStrict(a: BuildSetuPlanningRoom | null, b: BuildSetuPlanningRoom | null) {
  return bsuRoomsNear(a, b, 2);
}

function addStrictPair(
  checks: BuildSetuSkillCheck[],
  id: string,
  check: string,
  a: BuildSetuPlanningRoom | null,
  b: BuildSetuPlanningRoom | null,
) {
  const ok = nearStrictOrSharedEdge(a, b);

  checks.push({
    id,
    check,
    status: ok ? "pass" : "fail",
    note: ok
      ? `${label(a)} is compactly connected with ${label(b)}.`
      : `${label(a)} is not compactly connected with ${label(b)}. This creates floating-box planning.`,
    severity: ok ? "info" : "blocker",
  });
}



// BUILDSETU_COMPACTNESS_SHARED_EDGE_AWARE_V1
// Real architecture rule: a real shared wall is stronger than distance-only near checks.
function bsuCompactnessNumberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bsuCompactnessPickNumber(values: unknown[]): number | null {
  for (const value of values) {
    const n = bsuCompactnessNumberOrNull(value);
    if (n !== null) return n;
  }
  return null;
}

function bsuCompactnessRoomRect(room: unknown): { x: number; y: number; width: number; height: number } | null {
  const r = (room ?? {}) as any;
  const b = (r.bounds ?? r.rect ?? r.box ?? r.frame ?? {}) as any;
  const position = (r.position ?? r.origin ?? {}) as any;
  const size = (r.size ?? {}) as any;

  const x = bsuCompactnessPickNumber([r.x, r.left, r.minX, b.x, b.left, b.minX, position.x]);
  const y = bsuCompactnessPickNumber([r.y, r.top, r.minY, b.y, b.top, b.minY, position.y]);

  const right = bsuCompactnessPickNumber([r.right, r.maxX, b.right, b.maxX]);
  const bottom = bsuCompactnessPickNumber([r.bottom, r.maxY, b.bottom, b.maxY]);

  let width = bsuCompactnessPickNumber([r.width, r.w, b.width, b.w, size.width, size.w]);
  let height = bsuCompactnessPickNumber([r.height, r.h, b.height, b.h, size.height, size.h]);

  if (x !== null && right !== null && width === null) width = right - x;
  if (y !== null && bottom !== null && height === null) height = bottom - y;

  if (x === null || y === null || width === null || height === null) return null;
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height };
}

function bsuCompactnessSharedEdgeOverlapFt(roomA: unknown, roomB: unknown): number {
  const a = bsuCompactnessRoomRect(roomA);
  const b = bsuCompactnessRoomRect(roomB);
  if (!a || !b) return 0;

  const eps = 0.001;
  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const aBottom = a.y + a.height;
  const bBottom = b.y + b.height;

  const verticalTouch =
    Math.abs(aRight - b.x) <= eps ||
    Math.abs(bRight - a.x) <= eps;

  if (verticalTouch) {
    return Math.max(0, Math.min(aBottom, bBottom) - Math.max(a.y, b.y));
  }

  const horizontalTouch =
    Math.abs(aBottom - b.y) <= eps ||
    Math.abs(bBottom - a.y) <= eps;

  if (horizontalTouch) {
    return Math.max(0, Math.min(aRight, bRight) - Math.max(a.x, b.x));
  }

  return 0;
}

function bsuCompactnessRoomsShareRealEdge(roomA: unknown, roomB: unknown, minOverlapFt = 2): boolean {
  return bsuCompactnessSharedEdgeOverlapFt(roomA, roomB) >= minOverlapFt;
}

function nearStrictOrSharedEdge(roomA: unknown, roomB: unknown, distanceFt = 2, minOverlapFt = 2): boolean {
  return nearStrict(roomA as any, roomB as any) || bsuCompactnessRoomsShareRealEdge(roomA, roomB, minOverlapFt);
}

export const buildSetuCompactnessSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.compactness.v1",
  name: "BuildSetu Compact Human Layout Skill",
  version: "1.0.0",
  category: "human-flow",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 57);
    const height = bsuNumber(context.plot?.drawingHeightFt || context.plot?.depthFt || 49);
    const plotArea = width * height;

    const living = bsuFindRoom(rooms, [/living/]);
    const dining = bsuFindRoom(rooms, [/dining/]);
    const kitchen = bsuFindRoom(rooms, [/kitchen/]);
    const wash = bsuFindRoom(rooms, [/wash/, /store/]);
    const bedroom = bsuFindRoom(rooms, [/bedroom/, /bed1/]);
    const bathroom = bsuFindRoom(rooms, [/bath/, /toilet/]);
    const lobby = bsuFindRoom(rooms, [/lobby/, /entry/]);
    const passage = bsuFindRoom(rooms, [/passage/]);
    const stair = bsuFindRoom(rooms, [/stair/]);
    const parking = bsuFindRoom(rooms, [/parking/, /car/]);
    const puja = bsuFindRoom(rooms, [/puja/, /pooja/]);

    const checks: BuildSetuSkillCheck[] = [];

    addStrictPair(checks, "compact-living-dining", "Living and dining should be compactly connected", living, dining);
    addStrictPair(checks, "compact-dining-kitchen", "Dining and kitchen should share a compact service relationship", dining, kitchen);
    addStrictPair(checks, "compact-kitchen-wash", "Kitchen and wash/store should be compactly connected", kitchen, wash);
    addStrictPair(checks, "compact-bedroom-bathroom", "Bedroom and bathroom should be compactly connected", bedroom, bathroom);
    addStrictPair(checks, "compact-passage-stair", "Passage and staircase should be compactly connected", passage, stair);
    addStrictPair(checks, "compact-parking-lobby", "Parking and lobby should be compactly connected", parking, lobby);
    addStrictPair(checks, "compact-puja-living", "Puja should not float away from public zone", puja, living);

    const isolatedRooms = rooms.filter((room) => {
      const neighbours = rooms.filter((other) => other !== room && nearStrictOrSharedEdge(room, other));
      return neighbours.length === 0;
    });

    checks.push({
      id: "no-floating-rooms",
      check: "No room should float as an isolated box",
      status: isolatedRooms.length ? "fail" : "pass",
      note: isolatedRooms.length
        ? `Floating isolated rooms: ${isolatedRooms.map((room) => room.name || room.id || "room").join(", ")}`
        : "No isolated floating rooms detected.",
      severity: isolatedRooms.length ? "blocker" : "info",
    });

    const roomArea = rooms.reduce((sum, room) => sum + bsuRoomBounds(room).area, 0);
    const density = plotArea > 0 ? Math.round((roomArea / plotArea) * 100) : 0;

    checks.push({
      id: "layout-density-compactness",
      check: "Layout should use plot area without excessive dead voids",
      status: density >= 50 && density <= 80 ? "pass" : "review",
      note: density >= 50 && density <= 80
        ? `Layout density is practical: ${density}%.`
        : `Layout density needs review: ${density}%.`,
      severity: density >= 50 && density <= 80 ? "info" : "warning",
    });

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: {
        plotArea,
        roomArea,
        density,
        strictNearGapFt: 2,
      },
    });
  },
};
