import { lookup } from "dns/promises";
import net from "net";
import { NextRequest, NextResponse } from "next/server";

import { addBuildSetuKnowledge } from "@/lib/agent-knowledge/knowledge-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_URL_BYTES = 1_000_000;
const MAX_TEXT_CHARS = 120_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_CHUNK_CHARS = 4500;

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeProjectId(value: unknown) {
  return String(value || "global")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80) || "global";
}

function safeDomain(value: unknown) {
  const text = String(value || "buildsetu").toLowerCase();
  if (text.includes("floor")) return "floor_plan";
  if (text.includes("interior")) return "interior";
  if (text.includes("exterior")) return "exterior";
  if (text.includes("structure")) return "structure";
  if (text.includes("estimate") || text.includes("boq") || text.includes("bbs")) return "estimation";
  return "buildsetu";
}

function safeTags(input: unknown) {
  const base = Array.isArray(input) ? input : [];
  const tags = base
    .map((x) => String(x || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  return Array.from(new Set(["url_ingest", "public_reference", ...tags]));
}

function parseAndNormalizeUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("URL_REQUIRED");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("INVALID_URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("UNSUPPORTED_URL_PROTOCOL");
  }

  url.hash = "";
  return url;
}

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map((x) => Number(x));
  if (parts.length !== 4 || parts.some((x) => !Number.isFinite(x) || x < 0 || x > 255)) return true;

  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIPv6(ip: string) {
  const text = ip.toLowerCase();
  return (
    text === "::1" ||
    text === "::" ||
    text.startsWith("fc") ||
    text.startsWith("fd") ||
    text.startsWith("fe80:") ||
    text.startsWith("::ffff:127.") ||
    text.startsWith("::ffff:10.") ||
    text.startsWith("::ffff:192.168.") ||
    text.includes(":169.254.")
  );
}

function isPrivateHostLiteral(hostname: string) {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const ipType = net.isIP(host);
  if (ipType === 4) return isPrivateIPv4(host);
  if (ipType === 6) return isPrivateIPv6(host);

  return false;
}

async function assertPublicResolvableUrl(url: URL) {
  // BUILDSETU_URL_INGEST_SSRF_GUARD_V1
  const hostname = url.hostname.toLowerCase();

  if (isPrivateHostLiteral(hostname)) {
    throw new Error("URL_NOT_ALLOWED_PRIVATE_HOST");
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true }).catch(() => []);
  if (!resolved.length) {
    throw new Error("URL_DNS_LOOKUP_FAILED");
  }

  for (const item of resolved) {
    const address = String(item.address || "").toLowerCase();
    if (item.family === 4 && isPrivateIPv4(address)) {
      throw new Error("URL_NOT_ALLOWED_PRIVATE_IP");
    }
    if (item.family === 6 && isPrivateIPv6(address)) {
      throw new Error("URL_NOT_ALLOWED_PRIVATE_IP");
    }
  }
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
  // BUILDSETU_URL_INGEST_READABLE_TEXT_V1
  const title = cleanText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " "));
  const description = cleanText(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i)?.[1] ||
      ""
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
    title: cleanText(decodeBasicHtmlEntities(title)),
    description: cleanText(decodeBasicHtmlEntities(description)),
    text: text.slice(0, MAX_TEXT_CHARS),
  };
}

async function fetchUrlText(url: URL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "user-agent": "BuildSetuKnowledgeIngest/1.0",
        "accept": "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.5",
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
    if (declaredLength > MAX_URL_BYTES) {
      throw new Error("URL_CONTENT_TOO_LARGE");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("EMPTY_RESPONSE_BODY");

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_URL_BYTES) {
        throw new Error("URL_CONTENT_TOO_LARGE");
      }
      chunks.push(value);
    }

    const html = Buffer.concat(chunks.map((x) => Buffer.from(x))).toString("utf8");
    const readable = contentType.includes("text/plain")
      ? { title: "", description: "", text: cleanText(html).slice(0, MAX_TEXT_CHARS) }
      : stripHtmlToReadableText(html);

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

function chunkText(text: string) {
  const clean = cleanText(text);
  if (!clean) return [];

  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += MAX_CHUNK_CHARS) {
    const part = clean.slice(i, i + MAX_CHUNK_CHARS).trim();
    if (part) chunks.push(part);
  }
  return chunks.slice(0, 25);
}

async function getAuthData(req: NextRequest) {
  const authRes = await fetch(new URL("/api/auth/me", req.url), {
    method: "GET",
    headers: { cookie: req.headers.get("cookie") || "" },
    cache: "no-store",
  }).catch(() => null);

  return authRes ? await authRes.json().catch(() => null) : null;
}

async function enforceUrlIngestGate(req: NextRequest, args: { projectId: string; estimatedInr: number }) {
  // BUILDSETU_URL_INGEST_AUTH_USAGE_GATE_V1
  const authData = await getAuthData(req);

  if (!authData?.authenticated) {
    return NextResponse.json(
      {
        ok: false,
        code: "CREDIT_CHECK_FAILED",
        error: "Please login to ingest public URL references.",
        buyCreditsUrl: "/credits",
      },
      { status: 401 }
    );
  }

  const user = authData.user || {};
  const planTier = String(user.planId || user.planName || user.plan || user.tier || "free");

  const limitRes = await fetch(new URL("/api/agent-usage/check-limit", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({
      projectId: args.projectId,
      userId: user.id || user.email || "authenticated",
      planTier,
      kind: "file_search",
      fileSearches: 1,
      estimatedInr: args.estimatedInr,
    }),
  }).catch(() => null);

  const limitData = limitRes ? await limitRes.json().catch(() => null) : null;

  if (!limitRes || !limitRes.ok || limitData?.allowed === false || limitData?.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        code: limitData?.code || "USAGE_LIMIT_EXCEEDED",
        error: limitData?.message || "Usage limit exceeded for URL ingest.",
        usage: limitData || null,
        buyCreditsUrl: "/credits",
      },
      { status: limitRes?.status || 402 }
    );
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "url_ingest",
    method: "POST",
    requiresAuth: true,
    accepts: {
      projectId: "string",
      url: "https://public-page.example",
      title: "optional string",
      domain: "buildsetu | floor_plan | interior | exterior | structure | estimation",
      tags: "optional string[]",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = safeProjectId(body.projectId || body.selectedProjectId || "global");
    const url = parseAndNormalizeUrl(body.url || body.sourceUrl);

    if (isPrivateHostLiteral(url.hostname)) {
      return NextResponse.json(
        { ok: false, code: "URL_NOT_ALLOWED", error: "Private, local, or reserved URLs are not allowed." },
        { status: 400 }
      );
    }

    const gate = await enforceUrlIngestGate(req, { projectId, estimatedInr: 0.25 });
    if (gate) return gate;

    await assertPublicResolvableUrl(url);

    const fetched = await fetchUrlText(url);
    const title = cleanText(body.title || fetched.title || url.hostname);
    const domain = safeDomain(body.domain);
    const tags = safeTags(body.tags);
    const sourceCitation = `${title} — ${fetched.finalUrl}`;

    const chunks = chunkText(
      [
        `Public URL reference ingested for BuildSetu agent knowledge.`,
        `Title: ${title}`,
        `Source URL: ${fetched.finalUrl}`,
        `Source citation: ${sourceCitation}`,
        fetched.description ? `Description: ${fetched.description}` : "",
        "",
        fetched.text,
      ].join("\n")
    );

    if (!chunks.length) {
      return NextResponse.json(
        { ok: false, code: "NO_READABLE_TEXT", error: "No readable text found at this URL." },
        { status: 422 }
      );
    }

    const added = chunks.map((text, index) =>
      addBuildSetuKnowledge({
        projectId,
        domain: domain as any,
        sourceType: "manual_text" as any,
        title: chunks.length > 1 ? `${title} — part ${index + 1}` : title,
        text,
        url: fetched.finalUrl,
        tags,
        raw: {
          uploadedBy: "url-ingest",
          sourceUrl: fetched.finalUrl,
          sourceCitation,
          contentType: fetched.contentType,
          bytes: fetched.bytes,
          chunkIndex: index,
          chunks: chunks.length,
          extractedTitle: fetched.title,
          extractedDescription: fetched.description,
        },
      })
    );

    return NextResponse.json({
      ok: true,
      route: "url_ingest",
      projectId,
      url: fetched.finalUrl,
      sourceUrl: fetched.finalUrl,
      sourceCitation,
      title,
      domain,
      count: added.length,
      items: added,
    });
  } catch (error: any) {
    const message = String(error?.message || error || "URL_INGEST_FAILED");

    const badRequestCodes = [
      "URL_REQUIRED",
      "INVALID_URL",
      "UNSUPPORTED_URL_PROTOCOL",
      "URL_NOT_ALLOWED_PRIVATE_HOST",
      "URL_NOT_ALLOWED_PRIVATE_IP",
      "URL_DNS_LOOKUP_FAILED",
      "URL_CONTENT_TOO_LARGE",
      "UNSUPPORTED_CONTENT_TYPE",
    ];

    const status = badRequestCodes.some((code) => message.includes(code)) ? 400 : 500;

    return NextResponse.json(
      {
        ok: false,
        code: message.includes("PRIVATE") ? "URL_NOT_ALLOWED" : message,
        error: "URL ingest failed.",
        detail: message,
      },
      { status }
    );
  }
}
