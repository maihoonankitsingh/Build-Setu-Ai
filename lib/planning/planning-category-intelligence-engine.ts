// BUILDSETU_PHASE_47IJKL_CATEGORY_INTELLIGENCE_BATCH

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

type MissingQuestionEngineLike = {
  readiness?: string;
  criticalQuestions?: Array<{ id?: string; question?: string; category?: string; reason?: string }>;
  recommendedQuestions?: Array<{ id?: string; question?: string; category?: string; reason?: string }>;
  detected?: Record<string, unknown>;
};

type BuildingTypeClassificationLike = {
  category?: string;
  subType?: string;
  occupancyGroup?: string;
  planningMode?: string;
  confidence?: string;
  riskLevel?: string;
};

type PlanningModeQuestionTuningLike = {
  mode?: string;
  category?: string;
  riskLevel?: string;
  planningFocus?: string[];
  professionalEscalations?: string[];
  outputGuidance?: string[];
};

type ConceptPlanningActionEngineLike = {
  actionMode?: string;
  canStartConcept?: boolean;
  planningMode?: string;
  category?: string;
  riskLevel?: string;
};

type RoomSpaceStandardsEngineLike = {
  checks?: Array<{
    standardsLabel?: string;
    grade?: string;
    recommendation?: string;
  }>;
};

export type BuildSetuLayoutPatternSuggestion = {
  id: string;
  category: "residential" | "mixed_use" | "commercial" | "healthcare" | "educational" | "industrial_storage" | "interior" | "general";
  title: string;
  applicableWhen: string;
  zoningLogic: string[];
  advantages: string[];
  risks: string[];
};

export type BuildSetuPlanningCategoryIntelligenceResult = {
  engineVersion: "47I-J-K-L-1";
  category: string;
  planningMode: string;
  riskLevel: string;
  detectedFacing: string | null;
  detectedPlotAreaSqFt: number | null;
  layoutPatternSuggestions: BuildSetuLayoutPatternSuggestion[];
  vastuFacingGuidance: string[];
  bylawPlanningGuard: string[];
  mepStructureCoordination: string[];
  categoryNextActions: string[];
  safetyNotes: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(pattern: RegExp, text: string): boolean {
  return pattern.test(text);
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (!clean) return;
  if (!list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

function addPattern(list: BuildSetuLayoutPatternSuggestion[], item: BuildSetuLayoutPatternSuggestion) {
  if (!list.some((existing) => existing.id === item.id)) {
    list.push(item);
  }
}

function detectFacing(text: string): string | null {
  // BUILDSETU_PHASE_47IJKL_FIX_STRICT_FACING_DETECTOR
  // Avoid short-token false positives like "se" inside Hindi/English words.
  const normalized = ` ${cleanText(text).toLowerCase().replace(/[-_/]+/g, " ")} `;
  const hasCornerSignal = /\b(corner|two side|two-side|dual frontage|double road|do side|2 side)\b/i.test(normalized);

  const hasNorth = /\bnorth\b/i.test(normalized);
  const hasSouth = /\bsouth\b/i.test(normalized);
  const hasEast = /\beast\b/i.test(normalized);
  const hasWest = /\bwest\b/i.test(normalized);

  if (hasCornerSignal) {
    if (hasNorth && hasEast) return "north-east";
    if (hasNorth && hasWest) return "north-west";
    if (hasSouth && hasEast) return "south-east";
    if (hasSouth && hasWest) return "south-west";
  }

  if (/\b(north east|northeast)\b/i.test(normalized)) return "north-east";
  if (/\b(north west|northwest)\b/i.test(normalized)) return "north-west";
  if (/\b(south east|southeast)\b/i.test(normalized)) return "south-east";
  if (/\b(south west|southwest)\b/i.test(normalized)) return "south-west";

  if (/\bne\s*(facing|corner|plot|road|side|entry)\b/i.test(normalized)) return "north-east";
  if (/\bnw\s*(facing|corner|plot|road|side|entry)\b/i.test(normalized)) return "north-west";
  if (/\bse\s*(facing|corner|plot|road|side|entry)\b/i.test(normalized)) return "south-east";
  if (/\bsw\s*(facing|corner|plot|road|side|entry)\b/i.test(normalized)) return "south-west";

  if (/\beast\s*(facing|face|plot|road|side|entry)?\b/i.test(normalized)) return "east";
  if (/\bnorth\s*(facing|face|plot|road|side|entry)?\b/i.test(normalized)) return "north";
  if (/\bwest\s*(facing|face|plot|road|side|entry)?\b/i.test(normalized)) return "west";
  if (/\bsouth\s*(facing|face|plot|road|side|entry)?\b/i.test(normalized)) return "south";

  return null;
}

function getPlotArea(dim?: DimensionContextLike): number | null {
  const plot = dim?.pairs?.find((pair) => pair.intent === "plot");
  if (typeof plot?.areaSqFt === "number") return plot.areaSqFt;
  if (typeof dim?.summary?.primaryPlotAreaSqFt === "number" && dim?.summary?.hasPlotDimension) {
    return dim.summary.primaryPlotAreaSqFt;
  }
  return null;
}

function getPlotLabel(dim?: DimensionContextLike): string {
  const plot = dim?.pairs?.find((pair) => pair.intent === "plot");
  if (!plot) return "plot dimension not available";
  return `${plot.widthFeet ?? "?"} ft x ${plot.depthFeet ?? "?"} ft / ${plot.areaSqFt ?? "?"} sq ft`;
}

export function buildPlanningCategoryIntelligenceEngine(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  planningMissingQuestionEngine?: MissingQuestionEngineLike;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  planningModeQuestionTuning?: PlanningModeQuestionTuningLike;
  conceptPlanningActionEngine?: ConceptPlanningActionEngineLike;
  roomSpaceStandardsEngine?: RoomSpaceStandardsEngineLike;
}): BuildSetuPlanningCategoryIntelligenceResult {
  const inputText = cleanText(input.inputText);
  const text = inputText.toLowerCase();

  const category = cleanText(input.buildingTypeClassification?.category || input.planningModeQuestionTuning?.category || "unknown");
  const planningMode = cleanText(input.buildingTypeClassification?.planningMode || input.planningModeQuestionTuning?.mode || "unknown");
  const riskLevel = cleanText(input.buildingTypeClassification?.riskLevel || input.planningModeQuestionTuning?.riskLevel || "unknown");

  const detectedFacing = detectFacing(text);
  const detectedPlotAreaSqFt = getPlotArea(input.dimensionUnderstanding);
  const plotLabel = getPlotLabel(input.dimensionUnderstanding);

  const layoutPatternSuggestions: BuildSetuLayoutPatternSuggestion[] = [];
  const vastuFacingGuidance: string[] = [];
  const bylawPlanningGuard: string[] = [];
  const mepStructureCoordination: string[] = [];
  const categoryNextActions: string[] = [];
  const safetyNotes: string[] = [];

  const hasPlot = Boolean(input.dimensionUnderstanding?.summary?.hasPlotDimension);
  const isCorner = has(/\bcorner\b/i, text);
  const isRental = has(/\brental|tenant|rent\b/i, text);
  const hasFuture = has(/\bfuture|expansion|g\+\d+|upper floor\b/i, text);

  if (planningMode === "residential_building") {
    addPattern(layoutPatternSuggestions, {
      id: "residential-compact-front-entry-service-back",
      category: "residential",
      title: "Compact residential zoning pattern",
      applicableWhen: `Use for compact/standard residential plots such as ${plotLabel}.`,
      zoningLogic: [
        "Keep entry/living near front for visitor access.",
        "Place kitchen, utility and toilets as a service cluster.",
        "Keep bedrooms in quieter private zone.",
        "Place staircase so future floor expansion remains possible."
      ],
      advantages: [
        "Simple circulation.",
        "Better privacy separation.",
        "Efficient plumbing/service stacking."
      ],
      risks: [
        "Local setbacks and road-width rules are not finalized.",
        "Final room sizes need bylaw and structural grid review."
      ]
    });

    if (detectedPlotAreaSqFt && detectedPlotAreaSqFt <= 1300) {
      addPattern(layoutPatternSuggestions, {
        id: "residential-30x40-compact-g1",
        category: "residential",
        title: "30x40 / 1200 sq ft compact G+1 planning pattern",
        applicableWhen: "Use for around 1200 sq ft urban plot where parking, stair and 2/3BHK zoning must be balanced.",
        zoningLogic: [
          "Reserve front/service edge for entry, parking and staircase.",
          "Use central living/dining as distribution zone.",
          "Cluster wet areas vertically for future floor.",
          "Keep one bedroom/private room away from direct entry."
        ],
        advantages: [
          "Works for self-use with future expansion.",
          "Controls plumbing complexity.",
          "Good starting point for human-like concept planning."
        ],
        risks: [
          "Parking may reduce front room quality.",
          "Staircase location must be locked early."
        ]
      });
    }

    if (isRental || hasFuture) {
      addPattern(layoutPatternSuggestions, {
        id: "residential-rental-future-entry",
        category: "residential",
        title: "Future rental / separate entry pattern",
        applicableWhen: "Use when future floor, rental use or separate upper-floor access is possible.",
        zoningLogic: [
          "Keep staircase accessible without crossing private family areas.",
          "Plan service shafts that can stack on upper floors.",
          "Keep parking and entry gates flexible."
        ],
        advantages: [
          "Better future rental value.",
          "Less redesign when upper floor is added."
        ],
        risks: [
          "Staircase consumes valuable ground-floor frontage.",
          "Privacy must be checked carefully."
        ]
      });
    }
  }

  if (planningMode === "mixed_use_building") {
    addPattern(layoutPatternSuggestions, {
      id: "mixed-use-front-commercial-rear-residential-core",
      category: "mixed_use",
      title: "Shop + residence separate access pattern",
      applicableWhen: "Use for shop/office on ground floor with residence above or behind.",
      zoningLogic: [
        "Use road frontage for shop/commercial visibility.",
        "Keep residential staircase/entry separate from customer entry.",
        "Separate commercial storage/service from family utility.",
        "Control noise, smell and privacy between uses."
      ],
      advantages: [
        "Better rental/commercial usability.",
        "Cleaner privacy separation.",
        "More professional mixed-use zoning."
      ],
      risks: [
        "Mixed-use may trigger extra parking, fire or local approval checks.",
        "Separate stair can reduce shop frontage."
      ]
    });
  }

  if (planningMode === "commercial_building") {
    addPattern(layoutPatternSuggestions, {
      id: "commercial-front-back-service-pattern",
      category: "commercial",
      title: "Commercial front-back zoning pattern",
      applicableWhen: "Use for office, shop, showroom, studio or service business planning.",
      zoningLogic: [
        "Place reception/display/customer area at front.",
        "Place staff/service/store/toilet at back or side.",
        "Keep public circulation visible and simple.",
        "Coordinate signage/facade with entry."
      ],
      advantages: [
        "Clear customer flow.",
        "Better staff/service separation.",
        "Works for many commercial interiors."
      ],
      risks: [
        "Toilet, accessibility and fire requirements need professional review."
      ]
    });
  }

  if (planningMode === "public_or_special_building") {
    addPattern(layoutPatternSuggestions, {
      id: "public-safety-first-flow-pattern",
      category: category === "healthcare" ? "healthcare" : category === "educational" ? "educational" : "general",
      title: "Safety-first public/special-use flow pattern",
      applicableWhen: "Use for clinic, hospital, school, coaching, public or special-use planning.",
      zoningLogic: [
        "Keep reception/waiting near entry.",
        "Keep exits and circulation clear.",
        "Separate service/staff/private zones from public flow.",
        "Plan toilets, accessibility and MEP early."
      ],
      advantages: [
        "Safer concept planning.",
        "Better user flow.",
        "Clear professional escalation path."
      ],
      risks: [
        "Final plan needs fire, accessibility, MEP and local authority verification."
      ]
    });
  }

  if (planningMode === "industrial_storage") {
    addPattern(layoutPatternSuggestions, {
      id: "warehouse-loading-racking-safety-pattern",
      category: "industrial_storage",
      title: "Warehouse loading + racking movement pattern",
      applicableWhen: "Use for warehouse, godown, storage or industrial shed concept planning.",
      zoningLogic: [
        "Keep gate to loading/unloading path direct.",
        "Separate truck/forklift/manual/staff movement.",
        "Plan racking grid with aisle width and clear height.",
        "Reserve fire/service/utility access."
      ],
      advantages: [
        "Better operational movement.",
        "Supports structure and fire review.",
        "Avoids random storage planning."
      ],
      risks: [
        "Structural loading, fire and ventilation must be professionally verified."
      ]
    });
  }

  if (planningMode === "room_interior" || input.dimensionUnderstanding?.summary?.hasRoomDimension) {
    addPattern(layoutPatternSuggestions, {
      id: "interior-furniture-clearance-pattern",
      category: "interior",
      title: "Interior furniture + clearance pattern",
      applicableWhen: "Use for bedroom, kitchen, toilet, living, office cabin and other room-level planning.",
      zoningLogic: [
        "Place primary furniture/fixture first.",
        "Keep door/window/opening movement clear.",
        "Place storage on less-interrupted wall.",
        "Coordinate lighting, fan, AC and switch points with furniture."
      ],
      advantages: [
        "Practical furniture fit.",
        "Better human-like interior planning.",
        "Clear next data needed before final drawing."
      ],
      risks: [
        "Final layout needs exact wall thickness, openings, columns and site measurements."
      ]
    });
  }

  if (detectedFacing) {
    pushUnique(vastuFacingGuidance, `Detected facing: ${detectedFacing}. Use this as a planning preference layer, not as a substitute for bylaw, structure or ventilation.`);
  } else if (hasPlot) {
    pushUnique(vastuFacingGuidance, "Plot facing is not detected. Ask facing before entry, vastu and elevation decisions.");
  }

  if (detectedFacing === "east") {
    pushUnique(vastuFacingGuidance, "East-facing concept: entry/living can be tested on east/front side if road and setbacks allow.");
    pushUnique(vastuFacingGuidance, "Keep kitchen/utility/wet areas functionally clustered; vastu preference should not break ventilation or structure.");
  }

  if (detectedFacing === "north") {
    pushUnique(vastuFacingGuidance, "North-facing concept: entry/living/front-opening strategy can be tested with good daylight and frontage.");
  }

  if (detectedFacing === "south" || detectedFacing === "west") {
    pushUnique(vastuFacingGuidance, "South/west-facing concept: control heat gain with shading, window proportion, balcony/jaali and facade treatment.");
  }

  if (isCorner) {
    pushUnique(vastuFacingGuidance, "Corner plot detected: consider dual frontage, better ventilation, optional separate entry and stronger elevation treatment.");
  }

  pushUnique(bylawPlanningGuard, "Treat all output as preliminary planning only.");
  pushUnique(bylawPlanningGuard, "Final setbacks, FAR/FSI, height, ground coverage, parking and fire requirements must be verified from local authority rules.");
  pushUnique(bylawPlanningGuard, "Required before compliance-level answer: state, city/local authority, plot area, road width, land use and floor count.");
  if (!input.planningMissingQuestionEngine?.detected?.hasLocation) {
    pushUnique(bylawPlanningGuard, "Local authority is missing; do not claim final approval compliance.");
  }
  if (!input.planningMissingQuestionEngine?.detected?.hasRoadWidth && planningMode !== "room_interior") {
    pushUnique(bylawPlanningGuard, "Road width is missing; height, fire access, FAR/FSI and parking feasibility may change.");
  }
  if (riskLevel === "high" || planningMode === "public_or_special_building" || planningMode === "industrial_storage") {
    pushUnique(bylawPlanningGuard, "High-risk/special-use project: fire, accessibility, occupancy load, MEP and licensed professional review are mandatory before final drawings.");
  }

  pushUnique(mepStructureCoordination, "Stack toilets, kitchen, utility and shafts where possible to reduce plumbing complexity.");
  pushUnique(mepStructureCoordination, "Reserve a service shaft/duct path before finalizing rooms, especially for G+1/G+2 or commercial use.");
  pushUnique(mepStructureCoordination, "Keep staircase/lift/service core aligned with future expansion and structural grid.");
  pushUnique(mepStructureCoordination, "Do not finalize column/beam/slab sizes without structural engineer load calculation.");
  pushUnique(mepStructureCoordination, "Coordinate electrical DB, inverter/solar, AC outdoor units, water tank, pump and drainage route early.");
  if (planningMode === "industrial_storage") {
    pushUnique(mepStructureCoordination, "Warehouse/industrial: confirm floor loading, clear height, ventilation, fire safety and utility load before planning final grid.");
  }
  if (planningMode === "public_or_special_building") {
    pushUnique(mepStructureCoordination, "Healthcare/education/public use: confirm occupant capacity, exit route, toilets, accessibility, fire and MEP load before final layout.");
  }

  if (layoutPatternSuggestions.length) {
    pushUnique(categoryNextActions, "Select the best pattern from layout suggestions, then generate concept zoning with assumptions.");
  }
  if (detectedFacing || hasPlot) {
    pushUnique(categoryNextActions, "Lock entry/facing strategy before detailed room adjacency.");
  }
  pushUnique(categoryNextActions, "Confirm critical missing bylaw inputs before compliance-level output.");
  pushUnique(categoryNextActions, "After zoning, run room size, furniture fit, standards grade, MEP/structure and professional verification checks.");

  pushUnique(safetyNotes, "This batch adds planning intelligence only; it does not replace licensed architect, structural engineer, MEP consultant or local authority approval.");
  pushUnique(safetyNotes, "Vastu/facing guidance is preference-level and must not override safety, ventilation, structure, accessibility or statutory rules.");

  return {
    engineVersion: "47I-J-K-L-1",
    category,
    planningMode,
    riskLevel,
    detectedFacing,
    detectedPlotAreaSqFt,
    layoutPatternSuggestions,
    vastuFacingGuidance,
    bylawPlanningGuard,
    mepStructureCoordination,
    categoryNextActions,
    safetyNotes,
  };
}

export function buildPlanningCategoryIntelligencePromptBlock(result: BuildSetuPlanningCategoryIntelligenceResult): string {
  const lines: string[] = [];

  lines.push("PLANNING CATEGORY INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Category: ${result.category}`);
  lines.push(`- Planning mode: ${result.planningMode}`);
  lines.push(`- Risk level: ${result.riskLevel}`);
  lines.push(`- Facing: ${result.detectedFacing || "not detected"}`);
  lines.push(`- Plot area: ${result.detectedPlotAreaSqFt ?? "not detected"}`);

  if (result.layoutPatternSuggestions.length) {
    lines.push("Layout pattern suggestions:");
    result.layoutPatternSuggestions.slice(0, 8).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}: ${item.applicableWhen}`);
      item.zoningLogic.slice(0, 4).forEach((z) => lines.push(`   - Zoning: ${z}`));
    });
  }

  if (result.vastuFacingGuidance.length) {
    lines.push("Vastu/facing guidance:");
    result.vastuFacingGuidance.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.bylawPlanningGuard.length) {
    lines.push("Bylaw planning guard:");
    result.bylawPlanningGuard.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.mepStructureCoordination.length) {
    lines.push("MEP/structure coordination:");
    result.mepStructureCoordination.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.categoryNextActions.length) {
    lines.push("Category next actions:");
    result.categoryNextActions.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
