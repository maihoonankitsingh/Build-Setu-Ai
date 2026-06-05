"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RecordItem = {
  id: string;
  sourceId: string;
  jurisdiction: string;
  exactSourceTitle: string;
  exactSourceUrl: string;
  decision: string;
  reviewerName: string;
  reviewerRole: string;
  reviewNotes: string;
  replacementSourceUrl: string;
  replacementSourceTitle: string;
  evidence: string[];
  createdAt: string;
  updatedAt: string;
  safety: {
    sourceRegistryChanged: boolean;
    extractionAllowedChanged: boolean;
    qaReadyAllowedChanged: boolean;
    trustedMergeCandidateAllowedChanged: boolean;
    trustedKnowledgeWrite: boolean;
    trustedMergeExecuted: boolean;
  };
};

type RecordsData = {
  ok: boolean;
  phase: string;
  recordsPolicy: string;
  trustedMergeEnabled: boolean;
  trustedKnowledgeWrite: boolean;
  trustedKnowledgeChanged: boolean;
  trustedMergeExecuted: boolean;
  mergeActionAvailable: boolean;
  summary: {
    totalRecords: number;
    byDecision: Record<string, number>;
    byJurisdiction: Record<string, number>;
    trustedKnowledgeWrite: number;
    trustedMergeExecuted: number;
    extractionUnlocked: number;
    qaReadyUnlocked: number;
    mergeCandidateUnlocked: number;
  };
  records: RecordItem[];
  updatedAt: string;
};

const SOURCE_OPTIONS = [
  {
    id: "india-karnataka-approval-authority-index",
    label: "Karnataka",
  },
  {
    id: "india-maharashtra-approval-authority-index",
    label: "Maharashtra",
  },
  {
    id: "india-uttar-pradesh-approval-authority-index",
    label: "Uttar Pradesh",
  },
  {
    id: "india-west-bengal-approval-authority-index",
    label: "West Bengal",
  },
];

const DECISION_OPTIONS = [
  "needs_more_review",
  "verified_manual_browser_source",
  "replace_with_better_official_source",
  "mark_source_invalid_after_review",
];

export default function ManualVerificationRecordsClient() {
  const [data, setData] = useState<RecordsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [sourceId, setSourceId] = useState(SOURCE_OPTIONS[0].id);
  const [decision, setDecision] = useState("needs_more_review");
  const [reviewerName, setReviewerName] = useState("manual_reviewer");
  const [reviewerRole, setReviewerRole] = useState("manual_browser_verification");
  const [reviewNotes, setReviewNotes] = useState("");
  const [replacementSourceUrl, setReplacementSourceUrl] = useState("");
  const [replacementSourceTitle, setReplacementSourceTitle] = useState("");
  const [evidence, setEvidence] = useState("");

  async function loadRecords() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/agent-knowledge/manual-verification-records?ui=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Records API failed with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RecordsData;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const summary = data?.summary;

  const safetyPass = useMemo(() => {
    if (!data || !summary) return false;

    return (
      data.trustedMergeEnabled === false &&
      data.trustedKnowledgeWrite === false &&
      data.trustedKnowledgeChanged === false &&
      data.trustedMergeExecuted === false &&
      data.mergeActionAvailable === false &&
      summary.trustedKnowledgeWrite === 0 &&
      summary.trustedMergeExecuted === 0 &&
      summary.extractionUnlocked === 0 &&
      summary.qaReadyUnlocked === 0 &&
      summary.mergeCandidateUnlocked === 0
    );
  }, [data, summary]);

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const evidenceList = evidence
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      const response = await fetch("/api/agent-knowledge/manual-verification-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceId,
          decision,
          reviewerName,
          reviewerRole,
          reviewNotes,
          replacementSourceUrl,
          replacementSourceTitle,
          evidence: evidenceList,
        }),
      });

      const payload = await response.json();

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error || `Save failed with HTTP ${response.status}`);
      }

      setNotice("Manual verification record saved separately. Source registry was not changed.");
      setReviewNotes("");
      setReplacementSourceUrl("");
      setReplacementSourceTitle("");
      setEvidence("");

      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }

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
        data-smoke-marker="manual-verification-records"
        style={{ display: "none" }}
      >
        Phase 46N-3 Manual Verification Records Safe Separate Save No Source Registry Change
      </section>

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              borderRadius: 999,
              padding: "6px 10px",
              background: "#dcfce7",
              color: "#166534",
              fontWeight: 800,
              fontSize: 13,
              marginBottom: 10,
            }}
          >
            Phase 46N-3
          </div>

          <h1 style={{ margin: "0 0 8px", fontSize: 34, lineHeight: 1.1 }}>
            Manual Verification Records
          </h1>

          <p style={{ margin: 0, color: "#475569", maxWidth: 780 }}>
            Save browser verification decisions separately. This page does not
            modify the source registry and does not unlock extraction, QA-ready,
            or trusted merge.
          </p>
        </header>

        {loading ? (
          <Panel>Loading records...</Panel>
        ) : error ? (
          <Panel tone="danger">{error}</Panel>
        ) : !data || !summary ? (
          <Panel tone="danger">Records data unavailable.</Panel>
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
              <Metric label="Total Records" value={summary.totalRecords} />
              <Metric label="Extraction Unlocked" value={summary.extractionUnlocked} safeValue={0} />
              <Metric label="QA Ready Unlocked" value={summary.qaReadyUnlocked} safeValue={0} />
              <Metric
                label="Merge Candidate Unlocked"
                value={summary.mergeCandidateUnlocked}
                safeValue={0}
              />
              <Metric label="Trusted Write" value={summary.trustedKnowledgeWrite} safeValue={0} />
              <Metric label="Trusted Merge" value={summary.trustedMergeExecuted} safeValue={0} />
              <Metric label="Safety Pass" value={safetyPass ? "Yes" : "No"} safeText="Yes" />
            </section>

            {notice ? <Panel tone="success">{notice}</Panel> : null}

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 16,
                marginTop: 20,
              }}
            >
              <form
                onSubmit={submitRecord}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  borderRadius: 18,
                  padding: 18,
                  display: "grid",
                  gap: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 22 }}>Add Manual Record</h2>

                <label style={labelStyle}>
                  Source
                  <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={inputStyle}>
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Decision
                  <select value={decision} onChange={(e) => setDecision(e.target.value)} style={inputStyle}>
                    {DECISION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  Reviewer Name
                  <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Reviewer Role
                  <input value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} style={inputStyle} />
                </label>

                <label style={labelStyle}>
                  Review Notes
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    required
                    rows={4}
                    style={inputStyle}
                    placeholder="Example: Browser me source open hua, page title match hua, official authority domain confirm hua..."
                  />
                </label>

                <label style={labelStyle}>
                  Replacement Source URL
                  <input
                    value={replacementSourceUrl}
                    onChange={(e) => setReplacementSourceUrl(e.target.value)}
                    style={inputStyle}
                    placeholder="Required only if decision is replace_with_better_official_source"
                  />
                </label>

                <label style={labelStyle}>
                  Replacement Source Title
                  <input
                    value={replacementSourceTitle}
                    onChange={(e) => setReplacementSourceTitle(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Evidence Notes / URLs, one per line
                  <textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    rows={3}
                    style={inputStyle}
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    border: 0,
                    borderRadius: 12,
                    padding: "12px 16px",
                    background: saving ? "#94a3b8" : "#0f172a",
                    color: "#ffffff",
                    fontWeight: 800,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save Separate Manual Record"}
                </button>

                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                  This save action writes only to manual verification records.
                  It does not change source registry, extraction flags, QA flags,
                  or merge flags.
                </p>
              </form>

              <section
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                <Breakdown title="Decision Breakdown" data={summary.byDecision} />
                <Breakdown title="Jurisdiction Breakdown" data={summary.byJurisdiction} />
              </section>

              <section style={{ display: "grid", gap: 14 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Saved Records</h2>

                {data.records.length === 0 ? (
                  <Panel>No manual verification records saved yet.</Panel>
                ) : (
                  data.records.map((record) => <RecordCard key={record.id} record={record} />)
                )}
              </section>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 14,
  color: "#0f172a",
  background: "#ffffff",
};

function Panel({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "success";
}) {
  const styles = {
    neutral: { border: "#e2e8f0", bg: "#ffffff", color: "#334155" },
    danger: { border: "#fecaca", bg: "#fef2f2", color: "#991b1b" },
    success: { border: "#bbf7d0", bg: "#f0fdf4", color: "#166534" },
  }[tone];

  return (
    <div
      style={{
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
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

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
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

function RecordCard({ record }: { record: RecordItem }) {
  return (
    <article
      style={{
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13 }}>{record.createdAt}</div>

      <h3 style={{ margin: "4px 0 8px", fontSize: 22 }}>
        {record.jurisdiction} · {record.decision}
      </h3>

      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        {record.exactSourceTitle}
      </div>

      <a
        href={record.exactSourceUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          color: "#2563eb",
          overflowWrap: "anywhere",
          display: "block",
          marginBottom: 12,
        }}
      >
        {record.exactSourceUrl}
      </a>

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
        <strong>Review Notes: </strong>
        {record.reviewNotes}
      </div>

      <div style={{ color: "#64748b", fontSize: 13 }}>
        Source registry changed: {String(record.safety.sourceRegistryChanged)} ·
        Extraction changed: {String(record.safety.extractionAllowedChanged)} ·
        QA changed: {String(record.safety.qaReadyAllowedChanged)} ·
        Merge changed: {String(record.safety.trustedMergeCandidateAllowedChanged)}
      </div>
    </article>
  );
}
