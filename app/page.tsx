"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Boxes,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  FolderKanban,
  Globe,
  Hammer,
  Headphones,
  Heart,
  Home,
  Image as ImageIcon,
  Layers3,
  LayoutDashboard,
  Menu,
  Moon,
  Palette,
  Plus,
  Ruler,
  Search,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Upload,
  UserCircle,
  Wand2,
  Wrench,
  Monitor,
  Sofa,
  Lightbulb,
  Compass,
  Boxes as BoxesIcon,
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
  | "agreements"
  | "reviews";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ToolCategory =
  | "All Tools"
  | "Interior"
  | "Exterior"
  | "Construction"
  | "Estimation"
  | "Structural"
  | "Presentation"
  | "Image Tools";

type ToolStatus = "NEW" | "LIVE" | "PHASE 2" | "PHASE 3" | "PHASE 4" | "REVIEW" | "PRO";

type Tool = {
  title: string;
  category: Exclude<ToolCategory, "All Tools">;
  desc: string;
  cost: string;
  status: ToolStatus;
  icon: React.ElementType;
  visual: string;
  visualLabel: string;
  featured?: boolean;
};

const navItems: Array<{ id: ViewKey; label: string; icon: React.ElementType }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tools", label: "All Tools", icon: Boxes },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "studio", label: "New Project", icon: Plus },
  { id: "renders", label: "Render Studio", icon: ImageIcon },
  { id: "boq", label: "BOQ / Estimate", icon: Calculator },
  { id: "bbs", label: "BBS", icon: ClipboardList },
  { id: "reviews", label: "Reviews", icon: ShieldCheck },
  { id: "exports", label: "Exports", icon: FileText },
  { id: "agreements", label: "Client Agreement", icon: ScrollText },
];

const bottomNav = [
  { label: "Support", icon: Headphones },
  { label: "Settings", icon: Settings },
];

const categories: Array<{ label: ToolCategory; icon: React.ElementType }> = [
  { label: "All Tools", icon: Boxes },
  { label: "Interior", icon: Home },
  { label: "Exterior", icon: Building2 },
  { label: "Construction", icon: Wrench },
  { label: "Estimation", icon: Calculator },
  { label: "Structural", icon: Layers3 },
  { label: "Presentation", icon: Monitor },
  { label: "Image Tools", icon: Wand2 },
];

const tools: Tool[] = [
  {
    title: "Magic Brief",
    category: "Presentation",
    desc: "Client requirement ko smart questions aur structured project brief me convert kare.",
    cost: "1 Credit / Brief",
    status: "NEW",
    icon: Sparkles,
    visualLabel: "AI Brief",
    visual: "from-[#16103b] via-[#4b168f] to-[#12091f]",
    featured: true,
  },
  {
    title: "Interior Render",
    category: "Interior",
    desc: "Room photo ya brief se premium interior design render generate kare.",
    cost: "1 Credit / Render",
    status: "LIVE",
    icon: ImageIcon,
    visualLabel: "Interior",
    visual: "from-[#2b1634] via-[#7c2d92] to-[#15101c]",
    featured: true,
  },
  {
    title: "Exterior Elevation",
    category: "Exterior",
    desc: "Modern front elevation, villa, duplex, shop aur facade design generate kare.",
    cost: "1 Credit / Elevation",
    status: "LIVE",
    icon: Building2,
    visualLabel: "Exterior",
    visual: "from-[#112d3d] via-[#28378f] to-[#110b22]",
    featured: true,
  },
  {
    title: "Render Enhancer",
    category: "Image Tools",
    desc: "Rough render ya 3D screenshot ko photorealistic high quality render me convert kare.",
    cost: "1 Credit / Enhance",
    status: "NEW",
    icon: Wand2,
    visualLabel: "Enhance",
    visual: "from-[#0f172a] via-[#384063] to-[#0b0715]",
    featured: true,
  },
  {
    title: "Site Photo Redesign",
    category: "Image Tools",
    desc: "Existing site ya room photo ko prompt ke according redesign kare instantly.",
    cost: "1 Credit / Redesign",
    status: "LIVE",
    icon: ImageIcon,
    visualLabel: "Redesign",
    visual: "from-[#30231f] via-[#685449] to-[#111827]",
    featured: true,
  },
  {
    title: "Sketch to Plan",
    category: "Construction",
    desc: "Rough sketch ya hand drawing se concept floor plan draft banaye with dimensions.",
    cost: "2 Credits / Plan",
    status: "PHASE 2",
    icon: Ruler,
    visualLabel: "Sketch",
    visual: "from-[#1d1d24] via-[#6b7280] to-[#09090b]",
  },
  {
    title: "Floor Plan AI",
    category: "Construction",
    desc: "Plot size, facing, rooms aur vastu ke basis par floor plan concept generate kare.",
    cost: "2 Credits / Plan",
    status: "PHASE 2",
    icon: Home,
    visualLabel: "Plan",
    visual: "from-[#111827] via-[#344d77] to-[#1c1230]",
  },
  {
    title: "Architect Chat",
    category: "Construction",
    desc: "Plan, elevation, vastu, materials, construction doubts ke liye AI architect chat.",
    cost: "1 Credit / Chat",
    status: "LIVE",
    icon: Sparkles,
    visualLabel: "Chat",
    visual: "from-[#12091f] via-[#391176] to-[#080712]",
  },
  {
    title: "Mood Board",
    category: "Interior",
    desc: "Material, color, furniture, lighting palette ke saath mood board create kare.",
    cost: "1 Credit / Board",
    status: "NEW",
    icon: Palette,
    visualLabel: "Mood",
    visual: "from-[#31243d] via-[#74505c] to-[#0f1020]",
  },
  {
    title: "Remove Furniture",
    category: "Interior",
    desc: "Room image se furniture remove karke empty room ya redesign ready space banaye.",
    cost: "1 Credit / Remove",
    status: "LIVE",
    icon: Sofa,
    visualLabel: "Empty",
    visual: "from-[#1f2937] via-[#4b5563] to-[#111827]",
  },
  {
    title: "Background Change",
    category: "Image Tools",
    desc: "Property ya render background ko professional tareeke se change kare.",
    cost: "1 Credit / Change",
    status: "LIVE",
    icon: Wand2,
    visualLabel: "BG",
    visual: "from-[#1f2937] via-[#44337a] to-[#0b1020]",
  },
  {
    title: "Photo Enhancer",
    category: "Image Tools",
    desc: "Image ko upscale, sharpen, relight aur high quality me enhance kare.",
    cost: "1 Credit / Enhance",
    status: "LIVE",
    icon: ImageIcon,
    visualLabel: "Photo",
    visual: "from-[#2a1c2c] via-[#334155] to-[#0b0715]",
  },
  {
    title: "Working Drawings",
    category: "Construction",
    desc: "Architectural, interior, electrical, plumbing aur structural working drawings checklist banaye.",
    cost: "3 Credits / Package",
    status: "PHASE 2",
    icon: Layers3,
    visualLabel: "Docs",
    visual: "from-[#07111f] via-[#172554] to-[#0b0715]",
  },
  {
    title: "BOQ Generator",
    category: "Estimation",
    desc: "Earthwork to finishing tak item-wise BOQ, material quantity draft generate kare.",
    cost: "2 Credits / BOQ",
    status: "PHASE 3",
    icon: Calculator,
    visualLabel: "BOQ",
    visual: "from-[#15221b] via-[#5b3c96] to-[#0b0715]",
  },
  {
    title: "BBS Generator",
    category: "Structural",
    desc: "Engineer input ke basis par bar bending schedule, steel summary aur cutting list banaye.",
    cost: "3 Credits / BBS",
    status: "PHASE 4",
    icon: ClipboardList,
    visualLabel: "BBS",
    visual: "from-[#221216] via-[#3f285f] to-[#0b0715]",
  },
  {
    title: "Column Beam Plan",
    category: "Structural",
    desc: "Column, beam, slab aur grid plan draft banaye. Final design engineer review ke baad.",
    cost: "3 Credits / Draft",
    status: "REVIEW",
    icon: Layers3,
    visualLabel: "Grid",
    visual: "from-[#07111f] via-[#2a286e] to-[#0b0715]",
  },
  {
    title: "Material Palette AI",
    category: "Interior",
    desc: "Tiles, laminate, marble, wall color, wood finish aur hardware palette suggest kare.",
    cost: "1 Credit / Palette",
    status: "NEW",
    icon: Palette,
    visualLabel: "Palette",
    visual: "from-[#2e1f2f] via-[#77594e] to-[#100b16]",
  },
  {
    title: "False Ceiling AI",
    category: "Interior",
    desc: "False ceiling design, cove light, profile light aur premium lighting mood suggest kare.",
    cost: "1 Credit / Ceiling",
    status: "NEW",
    icon: Lightbulb,
    visualLabel: "Ceiling",
    visual: "from-[#2a1c3b] via-[#625069] to-[#111827]",
  },
  {
    title: "Vastu Check",
    category: "Construction",
    desc: "Room placement, entry, kitchen, mandir aur bedroom ke vastu suggestions generate kare.",
    cost: "1 Credit / Check",
    status: "NEW",
    icon: Compass,
    visualLabel: "Vastu",
    visual: "from-[#152b35] via-[#3f2d7a] to-[#0b0715]",
  },
  {
    title: "Client PDF",
    category: "Presentation",
    desc: "Brief, renders, plan notes, material palette aur estimate ka client proposal PDF banaye.",
    cost: "1 Credit / PDF",
    status: "LIVE",
    icon: FileText,
    visualLabel: "PDF",
    visual: "from-[#27133e] via-[#6b21a8] to-[#13091f]",
  },
  {
    title: "Client Agreement",
    category: "Presentation",
    desc: "Scope, deliverables, payment milestones, revision policy aur sign-off clauses ka agreement draft banaye.",
    cost: "2 Credits / Agreement",
    status: "NEW",
    icon: ScrollText,
    visualLabel: "Legal",
    visual: "from-[#1a1230] via-[#6d28d9] to-[#0b0715]",
  },
  {
    title: "Contractor Package",
    category: "Construction",
    desc: "BOQ, material list, work sequence, site checklist aur notes ka contractor package banaye.",
    cost: "2 Credits / Package",
    status: "PHASE 3",
    icon: BoxesIcon,
    visualLabel: "Pack",
    visual: "from-[#2a1b12] via-[#774c2f] to-[#0b0715]",
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

function statusClass(status: string, theme: ResolvedTheme) {
  if (theme === "light") {
    const light: Record<string, string> = {
      NEW: "bg-[#2563eb] text-white",
      LIVE: "bg-[#16a34a] text-white",
      "PHASE 2": "bg-[#f97316] text-white",
      "PHASE 3": "bg-[#f97316] text-white",
      "PHASE 4": "bg-[#f97316] text-white",
      REVIEW: "bg-black text-white",
      PRO: "bg-black text-white",
      "AI Draft": "bg-[#eef4ff] text-[#2563eb]",
      "Review Required": "bg-[#fff7ed] text-[#f97316]",
      "Client Ready": "bg-[#ecfdf3] text-[#039855]",
    };
    return light[status] || "bg-[#f3e8ff] text-[#6f1cc4]";
  }

  const dark: Record<string, string> = {
    NEW: "border border-[#7c7cff] bg-[#1c22a6] text-white",
    LIVE: "border border-[#21c45d] bg-[#15803d] text-white",
    "PHASE 2": "border border-[#facc15] bg-[#101020] text-[#fde047]",
    "PHASE 3": "border border-[#facc15] bg-[#101020] text-[#fde047]",
    "PHASE 4": "border border-[#facc15] bg-[#101020] text-[#fde047]",
    REVIEW: "border border-[#22c55e] bg-[#052e16] text-white",
    PRO: "border border-white/20 bg-black text-white",
    "AI Draft": "border border-[#7c3aed]/40 bg-[#2d1757] text-[#d8b4fe]",
    "Review Required": "border border-[#facc15]/40 bg-[#3b2507] text-[#fde68a]",
    "Client Ready": "border border-[#22c55e]/40 bg-[#052e16] text-[#bbf7d0]",
  };
  return dark[status] || "border border-[#7c3aed]/40 bg-[#2d1757] text-[#d8b4fe]";
}

function StatusBadge({ status, theme }: { status: string; theme: ResolvedTheme }) {
  return (
    <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold leading-none", statusClass(status, theme))}>
      {status}
    </span>
  );
}

function useResolvedTheme(mode: ThemeMode) {
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    if (mode !== "system") {
      setResolved(mode);
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolved(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [mode]);

  return resolved;
}

function ThemeDropdown({
  themeMode,
  setThemeMode,
  theme,
}: {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: ResolvedTheme;
}) {
  const [open, setOpen] = useState(false);

  const itemClass =
    theme === "dark"
      ? "text-slate-200 hover:bg-white/[0.07]"
      : "text-[#4c4166] hover:bg-[#f7f0ff]";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border transition",
          theme === "dark"
            ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
            : "border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#fbf8ff]",
        )}
        aria-label="Theme options"
      >
        {themeMode === "light" ? <Sun className="h-4 w-4" /> : themeMode === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-13 z-50 w-48 rounded-xl border p-2 shadow-xl",
            theme === "dark"
              ? "border-white/10 bg-[#100b1e] shadow-black/30"
              : "border-[#ded5ec] bg-white shadow-purple-100",
          )}
        >
          {[
            { id: "light" as const, label: "Light Mode", icon: Sun },
            { id: "dark" as const, label: "Dark Mode", icon: Moon },
            { id: "system" as const, label: "System", icon: Monitor },
          ].map((item) => {
            const Icon = item.icon;
            const selected = themeMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setThemeMode(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  itemClass,
                  selected && (theme === "dark" ? "bg-[#2c1455] text-white" : "bg-[#f0dcff] text-[#6f1cc4]"),
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar({
  active,
  setActive,
  theme,
}: {
  active: ViewKey;
  setActive: (id: ViewKey) => void;
  theme: ResolvedTheme;
}) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 hidden h-screen w-[270px] overflow-y-auto border-r px-5 py-4 lg:flex lg:flex-col sb-scroll",
        theme === "dark"
          ? "border-white/10 bg-[#090713]/96 text-white"
          : "border-[#eee7f7] bg-white text-[#21133f]",
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#9333ea] to-[#4f46e5] text-white shadow-lg shadow-purple-900/25">
          <Hammer className="h-5 w-5" />
        </div>
        <div>
          <div className={cn("text-[21px] font-bold leading-[0.98] tracking-[-0.055em]", theme === "dark" ? "text-white" : "text-[#21133f]")}>
            Sikhadenge
          </div>
          <div className="text-[21px] font-bold leading-[0.98] tracking-[-0.055em] text-[#c4b5fd]">Build</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const withDivider = index === 5 || index === 9;

          return (
            <div key={item.id}>
              {withDivider && <div className={cn("my-2 h-px", theme === "dark" ? "bg-white/10" : "bg-[#eee7f7]")} />}
              <button
                onClick={() => setActive(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition",
                  selected
                    ? theme === "dark"
                      ? "bg-[#2b1755] text-white shadow-lg shadow-purple-950/20"
                      : "bg-[#f0dcff] text-[#6f1cc4]"
                    : theme === "dark"
                      ? "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      : "text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#6f1cc4]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className={cn("my-3 h-px", theme === "dark" ? "bg-white/10" : "bg-[#eee7f7]")} />

      <div className="space-y-2">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition",
                theme === "dark"
                  ? "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  : "text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#6f1cc4]",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div
          className={cn(
            "rounded-2xl border p-3",
            theme === "dark"
              ? "border-white/10 bg-[#070611]"
              : "border-[#ded5ec] bg-[#fbf8ff]",
          )}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#9333ea] text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-[#21133f]")}>Pro Plan</div>
              <div className={cn("text-xs", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>Renews on 20 Jun 2026</div>
            </div>
          </div>
          <button className="w-full rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#b337ff] px-4 py-3 text-sm font-semibold text-white">
            Upgrade Plan
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <button
            className={cn(
              "rounded-full p-3",
              theme === "dark" ? "bg-[#1a102d] text-[#c4b5fd]" : "bg-[#f0dcff] text-[#6f1cc4]",
            )}
          >
            ‹‹
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header({
  setActive,
  themeMode,
  setThemeMode,
  theme,
}: {
  setActive: (id: ViewKey) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: ResolvedTheme;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b px-4 py-5 backdrop-blur-xl lg:ml-[270px] lg:px-8",
        theme === "dark"
          ? "border-white/10 bg-[#070611]/92"
          : "border-[#eee7f7] bg-white/92",
      )}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <button className={cn("mb-4 rounded-xl border p-2 lg:hidden", theme === "dark" ? "border-white/10 text-white" : "border-[#ded5ec] text-[#5d5077]")}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className={cn("text-[30px] font-bold tracking-[-0.045em]", theme === "dark" ? "text-white" : "text-[#21133f]")}>
            Welcome back, Builder! 👋
          </h1>
          <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-400" : "text-[#6b5a84]")}>
            AI-Powered Design & Construction Workspace
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className={cn(
              "hidden items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium sm:flex",
              theme === "dark"
                ? "border-white/10 bg-white/[0.04] text-white"
                : "border-[#ded5ec] bg-[#fbf8ff] text-[#6f1cc4]",
            )}
          >
            <Sparkles className="h-4 w-4 text-[#a855f7]" />
            120 Credits
            <button className="ml-2 rounded-full bg-[#2b1755] p-1 text-white">
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <ThemeDropdown themeMode={themeMode} setThemeMode={setThemeMode} theme={theme} />

          <button
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border transition",
              theme === "dark"
                ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#fbf8ff]",
            )}
          >
            <Bell className="h-4 w-4" />
          </button>

          <div
            className={cn(
              "flex items-center gap-3 rounded-full border px-3 py-2",
              theme === "dark"
                ? "border-white/10 bg-white/[0.04]"
                : "border-[#ded5ec] bg-white",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#9333ea] text-sm font-bold text-white">
              SB
            </div>
            <div className="hidden md:block">
              <div className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Sikhadenge Build</div>
            </div>
            <ChevronDown className={cn("h-4 w-4", theme === "dark" ? "text-slate-500" : "text-[#817397]")} />
          </div>
        </div>
      </div>
    </header>
  );
}

function CategoryTabs({
  activeCategory,
  setActiveCategory,
  theme,
}: {
  activeCategory: ToolCategory;
  setActiveCategory: (category: ToolCategory) => void;
  theme: ResolvedTheme;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const Icon = category.icon;
        const selected = activeCategory === category.label;
        return (
          <button
            key={category.label}
            onClick={() => setActiveCategory(category.label)}
            className={cn(
              "flex min-w-fit items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition",
              selected
                ? theme === "dark"
                  ? "border-[#8b5cf6] bg-[#2b1755] text-white shadow-lg shadow-purple-950/20"
                  : "border-[#160b25] bg-[#160b25] text-white"
                : theme === "dark"
                  ? "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                  : "border-[#ded5ec] bg-white text-[#4c4166] hover:border-[#b88bea] hover:bg-[#fbf8ff]",
            )}
          >
            <Icon className="h-4 w-4" />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

function ToolCard({ tool, theme }: { tool: Tool; theme: ResolvedTheme }) {
  const Icon = tool.icon;

  if (theme === "light") {
    return (
      <article className="light-card-shadow overflow-hidden rounded-2xl border border-[#ded5ec] bg-white transition hover:-translate-y-1 hover:border-[#a855f7]">
        <div className={cn("relative h-[128px] bg-gradient-to-br", tool.visual)}>
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
          <div className="absolute left-3 top-3 rounded-md border border-black/20 bg-white/85 px-2 py-1 text-xs font-semibold text-[#160b25]">
            AI
          </div>
          <div className="absolute right-3 top-3">
            <StatusBadge status={tool.status} theme={theme} />
          </div>
          <div className="absolute bottom-4 left-4 right-3 flex items-end justify-between">
            <h3 className="max-w-[160px] text-[24px] font-semibold leading-[0.98] tracking-[-0.045em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
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
            <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#6f1cc4] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#55129a]">
              Launch Tool <ArrowRight className="h-4 w-4" />
            </button>
            <button className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-[#d8cee8] bg-[#f4f1f8] text-[#6b5a84] hover:border-[#a855f7] hover:text-[#7c1fd1]">
              <Upload className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#817397]">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            {tool.cost}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="ai-card-glow group overflow-hidden rounded-2xl border border-[#6d28d9]/45 bg-[#0d0a17] transition hover:-translate-y-1 hover:border-[#a855f7]">
      <div className={cn("relative h-[132px] bg-gradient-to-br", tool.visual)}>
        <div className="ai-grid-bg absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-[#080611]" />
        <div className="absolute left-3 top-3 rounded-md bg-[#5b21b6] px-2 py-1 text-xs font-semibold text-white shadow-lg shadow-purple-900/25">
          AI
        </div>
        <div className="absolute right-3 top-3">
          <StatusBadge status={tool.status} theme={theme} />
        </div>

        <div className="absolute right-4 top-8 opacity-30">
          <Icon className="h-16 w-16 text-white" />
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#c4b5fd]">
            {tool.visualLabel}
          </div>
          <h3 className="text-[20px] font-semibold leading-none tracking-[-0.04em] text-white">
            {tool.title}
          </h3>
        </div>
      </div>

      <div className="p-4">
        <p className="min-h-[62px] text-[13px] leading-5 text-slate-300">{tool.desc}</p>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-lg bg-[#2b1755] px-3 py-2 text-xs font-medium text-[#e9d5ff]">
            {tool.cost}
          </span>
          <button className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-[#a855f7]/35 bg-[#3b1b6d] text-white hover:bg-[#4c1d95]">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function PageShell({
  active,
  setActive,
  themeMode,
  setThemeMode,
  theme,
  children,
}: {
  active: ViewKey;
  setActive: (id: ViewKey) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: ResolvedTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        theme === "dark" ? "bg-[#070611] text-white" : "bg-white text-[#21133f]",
      )}
    >
      <Sidebar active={active} setActive={setActive} theme={theme} />
      <Header setActive={setActive} themeMode={themeMode} setThemeMode={setThemeMode} theme={theme} />
      <main className="lg:ml-[270px]">
        <div className="px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

function Dashboard({
  setActive,
  theme,
}: {
  setActive: (id: ViewKey) => void;
  theme: ResolvedTheme;
}) {
  const quickTools = tools.filter((tool) => tool.featured);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <CategoryTabs activeCategory="All Tools" setActiveCategory={() => setActive("tools")} theme={theme} />

        <div className="relative w-full xl:w-[330px]">
          <Search className={cn("absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2", theme === "dark" ? "text-slate-500" : "text-[#9b8caf]")} />
          <input
            className={cn(
              "h-12 w-full rounded-xl border pl-11 pr-4 text-sm outline-none",
              theme === "dark"
                ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
                : "border-[#ded5ec] bg-white text-[#21133f] placeholder:text-[#9b8caf]",
            )}
            placeholder="Search tools..."
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active Projects", "18", FolderKanban],
          ["Images Generated", "246", ImageIcon],
          ["Review Pending", "7", ShieldCheck],
          ["Credits Left", "120", Sparkles],
        ].map(([label, value, Icon]) => (
          <div
            key={label as string}
            className={cn(
              "rounded-2xl border p-3",
              theme === "dark"
                ? "border-white/10 bg-white/[0.035]"
                : "border-[#ded5ec] bg-white light-card-shadow",
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={cn("text-sm", theme === "dark" ? "text-slate-400" : "text-[#817397]")}>{label as string}</p>
                <p className={cn("mt-2 text-3xl font-semibold", theme === "dark" ? "text-white" : "text-[#21133f]")}>{value as string}</p>
              </div>
              <div className={cn("rounded-xl p-3", theme === "dark" ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-5">
        {quickTools.map((tool) => (
          <ToolCard key={tool.title} tool={tool} theme={theme} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ProjectsPreview setActive={setActive} theme={theme} />
        <AiHumanExpertise theme={theme} />
      </div>
    </div>
  );
}

function AiHumanExpertise({ theme }: { theme: ResolvedTheme }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6",
        theme === "dark"
          ? "border-[#7c3aed]/45 bg-[#0d0a17] ai-card-glow"
          : "border-[#ded5ec] bg-gradient-to-br from-[#fbf8ff] to-white light-card-shadow",
      )}
    >
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#7c3aed]/25 to-transparent" />
      <div className="relative">
        <h2 className={cn("text-2xl font-semibold tracking-[-0.04em]", theme === "dark" ? "text-white" : "text-[#21133f]")}>
          AI + Human Expertise
        </h2>
        <p className={cn("mt-1 text-sm", theme === "dark" ? "text-[#c4b5fd]" : "text-[#6f1cc4]")}>
          Perfect Design. Safe Construction.
        </p>

        <div className="mt-6 space-y-3">
          {["AI for Speed & Ideas", "Experts for Safety & Accuracy", "Review gate for BOQ, BBS and drawings"].map((item) => (
            <div key={item} className={cn("flex items-center gap-3 text-sm", theme === "dark" ? "text-slate-300" : "text-[#5d5077]")}>
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", theme === "dark" ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                <CheckCircle2 className="h-4 w-4" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsPreview({ setActive, theme }: { setActive: (id: ViewKey) => void; theme: ResolvedTheme }) {
  return (
    <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-[#21133f]")}>Recent Projects</h2>
          <p className={cn("text-sm", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>Saved client workspaces</p>
        </div>
        <button onClick={() => setActive("projects")} className={cn("rounded-xl px-3 py-2 text-sm font-medium", theme === "dark" ? "bg-[#2b1755] text-white" : "bg-[#f0dcff] text-[#6f1cc4]")}>
          View all
        </button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.title}
            className={cn("rounded-xl border p-3", theme === "dark" ? "border-white/10 bg-black/15" : "border-[#eee7f7] bg-[#fbf8ff]")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{project.title}</h3>
                <p className={cn("mt-1 text-xs", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>
                  {project.type} • {project.city}
                </p>
              </div>
              <StatusBadge status={project.status} theme={theme} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AllToolsPage({ theme }: { theme: ResolvedTheme }) {
  const [category, setCategory] = useState<ToolCategory>("All Tools");
  const filtered = useMemo(() => {
    if (category === "All Tools") return tools;
    return tools.filter((tool) => tool.category === category);
  }, [category]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <CategoryTabs activeCategory={category} setActiveCategory={setCategory} theme={theme} />
        <div className="relative w-full xl:w-[330px]">
          <Search className={cn("absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2", theme === "dark" ? "text-slate-500" : "text-[#9b8caf]")} />
          <input
            className={cn(
              "h-12 w-full rounded-xl border pl-11 pr-4 text-sm outline-none",
              theme === "dark"
                ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
                : "border-[#ded5ec] bg-white text-[#21133f] placeholder:text-[#9b8caf]",
            )}
            placeholder="Search tools..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {filtered.map((tool) => (
          <ToolCard key={tool.title} tool={tool} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function ProjectsPage({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Projects" desc="Client projects, draft packages, review status and exports." theme={theme} />
      <div className="grid gap-4 lg:grid-cols-3">
        {projects.map((project) => (
          <div key={project.title} className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{project.title}</h3>
                <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>
                  {project.type} • {project.city}
                </p>
              </div>
              <StatusBadge status={project.status} theme={theme} />
            </div>
            <div className={cn("mt-4 h-2 rounded-full", theme === "dark" ? "bg-white/10" : "bg-[#f0e9f8]")}>
              <div className="h-2 rounded-full bg-[#7c3aed]" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageTitle({ title, desc, theme }: { title: string; desc: string; theme: ResolvedTheme }) {
  return (
    <div className="mb-5">
      <h2 className={cn("text-[28px] font-semibold tracking-[-0.04em]", theme === "dark" ? "text-white" : "text-[#21133f]")}>{title}</h2>
      <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-400" : "text-[#6b5a84]")}>{desc}</p>
    </div>
  );
}

function NewProjectPage({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="New Project" desc="Client brief se structured design brief generate karo." theme={theme} />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {["Home / Residential", "Flat Interior", "Shop / Showroom", "Cafe / Restaurant", "Office", "Villa / Duplex"].map((type) => (
              <button
                key={type}
                className={cn("rounded-xl border px-4 py-3 text-left text-sm font-medium", theme === "dark" ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]" : "border-[#ded5ec] bg-[#fbf8ff] text-[#21133f] hover:border-[#a855f7]")}
              >
                {type}
              </button>
            ))}
          </div>

          <label className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Client brief</label>
          <textarea
            className={cn("mt-3 min-h-44 w-full rounded-2xl border p-4 text-sm leading-6 outline-none", theme === "dark" ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
            defaultValue="30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye. First floor me 2 bedroom aur balcony chahiye. Modern elevation chahiye. Budget 38 lakh."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white">
              Generate Smart Questions <Sparkles className="h-4 w-4" />
            </button>
            <button className={cn("inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium", theme === "dark" ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-[#fbf8ff] text-[#6f1cc4]")}>
              Upload Plan / Photo <Upload className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className={cn("rounded-2xl border", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className={cn("border-b p-5", theme === "dark" ? "border-white/10" : "border-[#eee7f7]")}>
            <h2 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>AI Briefing Chat</h2>
            <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>Smart questions + structured project brief.</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="ml-auto max-w-[85%] rounded-2xl bg-[#7c3aed] px-4 py-3 text-sm leading-6 text-white">
              30x40 north-facing plot hai. Ground floor me parking, living, kitchen, mandir aur 1 bedroom chahiye.
            </div>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6", theme === "dark" ? "bg-white/[0.06] text-slate-200" : "bg-[#f7f0ff] text-[#3f315d]")}>
              Samjha. Ye G+1 residential project hai. Mujhe 5 details chahiye: city, staircase type, vastu preference, parking type, aur pehle output me floor plan ya elevation chahiye?
            </div>
            <div className={cn("rounded-2xl border p-4", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#ded5ec] bg-[#fbf8ff]")}>
              <div className={cn("mb-3 flex items-center gap-2 text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>
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
                  <div key={key} className={cn("rounded-xl px-3 py-2", theme === "dark" ? "bg-white/[0.04]" : "bg-white")}>
                    <div className={cn("text-xs", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>{key}</div>
                    <div className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={cn("flex items-center gap-2 rounded-2xl border p-2", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#ded5ec] bg-white")}>
              <input className={cn("h-10 flex-1 bg-transparent px-3 text-sm outline-none", theme === "dark" ? "text-white placeholder:text-slate-600" : "text-[#21133f]")} placeholder="Ask AI to revise project brief..." />
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed] text-white">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RenderStudio({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Render Studio" desc="Interior and elevation image generation with revision by chat." theme={theme} />
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <StatusBadge status="LIVE" theme={theme} />
          <div className="mt-4 space-y-3">
            <select className={cn("h-12 w-full rounded-xl border px-4 text-sm outline-none", theme === "dark" ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
              <option>Living Room Interior</option>
              <option>Front Elevation</option>
              <option>Bedroom Interior</option>
              <option>Kitchen Interior</option>
            </select>
            <select className={cn("h-12 w-full rounded-xl border px-4 text-sm outline-none", theme === "dark" ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
              <option>Modern Indian Premium</option>
              <option>Budget Modern</option>
              <option>Luxury White + Wood</option>
              <option>Minimal Warm</option>
            </select>
            <textarea
              className={cn("min-h-28 w-full rounded-2xl border p-4 text-sm leading-6 outline-none", theme === "dark" ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
              defaultValue="Use walnut wood, beige walls, warm cove lighting, Indian family-friendly storage, clean premium look."
            />
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white">
              Generate Image <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <h2 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Generated versions</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {["Modern Warm", "Premium Wood", "Budget Clean"].map((title, index) => (
              <div key={title} className={cn("overflow-hidden rounded-2xl border", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#ded5ec] bg-white")}>
                <div className={cn("flex aspect-[4/3] items-center justify-center", index === 0 ? "bg-[#7c3aed]/20" : index === 1 ? "bg-[#4f46e5]/20" : "bg-[#16a34a]/20")}>
                  <Home className={cn("h-12 w-12", theme === "dark" ? "text-white/70" : "text-[#6b5a84]")} />
                </div>
                <div className="p-4">
                  <h3 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{title}</h3>
                  <p className={cn("mt-1 text-xs leading-5", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>AI draft for client discussion.</p>
                  <button className="mt-4 w-full rounded-xl bg-[#7c3aed] px-3 py-2 text-xs font-medium text-white">
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

function ProjectWorkspace({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Project Workspace" desc="BOQ, BBS, renders, exports and review status ek jagah." theme={theme} />
      <div className={cn("mb-5 rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status="AI Draft" theme={theme} />
              <StatusBadge status="Review Required" theme={theme} />
            </div>
            <h2 className={cn("text-[26px] font-semibold tracking-[-0.04em]", theme === "dark" ? "text-white" : "text-[#21133f]")}>
              30x40 North Facing House — Raipur
            </h2>
            <p className={cn("mt-2 text-sm", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>
              Residential G+1 • Interior + Elevation MVP • BOQ/BBS staged for later phases
            </p>
          </div>
          <button className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white">
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <h2 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Project outputs</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Interior Render", "3 versions generated", "LIVE"],
              ["Front Elevation", "2 versions generated", "LIVE"],
              ["Floor Plan", "Concept queued", "PHASE 2"],
              ["Client PDF", "Ready to export", "LIVE"],
            ].map(([title, desc, status]) => (
              <div key={title} className={cn("rounded-2xl border p-4", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}>
                <h3 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{title}</h3>
                <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>{desc}</p>
                <div className="mt-4">
                  <StatusBadge status={status} theme={theme} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <SafetyPanel theme={theme} />
      </div>
    </div>
  );
}

function SafetyPanel({ theme }: { theme: ResolvedTheme }) {
  return (
    <div className={cn("rounded-2xl border p-5", theme === "dark" ? "border-[#facc15]/20 bg-[#3b2507]/30" : "border-[#fed7aa] bg-[#fff7ed] light-card-shadow")}>
      <h2 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Safety and review layer</h2>
      <div className="mt-4 space-y-3">
        {[
          "Final construction documents require professional review.",
          "Structural member size and reinforcement are not finalized by AI.",
          "BOQ quantities are draft until drawings/site are verified.",
          "BBS requires engineer-entered reinforcement data.",
        ].map((item) => (
          <div key={item} className={cn("flex gap-3 rounded-xl border p-3 text-sm leading-6", theme === "dark" ? "border-[#facc15]/20 bg-black/20 text-[#fde68a]" : "border-[#fed7aa] bg-white text-[#9a3412]")}>
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoqPage({ theme }: { theme: ResolvedTheme }) {
  const rows = [
    ["1.01", "Excavation for foundation", "Cum", "TBD", "Site verify"],
    ["2.01", "PCC below footing", "Cum", "TBD", "Engineer verify"],
    ["3.01", "RCC in footing", "Cum", "TBD", "Engineer verify"],
    ["4.01", "Reinforcement steel", "Kg", "From BBS", "Review required"],
    ["5.01", "Brick/block masonry", "Sqm/Cum", "Auto", "Draft"],
  ];

  return (
    <div>
      <PageTitle title="BOQ / Estimate" desc="Rough estimate, BOQ draft, material summary and contractor package." theme={theme} />
      <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="mb-5 flex items-center justify-between">
          <StatusBadge status="PHASE 3" theme={theme} />
          <button className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white">
            Generate BOQ Draft
          </button>
        </div>

        <div className={cn("overflow-hidden rounded-2xl border", theme === "dark" ? "border-white/10" : "border-[#ded5ec]")}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={cn("text-xs uppercase tracking-wide", theme === "dark" ? "bg-white/[0.04] text-slate-400" : "bg-[#fbf8ff] text-[#817397]")}>
              <tr>
                <th className="p-4">Code</th>
                <th>Description</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", theme === "dark" ? "divide-white/10" : "divide-[#eee7f7]")}>
              {rows.map((row) => (
                <tr key={row[0]}>
                  <td className={cn("p-4 font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{row[0]}</td>
                  <td className={theme === "dark" ? "text-slate-300" : ""}>{row[1]}</td>
                  <td className={theme === "dark" ? "text-slate-400" : ""}>{row[2]}</td>
                  <td className={theme === "dark" ? "text-slate-400" : ""}>{row[3]}</td>
                  <td className={theme === "dark" ? "text-slate-400" : "text-[#817397]"}>{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BbsPage({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="BBS" desc="Engineer input ke basis par BBS table, steel summary and cutting list." theme={theme} />
      <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <StatusBadge status="PHASE 4" theme={theme} />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["Engineer Input", "Column, beam, slab, footing reinforcement data."],
            ["Rule Calculation", "Cutting length, total length, unit weight, total steel."],
            ["Export", "Member-wise BBS, dia-wise steel summary, PDF/Excel."],
          ].map(([title, desc]) => (
            <div key={title} className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}>
              <h3 className={cn("font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{title}</h3>
              <p className={cn("mt-2 text-sm leading-6", theme === "dark" ? "text-slate-400" : "text-[#817397]")}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExportPage({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Exports" desc="Client PDF, contractor package and structural review package." theme={theme} />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Client Concept PDF", "Brief, renders, material palette, rough budget.", FileText],
          ["Contractor Package", "Drawing index, BOQ, material summary, work sequence.", Wrench],
          ["Structural Review Package", "Plan, grid, column/beam/slab draft, checklist.", ShieldCheck],
        ].map(([title, desc, Icon]) => (
          <div key={title as string} className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
            <Icon className="h-7 w-7 text-[#8b5cf6]" />
            <h3 className={cn("mt-4 font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{title as string}</h3>
            <p className={cn("mt-2 text-sm leading-6", theme === "dark" ? "text-slate-400" : "text-[#817397]")}>{desc as string}</p>
            <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-3 text-sm font-medium text-white">
              Generate PDF <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPage({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Reviews" desc="Professional review workflow for BOQ, BBS, drawings and structural drafts." theme={theme} />
      <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="grid gap-4 md:grid-cols-4">
          {["AI Draft", "Under Review", "Changes Required", "Approved"].map((step, index) => (
            <div key={step} className={cn("rounded-2xl border p-5 text-center", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}>
              <div className={cn("mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium", theme === "dark" ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                {index + 1}
              </div>
              <div className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{step}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


function AgreementPage({ theme }: { theme: ResolvedTheme }) {
  const agreementSections = [
    ["Project Scope", "Interior, elevation, floor plan, BOQ, BBS ya selected deliverables clearly define karo."],
    ["Deliverables", "Renders, PDFs, drawings, estimates, review packages and export files list karo."],
    ["Payment Milestones", "Advance, design approval, revision stage, final handover and review charges."],
    ["Revision Policy", "Free revisions, paid revisions, timeline and approval rules define karo."],
    ["BOQ/BBS Disclaimer", "BOQ/BBS and structural output professional review ke bina final nahi hoga."],
    ["Client Sign-off", "Client approval, project freeze, change request and handover acknowledgement."],
  ];

  return (
    <div>
      <PageTitle
        title="Client Agreement"
        desc="AI-assisted agreement draft for design scope, payment terms, revisions, deliverables and client sign-off."
        theme={theme}
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <StatusBadge status="NEW" theme={theme} />

          <div className="mt-5 space-y-4">
            <div>
              <label className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Project type</label>
              <select className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", theme === "dark" ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
                <option>Residential Interior Design</option>
                <option>Architecture + Elevation</option>
                <option>BOQ / Contractor Estimate</option>
                <option>Full Design + Construction Package</option>
              </select>
            </div>

            <div>
              <label className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>Client / project brief</label>
              <textarea
                className={cn("mt-2 min-h-36 w-full rounded-2xl border p-4 text-sm leading-6 outline-none", theme === "dark" ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
                defaultValue="Client ko 30x40 G+1 house ke liye front elevation, interior renders, floor plan concept, BOQ draft aur client PDF chahiye. Payment milestone aur revision policy agreement me add karna hai."
              />
            </div>

            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white">
              Generate Agreement Draft <ScrollText className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className={cn("rounded-2xl border p-5", theme === "dark" ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-[#21133f]")}>Agreement sections</h3>
              <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-500" : "text-[#817397]")}>
                Draft agreement me ye sections auto-generate honge.
              </p>
            </div>
            <button className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white">
              Export PDF
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {agreementSections.map(([title, desc]) => (
              <div
                key={title}
                className={cn("rounded-xl border p-4", theme === "dark" ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", theme === "dark" ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className={cn("text-sm font-medium", theme === "dark" ? "text-white" : "text-[#21133f]")}>{title}</h4>
                    <p className={cn("mt-1 text-sm leading-6", theme === "dark" ? "text-slate-400" : "text-[#817397]")}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={cn("mt-5 rounded-xl border p-4 text-sm leading-6", theme === "dark" ? "border-[#facc15]/20 bg-[#3b2507]/30 text-[#fde68a]" : "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]")}>
            AI-generated agreement draft planning ke liye hai. Final legal agreement ko lawyer/professional se review karwana recommended hai.
          </div>
        </section>
      </div>
    </div>
  );
}


export default function SikhadengeBuildDashboard() {
  const [active, setActive] = useState<ViewKey>("dashboard");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const theme = useResolvedTheme(themeMode);

  const content = () => {
    if (active === "dashboard") return <Dashboard setActive={setActive} theme={theme} />;
    if (active === "tools") return <AllToolsPage theme={theme} />;
    if (active === "projects") return <ProjectsPage theme={theme} />;
    if (active === "studio") return <NewProjectPage theme={theme} />;
    if (active === "renders") return <RenderStudio theme={theme} />;
    if (active === "boq") return <BoqPage theme={theme} />;
    if (active === "bbs") return <BbsPage theme={theme} />;
    if (active === "exports") return <ExportPage theme={theme} />;
    if (active === "agreements") return <AgreementPage theme={theme} />;
    if (active === "reviews") return <ReviewPage theme={theme} />;
    return <Dashboard setActive={setActive} theme={theme} />;
  };

  return (
    <PageShell
      active={active}
      setActive={setActive}
      themeMode={themeMode}
      setThemeMode={setThemeMode}
      theme={theme}
    >
      {content()}
    </PageShell>
  );
}
