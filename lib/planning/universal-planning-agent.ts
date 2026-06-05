import type { UniversalPlanningResult } from "./universal-types";
import { parseUniversalRequirement } from "./requirement-parser";
import { getBuildingRules, getSpaceProgram } from "./building-type-rules";
import { buildZoningStrategy } from "./space-program-engine";
import { runVastuEngine } from "./vastu-engine";
import { buildWorkingDrawings } from "./working-drawing-engine";
import { buildDimensionUnderstandingPromptBlock, understandBuildSetuDimensions } from "./dimension-understanding-engine";
import { buildPlanningMissingQuestionEngine, buildPlanningMissingQuestionPromptBlock } from "./missing-question-engine";
import { buildBuildingTypeClassifierPromptBlock, classifyBuildSetuBuildingType } from "./building-type-classifier";
import { buildPlanningModeQuestionPromptBlock, buildPlanningModeQuestionTuning } from "./planning-mode-question-tuner";
import { buildHumanPlanningResponse, buildHumanPlanningResponsePromptBlock } from "./human-planning-response-formatter";
import { buildConceptPlanningActionEngine, buildConceptPlanningActionPromptBlock } from "./concept-planning-action-engine";
import { buildRoomFurnitureFitEngine, buildRoomFurnitureFitPromptBlock } from "./room-furniture-fit-engine";
import { buildRoomSpaceStandardsEngine, buildRoomSpaceStandardsPromptBlock } from "./room-space-standards-engine";
import { buildPlanningCategoryIntelligenceEngine, buildPlanningCategoryIntelligencePromptBlock } from "./planning-category-intelligence-engine";
import { buildPlanningReferenceIntelligenceEngine, buildPlanningReferenceIntelligencePromptBlock } from "./planning-reference-intelligence-engine";
import { buildPlanningProjectMemoryEngine, buildPlanningProjectMemoryPromptBlock } from "./planning-project-memory-engine";
import { buildPlanningOutputRoutingEngine, buildPlanningOutputRoutingPromptBlock } from "./planning-output-routing-engine";
import { buildPlanningRegressionQaEngine, buildPlanningRegressionQaPromptBlock } from "./planning-regression-qa-engine";
import { buildPlanningUiConsumptionAdapter, buildPlanningUiConsumptionPromptBlock } from "./planning-ui-consumption-adapter";
import { buildStructuralGridIntelligenceEngine, buildStructuralGridIntelligencePromptBlock } from "./structural-grid-intelligence-engine";
import { buildFoundationSoilRiskEngine, buildFoundationSoilRiskPromptBlock } from "./foundation-soil-risk-engine";
import { buildSeismicWindRiskEngine, buildSeismicWindRiskPromptBlock } from "./seismic-wind-risk-engine";

type UniversalPlanningAgentInput = {
  prompt?: string;
  message?: string;
  userText?: string;
  // BUILDSETU_PHASE_47C_PROJECT_ID_INPUT_TYPE
  projectId?: string;
  projectTitle?: string;
  projectName?: string;
  project?: unknown;
  projectContext?: unknown;
  [key: string]: unknown;
};

// BUILDSETU_PHASE_47A2_DIMENSION_CONTEXT_INJECTION
function getPlanningInputText(input: UniversalPlanningAgentInput) {
  return String(input.userText || input.message || input.prompt || input.projectTitle || input.projectName || "").trim();
}

function buildUniversalPlanningDimensionContext(inputText: string) {
  const dimensionResult = understandBuildSetuDimensions(inputText);
  const promptBlock = buildDimensionUnderstandingPromptBlock(inputText);

  return {
    promptBlock,
    summary: dimensionResult.summary,
    pairs: dimensionResult.pairs.slice(0, 20).map((item) => ({
      raw: item.raw,
      intent: item.intent,
      widthFeet: item.width.feet,
      depthFeet: item.depth.feet,
      areaSqFt: item.areaSqFt,
      confidence: item.confidence,
    })),
    singles: dimensionResult.singles.slice(0, 20).map((item) => ({
      raw: item.raw,
      intent: item.intent,
      feet: item.length.feet,
      mm: item.length.mm,
      confidence: item.confidence,
    })),
    warnings: dimensionResult.warnings,
  };
}

export async function runUniversalPlanningAgent(input: UniversalPlanningAgentInput): Promise<UniversalPlanningResult & { dimensionUnderstanding: ReturnType<typeof buildUniversalPlanningDimensionContext>; planningMissingQuestionEngine: ReturnType<typeof buildPlanningMissingQuestionEngine>; buildingTypeClassification: ReturnType<typeof classifyBuildSetuBuildingType>; planningModeQuestionTuning: ReturnType<typeof buildPlanningModeQuestionTuning>; humanPlanningResponse: ReturnType<typeof buildHumanPlanningResponse>; conceptPlanningActionEngine: ReturnType<typeof buildConceptPlanningActionEngine>; roomFurnitureFitEngine: ReturnType<typeof buildRoomFurnitureFitEngine>; roomSpaceStandardsEngine: ReturnType<typeof buildRoomSpaceStandardsEngine>; planningCategoryIntelligence: ReturnType<typeof buildPlanningCategoryIntelligenceEngine>; planningReferenceIntelligence: ReturnType<typeof buildPlanningReferenceIntelligenceEngine>; planningProjectMemoryEngine: ReturnType<typeof buildPlanningProjectMemoryEngine>; planningOutputRoutingEngine: ReturnType<typeof buildPlanningOutputRoutingEngine>; planningRegressionQaEngine: ReturnType<typeof buildPlanningRegressionQaEngine>; planningUiConsumptionAdapter: ReturnType<typeof buildPlanningUiConsumptionAdapter>; structuralGridIntelligence: ReturnType<typeof buildStructuralGridIntelligenceEngine>; foundationSoilRiskEngine: ReturnType<typeof buildFoundationSoilRiskEngine>; seismicWindRiskEngine: ReturnType<typeof buildSeismicWindRiskEngine> }> {
  const inputText = getPlanningInputText(input);
  const dimensionUnderstanding = buildUniversalPlanningDimensionContext(inputText);

  const { requirement, missingQuestions: parsedMissingQuestions } = parseUniversalRequirement(input);
  const planningMissingQuestionEngine = buildPlanningMissingQuestionEngine({
    inputText,
    parsedMissingQuestions,
    dimensionUnderstanding,
  });
  const missingQuestions = planningMissingQuestionEngine.mergedMissingQuestions;
  const missingQuestionPromptBlock = buildPlanningMissingQuestionPromptBlock(planningMissingQuestionEngine);
  const buildingTypeClassification = classifyBuildSetuBuildingType({
    inputText,
    dimensionUnderstanding,
    missingQuestionEngine: planningMissingQuestionEngine,
  });
  const buildingTypePromptBlock = buildBuildingTypeClassifierPromptBlock(buildingTypeClassification);
  const planningModeQuestionTuning = buildPlanningModeQuestionTuning({
    inputText,
    buildingTypeClassification,
    missingQuestionEngine: planningMissingQuestionEngine,
    dimensionUnderstanding,
  });
  const planningModeQuestionPromptBlock = buildPlanningModeQuestionPromptBlock(planningModeQuestionTuning);
  const conceptPlanningActionEngine = buildConceptPlanningActionEngine({
    inputText,
    dimensionUnderstanding,
    planningMissingQuestionEngine,
    buildingTypeClassification,
    planningModeQuestionTuning,
  });
  const conceptPlanningActionPromptBlock = buildConceptPlanningActionPromptBlock(conceptPlanningActionEngine);
  const roomFurnitureFitEngine = buildRoomFurnitureFitEngine({
    inputText,
    dimensionUnderstanding,
    buildingTypeClassification,
  });
  const roomFurnitureFitPromptBlock = buildRoomFurnitureFitPromptBlock(roomFurnitureFitEngine);
  const roomSpaceStandardsEngine = buildRoomSpaceStandardsEngine({
    inputText,
    dimensionUnderstanding,
    roomFurnitureFitEngine,
    buildingTypeClassification,
  });
  const roomSpaceStandardsPromptBlock = buildRoomSpaceStandardsPromptBlock(roomSpaceStandardsEngine);
  const planningCategoryIntelligence = buildPlanningCategoryIntelligenceEngine({
    inputText,
    dimensionUnderstanding,
    planningMissingQuestionEngine,
    buildingTypeClassification,
    planningModeQuestionTuning,
    conceptPlanningActionEngine,
    roomSpaceStandardsEngine,
  });
  const planningCategoryIntelligencePromptBlock = buildPlanningCategoryIntelligencePromptBlock(planningCategoryIntelligence);
  const structuralGridIntelligence = buildStructuralGridIntelligenceEngine({
    inputText,
    dimensionUnderstanding,
    buildingTypeClassification,
    planningCategoryIntelligence,
  });
  const structuralGridIntelligencePromptBlock = buildStructuralGridIntelligencePromptBlock(structuralGridIntelligence);
  const foundationSoilRiskEngine = buildFoundationSoilRiskEngine({
    inputText,
    structuralGridIntelligence,
    buildingTypeClassification,
  });
  const foundationSoilRiskPromptBlock = buildFoundationSoilRiskPromptBlock(foundationSoilRiskEngine);
  const seismicWindRiskEngine = buildSeismicWindRiskEngine({
    inputText,
    structuralGridIntelligence,
    foundationSoilRiskEngine,
    buildingTypeClassification,
  });
  const seismicWindRiskPromptBlock = buildSeismicWindRiskPromptBlock(seismicWindRiskEngine);

  const planningReferenceIntelligence = buildPlanningReferenceIntelligenceEngine({
    inputText,
    buildingTypeClassification,
    planningCategoryIntelligence,
  });
  const planningReferenceIntelligencePromptBlock = buildPlanningReferenceIntelligencePromptBlock(planningReferenceIntelligence);
  const planningOutputRoutingEngine = buildPlanningOutputRoutingEngine({
    inputText,
    buildingTypeClassification,
    conceptPlanningActionEngine,
    planningReferenceIntelligence,
    roomFurnitureFitEngine,
  });
  const planningOutputRoutingPromptBlock = buildPlanningOutputRoutingPromptBlock(planningOutputRoutingEngine);
  const planningProjectMemoryEngine = buildPlanningProjectMemoryEngine({
    inputText,
    projectId: input.projectId,
    dimensionUnderstanding,
    buildingTypeClassification,
    planningCategoryIntelligence,
    planningReferenceIntelligence,
  });
  const planningProjectMemoryPromptBlock = buildPlanningProjectMemoryPromptBlock(planningProjectMemoryEngine);
  const humanPlanningResponse = buildHumanPlanningResponse({
    inputText,
    dimensionUnderstanding,
    planningMissingQuestionEngine,
    buildingTypeClassification,
    planningModeQuestionTuning,
    conceptPlanningActionEngine,
    roomFurnitureFitEngine,
    roomSpaceStandardsEngine,
    planningCategoryIntelligence,
    planningReferenceIntelligence,
    planningProjectMemoryEngine,
    planningOutputRoutingEngine,
  });
  const humanPlanningResponsePromptBlock = buildHumanPlanningResponsePromptBlock(humanPlanningResponse);
  const planningRegressionQaEngine = buildPlanningRegressionQaEngine({
    dimensionUnderstanding,
    planningMissingQuestionEngine,
    buildingTypeClassification,
    planningModeQuestionTuning,
    humanPlanningResponse,
    conceptPlanningActionEngine,
    roomFurnitureFitEngine,
    roomSpaceStandardsEngine,
    planningCategoryIntelligence,
    planningReferenceIntelligence,
    planningProjectMemoryEngine,
    planningOutputRoutingEngine,
  });
  const planningRegressionQaPromptBlock = buildPlanningRegressionQaPromptBlock(planningRegressionQaEngine);
  const planningUiConsumptionAdapter = buildPlanningUiConsumptionAdapter({
    humanPlanningResponse,
    planningOutputRoutingEngine,
    planningProjectMemoryEngine,
    planningRegressionQaEngine,
    planningReferenceIntelligence,
  });
  const planningUiConsumptionPromptBlock = buildPlanningUiConsumptionPromptBlock(planningUiConsumptionAdapter);
  const spaceProgram = getSpaceProgram(requirement);
  const vastuReport = runVastuEngine(requirement, spaceProgram);
  const buildingRules = getBuildingRules(requirement);
  const zoningStrategy = buildZoningStrategy(requirement, spaceProgram);
  const workingPlans = buildWorkingDrawings(requirement);

  const status = planningMissingQuestionEngine.criticalQuestions.length > 0 ? "need_more_details" : "ready_to_plan";

  const assistantMessage =
    status === "need_more_details"
      ? [
          "Planning package banane ke liye kuch required details missing hain.",
          "",
          "Dimension Understanding",
          dimensionUnderstanding.promptBlock,
          "",
          "Building Type Classification",
          buildingTypePromptBlock,
          "",
          "Human Planning Response",
          humanPlanningResponsePromptBlock,
          "",
          "Concept Planning Action Engine",
          conceptPlanningActionPromptBlock,
          "",
          "Room Furniture Fit Engine",
          roomFurnitureFitPromptBlock,
          "",
          "Room Space Standards Engine",
          roomSpaceStandardsPromptBlock,
          "",
          "Planning Category Intelligence",
          planningCategoryIntelligencePromptBlock,
          "",
          "Planning Reference Intelligence",
          planningReferenceIntelligencePromptBlock,
          "",
          "Project Planning Memory",
          planningProjectMemoryPromptBlock,
          "",
          "Planning Output Routing",
          planningOutputRoutingPromptBlock,
          "",
          "Planning QA Regression Matrix",
          planningRegressionQaPromptBlock,
          "",
          "Structural Grid Intelligence",
          structuralGridIntelligencePromptBlock,
          "",
          "Foundation Soil Risk Intelligence",
          foundationSoilRiskPromptBlock,
          "",
          "Seismic Wind Risk Intelligence",
          seismicWindRiskPromptBlock,
          "",
          "Planning UI Consumption Adapter",
          planningUiConsumptionPromptBlock,
          "",
          "Structural Grid Intelligence",
          structuralGridIntelligencePromptBlock,
          "",
          "Foundation Soil Risk Intelligence",
          foundationSoilRiskPromptBlock,
          "",
          "Seismic Wind Risk Intelligence",
          seismicWindRiskPromptBlock,
          "",
          "Planning UI Consumption Adapter",
          planningUiConsumptionPromptBlock,
          "",
          "Project Planning Memory",
          planningProjectMemoryPromptBlock,
          "",
          "Planning Output Routing",
          planningOutputRoutingPromptBlock,
          "",
          "Planning QA Regression Matrix",
          planningRegressionQaPromptBlock,
          "",
          "Planning Reference Intelligence",
          planningReferenceIntelligencePromptBlock,
          "",
          "Planning Category Intelligence",
          planningCategoryIntelligencePromptBlock,
          "",
          "Room Space Standards Engine",
          roomSpaceStandardsPromptBlock,
          "",
          "Room Furniture Fit Engine",
          roomFurnitureFitPromptBlock,
          "",
          "Concept Planning Action Engine",
          conceptPlanningActionPromptBlock,
          "",
          "Human Planning Response",
          humanPlanningResponsePromptBlock,
          "",
          "Planning Mode Question Tuning",
          planningModeQuestionPromptBlock,
          "",
          "Planning Mode Question Tuning",
          planningModeQuestionPromptBlock,
          "",
          "Building Type Classification",
          buildingTypePromptBlock,
          "",
          "Planning Missing Questions",
          missingQuestionPromptBlock,
          "",
          "Planning Missing Questions",
          missingQuestionPromptBlock,
        ].join("\n")
      : [
          `${requirement.projectType} / ${requirement.subType} ke liye universal planning package ready hai. Vastu, zoning, space program aur requested working plans prepare ho gaye.`,
          "",
          "Dimension Understanding",
          dimensionUnderstanding.promptBlock,
        ].join("\n");

  return {
    ok: true,
    source: "universal_planning_agent_v1",
    status,
    assistantMessage,
    missingQuestions,
    requirement,
    dimensionUnderstanding,
    planningMissingQuestionEngine,
    buildingTypeClassification,
    planningModeQuestionTuning,
    humanPlanningResponse,
    conceptPlanningActionEngine,
    roomFurnitureFitEngine,
    roomSpaceStandardsEngine,
    planningCategoryIntelligence,
    planningReferenceIntelligence,
    planningProjectMemoryEngine,
    planningOutputRoutingEngine,
    planningRegressionQaEngine,
    planningUiConsumptionAdapter,
    structuralGridIntelligence,
    foundationSoilRiskEngine,
    seismicWindRiskEngine,
    buildingRules,
    vastuReport,
    spaceProgram,
    zoningStrategy,
    workingPlans,
    safetyNotes: [
      "Ye planning/concept/working-drawing package automation output hai.",
      "Final architectural approval, local bylaws, setbacks, FAR/FSI, fire norms and accessibility norms licensed architect se verify karne honge.",
      "Column, beam, slab, footing and structural sizes final nahi hain; licensed structural engineer load calculation ke baad final kare.",
      "Electrical, plumbing and drainage layouts concept level hain; final MEP sizing and execution site conditions ke hisaab se verify hoga.",
    ],
  };
}
