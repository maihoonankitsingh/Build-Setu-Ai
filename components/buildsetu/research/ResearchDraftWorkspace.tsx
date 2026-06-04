"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type DraftStatus = "pending_review" | "approved" | "merged" | "rejected" | "all";

type IconName =
  | "pending"
  | "approved"
  | "merged"
  | "rejected"
  | "all"
  | "source"
  | "rules"
  | "rates"
  | "product"
  | "code"
  | "climate"
  | "method"
  | "design"
  | "inspector"
  | "purpose"
  | "actions"
  | "file"
  | "workflow"
  | "shield"
  | "check";

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
    sourceUrl?: string;
    sourceType?: string;
    sourceCitation?: string;
    tags?: string[]; // BUILDSETU_RESEARCH_WORKSPACE_SOURCE_META_TYPES_V2
    publisher?: string;
    dateAccessed?: string;
    effectiveDate?: string;
    version?: string;
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
  sourceType?: string;
  sourceUrl?: string;
  sourceCitation?: string;
  tags?: string[];
};

const BUILDSETU_LOGO_SRC = "/brand/buildsetu-login-clean-logo.png";

const TABS: { key: DraftStatus; label: string; icon: IconName }[] = [
  { key: "pending_review", label: "Pending", icon: "pending" },
  { key: "approved", label: "Approved", icon: "approved" },
  { key: "merged", label: "Merged", icon: "merged" },
  { key: "rejected", label: "Rejected", icon: "rejected" },
  { key: "all", label: "All", icon: "all" }
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

function iconForCategory(category?: string): IconName {
  if (category === "authorityApprovalBylaws") return "rules";
  if (category === "materialRatesCost") return "rates";
  if (category === "productMaterialSpecs") return "product";
  if (category === "codeStandardsReference") return "code";
  if (category === "climateHazardSiteContext") return "climate";
  if (category === "constructionMethodsBestPractice") return "method";
  if (category === "designReferenceTrend") return "design";
  return "source";
}

function statusStyle(status?: string) {
  if (status === "pending_review") return "border-[#D9CCFF] bg-[#F3EFFF] text-[#6D28D9]";
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "merged") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (status === "rejected") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function riskStyle(risk?: string) {
  if (risk === "high") return "border-red-200 bg-red-50 text-red-700";
  if (risk === "medium_high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (risk === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  if (risk === "low") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function confidenceStyle(confidence?: string) {
  if (confidence === "high") return "border-violet-200 bg-violet-50 text-violet-700";
  if (confidence === "medium") return "border-slate-200 bg-slate-50 text-slate-700";
  if (confidence === "low") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function shortId(id?: string) {
  if (!id) return "No ID";
  const clean = id.replace(/^draft_/, "");
  if (clean.length <= 16) return clean;
  return `${clean.slice(0, 8)}…${clean.slice(-5)}`;
}

function host(url?: string) {
  if (!url) return "No source URL";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function locationText(draft: DraftListItem) {
  const j = draft.jurisdiction || {};
  const parts = [j.country, j.stateOrProvinceOrEmirate, j.cityOrAuthority].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Location not specified";
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

function IconSvg({ name }: { name: IconName }) {
  const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.35,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  if (name === "approved" || name === "check") return <><path {...base} d="M5 12.5 9.2 16.5 19 7" /><path {...base} d="M12 3.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4Z" opacity=".45" /></>;
  if (name === "rejected") return <><path {...base} d="m8 8 8 8M16 8l-8 8" /><path {...base} d="M12 3.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4Z" opacity=".45" /></>;
  if (name === "merged") return <><path {...base} d="M7 7h5l5 5-5 5H7l5-5-5-5Z" /><path {...base} d="M4 12h8" opacity=".55" /></>;
  if (name === "all") return <><path {...base} d="M5 7h14M5 12h14M5 17h14" /><path {...base} d="M3.5 7h.1M3.5 12h.1M3.5 17h.1" /></>;
  if (name === "pending") return <><path {...base} d="M12 3.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Z" /><path {...base} d="M12 8v5l3 2" opacity=".65" /></>;
  if (name === "rules" || name === "code" || name === "file") return <><path {...base} d="M7 4h8l3 3v13H7V4Z" /><path {...base} d="M15 4v4h4" /><path {...base} d="M9.5 12h5M9.5 15h6M9.5 18h4" opacity=".65" /></>;
  if (name === "rates") return <><path {...base} d="M6 5.5h12v13H6v-13Z" /><path {...base} d="M9 9h6M9 12h6M9 15h3" opacity=".65" /></>;
  if (name === "product") return <><path {...base} d="m12 3.5 7 4v9l-7 4-7-4v-9l7-4Z" /><path {...base} d="m5 7.5 7 4 7-4M12 11.5v9" opacity=".65" /></>;
  if (name === "climate") return <><path {...base} d="M8 16.5h8a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 5.7 10 3.5 3.5 0 0 0 8 16.5Z" /><path {...base} d="M8 20v-1M12 21v-2M16 20v-1" opacity=".65" /></>;
  if (name === "method") return <><path {...base} d="M5 18h14" /><path {...base} d="M7 15V9l5-4 5 4v6" /><path {...base} d="M9 15v-4h6v4" opacity=".7" /></>;
  if (name === "design") return <><path {...base} d="M5 19 19 5" /><path {...base} d="M7 7h4v4H7V7ZM13 13h4v4h-4v-4Z" /></>;
  if (name === "inspector") return <><path {...base} d="M6 5h12v14H6V5Z" /><path {...base} d="M9 9h6M9 12h6M9 15h4" opacity=".65" /></>;
  if (name === "purpose" || name === "shield") return <><path {...base} d="M12 21s7-4 7-11V5l-7-3-7 3v5c0 7 7 11 7 11Z" /><path {...base} d="m9 12 2 2 4-5" opacity=".65" /></>;
  if (name === "actions") return <path {...base} d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />;
  if (name === "workflow") return <><path {...base} d="M6 7h6M12 7l-2-2M12 7l-2 2" /><path {...base} d="M18 17h-6M12 17l2-2M12 17l2 2" /><path {...base} d="M6 17V7M18 7v10" opacity=".55" /></>;
  return <path {...base} d="M12 3.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Z" />;
}

function IconBox({ name, active = false, size = "md" }: { name: IconName; active?: boolean; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-8 w-8 rounded-xl" : size === "lg" ? "h-11 w-11 rounded-2xl" : "h-10 w-10 rounded-2xl";
  const svgClass = size === "sm" ? "h-[17px] w-[17px]" : "h-[19px] w-[19px]";

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${sizeClass} border ${active ? "border-[#7C3AED] bg-[#7C3AED] text-white shadow-sm" : "border-[#E1D4FF] bg-[#F6F0FF] text-[#6D28D9]"}`}>
      <svg viewBox="0 0 24 24" className={svgClass} aria-hidden="true">
        <IconSvg name={name} />
      </svg>
    </span>
  );
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-semibold ${className}`}>{children}</span>;
}

function Field({ label, value, accent = false }: { label: string; value?: string; accent?: boolean }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 text-[14px] leading-6">
      <div className="text-slate-500">{label}</div>
      <div className={`min-w-0 break-words ${accent ? "text-[#6D28D9]" : "text-slate-800"}`}>{value || "—"}</div>
    </div>
  );
}


function BuildSetuResearchSourceMeta({ item }: { item: DraftListItem | any }) {
  // BUILDSETU_RESEARCH_WORKSPACE_SOURCE_META_COMPONENT_V2
  const source = item?.source || {};
  const sourceTitle = String(source?.title || item?.title || "").trim();
  const sourceType = String(source?.sourceType || item?.sourceType || item?.domain || "").trim();
  const sourceUrl = String(source?.sourceUrl || source?.url || item?.sourceUrl || item?.url || "").trim();
  const sourceCitation = String(
    source?.sourceCitation ||
      item?.sourceCitation ||
      (sourceTitle && sourceUrl ? `${sourceTitle} — ${sourceUrl}` : "")
  ).trim();

  const sourceTags = Array.isArray(source?.tags) ? source.tags : [];
  const itemTags = Array.isArray(item?.tags) ? item.tags : [];
  const tags = Array.from(new Set([...sourceTags, ...itemTags].map((tag: any) => String(tag || "").trim()).filter(Boolean))).slice(0, 10);

  const safeSourceUrl = /^https?:\/\//i.test(sourceUrl) ? sourceUrl : "";

  if (!sourceType && !sourceUrl && !sourceCitation && !tags.length) return null;

  return (
    <div className="mt-3 rounded-2xl border border-[#E8DDF8] bg-[#FBFAFF] p-3 text-[12px] leading-5 text-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        {sourceType ? (
          <span className="rounded-full border border-[#E8DDF8] bg-white px-2.5 py-1 font-semibold uppercase tracking-[0.12em] text-[#6D28D9]">
            {sourceType}
          </span>
        ) : null}

        {tags.map((tag: string) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-500"
          >
            {tag}
          </span>
        ))}
      </div>

      {sourceCitation ? (
        <p className="mt-2 break-words text-slate-700">
          <span className="font-semibold text-slate-900">Source citation:</span> {sourceCitation}
        </p>
      ) : null}

      {safeSourceUrl ? (
        <a
          href={safeSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex font-semibold text-[#6D28D9] underline underline-offset-4 hover:text-[#4C1D95]"
        >
          Open source
        </a>
      ) : sourceUrl ? (
        <p className="mt-2 break-all text-slate-500">
          <span className="font-semibold text-slate-700">Source URL:</span> {sourceUrl}
        </p>
      ) : null}
    </div>
  );
}


export default function ResearchDraftWorkspace() {
  const [activeTab, setActiveTab] = useState<DraftStatus>("pending_review");
  const [drafts, setDrafts] = useState<DraftListItem[]>([]);
  const [allDrafts, setAllDrafts] = useState<DraftListItem[]>([]);
  const [selected, setSelected] = useState<DraftListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
    const output: Record<DraftStatus, number> = { pending_review: 0, approved: 0, merged: 0, rejected: 0, all: allDrafts.length };
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
          reviewNotes: reviewNotes || (action === "approve" ? "Approved from Knowledge Inbox." : "Rejected from Knowledge Inbox."),
          professionalReviewRequired: true,
          mergeReady: action === "approve"
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || `${action} failed`);
      setNotice(action === "approve" ? "Draft approved successfully." : "Draft rejected successfully.");
      setSelected(data.draft || null);
      await loadDrafts(activeTab);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setActionLoading(null);
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
          mergeNotes: reviewNotes || "Merged from Knowledge Inbox after review."
        })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || data.error || "Merge failed");
      setNotice("Draft merged into knowledge JSON.");
      setSelected(data.draft || null);
      await loadDrafts(activeTab);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Merge failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#FBFAFF] text-[14px] text-slate-900">
      <div className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)_390px]">
        <aside className="flex h-screen flex-col overflow-hidden border-r border-[#E8DDF8] bg-white">
          <div className="p-5">
            <div className="flex items-center">
              <img
                src={BUILDSETU_LOGO_SRC}
                alt="BuildSetu AI"
                className="h-10 w-auto max-w-[190px] object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const next = event.currentTarget.nextElementSibling as HTMLElement | null;
                  if (next) next.style.display = "block";
                }}
              />
              <div className="hidden text-[20px] font-bold tracking-tight text-[#21113F]">
                BuildSetu<span className="text-[#7C3AED]">AI</span>
              </div>
            </div>

            <div className="mt-4 text-[16px] font-semibold leading-6 text-slate-950">Knowledge Inbox</div>
            <p className="mt-3 text-[14px] leading-6 text-slate-500">Review source drafts before they update the agent knowledge base.</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelected(null);
                    }}
                    className={`flex h-11 w-full items-center justify-between rounded-2xl px-3 text-left text-[14px] font-semibold transition ${active ? "bg-[#7C3AED] text-white shadow-sm" : "text-slate-700 hover:bg-[#F4EEFF]"}`}
                  >
                    <span className="flex items-center gap-3">
                      <IconBox name={tab.icon} size="sm" active={active} />
                      {tab.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[12px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {counts[tab.key] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-3xl border border-[#E8DDF8] bg-[#FBFAFF] p-4">
              <div className="flex items-center gap-3">
                <IconBox name="workflow" />
                <div className="text-[16px] font-semibold leading-6 text-slate-950">Workflow</div>
              </div>
              <div className="mt-4 space-y-4 text-[14px] text-slate-700">
                {["Agent creates draft", "Admin reviews source", "Approved draft merges"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7C3AED] text-[12px] font-bold text-white">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {notice ? <div className="mt-4 rounded-2xl border border-[#E8DDF8] bg-white p-3 text-[14px] leading-6 text-slate-600">{notice}</div> : null}
          </div>

          <div className="border-t border-[#E8DDF8] p-4">
            <button onClick={() => loadDrafts(activeTab)} className="h-11 w-full rounded-2xl border border-[#7C3AED] text-[14px] font-semibold text-[#7C3AED] transition hover:bg-[#F4EEFF]">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </aside>

        <main className="flex h-screen min-w-0 flex-col overflow-hidden bg-[#FBFAFF]">
          <header className="flex shrink-0 items-center justify-between border-b border-[#E8DDF8] bg-white px-6 py-4">
            <div>
              <h1 className="text-[16px] font-semibold leading-6 text-slate-950">Research Review Queue</h1>
              <p className="text-[14px] leading-6 text-slate-500">Source review cards for tools, projects, and BuildSetu knowledge updates.</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-9 items-center rounded-2xl border border-[#E8DDF8] bg-[#FBFAFF] px-4 text-[14px] font-semibold text-[#7C3AED]">{drafts.length} drafts</span>
              <button onClick={() => loadDrafts(activeTab)} className="h-9 rounded-2xl border border-[#E8DDF8] bg-white px-4 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-[#FBFAFF]">Refresh</button>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-5xl space-y-3">
              {drafts.length === 0 && !loading ? (
                <div className="rounded-3xl border border-dashed border-[#D7C7F5] bg-white p-8 text-center">
                  <div className="text-[16px] font-semibold leading-6 text-slate-950">No drafts in this queue</div>
                  <p className="mt-2 text-[14px] leading-6 text-slate-500">Ask the agent to create a research draft from a trusted source. It will appear here for review.</p>
                </div>
              ) : null}

              {drafts.map((draft) => {
                const selectedNow = selected?.id === draft.id;
                const canApprove = draft.status === "pending_review";
                const canMerge = draft.status === "approved";

                return (
                  <article
                    key={`${draft.folder}-${draft.id}-${draft.file}`}
                    className={`rounded-3xl border bg-white p-4 shadow-sm transition ${selectedNow ? "border-[#7C3AED] ring-2 ring-[#7C3AED]/10 shadow-md" : "border-[#E3D7F8] hover:border-[#BFA7FF] hover:shadow-sm"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button onClick={() => setSelected(draft)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusStyle(draft.status)}>{statusLabel(draft.status)}</Badge>
                          <Badge className={riskStyle(draft.riskLevel)}>{draft.riskLevel || "risk unknown"}</Badge>
                          <Badge className={confidenceStyle(draft.confidence)}>{draft.confidence || "confidence unknown"}</Badge>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-[16px] font-semibold leading-6 text-slate-950">
                          <IconBox name={iconForCategory(draft.category)} size="sm" />
                          {categoryLabel(draft.category)}
                        </div>

                        <div className="mt-1 text-[14px] leading-6 text-slate-500">{locationText(draft)}</div>
                      </button>

                      <button onClick={() => setSelected(draft)} className="shrink-0 text-right text-[12px] leading-5 text-slate-400">
                        <div>{shortId(draft.id)}</div>
                        <div>{formatDate(draft.updatedAt || draft.createdAt)}</div>
                      </button>
                    </div>

                    <button onClick={() => setSelected(draft)} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-[#E8DDF8] bg-[#FBFAFF] p-3 text-left">
                      <IconBox name={iconForCategory(draft.category)} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold leading-5 text-slate-900">{draft.source?.title || "Untitled source"}</span>
                        <span className="block truncate text-[14px] leading-5 text-slate-500">{host(draft.source?.url)}</span>
                      </span>
                    </button>

                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <button onClick={() => setSelected(draft)} className="h-9 rounded-2xl border border-slate-300 bg-white text-[14px] font-semibold text-slate-700 transition hover:bg-slate-50">Review</button>

                      {canApprove ? (
                        <>
                          <button onClick={() => reviewDraft("approve", draft)} disabled={actionLoading !== null} className="h-9 rounded-2xl border border-emerald-600 bg-white text-[14px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
                            {actionLoading === `approve:${draft.id}` ? "Approving..." : "Approve"}
                          </button>
                          <button onClick={() => reviewDraft("reject", draft)} disabled={actionLoading !== null} className="h-9 rounded-2xl border border-red-500 bg-white text-[14px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">
                            {actionLoading === `reject:${draft.id}` ? "Rejecting..." : "Reject"}
                          </button>
                        </>
                      ) : canMerge ? (
                        <button onClick={() => mergeDraft(draft)} disabled={actionLoading !== null} className="col-span-2 h-9 rounded-2xl bg-[#7C3AED] text-[14px] font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">
                          {actionLoading === `merge:${draft.id}` ? "Merging..." : "Merge"}
                        </button>
                      ) : (
                        <div className="col-span-2 flex h-9 items-center justify-center rounded-2xl bg-slate-50 text-[14px] font-medium text-slate-400">No action required</div>
                      )}
                    </div>
                  
                    <BuildSetuResearchSourceMeta item={draft} /> {/* BUILDSETU_RESEARCH_WORKSPACE_SOURCE_META_ARTICLE_RENDER_V2 */}
</article>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="flex h-screen flex-col overflow-hidden border-l border-[#E8DDF8] bg-white">
          <div className="shrink-0 border-b border-[#E8DDF8] p-5">
            <div className="flex items-center gap-3">
              <IconBox name="inspector" />
              <div>
                <div className="text-[16px] font-semibold leading-6 text-slate-950">Draft Inspector</div>
                <p className="text-[14px] leading-6 text-slate-500">{selected ? "Review selected source metadata." : "Select a card to inspect and approve."}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#E8DDF8] bg-[#FBFAFF] p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name={iconForCategory(selected.category)} />
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#7C3AED]">Selected draft</div>
                      <div className="break-all text-[16px] font-semibold leading-6 text-slate-950">{shortId(selected.id)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={statusStyle(selected.status)}>{statusLabel(selected.status)}</Badge>
                    <Badge className={riskStyle(selected.riskLevel)}>{selected.riskLevel || "risk unknown"}</Badge>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E8DDF8] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="purpose" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">Purpose</div>
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-slate-500">Check source metadata and approve only if the source is relevant, trusted, and safe to merge.</p>
                </div>

                <div className="rounded-3xl border border-[#E8DDF8] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="source" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">Source</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Field label="Title" value={selected.source?.title} />
                    <Field label="URL" value={selected.source?.url} accent />
                    <Field label="Type" value={selected.source?.sourceType} />
                    <Field label="Publisher" value={selected.source?.publisher} />
                    <Field label="Location" value={locationText(selected)} />
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E8DDF8] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="file" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">Review note</div>
                  </div>
                  <textarea
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="Write why this source is approved, rejected, or merged..."
                    className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-[#E8DDF8] bg-[#FBFAFF] p-3 text-[14px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10"
                  />
                </div>

                <div className="rounded-3xl border border-[#E8DDF8] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="actions" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">Actions</div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {selected.status === "pending_review" ? (
                      <>
                        <button onClick={() => reviewDraft("approve")} disabled={actionLoading !== null} className="h-10 rounded-2xl bg-emerald-600 text-[14px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                        <button onClick={() => reviewDraft("reject")} disabled={actionLoading !== null} className="h-10 rounded-2xl border border-red-500 text-[14px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">Reject</button>
                        <button disabled className="h-10 rounded-2xl border border-[#E8DDF8] bg-[#FBFAFF] text-[14px] font-semibold text-slate-400">Merge after approval</button>
                      </>
                    ) : selected.status === "approved" ? (
                      <button onClick={() => mergeDraft()} disabled={actionLoading !== null} className="h-10 rounded-2xl bg-[#7C3AED] text-[14px] font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-50">Merge</button>
                    ) : selected.status === "merged" ? (
                      <div className="rounded-2xl bg-indigo-50 p-3 text-[14px] leading-6 text-indigo-700">This draft is already merged into knowledge.</div>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 p-3 text-[14px] leading-6 text-slate-500">This draft is rejected. No merge action available.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E8DDF8] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="file" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">File</div>
                  </div>
                  <div className="mt-2 break-all text-[12px] leading-5 text-slate-500">{selected.file || "—"}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#E8DDF8] bg-[#FBFAFF] p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="shield" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">What this page does</div>
                  </div>
                  <div className="mt-3 space-y-3 text-[14px] leading-6 text-slate-600">
                    <div>• Prevents unverified internet data from entering agent knowledge.</div>
                    <div>• Shows risk, source type, and jurisdiction before approval.</div>
                    <div>• Merges only reviewed drafts into knowledge JSON.</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-[#E8DDF8] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <IconBox name="check" />
                    <div className="text-[16px] font-semibold leading-6 text-slate-950">Best review rule</div>
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-slate-500">Approve only official, trusted, or manufacturer-level sources. Reject low-confidence blogs or unclear sources.</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
