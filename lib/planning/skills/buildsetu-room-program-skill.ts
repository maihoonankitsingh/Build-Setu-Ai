// BUILDSETU_ROOM_PROGRAM_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import { bsuFindRoom, bsuRoomBounds, bsuRoomsBy } from "./buildsetu-skill-utils";

function area(room: BuildSetuPlanningRoom | null) {
  if (!room) return 0;
  const b = bsuRoomBounds(room);
  return b.area;
}

function checkMinArea(
  checks: BuildSetuSkillCheck[],
  id: string,
  label: string,
  room: BuildSetuPlanningRoom | null,
  minArea: number,
  severity: "fail" | "review" = "fail",
) {
  const a = area(room);
  const ok = Boolean(room) && a >= minArea;

  checks.push({
    id,
    check: `${label} minimum usable area`,
    status: ok ? "pass" : severity,
    note: ok
      ? `${label} area is usable: ${Math.round(a)} sq ft.`
      : `${label} is missing or undersized. Current area: ${Math.round(a)} sq ft, expected at least ${minArea} sq ft.`,
    severity: ok ? "info" : severity === "fail" ? "blocker" : "warning",
  });
}

export const buildSetuRoomProgramSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.room-program.v1",
  name: "BuildSetu Room Program Skill",
  version: "1.0.0",
  category: "domain-rule",
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
    const stair = bsuFindRoom(rooms, [/stair/]);
    const puja = bsuFindRoom(rooms, [/puja/, /pooja/]);

    const checks: BuildSetuSkillCheck[] = [];

    if (isGround) {
      checkMinArea(checks, "living-min-area", "Living room", living, 150);
      checkMinArea(checks, "dining-min-area", "Dining", dining, 90);
      checkMinArea(checks, "kitchen-min-area", "Kitchen", kitchen, 80);
      checkMinArea(checks, "bedroom-min-area", "Bedroom", bedroom, 110);
      checkMinArea(checks, "bathroom-min-area", "Bathroom", bathroom, 35);
      checkMinArea(checks, "parking-min-area", "Parking", parking, 180);
      checkMinArea(checks, "stair-min-area", "Staircase", stair, 85, "review");
      checkMinArea(checks, "puja-min-area", "Puja", puja, 20, "review");
      checkMinArea(checks, "wash-store-min-area", "Wash/store", wash, 35, "review");

      const bedrooms = bsuRoomsBy(rooms, /bedroom/);
      const bathrooms = bsuRoomsBy(rooms, /bath|toilet/);
      const parkingRooms = bsuRoomsBy(rooms, /parking|car/);

      checks.push({
        id: "ground-program-count",
        check: "Ground floor program count",
        status: bedrooms.length === 1 && bathrooms.length === 1 && parkingRooms.length === 1 ? "pass" : "fail",
        note: bedrooms.length === 1 && bathrooms.length === 1 && parkingRooms.length === 1
          ? "Ground program count matches: 1 bedroom, 1 bathroom, 1 parking."
          : `Ground program mismatch: bedrooms=${bedrooms.length}, bathrooms=${bathrooms.length}, parking=${parkingRooms.length}.`,
        severity: bedrooms.length === 1 && bathrooms.length === 1 && parkingRooms.length === 1 ? "info" : "blocker",
      });
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
