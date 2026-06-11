// BUILDSETU_SKILL_REGISTRY_V6

import type {
  BuildSetuPlanningContext,
  BuildSetuPlanningSkill,
  BuildSetuSkillReport,
} from "./buildsetu-skill-types";
import { buildSetuPlanningRagSkill } from "./buildsetu-planning-rag-skill";
import { buildSetuGeometrySkill } from "./buildsetu-geometry-skill";
import { buildSetuPolygonGeometrySkill } from "./buildsetu-polygon-geometry-skill";
import { buildSetuWallTopologySkill } from "./buildsetu-wall-topology-skill";
import { buildSetuBuildingEnvelopeSkill } from "./buildsetu-building-envelope-skill";
import { buildSetuRoomProgramSkill } from "./buildsetu-room-program-skill";
import { buildSetuLayoutCandidateGeneratorSkill } from "./buildsetu-layout-candidate-generator-skill";
import { buildSetuHumanFlowSkill } from "./buildsetu-human-flow-skill";
import { buildSetuCompactnessSkill } from "./buildsetu-compactness-skill";
import { buildSetuCirculationGraphSkill } from "./buildsetu-circulation-graph-skill";
import { buildSetuVastuPreferenceSkill } from "./buildsetu-vastu-preference-skill";
import { buildSetuVentilationSkill } from "./buildsetu-ventilation-skill";

import { buildSetuDoorTopologySkill } from "./buildsetu-door-topology-skill";
import { buildSetuWindowVentilationSkill } from "./buildsetu-window-ventilation-skill";
import { buildSetuWetPlumbingSkill } from "./buildsetu-wet-plumbing-skill";
import { buildSetuStairCoreSkill } from "./buildsetu-stair-core-skill";
import { buildSetuParkingEntrySkill } from "./buildsetu-parking-entry-skill";
import { buildSetuProfessionalOutputContractSkill } from "./buildsetu-professional-output-contract-skill";
export const buildSetuPlanningSkills: BuildSetuPlanningSkill[] = [
  buildSetuPlanningRagSkill,
  buildSetuGeometrySkill,
  buildSetuPolygonGeometrySkill,
  buildSetuWallTopologySkill,
  buildSetuBuildingEnvelopeSkill,
  buildSetuDoorTopologySkill,
  buildSetuWindowVentilationSkill,
  buildSetuWetPlumbingSkill,
  buildSetuStairCoreSkill,
  buildSetuParkingEntrySkill,
  buildSetuProfessionalOutputContractSkill,
  buildSetuRoomProgramSkill,
  buildSetuLayoutCandidateGeneratorSkill,
  buildSetuHumanFlowSkill,
  buildSetuCompactnessSkill,
  buildSetuCirculationGraphSkill,
  buildSetuVastuPreferenceSkill,
  buildSetuVentilationSkill,
];

export function runBuildSetuPlanningSkills(context: BuildSetuPlanningContext): BuildSetuSkillReport[] {
  return buildSetuPlanningSkills.map((skill) => skill.run(context));
}

export function summarizeBuildSetuSkillReports(reports: BuildSetuSkillReport[]) {
  const blockers = reports.flatMap((report) => report.blockers.map((note) => `${report.skillName}: ${note}`));
  const warnings = reports.flatMap((report) => report.warnings.map((note) => `${report.skillName}: ${note}`));
  const failed = reports.filter((report) => report.status === "fail");
  const review = reports.filter((report) => report.status === "review");
  const totals = reports.length ? reports.map((report) => report.total) : [100];

  return {
    status: failed.length ? "fail" as const : review.length ? "review" as const : "pass" as const,
    total: Math.max(0, Math.min(...totals)),
    blockers,
    warnings,
    reports,
  };
}
