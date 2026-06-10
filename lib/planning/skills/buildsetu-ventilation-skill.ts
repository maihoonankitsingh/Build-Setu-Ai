// BUILDSETU_VENTILATION_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import { bsuFindRoom, bsuNumber, bsuRoomBounds } from "./buildsetu-skill-utils";

function hasExteriorAccess(room: BuildSetuPlanningRoom | null, width: number, height: number, tolerance = 3) {
  if (!room) return false;
  const b = bsuRoomBounds(room);
  return b.x <= tolerance || b.y <= tolerance || b.right >= width - tolerance || b.bottom >= height - tolerance;
}

function ventilationCheck(
  id: string,
  label: string,
  room: BuildSetuPlanningRoom | null,
  width: number,
  height: number,
  severity: "fail" | "review" = "review",
): BuildSetuSkillCheck {
  const ok = hasExteriorAccess(room, width, height);
  return {
    id,
    check: `${label} should have exterior ventilation potential`,
    status: ok ? "pass" : severity,
    note: ok ? `${label} has exterior wall/edge access potential.` : `${label} may need shaft/window/duct planning for ventilation.`,
    severity: ok ? "info" : severity === "fail" ? "blocker" : "warning",
  };
}

export const buildSetuVentilationSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.ventilation.v1",
  name: "BuildSetu Ventilation Skill",
  version: "1.0.0",
  category: "domain-rule",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 57);
    const height = bsuNumber(context.plot?.drawingHeightFt || context.plot?.depthFt || 49);

    const living = bsuFindRoom(rooms, [/living/]);
    const bedroom = bsuFindRoom(rooms, [/bedroom/, /bed1/]);
    const bathroom = bsuFindRoom(rooms, [/bath/, /toilet/]);
    const kitchen = bsuFindRoom(rooms, [/kitchen/]);
    const wash = bsuFindRoom(rooms, [/wash/, /store/]);

    const checks: BuildSetuSkillCheck[] = [
      ventilationCheck("living-ventilation", "Living room", living, width, height, "review"),
      ventilationCheck("bedroom-ventilation", "Bedroom", bedroom, width, height, "review"),
      ventilationCheck("bathroom-ventilation", "Bathroom", bathroom, width, height, "review"),
      ventilationCheck("kitchen-ventilation", "Kitchen", kitchen, width, height, "review"),
      ventilationCheck("wash-store-ventilation", "Wash/store", wash, width, height, "review"),
    ];

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: { width, height },
    });
  },
};
