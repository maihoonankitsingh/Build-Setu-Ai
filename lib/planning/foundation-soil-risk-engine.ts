// BUILDSETU_PHASE_G2_FOUNDATION_SOIL_RISK_ENGINE

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

type BuildingTypeLike = {
  category?: string;
  subType?: string;
  planningMode?: string;
  riskLevel?: string;
};

export type BuildSetuFoundationSoilRiskResult = {
  engineVersion: "G2-1";
  scope: "concept_foundation_soil_risk_only";
  detectedSoilHints: string[];
  detectedSiteRisks: string[];
  foundationConcept: {
    likelyStartingPoint: string;
    alternativeFoundationTypes: string[];
    notAllowedToFinalize: string[];
  };
  soilInvestigationNeeds: string[];
  basementAndWaterTableRisks: string[];
  neighbouringPropertyRisks: string[];
  structuralEngineerInputs: string[];
  escalationLevel: "normal_engineer_review" | "high_risk_engineer_review" | "specialist_geotechnical_review";
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function buildFoundationSoilRiskEngine(input: {
  inputText: string;
  structuralGridIntelligence?: StructuralGridLike;
  buildingTypeClassification?: BuildingTypeLike;
}): BuildSetuFoundationSoilRiskResult {
  const text = cleanText(input.inputText).toLowerCase();
  const structuralMode = cleanText(input.structuralGridIntelligence?.structuralMode).toLowerCase();
  const category = cleanText(input.buildingTypeClassification?.category).toLowerCase();

  const detectedSoilHints: string[] = [];
  const detectedSiteRisks: string[] = [];
  const basementAndWaterTableRisks: string[] = [];
  const neighbouringPropertyRisks: string[] = [];
  const structuralEngineerInputs: string[] = [];

  if (includesAny(text, ["black cotton", "black soil", "expansive soil"])) {
    detectedSoilHints.push("Black cotton / expansive soil mentioned.");
    detectedSiteRisks.push("Expansive soil can cause swelling/shrinkage and foundation movement risk.");
  }

  if (includesAny(text, ["filled soil", "filling", "made up soil", "loose soil"])) {
    detectedSoilHints.push("Filled / made-up / loose soil mentioned.");
    detectedSiteRisks.push("Filled or loose soil needs investigation before footing assumptions.");
  }

  if (includesAny(text, ["sandy soil", "sand soil", "river sand"])) {
    detectedSoilHints.push("Sandy soil mentioned.");
    detectedSiteRisks.push("Sandy soil may require bearing, settlement and water-table review.");
  }

  if (includesAny(text, ["clay soil", "clayey"])) {
    detectedSoilHints.push("Clay soil mentioned.");
    detectedSiteRisks.push("Clay soil may need settlement, shrinkage and drainage review.");
  }

  if (includesAny(text, ["rock", "hard strata", "hard soil"])) {
    detectedSoilHints.push("Hard strata / rock mentioned.");
  }

  if (includesAny(text, ["water table", "high water", "ground water", "seepage", "water logging", "waterlogging"])) {
    detectedSiteRisks.push("Water table / seepage / waterlogging risk mentioned.");
    basementAndWaterTableRisks.push("Waterproofing, dewatering and foundation-depth strategy require engineer/geotechnical review.");
  }

  if (includesAny(text, ["basement", "stilt basement", "cellar"])) {
    detectedSiteRisks.push("Basement detected.");
    basementAndWaterTableRisks.push("Basement excavation, retaining wall, ramp, waterproofing and neighbouring-foundation risk are high-priority checks.");
  }

  if (includesAny(text, ["adjacent building", "neighbour building", "neighbor building", "old building", "party wall", "shared wall"])) {
    detectedSiteRisks.push("Neighbouring/old/shared-wall condition mentioned.");
    neighbouringPropertyRisks.push("Excavation and footing work near neighbouring structure requires protection and engineer method statement.");
  }

  if (includesAny(text, ["g+3", "g+4", "g+5", "high rise", "multi storey", "multistorey"])) {
    detectedSiteRisks.push("Higher floor count / multi-storey risk mentioned.");
  }

  if (structuralMode.includes("industrial") || category.includes("storage")) {
    detectedSiteRisks.push("Industrial/storage use may require higher floor loading and different foundation review.");
  }

  if (!detectedSoilHints.length) {
    detectedSoilHints.push("No reliable soil type detected from user input.");
  }

  structuralEngineerInputs.push("Soil bearing capacity / geotechnical report.");
  structuralEngineerInputs.push("Floor count, future expansion, terrace tank and live-load assumptions.");
  structuralEngineerInputs.push("Column load estimate and architectural grid.");
  structuralEngineerInputs.push("Neighbouring property condition and excavation constraints.");
  structuralEngineerInputs.push("Water table, drainage and site filling level.");

  const highRisk =
    detectedSiteRisks.length > 1 ||
    basementAndWaterTableRisks.length > 0 ||
    neighbouringPropertyRisks.length > 0 ||
    includesAny(text, ["black cotton", "expansive", "filled soil", "made up soil", "g+3", "g+4", "g+5"]);

  const specialist =
    includesAny(text, ["black cotton", "expansive", "basement", "water table", "seepage", "filled soil", "made up soil"]) ||
    basementAndWaterTableRisks.length > 0;

  return {
    engineVersion: "G2-1",
    scope: "concept_foundation_soil_risk_only",
    detectedSoilHints,
    detectedSiteRisks,
    foundationConcept: {
      likelyStartingPoint: highRisk
        ? "Foundation cannot be safely assumed from text; soil/geotechnical and structural engineer review required first."
        : "For low-rise normal soil, isolated footing can be a concept starting point only after soil/SBC confirmation.",
      alternativeFoundationTypes: [
        "isolated footing",
        "combined footing",
        "strap footing",
        "raft foundation",
        "pile foundation",
      ],
      notAllowedToFinalize: [
        "footing size",
        "footing depth",
        "reinforcement diameter/spacing",
        "safe bearing capacity",
        "settlement safety",
        "construction-ready foundation drawing",
      ],
    },
    soilInvestigationNeeds: [
      "Confirm soil type and safe bearing capacity before final footing decision.",
      "Check filled soil, loose soil, waterlogging, neighbouring foundation and excavation condition.",
      "For G+1 and above, poor soil, basement, industrial/storage or heavy-load use, soil test/geotechnical review should be treated as mandatory.",
      "Record site level, road level, plinth level and drainage outfall before foundation planning.",
    ],
    basementAndWaterTableRisks,
    neighbouringPropertyRisks,
    structuralEngineerInputs,
    escalationLevel: specialist
      ? "specialist_geotechnical_review"
      : highRisk
        ? "high_risk_engineer_review"
        : "normal_engineer_review",
    safetyBoundary: [
      "This engine gives foundation risk intelligence only, not final foundation design.",
      "Final foundation type, size, depth and reinforcement require licensed structural engineer design.",
      "Soil/SBC/geotechnical data must override generic AI assumptions.",
    ],
  };
}

export function buildFoundationSoilRiskPromptBlock(result: BuildSetuFoundationSoilRiskResult): string {
  const lines: string[] = [];

  lines.push("FOUNDATION + SOIL RISK INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Escalation: ${result.escalationLevel}`);
  lines.push(`- Foundation concept: ${result.foundationConcept.likelyStartingPoint}`);

  lines.push("- Soil hints:");
  result.detectedSoilHints.slice(0, 5).forEach((item) => lines.push(`  - ${item}`));

  if (result.detectedSiteRisks.length) {
    lines.push("- Site risks:");
    result.detectedSiteRisks.slice(0, 6).forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Engineer inputs required:");
  result.structuralEngineerInputs.slice(0, 6).forEach((item) => lines.push(`  - ${item}`));

  lines.push("- Safety boundary:");
  result.safetyBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
