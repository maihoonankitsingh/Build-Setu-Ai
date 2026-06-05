import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, any>;

const PACKS_RELATIVE_PATH = "config/buildsetu-source-packs.json";
const WATCH_RELATIVE_PATH = "config/buildsetu-source-watch.sources.json";
const MANUAL_RECORDS_RELATIVE_PATH = "data/buildsetu-manual-verification-records/records.json";

const EXPECTED_STATE_COUNT = 28;
const EXPECTED_UT_COUNT = 8;

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

function sourceKey(source: JsonObject) {
  return `${cleanText(source?.id || source?.sourceId || "", 200)}|${cleanText(source?.url || source?.sourceUrl || "", 1400)}`;
}

function getAllPackSources(packs: JsonObject[]) {
  return packs.flatMap((pack) =>
    asArray(pack?.sources).map((source) => ({
      packId: cleanText(pack?.id || "", 200),
      packTitle: cleanText(pack?.title || "", 300),
      id: cleanText(source?.id || source?.sourceId || "", 240),
      title: cleanText(source?.title || source?.name || "", 300),
      url: cleanText(source?.url || source?.sourceUrl || "", 1400),
      domains: asArray(source?.domains || pack?.domains).map((domain) => cleanText(domain, 120)).filter(Boolean),
      authorityType: cleanText(source?.authorityType || "", 120),
      publisher: cleanText(source?.publisher || "", 300),
      jurisdiction: source?.jurisdiction || null,
      watch: source?.watch === true,
      reviewRequired: source?.reviewRequired !== false,
      mergePolicy: cleanText(source?.mergePolicy || "manual_review_required", 120),
      notes: cleanText(source?.notes || "", 1000),
      exactSourceStatus: cleanText(source?.exactSourceStatus || "", 160),
      exactSourceUrl: cleanText(source?.exactSourceUrl || "", 1400),
      exactSourceTitle: cleanText(source?.exactSourceTitle || "", 300),
      exactSourcePublisher: cleanText(source?.exactSourcePublisher || "", 300),
      exactSourceAuthorityType: cleanText(source?.exactSourceAuthorityType || "", 160),
      verificationStatus: cleanText(source?.verificationStatus || "", 160),
      verificationPriority: cleanText(source?.verificationPriority || "", 80),
      verificationNotes: cleanText(source?.verificationNotes || "", 1200),
      lastVerifiedAt: cleanText(source?.lastVerifiedAt || "", 120),
      verifiedBy: cleanText(source?.verifiedBy || "", 160),
      serverSmokeStatus: cleanText(source?.serverSmokeStatus || "", 160),
      serverSmokeDiagnosticStatus: cleanText(source?.serverSmokeDiagnosticStatus || "", 160),
      manualBrowserVerificationRequired: source?.manualBrowserVerificationRequired === true,
      manualVerificationStatus: cleanText(source?.manualVerificationStatus || "", 160),
      manualVerificationNotes: cleanText(source?.manualVerificationNotes || "", 1000),
      sourceInvalidConfirmed: source?.sourceInvalidConfirmed === true,
      extractionAllowed: source?.extractionAllowed === true,
      qaReadyAllowed: source?.qaReadyAllowed === true,
      trustedMergeCandidateAllowed: source?.trustedMergeCandidateAllowed === true,
      reviewedForExtraction: source?.reviewedForExtraction === true,
      trustedKnowledgeWrite: source?.trustedKnowledgeWrite === true,
      trustedMergeExecuted: source?.trustedMergeExecuted === true,
    }))
  );
}

function byDomain(sources: JsonObject[]) {
  const out: Record<string, number> = {};
  for (const source of sources) {
    for (const domain of asArray(source.domains)) {
      out[domain] = (out[domain] || 0) + 1;
    }
  }
  return out;
}

function duplicateKeys(sources: JsonObject[]) {
  const counts = new Map<string, number>();
  for (const source of sources) {
    const key = sourceKey(source);
    if (!key || key === "|") continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}

function isStateUtAuthorityIndex(source: JsonObject) {
  const id = cleanText(source?.id || "", 260);
  return id.startsWith("india-") && id.endsWith("-approval-authority-index");
}



function manualVerificationCompletionSummary(manualRoot: JsonObject, recordsRoot: JsonObject) {
  const manualItems = asArray(manualRoot?.items);
  const records = asArray(recordsRoot?.records);

  const requiredSourceIds = manualItems
    .filter((item) => item?.manualBrowserVerificationRequired === true)
    .map((item) => cleanText(item?.id || item?.sourceId || "", 260))
    .filter(Boolean);

  const verifiedRecords = records.filter(
    (record) => cleanText(record?.decision || "", 160) === "verified_manual_browser_source"
  );

  const verifiedSourceIds = verifiedRecords
    .map((record) => cleanText(record?.sourceId || "", 260))
    .filter(Boolean);

  const missingManualRecords = requiredSourceIds.filter(
    (sourceId) => !verifiedSourceIds.includes(sourceId)
  );

  const unexpectedManualRecords = verifiedSourceIds.filter(
    (sourceId) => !requiredSourceIds.includes(sourceId)
  );

  const duplicateManualRecords = verifiedSourceIds.filter(
    (sourceId, index) => verifiedSourceIds.indexOf(sourceId) !== index
  );

  const unsafeRecords = records.filter((record) => {
    const safety = (record?.safety || {}) as JsonObject;
    return (
      safety?.sourceRegistryChanged === true ||
      safety?.extractionAllowedChanged === true ||
      safety?.qaReadyAllowedChanged === true ||
      safety?.trustedMergeCandidateAllowedChanged === true ||
      safety?.trustedKnowledgeWrite === true ||
      safety?.trustedMergeExecuted === true
    );
  });

  return {
    requiredManualBrowserVerification: requiredSourceIds.length,
    verifiedManualBrowserRecords: verifiedRecords.length,
    coveredManualBrowserVerification: requiredSourceIds.length - missingManualRecords.length,
    remainingManualBrowserVerificationRecords: missingManualRecords.length,
    unexpectedManualRecords: unexpectedManualRecords.length,
    duplicateManualRecords: duplicateManualRecords.length,
    unsafeRecords: unsafeRecords.length,
    manualVerificationRecordPass:
      requiredSourceIds.length > 0 &&
      missingManualRecords.length === 0 &&
      unexpectedManualRecords.length === 0 &&
      duplicateManualRecords.length === 0 &&
      unsafeRecords.length === 0,
    requiredSourceIds,
    verifiedSourceIds,
    missingManualRecordSourceIds: missingManualRecords,
    unexpectedManualRecordSourceIds: unexpectedManualRecords,
    duplicateManualRecordSourceIds: duplicateManualRecords,
  };
}

function manualVerificationRecordsSummary(recordsRoot: JsonObject) {
  const records = asArray(recordsRoot?.records).map((record) => ({
    id: cleanText(record?.id || "", 320),
    sourceId: cleanText(record?.sourceId || "", 260),
    jurisdiction: cleanText(record?.jurisdiction || "", 160),
    exactSourceTitle: cleanText(record?.exactSourceTitle || "", 300),
    exactSourceUrl: cleanText(record?.exactSourceUrl || "", 1400),
    decision: cleanText(record?.decision || "", 160),
    reviewerName: cleanText(record?.reviewerName || "", 160),
    reviewerRole: cleanText(record?.reviewerRole || "", 160),
    createdAt: cleanText(record?.createdAt || "", 120),
    updatedAt: cleanText(record?.updatedAt || "", 120),
    sourceRegistryChanged: record?.safety?.sourceRegistryChanged === true,
    extractionAllowedChanged: record?.safety?.extractionAllowedChanged === true,
    qaReadyAllowedChanged: record?.safety?.qaReadyAllowedChanged === true,
    trustedMergeCandidateAllowedChanged:
      record?.safety?.trustedMergeCandidateAllowedChanged === true,
    trustedKnowledgeWrite: record?.trustedKnowledgeWrite === true,
    trustedMergeExecuted: record?.trustedMergeExecuted === true,
  }));

  const byDecision = records.reduce((acc: Record<string, number>, record) => {
    const key = record.decision || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byJurisdiction = records.reduce((acc: Record<string, number>, record) => {
    const key = record.jurisdiction || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const unsafeRecords = records.filter(
    (record) =>
      record.sourceRegistryChanged ||
      record.extractionAllowedChanged ||
      record.qaReadyAllowedChanged ||
      record.trustedMergeCandidateAllowedChanged ||
      record.trustedKnowledgeWrite ||
      record.trustedMergeExecuted
  );

  return {
    totalRecords: records.length,
    byDecision,
    byJurisdiction,
    unsafeRecords: unsafeRecords.length,
    trustedKnowledgeWrite: records.filter((record) => record.trustedKnowledgeWrite).length,
    trustedMergeExecuted: records.filter((record) => record.trustedMergeExecuted).length,
    extractionUnlocked: records.filter((record) => record.extractionAllowedChanged).length,
    qaReadyUnlocked: records.filter((record) => record.qaReadyAllowedChanged).length,
    mergeCandidateUnlocked: records.filter(
      (record) => record.trustedMergeCandidateAllowedChanged
    ).length,
    latestRecords: records.slice(-10).reverse(),
  };
}

function manualVerificationSummary(sources: JsonObject[]) {
  const items = sources.filter((source) =>
    source.manualBrowserVerificationRequired === true ||
    source.manualVerificationStatus ||
    source.serverSmokeStatus ||
    source.serverSmokeDiagnosticStatus
  );

  const byManualVerificationStatus = items.reduce((acc: Record<string, number>, source) => {
    const key = cleanText(source.manualVerificationStatus || "unknown", 120);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byServerSmokeDiagnosticStatus = items.reduce((acc: Record<string, number>, source) => {
    const key = cleanText(source.serverSmokeDiagnosticStatus || "unknown", 120);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalManualVerificationItems: items.length,
    manualBrowserVerificationRequired: items.filter(
      (source) => source.manualBrowserVerificationRequired === true
    ).length,
    pendingManualBrowserVerification: items.filter(
      (source) => source.manualVerificationStatus === "pending_manual_browser_verification"
    ).length,
    sourceInvalidConfirmed: items.filter(
      (source) => source.sourceInvalidConfirmed === true
    ).length,
    extractionAllowed: items.filter((source) => source.extractionAllowed === true).length,
    qaReadyAllowed: items.filter((source) => source.qaReadyAllowed === true).length,
    trustedMergeCandidateAllowed: items.filter(
      (source) => source.trustedMergeCandidateAllowed === true
    ).length,
    trustedKnowledgeWrite: items.filter(
      (source) => source.trustedKnowledgeWrite === true
    ).length,
    trustedMergeExecuted: items.filter(
      (source) => source.trustedMergeExecuted === true
    ).length,
    byManualVerificationStatus,
    byServerSmokeDiagnosticStatus,
    items: items.map((source) => ({
      id: source.id,
      jurisdiction: source.jurisdiction?.stateOrUnionTerritory || "",
      exactSourceTitle: source.exactSourceTitle || source.title || "",
      exactSourceUrl: source.exactSourceUrl || source.url || "",
      serverSmokeStatus: source.serverSmokeStatus || "",
      serverSmokeDiagnosticStatus: source.serverSmokeDiagnosticStatus || "",
      manualBrowserVerificationRequired: source.manualBrowserVerificationRequired === true,
      manualVerificationStatus: source.manualVerificationStatus || "",
      sourceInvalidConfirmed: source.sourceInvalidConfirmed === true,
      extractionAllowed: source.extractionAllowed === true,
      qaReadyAllowed: source.qaReadyAllowed === true,
      trustedMergeCandidateAllowed: source.trustedMergeCandidateAllowed === true,
      trustedKnowledgeWrite: source.trustedKnowledgeWrite === true,
      trustedMergeExecuted: source.trustedMergeExecuted === true,
    })),
  };
}

function stateUtTrackerSummary(sources: JsonObject[]) {
  const items = sources.filter(isStateUtAuthorityIndex);

  const byVerificationStatus = items.reduce((acc: Record<string, number>, source) => {
    const key = cleanText(source?.verificationStatus || "missing", 160) || "missing";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byExactSourceStatus = items.reduce((acc: Record<string, number>, source) => {
    const key = cleanText(source?.exactSourceStatus || "missing", 160) || "missing";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byPriority = items.reduce((acc: Record<string, number>, source) => {
    const key = cleanText(source?.verificationPriority || "missing", 80) || "missing";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const missingTracker = items.filter((source) =>
    !cleanText(source?.exactSourceStatus || "", 160) ||
    !cleanText(source?.verificationStatus || "", 160) ||
    source?.reviewRequired !== true ||
    source?.mergePolicy !== "manual_review_required" ||
    source?.trustedKnowledgeWrite !== false ||
    source?.trustedMergeExecuted !== false
  );

  const pendingExactSource = items.filter((source) =>
    source?.exactSourceStatus === "pending_exact_building_bye_law_source"
  );

  const verifiedExactSource = items.filter((source) =>
    source?.verificationStatus === "verified_exact_source"
  );

  const highPriorityPending = items.filter((source) =>
    source?.verificationPriority === "high" &&
    source?.verificationStatus !== "verified_exact_source"
  );

  return {
    totalStateUtAuthorityIndexSources: items.length,
    pendingExactSource: pendingExactSource.length,
    verifiedExactSource: verifiedExactSource.length,
    highPriorityPending: highPriorityPending.length,
    missingTracker: missingTracker.length,
    byVerificationStatus,
    byExactSourceStatus,
    byPriority,
  };
}

export async function GET() {
  const packsData = await readJson(projectPath(PACKS_RELATIVE_PATH), { packs: [] });
  const watchData = await readJson(projectPath(WATCH_RELATIVE_PATH), { sources: [] });

  const packs = asArray(packsData?.packs);
  const watchSources = asArray(watchData?.sources);

  const allPackSources = getAllPackSources(packs);
  const allIndiaPack = packs.find((pack) => pack?.id === "all_india_state_ut_authority_index_pack");
  const allIndiaSources = getAllPackSources(allIndiaPack ? [allIndiaPack] : []);

  const states = allIndiaSources.filter((source) => source?.jurisdiction?.jurisdictionType === "state");
  const unionTerritories = allIndiaSources.filter((source) => source?.jurisdiction?.jurisdictionType === "union_territory");

  const exactSourceCandidates = allPackSources.filter((source) => !String(source.id || "").includes("approval-authority-index"));
  const authorityIndexCandidates = allPackSources.filter((source) => String(source.id || "").includes("approval-authority-index"));

  const unsafeSources = allPackSources.filter((source) =>
    source.mergePolicy !== "manual_review_required" ||
    source.reviewRequired === false
  );

  return NextResponse.json({
    ok: true,
    phase: "46D-1",
    auditPolicy: "read_only_source_coverage_audit_no_runtime_queue_no_merge_no_write",
    trustedMergeEnabled: false,
    trustedKnowledgeWrite: false,
    trustedKnowledgeChanged: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false,
    files: {
      sourcePacks: PACKS_RELATIVE_PATH,
      sourceWatch: WATCH_RELATIVE_PATH,
    },
    summary: {
      packCount: packs.length,
      totalPackSources: allPackSources.length,
      watchSourceCount: watchSources.length,
      exactSourceCandidates: exactSourceCandidates.length,
      authorityIndexCandidates: authorityIndexCandidates.length,
      allIndiaAuthorityIndex: {
        exists: Boolean(allIndiaPack),
        sourceCount: allIndiaSources.length,
        states: states.length,
        unionTerritories: unionTerritories.length,
        expectedStates: EXPECTED_STATE_COUNT,
        expectedUnionTerritories: EXPECTED_UT_COUNT,
        coveragePass:
          Boolean(allIndiaPack) &&
          states.length === EXPECTED_STATE_COUNT &&
          unionTerritories.length === EXPECTED_UT_COUNT &&
          allIndiaSources.length === EXPECTED_STATE_COUNT + EXPECTED_UT_COUNT,
      },
      safety: {
        unsafeSources: unsafeSources.length,
        duplicatePackSourceKeys: duplicateKeys(allPackSources).length,
        duplicateWatchSourceKeys: duplicateKeys(watchSources).length,
      },
      stateUtVerificationTracker: stateUtTrackerSummary(allPackSources),
      manualVerification: manualVerificationSummary(allPackSources),
      manualVerificationRecords: manualVerificationRecordsSummary(
        await readJson(projectPath(MANUAL_RECORDS_RELATIVE_PATH), { records: [] })
      ),
      manualVerificationCompletion: manualVerificationCompletionSummary(
        manualVerificationSummary(allPackSources),
        await readJson(projectPath(MANUAL_RECORDS_RELATIVE_PATH), { records: [] })
      ),
    },
    domainCoverage: byDomain(allPackSources),
    packs: packs.map((pack) => ({
      id: cleanText(pack?.id || "", 200),
      title: cleanText(pack?.title || "", 300),
      domains: asArray(pack?.domains).map((domain) => cleanText(domain, 120)).filter(Boolean),
      sourceCount: asArray(pack?.sources).length,
    })),
    allIndiaCoverage: {
      states: states.map((source) => ({
        id: source.id,
        name: source.jurisdiction?.stateOrUnionTerritory,
        watch: source.watch,
        reviewRequired: source.reviewRequired,
        mergePolicy: source.mergePolicy,
      })),
      unionTerritories: unionTerritories.map((source) => ({
        id: source.id,
        name: source.jurisdiction?.stateOrUnionTerritory,
        watch: source.watch,
        reviewRequired: source.reviewRequired,
        mergePolicy: source.mergePolicy,
      })),
    },
    safetyBoundary: {
      mode: "read_only_source_coverage_audit",
      trustedMergeEnabled: false,
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
    },
  });
}
