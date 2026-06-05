import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

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

function cleanText(value: any, max = 2000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function boolValue(value: any) {
  return value === true;
}

function isAuthorityIndexSource(source: JsonObject) {
  const id = cleanText(source?.id || "", 260);
  return id.startsWith("india-") && id.endsWith("-approval-authority-index");
}

function getAllPackSources(packsRoot: JsonObject) {
  return asArray(packsRoot?.packs).flatMap((pack) =>
    asArray(pack?.sources).map((source) => ({
      packId: cleanText(pack?.id || "", 220),
      packTitle: cleanText(pack?.title || "", 300),
      id: cleanText(source?.id || "", 260),
      title: cleanText(source?.title || "", 300),
      url: cleanText(source?.url || "", 1400),
      domains: asArray(source?.domains).map((item) => cleanText(item, 120)).filter(Boolean),
      jurisdictionType: cleanText(source?.jurisdiction?.jurisdictionType || "", 120),
      jurisdiction: cleanText(source?.jurisdiction?.stateOrUnionTerritory || "", 180),
      exactSourceTitle: cleanText(source?.exactSourceTitle || source?.title || "", 400),
      exactSourceUrl: cleanText(source?.exactSourceUrl || source?.url || "", 1600),
      exactSourcePublisher: cleanText(source?.exactSourcePublisher || source?.publisher || "", 300),
      exactSourceAuthorityType: cleanText(source?.exactSourceAuthorityType || source?.authorityType || "", 160),
      exactSourceStatus: cleanText(source?.exactSourceStatus || "", 180),
      matchedExactSourceId: cleanText(source?.matchedExactSourceId || "", 260),
      verificationStatus: cleanText(source?.verificationStatus || "", 180),
      verificationPriority: cleanText(source?.verificationPriority || "", 120),
      serverSmokeStatus: cleanText(source?.serverSmokeStatus || "", 180),
      serverSmokeDiagnosticStatus: cleanText(source?.serverSmokeDiagnosticStatus || "", 180),
      manualBrowserVerificationRequired: boolValue(source?.manualBrowserVerificationRequired),
      manualVerificationStatus: cleanText(source?.manualVerificationStatus || "", 180),
      manualVerificationNotes: cleanText(source?.manualVerificationNotes || "", 1200),
      sourceInvalidConfirmed: boolValue(source?.sourceInvalidConfirmed),
      extractionAllowed: boolValue(source?.extractionAllowed),
      qaReadyAllowed: boolValue(source?.qaReadyAllowed),
      trustedMergeCandidateAllowed: boolValue(source?.trustedMergeCandidateAllowed),
      reviewedForExtraction: boolValue(source?.reviewedForExtraction),
      reviewRequired: boolValue(source?.reviewRequired),
      mergePolicy: cleanText(source?.mergePolicy || "", 180),
      trustedKnowledgeWrite: boolValue(source?.trustedKnowledgeWrite),
      trustedMergeExecuted: boolValue(source?.trustedMergeExecuted),
    }))
  );
}

function getManualVerificationItems(sources: JsonObject[]) {
  return sources
    .filter(isAuthorityIndexSource)
    .filter(
      (source) =>
        source.manualBrowserVerificationRequired === true ||
        Boolean(source.manualVerificationStatus) ||
        Boolean(source.serverSmokeStatus) ||
        Boolean(source.serverSmokeDiagnosticStatus)
    )
    .sort((a, b) => cleanText(a.jurisdiction).localeCompare(cleanText(b.jurisdiction)));
}

function countBy(items: JsonObject[], key: string) {
  return items.reduce((acc: Record<string, number>, item) => {
    const value = cleanText(item?.[key] || "unknown", 160);
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function buildChecklistPayload(items: JsonObject[]) {
  const now = new Date().toISOString();

  return {
    ok: true,
    phase: "46M-1",
    checklistPolicy:
      "read_only_manual_verification_checklist_no_extraction_no_qa_ready_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    exportedAt: now,
    summary: {
      totalManualVerificationItems: items.length,
      manualBrowserVerificationRequired: items.filter(
        (item) => item.manualBrowserVerificationRequired === true
      ).length,
      pendingManualBrowserVerification: items.filter(
        (item) => item.manualVerificationStatus === "pending_manual_browser_verification"
      ).length,
      sourceInvalidConfirmed: items.filter((item) => item.sourceInvalidConfirmed === true).length,
      extractionAllowed: items.filter((item) => item.extractionAllowed === true).length,
      qaReadyAllowed: items.filter((item) => item.qaReadyAllowed === true).length,
      trustedMergeCandidateAllowed: items.filter(
        (item) => item.trustedMergeCandidateAllowed === true
      ).length,
      trustedKnowledgeWrite: items.filter((item) => item.trustedKnowledgeWrite === true).length,
      trustedMergeExecuted: items.filter((item) => item.trustedMergeExecuted === true).length,
      byManualVerificationStatus: countBy(items, "manualVerificationStatus"),
      byServerSmokeDiagnosticStatus: countBy(items, "serverSmokeDiagnosticStatus"),
    },
    checklist: items.map((item, index) => ({
      index: index + 1,
      id: item.id,
      jurisdiction: item.jurisdiction,
      jurisdictionType: item.jurisdictionType,
      exactSourceTitle: item.exactSourceTitle,
      exactSourceUrl: item.exactSourceUrl,
      exactSourcePublisher: item.exactSourcePublisher,
      exactSourceAuthorityType: item.exactSourceAuthorityType,
      matchedExactSourceId: item.matchedExactSourceId,
      verificationStatus: item.verificationStatus,
      verificationPriority: item.verificationPriority,
      serverSmokeStatus: item.serverSmokeStatus,
      serverSmokeDiagnosticStatus: item.serverSmokeDiagnosticStatus,
      manualBrowserVerificationRequired: item.manualBrowserVerificationRequired,
      manualVerificationStatus: item.manualVerificationStatus,
      manualVerificationNotes: item.manualVerificationNotes,
      sourceInvalidConfirmed: item.sourceInvalidConfirmed,
      extractionAllowed: item.extractionAllowed,
      qaReadyAllowed: item.qaReadyAllowed,
      trustedMergeCandidateAllowed: item.trustedMergeCandidateAllowed,
      trustedKnowledgeWrite: item.trustedKnowledgeWrite,
      trustedMergeExecuted: item.trustedMergeExecuted,
      checklistSteps: [
        "Open exact source URL manually in browser.",
        "Confirm source is official government/authority source.",
        "Confirm document/page title matches registry title.",
        "Confirm URL is reachable outside server-side smoke limitation.",
        "Do not extract regulatory facts until manual verification is recorded.",
        "Do not mark QA-ready or merge-ready in this checklist phase.",
      ],
      requiredReviewerDecision: [
        "verified_manual_browser_source",
        "replace_with_better_official_source",
        "mark_source_invalid_after_review",
      ],
    })),
  };
}

function mdEscape(value: any) {
  return cleanText(value, 2000).replace(/\|/g, "\\|");
}

function toMarkdown(payload: JsonObject) {
  const lines: string[] = [];

  lines.push("# Manual Verification Checklist Export");
  lines.push("");
  lines.push(`- Phase: ${payload.phase}`);
  lines.push(`- Exported At: ${payload.exportedAt}`);
  lines.push(`- Policy: ${payload.checklistPolicy}`);
  lines.push(`- Total Manual Verification Items: ${payload.summary.totalManualVerificationItems}`);
  lines.push(`- Pending Manual Browser Verification: ${payload.summary.pendingManualBrowserVerification}`);
  lines.push(`- Source Invalid Confirmed: ${payload.summary.sourceInvalidConfirmed}`);
  lines.push(`- Extraction Allowed: ${payload.summary.extractionAllowed}`);
  lines.push(`- QA Ready Allowed: ${payload.summary.qaReadyAllowed}`);
  lines.push(`- Merge Candidate Allowed: ${payload.summary.trustedMergeCandidateAllowed}`);
  lines.push(`- Trusted Knowledge Write: ${payload.trustedKnowledgeWrite}`);
  lines.push(`- Trusted Merge Executed: ${payload.trustedMergeExecuted}`);
  lines.push("");

  lines.push("## Diagnostic Breakdown");
  lines.push("");
  lines.push("### Manual Verification Status");
  lines.push("");
  for (const [key, value] of Object.entries(payload.summary.byManualVerificationStatus || {})) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push("");
  lines.push("### Server Smoke Diagnostic Status");
  lines.push("");
  for (const [key, value] of Object.entries(payload.summary.byServerSmokeDiagnosticStatus || {})) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push("");
  lines.push("## Checklist Items");
  lines.push("");

  if (!payload.checklist.length) {
    lines.push("No manual verification items found.");
    return lines.join("\n") + "\n";
  }

  lines.push(
    "| # | Jurisdiction | Diagnostic | Manual Status | Exact Source Title | Exact Source URL | Extraction Allowed | QA Ready Allowed | Merge Candidate Allowed |"
  );
  lines.push(
    "|---:|---|---|---|---|---|---:|---:|---:|"
  );

  for (const item of payload.checklist) {
    lines.push(
      `| ${item.index} | ${mdEscape(item.jurisdiction)} | ${mdEscape(
        item.serverSmokeDiagnosticStatus
      )} | ${mdEscape(item.manualVerificationStatus)} | ${mdEscape(
        item.exactSourceTitle
      )} | ${mdEscape(item.exactSourceUrl)} | ${item.extractionAllowed} | ${
        item.qaReadyAllowed
      } | ${item.trustedMergeCandidateAllowed} |`
    );
  }

  lines.push("");
  lines.push("## Required Manual Steps");
  lines.push("");
  lines.push("1. Open each exact source URL manually in browser.");
  lines.push("2. Confirm official authority/domain and document title.");
  lines.push("3. Record reviewer decision separately.");
  lines.push("4. Keep extraction, QA-ready, and trusted merge blocked until verification is complete.");

  return lines.join("\n") + "\n";
}

export async function GET(request: NextRequest) {
  const format = cleanText(request.nextUrl.searchParams.get("format") || "json", 20).toLowerCase();

  const packs = await readJson(projectPath(PACKS_RELATIVE_PATH), { packs: [] });
  const allSources = getAllPackSources(packs);
  const items = getManualVerificationItems(allSources);
  const payload = buildChecklistPayload(items);

  if (format === "md" || format === "markdown") {
    return new NextResponse(toMarkdown(payload), {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": "attachment; filename=manual-verification-checklist.md",
      },
    });
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-disposition": "attachment; filename=manual-verification-checklist.json",
    },
  });
}
