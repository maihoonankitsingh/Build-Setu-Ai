"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
    claims?: unknown[];
    cautions?: string[];
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
};

function formatCountMap(value?: Record<string, number>) {
  const entries = Object.entries(value || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "None";
  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ");
}

export default function OfficialSourceExtractionDraftsPage() {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [lastAction, setLastAction] = useState("");

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
    } catch (err: any) {
      setError(err?.message || "Failed to load extraction drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, []);

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
                Create extraction drafts from approved and merge-ready review queue items. This page
                creates draft records only. It does not merge or write trusted knowledge.
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
                disabled={loading || creating}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={createDrafts}
                disabled={loading || creating}
                className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create drafts from approved review items"}
              </button>
            </div>
          </div>
        </header>

        <section
          data-buildsetu-marker="BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFTS_UI_V1"
          className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100"
        >
          No trusted merge button is present. Extraction drafts are draft-only. Trusted knowledge
          write is disabled and merge remains a separate future phase.
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(candidate.domains || []).map((domain) => (
                      <span key={`${candidate.id}-${domain}`} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                        {domain}
                      </span>
                    ))}
                  </div>
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
          <h2 className="text-lg font-bold text-white">Extraction draft items</h2>

          {items.length ? (
            <div className="mt-4 space-y-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
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
                  <p className="mt-3 text-xs text-slate-400">Citation: {item.sourceCitation || "Missing"}</p>

                  <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
                    <p>Policy: {item.extractionPolicy || "draft_only_manual_review_required"}</p>
                    <p>Trusted write: {item.trustedKnowledgeWrite ? "true" : "false"}</p>
                    <p>Trusted merge executed: {item.trustedMergeExecuted ? "true" : "false"}</p>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-100">Extraction checklist</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {(item.extractionChecklist || []).map((step) => (
                        <li key={`${item.id}-${step}`}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
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
