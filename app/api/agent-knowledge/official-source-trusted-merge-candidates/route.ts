import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

type CandidateIssue = {
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

function safeId(value: unknown, fallback: string) {
  const id = cleanText(value, 220)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || fallback;
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

function getSourceCitation(draft: JsonObject, title: string, url: string) {
  const existing = cleanText(
    draft?.sourceCitation ||
      draft?.extractedDraft?.sourceCitation ||
      draft?.sourceReviewItem?.sourceCitation ||
      "",
    1600
  );

  if (existing) return existing;
  if (title && url) return `${title} — ${url}`;
  if (title) return title;
  return url;
}

function getDomains(draft: JsonObject, queueItem: JsonObject) {
  const draftDomains = Array.isArray(draft?.domains) ? draft.domains : [];
  const queueDomains = Array.isArray(queueItem?.domains) ? queueItem.domains : [];
  const sourceDomains = Array.isArray(queueItem?.source?.domains) ? queueItem.source.domains : [];

  return [...draftDomains, ...queueDomains, ...sourceDomains]
    .map((domain) => cleanText(domain, 120))
    .filter(Boolean)
    .filter((domain, index, arr) => arr.indexOf(domain) === index);
}

function getClaims(draft: JsonObject) {
  const claims =
    draft?.claims ||
    draft?.extractedDraft?.claims ||
    draft?.qa?.claims ||
    [];

  return Array.isArray(claims) ? claims : [];
}

function normalizeClaim(claim: any, index: number) {
  if (typeof claim === "string") {
    return {
      id: `claim_${index + 1}`,
      text: cleanText(claim, 2400),
      citation: "",
      sourceUrl: "",
      note: "",
    };
  }

  return {
    id: cleanText(claim?.id || `claim_${index + 1}`, 160),
    text: cleanText(claim?.text || claim?.claim || claim?.summary || "", 2400),
    citation: cleanText(claim?.citation || claim?.sourceCitation || "", 1600),
    sourceUrl: cleanText(claim?.sourceUrl || claim?.url || "", 1200),
    note: cleanText(claim?.note || claim?.notes || "", 1200),
  };
}

function claimHasCitation(claim: any) {
  const normalized = normalizeClaim(claim, 0);
  return Boolean(normalized.citation || normalized.sourceUrl);
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

function addBlocking(issues: CandidateIssue[], code: string, message: string) {
  issues.push({ code, severity: "blocking", message });
}

function addWarning(issues: CandidateIssue[], code: string, message: string) {
  issues.push({ code, severity: "warning", message });
}

function calculateQaScore(blockingIssues: CandidateIssue[], warnings: CandidateIssue[]) {
  const score = 100 - blockingIssues.length * 12 - warnings.length * 4;
  return Math.max(0, Math.min(100, score));
}

function validateCandidateInput(args: {
  draft: JsonObject;
  queueItem: JsonObject;
  sourceTitle: string;
  sourceUrl: string;
  sourceCitation: string;
  domains: string[];
  claims: any[];
}) {
  const { draft, queueItem, sourceTitle, sourceUrl, sourceCitation, domains, claims } = args;

  const blockingIssues: CandidateIssue[] = [];
  const warnings: CandidateIssue[] = [];

  const draftId = getDraftId(draft);
  const sourceId = getSourceId(draft);
  const sourceReviewItemId = cleanText(draft?.sourceReviewItemId || "", 260);
  const reviewStatus = cleanText(
    queueItem?.status ||
      draft?.reviewStatusAtDraftCreation ||
      draft?.reviewStatus ||
      "unknown",
    80
  );
  const mergeReady = Boolean(queueItem?.review?.mergeReady === true || draft?.review?.mergeReady === true);
  const qaStatus = cleanText(draft?.qaStatus || draft?.qa?.status || "extraction_pending", 80);
  const summary = cleanText(draft?.summary || draft?.extractedDraft?.summary || "", 4000);
  const jurisdiction = cleanText(draft?.jurisdiction || draft?.extractedDraft?.jurisdiction || "", 1200);
  const applicability = cleanText(draft?.applicability || draft?.extractedDraft?.applicability || "", 1200);
  const versionDate = cleanText(draft?.versionDate || draft?.extractedDraft?.versionDate || "", 500);
  const citationChecks = getCitationCheckObject(draft);

  if (!draftId) {
    addBlocking(blockingIssues, "draft_id_missing", "Draft ID is missing.");
  }

  if (!sourceId && !sourceReviewItemId) {
    addBlocking(blockingIssues, "source_id_missing", "Source ID or source review item ID is missing.");
  }

  if (!hasText(sourceTitle)) {
    addBlocking(blockingIssues, "source_title_missing", "Source title is required.");
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
    addBlocking(blockingIssues, "merge_ready_false", "Review item must have mergeReady=true.");
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

  if (!domains.length) {
    addWarning(warnings, "target_domain_missing", "No target domain found; candidate cannot be assigned cleanly.");
  }

  if (!hasText(draft?.qa?.reviewer || draft?.reviewer || "")) {
    addWarning(warnings, "qa_reviewer_missing", "QA reviewer is missing.");
  }

  if (!hasText(draft?.qa?.notes || draft?.qaNotes || "")) {
    addWarning(warnings, "qa_notes_missing", "QA notes are missing.");
  }

  const qaScore = calculateQaScore(blockingIssues, warnings);

  return {
    blockingIssues,
    warnings,
    qaScore,
    ready: blockingIssues.length === 0 && qaScore >= 90,
    details: {
      reviewStatus,
      mergeReady,
      qaStatus,
      claimsWithoutCitationCount: claimsWithoutCitation.length,
    },
  };
}

function buildCandidate(draft: JsonObject, queueItem: JsonObject) {
  const draftId = getDraftId(draft);
  const sourceId = getSourceId(draft);
  const sourceReviewItemId = cleanText(draft?.sourceReviewItemId || "", 260);
  const sourceTitle = getDraftTitle(draft, queueItem);
  const sourceUrl = getDraftUrl(draft, queueItem);
  const sourceCitation = getSourceCitation(draft, sourceTitle, sourceUrl);
  const domains = getDomains(draft, queueItem);
  const targetDomain = domains[0] || "unassigned";
  const claims = getClaims(draft);
  const normalizedClaims = claims
    .map((claim, index) => normalizeClaim(claim, index))
    .filter((claim) => claim.text);

  const summary = cleanText(draft?.summary || draft?.extractedDraft?.summary || "", 4000);
  const jurisdiction = cleanText(draft?.jurisdiction || draft?.extractedDraft?.jurisdiction || "", 1200);
  const applicability = cleanText(draft?.applicability || draft?.extractedDraft?.applicability || "", 1200);
  const versionDate = cleanText(draft?.versionDate || draft?.extractedDraft?.versionDate || "", 500);

  const validation = validateCandidateInput({
    draft,
    queueItem,
    sourceTitle,
    sourceUrl,
    sourceCitation,
    domains,
    claims,
  });

  const candidateId = `trusted_merge_candidate_${safeId(draftId || sourceId || sourceTitle, "official-source")}`;
  const entryIdPreview = `official_source_knowledge_${safeId(sourceId || sourceTitle, "source")}`;
  const targetFilePreview = `data/buildsetu-knowledge/${safeId(targetDomain, "unassigned")}.json`;

  const mergeTargetPreview = {
    candidateId,
    entryIdPreview,
    targetDomain,
    targetFilePreview,
    sourceId,
    sourceReviewItemId,
    sourceTitle,
    sourceUrl,
    sourceCitation,
    jurisdiction,
    applicability,
    versionDate,
    summary,
    claims: normalizedClaims,
    warnings: [
      "Preview only. No trusted knowledge write executed.",
      "Professional/local authority verification remains required before use.",
      "Actual trusted merge must run in a later guarded phase with backup, smoke test and rollback.",
    ],
  };

  const diffPreview = [
    `--- ${targetFilePreview}`,
    `+++ ${targetFilePreview} [preview only]`,
    `+ entryId: ${entryIdPreview}`,
    `+ sourceTitle: ${sourceTitle || "—"}`,
    `+ sourceUrl: ${sourceUrl || "—"}`,
    `+ targetDomain: ${targetDomain}`,
    `+ jurisdiction: ${jurisdiction || "—"}`,
    `+ applicability: ${applicability || "—"}`,
    `+ versionDate: ${versionDate || "—"}`,
    `+ claimsCount: ${normalizedClaims.length}`,
    `+ trustedKnowledgeWrite: false`,
    `+ trustedMergeExecuted: false`,
  ].join("\n");

  return {
    candidateId,
    draftId,
    sourceId,
    sourceReviewItemId,
    sourceTitle,
    targetDomain,
    qaScore: validation.qaScore,
    readyForTrustedMergeCandidate: validation.ready,
    blockingIssues: validation.blockingIssues,
    warnings: validation.warnings,
    validationDetails: validation.details,
    mergeTargetPreview,
    diffPreview,
    safetyBoundary: {
      mode: "trusted_merge_candidate_preview_only",
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

  const previews = drafts.map((draft: JsonObject) => {
    const sourceId = getSourceId(draft);
    const sourceReviewItemId = cleanText(draft?.sourceReviewItemId || "", 260);
    const queueItem =
      queueBySourceId.get(sourceId) ||
      queueBySourceId.get(sourceReviewItemId) ||
      {};

    return buildCandidate(draft, queueItem);
  });

  const candidates = previews.filter((item) => item.readyForTrustedMergeCandidate);
  const blockedDrafts = previews.filter((item) => !item.readyForTrustedMergeCandidate);

  return NextResponse.json({
    ok: true,
    phase: "45H-1",
    previewPolicy: "trusted_merge_candidate_preview_only_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    count: previews.length,
    summary: {
      totalDraftsEvaluated: previews.length,
      readyCandidates: candidates.length,
      blockedDrafts: blockedDrafts.length,
      targetDomains: candidates
        .map((item) => item.targetDomain)
        .filter((domain, index, arr) => domain && arr.indexOf(domain) === index),
    },
    candidates,
    blockedDrafts,
  });
}
