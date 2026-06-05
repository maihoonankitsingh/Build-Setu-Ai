import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

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

async function buildReportPayload() {
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
        mode: "read_only_qa_export",
        trustedMergeEnabled: false,
        trustedKnowledgeWrite: false,
        trustedKnowledgeChanged: false,
        trustedMergeExecuted: false,
        mergeActionAvailable: false,
      },
    };
  });

  return {
    ok: true,
    phase: "45F-1",
    exportPolicy: "read_only_json_markdown_no_pdf_no_merge",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    exportedAt: new Date().toISOString(),
    count: reports.length,
    reports,
  };
}

function markdownEscape(value: unknown) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function reportToMarkdown(payload: any) {
  const lines: string[] = [];

  lines.push("# Official Source QA Report Export");
  lines.push("");
  lines.push(`- Phase: ${payload.phase}`);
  lines.push(`- Exported At: ${payload.exportedAt}`);
  lines.push(`- Report Count: ${payload.count}`);
  lines.push(`- Policy: ${payload.exportPolicy}`);
  lines.push(`- Trusted Merge Enabled: ${payload.trustedMergeEnabled}`);
  lines.push(`- Trusted Knowledge Write: ${payload.trustedKnowledgeWrite}`);
  lines.push(`- Trusted Merge Executed: ${payload.trustedMergeExecuted}`);
  lines.push("");

  if (!payload.reports.length) {
    lines.push("No QA reports found.");
    lines.push("");
    return lines.join("\n");
  }

  payload.reports.forEach((report: any, index: number) => {
    lines.push(`## ${index + 1}. ${markdownEscape(report.sourceTitle || report.sourceId || "Untitled source")}`);
    lines.push("");
    lines.push(`- Draft ID: ${markdownEscape(report.draftId) || "—"}`);
    lines.push(`- Source ID: ${markdownEscape(report.sourceId) || "—"}`);
    lines.push(`- Source URL: ${markdownEscape(report.sourceUrl) || "—"}`);
    lines.push(`- Review Status: ${markdownEscape(report.reviewStatus) || "—"}`);
    lines.push(`- Draft Status: ${markdownEscape(report.draftStatus) || "—"}`);
    lines.push(`- QA Status: ${markdownEscape(report.qaStatus) || "—"}`);
    lines.push(`- Jurisdiction: ${markdownEscape(report.jurisdiction) || "—"}`);
    lines.push(`- Applicability: ${markdownEscape(report.applicability) || "—"}`);
    lines.push(`- Version / Date: ${markdownEscape(report.versionDate) || "—"}`);
    lines.push(`- Reviewer: ${markdownEscape(report.reviewer) || "—"}`);
    lines.push("");
    lines.push("### Summary");
    lines.push("");
    lines.push(markdownEscape(report.summary) || "—");
    lines.push("");
    lines.push("### QA Notes");
    lines.push("");
    lines.push(markdownEscape(report.qaNotes) || "—");
    lines.push("");
    lines.push("### Claims");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(report.claims || [], null, 2));
    lines.push("```");
    lines.push("");
    lines.push("### Citation Checks");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(report.citationChecks || [], null, 2));
    lines.push("```");
    lines.push("");
    lines.push("### Safety Boundary");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(report.safetyBoundary || {}, null, 2));
    lines.push("```");
    lines.push("");
  });

  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  const format = cleanText(req.nextUrl.searchParams.get("format") || "json", 40).toLowerCase();
  const payload = await buildReportPayload();

  if (format === "markdown" || format === "md") {
    return new NextResponse(reportToMarkdown(payload), {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": "attachment; filename=official-source-qa-report.md",
        "cache-control": "no-store",
      },
    });
  }

  if (format !== "json") {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported export format. Use format=json or format=markdown.",
        supportedFormats: ["json", "markdown"],
      },
      { status: 400 }
    );
  }

  return new NextResponse(JSON.stringify(payload, null, 2) + "\n", {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": "attachment; filename=official-source-qa-report.json",
      "cache-control": "no-store",
    },
  });
}
