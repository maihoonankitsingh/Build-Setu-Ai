import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

const PACKS_RELATIVE_PATH = "config/buildsetu-source-packs.json";

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

async function readJson(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function cleanText(value: unknown, max = 2000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isStateUtAuthorityIndex(source: JsonObject) {
  const id = cleanText(source?.id || "", 260);
  return id.startsWith("india-") && id.endsWith("-approval-authority-index");
}

function getAllPackSources(packs: JsonObject[]) {
  return packs.flatMap((pack) =>
    asArray(pack?.sources).map((source) => ({
      packId: cleanText(pack?.id || "", 200),
      packTitle: cleanText(pack?.title || "", 300),
      id: cleanText(source?.id || "", 260),
      title: cleanText(source?.title || "", 300),
      exactSourceUrl: cleanText(source?.exactSourceUrl || "", 1400),
      exactSourceTitle: cleanText(source?.exactSourceTitle || "", 300),
      exactSourcePublisher: cleanText(source?.exactSourcePublisher || "", 300),
      exactSourceAuthorityType: cleanText(source?.exactSourceAuthorityType || "", 160),
      verificationStatus: cleanText(source?.verificationStatus || "", 160),
      exactSourceStatus: cleanText(source?.exactSourceStatus || "", 160),
      verificationPriority: cleanText(source?.verificationPriority || "", 80),
      jurisdiction: source?.jurisdiction || null,
      reviewRequired: source?.reviewRequired === true,
      mergePolicy: cleanText(source?.mergePolicy || "", 160),
      trustedKnowledgeWrite: source?.trustedKnowledgeWrite === true,
      trustedMergeExecuted: source?.trustedMergeExecuted === true,
    }))
  );
}

async function fetchSmoke(url: string) {
  const startedAt = Date.now();

  if (!url || !/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      status: 0,
      statusText: "invalid_url",
      method: "none",
      finalUrl: url,
      contentType: "",
      contentLength: "",
      elapsedMs: Date.now() - startedAt,
      error: "Invalid or missing URL.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  async function attempt(method: "HEAD" | "GET") {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers:
        method === "GET"
          ? {
              Range: "bytes=0-0",
              "User-Agent": "BuildSetu-Source-Smoke-Validator/1.0",
            }
          : {
              "User-Agent": "BuildSetu-Source-Smoke-Validator/1.0",
            },
    });

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      method,
      finalUrl: res.url,
      contentType: res.headers.get("content-type") || "",
      contentLength: res.headers.get("content-length") || "",
      elapsedMs: Date.now() - startedAt,
      error: "",
    };
  }

  try {
    const head = await attempt("HEAD");

    if (
      head.status === 405 ||
      head.status === 403 ||
      head.status === 400 ||
      head.status === 0
    ) {
      return await attempt("GET");
    }

    return head;
  } catch (error: any) {
    try {
      return await attempt("GET");
    } catch (fallbackError: any) {
      return {
        ok: false,
        status: 0,
        statusText: "request_failed",
        method: "HEAD_GET",
        finalUrl: url,
        contentType: "",
        contentLength: "",
        elapsedMs: Date.now() - startedAt,
        error: cleanText(fallbackError?.message || error?.message || "Request failed.", 500),
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const packsData = await readJson(projectPath(PACKS_RELATIVE_PATH), { packs: [] });
  const packs = asArray(packsData?.packs);
  const allSources = getAllPackSources(packs);

  const verifiedSources = allSources.filter(
    (source) =>
      isStateUtAuthorityIndex(source) &&
      source.verificationStatus === "verified_exact_source" &&
      source.exactSourceStatus === "verified_exact_source_found" &&
      Boolean(source.exactSourceUrl)
  );

  const results = await Promise.all(
    verifiedSources.map(async (source) => {
      const smoke = await fetchSmoke(source.exactSourceUrl);

      return {
        id: source.id,
        jurisdiction: source.jurisdiction?.stateOrUnionTerritory || "",
        jurisdictionType: source.jurisdiction?.jurisdictionType || "",
        exactSourceTitle: source.exactSourceTitle,
        exactSourceUrl: source.exactSourceUrl,
        exactSourcePublisher: source.exactSourcePublisher,
        exactSourceAuthorityType: source.exactSourceAuthorityType,
        verificationStatus: source.verificationStatus,
        verificationPriority: source.verificationPriority,
        reviewRequired: source.reviewRequired,
        mergePolicy: source.mergePolicy,
        trustedKnowledgeWrite: false,
        trustedMergeExecuted: false,
        smoke,
      };
    })
  );

  const reachable = results.filter((item) => item.smoke.ok).length;
  const failed = results.length - reachable;
  const pdfLike = results.filter((item) =>
    item.smoke.contentType.toLowerCase().includes("pdf") ||
    item.smoke.finalUrl.toLowerCase().includes(".pdf") ||
    item.exactSourceUrl.toLowerCase().includes(".pdf")
  ).length;
  const htmlLike = results.filter((item) =>
    item.smoke.contentType.toLowerCase().includes("html")
  ).length;

  return NextResponse.json({
    ok: true,
    phase: "46J-1",
    smokePolicy: "read_only_exact_source_url_smoke_no_extraction_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    files: {
      sourcePacks: PACKS_RELATIVE_PATH,
    },
    summary: {
      verifiedExactSourceUrls: results.length,
      reachable,
      failed,
      pdfLike,
      htmlLike,
      expectedVerifiedHighPriorityExactSources: 11,
      smokePass: results.length === 11 && failed === 0,
    },
    results,
    safetyBoundary: {
      mode: "read_only_url_smoke_validator",
      extractionExecuted: false,
      qaReadyChanged: false,
      trustedMergeEnabled: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
    },
  });
}
