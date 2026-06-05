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

export default function SourceCoverageAuditPage() {
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
  const safety = audit?.summary?.safety || {
    unsafeSources: 0,
    duplicatePackSourceKeys: 0,
    duplicateWatchSourceKeys: 0,
  };

  return (
    <main style={{ padding: 32, maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Phase 46E-1
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
