import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import {
  assertBuildSetuPublicResolvableUrl,
  buildSetuUrlSafetyErrorPayload,
  normalizeBuildSetuHttpUrl,
} from "@/lib/agent-knowledge/public-url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type WebSearchSaveItem = {
  title?: string;
  url?: string;
  sourceUrl?: string;
  sourceCitation?: string;
  snippet?: string;
  textPreview?: string;
  domain?: string;
  fetchedAt?: string;
  contentType?: string;
  bytes?: number;
};

type KnowledgeItem = {
  id: string;
  title: string;
  domain: string;
  scope: string;
  projectId: string | null;
  userId: string;
  sourceType: string;
  sourceUrl: string;
  sourceCitation: string;
  text: string;
  tags: string[];
  raw: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "agent-knowledge", "web-search");
const KNOWLEDGE_FILE = path.join(KNOWLEDGE_DIR, "knowledge.json");
const MAX_ITEMS = 10;
const MAX_TEXT_CHARS = 12000;

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .map((value) => cleanText(value))
        .filter(Boolean),
    ),
  );
}

async function getLoggedInUser(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return getUserFromSession(token);
}

async function readKnowledgeItems(): Promise<KnowledgeItem[]> {
  try {
    const raw = await readFile(KNOWLEDGE_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) return parsed;

    if (parsed && Array.isArray(parsed.items)) return parsed.items;

    return [];
  } catch {
    return [];
  }
}

async function writeKnowledgeItems(items: KnowledgeItem[]) {
  await mkdir(KNOWLEDGE_DIR, { recursive: true });

  await writeFile(
    KNOWLEDGE_FILE,
    JSON.stringify(
      {
        schema: "buildsetu-agent-knowledge-v1",
        updatedAt: new Date().toISOString(),
        items,
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );
}

function normalizeSaveItems(body: any): WebSearchSaveItem[] {
  const rawItems = Array.isArray(body?.items)
    ? body.items
    : body?.item
      ? [body.item]
      : [];

  return rawItems
    .map((item: any) => ({ // BUILDSETU_WEB_SEARCH_SAVE_ITEM_TYPE_FIX_V1
      title: cleanText(item?.title),
      url: cleanText(item?.url),
      sourceUrl: cleanText(item?.sourceUrl || item?.url),
      sourceCitation: cleanText(item?.sourceCitation),
      snippet: cleanText(item?.snippet),
      textPreview: cleanText(item?.textPreview || item?.text),
      domain: cleanText(item?.domain),
      fetchedAt: cleanText(item?.fetchedAt),
      contentType: cleanText(item?.contentType),
      bytes: Number(item?.bytes || 0) || undefined,
    }))
    .filter((item: WebSearchSaveItem) => item.sourceUrl || item.url) // BUILDSETU_WEB_SEARCH_SAVE_FILTER_TYPE_FIX_V1
    .slice(0, MAX_ITEMS);
}

function buildKnowledgeText(item: WebSearchSaveItem, query: string) {
  return [
    item.title ? `Title: ${item.title}` : "",
    query ? `Query: ${query}` : "",
    item.snippet ? `Snippet: ${item.snippet}` : "",
    item.textPreview ? `Text preview: ${item.textPreview}` : "",
    item.sourceCitation ? `Source citation: ${item.sourceCitation}` : "",
    item.sourceUrl ? `Source URL: ${item.sourceUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_TEXT_CHARS);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/agent-knowledge/web-search-save",
    methods: ["POST"],
    description: "Save public web-search result items into BuildSetu agent knowledge with source citations.",
    input: {
      query: "Original web-search query",
      projectId: "Optional project id",
      items: "Array of web-search result items with title/sourceUrl/sourceCitation/snippet/textPreview",
      tags: "Optional tags",
      domain: "Optional knowledge domain",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const user = await getLoggedInUser(req);
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          code: "LOGIN_REQUIRED",
          error: "Please login to save web-search results to knowledge.",
        },
        { status: 401 },
      );
    }

    const query = cleanText(body?.query || body?.prompt || body?.message);
    const projectId = cleanText(body?.projectId) || null;
    const domain = cleanText(body?.domain) || "web_search";
    const items = normalizeSaveItems(body);

    if (!items.length) {
      return NextResponse.json(
        {
          ok: false,
          code: "WEB_SEARCH_ITEMS_REQUIRED",
          error: "Send web-search result items to save.",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const saved: KnowledgeItem[] = [];

    for (const item of items) {
      const sourceUrlRaw = item.sourceUrl || item.url || "";
      const safeUrl = normalizeBuildSetuHttpUrl(sourceUrlRaw);
      await assertBuildSetuPublicResolvableUrl(safeUrl);

      const sourceUrl = safeUrl.toString();
      const title = cleanText(item.title || safeUrl.hostname);
      const sourceCitation = cleanText(item.sourceCitation || `${title} — ${sourceUrl}`);
      const text = buildKnowledgeText({ ...item, sourceUrl, sourceCitation, title }, query);

      saved.push({
        id: `knowledge_web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        domain,
        scope: projectId ? "project" : "global",
        projectId,
        userId: user.id,
        sourceType: "web_search",
        sourceUrl,
        sourceCitation,
        text,
        tags: uniqueStrings([
          "web_search",
          "public_reference",
          body?.tags,
          projectId ? `project:${projectId}` : "global",
        ]),
        raw: {
          query,
          toolSlug: "web-search",
          originalItem: item,
          savedBy: "/api/agent-knowledge/web-search-save",
          fetchedAt: item.fetchedAt || null,
          contentType: item.contentType || null,
          bytes: item.bytes || null,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    const existing = await readKnowledgeItems();

    await writeKnowledgeItems([...saved, ...existing]);

    return NextResponse.json({
      ok: true,
      code: "WEB_SEARCH_SAVED",
      savedCount: saved.length,
      items: saved.map((item) => ({
        id: item.id,
        title: item.title,
        sourceUrl: item.sourceUrl,
        sourceCitation: item.sourceCitation,
        projectId: item.projectId,
        domain: item.domain,
      })),
      sourceCitations: saved.map((item) => item.sourceCitation),
      knowledgeFile: "data/agent-knowledge/web-search/knowledge.json",
    });
  } catch (error: any) {
    const safety = buildSetuUrlSafetyErrorPayload(error);
    if (safety.code !== "URL_CHECK_FAILED") {
      return NextResponse.json(safety, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        code: cleanText(error?.message || "WEB_SEARCH_SAVE_FAILED"),
        error: "Could not save web-search results to knowledge.",
      },
      { status: 500 },
    );
  }
}
