// BUILDSETU_PHASE_M8F_SOURCE_SIGNAL_REVIEW_TABLE_ENGINE

type BrowserExecutionLike = {
  engineVersion?: string;
  executionContract?: {
    endpoint?: string;
    method?: string;
    payloadKey?: string;
    credentialsMode?: string;
    maxQueriesPerBatch?: number;
    authenticatedExecutionRequired?: boolean;
    creditCheckExpected?: boolean;
    serverSideUnauthenticatedExecutionAllowed?: boolean;
  };
  actionExecutions?: Array<{
    actionCardId?: string;
    title?: string;
    actionType?: string;
    status?: string;
    queryCount?: number;
    fetchCalls?: Array<{
      actionCardId?: string;
      actionType?: string;
      query?: string;
      endpoint?: string;
      method?: string;
      credentialsMode?: string;
      freshnessWindowDays?: number;
      topicId?: string;
    }>;
    navigationPath?: string;
    blockedReasons?: string[];
  }>;
  sourceSignalSchema?: string[];
  errorHandling?: Array<{
    statusOrCode?: string;
    uiMessage?: string;
    nextAction?: string;
  }>;
};

type WebUpdatePolicyLike = {
  updateTopics?: Array<{
    id?: string;
    label?: string;
    topicGroup?: string;
    freshnessWindowDays?: number;
    confidenceRule?: string;
    finalApprovalBoundary?: string;
  }>;
};

type BoqMappingLike = {
  lineItems?: Array<{
    id?: string;
    itemName?: string;
    itemGroup?: string;
    quantityBasis?: string;
    rateUnit?: string;
    pricingStatus?: string;
    sourceSearchRequestIds?: string[];
  }>;
};

export type BuildSetuSourceSignalReviewRow = {
  id: string;
  actionCardId: string;
  actionType: string;
  query: string;
  topicId: string | null;
  topicGroup: string | null;
  topicLabel: string | null;
  endpoint: string;
  credentialsMode: "include";
  executionStatus:
    | "pending_browser_execution"
    | "executed_no_results"
    | "executed_has_results"
    | "execution_failed"
    | "blocked";
  reviewStatus:
    | "pending_source_capture"
    | "pending_review"
    | "approved_for_reference"
    | "approved_for_boq_attach"
    | "rejected"
    | "needs_vendor_quote";
  freshnessWindowDays: number;
  freshnessStatus: "pending" | "fresh" | "aging" | "stale" | "unknown";
  confidence: "pending" | "high" | "medium" | "low" | "reject";
  sourceLayer:
    | "public_web_search"
    | "brand_product_catalog"
    | "local_vendor_quote"
    | "official_source"
    | "unknown_pending_execution";
  boqAttachReady: boolean;
  matchedBoqLineIds: string[];
  requiredReviewFields: string[];
  rejectReasons: string[];
  notes: string[];
};

export type BuildSetuWebUpdateSourceSignalReviewResult = {
  engineVersion: "M8F-1";
  scope: "source_signal_review_table_no_final_approval";
  reviewTableReady: boolean;
  reviewRows: BuildSetuSourceSignalReviewRow[];
  reviewTableColumns: string[];
  normalizationInputContract: string[];
  freshnessScoringRules: string[];
  confidenceScoringRules: string[];
  approvalWorkflow: string[];
  boqAttachPolicy: string[];
  errorStatePolicy: string[];
  summary: {
    totalRows: number;
    pendingExecution: number;
    blockedRows: number;
    boqAttachCandidateRows: number;
    requiresBrowserSession: boolean;
  };
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
    .slice(0, 90) || "source_signal";
}

function topicMap(policy?: WebUpdatePolicyLike) {
  const map = new Map<string, { label: string; group: string; freshness: number }>();
  const topics = Array.isArray(policy?.updateTopics) ? policy?.updateTopics || [] : [];

  topics.forEach((topic) => {
    const id = cleanText(topic.id);
    if (!id) return;
    map.set(id, {
      label: cleanText(topic.label),
      group: cleanText(topic.topicGroup),
      freshness: Number(topic.freshnessWindowDays || 30),
    });
  });

  return map;
}

function matchBoqLines(query: string, boq?: BoqMappingLike): string[] {
  const q = cleanText(query).toLowerCase();
  const lines = Array.isArray(boq?.lineItems) ? boq?.lineItems || [] : [];

  return lines
    .filter((line) => {
      const itemName = cleanText(line.itemName).toLowerCase();
      const group = cleanText(line.itemGroup).toLowerCase();
      const basis = cleanText(line.quantityBasis).toLowerCase();

      return (
        (itemName && q.includes(itemName.split(" ")[0] || itemName)) ||
        (group && q.includes(group.replace(/_/g, " "))) ||
        (basis && q.includes(basis.replace(/_/g, " ")))
      );
    })
    .map((line) => cleanText(line.id))
    .filter(Boolean)
    .slice(0, 6);
}

function inferSourceLayer(actionType: string, topicGroup: string | null): BuildSetuSourceSignalReviewRow["sourceLayer"] {
  const action = cleanText(actionType).toLowerCase();
  const group = cleanText(topicGroup).toLowerCase();

  if (action.includes("bylaw") || group.includes("bylaw") || group.includes("building_code")) return "official_source";
  if (action.includes("product") || group.includes("product")) return "brand_product_catalog";
  if (action.includes("material") || group.includes("material") || group.includes("boq")) return "public_web_search";
  return "unknown_pending_execution";
}

function makeReviewRow(args: {
  actionCardId: string;
  actionType: string;
  query: string;
  endpoint: string;
  topicId?: string;
  freshnessWindowDays?: number;
  topicLabel?: string | null;
  topicGroup?: string | null;
  matchedBoqLineIds?: string[];
  blocked?: boolean;
  blockedReasons?: string[];
}): BuildSetuSourceSignalReviewRow {
  const topicGroup = args.topicGroup || null;
  const matchedBoqLineIds = args.matchedBoqLineIds || [];
  const sourceLayer = inferSourceLayer(args.actionType, topicGroup);

  return {
    id: `signal_${slug(args.actionCardId)}_${slug(args.query).slice(0, 45)}`,
    actionCardId: args.actionCardId,
    actionType: args.actionType,
    query: args.query,
    topicId: args.topicId || null,
    topicGroup,
    topicLabel: args.topicLabel || null,
    endpoint: args.endpoint,
    credentialsMode: "include",
    executionStatus: args.blocked ? "blocked" : "pending_browser_execution",
    reviewStatus: args.blocked ? "rejected" : "pending_source_capture",
    freshnessWindowDays: Number(args.freshnessWindowDays || 30),
    freshnessStatus: "pending",
    confidence: "pending",
    sourceLayer,
    boqAttachReady: false,
    matchedBoqLineIds,
    requiredReviewFields: [
      "sourceTitle",
      "sourceUrl",
      "fetchedAt",
      "observedDateOrPublishedDate",
      "unit",
      "rateOrRange",
      "cityOrApplicability",
      "gstLabourTransportScope",
      "confidence",
      "reviewerDecision",
    ],
    rejectReasons: args.blocked ? (args.blockedReasons || ["Execution blocked."]) : [],
    notes: [
      "Pending browser-session web execution.",
      "Do not approve final rate/compliance from this row until source review is complete.",
      matchedBoqLineIds.length ? "Potential BOQ attach candidate after review." : "No BOQ line matched yet.",
    ],
  };
}

export function buildWebUpdateSourceSignalReviewEngine(input: {
  webUpdateBrowserExecutionAdapter?: BrowserExecutionLike;
  universalWebUpdatePolicyEngine?: WebUpdatePolicyLike;
  boqMaterialMappingEngine?: BoqMappingLike;
}): BuildSetuWebUpdateSourceSignalReviewResult {
  const browser = input.webUpdateBrowserExecutionAdapter || {};
  const topics = topicMap(input.universalWebUpdatePolicyEngine);
  const actionExecutions = Array.isArray(browser.actionExecutions) ? browser.actionExecutions || [] : [];

  const rows: BuildSetuSourceSignalReviewRow[] = [];

  actionExecutions.forEach((action) => {
    const actionCardId = cleanText(action.actionCardId || "web_update_action");
    const actionType = cleanText(action.actionType || "run_live_web_update");
    const fetchCalls = Array.isArray(action.fetchCalls) ? action.fetchCalls || [] : [];
    const blocked = cleanText(action.status) === "blocked";

    if (!fetchCalls.length) {
      rows.push(makeReviewRow({
        actionCardId,
        actionType,
        query: cleanText(action.title || actionCardId),
        endpoint: "/api/agent-tools/web-search",
        blocked: blocked || cleanText(action.status) === "navigate_only",
        blockedReasons: Array.isArray(action.blockedReasons) ? action.blockedReasons.map(cleanText).filter(Boolean) : ["No executable fetch call."],
      }));
      return;
    }

    fetchCalls.forEach((call) => {
      const topicId = cleanText(call.topicId);
      const topic = topicId ? topics.get(topicId) : undefined;
      const query = cleanText(call.query);
      const matchedBoqLineIds = matchBoqLines(query, input.boqMaterialMappingEngine);

      rows.push(makeReviewRow({
        actionCardId,
        actionType,
        query,
        endpoint: cleanText(call.endpoint || "/api/agent-tools/web-search"),
        topicId,
        freshnessWindowDays: Number(call.freshnessWindowDays || topic?.freshness || 30),
        topicLabel: topic?.label || null,
        topicGroup: topic?.group || null,
        matchedBoqLineIds,
        blocked,
        blockedReasons: Array.isArray(action.blockedReasons) ? action.blockedReasons.map(cleanText).filter(Boolean) : [],
      }));
    });
  });

  const reviewRows = rows.slice(0, 50);
  const pendingExecution = reviewRows.filter((row) => row.executionStatus === "pending_browser_execution").length;
  const blockedRows = reviewRows.filter((row) => row.executionStatus === "blocked").length;
  const boqAttachCandidateRows = reviewRows.filter((row) => row.matchedBoqLineIds.length > 0).length;

  return {
    engineVersion: "M8F-1",
    scope: "source_signal_review_table_no_final_approval",
    reviewTableReady: reviewRows.length > 0,
    reviewRows,
    reviewTableColumns: [
      "query",
      "topicGroup",
      "sourceTitle",
      "sourceUrl",
      "observedDate",
      "unit",
      "rateOrRange",
      "freshnessStatus",
      "confidence",
      "reviewStatus",
      "boqAttachReady",
      "matchedBoqLineIds",
      "notes",
    ],
    normalizationInputContract: [
      "Accept raw browser web-search response from /api/agent-tools/web-search.",
      "Read source items from items/results/sources/data arrays.",
      "Preserve raw source title, URL, snippet/textPreview and fetchedAt.",
      "Attach actionCardId, query, topicId and freshnessWindowDays from M8E fetch call.",
      "Never overwrite BOQ line item or trusted knowledge directly.",
    ],
    freshnessScoringRules: [
      "fresh: source date/fetchedAt within freshnessWindowDays.",
      "aging: source is older than freshnessWindowDays but within 2x window.",
      "stale: source is older than 2x freshnessWindowDays.",
      "unknown: no source date and no reliable fetchedAt context.",
      "pending: browser execution has not returned source items yet.",
    ],
    confidenceScoringRules: [
      "high: official/vendor/source URL, city/applicability, unit, date, spec and scope are clear.",
      "medium: source URL/date/unit/spec present but city or scope is partial.",
      "low: generic listing/article, unclear unit/date/city or sponsored-style page.",
      "reject: no URL, no unit, no date, irrelevant source or unsafe claim.",
      "pending: source not captured yet.",
    ],
    approvalWorkflow: [
      "pending_source_capture → pending_review after browser response normalization.",
      "pending_review → approved_for_reference when source is relevant and fresh enough.",
      "approved_for_reference → approved_for_boq_attach only for rate/unit/spec/source-reviewed rows.",
      "Any row can move to rejected with rejectReasons.",
      "Vendor quote required remains separate from web-source reference approval.",
    ],
    boqAttachPolicy: [
      "boqAttachReady can become true only after reviewStatus is approved_for_boq_attach.",
      "BOQ attach stores sourceSignalId and source metadata; it does not approve final rate.",
      "Different units require conversion review before BOQ attach.",
      "GST, labour, transport and installation scope must be explicit before rate use.",
    ],
    errorStatePolicy: [
      "401 CREDIT_CHECK_FAILED: show login/credits action.",
      "403: show permission or plan restriction.",
      "429: reduce batch size or retry later.",
      "5xx: preserve prior source state and show retry.",
    ],
    summary: {
      totalRows: reviewRows.length,
      pendingExecution,
      blockedRows,
      boqAttachCandidateRows,
      requiresBrowserSession: true,
    },
    nextActions: [
      "Execute selected browser fetchCalls.",
      "Normalize web-search response into reviewRows with source metadata.",
      "Review freshness/confidence.",
      "Approve only source signals, not final rates.",
      "Attach reviewed source signal to BOQ line in a later attach workflow.",
    ],
    safetyBoundary: [
      "M8F creates review table rows only.",
      "M8F does not execute web-search.",
      "M8F does not approve final market price.",
      "M8F does not merge source updates into trusted knowledge.",
      "Code/bylaw/structural/MEP claims require official/professional review.",
    ],
  };
}

export function buildWebUpdateSourceSignalReviewPromptBlock(result: BuildSetuWebUpdateSourceSignalReviewResult): string {
  const lines: string[] = [];

  lines.push("WEB UPDATE SOURCE SIGNAL REVIEW TABLE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Review table ready: ${result.reviewTableReady ? "yes" : "no"}`);
  lines.push(`- Total rows: ${result.summary.totalRows}`);
  lines.push(`- Pending execution: ${result.summary.pendingExecution}`);
  lines.push(`- Blocked rows: ${result.summary.blockedRows}`);
  lines.push(`- BOQ attach candidates: ${result.summary.boqAttachCandidateRows}`);

  result.reviewRows.slice(0, 10).forEach((row) => {
    lines.push(`- ${row.query} | ${row.topicGroup || "general"} | ${row.executionStatus} | ${row.reviewStatus}`);
  });

  lines.push("- Approval workflow:");
  result.approvalWorkflow.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
