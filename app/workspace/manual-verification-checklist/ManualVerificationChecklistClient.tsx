"use client";

import { useEffect, useMemo, useState } from "react";

type ChecklistItem = {
  index: number;
  id: string;
  jurisdiction: string;
  jurisdictionType: string;
  exactSourceTitle: string;
  exactSourceUrl: string;
  exactSourcePublisher: string;
  exactSourceAuthorityType: string;
  matchedExactSourceId: string;
  verificationStatus: string;
  verificationPriority: string;
  serverSmokeStatus: string;
  serverSmokeDiagnosticStatus: string;
  manualBrowserVerificationRequired: boolean;
  manualVerificationStatus: string;
  manualVerificationNotes: string;
  sourceInvalidConfirmed: boolean;
  extractionAllowed: boolean;
  qaReadyAllowed: boolean;
  trustedMergeCandidateAllowed: boolean;
  trustedKnowledgeWrite: boolean;
  trustedMergeExecuted: boolean;
  checklistSteps: string[];
  requiredReviewerDecision: string[];
};

type ChecklistData = {
  ok: boolean;
  phase: string;
  checklistPolicy: string;
  trustedMergeEnabled: boolean;
  trustedKnowledgeWrite: boolean;
  trustedKnowledgeChanged: boolean;
  trustedMergeExecuted: boolean;
  mergeActionAvailable: boolean;
  exportedAt: string;
  summary: {
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
  };
  checklist: ChecklistItem[];
};

export default function ManualVerificationChecklistClient() {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const jsonExportUrl = "/api/agent-knowledge/manual-verification-checklist/export?format=json";
  const markdownExportUrl = "/api/agent-knowledge/manual-verification-checklist/export?format=md";

  useEffect(() => {
    let cancelled = false;

    async function loadChecklist() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${jsonExportUrl}&ui=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Checklist API failed with HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ChecklistData;

        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load checklist.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadChecklist();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = data?.summary;
  const checklist = data?.checklist || [];

  const safetyPass = useMemo(() => {
    if (!data || !summary) return false;

    return (
      data.trustedMergeEnabled === false &&
      data.trustedKnowledgeWrite === false &&
      data.trustedKnowledgeChanged === false &&
      data.trustedMergeExecuted === false &&
      data.mergeActionAvailable === false &&
      summary.sourceInvalidConfirmed === 0 &&
      summary.extractionAllowed === 0 &&
      summary.qaReadyAllowed === 0 &&
      summary.trustedMergeCandidateAllowed === 0 &&
      summary.trustedKnowledgeWrite === 0 &&
      summary.trustedMergeExecuted === 0
    );
  }, [data, summary]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 24,
        color: "#0f172a",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section
        aria-hidden="true"
        data-smoke-marker="manual-verification-checklist"
        style={{ display: "none" }}
      >
        Phase 46M-3 Manual Verification Checklist Export JSON Markdown Karnataka
        Maharashtra Uttar Pradesh West Bengal
      </section>

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                borderRadius: 999,
                padding: "6px 10px",
                background: "#e0f2fe",
                color: "#0369a1",
                fontWeight: 800,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              Phase 46M-3
            </div>

            <h1 style={{ margin: "0 0 8px", fontSize: 34, lineHeight: 1.1 }}>
              Manual Verification Checklist
            </h1>

            <p style={{ margin: 0, color: "#475569", maxWidth: 760 }}>
              Read-only checklist for blocked exact source URLs. Extraction,
              QA-ready, and trusted merge remain blocked until manual browser
              verification is completed.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
            <a href={jsonExportUrl} style={buttonStyle}>
              Download JSON
            </a>
            <a href={markdownExportUrl} style={buttonStyle}>
              Download Markdown
            </a>
          </div>
        </header>

        {loading ? (
          <Panel>Loading manual verification checklist...</Panel>
        ) : error ? (
          <Panel tone="danger">{error}</Panel>
        ) : !data || !summary ? (
          <Panel tone="danger">Checklist data unavailable.</Panel>
        ) : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Metric label="Checklist Items" value={summary.totalManualVerificationItems} />
              <Metric label="Browser Verification" value={summary.manualBrowserVerificationRequired} />
              <Metric label="Pending Manual" value={summary.pendingManualBrowserVerification} />
              <Metric label="Invalid Confirmed" value={summary.sourceInvalidConfirmed} safeValue={0} />
              <Metric label="Extraction Allowed" value={summary.extractionAllowed} safeValue={0} />
              <Metric label="QA Ready Allowed" value={summary.qaReadyAllowed} safeValue={0} />
              <Metric
                label="Merge Candidate"
                value={summary.trustedMergeCandidateAllowed}
                safeValue={0}
              />
              <Metric label="Safety Pass" value={safetyPass ? "Yes" : "No"} safeText="Yes" />
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Breakdown title="Manual Verification Status" data={summary.byManualVerificationStatus} />
              <Breakdown title="Server Smoke Diagnostic" data={summary.byServerSmokeDiagnosticStatus} />
            </section>

            <section style={{ display: "grid", gap: 14 }}>
              {checklist.length === 0 ? (
                <Panel>No manual verification items found.</Panel>
              ) : (
                checklist.map((item) => <ChecklistCard key={item.id} item={item} />)
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  padding: "11px 14px",
  background: "#0f172a",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none",
  fontSize: 14,
};

function Panel({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <div
      style={{
        border: `1px solid ${tone === "danger" ? "#fecaca" : "#e2e8f0"}`,
        background: tone === "danger" ? "#fef2f2" : "#ffffff",
        color: tone === "danger" ? "#991b1b" : "#334155",
        borderRadius: 16,
        padding: 18,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  safeValue,
  safeText,
}: {
  label: string;
  value: number | string;
  safeValue?: number;
  safeText?: string;
}) {
  const isSafe =
    typeof value === "number"
      ? safeValue === undefined || value === safeValue
      : safeText === undefined || value === safeText;

  return (
    <div
      style={{
        border: `1px solid ${isSafe ? "#bbf7d0" : "#fecaca"}`,
        background: isSafe ? "#f0fdf4" : "#fef2f2",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 5 }}>
        {label}
      </div>
      <strong
        style={{
          color: isSafe ? "#166534" : "#991b1b",
          fontSize: 23,
          lineHeight: 1,
        }}
      >
        {String(value)}
      </strong>
    </div>
  );
}

function Breakdown({
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
        background: "#ffffff",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{title}</h2>
      {entries.length === 0 ? (
        <div style={{ color: "#64748b" }}>No data.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {entries.map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: 7,
              }}
            >
              <span style={{ color: "#334155", overflowWrap: "anywhere" }}>{key}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistCard({ item }: { item: ChecklistItem }) {
  return (
    <article
      style={{
        border: "1px solid #fed7aa",
        background: "#ffffff",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            #{item.index} · {item.jurisdictionType}
          </div>
          <h3 style={{ margin: "4px 0 0", fontSize: 22 }}>
            {item.jurisdiction}
          </h3>
        </div>

        <span
          style={{
            borderRadius: 999,
            padding: "7px 11px",
            background: "#ffedd5",
            color: "#9a3412",
            fontSize: 13,
            fontWeight: 800,
            height: "fit-content",
          }}
        >
          {item.serverSmokeDiagnosticStatus}
        </span>
      </div>

      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        {item.exactSourceTitle}
      </div>

      <a
        href={item.exactSourceUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          color: "#2563eb",
          overflowWrap: "anywhere",
          display: "block",
          marginBottom: 12,
        }}
      >
        {item.exactSourceUrl}
      </a>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <SmallStatus label="Manual Status" value={item.manualVerificationStatus} />
        <SmallStatus label="Extraction Allowed" value={String(item.extractionAllowed)} />
        <SmallStatus label="QA Ready Allowed" value={String(item.qaReadyAllowed)} />
        <SmallStatus label="Merge Candidate" value={String(item.trustedMergeCandidateAllowed)} />
      </div>

      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 13,
          background: "#f8fafc",
          color: "#334155",
          marginBottom: 12,
        }}
      >
        <strong>Manual Notes: </strong>
        {item.manualVerificationNotes || "No notes."}
      </div>

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>
          Checklist steps
        </summary>
        <ol style={{ marginBottom: 0 }}>
          {item.checklistSteps.map((step) => (
            <li key={step} style={{ marginTop: 6 }}>
              {step}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

function SmallStatus({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 10,
        background: "#f8fafc",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
        {label}
      </div>
      <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}
