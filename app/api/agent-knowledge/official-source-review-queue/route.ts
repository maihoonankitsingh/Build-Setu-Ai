import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export const runtime = "nodejs";

type JsonObject = Record<string, any>;
type ReviewStatus = "pending_review" | "approved" | "rejected" | "merged";

const QUEUE_RELATIVE_PATH = "data/buildsetu-source-review-queue/queue.json";
const REVIEW_STATUS: ReviewStatus[] = ["pending_review", "approved", "rejected", "merged"];

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}


// BUILDSETU_PHASE_M8X_REVIEW_ACTION_DEBUG_AUDIT_HELPERS
const REVIEW_ACTION_DEBUG_DIR = path.join(process.cwd(), "data/buildsetu-source-review-queue/debug-review-actions");

function safeReviewDebugFileName(value: unknown) {
  return cleanText(value || "unknown", 180)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

async function appendReviewActionDebugAudit(event: JsonObject) {
  try {
    await fs.mkdir(REVIEW_ACTION_DEBUG_DIR, { recursive: true });
    const generatedAt = nowIso();
    const id = `${generatedAt.replace(/[:.]/g, "-")}_${safeReviewDebugFileName(event.stage)}_${safeReviewDebugFileName(event.itemId)}`;
    const payload = {
      schema: "buildsetu-review-action-debug-audit-v1",
      generatedAt,
      safety: {
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
        autoMerge: false,
        mergePolicy: "manual_review_required",
      },
      ...event,
    };
    await fs.writeFile(
      path.join(REVIEW_ACTION_DEBUG_DIR, `${id}.json`),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(REVIEW_ACTION_DEBUG_DIR, "latest.json"),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("[BuildSetu M8X] Failed to write review action debug audit", error);
  }
}


async function readJson(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function cleanText(value: unknown, max = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeId(value: unknown, fallback: string) {
  const id = cleanText(value, 180)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return REVIEW_STATUS.includes(value as ReviewStatus);
}

function sourceFingerprint(source: JsonObject) {
  return [
    source.id || source.sourceId || source.title || source.name || "",
    source.url || source.sourceUrl || "",
    Array.isArray(source.domains) ? source.domains.join(",") : "",
  ].join("|");
}

function entryIdFromSource(source: JsonObject, index: number) {
  const base = safeId(source.id || source.sourceId || source.title || source.name || `source-${index}`, `source-${index}`);
  return `official_source_review_${base}`;
}

function normalizeSource(source: JsonObject, index: number, sourcePack: JsonObject | null = null) {
  const sourceId = safeId(source.id || source.sourceId || source.title || source.name || `source-${index}`, `source-${index}`);
  const domains = Array.isArray(source.domains)
    ? source.domains.map((domain: unknown) => cleanText(domain, 80)).filter(Boolean)
    : Array.isArray(sourcePack?.domains)
      ? sourcePack.domains.map((domain: unknown) => cleanText(domain, 80)).filter(Boolean)
      : [];

  return {
    sourceId,
    title: cleanText(source.title || source.name || sourceId, 240),
    url: cleanText(source.url || source.sourceUrl || "", 1200),
    domains,
    sourcePackId: cleanText(source.sourcePackId || sourcePack?.id || "", 160),
    sourcePackTitle: cleanText(source.sourcePackTitle || sourcePack?.title || "", 240),
    authorityType: cleanText(source.authorityType || source.type || "trusted_source", 120),
    publisher: cleanText(source.publisher || sourcePack?.publisher || "", 240),
    watch: source.watch !== false,
    reviewRequired: true,
    mergePolicy: "manual_review_required",
    source,
  };
}


function normalizePendingExactSourceCandidate(candidate: JsonObject, index: number) {
  // BUILDSETU_REVIEW_QUEUE_PENDING_EXACT_SOURCE_CANDIDATES_V1
  const url = cleanText(candidate.exactSourceUrl || candidate.url || candidate.sourceUrl || "", 1200);
  const domain = cleanText(candidate.exactSourceDomain || "", 120) || (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  })();

  return {
    sourceId: safeId(candidate.sourceId || candidate.id || candidate.exactSourceTitle || `pending-candidate-${index}`, `pending-candidate-${index}`),
    title: cleanText(candidate.exactSourceTitle || candidate.title || candidate.sourceId || `Pending source candidate ${index + 1}`, 240),
    url,
    domains: domain ? [domain] : [],
    sourcePackId: "pending_exact_source_candidates",
    sourcePackTitle: "Pending exact source candidates",
    authorityType: cleanText(candidate.exactSourceAuthorityType || candidate.authorityType || "pending_official_source_candidate", 120),
    publisher: cleanText(candidate.exactSourcePublisher || candidate.publisher || domain || "pending publisher review", 240),
    watch: false,
    reviewRequired: true,
    mergePolicy: "manual_review_required",
    decision: cleanText(candidate.decision || "candidate_saved_needs_review", 160),
    confidence: cleanText(candidate.confidence || "needs_review", 120),
    jurisdiction: cleanText(candidate.jurisdiction || "unknown", 180),
    source: {
      ...candidate,
      sourceLayer: "pending_exact_source_candidates",
      sourceRegistryChanged: false,
      trustedKnowledgeWrite: false,
      trustedMergeExecuted: false,
    },
  };
}

function collectPendingExactSourceCandidates(pendingCandidates: JsonObject) {
  const out: JsonObject[] = [];
  const candidates = Array.isArray(pendingCandidates?.candidates) ? pendingCandidates.candidates : [];

  candidates.forEach((candidate: JsonObject, index: number) => {
    const normalized = normalizePendingExactSourceCandidate(candidate, index);
    if (normalized.url) out.push(normalized);
  });

  return out;
}

function collectSources(sourcePacks: JsonObject, sourceWatch: JsonObject, pendingCandidates: JsonObject = {}) {
  const out: JsonObject[] = [];
  const seen = new Set<string>();
  let index = 0;

  const packs = Array.isArray(sourcePacks?.packs) ? sourcePacks.packs : [];
  for (const pack of packs as JsonObject[]) {
    const sources = Array.isArray(pack?.sources) ? pack.sources : [];
    for (const source of sources as JsonObject[]) {
      const normalized = normalizeSource(source, index++, pack);
      const fingerprint = sourceFingerprint(normalized);
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        out.push(normalized);
      }
    }
  }

  const watchSources = Array.isArray(sourceWatch?.sources) ? sourceWatch.sources : [];
  for (const source of watchSources as JsonObject[]) {
    const normalized = normalizeSource(source, index++, null);
    const fingerprint = sourceFingerprint(normalized);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      out.push(normalized);
    }
  }

  const pendingExactSources = collectPendingExactSourceCandidates(pendingCandidates);
  for (const source of pendingExactSources as JsonObject[]) {
    const normalized = normalizeSource(source, index++, null);
    const fingerprint = sourceFingerprint(normalized);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      out.push(normalized);
    }
  }

  return out.filter((source) => source.url);
}

function buildQueueEntry(source: JsonObject, index: number, existing?: JsonObject) {
  const createdAt = existing?.createdAt || nowIso();
  const status: ReviewStatus = isReviewStatus(existing?.status) ? existing.status : "pending_review";

  return {
    id: existing?.id || entryIdFromSource(source, index),
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


// BUILDSETU_PHASE_M8U_REVIEW_QUEUE_SYNC_PRESERVATION_HELPERS
function preserveNonEmptyArray(existingValue: unknown, nextValue: unknown): unknown[] {
  if (Array.isArray(existingValue) && existingValue.length) return existingValue;
  if (Array.isArray(nextValue)) return nextValue;
  return [];
}

function preserveNonEmptyText(existingValue: unknown, nextValue: unknown): string {
  const existing = cleanText(existingValue || "", 2000);
  if (existing) return existing;
  return cleanText(nextValue || "", 2000);
}

function preserveExistingSourceReviewQueueItem(nextItem: JsonObject, existingItem?: JsonObject): JsonObject {
  if (!existingItem || typeof existingItem !== "object") return nextItem;

  const existingStatus = isReviewStatus(existingItem.status) ? existingItem.status : undefined;
  const nextStatus = isReviewStatus(nextItem.status) ? nextItem.status : "pending_review";
  const preservedStatus = existingStatus || nextStatus;

  const existingReview = existingItem.review && typeof existingItem.review === "object" ? existingItem.review as JsonObject : {};
  const nextReview = nextItem.review && typeof nextItem.review === "object" ? nextItem.review as JsonObject : {};

  const existingSource = existingItem.source && typeof existingItem.source === "object" ? existingItem.source as JsonObject : {};
  const nextSource = nextItem.source && typeof nextItem.source === "object" ? nextItem.source as JsonObject : {};

  const preservedReview = {
    ...nextReview,
    ...existingReview,
    mergeReady: Boolean((existingReview as any).mergeReady),
    trustedMergeExecuted: Boolean((existingReview as any).trustedMergeExecuted === true),
  };

  const preservedSource = {
    ...nextSource,
    ...existingSource,
    domains: preserveNonEmptyArray((existingSource as any).domains, (nextSource as any).domains),
    publisher: preserveNonEmptyText((existingSource as any).publisher, (nextSource as any).publisher),
    decision: preserveNonEmptyText((existingSource as any).decision, (nextSource as any).decision),
    confidence: preserveNonEmptyText((existingSource as any).confidence, (nextSource as any).confidence),
    jurisdiction: preserveNonEmptyText((existingSource as any).jurisdiction, (nextSource as any).jurisdiction),
    trustedKnowledgeWrite: false,
    trustedMergeExecuted: false,
  };

  return {
    ...nextItem,
    ...existingItem,
    status: preservedStatus,
    domains: preserveNonEmptyArray((existingItem as any).domains, (nextItem as any).domains),
    publisher: preserveNonEmptyText((existingItem as any).publisher, (nextItem as any).publisher),
    sourceFingerprint: preserveNonEmptyText((existingItem as any).sourceFingerprint, (nextItem as any).sourceFingerprint),
    reviewRequired: true,
    mergePolicy: "manual_review_required",
    autoMerge: false,
    trustedMergeBlockedUntilApproved:
      preservedStatus === "approved" ? Boolean(!(preservedReview as any).mergeReady) : true,
    nextAction:
      preservedStatus === "approved"
        ? ((preservedReview as any).mergeReady ? "ready_for_separate_merge_phase" : "approved_but_merge_not_ready")
        : preservedStatus === "rejected"
          ? "source_rejected_manual_review"
          : "manual_review_required",
    review: preservedReview,
    source: preservedSource,
    trustedMergeExecuted: false,
    trustedKnowledgeChanged: false,
  };
}


// BUILDSETU_PHASE_M9B_DEDUPE_REVIEW_QUEUE_BY_ID_HELPER
function sourceReviewItemPriority(item: JsonObject): number {
  const status = cleanText(item?.status || "", 80);
  const review = item?.review && typeof item.review === "object" ? item.review as JsonObject : {};
  const reviewStatus = cleanText((review as any)?.status || "", 80);
  const reviewedAt = cleanText((review as any)?.reviewedAt || "", 120);
  const reviewer = cleanText((review as any)?.reviewer || "", 160);

  let score = 0;
  if (status === "approved" || status === "rejected") score += 100;
  if (reviewStatus === "approved" || reviewStatus === "rejected") score += 100;
  if (reviewedAt) score += 30;
  if (reviewer) score += 10;
  if (status === "pending_review") score -= 10;
  return score;
}

function dedupeSourceReviewQueueItemsById(items: JsonObject[]): JsonObject[] {
  const byId = new Map<string, JsonObject>();
  const order: string[] = [];

  for (const item of items) {
    const id = cleanText(item?.id || "", 240);
    if (!id) continue;

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, item);
      order.push(id);
      continue;
    }

    const existingPriority = sourceReviewItemPriority(existing);
    const nextPriority = sourceReviewItemPriority(item);

    if (nextPriority > existingPriority) {
      byId.set(id, preserveExistingSourceReviewQueueItem(item, existing));
    } else {
      byId.set(id, preserveExistingSourceReviewQueueItem(existing, item));
    }
  }

  return order.map((id) => byId.get(id)).filter(Boolean) as JsonObject[];
}


function preserveSourceReviewQueueSyncState(nextQueue: JsonObject, existingQueue?: JsonObject): JsonObject {
  if (!existingQueue || typeof existingQueue !== "object") {
    return {
      ...nextQueue,
      autoMerge: false,
      mergePolicy: "manual_review_required",
      trustedMergeExecuted: false,
    };
  }

  const nextItems = Array.isArray(nextQueue.items) ? nextQueue.items as JsonObject[] : [];
  const existingItems = Array.isArray(existingQueue.items) ? existingQueue.items as JsonObject[] : [];

  const existingById = new Map<string, JsonObject>();
  for (const item of existingItems) {
    const id = cleanText((item as any)?.id || "", 260);
    if (id) existingById.set(id, item);
  }

  const preservedNextItems = nextItems.map((item) => {
    const id = cleanText((item as any)?.id || "", 260);
    return preserveExistingSourceReviewQueueItem(item, id ? existingById.get(id) : undefined);
  });

  const nextIds = new Set(preservedNextItems.map((item) => cleanText((item as any)?.id || "", 260)).filter(Boolean));
  const preservedExistingOnlyItems = existingItems.filter((item) => {
    const id = cleanText((item as any)?.id || "", 260);
    if (!id || nextIds.has(id)) return false;
    return (item as any).status === "approved" || (item as any).status === "rejected";
  });

  const items = [...preservedNextItems, ...preservedExistingOnlyItems];

  return {
    ...nextQueue,
    sourceCandidateCount: items.length,
    items,
    autoMerge: false,
    mergePolicy: "manual_review_required",
    trustedMergeExecuted: false,
    syncPreservation: {
      enabled: true,
      version: "M8U-1",
      preservedExistingItems: existingItems.length,
      nextItems: nextItems.length,
      finalItems: items.length,
      preservedReviewedExistingOnlyItems: preservedExistingOnlyItems.length,
      policy: "Preserve existing review status, publisher/domain/source fingerprint and manual merge boundary during queue sync.",
    },
  };
}


async function loadQueue() {
  const queuePath = projectPath(QUEUE_RELATIVE_PATH);
  const data = await readJson(queuePath, {
    version: 1,
    description: "BuildSetu official/trusted source review queue. No auto-merge.",
    mergePolicy: "manual_review_required",
    items: [],
    updatedAt: "",
  });

  if (!Array.isArray(data.items)) data.items = [];
  return data;
}

function summarizeQueue(items: JsonObject[]) {
  const byStatus: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const bySourcePack: Record<string, number> = {};

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

function isAllowedReviewTransition(status: ReviewStatus) {
  // BUILDSETU_OFFICIAL_SOURCE_REVIEW_ACTION_V1
  return status === "pending_review" || status === "approved" || status === "rejected";
}

function normalizeReviewPayload(body: JsonObject) {
  const itemId = cleanText(body?.itemId || body?.id || "", 240);
  const statusRaw = cleanText(body?.status || "", 80);
  const status: ReviewStatus | null = isReviewStatus(statusRaw) && isAllowedReviewTransition(statusRaw)
    ? statusRaw
    : null;

  const reviewer = cleanText(body?.reviewer || body?.reviewedBy || "", 160);
  const notes = cleanText(body?.notes || body?.reviewNotes || "", 4000);
  const mergeReady = Boolean(body?.mergeReady === true);

  return { itemId, status, reviewer, notes, mergeReady };
}

function applyReviewToItem(item: JsonObject, reviewInput: ReturnType<typeof normalizeReviewPayload>, userId: string) {
  const reviewedAt = nowIso();
  const status = reviewInput.status || "pending_review";
  const mergeReady = status === "approved" ? reviewInput.mergeReady : false;

  return {
    ...item,
    status,
    updatedAt: reviewedAt,
    nextAction:
      status === "approved"
        ? (mergeReady ? "ready_for_separate_merge_phase" : "approved_but_merge_not_ready")
        : status === "rejected"
          ? "source_rejected_manual_review"
          : "manual_review_required",
    reviewRequired: true,
    mergePolicy: "manual_review_required",
    autoMerge: false,
    trustedKnowledgeChanged: false,
    trustedMergeBlockedUntilApproved: !(status === "approved" && mergeReady),
    review: {
      ...(item.review || {}),
      reviewer: reviewInput.reviewer || userId,
      reviewedBy: userId,
      reviewedAt,
      notes: reviewInput.notes,
      mergeReady,
      status,
      trustedMergeExecuted: false,
    },
  };
}

async function requireUser(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return getUserFromSession(token);
}

export async function GET(req: NextRequest) {
  try {
    // BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE_API_V1
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const root = process.cwd();
    const sourcePacks = await readJson(path.join(root, "config/buildsetu-source-packs.json"), { packs: [] });
    const sourceWatch = await readJson(path.join(root, "config/buildsetu-source-watch.sources.json"), { sources: [] });
    const pendingCandidates = await readJson(path.join(root, "data/buildsetu-pending-exact-source-candidates/candidates.json"), { candidates: [] });
    const queue = await loadQueue();
    const sourceCandidates = collectSources(sourcePacks, sourceWatch, pendingCandidates);
    const items = Array.isArray(queue.items) ? queue.items : [];

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE",
      queuePath: QUEUE_RELATIVE_PATH,
      mergePolicy: "manual_review_required",
      autoMerge: false,
      summary: summarizeQueue(items),
      sourceCandidateCount: sourceCandidates.length,
      sourceCandidates,
      items,
      updatedAt: queue.updatedAt || "",
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "OFFICIAL_SOURCE_REVIEW_QUEUE_GET_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE_SYNC_V1
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = cleanText(body?.action || "sync", 40);

    // BUILDSETU_PHASE_M8X_POST_BODY_AUDIT
    await appendReviewActionDebugAudit({
      stage: "post_body_received",
      action,
      itemId: cleanText(body?.itemId || body?.id || "", 240),
      status: cleanText(body?.status || "", 80),
      reviewer: cleanText(body?.reviewer || body?.reviewedBy || "", 160),
      mergeReady: Boolean(body?.mergeReady === true),
      hasNotes: Boolean(cleanText(body?.notes || body?.reviewNotes || "", 4000)),
      userId: user.id,
      trustedKnowledgeWrite: false,
      trustedMergeExecuted: false,
    });

    if (!["sync", "review"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "UNSUPPORTED_ACTION", supportedActions: ["sync", "review"] },
        { status: 400 },
      );
    }

    if (action === "review") {
      const reviewInput = normalizeReviewPayload(body);

      // BUILDSETU_PHASE_M8X_REVIEW_BRANCH_AUDIT
      await appendReviewActionDebugAudit({
        stage: "review_branch_entered",
        action,
        itemId: reviewInput.itemId,
        status: reviewInput.status,
        reviewer: reviewInput.reviewer,
        mergeReady: reviewInput.mergeReady,
        userId: user.id,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      });

      if (!reviewInput.itemId || !reviewInput.status) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_REVIEW_PAYLOAD",
            required: ["itemId", "status"],
            allowedStatus: ["pending_review", "approved", "rejected"],
          },
          { status: 400 },
        );
      }

      const queue = await loadQueue();
      const existingItems = Array.isArray(queue.items) ? queue.items : [];
      const index = existingItems.findIndex((item: JsonObject) => cleanText(item?.id || "", 240) === reviewInput.itemId);

      if (index < 0) {
        return NextResponse.json(
          { ok: false, error: "REVIEW_QUEUE_ITEM_NOT_FOUND", itemId: reviewInput.itemId },
          { status: 404 },
        );
      }

      const nextItems = existingItems.map((item: JsonObject, itemIndex: number) =>
        itemIndex === index ? applyReviewToItem(item, reviewInput, user.id) : item,
      );

      const updatedQueue = {
        ...queue,
        version: Number(queue.version || 1),
        description: "BuildSetu official/trusted source review queue. No auto-merge.",
        mergePolicy: "manual_review_required",
        autoMerge: false,
        items: nextItems,
        updatedAt: nowIso(),
        updatedBy: user.id,
      };
      // BUILDSETU_PHASE_M8Z_REVIEW_WRITE_DIRECT_STATUS_PERSIST
      const reviewQueuePath = projectPath(QUEUE_RELATIVE_PATH);
      await writeJson(reviewQueuePath, updatedQueue);

      // BUILDSETU_PHASE_M8Z_FIX1_REVIEW_READ_AFTER_WRITE_VERIFY
      let persistedReviewQueue = await readJson(reviewQueuePath, updatedQueue);
      let persistedReviewItems = Array.isArray(persistedReviewQueue?.items) ? persistedReviewQueue.items : [];
      let persistedReviewedItem = persistedReviewItems.find(
        (item: JsonObject) => cleanText(item?.id || "", 240) === reviewInput.itemId,
      ) as JsonObject | undefined;

      if (cleanText(persistedReviewedItem?.status || "", 80) !== reviewInput.status) {
        const correctedItems = persistedReviewItems.map((item: JsonObject) =>
          cleanText(item?.id || "", 240) === reviewInput.itemId ? nextItems[index] : item,
        );

        persistedReviewQueue = {
          ...(persistedReviewQueue || updatedQueue),
          description: "BuildSetu official/trusted source review queue. No auto-merge.",
          mergePolicy: "manual_review_required",
          autoMerge: false,
          items: correctedItems,
          updatedAt: nowIso(),
          updatedBy: user.id,
        };

        await writeJson(reviewQueuePath, persistedReviewQueue);

        persistedReviewQueue = await readJson(reviewQueuePath, updatedQueue);
        persistedReviewItems = Array.isArray(persistedReviewQueue?.items) ? persistedReviewQueue.items : [];
        persistedReviewedItem = persistedReviewItems.find(
          (item: JsonObject) => cleanText(item?.id || "", 240) === reviewInput.itemId,
        ) as JsonObject | undefined;
      }

      // BUILDSETU_PHASE_M8Z_FIX1_REVIEW_PERSIST_VERIFY_AUDIT
      await appendReviewActionDebugAudit({
        stage: "review_queue_persist_verified",
        action,
        itemId: reviewInput.itemId,
        requestedStatus: reviewInput.status,
        persistedStatus: cleanText(persistedReviewedItem?.status || "", 80),
        persistedReviewStatus: cleanText((persistedReviewedItem?.review as JsonObject)?.status || "", 80),
        reviewer: reviewInput.reviewer || user.id,
        mergeReady: reviewInput.mergeReady,
        userId: user.id,
        queuePath: QUEUE_RELATIVE_PATH,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      });
// BUILDSETU_PHASE_M8X_REVIEW_WRITE_AUDIT
      await appendReviewActionDebugAudit({
        stage: "review_queue_written",
        action,
        itemId: reviewInput.itemId,
        status: reviewInput.status,
        reviewer: reviewInput.reviewer || user.id,
        mergeReady: reviewInput.mergeReady,
        userId: user.id,
        queuePath: QUEUE_RELATIVE_PATH,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      });


      const reviewedItem = nextItems[index];

      return NextResponse.json({
        ok: true,
        code: "BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE_REVIEWED",
        queuePath: QUEUE_RELATIVE_PATH,
        item: reviewedItem,
        summary: summarizeQueue(nextItems),
        autoMerge: false,
        mergePolicy: "manual_review_required",
        trustedKnowledgeChanged: false,
        trustedMergeExecuted: false,
        // BUILDSETU_PHASE_M8X_RESPONSE_DEBUG_FIELDS
        debugAuditEnabled: true,
        debugAuditPath: "data/buildsetu-source-review-queue/debug-review-actions/latest.json",
        userId: user.id,
      });
    }

    const root = process.cwd();
    const sourcePacks = await readJson(path.join(root, "config/buildsetu-source-packs.json"), { packs: [] });
    const sourceWatch = await readJson(path.join(root, "config/buildsetu-source-watch.sources.json"), { sources: [] });
    const pendingCandidates = await readJson(path.join(root, "data/buildsetu-pending-exact-source-candidates/candidates.json"), { candidates: [] });
    const sourceCandidates = collectSources(sourcePacks, sourceWatch, pendingCandidates);

    const queue = await loadQueue();
    const existingItems = Array.isArray(queue.items) ? queue.items : [];
    const existingByFingerprint = new Map<string, JsonObject>();

    for (const item of existingItems as JsonObject[]) {
      existingByFingerprint.set(cleanText(item.sourceFingerprint || sourceFingerprint(item), 2000), item);
    }

    const nextItems: JsonObject[] = [];
    let created = 0;
    let preserved = 0;

    sourceCandidates.forEach((source: JsonObject, index: number) => {
      const fingerprint = sourceFingerprint(source);
      const existing = existingByFingerprint.get(fingerprint);
      if (existing) preserved += 1;
      else created += 1;
      nextItems.push(buildQueueEntry(source, index, existing));
    });

    // BUILDSETU_PHASE_M9B_SYNC_DEDUPE_NEXT_ITEMS_BY_ID
    const dedupedNextItems = dedupeSourceReviewQueueItemsById(nextItems);

    const updatedQueue = {
      version: Number(queue.version || 1),
      description: "BuildSetu official/trusted source review queue. No auto-merge.",
      mergePolicy: "manual_review_required",
      autoMerge: false,
      sourceCandidateCount: dedupedNextItems.length,
      items: dedupedNextItems,
      updatedAt: nowIso(),
      updatedBy: user.id,
    };

    // BUILDSETU_PHASE_M8Z_SYNC_WRITE_WITH_PRESERVATION
    const preservedSyncQueueForWrite = preserveSourceReviewQueueSyncState(
      updatedQueue as JsonObject,
      await readJson(projectPath(QUEUE_RELATIVE_PATH), null),
    );
    await writeJson(projectPath(QUEUE_RELATIVE_PATH), preservedSyncQueueForWrite);

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE_SYNCED",
      queuePath: QUEUE_RELATIVE_PATH,
      created,
      preserved,
      summary: summarizeQueue(dedupedNextItems),
      items: dedupedNextItems,
      autoMerge: false,
      mergePolicy: "manual_review_required",
      trustedKnowledgeChanged: false,
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "OFFICIAL_SOURCE_REVIEW_QUEUE_POST_FAILED" },
      { status: 500 },
    );
  }
}

// BUILDSETU_PHASE_M9B_PRESERVE_DEDUPE_FINAL_GUARD
