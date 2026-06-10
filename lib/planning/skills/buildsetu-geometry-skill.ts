// BUILDSETU_GEOMETRY_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
} from "./buildsetu-skill-types";
import { bsuNumber, bsuRoomBounds, bsuRoomOverlapArea } from "./buildsetu-skill-utils";

export const buildSetuGeometrySkill: BuildSetuPlanningSkill = {
  id: "buildsetu.geometry.v1",
  name: "BuildSetu Geometry Skill",
  version: "1.0.0",
  category: "geometry",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 0);
    const height = bsuNumber(context.plot?.drawingHeightFt || context.plot?.depthFt || 0);

    const checks: BuildSetuSkillCheck[] = [];

    checks.push({
      id: "plot-dimensions-present",
      check: "Plot drawing dimensions must exist",
      status: width > 0 && height > 0 ? "pass" : "fail",
      note: width > 0 && height > 0 ? `Drawing bounds ${width} x ${height}.` : "Drawing width/height missing.",
      severity: width > 0 && height > 0 ? "info" : "blocker",
    });

    const outOfBounds = rooms.filter((room) => {
      const bounds = bsuRoomBounds(room);
      return bounds.x < 0 || bounds.y < 0 || bounds.right > width || bounds.bottom > height;
    });

    checks.push({
      id: "rooms-inside-plot",
      check: "All rooms must fit inside plot",
      status: outOfBounds.length ? "fail" : "pass",
      note: outOfBounds.length
        ? `Out-of-bounds rooms: ${outOfBounds.map((room) => room.name || room.id || "room").join(", ")}`
        : "All rooms fit inside plot.",
      severity: outOfBounds.length ? "blocker" : "info",
    });

    const overlappingPairs: string[] = [];
    for (let i = 0; i < rooms.length; i += 1) {
      for (let j = i + 1; j < rooms.length; j += 1) {
        const area = bsuRoomOverlapArea(rooms[i], rooms[j]);
        if (area > 0.25) {
          overlappingPairs.push(`${rooms[i].name || rooms[i].id} overlaps ${rooms[j].name || rooms[j].id}`);
        }
      }
    }

    checks.push({
      id: "rooms-no-overlap",
      check: "Rooms must not overlap",
      status: overlappingPairs.length ? "fail" : "pass",
      note: overlappingPairs.length ? overlappingPairs.join("; ") : "No room overlaps detected.",
      severity: overlappingPairs.length ? "blocker" : "info",
    });

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: { width, height, roomCount: rooms.length },
    });
  },
};
