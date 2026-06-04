import ResearchDraftWorkspace from "@/components/buildsetu/research/ResearchDraftWorkspace";

export const dynamic = "force-dynamic";

export default function KnowledgeInboxPage() {
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
      <ResearchDraftWorkspace />
    </>
  );
}
