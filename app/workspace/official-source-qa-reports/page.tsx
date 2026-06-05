"use client";

import { useEffect, useState, type ReactNode } from "react";

type QaReport = {
  draftId: string;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  reviewStatus: string;
  draftStatus: string;
  qaStatus: string;
  summary: string;
  jurisdiction: string;
  applicability: string;
  versionDate: string;
  claims: any[];
  citationChecks: any[];
  reviewer: string;
  qaNotes: string;
  safetyBoundary: {
    mode: string;
    trustedMergeEnabled: boolean;
    trustedKnowledgeWrite: boolean;
    trustedKnowledgeChanged: boolean;
    mergeActionAvailable: boolean;
  };
};

export default function OfficialSourceQaReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<QaReport[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadReports() {
      try {
        const res = await fetch("/api/agent-knowledge/official-source-qa-report", {
          cache: "no-store",
        });

        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Unable to load QA reports.");
        }

        if (mounted) {
          setReports(Array.isArray(json.reports) ? json.reports : []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Unable to load QA reports.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Phase 45E-1
        </p>
        <h1 style={{ margin: "6px 0 8px", fontSize: 32, lineHeight: 1.15 }}>
          Official Source QA Reports
        </h1>
        <p style={{ margin: 0, color: "#475569", maxWidth: 820 }}>
          Read-only report view for reviewed extraction drafts. No edit, no merge,
          and no trusted knowledge write is available on this page.
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
          mergeActionAvailable=false
        </span>
      </section>

      {/* PHASE_45F_EXPORT_LINKS */}
      <section
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          background: "#ffffff",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Export QA Report</h2>
        <p style={{ margin: "0 0 12px", color: "#475569" }}>
          Download read-only QA report export. No edit, no merge, no trusted knowledge write.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/api/agent-knowledge/official-source-qa-report/export?format=json"
            style={{
              display: "inline-flex",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "10px 14px",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              fontWeight: 600,
            }}
          >
            Download JSON
          </a>
          <a
            href="/api/agent-knowledge/official-source-qa-report/export?format=markdown"
            style={{
              display: "inline-flex",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "10px 14px",
              textDecoration: "none",
              color: "#0f172a",
              background: "#f8fafc",
              fontWeight: 600,
            }}
          >
            Download Markdown
          </a>
        </div>
      </section>

      {loading && <p>Loading QA reports...</p>}

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

      {!loading && !error && reports.length === 0 && (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
          }}
        >
          No QA reports found.
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {reports.map((report) => (
          <article
            key={report.draftId || report.sourceId}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              background: "#ffffff",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Badge label={`Review: ${report.reviewStatus}`} />
              <Badge label={`Draft: ${report.draftStatus}`} />
              <Badge label={`QA: ${report.qaStatus}`} />
            </div>

            <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>
              {report.sourceTitle || report.sourceId || "Untitled source"}
            </h2>

            {report.sourceUrl && (
              <p style={{ margin: "0 0 12px", wordBreak: "break-all" }}>
                <a href={report.sourceUrl} target="_blank" rel="noreferrer">
                  {report.sourceUrl}
                </a>
              </p>
            )}

            <Grid>
              <Field label="Jurisdiction" value={report.jurisdiction} />
              <Field label="Applicability" value={report.applicability} />
              <Field label="Version / Date" value={report.versionDate} />
              <Field label="Reviewer" value={report.reviewer} />
            </Grid>

            <Block title="Summary" value={report.summary} />
            <Block title="QA Notes" value={report.qaNotes} />

            <SectionArray title="Claims" items={report.claims} />
            <SectionArray title="Citation Checks" items={report.citationChecks} />
          </article>
        ))}
      </div>
    </main>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        border: "1px solid #cbd5e1",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        color: "#334155",
        background: "#f8fafc",
      }}
    >
      {label}
    </span>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a" }}>{value || "—"}</div>
    </div>
  );
}

function Block({ title, value }: { title: string; value?: string }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3>
      <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>
        {value || "—"}
      </p>
    </section>
  );
}

function SectionArray({ title, items }: { title: string; items: any[] }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b" }}>—</p>
      ) : (
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 12,
            background: "#f8fafc",
            color: "#0f172a",
            fontSize: 13,
          }}
        >
          {JSON.stringify(items, null, 2)}
        </pre>
      )}
    </section>
  );
}
