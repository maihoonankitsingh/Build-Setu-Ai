// BUILDSETU_VASTU_PREFERENCE_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import { bsuFindRoom, bsuNumber } from "./buildsetu-skill-utils";

function inNorthBand(room: BuildSetuPlanningRoom | null) {
  return Boolean(room && bsuNumber(room.y) <= 12);
}

function inSouthWestBand(room: BuildSetuPlanningRoom | null, height: number) {
  return Boolean(room && bsuNumber(room.y) + bsuNumber(room.h) >= height - 8 && bsuNumber(room.x) <= 20);
}

function inSouthEastBand(room: BuildSetuPlanningRoom | null, width: number, height: number) {
  return Boolean(room && bsuNumber(room.x) + bsuNumber(room.w) >= width - 10 && bsuNumber(room.y) + bsuNumber(room.h) >= height - 18);
}

export const buildSetuVastuPreferenceSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.vastu-preference.v1",
  name: "BuildSetu Vastu Preference Skill",
  version: "1.0.0",
  category: "domain-rule",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 57);
    const height = bsuNumber(context.plot?.drawingHeightFt || context.plot?.depthFt || 49);

    const puja = bsuFindRoom(rooms, [/puja/, /pooja/]);
    const kitchen = bsuFindRoom(rooms, [/kitchen/]);
    const bedroom = bsuFindRoom(rooms, [/bedroom/, /bed1/]);

    const checks: BuildSetuSkillCheck[] = [
      {
        id: "puja-north-east-preference",
        check: "Puja should prefer north/east/north-east zone",
        status: inNorthBand(puja) ? "pass" : "review",
        note: inNorthBand(puja) ? "Puja is in a north-side band." : "Puja is outside preferred north/east/north-east band.",
        severity: inNorthBand(puja) ? "info" : "warning",
      },
      {
        id: "bedroom-south-west-preference",
        check: "Bedroom should prefer south-west/private zone",
        status: inSouthWestBand(bedroom, height) ? "pass" : "review",
        note: inSouthWestBand(bedroom, height) ? "Bedroom is in a south-west/private band." : "Bedroom is outside preferred south-west/private band.",
        severity: inSouthWestBand(bedroom, height) ? "info" : "warning",
      },
      {
        id: "kitchen-south-east-preference",
        check: "Kitchen should prefer south/east service zone where possible",
        status: inSouthEastBand(kitchen, width, height) ? "pass" : "review",
        note: inSouthEastBand(kitchen, width, height) ? "Kitchen is in a south/east service band." : "Kitchen is usable but outside preferred south/east service band.",
        severity: "warning",
      },
    ];

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: { width, height, note: "Vastu checks are preferences, not legal/structural approval." },
    });
  },
};
