import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getClaims(draft: JsonObject) {
  const claims =
    draft?.claims ||
    draft?.extractedDraft?.claims ||
    draft?.qa?.claims ||
    [];

  return Array.isArray(claims) ? claims : [];
}

function getCitationChecks(draft: JsonObject) {
  const checks =
    draft?.citationChecks ||
    draft?.extractedDraft?.citationChecks ||
    draft?.qa?.citationChecks ||
    {};

  if (Array.isArray(checks)) return checks;
  if (checks && typeof checks === "object") return [checks];
  return [];
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

  const reports = drafts.map((draft: JsonObject) => {
    const sourceId = getSourceId(draft);
    const sourceReviewItemId = cleanText(draft?.sourceReviewItemId || "", 260);
    const queueItem =
      queueBySourceId.get(sourceId) ||
      queueBySourceId.get(sourceReviewItemId) ||
      {};

    return {
      draftId: getDraftId(draft),
      sourceId,
      sourceTitle: getDraftTitle(draft, queueItem),
      sourceUrl: getDraftUrl(draft, queueItem),
      reviewStatus:
        cleanText(queueItem?.status || draft?.reviewStatusAtDraftCreation || draft?.reviewStatus || "unknown", 80),
      draftStatus:
        cleanText(draft?.status || draft?.draftStatus || "unknown", 80),
      qaStatus:
        cleanText(draft?.qaStatus || draft?.qa?.status || "extraction_pending", 80),
      summary:
        cleanText(draft?.summary || draft?.extractedDraft?.summary || "", 4000),
      jurisdiction:
        cleanText(draft?.jurisdiction || draft?.extractedDraft?.jurisdiction || "", 1200),
      applicability:
        cleanText(draft?.applicability || draft?.extractedDraft?.applicability || "", 1200),
      versionDate:
        cleanText(draft?.versionDate || draft?.extractedDraft?.versionDate || "", 500),
      claims: getClaims(draft),
      citationChecks: getCitationChecks(draft),
      reviewer:
        cleanText(draft?.reviewer || draft?.qa?.reviewer || queueItem?.review?.reviewer || "", 240),
      qaNotes:
        cleanText(draft?.qaNotes || draft?.qa?.notes || "", 4000),
      safetyBoundary: {
        mode: "read_only_qa_report",
        trustedMergeEnabled: false,
        trustedKnowledgeWrite: false,
        trustedKnowledgeChanged: false,
        trustedMergeExecuted: false,
        mergeActionAvailable: false,
      },
    };
  });

  return NextResponse.json({
    ok: true,
    phase: "45E-4",
    reportPolicy: "read_only_no_edit_no_merge",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    count: reports.length,
    reports,
  });
}
