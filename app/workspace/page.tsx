"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Home,
  Layers3,
  Loader2,
  RefreshCw,
  Ruler,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

type Project = {
  id: string;
  title?: string;
  name?: string;
  projectName?: string;
  projectType?: string;
  location?: string;
  plotSize?: string;
  facing?: string;
  floors?: string;
  budget?: string;
  status?: string;
  renders?: any[];
  _count?: {
    renders?: number;
    boqItems?: number;
    bbsItems?: number;
    agreements?: number;
    toolRuns?: number;
  };
};

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function projectTitle(project?: Project | null) {
  return safeText(project?.title || project?.projectName || project?.name, "Untitled Project");
}

function statusClass(status: "ready" | "draft" | "missing" | "warning") {
  if (status === "ready") return "bg-green-50 text-green-700 border-green-200";
  if (status === "draft") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

function StatusCard({
  title,
  desc,
  value,
  status,
  icon,
  href,
}: {
  title: string;
  desc: string;
  value: string;
  status: "ready" | "draft" | "missing" | "warning";
  icon: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
          {value}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{desc}</p>

      {href ? (
        <a
          href={href}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
        >
          Open <ExternalLink size={15} />
        </a>
      ) : null}
    </div>
  );
}

export default function WorkspacePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [designs, setDesigns] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [bbsItems, setBbsItems] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) || projects[0] || null,
    [projects, selectedId]
  );

  const selectedTitle = projectTitle(selectedProject).toLowerCase();

  function isForSelectedProject(item: any) {
    if (!selectedProject) return false;
    if (String(item?.projectId || item?.project_id || item?.project?.id || "") === selectedProject.id) return true;

    const itemTitle = String(
      item?.projectName || item?.title || item?.name || item?.project?.title || ""
    ).toLowerCase();

    return Boolean(selectedTitle && itemTitle === selectedTitle);
  }

  function latestRelevant(items: any[]) {
    const matched = items.filter(isForSelectedProject);
    const pool = matched.length ? matched : items;
    return [...pool].sort((a, b) => {
      return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
    })[0] || null;
  }

  const latestDesign = useMemo(() => latestRelevant(designs), [designs, selectedProject?.id]);
  const latestStructure = useMemo(() => latestRelevant(structures), [structures, selectedProject?.id]);
  const selectedBoq = useMemo(() => boqItems.filter(isForSelectedProject), [boqItems, selectedProject?.id]);
  const selectedBbs = useMemo(() => bbsItems.filter(isForSelectedProject), [bbsItems, selectedProject?.id]);
  const selectedAgreements = useMemo(() => agreements.filter(isForSelectedProject), [agreements, selectedProject?.id]);
  const renderCount = selectedProject?._count?.renders ?? selectedProject?.renders?.length ?? 0;

  async function fetchJson(url: string) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} failed`);
    return res.json();
  }

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    try {
      const [projectData, designData, structureData, boqData, bbsData, agreementData] =
        await Promise.all([
          fetchJson("/api/projects/list"),
          fetchJson("/api/design/list"),
          fetchJson("/api/structure/list"),
          fetchJson("/api/boq/list"),
          fetchJson("/api/bbs/list"),
          fetchJson("/api/agreements/list"),
        ]);

      const projectList = Array.isArray(projectData.projects) ? projectData.projects : [];
      setProjects(projectList);
      setDesigns(Array.isArray(designData.designs) ? designData.designs : []);
      setStructures(Array.isArray(structureData.structures) ? structureData.structures : []);
      setBoqItems(Array.isArray(boqData.items) ? boqData.items : []);
      setBbsItems(Array.isArray(bbsData.items) ? bbsData.items : []);
      setAgreements(Array.isArray(agreementData.agreements) ? agreementData.agreements : []);

      if (!selectedId && projectList[0]?.id) {
        setSelectedId(projectList[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }

  async function exportFullPdf() {
    if (!selectedProject?.id) {
      setError("Please select a project first.");
      return;
    }

    setExporting(true);
    setError("");
    setDownloadUrl("");

    try {
      const res = await fetch("/api/reports/project-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "PDF export failed");
      }

      setDownloadUrl(data.downloadUrl);
      window.location.href = data.downloadUrl;
    } catch (err: any) {
      setError(err?.message || "PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F8FB] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">BuildSetu AI</p>
            <h1 className="text-3xl font-bold tracking-tight">Project Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Ek jagah se Naksha, Structure, BOQ, BBS, Agreement aur Full Project PDF workflow control karo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href="/design" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Naksha
            </a>
            <a href="/structure" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Structure
            </a>
            <a href="/reports" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Reports
            </a>
            <a href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              Dashboard
            </a>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>
              Workspace AI draft workflow hai. Naksha, structure, BOQ, BBS aur construction execution qualified professionals ke review ke baad hi final use karein.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Selected Project</label>
              <select
                value={selectedProject?.id || selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {projectTitle(project)} • {safeText(project.location)} • {safeText(project.plotSize)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadWorkspace}
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-700 hover:bg-blue-50 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
              Refresh
            </button>

            <button
              onClick={exportFullPdf}
              disabled={exporting || loading || !selectedProject?.id}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              Export Full PDF
            </button>
          </div>

          {selectedProject ? (
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Type</p>
                <p className="mt-1 font-bold">{safeText(selectedProject.projectType)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Facing</p>
                <p className="mt-1 font-bold">{safeText(selectedProject.facing)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Floors</p>
                <p className="mt-1 font-bold">{safeText(selectedProject.floors)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Budget</p>
                <p className="mt-1 font-bold">{safeText(selectedProject.budget)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Status</p>
                <p className="mt-1 font-bold">{safeText(selectedProject.status)}</p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {downloadUrl ? (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              PDF generated: <a href={downloadUrl} className="font-bold underline">Download again</a>
            </div>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <StatusCard
            title="Naksha Draft"
            desc={latestDesign ? latestDesign?.draft?.summary || latestDesign.requirement : "No Naksha Studio output found yet."}
            value={latestDesign ? "Ready" : "Missing"}
            status={latestDesign ? "warning" : "missing"}
            icon={<Ruler size={21} />}
            href="/design"
          />

          <StatusCard
            title="Structure Draft"
            desc={latestStructure ? latestStructure?.draft?.summary || latestStructure.requirement : "No Structure Studio output found yet."}
            value={latestStructure ? "Review Required" : "Missing"}
            status={latestStructure ? "warning" : "missing"}
            icon={<ShieldCheck size={21} />}
            href="/structure"
          />

          <StatusCard
            title="Renders"
            desc="Project render previews and visual outputs."
            value={`${renderCount} item${renderCount === 1 ? "" : "s"}`}
            status={renderCount ? "ready" : "missing"}
            icon={<Building2 size={21} />}
            href="/"
          />

          <StatusCard
            title="BOQ / Estimate"
            desc="Draft quantity and cost planning records linked with this project."
            value={`${selectedBoq.length} item${selectedBoq.length === 1 ? "" : "s"}`}
            status={selectedBoq.length ? "draft" : "missing"}
            icon={<ClipboardList size={21} />}
            href="/"
          />

          <StatusCard
            title="BBS / Steel"
            desc="Bar bending and steel quantity draft records."
            value={`${selectedBbs.length} item${selectedBbs.length === 1 ? "" : "s"}`}
            status={selectedBbs.length ? "warning" : "missing"}
            icon={<Layers3 size={21} />}
            href="/structure"
          />

          <StatusCard
            title="Agreement"
            desc="Client agreement draft and commercial/legal terms."
            value={`${selectedAgreements.length} draft${selectedAgreements.length === 1 ? "" : "s"}`}
            status={selectedAgreements.length ? "draft" : "missing"}
            icon={<ScrollText size={21} />}
            href="/"
          />

          <StatusCard
            title="Full Project PDF"
            desc="Export client-ready PDF with project summary, Naksha, Structure, BOQ, BBS and agreement summary."
            value="Ready"
            status="ready"
            icon={<FileText size={21} />}
            href="/reports"
          />

          <StatusCard
            title="Review Gate"
            desc="AI draft outputs are ready for architect, engineer, contractor and client review workflow."
            value="Required"
            status="warning"
            icon={<CheckCircle2 size={21} />}
            href="/structure"
          />

          <StatusCard
            title="Dashboard"
            desc="Return to full BuildSetu AI dashboard and tool cards."
            value="Open"
            status="ready"
            icon={<Home size={21} />}
            href="/"
          />
        </div>
      </section>
    </main>
  );
}
