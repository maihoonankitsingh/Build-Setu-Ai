// BUILDSETU_PHASE_47N1_PROJECT_MEMORY_VERSIONING_ENGINE

type DimensionContextLike = {
  summary?: {
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
  }>;
};

type BuildingTypeClassificationLike = {
  category?: string;
  subType?: string;
  planningMode?: string;
  riskLevel?: string;
};

type HumanPlanningResponseLike = {
  title?: string;
  readiness?: string;
};

type PlanningCategoryIntelligenceLike = {
  detectedFacing?: string | null;
  detectedPlotAreaSqFt?: number | null;
};

type PlanningReferenceIntelligenceLike = {
  hasReferenceIntent?: boolean;
  referenceUseMode?: string;
  detectedReferenceTypes?: string[];
};

export type BuildSetuMemoryLockItem = {
  key: string;
  label: string;
  value: string;
  lockStatus: "lock_candidate" | "needs_confirmation" | "do_not_lock";
  reason: string;
};

export type BuildSetuPlanningMemoryVersioningResult = {
  engineVersion: "47N-1";
  projectId: string | null;
  hasProjectContext: boolean;
  memoryLockCandidates: BuildSetuMemoryLockItem[];
  versioningNotes: string[];
  changeControlQuestions: string[];
  persistenceSafetyRules: string[];
  nextActions: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (!clean) return;
  if (!list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

function addLock(list: BuildSetuMemoryLockItem[], item: BuildSetuMemoryLockItem) {
  if (!list.some((existing) => existing.key === item.key)) {
    list.push(item);
  }
}

function firstPlotLabel(dim?: DimensionContextLike): string | null {
  const plot = dim?.pairs?.find((pair) => pair.intent === "plot");
  if (!plot) return null;
  return `${plot.widthFeet ?? "?"} ft x ${plot.depthFeet ?? "?"} ft / ${plot.areaSqFt ?? "?"} sq ft`;
}

function firstRoomLabel(dim?: DimensionContextLike): string | null {
  const room = dim?.pairs?.find((pair) => pair.intent === "room");
  if (!room) return null;
  return `${room.raw || "room"} / ${room.widthFeet ?? "?"} ft x ${room.depthFeet ?? "?"} ft / ${room.areaSqFt ?? "?"} sq ft`;
}

export function buildPlanningProjectMemoryEngine(input: {
  inputText: string;
  projectId?: string;
  dimensionUnderstanding?: DimensionContextLike;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  planningCategoryIntelligence?: PlanningCategoryIntelligenceLike;
  planningReferenceIntelligence?: PlanningReferenceIntelligenceLike;
  humanPlanningResponse?: HumanPlanningResponseLike;
}): BuildSetuPlanningMemoryVersioningResult {
  const projectId = cleanText(input.projectId) || null;
  const hasProjectContext = Boolean(projectId);
  const memoryLockCandidates: BuildSetuMemoryLockItem[] = [];
  const versioningNotes: string[] = [];
  const changeControlQuestions: string[] = [];
  const persistenceSafetyRules: string[] = [];
  const nextActions: string[] = [];

  const category = cleanText(input.buildingTypeClassification?.category);
  const planningMode = cleanText(input.buildingTypeClassification?.planningMode);
  const riskLevel = cleanText(input.buildingTypeClassification?.riskLevel);
  const plotLabel = firstPlotLabel(input.dimensionUnderstanding);
  const roomLabel = firstRoomLabel(input.dimensionUnderstanding);
  const facing = cleanText(input.planningCategoryIntelligence?.detectedFacing || "");

  if (category) {
    addLock(memoryLockCandidates, {
      key: "building_category",
      label: "Building category",
      value: category,
      lockStatus: "lock_candidate",
      reason: "Category controls planning mode, questions, risk and output routing.",
    });
  }

  if (planningMode) {
    addLock(memoryLockCandidates, {
      key: "planning_mode",
      label: "Planning mode",
      value: planningMode,
      lockStatus: "lock_candidate",
      reason: "Planning mode controls response format, pattern library and drawing workflow.",
    });
  }

  if (riskLevel) {
    addLock(memoryLockCandidates, {
      key: "risk_level",
      label: "Risk level",
      value: riskLevel,
      lockStatus: riskLevel === "high" ? "needs_confirmation" : "lock_candidate",
      reason: "High-risk projects need professional verification before final output.",
    });
  }

  if (plotLabel) {
    addLock(memoryLockCandidates, {
      key: "plot_dimension",
      label: "Plot dimension",
      value: plotLabel,
      lockStatus: "needs_confirmation",
      reason: "Plot dimensions should be confirmed before zoning, bylaw or working-plan output.",
    });
  }

  if (roomLabel) {
    addLock(memoryLockCandidates, {
      key: "primary_room_dimension",
      label: "Primary room dimension",
      value: roomLabel,
      lockStatus: "needs_confirmation",
      reason: "Room fit/interior output depends on exact site-measured dimensions.",
    });
  }

  if (facing) {
    addLock(memoryLockCandidates, {
      key: "plot_facing",
      label: "Plot facing",
      value: facing,
      lockStatus: "needs_confirmation",
      reason: "Facing controls entry, vastu preference, daylight and elevation assumptions.",
    });
  }

  if (input.planningReferenceIntelligence?.hasReferenceIntent) {
    addLock(memoryLockCandidates, {
      key: "reference_intent",
      label: "Reference intent",
      value: `${input.planningReferenceIntelligence.referenceUseMode || "reference"} / ${(input.planningReferenceIntelligence.detectedReferenceTypes || []).join(", ")}`,
      lockStatus: "needs_confirmation",
      reason: "Reference should be confirmed as exact match, inspiration or partial idea before applying it.",
    });
  }

  if (!memoryLockCandidates.length) {
    addLock(memoryLockCandidates, {
      key: "minimum_context",
      label: "Minimum project context",
      value: "not enough confirmed planning context",
      lockStatus: "do_not_lock",
      reason: "No stable project facts detected yet.",
    });
  }

  pushUnique(versioningNotes, "Create a new planning version whenever plot size, floor count, building use, facing, parking, staircase or reference intent changes.");
  pushUnique(versioningNotes, "Do not overwrite locked decisions silently; show changed-from and changed-to values.");
  pushUnique(versioningNotes, "Store concept plan, revised plan, working drawing, elevation and render prompts as separate versioned outputs.");

  pushUnique(changeControlQuestions, "Should these detected values be locked for this project?");
  pushUnique(changeControlQuestions, "Is this a new planning version or revision of the previous version?");
  pushUnique(changeControlQuestions, "Which decisions are approved, rejected or still tentative?");

  pushUnique(persistenceSafetyRules, "Only user-confirmed facts should become locked project memory.");
  pushUnique(persistenceSafetyRules, "Assumptions can be saved as assumptions, not as verified facts.");
  pushUnique(persistenceSafetyRules, "Bylaw, structural and MEP compliance claims must not be locked without professional/official verification.");
  pushUnique(persistenceSafetyRules, "Uploaded reference interpretation must remain traceable to the source file and user confirmation.");

  if (hasProjectContext) {
    pushUnique(nextActions, "Attach lock candidates to the project timeline as pending planning decisions.");
  } else {
    pushUnique(nextActions, "Ask or generate projectId before writing persistent planning memory.");
  }

  pushUnique(nextActions, "Show lock candidates to the user/admin before saving as approved project memory.");
  pushUnique(nextActions, "After user approval, create a new planning version snapshot.");

  return {
    engineVersion: "47N-1",
    projectId,
    hasProjectContext,
    memoryLockCandidates,
    versioningNotes,
    changeControlQuestions,
    persistenceSafetyRules,
    nextActions,
  };
}

export function buildPlanningProjectMemoryPromptBlock(result: BuildSetuPlanningMemoryVersioningResult): string {
  const lines: string[] = [];

  lines.push("PROJECT PLANNING MEMORY / VERSIONING:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Project ID: ${result.projectId || "not provided"}`);
  lines.push(`- Has project context: ${result.hasProjectContext ? "yes" : "no"}`);

  if (result.memoryLockCandidates.length) {
    lines.push("Memory lock candidates:");
    result.memoryLockCandidates.slice(0, 10).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.label}: ${item.value} [${item.lockStatus}] — ${item.reason}`);
    });
  }

  if (result.versioningNotes.length) {
    lines.push("Versioning notes:");
    result.versioningNotes.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.changeControlQuestions.length) {
    lines.push("Change-control questions:");
    result.changeControlQuestions.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.persistenceSafetyRules.length) {
    lines.push("Persistence safety rules:");
    result.persistenceSafetyRules.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
