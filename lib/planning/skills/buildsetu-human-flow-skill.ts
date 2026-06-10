// BUILDSETU_HUMAN_FLOW_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
} from "./buildsetu-skill-types";
import { bsuFindRoom, bsuRoomsNear, bsuRoomsBy, bsuNumber } from "./buildsetu-skill-utils";

function flowCheck(id: string, check: string, ok: boolean, passNote: string, failNote: string): BuildSetuSkillCheck {
  return {
    id,
    check,
    status: ok ? "pass" : "fail",
    note: ok ? passNote : failNote,
    severity: ok ? "info" : "blocker",
  };
}

export const buildSetuHumanFlowSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.human-flow.v1",
  name: "BuildSetu Human Flow Skill",
  version: "1.0.0",
  category: "human-flow",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const command = String(context.command || "").toLowerCase();
    const isGround = command.includes("ground");

    const living = bsuFindRoom(rooms, [/living/]);
    const dining = bsuFindRoom(rooms, [/dining/]);
    const kitchen = bsuFindRoom(rooms, [/kitchen/]);
    const wash = bsuFindRoom(rooms, [/wash/, /store/]);
    const bedroom = bsuFindRoom(rooms, [/bedroom/, /bed1/]);
    const bathroom = bsuFindRoom(rooms, [/bath/, /toilet/]);
    const parking = bsuFindRoom(rooms, [/parking/, /car/]);
    const lobby = bsuFindRoom(rooms, [/lobby/, /entry/]);
    const passage = bsuFindRoom(rooms, [/passage/]);
    const stair = bsuFindRoom(rooms, [/stair/]);
    const puja = bsuFindRoom(rooms, [/puja/, /pooja/]);

    const checks: BuildSetuSkillCheck[] = [];

    if (isGround) {
      const mandatory: Array<[string, unknown]> = [
        ["living", living],
        ["dining", dining],
        ["kitchen", kitchen],
        ["wash/store", wash],
        ["bedroom", bedroom],
        ["bathroom", bathroom],
        ["parking", parking],
        ["entry/lobby", lobby],
        ["staircase", stair],
        ["puja", puja],
      ];

      for (const [label, room] of mandatory) {
        checks.push(flowCheck(
          `mandatory-${label}`,
          `Mandatory ${label}`,
          Boolean(room),
          `${label} exists.`,
          `${label} missing.`,
        ));
      }

      checks.push(flowCheck(
        "entry-public-flow",
        "Entry should connect to public circulation",
        bsuRoomsNear(lobby, living, 6) || bsuRoomsNear(lobby, passage, 4) || bsuRoomsNear(lobby, parking, 4),
        "Entry/lobby connects to public circulation.",
        "Entry/lobby is disconnected from living/passage/parking.",
      ));

      checks.push(flowCheck(
        "living-dining-flow",
        "Living should flow to dining",
        bsuRoomsNear(living, dining, 5) || (bsuRoomsNear(living, passage, 4) && bsuRoomsNear(passage, dining, 4)),
        "Living connects to dining directly or through passage.",
        "Living is isolated from dining/circulation.",
      ));

      checks.push(flowCheck(
        "dining-kitchen-flow",
        "Dining must be near kitchen",
        bsuRoomsNear(dining, kitchen, 6) || (bsuRoomsNear(dining, passage, 3) && bsuRoomsNear(passage, kitchen, 6)),
        "Dining is functionally close to kitchen.",
        "Dining is too far from kitchen.",
      ));

      checks.push(flowCheck(
        "kitchen-wash-flow",
        "Kitchen should connect to wash/store",
        bsuRoomsNear(kitchen, wash, 4),
        "Kitchen and wash/store have service adjacency.",
        "Kitchen and wash/store are not adjacent.",
      ));

      checks.push(flowCheck(
        "bedroom-bathroom-flow",
        "Bedroom should access bathroom",
        bsuRoomsNear(bedroom, bathroom, 5) || (bsuRoomsNear(bedroom, passage, 3) && bsuRoomsNear(passage, bathroom, 5)),
        "Bedroom has practical bathroom access.",
        "Bedroom and bathroom relationship is weak.",
      ));

      checks.push(flowCheck(
        "stair-circulation-flow",
        "Staircase must connect to circulation",
        bsuRoomsNear(stair, lobby, 5) || bsuRoomsNear(stair, passage, 5) || bsuRoomsNear(stair, living, 5),
        "Staircase is reachable from circulation.",
        "Staircase is isolated.",
      ));

      const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 57);
      const bedrooms = bsuRoomsBy(rooms, /bedroom/);
      const bathrooms = bsuRoomsBy(rooms, /bath|toilet/);
      const parkingRooms = bsuRoomsBy(rooms, /parking|car/);

      checks.push({
        id: "parking-front-side-review",
        check: "Parking should be on front/east side",
        status: parking && bsuNumber(parking.x) + bsuNumber(parking.w) >= width - 4 ? "pass" : "review",
        note: parking && bsuNumber(parking.x) + bsuNumber(parking.w) >= width - 4
          ? "Parking is near East/front side."
          : "Parking may not align with front access.",
        severity: "warning",
      });

      checks.push(flowCheck(
        "ground-room-count",
        "Ground floor room count",
        bedrooms.length === 1 && bathrooms.length === 1 && parkingRooms.length === 1,
        "Ground room count is valid.",
        `Ground count mismatch: bedrooms=${bedrooms.length}, bathrooms=${bathrooms.length}, parking=${parkingRooms.length}`,
      ));
    }

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: { command, roomCount: rooms.length },
    });
  },
};
