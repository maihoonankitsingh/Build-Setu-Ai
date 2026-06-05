import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.drafts)) return value.drafts;
  if (Array.isArray(value?.sources)) return value.sources;
  if (Array.isArray(value?.queue)) return value.queue;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function getSourceId(item: any): string {
  return String(
    item?.sourceId ||
      item?.source_id ||
      item?.id ||
      item?.slug ||
      item?.source?.id ||
      item?.source?.sourceId ||
      ""
  );
}

async function fetchInternalJson(req: NextRequest, path: string) {
  const url = new URL(path, req.url);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
    cache: "no-store",
  });

  const text = await res.text();

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    json,
  };
}

export async function GET(req: NextRequest) {
  const draftsRes = await fetchInternalJson(
    req,
    "/api/agent-knowledge/official-source-extraction-drafts"
  );

  const queueRes = await fetchInternalJson(
    req,
    "/api/agent-knowledge/official-source-review-queue"
  );

  if (!draftsRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to read extraction drafts.",
        upstreamStatus: draftsRes.status,
      },
      { status: 502 }
    );
  }

  const drafts = asArray(draftsRes.json);
  const queueItems = asArray(queueRes.json);

  const queueBySourceId = new Map<string, any>();
  for (const item of queueItems) {
    const sourceId = getSourceId(item);
    if (sourceId) queueBySourceId.set(sourceId, item);
  }

  const reports = drafts.map((draft: any) => {
    const sourceId = getSourceId(draft);
    const queueItem = queueBySourceId.get(sourceId) || {};

    const source = draft?.source || queueItem?.source || {};

    return {
      draftId: draft?.draftId || draft?.id || "",
      sourceId,
      sourceTitle:
        draft?.sourceTitle ||
        source?.title ||
        queueItem?.title ||
        queueItem?.sourceTitle ||
        "",
      sourceUrl:
        draft?.sourceUrl ||
        source?.url ||
        queueItem?.url ||
        queueItem?.sourceUrl ||
        "",
      reviewStatus:
        queueItem?.status ||
        queueItem?.reviewStatus ||
        draft?.reviewStatus ||
        "unknown",
      draftStatus:
        draft?.status ||
        draft?.draftStatus ||
        "unknown",
      qaStatus:
        draft?.qaStatus ||
        "extraction_pending",
      summary:
        draft?.summary ||
        "",
      jurisdiction:
        draft?.jurisdiction ||
        "",
      applicability:
        draft?.applicability ||
        "",
      versionDate:
        draft?.versionDate ||
        "",
      claims:
        Array.isArray(draft?.claims) ? draft.claims : [],
      citationChecks:
        Array.isArray(draft?.citationChecks) ? draft.citationChecks : [],
      reviewer:
        draft?.reviewer ||
        queueItem?.reviewer ||
        "",
      qaNotes:
        draft?.qaNotes ||
        "",
      safetyBoundary: {
        mode: "read_only_qa_report",
        trustedMergeEnabled: false,
        trustedKnowledgeWrite: false,
        trustedKnowledgeChanged: false,
        mergeActionAvailable: false,
      },
    };
  });

  return NextResponse.json({
    ok: true,
    phase: "45E-1",
    reportPolicy: "read_only_no_edit_no_merge",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    count: reports.length,
    reports,
  });
}
