// BUILDSETU_PHASE_M4_PRICE_SOURCE_FRESHNESS_ENGINE

type MaterialTaxonomyLike = {
  detectedIntent?: {
    marketPrice?: boolean;
    webSearch?: boolean;
    boqEstimate?: boolean;
    interiorMaterial?: boolean;
    furniture?: boolean;
  };
  detectedCategories?: string[];
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
  detectedUseAreas?: string[];
  detectedQualityTier?: string;
  moistureRisk?: string;
};

type FurnitureQuantityLike = {
  detectedFurnitureIntent?: boolean;
  detectedUseAreas?: string[];
  primaryQuantityBasis?: string[];
  furnitureItems?: Array<{
    id?: string;
    label?: string;
    quantityBasis?: string;
    useArea?: string;
  }>;
};

export type BuildSetuMaterialPriceSourceLayer = {
  layer:
    | "official_sor_dsr"
    | "local_vendor_quote"
    | "brand_product_catalog"
    | "public_web_search"
    | "historical_internal_rate"
    | "macro_price_trend";
  purpose: string;
  acceptedFor: string[];
  notAcceptedFor: string[];
  freshnessWindowDays: number;
  confidenceBase: "high" | "medium" | "low";
  requiredFields: string[];
};

export type BuildSetuMaterialPriceSourceFreshnessResult = {
  engineVersion: "M4-1";
  scope: "price_source_freshness_only_no_live_fetch";
  priceIntentDetected: boolean;
  webSearchRequested: boolean;
  detectedLocation: string | null;
  detectedBudgetTier: string | null;
  detectedMaterialTargets: string[];
  detectedUnitTargets: string[];
  sourceLayers: BuildSetuMaterialPriceSourceLayer[];
  freshnessPolicy: string[];
  confidencePolicy: string[];
  priceComparisonSchema: string[];
  stalePriceWarnings: string[];
  missingInputs: string[];
  nextActions: string[];
  integrationBoundary: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (clean && !list.includes(clean)) list.push(clean);
}

function detectLocation(text: string): string | null {
  const cities = [
    "raipur",
    "delhi",
    "mumbai",
    "pune",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "chennai",
    "kolkata",
    "lucknow",
    "indore",
    "bhopal",
    "nagpur",
    "surat",
    "ahmedabad",
    "jaipur",
    "patna",
    "ranchi",
    "bhubaneswar",
  ];

  const lower = text.toLowerCase();
  const found = cities.find((city) => lower.includes(city));
  return found || null;
}

function detectBudgetTier(text: string): string | null {
  if (has(text, /luxury|ultra premium|high end|high-end/i)) return "luxury";
  if (has(text, /premium|best|top quality|high quality/i)) return "premium";
  if (has(text, /standard|normal|mid range|mid-range/i)) return "standard";
  if (has(text, /economy|budget|low budget|cheap|affordable/i)) return "economy";
  return null;
}

function detectPriceIntent(text: string, taxonomy?: MaterialTaxonomyLike) {
  return Boolean(taxonomy?.detectedIntent?.marketPrice) || has(text, /price|pricing|rate|cost|market|vendor|quote|current|latest|estimate|boq/i);
}

function detectWebSearchIntent(text: string, taxonomy?: MaterialTaxonomyLike) {
  return Boolean(taxonomy?.detectedIntent?.webSearch) || has(text, /web search|web-search|online|latest|current market|search|internet/i);
}

function detectMaterialTargets(text: string, taxonomy?: MaterialTaxonomyLike, furniture?: FurnitureQuantityLike) {
  const targets: string[] = [];

  const items = Array.isArray(taxonomy?.materialItems) ? taxonomy?.materialItems || [] : [];
  items.filter((item) => item.detected).forEach((item) => pushUnique(targets, item.label || item.id || ""));

  const furnitureItems = Array.isArray(furniture?.furnitureItems) ? furniture?.furnitureItems || [] : [];
  furnitureItems.forEach((item) => pushUnique(targets, item.label || item.id || ""));

  const manualTargets: Array<[RegExp, string]> = [
    [/plywood|ply|bwr|bwp|mr grade/i, "Plywood / BWR / BWP"],
    [/mdf/i, "MDF"],
    [/hdhmr/i, "HDHMR"],
    [/laminate|mica/i, "Laminate"],
    [/acrylic/i, "Acrylic shutter finish"],
    [/pu paint|duco/i, "PU / Duco finish"],
    [/tile|tiles|vitrified|ceramic/i, "Tiles"],
    [/cement/i, "Cement"],
    [/tmt|steel|sariya/i, "TMT Steel"],
    [/modular kitchen/i, "Modular Kitchen"],
    [/wardrobe/i, "Wardrobe"],
    [/tv unit/i, "TV Unit"],
    [/hardware|hinge|channel|soft close/i, "Interior Hardware"],
  ];

  manualTargets.forEach(([pattern, label]) => {
    if (has(text, pattern)) pushUnique(targets, label);
  });

  return targets.slice(0, 20);
}

function detectUnitTargets(text: string, taxonomy?: MaterialTaxonomyLike, furniture?: FurnitureQuantityLike) {
  const units: string[] = [];

  if (has(text, /sqft|square feet|sq ft/i)) pushUnique(units, "sqft");
  if (has(text, /running ft|rft|running feet/i)) pushUnique(units, "running_ft");
  if (has(text, /piece|pcs|nos|number/i)) pushUnique(units, "piece/nos");
  if (has(text, /bag|bags/i)) pushUnique(units, "bag");
  if (has(text, /kg|tonne|ton/i)) pushUnique(units, "kg/tonne");
  if (has(text, /sheet|sheets/i)) pushUnique(units, "sheet");
  if (has(text, /box|boxes/i)) pushUnique(units, "box");

  const items = Array.isArray(taxonomy?.materialItems) ? taxonomy?.materialItems || [] : [];
  items.filter((item) => item.detected).forEach((item) => {
    (item.commonUnits || []).forEach((unit) => pushUnique(units, unit));
  });

  const basis = Array.isArray(furniture?.primaryQuantityBasis) ? furniture?.primaryQuantityBasis || [] : [];
  basis.forEach((unit) => pushUnique(units, unit));

  return units.slice(0, 15);
}

function buildSourceLayers(): BuildSetuMaterialPriceSourceLayer[] {
  return [
    {
      layer: "official_sor_dsr",
      purpose: "Base reference rate for estimate benchmarking, not direct procurement price.",
      acceptedFor: ["base estimate", "rate sanity check", "government-style BOQ reference"],
      notAcceptedFor: ["final vendor purchase", "brand SKU finalization", "current retail quote"],
      freshnessWindowDays: 365,
      confidenceBase: "high",
      requiredFields: ["authority/source name", "schedule year/version", "item description", "unit", "rate", "location applicability"],
    },
    {
      layer: "local_vendor_quote",
      purpose: "Procurement-ready market quote from local supplier/vendor.",
      acceptedFor: ["final purchase comparison", "city-specific material rate", "transport/loading scope"],
      notAcceptedFor: ["universal rate database", "long-term fixed pricing"],
      freshnessWindowDays: 15,
      confidenceBase: "high",
      requiredFields: ["vendor name", "city", "date", "brand/spec", "unit", "rate", "GST", "transport", "labour/install scope"],
    },
    {
      layer: "brand_product_catalog",
      purpose: "Brand/SKU/spec-level product option and MRP/listing reference.",
      acceptedFor: ["product comparison", "spec matching", "SKU option shortlisting"],
      notAcceptedFor: ["local landed cost without vendor quote", "labour-inclusive BOQ"],
      freshnessWindowDays: 30,
      confidenceBase: "medium",
      requiredFields: ["brand", "model/SKU", "specification", "unit/pack size", "price/listing", "date", "seller/source"],
    },
    {
      layer: "public_web_search",
      purpose: "Fresh market signal from web search where API/vendor quote is unavailable.",
      acceptedFor: ["rough current signal", "source discovery", "price range hint"],
      notAcceptedFor: ["final procurement", "approved BOQ rate without verification"],
      freshnessWindowDays: 30,
      confidenceBase: "low",
      requiredFields: ["query", "source URL/title", "observed date", "material/spec", "unit", "price/range", "confidence"],
    },
    {
      layer: "historical_internal_rate",
      purpose: "Past project/internal rate memory for comparison only.",
      acceptedFor: ["trend comparison", "budget rough check", "variance flag"],
      notAcceptedFor: ["current market quote", "final procurement"],
      freshnessWindowDays: 90,
      confidenceBase: "medium",
      requiredFields: ["project/date", "city", "item", "unit", "rate", "scope", "quality tier"],
    },
    {
      layer: "macro_price_trend",
      purpose: "Steel/cement/material trend and escalation signal.",
      acceptedFor: ["escalation warning", "trend direction", "contingency planning"],
      notAcceptedFor: ["item-level procurement rate", "vendor quote replacement"],
      freshnessWindowDays: 60,
      confidenceBase: "medium",
      requiredFields: ["index/report source", "period", "category", "trend direction", "region if available"],
    },
  ];
}

export function buildMaterialPriceSourceFreshnessEngine(input: {
  inputText: string;
  materialTaxonomyEngine?: MaterialTaxonomyLike;
  interiorMaterialSelectorEngine?: InteriorSelectorLike;
  furnitureQuantityBasisEngine?: FurnitureQuantityLike;
}): BuildSetuMaterialPriceSourceFreshnessResult {
  const text = cleanText(input.inputText);
  const priceIntentDetected = detectPriceIntent(text, input.materialTaxonomyEngine);
  const webSearchRequested = detectWebSearchIntent(text, input.materialTaxonomyEngine);
  const detectedLocation = detectLocation(text);
  const detectedBudgetTier = detectBudgetTier(text) || cleanText(input.interiorMaterialSelectorEngine?.detectedQualityTier) || null;
  const detectedMaterialTargets = detectMaterialTargets(text, input.materialTaxonomyEngine, input.furnitureQuantityBasisEngine);
  const detectedUnitTargets = detectUnitTargets(text, input.materialTaxonomyEngine, input.furnitureQuantityBasisEngine);

  const missingInputs: string[] = [];

  if (priceIntentDetected && !detectedLocation) {
    missingInputs.push("City/location is required before comparing market rates.");
  }

  if (priceIntentDetected && !detectedBudgetTier) {
    missingInputs.push("Budget/quality tier is required: economy, standard, premium or luxury.");
  }

  if (priceIntentDetected && !detectedMaterialTargets.length) {
    missingInputs.push("Material/product target is not specific enough for price lookup.");
  }

  if (priceIntentDetected && !detectedUnitTargets.length) {
    missingInputs.push("Unit basis is required: sqft, running ft, piece, bag, kg/tonne, sheet or box.");
  }

  if (webSearchRequested && !priceIntentDetected) {
    missingInputs.push("Web-search intent detected but price/material target should be confirmed.");
  }

  return {
    engineVersion: "M4-1",
    scope: "price_source_freshness_only_no_live_fetch",
    priceIntentDetected,
    webSearchRequested,
    detectedLocation,
    detectedBudgetTier: detectedBudgetTier || null,
    detectedMaterialTargets,
    detectedUnitTargets,
    sourceLayers: buildSourceLayers(),
    freshnessPolicy: [
      "Local vendor quote should be treated fresh for 7-15 days depending volatility.",
      "Public web-search/product listing should be treated fresh for up to 30 days only.",
      "Official SOR/DSR can be used as base reference for the schedule year, not as live market quote.",
      "Internal historical rates older than 90 days must be marked stale unless only used for trend comparison.",
      "Steel, cement and fuel-linked items need shorter freshness checks due to high volatility.",
    ],
    confidencePolicy: [
      "High confidence: local vendor quote with city, date, brand/spec, unit and GST/transport/labour scope.",
      "Medium confidence: official schedule reference or brand catalog with clear unit and date.",
      "Low confidence: web-search result without vendor confirmation or unclear unit/scope.",
      "No confidence: price without date, city, unit, source or specification.",
    ],
    priceComparisonSchema: [
      "materialName",
      "brandOrSpec",
      "qualityTier",
      "unit",
      "quantityBasis",
      "city",
      "sourceLayer",
      "sourceNameOrUrl",
      "observedDate",
      "rateOrRange",
      "gstIncluded",
      "labourIncluded",
      "transportIncluded",
      "confidence",
      "freshnessStatus",
      "notes",
    ],
    stalePriceWarnings: [
      "Price older than freshness window must be labelled stale.",
      "Different units must not be compared directly without conversion.",
      "GST/labour/transport/loading/unloading/wastage must be shown separately.",
      "Sponsored/vendor listing is only a vendor signal, not final BOQ approval.",
      "Final procurement should compare at least 2-3 local quotes.",
    ],
    missingInputs,
    nextActions: [
      "Confirm city/location.",
      "Confirm exact material/spec/brand or acceptable alternatives.",
      "Confirm unit and quantity basis.",
      "Confirm whether rate should include GST, labour, transport and installation.",
      "Use M-5 web-search adapter or local quote layer to collect live signals.",
      "Use M-6 BOQ mapping only after rate source layer is selected.",
    ],
    integrationBoundary: [
      "M4 defines price source rules only; it does not fetch live prices.",
      "M4 output must not overwrite material taxonomy, interior selector or furniture quantity basis.",
      "M4 price source objects must remain separate from final BOQ line items until M-6 mapping.",
    ],
    safetyBoundary: [
      "Do not present M4 policy output as current market price.",
      "Do not finalize procurement without source date, city, unit and vendor/source verification.",
      "Safety-critical electrical, structural, fire and plumbing materials require professional/specification verification.",
    ],
  };
}

export function buildMaterialPriceSourceFreshnessPromptBlock(result: BuildSetuMaterialPriceSourceFreshnessResult): string {
  const lines: string[] = [];

  lines.push("MATERIAL PRICE SOURCE + FRESHNESS INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Price intent: ${result.priceIntentDetected ? "yes" : "no"}`);
  lines.push(`- Web search requested: ${result.webSearchRequested ? "yes" : "no"}`);
  lines.push(`- Location: ${result.detectedLocation || "missing"}`);
  lines.push(`- Budget tier: ${result.detectedBudgetTier || "missing"}`);

  if (result.detectedMaterialTargets.length) {
    lines.push("- Material targets:");
    result.detectedMaterialTargets.slice(0, 10).forEach((item) => lines.push(`  - ${item}`));
  }

  if (result.detectedUnitTargets.length) {
    lines.push(`- Unit targets: ${result.detectedUnitTargets.join(", ")}`);
  }

  lines.push("- Source layers:");
  result.sourceLayers.forEach((layer) => {
    lines.push(`  - ${layer.layer}: ${layer.purpose} | freshness ${layer.freshnessWindowDays} days | confidence ${layer.confidenceBase}`);
  });

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Integration boundary:");
  result.integrationBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
