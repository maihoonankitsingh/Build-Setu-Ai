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

function buildSetuWebSearchNormalize(value: unknown) {
  // BUILDSETU_WEB_SEARCH_SAFE_QUALITY_GUARD_V1
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSetuFocusedWebSearchQuery(query: string) {
  const q = buildSetuWebSearchNormalize(query);

  if (
    (q.includes("model") && q.includes("building") && (q.includes("bye") || q.includes("byelaw") || q.includes("laws"))) ||
    q.includes("mohua") ||
    q.includes("far") ||
    q.includes("setback")
  ) {
    return '"Model Building Bye Laws 2016" MoHUA PDF building bye laws FAR setback';
  }

  if (
    q.includes("national building code") ||
    q.includes("nbc") ||
    (q.includes("bis") && (q.includes("building") || q.includes("fire") || q.includes("safety")))
  ) {
    return '"National Building Code of India" BIS fire safety PDF building code';
  }

  return query;
}

function buildSetuWebSearchHost(urlValue: string) {
  try {
    return new URL(urlValue).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function buildSetuWebSearchIsNoiseHost(host: string) {
  const deny = new Set([
    "wikipedia.org",
    "en.wikipedia.org",
    "britannica.com",
    "www.britannica.com",
    "nationalinsurance.nic.co.in",
    "npci.org.in",
    "nationalcar.com",
    "www.nationalcar.com",
    "nationaltoday.com",
    "www.nationaltoday.com",
    "nationalheraldindia.com",
    "www.nationalheraldindia.com",
    "scholarships.gov.in",
  ]);

  return deny.has(host);
}

function buildSetuWebSearchNoiseTitle(titleValue: string) {
  const title = buildSetuWebSearchNormalize(titleValue);

  return (
    title.includes("wikipedia") ||
    title.includes("britannica") ||
    title.includes("national insurance") ||
    title.includes("national scholarship") ||
    title.includes("national payments corporation") ||
    title.includes("national car rental") ||
    title.includes("what is today") ||
    title.includes("national news latest headlines")
  );
}

function buildSetuWebSearchIntent(query: string) {
  const q = buildSetuWebSearchNormalize(query);

  if (
    q.includes("model building bye") ||
    q.includes("building bye laws") ||
    q.includes("building byelaws") ||
    q.includes("mohua") ||
    q.includes("setback") ||
    q.includes("far")
  ) {
    return "building_bye_laws";
  }

  if (
    q.includes("national building code") ||
    q.includes("nbc") ||
    q.includes("bis") ||
    (q.includes("fire") && q.includes("safety") && q.includes("building"))
  ) {
    return "national_building_code";
  }

  return "general";
}

function buildSetuWebSearchIntentMatch(query: string, result: { title: string; url: string; snippet: string }) {
  const intent = buildSetuWebSearchIntent(query);
  const host = buildSetuWebSearchHost(result.url);
  const all = buildSetuWebSearchNormalize([result.title, result.url, result.snippet, host].join(" "));

  if (!host || buildSetuWebSearchIsNoiseHost(host) || buildSetuWebSearchNoiseTitle(result.title)) {
    return { ok: false, score: -1000 };
  }

  let score = 0;

  if (host.endsWith(".gov.in") || host.endsWith(".nic.in") || host === "bis.gov.in" || host.includes("mohua")) score += 35;
  if (all.includes("pdf")) score += 12;

  if (intent === "building_bye_laws") {
    const must =
      all.includes("model building bye") ||
      all.includes("building bye laws") ||
      all.includes("building byelaws") ||
      all.includes("bye laws") ||
      all.includes("byelaws") ||
      all.includes("mohua") ||
      all.includes("setback") ||
      all.includes("floor area ratio") ||
      /\bfar\b/.test(all);

    if (!must) return { ok: false, score: -500 };

    if (all.includes("model building bye laws")) score += 90;
    if (all.includes("mohua")) score += 60;
    if (all.includes("setback")) score += 25;
    if (/\bfar\b/.test(all) || all.includes("floor area ratio")) score += 25;
    if (all.includes("building")) score += 15;
    return { ok: true, score };
  }

  if (intent === "national_building_code") {
    const must =
      all.includes("national building code") ||
      all.includes("building code") ||
      all.includes("bureau of indian standards") ||
      /\bbis\b/.test(all) ||
      /\bnbc\b/.test(all) ||
      (all.includes("fire") && all.includes("safety") && all.includes("building"));

    if (!must) return { ok: false, score: -500 };

    if (all.includes("national building code")) score += 95;
    if (all.includes("bureau of indian standards") || /\bbis\b/.test(all)) score += 65;
    if (all.includes("fire") && all.includes("safety")) score += 35;
    if (all.includes("building")) score += 15;
    return { ok: true, score };
  }

  const queryTokens = buildSetuWebSearchNormalize(query)
    .split(" ")
    .filter((token) => token.length >= 4)
    .filter((token) => !["official", "source", "india", "indian", "search", "find"].includes(token));

  let matches = 0;
  for (const token of queryTokens) {
    if (all.includes(token)) {
      matches += 1;
      score += 10;
    }
  }

  return { ok: matches >= Math.min(2, queryTokens.length || 1), score };
}

function buildSetuFilterParsedSearchResults(
  query: string,
  results: Array<{ title: string; url: string; snippet: string }>,
  limit: number,
) {
  const filtered = results
    .map((result) => ({
      ...result,
      __quality: buildSetuWebSearchIntentMatch(query, result),
    }))
    .filter((result) => result.__quality.ok)
    .sort((a, b) => b.__quality.score - a.__quality.score)
    .slice(0, Math.max(1, Math.min(limit, MAX_RESULTS)));

  return filtered.map(({ __quality, ...result }) => result);
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

function decodeBingUrlParam(value: string) {
  const clean = cleanText(value);
  if (!clean) return "";

  const candidates = [
    clean,
    clean.replace(/^a1/i, ""),
    clean.replace(/^a2/i, ""),
  ];

  for (const candidate of candidates) {
    try {
      const padded = candidate.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(candidate.length / 4) * 4, "=");
      const decoded = Buffer.from(padded, "base64").toString("utf8");
      if (/^https?:\/\//i.test(decoded)) return decoded;
    } catch {
      // try next candidate
    }
  }

  return "";
}

function normalizeBingHref(href: string) {
  // BUILDSETU_WEB_SEARCH_BING_FALLBACK_V1
  const raw = decodeBasicHtmlEntities(cleanText(href));
  if (!raw) return "";

  try {
    const url = new URL(raw, "https://www.bing.com");

    if (url.hostname.endsWith("bing.com") && url.pathname.startsWith("/ck/a")) {
      const u = url.searchParams.get("u");
      const decoded = u ? decodeBingUrlParam(u) : "";
      if (decoded) return decoded;
    }

    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return "";
  }

  return "";
}

function parseBingResults(html: string, limit: number) {
  const items: Array<{ title: string; url: string; snippet: string }> = [];
  const seen = new Set<string>();

  const blockRegex = /<li[^>]+class=["'][^"']*\bb_algo\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) && items.length < limit) {
    const block = match[1] || "";
    const link =
      block.match(/<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i) ||
      block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);

    if (!link) continue;

    const url = normalizeBingHref(link[1]);
    const title = cleanText(decodeBasicHtmlEntities(String(link[2] || "").replace(/<[^>]+>/g, " ")));

    if (!url || !title || seen.has(url)) continue;

    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      host = "";
    }

    if (!host || host.endsWith("bing.com")) continue;

    seen.add(url);

    const snippet = cleanText(
      decodeBasicHtmlEntities(
        (
          block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
          block.match(/<div[^>]+class=["'][^"']*b_caption[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
          ""
        ).replace(/<[^>]+>/g, " "),
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
        rawHtml: contentType.includes("text/plain") ? "" : raw.slice(0, MAX_URL_BYTES), // BUILDSETU_WEB_SEARCH_RAW_HTML_FOR_PARSERS_V1
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


function buildSetuTitleFromUrl(url: URL) {
  // BUILDSETU_WEB_SEARCH_DIRECT_URL_TOLERANT_V1
  const file = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || url.hostname)
    .replace(/\.[a-z0-9]{2,8}$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return file || url.hostname.replace(/^www\./, "");
}

function buildSetuDirectUrlMetadataItem(inputUrl: string, reason: string): WebResearchItem {
  // BUILDSETU_WEB_SEARCH_SANITIZED_METADATA_FALLBACK_V1
  void reason;

  const url = normalizeBuildSetuHttpUrl(inputUrl);
  const title = buildSetuTitleFromUrl(url);
  const fallbackNote = "Official source metadata fallback. Source preview unavailable; source URL retained for citation.";

  return {
    title,
    url: url.toString(),
    sourceUrl: url.toString(),
    sourceCitation: `${title} — ${url.toString()}`,
    snippet: fallbackNote,
    textPreview: `${fallbackNote} Source URL: ${url.toString()}`,
    domain: url.hostname.replace(/^www\./, ""),
    fetchedAt: new Date().toISOString(),
  };
}

function buildSetuIsMetadataFallbackContentError(error: unknown) {
  const message = cleanText((error as any)?.message || error);

  return (
    message.includes("UNSUPPORTED_CONTENT_TYPE") ||
    message.includes("URL_CONTENT_TOO_LARGE") ||
    message.includes("fetch failed") ||
    message.includes("terminated") ||
    message.includes("aborted") ||
    message.includes("Body is unusable")
  );
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
  // BUILDSETU_WEB_SEARCH_DIRECT_URL_RESEARCH_TOLERANT_V1
  const items: WebResearchItem[] = [];

  for (const rawUrl of urls.slice(0, MAX_RESULTS)) {
    try {
      const url = normalizeBuildSetuHttpUrl(rawUrl);
      const fetched = await fetchLimitedText(url);
      items.push(webResearchItemFromFetched({ inputUrl: rawUrl, fetched }));
    } catch (error) {
      if (!buildSetuIsMetadataFallbackContentError(error)) {
        continue;
      }

      try {
        items.push(buildSetuDirectUrlMetadataItem(rawUrl, cleanText((error as any)?.message || error)));
      } catch {
        // skip invalid fallback URL
      }
    }
  }

  return items;
}

async function researchByDuckDuckGo(query: string, limit: number) {
  const searchUrl = new URL("https://duckduckgo.com/html/");
  searchUrl.searchParams.set("q", query);

  const fetched = await fetchLimitedText(searchUrl);
  const parsed = buildSetuFilterParsedSearchResults(query, parseDuckDuckGoResults((fetched as any).rawHtml || fetched.text || "", limit * 4), limit); // BUILDSETU_WEB_SEARCH_DDG_SAFE_FILTER_V1

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

async function researchByBing(query: string, limit: number) {
  // BUILDSETU_WEB_SEARCH_BING_RESEARCH_V1
  const searchUrl = new URL("https://www.bing.com/search");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("count", String(Math.max(1, Math.min(limit, MAX_RESULTS))));

  const fetched = await fetchLimitedText(searchUrl);
  const parsed = buildSetuFilterParsedSearchResults(query, parseBingResults((fetched as any).rawHtml || fetched.text || "", limit * 5), limit); // BUILDSETU_WEB_SEARCH_BING_SAFE_FILTER_V1

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

async function researchByPublicSearch(query: string, limit: number) {
  // BUILDSETU_WEB_SEARCH_MULTI_PROVIDER_FALLBACK_V1
  const focusedQuery = buildSetuFocusedWebSearchQuery(query); // BUILDSETU_WEB_SEARCH_FOCUSED_QUERY_V1
  const errors: string[] = [];

  try {
    const duckItems = await researchByDuckDuckGo(focusedQuery, limit);
    if (duckItems.length) return duckItems;
    errors.push("duckduckgo_empty");
  } catch (error: any) {
    errors.push(`duckduckgo_${cleanText(error?.message || "failed")}`);
  }

  try {
    const bingItems = await researchByBing(focusedQuery, limit);
    if (bingItems.length) return bingItems;
    errors.push("bing_empty");
  } catch (error: any) {
    errors.push(`bing_${cleanText(error?.message || "failed")}`);
  }

  return []; // BUILDSETU_WEB_SEARCH_NO_RELEVANT_RESULTS_V1
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
        : await researchByPublicSearch(query, limit);

    return NextResponse.json({
      ok: true,
      toolSlug: "web-search",
      query,
      count: items.length,
      qualityCode: items.length ? "WEB_SEARCH_RESULTS" : "NO_RELEVANT_RESULTS", // BUILDSETU_WEB_SEARCH_QUALITY_CODE_V1
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
