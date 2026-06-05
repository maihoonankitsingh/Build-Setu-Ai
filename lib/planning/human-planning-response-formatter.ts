// BUILDSETU_PHASE_47E1_HUMAN_PLANNING_RESPONSE_FORMATTER

type DimensionContextLike = {
  summary?: {
    totalPairs?: number;
    totalSingles?: number;
    hasPlotDimension?: boolean;
    hasRoomDimension?: boolean;
    primaryPlotAreaSqFt?: number | null;
  };
  pairs?: Array<{
    raw?: string;
    intent?: string;
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
    confidence?: string;
  }>;
  warnings?: string[];
};

type MissingQuestionEngineLike = {
  readiness?: string;
  criticalQuestions?: Array<{ id?: string; question?: string; reason?: string; category?: string }>;
  recommendedQuestions?: Array<{ id?: string; question?: string; reason?: string; category?: string }>;
  optionalQuestions?: Array<{ id?: string; question?: string; reason?: string; category?: string }>;
  assumptionsAllowed?: string[];
  riskFlags?: string[];
  detected?: Record<string, unknown>;
};

type BuildingTypeClassificationLike = {
  category?: string;
  subType?: string;
  occupancyGroup?: string;
  planningMode?: string;
  confidence?: string;
  riskLevel?: string;
  detectedSignals?: string[];
  recommendedPlanningFocus?: string[];
  escalationFlags?: string[];
  assumptions?: string[];
};

type PlanningModeQuestionTuningLike = {
  mode?: string;
  category?: string;
  riskLevel?: string;
  criticalQuestions?: Array<{ id?: string; question?: string; reason?: string; category?: string }>;
  recommendedQuestions?: Array<{ id?: string; question?: string; reason?: string; category?: string }>;
  optionalQuestions?: Array<{ id?: string; question?: string; reason?: string; category?: string }>;
  planningFocus?: string[];
  professionalEscalations?: string[];
  outputGuidance?: string[];
};

// BUILDSETU_PHASE_47F2_HUMAN_CONCEPT_MERGE
type ConceptPlanningActionEngineLike = {
  actionMode?: string;
  canStartConcept?: boolean;
  planningMode?: string;
  category?: string;
  riskLevel?: string;
  conceptActions?: Array<{
    actionId?: string;
    priority?: string;
    title?: string;
    detail?: string;
  }>;
  zoningMoves?: Array<{
    zone?: string;
    placementLogic?: string;
    adjacency?: string[];
    notes?: string[];
  }>;
  adjacencyLogic?: string[];
  circulationLogic?: string[];
  serviceCoreLogic?: string[];
  dimensionalChecks?: string[];
  professionalVerification?: string[];
  outputSequence?: string[];
};

// BUILDSETU_PHASE_47G2_ROOM_FIT_HUMAN_MERGE
type RoomFurnitureFitEngineLike = {
  hasRoomFitContext?: boolean;
  primaryUseDetected?: string;
  checks?: Array<{
    id?: string;
    roomType?: string;
    sourceDimension?: string;
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
    status?: string;
    fitSummary?: string;
    furnitureOrFixtureFit?: string[];
    clearanceNotes?: string[];
    warnings?: string[];
    nextDataNeeded?: string[];
  }>;
  globalNotes?: string[];
  professionalNotes?: string[];
};

// BUILDSETU_PHASE_47H2_STANDARDS_HUMAN_MERGE
type RoomSpaceStandardsEngineLike = {
  standardsId?: string;
  standardsVersion?: string;
  hasStandardsContext?: boolean;
  checks?: Array<{
    id?: string;
    sourceDimension?: string;
    detectedRoomType?: string;
    standardsKey?: string;
    standardsLabel?: string;
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
    shortSideFt?: number | null;
    longSideFt?: number | null;
    grade?: string;
    matchedGrade?: string | null;
    recommendation?: string;
    targetRanges?: string[];
    standardsNotes?: string[];
    fitRules?: string[];
    warnings?: string[];
  }>;
  globalRecommendations?: string[];
  standardsDisclaimer?: string[];
};

export type BuildSetuHumanPlanningResponse = {
  responseVersion: "47E-1";
  title: string;
  readiness: string;
  summary: string;
  sections: {
    understanding: string[];
    detectedDimensions: string[];
    buildingType: string[];
    planningReadiness: string[];
    missingCriticalQuestions: string[];
    recommendedQuestions: string[];
    assumptionsAllowed: string[];
    planningFocus: string[];
    conceptPlanningActions: string[];
    zoningMoves: string[];
    adjacencyCirculationLogic: string[];
    serviceCoreLogic: string[];
    outputSequence: string[];
    roomFurnitureFitChecks: string[];
    clearanceNotes: string[];
    furnitureFixtureWarnings: string[];
    dataNeededForFinalLayout: string[];
    roomSpaceStandards: string[];
    standardsTargetRanges: string[];
    standardsRecommendations: string[];
    standardsDisclaimer: string[];
    riskAndVerification: string[];
    nextBestActions: string[];
  };
  markdown: string;
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLabel(value: unknown, fallback = "unknown"): string {
  const clean = cleanText(value);
  return clean || fallback;
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (!clean) return;

  if (!list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

function questionTexts(items?: Array<{ question?: string }>, limit = 6): string[] {
  return (items || [])
    .map((item) => cleanText(item.question))
    .filter(Boolean)
    .slice(0, limit);
}

function dimensionLines(dimensionUnderstanding?: DimensionContextLike): string[] {
  const lines: string[] = [];
  const dim = dimensionUnderstanding;

  if (!dim) {
    return ["Dimension context not available."];
  }

  const summary = dim.summary || {};
  const pairs = dim.pairs || [];

  if (summary.primaryPlotAreaSqFt != null) {
    pushUnique(lines, `Primary detected area: approx ${summary.primaryPlotAreaSqFt} sq ft.`);
  }

  const plotPairs = pairs.filter((pair) => pair.intent === "plot");
  const roomPairs = pairs.filter((pair) => pair.intent === "room");

  for (const pair of plotPairs.slice(0, 4)) {
    pushUnique(
      lines,
      `Plot/site: ${pair.raw || "dimension"} => ${pair.widthFeet ?? "?"} ft x ${pair.depthFeet ?? "?"} ft, approx ${pair.areaSqFt ?? "?"} sq ft.`
    );
  }

  for (const pair of roomPairs.slice(0, 6)) {
    pushUnique(
      lines,
      `Room/interior: ${pair.raw || "dimension"} => ${pair.widthFeet ?? "?"} ft x ${pair.depthFeet ?? "?"} ft, approx ${pair.areaSqFt ?? "?"} sq ft.`
    );
  }

  if (!lines.length) {
    pushUnique(lines, "No reliable plot/room dimension was detected. Ask user for width x depth.");
  }

  return lines;
}

function buildMarkdown(title: string, sections: BuildSetuHumanPlanningResponse["sections"]): string {
  const parts: string[] = [];
  parts.push(`# ${title}`);

  const ordered: Array<[string, string[]]> = [
    ["1. Understanding", sections.understanding],
    ["2. Detected dimensions", sections.detectedDimensions],
    ["3. Building type", sections.buildingType],
    ["4. Planning readiness", sections.planningReadiness],
    ["5. Missing critical questions", sections.missingCriticalQuestions],
    ["6. Recommended questions", sections.recommendedQuestions],
    ["7. Assumptions allowed", sections.assumptionsAllowed],
    ["8. Planning focus", sections.planningFocus],
    ["9. Concept planning actions", sections.conceptPlanningActions],
    ["10. Zoning moves", sections.zoningMoves],
    ["11. Adjacency / circulation logic", sections.adjacencyCirculationLogic],
    ["12. Service core logic", sections.serviceCoreLogic],
    ["13. Output sequence", sections.outputSequence],
    ["14. Room / furniture fit checks", sections.roomFurnitureFitChecks],
    ["15. Clearance notes", sections.clearanceNotes],
    ["16. Furniture / fixture warnings", sections.furnitureFixtureWarnings],
    ["17. Data needed for final layout", sections.dataNeededForFinalLayout],
    ["18. Room / space standards", sections.roomSpaceStandards],
    ["19. Recommended target ranges", sections.standardsTargetRanges],
    ["20. Standards recommendations", sections.standardsRecommendations],
    ["21. Standards disclaimer", sections.standardsDisclaimer],
    ["22. Risks / professional verification", sections.riskAndVerification],
    ["23. Next best action", sections.nextBestActions],
  ];

  for (const [heading, lines] of ordered) {
    parts.push("");
    parts.push(`## ${heading}`);

    if (!lines.length) {
      parts.push("- None.");
      continue;
    }

    for (const line of lines) {
      parts.push(`- ${line}`);
    }
  }

  return parts.join("\n");
}

export function buildHumanPlanningResponse(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  planningMissingQuestionEngine?: MissingQuestionEngineLike;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  planningModeQuestionTuning?: PlanningModeQuestionTuningLike;
  conceptPlanningActionEngine?: ConceptPlanningActionEngineLike;
  roomFurnitureFitEngine?: RoomFurnitureFitEngineLike;
  roomSpaceStandardsEngine?: RoomSpaceStandardsEngineLike;
}): BuildSetuHumanPlanningResponse {
  const inputText = cleanText(input.inputText);
  const dim = input.dimensionUnderstanding;
  const mq = input.planningMissingQuestionEngine;
  const building = input.buildingTypeClassification;
  const mode = input.planningModeQuestionTuning;
  const concept = input.conceptPlanningActionEngine;
  const roomFit = input.roomFurnitureFitEngine;
  const standards = input.roomSpaceStandardsEngine;

  const category = normalizeLabel(building?.category);
  const subType = normalizeLabel(building?.subType);
  const planningMode = normalizeLabel(building?.planningMode || mode?.mode);
  const riskLevel = normalizeLabel(building?.riskLevel || mode?.riskLevel);
  const readiness = normalizeLabel(mq?.readiness, "can_start_concept");

  const critical = [
    ...questionTexts(mq?.criticalQuestions, 8),
    ...questionTexts(mode?.criticalQuestions, 8),
  ];

  const recommended = [
    ...questionTexts(mq?.recommendedQuestions, 8),
    ...questionTexts(mode?.recommendedQuestions, 8),
  ];

  const sections: BuildSetuHumanPlanningResponse["sections"] = {
    understanding: [],
    detectedDimensions: [],
    buildingType: [],
    planningReadiness: [],
    missingCriticalQuestions: [],
    recommendedQuestions: [],
    assumptionsAllowed: [],
    planningFocus: [],
    conceptPlanningActions: [],
    zoningMoves: [],
    adjacencyCirculationLogic: [],
    serviceCoreLogic: [],
    outputSequence: [],
    roomFurnitureFitChecks: [],
    clearanceNotes: [],
    furnitureFixtureWarnings: [],
    dataNeededForFinalLayout: [],
    roomSpaceStandards: [],
    standardsTargetRanges: [],
    standardsRecommendations: [],
    standardsDisclaimer: [],
    riskAndVerification: [],
    nextBestActions: [],
  };

  pushUnique(sections.understanding, inputText ? `User requirement: ${inputText}` : "User requirement text is empty or unavailable.");
  pushUnique(sections.understanding, `Planning mode detected: ${planningMode}.`);
  pushUnique(sections.understanding, `Current response is preliminary planning assistance, not final approval drawings.`);

  for (const line of dimensionLines(dim)) pushUnique(sections.detectedDimensions, line);

  pushUnique(sections.buildingType, `Category: ${category}.`);
  pushUnique(sections.buildingType, `Sub-type: ${subType}.`);
  pushUnique(sections.buildingType, `Occupancy group: ${normalizeLabel(building?.occupancyGroup)}.`);
  pushUnique(sections.buildingType, `Classifier confidence: ${normalizeLabel(building?.confidence)}.`);
  pushUnique(sections.buildingType, `Risk level: ${riskLevel}.`);

  for (const signal of building?.detectedSignals || []) {
    pushUnique(sections.buildingType, `Signal: ${signal}.`);
  }

  pushUnique(sections.planningReadiness, `Readiness: ${readiness}.`);

  if (readiness === "needs_critical_details") {
    pushUnique(sections.planningReadiness, "Detailed planning should wait until critical details are answered.");
  } else if (readiness === "can_start_concept") {
    pushUnique(sections.planningReadiness, "Concept planning can start using stated details and explicit assumptions.");
  } else {
    pushUnique(sections.planningReadiness, "Sufficient details are available for a more detailed planning response.");
  }

  if (critical.length) {
    for (const question of critical) pushUnique(sections.missingCriticalQuestions, question);
  } else {
    pushUnique(sections.missingCriticalQuestions, "No hard critical blocker detected for concept-level planning.");
  }

  if (recommended.length) {
    for (const question of recommended) pushUnique(sections.recommendedQuestions, question);
  } else {
    pushUnique(sections.recommendedQuestions, "No immediate recommended question detected beyond normal verification.");
  }

  for (const assumption of mq?.assumptionsAllowed || []) {
    pushUnique(sections.assumptionsAllowed, assumption);
  }

  for (const assumption of building?.assumptions || []) {
    pushUnique(sections.assumptionsAllowed, assumption);
  }

  if (!sections.assumptionsAllowed.length) {
    pushUnique(sections.assumptionsAllowed, "Use only explicit user-provided information; do not invent final bylaw or structural values.");
  }

  for (const focus of building?.recommendedPlanningFocus || []) {
    pushUnique(sections.planningFocus, focus);
  }

  for (const focus of mode?.planningFocus || []) {
    pushUnique(sections.planningFocus, focus);
  }

  if (!sections.planningFocus.length) {
    pushUnique(sections.planningFocus, "Collect missing requirements, then prepare zoning, circulation and service-core logic.");
  }

  if (concept?.conceptActions?.length) {
    for (const action of concept.conceptActions.slice(0, 8)) {
      pushUnique(
        sections.conceptPlanningActions,
        `${cleanText(action.title)}: ${cleanText(action.detail)}`
      );
    }
  }

  if (concept?.zoningMoves?.length) {
    for (const zone of concept.zoningMoves.slice(0, 8)) {
      pushUnique(
        sections.zoningMoves,
        `${cleanText(zone.zone)}: ${cleanText(zone.placementLogic)}`
      );

      for (const note of zone.notes || []) {
        pushUnique(sections.zoningMoves, `${cleanText(zone.zone)} note: ${note}`);
      }
    }
  }

  for (const item of concept?.adjacencyLogic || []) {
    pushUnique(sections.adjacencyCirculationLogic, item);
  }

  for (const item of concept?.circulationLogic || []) {
    pushUnique(sections.adjacencyCirculationLogic, item);
  }

  for (const item of concept?.serviceCoreLogic || []) {
    pushUnique(sections.serviceCoreLogic, item);
  }

  for (const item of concept?.dimensionalChecks || []) {
    pushUnique(sections.detectedDimensions, item);
  }

  for (const item of concept?.outputSequence || []) {
    pushUnique(sections.outputSequence, item);
  }

  if (!sections.conceptPlanningActions.length) {
    pushUnique(sections.conceptPlanningActions, "Concept action engine has not produced a mode-specific action yet.");
  }

  if (!sections.zoningMoves.length) {
    pushUnique(sections.zoningMoves, "Zoning moves will be generated after critical planning details are confirmed.");
  }

  if (!sections.adjacencyCirculationLogic.length) {
    pushUnique(sections.adjacencyCirculationLogic, "Adjacency and circulation logic will be finalized after planning constraints are confirmed.");
  }

  if (!sections.serviceCoreLogic.length) {
    pushUnique(sections.serviceCoreLogic, "Service/core logic will be finalized after use, floor count and service requirements are confirmed.");
  }

  if (!sections.outputSequence.length) {
    pushUnique(sections.outputSequence, "1. Confirm missing details.");
    pushUnique(sections.outputSequence, "2. Generate concept zoning.");
    pushUnique(sections.outputSequence, "3. Add professional verification notes.");
  }

  if (roomFit?.checks?.length) {
    for (const check of roomFit.checks.slice(0, 10)) {
      const roomLabel = cleanText(check.roomType || "room");
      const source = cleanText(check.sourceDimension || "dimension");
      const status = cleanText(check.status || "needs_more_info");
      const summary = cleanText(check.fitSummary || "Fit summary unavailable.");
      pushUnique(sections.roomFurnitureFitChecks, `${roomLabel} ${source}: ${status} — ${summary}`);

      for (const item of check.furnitureOrFixtureFit || []) {
        pushUnique(sections.roomFurnitureFitChecks, `${roomLabel} fit: ${item}`);
      }

      for (const item of check.clearanceNotes || []) {
        pushUnique(sections.clearanceNotes, `${roomLabel}: ${item}`);
      }

      for (const item of check.warnings || []) {
        pushUnique(sections.furnitureFixtureWarnings, `${roomLabel}: ${item}`);
      }

      for (const item of check.nextDataNeeded || []) {
        pushUnique(sections.dataNeededForFinalLayout, `${roomLabel}: ${item}`);
      }
    }
  }

  for (const item of roomFit?.globalNotes || []) {
    pushUnique(sections.dataNeededForFinalLayout, item);
  }

  for (const item of roomFit?.professionalNotes || []) {
    pushUnique(sections.riskAndVerification, item);
  }

  if (!sections.roomFurnitureFitChecks.length) {
    pushUnique(sections.roomFurnitureFitChecks, "No room-level fit check available yet. Add room dimensions to validate furniture and fixtures.");
  }

  if (!sections.clearanceNotes.length) {
    pushUnique(sections.clearanceNotes, "Clearance notes will be generated after room use, furniture list and opening positions are confirmed.");
  }

  if (!sections.furnitureFixtureWarnings.length) {
    pushUnique(sections.furnitureFixtureWarnings, "No furniture/fixture warning detected at concept level.");
  }

  if (!sections.dataNeededForFinalLayout.length) {
    pushUnique(sections.dataNeededForFinalLayout, "Confirm site measurement, wall thickness, doors, windows, columns and service points before final layout.");
  }

  if (standards?.checks?.length) {
    for (const check of standards.checks.slice(0, 10)) {
      const label = cleanText(check.standardsLabel || "Space");
      const source = cleanText(check.sourceDimension || "dimension");
      const grade = cleanText(check.grade || "unknown");
      const recommendation = cleanText(check.recommendation || "Standards recommendation unavailable.");

      pushUnique(sections.roomSpaceStandards, `${label} ${source}: ${grade} — ${recommendation}`);

      for (const range of check.targetRanges || []) {
        pushUnique(sections.standardsTargetRanges, `${label}: ${range}`);
      }

      for (const note of check.standardsNotes || []) {
        pushUnique(sections.standardsRecommendations, `${label}: ${note}`);
      }

      for (const rule of check.fitRules || []) {
        pushUnique(sections.standardsRecommendations, `${label} fit rule: ${rule}`);
      }

      for (const warning of check.warnings || []) {
        pushUnique(sections.furnitureFixtureWarnings, `${label}: ${warning}`);
      }
    }
  }

  for (const item of standards?.globalRecommendations || []) {
    pushUnique(sections.standardsRecommendations, item);
  }

  for (const item of standards?.standardsDisclaimer || []) {
    pushUnique(sections.standardsDisclaimer, item);
    pushUnique(sections.riskAndVerification, item);
  }

  if (!sections.roomSpaceStandards.length) {
    pushUnique(sections.roomSpaceStandards, "No room/space standards grading available yet. Add room dimensions to compare against planning benchmarks.");
  }

  if (!sections.standardsTargetRanges.length) {
    pushUnique(sections.standardsTargetRanges, "Target ranges will be shown after a detected room type and dimensions are available.");
  }

  if (!sections.standardsRecommendations.length) {
    pushUnique(sections.standardsRecommendations, "No standards recommendation generated yet.");
  }

  if (!sections.standardsDisclaimer.length) {
    pushUnique(sections.standardsDisclaimer, "Room standards are preliminary planning heuristics, not final legal/code values.");
  }

  for (const risk of mq?.riskFlags || []) {
    pushUnique(sections.riskAndVerification, risk);
  }

  for (const escalation of building?.escalationFlags || []) {
    pushUnique(sections.riskAndVerification, escalation);
  }

  for (const escalation of mode?.professionalEscalations || []) {
    pushUnique(sections.riskAndVerification, escalation);
  }

  for (const verification of concept?.professionalVerification || []) {
    pushUnique(sections.riskAndVerification, verification);
  }

  if (!sections.riskAndVerification.length) {
    pushUnique(sections.riskAndVerification, "Final architectural, structural, MEP and local bylaw compliance must be verified by qualified professionals before execution.");
  }

  if (critical.length) {
    pushUnique(sections.nextBestActions, "Ask the critical questions first, then generate the concept plan.");
  }

  if (!critical.length && recommended.length) {
    pushUnique(sections.nextBestActions, "Proceed with concept planning, while listing recommended assumptions clearly.");
  }

  if (!critical.length && !recommended.length) {
    pushUnique(sections.nextBestActions, "Proceed to detailed concept planning with dimensions, zoning, circulation and verification notes.");
  }

  if (planningMode === "room_interior") {
    pushUnique(sections.nextBestActions, "Prepare furniture layout options and ask for door/window/electrical positions if missing.");
  }

  if (planningMode === "residential_building") {
    pushUnique(sections.nextBestActions, "Prepare residential zoning with entry, parking, stair, living, kitchen, bedroom and service logic.");
  }

  if (planningMode === "mixed_use_building") {
    pushUnique(sections.nextBestActions, "Prepare separate residential/commercial access and service-separation options.");
  }

  // BUILDSETU_PHASE_47F3_RESPONSE_POLISH
  if (planningMode === "commercial_building") {
    pushUnique(sections.nextBestActions, "Prepare commercial front/back zoning with customer flow, staff/service area and accessibility notes.");
  }

  if (planningMode === "industrial_storage") {
    pushUnique(sections.nextBestActions, "Prepare loading/unloading, racking/storage, clear-height, service and fire-safety concept zoning.");
  }

  if (planningMode === "public_or_special_building" || riskLevel === "high") {
    pushUnique(sections.nextBestActions, "Keep output concept-level and escalate fire/accessibility/MEP/local norms verification.");
  }

  const primaryRoomUse = cleanText(roomFit?.primaryUseDetected || "");
  const hasRoomFitOnly = Boolean(roomFit?.hasRoomFitContext && !dim?.summary?.hasPlotDimension);

  const title =
    hasRoomFitOnly && primaryRoomUse === "office"
      ? "BuildSetu Commercial Interior Planning Response"
      : hasRoomFitOnly && ["bedroom", "kitchen", "toilet", "living", "generic_room"].includes(primaryRoomUse)
        ? "BuildSetu Interior Planning Response"
        : planningMode === "room_interior"
          ? "BuildSetu Interior Planning Response"
          : planningMode === "residential_building"
            ? "BuildSetu Residential Planning Response"
            : planningMode === "commercial_building"
              ? "BuildSetu Commercial Planning Response"
              : planningMode === "mixed_use_building"
                ? "BuildSetu Mixed-use Planning Response"
                : planningMode === "public_or_special_building"
                  ? "BuildSetu Public/Special-use Planning Response"
                  : planningMode === "industrial_storage"
                    ? "BuildSetu Industrial/Storage Planning Response"
                    : "BuildSetu Human-like Planning Response";

  const markdown = buildMarkdown(title, sections);

  return {
    responseVersion: "47E-1",
    title,
    readiness,
    summary: `${category} / ${planningMode} planning response prepared with ${critical.length} critical and ${recommended.length} recommended questions.`,
    sections,
    markdown,
  };
}

export function buildHumanPlanningResponsePromptBlock(result: BuildSetuHumanPlanningResponse): string {
  return [
    "HUMAN-LIKE PLANNING RESPONSE:",
    `- Title: ${result.title}`,
    `- Readiness: ${result.readiness}`,
    `- Summary: ${result.summary}`,
    "Formatted response:",
    result.markdown,
  ].join("\n");
}
