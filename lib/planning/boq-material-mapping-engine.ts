// BUILDSETU_PHASE_M6_BOQ_MATERIAL_MAPPING_ENGINE

type MaterialTaxonomyLike = {
  detectedIntent?: {
    boqEstimate?: boolean;
    marketPrice?: boolean;
    webSearch?: boolean;
    interiorMaterial?: boolean;
    furniture?: boolean;
  };
  materialItems?: Array<{
    id?: string;
    label?: string;
    category?: string;
    detected?: boolean;
    commonUnits?: string[];
    boqMapping?: string[];
  }>;
  detectedCategories?: string[];
};

type InteriorSelectorLike = {
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
};

type FurnitureQuantityLike = {
  detectedFurnitureIntent?: boolean;
  detectedUseAreas?: string[];
  primaryQuantityBasis?: string[];
  furnitureItems?: Array<{
    id?: string;
    label?: string;
    furnitureType?: string;
    useArea?: string;
    quantityBasis?: string;
    measurementRules?: string[];
    boqBreakup?: string[];
    dependencyChecks?: string[];
    riskNotes?: string[];
  }>;
};

type PriceSourceFreshnessLike = {
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
  canRunSearch?: boolean;
  endpoint?: string;
  searchRequests?: Array<{
    id?: string;
    materialTarget?: string;
    city?: string;
    unit?: string;
    qualityTier?: string;
    query?: string;
    purpose?: string;
    expectedSourceLayer?: string;
    freshnessWindowDays?: number;
  }>;
};

export type BuildSetuBoqMaterialLineItem = {
  id: string;
  itemGroup:
    | "civil_material"
    | "structural_material"
    | "finishing_material"
    | "interior_carpentry"
    | "furniture"
    | "mep_material"
    | "door_window"
    | "facade"
    | "service_or_accessory";
  itemName: string;
  useArea: string;
  quantityBasis: string;
  rateUnit: string;
  quantityStatus: "known_from_prompt" | "needs_measurement" | "derived_later";
  materialSpecStatus: "selected_concept" | "needs_brand_spec" | "needs_professional_spec";
  rateSourceRequired: Array<"official_sor_dsr" | "local_vendor_quote" | "brand_product_catalog" | "public_web_search">;
  pricingStatus: "no_final_rate" | "source_signal_required" | "vendor_quote_required";
  inclusionsToConfirm: string[];
  exclusionsToKeepSeparate: string[];
  dependencyChecks: string[];
  sourceSearchRequestIds: string[];
  confidenceRequired: "high" | "medium" | "low";
  notes: string[];
};

export type BuildSetuBoqMaterialMappingResult = {
  engineVersion: "M6-1";
  scope: "boq_material_mapping_no_final_price_approval";
  canCreateBoqDraft: boolean;
  boqIntentDetected: boolean;
  detectedLocation: string | null;
  detectedBudgetTier: string | null;
  lineItems: BuildSetuBoqMaterialLineItem[];
  groupingSummary: Record<string, number>;
  measurementRules: string[];
  sourceMappingPolicy: string[];
  pricingBoundary: string[];
  missingInputs: string[];
  nextActions: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "item";
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (clean && !list.includes(clean)) list.push(clean);
}

function mapMaterialCategory(category: string): BuildSetuBoqMaterialLineItem["itemGroup"] {
  const c = cleanText(category).toLowerCase();

  if (c.includes("structural")) return "structural_material";
  if (c.includes("civil")) return "civil_material";
  if (c.includes("finishing")) return "finishing_material";
  if (c.includes("interior_board") || c.includes("interior_finish")) return "interior_carpentry";
  if (c.includes("furniture")) return "furniture";
  if (c.includes("mep")) return "mep_material";
  if (c.includes("door_window")) return "door_window";
  if (c.includes("facade")) return "facade";

  return "service_or_accessory";
}

function defaultRateUnit(label: string, commonUnits?: string[], quantityBasis?: string): string {
  const l = label.toLowerCase();
  const units = Array.isArray(commonUnits) ? commonUnits.map(cleanText).filter(Boolean) : [];

  if (quantityBasis) return quantityBasis;
  if (l.includes("kitchen")) return "running_ft";
  if (l.includes("wardrobe") || l.includes("tv unit") || l.includes("media wall")) return "sqft";
  if (l.includes("cement")) return "bag";
  if (l.includes("tmt") || l.includes("steel")) return "kg/tonne";
  if (l.includes("tile") || l.includes("marble") || l.includes("granite")) return "sqft";
  if (l.includes("hardware") || l.includes("hinge") || l.includes("channel")) return "piece/set";

  return units[0] || "unit";
}

function inferQuantityStatus(inputText: string, basis: string): BuildSetuBoqMaterialLineItem["quantityStatus"] {
  const text = inputText.toLowerCase();

  if (basis.includes("running") && has(text, /running ft|rft|running feet|\d+\s*(rft|running)/i)) return "known_from_prompt";
  if (basis.includes("sqft") && has(text, /sqft|square feet|\d+\s*x\s*\d+\s*ft|\d+\s*by\s*\d+/i)) return "known_from_prompt";
  if ((basis.includes("piece") || basis.includes("nos") || basis.includes("set")) && has(text, /piece|pcs|nos|set|\d+\s*(chair|table|bed|sofa|hinge|channel)/i)) return "known_from_prompt";

  return "needs_measurement";
}

function findRelatedSearchRequestIds(target: string, adapter?: WebSearchAdapterLike): string[] {
  const requests = Array.isArray(adapter?.searchRequests) ? adapter?.searchRequests || [] : [];
  const targetText = cleanText(target).toLowerCase();

  return requests
    .filter((request) => {
      const materialTarget = cleanText(request.materialTarget).toLowerCase();
      const query = cleanText(request.query).toLowerCase();
      return materialTarget.includes(targetText) || targetText.includes(materialTarget) || query.includes(targetText.split(" ")[0] || "");
    })
    .map((request) => cleanText(request.id))
    .filter(Boolean)
    .slice(0, 5);
}

function makeLineItem(args: {
  id: string;
  itemGroup: BuildSetuBoqMaterialLineItem["itemGroup"];
  itemName: string;
  useArea: string;
  quantityBasis: string;
  rateUnit: string;
  inputText: string;
  materialSpecStatus?: BuildSetuBoqMaterialLineItem["materialSpecStatus"];
  sourceSearchRequestIds?: string[];
  dependencyChecks?: string[];
  notes?: string[];
}): BuildSetuBoqMaterialLineItem {
  const quantityStatus = inferQuantityStatus(args.inputText, args.quantityBasis);

  return {
    id: args.id,
    itemGroup: args.itemGroup,
    itemName: args.itemName,
    useArea: args.useArea,
    quantityBasis: args.quantityBasis,
    rateUnit: args.rateUnit,
    quantityStatus,
    materialSpecStatus: args.materialSpecStatus || "needs_brand_spec",
    rateSourceRequired: ["local_vendor_quote", "brand_product_catalog", "public_web_search"],
    pricingStatus: quantityStatus === "known_from_prompt" ? "source_signal_required" : "vendor_quote_required",
    inclusionsToConfirm: ["GST", "labour", "transport", "loading/unloading", "installation", "wastage", "warranty"],
    exclusionsToKeepSeparate: ["appliances", "loose furniture", "electrical points", "plumbing changes", "civil repair", "demolition"],
    dependencyChecks: args.dependencyChecks || [],
    sourceSearchRequestIds: args.sourceSearchRequestIds || [],
    confidenceRequired: "high",
    notes: args.notes || [],
  };
}

function buildFurnitureLines(input: {
  inputText: string;
  furniture?: FurnitureQuantityLike;
  adapter?: WebSearchAdapterLike;
}): BuildSetuBoqMaterialLineItem[] {
  const items = Array.isArray(input.furniture?.furnitureItems) ? input.furniture?.furnitureItems || [] : [];

  return items.map((item) => {
    const label = cleanText(item.label || item.id || "Furniture item");
    const basis = cleanText(item.quantityBasis || defaultRateUnit(label));
    const group: BuildSetuBoqMaterialLineItem["itemGroup"] =
      item.furnitureType === "loose_furniture" ? "furniture" : item.furnitureType === "service_or_accessory" ? "service_or_accessory" : "interior_carpentry";

    return makeLineItem({
      id: `boq_${slug(label)}_${slug(item.useArea || "area")}`,
      itemGroup: group,
      itemName: label,
      useArea: cleanText(item.useArea || "interior"),
      quantityBasis: basis,
      rateUnit: basis,
      inputText: input.inputText,
      materialSpecStatus: "selected_concept",
      sourceSearchRequestIds: findRelatedSearchRequestIds(label, input.adapter),
      dependencyChecks: Array.isArray(item.dependencyChecks) ? item.dependencyChecks.map(cleanText).filter(Boolean) : [],
      notes: [
        "Keep carcass, shutter, finish, hardware, accessory and labour split if detailed BOQ is required.",
        "Final quantity must follow agreed vendor measurement method.",
      ],
    });
  });
}

function buildDetectedMaterialLines(input: {
  inputText: string;
  taxonomy?: MaterialTaxonomyLike;
  adapter?: WebSearchAdapterLike;
}): BuildSetuBoqMaterialLineItem[] {
  const items = Array.isArray(input.taxonomy?.materialItems) ? input.taxonomy?.materialItems || [] : [];

  return items
    .filter((item) => item.detected)
    .slice(0, 20)
    .map((item) => {
      const label = cleanText(item.label || item.id || "Material");
      const group = mapMaterialCategory(item.category || "");
      const unit = defaultRateUnit(label, item.commonUnits);

      return makeLineItem({
        id: `boq_material_${slug(label)}`,
        itemGroup: group,
        itemName: label,
        useArea: "project_material",
        quantityBasis: unit,
        rateUnit: unit,
        inputText: input.inputText,
        materialSpecStatus: group === "mep_material" || group === "structural_material" ? "needs_professional_spec" : "needs_brand_spec",
        sourceSearchRequestIds: findRelatedSearchRequestIds(label, input.adapter),
        dependencyChecks: Array.isArray(item.boqMapping) ? item.boqMapping.map(cleanText).filter(Boolean).slice(0, 6) : [],
        notes: [
          "This material line is a mapping placeholder until exact quantity/spec is confirmed.",
          "Do not approve final rate without source layer and vendor/spec verification.",
        ],
      });
    });
}

function dedupeLineItems(lines: BuildSetuBoqMaterialLineItem[]): BuildSetuBoqMaterialLineItem[] {
  const out: BuildSetuBoqMaterialLineItem[] = [];
  const seen = new Set<string>();

  lines.forEach((line) => {
    const key = `${line.itemGroup}|${line.itemName.toLowerCase()}|${line.useArea.toLowerCase()}|${line.quantityBasis}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(line);
  });

  return out;
}

function groupingSummary(lines: BuildSetuBoqMaterialLineItem[]): Record<string, number> {
  return lines.reduce<Record<string, number>>((acc, line) => {
    acc[line.itemGroup] = (acc[line.itemGroup] || 0) + 1;
    return acc;
  }, {});
}

export function buildBoqMaterialMappingEngine(input: {
  inputText: string;
  materialTaxonomyEngine?: MaterialTaxonomyLike;
  interiorMaterialSelectorEngine?: InteriorSelectorLike;
  furnitureQuantityBasisEngine?: FurnitureQuantityLike;
  materialPriceSourceFreshnessEngine?: PriceSourceFreshnessLike;
  materialWebSearchRateAdapter?: WebSearchAdapterLike;
}): BuildSetuBoqMaterialMappingResult {
  const text = cleanText(input.inputText);

  const boqIntentDetected =
    Boolean(input.materialTaxonomyEngine?.detectedIntent?.boqEstimate) ||
    has(text, /boq|estimate|quantity|rate analysis|costing|bill of quantity|bill of quantities/i);

  const furnitureLines = buildFurnitureLines({
    inputText: text,
    furniture: input.furnitureQuantityBasisEngine,
    adapter: input.materialWebSearchRateAdapter,
  });

  const materialLines = buildDetectedMaterialLines({
    inputText: text,
    taxonomy: input.materialTaxonomyEngine,
    adapter: input.materialWebSearchRateAdapter,
  });

  const lineItems = dedupeLineItems([...furnitureLines, ...materialLines]).slice(0, 30);

  const missingInputs: string[] = [];
  if (!lineItems.length) missingInputs.push("No BOQ material/furniture targets detected.");
  if (!input.materialPriceSourceFreshnessEngine?.detectedLocation) missingInputs.push("City/location missing for rate-source mapping.");
  if (!input.materialPriceSourceFreshnessEngine?.detectedBudgetTier) missingInputs.push("Budget/quality tier missing for BOQ material mapping.");
  if (!has(text, /sqft|square feet|running ft|rft|piece|set|bag|kg|tonne|sheet|box|\d+\s*x\s*\d+/i)) {
    missingInputs.push("Quantity basis missing for one or more BOQ lines.");
  }

  return {
    engineVersion: "M6-1",
    scope: "boq_material_mapping_no_final_price_approval",
    canCreateBoqDraft: lineItems.length > 0,
    boqIntentDetected,
    detectedLocation: input.materialPriceSourceFreshnessEngine?.detectedLocation || null,
    detectedBudgetTier: input.materialPriceSourceFreshnessEngine?.detectedBudgetTier || null,
    lineItems,
    groupingSummary: groupingSummary(lineItems),
    measurementRules: [
      "Use running feet for modular kitchen only when lower/upper/tall units are separately defined.",
      "Use sqft for wardrobe/TV unit/front elevation carpentry when width x height basis is agreed.",
      "Use piece/set for hardware, accessories and loose furniture.",
      "Use sheet only for raw board procurement; convert to sqft only with sheet size and wastage.",
      "Keep labour, GST, transport, loading/unloading and installation as separate scope fields.",
    ],
    sourceMappingPolicy: [
      "Every BOQ line can hold multiple source signals but no source signal is final rate by itself.",
      "Official SOR/DSR is base reference; local vendor quote is procurement signal.",
      "Public web-search is source discovery and price-range signal only.",
      "Brand catalog is SKU/spec signal only until local availability and landed cost are confirmed.",
      "Final BOQ rate requires source date, city, unit, spec, scope and confidence tag.",
    ],
    pricingBoundary: [
      "M6 does not approve or write final live market rates.",
      "M6 maps line items and required source layers only.",
      "M6 must not mix material selection, web-search results and final BOQ approval into one object.",
      "Final rate approval needs M7 human/UI review or a later procurement workflow.",
    ],
    missingInputs,
    nextActions: [
      "Review generated BOQ material line items.",
      "Confirm quantity basis and measurements for each line.",
      "Run/attach web-search or vendor quote source signals where required.",
      "Tag freshness and confidence for every source.",
      "Only then fill final BOQ rates in a controlled estimate workflow.",
    ],
    safetyBoundary: [
      "BOQ material mapping is not procurement approval.",
      "Electrical, plumbing, fire and structural materials require professional/specification verification.",
      "Client/vendor agreement is required for final measurement method and rate inclusions.",
    ],
  };
}

export function buildBoqMaterialMappingPromptBlock(result: BuildSetuBoqMaterialMappingResult): string {
  const lines: string[] = [];

  lines.push("BOQ MATERIAL MAPPING INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Can create BOQ draft: ${result.canCreateBoqDraft ? "yes" : "no"}`);
  lines.push(`- BOQ intent: ${result.boqIntentDetected ? "yes" : "no"}`);
  lines.push(`- Location: ${result.detectedLocation || "missing"}`);
  lines.push(`- Budget tier: ${result.detectedBudgetTier || "missing"}`);
  lines.push(`- Line items: ${result.lineItems.length}`);

  if (result.lineItems.length) {
    lines.push("- BOQ line item draft:");
    result.lineItems.slice(0, 12).forEach((item) => {
      lines.push(`  - ${item.itemName} | ${item.itemGroup} | ${item.quantityBasis} | ${item.pricingStatus}`);
    });
  }

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Pricing boundary:");
  result.pricingBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
