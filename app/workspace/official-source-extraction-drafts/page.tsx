"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QaStatus = "extraction_pending" | "qa_pending" | "qa_failed" | "qa_ready";

type DraftClaim = {
  id?: string;
  text?: string;
  citation?: string;
  sourceUrl?: string;
  note?: string;
};

type CitationChecks = {
  sourceUrlPresent?: boolean;
  sourceCitationPresent?: boolean;
  jurisdictionMarked?: boolean;
  applicabilityMarked?: boolean;
  versionDateMarked?: boolean;
  allClaimsHaveCitation?: boolean;
  summaryPresent?: boolean;
  checkedAt?: string;
};

type DraftItem = {
  id: string;
  status: string;
  title: string;
  url: string;
  domains?: string[];
  sourcePackId?: string;
  sourcePackTitle?: string;
  sourceCitation?: string;
  extractionPolicy?: string;
  mergePolicy?: string;
  autoMerge?: boolean;
  trustedKnowledgeWrite?: boolean;
  trustedKnowledgeChanged?: boolean;
  trustedMergeExecuted?: boolean;
  review?: {
    reviewer?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    mergeReady?: boolean;
    trustedMergeExecuted?: boolean;
  };
  extractionChecklist?: string[];
  extractedDraft?: {
    summary?: string;
    jurisdiction?: string;
    applicability?: string;
    versionDate?: string;
    claims?: DraftClaim[];
    citationChecks?: CitationChecks;
    cautions?: string[];
  };
  qa?: {
    status?: string;
    notes?: string;
    reviewer?: string;
    checkedAt?: string;
    checkedBy?: string;
    trustedMergeApproved?: boolean;
    trustedMergeExecuted?: boolean;
  };
};

type DraftResponse = {
  ok: boolean;
  code?: string;
  error?: string;
  draftPath?: string;
  queuePath?: string;
  extractionPolicy?: string;
  mergePolicy?: string;
  autoMerge?: boolean;
  trustedKnowledgeWrite?: boolean;
  trustedKnowledgeChanged?: boolean;
  trustedMergeExecuted?: boolean;
  candidateCount?: number;
  summary?: {
    total?: number;
    byStatus?: Record<string, number>;
    byDomain?: Record<string, number>;
    bySourcePack?: Record<string, number>;
    autoMerge?: boolean;
    trustedKnowledgeWrite?: boolean;
    extractionPolicy?: string;
  };
  candidates?: DraftItem[];
  items?: DraftItem[];
  created?: number;
  preserved?: number;
  updatedAt?: string;
  item?: DraftItem;
};

type QaFormState = {
  qaStatus: QaStatus;
  reviewer: string;
  qaNotes: string;
  summary: string;
  jurisdiction: string;
  applicability: string;
  versionDate: string;
  claimsText: string;
};

const QA_STATUSES: QaStatus[] = ["extraction_pending", "qa_pending", "qa_failed", "qa_ready"];

function formatCountMap(value?: Record<string, number>) {
  const entries = Object.entries(value || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "None";
  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ");
}

function claimsToText(claims?: DraftClaim[]) {
  return (claims || [])
    .map((claim) => {
      const text = claim.text || "";
      const citation = claim.citation || "";
      const sourceUrl = claim.sourceUrl || "";
      const note = claim.note || "";
      return [text, citation, sourceUrl, note].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function textToClaims(value: string) {
  return String(value || "")
    .split("\n")
    .map((line, index) => {
      const [text, citation = "", sourceUrl = "", note = ""] = line.split("|").map((part) => part.trim());
      return {
        id: `claim_${index + 1}`,
        text,
        citation,
        sourceUrl,
        note,
      };
    })
    .filter((claim) => claim.text);
}

function initialQaForm(item: DraftItem): QaFormState {
  const draft = item.extractedDraft || {};
  const qa = item.qa || {};

  return {
    qaStatus: QA_STATUSES.includes((qa.status || item.status) as QaStatus)
      ? ((qa.status || item.status) as QaStatus)
      : "qa_pending",
    reviewer: qa.reviewer || "workspace-qa",
    qaNotes: qa.notes || "",
    summary: draft.summary || "",
    jurisdiction: draft.jurisdiction || "",
    applicability: draft.applicability || "",
    versionDate: draft.versionDate || "",
    claimsText: claimsToText(draft.claims),
  };
}

function checkLabel(value: boolean | undefined) {
  return value ? "yes" : "no";
}

export default function OfficialSourceExtractionDraftsPage() {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [qaForms, setQaForms] = useState<Record<string, QaFormState>>({});

  const hydrateForms = useCallback((items: DraftItem[]) => {
    const nextForms: Record<string, QaFormState> = {};
    for (const item of items) {
      nextForms[item.id] = initialQaForm(item);
    }
    setQaForms(nextForms);
  }, []);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent-knowledge/official-source-extraction-drafts", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const json = (await res.json().catch(() => null)) as DraftResponse | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Request failed with ${res.status}`);
      }

      setData(json);
      hydrateForms(json.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load extraction drafts.");
    } finally {
      setLoading(false);
    }
  }, [hydrateForms]);

  const createDrafts = useCallback(async () => {
    setCreating(true);
    setError("");
    setLastAction("");

    try {
      const res = await fetch("/api/agent-knowledge/official-source-extraction-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ action: "create_from_review_queue" }),
      });

      const json = (await res.json().catch(() => null)) as DraftResponse | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Create failed with ${res.status}`);
      }

      setData(json);
      hydrateForms(json.items || []);

      setLastAction(
        `Draft creation complete. Created ${json.created ?? 0}, preserved ${json.preserved ?? 0}. Trusted knowledge changed: ${
          json.trustedKnowledgeChanged ? "yes" : "no"
        }. Trusted merge executed: ${json.trustedMergeExecuted ? "yes" : "no"}.`,
      );
    } catch (err: any) {
      setError(err?.message || "Failed to create extraction drafts.");
    } finally {
      setCreating(false);
    }
  }, [hydrateForms]);

  const updateQaForm = useCallback((draftId: string, patch: Partial<QaFormState>) => {
    setQaForms((current) => ({
      ...current,
      [draftId]: {
        qaStatus: current[draftId]?.qaStatus || "qa_pending",
        reviewer: current[draftId]?.reviewer || "workspace-qa",
        qaNotes: current[draftId]?.qaNotes || "",
        summary: current[draftId]?.summary || "",
        jurisdiction: current[draftId]?.jurisdiction || "",
        applicability: current[draftId]?.applicability || "",
        versionDate: current[draftId]?.versionDate || "",
        claimsText: current[draftId]?.claimsText || "",
        ...patch,
      },
    }));
  }, []);

  const saveQaDraft = useCallback(
    async (item: DraftItem) => {
      setSavingId(item.id);
      setError("");
      setLastAction("");

      const form = qaForms[item.id] || initialQaForm(item);

      try {
        const res = await fetch("/api/agent-knowledge/official-source-extraction-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "same-origin",
          body: JSON.stringify({
            action: "update_draft",
            draftId: item.id,
            qaStatus: form.qaStatus,
            reviewer: form.reviewer,
            qaNotes: form.qaNotes,
            summary: form.summary,
            jurisdiction: form.jurisdiction,
            applicability: form.applicability,
            versionDate: form.versionDate,
            claims: textToClaims(form.claimsText),
          }),
        });

        const json = (await res.json().catch(() => null)) as DraftResponse | null;

        if (!res.ok || !json?.ok || !json.item) {
          throw new Error(json?.error || `QA save failed with ${res.status}`);
        }

        setData((current) => {
          if (!current) return json;
          const currentItems = current.items || [];
          return {
            ...current,
            summary: json.summary || current.summary,
            items: currentItems.map((existing) => (existing.id === json.item?.id ? json.item : existing)),
          };
        });

        updateQaForm(json.item.id, initialQaForm(json.item));

        setLastAction(
          `QA draft saved as ${json.item.status}. Trusted knowledge changed: ${
            json.trustedKnowledgeChanged ? "yes" : "no"
          }. Trusted merge executed: ${json.trustedMergeExecuted ? "yes" : "no"}.`,
        );
      } catch (err: any) {
        setError(err?.message || "Failed to save QA draft.");
      } finally {
        setSavingId("");
      }
    },
    [qaForms, updateQaForm],
  );

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const items = useMemo(() => data?.items || [], [data]);
  const candidates = useMemo(() => data?.candidates || [], [data]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
                BuildSetu Knowledge
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white">
                Official Source Extraction Drafts
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                QA Editor for extraction drafts. Edit summary, claims, jurisdiction, applicability,
                version/date and citation checks. This page still does not merge or write trusted knowledge.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/workspace/official-source-review-queue"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
              >
                Review Queue
              </a>
              <a
                href="/workspace/knowledge-inbox"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
              >
                Knowledge Inbox
              </a>
              <button
                type="button"
                onClick={loadDrafts}
                disabled={loading || creating || Boolean(savingId)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={createDrafts}
                disabled={loading || creating || Boolean(savingId)}
                className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create drafts from approved review items"}
              </button>
            </div>
          </div>
        </header>

        <section
          data-buildsetu-marker="BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFT_QA_EDITOR_UI_V1"
          className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100"
        >
          QA Editor active: Save QA draft only. No trusted merge button is present. Trusted knowledge
          write remains disabled and merge remains a separate future phase.
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        {lastAction ? (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-100">
            {lastAction}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Draft Items</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.summary?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Candidates</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.candidateCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Trusted Write</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.trustedKnowledgeWrite ? "ON" : "OFF"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Auto Merge</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.autoMerge ? "ON" : "OFF"}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">Summary</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-100">By status</p>
              <p className="mt-1">{formatCountMap(data?.summary?.byStatus)}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-100">By domain</p>
              <p className="mt-1">{formatCountMap(data?.summary?.byDomain)}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-100">By source pack</p>
              <p className="mt-1">{formatCountMap(data?.summary?.bySourcePack)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Draft path: {data?.draftPath || "data/buildsetu-source-extraction-drafts/drafts.json"}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">Approved merge-ready candidates</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading extraction drafts...</p>
          ) : candidates.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {candidates.map((candidate) => (
                <article key={candidate.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    approved + mergeReady
                  </p>
                  <h3 className="mt-2 font-bold text-white">{candidate.title}</h3>
                  <a
                    href={candidate.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    {candidate.url}
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
              No approved merge-ready review items found. Approve a source and mark mergeReady in the Review Queue first.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">Extraction draft QA editor</h2>

          {items.length ? (
            <div className="mt-4 space-y-5">
              {items.map((item) => {
                const form = qaForms[item.id] || initialQaForm(item);
                const checks = item.extractedDraft?.citationChecks || {};
                const isSaving = savingId === item.id;

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                          {item.status || "extraction_pending"}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-white">{item.title}</h3>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-sm text-cyan-300 hover:text-cyan-200"
                        >
                          {item.url}
                        </a>
                        <p className="mt-2 text-xs text-slate-400">Citation: {item.sourceCitation || "Missing"}</p>
                      </div>
                      <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-100">
                        Draft-only QA. No trusted merge.
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
                      <p>Policy: {item.extractionPolicy || "draft_only_manual_review_required"}</p>
                      <p>Trusted write: {item.trustedKnowledgeWrite ? "true" : "false"}</p>
                      <p>Trusted merge executed: {item.trustedMergeExecuted ? "true" : "false"}</p>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          QA status
                        </span>
                        <select
                          value={form.qaStatus}
                          onChange={(event) => updateQaForm(item.id, { qaStatus: event.target.value as QaStatus })}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        >
                          {QA_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          QA reviewer
                        </span>
                        <input
                          value={form.reviewer}
                          onChange={(event) => updateQaForm(item.id, { reviewer: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          placeholder="reviewer name"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Version/date
                        </span>
                        <input
                          value={form.versionDate}
                          onChange={(event) => updateQaForm(item.id, { versionDate: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          placeholder="source version/date"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Jurisdiction
                        </span>
                        <textarea
                          value={form.jurisdiction}
                          onChange={(event) => updateQaForm(item.id, { jurisdiction: event.target.value })}
                          className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          placeholder="country/state/city/authority applicability"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Applicability
                        </span>
                        <textarea
                          value={form.applicability}
                          onChange={(event) => updateQaForm(item.id, { applicability: event.target.value })}
                          className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          placeholder="where/when this source applies"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Summary
                      </span>
                      <textarea
                        value={form.summary}
                        onChange={(event) => updateQaForm(item.id, { summary: event.target.value })}
                        className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="factual extraction summary"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Claims
                      </span>
                      <textarea
                        value={form.claimsText}
                        onChange={(event) => updateQaForm(item.id, { claimsText: event.target.value })}
                        className="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="One claim per line: claim text | citation | sourceUrl | note"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Format: claim text | citation | sourceUrl | note
                      </p>
                    </label>

                    <label className="mt-4 block">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        QA notes
                      </span>
                      <textarea
                        value={form.qaNotes}
                        onChange={(event) => updateQaForm(item.id, { qaNotes: event.target.value })}
                        className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="QA notes. No trusted merge happens here."
                      />
                    </label>

                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-sm font-semibold text-white">Citation checks</p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-3">
                        <p>Source URL present: {checkLabel(checks.sourceUrlPresent)}</p>
                        <p>Source citation present: {checkLabel(checks.sourceCitationPresent)}</p>
                        <p>Summary present: {checkLabel(checks.summaryPresent)}</p>
                        <p>Jurisdiction marked: {checkLabel(checks.jurisdictionMarked)}</p>
                        <p>Applicability marked: {checkLabel(checks.applicabilityMarked)}</p>
                        <p>Version/date marked: {checkLabel(checks.versionDateMarked)}</p>
                        <p>All claims have citation: {checkLabel(checks.allClaimsHaveCitation)}</p>
                        <p>Checked at: {checks.checkedAt || "not checked"}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={Boolean(savingId) || creating || loading}
                        onClick={() => saveQaDraft(item)}
                        className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save QA draft only"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(savingId) || creating || loading}
                        onClick={() => updateQaForm(item.id, { qaStatus: "qa_failed" })}
                        className="rounded-xl border border-red-400/60 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        Mark QA failed locally
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(savingId) || creating || loading}
                        onClick={() => updateQaForm(item.id, { qaStatus: "qa_ready" })}
                        className="rounded-xl border border-emerald-400/60 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-950/40 disabled:opacity-50"
                      >
                        Mark QA ready locally
                      </button>
                    </div>

                    {item.qa?.checkedAt ? (
                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                        Last QA: {item.qa.checkedAt} · Reviewer: {item.qa.reviewer || item.qa.checkedBy || "unknown"} ·
                        Trusted merge approved: {item.qa.trustedMergeApproved ? "yes" : "no"} · Trusted merge executed:{" "}
                        {item.qa.trustedMergeExecuted ? "yes" : "no"}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
              No extraction drafts yet. Create drafts after at least one review queue item is approved and mergeReady.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
