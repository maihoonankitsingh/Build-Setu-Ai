"use client";

import { useEffect, useMemo, useState } from "react";

type TimelineEntry = {
  id: string;
  projectId: string;
  toolSlug: string;
  toolName: string;
  type: string;
  role: string;
  title: string;
  text: string;
  imageUrl: string;
  output: unknown;
  sourceFile: string;
  createdAt: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  projectId?: string;
  currentToolSlug?: string;
  mode?: string;
  stats?: {
    total: number;
    images: number;
    outputs: number;
    byTool: Record<string, number>;
  };
  entries?: TimelineEntry[];
};

function getProjectIdFromBrowser() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return (
    url.searchParams.get("projectId") ||
    url.searchParams.get("project") ||
    url.searchParams.get("id") ||
    url.searchParams.get("pid") ||
    ""
  );
}

function getToolSlugFromBrowser() {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const toolIndex = parts.indexOf("tools");
  return toolIndex >= 0 ? parts[toolIndex + 1] || "" : "";
}

function cleanText(value: unknown, max = 420) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}


function pickImageUrl(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;
  const direct =
    obj.imageUrl ||
    obj.printImageUrl ||
    obj.url ||
    obj.publicUrl ||
    obj.assetUrl ||
    obj.thumbnailUrl ||
    obj.svgUrl ||
    obj.pdfUrl;

  if (typeof direct === "string" && direct) return direct;

  for (const item of Object.values(obj)) {
    if (Array.isArray(item)) {
      for (const child of item) {
        const found = pickImageUrl(child);
        if (found) return found;
      }
    } else if (item && typeof item === "object") {
      const found = pickImageUrl(item);
      if (found) return found;
    }
  }

  return "";
}

function pickText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;
  const direct =
    obj.message ||
    obj.text ||
    obj.prompt ||
    obj.response ||
    obj.content ||
    obj.summary ||
    obj.error;

  return typeof direct === "string" ? direct : "";
}

function shouldCaptureApi(url: string): boolean {
  if (!url.includes("/api/")) return false;
  if (url.includes("/api/project-memory/")) return false;

  return [
    "/api/tool-chat/run",
    "/api/tools/run",
    "/api/ai/generate-image",
    "/api/ai/generated-image",
    "/api/design/generate",
    "/api/exterior/",
    "/api/boq/generate",
    "/api/bbs/generate",
    "/api/structure/generate",
    "/api/project-assets/upload",
    "/api/reports/project-pdf",
    "/api/agreements/generate",
  ].some((part) => url.includes(part));
}

function formatDate(value: string) {
  const time = Date.parse(value || "");
  if (!time) return "";
  return new Date(time).toLocaleString();
}

export default function ProjectMemoryTimeline() {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<"project" | "tool">("project");
  const [data, setData] = useState<ApiResponse>({ ok: false, entries: [] });
  const [loading, setLoading] = useState(false);

  const projectId = useMemo(() => getProjectIdFromBrowser(), []);
  const toolSlug = useMemo(() => getToolSlugFromBrowser(), []);

  async function loadTimeline(nextMode = mode) {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/project-memory/timeline?projectId=${encodeURIComponent(projectId)}&toolSlug=${encodeURIComponent(
          toolSlug
        )}&mode=${encodeURIComponent(nextMode)}`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (error) {
      setData({
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load project memory",
        entries: [],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTimeline("project");
    const timer = window.setInterval(() => loadTimeline(mode), 12000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, toolSlug]);


  // BUILDSETU_PROJECT_MEMORY_FETCH_CAPTURE
  useEffect(() => {
    if (!projectId || typeof window === "undefined") return;

    const currentWindow = window as typeof window & {
      __buildSetuProjectMemoryFetchPatched?: boolean;
      __buildSetuOriginalFetch?: typeof window.fetch;
    };

    if (currentWindow.__buildSetuProjectMemoryFetchPatched) return;

    currentWindow.__buildSetuProjectMemoryFetchPatched = true;
    currentWindow.__buildSetuOriginalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await currentWindow.__buildSetuOriginalFetch!(input, init);

      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input instanceof Request
                ? input.url
                : String(input);

        if (shouldCaptureApi(url)) {
          const clone = response.clone();
          const contentType = clone.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            clone
              .json()
              .then((json) => {
                const requestText =
                  init && typeof init.body === "string" ? init.body.slice(0, 1500) : "";

                const imageUrl = pickImageUrl(json);
                const text = pickText(json) || requestText;

                return currentWindow.__buildSetuOriginalFetch!("/api/project-memory/event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectId,
                    toolSlug,
                    toolName: toolSlug,
                    type: "api-response",
                    role: "tool",
                    title: url.split("?")[0],
                    text,
                    imageUrl,
                    output: json,
                    source: url,
                    raw: { requestText, response: json },
                  }),
                });
              })
              .then(() => loadTimeline(mode))
              .catch(() => undefined);
          }
        }
      } catch {
        // Do not break original tool API response.
      }

      return response;
    };

    return () => {
      if (currentWindow.__buildSetuOriginalFetch) {
        window.fetch = currentWindow.__buildSetuOriginalFetch;
      }
      currentWindow.__buildSetuProjectMemoryFetchPatched = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, toolSlug, mode]);


  if (!projectId) return null;

  const entries = data.entries || [];
  const total = data.stats?.total || entries.length;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[min(460px,calc(100vw-24px))]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xl"
        >
          <div className="text-sm font-semibold text-slate-900">Project Memory</div>
          <div className="text-xs text-slate-500">Chat + outputs across all tools</div>
        </button>
      ) : (
        <section className="max-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Project Memory Timeline</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Shared chat + output for this project across all tools
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
              >
                Hide
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("project");
                  loadTimeline("project");
                }}
                className={`rounded-full px-3 py-1 text-xs ${
                  mode === "project" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                All tools
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("tool");
                  loadTimeline("tool");
                }}
                className={`rounded-full px-3 py-1 text-xs ${
                  mode === "tool" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                This tool
              </button>
              <button
                type="button"
                onClick={() => loadTimeline(mode)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <span className="ml-auto text-xs text-slate-500">{total} items</span>
            </div>
          </div>

          <div className="max-h-[52vh] space-y-3 overflow-y-auto p-4">
            {!data.ok && data.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {data.error}
              </div>
            ) : null}

            {entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Abhi is project me shared chat/output record nahi mila. Tool run hote hi yahan project-wise timeline dikhegi.
              </div>
            ) : null}

            {entries.map((entry) => (
              <article key={`${entry.sourceFile}-${entry.id}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {entry.toolName || entry.toolSlug || "Project Tool"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {entry.title || entry.type || "Activity"}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {entry.role || entry.type || "item"}
                  </div>
                </div>

                {entry.text ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700">
                    {cleanText(entry.text)}
                  </div>
                ) : null}

                {entry.imageUrl ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.imageUrl} alt={entry.title || "Project output"} className="max-h-56 w-full object-contain" />
                  </div>
                ) : null}

                {entry.output ? (
                  <details className="mt-3 rounded-lg bg-slate-50 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">Output data</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-4 text-slate-600">
                      {cleanText(entry.output, 1400)}
                    </pre>
                  </details>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                  <span>{entry.sourceFile}</span>
                  <span>{formatDate(entry.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
