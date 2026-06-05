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

function classifySmokeDiagnostic(smoke: JsonObject) {
  const status = Number(smoke?.status || 0);
  const error = cleanText(smoke?.error || "", 500).toLowerCase();
  const statusText = cleanText(smoke?.statusText || "", 200).toLowerCase();

  if (smoke?.ok === true) {
    return {
      status: "reachable",
      severity: "pass",
      manualVerificationRequired: false,
      sourceInvalidConfirmed: false,
      message: "URL reachable from server-side smoke check.",
    };
  }

  if (status === 401 || status === 403 || status === 429) {
    return {
      status: "http_blocked",
      severity: "warning",
      manualVerificationRequired: true,
      sourceInvalidConfirmed: false,
      message: "Government server returned auth/blocked/rate-limited response. Manual browser verification required before extraction.",
    };
  }

  if (
    error.includes("abort") ||
    error.includes("timeout") ||
    error.includes("timed out") ||
    error.includes("fetch failed") ||
    statusText.includes("request_failed")
  ) {
    return {
      status: "timeout_or_network_blocked",
      severity: "warning",
      manualVerificationRequired: true,
      sourceInvalidConfirmed: false,
      message: "Server-side smoke check could not reach this URL. This may be network, DNS, firewall, bot protection, or government server availability issue.",
    };
  }

  if (
    error.includes("ssl") ||
    error.includes("tls") ||
    error.includes("certificate") ||
    error.includes("renegotiation")
  ) {
    return {
      status: "ssl_or_tls_issue",
      severity: "warning",
      manualVerificationRequired: true,
      sourceInvalidConfirmed: false,
      message: "TLS/SSL compatibility issue detected. Manual browser or alternate curl/OpenSSL verification required.",
    };
  }

  return {
    status: "unknown_failure",
    severity: "warning",
    manualVerificationRequired: true,
    sourceInvalidConfirmed: false,
    message: "URL smoke failed for an unclassified reason. Manual verification required.",
  };
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

  async function attempt(
    method: "HEAD" | "GET",
    options?: { range?: boolean; timeoutMs?: number; label?: string }
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 25000);

    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (compatible; BuildSetu-Source-Smoke-Validator/1.1; +https://build.sikhadenge.in)",
      Accept:
        "application/pdf,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      "Cache-Control": "no-cache",
    };

    if (method === "GET" && options?.range) {
      headers.Range = "bytes=0-2048";
    }

    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers,
      });

      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        method: options?.label || method,
        finalUrl: res.url,
        contentType: res.headers.get("content-type") || "",
        contentLength: res.headers.get("content-length") || "",
        elapsedMs: Date.now() - startedAt,
        error: "",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  const attempts: Array<{
    method: "HEAD" | "GET";
    range?: boolean;
    timeoutMs: number;
    label: string;
  }> = [
    { method: "HEAD", timeoutMs: 20000, label: "HEAD" },
    { method: "GET", range: true, timeoutMs: 25000, label: "GET_RANGE" },
    { method: "GET", range: false, timeoutMs: 25000, label: "GET" },
  ];

  let lastFailure: any = null;

  for (const item of attempts) {
    try {
      const result = await attempt(item.method, {
        range: item.range,
        timeoutMs: item.timeoutMs,
        label: item.label,
      });

      if (result.ok) return result;

      lastFailure = result;

      if (result.status === 401 || result.status === 403 || result.status === 429) {
        continue;
      }

      if (item.method === "HEAD") {
        continue;
      }
    } catch (error: any) {
      lastFailure = {
        ok: false,
        status: 0,
        statusText: "request_failed",
        method: item.label,
        finalUrl: url,
        contentType: "",
        contentLength: "",
        elapsedMs: Date.now() - startedAt,
        error: cleanText(error?.message || "Request failed.", 500),
      };
    }
  }

  return (
    lastFailure || {
      ok: false,
      status: 0,
      statusText: "request_failed",
      method: "HEAD_GET",
      finalUrl: url,
      contentType: "",
      contentLength: "",
      elapsedMs: Date.now() - startedAt,
      error: "All smoke attempts failed.",
    }
  );
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
        diagnostic: classifySmokeDiagnostic(smoke),
      };
    })
  );

  const reachable = results.filter((item) => item.smoke.ok).length;
  const failed = results.length - reachable;
  const manualVerificationRequired = results.filter(
    (item) => item.diagnostic.manualVerificationRequired
  ).length;
  const sourceInvalidConfirmed = results.filter(
    (item) => item.diagnostic.sourceInvalidConfirmed
  ).length;
  const diagnosticBreakdown = results.reduce((acc: Record<string, number>, item) => {
    const key = item.diagnostic.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
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
      manualVerificationRequired,
      sourceInvalidConfirmed,
      diagnosticBreakdown,
      pdfLike,
      htmlLike,
      expectedVerifiedHighPriorityExactSources: 11,
      smokePass: results.length === 11 && failed === 0,
      sourceRegistryPassWithManualReview:
        results.length === 11 && sourceInvalidConfirmed === 0,
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
