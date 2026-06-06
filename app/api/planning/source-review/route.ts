// BUILDSETU_PHASE_M8N_SOURCE_REVIEW_PERSISTENCE_API

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BuildSetuSourceReviewStatus =
  | "pending_review"
  | "approved_for_reference"
  | "approved_for_boq_attach"
  | "rejected";

type BuildSetuPersistedSourceReview = {
  sourceRowId: string;
  reviewStatus: BuildSetuSourceReviewStatus;
  confidence: string;
  freshnessStatus: string;
  boqAttachReady: boolean;
  sourceTitle: string;
  sourceUrl: string;
  query: string;
  topicGroup: string;
  sourceLayer: string;
  reviewNote: string;
  reviewedAt: string;
  projectKey: string;
  rawRow: Record<string, unknown>;
};

const DATA_DIR = path.join(process.cwd(), "data", "buildsetu-source-reviews");

function cleanText(value: unknown, max = 2000): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function hashKey(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function storePathForProject(projectKey: string): string {
  return path.join(DATA_DIR, `${hashKey(projectKey || "default-project")}.json`);
}

function readStore(file: string, projectKey: string) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {
    schema: "buildsetu-source-review-store-v1",
    projectKey,
    createdAt: new Date().toISOString(),
    reviews: [],
  };
}

function writeStore(file: string, store: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2) + "\n", "utf8");
}

function isAllowedReviewStatus(value: string): value is BuildSetuSourceReviewStatus {
  return [
    "pending_review",
    "approved_for_reference",
    "approved_for_boq_attach",
    "rejected",
  ].includes(value);
}

function normalizeReviewRow(input: {
  projectKey: string;
  sourceRowId: string;
  reviewStatus: BuildSetuSourceReviewStatus;
  row: Record<string, unknown>;
  reviewNote: string;
}): BuildSetuPersistedSourceReview {
  const row = input.row || {};
  const rejected = input.reviewStatus === "rejected";

  return {
    sourceRowId: input.sourceRowId,
    reviewStatus: input.reviewStatus,
    confidence: rejected ? "reject" : cleanText(row.confidence || "medium", 80),
    freshnessStatus: cleanText(row.freshnessStatus || "fresh", 80),
    boqAttachReady: input.reviewStatus === "approved_for_boq_attach",
    sourceTitle: cleanText(row.sourceTitle || row.title || "Source result", 500),
    sourceUrl: cleanText(row.sourceUrl || row.url || "", 1200),
    query: cleanText(row.query || "", 1200),
    topicGroup: cleanText(row.topicGroup || "general", 200),
    sourceLayer: cleanText(row.sourceLayer || "public_web_search", 200),
    reviewNote: cleanText(input.reviewNote || row.reviewNote || "", 1200),
    reviewedAt: new Date().toISOString(),
    projectKey: input.projectKey,
    rawRow: row,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectKey = cleanText(url.searchParams.get("projectKey") || "default-project", 1200);
  const file = storePathForProject(projectKey);
  const store = readStore(file, projectKey);
  const reviews = Array.isArray(store.reviews) ? store.reviews : [];

  return NextResponse.json({
    ok: true,
    schema: "buildsetu-source-review-store-v1",
    projectKey,
    count: reviews.length,
    reviews,
    safety: {
      finalRateApproval: "locked",
      trustedKnowledgeWrite: false,
      sourceReviewOnly: true,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, code: "INVALID_JSON", error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const projectKey = cleanText((body as any).projectKey || "default-project", 1200);
  const row = ((body as any).row && typeof (body as any).row === "object" ? (body as any).row : {}) as Record<string, unknown>;
  const sourceRowId = cleanText((body as any).sourceRowId || row.id || row.sourceUrl || row.query, 800);
  const reviewStatusRaw = cleanText((body as any).reviewStatus || row.reviewStatus || "", 120);

  if (!sourceRowId) {
    return NextResponse.json(
      { ok: false, code: "SOURCE_ROW_ID_REQUIRED", error: "sourceRowId is required." },
      { status: 400 }
    );
  }

  if (!isAllowedReviewStatus(reviewStatusRaw)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REVIEW_STATUS", error: "Invalid reviewStatus." },
      { status: 400 }
    );
  }

  const file = storePathForProject(projectKey);
  const store = readStore(file, projectKey);
  const reviews = Array.isArray(store.reviews) ? store.reviews : [];

  const nextReview = normalizeReviewRow({
    projectKey,
    sourceRowId,
    reviewStatus: reviewStatusRaw,
    row,
    reviewNote: cleanText((body as any).reviewNote || row.reviewNote || "", 1200),
  });

  const existingIndex = reviews.findIndex((item: any) => item?.sourceRowId === sourceRowId);
  if (existingIndex >= 0) {
    reviews[existingIndex] = {
      ...reviews[existingIndex],
      ...nextReview,
      updatedAt: new Date().toISOString(),
    };
  } else {
    reviews.unshift(nextReview);
  }

  store.updatedAt = new Date().toISOString();
  store.projectKey = projectKey;
  store.reviews = reviews.slice(0, 500);
  writeStore(file, store);

  return NextResponse.json({
    ok: true,
    schema: "buildsetu-source-review-store-v1",
    projectKey,
    sourceRowId,
    reviewStatus: nextReview.reviewStatus,
    saved: true,
    count: store.reviews.length,
    safety: {
      finalRateApproval: "locked",
      trustedKnowledgeWrite: false,
      sourceReviewOnly: true,
    },
  });
}
