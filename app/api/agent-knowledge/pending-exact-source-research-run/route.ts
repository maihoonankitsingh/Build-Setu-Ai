import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JsonObject = Record<string, any>;

type PendingExactSourceResearchItem = {
  sourceId: string;
  jurisdiction: string;
  jurisdictionType: string;
  currentTitle: string;
  currentUrl: string;
  exactSourceStatus: string;
  verificationStatus: string;
  searchQueries: string[];
  officialDomainHints: string[];
};

type ResearchCandidate = {
  title: string;
  url: string;
  sourceUrl: string;
  snippet: string;
  domain: string;
  sourceCitation: string;
  score: number;
  scoreReasons: string[];
};

const WATCH_RELATIVE_PATH = "config/buildsetu-source-watch.sources.json";
const MAX_BATCH_LIMIT = 25;
const MAX_QUERY_RESULTS = 5;

function cleanText(value: unknown, max = 800) {
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

function sourceId(source: JsonObject) {
  return cleanText(source?.id || source?.sourceId || source?.key || "", 220);
}

function jurisdictionName(source: JsonObject) {
  const jurisdiction = source?.jurisdiction || {};
  if (typeof jurisdiction === "object") {
    return cleanText(
      jurisdiction.stateOrUnionTerritory ||
        jurisdiction.state ||
        jurisdiction.name ||
        source.title ||
        "",
      160,
    );
  }

  return cleanText(jurisdiction || source.title || "", 160);
}

function jurisdictionType(source: JsonObject) {
  const jurisdiction = source?.jurisdiction || {};
  if (typeof jurisdiction === "object") {
    return cleanText(jurisdiction.jurisdictionType || "", 80);
  }

  return "";
}

function statusBlob(source: JsonObject) {
  return [
    source?.verificationStatus,
    source?.exactSourceStatus,
    source?.sourceStatus,
    source?.status,
  ]
    .map((value) => cleanText(value, 160).toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function isAuthorityIndexSource(source: JsonObject) {
  const id = sourceId(source);
  return id.startsWith("india-") && id.includes("approval-authority-index");
}

function isPendingExactSource(source: JsonObject) {
  const blob = statusBlob(source);
  if (blob.includes("verified_exact_source")) return false;

  return (
    blob.includes("pending") ||
    source?.exactSourceStatus === "pending_exact_building_bye_law_source" ||
    source?.verificationStatus === "pending_manual_verification"
  );
}

function buildQueries(jurisdiction: string) {
  return [
    `${jurisdiction} official building bye laws pdf government`,
    `${jurisdiction} development control rules building regulations official pdf`,
    `${jurisdiction} municipal building rules official site gov in`,
    `${jurisdiction} town and country planning building rules pdf`,
  ];
}

function buildOfficialDomainHints(jurisdiction: string) {
  const normalized = jurisdiction.toLowerCase();
  const common = ["gov.in", "nic.in"];

  const specific: Record<string, string[]> = {
    "andhra pradesh": ["ap.gov.in", "dtcp.ap.gov.in"],
    "arunachal pradesh": ["arunachalpradesh.gov.in"],
    assam: ["assam.gov.in"],
    bihar: ["state.bihar.gov.in", "bihar.gov.in"],
    chandigarh: ["chandigarh.gov.in"],
    chhattisgarh: ["cgstate.gov.in", "chhattisgarh.gov.in"],
    goa: ["goa.gov.in"],
    "himachal pradesh": ["himachal.nic.in", "hp.gov.in"],
    "jammu and kashmir": ["jk.gov.in", "jkhudd.gov.in"],
    jharkhand: ["jharkhand.gov.in"],
    kerala: ["kerala.gov.in", "lsgkerala.gov.in"],
    ladakh: ["ladakh.nic.in"],
    lakshadweep: ["lakshadweep.gov.in"],
    manipur: ["manipur.gov.in"],
    meghalaya: ["meghalaya.gov.in"],
    mizoram: ["mizoram.gov.in"],
    nagaland: ["nagaland.gov.in"],
    odisha: ["odisha.gov.in", "urbanodisha.gov.in"],
    puducherry: ["py.gov.in", "puducherry-dt.gov.in"],
    punjab: ["punjab.gov.in", "puda.gov.in"],
    sikkim: ["sikkim.gov.in"],
    tripura: ["tripura.gov.in"],
    uttarakhand: ["uk.gov.in", "udd.uk.gov.in"],
  };

  const matched = Object.entries(specific).find(([key]) => normalized.includes(key));
  return [...(matched?.[1] || []), ...common];
}

async function pendingSources(): Promise<PendingExactSourceResearchItem[]> {
  const watch = await readJson(projectPath(WATCH_RELATIVE_PATH), { sources: [] });
  const sources = Array.isArray(watch?.sources) ? watch.sources : [];

  return sources
    .filter((source: JsonObject) => isAuthorityIndexSource(source))
    .filter((source: JsonObject) => isPendingExactSource(source))
    .map((source: JsonObject): PendingExactSourceResearchItem => {
      const jurisdiction = jurisdictionName(source);

      return {
        sourceId: sourceId(source),
        jurisdiction,
        jurisdictionType: jurisdictionType(source),
        currentTitle: cleanText(source?.title || source?.exactSourceTitle || "", 240),
        currentUrl: cleanText(source?.url || source?.exactSourceUrl || "", 600),
        exactSourceStatus: cleanText(source?.exactSourceStatus || "", 160),
        verificationStatus: cleanText(source?.verificationStatus || "", 160),
        officialDomainHints: buildOfficialDomainHints(jurisdiction),
        searchQueries: buildQueries(jurisdiction),
      };
    })
    .sort((a: PendingExactSourceResearchItem, b: PendingExactSourceResearchItem) =>
      a.jurisdiction.localeCompare(b.jurisdiction),
    );
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function normalizeForScore(value: string) {
  return cleanText(value, 2000).toLowerCase();
}

function scoreCandidate(item: PendingExactSourceResearchItem, candidate: any): ResearchCandidate {
  const title = cleanText(candidate?.title, 300);
  const url = cleanText(candidate?.sourceUrl || candidate?.url, 900);
  const snippet = cleanText(candidate?.snippet || candidate?.textPreview, 900);
  const sourceCitation = cleanText(candidate?.sourceCitation || `${title} — ${url}`, 1200);
  const domain = cleanText(candidate?.domain || hostFromUrl(url), 180);

  const all = normalizeForScore([title, url, snippet, domain].join(" "));
  const jurisdiction = normalizeForScore(item.jurisdiction);
  const reasons: string[] = [];
  let score = 0;

  if (domain.endsWith(".gov.in") || domain.endsWith(".nic.in")) {
    score += 40;
    reasons.push("official_gov_or_nic_domain");
  }

  for (const hint of item.officialDomainHints || []) {
    if (hint && domain.includes(hint.replace(/^www\./, ""))) {
      score += 25;
      reasons.push(`domain_hint:${hint}`);
      break;
    }
  }

  if (url.toLowerCase().includes(".pdf") || all.includes("pdf")) {
    score += 15;
    reasons.push("pdf_signal");
  }

  if (all.includes("building bye") || all.includes("building byelaw") || all.includes("building bye-law")) {
    score += 40;
    reasons.push("building_bye_law_signal");
  }

  if (all.includes("building rules") || all.includes("building regulation") || all.includes("development control")) {
    score += 35;
    reasons.push("building_rules_or_dcr_signal");
  }

  if (all.includes("town and country planning") || all.includes("urban development") || all.includes("municipal")) {
    score += 20;
    reasons.push("planning_or_urban_authority_signal");
  }

  const jurisdictionTokens = jurisdiction.split(" ").filter((token) => token.length >= 4);
  const matchedTokens = jurisdictionTokens.filter((token) => all.includes(token));
  if (matchedTokens.length) {
    score += Math.min(20, matchedTokens.length * 8);
    reasons.push(`jurisdiction_match:${matchedTokens.join(",")}`);
  }

  return {
    title,
    url,
    sourceUrl: url,
    snippet,
    domain,
    sourceCitation,
    score,
    scoreReasons: reasons,
  };
}

export async function GET() {
  const pending = await pendingSources();

  return NextResponse.json({
    ok: true,
    phase: "46W-7",
    endpoint: "/api/agent-knowledge/pending-exact-source-research-run",
    methods: ["POST"],
    policy:
      "batch_research_runner_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    pendingCount: pending.length,
    input: {
      limit: "Optional number of jurisdictions to research, default 3, max 25",
      offset: "Optional offset, default 0",
      sourceIds: "Optional array of specific pending source IDs",
      dryRun: "If true, returns planned queries only",
    },
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    pendingPreview: pending.slice(0, 5),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const allPending: PendingExactSourceResearchItem[] = await pendingSources();

  const sourceIds = Array.isArray(body?.sourceIds)
    ? body.sourceIds.map((value: unknown) => cleanText(value, 240)).filter(Boolean)
    : [];

  const offset = Math.max(0, Number(body?.offset || 0) || 0);
  const limit = Math.max(1, Math.min(Number(body?.limit || 3) || 3, MAX_BATCH_LIMIT));
  const dryRun = body?.dryRun === true;

  const selected = (sourceIds.length
    ? allPending.filter((item: PendingExactSourceResearchItem) => sourceIds.includes(item.sourceId))
    : allPending.slice(offset, offset + limit)
  ).slice(0, limit);

  const origin = new URL(request.url).origin;

  const planned = selected.map((item: PendingExactSourceResearchItem) => ({
    ...item,
    searchEndpoint: `${origin}/api/agent-tools/web-search`,
    requestBody: {
      query: item.searchQueries[0],
      limit: MAX_QUERY_RESULTS,
    },
  }));

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      phase: "46W-7",
      mode: "dry_run",
      policy:
        "batch_research_runner_dry_run_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
      totalPendingExactSources: allPending.length,
      selectedCount: selected.length,
      planned,
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

  const results = [];

  for (const item of selected as PendingExactSourceResearchItem[]) {
    const query = item.searchQueries[0];

    let searchPayload: any = null;
    let searchOk = false;
    let searchError = "";

    try {
      const response = await fetch(`${origin}/api/agent-tools/web-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ query, limit: MAX_QUERY_RESULTS }),
      });

      searchPayload = await response.json().catch(() => ({}));
      searchOk = response.ok && searchPayload?.ok === true;
      if (!searchOk) {
        searchError = cleanText(searchPayload?.code || searchPayload?.error || `HTTP_${response.status}`, 300);
      }
    } catch (error: any) {
      searchError = cleanText(error?.message || error, 300);
    }

    const rawItems = Array.isArray(searchPayload?.items)
      ? searchPayload.items
      : Array.isArray(searchPayload?.results)
        ? searchPayload.results
        : [];

    const candidates = rawItems
      .map((candidate: any) => scoreCandidate(item, candidate))
      .filter((candidate: ResearchCandidate) => candidate.url)
      .sort((a: ResearchCandidate, b: ResearchCandidate) => b.score - a.score)
      .slice(0, MAX_QUERY_RESULTS);

    results.push({
      sourceId: item.sourceId,
      jurisdiction: item.jurisdiction,
      jurisdictionType: item.jurisdictionType,
      query,
      searchOk,
      searchError,
      candidateCount: candidates.length,
      bestCandidate: candidates[0] || null,
      candidates,
    });
  }

  return NextResponse.json({
    ok: true,
    phase: "46W-7",
    mode: "live_research_preview",
    policy:
      "batch_research_results_preview_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    totalPendingExactSources: allPending.length,
    selectedCount: selected.length,
    resultCount: results.length,
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    results,
  });
}
