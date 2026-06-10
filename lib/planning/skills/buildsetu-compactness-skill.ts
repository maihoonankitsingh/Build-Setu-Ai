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
  const ok = nearStrict(a, b);

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
      const neighbours = rooms.filter((other) => other !== room && nearStrict(room, other));
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
