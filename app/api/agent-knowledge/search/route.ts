import { NextRequest, NextResponse } from "next/server";

import { readFileSync } from "fs";

import { join } from "path"; // BUILDSETU_SEARCH_JOIN_IMPORT_FIX_V1

function getBuildSetuSearchSourceField(item: any, keys: string[]): string {
  // BUILDSETU_SEARCH_SOURCE_META_NORMALIZE_V1
  const candidates: any[] = [
    item,
    item?.source,
    item?.raw,
    item?.raw?.source,
    item?.raw?.original,
    item?.raw?.original?.source,
    item?.raw?.originalItem,
    item?.raw?.originalItem?.source,
    item?.raw?.originalItem?.original,
    item?.raw?.originalItem?.original?.source,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;

    for (const key of keys) {
      const value = candidate?.[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "";
}

function getBuildSetuSearchSourceUrl(item: any): string {
  return getBuildSetuSearchSourceField(item, [
    "sourceUrl",
    "url",
    "href",
    "link",
    "canonicalUrl",
  ]);
}

function getBuildSetuSearchSourceCitation(item: any): string {
  return getBuildSetuSearchSourceField(item, [
    "sourceCitation",
    "citation",
    "sourceTitle",
    "reference",
  ]);
}

function attachBuildSetuSearchCitations(item: any) {
  const sourceUrl = getBuildSetuSearchSourceUrl(item);
  const sourceCitation = getBuildSetuSearchSourceCitation(item);

  return {
    ...item,
    sourceUrl,
    sourceCitation,
  };
}

function loadBuildSetuWebSearchKnowledgeItems(): any[] {
  // BUILDSETU_SEARCH_WEB_SEARCH_STORE_MERGE_V1
  try {
    const raw = readFileSync(join(process.cwd(), "data/agent-knowledge/web-search/knowledge.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    return items.map((item: any) => ({
      ...item,
      domain: item?.domain || "web_search",
      scope: item?.scope || (item?.projectId ? "project" : "global"),
      sourceType: item?.sourceType || "web_search",
      tags: Array.from(new Set([...(Array.isArray(item?.tags) ? item.tags : []), "web_search", "public_reference"])),
      sourceUrl: getBuildSetuSearchSourceUrl(item),
      sourceCitation: getBuildSetuSearchSourceCitation(item),
    }));
  } catch {
    return [];
  }
}

import {
  buildKnowledgeContextForAgent,
  listBuildSetuKnowledge,
} from "@/lib/agent-knowledge/knowledge-store";


function parseBuildSetuCookieValues(cookieHeader: string) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq < 0) return "";
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    })
    .filter(Boolean);
}

async function readBuildSetuJsonFileSafe(relativePath: string) {
  try {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const raw = await readFile(join(process.cwd(), relativePath), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeBuildSetuSessions(raw: any) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((value, index) => ({
      ...(value && typeof value === "object" ? value : { value }),
      __key: String(index),
    }));
  }

  if (typeof raw === "object") {
    const directLists = ["sessions", "items", "data", "rows"];
    for (const key of directLists) {
      if (Array.isArray(raw[key])) {
        return raw[key].map((value: any, index: number) => ({
          ...(value && typeof value === "object" ? value : { value }),
          __key: String(index),
        }));
      }
    }

    return Object.entries(raw).map(([key, value]) => ({
      ...(value && typeof value === "object" ? value : { value }),
      __key: key,
    }));
  }

  return [];
}

async function getBuildSetuKnowledgeSearchAuth(req: Request) {
  // BUILDSETU_KNOWLEDGE_SEARCH_AUTH_GUARD_V1
  const cookieValues = parseBuildSetuCookieValues(req.headers.get("cookie") || "");
  if (!cookieValues.length) return null;

  const sessionsRaw = await readBuildSetuJsonFileSafe("data/buildsetu-auth-sessions.json");
  const sessions = normalizeBuildSetuSessions(sessionsRaw);

  for (const session of sessions) {
    const candidates = [
      session.__key,
      session.id,
      session.token,
      session.sessionToken,
      session.sessionId,
      session.sid,
      session.value,
      session.cookie,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    const matched = candidates.some((candidate) => cookieValues.includes(candidate));
    if (!matched) continue;

    const expiresAt = session.expiresAt || session.expiry || session.expires || session.validUntil;
    if (expiresAt && Number.isFinite(Date.parse(String(expiresAt))) && Date.parse(String(expiresAt)) < Date.now()) {
      continue;
    }

    return {
      id: String(session.userId || session.user?.id || session.email || session.__key || "session"),
      email: String(session.email || session.user?.email || ""),
    };
  }

  return null;
}

function buildBuildSetuKnowledgeSearchLoginRequiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      code: "LOGIN_REQUIRED",
      error: "Please login to search BuildSetu knowledge.",
    },
    { status: 401 }
  );
}


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchInput = {
  projectId?: string;
  domain?: string;
  q?: string;
  query?: string;
  limit?: number;
};

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function fallbackItemsFromContext(context: string, limit: number) {
  // BUILDSETU_SEARCH_ITEMS_FALLBACK_V1
  const blocks = String(context || "")
    .replace(/^BUILDSETU PROJECT KNOWLEDGE CONTEXT:\s*/i, "")
    .split(/\n\n(?=Knowledge\s+\d+:)/g)
    .map((x) => x.trim())
    .filter((x) => /^Knowledge\s+\d+:/m.test(x))
    .slice(0, Math.max(1, Math.min(Number(limit || 5), 50)));

  return blocks.map((block, index) => {
    const titleMatch = block.match(/^Knowledge\s+\d+:\s*(.+)$/m);
    const domainMatch = block.match(/^Domain:\s*(.+)$/m);
    const sourceMatch = block.match(/^Source:\s*(.+)$/m);
    const imageMatch = block.match(/^Image:\s*(.+)$/m);

    const title = titleMatch?.[1]?.trim() || `Knowledge ${index + 1}`;
    const detectedMatch = block.match(/^Detected type:\s*(.+)$/m);
    const fileMatch = block.match(/^File name:\s*(.+)$/m);
    const detectedType = detectedMatch?.[1]?.trim().toLowerCase() || "";

    return {
      id: `context-${index + 1}`,
      title,
      domain: domainMatch?.[1]?.trim() || "",
      sourceType: sourceMatch?.[1]?.trim() || "",
      imageUrl: imageMatch?.[1]?.trim() || "",
      score: 1,
      text: block,
      fileName: fileMatch?.[1]?.trim() || "",
      tags: ["context_fallback", detectedType].filter(Boolean),
      raw: {
        detectedType,
        extractedText: block,
      },
      contextFallback: true,
    };
  });
}


function tokenizeQuery(q: string) {
  return String(q || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);
}

function scoreKnowledgeItem(item: any, q: string) {
  const terms = tokenizeQuery(q);
  if (!terms.length) return 0;

  const title = String(item?.title || "").toLowerCase();
  const text = String(item?.text || item?.raw?.extractedText || "").toLowerCase();
  const fileName = String(item?.fileName || item?.raw?.file?.fileName || "").toLowerCase();
  const tags = JSON.stringify(item?.tags || []).toLowerCase();
  const sourceType = String(item?.sourceType || "").toLowerCase();

  let score = 0;

  const explicitType = String(item?.raw?.detectedType || item?.detectedType || "").toLowerCase();
  const detectedType = explicitType || "";

  const fileTypeHint =
    (fileName.endsWith(".pdf") ? "pdf" : "") ||
    (fileName.match(/\.(wav|mp3|m4a|aac|ogg|flac)$/) ? "audio" : "") ||
    (fileName.match(/\.(mp4|mov|webm|mkv|avi)$/) ? "video" : "") ||
    (fileName.match(/\.(txt|md|csv|json)$/) ? "text" : "") ||
    (fileName.match(/\.(png|jpg|jpeg|webp)$/) ? "image" : "");

  const qLower = String(q || "").toLowerCase();

  if (/\bpdf\b/.test(qLower) && (detectedType === "pdf" || fileTypeHint === "pdf")) score += 120;
  if (/\baudio\b/.test(qLower) && (detectedType === "audio" || fileTypeHint === "audio")) score += 120;
  if (/\bvideo\b/.test(qLower) && (detectedType === "video" || fileTypeHint === "video")) score += 120;
  if (/\bimage\b|\bphoto\b|\bscreenshot\b/.test(qLower) && (detectedType === "image" || fileTypeHint === "image")) score += 120;
  if (/\btext\b|\btxt\b|\bnote\b|\bmarkdown\b/.test(qLower) && (detectedType === "text" || fileTypeHint === "text")) score += 120;

  for (const term of terms) {
    if (title.includes(term)) score += 20;
    if (fileName.includes(term)) score += 16;
    if (tags.includes(term)) score += 12;
    if (sourceType.includes(term)) score += 8;
    if (text.includes(term)) score += 4;
  }

  const exact = String(q || "").toLowerCase().trim();
  if (exact && title.includes(exact)) score += 80;
  if (exact && text.includes(exact)) score += 40;

  return score;
}

function bsKnowledgeNormalize(value: unknown) {
  // BUILDSETU_KNOWLEDGE_DOMAIN_AWARE_SEARCH_V1
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_+.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BS_KNOWLEDGE_DOMAIN_KEYWORDS: Record<string, string[]> = {
  architecture_planning: [
    "floor plan", "planning", "layout", "space", "room", "circulation", "zoning", "setback", "ventilation", "plot", "facing", "site"
  ],
  interior_design: [
    "interior", "kitchen", "wardrobe", "false ceiling", "lighting", "furniture", "finishes", "storage", "tv unit", "modular", "clearance"
  ],
  exterior_design: [
    "exterior", "elevation", "facade", "front", "balcony", "terrace", "cladding", "massing", "opening", "compound wall"
  ],
  civil_construction: [
    "construction", "foundation", "rcc", "masonry", "plaster", "waterproofing", "site work", "curing", "concrete", "shuttering"
  ],
  construction_materials: [
    "material", "cement", "steel", "sand", "aggregate", "brick", "block", "tile", "paint", "wood", "glass", "hardware"
  ],
  vastu_guidance: [
    "vastu", "pooja", "north east", "south west", "entrance", "orientation", "mandir", "kitchen direction", "bedroom direction"
  ],
  units_dimensions: [
    "dimension", "unit", "feet", "meter", "metre", "mm", "sqm", "sqft", "clearance", "door size", "window size", "stair", "parking"
  ],
  boq: [
    "boq", "quantity", "takeoff", "rate", "item", "estimation", "cost", "cement", "steel", "brick", "plaster", "scope"
  ],
  bbs: [
    "bbs", "bar bending", "reinforcement", "rebar", "cut length", "shape code", "stirrup", "main bar", "steel schedule"
  ],
  mep_basics: [
    "mep", "plumbing", "electrical", "hvac", "drainage", "shaft", "pipe", "wiring", "db", "switch", "water supply"
  ],
  approvals_bylaws: [
    "approval", "bylaw", "bye law", "byelaw", "far", "fsi", "setback", "height", "noc", "fire", "authority", "permit", "nbc", "bis"
  ],
  quality_check: [
    "quality", "checklist", "inspection", "snag", "testing", "workmanship", "handover", "site qc", "defect"
  ],
  execution_planning: [
    "execution", "schedule", "sequence", "procurement", "labour", "labor", "timeline", "task", "phase", "workflow"
  ]
};

function bsInferKnowledgeDomains(query: string, requestedDomain: string) {
  const normalizedQuery = bsKnowledgeNormalize(query);
  const requested = bsKnowledgeNormalize(requestedDomain || "all");

  const scores: Record<string, number> = {};
  for (const [domain, keywords] of Object.entries(BS_KNOWLEDGE_DOMAIN_KEYWORDS)) {
    let score = 0;

    if (requested && requested !== "all" && requested === domain) {
      score += 100;
    }

    for (const keyword of keywords) {
      const k = bsKnowledgeNormalize(keyword);
      if (!k) continue;
      if (normalizedQuery.includes(k)) score += Math.max(8, k.length);
    }

    if (score > 0) scores[domain] = score;
  }

  const inferredDomains = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([domain]) => domain);

  return {
    requestedDomain: requested || "all",
    inferredDomains,
    scores,
    primaryDomain: inferredDomains[0] || (requested !== "all" ? requested : "general"),
  };
}

function bsReadKnowledgeTaxonomyDomains() {
  try {
    const raw = readFileSync(join(process.cwd(), "config/buildsetu-knowledge-taxonomy.json"), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.domains) ? parsed.domains : [];
  } catch {
    return [];
  }
}

function bsBuildTaxonomyKnowledgeItems(domainIntent: any) {
  const domains = bsReadKnowledgeTaxonomyDomains();
  const wanted = new Set<string>(domainIntent?.inferredDomains || []);

  return domains
    .filter((domain: any) => !wanted.size || wanted.has(String(domain?.id || "")))
    .map((domain: any) => {
      const id = String(domain?.id || "taxonomy_domain");
      const title = String(domain?.title || id);
      const scope = Array.isArray(domain?.scope) ? domain.scope : [];
      const outputUse = Array.isArray(domain?.outputUse) ? domain.outputUse : [];
      const reviewLevel = String(domain?.reviewLevel || "");

      return {
        id: `taxonomy-${id}`,
        projectId: "global",
        scope: "global",
        domain: id,
        sourceType: "taxonomy",
        title: `${title} domain guide`,
        text: [
          `BuildSetu taxonomy domain: ${title}`,
          `Domain id: ${id}`,
          reviewLevel ? `Review level: ${reviewLevel}` : "",
          scope.length ? `Scope: ${scope.join(", ")}` : "",
          outputUse.length ? `Output use: ${outputUse.join(", ")}` : "",
        ].filter(Boolean).join("\n"),
        url: "",
        imageUrl: "",
        tags: ["taxonomy", "domain_guide", id],
        extracted: {
          planningRules: scope,
          styleNotes: [],
          constraints: reviewLevel ? [`Review level: ${reviewLevel}`] : [],
          roomIdeas: [],
          materialIdeas: [],
          structuralNotes: [],
          warnings: reviewLevel.includes("required") ? ["Professional review required for final use."] : [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        taxonomyDomain: true,
      };
    });
}

function bsKnowledgeItemText(item: any) {
  return bsKnowledgeNormalize([
    item?.title,
    item?.domain,
    item?.sourceType,
    Array.isArray(item?.tags) ? item.tags.join(" ") : "",
    item?.text,
    item?.sourceUrl,
    item?.sourceCitation,
  ].filter(Boolean).join(" "));
}

function bsDomainMatchScore(item: any, domainIntent: any) {
  const inferredDomains = Array.isArray(domainIntent?.inferredDomains) ? domainIntent.inferredDomains : [];
  if (!inferredDomains.length) return 0;

  const itemDomain = bsKnowledgeNormalize(item?.domain);
  const itemTags = Array.isArray(item?.tags) ? item.tags.map(bsKnowledgeNormalize) : [];
  const text = bsKnowledgeItemText(item);

  let score = 0;

  inferredDomains.forEach((domain: string, index: number) => {
    const weight = Math.max(10, 40 - index * 8);
    const normalizedDomain = bsKnowledgeNormalize(domain);

    if (itemDomain === normalizedDomain) score += weight + 35;
    if (itemTags.includes(normalizedDomain)) score += weight + 20;
    if (text.includes(normalizedDomain.replace(/_/g, " "))) score += weight;
  });

  if (item?.taxonomyDomain) score += 120;
  if (String(item?.title || "").toLowerCase().includes("smoke")) score -= 35;
  if (String(item?.title || "").toLowerCase().includes("vision limit")) score -= 45;

  return score;
}

function bsSearchTokenScore(item: any, q: string) {
  const text = bsKnowledgeItemText(item);
  const tokens = bsKnowledgeNormalize(q)
    .split(" ")
    .filter((token) => token.length >= 3)
    .filter((token) => !["the", "and", "for", "with", "all", "this", "that", "hai", "batao"].includes(token));

  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += 8 + Math.min(10, token.length);
  }

  return score;
}

function bsAttachDomainScore(item: any, q: string, domainIntent: any) {
  const baseScore = Number(item?.score || 0);
  const tokenScore = bsSearchTokenScore(item, q);
  const domainScore = bsDomainMatchScore(item, domainIntent);
  const sourceScore = item?.sourceCitation || item?.sourceUrl ? 12 : 0;
  const score = baseScore + tokenScore + domainScore + sourceScore;

  return {
    ...item,
    score,
    domainScore,
    matchedDomains: Array.isArray(domainIntent?.inferredDomains) ? domainIntent.inferredDomains : [],
  };
}

function rankKnowledgeItems(items: any[], q: string, limit: number, domainIntent?: any) {
  // BUILDSETU_KNOWLEDGE_DOMAIN_RANKING_V1
  const ranked = [...items]
    .map((item) => bsAttachDomainScore(item, q, domainIntent || bsInferKnowledgeDomains(q, "all")))
    .filter((item) => Number(item.score || 0) > 0 || item?.taxonomyDomain)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return ranked.slice(0, Math.max(1, Math.min(limit, 50)));
}

function rankFallbackItems(items: any[], q: string, limit: number) {
  return rankKnowledgeItems(items, q, limit);
}

function handleSearch(input: SearchInput) {
  const projectId = safe(input.projectId || "global") || "global";
  const domain = safe(input.domain || "all") || "all";
  const q = safe(input.q || input.query || "");
  
  const requestedDomain = safe(input.domain || "all") || "all";
  const domainIntent = bsInferKnowledgeDomains(q, requestedDomain); // BUILDSETU_KNOWLEDGE_DOMAIN_INTENT_V1
const limit = Math.max(1, Math.min(Number(input.limit || 50), 200));
  const searchDepth = Math.max(limit, 50);

  const items = listBuildSetuKnowledge({
    projectId,
    domain: domain as any,
    limit: searchDepth,
  });

  
  const webSearchKnowledgeItems = loadBuildSetuWebSearchKnowledgeItems(); // BUILDSETU_SEARCH_WEB_SEARCH_STORE_SYNC_LOADER_V1
  const taxonomyKnowledgeItems = bsBuildTaxonomyKnowledgeItems(domainIntent); // BUILDSETU_KNOWLEDGE_TAXONOMY_ITEMS_MERGED_V1
  const searchableItems = [...taxonomyKnowledgeItems, ...webSearchKnowledgeItems, ...(items as any[])]; // BUILDSETU_SEARCH_WEB_SEARCH_ITEMS_MERGED_V1
const context = buildKnowledgeContextForAgent({
    projectId,
    domain: domain as any,
    limit: Math.min(searchDepth, 50),
  });

  const finalItems = searchableItems.length
    ? rankKnowledgeItems(searchableItems as any[], q, limit)
    : rankFallbackItems(fallbackItemsFromContext(context, searchDepth), q, limit);

  
  const finalItemsWithCitations = finalItems.map(attachBuildSetuSearchCitations); // BUILDSETU_SEARCH_FINALITEMS_CITATION_EXPOSURE_V1
return {
    ok: true,
    projectId,
    domain,
    q,
    domainIntent, // BUILDSETU_KNOWLEDGE_DOMAIN_RESPONSE_V1
    taxonomyDomainCount: taxonomyKnowledgeItems.length,
    count: finalItems.length,
    items: finalItemsWithCitations,
    sourceCitations: finalItemsWithCitations.map((item: any) => item.sourceCitation).filter(Boolean),
    context,
  };
}

export async function GET(req: NextRequest) {
  const buildSetuKnowledgeSearchAuth = await getBuildSetuKnowledgeSearchAuth(req);
  if (!buildSetuKnowledgeSearchAuth) return buildBuildSetuKnowledgeSearchLoginRequiredResponse();

  const url = new URL(req.url);

  return NextResponse.json(
    handleSearch({
      projectId: url.searchParams.get("projectId") || "global",
      domain: url.searchParams.get("domain") || "all",
      q: url.searchParams.get("q") || url.searchParams.get("query") || "",
      limit: Number(url.searchParams.get("limit") || 50),
    }),
  );
}

export async function POST(req: NextRequest) {
  const buildSetuKnowledgeSearchAuth = await getBuildSetuKnowledgeSearchAuth(req);
  if (!buildSetuKnowledgeSearchAuth) return buildBuildSetuKnowledgeSearchLoginRequiredResponse();

  let body: any = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  return NextResponse.json(
    handleSearch({
      projectId: body.projectId || "global",
      domain: body.domain || "all",
      q: body.q || body.query || "",
      limit: Number(body.limit || 50),
    }),
  );
}
