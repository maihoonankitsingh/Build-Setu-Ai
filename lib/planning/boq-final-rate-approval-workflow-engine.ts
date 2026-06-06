// BUILDSETU_PHASE_M8H_BOQ_FINAL_RATE_APPROVAL_WORKFLOW_ENGINE

type BoqSourceAttachLike = {
  engineVersion?: string;
  attachActions?: Array<{
    id?: string;
    sourceSignalId?: string;
    boqLineId?: string;
    boqItemName?: string;
    boqItemGroup?: string;
    query?: string;
    sourceLayer?: string;
    attachStatus?: string;
    canAttachSourceReference?: boolean;
    canApproveFinalRate?: boolean;
    currentReviewStatus?: string;
    currentFreshnessStatus?: string;
    currentConfidence?: string;
  }>;
  summary?: {
    totalAttachCandidates?: number;
    readyForAttach?: number;
    finalRateApprovalLocked?: boolean;
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

type PriceSourceLike = {
  detectedLocation?: string | null;
  detectedBudgetTier?: string | null;
  priceIntentDetected?: boolean;
  webSearchRequested?: boolean;
  sourceLayers?: Array<{
    layer?: string;
    freshnessWindowDays?: number;
    confidenceBase?: string;
  }>;
};

export type BuildSetuFinalRateApprovalRow = {
  id: string;
  boqLineId: string;
  boqItemName: string;
  boqItemGroup: string;
  quantityBasis: string;
  rateUnit: string;
  pricingStatus: string;
  sourceReferenceStatus:
    | "no_source_reference"
    | "source_reference_pending_execution"
    | "source_reference_pending_review"
    | "source_reference_ready"
    | "source_reference_attached";
  finalRateStatus:
    | "locked_pending_vendor_quote"
    | "locked_pending_source_review"
    | "locked_pending_scope_confirmation"
    | "ready_for_manual_approval"
    | "approved_manually";
  finalRateLocked: boolean;
  canApproveFinalRate: boolean;
  vendorQuoteRequired: boolean;
  sourceAttachRequired: boolean;
  manualApprovalRequired: boolean;
  requiredDocuments: string[];
  requiredScopeChecks: string[];
  approvalBlockers: string[];
  allowedNextActions: string[];
  lockedFields: string[];
  auditTrailRequired: string[];
};

export type BuildSetuBoqFinalRateApprovalWorkflowResult = {
  engineVersion: "M8H-1";
  scope: "final_rate_approval_lock_vendor_quote_workflow";
  finalRateApprovalLockedByDefault: true;
  approvalWorkflowReady: boolean;
  approvalRows: BuildSetuFinalRateApprovalRow[];
  summary: {
    totalBoqLines: number;
    lockedRows: number;
    readyForManualApproval: number;
    vendorQuoteRequiredRows: number;
    sourceReviewRequiredRows: number;
    approvedRows: 0;
  };
  approvalStateMachine: string[];
  vendorQuotePolicy: string[];
  manualApprovalPolicy: string[];
  sourceVsFinalRateSeparation: string[];
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

function attachActionsForLine(boqLineId: string, attach?: BoqSourceAttachLike) {
  const actions = Array.isArray(attach?.attachActions) ? attach?.attachActions || [] : [];
  return actions.filter((item) => cleanText(item.boqLineId) === boqLineId);
}

function inferSourceReferenceStatus(actions: ReturnType<typeof attachActionsForLine>): BuildSetuFinalRateApprovalRow["sourceReferenceStatus"] {
  if (!actions.length) return "no_source_reference";

  if (actions.some((item) => cleanText(item.attachStatus) === "ready_for_attach")) {
    return "source_reference_ready";
  }

  if (actions.some((item) => cleanText(item.attachStatus) === "attached_reference_only")) {
    return "source_reference_attached";
  }

  if (actions.some((item) => cleanText(item.attachStatus) === "blocked_pending_browser_execution")) {
    return "source_reference_pending_execution";
  }

  return "source_reference_pending_review";
}

function inferFinalRateStatus(sourceStatus: BuildSetuFinalRateApprovalRow["sourceReferenceStatus"]): BuildSetuFinalRateApprovalRow["finalRateStatus"] {
  if (sourceStatus === "source_reference_ready" || sourceStatus === "source_reference_attached") {
    return "locked_pending_vendor_quote";
  }
  if (sourceStatus === "source_reference_pending_review") {
    return "locked_pending_source_review";
  }
  if (sourceStatus === "source_reference_pending_execution") {
    return "locked_pending_source_review";
  }
  return "locked_pending_vendor_quote";
}

function buildApprovalRow(args: {
  line: NonNullable<BoqMaterialMappingLike["lineItems"]>[number];
  attachActions: ReturnType<typeof attachActionsForLine>;
  location: string;
}): BuildSetuFinalRateApprovalRow {
  const line = args.line;
  const boqLineId = cleanText(line.id);
  const sourceStatus = inferSourceReferenceStatus(args.attachActions);
  const finalRateStatus = inferFinalRateStatus(sourceStatus);

  const vendorQuoteRequired = true;
  const sourceAttachRequired = sourceStatus === "no_source_reference" || sourceStatus === "source_reference_pending_execution" || sourceStatus === "source_reference_pending_review";
  const scopeMissing = true;

  const approvalBlockers: string[] = [];
  if (sourceAttachRequired) approvalBlockers.push("Reviewed source reference is not attached yet.");
  if (vendorQuoteRequired) approvalBlockers.push("Vendor quote/manual rate confirmation is required.");
  if (scopeMissing) approvalBlockers.push("GST, labour, transport, loading/unloading, installation and warranty scope must be confirmed.");

  return {
    id: `final_rate_${slug(boqLineId || cleanText(line.itemName))}`,
    boqLineId,
    boqItemName: cleanText(line.itemName),
    boqItemGroup: cleanText(line.itemGroup),
    quantityBasis: cleanText(line.quantityBasis),
    rateUnit: cleanText(line.rateUnit),
    pricingStatus: cleanText(line.pricingStatus || "source_signal_required"),
    sourceReferenceStatus: sourceStatus,
    finalRateStatus,
    finalRateLocked: true,
    canApproveFinalRate: false,
    vendorQuoteRequired,
    sourceAttachRequired,
    manualApprovalRequired: true,
    requiredDocuments: [
      "Reviewed source signal reference",
      "Vendor/dealer quotation",
      "BOQ line quantity basis",
      "Rate unit confirmation",
      "GST/labour/transport/install scope",
      "Reviewer approval note",
    ],
    requiredScopeChecks: [
      "City/service area",
      "Material brand/spec/grade",
      "Unit/rate basis",
      "Quantity basis",
      "GST inclusion",
      "Labour inclusion",
      "Transport/loading/unloading",
      "Installation scope",
      "Warranty/after-sales scope",
      "Validity date",
    ],
    approvalBlockers,
    allowedNextActions: [
      "Run browser web update",
      "Review source signal",
      "Attach reviewed source reference",
      "Collect vendor quote",
      "Compare source signal vs vendor quote",
      "Submit for manual approval",
    ],
    lockedFields: [
      "finalRate",
      "approvedRate",
      "approvedAmount",
      "procurementDecision",
      "clientApproval",
      "paymentDecision",
    ],
    auditTrailRequired: [
      "approvedBy",
      "approvedAt",
      "sourceSignalIds",
      "vendorQuoteFileOrReference",
      "scopeConfirmation",
      "approvalNote",
      "rateValidityDate",
    ],
  };
}

export function buildBoqFinalRateApprovalWorkflowEngine(input: {
  boqSourceAttachWorkflowEngine?: BoqSourceAttachLike;
  boqMaterialMappingEngine?: BoqMaterialMappingLike;
  materialPriceSourceFreshnessEngine?: PriceSourceLike;
}): BuildSetuBoqFinalRateApprovalWorkflowResult {
  const lines = Array.isArray(input.boqMaterialMappingEngine?.lineItems)
    ? input.boqMaterialMappingEngine?.lineItems || []
    : [];

  const location = cleanText(input.materialPriceSourceFreshnessEngine?.detectedLocation || "project city");

  const approvalRows = lines.map((line) =>
    buildApprovalRow({
      line,
      attachActions: attachActionsForLine(cleanText(line.id), input.boqSourceAttachWorkflowEngine),
      location,
    })
  );

  const lockedRows = approvalRows.filter((row) => row.finalRateLocked).length;
  const readyForManualApproval = approvalRows.filter((row) => row.finalRateStatus === "ready_for_manual_approval").length;
  const vendorQuoteRequiredRows = approvalRows.filter((row) => row.vendorQuoteRequired).length;
  const sourceReviewRequiredRows = approvalRows.filter((row) => row.sourceAttachRequired).length;

  return {
    engineVersion: "M8H-1",
    scope: "final_rate_approval_lock_vendor_quote_workflow",
    finalRateApprovalLockedByDefault: true,
    approvalWorkflowReady: approvalRows.length > 0,
    approvalRows,
    summary: {
      totalBoqLines: approvalRows.length,
      lockedRows,
      readyForManualApproval,
      vendorQuoteRequiredRows,
      sourceReviewRequiredRows,
      approvedRows: 0,
    },
    approvalStateMachine: [
      "source_signal_pending → source_signal_reviewed",
      "source_signal_reviewed → source_attached_to_boq_reference",
      "source_attached_to_boq_reference → vendor_quote_required",
      "vendor_quote_required → scope_confirmation_required",
      "scope_confirmation_required → ready_for_manual_approval",
      "ready_for_manual_approval → approved_manually",
      "approved_manually is the only state that may write approvedRate.",
    ],
    vendorQuotePolicy: [
      "Vendor quote is mandatory for procurement-grade final rate.",
      "Quote must include vendor name, city/service area, date, unit, material spec, GST, labour, transport, installation and validity.",
      "Web-search source can support comparison but cannot replace vendor quote.",
      "Expired or unclear quotes remain low-confidence.",
    ],
    manualApprovalPolicy: [
      "Only approved_manually can unlock approvedRate/finalRate fields.",
      "Manual approval requires reviewer identity, timestamp, source references and approval note.",
      "Any unit mismatch requires conversion review before approval.",
      "Any GST/labour/transport ambiguity blocks approval.",
    ],
    sourceVsFinalRateSeparation: [
      "sourceSignal is evidence.",
      "boqLine is estimate structure.",
      "vendorQuote is procurement evidence.",
      "approvedRate is a separate manual decision.",
      "trustedKnowledgeWrite remains unrelated to BOQ rate approval.",
    ],
    uiActions: [
      "Show final rate locked badge on every BOQ row.",
      "Show vendor quote required badge.",
      "Show source reference attached/not attached badge.",
      "Disable Approve Final Rate until all approvalBlockers are cleared.",
      "Show audit trail fields before manual approval.",
    ],
    nextActions: [
      "Execute browser web update.",
      "Review and attach source signal.",
      "Collect vendor quote.",
      "Compare source signal and vendor quote.",
      "Confirm scope and unit.",
      "Submit for manual final rate approval.",
    ],
    safetyBoundary: [
      "M8H does not approve rates automatically.",
      "M8H does not execute procurement decision.",
      "M8H does not merge source data into trusted knowledge.",
      "M8H does not approve legal/code/bylaw/structural/MEP compliance.",
    ],
  };
}

export function buildBoqFinalRateApprovalWorkflowPromptBlock(result: BuildSetuBoqFinalRateApprovalWorkflowResult): string {
  const lines: string[] = [];

  lines.push("BOQ FINAL RATE APPROVAL WORKFLOW:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Approval workflow ready: ${result.approvalWorkflowReady ? "yes" : "no"}`);
  lines.push(`- Final rate locked by default: ${result.finalRateApprovalLockedByDefault ? "yes" : "no"}`);
  lines.push(`- BOQ rows: ${result.summary.totalBoqLines}`);
  lines.push(`- Locked rows: ${result.summary.lockedRows}`);
  lines.push(`- Vendor quote required rows: ${result.summary.vendorQuoteRequiredRows}`);
  lines.push(`- Source review required rows: ${result.summary.sourceReviewRequiredRows}`);
  lines.push(`- Approved rows: ${result.summary.approvedRows}`);

  result.approvalRows.slice(0, 10).forEach((row) => {
    lines.push(`- ${row.boqItemName}: ${row.finalRateStatus} | source=${row.sourceReferenceStatus} | locked=${row.finalRateLocked}`);
  });

  lines.push("- Manual approval policy:");
  result.manualApprovalPolicy.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
