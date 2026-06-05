// BUILDSETU_PHASE_M7_MATERIAL_RESPONSE_MERGE_ENGINE

type MaterialTaxonomyLike = {
  engineVersion?: string;
  scope?: string;
  detectedCategories?: string[];
  detectedIntent?: Record<string, unknown>;
  materialItems?: Array<{
    id?: string;
    label?: string;
    category?: string;
    detected?: boolean;
    commonUnits?: string[];
  }>;
  missingInputs?: string[];
};

type InteriorSelectorLike = {
  engineVersion?: string;
  scope?: string;
  detectedUseAreas?: string[];
  detectedQualityTier?: string;
  moistureRisk?: string;
  recommendedBoardMaterials?: Array<{
    useArea?: string;
    recommended?: string;
    alternatives?: string[];
    avoid?: string[];
    reason?: string;
  }>;
  recommendedFinishMaterials?: Array<{
    useArea?: string;
    recommended?: string;
    alternatives?: string[];
    avoid?: string[];
    reason?: string;
  }>;
  kitchenMaterialGuidance?: string[];
  wardrobeMaterialGuidance?: string[];
  missingInputs?: string[];
};

type FurnitureQuantityLike = {
  engineVersion?: string;
  scope?: string;
  detectedFurnitureIntent?: boolean;
  detectedUseAreas?: string[];
  primaryQuantityBasis?: string[];
  furnitureItems?: Array<{
    label?: string;
    useArea?: string;
    quantityBasis?: string;
    furnitureType?: string;
  }>;
  missingInputs?: string[];
};

type PriceFreshnessLike = {
  engineVersion?: string;
  scope?: string;
  priceIntentDetected?: boolean;
  webSearchRequested?: boolean;
  detectedLocation?: string | null;
  detectedBudgetTier?: string | null;
  detectedMaterialTargets?: string[];
  detectedUnitTargets?: string[];
  sourceLayers?: Array<{
    layer?: string;
    freshnessWindowDays?: number;
    confidenceBase?: string;
  }>;
  missingInputs?: string[];
};

type WebSearchAdapterLike = {
  engineVersion?: string;
  scope?: string;
  endpoint?: string;
  canRunSearch?: boolean;
  blockReasons?: string[];
  searchRequests?: Array<{
    id?: string;
    materialTarget?: string;
    city?: string;
    unit?: string;
    qualityTier?: string;
    query?: string;
    purpose?: string;
  }>;
};

type BoqMappingLike = {
  engineVersion?: string;
  scope?: string;
  canCreateBoqDraft?: boolean;
  boqIntentDetected?: boolean;
  detectedLocation?: string | null;
  detectedBudgetTier?: string | null;
  lineItems?: Array<{
    id?: string;
    itemGroup?: string;
    itemName?: string;
    useArea?: string;
    quantityBasis?: string;
    rateUnit?: string;
    quantityStatus?: string;
    materialSpecStatus?: string;
    pricingStatus?: string;
    rateSourceRequired?: string[];
    sourceSearchRequestIds?: string[];
  }>;
  groupingSummary?: Record<string, number>;
  missingInputs?: string[];
};

export type BuildSetuMaterialResponseMergeResult = {
  engineVersion: "M7-1";
  scope: "material_human_response_ui_merge_no_final_price";
  title: string;
  readiness: "ready_for_material_review" | "needs_inputs_before_pricing" | "ready_for_boq_draft_review";
  summaryBullets: string[];
  materialSections: {
    materialSelection: string[];
    interiorGuidance: string[];
    quantityBasis: string[];
    priceSourcePolicy: string[];
    webSearchPlan: string[];
    boqMaterialMapping: string[];
    missingInputs: string[];
    safetyBoundary: string[];
  };
  uiHighlights: string[];
  primaryActions: string[];
  pricingBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (clean && !list.includes(clean)) list.push(clean);
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => cleanText(item)).filter(Boolean) : [];
}

export function buildMaterialResponseMergeEngine(input: {
  materialTaxonomyEngine?: MaterialTaxonomyLike;
  interiorMaterialSelectorEngine?: InteriorSelectorLike;
  furnitureQuantityBasisEngine?: FurnitureQuantityLike;
  materialPriceSourceFreshnessEngine?: PriceFreshnessLike;
  materialWebSearchRateAdapter?: WebSearchAdapterLike;
  boqMaterialMappingEngine?: BoqMappingLike;
}): BuildSetuMaterialResponseMergeResult {
  const taxonomy = input.materialTaxonomyEngine || {};
  const selector = input.interiorMaterialSelectorEngine || {};
  const furniture = input.furnitureQuantityBasisEngine || {};
  const price = input.materialPriceSourceFreshnessEngine || {};
  const web = input.materialWebSearchRateAdapter || {};
  const boq = input.boqMaterialMappingEngine || {};

  const summaryBullets: string[] = [];
  const materialSelection: string[] = [];
  const interiorGuidance: string[] = [];
  const quantityBasis: string[] = [];
  const priceSourcePolicy: string[] = [];
  const webSearchPlan: string[] = [];
  const boqMaterialMapping: string[] = [];
  const missingInputs: string[] = [];
  const safetyBoundary: string[] = [];
  const uiHighlights: string[] = [];
  const primaryActions: string[] = [];

  const detectedItems = Array.isArray(taxonomy.materialItems)
    ? taxonomy.materialItems.filter((item) => item.detected)
    : [];

  pushUnique(summaryBullets, `Material taxonomy detected ${detectedItems.length} relevant material item(s).`);
  if (arr(taxonomy.detectedCategories).length) {
    pushUnique(summaryBullets, `Detected material categories: ${arr(taxonomy.detectedCategories).join(", ")}.`);
  }

  if (arr(selector.detectedUseAreas).length) {
    pushUnique(summaryBullets, `Interior use areas: ${arr(selector.detectedUseAreas).join(", ")}.`);
  }

  if (selector.detectedQualityTier) {
    pushUnique(summaryBullets, `Quality tier: ${selector.detectedQualityTier}.`);
  }

  if (selector.moistureRisk) {
    pushUnique(summaryBullets, `Moisture condition: ${selector.moistureRisk}.`);
  }

  if (boq.canCreateBoqDraft) {
    pushUnique(summaryBullets, `BOQ draft mapping ready with ${(boq.lineItems || []).length} line item(s).`);
  }

  if (price.priceIntentDetected) {
    pushUnique(summaryBullets, `Price-source policy ready for ${price.detectedLocation || "missing location"}.`);
  }

  detectedItems.slice(0, 10).forEach((item) => {
    pushUnique(
      materialSelection,
      `${cleanText(item.label || item.id)} — ${cleanText(item.category)} | units: ${arr(item.commonUnits).join(", ") || "unit to confirm"}`
    );
  });

  (selector.recommendedBoardMaterials || []).slice(0, 8).forEach((item) => {
    pushUnique(
      interiorGuidance,
      `${cleanText(item.useArea)} board: ${cleanText(item.recommended)}${item.reason ? ` — ${cleanText(item.reason)}` : ""}`
    );
  });

  (selector.recommendedFinishMaterials || []).slice(0, 8).forEach((item) => {
    pushUnique(
      interiorGuidance,
      `${cleanText(item.useArea)} finish: ${cleanText(item.recommended)}${item.reason ? ` — ${cleanText(item.reason)}` : ""}`
    );
  });

  arr(selector.kitchenMaterialGuidance).slice(0, 5).forEach((item) => pushUnique(interiorGuidance, `Kitchen: ${item}`));
  arr(selector.wardrobeMaterialGuidance).slice(0, 5).forEach((item) => pushUnique(interiorGuidance, `Wardrobe: ${item}`));

  (furniture.furnitureItems || []).slice(0, 10).forEach((item) => {
    pushUnique(
      quantityBasis,
      `${cleanText(item.label)} — ${cleanText(item.useArea)} | basis: ${cleanText(item.quantityBasis)} | type: ${cleanText(item.furnitureType)}`
    );
  });

  if (arr(furniture.primaryQuantityBasis).length) {
    pushUnique(quantityBasis, `Primary quantity basis: ${arr(furniture.primaryQuantityBasis).join(", ")}.`);
  }

  (price.sourceLayers || []).slice(0, 6).forEach((layer) => {
    pushUnique(
      priceSourcePolicy,
      `${cleanText(layer.layer)} — freshness ${layer.freshnessWindowDays || "n/a"} days | base confidence: ${cleanText(layer.confidenceBase)}`
    );
  });

  pushUnique(priceSourcePolicy, "Final rate must show city, date, unit, source, confidence, GST, labour and transport scope.");
  pushUnique(priceSourcePolicy, "Official SOR/DSR, vendor quote, brand catalog and web-search must remain separate source layers.");

  if (web.canRunSearch) {
    pushUnique(webSearchPlan, `Web-search adapter ready at ${web.endpoint || "/api/agent-tools/web-search"}.`);
    pushUnique(webSearchPlan, `${(web.searchRequests || []).length} search request(s) prepared.`);
    (web.searchRequests || []).slice(0, 8).forEach((request) => {
      pushUnique(webSearchPlan, `${cleanText(request.materialTarget)} | ${cleanText(request.purpose)} | ${cleanText(request.query)}`);
    });
  } else {
    pushUnique(webSearchPlan, "Web-search adapter blocked until required inputs are complete.");
    arr(web.blockReasons).forEach((item) => pushUnique(webSearchPlan, `Blocked: ${item}`));
  }

  (boq.lineItems || []).slice(0, 12).forEach((item) => {
    pushUnique(
      boqMaterialMapping,
      `${cleanText(item.itemName)} — ${cleanText(item.itemGroup)} | ${cleanText(item.quantityBasis)} | ${cleanText(item.pricingStatus)}`
    );
  });

  if (boq.groupingSummary) {
    Object.entries(boq.groupingSummary).forEach(([group, count]) => {
      pushUnique(boqMaterialMapping, `Group ${group}: ${count} item(s).`);
    });
  }

  [
    ...arr(taxonomy.missingInputs),
    ...arr(selector.missingInputs),
    ...arr(furniture.missingInputs),
    ...arr(price.missingInputs),
    ...arr(boq.missingInputs),
  ].forEach((item) => pushUnique(missingInputs, item));

  pushUnique(safetyBoundary, "Material response merge is not final procurement approval.");
  pushUnique(safetyBoundary, "No web-search or vendor rate should be treated as final without source verification.");
  pushUnique(safetyBoundary, "Electrical, plumbing, fire and structural materials require professional/specification verification.");
  pushUnique(safetyBoundary, "Final BOQ rate approval must remain separate from material recommendation.");

  pushUnique(uiHighlights, `Material items: ${detectedItems.length}`);
  pushUnique(uiHighlights, `BOQ lines: ${(boq.lineItems || []).length}`);
  pushUnique(uiHighlights, `Web-search requests: ${(web.searchRequests || []).length}`);
  pushUnique(uiHighlights, `Location: ${price.detectedLocation || "missing"}`);
  pushUnique(uiHighlights, `Budget: ${price.detectedBudgetTier || "missing"}`);

  if (boq.canCreateBoqDraft) {
    pushUnique(primaryActions, "Review BOQ material draft lines.");
  }
  if (web.canRunSearch) {
    pushUnique(primaryActions, "Run material web-search source checks.");
  }
  pushUnique(primaryActions, "Confirm vendor quote and source freshness before final rate.");
  pushUnique(primaryActions, "Keep GST, labour, transport and installation separate.");

  const readiness: BuildSetuMaterialResponseMergeResult["readiness"] = missingInputs.length
    ? "needs_inputs_before_pricing"
    : boq.canCreateBoqDraft
      ? "ready_for_boq_draft_review"
      : "ready_for_material_review";

  return {
    engineVersion: "M7-1",
    scope: "material_human_response_ui_merge_no_final_price",
    title:
      readiness === "ready_for_boq_draft_review"
        ? "Material and BOQ draft mapping ready"
        : readiness === "needs_inputs_before_pricing"
          ? "Material planning ready; pricing inputs needed"
          : "Material selection review ready",
    readiness,
    summaryBullets,
    materialSections: {
      materialSelection: materialSelection.slice(0, 15),
      interiorGuidance: interiorGuidance.slice(0, 18),
      quantityBasis: quantityBasis.slice(0, 15),
      priceSourcePolicy: priceSourcePolicy.slice(0, 12),
      webSearchPlan: webSearchPlan.slice(0, 15),
      boqMaterialMapping: boqMaterialMapping.slice(0, 18),
      missingInputs: missingInputs.slice(0, 12),
      safetyBoundary,
    },
    uiHighlights,
    primaryActions,
    pricingBoundary: [
      "M7 displays material/BOQ/source intelligence only.",
      "M7 does not approve final market rates.",
      "Final price must come from verified source layer with city/date/unit/scope.",
      "BOQ line item, source signal and approved rate must remain separate objects.",
    ],
  };
}

export function buildMaterialResponseMergePromptBlock(result: BuildSetuMaterialResponseMergeResult): string {
  const lines: string[] = [];

  lines.push("MATERIAL RESPONSE MERGE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Title: ${result.title}`);
  lines.push(`- Readiness: ${result.readiness}`);

  lines.push("- Summary:");
  result.summaryBullets.slice(0, 8).forEach((item) => lines.push(`  - ${item}`));

  lines.push("- UI highlights:");
  result.uiHighlights.slice(0, 8).forEach((item) => lines.push(`  - ${item}`));

  lines.push("- Primary actions:");
  result.primaryActions.slice(0, 8).forEach((item) => lines.push(`  - ${item}`));

  lines.push("- Pricing boundary:");
  result.pricingBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}

export function buildMaterialResponseMarkdown(result: BuildSetuMaterialResponseMergeResult): string {
  const lines: string[] = [];

  lines.push("### Material, pricing-source and BOQ planning");
  lines.push("");
  lines.push(`**${result.title}**`);
  lines.push("");
  result.summaryBullets.slice(0, 8).forEach((item) => lines.push(`- ${item}`));

  const sections: Array<[string, string[]]> = [
    ["Material selection", result.materialSections.materialSelection],
    ["Interior guidance", result.materialSections.interiorGuidance],
    ["Quantity basis", result.materialSections.quantityBasis],
    ["Price source policy", result.materialSections.priceSourcePolicy],
    ["Web-search plan", result.materialSections.webSearchPlan],
    ["BOQ material mapping", result.materialSections.boqMaterialMapping],
  ];

  sections.forEach(([title, items]) => {
    if (!items.length) return;
    lines.push("");
    lines.push(`**${title}**`);
    items.slice(0, 10).forEach((item) => lines.push(`- ${item}`));
  });

  if (result.materialSections.missingInputs.length) {
    lines.push("");
    lines.push("**Missing inputs**");
    result.materialSections.missingInputs.forEach((item) => lines.push(`- ${item}`));
  }

  lines.push("");
  lines.push("**Pricing boundary**");
  result.pricingBoundary.forEach((item) => lines.push(`- ${item}`));

  return lines.join("\n");
}
