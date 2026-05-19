"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  title?: string;
  projectName?: string;
  name?: string;
  location?: string;
  plotSize?: string;
};

type ToolConfig = {
  slug: string;
  title: string;
  category: string;
  description: string;
  placeholder: string;
  directLinks: Array<{ label: string; href: string }>;
};

const configs: Record<string, ToolConfig> = {
  "magic-brief": {
    slug: "magic-brief",
    title: "Magic Brief",
    category: "Brief",
    description: "Client requirement ko structured project brief me convert kare.",
    placeholder: "Client ka raw requirement paste karo...",
    directLinks: [{ label: "New Project", href: "/" }, { label: "Workspace", href: "/workspace" }],
  },
  "interior-render": {
    slug: "interior-render",
    title: "Interior Render",
    category: "Render",
    description: "Room brief se premium interior render prompt and review checklist banaye.",
    placeholder: "Living room / bedroom / kitchen ka design brief likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "exterior-elevation": {
    slug: "exterior-elevation",
    title: "Exterior Elevation",
    category: "Exterior",
    description: "House facade/elevation ke liye design direction and render prompt banaye.",
    placeholder: "Plot size, floors, style aur facade requirement likho...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
  },
  "render-enhancer": {
    slug: "render-enhancer",
    title: "Render Enhancer",
    category: "Image Tools",
    description: "Existing render ko presentation-ready improve karne ke instructions banaye.",
    placeholder: "Render me kya improve karna hai? lighting, material, realism...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "site-photo-redesign": {
    slug: "site-photo-redesign",
    title: "Site Photo Redesign",
    category: "Image Tools",
    description: "Site/room photo redesign ke liye clear AI edit instruction banaye.",
    placeholder: "Site photo redesign requirement likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "sketch-to-plan": {
    slug: "sketch-to-plan",
    title: "Sketch to Plan",
    category: "Planning",
    description: "Sketch ya rough idea se concept floor plan direction banaye.",
    placeholder: "Sketch me kya hai aur final plan me kya chahiye...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
  },
  "floor-plan-ai": {
    slug: "floor-plan-ai",
    title: "Floor Plan AI",
    category: "Planning",
    description: "Plot requirement se Naksha draft direction banaye.",
    placeholder: "30x40 North facing G+1 house, parking, living, kitchen...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
  },
  "architect-chat": {
    slug: "architect-chat",
    title: "Architect Chat",
    category: "Assistant",
    description: "Design, planning, material, construction doubts ka structured answer de.",
    placeholder: "Architectural doubt ya client question likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "mood-board": {
    slug: "mood-board",
    title: "Mood Board",
    category: "Interior",
    description: "Mood board, color palette, furniture and lighting direction banaye.",
    placeholder: "Style, room, color preference, budget level likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "remove-furniture": {
    slug: "remove-furniture",
    title: "Remove Furniture",
    category: "Image Tools",
    description: "Furniture removal/edit ke liye AI image instruction banaye.",
    placeholder: "Kya remove karna hai aur room ko kaise restore karna hai...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "background-change": {
    slug: "background-change",
    title: "Background Change",
    category: "Image Tools",
    description: "Background replacement ke liye prompt and quality checklist banaye.",
    placeholder: "Kaisa background chahiye? site, studio, garden, premium...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "photo-enhancer": {
    slug: "photo-enhancer",
    title: "Photo Enhancer",
    category: "Image Tools",
    description: "Photo upscale, lighting, sharpness and color correction plan banaye.",
    placeholder: "Photo me kya improve karna hai...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "working-drawings": {
    slug: "working-drawings",
    title: "Working Drawings",
    category: "Construction",
    description: "Working drawing index and checklist banaye.",
    placeholder: "Project type, floors, drawing package requirement likho...",
    directLinks: [{ label: "Structure Studio", href: "/structure" }],
  },
  "boq-generator": {
    slug: "boq-generator",
    title: "BOQ Generator",
    category: "Estimation",
    description: "BOQ heads, quantity assumptions and review checklist banaye.",
    placeholder: "Project details aur BOQ scope likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }, { label: "Reports", href: "/reports" }],
  },
  "bbs-generator": {
    slug: "bbs-generator",
    title: "BBS Generator",
    category: "Structural",
    description: "BBS input checklist and handoff notes banaye.",
    placeholder: "Footing, column, beam, slab details ya structural scope likho...",
    directLinks: [{ label: "Structure Studio", href: "/structure" }],
  },
  "column-beam-plan": {
    slug: "column-beam-plan",
    title: "Column Beam Plan",
    category: "Structural",
    description: "Preliminary column grid and beam/slab planning notes banaye.",
    placeholder: "Plot size, floors, parking, room spans and stair location likho...",
    directLinks: [{ label: "Structure Studio", href: "/structure" }],
  },
  "material-palette-ai": {
    slug: "material-palette-ai",
    title: "Material Palette AI",
    category: "Interior",
    description: "Tiles, laminate, wall color, hardware and finish palette banaye.",
    placeholder: "Room, style, color, budget and material preference likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "false-ceiling-ai": {
    slug: "false-ceiling-ai",
    title: "False Ceiling AI",
    category: "Interior",
    description: "False ceiling and lighting concept banaye.",
    placeholder: "Room size, ceiling type, lighting mood and style likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "vastu-check": {
    slug: "vastu-check",
    title: "Vastu Check",
    category: "Planning",
    description: "Room placement, entry, kitchen, puja and bedroom vastu notes banaye.",
    placeholder: "Facing, room placement and vastu concern likho...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
  },
  "client-pdf": {
    slug: "client-pdf",
    title: "Client PDF",
    category: "Presentation",
    description: "Client PDF scope and export readiness check kare.",
    placeholder: "Client report me kya include karna hai...",
    directLinks: [{ label: "Reports", href: "/reports" }, { label: "Workspace", href: "/workspace" }],
  },
  "client-agreement": {
    slug: "client-agreement",
    title: "Client Agreement",
    category: "Presentation",
    description: "Client agreement scope, deliverables, payment and revision terms banaye.",
    placeholder: "Client, project, scope, payment, timeline details likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  },
  "contractor-package": {
    slug: "contractor-package",
    title: "Contractor Package",
    category: "Construction",
    description: "Contractor package, BOQ summary, work sequence and site checklist banaye.",
    placeholder: "Contractor ko kya package dena hai? scope, BOQ, drawings...",
    directLinks: [{ label: "Workspace", href: "/workspace" }, { label: "Reports", href: "/reports" }],
  },
};

function fallbackConfig(slug: string): ToolConfig {
  const title = slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return {
    slug,
    title,
    category: "BuildSetu Tool",
    description: "Specific BuildSetu AI tool output generate kare.",
    placeholder: "Requirement likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
  };
}

function projectTitle(project: Project) {
  return String(project.title || project.projectName || project.name || project.id);
}

export default function ToolExecutorPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || "");
  const config = useMemo(() => configs[slug] || fallbackConfig(slug), [slug]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProjects() {
    setProjectLoading(true);
    try {
      const res = await fetch("/api/projects/list", { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data.projects) ? data.projects : [];
      setProjects(list);
      if (!projectId && list[0]?.id) setProjectId(list[0].id);
    } finally {
      setProjectLoading(false);
    }
  }

  async function runTool() {
    setLoading(true);
    setError("");
    setRun(null);

    try {
      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: config.title,
          projectId,
          prompt: prompt || config.placeholder,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Tool execution failed");
      }

      setRun(data.run);
    } catch (err: any) {
      setError(err?.message || "Tool execution failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    setPrompt(config.placeholder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#F7F8FB] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <a href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700">
              <ArrowLeft size={16} />
              Back to dashboard
            </a>
            <p className="text-sm font-semibold text-blue-700">BuildSetu AI Tool</p>
            <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{config.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {config.directLinks.map((link) => (
              <a
                key={link.href + link.label}
                href={link.href}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>
              Ye AI draft workflow hai. Design, structure, BOQ, BBS, legal, site execution aur safety related output qualified professional review ke baad hi final use karein.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Tool Input</h2>
                  <p className="text-sm text-slate-500">{config.category} task execute kare.</p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold text-slate-700">Project</label>
              <div className="flex gap-2">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {projectTitle(project)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={loadProjects}
                  disabled={projectLoading}
                  className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  {projectLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                </button>
              </div>

              <label className="mb-2 mt-5 block text-sm font-bold text-slate-700">Prompt / Requirement</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[230px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-[15px] leading-7 text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                placeholder={config.placeholder}
              />

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={runTool}
                disabled={loading || !prompt.trim()}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                {loading ? "Executing..." : `Execute ${config.title}`}
              </button>
            </div>
          </section>

          <section className="space-y-5">
            {run ? (
              <>
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">{run.title}</p>
                      <h2 className="mt-1 text-2xl font-bold">Generated Output</h2>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      Review Required
                    </span>
                  </div>
                </div>

                {run.sections.map((section: any) => (
                  <div key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-bold">{section.title}</h3>
                    <div className="mt-4 space-y-3">
                      {section.items.map((item: string, index: number) => (
                        <div key={index} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-700" />
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold">Next Actions</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {run.nextActions.map((item: string) => (
                      <span key={item} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
                      Workspace <ExternalLink size={15} />
                    </a>
                    <a href="/reports" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50">
                      Reports <Download size={15} />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                <Sparkles className="mx-auto h-10 w-10 text-blue-700" />
                <h2 className="mt-4 text-xl font-bold">Output yahan aayega</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Left side me prompt likho aur Execute button click karo.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
