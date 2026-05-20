"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useParams } from "next/navigation";

type Project = {
  id: string;
  title?: string;
  projectName?: string;
  name?: string;
  projectType?: string;
  location?: string;
  plotSize?: string;
  facing?: string;
  floors?: string;
  budget?: string;
};

type ToolConfig = {
  slug: string;
  title: string;
  category: string;
  description: string;
  placeholder: string;
  directLinks: Array<{ label: string; href: string }>;
  examples: string[];
};

const configs: Record<string, ToolConfig> = {
  "magic-brief": {
    slug: "magic-brief",
    title: "Magic Brief",
    category: "Brief",
    description: "Client requirement ko structured project brief me convert kare.",
    placeholder: "Client ka raw requirement paste karo...",
    directLinks: [{ label: "New Project", href: "/" }, { label: "Workspace", href: "/workspace" }],
    examples: ["30x40 G+1 house brief", "Interior + BOQ package", "Client proposal scope"],
  },
  "interior-render": {
    slug: "interior-render",
    title: "Interior Render",
    category: "Render",
    description: "Room brief se premium interior render prompt, style direction aur review checklist banaye.",
    placeholder: "Living room / bedroom / kitchen ka design brief likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Modern Indian living room", "Luxury bedroom with warm light", "Modular kitchen render"],
  },
  "exterior-elevation": {
    slug: "exterior-elevation",
    title: "Exterior Elevation",
    category: "Exterior",
    description: "House facade/elevation ke liye design direction and render prompt banaye.",
    placeholder: "Plot size, floors, style aur facade requirement likho...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
    examples: ["30x40 modern elevation", "G+1 duplex facade", "Premium villa front"],
  },
  "render-enhancer": {
    slug: "render-enhancer",
    title: "Render Enhancer",
    category: "Image Tools",
    description: "Existing render ko presentation-ready improve karne ke instructions banaye.",
    placeholder: "Render me kya improve karna hai? lighting, material, realism...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Improve lighting", "Make render realistic", "Fix material quality"],
  },
  "site-photo-redesign": {
    slug: "site-photo-redesign",
    title: "Site Photo Redesign",
    category: "Image Tools",
    description: "Site/room photo redesign ke liye clear AI edit instruction banaye.",
    placeholder: "Site photo redesign requirement likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Empty room redesign", "Old facade makeover", "Site to premium look"],
  },
  "sketch-to-plan": {
    slug: "sketch-to-plan",
    title: "Sketch to Plan",
    category: "Planning",
    description: "Sketch ya rough idea se concept floor plan direction banaye.",
    placeholder: "Sketch me kya hai aur final plan me kya chahiye...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
    examples: ["Rough sketch to layout", "Room zoning plan", "30x40 plan idea"],
  },
  "floor-plan-ai": {
    slug: "floor-plan-ai",
    title: "Floor Plan AI",
    category: "Planning",
    description: "Plot requirement se real Naksha draft generate kare.",
    placeholder: "30x40 North facing G+1 house, parking, living, kitchen...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
    examples: ["30x40 North G+1", "Vastu friendly house", "Rental floor plan"],
  },
  "architect-chat": {
    slug: "architect-chat",
    title: "Architect Chat",
    category: "Assistant",
    description: "Design, planning, material, construction doubts ka structured answer de.",
    placeholder: "Architectural doubt ya client question likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Staircase kaha rakhe?", "Kitchen vastu doubt", "Budget material suggestion"],
  },
  "mood-board": {
    slug: "mood-board",
    title: "Mood Board",
    category: "Interior",
    description: "Mood board, color palette, furniture and lighting direction banaye.",
    placeholder: "Style, room, color preference, budget level likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Warm beige mood board", "Luxury black-gold theme", "Minimal wood palette"],
  },
  "remove-furniture": {
    slug: "remove-furniture",
    title: "Remove Furniture",
    category: "Image Tools",
    description: "Furniture removal/edit ke liye AI image instruction banaye.",
    placeholder: "Kya remove karna hai aur room ko kaise restore karna hai...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Remove old sofa", "Empty room cleanup", "Declutter bedroom"],
  },
  "background-change": {
    slug: "background-change",
    title: "Background Change",
    category: "Image Tools",
    description: "Background replacement ke liye prompt and quality checklist banaye.",
    placeholder: "Kaisa background chahiye? site, studio, garden, premium...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Premium background", "Outdoor site view", "Luxury studio setup"],
  },
  "photo-enhancer": {
    slug: "photo-enhancer",
    title: "Photo Enhancer",
    category: "Image Tools",
    description: "Photo upscale, lighting, sharpness and color correction plan banaye.",
    placeholder: "Photo me kya improve karna hai...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Brighten photo", "Sharpen render", "Professional correction"],
  },
  "working-drawings": {
    slug: "working-drawings",
    title: "Working Drawings",
    category: "Construction",
    description: "Working drawing index and structure checklist generate kare.",
    placeholder: "Project type, floors, drawing package requirement likho...",
    directLinks: [{ label: "Structure Studio", href: "/structure" }],
    examples: ["Drawing package checklist", "Architecture + structure index", "Site drawing list"],
  },
  "boq-generator": {
    slug: "boq-generator",
    title: "BOQ Generator",
    category: "Estimation",
    description: "BOQ heads, quantity assumptions and review checklist banaye.",
    placeholder: "Project details aur BOQ scope likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }, { label: "Reports", href: "/reports" }],
    examples: ["30x40 BOQ draft", "Finishing BOQ", "Contractor estimate"],
  },
  "bbs-generator": {
    slug: "bbs-generator",
    title: "BBS Generator",
    category: "Structural",
    description: "Real Structure Studio se BBS handoff and structural checklist generate kare.",
    placeholder: "Footing, column, beam, slab details ya structural scope likho...",
    directLinks: [{ label: "Structure Studio", href: "/structure" }],
    examples: ["Column beam BBS input", "Footing steel checklist", "Slab bar schedule notes"],
  },
  "column-beam-plan": {
    slug: "column-beam-plan",
    title: "Column Beam Plan",
    category: "Structural",
    description: "Real Structure Studio se preliminary column grid and beam/slab planning notes banaye.",
    placeholder: "Plot size, floors, parking, room spans and stair location likho...",
    directLinks: [{ label: "Structure Studio", href: "/structure" }],
    examples: ["30x40 column grid", "G+1 beam slab notes", "Parking span caution"],
  },
  "material-palette-ai": {
    slug: "material-palette-ai",
    title: "Material Palette AI",
    category: "Interior",
    description: "Tiles, laminate, wall color, hardware and finish palette banaye.",
    placeholder: "Room, style, color, budget and material preference likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Premium living palette", "Budget kitchen materials", "Warm wood palette"],
  },
  "false-ceiling-ai": {
    slug: "false-ceiling-ai",
    title: "False Ceiling AI",
    category: "Interior",
    description: "False ceiling and lighting concept banaye.",
    placeholder: "Room size, ceiling type, lighting mood and style likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Cove light ceiling", "Bedroom false ceiling", "Profile light layout"],
  },
  "vastu-check": {
    slug: "vastu-check",
    title: "Vastu Check",
    category: "Planning",
    description: "Room placement, entry, kitchen, puja and bedroom vastu notes generate kare.",
    placeholder: "Facing, room placement and vastu concern likho...",
    directLinks: [{ label: "Naksha Studio", href: "/design" }],
    examples: ["North facing vastu", "Kitchen placement check", "Puja room direction"],
  },
  "client-pdf": {
    slug: "client-pdf",
    title: "Client PDF",
    category: "Presentation",
    description: "Real Project PDF export generate kare.",
    placeholder: "Client report me kya include karna hai...",
    directLinks: [{ label: "Reports", href: "/reports" }, { label: "Workspace", href: "/workspace" }],
    examples: ["Full client report", "Design + BOQ PDF", "Contractor package PDF"],
  },
  "client-agreement": {
    slug: "client-agreement",
    title: "Client Agreement",
    category: "Presentation",
    description: "Client agreement scope, deliverables, payment and revision terms banaye.",
    placeholder: "Client, project, scope, payment, timeline details likho...",
    directLinks: [{ label: "Workspace", href: "/workspace" }],
    examples: ["Design agreement", "BOQ + render scope", "Payment milestone terms"],
  },
  "contractor-package": {
    slug: "contractor-package",
    title: "Contractor Package",
    category: "Construction",
    description: "Contractor package, BOQ summary, work sequence and site checklist banaye.",
    placeholder: "Contractor ko kya package dena hai? scope, BOQ, drawings...",
    directLinks: [{ label: "Workspace", href: "/workspace" }, { label: "Reports", href: "/reports" }],
    examples: ["Contractor handoff", "BOQ + site checklist", "Work sequence package"],
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
    examples: ["Project requirement", "Client-ready output", "Review checklist"],
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

    const selectedProject = projects.find((project) => project.id === projectId);

    const baseProject = {
      projectName: projectTitle(selectedProject || ({ id: "demo", title: config.title } as Project)),
      city: String(selectedProject?.location || "Raipur"),
      plotSize: String(selectedProject?.plotSize || "30x40 ft"),
      facing: String(selectedProject?.facing || "North"),
      floors: String(selectedProject?.floors || "G+1"),
      budget: String(selectedProject?.budget || "Not specified"),
    };

    function asToolRunFromDesign(design: any) {
      return {
        id: design.id,
        createdAt: design.createdAt,
        slug,
        title: `${config.title} Output`,
        projectId,
        prompt,
        status: design.status || "ENGINEER_REVIEW_REQUIRED",
        sections: [
          { title: "Summary", items: [design?.draft?.summary || design.requirement || "Design draft generated."] },
          { title: "Room Schedule", items: design?.draft?.roomSchedule || [] },
          { title: "Floor Plan Logic", items: design?.draft?.floorPlan || [] },
          { title: "Vastu Notes", items: design?.draft?.vastuNotes || [] },
          { title: "Review Checklist", items: design?.draft?.reviewChecklist || [] },
        ],
        nextActions: ["Open Naksha Studio", "Generate Structure", "Export Full PDF"],
      };
    }

    function asToolRunFromStructure(structure: any) {
      return {
        id: structure.id,
        createdAt: structure.createdAt,
        slug,
        title: `${config.title} Output`,
        projectId,
        prompt,
        status: structure.status || "ENGINEER_REVIEW_REQUIRED",
        sections: [
          { title: "Summary", items: [structure?.draft?.summary || structure.requirement || "Structure draft generated."] },
          { title: "Preliminary Column Grid", items: structure?.draft?.columnGrid || [] },
          { title: "Beam / Slab Notes", items: structure?.draft?.beamSlabNotes || [] },
          { title: "Foundation Notes", items: structure?.draft?.foundationNotes || [] },
          { title: "Engineer Review Checklist", items: structure?.draft?.engineerChecklist || [] },
          { title: "BBS Handoff Notes", items: structure?.draft?.bbsHandoffNotes || [] },
        ],
        nextActions: ["Open Structure Studio", "Generate BBS", "Export Full PDF"],
      };
    }

    try {
      const imageSlugs = [
        "interior-render",
        "exterior-elevation",
        "render-enhancer",
        "site-photo-redesign",
        "remove-furniture",
        "background-change",
        "photo-enhancer",
        "mood-board",
        "false-ceiling-ai",
        "material-palette-ai"
      ];

      const designSlugs = ["floor-plan-ai", "vastu-check", "sketch-to-plan"];
      const structureSlugs = ["column-beam-plan", "bbs-generator", "working-drawings"];

      if (imageSlugs.includes(slug)) {
        if (!projectId) {
          throw new Error("Please select a project first.");
        }

        const renderType =
          slug === "exterior-elevation" ? "Exterior Elevation" :
          slug === "site-photo-redesign" ? "Site Photo Redesign" :
          slug === "render-enhancer" ? "Render Enhancer" :
          slug === "mood-board" ? "Mood Board" :
          slug === "false-ceiling-ai" ? "False Ceiling" :
          slug === "material-palette-ai" ? "Material Palette" :
          "Interior Render";

        const roomType =
          slug === "exterior-elevation" ? "Exterior" :
          slug === "false-ceiling-ai" ? "Ceiling" :
          slug === "material-palette-ai" ? "Material Palette" :
          slug === "mood-board" ? "Mood Board" :
          "Living Room";

        const finalPrompt = [
          `Create a premium realistic architecture/interior design image.`,
          `Tool: ${config.title}.`,
          `Render type: ${renderType}.`,
          `Project: ${baseProject.projectName}.`,
          `Location: ${baseProject.city}.`,
          `Plot: ${baseProject.plotSize}.`,
          `Floors: ${baseProject.floors}.`,
          `User requirement: ${prompt || config.placeholder}`,
          `Style: modern Indian premium, clean luxury, realistic materials, professional lighting, high-detail 3D render.`,
          `Avoid text, watermark, labels, distorted geometry, extra doors, impossible stairs, unsafe structural elements.`
        ].join("\n");

        const res = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            renderType,
            roomType,
            prompt: finalPrompt,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          if (res.status === 402 || data.code === "NOT_ENOUGH_CREDITS" || data.buyCreditsUrl) {
            throw new Error(`${data.error || "Not enough credits."} Open /credits to buy more credits.`);
          }
          throw new Error(data.error || "Image generation failed");
        }

        const imageUrl = data.imageUrl || data.render?.imageUrl || "";
        const renderId = data.render?.id || data.renderId || data.id || `image-${Date.now()}`;

        setRun({
          id: renderId,
          createdAt: new Date().toISOString(),
          slug,
          title: `${config.title} Image Output`,
          projectId,
          prompt: finalPrompt,
          imageUrl,
          imageFallback: Boolean(data.fallback),
          status: data.fallback ? "REVIEW_REQUIRED" : "COMPLETED",
          sections: [
            {
              title: "Render Prompt",
              items: [
                finalPrompt,
                imageUrl ? `Image URL: ${imageUrl}` : "Image URL not returned.",
                data.fallback ? "Fallback preview used because real image generation is not available right now." : "Real/generated image preview created."
              ],
            },
            {
              title: "Review Checklist",
              items: [
                "Check image composition, lighting, material realism and room proportions.",
                "Verify no unsafe structural element, impossible stair, distorted opening or wrong room placement.",
                "Use this image as draft preview before client approval.",
              ],
            },
          ],
          nextActions: ["Open Image", "Download Image", "Add to Project PDF"],
        });

        return;
      }

      if (designSlugs.includes(slug)) {
        const res = await fetch("/api/design/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...baseProject,
            bedrooms: "3",
            bathrooms: "3",
            parking: "Yes",
            vastu: slug === "vastu-check" ? "Yes" : "Flexible",
            requirement: prompt || config.placeholder,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Naksha generation failed");
        }

        setRun(asToolRunFromDesign(data.design));
        return;
      }

      if (structureSlugs.includes(slug)) {
        const res = await fetch("/api/structure/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: baseProject.projectName,
            city: baseProject.city,
            plotSize: baseProject.plotSize,
            floors: baseProject.floors,
            buildingType: String(selectedProject?.projectType || "Residential"),
            soilType: "Unknown / to be tested",
            span: "10-12 ft typical room span",
            requirement: prompt || config.placeholder,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Structure generation failed");
        }

        setRun(asToolRunFromStructure(data.structure));
        return;
      }

      if (slug === "client-pdf") {
        if (!projectId) {
          throw new Error("Please select a project first.");
        }

        const res = await fetch("/api/reports/project-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "PDF export failed");
        }

        setRun({
          id: data.fileName,
          createdAt: new Date().toISOString(),
          slug,
          title: "Client PDF Generated",
          projectId,
          prompt,
          status: "REVIEW_REQUIRED",
          sections: [
            {
              title: "PDF Export",
              items: [
                `File generated: ${data.fileName}`,
                `Download URL: ${data.downloadUrl}`,
                "Full Project PDF includes project summary, Naksha, Structure, BOQ, BBS and agreement summary where available.",
              ],
            },
            {
              title: "Review Checklist",
              items: [
                "Open PDF and verify client/project details.",
                "Check Naksha and Structure warnings before client sharing.",
                "BOQ/BBS/Agreement sections should be reviewed by responsible professionals.",
              ],
            },
          ],
          nextActions: ["Download PDF", "Open Reports", "Share with client after review"],
        });

        window.location.href = data.downloadUrl;
        return;
      }

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
        if (res.status === 402 || data.code === "NOT_ENOUGH_CREDITS" || data.buyCreditsUrl) {
          throw new Error(`${data.error || "Not enough credits."} Open /credits to buy more credits.`);
        }
        throw new Error(data.error || "Tool execution failed");
      }

      setRun(data.run);

      if (typeof data.credits === "number") {
        await refreshToolCredits(data.credits);
      } else {
        await refreshToolCredits();
      }
    } catch (err: any) {
      setError(err?.message || "Tool execution failed");
    } finally {
      setLoading(false);
    }
  }

  // BUILDSETU_TOOL_CREDIT_REFRESH_V1
  async function refreshToolCredits(nextCredits?: number) {
    try {
      let credits = nextCredits;

      if (typeof credits !== "number" || !Number.isFinite(credits)) {
        const res = await fetch("/api/credits/balance", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) return;

        credits = Number(data.credits || 0);
      }

      const formatted = `${Number(credits || 0).toLocaleString("en-IN")} Credits`;

      let badge = document.getElementById("buildsetu-tool-credit-badge") as HTMLAnchorElement | null;

      if (!badge) {
        badge = document.createElement("a");
        badge.id = "buildsetu-tool-credit-badge";
        badge.href = "/credits";
        badge.setAttribute(
          "style",
          [
            "position:fixed",
            "right:18px",
            "bottom:18px",
            "z-index:9999",
            "border-radius:999px",
            "padding:12px 16px",
            "background:#21133f",
            "color:#fff",
            "font-size:13px",
            "font-weight:900",
            "box-shadow:0 18px 45px rgba(33,19,63,0.28)",
            "text-decoration:none",
          ].join(";")
        );
        document.body.appendChild(badge);
      }

      badge.textContent = formatted;
    } catch (error) {
      console.error("TOOL_CREDITS_REFRESH_ERROR", error);
    }
  }

  useEffect(() => {
    refreshToolCredits();

    const interval = window.setInterval(refreshToolCredits, 15000);

    return () => {
      window.clearInterval(interval);
      document.getElementById("buildsetu-tool-credit-badge")?.remove();
    };
  }, []);

  useEffect(() => {
    loadProjects();
    setPrompt(config.placeholder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#f7f3ff] text-[#170b2b]">
      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-5 overflow-hidden rounded-[2rem] border border-[#ded0f4] bg-[#170b2b] shadow-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.45),transparent_32%),radial-gradient(circle_at_85%_25%,rgba(37,99,235,0.35),transparent_30%)]" />
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <a href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
                  <ArrowLeft size={16} />
                  Back to dashboard
                </a>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                    BuildSetu AI Tool
                  </span>
                  <span className="rounded-full border border-purple-300/25 bg-purple-400/15 px-3 py-1 text-xs font-bold text-purple-100">
                    {config.category}
                  </span>
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/15 px-3 py-1 text-xs font-bold text-amber-100">
                    Review Required
                  </span>
                </div>

                <h1 className="max-w-3xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                  {config.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-purple-100/85">
                  {config.description}
                </p>
              </div>

              <div className="grid min-w-[260px] gap-3">
                {config.directLinks.map((link) => (
                  <a
                    key={link.href + link.label}
                    href={link.href}
                    className="inline-flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-sm backdrop-blur hover:bg-white/15"
                  >
                    {link.label}
                    <ExternalLink size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>
              AI draft workflow hai. Design, structure, BOQ, BBS, legal, site execution aur safety related output qualified professional review ke baad hi final use karein.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5">
            <div className="rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-[0_18px_50px_rgba(47,20,90,0.10)]">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-white shadow-lg">
                  <Wand2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em]">Tool Input</h2>
                  <p className="mt-1 text-sm text-[#6d5b86]">
                    Project select karo, prompt refine karo, phir task execute karo.
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold text-[#291447]">Project</label>
              <div className="flex gap-2">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="min-h-13 flex-1 rounded-2xl border border-[#ded0f4] bg-[#fbf8ff] px-4 text-sm font-semibold outline-none focus:border-[#7c3aed]"
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
                  className="flex min-h-13 w-13 items-center justify-center rounded-2xl border border-[#ded0f4] bg-[#fbf8ff] text-[#6d5b86] hover:bg-purple-50 disabled:opacity-60"
                >
                  {projectLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                </button>
              </div>

              <label className="mb-2 mt-5 block text-sm font-bold text-[#291447]">Prompt / Requirement</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[245px] w-full resize-none rounded-[1.6rem] border border-[#ded0f4] bg-[#fbf8ff] px-5 py-4 text-[15px] leading-7 text-[#21133f] outline-none focus:border-[#7c3aed] focus:bg-white"
                placeholder={config.placeholder}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {config.examples.map((item) => (
                  <button
                    key={item}
                    onClick={() => setPrompt((prev) => `${prev}\n${item}`)}
                    className="rounded-full border border-[#ded0f4] bg-[#fbf8ff] px-3 py-1.5 text-xs font-bold text-[#6d5b86] hover:border-[#a855f7] hover:bg-purple-50 hover:text-[#6f1cc4]"
                  >
                    + {item}
                  </button>
                ))}
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                onClick={runTool}
                disabled={loading || !prompt.trim()}
                className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-5 text-sm font-black text-white shadow-lg shadow-purple-500/20 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                {loading ? "Executing..." : `Execute ${config.title}`}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Mode", "AI Draft"],
                ["Output", "Structured"],
                ["Review", "Required"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-[#ded0f4] bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#817397]">{label}</p>
                  <p className="mt-1 text-lg font-black text-[#21133f]">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            {run ? (
              <>
                <div className="rounded-[2rem] border border-[#ded0f4] bg-white p-6 shadow-[0_18px_50px_rgba(47,20,90,0.10)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#7c3aed]">{run.title}</p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.045em] text-[#21133f]">Generated Output</h2>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      Review Required
                    </span>
                  </div>
                </div>

                {run.imageUrl ? (
                  <div className="overflow-hidden rounded-[2rem] border border-[#ded0f4] bg-white shadow-[0_18px_50px_rgba(47,20,90,0.10)]">
                    <div className="border-b border-[#eee7f7] bg-[#fbf8ff] px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-[#817397]">Generated Image Preview</p>
                          <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#21133f]">{config.title}</h3>
                        </div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                          {run.imageFallback ? "Fallback Preview" : "Image Generated"}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="overflow-hidden rounded-[1.6rem] border border-[#ded0f4] bg-[#120a20]">
                        <img
                          src={run.imageUrl}
                          alt={`${config.title} generated preview`}
                          className="h-auto w-full object-cover"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={run.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-black text-white hover:bg-[#6d28d9]"
                        >
                          Open Image <ExternalLink size={15} />
                        </a>
                        <a
                          href={run.imageUrl}
                          download
                          className="inline-flex items-center gap-2 rounded-xl border border-[#ded0f4] bg-[#fbf8ff] px-4 py-2 text-sm font-black text-[#21133f] hover:bg-purple-50"
                        >
                          Download <Download size={15} />
                        </a>
                        <a
                          href="/workspace"
                          className="inline-flex items-center gap-2 rounded-xl border border-[#ded0f4] bg-white px-4 py-2 text-sm font-black text-[#21133f] hover:bg-purple-50"
                        >
                          Workspace <ArrowRight size={15} />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}

                {run.sections.map((section: any) => (
                  <div key={section.title} className="rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-sm">
                    <h3 className="text-xl font-black tracking-[-0.035em] text-[#21133f]">{section.title}</h3>
                    <div className="mt-4 space-y-3">
                      {section.items.map((item: string, index: number) => (
                        <div key={index} className="flex gap-3 rounded-2xl bg-[#fbf8ff] p-3 text-sm leading-6 text-[#3f315d]">
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7c3aed]" />
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-[2rem] border border-[#ded0f4] bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-black tracking-[-0.035em] text-[#21133f]">Next Actions</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {run.nextActions.map((item: string) => (
                      <span key={item} className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-black text-[#6f1cc4]">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a href="/workspace" className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-black text-white hover:bg-[#6d28d9]">
                      Workspace <ExternalLink size={15} />
                    </a>
                    <a href="/reports" className="inline-flex items-center gap-2 rounded-xl border border-[#ded0f4] bg-[#fbf8ff] px-4 py-2 text-sm font-black text-[#21133f] hover:bg-purple-50">
                      Reports <Download size={15} />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="overflow-hidden rounded-[2rem] border border-[#ded0f4] bg-white shadow-[0_18px_50px_rgba(47,20,90,0.10)]">
                <div className="border-b border-[#eee7f7] bg-[#fbf8ff] px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#817397]">Output Preview</p>
                      <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#21133f]">Waiting for execution</h2>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#7c3aed] shadow-sm">
                      <Sparkles size={21} />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="rounded-[1.6rem] border border-dashed border-[#cbb7ea] bg-[#fbf8ff] p-8 text-center">
                    <Sparkles className="mx-auto h-10 w-10 text-[#7c3aed]" />
                    <h2 className="mt-4 text-2xl font-black tracking-[-0.045em] text-[#21133f]">Output yahan aayega</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6d5b86]">
                      Left side me prompt likho, project select karo aur Execute button click karo.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["Step 1", "Prompt"],
                      ["Step 2", "Execute"],
                      ["Step 3", "Review"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-[#fbf8ff] p-4">
                        <p className="text-xs font-black text-[#817397]">{label}</p>
                        <p className="mt-1 font-black text-[#21133f]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
