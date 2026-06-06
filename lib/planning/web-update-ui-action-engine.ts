// BUILDSETU_PHASE_M8D_WEB_UPDATE_UI_ACTION_ENGINE

type UniversalWebUpdatePolicyLike = {
  engineVersion?: string;
  endpoint?: string;
  payloadKey?: string;
  authenticatedExecutionRequired?: boolean;
  canExecuteFromBrowserSession?: boolean;
  canExecuteFromServerWithoutUserSession?: boolean;
  updateTopics?: Array<{
    id?: string;
    label?: string;
    topicGroup?: string;
    webUpdateRequired?: boolean;
    freshnessWindowDays?: number;
    queryTemplates?: string[];
  }>;
  priorityQueries?: Array<{
    topicId?: string;
    label?: string;
    query?: string;
    freshnessWindowDays?: number;
    executionState?: string;
  }>;
  missingInputs?: string[];
};

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

type BoqMappingLike = {
  canCreateBoqDraft?: boolean;
  lineItems?: Array<{
    id?: string;
    itemName?: string;
    itemGroup?: string;
    sourceSearchRequestIds?: string[];
  }>;
};

export type BuildSetuWebUpdateUiActionCard = {
  id: string;
  title: string;
  description: string;
  cta: string;
  actionType:
    | "run_live_web_update"
    | "refresh_material_rates"
    | "refresh_bylaw_source"
    | "refresh_code_source"
    | "refresh_product_catalog"
    | "review_pending_source_updates"
    | "attach_verified_source_to_boq";
  priority: "primary" | "secondary" | "tertiary";
  status: "ready" | "blocked";
  requiresUserSession: boolean;
  requiresCreditCheck: boolean;
  endpoint: string;
  method: "POST" | "GET" | "NAVIGATE";
  payloadKey?: "query";
  queryCount: number;
  freshnessWindowDays?: number;
  targetTopicGroups: string[];
  payloadPreview: Array<{ query: string; freshnessWindowDays: number; topicId?: string }>;
  navigationPath?: string;
  blockedReasons: string[];
  boundary: string[];
};

export type BuildSetuWebUpdateUiActionEngineResult = {
  engineVersion: "M8D-1";
  scope: "web_update_ui_action_cards_no_auth_bypass";
  primaryCta: string;
  uiActionCards: BuildSetuWebUpdateUiActionCard[];
  readyActionCount: number;
  blockedActionCount: number;
  executionPolicy: string[];
  sourceReviewPolicy: string[];
  nextActions: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function topicGroups(policy?: UniversalWebUpdatePolicyLike): string[] {
  const topics = Array.isArray(policy?.updateTopics) ? policy?.updateTopics || [] : [];
  return Array.from(new Set(topics.map((topic) => cleanText(topic.topicGroup)).filter(Boolean)));
}

function queriesForGroups(policy: UniversalWebUpdatePolicyLike | undefined, groups: string[], limit = 5) {
  const topics = Array.isArray(policy?.updateTopics) ? policy?.updateTopics || [] : [];
  const topicIds = new Set(
    topics
      .filter((topic) => groups.includes(cleanText(topic.topicGroup)))
      .map((topic) => cleanText(topic.id))
      .filter(Boolean)
  );

  const priority = Array.isArray(policy?.priorityQueries) ? policy?.priorityQueries || [] : [];

  return priority
    .filter((item) => topicIds.has(cleanText(item.topicId)) || groups.some((group) => cleanText(item.label).toLowerCase().includes(group.replace(/_/g, " "))))
    .map((item) => ({
      query: cleanText(item.query),
      freshnessWindowDays: Number(item.freshnessWindowDays || 30),
      topicId: cleanText(item.topicId),
    }))
    .filter((item) => item.query)
    .slice(0, limit);
}

function makeCard(args: {
  id: string;
  title: string;
  description: string;
  cta: string;
  actionType: BuildSetuWebUpdateUiActionCard["actionType"];
  priority: BuildSetuWebUpdateUiActionCard["priority"];
  groups: string[];
  policy?: UniversalWebUpdatePolicyLike;
  sourceCapture?: SourceCaptureLike;
  queries: Array<{ query: string; freshnessWindowDays: number; topicId?: string }>;
  navigationPath?: string;
  extraBlocked?: string[];
}): BuildSetuWebUpdateUiActionCard {
  const endpoint = cleanText(args.policy?.endpoint || args.sourceCapture?.routeContract?.endpoint || "/api/agent-tools/web-search");
  const requiresUserSession = Boolean(args.policy?.authenticatedExecutionRequired ?? args.sourceCapture?.routeContract?.authenticatedExecutionRequired ?? true);
  const requiresCreditCheck = true;

  const blockedReasons: string[] = [];
  if (args.actionType !== "review_pending_source_updates" && !args.queries.length) {
    blockedReasons.push("No ready query available for this action.");
  }
  (args.extraBlocked || []).forEach((item) => {
    const clean = cleanText(item);
    if (clean && !blockedReasons.includes(clean)) blockedReasons.push(clean);
  });

  const ready = blockedReasons.length === 0;

  return {
    id: args.id,
    title: args.title,
    description: args.description,
    cta: args.cta,
    actionType: args.actionType,
    priority: args.priority,
    status: ready ? "ready" : "blocked",
    requiresUserSession,
    requiresCreditCheck,
    endpoint,
    method: args.actionType === "review_pending_source_updates" ? "NAVIGATE" : "POST",
    payloadKey: args.actionType === "review_pending_source_updates" ? undefined : "query",
    queryCount: args.queries.length,
    freshnessWindowDays: args.queries[0]?.freshnessWindowDays,
    targetTopicGroups: args.groups,
    payloadPreview: args.queries,
    navigationPath: args.navigationPath,
    blockedReasons,
    boundary: [
      "Runs only through authenticated user session.",
      "Does not bypass credits/login.",
      "Creates source signals only, not final approved rates.",
      "Final BOQ/code/bylaw use requires review.",
    ],
  };
}

export function buildWebUpdateUiActionEngine(input: {
  universalWebUpdatePolicyEngine?: UniversalWebUpdatePolicyLike;
  materialWebSearchSourceCaptureEngine?: SourceCaptureLike;
  boqMaterialMappingEngine?: BoqMappingLike;
}): BuildSetuWebUpdateUiActionEngineResult {
  const policy = input.universalWebUpdatePolicyEngine || {};
  const sourceCapture = input.materialWebSearchSourceCaptureEngine || {};
  const groups = topicGroups(policy);
  const missing = Array.isArray(policy.missingInputs) ? policy.missingInputs.map(cleanText).filter(Boolean) : [];

  const allQueries = (Array.isArray(policy.priorityQueries) ? policy.priorityQueries || [] : [])
    .map((item) => ({
      query: cleanText(item.query),
      freshnessWindowDays: Number(item.freshnessWindowDays || 30),
      topicId: cleanText(item.topicId),
    }))
    .filter((item) => item.query)
    .slice(0, 10);

  const sourceReady = Boolean(policy.canExecuteFromBrowserSession || sourceCapture.canExecuteFromBrowserSession);
  const generalBlocks = sourceReady ? missing : ["Browser session web execution is not ready.", ...missing];

  const cards: BuildSetuWebUpdateUiActionCard[] = [];

  cards.push(makeCard({
    id: "web_update_run_live_update",
    title: "Run live web update",
    description: "Refresh dynamic planning data using source-aware web-search queries.",
    cta: "Run live web update",
    actionType: "run_live_web_update",
    priority: "primary",
    groups,
    policy,
    sourceCapture,
    queries: allQueries,
    extraBlocked: generalBlocks,
  }));

  cards.push(makeCard({
    id: "web_update_refresh_material_rates",
    title: "Refresh material rates",
    description: "Check current material, furniture, hardware and BOQ rate source signals.",
    cta: "Refresh material rates",
    actionType: "refresh_material_rates",
    priority: "secondary",
    groups: ["material_rate", "boq_rate", "vendor_quote", "market_trend"],
    policy,
    sourceCapture,
    queries: queriesForGroups(policy, ["material_rate", "boq_rate", "vendor_quote", "market_trend"], 6),
    extraBlocked: generalBlocks,
  }));

  cards.push(makeCard({
    id: "web_update_refresh_bylaw_source",
    title: "Refresh bylaw/source",
    description: "Check local FAR, setback, municipal and development-control sources.",
    cta: "Refresh bylaw/source",
    actionType: "refresh_bylaw_source",
    priority: "secondary",
    groups: ["bylaw_norm"],
    policy,
    sourceCapture,
    queries: queriesForGroups(policy, ["bylaw_norm"], 4),
    extraBlocked: generalBlocks,
  }));

  cards.push(makeCard({
    id: "web_update_refresh_code_source",
    title: "Refresh NBC/BIS/code source",
    description: "Check NBC, BIS, fire, safety and code update source signals.",
    cta: "Refresh code source",
    actionType: "refresh_code_source",
    priority: "secondary",
    groups: ["building_code", "structural_safety", "mep_safety"],
    policy,
    sourceCapture,
    queries: queriesForGroups(policy, ["building_code", "structural_safety", "mep_safety"], 6),
    extraBlocked: generalBlocks,
  }));

  cards.push(makeCard({
    id: "web_update_refresh_product_catalog",
    title: "Refresh product catalog",
    description: "Check brand/catalog/product availability for interior, MEP and construction materials.",
    cta: "Refresh product catalog",
    actionType: "refresh_product_catalog",
    priority: "tertiary",
    groups: ["product_catalog"],
    policy,
    sourceCapture,
    queries: queriesForGroups(policy, ["product_catalog"], 4),
    extraBlocked: generalBlocks,
  }));

  cards.push(makeCard({
    id: "web_update_review_pending_sources",
    title: "Review pending source updates",
    description: "Open source review queue before trusted knowledge merge.",
    cta: "Review sources",
    actionType: "review_pending_source_updates",
    priority: "tertiary",
    groups: ["general_source_verification", "building_code", "bylaw_norm"],
    policy,
    sourceCapture,
    queries: [],
    navigationPath: "/workspace/official-source-review-queue",
  }));

  const boqLines = Array.isArray(input.boqMaterialMappingEngine?.lineItems) ? input.boqMaterialMappingEngine?.lineItems || [] : [];
  cards.push(makeCard({
    id: "web_update_attach_source_to_boq",
    title: "Attach verified source to BOQ",
    description: "Attach reviewed source signals to BOQ draft lines without auto-approving final rate.",
    cta: "Attach to BOQ",
    actionType: "attach_verified_source_to_boq",
    priority: "tertiary",
    groups: ["boq_rate", "material_rate"],
    policy,
    sourceCapture,
    queries: queriesForGroups(policy, ["boq_rate", "material_rate"], 5),
    extraBlocked: boqLines.length ? generalBlocks : ["No BOQ draft line item available."],
  }));

  const readyActionCount = cards.filter((card) => card.status === "ready").length;
  const blockedActionCount = cards.filter((card) => card.status === "blocked").length;

  return {
    engineVersion: "M8D-1",
    scope: "web_update_ui_action_cards_no_auth_bypass",
    primaryCta: readyActionCount ? "Run live web update" : "Complete web update inputs",
    uiActionCards: cards,
    readyActionCount,
    blockedActionCount,
    executionPolicy: [
      "UI should execute web update actions from authenticated browser session.",
      "Use POST /api/agent-tools/web-search with payload key query.",
      "If route returns 401 CREDIT_CHECK_FAILED, show login/credit action instead of retrying.",
      "Store returned source signals separately from BOQ and trusted knowledge.",
    ],
    sourceReviewPolicy: [
      "Source-watch pending changes require manual review.",
      "trustedKnowledgeWrite must remain false until approved merge.",
      "BIS/NBC/bylaw/code updates must be verified from official sources.",
      "Do not use unreviewed source changes as final compliance claims.",
    ],
    nextActions: [
      "Render action cards in project chat.",
      "Run selected web update query from browser session.",
      "Capture source URL/title/snippet/date.",
      "Tag freshness and confidence.",
      "Attach reviewed source to BOQ or source review queue.",
    ],
    safetyBoundary: [
      "M8D creates UI actions only.",
      "M8D does not execute server-side unauthenticated search.",
      "M8D does not approve final rates, bylaws, codes or structural decisions.",
    ],
  };
}

export function buildWebUpdateUiActionPromptBlock(result: BuildSetuWebUpdateUiActionEngineResult): string {
  const lines: string[] = [];

  lines.push("WEB UPDATE UI ACTION CARDS:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Primary CTA: ${result.primaryCta}`);
  lines.push(`- Ready actions: ${result.readyActionCount}`);
  lines.push(`- Blocked actions: ${result.blockedActionCount}`);

  result.uiActionCards.forEach((card) => {
    lines.push(`- ${card.title}: ${card.status} | ${card.actionType} | queries ${card.queryCount}`);
  });

  lines.push("- Execution policy:");
  result.executionPolicy.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
