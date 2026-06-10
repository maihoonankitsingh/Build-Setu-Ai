// BUILDSETU_SKILL_LIBRARY_TYPES_V1

export type BuildSetuSkillStatus = "pass" | "review" | "fail";

export type BuildSetuSkillCheck = {
  id: string;
  check: string;
  status: BuildSetuSkillStatus;
  note: string;
  severity?: "info" | "warning" | "blocker";
};

export type BuildSetuSkillReport = {
  skillId: string;
  skillName: string;
  version: string;
  status: BuildSetuSkillStatus;
  total: number;
  blockers: string[];
  warnings: string[];
  checks: BuildSetuSkillCheck[];
  metadata?: Record<string, unknown>;
};

export type BuildSetuPlanningRoom = {
  id?: string;
  name?: string;
  kind?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  note?: string;
};

export type BuildSetuPlanningContext = {
  command?: string;
  projectId?: string;
  projectTitle?: string;
  plot?: {
    widthFt?: number;
    depthFt?: number;
    drawingWidthFt?: number;
    drawingHeightFt?: number;
    facing?: string;
  };
  rooms?: BuildSetuPlanningRoom[];
  requirements?: Record<string, unknown>;
  drawingConvention?: Record<string, unknown>;
};

export type BuildSetuPlanningSkill = {
  id: string;
  name: string;
  version: string;
  category: "geometry" | "human-flow" | "rag" | "render-qa" | "candidate-generator" | "domain-rule";
  run: (context: BuildSetuPlanningContext) => BuildSetuSkillReport;
};

export function createBuildSetuSkillReport(args: {
  skillId: string;
  skillName: string;
  version: string;
  checks: BuildSetuSkillCheck[];
  metadata?: Record<string, unknown>;
}): BuildSetuSkillReport {
  const blockers = args.checks
    .filter((check) => check.status === "fail")
    .map((check) => check.note);

  const warnings = args.checks
    .filter((check) => check.status === "review")
    .map((check) => check.note);

  const total = Math.max(0, 100 - blockers.length * 20 - warnings.length * 6);

  return {
    skillId: args.skillId,
    skillName: args.skillName,
    version: args.version,
    status: blockers.length ? "fail" : warnings.length ? "review" : "pass",
    total,
    blockers,
    warnings,
    checks: args.checks,
    metadata: args.metadata,
  };
}
