import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const QUEUE_FILE = path.join(ROOT, "data/buildsetu-source-review-queue/queue.json");
const SOURCE_PACKS_FILE = path.join(ROOT, "config/buildsetu-source-packs.json");
const SOURCE_WATCH_FILE = path.join(ROOT, "config/buildsetu-source-watch.sources.json");
const PENDING_CANDIDATES_FILE = path.join(ROOT, "data/buildsetu-pending-exact-source-candidates/candidates.json");

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

function cleanText(value, max = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeId(value, fallback) {
  const id = cleanText(value, 180)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceFingerprint(source) {
  return [
    source.id || source.sourceId || source.title || source.name || "",
    source.url || source.sourceUrl || "",
    Array.isArray(source.domains) ? source.domains.join(",") : "",
  ].join("|");
}

function normalizeSource(source, index, sourcePack = null) {
  const url = cleanText(source.url || source.sourceUrl || source.exactSourceUrl || "", 1200);
  const domain = cleanText(source.exactSourceDomain || domainFromUrl(url), 120);
  const sourceId = safeId(source.id || source.sourceId || source.title || source.name || source.exactSourceTitle || `source-${index}`, `source-${index}`);

  const domains = Array.isArray(source.domains)
    ? source.domains.map((item) => cleanText(item, 80)).filter(Boolean)
    : domain
      ? [domain]
      : Array.isArray(sourcePack?.domains)
        ? sourcePack.domains.map((item) => cleanText(item, 80)).filter(Boolean)
        : [];

  return {
    sourceId,
    title: cleanText(source.title || source.name || source.exactSourceTitle || sourceId, 240),
    url,
    domains,
    sourcePackId: cleanText(source.sourcePackId || sourcePack?.id || "", 160),
    sourcePackTitle: cleanText(source.sourcePackTitle || sourcePack?.title || "", 240),
    authorityType: cleanText(source.authorityType || source.type || source.exactSourceAuthorityType || "trusted_source", 120),
    publisher: cleanText(source.publisher || source.exactSourcePublisher || sourcePack?.publisher || domain || "", 240),
    watch: source.watch !== false,
    reviewRequired: true,
    mergePolicy: "manual_review_required",
    decision: cleanText(source.decision || "", 160),
    confidence: cleanText(source.confidence || "", 120),
    jurisdiction: cleanText(source.jurisdiction || "", 180),
    source,
  };
}

function normalizePendingCandidate(candidate, index) {
  const url = cleanText(candidate.exactSourceUrl || candidate.url || candidate.sourceUrl || "", 1200);
  const domain = cleanText(candidate.exactSourceDomain || domainFromUrl(url), 120);

  return normalizeSource({
    sourceId: candidate.sourceId || candidate.id || `pending-candidate-${index}`,
    title: candidate.exactSourceTitle || candidate.title || candidate.sourceId || `Pending source candidate ${index + 1}`,
    url,
    domains: domain ? [domain] : [],
    sourcePackId: "pending_exact_source_candidates",
    sourcePackTitle: "Pending exact source candidates",
    authorityType: candidate.exactSourceAuthorityType || candidate.authorityType || "pending_official_source_candidate",
    publisher: candidate.exactSourcePublisher || candidate.publisher || domain || "pending publisher review",
    watch: false,
    decision: candidate.decision || "candidate_saved_needs_review",
    confidence: candidate.confidence || "needs_review",
    jurisdiction: candidate.jurisdiction || "unknown",
    rawCandidate: candidate,
    sourceLayer: "pending_exact_source_candidates",
    sourceRegistryChanged: false,
    trustedKnowledgeWrite: false,
    trustedMergeExecuted: false,
  }, index, null);
}

function collectSources(sourcePacks, sourceWatch, pendingCandidates) {
  const out = [];
  const seen = new Set();
  let index = 0;

  const packs = Array.isArray(sourcePacks?.packs) ? sourcePacks.packs : [];
  for (const pack of packs) {
    const sources = Array.isArray(pack?.sources) ? pack.sources : [];
    for (const source of sources) {
      const normalized = normalizeSource(source, index++, pack);
      const fingerprint = sourceFingerprint(normalized);
      if (normalized.url && !seen.has(fingerprint)) {
        seen.add(fingerprint);
        out.push(normalized);
      }
    }
  }

  const watchSources = Array.isArray(sourceWatch?.sources) ? sourceWatch.sources : [];
  for (const source of watchSources) {
    const normalized = normalizeSource(source, index++, null);
    const fingerprint = sourceFingerprint(normalized);
    if (normalized.url && !seen.has(fingerprint)) {
      seen.add(fingerprint);
      out.push(normalized);
    }
  }

  const candidates = Array.isArray(pendingCandidates?.candidates) ? pendingCandidates.candidates : [];
  for (const candidate of candidates) {
    const normalized = normalizePendingCandidate(candidate, index++);
    const fingerprint = sourceFingerprint(normalized);
    if (normalized.url && !seen.has(fingerprint)) {
      seen.add(fingerprint);
      out.push(normalized);
    }
  }

  return out;
}

function buildQueueEntry(source, index, existing) {
  const createdAt = existing?.createdAt || nowIso();
  const status = ["pending_review", "approved", "rejected", "merged"].includes(existing?.status)
    ? existing.status
    : "pending_review";

  const base = safeId(source.sourceId || source.title || `source-${index}`, `source-${index}`);

  return {
    id: existing?.id || `official_source_review_${base}`,
    status,
    sourceId: source.sourceId,
    title: source.title || source.sourceId,
    url: source.url,
    domains: source.domains || [],
    sourcePackId: source.sourcePackId || "",
    sourcePackTitle: source.sourcePackTitle || "",
    authorityType: source.authorityType || "trusted_source",
    publisher: source.publisher || "",
    reviewRequired: true,
    mergePolicy: "manual_review_required",
    trustedMergeBlockedUntilApproved: true,
    autoMerge: false,
    sourceFingerprint: sourceFingerprint(source),
    reviewChecklist: [
      "Verify source authority/publisher.",
      "Verify jurisdiction and applicability.",
      "Verify publication/update date if available.",
      "Extract only factual, non-final guidance.",
      "Mark professional/local authority review boundary.",
      "Approve and set mergeReady=true before any trusted merge."
    ],
    nextAction: status === "pending_review" ? "manual_review_required" : "review_status_preserved",
    createdAt,
    updatedAt: nowIso(),
    source,
    review: existing?.review || {
      reviewer: "",
      reviewedAt: "",
      notes: "",
      mergeReady: false,
    },
  };
}

function summarize(items) {
  const byStatus = {};
  const byDomain = {};
  const bySourcePack = {};

  for (const item of items) {
    const status = cleanText(item.status || "unknown", 80) || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;

    for (const domain of Array.isArray(item.domains) ? item.domains : []) {
      const cleanDomain = cleanText(domain, 80) || "unknown";
      byDomain[cleanDomain] = (byDomain[cleanDomain] || 0) + 1;
    }

    const sourcePackId = cleanText(item.sourcePackId || "none", 120) || "none";
    bySourcePack[sourcePackId] = (bySourcePack[sourcePackId] || 0) + 1;
  }

  return {
    total: items.length,
    byStatus,
    byDomain,
    bySourcePack,
    autoMerge: false,
    mergePolicy: "manual_review_required",
  };
}

const sourcePacks = readJson(SOURCE_PACKS_FILE, { packs: [] });
const sourceWatch = readJson(SOURCE_WATCH_FILE, { sources: [] });
const pendingCandidates = readJson(PENDING_CANDIDATES_FILE, { candidates: [] });
const existingQueue = readJson(QUEUE_FILE, {
  version: 1,
  description: "BuildSetu official/trusted source review queue. No auto-merge.",
  mergePolicy: "manual_review_required",
  items: [],
});

const existingItems = Array.isArray(existingQueue.items) ? existingQueue.items : [];
const existingByFingerprint = new Map();

for (const item of existingItems) {
  existingByFingerprint.set(cleanText(item.sourceFingerprint || sourceFingerprint(item), 2000), item);
}

const sources = collectSources(sourcePacks, sourceWatch, pendingCandidates);
const items = [];
let created = 0;
let preserved = 0;

sources.forEach((source, index) => {
  const fingerprint = sourceFingerprint(source);
  const existing = existingByFingerprint.get(fingerprint);
  if (existing) preserved += 1;
  else created += 1;
  items.push(buildQueueEntry(source, index, existing));
});

const pendingExactSourceCandidateItems = items.filter((item) => item.sourcePackId === "pending_exact_source_candidates").length;

const queue = {
  version: Number(existingQueue.version || 1),
  description: "BuildSetu official/trusted source review queue. No auto-merge.",
  mergePolicy: "manual_review_required",
  autoMerge: false,
  sourceCandidateCount: sources.length,
  items,
  updatedAt: nowIso(),
  updatedBy: "server-script-buildsetu-source-review-queue-sync",
  safety: {
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    trustedKnowledgeWrite: false,
    trustedMergeExecuted: false,
  },
};

writeJson(QUEUE_FILE, queue);

const result = {
  ok: true,
  queuePath: "data/buildsetu-source-review-queue/queue.json",
  created,
  preserved,
  sourceCandidateCount: sources.length,
  itemCount: items.length,
  pendingExactSourceCandidateItems,
  summary: summarize(items),
  safety: queue.safety,
};

console.log(JSON.stringify(result, null, 2));
