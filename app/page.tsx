"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Command,
  CreditCard,
  Download,
  FileText,
  FolderKanban,
  Gauge,
  Hammer,
  Home,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  RadioTower,
  Ruler,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Wand2,
  Zap,
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
  { id: "dashboard", label: "Command Center", icon: LayoutDashboard },
  { id: "tools", label: "AI Tools", icon: Boxes },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "studio", label: "New Build", icon: Sparkles },
  { id: "renders", label: "Render Studio", icon: ImageIcon },
  { id: "boq", label: "BOQ Engine", icon: Calculator },
  { id: "bbs", label: "BBS Lab", icon: ClipboardList },
  { id: "reviews", label: "Review Gate", icon: ShieldCheck },
  { id: "exports", label: "Exports", icon: FileText },
] as const;

const tools = [
  {
    title: "Interior AI",
    category: "Interior",
    cost: "1 credit",
    icon: ImageIcon,
    status: "Live MVP",
    desc: "Photorealistic interiors from brief, room photo, or reference style.",
    accent: "from-cyan-300/20 to-blue-500/10",
  },
  {
    title: "Exterior Elevation AI",
    category: "Architecture",
    cost: "1 credit",
    icon: Building2,
    status: "Live MVP",
    desc: "Premium front elevation concepts for homes, shops, villas and duplexes.",
    accent: "from-amber-300/20 to-orange-500/10",
  },
  {
    title: "Site Photo Redesign",
    category: "Image Tools",
    cost: "1 credit",
    icon: Wand2,
    status: "Live MVP",
    desc: "Upload existing room/site photo and generate redesigned visual options.",
    accent: "from-violet-300/20 to-fuchsia-500/10",
  },
  {
    title: "Client PDF Builder",
    category: "Presentation",
    cost: "1 credit",
    icon: FileText,
    status: "Live MVP",
    desc: "Turn brief, renders, notes and estimates into client-ready proposal PDFs.",
    accent: "from-emerald-300/20 to-teal-500/10",
  },
  {
    title: "Floor Plan Concept AI",
    category: "Planning",
    cost: "2 credits",
    icon: Ruler,
    status: "Phase 2",
    desc: "Concept plans with room dimensions, area statement and review warnings.",
    accent: "from-sky-300/20 to-indigo-500/10",
  },
  {
    title: "Working Drawing Draft AI",
    category: "Docs",
    cost: "3 credits",
    icon: Layers3,
    status: "Phase 2",
    desc: "Architectural, interior, electrical, plumbing and structural draft packs.",
    accent: "from-slate-300/20 to-slate-500/10",
  },
  {
    title: "BOQ Generator",
    category: "Estimate",
    cost: "2 credits",
    icon: Calculator,
    status: "Phase 3",
    desc: "Rough BOQ, material summary, rate sheet and contractor estimate.",
    accent: "from-lime-300/20 to-emerald-500/10",
  },
  {
    title: "BBS Generator",
    category: "Structural",
    cost: "3 credits",
    icon: ClipboardList,
    status: "Phase 4",
    desc: "BBS from engineer-entered reinforcement data and member schedules.",
    accent: "from-red-300/20 to-rose-500/10",
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
  tone?: "default" | "gold" | "cyan" | "green" | "amber" | "violet" | "dark";
}) {
  const tones = {
    default: "border-white/10 bg-white/[0.04] text-slate-300",
    gold: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200",
    green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-200",
    violet: "border-violet-300/25 bg-violet-300/10 text-violet-200",
    dark: "border-white/10 bg-slate-950/80 text-white",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

function PremiumShell({
  active,
  setActive,
  children,
}: {
  active: ViewKey;
  setActive: (id: ViewKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-slate-100">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -left-36 top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-[34rem] w-[34rem] rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative flex">
        <aside className="hidden h-screen w-76 shrink-0 border-r border-white/10 bg-white/[0.035] px-4 py-5 backdrop-blur-2xl lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-cyan-200 to-violet-300 text-slate-950 shadow-[0_0_32px_rgba(245,199,122,.25)]">
              <Hammer className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.9)]" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-white">Sikhadenge Build</div>
              <div className="text-xs text-slate-400">AI construction workspace</div>
            </div>
          </div>

          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id as ViewKey)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition",
                    isActive
                      ? "border border-white/12 bg-white/12 text-white shadow-[0_0_24px_rgba(103,232,249,.08)]"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition",
                      isActive ? "bg-cyan-300/15 text-cyan-200" : "bg-white/[0.04] text-slate-500 group-hover:text-cyan-200",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-300/10 via-white/[0.04] to-violet-400/10 p-4 glow-card">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-cyan-100">
              <RadioTower className="h-4 w-4" />
              MVP Control Layer
            </div>
            <p className="text-xs leading-5 text-slate-300">
              Brief chat, render engine, project save, client PDF and credit tracking are the launch core.
            </p>
          </div>

          <div className="mt-auto rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Generation Credits</span>
              <CreditCard className="h-4 w-4 text-amber-200" />
            </div>
            <div className="gold-text text-4xl font-black">84</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-amber-200 to-cyan-200" />
            </div>
            <p className="mt-2 text-xs text-slate-400">Available for render, PDF and review actions</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05060a]/72 px-4 py-4 backdrop-blur-2xl lg:px-7">
            <div className="flex items-center gap-3">
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>

              <div className="relative hidden flex-1 md:block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.07]"
                  placeholder="Search tools, projects, drawings, BOQ, BBS..."
                />
              </div>

              <button
                onClick={() => setActive("studio")}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-cyan-200 to-violet-300 px-4 text-sm font-black text-slate-950 shadow-[0_0_32px_rgba(103,232,249,.16)] transition hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </button>

              <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-amber-100 sm:flex">
                <Sparkles className="h-4 w-4 text-amber-200" />
                84 credits
              </div>

              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
                <Bell className="h-4 w-4" />
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
                <Moon className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-7 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: (typeof tools)[number] }) {
  const Icon = tool.icon;
  const tone =
    tool.status === "Live MVP" ? "green" : tool.status === "Phase 2" ? "cyan" : "amber";

  return (
    <div className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.07] glow-card">
      <div className={cn("absolute inset-x-0 top-0 h-28 bg-gradient-to-br opacity-80", tool.accent)} />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-cyan-100">
            <Icon className="h-5 w-5" />
          </div>
          <button className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 hover:text-amber-200">
            <Star className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="cyan">{tool.category}</Badge>
          <Badge tone={tone}>{tool.status}</Badge>
        </div>

        <h3 className="text-lg font-black tracking-tight text-white">{tool.title}</h3>
        <p className="mt-2 min-h-14 text-sm leading-6 text-slate-400">{tool.desc}</p>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm font-bold text-amber-100">{tool.cost}</span>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/15">
            Launch <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ setActive }: { setActive: (id: ViewKey) => void }) {
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card lg:p-8">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone="gold">build.sikhadenge.in</Badge>
              <Badge tone="cyan">AI Design + Construction Workspace</Badge>
              <Badge tone="violet">Premium Prototype</Badge>
            </div>

            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
              Build intelligence for <span className="gold-text">interiors</span>,{" "}
              <span className="neon-text">architecture</span> and construction docs.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
              Client brief ko AI smart questions, structured project brief, premium renders,
              floor plan concepts, BOQ, BBS and client-ready packages me convert karo.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setActive("studio")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-cyan-200 to-violet-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_44px_rgba(245,199,122,.16)]"
              >
                Start AI Build <Zap className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActive("tools")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white hover:bg-white/[0.08]"
              >
                Explore Tools <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["AI Brief", "5-7 smart questions"],
                ["Renders", "Interior + Elevation"],
                ["Review", "Professional gate"],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-black text-white">{title}</div>
                  <div className="mt-1 text-xs text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-4">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white">Live Project Command</h3>
                  <p className="mt-1 text-xs text-slate-400">30x40 North Facing House</p>
                </div>
                <Badge tone="amber">Review Required</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Plot", "30x40 ft"],
                  ["Type", "G+1 Home"],
                  ["City", "Raipur"],
                  ["Outputs", "3 ready"],
                ].map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-slate-500">{key}</p>
                    <p className="mt-1 text-sm font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
                AI Draft: Structural, MEP, BBS and construction documents need professional review.
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ["Brief Parser", 100],
                  ["Render Engine", 82],
                  ["PDF Package", 68],
                  ["Review Gate", 42],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{label as string}</span>
                      <span className="text-slate-300">{value as number}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-200 to-cyan-200"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active Projects", "18", FolderKanban, "cyan"],
          ["Images Generated", "246", ImageIcon, "gold"],
          ["Review Pending", "7", ShieldCheck, "amber"],
          ["Credits Left", "84", Sparkles, "violet"],
        ].map(([label, value, Icon, tone]) => (
          <div key={label as string} className="rounded-[1.65rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl glow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{label as string}</p>
                <p className="mt-2 text-4xl font-black text-white">{value as string}</p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-3",
                  tone === "gold"
                    ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                    : tone === "amber"
                      ? "border-orange-300/20 bg-orange-300/10 text-orange-200"
                      : tone === "violet"
                        ? "border-violet-300/20 bg-violet-300/10 text-violet-200"
                        : "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <SectionHeader title="Launch Tools" desc="MVP ke liye premium visible modules." onClick={() => setActive("tools")} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tools.slice(0, 4).map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Recent Project Spaces" desc="Saved client workspaces, drafts and review packages." />
        <div className="grid gap-4 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.title} project={project} setActive={setActive} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{desc}</p>
      </div>
      {onClick && (
        <button onClick={onClick} className="hidden rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/[0.08] sm:inline-flex">
          View all
        </button>
      )}
    </div>
  );
}

function ProjectCard({ project, setActive }: { project: (typeof projects)[number]; setActive: (id: ViewKey) => void }) {
  const tone = project.status === "Client Ready" ? "green" : project.status === "Review Required" ? "amber" : "cyan";

  return (
    <div className="rounded-[1.65rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl glow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-white">{project.title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {project.type} • {project.city}
          </p>
        </div>
        <Badge tone={tone}>{project.status}</Badge>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-200 to-cyan-200" style={{ width: `${project.progress}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.outputs.map((output) => (
          <Badge key={output}>{output}</Badge>
        ))}
      </div>

      <button
        onClick={() => setActive("projects")}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-black text-white hover:bg-white/[0.08]"
      >
        Open Workspace <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToolsPage() {
  const categories = useMemo(() => ["All", ...Array.from(new Set(tools.map((t) => t.category)))], []);
  const [category, setCategory] = useState("All");
  const filtered = category === "All" ? tools : tools.filter((tool) => tool.category === category);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
        <Badge tone="cyan">AI Tool Library</Badge>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-white">Premium tool grid for design and construction</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Start with live MVP tools: interior, elevation, site photo redesign and client PDF. Advanced BOQ/BBS modules remain gated behind review logic.
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
                ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white",
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
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
        <Badge tone="gold">New AI Build</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.035em] text-white">Create premium project brief</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Hindi or English me client requirement likho. AI smart questions poochkar structured design brief banayega.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {["Home / Residential", "Flat Interior", "Shop / Showroom", "Cafe / Restaurant", "Office", "Villa / Duplex"].map((type) => (
            <button key={type} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black text-slate-200 hover:border-cyan-300/30 hover:bg-cyan-300/10">
              {type}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <label className="text-sm font-black text-white">Client brief</label>
          <textarea
            className="mt-3 min-h-44 w-full rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            defaultValue="30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye. First floor me 2 bedroom aur balcony chahiye. Modern elevation chahiye. Budget 38 lakh."
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-cyan-200 to-violet-300 px-5 py-3 text-sm font-black text-slate-950">
            Generate Smart Questions <Sparkles className="h-4 w-4" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white hover:bg-white/[0.08]">
            Upload Plan / Photo <Upload className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] backdrop-blur-xl glow-card">
        <div className="border-b border-white/10 p-5">
          <h2 className="font-black text-white">AI Briefing Chat</h2>
          <p className="mt-1 text-sm text-slate-400">Smart questions + structured project brief.</p>
        </div>

        <div className="space-y-4 p-5">
          <div className="ml-auto max-w-[85%] rounded-3xl bg-gradient-to-r from-cyan-300/20 to-violet-300/20 px-4 py-3 text-sm leading-6 text-white">
            30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye.
          </div>
          <div className="max-w-[85%] rounded-3xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-slate-200">
            Samjha. Ye G+1 residential project hai. Mujhe 5 details chahiye: city, staircase type, vastu preference, parking type, aur pehle output me floor plan ya elevation chahiye?
          </div>

          <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/8 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-cyan-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
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
                <div key={key} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
                  <div className="text-xs text-slate-500">{key}</div>
                  <div className="text-sm font-black text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-black/25 p-2">
            <input className="h-10 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-600" placeholder="Ask AI to revise project brief..." />
            <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
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
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="cyan">AI Draft</Badge>
              <Badge tone="amber">Professional Review Required</Badge>
            </div>
            <h1 className="text-4xl font-black tracking-[-0.035em] text-white">30x40 North Facing House — Raipur</h1>
            <p className="mt-2 text-sm text-slate-400">
              Residential G+1 • Interior + Elevation MVP • BOQ/BBS staged for later phases
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-white hover:bg-white/[0.08]">
              Request Review
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 to-cyan-200 px-4 py-2.5 text-sm font-black text-slate-950">
              Export PDF <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
          <h2 className="text-xl font-black text-white">Project outputs</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Interior Render", "3 versions generated", "green"],
              ["Front Elevation", "2 versions generated", "green"],
              ["Floor Plan", "Concept queued", "amber"],
              ["Client PDF", "Ready to export", "cyan"],
            ].map(([title, desc, tone]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{desc}</p>
                <div className="mt-4">
                  <Badge tone={tone as "green" | "amber" | "cyan"}>AI Draft</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SafetyPanel />
      </div>
    </div>
  );
}

function SafetyPanel() {
  return (
    <div className="rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.055] p-6 backdrop-blur-xl glow-card">
      <h2 className="text-xl font-black text-white">Safety and review layer</h2>
      <div className="mt-5 space-y-3">
        {[
          "Final construction documents require professional review.",
          "Structural member size and reinforcement are not finalized by AI.",
          "BOQ quantities are draft until drawings/site are verified.",
          "BBS requires engineer-entered reinforcement data.",
        ].map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl border border-amber-300/15 bg-black/20 p-3 text-sm leading-6 text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderStudio() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
        <Badge tone="green">Live MVP</Badge>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-white">Render Studio</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">Interior and elevation image generation with revision by chat.</p>

        <div className="mt-6 space-y-4">
          <select className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none">
            <option>Living Room Interior</option>
            <option>Front Elevation</option>
            <option>Bedroom Interior</option>
            <option>Kitchen Interior</option>
          </select>
          <select className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-bold text-white outline-none">
            <option>Modern Indian Premium</option>
            <option>Budget Modern</option>
            <option>Luxury White + Wood</option>
            <option>Minimal Warm</option>
          </select>
          <textarea
            className="min-h-28 w-full rounded-3xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white outline-none"
            defaultValue="Use walnut wood, beige walls, warm cove lighting, Indian family-friendly storage, clean premium look."
          />
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-cyan-200 to-violet-300 px-5 py-3 text-sm font-black text-slate-950">
            Generate Image <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Generated versions</h2>
            <p className="mt-1 text-sm text-slate-400">Prototype premium preview cards.</p>
          </div>
          <Badge tone="cyan">3 images</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {["Modern Warm", "Premium Wood", "Budget Clean"].map((title, index) => (
            <div key={title} className="overflow-hidden rounded-3xl border border-white/10 bg-black/25">
              <div
                className={cn(
                  "flex aspect-[4/3] items-center justify-center",
                  index === 0
                    ? "bg-gradient-to-br from-amber-200/20 to-slate-900"
                    : index === 1
                      ? "bg-gradient-to-br from-cyan-200/20 to-slate-900"
                      : "bg-gradient-to-br from-emerald-200/20 to-slate-900",
                )}
              >
                <Home className="h-12 w-12 text-white/70" />
              </div>
              <div className="p-4">
                <h3 className="font-black text-white">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">Photorealistic design concept. AI draft for client discussion.</p>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-xl bg-cyan-300/15 px-3 py-2 text-xs font-black text-cyan-100">Edit</button>
                  <button className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-white">Save</button>
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
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
      <Badge tone="amber">Phase 3</Badge>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-white">BOQ Generator</h2>
      <p className="mt-3 text-sm text-slate-400">Rough estimate, detailed BOQ draft, material summary and contractor package.</p>

      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.05] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="p-4">Code</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row) => (
              <tr key={row[0]} className="bg-black/15">
                <td className="p-4 font-black text-white">{row[0]}</td>
                <td className="text-slate-300">{row[1]}</td>
                <td className="text-slate-400">{row[2]}</td>
                <td className="text-slate-400">{row[3]}</td>
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
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
      <Badge tone="amber">Phase 4</Badge>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-white">BBS Generator</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
        BBS will be generated only after engineer-entered reinforcement data. AI formats,
        calculates, checks missing items and exports steel summary.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["Engineer Input", "Column, beam, slab, footing reinforcement data."],
          ["Rule Calculation", "Cutting length, total length, unit weight, total steel."],
          ["Export", "Member-wise BBS, dia-wise steel summary, PDF/Excel."],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-5">
            <h3 className="font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
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
        ["Client Concept PDF", "Brief, renders, material palette, rough budget.", FileText],
        ["Contractor Package", "Drawing index, BOQ, material summary, work sequence.", Command],
        ["Structural Review Package", "Plan, grid, column/beam/slab draft, checklist.", ShieldCheck],
      ].map(([title, desc, Icon]) => (
        <div key={title as string} className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
          <Icon className="h-7 w-7 text-cyan-200" />
          <h3 className="mt-4 font-black text-white">{title as string}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{desc as string}</p>
          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 to-cyan-200 px-4 py-3 text-sm font-black text-slate-950">
            Generate PDF <Download className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ReviewPage() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl glow-card">
      <Badge tone="amber">Professional Gate</Badge>
      <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-white">Review center</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {["AI Draft", "Under Review", "Changes Required", "Approved"].map((step, index) => (
          <div key={step} className="rounded-3xl border border-white/10 bg-black/25 p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/15 font-black text-cyan-100">
              {index + 1}
            </div>
            <div className="text-sm font-black text-white">{step}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SikhadengeBuildPremiumPrototype() {
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
    <PremiumShell active={active} setActive={setActive}>
      {content()}
    </PremiumShell>
  );
}
