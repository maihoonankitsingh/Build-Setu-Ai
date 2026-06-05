// BUILDSETU_PHASE_G4_STRUCTURAL_RESPONSE_MERGE_ENGINE

type StructuralGridLike = {
  engineVersion?: string;
  structuralMode?: string;
  detectedPlot?: {
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
    source?: string;
  };
  gridStrategy?: {
    recommendedGridType?: string;
    typicalBayFt?: string;
    xGridLinesFt?: number[];
    yGridLinesFt?: number[];
    notes?: string[];
  };
  columnPlacementRules?: string[];
  beamSlabStrategy?: string[];
  loadPathWarnings?: string[];
  missingInputs?: string[];
};

type FoundationSoilLike = {
  engineVersion?: string;
  escalationLevel?: string;
  detectedSoilHints?: string[];
  detectedSiteRisks?: string[];
  foundationConcept?: {
    likelyStartingPoint?: string;
  };
  soilInvestigationNeeds?: string[];
  structuralEngineerInputs?: string[];
};

type SeismicWindLike = {
  engineVersion?: string;
  escalationLevel?: string;
  detectedSeismicHints?: string[];
  detectedWindHints?: string[];
  configurationRiskFlags?: string[];
  loadRiskFlags?: string[];
  missingInputs?: string[];
};

export type BuildSetuStructuralResponseMergeResult = {
  engineVersion: "G4-1";
  scope: "human_structural_response_merge";
  title: string;
  riskLabel: "normal" | "high" | "specialist";
  summaryBullets: string[];
  uiHighlights: string[];
  sectionItems: string[];
  nextActions: string[];
  professionalBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => cleanText(item)).filter(Boolean) : [];
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (clean && !list.includes(clean)) list.push(clean);
}

function riskRank(value: string) {
  const v = cleanText(value).toLowerCase();
  if (v.includes("specialist") || v.includes("mandatory")) return 3;
  if (v.includes("high")) return 2;
  return 1;
}

function riskLabelFromEngines(
  foundation?: FoundationSoilLike,
  seismic?: SeismicWindLike
): BuildSetuStructuralResponseMergeResult["riskLabel"] {
  const max = Math.max(
    riskRank(foundation?.escalationLevel || ""),
    riskRank(seismic?.escalationLevel || "")
  );
  if (max >= 3) return "specialist";
  if (max >= 2) return "high";
  return "normal";
}

export function buildStructuralResponseMergeEngine(input: {
  structuralGridIntelligence?: StructuralGridLike;
  foundationSoilRiskEngine?: FoundationSoilLike;
  seismicWindRiskEngine?: SeismicWindLike;
}): BuildSetuStructuralResponseMergeResult {
  const grid = input.structuralGridIntelligence || {};
  const foundation = input.foundationSoilRiskEngine || {};
  const seismic = input.seismicWindRiskEngine || {};

  const riskLabel = riskLabelFromEngines(foundation, seismic);
  const summaryBullets: string[] = [];
  const uiHighlights: string[] = [];
  const sectionItems: string[] = [];
  const nextActions: string[] = [];
  const professionalBoundary: string[] = [];

  const plot = grid.detectedPlot || {};
  const gridStrategy = grid.gridStrategy || {};

  pushUnique(summaryBullets, `Structural mode: ${cleanText(grid.structuralMode || "concept structural planning")}.`);

  if (plot.widthFeet && plot.depthFeet) {
    pushUnique(
      summaryBullets,
      `Detected plot: ${plot.widthFeet} x ${plot.depthFeet} ft${plot.areaSqFt ? ` (${plot.areaSqFt} sqft)` : ""}.`
    );
  }

  if (gridStrategy.recommendedGridType) {
    pushUnique(summaryBullets, `Concept grid: ${gridStrategy.recommendedGridType}.`);
  }

  if (gridStrategy.typicalBayFt) {
    pushUnique(summaryBullets, `Typical bay target: ${gridStrategy.typicalBayFt}.`);
  }

  if (foundation.foundationConcept?.likelyStartingPoint) {
    pushUnique(summaryBullets, `Foundation: ${foundation.foundationConcept.likelyStartingPoint}`);
  }

  pushUnique(summaryBullets, `Structural risk level: ${riskLabel}.`);

  const gridX = Array.isArray(gridStrategy.xGridLinesFt) ? gridStrategy.xGridLinesFt : [];
  const gridY = Array.isArray(gridStrategy.yGridLinesFt) ? gridStrategy.yGridLinesFt : [];

  if (gridX.length || gridY.length) {
    pushUnique(uiHighlights, `Grid lines: X [${gridX.join(", ") || "needs width"}], Y [${gridY.join(", ") || "needs depth"}].`);
  }

  arr(grid.columnPlacementRules).slice(0, 3).forEach((item) => pushUnique(uiHighlights, item));
  arr(grid.beamSlabStrategy).slice(0, 2).forEach((item) => pushUnique(uiHighlights, item));
  arr(foundation.detectedSiteRisks).slice(0, 3).forEach((item) => pushUnique(uiHighlights, item));
  arr(seismic.configurationRiskFlags).slice(0, 3).forEach((item) => pushUnique(uiHighlights, item));
  arr(seismic.loadRiskFlags).slice(0, 2).forEach((item) => pushUnique(uiHighlights, item));

  pushUnique(sectionItems, "Structural Grid");
  arr(gridStrategy.notes).slice(0, 4).forEach((item) => pushUnique(sectionItems, item));
  arr(grid.columnPlacementRules).slice(0, 5).forEach((item) => pushUnique(sectionItems, item));

  pushUnique(sectionItems, "Beam / Slab Coordination");
  arr(grid.beamSlabStrategy).slice(0, 5).forEach((item) => pushUnique(sectionItems, item));
  arr(grid.loadPathWarnings).slice(0, 4).forEach((item) => pushUnique(sectionItems, item));

  pushUnique(sectionItems, "Foundation / Soil");
  arr(foundation.detectedSoilHints).slice(0, 5).forEach((item) => pushUnique(sectionItems, item));
  arr(foundation.soilInvestigationNeeds).slice(0, 5).forEach((item) => pushUnique(sectionItems, item));

  pushUnique(sectionItems, "Seismic / Wind");
  arr(seismic.detectedSeismicHints).slice(0, 4).forEach((item) => pushUnique(sectionItems, item));
  arr(seismic.detectedWindHints).slice(0, 4).forEach((item) => pushUnique(sectionItems, item));
  arr(seismic.configurationRiskFlags).slice(0, 5).forEach((item) => pushUnique(sectionItems, item));
  arr(seismic.loadRiskFlags).slice(0, 4).forEach((item) => pushUnique(sectionItems, item));

  arr(grid.missingInputs).forEach((item) => pushUnique(nextActions, `Confirm: ${item}`));
  arr(foundation.structuralEngineerInputs).slice(0, 5).forEach((item) => pushUnique(nextActions, `Engineer input: ${item}`));
  arr(seismic.missingInputs).forEach((item) => pushUnique(nextActions, `Confirm: ${item}`));

  if (!nextActions.length) {
    pushUnique(nextActions, "Freeze architectural dimensions before structural grid finalization.");
    pushUnique(nextActions, "Confirm soil/SBC, floor count, rooftop tank, seismic zone and wind exposure.");
  }

  pushUnique(professionalBoundary, "This is structural planning intelligence only, not construction-ready structural design.");
  pushUnique(professionalBoundary, "Final column/beam/slab/footing sizes and reinforcement require licensed structural engineer calculations.");
  pushUnique(professionalBoundary, "Use only stamped/approved structural drawings for construction execution.");

  return {
    engineVersion: "G4-1",
    scope: "human_structural_response_merge",
    title:
      riskLabel === "specialist"
        ? "Structural specialist review required"
        : riskLabel === "high"
          ? "High-risk structural review required"
          : "Structural concept coordination ready",
    riskLabel,
    summaryBullets,
    uiHighlights: uiHighlights.slice(0, 10),
    sectionItems: sectionItems.slice(0, 40),
    nextActions: nextActions.slice(0, 12),
    professionalBoundary,
  };
}

export function buildStructuralResponseMergePromptBlock(result: BuildSetuStructuralResponseMergeResult): string {
  const lines: string[] = [];

  lines.push("STRUCTURAL RESPONSE MERGE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Title: ${result.title}`);
  lines.push(`- Risk: ${result.riskLabel}`);

  lines.push("- Summary:");
  result.summaryBullets.slice(0, 8).forEach((item) => lines.push(`  - ${item}`));

  if (result.uiHighlights.length) {
    lines.push("- UI highlights:");
    result.uiHighlights.slice(0, 8).forEach((item) => lines.push(`  - ${item}`));
  }

  if (result.nextActions.length) {
    lines.push("- Next structural actions:");
    result.nextActions.slice(0, 8).forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Professional boundary:");
  result.professionalBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}

export function buildStructuralResponseMarkdown(result: BuildSetuStructuralResponseMergeResult): string {
  const lines: string[] = [];

  lines.push("### Structural coordination");
  lines.push("");
  lines.push(`**${result.title}**`);
  lines.push("");
  result.summaryBullets.slice(0, 6).forEach((item) => lines.push(`- ${item}`));

  if (result.uiHighlights.length) {
    lines.push("");
    lines.push("**Key structural checks**");
    result.uiHighlights.slice(0, 6).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.nextActions.length) {
    lines.push("");
    lines.push("**Next structural actions**");
    result.nextActions.slice(0, 6).forEach((item) => lines.push(`- ${item}`));
  }

  lines.push("");
  lines.push("**Boundary**");
  result.professionalBoundary.forEach((item) => lines.push(`- ${item}`));

  return lines.join("\n");
}
