"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReviewStatus = "pending_review" | "approved" | "rejected";

type QueueItem = {
  id: string;
  status: string;
  title: string;
  url: string;
  domains?: string[];
  sourcePackId?: string;
  publisher?: string;
  sourceId?: string;
  sourcePackTitle?: string;
  authorityType?: string;
  reviewRequired?: boolean;
  mergePolicy?: string;
  trustedMergeBlockedUntilApproved?: boolean;
  trustedMergeExecuted?: boolean;
  trustedKnowledgeChanged?: boolean;
  autoMerge?: boolean;
  nextAction?: string;
  reviewChecklist?: string[];
  source?: Record<string, any>;
  review?: {
    reviewer?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
    mergeReady?: boolean;
    status?: string;
    trustedMergeExecuted?: boolean;
  };
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

type ReviewFormState = {
  reviewer: string;
  notes: string;
  mergeReady: boolean;
};

function formatCountMap(value?: Record<string, number>) {
  const entries = Object.entries(value || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "None";
  return entries.map(([key, count]) => `${key}: ${count}`).join(" · ");
}

function statusBadge(status: string) {
  return String(status || "unknown").replace(/_/g, " ");
}

function statusClass(status: string) {
  if (status === "approved") return "border-emerald-400/40 bg-emerald-950/30 text-emerald-100";
  if (status === "rejected") return "border-red-400/40 bg-red-950/30 text-red-100";
  return "border-amber-400/40 bg-amber-950/30 text-amber-100";
}

function sourcePackLabel(value: string) {
  const clean = String(value || "none");
  if (clean === "pending_exact_source_candidates") return "Pending exact source candidates";
  if (clean === "all_india_state_ut_authority_index_pack") return "All India authority index";
  return clean.replace(/_/g, " ");
}

function itemIsReviewed(item: QueueItem) {
  return Boolean(item.review?.reviewedAt || item.status === "approved" || item.status === "rejected");
}

function initialFormState(item: QueueItem): ReviewFormState {
  return {
    reviewer: item.review?.reviewer || "workspace-review",
    notes: item.review?.notes || "",
    mergeReady: Boolean(item.review?.mergeReady),
  };
}

export default function OfficialSourceReviewQueuePage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const [error, setError] = useState("");
  const [lastAction, setLastAction] = useState("");
  const [reviewForms, setReviewForms] = useState<Record<string, ReviewFormState>>({});

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

      const nextForms: Record<string, ReviewFormState> = {};
      for (const item of json.items || []) {
        nextForms[item.id] = initialFormState(item);
      }
      setReviewForms(nextForms);
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

      const nextForms: Record<string, ReviewFormState> = {};
      for (const item of json.items || []) {
        nextForms[item.id] = initialFormState(item);
      }
      setReviewForms(nextForms);

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

  const updateReviewForm = useCallback((itemId: string, patch: Partial<ReviewFormState>) => {
    setReviewForms((current) => ({
      ...current,
      [itemId]: {
        reviewer: current[itemId]?.reviewer || "workspace-review",
        notes: current[itemId]?.notes || "",
        mergeReady: current[itemId]?.mergeReady || false,
        ...patch,
      },
    }));
  }, []);

  const submitReview = useCallback(
    async (item: QueueItem, status: ReviewStatus) => {
      // BUILDSETU_PHASE_M8Y_REVIEW_ACTION_CONFIRMATION_GUARD
      const explicitStatusLabel =
        status === "approved"
          ? "APPROVED"
          : status === "rejected"
            ? "REJECTED"
            : "PENDING_REVIEW";
      const explicitActionLabel =
        status === "approved"
          ? "Approve reference"
          : status === "rejected"
            ? "Reject source"
            : "Back to pending";
      if (typeof window !== "undefined") {
        const ok = window.confirm(
          `${explicitActionLabel}\n\nBUILDSETU_PHASE_M8Y_FIX1_CONFIRM_STATUS_AUDIT\nThis will save status: ${explicitStatusLabel}\n\nItem: ${item.title || item.id}\n\nContinue?`
        );
        if (!ok) return;
      }
      setReviewingId(item.id);
      setError("");
      setLastAction("");

      const form = reviewForms[item.id] || initialFormState(item);

      try {
        const res = await fetch("/api/agent-knowledge/official-source-review-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "same-origin",
          body: JSON.stringify({
            action: "review",
            itemId: item.id,
            status,
            reviewer: form.reviewer || "workspace-review",
            notes: form.notes,
            mergeReady: status === "approved" ? form.mergeReady : false,
          }),
        });

        const json = (await res.json().catch(() => null)) as QueueResponse & {
          item?: QueueItem;
          trustedKnowledgeChanged?: boolean;
          trustedMergeExecuted?: boolean;
        };

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Review update failed with ${res.status}`);
        }

        setData((current) => {
          if (!current) return json;
          const updatedItem = json.item;
          const currentItems = current.items || [];
          return {
            ...current,
            summary: json.summary || current.summary,
            items: updatedItem
              ? currentItems.map((existing) => (existing.id === updatedItem.id ? updatedItem : existing))
              : currentItems,
          };
        });

        if (json.item) {
          updateReviewForm(json.item.id, initialFormState(json.item));
        }

        setLastAction(
          `Review saved as ${status.replace(/_/g, " ")}. Trusted knowledge changed: ${
            json.trustedKnowledgeChanged ? "yes" : "no"
          }. Trusted merge executed: ${json.trustedMergeExecuted ? "yes" : "no"}.`,
        );
      } catch (err: any) {
        setError(err?.message || "Failed to save review action.");
      } finally {
        setReviewingId("");
      }
    },
    [reviewForms, updateReviewForm],
  );


  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const items = useMemo(() => data?.items || [], [data]);
  const candidates = useMemo(() => data?.sourceCandidates || [], [data]);

  const [queueSearch, setQueueSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");
  const [queueSourcePackFilter, setQueueSourcePackFilter] = useState("all");
  const [queueReviewStateFilter, setQueueReviewStateFilter] = useState("all");

  const queueCounts = useMemo(() => {
    const pendingExact = items.filter((item) => item.sourcePackId === "pending_exact_source_candidates").length;
    const sourcePack = items.filter((item) => item.sourcePackId !== "pending_exact_source_candidates").length;
    const pendingReview = items.filter((item) => item.status === "pending_review").length;
    const approved = items.filter((item) => item.status === "approved").length;
    const rejected = items.filter((item) => item.status === "rejected").length;
    const reviewed = items.filter((item) => itemIsReviewed(item)).length;
    const unreviewed = items.filter((item) => !itemIsReviewed(item)).length;

    const idCounts = items.reduce<Record<string, number>>((acc, item) => {
      const id = item.id || "missing_id";
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});

    const duplicateIdCount = Object.values(idCounts).filter((count) => count > 1).length;
    const trustedMergeExecutedTrue = items.filter(
      (item) => item.trustedMergeExecuted === true || item.review?.trustedMergeExecuted === true,
    ).length;
    const autoMergeTrue = items.filter((item) => item.autoMerge === true).length;
    const trustedKnowledgeChangedTrue = items.filter((item) => item.trustedKnowledgeChanged === true).length;

    return {
      all: items.length,
      pendingExact,
      sourcePack,
      pendingReview,
      approved,
      rejected,
      reviewed,
      unreviewed,
      duplicateIdCount,
      trustedMergeExecutedTrue,
      autoMergeTrue,
      trustedKnowledgeChangedTrue,
    };
  }, [items]);

  const queueSourcePackOptions = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((acc, item) => {
      const key = item.sourcePackId || "none";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return [
      { id: "all", label: "All source packs", count: items.length },
      ...Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, label: sourcePackLabel(id), count })),
    ];
  }, [items]);

  const queueReviewStateOptions = [
    { id: "all", label: "All review states", count: queueCounts.all },
    { id: "reviewed", label: "Reviewed only", count: queueCounts.reviewed },
    { id: "unreviewed", label: "Unreviewed only", count: queueCounts.unreviewed },
  ];

  const filteredItems = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();

    return items.filter((item) => {
      const isPendingExact = item.sourcePackId === "pending_exact_source_candidates";
      const sourcePackId = item.sourcePackId || "none";
      const reviewed = itemIsReviewed(item);

      if (queueFilter === "pending_exact" && !isPendingExact) return false;
      if (queueFilter === "source_pack" && isPendingExact) return false;
      if (queueFilter === "pending_review" && item.status !== "pending_review") return false;
      if (queueFilter === "approved" && item.status !== "approved") return false;
      if (queueFilter === "rejected" && item.status !== "rejected") return false;

      if (queueSourcePackFilter !== "all" && sourcePackId !== queueSourcePackFilter) return false;
      if (queueReviewStateFilter === "reviewed" && !reviewed) return false;
      if (queueReviewStateFilter === "unreviewed" && reviewed) return false;

      if (!query) return true;

      const haystack = [
        item.id,
        item.title,
        item.url,
        item.sourceId,
        item.sourcePackId,
        item.sourcePackTitle,
        item.authorityType,
        item.publisher,
        item.review?.reviewer,
        item.review?.notes,
        item.source?.jurisdiction,
        item.source?.confidence,
        item.source?.decision,
        ...(item.domains || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, queueFilter, queueSearch, queueSourcePackFilter, queueReviewStateFilter]);

  const queueFilterOptions = [
    { id: "all", label: "All", count: queueCounts.all },
    { id: "pending_exact", label: "Pending exact", count: queueCounts.pendingExact },
    { id: "source_pack", label: "Source packs", count: queueCounts.sourcePack },
    { id: "pending_review", label: "Pending review", count: queueCounts.pendingReview },
    { id: "approved", label: "Approved", count: queueCounts.approved },
    { id: "rejected", label: "Rejected", count: queueCounts.rejected },
  ];

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
                Review source candidates, add notes, and mark approve/reject/pending. This page still
                does not merge trusted knowledge. Merge remains a separate future phase.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/workspace/knowledge-inbox"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
              >
                Knowledge Inbox
              </a>
              <a
                href="/workspace/official-source-extraction-drafts"
                data-buildsetu-marker="BUILDSETU_OFFICIAL_SOURCE_EXTRACTION_DRAFTS_NAV_LINK_V1"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
              >
                Extraction Drafts
              </a>
              <button
                type="button"
                onClick={loadQueue}
                disabled={loading || syncing || Boolean(reviewingId)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={syncQueue}
                disabled={loading || syncing || Boolean(reviewingId)}
                className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync from source packs"}
              </button>
            </div>
          </div>
        </header>

        <section
          data-buildsetu-marker="BUILDSETU_OFFICIAL_SOURCE_REVIEW_ACTIONS_UI_V2"
          data-buildsetu-m8y="BUILDSETU_PHASE_M8Y_EXPLICIT_BUTTON_LABELS"
          className="rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100"
        >
          <p
            className="mt-2 text-xs text-amber-200"
            data-buildsetu-marker="BUILDSETU_PHASE_M8Y_FIX1_EXPLICIT_STATUS_LEGEND"
          >
            M8Y status actions: Approve reference (approved) · Reject source (rejected) · Back to pending (pending_review)
</p>
          Review controls available after sync: Approve notes only, Reject source, Back to pending.
          No trusted merge button is present. Trusted knowledge remains unchanged until a separate
          merge phase is implemented and verified.
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

        <section
          data-buildsetu-marker="BUILDSETU_REVIEW_QUEUE_FILTER_UI_V1"
          className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Review filters</h2>
              <p className="mt-1 text-sm text-slate-400">
                Filter {items.length} review items by source type, source pack, status, review state, jurisdiction, title, URL, confidence, or decision.
              </p>
            </div>

            <label className="block w-full lg:max-w-md">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Search queue
              </span>
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Search title, URL, jurisdiction, confidence..."
              />
            </label>
          </div>

          <div
            data-buildsetu-marker="BUILDSETU_PHASE_M14B_REVIEW_QUEUE_ADVANCED_FILTERS"
            className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]"
          >
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Source pack
              </span>
              <select
                value={queueSourcePackFilter}
                onChange={(event) => setQueueSourcePackFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              >
                {queueSourcePackOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.count}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Review state
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {queueReviewStateOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setQueueReviewStateFilter(option.id)}
                    className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                      queueReviewStateFilter === option.id
                        ? "border-emerald-300 bg-emerald-300 text-slate-950"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400 hover:text-emerald-200"
                    }`}
                  >
                    {option.label} · {option.count}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setQueueSearch("");
                  setQueueFilter("all");
                  setQueueSourcePackFilter("all");
                  setQueueReviewStateFilter("all");
                }}
                className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-200 lg:w-auto"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {queueFilterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setQueueFilter(option.id)}
                className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                  queueFilter === option.id
                    ? "border-cyan-300 bg-cyan-300 text-slate-950"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-400 hover:text-cyan-200"
                }`}
              >
                {option.label} · {option.count}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
            Showing <span className="font-bold text-white">{filteredItems.length}</span> of{" "}
            <span className="font-bold text-white">{items.length}</span> queue items. Active filters:{" "}
            <span className="font-bold text-white">{queueFilter}</span> ·{" "}
            <span className="font-bold text-white">{sourcePackLabel(queueSourcePackFilter)}</span> ·{" "}
            <span className="font-bold text-white">{queueReviewStateFilter}</span>. Auto merge remains OFF.
          </div>

          <div
            data-buildsetu-marker="BUILDSETU_PHASE_M14B_REVIEW_QUEUE_SAFETY_SUMMARY"
            className="mt-4 grid gap-3 text-xs md:grid-cols-4"
          >
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="font-bold text-white">Duplicate IDs</p>
              <p className={queueCounts.duplicateIdCount ? "mt-1 text-red-200" : "mt-1 text-emerald-200"}>
                {queueCounts.duplicateIdCount}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="font-bold text-white">Trusted merge executed</p>
              <p className={queueCounts.trustedMergeExecutedTrue ? "mt-1 text-red-200" : "mt-1 text-emerald-200"}>
                {queueCounts.trustedMergeExecutedTrue}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="font-bold text-white">Auto merge items</p>
              <p className={queueCounts.autoMergeTrue ? "mt-1 text-red-200" : "mt-1 text-emerald-200"}>
                {queueCounts.autoMergeTrue}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="font-bold text-white">Trusted knowledge changed</p>
              <p className={queueCounts.trustedKnowledgeChangedTrue ? "mt-1 text-red-200" : "mt-1 text-emerald-200"}>
                {queueCounts.trustedKnowledgeChangedTrue}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-bold text-white">Review queue items</h2>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading queue...</p>
          ) : filteredItems.length ? (
            <div className="mt-4 space-y-4">
              {filteredItems.map((item) => {
                const form = reviewForms[item.id] || initialFormState(item);
                const isBusy = reviewingId === item.id;

                return (
                  <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClass(
                            item.status,
                          )}`}
                        >
                          {statusBadge(item.status)}
                        </p>
                        <h3 className="mt-3 text-lg font-bold text-white">{item.title}</h3>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-sm text-cyan-300 hover:text-cyan-200"
                        >
                          {item.url}
                        </a>

                        {item.sourcePackId === "pending_exact_source_candidates" ? (
                          <div
                            data-buildsetu-marker="BUILDSETU_PENDING_EXACT_SOURCE_CANDIDATE_BADGE_V1"
                            className="mt-3 rounded-2xl border border-cyan-400/30 bg-cyan-950/30 p-3 text-xs text-cyan-100"
                          >
                            <p className="font-black uppercase tracking-[0.2em] text-cyan-200">
                              Pending exact source candidate
                            </p>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <p>
                                <span className="font-semibold text-slate-300">Jurisdiction:</span>{" "}
                                {item.source?.jurisdiction || "Needs review"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-300">Confidence:</span>{" "}
                                {item.source?.confidence || "Needs review"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-300">Decision:</span>{" "}
                                {item.source?.decision || "candidate_saved_needs_review"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-300">Registry:</span>{" "}
                                Source registry unchanged
                              </p>
                            </div>
                            <p className="mt-2 text-amber-100">
                              Trusted merge is blocked until manual review and separate merge phase approval.
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-100">
                        {item.trustedMergeBlockedUntilApproved
                          ? "Merge blocked until approved"
                          : "Approved for separate merge phase only"}
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

                    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_2fr]">
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Reviewer
                          </span>
                          <input
                            value={form.reviewer}
                            onChange={(event) => updateReviewForm(item.id, { reviewer: event.target.value })}
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                            placeholder="reviewer name"
                          />
                        </label>

                        <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={form.mergeReady}
                            onChange={(event) => updateReviewForm(item.id, { mergeReady: event.target.checked })}
                            className="h-4 w-4"
                          />
                          Merge-ready after approval only
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Review notes
                        </span>
                        <textarea
                          value={form.notes}
                          onChange={(event) => updateReviewForm(item.id, { notes: event.target.value })}
                          className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          placeholder="Add authority/applicability/date/quality notes. No trusted merge happens here."
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={Boolean(reviewingId)}
                        onClick={() => submitReview(item, "approved")}
                        className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                      >
                        {isBusy ? "Saving..." : "Approve notes only"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(reviewingId)}
                        onClick={() => submitReview(item, "rejected")}
                        className="rounded-xl bg-red-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-red-300 disabled:opacity-50"
                      >Reject source (rejected)</button>
                      <button
                        type="button"
                        disabled={Boolean(reviewingId)}
                        onClick={() => submitReview(item, "pending_review")}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-200 disabled:opacity-50"
                      >Back to pending (pending_review)</button>
                    </div>

                    {item.review?.reviewedAt ? (
                      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
                        Last reviewed: {item.review.reviewedAt} · Reviewer: {item.review.reviewer || item.review.reviewedBy || "unknown"} ·
                        Merge ready: {item.review.mergeReady ? "yes" : "no"} · Trusted merge executed:{" "}
                        {item.review.trustedMergeExecuted ? "yes" : "no"}
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-slate-100">Review checklist</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                        {(item.reviewChecklist || []).map((step) => (
                          <li key={`${item.id}-${step}`}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
              No queue items match the current filter/search. Clear search or switch to All.
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
