"use client";

import { useMemo, useState } from "react";

type SourceWatchStatusResponse = {
  ok?: boolean;
  code?: string;
  generatedAt?: string;
  readOnly?: boolean;
  safety?: {
    autoMerge?: boolean;
    mergePolicy?: string;
    trustedKnowledgeWrite?: boolean;
    trustedMergeExecuted?: boolean;
  };
  sourceWatch?: {
    inbox?: {
      exists?: boolean;
      generatedAt?: string | null;
      pendingSourceUpdateDrafts?: number | null;
      latestSourceUpdateDrafts?: number | null;
      recentReports?: number | null;
      state?: {
        sourceCount?: number | null;
        okCount?: number | null;
        failedCount?: number | null;
        latestCheckedAt?: string | null;
      } | null;
    };
    qualityGate?: {
      exists?: boolean;
      ok?: boolean | null;
      scannedDrafts?: number | null;
      quarantined?: number | null;
      keptPending?: number | null;
    };
    recovery?: {
      exists?: boolean;
      ok?: boolean | null;
      originalFailedCount?: number | null;
      recoveredCount?: number | null;
      unresolvedCount?: number | null;
    };
    recoveryReviewQa?: {
      exists?: boolean;
      ok?: boolean | null;
      phase?: string | null;
      title?: string | null;
    };
  };
  reviewQueue?: {
    itemCount?: number;
    statusCounts?: Record<string, number>;
    duplicateIdCount?: number;
    autoMerge?: boolean;
    mergePolicy?: string;
    trustedMergeExecutedTrueCount?: number;
    autoMergeTrueCount?: number;
    trustedKnowledgeChangedTrueCount?: number;
  };
};

function valueText(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function boolText(value: unknown) {
  return value ? "ON" : "OFF";
}

export default function SourceWatchQuickRefreshCard() {
  const [status, setStatus] = useState<SourceWatchStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Click refresh to load live source-watch status.");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const inbox = status?.sourceWatch?.inbox;
    const queue = status?.reviewQueue;
    const safety = status?.safety;

    return [
      {
        label: "Watched sources",
        value: valueText(inbox?.state?.sourceCount),
        sub: `${valueText(inbox?.state?.okCount)} ok · ${valueText(inbox?.state?.failedCount)} failed`,
      },
      {
        label: "Source drafts",
        value: valueText(inbox?.latestSourceUpdateDrafts),
        sub: `${valueText(inbox?.pendingSourceUpdateDrafts)} pending drafts`,
      },
      {
        label: "Review queue",
        value: valueText(queue?.itemCount),
        sub: `${valueText(queue?.statusCounts?.pending_review)} pending · ${valueText(queue?.statusCounts?.rejected)} rejected`,
      },
      {
        label: "Duplicates",
        value: valueText(queue?.duplicateIdCount),
        sub: `Auto merge ${boolText(queue?.autoMerge || safety?.autoMerge)}`,
      },
    ];
  }, [status]);

  async function refreshStatus() {
    setLoading(true);
    setError("");
    setMessage("Refreshing live source-watch status...");

    try {
      // BUILDSETU_PHASE_M12D_KNOWLEDGE_INBOX_QUICK_REFRESH_FETCH
      const res = await fetch("/api/agent-knowledge/source-watch/status", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const json = (await res.json().catch(() => null)) as SourceWatchStatusResponse | null;

      if (!res.ok || !json?.ok) {
        throw new Error((json as any)?.error || `Refresh failed with HTTP ${res.status}`);
      }

      setStatus(json);
      setMessage(`Live status refreshed at ${json.generatedAt || new Date().toISOString()}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to refresh source-watch status.");
      setMessage("Refresh failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      data-buildsetu-marker="BUILDSETU_PHASE_M12D_KNOWLEDGE_INBOX_SOURCE_WATCH_QUICK_REFRESH"
      className="mx-auto mb-6 max-w-6xl rounded-3xl border border-emerald-400/30 bg-emerald-950/20 p-5 text-slate-100"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Live source-watch refresh
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Refresh source-watch and review-queue status
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            This reads the live read-only status API. It does not approve, reject, merge, or write trusted knowledge.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshStatus}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Quick refresh status"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
        <p className={error ? "font-bold text-red-200" : "font-bold text-emerald-100"}>{error || message}</p>
        {status?.safety ? (
          <p className="mt-2 text-xs text-slate-400">
            Safety: autoMerge {boolText(status.safety.autoMerge)} · trustedWrite{" "}
            {boolText(status.safety.trustedKnowledgeWrite)} · trustedMerge{" "}
            {boolText(status.safety.trustedMergeExecuted)} · policy{" "}
            {status.safety.mergePolicy || "manual_review_required"}
          </p>
        ) : null}
      </div>

      {status ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="font-bold text-white">Quality gate</p>
              <p className="mt-1 text-slate-300">OK: {status.sourceWatch?.qualityGate?.ok ? "yes" : "no"}</p>
              <p className="text-slate-400">
                Scanned: {valueText(status.sourceWatch?.qualityGate?.scannedDrafts)}
              </p>
              <p className="text-slate-400">
                Quarantined: {valueText(status.sourceWatch?.qualityGate?.quarantined)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="font-bold text-white">Recovery</p>
              <p className="mt-1 text-slate-300">OK: {status.sourceWatch?.recovery?.ok ? "yes" : "no"}</p>
              <p className="text-slate-400">
                Recovered/unresolved: {valueText(status.sourceWatch?.recovery?.recoveredCount)} /{" "}
                {valueText(status.sourceWatch?.recovery?.unresolvedCount)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="font-bold text-white">Review queue safety</p>
              <p className="mt-1 text-slate-300">
                Duplicate IDs: {valueText(status.reviewQueue?.duplicateIdCount)}
              </p>
              <p className="text-slate-400">
                Trusted merge executed: {valueText(status.reviewQueue?.trustedMergeExecutedTrueCount)}
              </p>
              <p className="text-slate-400">
                Trusted knowledge changed: {valueText(status.reviewQueue?.trustedKnowledgeChangedTrueCount)}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
