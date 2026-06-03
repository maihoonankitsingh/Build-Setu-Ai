import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import {
  assertBuildSetuPublicResolvableUrl,
  buildSetuUrlSafetyErrorPayload,
  normalizeBuildSetuHttpUrl,
} from "@/lib/agent-knowledge/public-url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 12000;
const MAX_URL_BYTES = 700_000;
const MAX_TEXT_CHARS = 12000;
const MAX_RESULTS = 5;

type WebResearchItem = {
  title: string;
  url: string;
  sourceUrl: string;
  sourceCitation: string;
  snippet: string;
  textPreview: string;
  domain: string;
  fetchedAt: string;
  contentType?: string;
  bytes?: number;
};

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeBasicHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtmlToReadableText(html: string) {
  const title = cleanText(
    decodeBasicHtmlEntities(
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " "),
    ),
  );

  const description = cleanText(
    decodeBasicHtmlEntities(
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i)?.[1] ||
        "",
    ),
  );

  const mainMatch =
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    html;

  const bodyText = mainMatch
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|main|header|footer|li|h1|h2|h3|h4|h5|h6|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = cleanText(decodeBasicHtmlEntities([title, description, bodyText].filter(Boolean).join("\n\n")));

  return {
    title,
    description,
    text: text.slice(0, MAX_TEXT_CHARS),
  };
}

function normalizeDuckDuckGoHref(href: string) {
  const raw = decodeBasicHtmlEntities(cleanText(href));
  if (!raw) return "";

  try {
    const url = new URL(raw, "https://duckduckgo.com");
    const uddg = url.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return "";
  }

  return "";
}

function parseDuckDuckGoResults(html: string, limit: number) {
  const items: Array<{ title: string; url: string; snippet: string }> = [];
  const seen = new Set<string>();

  const resultRegex = /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = resultRegex.exec(html)) && items.length < limit) {
    const url = normalizeDuckDuckGoHref(match[1]);
    const title = cleanText(decodeBasicHtmlEntities(match[2].replace(/<[^>]+>/g, " ")));

    if (!url || !title || seen.has(url)) continue;
    seen.add(url);

    const after = html.slice(match.index, Math.min(html.length, match.index + 2500));
    const snippet = cleanText(
      decodeBasicHtmlEntities(
        (after.match(/<a[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] ||
          after.match(/<div[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
          "").replace(/<[^>]+>/g, " "),
      ),
    );

    items.push({ title, url, snippet });
  }

  return items;
}

async function fetchLimitedText(url: URL) {
  await assertBuildSetuPublicResolvableUrl(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "user-agent": "BuildSetuPublicWebResearch/1.0",
        accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`FETCH_FAILED_${res.status}`);
    }

    const contentType = String(res.headers.get("content-type") || "").toLowerCase();

    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("UNSUPPORTED_CONTENT_TYPE");
    }

    const declaredLength = Number(res.headers.get("content-length") || 0);
    if (declaredLength > MAX_URL_BYTES) throw new Error("URL_CONTENT_TOO_LARGE");

    const reader = res.body?.getReader();
    if (!reader) throw new Error("EMPTY_RESPONSE_BODY");

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_URL_BYTES) throw new Error("URL_CONTENT_TOO_LARGE");
      chunks.push(value);
    }

    const raw = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
    const readable = contentType.includes("text/plain")
      ? { title: "", description: "", text: cleanText(raw).slice(0, MAX_TEXT_CHARS) }
      : stripHtmlToReadableText(raw);

    return {
      finalUrl: url.toString(),
      contentType,
      bytes: total,
      ...readable,
    };
  } finally {
    clearTimeout(timer);
  }
}

function webResearchItemFromFetched(args: {
  inputUrl: string;
  fetched: Awaited<ReturnType<typeof fetchLimitedText>>;
  fallbackTitle?: string;
  fallbackSnippet?: string;
}): WebResearchItem {
  const sourceUrl = args.fetched.finalUrl || args.inputUrl;
  const url = new URL(sourceUrl);
  const title = cleanText(args.fetched.title || args.fallbackTitle || url.hostname);
  const snippet = cleanText(args.fetched.description || args.fallbackSnippet || args.fetched.text.slice(0, 260));

  return {
    title,
    url: sourceUrl,
    sourceUrl,
    sourceCitation: `${title} — ${sourceUrl}`,
    snippet,
    textPreview: args.fetched.text.slice(0, 1200),
    domain: url.hostname.replace(/^www\./, ""),
    fetchedAt: new Date().toISOString(),
    contentType: args.fetched.contentType,
    bytes: args.fetched.bytes,
  };
}

async function getLoggedInUser(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return getUserFromSession(token);
}

function extractCandidateUrls(body: any) {
  const urls = [
    body?.url,
    body?.sourceUrl,
    ...(Array.isArray(body?.urls) ? body.urls : []),
  ]
    .map((value) => cleanText(value))
    .filter(Boolean);

  const query = cleanText(body?.query || body?.q || body?.prompt || body?.message);
  if (/^https?:\/\//i.test(query)) urls.push(query);

  return Array.from(new Set(urls)).slice(0, MAX_RESULTS);
}

async function researchDirectUrls(urls: string[]) {
  const items: WebResearchItem[] = [];

  for (const rawUrl of urls.slice(0, MAX_RESULTS)) {
    const url = normalizeBuildSetuHttpUrl(rawUrl);
    const fetched = await fetchLimitedText(url);
    items.push(webResearchItemFromFetched({ inputUrl: rawUrl, fetched }));
  }

  return items;
}

async function researchByDuckDuckGo(query: string, limit: number) {
  const searchUrl = new URL("https://duckduckgo.com/html/");
  searchUrl.searchParams.set("q", query);

  const fetched = await fetchLimitedText(searchUrl);
  const parsed = parseDuckDuckGoResults(fetched.text || "", limit); // BUILDSETU_WEB_SEARCH_DDG_TEXT_FIX_V1

  const items: WebResearchItem[] = [];

  for (const result of parsed.slice(0, limit)) {
    try {
      const url = normalizeBuildSetuHttpUrl(result.url);
      const fetchedPage = await fetchLimitedText(url);
      items.push(webResearchItemFromFetched({
        inputUrl: result.url,
        fetched: fetchedPage,
        fallbackTitle: result.title,
        fallbackSnippet: result.snippet,
      }));
    } catch {
      try {
        const url = normalizeBuildSetuHttpUrl(result.url);
        items.push({
          title: result.title,
          url: url.toString(),
          sourceUrl: url.toString(),
          sourceCitation: `${result.title} — ${url.toString()}`,
          snippet: result.snippet,
          textPreview: result.snippet,
          domain: url.hostname.replace(/^www\./, ""),
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        // skip invalid result
      }
    }
  }

  return items;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/agent-tools/web-search",
    methods: ["POST"],
    toolSlug: "web-search",
    description: "Authenticated public web research with source citations and private URL protection.",
    input: {
      query: "Search query or public URL",
      url: "Optional direct public URL",
      urls: "Optional direct public URL list",
      limit: "1-5",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const query = cleanText(body?.query || body?.q || body?.prompt || body?.message);
    const candidateUrls = extractCandidateUrls(body);
    const limit = Math.max(1, Math.min(Number(body?.limit || MAX_RESULTS) || MAX_RESULTS, MAX_RESULTS));

    if (!query && !candidateUrls.length) {
      return NextResponse.json(
        {
          ok: false,
          code: "QUERY_OR_URL_REQUIRED",
          error: "Send query, prompt, message, url, or urls for public web research.",
        },
        { status: 400 },
      );
    }

    // Check explicit/private URLs before auth so SSRF attempts are always blocked with URL_NOT_ALLOWED.
    for (const rawUrl of candidateUrls) {
      const url = normalizeBuildSetuHttpUrl(rawUrl);
      await assertBuildSetuPublicResolvableUrl(url);
    }

    const user = await getLoggedInUser(req);
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          code: "CREDIT_CHECK_FAILED",
          error: "Please login to run public web research.",
          buyCreditsUrl: "/credits",
        },
        { status: 401 },
      );
    }

    const items = candidateUrls.length
      ? await researchDirectUrls(candidateUrls)
      : await researchByDuckDuckGo(query, limit);

    return NextResponse.json({
      ok: true,
      toolSlug: "web-search",
      query,
      count: items.length,
      items,
      sourceCitations: items.map((item) => item.sourceCitation),
      searchedAt: new Date().toISOString(),
      userId: user.id,
    });
  } catch (error: any) {
    const safety = buildSetuUrlSafetyErrorPayload(error);
    if (safety.code !== "URL_CHECK_FAILED") {
      return NextResponse.json(safety, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: false,
        code: cleanText(error?.message || "WEB_RESEARCH_FAILED"),
        error: "Public web research failed.",
      },
      { status: 500 },
    );
  }
}
