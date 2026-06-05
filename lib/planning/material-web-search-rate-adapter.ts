// BUILDSETU_PHASE_M5_MATERIAL_WEB_SEARCH_RATE_ADAPTER

type MaterialPriceSourceFreshnessLike = {
  priceIntentDetected?: boolean;
  webSearchRequested?: boolean;
  detectedLocation?: string | null;
  detectedBudgetTier?: string | null;
  detectedMaterialTargets?: string[];
  detectedUnitTargets?: string[];
  missingInputs?: string[];
};

type MaterialTaxonomyLike = {
  detectedIntent?: {
    marketPrice?: boolean;
    webSearch?: boolean;
    boqEstimate?: boolean;
    interiorMaterial?: boolean;
    furniture?: boolean;
  };
};

type FurnitureQuantityLike = {
  detectedUseAreas?: string[];
  primaryQuantityBasis?: string[];
  furnitureItems?: Array<{
    label?: string;
    quantityBasis?: string;
    useArea?: string;
  }>;
};

export type BuildSetuMaterialWebSearchRateRequest = {
  id: string;
  materialTarget: string;
  city: string;
  unit: string;
  qualityTier: string;
  query: string;
  purpose: "market_rate_signal" | "brand_product_rate_signal" | "vendor_source_discovery";
  expectedSourceLayer: "public_web_search";
  freshnessWindowDays: number;
  captureFields: string[];
};

export type BuildSetuMaterialWebSearchRateAdapterResult = {
  engineVersion: "M5-1";
  scope: "material_web_search_rate_adapter_no_final_price";
  endpoint: "/api/agent-tools/web-search";
  canRunSearch: boolean;
  blockReasons: string[];
  searchRequests: BuildSetuMaterialWebSearchRateRequest[];
  executionPolicy: string[];
  resultCaptureSchema: string[];
  freshnessTaggingRules: string[];
  confidenceTaggingRules: string[];
  deDuplicationRules: string[];
  rateNormalizationRules: string[];
  outputBoundary: string[];
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
    .slice(0, 60) || "material";
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (clean && !list.includes(clean)) list.push(clean);
}

function pickUnitForTarget(target: string, units: string[]) {
  const t = target.toLowerCase();

  if (/modular kitchen|kitchen/i.test(t)) {
    return units.find((unit) => /running/i.test(unit)) || "running_ft";
  }

  if (/wardrobe|tv unit|media wall|plywood|laminate|acrylic|pu|veneer|furniture/i.test(t)) {
    return units.find((unit) => /sqft|sheet|running/i.test(unit)) || "sqft";
  }

  if (/cement/i.test(t)) return units.find((unit) => /bag/i.test(unit)) || "bag";
  if (/steel|tmt/i.test(t)) return units.find((unit) => /kg|tonne|ton/i.test(unit)) || "kg/tonne";
  if (/tile|tiles/i.test(t)) return units.find((unit) => /sqft|box/i.test(unit)) || "sqft";
  if (/hardware|hinge|channel/i.test(t)) return units.find((unit) => /piece|set|nos/i.test(unit)) || "piece/set";

  return units[0] || "unit";
}

function buildQuery(target: string, city: string, unit: string, qualityTier: string, purpose: BuildSetuMaterialWebSearchRateRequest["purpose"]) {
  const base = `${target} ${qualityTier} rate ${unit} ${city} current market price`;

  if (purpose === "brand_product_rate_signal") {
    return `${target} brand price ${unit} ${city} latest`;
  }

  if (purpose === "vendor_source_discovery") {
    return `${target} supplier dealer quote ${city} ${unit}`;
  }

  return base;
}

function uniqueTargets(targets: string[]) {
  const result: string[] = [];
  targets.forEach((target) => {
    const clean = cleanText(target);
    if (!clean) return;

    const normalized = clean.toLowerCase();
    const duplicate = result.some((existing) => {
      const e = existing.toLowerCase();
      return e === normalized || e.includes(normalized) || normalized.includes(e);
    });

    if (!duplicate) result.push(clean);
  });
  return result.slice(0, 10);
}

export function buildMaterialWebSearchRateAdapter(input: {
  inputText: string;
  materialTaxonomyEngine?: MaterialTaxonomyLike;
  furnitureQuantityBasisEngine?: FurnitureQuantityLike;
  materialPriceSourceFreshnessEngine?: MaterialPriceSourceFreshnessLike;
}): BuildSetuMaterialWebSearchRateAdapterResult {
  const freshness = input.materialPriceSourceFreshnessEngine || {};
  const priceIntent = Boolean(freshness.priceIntentDetected || input.materialTaxonomyEngine?.detectedIntent?.marketPrice);
  const webSearchRequested = Boolean(freshness.webSearchRequested || input.materialTaxonomyEngine?.detectedIntent?.webSearch);
  const city = cleanText(freshness.detectedLocation || "");
  const qualityTier = cleanText(freshness.detectedBudgetTier || "standard");
  const targets = uniqueTargets(freshness.detectedMaterialTargets || []);
  const units = Array.isArray(freshness.detectedUnitTargets) ? freshness.detectedUnitTargets.map(cleanText).filter(Boolean) : [];

  const blockReasons: string[] = [];
  if (!priceIntent) blockReasons.push("Price intent not detected.");
  if (!webSearchRequested) blockReasons.push("Web-search intent not detected.");
  if (!city) blockReasons.push("City/location missing.");
  if (!targets.length) blockReasons.push("Material target missing.");
  if (!units.length) blockReasons.push("Unit basis missing.");

  const canRunSearch = blockReasons.length === 0;

  const searchRequests: BuildSetuMaterialWebSearchRateRequest[] = [];

  if (canRunSearch) {
    targets.slice(0, 8).forEach((target, index) => {
      const unit = pickUnitForTarget(target, units);
      const purposes: BuildSetuMaterialWebSearchRateRequest["purpose"][] = [
        "market_rate_signal",
        "brand_product_rate_signal",
      ];

      if (index < 4) {
        purposes.push("vendor_source_discovery");
      }

      purposes.forEach((purpose) => {
        const id = `${slug(target)}_${purpose}`;
        searchRequests.push({
          id,
          materialTarget: target,
          city,
          unit,
          qualityTier,
          query: buildQuery(target, city, unit, qualityTier, purpose),
          purpose,
          expectedSourceLayer: "public_web_search",
          freshnessWindowDays: 30,
          captureFields: [
            "sourceTitle",
            "sourceUrl",
            "observedDate",
            "materialOrProductName",
            "brandOrSpec",
            "unit",
            "rateOrRange",
            "cityOrServiceArea",
            "gstIncluded",
            "labourIncluded",
            "transportIncluded",
            "confidence",
            "notes",
          ],
        });
      });
    });
  }

  return {
    engineVersion: "M5-1",
    scope: "material_web_search_rate_adapter_no_final_price",
    endpoint: "/api/agent-tools/web-search",
    canRunSearch,
    blockReasons,
    searchRequests: searchRequests.slice(0, 20),
    executionPolicy: [
      "Run web-search only when city, material target, quality tier and unit are known.",
      "Use /api/agent-tools/web-search as source discovery and market-rate signal, not as final procurement rate.",
      "Keep every source result separate from material taxonomy, selector and BOQ mapping.",
      "Never auto-write web-search rates into final BOQ without M-6 mapping and source confidence review.",
      "Prefer 2-3 independent sources or local vendor quotes before accepting any range.",
    ],
    resultCaptureSchema: [
      "query",
      "sourceTitle",
      "sourceUrl",
      "materialTarget",
      "brandOrSpec",
      "unit",
      "rateOrRange",
      "cityOrServiceArea",
      "observedDate",
      "sourceLayer",
      "freshnessStatus",
      "confidence",
      "gstIncluded",
      "labourIncluded",
      "transportIncluded",
      "notes",
    ],
    freshnessTaggingRules: [
      "0-30 days: fresh web signal.",
      "31-60 days: aging signal; require confirmation.",
      "61-90 days: stale for active procurement; trend reference only.",
      "More than 90 days: do not use for current rate except historical comparison.",
      "No date: low-confidence source, require vendor confirmation.",
    ],
    confidenceTaggingRules: [
      "High: local vendor/source with city, date, unit, exact spec and GST/transport/labour scope.",
      "Medium: brand/product listing with exact SKU, unit and visible date or current listing context.",
      "Low: generic web article/listing, unclear date, unclear unit or no city specificity.",
      "Reject: price without source, unit, city or material specification.",
    ],
    deDuplicationRules: [
      "Merge duplicate URLs.",
      "Group same brand/spec/unit from multiple sellers as a range.",
      "Do not compare sheet price with sqft price without conversion.",
      "Do not compare labour-inclusive modular rate with material-only rate.",
    ],
    rateNormalizationRules: [
      "Normalize running-ft kitchen rates separately for lower, upper and tall units where possible.",
      "Normalize wardrobe/TV unit rates by sqft only when front-elevation method is used.",
      "Normalize sheet materials by sheet size before sqft comparison.",
      "Keep GST, labour, transport, loading/unloading and wastage separate.",
    ],
    outputBoundary: [
      "M5 produces search requests and source-capture policy only.",
      "M5 does not declare a final material rate.",
      "M5 does not create BOQ line items.",
      "M5 results must be reviewed by M-6 before BOQ mapping.",
    ],
    nextActions: [
      "Execute selected searchRequests through /api/agent-tools/web-search.",
      "Capture source URL/title/date/unit/rate/scope for each result.",
      "Tag freshness and confidence.",
      "Pass reviewed source signals to M-6 BOQ material mapping.",
    ],
    safetyBoundary: [
      "Web-search rates are market signals only.",
      "Final procurement requires vendor quotation and client approval.",
      "Safety-critical material specifications must not be changed only because web-search shows lower price.",
    ],
  };
}

export function buildMaterialWebSearchRateAdapterPromptBlock(result: BuildSetuMaterialWebSearchRateAdapterResult): string {
  const lines: string[] = [];

  lines.push("MATERIAL WEB-SEARCH RATE ADAPTER:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Endpoint: ${result.endpoint}`);
  lines.push(`- Can run search: ${result.canRunSearch ? "yes" : "no"}`);

  if (result.blockReasons.length) {
    lines.push("- Block reasons:");
    result.blockReasons.forEach((item) => lines.push(`  - ${item}`));
  }

  if (result.searchRequests.length) {
    lines.push("- Search requests:");
    result.searchRequests.slice(0, 10).forEach((item) => {
      lines.push(`  - ${item.materialTarget} | ${item.purpose} | ${item.query}`);
    });
  }

  lines.push("- Output boundary:");
  result.outputBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
