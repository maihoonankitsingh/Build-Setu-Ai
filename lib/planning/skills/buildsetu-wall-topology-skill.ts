// BUILDSETU_WALL_TOPOLOGY_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import { bsuFindRoom, bsuRoomBounds } from "./buildsetu-skill-utils";

function label(room: BuildSetuPlanningRoom | null) {
  return room?.name || room?.id || "missing";
}

function overlapLength(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function hasSharedEdge(a: BuildSetuPlanningRoom | null, b: BuildSetuPlanningRoom | null, minOverlapFt = 2) {
  if (!a || !b) return false;

  const A = bsuRoomBounds(a);
  const B = bsuRoomBounds(b);
  const eps = 0.05;

  const verticalTouch = Math.abs(A.right - B.x) <= eps || Math.abs(B.right - A.x) <= eps;
  const horizontalTouch = Math.abs(A.bottom - B.y) <= eps || Math.abs(B.bottom - A.y) <= eps;

  const verticalOverlap = overlapLength(A.y, A.bottom, B.y, B.bottom);
  const horizontalOverlap = overlapLength(A.x, A.right, B.x, B.right);

  return (
    (verticalTouch && verticalOverlap >= minOverlapFt) ||
    (horizontalTouch && horizontalOverlap >= minOverlapFt)
  );
}

function addSharedEdgeCheck(
  checks: BuildSetuSkillCheck[],
  id: string,
  check: string,
  a: BuildSetuPlanningRoom | null,
  b: BuildSetuPlanningRoom | null,
  minOverlapFt = 2,
) {
  const ok = hasSharedEdge(a, b, minOverlapFt);

  checks.push({
    id,
    check,
    status: ok ? "pass" : "fail",
    note: ok
      ? `${label(a)} shares a real wall/edge with ${label(b)}.`
      : `${label(a)} does not share a proper wall/edge with ${label(b)}. Near-only adjacency is not enough for architectural planning.`,
    severity: ok ? "info" : "blocker",
  });
}

export const buildSetuWallTopologySkill: BuildSetuPlanningSkill = {
  id: "buildsetu.wall-topology.v1",
  name: "BuildSetu Wall Topology Skill",
  version: "1.0.0",
  category: "geometry",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];

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

    addSharedEdgeCheck(checks, "shared-edge-puja-living", "Puja should share wall/edge with living/public zone", puja, living);
    addSharedEdgeCheck(checks, "shared-edge-living-dining", "Living should share wall/edge with dining", living, dining);
    addSharedEdgeCheck(checks, "shared-edge-dining-kitchen", "Dining should share wall/edge with kitchen", dining, kitchen);
    addSharedEdgeCheck(checks, "shared-edge-kitchen-wash", "Kitchen should share wall/edge with wash/store", kitchen, wash);
    addSharedEdgeCheck(checks, "shared-edge-parking-lobby", "Parking should share wall/edge with lobby", parking, lobby);
    addSharedEdgeCheck(checks, "shared-edge-dining-passage", "Dining should share wall/edge with passage/circulation", dining, passage);
    addSharedEdgeCheck(checks, "shared-edge-passage-stair", "Passage should share wall/edge with staircase", passage, stair);
    addSharedEdgeCheck(checks, "shared-edge-bedroom-bathroom", "Bedroom should share wall/edge with bathroom", bedroom, bathroom);
    addSharedEdgeCheck(checks, "shared-edge-bathroom-passage", "Bathroom should share wall/edge with passage", bathroom, passage);

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: {
        rule: "key adjacency must be shared-edge, not only near-distance",
        minSharedEdgeOverlapFt: 2,
      },
    });
  },
};
