// BUILDSETU_PHASE_M8B_MATERIAL_WEB_SEARCH_SOURCE_CAPTURE_ENGINE

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
    expectedSourceLayer?: string;
    freshnessWindowDays?: number;
    captureFields?: string[];
  }>;
};

type PriceFreshnessLike = {
  detectedLocation?: string | null;
  detectedBudgetTier?: string | null;
  priceIntentDetected?: boolean;
  webSearchRequested?: boolean;
};

export type BuildSetuMaterialWebSearchSourceCaptureRequest = {
  id: string;
  materialTarget: string;
  endpoint: "/api/agent-tools/web-search";
  method: "POST";
  payloadKey: "query";
  payload: {
    query: string;
    limit: number;
  };
  requiresUserSession: boolean;
  requiresCreditCheck: boolean;
  executionState:
    | "ready_requires_user_session"
    | "blocked_missing_inputs"
    | "blocked_adapter_not_ready";
  sourceLayer: "public_web_search";
  expectedResponseKeys: string[];
  captureFields: string[];
  freshnessWindowDays: number;
};

export type BuildSetuMaterialWebSearchSourceCaptureResult = {
  engineVersion: "M8B-1";
  scope: "web_search_source_capture_orchestration_no_auth_bypass";
  routeContract: {
    endpoint: "/api/agent-tools/web-search";
    method: "POST";
    acceptedPayloadKeys: string[];
    recommendedPayloadKey: "query";
    authenticatedExecutionRequired: true;
    unauthenticatedLocalStatus: 401;
    unauthenticatedLocalCode: "CREDIT_CHECK_FAILED";
  };
  canExecuteFromServerWithoutUserSession: false;
  canExecuteFromBrowserSession: boolean;
  captureRequests: BuildSetuMaterialWebSearchSourceCaptureRequest[];
  blockedReasons: string[];
  resultNormalizationSchema: string[];
  authAndCreditPolicy: string[];
  sourceStoragePolicy: string[];
  nextActions: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildCaptureRequest(request: NonNullable<WebSearchAdapterLike["searchRequests"]>[number]): BuildSetuMaterialWebSearchSourceCaptureRequest {
  const query = cleanText(request.query);

  return {
    id: cleanText(request.id || query || "web_search_request"),
    materialTarget: cleanText(request.materialTarget || "Material"),
    endpoint: "/api/agent-tools/web-search",
    method: "POST",
    payloadKey: "query",
    payload: {
      query,
      limit: 5,
    },
    requiresUserSession: true,
    requiresCreditCheck: true,
    executionState: query ? "ready_requires_user_session" : "blocked_missing_inputs",
    sourceLayer: "public_web_search",
    expectedResponseKeys: ["ok", "query", "count", "qualityCode", "items", "sourceCitations"],
    captureFields: [
      "sourceTitle",
      "sourceUrl",
      "snippet",
      "textPreview",
      "fetchedAt",
      "materialTarget",
      "query",
      "unit",
      "city",
      "rateOrRange",
      "freshnessStatus",
      "confidence",
      "gstIncluded",
      "labourIncluded",
      "transportIncluded",
      "notes",
    ],
    freshnessWindowDays: Number(request.freshnessWindowDays || 30),
  };
}

export function buildMaterialWebSearchSourceCaptureEngine(input: {
  materialWebSearchRateAdapter?: WebSearchAdapterLike;
  materialPriceSourceFreshnessEngine?: PriceFreshnessLike;
}): BuildSetuMaterialWebSearchSourceCaptureResult {
  const adapter = input.materialWebSearchRateAdapter || {};
  const requests = Array.isArray(adapter.searchRequests) ? adapter.searchRequests : [];

  const blockedReasons: string[] = [];
  if (!adapter.canRunSearch) {
    blockedReasons.push("Material web-search adapter is not ready.");
  }
  if (!requests.length) {
    blockedReasons.push("No material web-search requests available.");
  }

  const captureRequests = requests.slice(0, 20).map(buildCaptureRequest);

  const canExecuteFromBrowserSession = Boolean(adapter.canRunSearch && captureRequests.length);

  return {
    engineVersion: "M8B-1",
    scope: "web_search_source_capture_orchestration_no_auth_bypass",
    routeContract: {
      endpoint: "/api/agent-tools/web-search",
      method: "POST",
      acceptedPayloadKeys: ["query", "q", "prompt", "message"],
      recommendedPayloadKey: "query",
      authenticatedExecutionRequired: true,
      unauthenticatedLocalStatus: 401,
      unauthenticatedLocalCode: "CREDIT_CHECK_FAILED",
    },
    canExecuteFromServerWithoutUserSession: false,
    canExecuteFromBrowserSession,
    captureRequests,
    blockedReasons,
    resultNormalizationSchema: [
      "requestId",
      "query",
      "materialTarget",
      "sourceTitle",
      "sourceUrl",
      "snippet",
      "textPreview",
      "fetchedAt",
      "sourceLayer",
      "freshnessStatus",
      "confidence",
      "rateOrRange",
      "unit",
      "city",
      "gstIncluded",
      "labourIncluded",
      "transportIncluded",
      "notes",
    ],
    authAndCreditPolicy: [
      "Do not bypass login or credit checks.",
      "Server-side unauthenticated curl is expected to return 401 CREDIT_CHECK_FAILED.",
      "Browser/client execution should forward user cookies/session automatically.",
      "If execution returns 401, UI should show login/credits action instead of retry loops.",
    ],
    sourceStoragePolicy: [
      "Store source signal separately from BOQ line item.",
      "Do not approve final price from web-search result alone.",
      "Keep raw source URL/title/snippet/fetchedAt for audit.",
      "Attach source signals to BOQ line only after freshness/confidence review.",
    ],
    nextActions: [
      "Add browser-session action to run selected captureRequests through /api/agent-tools/web-search.",
      "Normalize returned items into source signals.",
      "Tag freshness and confidence.",
      "Attach reviewed source signal to BOQ draft in a later rate-approval step.",
    ],
    safetyBoundary: [
      "M8B does not execute live search server-side.",
      "M8B does not bypass authentication or credits.",
      "M8B does not approve final market price.",
      "Vendor quote and source verification remain required.",
    ],
  };
}

export function buildMaterialWebSearchSourceCapturePromptBlock(result: BuildSetuMaterialWebSearchSourceCaptureResult): string {
  const lines: string[] = [];

  lines.push("MATERIAL WEB-SEARCH SOURCE CAPTURE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Endpoint: ${result.routeContract.endpoint}`);
  lines.push(`- Recommended payload: {"query": "..."}`);
  lines.push(`- Auth required: ${result.routeContract.authenticatedExecutionRequired ? "yes" : "no"}`);
  lines.push(`- Server without session: ${result.canExecuteFromServerWithoutUserSession ? "allowed" : "blocked"}`);
  lines.push(`- Browser session execution: ${result.canExecuteFromBrowserSession ? "ready" : "not ready"}`);
  lines.push(`- Capture requests: ${result.captureRequests.length}`);

  if (result.blockedReasons.length) {
    lines.push("- Blocked reasons:");
    result.blockedReasons.forEach((item) => lines.push(`  - ${item}`));
  }

  result.captureRequests.slice(0, 8).forEach((request) => {
    lines.push(`- ${request.id}: ${request.payload.query}`);
  });

  lines.push("- Boundary:");
  result.safetyBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
