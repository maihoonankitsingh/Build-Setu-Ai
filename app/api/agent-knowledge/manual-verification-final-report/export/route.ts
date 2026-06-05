import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

const RECORDS_RELATIVE_PATH = "data/buildsetu-manual-verification-records/records.json";

const EXPECTED_MANUAL_SOURCES = [
  {
    sourceId: "india-karnataka-approval-authority-index",
    jurisdiction: "Karnataka",
    expectedTitle: "Karnataka Municipalities Model Building Bye-Laws 2017",
    expectedUrl:
      "https://www.dtcp.gov.in/sites/dtcp.gov.in/files/PDF/notificationsOrdersCirculars/notifications/model_building_bye_law.pdf",
  },
  {
    sourceId: "india-maharashtra-approval-authority-index",
    jurisdiction: "Maharashtra",
    expectedTitle: "Maharashtra Unified Development Control and Promotion Regulations",
    expectedUrl:
      "https://www.mmrda.maharashtra.gov.in/sites/default/files/2023-10/UDCPR_compressed_2.pdf",
  },
  {
    sourceId: "india-uttar-pradesh-approval-authority-index",
    jurisdiction: "Uttar Pradesh",
    expectedTitle: "Uttar Pradesh Housing and Urban Planning Department Bye Laws",
    expectedUrl: "https://awas.upsdc.gov.in/en/page/bye-laws",
  },
  {
    sourceId: "india-west-bengal-approval-authority-index",
    jurisdiction: "West Bengal",
    expectedTitle: "West Bengal Act and Rules - West Bengal Municipal Building Rules, 2007",
    expectedUrl: "https://udma.wb.gov.in/act_and_rules",
  },
];

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

function cleanText(value: any, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function countBy(items: any[], key: string) {
  return items.reduce((acc: Record<string, number>, item) => {
    const value = cleanText(item?.[key] || "unknown", 180);
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function getUnsafeReason(record: JsonObject) {
  const safety = (record?.safety || {}) as JsonObject;
  const reasons = [];

  if (safety?.sourceRegistryChanged === true) reasons.push("source_registry_changed");
  if (safety?.extractionAllowedChanged === true) reasons.push("extraction_unlocked");
  if (safety?.qaReadyAllowedChanged === true) reasons.push("qa_ready_unlocked");
  if (safety?.trustedMergeCandidateAllowedChanged === true) reasons.push("merge_candidate_unlocked");
  if (safety?.trustedKnowledgeWrite === true) reasons.push("trusted_knowledge_write");
  if (safety?.trustedMergeExecuted === true) reasons.push("trusted_merge_executed");

  return reasons;
}

function summarizeFinalReport(recordsRoot: JsonObject) {
  const records = asArray(recordsRoot?.records);
  const verifiedRecords = records.filter(
    (record) => cleanText(record?.decision, 180) === "verified_manual_browser_source"
  );

  const expectedSourceIds = EXPECTED_MANUAL_SOURCES.map((item) => item.sourceId);
  const verifiedSourceIds = verifiedRecords.map((record) => cleanText(record?.sourceId, 260));

  const missingSourceIds = expectedSourceIds.filter((sourceId) => !verifiedSourceIds.includes(sourceId));
  const unexpectedSourceIds = verifiedSourceIds.filter((sourceId) => !expectedSourceIds.includes(sourceId));
  const duplicateSourceIds = verifiedSourceIds.filter(
    (sourceId, index) => verifiedSourceIds.indexOf(sourceId) !== index
  );

  const unsafeRecords = records
    .map((record) => ({
      id: cleanText(record?.id, 320),
      sourceId: cleanText(record?.sourceId, 260),
      jurisdiction: cleanText(record?.jurisdiction, 160),
      reasons: getUnsafeReason(record),
    }))
    .filter((item) => item.reasons.length > 0);

  const expectedChecklist = EXPECTED_MANUAL_SOURCES.map((expected) => {
    const matched = verifiedRecords.find((record) => cleanText(record?.sourceId, 260) === expected.sourceId);
    const safety = (matched?.safety || {}) as JsonObject;

    return {
      sourceId: expected.sourceId,
      jurisdiction: expected.jurisdiction,
      expectedTitle: expected.expectedTitle,
      expectedUrl: expected.expectedUrl,
      recordFound: Boolean(matched),
      decision: cleanText(matched?.decision, 180),
      reviewerName: cleanText(matched?.reviewerName, 180),
      reviewedAt: cleanText(matched?.updatedAt || matched?.createdAt, 180),
      sourceRegistryChanged: safety?.sourceRegistryChanged === true,
      extractionAllowedChanged: safety?.extractionAllowedChanged === true,
      qaReadyAllowedChanged: safety?.qaReadyAllowedChanged === true,
      trustedMergeCandidateAllowedChanged: safety?.trustedMergeCandidateAllowedChanged === true,
      trustedKnowledgeWrite: safety?.trustedKnowledgeWrite === true,
      trustedMergeExecuted: safety?.trustedMergeExecuted === true,
    };
  });

  const finalPass =
    EXPECTED_MANUAL_SOURCES.length === 4 &&
    verifiedRecords.length === 4 &&
    missingSourceIds.length === 0 &&
    unexpectedSourceIds.length === 0 &&
    duplicateSourceIds.length === 0 &&
    unsafeRecords.length === 0;

  return {
    ok: true,
    phase: "46T-1",
    reportPolicy:
      "manual_verification_final_report_read_only_no_source_registry_change_no_extraction_no_qa_ready_no_merge_no_write",
    generatedAt: new Date().toISOString(),
    expectedManualBrowserVerification: EXPECTED_MANUAL_SOURCES.length,
    verifiedManualBrowserRecords: verifiedRecords.length,
    totalRecords: records.length,
    manualVerificationFinalPass: finalPass,
    missingSourceIds,
    unexpectedSourceIds,
    duplicateSourceIds,
    unsafeRecords,
    summary: {
      byDecision: countBy(records, "decision"),
      byJurisdiction: countBy(records, "jurisdiction"),
      sourceRegistryChangedRecords: unsafeRecords.filter((item) =>
        item.reasons.includes("source_registry_changed")
      ).length,
      extractionUnlocked: unsafeRecords.filter((item) => item.reasons.includes("extraction_unlocked")).length,
      qaReadyUnlocked: unsafeRecords.filter((item) => item.reasons.includes("qa_ready_unlocked")).length,
      mergeCandidateUnlocked: unsafeRecords.filter((item) =>
        item.reasons.includes("merge_candidate_unlocked")
      ).length,
      trustedKnowledgeWrite: unsafeRecords.filter((item) =>
        item.reasons.includes("trusted_knowledge_write")
      ).length,
      trustedMergeExecuted: unsafeRecords.filter((item) => item.reasons.includes("trusted_merge_executed")).length,
    },
    expectedChecklist,
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
  };
}

function toMarkdown(report: JsonObject) {
  const checklist = asArray(report.expectedChecklist);

  const lines = [
    "# Manual Browser Verification Final Handoff",
    "",
    `- Phase: ${report.phase}`,
    `- Generated At: ${report.generatedAt}`,
    `- Final Pass: ${report.manualVerificationFinalPass}`,
    `- Expected Manual Browser Verification: ${report.expectedManualBrowserVerification}`,
    `- Verified Manual Browser Records: ${report.verifiedManualBrowserRecords}`,
    `- Total Records: ${report.totalRecords}`,
    `- Missing Source IDs: ${asArray(report.missingSourceIds).length}`,
    `- Unexpected Source IDs: ${asArray(report.unexpectedSourceIds).length}`,
    `- Duplicate Source IDs: ${asArray(report.duplicateSourceIds).length}`,
    `- Unsafe Records: ${asArray(report.unsafeRecords).length}`,
    `- Extraction Unlocked: ${report.summary?.extractionUnlocked ?? 0}`,
    `- QA Ready Unlocked: ${report.summary?.qaReadyUnlocked ?? 0}`,
    `- Merge Candidate Unlocked: ${report.summary?.mergeCandidateUnlocked ?? 0}`,
    `- Trusted Knowledge Write: ${report.trustedKnowledgeWrite}`,
    `- Trusted Merge Executed: ${report.trustedMergeExecuted}`,
    "",
    "| Jurisdiction | Source ID | Record Found | Decision | Reviewer | Extraction Changed | QA Changed | Merge Candidate Changed | Trusted Write | Trusted Merge |",
    "|---|---|---:|---|---|---:|---:|---:|---:|---:|",
  ];

  for (const item of checklist) {
    lines.push(
      `| ${item.jurisdiction} | ${item.sourceId} | ${item.recordFound} | ${item.decision || "-"} | ${
        item.reviewerName || "-"
      } | ${item.extractionAllowedChanged} | ${item.qaReadyAllowedChanged} | ${
        item.trustedMergeCandidateAllowedChanged
      } | ${item.trustedKnowledgeWrite} | ${item.trustedMergeExecuted} |`
    );
  }

  lines.push("");
  lines.push("Safety note: this report is read-only and does not unlock extraction, QA-ready, merge candidate, or trusted knowledge write.");

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const format = cleanText(request.nextUrl.searchParams.get("format") || "json", 40).toLowerCase();

  const recordsRoot = await readJson(projectPath(RECORDS_RELATIVE_PATH), {
    ok: true,
    records: [],
  });

  const report = summarizeFinalReport(recordsRoot);

  if (format === "markdown" || format === "md") {
    return new NextResponse(toMarkdown(report), {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="manual-verification-final-handoff.md"',
      },
    });
  }

  return NextResponse.json(report);
}
