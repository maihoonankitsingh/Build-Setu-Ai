// BUILDSETU_PHASE_47P1_PLANNING_QA_REGRESSION_ENGINE

type AnyObj = Record<string, any>;

export type BuildSetuPlanningQaStatus = "pass" | "warn" | "fail";

export type BuildSetuPlanningQaCheck = {
  id: string;
  status: BuildSetuPlanningQaStatus;
  message: string;
};

export type BuildSetuPlanningRegressionQaResult = {
  engineVersion: "47P-1";
  overallStatus: BuildSetuPlanningQaStatus;
  checks: BuildSetuPlanningQaCheck[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
};

function add(checks: BuildSetuPlanningQaCheck[], id: string, status: BuildSetuPlanningQaStatus, message: string) {
  checks.push({ id, status, message });
}

function hasArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function buildPlanningRegressionQaEngine(input: {
  dimensionUnderstanding?: AnyObj;
  planningMissingQuestionEngine?: AnyObj;
  buildingTypeClassification?: AnyObj;
  planningModeQuestionTuning?: AnyObj;
  humanPlanningResponse?: AnyObj;
  conceptPlanningActionEngine?: AnyObj;
  roomFurnitureFitEngine?: AnyObj;
  roomSpaceStandardsEngine?: AnyObj;
  planningCategoryIntelligence?: AnyObj;
  planningReferenceIntelligence?: AnyObj;
  planningProjectMemoryEngine?: AnyObj;
  planningOutputRoutingEngine?: AnyObj;
}): BuildSetuPlanningRegressionQaResult {
  const checks: BuildSetuPlanningQaCheck[] = [];

  add(checks, "dimension-engine", input.dimensionUnderstanding?.summary ? "pass" : "fail", "Dimension understanding summary should exist.");
  add(checks, "missing-question-engine", input.planningMissingQuestionEngine ? "pass" : "fail", "Missing question engine should exist.");
  add(checks, "building-classifier", input.buildingTypeClassification?.planningMode ? "pass" : "fail", "Building classifier should detect planning mode.");
  add(checks, "mode-question-tuning", input.planningModeQuestionTuning?.mode ? "pass" : "fail", "Planning mode question tuning should exist.");
  add(checks, "human-response", input.humanPlanningResponse?.markdown ? "pass" : "fail", "Human response markdown should exist.");
  add(checks, "concept-action", input.conceptPlanningActionEngine?.actionMode ? "pass" : "fail", "Concept planning action engine should exist.");
  add(checks, "room-fit", input.roomFurnitureFitEngine ? "pass" : "fail", "Room/furniture fit engine should exist.");
  add(checks, "standards", input.roomSpaceStandardsEngine ? "pass" : "fail", "Room/space standards engine should exist.");
  add(checks, "category-intelligence", input.planningCategoryIntelligence?.engineVersion ? "pass" : "fail", "Category intelligence should exist.");
  add(checks, "reference-intelligence", input.planningReferenceIntelligence?.engineVersion ? "pass" : "fail", "Reference intelligence should exist.");
  add(checks, "memory-versioning", input.planningProjectMemoryEngine?.engineVersion ? "pass" : "fail", "Project memory/versioning engine should exist.");
  add(checks, "output-routing", input.planningOutputRoutingEngine?.engineVersion ? "pass" : "fail", "Output routing engine should exist.");

  add(
    checks,
    "human-layout-section",
    hasArray(input.humanPlanningResponse?.sections?.layoutPatternSuggestions) ? "pass" : "warn",
    "Human response should include layout pattern section."
  );

  add(
    checks,
    "human-reference-section",
    hasArray(input.humanPlanningResponse?.sections?.referenceUnderstanding) ? "pass" : "warn",
    "Human response should include reference understanding section."
  );

  add(
    checks,
    "human-routing-memory-section",
    hasArray(input.humanPlanningResponse?.sections?.outputTaskRouting) && hasArray(input.humanPlanningResponse?.sections?.projectMemoryVersioning) ? "pass" : "warn",
    "Human response should include output routing and project memory sections."
  );

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };

  const overallStatus: BuildSetuPlanningQaStatus =
    summary.fail > 0 ? "fail" : summary.warn > 0 ? "warn" : "pass";

  return {
    engineVersion: "47P-1",
    overallStatus,
    checks,
    summary,
  };
}

export function buildPlanningRegressionQaPromptBlock(result: BuildSetuPlanningRegressionQaResult): string {
  const lines: string[] = [];

  lines.push("PLANNING QA REGRESSION MATRIX:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Overall status: ${result.overallStatus}`);
  lines.push(`- Pass: ${result.summary.pass}`);
  lines.push(`- Warn: ${result.summary.warn}`);
  lines.push(`- Fail: ${result.summary.fail}`);

  result.checks.slice(0, 20).forEach((check) => {
    lines.push(`- ${check.id}: ${check.status} — ${check.message}`);
  });

  return lines.join("\n");
}
