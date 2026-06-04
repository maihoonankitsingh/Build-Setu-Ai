import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export const runtime = "nodejs";

type JsonObject = Record<string, any>;

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

async function writeJson(filePath: string, value: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
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

function nowIso() {
  return new Date().toISOString();
}

async function requireUser(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return getUserFromSession(token);
}

async function loadQueue() {
  return readJson(projectPath(QUEUE_RELATIVE_PATH), {
    version: 1,
    items: [],
    mergePolicy: "manual_review_required",
    autoMerge: false,
  });
}

async function loadDrafts() {
  const data = await readJson(projectPath(DRAFT_RELATIVE_PATH), {
    version: 1,
    description: "BuildSetu reviewed source extraction drafts. No trusted merge.",
    extractionPolicy: "draft_only_manual_review_required",
    autoMerge: false,
    trustedKnowledgeWrite: false,
    items: [],
    updatedAt: "",
  });

  if (!Array.isArray(data.items)) data.items = [];
  return data;
}

function isApprovedMergeReady(item: JsonObject) {
  return item?.status === "approved" && item?.review?.mergeReady === true;
}

function draftIdForQueueItem(item: JsonObject) {
  return `official_source_extraction_draft_${safeId(item?.id || item?.sourceId || item?.title, "source")}`;
}

function sourceCitationForItem(item: JsonObject) {
  const title = cleanText(item?.title || item?.sourceId || "Official source", 260);
  const url = cleanText(item?.url || "", 1200);
  return url ? `${title} — ${url}` : title;
}

function buildDraftFromQueueItem(item: JsonObject, existing: JsonObject | undefined, userId: string) {
  const createdAt = existing?.createdAt || nowIso();

  return {
    id: existing?.id || draftIdForQueueItem(item),
    status: existing?.status || "extraction_pending",
    sourceReviewItemId: item?.id,
    sourceId: item?.sourceId || "",
    title: item?.title || item?.sourceId || "Official source",
    url: item?.url || "",
    domains: Array.isArray(item?.domains) ? item.domains : [],
    sourcePackId: item?.sourcePackId || "",
    sourcePackTitle: item?.sourcePackTitle || "",
    authorityType: item?.authorityType || "trusted_source",
    sourceCitation: sourceCitationForItem(item),
    extractionPolicy: "draft_only_manual_review_required",
    mergePolicy: "manual_review_required",
    autoMerge: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    reviewStatusAtDraftCreation: item?.status || "",
    review: {
      reviewer: item?.review?.reviewer || "",
      reviewedBy: item?.review?.reviewedBy || "",
      reviewedAt: item?.review?.reviewedAt || "",
      reviewNotes: item?.review?.notes || "",
      mergeReady: item?.review?.mergeReady === true,
      trustedMergeExecuted: false,
    },
    extractionChecklist: [
      "Extract only factual statements from the official source.",
      "Preserve source URL and citation for every extracted claim.",
      "Mark jurisdiction, applicability, version/date and limitations.",
      "Do not convert draft into trusted knowledge automatically.",
      "Require a separate extraction QA phase before trusted merge.",
    ],
    extractedDraft: existing?.extractedDraft || {
      summary: "",
      claims: [],
      cautions: [
        "Draft only. Not trusted knowledge.",
        "Professional/local authority verification required before use.",
      ],
    },
    createdAt,
    updatedAt: nowIso(),
    createdBy: existing?.createdBy || userId,
    updatedBy: userId,
    sourceReviewItem: item,
  };
}

function summarizeDrafts(items: JsonObject[]) {
  const byStatus: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const bySourcePack: Record<string, number> = {};

  for (const item of items) {
    const status = cleanText(item?.status || "unknown", 120) || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;

    for (const domain of Array.isArray(item?.domains) ? item.domains : []) {
      const cleanDomain = cleanText(domain, 120) || "unknown";
      byDomain[cleanDomain] = (byDomain[cleanDomain] || 0) + 1;
    }

    const sourcePackId = cleanText(item?.sourcePackId || "none", 160) || "none";
    bySourcePack[sourcePackId] = (bySourcePack[sourcePackId] || 0) + 1;
  }

  return {
    total: items.length,
    byStatus,
    byDomain,
    bySourcePack,
    autoMerge: false,
    trustedKnowledgeWrite: false,
    extractionPolicy: "draft_only_manual_review_required",
  };
}

function approvedMergeReadyItems(queueItems: JsonObject[]) {
  return queueItems.filter(isApprovedMergeReady);
}

export async function GET(req: NextRequest) {
  try {
    // BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFTS_API_V1
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const queue = await loadQueue();
    const drafts = await loadDrafts();
    const queueItems = Array.isArray(queue.items) ? queue.items : [];
    const candidates = approvedMergeReadyItems(queueItems);

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFTS",
      draftPath: DRAFT_RELATIVE_PATH,
      queuePath: QUEUE_RELATIVE_PATH,
      extractionPolicy: "draft_only_manual_review_required",
      mergePolicy: "manual_review_required",
      autoMerge: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      candidateCount: candidates.length,
      summary: summarizeDrafts(drafts.items || []),
      candidates,
      items: drafts.items || [],
      updatedAt: drafts.updatedAt || "",
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "OFFICIAL_SOURCE_EXTRACTION_DRAFTS_GET_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFTS_CREATE_V1
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = cleanText(body?.action || "create_from_review_queue", 80);

    if (action !== "create_from_review_queue") {
      return NextResponse.json(
        { ok: false, error: "UNSUPPORTED_ACTION", supportedActions: ["create_from_review_queue"] },
        { status: 400 },
      );
    }

    const queue = await loadQueue();
    const queueItems = Array.isArray(queue.items) ? queue.items : [];
    const candidates = approvedMergeReadyItems(queueItems);

    if (!candidates.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_APPROVED_MERGE_READY_ITEMS",
          required: "Queue item status approved and review.mergeReady=true",
          autoMerge: false,
          trustedKnowledgeChanged: false,
          trustedMergeExecuted: false,
        },
        { status: 409 },
      );
    }

    const drafts = await loadDrafts();
    const existingItems = Array.isArray(drafts.items) ? drafts.items : [];
    const existingById = new Map<string, JsonObject>();

    for (const item of existingItems as JsonObject[]) {
      existingById.set(cleanText(item?.id || "", 240), item);
    }

    const nextItems = [...existingItems];
    let created = 0;
    let preserved = 0;

    for (const candidate of candidates) {
      const draftId = draftIdForQueueItem(candidate);
      const existing = existingById.get(draftId);
      const draft = buildDraftFromQueueItem(candidate, existing, user.id);

      if (existing) {
        preserved += 1;
        const index = nextItems.findIndex((item) => item?.id === draftId);
        if (index >= 0) nextItems[index] = draft;
      } else {
        created += 1;
        nextItems.push(draft);
      }
    }

    const updatedDrafts = {
      version: Number(drafts.version || 1),
      description: "BuildSetu reviewed source extraction drafts. No trusted merge.",
      extractionPolicy: "draft_only_manual_review_required",
      mergePolicy: "manual_review_required",
      autoMerge: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      items: nextItems,
      updatedAt: nowIso(),
      updatedBy: user.id,
    };

    await writeJson(projectPath(DRAFT_RELATIVE_PATH), updatedDrafts);

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFTS_CREATED",
      draftPath: DRAFT_RELATIVE_PATH,
      queuePath: QUEUE_RELATIVE_PATH,
      created,
      preserved,
      candidateCount: candidates.length,
      summary: summarizeDrafts(nextItems),
      items: nextItems,
      extractionPolicy: "draft_only_manual_review_required",
      mergePolicy: "manual_review_required",
      autoMerge: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "OFFICIAL_SOURCE_EXTRACTION_DRAFTS_POST_FAILED" },
      { status: 500 },
    );
  }
}
