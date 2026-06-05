"use client";

import { useEffect, useState } from "react";

type AuditData = {
  ok: boolean;
  phase: string;
  auditPolicy: string;
  trustedMergeEnabled: boolean;
  trustedKnowledgeWrite: boolean;
  trustedKnowledgeChanged: boolean;
  trustedMergeExecuted: boolean;
  mergeActionAvailable: boolean;
  summary: {
    packCount: number;
    totalPackSources: number;
    watchSourceCount: number;
    exactSourceCandidates: number;
    authorityIndexCandidates: number;
    allIndiaAuthorityIndex: {
      exists: boolean;
      sourceCount: number;
      states: number;
      unionTerritories: number;
      expectedStates: number;
      expectedUnionTerritories: number;
      coveragePass: boolean;
    };
    safety: {
      unsafeSources: number;
      duplicatePackSourceKeys: number;
      duplicateWatchSourceKeys: number;
    };
    stateUtVerificationTracker?: {
      totalStateUtAuthorityIndexSources: number;
      pendingExactSource: number;
      verifiedExactSource: number;
      highPriorityPending: number;
      missingTracker: number;
      byVerificationStatus: Record<string, number>;
      byExactSourceStatus: Record<string, number>;
      byPriority: Record<string, number>;
    };
    manualVerification?: {
      totalManualVerificationItems: number;
      manualBrowserVerificationRequired: number;
      pendingManualBrowserVerification: number;
      sourceInvalidConfirmed: number;
      extractionAllowed: number;
      qaReadyAllowed: number;
      trustedMergeCandidateAllowed: number;
      trustedKnowledgeWrite: number;
      trustedMergeExecuted: number;
      byManualVerificationStatus: Record<string, number>;
      byServerSmokeDiagnosticStatus: Record<string, number>;
      items: Array<{
        id: string;
        jurisdiction: string;
        exactSourceTitle: string;
        exactSourceUrl: string;
        serverSmokeStatus: string;
        serverSmokeDiagnosticStatus: string;
        manualBrowserVerificationRequired: boolean;
        manualVerificationStatus: string;
        sourceInvalidConfirmed: boolean;
        extractionAllowed: boolean;
        qaReadyAllowed: boolean;
        trustedMergeCandidateAllowed: boolean;
        trustedKnowledgeWrite: boolean;
        trustedMergeExecuted: boolean;
      }>;
    };
  };
  domainCoverage: Record<string, number>;
  packs: Array<{
    id: string;
    title: string;
    domains: string[];
    sourceCount: number;
  }>;
  allIndiaCoverage: {
    states: Array<{
      id: string;
      name: string;
      watch: boolean;
      reviewRequired: boolean;
      mergePolicy: string;
    }>;
    unionTerritories: Array<{
      id: string;
      name: string;
      watch: boolean;
      reviewRequired: boolean;
      mergePolicy: string;
    }>;
  };
};

export default function SourceCoverageAuditClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<AuditData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAudit() {
      try {
        const res = await fetch("/api/agent-knowledge/source-coverage-audit", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Unable to load source coverage audit.");
        }

        if (mounted) setAudit(json);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Unable to load source coverage audit.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAudit();

    return () => {
      mounted = false;
    };
  }, []);

  const allIndia = audit?.summary?.allIndiaAuthorityIndex;
  const tracker = audit?.summary?.stateUtVerificationTracker || {
    totalStateUtAuthorityIndexSources: 0,
    pendingExactSource: 0,
    verifiedExactSource: 0,
    highPriorityPending: 0,
    missingTracker: 0,
    byVerificationStatus: {},
    byExactSourceStatus: {},
    byPriority: {},
  };

  const manualVerification = audit?.summary?.manualVerification || {
    totalManualVerificationItems: 0,
    manualBrowserVerificationRequired: 0,
    pendingManualBrowserVerification: 0,
    sourceInvalidConfirmed: 0,
    extractionAllowed: 0,
    qaReadyAllowed: 0,
    trustedMergeCandidateAllowed: 0,
    trustedKnowledgeWrite: 0,
    trustedMergeExecuted: 0,
    byManualVerificationStatus: {},
    byServerSmokeDiagnosticStatus: {},
    items: [],
  };

  const manualRecords =
    (audit?.summary as any)?.manualVerificationRecords || {
      totalRecords: 0,
      byDecision: {},
      byJurisdiction: {},
      unsafeRecords: 0,
      trustedKnowledgeWrite: 0,
      trustedMergeExecuted: 0,
      extractionUnlocked: 0,
      qaReadyUnlocked: 0,
      mergeCandidateUnlocked: 0,
      latestRecords: [],
    };
  const safety = audit?.summary?.safety || {
    unsafeSources: 0,
    duplicatePackSourceKeys: 0,
    duplicateWatchSourceKeys: 0,
  };

  const manualCompletion =
    (audit?.summary as any)?.manualVerificationCompletion || {
      requiredManualBrowserVerification: 0,
      verifiedManualBrowserRecords: 0,
      coveredManualBrowserVerification: 0,
      remainingManualBrowserVerificationRecords: 0,
      unexpectedManualRecords: 0,
      duplicateManualRecords: 0,
      unsafeRecords: 0,
      manualVerificationRecordPass: false,
      missingManualRecordSourceIds: [],
      unexpectedManualRecordSourceIds: [],
      duplicateManualRecordSourceIds: [],
    };


  return (
    <main style={{ padding: 32, maxWidth: 1280, margin: "0 auto" }}>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 22,
          padding: 18,
          marginBottom: 18,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Source Verification Workflow Links
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <WorkflowLink href="/workspace/source-coverage-audit" label="Source Coverage Audit" />
          <WorkflowLink href="/workspace/exact-source-url-smoke" label="Exact Source URL Smoke" />
          <WorkflowLink href="/workspace/manual-verification-checklist" label="Manual Verification Checklist" />
          <WorkflowLink href="/workspace/manual-verification-records" label="Manual Verification Records" />
        </div>
      </section>

      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Phase 46H-3
        </p>
        <h1 style={{ margin: "6px 0 8px", fontSize: 32, lineHeight: 1.15 }}>
          Source Coverage Audit
        </h1>
        <p style={{ margin: 0, color: "#475569", maxWidth: 880 }}>
          Read-only audit view for official source packs, watch sources, domain coverage,
          and India State/UT authority index coverage. No runtime queue, no extraction draft,
          no trusted merge, and no knowledge write is available here.
        </p>
      </div>

      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          background: "#f8fafc",
        }}
      >
        <strong>Safety boundary:</strong>{" "}
        <span>
          trustedMergeEnabled=false · trustedKnowledgeWrite=false ·
          trustedMergeExecuted=false · mergeActionAvailable=false
        </span>
      </section>

      {loading && <p>Loading coverage audit...</p>}

      {error && (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 12,
            padding: 16,
          }}
        >
          {error}
        </div>
      )}

      {audit && (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <Metric label="Source Packs" value={audit.summary.packCount} />
            <Metric label="Pack Sources" value={audit.summary.totalPackSources} />
            <Metric label="Watch Sources" value={audit.summary.watchSourceCount} />
            <Metric label="Exact Sources" value={audit.summary.exactSourceCandidates} />
            <Metric label="Authority Index" value={audit.summary.authorityIndexCandidates} />
            <Metric label="Unsafe Sources" value={safety.unsafeSources} />
          </section>

          <section
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
              All India State/UT Coverage
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <Metric label="Coverage Pass" value={allIndia?.coveragePass ? "YES" : "NO"} />
              <Metric label="States" value={`${allIndia?.states || 0}/${allIndia?.expectedStates || 28}`} />
              <Metric label="Union Territories" value={`${allIndia?.unionTerritories || 0}/${allIndia?.expectedUnionTerritories || 8}`} />
              <Metric label="Index Sources" value={allIndia?.sourceCount || 0} />
            </div>
          </section>

          <section
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
              Exact Source Verification Tracker
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Metric label="State/UT Trackers" value={tracker.totalStateUtAuthorityIndexSources} />
              <Metric label="Pending Exact Source" value={tracker.pendingExactSource} />
              <Metric label="Verified Exact Source" value={tracker.verifiedExactSource} />
              <Metric label="High Priority Pending" value={tracker.highPriorityPending} />
              <Metric label="Missing Tracker" value={tracker.missingTracker} />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <SmallBreakdown title="Verification Status" data={tracker.byVerificationStatus} />
              <SmallBreakdown title="Exact Source Status" data={tracker.byExactSourceStatus} />
              <SmallBreakdown title="Priority" data={tracker.byPriority} />
            </div>
          </section>

          <section
            style={{
              border: "1px solid #fed7aa",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background: "#fff7ed",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>
                  Manual Verification Queue
                </h2>
                <p style={{ margin: 0, color: "#9a3412" }}>
                  Blocked exact sources that need browser/manual verification before extraction.
                </p>
              </div>
              <span
                style={{
                  borderRadius: 999,
                  padding: "8px 12px",
                  background: "#ffedd5",
                  color: "#9a3412",
                  fontWeight: 800,
                  height: "fit-content",
                }}
              >
                {manualVerification.pendingManualBrowserVerification} Pending
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Metric
                label="Manual Items"
                value={manualVerification.totalManualVerificationItems}
              />
              <Metric
                label="Browser Verification"
                value={manualVerification.manualBrowserVerificationRequired}
              />
              <Metric
                label="Invalid Confirmed"
                value={manualVerification.sourceInvalidConfirmed}
              />
              <Metric
                label="Extraction Allowed"
                value={manualVerification.extractionAllowed}
              />
              <Metric
                label="QA Ready Allowed"
                value={manualVerification.qaReadyAllowed}
              />
              <Metric
                label="Merge Candidate Allowed"
                value={manualVerification.trustedMergeCandidateAllowed}
              />
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
              <SmallBreakdown
                title="Manual Verification Status"
                data={manualVerification.byManualVerificationStatus}
              />
              <SmallBreakdown
                title="Server Smoke Diagnostic"
                data={manualVerification.byServerSmokeDiagnosticStatus}
              />
            </div>

            <Panel>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    Manual Verification Completion
                  </p>
                  <h2 style={{ margin: 0, color: "#0f172a", fontSize: 22 }}>
                    Manual Verification Record Pass
                  </h2>
                  <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 }}>
                    Read-only completion summary. Manual records are checked against the browser verification queue.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <a
                      href="/api/agent-knowledge/manual-verification-final-report/export?format=json"
                      download
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        padding: "10px 12px",
                        background: "#0f172a",
                        color: "#ffffff",
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 800,
                        border: "1px solid #0f172a",
                      }}
                    >
                      Download Final Report JSON
                    </a>
                    <a
                      href="/api/agent-knowledge/manual-verification-final-report/export?format=markdown"
                      download
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        padding: "10px 12px",
                        background: "#ffffff",
                        color: "#0f172a",
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: 800,
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      Download Final Report Markdown
                    </a>
                  </div>
                </div>

                <span
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    background: manualCompletion.manualVerificationRecordPass ? "#f0fdf4" : "#fef2f2",
                    color: manualCompletion.manualVerificationRecordPass ? "#166534" : "#991b1b",
                    border: `1px solid ${
                      manualCompletion.manualVerificationRecordPass ? "#bbf7d0" : "#fecaca"
                    }`,
                  }}
                >
                  {manualCompletion.manualVerificationRecordPass ? "Completion Pass" : "Completion Blocked"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <Metric
                  label="Required Manual Checks"
                  value={manualCompletion.requiredManualBrowserVerification}
                />
                <Metric
                  label="Verified Manual Records"
                  value={manualCompletion.verifiedManualBrowserRecords}
                />
                <Metric
                  label="Covered Manual Checks"
                  value={manualCompletion.coveredManualBrowserVerification}
                />
                <Metric
                  label="Remaining Manual Records"
                  value={manualCompletion.remainingManualBrowserVerificationRecords}
                />
                <Metric label="Unexpected Records" value={manualCompletion.unexpectedManualRecords} />
                <Metric label="Duplicate Records" value={manualCompletion.duplicateManualRecords} />
                <Metric label="Unsafe Records" value={manualCompletion.unsafeRecords} />
              </div>

              {manualCompletion.manualVerificationRecordPass ? (
                <p style={{ margin: "16px 0 0", color: "#166534", fontSize: 14, fontWeight: 700 }}>
                  All required manual browser verification records are present and safe.
                </p>
              ) : (
                <div style={{ marginTop: 16, color: "#991b1b", fontSize: 13, lineHeight: 1.7 }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>Completion issues found.</p>
                  <p style={{ margin: "6px 0 0" }}>
                    Missing: {(manualCompletion.missingManualRecordSourceIds || []).join(", ") || "None"}
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    Unexpected: {(manualCompletion.unexpectedManualRecordSourceIds || []).join(", ") || "None"}
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    Duplicate: {(manualCompletion.duplicateManualRecordSourceIds || []).join(", ") || "None"}
                  </p>
                </div>
              )}
            </Panel>

            <Panel>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 6px",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Manual Verification Records
                  </p>
                  <h2 style={{ margin: 0, color: "#0f172a" }}>
                    Separate Manual Records Audit
                  </h2>
                  <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.7 }}>
                    Manual records separate file me save hote hain. Ye source registry,
                    extraction, QA-ready, ya trusted merge ko unlock nahi karte.
                  </p>
                </div>
                <span
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: manualRecords.unsafeRecords === 0 ? "#f0fdf4" : "#fef2f2",
                    color: manualRecords.unsafeRecords === 0 ? "#166534" : "#991b1b",
                    fontSize: 12,
                    fontWeight: 900,
                    border: `1px solid ${
                      manualRecords.unsafeRecords === 0 ? "#bbf7d0" : "#fecaca"
                    }`,
                  }}
                >
                  {manualRecords.unsafeRecords === 0 ? "Safety Pass" : "Unsafe Records Found"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <Metric label="Total Records" value={manualRecords.totalRecords} />
                <Metric label="Unsafe Records" value={manualRecords.unsafeRecords} />
                <Metric label="Extraction Unlocked" value={manualRecords.extractionUnlocked} />
                <Metric label="QA Ready Unlocked" value={manualRecords.qaReadyUnlocked} />
                <Metric label="Merge Candidate Unlocked" value={manualRecords.mergeCandidateUnlocked} />
                <Metric label="Trusted Write Records" value={manualRecords.trustedKnowledgeWrite} />
                <Metric label="Trusted Merge Records" value={manualRecords.trustedMergeExecuted} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <SmallBreakdown title="Records By Decision" data={manualRecords.byDecision} />
                <SmallBreakdown title="Records By Jurisdiction" data={manualRecords.byJurisdiction} />
              </div>

              {(manualRecords.latestRecords || []).length === 0 ? (
                <p style={{ margin: "18px 0 0", color: "#64748b" }}>
                  No separate manual records saved yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
                  {(manualRecords.latestRecords || []).map((record: any) => (
                    <div
                      key={record.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 14,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ color: "#0f172a" }}>
                          {record.jurisdiction || "Unknown Jurisdiction"}
                        </strong>
                        <span style={{ color: "#475569", fontSize: 12, fontWeight: 800 }}>
                          {record.decision || "unknown_decision"}
                        </span>
                      </div>
                      <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>
                        {record.exactSourceTitle || "No title"}
                      </p>
                      <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
                        Reviewer: {record.reviewerName || "Not provided"} · Role:{" "}
                        {record.reviewerRole || "Not provided"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {manualVerification.items.length === 0 ? (
              <p style={{ margin: 0, color: "#166534" }}>
                No manual verification items.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {manualVerification.items.map((item) => (
                  <ManualVerificationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          <section
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
              Domain Coverage
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(audit.domainCoverage || {}).map(([domain, count]) => (
                <div
                  key={domain}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "#f8fafc",
                  }}
                >
                  <span>{domain}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
              Source Packs
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Pack</Th>
                    <Th>Sources</Th>
                    <Th>Domains</Th>
                  </tr>
                </thead>
                <tbody>
                  {audit.packs.map((pack) => (
                    <tr key={pack.id}>
                      <Td>
                        <strong>{pack.title}</strong>
                        <br />
                        <span style={{ color: "#64748b", fontSize: 12 }}>{pack.id}</span>
                      </Td>
                      <Td>{pack.sourceCount}</Td>
                      <Td>{pack.domains.join(", ")}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              background: "#ffffff",
            }}
          >
            <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
              India State/UT Authority Index
            </h2>

            <h3 style={{ margin: "12px 0 8px", fontSize: 16 }}>States</h3>
            <TagGrid items={audit.allIndiaCoverage.states.map((item) => item.name)} />

            <h3 style={{ margin: "20px 0 8px", fontSize: 16 }}>Union Territories</h3>
            <TagGrid items={audit.allIndiaCoverage.unionTerritories.map((item) => item.name)} />
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: 16,
        background: "#ffffff",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        borderBottom: "1px solid #e2e8f0",
        padding: "10px 8px",
        color: "#475569",
        fontSize: 13,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        borderBottom: "1px solid #e2e8f0",
        padding: "12px 8px",
        verticalAlign: "top",
        color: "#0f172a",
      }}
    >
      {children}
    </td>
  );
}

function ManualVerificationCard({
  item,
}: {
  item: NonNullable<AuditData["summary"]["manualVerification"]>["items"][number];
}) {
  return (
    <article
      style={{
        border: "1px solid #fdba74",
        borderRadius: 14,
        padding: 14,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <strong>{item.jurisdiction}</strong>
        <span
          style={{
            borderRadius: 999,
            padding: "4px 9px",
            background: "#ffedd5",
            color: "#9a3412",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {item.serverSmokeDiagnosticStatus || "manual_verification_required"}
        </span>
      </div>

      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {item.exactSourceTitle}
      </div>

      <a
        href={item.exactSourceUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "block",
          color: "#2563eb",
          overflowWrap: "anywhere",
          marginBottom: 8,
        }}
      >
        {item.exactSourceUrl}
      </a>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
          fontSize: 13,
          color: "#334155",
        }}
      >
        <span>Status: {item.manualVerificationStatus}</span>
        <span>Manual required: {String(item.manualBrowserVerificationRequired)}</span>
        <span>Invalid confirmed: {String(item.sourceInvalidConfirmed)}</span>
        <span>Extraction allowed: {String(item.extractionAllowed)}</span>
        <span>QA-ready allowed: {String(item.qaReadyAllowed)}</span>
        <span>Merge candidate: {String(item.trustedMergeCandidateAllowed)}</span>
      </div>
    </article>
  );
}



function WorkflowLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 38,
        padding: "9px 13px",
        borderRadius: 999,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1d4ed8",
        fontSize: 13,
        fontWeight: 900,
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}

function Panel({ children }: { children: any }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 22,
        padding: 20,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      {children}
    </section>
  );
}

function SmallBreakdown({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data || {});

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#f8fafc",
      }}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>{title}</strong>
      {entries.length === 0 ? (
        <span style={{ color: "#64748b" }}>No data</span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {entries.map(([key, value]) => (
            <span
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #cbd5e1",
                borderRadius: 999,
                padding: "6px 10px",
                background: "#ffffff",
                color: "#334155",
                fontSize: 13,
              }}
            >
              {key}: <strong>{value}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TagGrid({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            display: "inline-flex",
            border: "1px solid #cbd5e1",
            borderRadius: 999,
            padding: "6px 10px",
            background: "#f8fafc",
            color: "#334155",
            fontSize: 13,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
