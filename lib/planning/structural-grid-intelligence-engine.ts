// BUILDSETU_PHASE_G1_STRUCTURAL_GRID_INTELLIGENCE_ENGINE

type DimensionPairLike = {
  raw?: string;
  intent?: string;
  widthFeet?: number | null;
  depthFeet?: number | null;
  areaSqFt?: number | null;
  confidence?: string;
};

type DimensionContextLike = {
  summary?: {
    hasPlotDimension?: boolean;
    hasRoomDimension?: boolean;
    primaryPlotAreaSqFt?: number | null;
  };
  pairs?: DimensionPairLike[];
};

type BuildingTypeLike = {
  category?: string;
  subType?: string;
  planningMode?: string;
  occupancyGroup?: string;
  riskLevel?: string;
};

type CategoryIntelligenceLike = {
  riskLevel?: string;
  category?: string;
  planningMode?: string;
};

export type BuildSetuStructuralGridIntelligenceResult = {
  engineVersion: "G1-1";
  scope: "concept_structural_grid_only";
  detectedPlot: {
    widthFeet: number | null;
    depthFeet: number | null;
    areaSqFt: number | null;
    source: string;
  };
  structuralMode: string;
  gridStrategy: {
    recommendedGridType: string;
    typicalBayFt: string;
    xGridLinesFt: number[];
    yGridLinesFt: number[];
    notes: string[];
  };
  columnPlacementRules: string[];
  beamSlabStrategy: string[];
  foundationStrategy: string[];
  loadPathWarnings: string[];
  riskFlags: string[];
  missingInputs: string[];
  engineerReviewChecklist: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function numericFeet(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return round2(n);
}

function pickPlotDimension(dimensionUnderstanding?: DimensionContextLike) {
  const pairs = Array.isArray(dimensionUnderstanding?.pairs) ? dimensionUnderstanding?.pairs || [] : [];
  const plotPair =
    pairs.find((item) => cleanText(item.intent).toLowerCase().includes("plot")) ||
    pairs.find((item) => numericFeet(item.widthFeet) && numericFeet(item.depthFeet)) ||
    null;

  const width = numericFeet(plotPair?.widthFeet);
  const depth = numericFeet(plotPair?.depthFeet);
  const area = numericFeet(plotPair?.areaSqFt) || (width && depth ? round2(width * depth) : null);

  return {
    widthFeet: width,
    depthFeet: depth,
    areaSqFt: area,
    source: plotPair?.raw || "not_detected",
  };
}

function buildGridLines(lengthFt: number | null, preferredBayFt = 10): number[] {
  if (!lengthFt || lengthFt <= 0) return [];

  const lines = [0];
  let cursor = 0;

  while (cursor + preferredBayFt < lengthFt) {
    cursor = round2(cursor + preferredBayFt);
    lines.push(cursor);
  }

  if (lines[lines.length - 1] !== round2(lengthFt)) {
    lines.push(round2(lengthFt));
  }

  return lines;
}

function inferStructuralMode(input: {
  text: string;
  buildingType?: BuildingTypeLike;
  categoryIntelligence?: CategoryIntelligenceLike;
}) {
  const text = input.text.toLowerCase();
  const category = cleanText(input.buildingType?.category || input.categoryIntelligence?.category).toLowerCase();
  const planningMode = cleanText(input.buildingType?.planningMode || input.categoryIntelligence?.planningMode).toLowerCase();

  if (/warehouse|factory|industrial|shed|godown|storage/.test(text) || category === "storage" || planningMode.includes("industrial")) {
    return "industrial_storage_concept_grid";
  }

  if (/clinic|hospital|school|public|assembly|banquet|restaurant|mall/.test(text)) {
    return "public_or_special_use_concept_grid";
  }

  if (/shop|showroom|office|commercial|mixed/.test(text) || category.includes("commercial") || category.includes("mixed")) {
    return "commercial_or_mixed_use_concept_grid";
  }

  return "residential_low_rise_concept_grid";
}

function typicalBayForMode(mode: string) {
  if (mode === "industrial_storage_concept_grid") return 15;
  if (mode === "commercial_or_mixed_use_concept_grid") return 12;
  if (mode === "public_or_special_use_concept_grid") return 12;
  return 10;
}

export function buildStructuralGridIntelligenceEngine(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  buildingTypeClassification?: BuildingTypeLike;
  planningCategoryIntelligence?: CategoryIntelligenceLike;
}): BuildSetuStructuralGridIntelligenceResult {
  const text = cleanText(input.inputText);
  const plot = pickPlotDimension(input.dimensionUnderstanding);
  const mode = inferStructuralMode({
    text,
    buildingType: input.buildingTypeClassification,
    categoryIntelligence: input.planningCategoryIntelligence,
  });

  const preferredBayFt = typicalBayForMode(mode);
  const xGridLinesFt = buildGridLines(plot.widthFeet, preferredBayFt);
  const yGridLinesFt = buildGridLines(plot.depthFeet, preferredBayFt);

  const riskFlags: string[] = [];
  const missingInputs: string[] = [];

  if (!plot.widthFeet || !plot.depthFeet) {
    missingInputs.push("Plot width/depth not confidently detected; structural grid can only stay generic.");
  }

  if (!/soil|sbc|bearing|geotechnical/i.test(text)) {
    missingInputs.push("Soil/SBC/geotechnical data missing.");
  }

  if (!/floor|g\+|g\+1|g\+2|basement|storey|story/i.test(text)) {
    missingInputs.push("Floor count / storey count not clearly confirmed.");
  }

  if (/basement/i.test(text)) {
    riskFlags.push("Basement detected: retaining wall, waterproofing, ramp, excavation and neighbouring-foundation risk require engineer review.");
  }

  if (/cantilever|floating column|transfer beam|large span|long span/i.test(text)) {
    riskFlags.push("High-risk structural keyword detected: cantilever/floating-column/transfer/long-span concept must not be finalized without engineer design.");
  }

  if (mode === "industrial_storage_concept_grid") {
    riskFlags.push("Industrial/storage structure may require larger spans, floor loading, fire and vehicle movement review.");
  }

  if (mode === "public_or_special_use_concept_grid") {
    riskFlags.push("Public/special-use building requires stricter fire, exit, accessibility, structural and MEP coordination review.");
  }

  return {
    engineVersion: "G1-1",
    scope: "concept_structural_grid_only",
    detectedPlot: plot,
    structuralMode: mode,
    gridStrategy: {
      recommendedGridType:
        mode === "industrial_storage_concept_grid"
          ? "wide-bay concept grid, final span by structural engineer"
          : "regular RCC frame concept grid aligned with walls, stair core and wet shafts",
      typicalBayFt: `${preferredBayFt} ft concept bay target`,
      xGridLinesFt,
      yGridLinesFt,
      notes: [
        "Keep columns aligned with corners, wall junctions, stair/core edges and major load-bearing wall lines.",
        "Avoid random columns in room centers, parking clear path, main living clear span and shop frontage where possible.",
        "Keep upper-floor columns vertically continuous with ground-floor columns.",
        "Use this as planning coordination only, not final structural design.",
      ],
    },
    columnPlacementRules: [
      "Place concept columns at plot/building corners and major wall intersections first.",
      "Coordinate columns with staircase, lift/core, shafts, toilets and kitchen wet walls.",
      "Avoid shifting/removing columns after architectural plan is locked without structural review.",
      "For G+1/G+2 residential planning, prefer simple vertical column continuity over complex transfer systems.",
      "For shop/showroom frontage, keep clear span need separate from final beam/column design.",
    ],
    beamSlabStrategy: [
      "Beam lines should connect column grid continuously and support slab panels logically.",
      "Slab panel direction should follow shorter practical spans where possible, subject to engineer design.",
      "Staircase opening, toilet sunken slab, balcony and ducts need special coordination.",
      "Long-span rooms, double-height spaces and cantilevers must be flagged before final design.",
      "Final beam/slab sizes, thickness and reinforcement are outside AI scope.",
    ],
    foundationStrategy: [
      "Foundation type depends on soil bearing capacity, water table, neighbouring structures and column loads.",
      "Isolated footing may be a concept starting point for low-rise normal soil, but it is not final.",
      "Combined/raft/pile foundation may be required for weak soil, close columns, high loads or poor site conditions.",
      "Soil test and licensed structural engineer foundation design are mandatory before construction.",
    ],
    loadPathWarnings: [
      "Load path must remain continuous: slab to beam, beam to column, column to footing, footing to soil.",
      "Floating columns, transfer beams, large cantilevers and unsupported masonry walls are high-risk.",
      "Overhead tank, staircase, balcony, facade fins and heavy terrace loads need explicit structural review.",
      "Architectural changes after structural design can invalidate BOQ/BBS and drawings.",
    ],
    riskFlags,
    missingInputs,
    engineerReviewChecklist: [
      "Freeze architectural plan, dimensions, levels and wall layout.",
      "Confirm floor count, future expansion, terrace use and overhead tank location.",
      "Collect soil/SBC/geotechnical data and site condition.",
      "Engineer to finalize column sizes, beam sizes, slab thickness, footing type and reinforcement.",
      "Engineer to check seismic/wind requirements, ductile detailing, service openings and load combinations.",
      "Only stamped/approved structural drawings should be used for construction execution.",
    ],
    safetyBoundary: [
      "This is concept structural-grid intelligence for planning coordination only.",
      "Do not use this output as construction drawing, structural calculation, BBS finalization or approval document.",
      "Final RCC/steel/member sizes/reinforcement require licensed structural engineer design.",
    ],
  };
}

export function buildStructuralGridIntelligencePromptBlock(result: BuildSetuStructuralGridIntelligenceResult): string {
  const lines: string[] = [];

  lines.push("STRUCTURAL GRID INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Mode: ${result.structuralMode}`);
  lines.push(`- Plot: ${result.detectedPlot.widthFeet || "?"} x ${result.detectedPlot.depthFeet || "?"} ft`);
  lines.push(`- Grid type: ${result.gridStrategy.recommendedGridType}`);
  lines.push(`- Typical bay: ${result.gridStrategy.typicalBayFt}`);
  lines.push(`- X grid: ${result.gridStrategy.xGridLinesFt.length ? result.gridStrategy.xGridLinesFt.join(", ") : "needs plot width"}`);
  lines.push(`- Y grid: ${result.gridStrategy.yGridLinesFt.length ? result.gridStrategy.yGridLinesFt.join(", ") : "needs plot depth"}`);

  if (result.riskFlags.length) {
    lines.push("- Risk flags:");
    result.riskFlags.slice(0, 5).forEach((item) => lines.push(`  - ${item}`));
  }

  if (result.missingInputs.length) {
    lines.push("- Missing structural inputs:");
    result.missingInputs.slice(0, 5).forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Engineer boundary:");
  result.safetyBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
