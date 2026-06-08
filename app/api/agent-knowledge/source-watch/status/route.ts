import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, any>;

const FILES = {
  inbox: "data/buildsetu-source-watch/inbox/latest.json",
  qualityGate: "data/buildsetu-source-watch/quality-gate/latest.json",
  recovery: "data/buildsetu-source-watch/recovery/latest.json",
  recoveryReviewQa: "data/buildsetu-source-watch/recovery-review-qa/latest.json",
  reviewQueueStatus: "data/buildsetu-source-review-queue/status/latest.json",
  reviewQueue: "data/buildsetu-source-review-queue/queue.json",
};

function projectPath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

async function readJson(relativePath: string, fallback: JsonObject = {}) {
  try {
    const raw = await fs.readFile(projectPath(relativePath), "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function countArray(value: any) {
  return Array.isArray(value) ? value.length : 0;
}

function summarizeReviewQueue(queue: JsonObject) {
  const items = Array.isArray(queue.items) ? queue.items : [];
  const ids = items.map((item: JsonObject) => String(item?.id || "")).filter(Boolean);
  const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index);
  const trustedMergeExecutedTrue = items.filter((item: JsonObject) => {
    const review = item?.review && typeof item.review === "object" ? item.review : {};
    return item?.trustedMergeExecuted === true || review?.trustedMergeExecuted === true;
  });
  const autoMergeTrue = items.filter((item: JsonObject) => item?.autoMerge === true);
  const trustedKnowledgeChangedTrue = items.filter((item: JsonObject) => item?.trustedKnowledgeChanged === true);

  const statusCounts = items.reduce((acc: JsonObject, item: JsonObject) => {
    const status = String(item?.status || "unknown");
    acc[status] = Number(acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    itemCount: items.length,
    statusCounts,
    duplicateIdCount: new Set(duplicateIds).size,
    duplicateIds: Array.from(new Set(duplicateIds)).slice(0, 50),
    autoMerge: queue.autoMerge === true,
    mergePolicy: queue.mergePolicy || "manual_review_required",
    trustedMergeExecutedTrueCount: trustedMergeExecutedTrue.length,
    autoMergeTrueCount: autoMergeTrue.length,
    trustedKnowledgeChangedTrueCount: trustedKnowledgeChangedTrue.length,
  };
}

export async function GET() {
  try {
    // BUILDSETU_PHASE_M12C_SOURCE_WATCH_STATUS_API_READ_ONLY
    const inbox = await readJson(FILES.inbox);
    const qualityGate = await readJson(FILES.qualityGate);
    const recovery = await readJson(FILES.recovery);
    const recoveryReviewQa = await readJson(FILES.recoveryReviewQa);
    const reviewQueueStatus = await readJson(FILES.reviewQueueStatus);
    const reviewQueue = await readJson(FILES.reviewQueue, { items: [] });

    const reviewQueueSummary = summarizeReviewQueue(reviewQueue);

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_SOURCE_WATCH_STATUS",
      generatedAt: new Date().toISOString(),
      readOnly: true,
      safety: {
        autoMerge: false,
        mergePolicy: "manual_review_required",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      files: FILES,
      sourceWatch: {
        inbox: {
          exists: Boolean(inbox && Object.keys(inbox).length),
          schema: inbox?.schema || null,
          generatedAt: inbox?.generatedAt || null,
          pendingSourceUpdateDrafts: countArray(inbox?.pendingSourceUpdateDrafts),
          latestSourceUpdateDrafts: countArray(inbox?.latestSourceUpdateDrafts),
          recentReports: countArray(inbox?.recentReports),
          state: inbox?.state || null,
        },
        qualityGate: {
          exists: Boolean(qualityGate && Object.keys(qualityGate).length),
          generatedAt: qualityGate?.generatedAt || null,
          ok: qualityGate?.ok ?? null,
          scannedDrafts: qualityGate?.scannedDrafts ?? null,
          quarantined: countArray(qualityGate?.quarantined),
          keptPending: countArray(qualityGate?.keptPending),
        },
        recovery: {
          exists: Boolean(recovery && Object.keys(recovery).length),
          generatedAt: recovery?.generatedAt || null,
          ok: recovery?.ok ?? null,
          originalFailedCount: recovery?.originalFailedCount ?? null,
          recoveredCount: recovery?.recoveredCount ?? null,
          unresolvedCount: recovery?.unresolvedCount ?? null,
        },
        recoveryReviewQa: {
          exists: Boolean(recoveryReviewQa && Object.keys(recoveryReviewQa).length),
          generatedAt: recoveryReviewQa?.generatedAt || null,
          ok: recoveryReviewQa?.ok ?? null,
          phase: recoveryReviewQa?.phase || null,
          title: recoveryReviewQa?.title || null,
        },
      },
      reviewQueueStatus,
      reviewQueue: reviewQueueSummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "SOURCE_WATCH_STATUS_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Source watch status API is read-only.",
    },
    { status: 405 },
  );
}
