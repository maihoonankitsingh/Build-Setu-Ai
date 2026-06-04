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

function collectSources(sourcePacks: JsonObject, sourceWatch: JsonObject) {
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
    const queue = await loadQueue();
    const sourceCandidates = collectSources(sourcePacks, sourceWatch);
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

    if (action !== "sync") {
      return NextResponse.json(
        { ok: false, error: "UNSUPPORTED_ACTION", supportedActions: ["sync"] },
        { status: 400 },
      );
    }

    const root = process.cwd();
    const sourcePacks = await readJson(path.join(root, "config/buildsetu-source-packs.json"), { packs: [] });
    const sourceWatch = await readJson(path.join(root, "config/buildsetu-source-watch.sources.json"), { sources: [] });
    const sourceCandidates = collectSources(sourcePacks, sourceWatch);

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

    const updatedQueue = {
      version: Number(queue.version || 1),
      description: "BuildSetu official/trusted source review queue. No auto-merge.",
      mergePolicy: "manual_review_required",
      autoMerge: false,
      sourceCandidateCount: sourceCandidates.length,
      items: nextItems,
      updatedAt: nowIso(),
      updatedBy: user.id,
    };

    await writeJson(projectPath(QUEUE_RELATIVE_PATH), updatedQueue);

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE_SYNCED",
      queuePath: QUEUE_RELATIVE_PATH,
      created,
      preserved,
      summary: summarizeQueue(nextItems),
      items: nextItems,
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
