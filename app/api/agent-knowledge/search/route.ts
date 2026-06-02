import { NextRequest, NextResponse } from "next/server";
import {
  buildKnowledgeContextForAgent,
  listBuildSetuKnowledge,
} from "@/lib/agent-knowledge/knowledge-store";

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

  const context = buildKnowledgeContextForAgent({
    projectId,
    domain: domain as any,
    limit: Math.min(searchDepth, 50),
  });

  const finalItems = items.length
    ? rankKnowledgeItems(items as any[], q, limit)
    : rankFallbackItems(fallbackItemsFromContext(context, searchDepth), q, limit);

  return {
    ok: true,
    projectId,
    domain,
    q,
    count: finalItems.length,
    items: finalItems,
    context,
  };
}

export async function GET(req: NextRequest) {
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
