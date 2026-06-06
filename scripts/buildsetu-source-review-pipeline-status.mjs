import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATUS_FILE = path.join(ROOT, "data/buildsetu-source-review-queue/status/latest.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

const queue = readJson(path.join(ROOT, "data/buildsetu-source-review-queue/queue.json"), { items: [] });
const candidates = readJson(path.join(ROOT, "data/buildsetu-pending-exact-source-candidates/candidates.json"), { candidates: [] });
const inbox = readJson(path.join(ROOT, "data/buildsetu-source-watch/inbox/latest.json"), {});
const recovery = readJson(path.join(ROOT, "data/buildsetu-source-watch/recovery/latest.json"), {});
const qualityGate = readJson(path.join(ROOT, "data/buildsetu-source-watch/quality-gate/latest.json"), {});
const webDiscovery = readJson(path.join(ROOT, "data/buildsetu-web-discovery/status.json"), {});

const items = Array.isArray(queue.items) ? queue.items : [];
const candidateItems = Array.isArray(candidates.candidates) ? candidates.candidates : [];

const status = {
  ok: true,
  generatedAt: new Date().toISOString(),
  phase: "47B-2R",
  title: "BuildSetu source watch, web-search candidate capture, and review queue pipeline status",
  routes: {
    webSearch: "/api/agent-tools/web-search",
    webSearchCandidateCapture: "/api/agent-knowledge/web-search-candidate-capture",
    pendingExactSourceCandidates: "/api/agent-knowledge/pending-exact-source-candidates",
    officialSourceReviewQueue: "/api/agent-knowledge/official-source-review-queue",
    reviewQueuePage: "/workspace/official-source-review-queue",
    knowledgeInboxPage: "/workspace/knowledge-inbox"
  },
  sourceWatch: {
    registeredTrustedSourceAutoWatch: true,
    latestInboxGeneratedAt: inbox.generatedAt || null,
    watchSourceCount: inbox?.config?.watchSources || inbox?.latestReport?.sourceCount || null,
    pendingSourceUpdateDrafts: Array.isArray(inbox.pendingSourceUpdateDrafts) ? inbox.pendingSourceUpdateDrafts.length : null,
    latestChangedSources: Array.isArray(inbox?.latestReport?.changed) ? inbox.latestReport.changed.length : null,
    latestFailedSources: Array.isArray(inbox?.latestReport?.failed) ? inbox.latestReport.failed.length : null,
    fetchRecovery: {
      recoveredCount: recovery.recoveredCount ?? null,
      unresolvedCount: recovery.unresolvedCount ?? null
    },
    qualityGate: {
      scannedDrafts: qualityGate.scannedDrafts ?? null,
      quarantinedCount: Array.isArray(qualityGate.quarantined) ? qualityGate.quarantined.length : null,
      keptPendingCount: Array.isArray(qualityGate.keptPending) ? qualityGate.keptPending.length : null
    }
  },
  webDiscovery: {
    openWebSearchAutoRunsInCron: false,
    candidateCaptureReady: Boolean(webDiscovery?.currentBehavior?.webSearchCandidateCaptureEndpointReady),
    trustedKnowledgeAutoMerge: false
  },
  candidateQueue: {
    totalCandidates: candidateItems.length,
    byDecision: countBy(candidateItems, (item) => item.decision),
    byJurisdiction: countBy(candidateItems, (item) => item.jurisdiction),
    latestCandidate: candidateItems[0]
      ? {
          sourceId: candidateItems[0].sourceId,
          title: candidateItems[0].exactSourceTitle,
          url: candidateItems[0].exactSourceUrl,
          decision: candidateItems[0].decision,
          confidence: candidateItems[0].confidence
        }
      : null
  },
  reviewQueue: {
    updatedAt: queue.updatedAt || null,
    sourceCandidateCount: queue.sourceCandidateCount || items.length,
    itemCount: items.length,
    byStatus: countBy(items, (item) => item.status),
    bySourcePackId: countBy(items, (item) => item.sourcePackId),
    pendingExactSourceCandidateItems: items.filter((item) => item.sourcePackId === "pending_exact_source_candidates").length,
    rejectedItems: items.filter((item) => item.status === "rejected").length,
    approvedItems: items.filter((item) => item.status === "approved").length,
    pendingReviewItems: items.filter((item) => item.status === "pending_review").length
  },
  safety: {
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    autoMerge: false,
    mergePolicy: "manual_review_required"
  },
  nextRecommendedPhase: "47B-2S: add quick refresh action/status card update on Knowledge Inbox if needed"
};

writeJson(STATUS_FILE, status);

console.log(JSON.stringify({
  ok: true,
  statusFile: path.relative(ROOT, STATUS_FILE),
  generatedAt: status.generatedAt,
  candidateCount: status.candidateQueue.totalCandidates,
  reviewItemCount: status.reviewQueue.itemCount,
  pendingExact: status.reviewQueue.pendingExactSourceCandidateItems,
  safety: status.safety
}, null, 2));
