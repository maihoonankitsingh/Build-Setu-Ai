"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";

type Project = {
  id: string;
  name?: string;
  projectName?: string;
  title?: string;
  location?: string;
  projectType?: string;
  type?: string;
};

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [fileName, setFileName] = useState("");

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects/list", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data.projects) ? data.projects : [];
      setProjects(list);
      if (!projectId && list[0]?.id) setProjectId(list[0].id);
    } catch (err: any) {
      setError(err?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function exportReport() {
    if (!projectId) {
      setError("Please select a project first.");
      return;
    }

    setExporting(true);
    setError("");
    setDownloadUrl("");
    setFileName("");

    try {
      const res = await fetch("/api/reports/project-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Report export failed");
      }

      setDownloadUrl(data.downloadUrl);
      setFileName(data.fileName);

      window.location.href = data.downloadUrl;
    } catch (err: any) {
      setError(err?.message || "Report export failed");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F8FB] text-slate-950">
      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">BuildSetu AI</p>
            <h1 className="text-3xl font-bold tracking-tight">Project PDF Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Export a client-ready PDF with project brief, renders, BOQ, BBS and agreement summary.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Back to dashboard
          </a>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FileText size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Generate Full Project Report</h2>
                <p className="text-sm text-slate-500">Select a project and export PDF.</p>
              </div>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Project
            </label>

            <div className="flex gap-3">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.projectName || project.title || project.id}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadProjects}
                className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50"
                aria-label="Refresh projects"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {loading ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="animate-spin" size={16} />
                Loading projects...
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={exportReport}
              disabled={exporting || loading || !projectId}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              {exporting ? "Generating PDF..." : "Export & Download PDF"}
            </button>

            {downloadUrl ? (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                PDF generated:{" "}
                <a className="font-bold underline" href={downloadUrl}>
                  {fileName || "Download report"}
                </a>
              </div>
            ) : null}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">Report Preview Data</h3>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-500">Selected Project</p>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedProject?.name ||
                    selectedProject?.projectName ||
                    selectedProject?.title ||
                    selectedProject?.id ||
                    "-"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">Location</p>
                <p className="mt-1 text-slate-900">{selectedProject?.location || "-"}</p>
              </div>

              <div>
                <p className="font-semibold text-slate-500">Project Type</p>
                <p className="mt-1 text-slate-900">
                  {selectedProject?.projectType || selectedProject?.type || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-slate-600">
                PDF includes project brief, render records, BOQ summary, BBS summary,
                agreement summary and BuildSetu AI watermark/footer.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
