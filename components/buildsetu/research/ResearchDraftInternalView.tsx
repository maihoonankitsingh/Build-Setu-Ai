"use client";

import { useEffect, useMemo, useState } from "react";

type DraftStatus = "pending_review" | "approved" | "merged" | "rejected" | "all";

type DraftListItem = {
  folder?: string;
  file?: string;
  id?: string;
  status?: string;
  category?: string;
  riskLevel?: string;
  confidence?: string;
  jurisdiction?: {
    country?: string;
    stateOrProvinceOrEmirate?: string;
    cityOrAuthority?: string;
  };
  source?: {
    title?: string;
    url?: string;
    sourceType?: string;
    publisher?: string;
  };
  review?: {
    reviewer?: string;
    reviewNotes?: string;
    reviewedAt?: string;
    mergeReady?: boolean;
  };
  merge?: {
    target?: string;
    backup?: string;
    mergedAt?: string;
    mergedBy?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

const TABS: { key: DraftStatus; label: string }[] = [
  { key: "pending_review", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "merged", label: "Merged" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" }
];

function statusLabel(status?: string) {
  if (status === "pending_review") return "Pending review";
  if (status === "approved") return "Approved";
  if (status === "merged") return "Merged";
  if (status === "rejected") return "Rejected";
  return "Unknown";
}

function categoryLabel(category?: string) {
  if (category === "authorityApprovalBylaws") return "Authority rules";
  if (category === "materialRatesCost") return "Rates / cost";
  if (category === "productMaterialSpecs") return "Product datasheet";
  if (category === "codeStandardsReference") return "Codes / standards";
  if (category === "climateHazardSiteContext") return "Climate / hazard";
  if (category === "constructionMethodsBestPractice") return "Construction method";
  if (category === "designReferenceTrend") return "Design reference";
  return category || "Research draft";
}

function pillClass(kind: "status" | "risk" | "confidence", value?: string) {
  if (kind === "status") {
    if (value === "pending_review") return "border-[#d8c5ff] bg-[#f3edff] text-[#6d28d9]";
    if (value === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (value === "merged") return "border-indigo-200 bg-indigo-50 text-indigo-700";
    if (value === "rejected") return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (kind === "risk") {
    if (value === "high") return "border-red-200 bg-red-50 text-red-700";
    if (value === "medium_high") return "border-orange-200 bg-orange-50 text-orange-700";
    if (value === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
    if (value === "low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function locationText(draft: DraftListItem) {
  const j = draft.jurisdiction || {};
  const parts = [j.country, j.stateOrProvinceOrEmirate, j.cityOrAuthority].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Location not specified";
}

function shortId(id?: string) {
  if (!id) return "No ID";
  const clean = id.replace(/^draft_/, "");
  return clean.length > 18 ? `${clean.slice(0, 10)}…${clean.slice(-6)}` : clean;
}

function host(url?: string) {
  if (!url) return "No source URL";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function ResearchDraftInternalView() {
  const [activeTab, setActiveTab] = useState<DraftStatus>("pending_review");
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftListItem[]>([]);
  const [selected, setSelected] = useState<DraftListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  async function loadDrafts(status: DraftStatus = activeTab) {
    setLoading(true);
    setNotice("");

    try {
      const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
      const [activeRes, allRes] = await Promise.all([
        fetch(`/api/research-drafts/list${query}`, { cache: "no-store" }),
        fetch("/api/research-drafts/list", { cache: "no-store" })
      ]);

      const activeData = await activeRes.json();
      const allData = await allRes.json();

      if (!activeData.ok) throw new Error(activeData.message || activeData.error || "Failed to load drafts");

      setDrafts(activeData.drafts || []);
      setAllDrafts(allData.ok ? allData.drafts || [] : activeData.drafts || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const counts = useMemo(() => {
    const output: Record<DraftStatus, number> = {
      pending_review: 0,
      approved: 0,
      merged: 0,
      rejected: 0,
      all: allDrafts.length
    };

    for (const draft of allDrafts) {
      const key = draft.status as DraftStatus;
      if (key in output) output[key] += 1;
    }

    return output;
  }, [allDrafts]);

  async function reviewDraft(action: "approve" | "reject", draft: DraftListItem = selected || {}) {
    if (!draft.id) return;

    setActionLoading(`${action}:${draft.id}`);
    setNotice("");

    try {
      const res = await fetch("/api/research-drafts/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          action,
          reviewer: "BuildSetu Admin",
          reviewNotes: reviewNotes || (action === "approve" ? "Approved from dashboard Knowledge Inbox." : "Rejected from dashboard Knowledge Inbox."),
          professionalReviewRequired: true,
          mergeReady: action === "approve"
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || `${action} failed`);

      setNotice(action === "approve" ? "Draft approved." : "Draft rejected.");
      setSelected(data.draft || null);
      await loadDrafts(activeTab);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setActionLoading("");
    }
  }

  async function mergeDraft(draft: DraftListItem = selected || {}) {
    if (!draft.id) return;

    setActionLoading(`merge:${draft.id}`);
    setNotice("");

    try {
      const res = await fetch("/api/research-drafts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          reviewer: "BuildSetu Admin",
          mergeNotes: reviewNotes || "Merged from dashboard Knowledge Inbox."
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || "Merge failed");

      setNotice("Draft merged into knowledge.");
      setSelected(data.draft || null);
      await loadDrafts(activeTab);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Merge failed");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden rounded-[28px] border border-[#eee7f7] bg-white shadow-sm">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-w-0 flex-col overflow-hidden border-r border-[#eee7f7]">
          <div className="shrink-0 border-b border-[#eee7f7] bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[16px] font-bold leading-6 text-[#21133f]">Knowledge Inbox</h1>
                <p className="text-[14px] leading-6 text-[#817397]">
                  Review source drafts before they update BuildSetu agent knowledge.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-9 rounded-xl border border-[#eadcff] bg-[#fbf8ff] px-3 text-[14px] font-semibold leading-9 text-[#6f1cc4]">
                  {drafts.length} drafts
                </span>
                <button
                  onClick={() => loadDrafts(activeTab)}
                  className="h-9 rounded-xl border border-[#ded5ec] bg-white px-3 text-[14px] font-semibold text-[#5d5077] hover:bg-[#fbf8ff]"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelected(null);
                    }}
                    className={`h-9 rounded-xl px-3 text-[14px] font-semibold transition ${
                      active
                        ? "bg-[#7c3aed] text-white shadow-sm"
                        : "border border-[#eee7f7] bg-white text-[#5d5077] hover:bg-[#fbf8ff]"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-2 rounded-full px-1.5 text-[12px] ${active ? "bg-white/20" : "bg-[#f3edff] text-[#6d28d9]"}`}>
                      {counts[tab.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {notice ? (
              <div className="mt-3 rounded-xl border border-[#eadcff] bg-[#fbf8ff] px-3 py-2 text-[14px] text-[#5d5077]">
                {notice}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto bg-[#fbfaff] p-5">
            <div className="space-y-3">
              {drafts.length === 0 && !loading ? (
                <div className="rounded-2xl border border-dashed border-[#d8c5ff] bg-white p-8 text-center">
                  <div className="text-[16px] font-semibold text-[#21133f]">No drafts in this queue</div>
                  <p className="mt-2 text-[14px] text-[#817397]">
                    Research drafts created by the agent will appear here for review.
                  </p>
                </div>
              ) : null}

              {drafts.map((draft) => {
                const isSelected = selected?.id === draft.id;
                const canApprove = draft.status === "pending_review";
                const canMerge = draft.status === "approved";

                return (
                  <article
                    key={`${draft.folder}-${draft.id}-${draft.file}`}
                    className={`rounded-2xl border bg-white p-4 transition ${
                      isSelected
                        ? "border-[#7c3aed] shadow-md ring-2 ring-[#7c3aed]/10"
                        : "border-[#eee7f7] shadow-sm hover:border-[#c4b5fd]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button onClick={() => setSelected(draft)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap gap-2">
                          <Pill className={pillClass("status", draft.status)}>{statusLabel(draft.status)}</Pill>
                          <Pill className={pillClass("risk", draft.riskLevel)}>{draft.riskLevel || "risk unknown"}</Pill>
                          <Pill className={pillClass("confidence", draft.confidence)}>{draft.confidence || "confidence unknown"}</Pill>
                        </div>

                        <div className="mt-3 text-[16px] font-bold leading-6 text-[#21133f]">
                          {categoryLabel(draft.category)}
                        </div>
                        <div className="text-[14px] leading-6 text-[#817397]">
                          {locationText(draft)}
                        </div>
                      </button>

                      <button onClick={() => setSelected(draft)} className="shrink-0 text-right text-[12px] leading-5 text-[#9b90ad]">
                        <div>{shortId(draft.id)}</div>
                        <div>{formatDate(draft.updatedAt || draft.createdAt)}</div>
                      </button>
                    </div>

                    <button
                      onClick={() => setSelected(draft)}
                      className="mt-3 block w-full rounded-xl border border-[#eee7f7] bg-[#fbfaff] px-3 py-2 text-left"
                    >
                      <div className="truncate text-[14px] font-semibold leading-5 text-[#21133f]">
                        {draft.source?.title || "Untitled source"}
                      </div>
                      <div className="truncate text-[14px] leading-5 text-[#817397]">
                        {host(draft.source?.url)}
                      </div>
                    </button>

                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setSelected(draft)}
                        className="h-9 rounded-xl border border-[#ded5ec] bg-white text-[14px] font-semibold text-[#5d5077] hover:bg-[#fbf8ff]"
                      >
                        Review
                      </button>

                      {canApprove ? (
                        <>
                          <button
                            onClick={() => reviewDraft("approve", draft)}
                            disabled={Boolean(actionLoading)}
                            className="h-9 rounded-xl border border-emerald-500 bg-white text-[14px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {actionLoading === `approve:${draft.id}` ? "Approving..." : "Approve"}
                          </button>
                          <button
                            onClick={() => reviewDraft("reject", draft)}
                            disabled={Boolean(actionLoading)}
                            className="h-9 rounded-xl border border-red-400 bg-white text-[14px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {actionLoading === `reject:${draft.id}` ? "Rejecting..." : "Reject"}
                          </button>
                        </>
                      ) : canMerge ? (
                        <button
                          onClick={() => mergeDraft(draft)}
                          disabled={Boolean(actionLoading)}
                          className="col-span-2 h-9 rounded-xl bg-[#7c3aed] text-[14px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50"
                        >
                          {actionLoading === `merge:${draft.id}` ? "Merging..." : "Merge"}
                        </button>
                      ) : (
                        <div className="col-span-2 grid h-9 place-items-center rounded-xl bg-slate-50 text-[14px] text-slate-400">
                          No action required
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="flex min-w-0 flex-col overflow-hidden bg-white">
          <div className="shrink-0 border-b border-[#eee7f7] px-5 py-4">
            <h2 className="text-[16px] font-bold leading-6 text-[#21133f]">Draft Inspector</h2>
            <p className="text-[14px] leading-6 text-[#817397]">
              {selected ? "Review selected source metadata." : "Select a draft card to inspect and approve."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#eee7f7] bg-[#fbfaff] p-4">
                  <div className="text-[12px] font-semibold uppercase tracking-wide text-[#6d28d9]">Selected draft</div>
                  <div className="mt-1 break-all text-[16px] font-bold text-[#21133f]">{shortId(selected.id)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill className={pillClass("status", selected.status)}>{statusLabel(selected.status)}</Pill>
                    <Pill className={pillClass("risk", selected.riskLevel)}>{selected.riskLevel || "risk unknown"}</Pill>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eee7f7] bg-white p-4">
                  <div className="text-[16px] font-bold text-[#21133f]">Source</div>
                  <div className="mt-3 space-y-3 text-[14px] leading-6">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#9b90ad]">Title</div>
                      <div className="text-[#21133f]">{selected.source?.title || "Untitled"}</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#9b90ad]">URL</div>
                      <div className="break-all text-[#6d28d9]">{selected.source?.url || "No URL"}</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#9b90ad]">Location</div>
                      <div className="text-[#21133f]">{locationText(selected)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eee7f7] bg-white p-4">
                  <div className="text-[16px] font-bold text-[#21133f]">Review note</div>
                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Write why this source is approved, rejected, or merged..."
                    className="mt-3 min-h-28 w-full resize-none rounded-xl border border-[#ded5ec] bg-[#fbfaff] p-3 text-[14px] leading-6 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                  />
                </div>

                <div className="grid gap-2">
                  {selected.status === "pending_review" ? (
                    <>
                      <button
                        onClick={() => reviewDraft("approve")}
                        disabled={Boolean(actionLoading)}
                        className="h-10 rounded-xl bg-emerald-600 text-[14px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewDraft("reject")}
                        disabled={Boolean(actionLoading)}
                        className="h-10 rounded-xl border border-red-400 text-[14px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : selected.status === "approved" ? (
                    <button
                      onClick={() => mergeDraft()}
                      disabled={Boolean(actionLoading)}
                      className="h-10 rounded-xl bg-[#7c3aed] text-[14px] font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50"
                    >
                      Merge
                    </button>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[#eee7f7] bg-white p-4">
                  <div className="text-[16px] font-bold text-[#21133f]">File</div>
                  <div className="mt-2 break-all text-[12px] leading-5 text-[#817397]">{selected.file || "—"}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#eee7f7] bg-[#fbfaff] p-4">
                  <div className="text-[16px] font-bold text-[#21133f]">What this page does</div>
                  <div className="mt-3 space-y-3 text-[14px] leading-6 text-[#5d5077]">
                    <div>• Prevents unverified internet data from entering agent knowledge.</div>
                    <div>• Shows risk, source type, and jurisdiction before approval.</div>
                    <div>• Merges only reviewed drafts into knowledge JSON.</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#eee7f7] bg-white p-4">
                  <div className="text-[16px] font-bold text-[#21133f]">Best review rule</div>
                  <p className="mt-2 text-[14px] leading-6 text-[#817397]">
                    Approve only official, trusted, or manufacturer-level sources. Reject low-confidence blogs or unclear sources.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
