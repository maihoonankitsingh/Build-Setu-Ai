// BUILDSETU_PHASE_M8C_UNIVERSAL_WEB_UPDATE_POLICY_ENGINE

type SourceCaptureLike = {
  routeContract?: {
    endpoint?: string;
    recommendedPayloadKey?: string;
    authenticatedExecutionRequired?: boolean;
    unauthenticatedLocalStatus?: number;
    unauthenticatedLocalCode?: string;
  };
  canExecuteFromBrowserSession?: boolean;
  canExecuteFromServerWithoutUserSession?: boolean;
  captureRequests?: Array<{
    id?: string;
    materialTarget?: string;
    payload?: { query?: string; limit?: number };
    executionState?: string;
  }>;
};

type MaterialPriceLike = {
  priceIntentDetected?: boolean;
  webSearchRequested?: boolean;
  detectedLocation?: string | null;
  detectedBudgetTier?: string | null;
  detectedMaterialTargets?: string[];
  detectedUnitTargets?: string[];
};

type CategoryLike = {
  category?: string;
  planningMode?: string;
  riskLevel?: string;
  detectedFacing?: string | null;
};

type StructuralLike = {
  engineVersion?: string;
  riskLabel?: string;
  escalationLevel?: string;
};

export type BuildSetuUniversalWebUpdateTopic = {
  id: string;
  label: string;
  topicGroup:
    | "material_rate"
    | "product_catalog"
    | "vendor_quote"
    | "boq_rate"
    | "bylaw_norm"
    | "building_code"
    | "structural_safety"
    | "mep_safety"
    | "market_trend"
    | "general_source_verification";
  webUpdateRequired: boolean;
  freshnessWindowDays: number;
  recommendedSourceLayers: string[];
  queryTemplates: string[];
  confidenceRule: string;
  finalApprovalBoundary: string;
};

export type BuildSetuUniversalWebUpdatePolicyResult = {
  engineVersion: "M8C-1";
  scope: "universal_web_update_policy_no_auth_bypass";
  endpoint: "/api/agent-tools/web-search";
  payloadKey: "query";
  authenticatedExecutionRequired: true;
  canExecuteFromServerWithoutUserSession: false;
  canExecuteFromBrowserSession: boolean;
  updateTopics: BuildSetuUniversalWebUpdateTopic[];
  priorityQueries: Array<{
    topicId: string;
    label: string;
    query: string;
    freshnessWindowDays: number;
    executionState: "ready_requires_user_session" | "needs_more_context";
  }>;
  dynamicDataPolicy: string[];
  freshnessPolicy: string[];
  confidencePolicy: string[];
  staleDataWarnings: string[];
  answerPolicy: string[];
  missingInputs: string[];
  nextActions: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function pushUnique<T>(list: T[], value: T, keyFn?: (item: T) => string) {
  const key = keyFn ? keyFn(value) : JSON.stringify(value);
  if (!list.some((item) => (keyFn ? keyFn(item) : JSON.stringify(item)) === key)) list.push(value);
}

function detectLocation(inputText: string, materialPrice?: MaterialPriceLike): string | null {
  if (materialPrice?.detectedLocation) return materialPrice.detectedLocation;
  const cities = ["raipur", "delhi", "mumbai", "pune", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata", "lucknow", "indore", "bhopal", "nagpur", "surat", "ahmedabad", "jaipur", "patna", "ranchi"];
  const lower = inputText.toLowerCase();
  return cities.find((city) => lower.includes(city)) || null;
}

function detectDynamicNeeds(text: string) {
  return {
    materialRate: has(text, /material|cement|steel|tmt|sand|aggregate|brick|aac|tile|tiles|plywood|hdhmr|mdf|laminate|acrylic|hardware|rate|price|market/i),
    productCatalog: has(text, /brand|catalog|sku|model|product|furniture|sanitary|light|switch|wire|hardware|appliance/i),
    vendorQuote: has(text, /vendor|supplier|dealer|quote|quotation|local market|procurement/i),
    boqRate: has(text, /boq|estimate|rate analysis|costing|quantity|bill of quantity|bill of quantities/i),
    bylawNorm: has(text, /bylaw|bye law|byelaw|far|fsi|setback|ground coverage|height permission|municipal|development control/i),
    buildingCode: has(text, /nbc|national building code|bis|is code|fire safety|accessibility|barrier free|building code/i),
    structuralSafety: has(text, /structure|structural|foundation|soil|seismic|earthquake|wind|column|beam|slab|rcc|basement/i),
    mepSafety: has(text, /mep|electrical|plumbing|fire|hvac|wire|mcb|rccb|db|cpvc|upvc|sanitary|pump|solar/i),
    marketTrend: has(text, /trend|latest|current|updated|price movement|steel price|cement price|wpi|index/i),
  };
}

function makeTopic(args: BuildSetuUniversalWebUpdateTopic): BuildSetuUniversalWebUpdateTopic {
  return args;
}

function buildTopics(inputText: string, location: string | null, category?: CategoryLike): BuildSetuUniversalWebUpdateTopic[] {
  const needs = detectDynamicNeeds(inputText);
  const loc = location || "user city";
  const categoryText = cleanText(category?.category || "building");

  const topics: BuildSetuUniversalWebUpdateTopic[] = [];

  if (needs.materialRate) {
    topics.push(makeTopic({
      id: "material_rate_refresh",
      label: "Material market-rate refresh",
      topicGroup: "material_rate",
      webUpdateRequired: true,
      freshnessWindowDays: 30,
      recommendedSourceLayers: ["local_vendor_quote", "brand_product_catalog", "public_web_search", "official_SOR_DSR_reference"],
      queryTemplates: [
        `current construction material rates ${loc} cement steel sand tiles plywood laminate`,
        `plywood HDHMR laminate hardware current market rate ${loc}`,
        `cement TMT steel current market price ${loc}`,
      ],
      confidenceRule: "High only when city, date, unit, brand/spec and GST/labour/transport scope are present.",
      finalApprovalBoundary: "Material web rate is a signal only; final procurement needs vendor quote.",
    }));
  }

  if (needs.productCatalog) {
    topics.push(makeTopic({
      id: "product_catalog_refresh",
      label: "Product/catalog availability refresh",
      topicGroup: "product_catalog",
      webUpdateRequired: true,
      freshnessWindowDays: 30,
      recommendedSourceLayers: ["brand_product_catalog", "dealer_listing", "public_web_search"],
      queryTemplates: [
        `latest interior furniture hardware catalog ${loc}`,
        `modular kitchen hardware laminate acrylic brands ${loc}`,
        `sanitary electrical lighting product catalog ${loc}`,
      ],
      confidenceRule: "Medium for brand catalog, high only after local availability confirmation.",
      finalApprovalBoundary: "Catalog data does not confirm landed cost or installation cost.",
    }));
  }

  if (needs.vendorQuote) {
    topics.push(makeTopic({
      id: "vendor_quote_refresh",
      label: "Local vendor quote requirement",
      topicGroup: "vendor_quote",
      webUpdateRequired: true,
      freshnessWindowDays: 15,
      recommendedSourceLayers: ["local_vendor_quote", "dealer_quote", "supplier_quote"],
      queryTemplates: [
        `construction material supplier quote ${loc}`,
        `plywood laminate hardware dealer quote ${loc}`,
        `modular kitchen wardrobe vendor quote ${loc}`,
      ],
      confidenceRule: "High only if vendor name, city, date, unit, rate, GST, labour and transport scope are clear.",
      finalApprovalBoundary: "Vendor quote still needs client approval and scope check.",
    }));
  }

  if (needs.boqRate) {
    topics.push(makeTopic({
      id: "boq_rate_refresh",
      label: "BOQ rate-source refresh",
      topicGroup: "boq_rate",
      webUpdateRequired: true,
      freshnessWindowDays: 30,
      recommendedSourceLayers: ["official_SOR_DSR_reference", "local_vendor_quote", "brand_catalog", "public_web_search"],
      queryTemplates: [
        `construction BOQ item rate ${loc} current`,
        `interior carpentry modular kitchen wardrobe rate ${loc}`,
        `CPWD DSR latest construction item rate reference`,
      ],
      confidenceRule: "BOQ final rate needs item description, unit, quantity basis, source date and scope inclusions.",
      finalApprovalBoundary: "Do not write final BOQ rate from web-search alone.",
    }));
  }

  if (needs.bylawNorm || categoryText.includes("commercial") || categoryText.includes("mixed") || categoryText.includes("healthcare")) {
    topics.push(makeTopic({
      id: "local_bylaw_refresh",
      label: "Local bylaw/FAR/setback refresh",
      topicGroup: "bylaw_norm",
      webUpdateRequired: true,
      freshnessWindowDays: 90,
      recommendedSourceLayers: ["municipal_official_site", "state_DCR", "development_authority", "official_PDF"],
      queryTemplates: [
        `${loc} building bylaws FAR setback official`,
        `${loc} development control regulation building permission official`,
        `${loc} municipal building bye laws official PDF`,
      ],
      confidenceRule: "High only for official municipal/state/development authority sources.",
      finalApprovalBoundary: "Planning output remains concept-level until local authority/professional verification.",
    }));
  }

  if (needs.buildingCode) {
    topics.push(makeTopic({
      id: "nbc_bis_code_refresh",
      label: "NBC/BIS/building-code refresh",
      topicGroup: "building_code",
      webUpdateRequired: true,
      freshnessWindowDays: 180,
      recommendedSourceLayers: ["BIS_official", "NBC_reference", "government_notification", "official_standard_source"],
      queryTemplates: [
        `National Building Code India latest fire safety accessibility official`,
        `BIS building code fire safety latest official India`,
        `NBC India building planning fire accessibility latest update`,
      ],
      confidenceRule: "High only for official BIS/government/recognized standard source.",
      finalApprovalBoundary: "Code interpretation requires qualified professional verification.",
    }));
  }

  if (needs.structuralSafety) {
    topics.push(makeTopic({
      id: "structural_safety_refresh",
      label: "Structural/seismic/wind/foundation source refresh",
      topicGroup: "structural_safety",
      webUpdateRequired: true,
      freshnessWindowDays: 180,
      recommendedSourceLayers: ["BIS_IS_codes", "official_hazard_map", "local_soil_report", "structural_engineer_review"],
      queryTemplates: [
        `India seismic zone wind speed code latest official BIS`,
        `${loc} soil bearing capacity geotechnical report requirement`,
        `IS code RCC seismic wind foundation latest India official`,
      ],
      confidenceRule: "High only with official standard/source and engineer review.",
      finalApprovalBoundary: "Agent must not finalize structural design or member sizing.",
    }));
  }

  if (needs.mepSafety) {
    topics.push(makeTopic({
      id: "mep_safety_refresh",
      label: "MEP/electrical/plumbing/fire product and safety refresh",
      topicGroup: "mep_safety",
      webUpdateRequired: true,
      freshnessWindowDays: 90,
      recommendedSourceLayers: ["BIS_standard", "manufacturer_catalog", "fire_authority_norm", "MEP_engineer_review"],
      queryTemplates: [
        `electrical wire MCB RCCB ISI standard latest India`,
        `CPVC UPVC plumbing pipe standard latest India`,
        `fire safety equipment building latest standard India`,
      ],
      confidenceRule: "High only when standard compliance, rating and installation scope are known.",
      finalApprovalBoundary: "MEP safety-critical items require qualified professional review.",
    }));
  }

  if (needs.marketTrend) {
    topics.push(makeTopic({
      id: "market_trend_refresh",
      label: "Construction market trend refresh",
      topicGroup: "market_trend",
      webUpdateRequired: true,
      freshnessWindowDays: 30,
      recommendedSourceLayers: ["government_index", "industry_report", "commodity_report", "trusted_market_report"],
      queryTemplates: [
        `India cement steel construction material price trend latest`,
        `construction cost index India latest`,
        `steel cement price trend India current month`,
      ],
      confidenceRule: "Medium for trend reports; use only for escalation signal, not item-level procurement rate.",
      finalApprovalBoundary: "Trend data cannot replace vendor quotation.",
    }));
  }

  if (!topics.length) {
    topics.push(makeTopic({
      id: "general_source_verification",
      label: "General source verification",
      topicGroup: "general_source_verification",
      webUpdateRequired: false,
      freshnessWindowDays: 90,
      recommendedSourceLayers: ["official_source", "verified_reference"],
      queryTemplates: [`${inputText.slice(0, 120)} official source`],
      confidenceRule: "Use source verification when user asks latest/current/legal/price/code.",
      finalApprovalBoundary: "Do not treat unsourced dynamic facts as verified.",
    }));
  }

  return topics;
}

export function buildUniversalWebUpdatePolicyEngine(input: {
  inputText: string;
  materialPriceSourceFreshnessEngine?: MaterialPriceLike;
  materialWebSearchSourceCaptureEngine?: SourceCaptureLike;
  buildingTypeClassification?: CategoryLike;
  planningCategoryIntelligence?: CategoryLike;
  structuralResponseMergeEngine?: StructuralLike;
}): BuildSetuUniversalWebUpdatePolicyResult {
  const inputText = cleanText(input.inputText);
  const location = detectLocation(inputText, input.materialPriceSourceFreshnessEngine);
  const category = input.buildingTypeClassification || input.planningCategoryIntelligence || {};
  const topics = buildTopics(inputText, location, category);

  const missingInputs: string[] = [];
  if (topics.some((topic) => ["material_rate", "vendor_quote", "boq_rate", "bylaw_norm"].includes(topic.topicGroup)) && !location) {
    missingInputs.push("City/location missing for location-specific web update.");
  }

  const capture = input.materialWebSearchSourceCaptureEngine || {};
  const canBrowser = Boolean(capture.canExecuteFromBrowserSession);

  const priorityQueries = topics
    .filter((topic) => topic.webUpdateRequired)
    .flatMap((topic) =>
      topic.queryTemplates.slice(0, 2).map((query) => ({
        topicId: topic.id,
        label: topic.label,
        query,
        freshnessWindowDays: topic.freshnessWindowDays,
        executionState: location || !["material_rate", "vendor_quote", "boq_rate", "bylaw_norm"].includes(topic.topicGroup)
          ? "ready_requires_user_session" as const
          : "needs_more_context" as const,
      }))
    )
    .slice(0, 20);

  return {
    engineVersion: "M8C-1",
    scope: "universal_web_update_policy_no_auth_bypass",
    endpoint: "/api/agent-tools/web-search",
    payloadKey: "query",
    authenticatedExecutionRequired: true,
    canExecuteFromServerWithoutUserSession: false,
    canExecuteFromBrowserSession: canBrowser || priorityQueries.length > 0,
    updateTopics: topics,
    priorityQueries,
    dynamicDataPolicy: [
      "Use web update for current prices, vendor availability, bylaws, code updates, product catalogs and market trends.",
      "Keep live source signals separate from planning logic, BOQ line items and final approved rates.",
      "Never bypass login, credit or user-session checks.",
      "Prefer official sources for bylaws/codes and local vendor quotes for procurement prices.",
    ],
    freshnessPolicy: [
      "Material market price: 7-30 days.",
      "Local vendor quote: 7-15 days.",
      "Brand catalog/product listing: 30 days.",
      "Building bylaws/FAR/setback: 30-90 days.",
      "NBC/BIS/building code: 90-180 days or latest official version.",
      "Steel/cement/commodity trend: 7-30 days.",
    ],
    confidencePolicy: [
      "High: official source or vendor quote with city, date, unit, spec and scope.",
      "Medium: brand catalog, official schedule reference or industry report with clear date and unit.",
      "Low: generic web listing, unclear date/unit/city or sponsored result.",
      "Reject: no source URL/title/date/unit/spec for dynamic claims.",
    ],
    staleDataWarnings: [
      "Dynamic data without date must be treated low-confidence.",
      "Price without city/unit/GST/labour/transport scope must not be used as BOQ final rate.",
      "Bylaw/code data must be checked against official latest source before professional use.",
      "Market trend is escalation signal only, not procurement quote.",
    ],
    answerPolicy: [
      "When user asks current/latest/market/legal/code/rate, show source requirement and freshness status.",
      "If web execution is blocked by login/credits, ask user to run from logged-in browser session or show login/credits action.",
      "If source is not available, mark answer as concept-level or stale-risk.",
      "Do not merge source signal into approved BOQ rate without review.",
    ],
    missingInputs,
    nextActions: [
      "Expose priorityQueries to UI action cards.",
      "Run web-search through browser user session.",
      "Normalize source results into source signals.",
      "Tag freshness and confidence.",
      "Attach verified source signals to BOQ/planning sections only after review.",
    ],
    safetyBoundary: [
      "M8C is a policy engine; it does not execute live search server-side.",
      "No authentication or credit bypass is allowed.",
      "No final price, bylaw compliance, structural sizing or MEP safety decision should be approved from web-search alone.",
    ],
  };
}

export function buildUniversalWebUpdatePolicyPromptBlock(result: BuildSetuUniversalWebUpdatePolicyResult): string {
  const lines: string[] = [];

  lines.push("UNIVERSAL WEB UPDATE POLICY:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Endpoint: ${result.endpoint}`);
  lines.push(`- Payload key: ${result.payloadKey}`);
  lines.push(`- Auth required: ${result.authenticatedExecutionRequired ? "yes" : "no"}`);
  lines.push(`- Browser session execution: ${result.canExecuteFromBrowserSession ? "ready" : "not ready"}`);
  lines.push(`- Update topics: ${result.updateTopics.length}`);
  lines.push(`- Priority queries: ${result.priorityQueries.length}`);

  result.updateTopics.slice(0, 10).forEach((topic) => {
    lines.push(`- ${topic.label}: ${topic.webUpdateRequired ? "web update required" : "web optional"} | freshness ${topic.freshnessWindowDays} days`);
  });

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Answer policy:");
  result.answerPolicy.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
