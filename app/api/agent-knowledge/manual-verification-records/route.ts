import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

const PACKS_RELATIVE_PATH = "config/buildsetu-source-packs.json";
const RECORDS_RELATIVE_PATH = "data/buildsetu-manual-verification-records/records.json";

const ALLOWED_DECISIONS = new Set([
  "verified_manual_browser_source",
  "replace_with_better_official_source",
  "mark_source_invalid_after_review",
  "needs_more_review",
]);

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function cleanText(value: any, max = 2000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeSlug(value: any, fallback = "manual-verification-record") {
  const slug = cleanText(value, 260)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function boolValue(value: any) {
  return value === true;
}

function getAllPackSources(packsRoot: JsonObject) {
  return asArray(packsRoot?.packs).flatMap((pack) =>
    asArray(pack?.sources).map((source) => ({
      packId: cleanText(pack?.id || "", 220),
      packTitle: cleanText(pack?.title || "", 300),
      id: cleanText(source?.id || "", 260),
      title: cleanText(source?.title || "", 300),
      url: cleanText(source?.url || "", 1400),
      jurisdictionType: cleanText(source?.jurisdiction?.jurisdictionType || "", 120),
      jurisdiction: cleanText(source?.jurisdiction?.stateOrUnionTerritory || "", 180),
      exactSourceTitle: cleanText(source?.exactSourceTitle || source?.title || "", 400),
      exactSourceUrl: cleanText(source?.exactSourceUrl || source?.url || "", 1600),
      exactSourcePublisher: cleanText(source?.exactSourcePublisher || source?.publisher || "", 300),
      exactSourceAuthorityType: cleanText(source?.exactSourceAuthorityType || source?.authorityType || "", 160),
      exactSourceStatus: cleanText(source?.exactSourceStatus || "", 180),
      matchedExactSourceId: cleanText(source?.matchedExactSourceId || "", 260),
      verificationStatus: cleanText(source?.verificationStatus || "", 180),
      verificationPriority: cleanText(source?.verificationPriority || "", 120),
      serverSmokeStatus: cleanText(source?.serverSmokeStatus || "", 180),
      serverSmokeDiagnosticStatus: cleanText(source?.serverSmokeDiagnosticStatus || "", 180),
      manualBrowserVerificationRequired: boolValue(source?.manualBrowserVerificationRequired),
      manualVerificationStatus: cleanText(source?.manualVerificationStatus || "", 180),
      manualVerificationNotes: cleanText(source?.manualVerificationNotes || "", 1200),
      reviewRequired: boolValue(source?.reviewRequired),
      mergePolicy: cleanText(source?.mergePolicy || "", 180),
      trustedKnowledgeWrite: boolValue(source?.trustedKnowledgeWrite),
      trustedMergeExecuted: boolValue(source?.trustedMergeExecuted),
    }))
  );
}

function isAuthorityIndexSource(source: JsonObject) {
  return source.id.startsWith("india-") && source.id.endsWith("-approval-authority-index");
}

function findSource(sources: JsonObject[], sourceId: string) {
  return sources.find((source) => source.id === sourceId && isAuthorityIndexSource(source));
}

function summarize(records: JsonObject[]) {
  const byDecision = records.reduce((acc: Record<string, number>, record) => {
    const key = cleanText(record?.decision || "unknown", 120);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byJurisdiction = records.reduce((acc: Record<string, number>, record) => {
    const key = cleanText(record?.jurisdiction || "unknown", 180);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRecords: records.length,
    byDecision,
    byJurisdiction,
    trustedKnowledgeWrite: 0,
    trustedMergeExecuted: 0,
    extractionUnlocked: 0,
    qaReadyUnlocked: 0,
    mergeCandidateUnlocked: 0,
  };
}

function sanitizeRecord(record: JsonObject) {
  return {
    id: cleanText(record?.id || "", 320),
    sourceId: cleanText(record?.sourceId || "", 260),
    jurisdiction: cleanText(record?.jurisdiction || "", 180),
    exactSourceTitle: cleanText(record?.exactSourceTitle || "", 400),
    exactSourceUrl: cleanText(record?.exactSourceUrl || "", 1600),
    decision: cleanText(record?.decision || "", 160),
    reviewerName: cleanText(record?.reviewerName || "", 160),
    reviewerRole: cleanText(record?.reviewerRole || "", 160),
    reviewNotes: cleanText(record?.reviewNotes || "", 3000),
    replacementSourceUrl: cleanText(record?.replacementSourceUrl || "", 1600),
    replacementSourceTitle: cleanText(record?.replacementSourceTitle || "", 400),
    evidence: asArray(record?.evidence)
      .map((item) => cleanText(item, 800))
      .filter(Boolean)
      .slice(0, 20),
    createdAt: cleanText(record?.createdAt || "", 80),
    updatedAt: cleanText(record?.updatedAt || "", 80),
    safety: {
      sourceRegistryChanged: false,
      extractionAllowedChanged: false,
      qaReadyAllowedChanged: false,
      trustedMergeCandidateAllowedChanged: false,
      trustedKnowledgeWrite: false,
      trustedMergeExecuted: false,
    },
  };
}

async function loadRecords() {
  const root = await readJson(projectPath(RECORDS_RELATIVE_PATH), {
    ok: true,
    phase: "46N-1",
    recordsPolicy:
      "manual_verification_records_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    records: [],
    updatedAt: "",
  });

  return {
    ...root,
    records: asArray(root.records).map(sanitizeRecord),
  };
}

export async function GET() {
  const root = await loadRecords();
  const records = asArray(root.records).map(sanitizeRecord);

  return NextResponse.json(
    {
      ok: true,
      phase: "46N-1",
      recordsPolicy:
        "manual_verification_records_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
      trustedMergeEnabled: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
      summary: summarize(records),
      records,
      updatedAt: cleanText(root.updatedAt || "", 80),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  let body: JsonObject;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json_body",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      { status: 400 }
    );
  }

  const sourceId = cleanText(body?.sourceId || "", 260);
  const decision = cleanText(body?.decision || "", 160);
  const reviewerName = cleanText(body?.reviewerName || "manual_reviewer", 160);
  const reviewerRole = cleanText(body?.reviewerRole || "manual_browser_verification", 160);
  const reviewNotes = cleanText(body?.reviewNotes || "", 3000);
  const replacementSourceUrl = cleanText(body?.replacementSourceUrl || "", 1600);
  const replacementSourceTitle = cleanText(body?.replacementSourceTitle || "", 400);
  const evidence = asArray(body?.evidence)
    .map((item) => cleanText(item, 800))
    .filter(Boolean)
    .slice(0, 20);

  if (!sourceId) {
    return NextResponse.json(
      {
        ok: false,
        error: "sourceId_required",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_DECISIONS.has(decision)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_decision",
        allowedDecisions: Array.from(ALLOWED_DECISIONS),
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      { status: 400 }
    );
  }

  if (decision === "replace_with_better_official_source" && !replacementSourceUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "replacementSourceUrl_required_for_replacement_decision",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      { status: 400 }
    );
  }

  if (!reviewNotes) {
    return NextResponse.json(
      {
        ok: false,
        error: "reviewNotes_required",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      { status: 400 }
    );
  }

  const packs = await readJson(projectPath(PACKS_RELATIVE_PATH), { packs: [] });
  const allSources = getAllPackSources(packs);
  const source = findSource(allSources, sourceId);

  if (!source) {
    return NextResponse.json(
      {
        ok: false,
        error: "source_not_found_or_not_authority_index_source",
        sourceId,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
      { status: 404 }
    );
  }

  const root = await loadRecords();
  const records = asArray(root.records).map(sanitizeRecord);
  const timestamp = nowIso();

  const recordId = `manual_verification_${safeSlug(sourceId)}_${Date.now()}`;

  const record = sanitizeRecord({
    id: recordId,
    sourceId,
    jurisdiction: source.jurisdiction,
    exactSourceTitle: source.exactSourceTitle,
    exactSourceUrl: source.exactSourceUrl,
    decision,
    reviewerName,
    reviewerRole,
    reviewNotes,
    replacementSourceUrl,
    replacementSourceTitle,
    evidence,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const nextRoot = {
    ok: true,
    phase: "46N-1",
    recordsPolicy:
      "manual_verification_records_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    updatedAt: timestamp,
    records: [record, ...records],
  };

  await writeJson(projectPath(RECORDS_RELATIVE_PATH), nextRoot);

  return NextResponse.json(
    {
      ok: true,
      phase: "46N-1",
      message: "Manual verification record saved separately. Source registry was not changed.",
      trustedMergeEnabled: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
      sourceRegistryChanged: false,
      extractionAllowedChanged: false,
      qaReadyAllowedChanged: false,
      trustedMergeCandidateAllowedChanged: false,
      record,
      summary: summarize(nextRoot.records),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
