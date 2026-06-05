// BUILDSETU_PHASE_G3_SEISMIC_WIND_RISK_ENGINE

type StructuralGridLike = {
  structuralMode?: string;
  detectedPlot?: {
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
  };
  riskFlags?: string[];
  missingInputs?: string[];
};

type FoundationSoilLike = {
  escalationLevel?: string;
  detectedSiteRisks?: string[];
  detectedSoilHints?: string[];
};

type BuildingTypeLike = {
  category?: string;
  subType?: string;
  planningMode?: string;
  riskLevel?: string;
};

export type BuildSetuSeismicWindRiskResult = {
  engineVersion: "G3-1";
  scope: "concept_seismic_wind_risk_only";
  detectedSeismicHints: string[];
  detectedWindHints: string[];
  configurationRiskFlags: string[];
  loadRiskFlags: string[];
  missingInputs: string[];
  conceptChecks: {
    seismic: string[];
    wind: string[];
    structuralConfiguration: string[];
  };
  escalationLevel: "normal_engineer_review" | "high_risk_structural_review" | "mandatory_specialist_review";
  engineerReviewChecklist: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

function detectFloorRisk(text: string) {
  if (has(text, /\bg\+([4-9]|\d{2,})\b|high[-\s]?rise|multi[-\s]?storey|multistorey/i)) {
    return "high_floor_or_high_rise_hint";
  }

  if (has(text, /\bg\+3\b|four floor|4 floor|four storey|4 storey/i)) {
    return "medium_high_floor_hint";
  }

  if (has(text, /\bg\+1\b|\bg\+2\b|duplex|low[-\s]?rise/i)) {
    return "low_rise_hint";
  }

  return "floor_count_not_clear";
}

export function buildSeismicWindRiskEngine(input: {
  inputText: string;
  structuralGridIntelligence?: StructuralGridLike;
  foundationSoilRiskEngine?: FoundationSoilLike;
  buildingTypeClassification?: BuildingTypeLike;
}): BuildSetuSeismicWindRiskResult {
  const text = cleanText(input.inputText);
  const lower = text.toLowerCase();

  const detectedSeismicHints: string[] = [];
  const detectedWindHints: string[] = [];
  const configurationRiskFlags: string[] = [];
  const loadRiskFlags: string[] = [];
  const missingInputs: string[] = [];

  const structuralMode = cleanText(input.structuralGridIntelligence?.structuralMode).toLowerCase();
  const category = cleanText(input.buildingTypeClassification?.category).toLowerCase();
  const foundationEscalation = cleanText(input.foundationSoilRiskEngine?.escalationLevel).toLowerCase();
  const floorRisk = detectFloorRisk(text);

  const zoneMatch = lower.match(/seismic\s*zone\s*(v|iv|iii|ii|i|5|4|3|2|1)|zone\s*(v|iv|iii|ii|i|5|4|3|2|1)/i);
  if (zoneMatch) {
    detectedSeismicHints.push(`Seismic zone hint detected: ${zoneMatch[0]}.`);
  } else {
    missingInputs.push("Seismic zone/location-specific earthquake risk not confirmed.");
  }

  if (has(text, /earthquake|seismic|ductile|is\s*1893|is\s*13920/i)) {
    detectedSeismicHints.push("User mentioned earthquake/seismic/ductile design context.");
  }

  const windMatch = lower.match(/wind\s*(speed|load)?\s*(\d{2,3})\s*(m\/s|km\/h|kmph)?|cyclone|coastal|high wind/i);
  if (windMatch) {
    detectedWindHints.push(`Wind/cyclone hint detected: ${windMatch[0]}.`);
  } else {
    missingInputs.push("Basic wind speed / cyclone / coastal exposure not confirmed.");
  }

  if (floorRisk === "floor_count_not_clear") {
    missingInputs.push("Floor count / building height not clearly confirmed for seismic-wind risk classification.");
  }

  if (has(text, /stilt|open ground floor|parking ground floor|soft storey|soft story/i)) {
    configurationRiskFlags.push("Open/stilt/parking ground floor detected; soft-storey risk must be checked.");
  }

  if (has(text, /floating column|transfer beam|transfer girder/i)) {
    configurationRiskFlags.push("Floating column / transfer beam detected; high-risk structural configuration.");
  }

  if (has(text, /cantilever|large balcony|projected balcony|overhang/i)) {
    configurationRiskFlags.push("Cantilever / projection detected; wind, seismic and deflection review required.");
  }

  if (has(text, /irregular|l shape|u shape|setback floor|offset|asymmetric/i)) {
    configurationRiskFlags.push("Plan/elevation irregularity hint detected; torsion and load-path review required.");
  }

  if (has(text, /double height|large opening|void|cutout|cut-out/i)) {
    configurationRiskFlags.push("Large void/double-height/opening detected; diaphragm and beam-slab review required.");
  }

  if (has(text, /overhead tank|water tank|solar panel|heavy facade|stone cladding|parapet/i)) {
    loadRiskFlags.push("Heavy terrace/facade/overhead tank load hint detected; seismic and wind load path review required.");
  }

  if (structuralMode.includes("industrial") || category.includes("storage")) {
    loadRiskFlags.push("Industrial/storage use can involve higher live loads, large spans and wind-sensitive roof/shed systems.");
  }

  if (category.includes("healthcare") || category.includes("school") || category.includes("public")) {
    loadRiskFlags.push("Public/special-use occupancy needs stricter safety, exit and structural review.");
  }

  const highRisk =
    configurationRiskFlags.length > 0 ||
    loadRiskFlags.length > 1 ||
    floorRisk === "medium_high_floor_hint" ||
    floorRisk === "high_floor_or_high_rise_hint" ||
    foundationEscalation.includes("specialist") ||
    foundationEscalation.includes("high");

  const mandatorySpecialist =
    floorRisk === "high_floor_or_high_rise_hint" ||
    has(text, /basement|floating column|transfer beam|soft storey|cyclone|coastal|seismic zone v|zone v|zone 5/i);

  return {
    engineVersion: "G3-1",
    scope: "concept_seismic_wind_risk_only",
    detectedSeismicHints: detectedSeismicHints.length ? detectedSeismicHints : ["No explicit seismic design data detected."],
    detectedWindHints: detectedWindHints.length ? detectedWindHints : ["No explicit wind-speed/cyclone exposure data detected."],
    configurationRiskFlags,
    loadRiskFlags,
    missingInputs,
    conceptChecks: {
      seismic: [
        "Confirm seismic zone and local site class before structural design.",
        "Keep column-beam load path continuous and avoid floating columns where possible.",
        "Avoid soft-storey behavior from open parking/stilt levels without engineer design.",
        "Ductile detailing and load combinations must be handled by licensed structural engineer.",
      ],
      wind: [
        "Confirm basic wind speed, terrain category, building height and exposure condition.",
        "Check parapet, facade fins, balcony projections, rooftop tank and solar panel anchorage.",
        "For coastal/cyclone/high-wind locations, elevation elements and roof projections need special review.",
      ],
      structuralConfiguration: [
        "Prefer regular plan geometry and regular vertical load path.",
        "Flag setbacks, offsets, transfer beams, double-height voids and large openings before final drawings.",
        "Coordinate staircase/lift/core and shear/load-resisting elements early in planning.",
      ],
    },
    escalationLevel: mandatorySpecialist
      ? "mandatory_specialist_review"
      : highRisk
        ? "high_risk_structural_review"
        : "normal_engineer_review",
    engineerReviewChecklist: [
      "Confirm seismic zone, soil/site class, basic wind speed and terrain/exposure category.",
      "Confirm floor count, building height, future expansion and rooftop loads.",
      "Review plan irregularity, vertical irregularity, soft-storey condition and torsion risk.",
      "Check load combinations, member sizing, reinforcement and ductile detailing as per applicable code.",
      "Review facade projections, parapet, overhead tank, solar frame and cantilever anchorage.",
      "Use only licensed structural engineer stamped drawings for construction.",
    ],
    safetyBoundary: [
      "This is seismic/wind risk intelligence only, not structural calculation.",
      "AI must not finalize earthquake/wind-safe member sizes, reinforcement or approval drawings.",
      "Licensed structural engineer review is mandatory before construction execution.",
    ],
  };
}

export function buildSeismicWindRiskPromptBlock(result: BuildSetuSeismicWindRiskResult): string {
  const lines: string[] = [];

  lines.push("SEISMIC + WIND RISK INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Escalation: ${result.escalationLevel}`);

  lines.push("- Seismic hints:");
  result.detectedSeismicHints.slice(0, 5).forEach((item) => lines.push(`  - ${item}`));

  lines.push("- Wind hints:");
  result.detectedWindHints.slice(0, 5).forEach((item) => lines.push(`  - ${item}`));

  if (result.configurationRiskFlags.length) {
    lines.push("- Configuration risk flags:");
    result.configurationRiskFlags.slice(0, 6).forEach((item) => lines.push(`  - ${item}`));
  }

  if (result.loadRiskFlags.length) {
    lines.push("- Load risk flags:");
    result.loadRiskFlags.slice(0, 6).forEach((item) => lines.push(`  - ${item}`));
  }

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.slice(0, 6).forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Safety boundary:");
  result.safetyBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
