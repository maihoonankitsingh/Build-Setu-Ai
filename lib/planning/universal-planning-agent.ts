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
import { buildSourceWatchAwarenessEngine, buildSourceWatchAwarenessPromptBlock } from "./source-watch-awareness-engine";
import { buildPlanningUiConsumptionAdapter, buildPlanningUiConsumptionPromptBlock } from "./planning-ui-consumption-adapter";
import { buildStructuralGridIntelligenceEngine, buildStructuralGridIntelligencePromptBlock } from "./structural-grid-intelligence-engine";
import { buildFoundationSoilRiskEngine, buildFoundationSoilRiskPromptBlock } from "./foundation-soil-risk-engine";
import { buildSeismicWindRiskEngine, buildSeismicWindRiskPromptBlock } from "./seismic-wind-risk-engine";
import { buildStructuralResponseMergeEngine, buildStructuralResponseMergePromptBlock, buildStructuralResponseMarkdown } from "./structural-response-merge-engine";
import { buildMaterialTaxonomyEngine, buildMaterialTaxonomyPromptBlock } from "./material-taxonomy-engine";
import { buildInteriorMaterialSelectorEngine, buildInteriorMaterialSelectorPromptBlock } from "./interior-material-selector-engine";
import { buildFurnitureQuantityBasisEngine, buildFurnitureQuantityBasisPromptBlock } from "./furniture-quantity-basis-engine";
import { buildMaterialPriceSourceFreshnessEngine, buildMaterialPriceSourceFreshnessPromptBlock } from "./material-price-source-freshness-engine";
import { buildMaterialWebSearchRateAdapter, buildMaterialWebSearchRateAdapterPromptBlock } from "./material-web-search-rate-adapter";
import { buildBoqMaterialMappingEngine, buildBoqMaterialMappingPromptBlock } from "./boq-material-mapping-engine";
import { buildMaterialResponseMergeEngine, buildMaterialResponseMergePromptBlock, buildMaterialResponseMarkdown } from "./material-response-merge-engine";
import { buildMaterialWebSearchSourceCaptureEngine, buildMaterialWebSearchSourceCapturePromptBlock } from "./material-web-search-source-capture-engine";
import { buildUniversalWebUpdatePolicyEngine, buildUniversalWebUpdatePolicyPromptBlock } from "./universal-web-update-policy-engine";
import { buildWebUpdateUiActionEngine, buildWebUpdateUiActionPromptBlock } from "./web-update-ui-action-engine";
import { buildWebUpdateBrowserExecutionAdapter, buildWebUpdateBrowserExecutionPromptBlock } from "./web-update-browser-execution-adapter";
import { buildWebUpdateSourceSignalReviewEngine, buildWebUpdateSourceSignalReviewPromptBlock } from "./web-update-source-signal-review-engine";
import { buildBoqSourceAttachWorkflowEngine, buildBoqSourceAttachWorkflowPromptBlock } from "./boq-source-attach-workflow-engine";
import { buildBoqFinalRateApprovalWorkflowEngine, buildBoqFinalRateApprovalWorkflowPromptBlock } from "./boq-final-rate-approval-workflow-engine";

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

export async function runUniversalPlanningAgent(input: UniversalPlanningAgentInput): Promise<UniversalPlanningResult & { dimensionUnderstanding: ReturnType<typeof buildUniversalPlanningDimensionContext>; planningMissingQuestionEngine: ReturnType<typeof buildPlanningMissingQuestionEngine>; buildingTypeClassification: ReturnType<typeof classifyBuildSetuBuildingType>; planningModeQuestionTuning: ReturnType<typeof buildPlanningModeQuestionTuning>; humanPlanningResponse: ReturnType<typeof buildHumanPlanningResponse>; conceptPlanningActionEngine: ReturnType<typeof buildConceptPlanningActionEngine>; roomFurnitureFitEngine: ReturnType<typeof buildRoomFurnitureFitEngine>; roomSpaceStandardsEngine: ReturnType<typeof buildRoomSpaceStandardsEngine>; planningCategoryIntelligence: ReturnType<typeof buildPlanningCategoryIntelligenceEngine>; planningReferenceIntelligence: ReturnType<typeof buildPlanningReferenceIntelligenceEngine>; planningProjectMemoryEngine: ReturnType<typeof buildPlanningProjectMemoryEngine>; planningOutputRoutingEngine: ReturnType<typeof buildPlanningOutputRoutingEngine>; planningRegressionQaEngine: ReturnType<typeof buildPlanningRegressionQaEngine>; sourceWatchAwarenessEngine: ReturnType<typeof buildSourceWatchAwarenessEngine>; planningUiConsumptionAdapter: ReturnType<typeof buildPlanningUiConsumptionAdapter>; structuralGridIntelligence: ReturnType<typeof buildStructuralGridIntelligenceEngine>; foundationSoilRiskEngine: ReturnType<typeof buildFoundationSoilRiskEngine>; seismicWindRiskEngine: ReturnType<typeof buildSeismicWindRiskEngine>; structuralResponseMergeEngine: ReturnType<typeof buildStructuralResponseMergeEngine>; materialTaxonomyEngine: ReturnType<typeof buildMaterialTaxonomyEngine>; interiorMaterialSelectorEngine: ReturnType<typeof buildInteriorMaterialSelectorEngine>; furnitureQuantityBasisEngine: ReturnType<typeof buildFurnitureQuantityBasisEngine>; materialPriceSourceFreshnessEngine: ReturnType<typeof buildMaterialPriceSourceFreshnessEngine>; materialWebSearchRateAdapter: ReturnType<typeof buildMaterialWebSearchRateAdapter>; boqMaterialMappingEngine: ReturnType<typeof buildBoqMaterialMappingEngine>; materialResponseMergeEngine: ReturnType<typeof buildMaterialResponseMergeEngine>; materialWebSearchSourceCaptureEngine: ReturnType<typeof buildMaterialWebSearchSourceCaptureEngine>; universalWebUpdatePolicyEngine: ReturnType<typeof buildUniversalWebUpdatePolicyEngine>; webUpdateUiActionEngine: ReturnType<typeof buildWebUpdateUiActionEngine>; webUpdateBrowserExecutionAdapter: ReturnType<typeof buildWebUpdateBrowserExecutionAdapter>; webUpdateSourceSignalReviewEngine: ReturnType<typeof buildWebUpdateSourceSignalReviewEngine>; boqSourceAttachWorkflowEngine: ReturnType<typeof buildBoqSourceAttachWorkflowEngine>; boqFinalRateApprovalWorkflowEngine: ReturnType<typeof buildBoqFinalRateApprovalWorkflowEngine> }> {
  const inputText = getPlanningInputText(input);
  const sourceWatchAwarenessEngine = buildSourceWatchAwarenessEngine(inputText);
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
  const structuralResponseMergeEngine = buildStructuralResponseMergeEngine({
    structuralGridIntelligence,
    foundationSoilRiskEngine,
    seismicWindRiskEngine,
  });
  const structuralResponseMergePromptBlock = buildStructuralResponseMergePromptBlock(structuralResponseMergeEngine);
  const materialTaxonomyEngine = buildMaterialTaxonomyEngine({
    inputText,
    buildingTypeClassification,
  });
  const materialTaxonomyPromptBlock = buildMaterialTaxonomyPromptBlock(materialTaxonomyEngine);
  const interiorMaterialSelectorEngine = buildInteriorMaterialSelectorEngine({
    inputText,
    materialTaxonomyEngine,
  });
  const interiorMaterialSelectorPromptBlock = buildInteriorMaterialSelectorPromptBlock(interiorMaterialSelectorEngine);
  const furnitureQuantityBasisEngine = buildFurnitureQuantityBasisEngine({
    inputText,
    materialTaxonomyEngine,
    interiorMaterialSelectorEngine,
  });
  const furnitureQuantityBasisPromptBlock = buildFurnitureQuantityBasisPromptBlock(furnitureQuantityBasisEngine);
  const materialPriceSourceFreshnessEngine = buildMaterialPriceSourceFreshnessEngine({
    inputText,
    materialTaxonomyEngine,
    interiorMaterialSelectorEngine,
    furnitureQuantityBasisEngine,
  });
  const materialPriceSourceFreshnessPromptBlock = buildMaterialPriceSourceFreshnessPromptBlock(materialPriceSourceFreshnessEngine);
  const materialWebSearchRateAdapter = buildMaterialWebSearchRateAdapter({
    inputText,
    materialTaxonomyEngine,
    furnitureQuantityBasisEngine,
    materialPriceSourceFreshnessEngine,
  });
  const materialWebSearchRateAdapterPromptBlock = buildMaterialWebSearchRateAdapterPromptBlock(materialWebSearchRateAdapter);
  const boqMaterialMappingEngine = buildBoqMaterialMappingEngine({
    inputText,
    materialTaxonomyEngine,
    interiorMaterialSelectorEngine,
    furnitureQuantityBasisEngine,
    materialPriceSourceFreshnessEngine,
    materialWebSearchRateAdapter,
  });
  const boqMaterialMappingPromptBlock = buildBoqMaterialMappingPromptBlock(boqMaterialMappingEngine);
  const materialResponseMergeEngine = buildMaterialResponseMergeEngine({
    materialTaxonomyEngine,
    interiorMaterialSelectorEngine,
    furnitureQuantityBasisEngine,
    materialPriceSourceFreshnessEngine,
    materialWebSearchRateAdapter,
    boqMaterialMappingEngine,
  });
  const materialResponseMergePromptBlock = buildMaterialResponseMergePromptBlock(materialResponseMergeEngine);
  const materialWebSearchSourceCaptureEngine = buildMaterialWebSearchSourceCaptureEngine({
    materialWebSearchRateAdapter,
    materialPriceSourceFreshnessEngine,
  });
  const materialWebSearchSourceCapturePromptBlock = buildMaterialWebSearchSourceCapturePromptBlock(materialWebSearchSourceCaptureEngine);
  const universalWebUpdatePolicyEngine = buildUniversalWebUpdatePolicyEngine({
    inputText,
    materialPriceSourceFreshnessEngine,
    materialWebSearchSourceCaptureEngine,
    buildingTypeClassification,
    planningCategoryIntelligence,
    structuralResponseMergeEngine,
  });
  const universalWebUpdatePolicyPromptBlock = buildUniversalWebUpdatePolicyPromptBlock(universalWebUpdatePolicyEngine);
  const webUpdateUiActionEngine = buildWebUpdateUiActionEngine({
    universalWebUpdatePolicyEngine,
    materialWebSearchSourceCaptureEngine,
    boqMaterialMappingEngine,
  });
  const webUpdateUiActionPromptBlock = buildWebUpdateUiActionPromptBlock(webUpdateUiActionEngine);
  const webUpdateBrowserExecutionAdapter = buildWebUpdateBrowserExecutionAdapter({
    webUpdateUiActionEngine,
    universalWebUpdatePolicyEngine,
    materialWebSearchSourceCaptureEngine,
  });
  const webUpdateBrowserExecutionPromptBlock = buildWebUpdateBrowserExecutionPromptBlock(webUpdateBrowserExecutionAdapter);
  const webUpdateSourceSignalReviewEngine = buildWebUpdateSourceSignalReviewEngine({
    webUpdateBrowserExecutionAdapter,
    universalWebUpdatePolicyEngine,
    boqMaterialMappingEngine,
  });
  const webUpdateSourceSignalReviewPromptBlock = buildWebUpdateSourceSignalReviewPromptBlock(webUpdateSourceSignalReviewEngine);
  const boqSourceAttachWorkflowEngine = buildBoqSourceAttachWorkflowEngine({
    webUpdateSourceSignalReviewEngine,
    boqMaterialMappingEngine,
  });
  const boqSourceAttachWorkflowPromptBlock = buildBoqSourceAttachWorkflowPromptBlock(boqSourceAttachWorkflowEngine);
  const boqFinalRateApprovalWorkflowEngine = buildBoqFinalRateApprovalWorkflowEngine({
    boqSourceAttachWorkflowEngine,
    boqMaterialMappingEngine,
    materialPriceSourceFreshnessEngine,
  });
  const boqFinalRateApprovalWorkflowPromptBlock = buildBoqFinalRateApprovalWorkflowPromptBlock(boqFinalRateApprovalWorkflowEngine);

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
  // BUILDSETU_PHASE_G4_FIX3_STRUCTURAL_RESPONSE_AFTER_HUMAN_RESPONSE
  const humanPlanningResponseForStructuralMerge: any = humanPlanningResponse as any;
  humanPlanningResponseForStructuralMerge.sections = {
    ...(humanPlanningResponseForStructuralMerge.sections || {}),
    structuralCoordination: structuralResponseMergeEngine.sectionItems,
    structuralNextActions: structuralResponseMergeEngine.nextActions,
  };
  humanPlanningResponseForStructuralMerge.markdown = [
    String(humanPlanningResponseForStructuralMerge.markdown || "").trim(),
    buildStructuralResponseMarkdown(structuralResponseMergeEngine),
  ].filter(Boolean).join("\n\n");

  // BUILDSETU_PHASE_M7_MATERIAL_RESPONSE_AFTER_HUMAN_RESPONSE
  const humanPlanningResponseForMaterialMerge: any = humanPlanningResponse as any;
  humanPlanningResponseForMaterialMerge.sections = {
    ...(humanPlanningResponseForMaterialMerge.sections || {}),
    materialSelection: materialResponseMergeEngine.materialSections.materialSelection,
    materialInteriorGuidance: materialResponseMergeEngine.materialSections.interiorGuidance,
    materialQuantityBasis: materialResponseMergeEngine.materialSections.quantityBasis,
    materialPriceSourcePolicy: materialResponseMergeEngine.materialSections.priceSourcePolicy,
    materialWebSearchPlan: materialResponseMergeEngine.materialSections.webSearchPlan,
    materialBoqMapping: materialResponseMergeEngine.materialSections.boqMaterialMapping,
    materialMissingInputs: materialResponseMergeEngine.materialSections.missingInputs,
  };
  humanPlanningResponseForMaterialMerge.markdown = [
    String(humanPlanningResponseForMaterialMerge.markdown || "").trim(),
    buildMaterialResponseMarkdown(materialResponseMergeEngine),
  ].filter(Boolean).join("\n\n");

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
  const sourceWatchAwarenessPromptBlock = buildSourceWatchAwarenessPromptBlock(sourceWatchAwarenessEngine);
  // BUILDSETU_PHASE_47A7_SURFACE_SOURCE_WATCH_AWARENESS
  const humanPlanningResponseForSourceWatch: any = humanPlanningResponse as any;
  humanPlanningResponseForSourceWatch.sections = {
    ...(humanPlanningResponseForSourceWatch.sections || {}),
    sourceWatchLiveUpdateAwareness: [
      `Inbox available: ${sourceWatchAwarenessEngine.available}`,
      `Triggered: ${sourceWatchAwarenessEngine.triggered}`,
      `Last checked: ${sourceWatchAwarenessEngine.latestCheckedAt || "unknown"}`,
      `Pending source update drafts: ${sourceWatchAwarenessEngine.pendingSourceUpdateDrafts}`,
      `Latest changed sources: ${sourceWatchAwarenessEngine.latestChangedSources}`,
      `Latest failed source checks: ${sourceWatchAwarenessEngine.latestFailedSources}`,
      "Policy: source-watch updates are awareness only until reviewed and QA-approved.",
      "Trusted knowledge write: false",
      "Trusted merge executed: false",
      "Merge action available: false",
    ],
    sourceWatchLatestChangedSources: sourceWatchAwarenessEngine.latestChanged.map((item) => `${item.title || item.id} | ${item.reason || "changed"} | ${item.url || "URL unavailable"}`),
    sourceWatchPendingDrafts: sourceWatchAwarenessEngine.pendingDrafts.map((item) => `${item.title || "Untitled source update"} | status=${item.status || "unknown"} | risk=${item.riskLevel || "unknown"}`),
    sourceWatchFailedChecks: sourceWatchAwarenessEngine.latestFailed.map((item) => `${item.title || item.id} | ${item.error || "fetch failed"}`),
  };
  // BUILDSETU_PHASE_M8C_WEB_UPDATE_POLICY_AFTER_HUMAN_RESPONSE
  const humanPlanningResponseForWebPolicy: any = humanPlanningResponse as any;
  humanPlanningResponseForWebPolicy.sections = {
    ...(humanPlanningResponseForWebPolicy.sections || {}),
    webUpdateTopics: universalWebUpdatePolicyEngine.updateTopics.map((topic) => `${topic.label} | ${topic.topicGroup} | freshness ${topic.freshnessWindowDays} days`),
    webUpdatePriorityQueries: universalWebUpdatePolicyEngine.priorityQueries.map((item) => `${item.label}: ${item.query}`),
    webUpdateAnswerPolicy: universalWebUpdatePolicyEngine.answerPolicy,
    webUpdateFreshnessPolicy: universalWebUpdatePolicyEngine.freshnessPolicy,
    webUpdateConfidencePolicy: universalWebUpdatePolicyEngine.confidencePolicy,
  };

  // BUILDSETU_PHASE_M8D_WEB_UPDATE_UI_ACTION_SECTIONS
  const humanPlanningResponseForWebActions: any = humanPlanningResponse as any;
  humanPlanningResponseForWebActions.sections = {
    ...(humanPlanningResponseForWebActions.sections || {}),
    webUpdateActionCards: webUpdateUiActionEngine.uiActionCards.map((card) => `${card.title} | ${card.status} | ${card.cta}`),
    webUpdateExecutionPolicy: webUpdateUiActionEngine.executionPolicy,
    webUpdateSourceReviewPolicy: webUpdateUiActionEngine.sourceReviewPolicy,
    webUpdateNextActions: webUpdateUiActionEngine.nextActions,
  };

  // BUILDSETU_PHASE_M8E_BROWSER_EXECUTION_SECTIONS
  const humanPlanningResponseForBrowserExecution: any = humanPlanningResponse as any;
  humanPlanningResponseForBrowserExecution.sections = {
    ...(humanPlanningResponseForBrowserExecution.sections || {}),
    webUpdateBrowserExecution: webUpdateBrowserExecutionAdapter.actionExecutions.map((item) => `${item.title} | ${item.status} | queries ${item.queryCount}`),
    webUpdateSourceSignalSchema: webUpdateBrowserExecutionAdapter.sourceSignalSchema,
    webUpdateErrorHandling: webUpdateBrowserExecutionAdapter.errorHandling.map((item) => `${item.statusOrCode}: ${item.uiMessage}`),
    webUpdateStorageBoundary: webUpdateBrowserExecutionAdapter.storageBoundary,
  };

  // BUILDSETU_PHASE_M8F_SOURCE_SIGNAL_REVIEW_SECTIONS
  const humanPlanningResponseForSourceSignalReview: any = humanPlanningResponse as any;
  humanPlanningResponseForSourceSignalReview.sections = {
    ...(humanPlanningResponseForSourceSignalReview.sections || {}),
    webUpdateSourceSignalReviewRows: webUpdateSourceSignalReviewEngine.reviewRows.map((row) => `${row.query} | ${row.topicGroup || "general"} | ${row.executionStatus} | ${row.reviewStatus}`),
    webUpdateReviewTableColumns: webUpdateSourceSignalReviewEngine.reviewTableColumns,
    webUpdateFreshnessScoringRules: webUpdateSourceSignalReviewEngine.freshnessScoringRules,
    webUpdateConfidenceScoringRules: webUpdateSourceSignalReviewEngine.confidenceScoringRules,
    webUpdateApprovalWorkflow: webUpdateSourceSignalReviewEngine.approvalWorkflow,
    webUpdateBoqAttachPolicy: webUpdateSourceSignalReviewEngine.boqAttachPolicy,
  };

  // BUILDSETU_PHASE_M8G_BOQ_SOURCE_ATTACH_SECTIONS
  const humanPlanningResponseForBoqSourceAttach: any = humanPlanningResponse as any;
  humanPlanningResponseForBoqSourceAttach.sections = {
    ...(humanPlanningResponseForBoqSourceAttach.sections || {}),
    boqSourceAttachCandidates: boqSourceAttachWorkflowEngine.attachActions.map((item) => `${item.boqItemName} | ${item.attachStatus} | finalRateLocked=${!item.canApproveFinalRate}`),
    boqSourceAttachStateMachine: boqSourceAttachWorkflowEngine.attachStateMachine,
    boqSourceAttachValidationRules: boqSourceAttachWorkflowEngine.attachValidationRules,
    boqSourceAttachFinalRateBoundary: boqSourceAttachWorkflowEngine.finalRateApprovalBoundary,
    boqSourceAttachUiActions: boqSourceAttachWorkflowEngine.uiActions,
  };

  // BUILDSETU_PHASE_M8H_FINAL_RATE_APPROVAL_SECTIONS
  const humanPlanningResponseForFinalRateApproval: any = humanPlanningResponse as any;
  humanPlanningResponseForFinalRateApproval.sections = {
    ...(humanPlanningResponseForFinalRateApproval.sections || {}),
    boqFinalRateApprovalRows: boqFinalRateApprovalWorkflowEngine.approvalRows.map((row) => `${row.boqItemName} | ${row.finalRateStatus} | locked=${row.finalRateLocked}`),
    boqFinalRateApprovalStateMachine: boqFinalRateApprovalWorkflowEngine.approvalStateMachine,
    boqVendorQuotePolicy: boqFinalRateApprovalWorkflowEngine.vendorQuotePolicy,
    boqManualApprovalPolicy: boqFinalRateApprovalWorkflowEngine.manualApprovalPolicy,
    boqSourceVsFinalRateSeparation: boqFinalRateApprovalWorkflowEngine.sourceVsFinalRateSeparation,
    boqFinalRateUiActions: boqFinalRateApprovalWorkflowEngine.uiActions,
  };

  const planningUiConsumptionAdapter = buildPlanningUiConsumptionAdapter({
    humanPlanningResponse,
    planningOutputRoutingEngine,
    planningProjectMemoryEngine,
    planningRegressionQaEngine,
    planningReferenceIntelligence,
  });
  // BUILDSETU_PHASE_M8D_APPEND_WEB_UPDATE_ACTION_CARDS_TO_UI_ADAPTER
  const planningUiConsumptionAdapterForWebUpdate: any = planningUiConsumptionAdapter as any;
  const existingWebUpdateActionCards = Array.isArray(planningUiConsumptionAdapterForWebUpdate.actionCards)
    ? planningUiConsumptionAdapterForWebUpdate.actionCards
    : [];
  const webUpdateCardsForUi = webUpdateUiActionEngine.uiActionCards.map((card) => ({
    id: card.id,
    title: card.title,
    description: card.description,
    status: card.status,
    priority: card.priority,
    cta: card.cta,
    actionType: card.actionType,
    requiresUserSession: card.requiresUserSession,
    requiresCreditCheck: card.requiresCreditCheck,
    endpoint: card.endpoint,
    method: card.method,
    payloadKey: card.payloadKey,
    queryCount: card.queryCount,
    targetTopicGroups: card.targetTopicGroups,
    payloadPreview: card.payloadPreview,
    navigationPath: card.navigationPath,
    blockedReasons: card.blockedReasons,
    boundary: card.boundary,
    source: "web_update_ui_action_engine_m8d",
  }));
  planningUiConsumptionAdapterForWebUpdate.actionCards = [
    ...existingWebUpdateActionCards,
    ...webUpdateCardsForUi,
  ];
  planningUiConsumptionAdapterForWebUpdate.webUpdateActionCards = webUpdateCardsForUi;
  planningUiConsumptionAdapterForWebUpdate.primaryCta =
    planningUiConsumptionAdapterForWebUpdate.primaryCta || webUpdateUiActionEngine.primaryCta;
  planningUiConsumptionAdapterForWebUpdate.apiContractNotes = [
    ...(Array.isArray(planningUiConsumptionAdapterForWebUpdate.apiContractNotes)
      ? planningUiConsumptionAdapterForWebUpdate.apiContractNotes
      : []),
    "UI should render webUpdateActionCards as authenticated browser-session actions.",
    "Do not execute web-search server-side without user session.",
  ];

  // BUILDSETU_PHASE_M8E_APPEND_BROWSER_EXECUTION_TO_UI_ADAPTER
  const planningUiConsumptionAdapterForBrowserExecution: any = planningUiConsumptionAdapter as any;
  planningUiConsumptionAdapterForBrowserExecution.webUpdateBrowserExecutionAdapter = webUpdateBrowserExecutionAdapter;
  planningUiConsumptionAdapterForBrowserExecution.webUpdateExecutionContract = webUpdateBrowserExecutionAdapter.executionContract;
  planningUiConsumptionAdapterForBrowserExecution.webUpdateSourceSignalSchema = webUpdateBrowserExecutionAdapter.sourceSignalSchema;
  planningUiConsumptionAdapterForBrowserExecution.apiContractNotes = [
    ...(Array.isArray(planningUiConsumptionAdapterForBrowserExecution.apiContractNotes)
      ? planningUiConsumptionAdapterForBrowserExecution.apiContractNotes
      : []),
    "UI should execute webUpdateBrowserExecutionAdapter.actionExecutions from browser with credentials include.",
    "UI should normalize web-search responses into webUpdateSourceSignalSchema.",
    "UI should map 401 CREDIT_CHECK_FAILED to login/credits prompt.",
  ];

  // BUILDSETU_PHASE_M8F_APPEND_SOURCE_SIGNAL_REVIEW_TO_UI_ADAPTER
  const planningUiConsumptionAdapterForSourceSignalReview: any = planningUiConsumptionAdapter as any;
  planningUiConsumptionAdapterForSourceSignalReview.webUpdateSourceSignalReviewEngine = webUpdateSourceSignalReviewEngine;
  planningUiConsumptionAdapterForSourceSignalReview.webUpdateSourceSignalReviewRows = webUpdateSourceSignalReviewEngine.reviewRows;
  planningUiConsumptionAdapterForSourceSignalReview.webUpdateReviewTableColumns = webUpdateSourceSignalReviewEngine.reviewTableColumns;
  planningUiConsumptionAdapterForSourceSignalReview.apiContractNotes = [
    ...(Array.isArray(planningUiConsumptionAdapterForSourceSignalReview.apiContractNotes)
      ? planningUiConsumptionAdapterForSourceSignalReview.apiContractNotes
      : []),
    "UI should render webUpdateSourceSignalReviewRows as review table rows.",
    "UI should keep source signal review separate from final BOQ rate approval.",
  ];

  // BUILDSETU_PHASE_M8G_APPEND_BOQ_SOURCE_ATTACH_TO_UI_ADAPTER
  const planningUiConsumptionAdapterForBoqSourceAttach: any = planningUiConsumptionAdapter as any;
  planningUiConsumptionAdapterForBoqSourceAttach.boqSourceAttachWorkflowEngine = boqSourceAttachWorkflowEngine;
  planningUiConsumptionAdapterForBoqSourceAttach.boqSourceAttachActions = boqSourceAttachWorkflowEngine.attachActions;
  planningUiConsumptionAdapterForBoqSourceAttach.apiContractNotes = [
    ...(Array.isArray(planningUiConsumptionAdapterForBoqSourceAttach.apiContractNotes)
      ? planningUiConsumptionAdapterForBoqSourceAttach.apiContractNotes
      : []),
    "UI should render boqSourceAttachActions under BOQ line items.",
    "UI must keep source attach separate from final rate approval.",
    "UI should disable final rate approval until a later approval workflow is completed.",
  ];

  // BUILDSETU_PHASE_M8H_APPEND_FINAL_RATE_APPROVAL_TO_UI_ADAPTER
  const planningUiConsumptionAdapterForFinalRateApproval: any = planningUiConsumptionAdapter as any;
  planningUiConsumptionAdapterForFinalRateApproval.boqFinalRateApprovalWorkflowEngine = boqFinalRateApprovalWorkflowEngine;
  planningUiConsumptionAdapterForFinalRateApproval.boqFinalRateApprovalRows = boqFinalRateApprovalWorkflowEngine.approvalRows;
  planningUiConsumptionAdapterForFinalRateApproval.finalRateApprovalLockedByDefault = boqFinalRateApprovalWorkflowEngine.finalRateApprovalLockedByDefault;
  planningUiConsumptionAdapterForFinalRateApproval.apiContractNotes = [
    ...(Array.isArray(planningUiConsumptionAdapterForFinalRateApproval.apiContractNotes)
      ? planningUiConsumptionAdapterForFinalRateApproval.apiContractNotes
      : []),
    "UI must show final rate locked by default.",
    "UI must require vendor quote/manual approval before finalRate/approvedRate can be written.",
    "UI must keep source signals, vendor quotes and approved rates as separate records.",
  ];

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
    sourceWatchAwarenessPromptBlock,
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
          "Structural Response Merge",
          structuralResponseMergePromptBlock,
          "",
          "Material Taxonomy Intelligence",
          materialTaxonomyPromptBlock,
          "",
          "Interior Material Selector",
          interiorMaterialSelectorPromptBlock,
          "",
          "Furniture Quantity Basis Intelligence",
          furnitureQuantityBasisPromptBlock,
          "",
          "Material Price Source Freshness Intelligence",
          materialPriceSourceFreshnessPromptBlock,
          "",
          "Material Web Search Rate Adapter",
          materialWebSearchRateAdapterPromptBlock,
          "",
          "BOQ Material Mapping Intelligence",
          boqMaterialMappingPromptBlock,
          "",
          "Material Response Merge",
          materialResponseMergePromptBlock,
          "",
          "Material Web Search Source Capture",
          materialWebSearchSourceCapturePromptBlock,
          "",
          "Universal Web Update Policy",
          universalWebUpdatePolicyPromptBlock,
          "",
          "Web Update UI Action Cards",
          webUpdateUiActionPromptBlock,
          "",
          "Web Update Browser Execution Adapter",
          webUpdateBrowserExecutionPromptBlock,
          "",
          "Web Update Source Signal Review Table",
          webUpdateSourceSignalReviewPromptBlock,
          "",
          "BOQ Source Attach Workflow",
          boqSourceAttachWorkflowPromptBlock,
          "",
          "BOQ Final Rate Approval Workflow",
          boqFinalRateApprovalWorkflowPromptBlock,
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
          "Structural Response Merge",
          structuralResponseMergePromptBlock,
          "",
          "Material Taxonomy Intelligence",
          materialTaxonomyPromptBlock,
          "",
          "Interior Material Selector",
          interiorMaterialSelectorPromptBlock,
          "",
          "Furniture Quantity Basis Intelligence",
          furnitureQuantityBasisPromptBlock,
          "",
          "Material Price Source Freshness Intelligence",
          materialPriceSourceFreshnessPromptBlock,
          "",
          "Material Web Search Rate Adapter",
          materialWebSearchRateAdapterPromptBlock,
          "",
          "BOQ Material Mapping Intelligence",
          boqMaterialMappingPromptBlock,
          "",
          "Material Response Merge",
          materialResponseMergePromptBlock,
          "",
          "Material Web Search Source Capture",
          materialWebSearchSourceCapturePromptBlock,
          "",
          "Universal Web Update Policy",
          universalWebUpdatePolicyPromptBlock,
          "",
          "Web Update UI Action Cards",
          webUpdateUiActionPromptBlock,
          "",
          "Web Update Browser Execution Adapter",
          webUpdateBrowserExecutionPromptBlock,
          "",
          "Web Update Source Signal Review Table",
          webUpdateSourceSignalReviewPromptBlock,
          "",
          "BOQ Source Attach Workflow",
          boqSourceAttachWorkflowPromptBlock,
          "",
          "BOQ Final Rate Approval Workflow",
          boqFinalRateApprovalWorkflowPromptBlock,
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
    sourceWatchAwarenessEngine,
    planningUiConsumptionAdapter,
    structuralGridIntelligence,
    foundationSoilRiskEngine,
    seismicWindRiskEngine,
    structuralResponseMergeEngine,
    materialTaxonomyEngine,
    interiorMaterialSelectorEngine,
    furnitureQuantityBasisEngine,
    materialPriceSourceFreshnessEngine,
    materialWebSearchRateAdapter,
    boqMaterialMappingEngine,
    materialResponseMergeEngine,
    materialWebSearchSourceCaptureEngine,
    universalWebUpdatePolicyEngine,
    webUpdateUiActionEngine,
    webUpdateBrowserExecutionAdapter,
    webUpdateSourceSignalReviewEngine,
    boqSourceAttachWorkflowEngine,
    boqFinalRateApprovalWorkflowEngine,
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
