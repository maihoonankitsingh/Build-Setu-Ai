import fs from "node:fs";
import path from "node:path";
import ResearchDraftWorkspace from "@/components/buildsetu/research/ResearchDraftWorkspace";

export const dynamic = "force-dynamic";

type SourceReviewPipelineStatus = {
  generatedAt?: string;
  phase?: string;
  sourceWatch?: {
    registeredTrustedSourceAutoWatch?: boolean;
    latestInboxGeneratedAt?: string | null;
    pendingSourceUpdateDrafts?: number | null;
    latestChangedSources?: number | null;
    latestFailedSources?: number | null;
    fetchRecovery?: {
      recoveredCount?: number | null;
      unresolvedCount?: number | null;
    };
    qualityGate?: {
      scannedDrafts?: number | null;
      quarantinedCount?: number | null;
      keptPendingCount?: number | null;
    };
  };
  candidateQueue?: {
    totalCandidates?: number;
  };
  reviewQueue?: {
    itemCount?: number;
    pendingExactSourceCandidateItems?: number;
    pendingReviewItems?: number;
    approvedItems?: number;
    rejectedItems?: number;
  };
  safety?: {
    trustedKnowledgeWrite?: boolean;
    trustedMergeExecuted?: boolean;
    autoMerge?: boolean;
    mergePolicy?: string;
    sourceRegistryChanged?: boolean;
  };
  routes?: {
    reviewQueuePage?: string;
    knowledgeInboxPage?: string;
  };
};

function readPipelineStatus(): SourceReviewPipelineStatus | null {
  try {
    const file = path.join(process.cwd(), "data/buildsetu-source-review-queue/status/latest.json");
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function countText(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function safetyText(value: boolean | undefined) {
  return value ? "ON" : "OFF";
}

export default function KnowledgeInboxPage() {
  const pipeline = readPipelineStatus();

  const cards = [
    {
      label: "Review items",
      value: countText(pipeline?.reviewQueue?.itemCount),
      sub: "Official source review queue",
    },
    {
      label: "Pending exact",
      value: countText(pipeline?.reviewQueue?.pendingExactSourceCandidateItems),
      sub: "Web/search candidates",
    },
    {
      label: "Candidates",
      value: countText(pipeline?.candidateQueue?.totalCandidates),
      sub: "Captured source candidates",
    },
    {
      label: "Pending review",
      value: countText(pipeline?.reviewQueue?.pendingReviewItems),
      sub: "Manual review required",
    },
    {
      label: "Approved",
      value: countText(pipeline?.reviewQueue?.approvedItems),
      sub: "No merge from inbox",
    },
    {
      label: "Rejected",
      value: countText(pipeline?.reviewQueue?.rejectedItems),
      sub: "Rejected sources",
    },
    {
      label: "Failed sources",
      value: countText(pipeline?.sourceWatch?.latestFailedSources),
      sub: `${countText(pipeline?.sourceWatch?.fetchRecovery?.recoveredCount)} recovered`,
    },
    {
      label: "Quality gate",
      value: countText(pipeline?.sourceWatch?.qualityGate?.quarantinedCount),
      sub: "Quarantined updates",
    },
  ];

  return (
    <>
      <section
        data-buildsetu-marker="BUILDSETU_OFFICIAL_SOURCE_REVIEW_QUEUE_NAV_LINK_V1"
        className="mx-auto mb-6 max-w-6xl rounded-3xl border border-cyan-400/30 bg-cyan-950/20 p-5 text-slate-100"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Trusted source pipeline
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Official Source Review Queue
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Review queue visibility for BIS/MoHUA/source-pack candidates. This is read/sync only:
              no approval, no merge, and no trusted-knowledge write from this link.
            </p>
          </div>
          <a
            href="/workspace/official-source-review-queue"
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
          >
            Open review queue
          </a>
        </div>
      </section>

      <section
        data-buildsetu-marker="BUILDSETU_SOURCE_REVIEW_PIPELINE_STATUS_CARD_V1"
        className="mx-auto mb-6 max-w-6xl rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-slate-100 shadow-2xl shadow-black/20"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Source review pipeline status
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Web-search candidates → review queue → manual merge gate
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              Registered trusted sources are watched automatically. Web-search results are captured as
              candidates only. Trusted knowledge write and trusted merge remain blocked until a separate
              reviewed merge phase.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-xs font-bold text-amber-100">
            Auto merge: {safetyText(pipeline?.safety?.autoMerge)}
            <br />
            Trusted write: {safetyText(pipeline?.safety?.trustedKnowledgeWrite)}
            <br />
            Trusted merge: {safetyText(pipeline?.safety?.trustedMergeExecuted)}
          </div>
        </div>

        {pipeline ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-bold text-white">Source watch</p>
                <p className="mt-1 text-slate-300">
                  Auto-watch: {pipeline.sourceWatch?.registeredTrustedSourceAutoWatch ? "ON" : "OFF"}
                </p>
                <p className="text-slate-400">
                  Pending source-update drafts: {countText(pipeline.sourceWatch?.pendingSourceUpdateDrafts)}
                </p>
                <p className="text-slate-400">
                  Changed/failed: {countText(pipeline.sourceWatch?.latestChangedSources)} /{" "}
                  {countText(pipeline.sourceWatch?.latestFailedSources)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-bold text-white">Manual review gate</p>
                <p className="mt-1 text-slate-300">
                  Merge policy: {pipeline.safety?.mergePolicy || "manual_review_required"}
                </p>
                <p className="text-slate-400">
                  Source registry changed: {pipeline.safety?.sourceRegistryChanged ? "yes" : "no"}
                </p>
                <p className="text-slate-400">
                  Trusted knowledge write: {pipeline.safety?.trustedKnowledgeWrite ? "yes" : "no"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-bold text-white">Last status</p>
                <p className="mt-1 text-slate-300">Phase: {pipeline.phase || "unknown"}</p>
                <p className="break-all text-slate-400">
                  Generated: {pipeline.generatedAt || "unknown"}
                </p>
                <a
                  href="/workspace/official-source-review-queue"
                  className="mt-3 inline-flex rounded-xl border border-cyan-400/40 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-400/10"
                >
                  Open filtered review queue
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-950/30 p-4 text-sm text-amber-100">
            Pipeline status file not found. Run phase 47B-2P status generation first.
          </div>
        )}
      </section>

      <ResearchDraftWorkspace />
    </>
  );
}
