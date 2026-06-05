import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonObject = Record<string, any>;

type PendingExactSourcePreviewItem = {
  sourceId: string;
  jurisdiction: string;
  jurisdictionType: string;
  currentTitle: string;
  currentUrl: string;
  exactSourceStatus: string;
  verificationStatus: string;
  targetNeeded: string;
  officialDomainHints: string[];
  searchQueries: string[];
  suggestedDecision: string;
};

const WATCH_RELATIVE_PATH = "config/buildsetu-source-watch.sources.json";

function cleanText(value: unknown, max = 500) {
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

function sourceId(source: JsonObject) {
  return cleanText(source?.id || source?.sourceId || source?.key || "", 220);
}

function isAuthorityIndexSource(source: JsonObject) {
  const id = sourceId(source);
  return id.startsWith("india-") && id.includes("approval-authority-index");
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

export async function GET() {
  const watch = await readJson(projectPath(WATCH_RELATIVE_PATH), { sources: [] });
  const sources = Array.isArray(watch?.sources) ? watch.sources : [];

  const pending: PendingExactSourcePreviewItem[] = sources
    .filter((source: JsonObject) => isAuthorityIndexSource(source))
    .filter((source: JsonObject) => isPendingExactSource(source))
    .map((source: JsonObject) => {
      const jurisdiction = jurisdictionName(source);

      return {
        sourceId: sourceId(source),
        jurisdiction,
        jurisdictionType: jurisdictionType(source),
        currentTitle: cleanText(source?.title || source?.exactSourceTitle || "", 240),
        currentUrl: cleanText(source?.url || source?.exactSourceUrl || "", 600),
        exactSourceStatus: cleanText(source?.exactSourceStatus || "", 160),
        verificationStatus: cleanText(source?.verificationStatus || "", 160),
        targetNeeded:
          "Exact official building bye-law / building rules / development control regulation URL",
        officialDomainHints: buildOfficialDomainHints(jurisdiction),
        searchQueries: buildQueries(jurisdiction),
        suggestedDecision: "pending_exact_source_research",
      };
    })
    .sort((a: PendingExactSourcePreviewItem, b: PendingExactSourcePreviewItem) =>
      a.jurisdiction.localeCompare(b.jurisdiction),
    );

  return NextResponse.json({
    ok: true,
    phase: "46W-4",
    policy:
      "research_preview_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    totalPendingExactSources: pending.length,
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    sourceRegistryChanged: false,
    extractionAllowedChanged: false,
    qaReadyAllowedChanged: false,
    trustedMergeCandidateAllowedChanged: false,
    pending,
  });
}
