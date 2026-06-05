import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

type ExactSourceCandidateRecord = {
  id: string;
  sourceId: string;
  jurisdiction: string;
  exactSourceTitle: string;
  exactSourceUrl: string;
  exactSourceDomain: string;
  exactSourcePublisher: string;
  exactSourceAuthorityType: string;
  confidence: string;
  decision: string;
  evidenceNotes: string;
  reviewerName: string;
  createdAt: string;
  updatedAt: string;
  safety: {
    sourceRegistryChanged: false;
    extractionAllowedChanged: false;
    qaReadyAllowedChanged: false;
    trustedMergeCandidateAllowedChanged: false;
    trustedKnowledgeWrite: false;
    trustedMergeExecuted: false;
  };
};

const CANDIDATES_RELATIVE_PATH = "data/buildsetu-pending-exact-source-candidates/candidates.json";

function cleanText(value: unknown, max = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function projectPath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

async function readJson(filePath: string, fallback: JsonObject) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: JsonObject) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function safeUrl(value: unknown) {
  const raw = cleanText(value, 1200);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function domainFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function summarize(root: JsonObject) {
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];

  const byDecision: Record<string, number> = {};
  const byJurisdiction: Record<string, number> = {};

  for (const candidate of candidates) {
    const decision = cleanText(candidate?.decision || "candidate_saved", 120);
    const jurisdiction = cleanText(candidate?.jurisdiction || "Unknown", 160);

    byDecision[decision] = (byDecision[decision] || 0) + 1;
    byJurisdiction[jurisdiction] = (byJurisdiction[jurisdiction] || 0) + 1;
  }

  return {
    totalCandidates: candidates.length,
    byDecision,
    byJurisdiction,
    sourceRegistryChanged: 0,
    extractionUnlocked: 0,
    qaReadyUnlocked: 0,
    mergeCandidateUnlocked: 0,
    trustedKnowledgeWrite: 0,
    trustedMergeExecuted: 0,
  };
}

export async function GET() {
  const filePath = projectPath(CANDIDATES_RELATIVE_PATH);
  const root = await readJson(filePath, {
    ok: true,
    phase: "46W-9",
    candidatesPolicy:
      "bulk_exact_source_candidates_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    candidates: [],
    updatedAt: "",
  });

  return NextResponse.json({
    ok: true,
    phase: "46W-9",
    candidatesPolicy:
      "bulk_exact_source_candidates_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    summary: summarize(root),
    candidates: Array.isArray(root?.candidates) ? root.candidates : [],
    updatedAt: cleanText(root?.updatedAt || "", 80),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const incoming = Array.isArray(body?.candidates) ? body.candidates : [];

  if (!incoming.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "candidates_required",
        message: "Send candidates array.",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
        mergeActionAvailable: false,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const normalized: ExactSourceCandidateRecord[] = incoming.map((item: any, index: number): ExactSourceCandidateRecord => {
    const exactSourceUrl = safeUrl(item?.exactSourceUrl || item?.sourceUrl || item?.url);

    return {
      id: `exact_source_candidate_${cleanText(item?.sourceId || "unknown", 180)}_${Date.now()}_${index}`,
      sourceId: cleanText(item?.sourceId, 240),
      jurisdiction: cleanText(item?.jurisdiction, 180),
      exactSourceTitle: cleanText(item?.exactSourceTitle || item?.title, 400),
      exactSourceUrl,
      exactSourceDomain: domainFromUrl(exactSourceUrl),
      exactSourcePublisher: cleanText(item?.exactSourcePublisher || item?.publisher, 240),
      exactSourceAuthorityType: cleanText(item?.exactSourceAuthorityType || item?.authorityType || "government_or_official_authority", 180),
      confidence: cleanText(item?.confidence || "needs_review", 80),
      decision: cleanText(item?.decision || "candidate_saved_needs_review", 160),
      evidenceNotes: cleanText(item?.evidenceNotes || item?.notes, 1200),
      reviewerName: cleanText(item?.reviewerName || "Ankit Singh", 160),
      createdAt: now,
      updatedAt: now,
      safety: {
        sourceRegistryChanged: false,
        extractionAllowedChanged: false,
        qaReadyAllowedChanged: false,
        trustedMergeCandidateAllowedChanged: false,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
      },
    };
  });

  const invalid = normalized.filter(
    (item: ExactSourceCandidateRecord) =>
      !item.sourceId || !item.jurisdiction || !item.exactSourceTitle || !item.exactSourceUrl,
  );

  if (invalid.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_candidates",
        invalidCount: invalid.length,
        invalid,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
        mergeActionAvailable: false,
      },
      { status: 400 },
    );
  }

  const filePath = projectPath(CANDIDATES_RELATIVE_PATH);
  const existing = await readJson(filePath, { candidates: [] });
  const existingCandidates = Array.isArray(existing?.candidates) ? existing.candidates : [];

  const existingKeys = new Set(
    existingCandidates.map((item: any) => `${cleanText(item?.sourceId)}|${cleanText(item?.exactSourceUrl)}`),
  );

  const merged = [...existingCandidates];

  for (const candidate of normalized as ExactSourceCandidateRecord[]) {
    const key = `${candidate.sourceId}|${candidate.exactSourceUrl}`;
    if (!existingKeys.has(key)) {
      merged.unshift(candidate);
      existingKeys.add(key);
    }
  }

  const root = {
    ok: true,
    phase: "46W-9",
    candidatesPolicy:
      "bulk_exact_source_candidates_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    updatedAt: now,
    candidates: merged,
  };

  await writeJson(filePath, root);

  return NextResponse.json({
    ok: true,
    phase: "46W-9",
    message: "Exact source candidates saved separately. Source registry was not changed.",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    savedCount: normalized.length,
    totalCandidates: merged.length,
    summary: summarize(root),
  });
}
