// BUILDSETU_PHASE_M8G_BOQ_SOURCE_ATTACH_WORKFLOW_ENGINE

type SourceSignalReviewLike = {
  engineVersion?: string;
  reviewRows?: Array<{
    id?: string;
    actionCardId?: string;
    actionType?: string;
    query?: string;
    topicId?: string | null;
    topicGroup?: string | null;
    topicLabel?: string | null;
    endpoint?: string;
    executionStatus?: string;
    reviewStatus?: string;
    freshnessWindowDays?: number;
    freshnessStatus?: string;
    confidence?: string;
    sourceLayer?: string;
    boqAttachReady?: boolean;
    matchedBoqLineIds?: string[];
    requiredReviewFields?: string[];
    rejectReasons?: string[];
    notes?: string[];
  }>;
  summary?: {
    totalRows?: number;
    pendingExecution?: number;
    blockedRows?: number;
    boqAttachCandidateRows?: number;
    requiresBrowserSession?: boolean;
  };
};

type BoqMaterialMappingLike = {
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
    confidenceRequired?: string;
  }>;
};

export type BuildSetuBoqSourceAttachAction = {
  id: string;
  sourceSignalId: string;
  boqLineId: string;
  boqItemName: string;
  boqItemGroup: string;
  query: string;
  topicGroup: string | null;
  sourceLayer: string;
  currentReviewStatus: string;
  currentFreshnessStatus: string;
  currentConfidence: string;
  attachStatus:
    | "blocked_pending_browser_execution"
    | "blocked_pending_source_capture"
    | "blocked_pending_review"
    | "blocked_low_confidence"
    | "blocked_stale_source"
    | "ready_for_attach"
    | "attached_reference_only";
  canAttachSourceReference: boolean;
  canApproveFinalRate: false;
  requiredBeforeAttach: string[];
  attachedFields: string[];
  lockedFields: string[];
  auditNotes: string[];
};

export type BuildSetuBoqSourceAttachWorkflowResult = {
  engineVersion: "M8G-1";
  scope: "source_signal_to_boq_attach_no_final_rate_approval";
  attachWorkflowReady: boolean;
  attachActions: BuildSetuBoqSourceAttachAction[];
  summary: {
    totalAttachCandidates: number;
    readyForAttach: number;
    blockedPendingExecution: number;
    blockedPendingReview: number;
    blockedLowConfidenceOrStale: number;
    finalRateApprovalLocked: true;
  };
  attachStateMachine: string[];
  attachValidationRules: string[];
  finalRateApprovalBoundary: string[];
  storageContract: string[];
  uiActions: string[];
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
    .slice(0, 90) || "item";
}

function buildBoqLineMap(boq?: BoqMaterialMappingLike) {
  const map = new Map<string, NonNullable<BoqMaterialMappingLike["lineItems"]>[number]>();
  const lines = Array.isArray(boq?.lineItems) ? boq?.lineItems || [] : [];
  lines.forEach((line) => {
    const id = cleanText(line.id);
    if (id) map.set(id, line);
  });
  return map;
}

function inferAttachStatus(row: NonNullable<SourceSignalReviewLike["reviewRows"]>[number]): BuildSetuBoqSourceAttachAction["attachStatus"] {
  const executionStatus = cleanText(row.executionStatus);
  const reviewStatus = cleanText(row.reviewStatus);
  const freshness = cleanText(row.freshnessStatus);
  const confidence = cleanText(row.confidence);

  if (executionStatus === "pending_browser_execution") return "blocked_pending_browser_execution";
  if (reviewStatus === "pending_source_capture") return "blocked_pending_source_capture";
  if (reviewStatus === "pending_review") return "blocked_pending_review";
  if (confidence === "low" || confidence === "reject") return "blocked_low_confidence";
  if (freshness === "stale" || freshness === "unknown") return "blocked_stale_source";
  if (reviewStatus === "approved_for_boq_attach" && confidence === "high" && freshness === "fresh") return "ready_for_attach";
  if (reviewStatus === "approved_for_reference") return "attached_reference_only";

  return "blocked_pending_review";
}

function requiredBeforeAttach(status: BuildSetuBoqSourceAttachAction["attachStatus"]) {
  if (status === "blocked_pending_browser_execution") {
    return ["Run browser-session web update first.", "Normalize returned source result."];
  }
  if (status === "blocked_pending_source_capture") {
    return ["Capture sourceTitle/sourceUrl/snippet/fetchedAt.", "Move source signal to pending_review."];
  }
  if (status === "blocked_pending_review") {
    return ["Review source relevance.", "Confirm date/unit/city/spec/scope.", "Set reviewStatus to approved_for_boq_attach only if valid."];
  }
  if (status === "blocked_low_confidence") {
    return ["Reject or replace low-confidence source.", "Collect vendor quote or official source."];
  }
  if (status === "blocked_stale_source") {
    return ["Refresh source.", "Use current source within freshness window."];
  }
  if (status === "attached_reference_only") {
    return ["Use as reference only.", "Collect vendor quote before final rate."];
  }
  return ["Attach sourceSignalId to BOQ line.", "Keep finalRateApproval locked."];
}

export function buildBoqSourceAttachWorkflowEngine(input: {
  webUpdateSourceSignalReviewEngine?: SourceSignalReviewLike;
  boqMaterialMappingEngine?: BoqMaterialMappingLike;
}): BuildSetuBoqSourceAttachWorkflowResult {
  const reviewRows = Array.isArray(input.webUpdateSourceSignalReviewEngine?.reviewRows)
    ? input.webUpdateSourceSignalReviewEngine?.reviewRows || []
    : [];
  const boqMap = buildBoqLineMap(input.boqMaterialMappingEngine);

  const attachActions: BuildSetuBoqSourceAttachAction[] = [];

  reviewRows.forEach((row) => {
    const matchedIds = Array.isArray(row.matchedBoqLineIds) ? row.matchedBoqLineIds.map(cleanText).filter(Boolean) : [];
    matchedIds.forEach((boqLineId) => {
      const boqLine = boqMap.get(boqLineId);
      if (!boqLine) return;

      const sourceSignalId = cleanText(row.id);
      const status = inferAttachStatus(row);

      attachActions.push({
        id: `attach_${slug(sourceSignalId)}_${slug(boqLineId)}`,
        sourceSignalId,
        boqLineId,
        boqItemName: cleanText(boqLine.itemName),
        boqItemGroup: cleanText(boqLine.itemGroup),
        query: cleanText(row.query),
        topicGroup: row.topicGroup ? cleanText(row.topicGroup) : null,
        sourceLayer: cleanText(row.sourceLayer || "unknown_pending_execution"),
        currentReviewStatus: cleanText(row.reviewStatus),
        currentFreshnessStatus: cleanText(row.freshnessStatus),
        currentConfidence: cleanText(row.confidence),
        attachStatus: status,
        canAttachSourceReference: status === "ready_for_attach" || status === "attached_reference_only",
        canApproveFinalRate: false,
        requiredBeforeAttach: requiredBeforeAttach(status),
        attachedFields: [
          "sourceSignalId",
          "sourceTitle",
          "sourceUrl",
          "sourceLayer",
          "query",
          "fetchedAt",
          "freshnessStatus",
          "confidence",
          "reviewStatus",
          "reviewedBy",
          "reviewedAt",
        ],
        lockedFields: [
          "finalRate",
          "approvedRate",
          "approvedAmount",
          "procurementDecision",
          "trustedKnowledgeMerge",
          "codeComplianceDecision",
        ],
        auditNotes: [
          "Attach source reference only; do not approve final rate.",
          "BOQ final pricing must require separate approval/vendor quote.",
          "Keep source signal and BOQ line as separate records.",
        ],
      });
    });
  });

  const readyForAttach = attachActions.filter((item) => item.attachStatus === "ready_for_attach").length;
  const blockedPendingExecution = attachActions.filter((item) => item.attachStatus === "blocked_pending_browser_execution").length;
  const blockedPendingReview = attachActions.filter((item) =>
    ["blocked_pending_source_capture", "blocked_pending_review"].includes(item.attachStatus)
  ).length;
  const blockedLowConfidenceOrStale = attachActions.filter((item) =>
    ["blocked_low_confidence", "blocked_stale_source"].includes(item.attachStatus)
  ).length;

  return {
    engineVersion: "M8G-1",
    scope: "source_signal_to_boq_attach_no_final_rate_approval",
    attachWorkflowReady: attachActions.length > 0,
    attachActions,
    summary: {
      totalAttachCandidates: attachActions.length,
      readyForAttach,
      blockedPendingExecution,
      blockedPendingReview,
      blockedLowConfidenceOrStale,
      finalRateApprovalLocked: true,
    },
    attachStateMachine: [
      "pending_browser_execution → pending_source_capture",
      "pending_source_capture → pending_review",
      "pending_review → approved_for_reference or rejected",
      "approved_for_reference → approved_for_boq_attach only after unit/date/spec/scope validation",
      "approved_for_boq_attach → source_attached_to_boq_reference",
      "source_attached_to_boq_reference → final_rate_approval remains locked",
    ],
    attachValidationRules: [
      "Source must have URL/title and fetchedAt.",
      "Source must match BOQ item group or material target.",
      "Unit/rate basis must match BOQ rateUnit or require conversion review.",
      "Freshness must be fresh or manually accepted as reference only.",
      "Confidence must be high for BOQ attach readiness.",
      "GST/labour/transport/installation scope must remain visible.",
    ],
    finalRateApprovalBoundary: [
      "Source attach is not final rate approval.",
      "Final rate approval requires vendor quote or approved estimate workflow.",
      "Web-search source can support rate range but cannot become approvedRate automatically.",
      "Code/bylaw/NBC/BIS source attach cannot become compliance approval automatically.",
    ],
    storageContract: [
      "boqLine.sourceSignals[] stores sourceSignalId and review metadata.",
      "boqLine.finalRate stays null/locked until approval workflow.",
      "sourceSignal.reviewStatus and boqLine.pricingStatus remain separate.",
      "trustedKnowledgeWrite remains false for unreviewed external updates.",
    ],
    uiActions: [
      "Show attach candidates under BOQ line.",
      "Disable Attach button until reviewStatus is approved_for_boq_attach.",
      "Show final rate locked badge after attach.",
      "Show vendor quote required badge for procurement.",
      "Show unit/scope mismatch warnings.",
    ],
    nextActions: [
      "Run browser web update.",
      "Normalize source results into review rows.",
      "Review source freshness/confidence.",
      "Approve eligible source signal for BOQ attach.",
      "Attach source reference to BOQ line.",
      "Run separate final rate approval workflow later.",
    ],
    safetyBoundary: [
      "M8G does not execute web-search.",
      "M8G does not approve final rates.",
      "M8G does not merge trusted knowledge.",
      "M8G does not approve legal/code/bylaw/structural/MEP compliance.",
    ],
  };
}

export function buildBoqSourceAttachWorkflowPromptBlock(result: BuildSetuBoqSourceAttachWorkflowResult): string {
  const lines: string[] = [];

  lines.push("BOQ SOURCE ATTACH WORKFLOW:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Attach workflow ready: ${result.attachWorkflowReady ? "yes" : "no"}`);
  lines.push(`- Attach candidates: ${result.summary.totalAttachCandidates}`);
  lines.push(`- Ready for attach: ${result.summary.readyForAttach}`);
  lines.push(`- Blocked pending execution: ${result.summary.blockedPendingExecution}`);
  lines.push(`- Blocked pending review: ${result.summary.blockedPendingReview}`);
  lines.push(`- Final rate approval locked: ${result.summary.finalRateApprovalLocked ? "yes" : "no"}`);

  result.attachActions.slice(0, 10).forEach((item) => {
    lines.push(`- ${item.boqItemName}: ${item.attachStatus} | ${item.sourceLayer} | ${item.currentReviewStatus}`);
  });

  lines.push("- Final rate boundary:");
  result.finalRateApprovalBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
