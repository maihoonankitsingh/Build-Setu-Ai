"use client";

import { useEffect, useState } from "react";

type SmokeData = {
  ok: boolean;
  phase: string;
  smokePolicy: string;
  trustedMergeEnabled: boolean;
  trustedKnowledgeWrite: boolean;
  trustedKnowledgeChanged: boolean;
  trustedMergeExecuted: boolean;
  mergeActionAvailable: boolean;
  summary: {
    verifiedExactSourceUrls: number;
    reachable: number;
    failed: number;
    manualVerificationRequired: number;
    sourceInvalidConfirmed: number;
    diagnosticBreakdown: Record<string, number>;
    pdfLike: number;
    htmlLike: number;
    expectedVerifiedHighPriorityExactSources: number;
    smokePass: boolean;
    sourceRegistryPassWithManualReview: boolean;
  };
  results: Array<{
    id: string;
    jurisdiction: string;
    jurisdictionType: string;
    exactSourceTitle: string;
    exactSourceUrl: string;
    exactSourcePublisher: string;
    exactSourceAuthorityType: string;
    verificationStatus: string;
    verificationPriority: string;
    reviewRequired: boolean;
    mergePolicy: string;
    trustedKnowledgeWrite: boolean;
    trustedMergeExecuted: boolean;
    smoke: {
      ok: boolean;
      status: number;
      statusText: string;
      method: string;
      finalUrl: string;
      contentType: string;
      contentLength: string;
      elapsedMs: number;
      error: string;
    };
    diagnostic: {
      status: string;
      severity: string;
      manualVerificationRequired: boolean;
      sourceInvalidConfirmed: boolean;
      message: string;
    };
  }>;
};

export default function ExactSourceUrlSmokePage() {
  const [data, setData] = useState<SmokeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/agent-knowledge/exact-source-url-smoke?t=${Date.now()}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load smoke diagnostics.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to load smoke diagnostics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = data?.summary;
  const failedItems = data?.results?.filter((item) => !item.smoke.ok) || [];
  const reachableItems = data?.results?.filter((item) => item.smoke.ok) || [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        padding: 24,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
            Phase 46K-1
          </div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.15 }}>
            Exact Source URL Smoke Diagnostics
          </h1>
          <p style={{ margin: "10px 0 0", color: "#475569", maxWidth: 860 }}>
            Read-only diagnostics for verified high-priority exact building
            bye-law source URLs. This page does not extract claims, mark QA-ready,
            create merge candidates, or write trusted knowledge.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <Metric label="Verified URLs" value={summary?.verifiedExactSourceUrls ?? 0} />
          <Metric label="Reachable" value={summary?.reachable ?? 0} />
          <Metric label="Failed Smoke" value={summary?.failed ?? 0} />
          <Metric
            label="Manual Review"
            value={summary?.manualVerificationRequired ?? 0}
          />
          <Metric
            label="Invalid Confirmed"
            value={summary?.sourceInvalidConfirmed ?? 0}
          />
          <Metric
            label="Registry Pass"
            value={summary?.sourceRegistryPassWithManualReview ? "Yes" : "No"}
          />
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 22 }}>Safety Boundary</h2>
            <button
              onClick={loadData}
              style={{
                border: "1px solid #cbd5e1",
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Refresh
            </button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <StatusLine label="Trusted merge enabled" value={data?.trustedMergeEnabled} />
            <StatusLine label="Trusted knowledge write" value={data?.trustedKnowledgeWrite} />
            <StatusLine label="Trusted knowledge changed" value={data?.trustedKnowledgeChanged} />
            <StatusLine label="Trusted merge executed" value={data?.trustedMergeExecuted} />
            <StatusLine label="Merge action available" value={data?.mergeActionAvailable} />
          </div>
        </section>

        {loading ? (
          <Panel>Loading smoke diagnostics...</Panel>
        ) : error ? (
          <Panel tone="danger">{error}</Panel>
        ) : !data ? (
          <Panel tone="danger">No data returned.</Panel>
        ) : (
          <>
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
                Diagnostic Breakdown
              </h2>
              <SmallBreakdown data={summary?.diagnosticBreakdown || {}} />
            </section>

            <section
              style={{
                border: "1px solid #fecaca",
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                background: "#fff7ed",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
                Manual Verification Required
              </h2>
              {failedItems.length === 0 ? (
                <p style={{ margin: 0, color: "#166534" }}>
                  No failed smoke items.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {failedItems.map((item) => (
                    <SourceCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            <section
              style={{
                border: "1px solid #bbf7d0",
                borderRadius: 16,
                padding: 20,
                background: "#ffffff",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: 22 }}>
                Reachable Sources
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                {reachableItems.map((item) => (
                  <SourceCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 16,
        background: "#ffffff",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusLine({
  label,
  value,
}: {
  label: string;
  value: boolean | undefined;
}) {
  const safe = value === false;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
        background: safe ? "#f0fdf4" : "#fef2f2",
      }}
    >
      <span>{label}</span>
      <strong style={{ color: safe ? "#166534" : "#991b1b" }}>
        {String(value)}
      </strong>
    </div>
  );
}

function Panel({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <div
      style={{
        border: `1px solid ${tone === "danger" ? "#fecaca" : "#e2e8f0"}`,
        borderRadius: 16,
        padding: 20,
        background: tone === "danger" ? "#fef2f2" : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

function SmallBreakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data || {});

  if (entries.length === 0) {
    return <span style={{ color: "#64748b" }}>No diagnostic data.</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {entries.map(([key, value]) => (
        <span
          key={key}
          style={{
            display: "inline-flex",
            gap: 6,
            border: "1px solid #cbd5e1",
            borderRadius: 999,
            padding: "7px 11px",
            background: "#f8fafc",
            color: "#334155",
            fontSize: 13,
          }}
        >
          {key}: <strong>{value}</strong>
        </span>
      ))}
    </div>
  );
}

function SourceCard({ item }: { item: SmokeData["results"][number] }) {
  const ok = item.smoke.ok;

  return (
    <article
      style={{
        border: `1px solid ${ok ? "#bbf7d0" : "#fed7aa"}`,
        borderRadius: 14,
        padding: 14,
        background: ok ? "#f0fdf4" : "#fff7ed",
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
            background: ok ? "#dcfce7" : "#ffedd5",
            color: ok ? "#166534" : "#9a3412",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {item.diagnostic.status}
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
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 8,
          fontSize: 13,
          color: "#334155",
        }}
      >
        <span>Status: {item.smoke.status}</span>
        <span>Method: {item.smoke.method}</span>
        <span>Type: {item.smoke.contentType || "n/a"}</span>
        <span>Elapsed: {item.smoke.elapsedMs}ms</span>
      </div>

      {!ok && (
        <p style={{ margin: "10px 0 0", color: "#9a3412" }}>
          {item.diagnostic.message}
        </p>
      )}
    </article>
  );
}
