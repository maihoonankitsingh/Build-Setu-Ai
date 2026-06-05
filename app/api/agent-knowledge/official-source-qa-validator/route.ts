import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

type ValidatorIssue = {
  code: string;
  severity: "blocking" | "warning";
  message: string;
};

const QUEUE_RELATIVE_PATH = "data/buildsetu-source-review-queue/queue.json";
const DRAFT_RELATIVE_PATH = "data/buildsetu-source-extraction-drafts/drafts.json";

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

async function readJson(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.drafts)) return value.drafts;
  if (Array.isArray(value?.sources)) return value.sources;
  if (Array.isArray(value?.queue)) return value.queue;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function cleanText(value: unknown, max = 2000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function hasText(value: unknown) {
  return cleanText(value).length > 0;
}

function getSourceId(item: JsonObject): string {
  return cleanText(
    item?.sourceId ||
      item?.source_id ||
      item?.sourceReviewItem?.sourceId ||
      item?.sourceReviewItemId ||
      item?.id ||
      item?.slug ||
      item?.source?.id ||
      item?.source?.sourceId ||
      "",
    240
  );
}

function getDraftId(draft: JsonObject): string {
  return cleanText(draft?.draftId || draft?.id || "", 260);
}

function getDraftTitle(draft: JsonObject, queueItem: JsonObject) {
  return cleanText(
    draft?.sourceTitle ||
      draft?.title ||
      draft?.sourceReviewItem?.title ||
      queueItem?.title ||
      queueItem?.sourceTitle ||
      queueItem?.source?.title ||
      "",
    260
  );
}

function getDraftUrl(draft: JsonObject, queueItem: JsonObject) {
  return cleanText(
    draft?.sourceUrl ||
      draft?.url ||
      draft?.sourceReviewItem?.url ||
      queueItem?.url ||
      queueItem?.sourceUrl ||
      queueItem?.source?.url ||
      "",
    1200
  );
}

function getSourceCitation(draft: JsonObject) {
  return cleanText(
    draft?.sourceCitation ||
      draft?.extractedDraft?.sourceCitation ||
      draft?.sourceReviewItem?.sourceCitation ||
      "",
    1600
  );
}

function getClaims(draft: JsonObject) {
  const claims =
    draft?.claims ||
    draft?.extractedDraft?.claims ||
    draft?.qa?.claims ||
    [];

  return Array.isArray(claims) ? claims : [];
}

function claimHasCitation(claim: any) {
  if (typeof claim === "string") return false;

  return Boolean(
    cleanText(claim?.citation || "", 1200) ||
      cleanText(claim?.sourceUrl || "", 1200) ||
      cleanText(claim?.url || "", 1200) ||
      cleanText(claim?.sourceCitation || "", 1200)
  );
}

function getCitationCheckObject(draft: JsonObject) {
  const checks =
    draft?.citationChecks ||
    draft?.extractedDraft?.citationChecks ||
    draft?.qa?.citationChecks ||
    {};

  if (Array.isArray(checks)) {
    return checks.find((item) => item && typeof item === "object") || {};
  }

  if (checks && typeof checks === "object") return checks;
  return {};
}

function queueMapBySourceId(queueItems: JsonObject[]) {
  const out = new Map<string, JsonObject>();

  for (const item of queueItems) {
    const sourceId = getSourceId(item);
    if (sourceId) out.set(sourceId, item);

    const itemId = cleanText(item?.id || "", 260);
    if (itemId) out.set(itemId, item);
  }

  return out;
}

function addBlocking(issues: ValidatorIssue[], code: string, message: string) {
  issues.push({ code, severity: "blocking", message });
}

function addWarning(issues: ValidatorIssue[], code: string, message: string) {
  issues.push({ code, severity: "warning", message });
}

function calculateQaScore(blockingIssues: ValidatorIssue[], warnings: ValidatorIssue[]) {
  const score = 100 - blockingIssues.length * 12 - warnings.length * 4;
  return Math.max(0, Math.min(100, score));
}

function validateDraft(draft: JsonObject, queueItem: JsonObject) {
  const sourceId = getSourceId(draft);
  const sourceReviewItemId = cleanText(draft?.sourceReviewItemId || "", 260);
  const draftId = getDraftId(draft);
  const sourceTitle = getDraftTitle(draft, queueItem);
  const sourceUrl = getDraftUrl(draft, queueItem);
  const sourceCitation = getSourceCitation(draft);
  const reviewStatus = cleanText(
    queueItem?.status ||
      draft?.reviewStatusAtDraftCreation ||
      draft?.reviewStatus ||
      "unknown",
    80
  );
  const mergeReady = Boolean(queueItem?.review?.mergeReady === true || draft?.review?.mergeReady === true);
  const draftStatus = cleanText(draft?.status || draft?.draftStatus || "unknown", 80);
  const qaStatus = cleanText(draft?.qaStatus || draft?.qa?.status || "extraction_pending", 80);
  const summary = cleanText(draft?.summary || draft?.extractedDraft?.summary || "", 4000);
  const jurisdiction = cleanText(draft?.jurisdiction || draft?.extractedDraft?.jurisdiction || "", 1200);
  const applicability = cleanText(draft?.applicability || draft?.extractedDraft?.applicability || "", 1200);
  const versionDate = cleanText(draft?.versionDate || draft?.extractedDraft?.versionDate || "", 500);
  const claims = getClaims(draft);
  const citationChecks = getCitationCheckObject(draft);
  const blockingIssues: ValidatorIssue[] = [];
  const warnings: ValidatorIssue[] = [];

  if (!draftId) {
    addBlocking(blockingIssues, "draft_id_missing", "Draft ID is missing.");
  }

  if (!sourceId && !sourceReviewItemId) {
    addBlocking(blockingIssues, "source_id_missing", "Source ID or source review item ID is missing.");
  }

  if (!hasText(sourceTitle)) {
    addWarning(warnings, "source_title_missing", "Source title is missing.");
  }

  if (!hasText(sourceUrl)) {
    addBlocking(blockingIssues, "source_url_missing", "Source URL is required.");
  }

  if (!hasText(sourceCitation) && citationChecks?.sourceCitationPresent !== true) {
    addBlocking(blockingIssues, "source_citation_missing", "Source citation is required.");
  }

  if (reviewStatus !== "approved") {
    addBlocking(blockingIssues, "review_not_approved", "Source review status must be approved.");
  }

  if (!mergeReady) {
    addBlocking(blockingIssues, "merge_ready_false", "Review item must have mergeReady=true before any merge-candidate preview.");
  }

  if (qaStatus !== "qa_ready") {
    addBlocking(blockingIssues, "qa_status_not_ready", "Draft QA status must be qa_ready.");
  }

  if (!hasText(summary)) {
    addBlocking(blockingIssues, "summary_missing", "Summary is required.");
  }

  if (!hasText(jurisdiction)) {
    addBlocking(blockingIssues, "jurisdiction_missing", "Jurisdiction is required.");
  }

  if (!hasText(applicability)) {
    addBlocking(blockingIssues, "applicability_missing", "Applicability is required.");
  }

  if (!hasText(versionDate)) {
    addBlocking(blockingIssues, "version_date_missing", "Version/date is required.");
  }

  if (!claims.length) {
    addBlocking(blockingIssues, "claims_missing", "At least one extracted claim is required.");
  }

  const claimsWithoutCitation = claims.filter((claim) => !claimHasCitation(claim));
  if (claimsWithoutCitation.length > 0) {
    addBlocking(
      blockingIssues,
      "claims_without_citation",
      `${claimsWithoutCitation.length} claim(s) are missing citation/source URL.`
    );
  }

  if (citationChecks?.sourceUrlPresent === false) {
    addBlocking(blockingIssues, "citation_check_source_url_false", "Citation check says source URL is not present.");
  }

  if (citationChecks?.jurisdictionMarked === false) {
    addBlocking(blockingIssues, "citation_check_jurisdiction_false", "Citation check says jurisdiction is not marked.");
  }

  if (citationChecks?.applicabilityMarked === false) {
    addBlocking(blockingIssues, "citation_check_applicability_false", "Citation check says applicability is not marked.");
  }

  if (citationChecks?.versionDateMarked === false) {
    addBlocking(blockingIssues, "citation_check_version_date_false", "Citation check says version/date is not marked.");
  }

  if (citationChecks?.allClaimsHaveCitation === false) {
    addBlocking(blockingIssues, "citation_check_claims_false", "Citation check says not all claims have citations.");
  }

  if (!hasText(draft?.qa?.reviewer || draft?.reviewer || "")) {
    addWarning(warnings, "qa_reviewer_missing", "QA reviewer is missing.");
  }

  if (!hasText(draft?.qa?.notes || draft?.qaNotes || "")) {
    addWarning(warnings, "qa_notes_missing", "QA notes are missing.");
  }

  if (draftStatus === "unknown") {
    addWarning(warnings, "draft_status_unknown", "Draft status is unknown.");
  }

  const qaScore = calculateQaScore(blockingIssues, warnings);
  const readyForTrustedMergeCandidate = blockingIssues.length === 0 && qaScore >= 90;

  return {
    draftId,
    sourceId,
    sourceReviewItemId,
    sourceTitle,
    sourceUrl,
    reviewStatus,
    mergeReady,
    draftStatus,
    qaStatus,
    qaScore,
    readyForTrustedMergeCandidate,
    blockingIssues,
    warnings,
    validationSummary: {
      sourceUrlPresent: hasText(sourceUrl),
      sourceCitationPresent: hasText(sourceCitation) || citationChecks?.sourceCitationPresent === true,
      summaryPresent: hasText(summary),
      jurisdictionMarked: hasText(jurisdiction),
      applicabilityMarked: hasText(applicability),
      versionDateMarked: hasText(versionDate),
      claimsCount: claims.length,
      claimsWithoutCitationCount: claimsWithoutCitation.length,
      allClaimsHaveCitation: claims.length > 0 && claimsWithoutCitation.length === 0,
    },
    safetyBoundary: {
      mode: "read_only_qa_validator",
      trustedMergeEnabled: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
    },
  };
}

export async function GET() {
  const draftsData = await readJson(projectPath(DRAFT_RELATIVE_PATH), {
    version: 1,
    items: [],
    trustedKnowledgeWrite: false,
  });

  const queueData = await readJson(projectPath(QUEUE_RELATIVE_PATH), {
    version: 1,
    items: [],
    mergePolicy: "manual_review_required",
    autoMerge: false,
  });

  const drafts = asArray(draftsData);
  const queueItems = asArray(queueData);
  const queueBySourceId = queueMapBySourceId(queueItems);

  const results = drafts.map((draft: JsonObject) => {
    const sourceId = getSourceId(draft);
    const sourceReviewItemId = cleanText(draft?.sourceReviewItemId || "", 260);
    const queueItem =
      queueBySourceId.get(sourceId) ||
      queueBySourceId.get(sourceReviewItemId) ||
      {};

    return validateDraft(draft, queueItem);
  });

  return NextResponse.json({
    ok: true,
    phase: "45G-1",
    validatorPolicy: "read_only_validator_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    count: results.length,
    summary: {
      total: results.length,
      readyForTrustedMergeCandidate: results.filter((item) => item.readyForTrustedMergeCandidate).length,
      blocked: results.filter((item) => item.blockingIssues.length > 0).length,
      warnings: results.reduce((sum, item) => sum + item.warnings.length, 0),
    },
    results,
  });
}
