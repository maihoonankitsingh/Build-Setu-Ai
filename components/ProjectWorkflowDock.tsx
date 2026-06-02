"use client";

import { useEffect, useMemo, useState } from "react";

type LocationState = {
  pathname: string;
  search: string;
};

function statusClass(status: string) {
  if (["approved", "complete", "locked"].includes(String(status).toLowerCase())) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (["draft_ready", "in_progress", "ai_final_draft"].includes(String(status).toLowerCase())) {
    return "bg-amber-100 text-amber-800";
  }

  if (String(status).toLowerCase() === "review_required") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-slate-100 text-slate-600";
}

export default function ProjectWorkflowDock() {
  const [loc, setLoc] = useState<LocationState>({ pathname: "", search: "" });
  const [open, setOpen] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function readLocation() {
      if (typeof window === "undefined") return;
      setLoc({
        pathname: window.location.pathname || "",
        search: window.location.search || "",
      });
    }

    readLocation();
    window.addEventListener("popstate", readLocation);
    const timer = window.setInterval(readLocation, 1000);

    return () => {
      window.removeEventListener("popstate", readLocation);
      window.clearInterval(timer);
    };
  }, []);

  const toolSlug = useMemo(() => {
    const match = loc.pathname.match(/^\/tools\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, [loc.pathname]);

  const projectId = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    return params.get("projectId") || "";
  }, [loc.search]);

  const isToolPage = Boolean(toolSlug);

  useEffect(() => {
    if (!isToolPage || !projectId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const [ctxRes, galleryRes] = await Promise.all([
          fetch(`/api/project-context/get?projectId=${encodeURIComponent(projectId)}&toolSlug=${encodeURIComponent(toolSlug)}`),
          fetch(`/api/project-gallery/list?projectId=${encodeURIComponent(projectId)}`),
        ]);

        const ctxData = await ctxRes.json().catch(() => ({}));
        const galleryData = await galleryRes.json().catch(() => ({}));

        if (cancelled) return;

        setContext(ctxData.context || null);
        setGallery(Array.isArray(galleryData.items) ? galleryData.items : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isToolPage, projectId, toolSlug]);

  if (!isToolPage) return null;

  if (!projectId) {
    return (
      <div className="fixed bottom-4 right-4 z-[70] max-w-xs rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
        <p className="font-bold text-slate-950">Project context off</p>
        <p className="mt-1 text-xs text-slate-500">Tool ko project memory ke saath use karne ke liye Project Hub se open karo.</p>
        <a href="/workspace" className="mt-3 block rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-bold text-white">
          Create Project
        </a>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[70] rounded-full bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl"
      >
        Project Context
      </button>
    );
  }

  const brief = context?.brief;
  const stages = Array.isArray(context?.stages) ? context.stages : [];
  const images = gallery.slice(0, 8);

  return (
    <aside className="fixed bottom-4 right-4 top-20 z-[70] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Project Context</p>
            <h2 className="mt-1 text-sm font-bold">{brief?.title || projectId}</h2>
            <p className="mt-1 text-xs text-slate-300">
              {brief?.site?.plotWidthFt || "?"} x {brief?.site?.plotDepthFt || "?"} ft · {brief?.site?.facing || "Facing?"} · {brief?.building?.floors || "Floors?"}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-full bg-white/10 px-2 py-1 text-xs font-bold">
            Hide
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Loading project context...</p>
        ) : (
          <div className="space-y-4">
            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-950">Current Tool</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{toolSlug}</span>
              </div>
              <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-900">{context?.rule?.label || toolSlug}</p>
                <p className="mt-1 text-xs text-slate-600">{context?.rule?.description || "Project tool context."}</p>
                <p className="mt-2 rounded-xl bg-blue-50 p-2 text-xs font-semibold text-blue-900">
                  {context?.nextRecommendedAction || "Proceed with this tool"}
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-950">Stage Tracker</h3>
              <div className="mt-2 space-y-2">
                {stages.map((stage: any) => (
                  <div key={stage.id} className="rounded-2xl border border-slate-100 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-slate-900">{stage.order}. {stage.label}</p>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(stage.status)}`}>
                        {stage.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-950">Project Gallery</h3>
                <a href={`/workspace?projectId=${encodeURIComponent(projectId)}&toolSlug=${encodeURIComponent(toolSlug)}`} className="text-xs font-bold text-slate-700 underline">
                  Hub
                </a>
              </div>

              {images.length ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {images.map((item) => (
                    <a key={`${item.source}-${item.id}`} href={item.imageUrl} target="_blank" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.title} className="aspect-square w-full object-cover" />
                      <div className="p-2">
                        <p className="truncate text-[11px] font-bold text-slate-900">{item.title}</p>
                        <p className="truncate text-[10px] text-slate-500">{item.type} · {item.status || item.role}</p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                  Abhi project gallery empty hai.
                </p>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        <a
          href={`/workspace?projectId=${encodeURIComponent(projectId)}&toolSlug=${encodeURIComponent(toolSlug)}`}
          className="block rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white"
        >
          Open Project Hub
        </a>
      </div>
    </aside>
  );
}
