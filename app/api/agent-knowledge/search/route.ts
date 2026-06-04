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

function rankKnowledgeItems(items: any[], q: string, limit: number) {
  const ranked = [...items]
    .map((item, index) => ({
      ...item,
      score: scoreKnowledgeItem(item, q),
      _rankIndex: index,
    }))
    .sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return (a._rankIndex || 0) - (b._rankIndex || 0);
    })
    .slice(0, Math.max(1, Math.min(Number(limit || 50), 200)))
    .map(({ _rankIndex, ...item }) => item);

  return ranked;
}

function rankFallbackItems(items: any[], q: string, limit: number) {
  return rankKnowledgeItems(items, q, limit);
}

function handleSearch(input: SearchInput) {
  const projectId = safe(input.projectId || "global") || "global";
  const domain = safe(input.domain || "all") || "all";
  const q = safe(input.q || input.query || "");
  const limit = Math.max(1, Math.min(Number(input.limit || 50), 200));
  const searchDepth = Math.max(limit, 50);

  const items = listBuildSetuKnowledge({
    projectId,
    domain: domain as any,
    limit: searchDepth,
  });

  
  const webSearchKnowledgeItems = loadBuildSetuWebSearchKnowledgeItems(); // BUILDSETU_SEARCH_WEB_SEARCH_STORE_SYNC_LOADER_V1
  const searchableItems = [...webSearchKnowledgeItems, ...(items as any[])]; // BUILDSETU_SEARCH_WEB_SEARCH_ITEMS_MERGED_V1
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
