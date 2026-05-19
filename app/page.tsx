"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  FolderKanban,
  Hammer,
  Heart,
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
  Wrench,
  Menu,
  CircleHelp,
  Globe,
  UserCircle,
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

type ToolCategory =
  | "All"
  | "Interior"
  | "Exterior"
  | "Construction"
  | "Estimation"
  | "Structural"
  | "Presentation"
  | "Image Tools";

type Tool = {
  title: string;
  category: Exclude<ToolCategory, "All">;
  desc: string;
  cost: string;
  status: "Live" | "Phase 2" | "Phase 3" | "Phase 4" | "Review";
  icon: React.ElementType;
  visual: string;
};

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

const sideBottom = [
  { label: "Support", icon: CircleHelp },
  { label: "Explore", icon: Globe },
  { label: "Settings", icon: Settings },
  { label: "Account", icon: UserCircle },
];

const tools: Tool[] = [
  {
    title: "Magic Brief",
    category: "Presentation",
    desc: "Client brief ko structured project brief, smart questions aur output plan me convert karo.",
    cost: "1 credit / brief",
    status: "Live",
    icon: Sparkles,
    visual: "from-[#faf0dd] via-[#ffffff] to-[#dac7ff]",
  },
  {
    title: "Interior Render",
    category: "Interior",
    desc: "Living room, bedroom, kitchen aur office interiors client brief ya photo se generate karo.",
    cost: "1 credit / generation",
    status: "Live",
    icon: ImageIcon,
    visual: "from-[#c9a77d] via-[#f4e8d6] to-[#6b4f3c]",
  },
  {
    title: "Exterior Elevation",
    category: "Exterior",
    desc: "House, villa, duplex, shop aur commercial building ke front elevation concepts banao.",
    cost: "1 credit / generation",
    status: "Live",
    icon: Building2,
    visual: "from-[#d8f5c8] via-[#8abf63] to-[#26351f]",
  },
  {
    title: "Site Photo Redesign",
    category: "Image Tools",
    desc: "Existing room ya site photo ko prompt ke according redesign karo.",
    cost: "1 credit / generation",
    status: "Live",
    icon: Wand2,
    visual: "from-[#b99bff] via-[#d7c8ff] to-[#526173]",
  },
  {
    title: "Render Enhancer",
    category: "Image Tools",
    desc: "Rough render ya 3D screenshot ko photorealistic client-ready visual me convert karo.",
    cost: "1 credit / generation",
    status: "Live",
    icon: ImageIcon,
    visual: "from-[#c8b39c] via-[#f0e2d2] to-[#5d4c3f]",
  },
  {
    title: "Floor Plan AI",
    category: "Construction",
    desc: "Plot size, facing, rooms aur vastu preference se concept floor plan generate karo.",
    cost: "2 credits / plan",
    status: "Phase 2",
    icon: Ruler,
    visual: "from-[#e0e7ff] via-[#ffffff] to-[#b9cdf8]",
  },
  {
    title: "Working Drawings",
    category: "Construction",
    desc: "Architectural, interior, electrical, plumbing aur structural draft checklist banao.",
    cost: "3 credits / package",
    status: "Phase 2",
    icon: Layers3,
    visual: "from-[#f7f2ff] via-[#ffffff] to-[#d9c5ff]",
  },
  {
    title: "BOQ Generator",
    category: "Estimation",
    desc: "Earthwork, PCC, RCC, masonry, plaster, flooring, MEP aur interiors ka BOQ draft.",
    cost: "2 credits / estimate",
    status: "Phase 3",
    icon: Calculator,
    visual: "from-[#dcfce7] via-[#ffffff] to-[#86efac]",
  },
  {
    title: "BBS Generator",
    category: "Structural",
    desc: "Engineer input ke basis par member-wise BBS, steel summary aur cutting list banao.",
    cost: "3 credits / schedule",
    status: "Phase 4",
    icon: ClipboardList,
    visual: "from-[#fee2e2] via-[#ffffff] to-[#fca5a5]",
  },
  {
    title: "Column Beam Plan",
    category: "Structural",
    desc: "Column, beam, slab aur grid draft. Final size/reinforcement engineer review ke baad.",
    cost: "3 credits / draft",
    status: "Review",
    icon: ShieldCheck,
    visual: "from-[#111827] via-[#475569] to-[#f8fafc]",
  },
  {
    title: "Client PDF",
    category: "Presentation",
    desc: "Brief, renders, plan notes, material palette aur next steps ko proposal PDF me export karo.",
    cost: "1 credit / PDF",
    status: "Live",
    icon: FileText,
    visual: "from-[#ede9fe] via-[#ffffff] to-[#c4b5fd]",
  },
  {
    title: "Contractor Package",
    category: "Construction",
    desc: "BOQ, material list, work sequence, site checklist aur revision notes ka package banao.",
    cost: "2 credits / package",
    status: "Phase 3",
    icon: Wrench,
    visual: "from-[#fed7aa] via-[#ffffff] to-[#fdba74]",
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Live: "bg-[#12b76a] text-white",
    "Phase 2": "bg-[#2563eb] text-white",
    "Phase 3": "bg-[#f97316] text-white",
    "Phase 4": "bg-[#f97316] text-white",
    Review: "bg-black text-white",
    "AI Draft": "bg-[#eef4ff] text-[#2563eb]",
    "Review Required": "bg-[#fff7ed] text-[#f97316]",
    "Client Ready": "bg-[#ecfdf3] text-[#039855]",
  };

  return (
    <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", styles[status] || "bg-[#f3e8ff] text-[#6f1cc4]")}>
      {status}
    </span>
  );
}

function Sidebar({ active, setActive }: { active: ViewKey; setActive: (id: ViewKey) => void }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[190px] border-r border-[#eee7f7] bg-white px-3 py-5 lg:block">
      <div className="mb-7 flex items-center gap-2 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b2cf5] to-[#5f12ad] text-white shadow-lg shadow-purple-200">
          <Hammer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[20px] font-semibold tracking-[-0.04em] text-[#6b1cc8]">
            Sikhadenge
          </div>
          <div className="-mt-1 text-[12px] font-medium text-[#8a7aa3]">Build</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id as ViewKey)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] font-medium transition",
                selected
                  ? "bg-[#f0dcff] text-[#7c1fd1]"
                  : "text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#7c1fd1]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-7 space-y-1 border-t border-[#f0e9f8] pt-4">
        {sideBottom.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] font-medium text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#7c1fd1]"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function TopBar({ setActive }: { setActive: (id: ViewKey) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#eee7f7] bg-white/95 px-4 py-4 backdrop-blur lg:ml-[190px] lg:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-xl border border-[#ded5ec] p-2 text-[#5d5077] lg:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8caf]" />
          <input
            className="h-11 w-full rounded-xl border border-[#ded5ec] bg-white pl-11 pr-4 text-sm text-[#21133f] outline-none placeholder:text-[#9b8caf] focus:border-[#a855f7]"
            placeholder="Search tools, projects, BOQ, BBS, drawings..."
          />
        </div>

        <button
          onClick={() => setActive("studio")}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6f1cc4] px-4 text-sm font-semibold text-white transition hover:bg-[#55129a]"
        >
          <Plus className="h-4 w-4" />
          Create Project
        </button>

        <div className="hidden rounded-xl border border-[#ded5ec] bg-[#fbf8ff] px-3 py-2 text-sm font-medium text-[#6f1cc4] sm:block">
          84 credits
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ded5ec] bg-white text-[#5d5077]">
          <Bell className="h-4 w-4" />
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ded5ec] bg-white text-[#5d5077]">
          <Moon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;

  return (
    <article className="card-shadow overflow-hidden rounded-2xl border border-[#ded5ec] bg-white transition hover:-translate-y-1 hover:border-[#a855f7]">
      <div className={cn("relative h-[118px] bg-gradient-to-br", tool.visual)}>
        <div className="tool-visual-overlay absolute inset-0" />

        <div className="absolute left-4 top-4 rounded-md border border-black/20 bg-white/85 px-1.5 py-1 text-xs font-semibold text-[#160b25]">
          AI
        </div>

        <div className="absolute right-3 top-3">
          <StatusBadge status={tool.status} />
        </div>

        <div className="absolute bottom-4 left-4 right-3 flex items-end justify-between">
          <h3 className="max-w-[170px] text-[24px] font-semibold leading-[0.98] tracking-[-0.045em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
            {tool.title}
          </h3>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/15 bg-white/85 text-[#160b25] shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="min-h-[68px] text-[13px] font-normal leading-5 text-[#3f315d]">
          {tool.desc}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#6f1cc4] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#55129a]">
            Launch Tool <ArrowRight className="h-4 w-4" />
          </button>
          <button className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-[#d8cee8] bg-[#f4f1f8] text-[#6b5a84] transition hover:border-[#a855f7] hover:text-[#7c1fd1]">
            <Upload className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-normal text-[#817397]">
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
          {tool.cost}
        </div>
      </div>
    </article>
  );
}

function PageShell({
  active,
  setActive,
  children,
}: {
  active: ViewKey;
  setActive: (id: ViewKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-[#21133f]">
      <Sidebar active={active} setActive={setActive} />
      <TopBar setActive={setActive} />
      <main className="lg:ml-[190px]">
        <div className="px-4 py-5 lg:px-6">{children}</div>
      </main>
    </div>
  );
}

function SectionTitle({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[#21133f]">{title}</h1>
        {desc && <p className="mt-1 text-sm font-normal text-[#6b5a84]">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Dashboard({ setActive }: { setActive: (id: ViewKey) => void }) {
  const launchTools = tools.filter((tool) =>
    ["Magic Brief", "Interior Render", "Exterior Elevation", "Client PDF"].includes(tool.title),
  );

  return (
    <div>
      <SectionTitle
        title="Dashboard"
        desc="Sikhadenge Build ka command overview. Tools All Tools section me organized hain."
        action={
          <button
            onClick={() => setActive("studio")}
            className="hidden rounded-xl bg-[#6f1cc4] px-4 py-2.5 text-sm font-medium text-white sm:inline-flex"
          >
            New Project
          </button>
        }
      />

      <section className="mb-5 rounded-2xl border border-[#ded5ec] bg-gradient-to-br from-[#fbf8ff] via-white to-[#f3e8ff] p-5 card-shadow">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-[#f0dcff] px-3 py-1 text-xs font-medium text-[#6f1cc4]">
              AI Design + Construction Workspace
            </div>
            <h2 className="max-w-3xl text-[34px] font-semibold leading-tight tracking-[-0.05em] text-[#21133f]">
              Client brief se renders, plan, BOQ, BBS aur client package tak.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5d5077]">
              Pehle brief chat, interior render, exterior elevation aur PDF export. Construction modules phase-wise add honge with professional review.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ded5ec] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#21133f]">Live Project Draft</p>
              <StatusBadge status="Review Required" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Plot", "30x40 ft"],
                ["Type", "G+1 Home"],
                ["City", "Raipur"],
                ["Outputs", "3 ready"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                  <p className="text-xs text-[#817397]">{k}</p>
                  <p className="mt-1 text-sm font-medium text-[#21133f]">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active Projects", "18", FolderKanban],
          ["Images Generated", "246", ImageIcon],
          ["Review Pending", "7", ShieldCheck],
          ["Credits Left", "84", Sparkles],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-normal text-[#817397]">{label as string}</p>
                <p className="mt-2 text-3xl font-semibold text-[#21133f]">{value as string}</p>
              </div>
              <div className="rounded-xl bg-[#f0dcff] p-3 text-[#6f1cc4]">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <SectionTitle title="Quick Launch" desc="Sirf important MVP tools yaha rakhe gaye hain." />
      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {launchTools.map((tool) => (
          <ToolCard key={tool.title} tool={tool} />
        ))}
      </div>

      <SectionTitle title="Recent Projects" desc="Saved client workspaces and draft packages." />
      <ProjectGrid setActive={setActive} />
    </div>
  );
}

function CategoryTabs({
  active,
  setActive,
}: {
  active: ToolCategory;
  setActive: (category: ToolCategory) => void;
}) {
  const categories: ToolCategory[] = [
    "All",
    "Interior",
    "Exterior",
    "Construction",
    "Estimation",
    "Structural",
    "Presentation",
    "Image Tools",
  ];

  return (
    <div className="mb-5 flex gap-2 overflow-x-auto">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => setActive(category)}
          className={cn(
            "min-w-fit rounded-xl border px-4 py-2.5 text-sm font-medium transition",
            active === category
              ? "border-[#160b25] bg-[#160b25] text-white"
              : "border-[#ded5ec] bg-white text-[#4c4166] hover:border-[#b88bea] hover:bg-[#fbf8ff]",
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

function AllToolsPage() {
  const [category, setCategory] = useState<ToolCategory>("All");
  const filtered = useMemo(() => {
    if (category === "All") return tools;
    return tools.filter((tool) => tool.category === category);
  }, [category]);

  return (
    <div>
      <SectionTitle
        title="All Tools"
        desc="Sikhadenge Build ke AI tools. BOQ, BBS, Working Drawing aur Review modules yahi se accessible hain."
      />
      <CategoryTabs active={category} setActive={setCategory} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((tool) => (
          <ToolCard key={tool.title} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function ProjectGrid({ setActive }: { setActive: (id: ViewKey) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {projects.map((project) => (
        <div key={project.title} className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-[#21133f]">{project.title}</h3>
              <p className="mt-1 text-sm text-[#817397]">
                {project.type} • {project.city}
              </p>
            </div>
            <StatusBadge status={project.status} />
          </div>

          <div className="mt-4 h-2 rounded-full bg-[#f0e9f8]">
            <div className="h-2 rounded-full bg-[#6f1cc4]" style={{ width: `${project.progress}%` }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {project.outputs.map((output) => (
              <span key={output} className="rounded-full border border-[#ded5ec] px-2.5 py-1 text-xs text-[#5d5077]">
                {output}
              </span>
            ))}
          </div>

          <button
            onClick={() => setActive("projects")}
            className="mt-5 w-full rounded-xl border border-[#ded5ec] bg-[#fbf8ff] px-3 py-2.5 text-sm font-medium text-[#6f1cc4] hover:bg-[#f0dcff]"
          >
            Open Workspace
          </button>
        </div>
      ))}
    </div>
  );
}

function ProjectsPage({ setActive }: { setActive: (id: ViewKey) => void }) {
  return (
    <div>
      <SectionTitle title="Projects" desc="Client projects, draft packages, review status and exports." />
      <ProjectGrid setActive={setActive} />
    </div>
  );
}

function NewProjectPage() {
  return (
    <div>
      <SectionTitle title="New Project" desc="Client brief se structured design brief generate karo." />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {["Home / Residential", "Flat Interior", "Shop / Showroom", "Cafe / Restaurant", "Office", "Villa / Duplex"].map((type) => (
              <button key={type} className="rounded-xl border border-[#ded5ec] bg-[#fbf8ff] px-4 py-3 text-left text-sm font-medium text-[#21133f] hover:border-[#a855f7]">
                {type}
              </button>
            ))}
          </div>

          <label className="text-sm font-medium text-[#21133f]">Client brief</label>
          <textarea
            className="mt-3 min-h-44 w-full rounded-2xl border border-[#ded5ec] bg-white p-4 text-sm leading-6 text-[#21133f] outline-none focus:border-[#a855f7]"
            defaultValue="30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye. First floor me 2 bedroom aur balcony chahiye. Modern elevation chahiye. Budget 38 lakh."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#6f1cc4] px-5 py-3 text-sm font-medium text-white">
              Generate Smart Questions <Sparkles className="h-4 w-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#ded5ec] bg-[#fbf8ff] px-5 py-3 text-sm font-medium text-[#6f1cc4]">
              Upload Plan / Photo <Upload className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#ded5ec] bg-white card-shadow">
          <div className="border-b border-[#eee7f7] p-5">
            <h2 className="font-medium text-[#21133f]">AI Briefing Chat</h2>
            <p className="mt-1 text-sm text-[#817397]">Smart questions + structured project brief.</p>
          </div>

          <div className="space-y-4 p-5">
            <div className="ml-auto max-w-[85%] rounded-2xl bg-[#6f1cc4] px-4 py-3 text-sm leading-6 text-white">
              30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye.
            </div>
            <div className="max-w-[85%] rounded-2xl bg-[#f7f0ff] px-4 py-3 text-sm leading-6 text-[#3f315d]">
              Samjha. Ye G+1 residential project hai. Mujhe 5 details chahiye: city, staircase type, vastu preference, parking type, aur pehle output me floor plan ya elevation chahiye?
            </div>

            <div className="rounded-2xl border border-[#ded5ec] bg-[#fbf8ff] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#21133f]">
                <CheckCircle2 className="h-4 w-4 text-[#12b76a]" />
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
                  <div key={key} className="rounded-xl bg-white px-3 py-2">
                    <div className="text-xs text-[#817397]">{key}</div>
                    <div className="text-sm font-medium text-[#21133f]">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#ded5ec] bg-white p-2">
              <input className="h-10 flex-1 bg-transparent px-3 text-sm outline-none" placeholder="Ask AI to revise project brief..." />
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6f1cc4] text-white">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RenderStudio() {
  return (
    <div>
      <SectionTitle title="Render Studio" desc="Interior and elevation image generation with revision by chat." />
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
          <div className="mb-4">
            <StatusBadge status="Live" />
          </div>
          <select className="mb-3 h-12 w-full rounded-xl border border-[#ded5ec] bg-white px-4 text-sm text-[#21133f] outline-none">
            <option>Living Room Interior</option>
            <option>Front Elevation</option>
            <option>Bedroom Interior</option>
            <option>Kitchen Interior</option>
          </select>
          <select className="mb-3 h-12 w-full rounded-xl border border-[#ded5ec] bg-white px-4 text-sm text-[#21133f] outline-none">
            <option>Modern Indian Premium</option>
            <option>Budget Modern</option>
            <option>Luxury White + Wood</option>
            <option>Minimal Warm</option>
          </select>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-[#ded5ec] bg-white p-4 text-sm leading-6 outline-none"
            defaultValue="Use walnut wood, beige walls, warm cove lighting, Indian family-friendly storage, clean premium look."
          />
          <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6f1cc4] px-5 py-3 text-sm font-medium text-white">
            Generate Image <Sparkles className="h-4 w-4" />
          </button>
        </section>

        <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
          <h2 className="font-medium text-[#21133f]">Generated versions</h2>
          <p className="mt-1 text-sm text-[#817397]">Prototype preview cards.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {["Modern Warm", "Premium Wood", "Budget Clean"].map((title, index) => (
              <div key={title} className="overflow-hidden rounded-2xl border border-[#ded5ec] bg-white">
                <div
                  className={cn(
                    "flex aspect-[4/3] items-center justify-center",
                    index === 0 ? "bg-[#f4e8d6]" : index === 1 ? "bg-[#e0e7ff]" : "bg-[#dcfce7]",
                  )}
                >
                  <Home className="h-12 w-12 text-[#6b5a84]" />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-[#21133f]">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#817397]">
                    AI draft for client discussion.
                  </p>
                  <button className="mt-4 w-full rounded-xl bg-[#6f1cc4] px-3 py-2 text-xs font-medium text-white">
                    Edit with Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProjectWorkspace() {
  return (
    <div>
      <SectionTitle title="Project Workspace" desc="BOQ, BBS, renders, exports and review status ek jagah." />
      <div className="mb-5 rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status="AI Draft" />
              <StatusBadge status="Review Required" />
            </div>
            <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-[#21133f]">
              30x40 North Facing House — Raipur
            </h2>
            <p className="mt-2 text-sm text-[#817397]">
              Residential G+1 • Interior + Elevation MVP • BOQ/BBS staged for later phases
            </p>
          </div>
          <button className="rounded-xl bg-[#6f1cc4] px-4 py-2.5 text-sm font-medium text-white">
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
          <h2 className="font-medium text-[#21133f]">Project outputs</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Interior Render", "3 versions generated", "Live"],
              ["Front Elevation", "2 versions generated", "Live"],
              ["Floor Plan", "Concept queued", "Phase 2"],
              ["Client PDF", "Ready to export", "Live"],
            ].map(([title, desc, status]) => (
              <div key={title} className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-4">
                <h3 className="font-medium text-[#21133f]">{title}</h3>
                <p className="mt-1 text-sm text-[#817397]">{desc}</p>
                <div className="mt-4">
                  <StatusBadge status={status} />
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
    <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5 card-shadow">
      <h2 className="font-medium text-[#21133f]">Safety and review layer</h2>
      <div className="mt-4 space-y-3">
        {[
          "Final construction documents require professional review.",
          "Structural member size and reinforcement are not finalized by AI.",
          "BOQ quantities are draft until drawings/site are verified.",
          "BBS requires engineer-entered reinforcement data.",
        ].map((item) => (
          <div key={item} className="flex gap-3 rounded-xl border border-[#fed7aa] bg-white p-3 text-sm leading-6 text-[#9a3412]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {item}
          </div>
        ))}
      </div>
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
    <div>
      <SectionTitle title="BOQ / Estimate" desc="Rough estimate, BOQ draft, material summary and contractor package." />
      <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
        <div className="mb-5 flex items-center justify-between">
          <StatusBadge status="Phase 3" />
          <button className="rounded-xl bg-[#6f1cc4] px-4 py-2.5 text-sm font-medium text-white">
            Generate BOQ Draft
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#ded5ec]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fbf8ff] text-xs uppercase tracking-wide text-[#817397]">
              <tr>
                <th className="p-4">Code</th>
                <th>Description</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee7f7]">
              {rows.map((row) => (
                <tr key={row[0]}>
                  <td className="p-4 font-medium text-[#21133f]">{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td className="text-[#817397]">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BbsPage() {
  return (
    <div>
      <SectionTitle title="BBS" desc="Engineer input ke basis par BBS table, steel summary and cutting list." />
      <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
        <StatusBadge status="Phase 4" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["Engineer Input", "Column, beam, slab, footing reinforcement data."],
            ["Rule Calculation", "Cutting length, total length, unit weight, total steel."],
            ["Export", "Member-wise BBS, dia-wise steel summary, PDF/Excel."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-5">
              <h3 className="font-medium text-[#21133f]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#817397]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExportPage() {
  return (
    <div>
      <SectionTitle title="Exports" desc="Client PDF, contractor package and structural review package." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Client Concept PDF", "Brief, renders, material palette, rough budget.", FileText],
          ["Contractor Package", "Drawing index, BOQ, material summary, work sequence.", Wrench],
          ["Structural Review Package", "Plan, grid, column/beam/slab draft, checklist.", ShieldCheck],
        ].map(([title, desc, Icon]) => (
          <div key={title as string} className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
            <Icon className="h-7 w-7 text-[#6f1cc4]" />
            <h3 className="mt-4 font-medium text-[#21133f]">{title as string}</h3>
            <p className="mt-2 text-sm leading-6 text-[#817397]">{desc as string}</p>
            <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6f1cc4] px-4 py-3 text-sm font-medium text-white">
              Generate PDF <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPage() {
  return (
    <div>
      <SectionTitle title="Reviews" desc="Professional review workflow for BOQ, BBS, drawings and structural drafts." />
      <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 card-shadow">
        <div className="grid gap-4 md:grid-cols-4">
          {["AI Draft", "Under Review", "Changes Required", "Approved"].map((step, index) => (
            <div key={step} className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0dcff] text-sm font-medium text-[#6f1cc4]">
                {index + 1}
              </div>
              <div className="text-sm font-medium text-[#21133f]">{step}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SikhadengeBuildDashboard() {
  const [active, setActive] = useState<ViewKey>("dashboard");

  const content = () => {
    if (active === "dashboard") return <Dashboard setActive={setActive} />;
    if (active === "tools") return <AllToolsPage />;
    if (active === "projects") return <ProjectsPage setActive={setActive} />;
    if (active === "studio") return <NewProjectPage />;
    if (active === "renders") return <RenderStudio />;
    if (active === "boq") return <BoqPage />;
    if (active === "bbs") return <BbsPage />;
    if (active === "exports") return <ExportPage />;
    if (active === "reviews") return <ReviewPage />;
    return <Dashboard setActive={setActive} />;
  };

  return (
    <PageShell active={active} setActive={setActive}>
      {content()}
    </PageShell>
  );
}
