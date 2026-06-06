import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

type CaptureItem = {
  title?: string;
  url?: string;
  sourceUrl?: string;
  sourceCitation?: string;
  snippet?: string;
  textPreview?: string;
  domain?: string;
  publisher?: string;
  jurisdiction?: string;
  sourceId?: string;
  confidence?: string;
  authorityType?: string;
};

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
  raw?: JsonObject;
};

const CANDIDATES_RELATIVE_PATH = "data/buildsetu-pending-exact-source-candidates/candidates.json";
const MAX_ITEMS = 12;

function cleanText(value: unknown, max = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeId(value: unknown, fallback = "source") {
  return cleanText(value, 220)
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || fallback;
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
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function safeUrl(value: unknown) {
  const raw = cleanText(value, 1600);
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

function isOfficialishDomain(domain: string) {
  return (
    domain.endsWith(".gov.in") ||
    domain.includes(".gov.") ||
    domain === "bis.gov.in" ||
    domain.endsWith(".nic.in") ||
    domain.endsWith(".ac.in") ||
    domain.includes("dda.org.in") ||
    domain.includes("mmrda.maharashtra.gov.in")
  );
}

function authorityTypeForDomain(domain: string, item: CaptureItem) {
  const explicit = cleanText(item.authorityType, 180);
  if (explicit) return explicit;

  if (domain === "bis.gov.in") return "standards_body_official";
  if (domain.endsWith(".gov.in") || domain.endsWith(".nic.in") || domain.includes(".gov.")) {
    return "government_or_official_authority";
  }
  if (domain.includes("dda.org.in") || domain.includes("mmrda.maharashtra.gov.in")) {
    return "development_authority_or_public_authority";
  }

  return "needs_manual_authority_review";
}

function confidenceForDomain(domain: string, item: CaptureItem) {
  const explicit = cleanText(item.confidence, 80);
  if (explicit) return explicit;
  return isOfficialishDomain(domain) ? "medium_official_domain_needs_review" : "low_needs_official_verification";
}

function normalizeItems(body: JsonObject): CaptureItem[] {
  const raw = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.results)
      ? body.results
      : Array.isArray(body?.sourceItems)
        ? body.sourceItems
        : body?.item
          ? [body.item]
          : [];

  return raw
    .map((item: any) => ({
      title: cleanText(item?.title, 500),
      url: cleanText(item?.url, 1600),
      sourceUrl: cleanText(item?.sourceUrl || item?.url, 1600),
      sourceCitation: cleanText(item?.sourceCitation, 1600),
      snippet: cleanText(item?.snippet, 1600),
      textPreview: cleanText(item?.textPreview || item?.text, 1600),
      domain: cleanText(item?.domain, 220),
      publisher: cleanText(item?.publisher, 300),
      jurisdiction: cleanText(item?.jurisdiction, 220),
      sourceId: cleanText(item?.sourceId, 240),
      confidence: cleanText(item?.confidence, 120),
      authorityType: cleanText(item?.authorityType, 180),
    }))
    .filter((item: CaptureItem) => item.sourceUrl || item.url)
    .slice(0, MAX_ITEMS);
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
    trustedKnowledgeWrite: 0,
    trustedMergeExecuted: 0,
  };
}

function buildCandidate(item: CaptureItem, body: JsonObject, index: number, now: string): ExactSourceCandidateRecord | null {
  const exactSourceUrl = safeUrl(item.sourceUrl || item.url);
  if (!exactSourceUrl) return null;

  const domain = cleanText(item.domain || domainFromUrl(exactSourceUrl), 220);
  const title = cleanText(item.title || domain || exactSourceUrl, 500);
  const jurisdiction = cleanText(item.jurisdiction || body?.jurisdiction || "India", 220);
  const query = cleanText(body?.query || body?.prompt || body?.message, 600);

  const sourceId = cleanText(
    item.sourceId ||
      body?.sourceId ||
      `${safeId(body?.sourceIdPrefix || "web-search-candidate")}_${safeId(domain)}_${safeId(title)}`,
    240,
  );

  const publisher = cleanText(item.publisher || domain || "pending manual publisher review", 300);

  const evidenceNotes = [
    "Captured from browser/user-session web-search result for official-source candidate review.",
    query ? `Query: ${query}` : "",
    item.snippet ? `Snippet: ${item.snippet}` : "",
    item.textPreview ? `Text preview: ${item.textPreview}` : "",
    item.sourceCitation ? `Source citation: ${item.sourceCitation}` : "",
    "Policy: candidate only; no source registry change; no extraction unlock; no trusted knowledge write.",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1800);

  return {
    id: `exact_source_candidate_${safeId(sourceId)}_${Date.now()}_${index}`,
    sourceId,
    jurisdiction,
    exactSourceTitle: title,
    exactSourceUrl,
    exactSourceDomain: domain,
    exactSourcePublisher: publisher,
    exactSourceAuthorityType: authorityTypeForDomain(domain, item),
    confidence: confidenceForDomain(domain, item),
    decision: "web_search_candidate_saved_needs_review",
    evidenceNotes,
    reviewerName: cleanText(body?.reviewerName || "BuildSetu web-search candidate capture", 180),
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
    raw: {
      query,
      capturedBy: "/api/agent-knowledge/web-search-candidate-capture",
      originalItem: item,
      sourceLayer: "candidate_queue_only",
      autoMerge: false,
    },
  };
}

export async function GET() {
  const filePath = projectPath(CANDIDATES_RELATIVE_PATH);
  const root = await readJson(filePath, {
    candidates: [],
    updatedAt: "",
  });

  return NextResponse.json({
    ok: true,
    endpoint: "/api/agent-knowledge/web-search-candidate-capture",
    methods: ["GET", "POST"],
    description: "Capture web-search result items as pending exact official-source candidates. No registry write and no trusted knowledge merge.",
    input: {
      query: "Original web-search query",
      jurisdiction: "Optional jurisdiction, default India",
      sourceIdPrefix: "Optional stable prefix",
      items: "Array of web-search result items with title/sourceUrl/sourceCitation/snippet/textPreview",
    },
    output: {
      savedCount: "Number of candidate records saved",
      candidatesFile: CANDIDATES_RELATIVE_PATH,
    },
    policy: {
      sourceRegistryChanged: false,
      extractionAllowedChanged: false,
      qaReadyAllowedChanged: false,
      trustedKnowledgeWrite: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
      autoMerge: false,
      reviewRequired: true,
    },
    summary: summarize(root),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const items = normalizeItems(body);

  if (!items.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "items_required",
        message: "Send web-search result items to capture as candidates.",
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
        mergeActionAvailable: false,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const normalized = items
    .map((item, index) => buildCandidate(item, body, index, now))
    .filter(Boolean) as ExactSourceCandidateRecord[];

  const invalidCount = items.length - normalized.length;

  if (!normalized.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "valid_candidate_url_required",
        invalidCount,
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
  const existingUrls = new Set(existingCandidates.map((item: any) => cleanText(item?.exactSourceUrl)));

  const merged = [...existingCandidates];
  const saved: ExactSourceCandidateRecord[] = [];
  const skippedDuplicates: ExactSourceCandidateRecord[] = [];

  for (const candidate of normalized) {
    const key = `${candidate.sourceId}|${candidate.exactSourceUrl}`;
    if (!existingKeys.has(key) && !existingUrls.has(candidate.exactSourceUrl)) {
      merged.unshift(candidate);
      existingKeys.add(key);
      existingUrls.add(candidate.exactSourceUrl);
      saved.push(candidate);
    } else {
      skippedDuplicates.push(candidate);
    }
  }

  const root = {
    ok: true,
    phase: "47B-2H",
    candidatesPolicy:
      "web_search_candidates_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    updatedAt: now,
    candidates: merged,
  };

  await writeJson(filePath, root);

  return NextResponse.json({
    ok: true,
    phase: "47B-2H",
    message: "Web-search source candidates saved separately. Source registry was not changed.",
    savedCount: saved.length,
    duplicateCount: skippedDuplicates.length,
    invalidCount,
    totalCandidates: merged.length,
    candidates: saved.map((item) => ({
      id: item.id,
      sourceId: item.sourceId,
      title: item.exactSourceTitle,
      url: item.exactSourceUrl,
      domain: item.exactSourceDomain,
      jurisdiction: item.jurisdiction,
      confidence: item.confidence,
      decision: item.decision,
    })),
    candidatesFile: CANDIDATES_RELATIVE_PATH,
    reviewQueuePath: "/workspace/official-source-review-queue",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
  });
}
