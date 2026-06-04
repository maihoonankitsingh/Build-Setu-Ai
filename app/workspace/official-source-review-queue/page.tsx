"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QueueItem = {
  id: string;
  status: string;
  title: string;
  url: string;
  domains?: string[];
  sourcePackId?: string;
  sourcePackTitle?: string;
  authorityType?: string;
  reviewRequired?: boolean;
  mergePolicy?: string;
  trustedMergeBlockedUntilApproved?: boolean;
  autoMerge?: boolean;
  nextAction?: string;
  reviewChecklist?: string[];
};

type QueueResponse = {
  ok: boolean;
  code?: string;
  error?: string;
  queuePath?: string;
  mergePolicy?: string;
  autoMerge?: boolean;
  sourceCandidateCount?: number;
  summary?: {
    total?: number;
    byStatus?: Record<string, number>;
    byDomain?: Record<string, number>;
    bySourcePack?: Record<string, number>;
    autoMerge?: boolean;
    mergePolicy?: string;
  };
  sourceCandidates?: QueueItem[];
  items?: QueueItem[];
  updatedAt?: string;
};

function formatCountMap(value?: Record<string, number>) {
  const entries = Object.entries(value || {}).sort((a, b) => b[1] - a[1]);

  if (!entries.length) return "None";

  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ");
}

function statusBadge(status: string) {
  const normalized = String(status || "unknown").replace(/_/g, " ");
  return normalized;
}

export default function OfficialSourceReviewQueuePage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastAction, setLastAction] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/agent-knowledge/official-source-review-queue", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const json = (await res.json().catch(() => null)) as QueueResponse | null;

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Request failed with ${res.status}`);
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncQueue = useCallback(async () => {
    setSyncing(true);
    setError("");
    setLastAction("");

    try {
      const res = await fetch("/api/agent-knowledge/official-source-review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ action: "sync" }),
      });

      const json = (await res.json().catch(() => null)) as QueueResponse & {
        created?: number;
        preserved?: number;
        trustedKnowledgeChanged?: boolean;
      };

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Sync failed with ${res.status}`);
      }

      setData(json);
      setLastAction(
        `Synced. Created ${json.created ?? 0}, preserved ${json.preserved ?? 0}. Trusted knowledge changed: ${
          json.trustedKnowledgeChanged ? "yes" : "no"
        }.`,
      );
    } catch (err: any) {
      setError(err?.message || "Failed to sync review queue.");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const items = useMemo(() => data?.items || [], [data]);
  const candidates = useMemo(() => data?.sourceCandidates || [], [data]);

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
                Official Source Review Queue
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Read/sync-only visibility for trusted source candidates. This page does not approve,
                reject, merge, or write trusted knowledge. Sources must pass manual review before any
                trusted merge.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/workspace/knowledge-inbox"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
              >
                Knowledge Inbox
              </a>
              <button
                type="button"
                onClick={loadQueue}
                disabled={loading || syncing}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={syncQueue}
                disabled={loading || syncing}
                className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync from source packs"}
              </button>
            </div>
          </div>
        </header>

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
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Queue Items</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.summary?.total ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Candidates</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.sourceCandidateCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Auto Merge</p>
            <p className="mt-2 text-3xl font-bold text-white">{data?.autoMerge ? "ON" : "OFF"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Policy</p>
            <p className="mt-2 text-sm font-bold text-white">{data?.mergePolicy || "manual_review_required"}</p>
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
            Queue path: {data?.queuePath || "data/buildsetu-source-review-queue/queue.json"}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">Pending review items</h2>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading queue...</p>
          ) : items.length ? (
            <div className="mt-4 space-y-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                        {statusBadge(item.status)}
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
                    </div>
                    <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-100">
                      Merge blocked until approved
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(item.domains || []).map((domain) => (
                      <span
                        key={`${item.id}-${domain}`}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-3">
                    <p>Source pack: {item.sourcePackId || "none"}</p>
                    <p>Policy: {item.mergePolicy || "manual_review_required"}</p>
                    <p>Auto merge: {item.autoMerge ? "true" : "false"}</p>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-100">Review checklist</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {(item.reviewChecklist || []).map((step) => (
                        <li key={`${item.id}-${step}`}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
              No queue items yet. Use “Sync from source packs” to create pending-review entries.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">Source candidates</h2>

          {candidates.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {candidates.map((candidate) => (
                <article key={candidate.url} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <h3 className="font-bold text-white">{candidate.title}</h3>
                  <a
                    href={candidate.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block break-all text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    {candidate.url}
                  </a>
                  <p className="mt-3 text-xs text-slate-400">
                    {candidate.sourcePackTitle || candidate.sourcePackId || "No source pack"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(candidate.domains || []).map((domain) => (
                      <span
                        key={`${candidate.url}-${domain}`}
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No source candidates found.</p>
          )}
        </section>
      </div>
    </main>
  );
}
