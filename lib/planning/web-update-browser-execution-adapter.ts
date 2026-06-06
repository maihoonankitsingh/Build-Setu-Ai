// BUILDSETU_PHASE_M8E_WEB_UPDATE_BROWSER_EXECUTION_ADAPTER

type WebUpdateUiActionLike = {
  engineVersion?: string;
  scope?: string;
  primaryCta?: string;
  uiActionCards?: Array<{
    id?: string;
    title?: string;
    description?: string;
    cta?: string;
    actionType?: string;
    priority?: string;
    status?: string;
    requiresUserSession?: boolean;
    requiresCreditCheck?: boolean;
    endpoint?: string;
    method?: string;
    payloadKey?: string;
    queryCount?: number;
    targetTopicGroups?: string[];
    payloadPreview?: Array<{
      query?: string;
      freshnessWindowDays?: number;
      topicId?: string;
    }>;
    navigationPath?: string;
    blockedReasons?: string[];
  }>;
};

type WebUpdatePolicyLike = {
  endpoint?: string;
  payloadKey?: string;
  authenticatedExecutionRequired?: boolean;
  canExecuteFromServerWithoutUserSession?: boolean;
  canExecuteFromBrowserSession?: boolean;
};

type SourceCaptureLike = {
  routeContract?: {
    endpoint?: string;
    recommendedPayloadKey?: string;
    authenticatedExecutionRequired?: boolean;
    unauthenticatedLocalStatus?: number;
    unauthenticatedLocalCode?: string;
  };
};

export type BuildSetuWebUpdateFetchCall = {
  actionCardId: string;
  actionType: string;
  query: string;
  endpoint: string;
  method: "POST";
  credentialsMode: "include";
  payload: {
    query: string;
  };
  freshnessWindowDays: number;
  topicId?: string;
};

export type BuildSetuWebUpdateBrowserActionExecution = {
  actionCardId: string;
  title: string;
  actionType: string;
  status: "ready_for_browser_execution" | "blocked" | "navigate_only";
  queryCount: number;
  fetchCalls: BuildSetuWebUpdateFetchCall[];
  navigationPath?: string;
  blockedReasons: string[];
};

export type BuildSetuWebUpdateBrowserExecutionAdapterResult = {
  engineVersion: "M8E-1";
  scope: "browser_action_execution_adapter_no_server_auth_bypass";
  executionContract: {
    endpoint: "/api/agent-tools/web-search";
    method: "POST";
    payloadKey: "query";
    credentialsMode: "include";
    contentType: "application/json";
    maxQueriesPerBatch: number;
    authenticatedExecutionRequired: true;
    creditCheckExpected: true;
    serverSideUnauthenticatedExecutionAllowed: false;
  };
  actionExecutions: BuildSetuWebUpdateBrowserActionExecution[];
  sourceSignalSchema: string[];
  responseNormalizationRules: string[];
  errorHandling: Array<{
    statusOrCode: string;
    uiMessage: string;
    nextAction: string;
  }>;
  storageBoundary: string[];
  reviewBoundary: string[];
  nextActions: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildFetchCall(args: {
  actionCardId: string;
  actionType: string;
  endpoint: string;
  query: string;
  freshnessWindowDays: number;
  topicId?: string;
}): BuildSetuWebUpdateFetchCall {
  return {
    actionCardId: args.actionCardId,
    actionType: args.actionType,
    query: args.query,
    endpoint: args.endpoint,
    method: "POST",
    credentialsMode: "include",
    payload: {
      query: args.query,
    },
    freshnessWindowDays: args.freshnessWindowDays,
    topicId: args.topicId,
  };
}

export function buildWebUpdateBrowserExecutionAdapter(input: {
  webUpdateUiActionEngine?: WebUpdateUiActionLike;
  universalWebUpdatePolicyEngine?: WebUpdatePolicyLike;
  materialWebSearchSourceCaptureEngine?: SourceCaptureLike;
}): BuildSetuWebUpdateBrowserExecutionAdapterResult {
  const ui = input.webUpdateUiActionEngine || {};
  const policy = input.universalWebUpdatePolicyEngine || {};
  const capture = input.materialWebSearchSourceCaptureEngine || {};

  const endpoint = cleanText(
    policy.endpoint ||
      capture.routeContract?.endpoint ||
      "/api/agent-tools/web-search"
  ) || "/api/agent-tools/web-search";

  const cards = Array.isArray(ui.uiActionCards) ? ui.uiActionCards : [];
  const maxQueriesPerBatch = 3;

  const actionExecutions: BuildSetuWebUpdateBrowserActionExecution[] = cards.map((card) => {
    const id = cleanText(card.id || "web_update_action");
    const actionType = cleanText(card.actionType || "run_live_web_update");
    const title = cleanText(card.title || "Run web update");
    const status = cleanText(card.status);
    const navigationPath = cleanText(card.navigationPath);
    const blockedReasons = Array.isArray(card.blockedReasons) ? card.blockedReasons.map(cleanText).filter(Boolean) : [];

    if (navigationPath && actionType === "review_pending_source_updates") {
      return {
        actionCardId: id,
        title,
        actionType,
        status: "navigate_only",
        queryCount: 0,
        fetchCalls: [],
        navigationPath,
        blockedReasons,
      };
    }

    const previews = Array.isArray(card.payloadPreview) ? card.payloadPreview : [];
    const fetchCalls = previews
      .map((item) => {
        const query = cleanText(item.query);
        if (!query) return null;
        return buildFetchCall({
          actionCardId: id,
          actionType,
          endpoint,
          query,
          freshnessWindowDays: Number(item.freshnessWindowDays || 30),
          topicId: cleanText(item.topicId),
        });
      })
      .filter(Boolean)
      .slice(0, maxQueriesPerBatch) as BuildSetuWebUpdateFetchCall[];

    return {
      actionCardId: id,
      title,
      actionType,
      status: status === "ready" && fetchCalls.length ? "ready_for_browser_execution" : "blocked",
      queryCount: fetchCalls.length,
      fetchCalls,
      blockedReasons: fetchCalls.length ? blockedReasons : [...blockedReasons, "No executable query payload found."],
    };
  });

  return {
    engineVersion: "M8E-1",
    scope: "browser_action_execution_adapter_no_server_auth_bypass",
    executionContract: {
      endpoint: "/api/agent-tools/web-search",
      method: "POST",
      payloadKey: "query",
      credentialsMode: "include",
      contentType: "application/json",
      maxQueriesPerBatch,
      authenticatedExecutionRequired: true,
      creditCheckExpected: true,
      serverSideUnauthenticatedExecutionAllowed: false,
    },
    actionExecutions,
    sourceSignalSchema: [
      "sourceSignalId",
      "actionCardId",
      "query",
      "sourceTitle",
      "sourceUrl",
      "snippet",
      "textPreview",
      "fetchedAt",
      "topicId",
      "topicGroup",
      "freshnessWindowDays",
      "freshnessStatus",
      "confidence",
      "rateOrRange",
      "unit",
      "city",
      "gstIncluded",
      "labourIncluded",
      "transportIncluded",
      "sourceLayer",
      "reviewStatus",
      "notes",
    ],
    responseNormalizationRules: [
      "Read results from items/results/sources/data arrays when present.",
      "Keep raw response snapshot for audit when sourceUrl is present.",
      "Normalize each returned item into a source signal, not a final answer.",
      "Mark no-date or no-url results as low-confidence.",
      "Do not compare rates with different units without conversion.",
      "Attach actionCardId and query to every normalized source signal.",
    ],
    errorHandling: [
      {
        statusOrCode: "401 CREDIT_CHECK_FAILED",
        uiMessage: "Login or credits required to run live web research.",
        nextAction: "Open login/credits flow and do not retry automatically.",
      },
      {
        statusOrCode: "403",
        uiMessage: "This account cannot run the requested web update.",
        nextAction: "Show permission/plan message.",
      },
      {
        statusOrCode: "429",
        uiMessage: "Rate limit reached for web research.",
        nextAction: "Wait and retry later or reduce query batch.",
      },
      {
        statusOrCode: "5xx",
        uiMessage: "Web research service failed temporarily.",
        nextAction: "Show retry button and keep existing source state unchanged.",
      },
    ],
    storageBoundary: [
      "Store normalized source signals separately from BOQ line items.",
      "Do not mutate trusted knowledge from browser search result.",
      "Do not mark BOQ rate approved from web-search alone.",
      "Keep source signal reviewStatus pending_review by default.",
    ],
    reviewBoundary: [
      "Material/source rates require freshness and confidence review.",
      "Bylaw/code/NBC/BIS source changes require official-source review queue.",
      "Vendor quote remains preferred for procurement.",
      "Professional review remains required for code, fire, structural and MEP safety claims.",
    ],
    nextActions: [
      "Wire UI card click to execute fetchCalls with credentials: include.",
      "Normalize response into sourceSignalSchema.",
      "Show source review table.",
      "Allow attach-to-BOQ only after source review.",
    ],
    safetyBoundary: [
      "M8E is browser execution contract only.",
      "M8E does not bypass authentication or credits.",
      "M8E does not approve final price, final bylaw compliance, final code interpretation or structural/MEP safety decisions.",
    ],
  };
}

export function buildWebUpdateBrowserExecutionPromptBlock(result: BuildSetuWebUpdateBrowserExecutionAdapterResult): string {
  const lines: string[] = [];

  lines.push("WEB UPDATE BROWSER EXECUTION ADAPTER:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Endpoint: ${result.executionContract.endpoint}`);
  lines.push(`- Method: ${result.executionContract.method}`);
  lines.push(`- Payload key: ${result.executionContract.payloadKey}`);
  lines.push(`- Credentials: ${result.executionContract.credentialsMode}`);
  lines.push(`- Server unauthenticated execution allowed: ${result.executionContract.serverSideUnauthenticatedExecutionAllowed ? "yes" : "no"}`);
  lines.push(`- Action executions: ${result.actionExecutions.length}`);

  result.actionExecutions.slice(0, 8).forEach((item) => {
    lines.push(`- ${item.title}: ${item.status} | queries ${item.queryCount}`);
  });

  lines.push("- Error handling:");
  result.errorHandling.forEach((item) => lines.push(`  - ${item.statusOrCode}: ${item.uiMessage}`));

  return lines.join("\n");
}
