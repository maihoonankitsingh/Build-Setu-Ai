"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  FolderKanban,
  Hammer,
  Home,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  Moon,
  Plus,
  Ruler,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Wand2,
} from "lucide-react";

type ViewKey =
  | "dashboard"
  | "tools"
  | "projects"
  | "studio"
  | "renders"
  | "boq"
  | "bbs"
  | "exports"
  | "reviews";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tools", label: "All Tools", icon: Boxes },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "studio", label: "New Project", icon: Sparkles },
  { id: "renders", label: "Render Studio", icon: ImageIcon },
  { id: "boq", label: "BOQ / Estimate", icon: Calculator },
  { id: "bbs", label: "BBS", icon: ClipboardList },
  { id: "reviews", label: "Reviews", icon: ShieldCheck },
  { id: "exports", label: "Exports", icon: FileText },
] as const;

const tools = [
  {
    title: "Interior AI",
    category: "Interior",
    cost: "1 credit",
    icon: ImageIcon,
    status: "Live MVP",
    desc: "Generate photorealistic room designs from brief, room photo, or reference style.",
  },
  {
    title: "Exterior Elevation AI",
    category: "Architecture",
    cost: "1 credit",
    icon: Building2,
    status: "Live MVP",
    desc: "Create modern front elevation concepts for homes, shops, villas and duplexes.",
  },
  {
    title: "Site Photo Redesign",
    category: "Image Tools",
    cost: "1 credit",
    icon: Wand2,
    status: "Live MVP",
    desc: "Upload existing room/site photo and generate redesigned visual concepts.",
  },
  {
    title: "Client PDF Builder",
    category: "Presentation",
    cost: "1 credit",
    icon: FileText,
    status: "Live MVP",
    desc: "Convert project brief, renders, notes and estimates into client-ready PDF.",
  },
  {
    title: "Floor Plan Concept AI",
    category: "Planning",
    cost: "2 credits",
    icon: Ruler,
    status: "Phase 2",
    desc: "Generate concept plan with room dimensions, area statement and warnings.",
  },
  {
    title: "Working Drawing Draft AI",
    category: "Docs",
    cost: "3 credits",
    icon: Layers3,
    status: "Phase 2",
    desc: "Draft architectural, interior, electrical, plumbing and structural checklists.",
  },
  {
    title: "BOQ Generator",
    category: "Estimate",
    cost: "2 credits",
    icon: Calculator,
    status: "Phase 3",
    desc: "Create rough BOQ, material summary, rate sheet and contractor estimate.",
  },
  {
    title: "BBS Generator",
    category: "Structural",
    cost: "3 credits",
    icon: ClipboardList,
    status: "Phase 4",
    desc: "Create BBS table from engineer-entered reinforcement data and member schedule.",
  },
];

const projects = [
  {
    title: "30x40 North Facing House",
    type: "Residential G+1",
    city: "Raipur",
    status: "AI Draft",
    progress: 68,
    outputs: ["Elevation", "Interior", "PDF"],
  },
  {
    title: "25x50 Shop + 2BHK",
    type: "Mixed Use",
    city: "Bhilai",
    status: "Review Required",
    progress: 42,
    outputs: ["Plan", "BOQ"],
  },
  {
    title: "Premium Living Room",
    type: "Interior",
    city: "Indore",
    status: "Client Ready",
    progress: 91,
    outputs: ["Render", "Moodboard", "PDF"],
  },
];

function cn(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "blue" | "green" | "amber" | "dark";
}) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    dark: "border-slate-800 bg-slate-950 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

function Sidebar({
  active,
  setActive,
}: {
  active: ViewKey;
  setActive: (id: ViewKey) => void;
}) {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:flex lg:flex-col">
      <div className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Hammer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-black tracking-tight text-slate-950">
            Sikhadenge Build
          </div>
          <div className="text-xs text-slate-500">build.sikhadenge.in</div>
        </div>
      </div>

      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id as ViewKey)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition",
                isActive
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900">
          <Sparkles className="h-4 w-4" />
          MVP Focus
        </div>
        <p className="text-xs leading-5 text-blue-800">
          AI Brief Chat, Interior Render, Elevation Render, Project Save, PDF
          Export and Credits.
        </p>
      </div>

      <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-950">Credits</span>
          <CreditCard className="h-4 w-4 text-slate-500" />
        </div>
        <div className="text-3xl font-black text-slate-950">84</div>
        <p className="mt-1 text-xs text-slate-500">available generation credits</p>
      </div>
    </aside>
  );
}

function Topbar({ setActive }: { setActive: (id: ViewKey) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 px-4 py-4 backdrop-blur-xl lg:px-7">
      <div className="flex items-center gap-3">
        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            placeholder="Search tools, projects, drawings, BOQ, BBS..."
          />
        </div>

        <button
          onClick={() => setActive("studio")}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Create Project
        </button>

        <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 sm:flex">
          <Sparkles className="h-4 w-4 text-blue-600" />
          84 credits
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
          <Bell className="h-4 w-4" />
        </button>

        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function ToolCard({ tool }: { tool: (typeof tools)[number] }) {
  const Icon = tool.icon;
  const tone =
    tool.status === "Live MVP" ? "green" : tool.status === "Phase 2" ? "blue" : "amber";

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
          <Icon className="h-5 w-5" />
        </div>
        <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950">
          <Star className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone="blue">{tool.category}</Badge>
        <Badge tone={tone}>{tool.status}</Badge>
      </div>

      <h3 className="text-lg font-black tracking-tight text-slate-950">{tool.title}</h3>
      <p className="mt-2 min-h-14 text-sm leading-6 text-slate-600">{tool.desc}</p>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm font-bold text-slate-700">{tool.cost}</span>
        <button className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800">
          Launch
        </button>
      </div>
    </div>
  );
}

function Dashboard({ setActive }: { setActive: (id: ViewKey) => void }) {
  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="dark">build.sikhadenge.in</Badge>
              <Badge tone="blue">AI Design + Construction Workspace</Badge>
            </div>

            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Client brief se design, render, BOQ, BBS aur contractor package tak.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Interior designers, architects, contractors aur home consultants ke liye
              clean AI workspace. Start with chat, generate visuals, save projects
              and export client-ready documents.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => setActive("studio")}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
              >
                Start New Project <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActive("tools")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Explore Tools <Boxes className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black text-slate-950">Live Project Draft</h3>
                <Badge tone="amber">Review Required</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Plot", "30x40 ft"],
                  ["Type", "G+1 Home"],
                  ["City", "Raipur"],
                  ["Outputs", "3 ready"],
                ].map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{key}</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                AI Draft: Final structural, MEP, BBS and construction documents
                require professional review.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active Projects", "18", FolderKanban],
          ["Images Generated", "246", ImageIcon],
          ["Review Pending", "7", ShieldCheck],
          ["Credits Left", "84", Sparkles],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{label as string}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{value as string}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-900">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Quick Start</h2>
            <p className="mt-1 text-sm text-slate-500">Most-used tools for MVP launch.</p>
          </div>
          <button onClick={() => setActive("tools")} className="text-sm font-black text-slate-700">
            View all
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tools.slice(0, 4).map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-950">Recent Projects</h2>
          <p className="mt-1 text-sm text-slate-500">Saved client workspaces and draft packages.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">{project.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {project.type} • {project.city}
                  </p>
                </div>
                <Badge tone={project.status === "Client Ready" ? "green" : project.status === "Review Required" ? "amber" : "blue"}>
                  {project.status}
                </Badge>
              </div>

              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-slate-950" style={{ width: `${project.progress}%` }} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {project.outputs.map((output) => (
                  <Badge key={output}>{output}</Badge>
                ))}
              </div>

              <button
                onClick={() => setActive("projects")}
                className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Open Workspace
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ToolsPage() {
  const categories = useMemo(() => ["All", ...Array.from(new Set(tools.map((t) => t.category)))], []);
  const [category, setCategory] = useState("All");
  const filtered = category === "All" ? tools : tools.filter((tool) => tool.category === category);

  return (
    <div className="space-y-6">
      <div>
        <Badge tone="blue">All Tools</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          AI tools for design and construction
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Interior and elevation generation first. Floor plan, BOQ and BBS modules are staged for the construction suite.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-2xl border px-4 py-2 text-sm font-bold transition",
              category === cat
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((tool) => (
          <ToolCard key={tool.title} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function NewProjectPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Badge tone="dark">New Project</Badge>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
          Create design brief
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Hindi or English me client requirement likho. AI smart questions poochkar project brief banayega.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {["Home / Residential", "Flat Interior", "Shop / Showroom", "Cafe / Restaurant", "Office", "Villa / Duplex"].map((type) => (
            <button key={type} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-800 hover:border-slate-400 hover:bg-white">
              {type}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <label className="text-sm font-black text-slate-950">Client brief</label>
          <textarea
            className="mt-3 min-h-44 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-slate-400"
            defaultValue="30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye. First floor me 2 bedroom aur balcony chahiye. Modern elevation chahiye. Budget 38 lakh."
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
            Generate Smart Questions <Sparkles className="h-4 w-4" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
            Upload Plan / Photo <Upload className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-black text-slate-950">AI Briefing Chat</h2>
          <p className="mt-1 text-sm text-slate-500">Smart questions + structured project brief.</p>
        </div>

        <div className="space-y-4 p-5">
          <div className="ml-auto max-w-[85%] rounded-3xl bg-slate-950 px-4 py-3 text-sm leading-6 text-white">
            30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye.
          </div>
          <div className="max-w-[85%] rounded-3xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
            Samjha. Ye G+1 residential project hai. Mujhe 5 details chahiye: city, staircase type, vastu preference, parking type, aur pehle output me floor plan ya elevation chahiye?
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Structured Brief Preview
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["Project", "Residential House"],
                ["Plot", "30x40 ft"],
                ["Facing", "North"],
                ["Location", "Raipur"],
                ["Floors", "G+1"],
                ["Priority", "Elevation + Interior"],
              ].map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white px-3 py-2">
                  <div className="text-xs text-slate-500">{key}</div>
                  <div className="text-sm font-black text-slate-950">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white p-2">
            <input className="h-10 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="Ask AI to revise project brief..." />
            <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectWorkspace() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="blue">AI Draft</Badge>
              <Badge tone="amber">Professional Review Required</Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              30x40 North Facing House — Raipur
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Residential G+1 • Interior + Elevation MVP • BOQ/BBS staged for later phases
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50">
              Request Review
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">
              Export PDF <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Project outputs</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Interior Render", "3 versions generated", "green"],
              ["Front Elevation", "2 versions generated", "green"],
              ["Floor Plan", "Concept queued", "amber"],
              ["Client PDF", "Ready to export", "blue"],
            ].map(([title, desc, tone]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{desc}</p>
                <div className="mt-4">
                  <Badge tone={tone as "green" | "amber" | "blue"}>AI Draft</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Safety layer</h2>
          <div className="mt-5 space-y-3">
            {[
              "Final construction documents require professional review.",
              "Structural member size and reinforcement are not finalized by AI.",
              "BOQ quantities are draft until drawings/site are verified.",
              "BBS requires engineer-entered reinforcement data.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RenderStudio() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Badge tone="green">Live MVP</Badge>
        <h2 className="mt-3 text-2xl font-black text-slate-950">Render Studio</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Interior and elevation image generation with revision by chat.
        </p>

        <div className="mt-6 space-y-4">
          <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none">
            <option>Living Room Interior</option>
            <option>Front Elevation</option>
            <option>Bedroom Interior</option>
            <option>Kitchen Interior</option>
          </select>
          <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none">
            <option>Modern Indian Premium</option>
            <option>Budget Modern</option>
            <option>Luxury White + Wood</option>
            <option>Minimal Warm</option>
          </select>
          <textarea
            className="min-h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none"
            defaultValue="Use walnut wood, beige walls, warm cove lighting, Indian family-friendly storage, clean premium look."
          />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
            Generate Image <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Generated versions</h2>
            <p className="mt-1 text-sm text-slate-500">Prototype preview cards.</p>
          </div>
          <Badge tone="blue">3 images</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Modern Warm", "Premium Wood", "Budget Clean"].map((title, index) => (
            <div key={title} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
              <div className={cn("flex aspect-[4/3] items-center justify-center", index === 0 ? "bg-slate-200" : index === 1 ? "bg-blue-100" : "bg-emerald-100")}>
                <Home className="h-12 w-12 text-slate-700" />
              </div>
              <div className="p-4">
                <h3 className="font-black text-slate-950">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Photorealistic design concept. AI draft for client discussion.
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                    Edit
                  </button>
                  <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800">
                    Save
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BoqPage() {
  const rows = [
    ["1.01", "Excavation for foundation", "Cum", "TBD", "Site verify"],
    ["2.01", "PCC below footing", "Cum", "TBD", "Engineer verify"],
    ["3.01", "RCC in footing", "Cum", "TBD", "Engineer verify"],
    ["4.01", "Reinforcement steel", "Kg", "From BBS", "Review required"],
    ["5.01", "Brick/block masonry", "Sqm/Cum", "Auto", "Draft"],
  ];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <Badge tone="amber">Phase 3</Badge>
      <h2 className="mt-3 text-2xl font-black text-slate-950">BOQ Generator</h2>
      <p className="mt-2 text-sm text-slate-600">
        Rough estimate, detailed BOQ draft, material summary and contractor package.
      </p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-4">Code</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row[0]} className="bg-white">
                <td className="p-4 font-black text-slate-950">{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>
                  <Badge tone="amber">{row[4]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BbsPage() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <Badge tone="amber">Phase 4</Badge>
      <h2 className="mt-3 text-2xl font-black text-slate-950">BBS Generator</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        BBS will be generated only after engineer-entered reinforcement data. AI formats,
        calculates, checks missing items and exports steel summary.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Engineer Input", "Column, beam, slab, footing reinforcement data."],
          ["Rule Calculation", "Cutting length, total length, unit weight, total steel."],
          ["Export", "Member-wise BBS, dia-wise steel summary, PDF/Excel."],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExportPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        ["Client Concept PDF", "Brief, renders, material palette, rough budget."],
        ["Contractor Package", "Drawing index, BOQ, material summary, work sequence."],
        ["Structural Review Package", "Plan, grid, column/beam/slab draft, checklist."],
      ].map(([title, desc]) => (
        <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <FileText className="h-7 w-7 text-slate-900" />
          <h3 className="mt-4 font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            Generate PDF <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ReviewPage() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <Badge tone="amber">Review Workflow</Badge>
      <h2 className="mt-3 text-2xl font-black text-slate-950">
        Professional review center
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {["AI Draft", "Under Review", "Changes Required", "Approved"].map((step, index) => (
          <div key={step} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-black text-slate-950">
              {index + 1}
            </div>
            <div className="text-sm font-black text-slate-950">{step}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SikhadengeBuildPrototype() {
  const [active, setActive] = useState<ViewKey>("dashboard");

  const content = () => {
    if (active === "dashboard") return <Dashboard setActive={setActive} />;
    if (active === "tools") return <ToolsPage />;
    if (active === "studio") return <NewProjectPage />;
    if (active === "projects") return <ProjectWorkspace />;
    if (active === "renders") return <RenderStudio />;
    if (active === "boq") return <BoqPage />;
    if (active === "bbs") return <BbsPage />;
    if (active === "exports") return <ExportPage />;
    if (active === "reviews") return <ReviewPage />;
    return <Dashboard setActive={setActive} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <Sidebar active={active} setActive={setActive} />
        <main className="min-w-0 flex-1">
          <Topbar setActive={setActive} />
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-7 lg:py-8">
            {content()}
          </div>
        </main>
      </div>
    </div>
  );
}
