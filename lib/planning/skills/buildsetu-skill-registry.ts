// BUILDSETU_SKILL_REGISTRY_V1

import type {
  BuildSetuPlanningContext,
  BuildSetuPlanningSkill,
  BuildSetuSkillReport,
} from "./buildsetu-skill-types";
import { buildSetuGeometrySkill } from "./buildsetu-geometry-skill";
import { buildSetuHumanFlowSkill } from "./buildsetu-human-flow-skill";

export const buildSetuPlanningSkills: BuildSetuPlanningSkill[] = [
  buildSetuGeometrySkill,
  buildSetuHumanFlowSkill,
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
