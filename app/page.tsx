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
  Code2,
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
  Armchair,
  BadgeIndianRupee,
  Bath,
  BedDouble,
  HelpCircle,
  RefreshCcw,
  LayoutGrid,
} from "lucide-react";

type BuildSetuThemeMode = "light" | "dark" | "system";

function getResolvedBuildSetuTheme(mode: BuildSetuThemeMode) {
  if (mode === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return mode;
}

function applyBuildSetuTheme(mode: BuildSetuThemeMode) {
  if (typeof document === "undefined") return;

  const resolved = getResolvedBuildSetuTheme(mode);
  const root = document.documentElement;

  root.dataset.buildsetuThemeMode = mode;
  root.dataset.buildsetuTheme = resolved;

  root.classList.toggle("dark", resolved === "dark");

  localStorage.setItem("buildsetu-theme-mode", mode);
}

function syncBuildSetuThemeMenu(mode: BuildSetuThemeMode) {
  if (typeof document === "undefined") return;

  const labels: Record<BuildSetuThemeMode, string> = {
    light: "Light Mode",
    dark: "Dark Mode",
    system: "System",
  };

  const activeText = labels[mode];

  document.querySelectorAll("button, [role='button'], div").forEach((el) => {
    const text = (el.textContent || "").trim();

    if (!["Light Mode", "Dark Mode", "System"].includes(text)) return;

    el.classList.remove("bg-[#ead2ff]", "bg-purple-100", "text-[#7c3aed]");
    el.classList.add("text-[#4e4168]");

    if (text === activeText) {
      el.classList.add("bg-[#ead2ff]", "text-[#7c3aed]");
      el.classList.remove("text-[#4e4168]");
    }
  });
}

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
  | "reviews"
  | "api";

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
  imageUrl: string;
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
  { id: "api", label: "API", icon: Code2 },
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
    imageUrl: "/tool-images/magic-brief.png",
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
    imageUrl: "/tool-images/interior-render.png",
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
    imageUrl: "/tool-images/exterior-elevation.png",
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
    imageUrl: "/tool-images/render-enhancer.png",
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
    imageUrl: "/tool-images/site-photo-redesign.png",
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
    imageUrl: "/tool-images/sketch-to-plan.png",
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
    imageUrl: "/tool-images/floor-plan-ai.png",
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
    imageUrl: "/tool-images/architect-chat.png",
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
    imageUrl: "/tool-images/mood-board.png",
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
    imageUrl: "/tool-images/remove-furniture.png",
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
    imageUrl: "/tool-images/background-change.png",
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
    imageUrl: "/tool-images/photo-enhancer.png",
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
    imageUrl: "/tool-images/working-drawings.png",
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
    imageUrl: "/tool-images/boq-generator.png",
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
    imageUrl: "/tool-images/bbs-generator.png",
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
    imageUrl: "/tool-images/column-beam-plan.png",
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
    imageUrl: "/tool-images/material-palette-ai.png",
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
    imageUrl: "/tool-images/false-ceiling-ai.png",
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
    imageUrl: "/tool-images/vastu-check.png",
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
    imageUrl: "/tool-images/client-pdf.png",
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
    imageUrl: "/tool-images/client-agreement.png",
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
    imageUrl: "/tool-images/contractor-package.png",
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
  if (true) {
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
    false
      ? "text-slate-200 hover:bg-white/[0.07]"
      : "text-[#4c4166] hover:bg-[#f7f0ff]";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border transition",
          false
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
            false
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
                  selected && (false ? "bg-[#2c1455] text-white" : "bg-[#f0dcff] text-[#6f1cc4]"),
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
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
        false
          ? "border-white/10 bg-[#090713]/96 text-white"
          : "border-[#eee7f7] bg-white text-[#21133f]",
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#9333ea] to-[#4f46e5] text-white shadow-lg shadow-purple-900/25">
          <Hammer className="h-5 w-5" />
        </div>
        <div>
          <div className={cn("text-[21px] font-bold leading-[0.98] tracking-[-0.055em]", false ? "text-white" : "text-[#21133f]")}>
            BuildSetu
          </div>
          <div className="text-[21px] font-bold leading-[0.98] tracking-[-0.055em] text-[#c4b5fd]">AI</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const withDivider = index === 5 || index === 9;

          return (
            <div key={item.id}>
              {withDivider && <div className={cn("my-2 h-px", false ? "bg-white/10" : "bg-[#eee7f7]")} />}
              <button
                onClick={() => item.id === "exports" ? (window.location.href = "/reports") : setActive(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition",
                  selected
                    ? false
                      ? "bg-[#2b1755] text-white shadow-lg shadow-purple-950/20"
                      : "bg-[#f0dcff] text-[#6f1cc4]"
                    : false
                      ? "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      : "text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#6f1cc4]",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className={cn("my-3 h-px", false ? "bg-white/10" : "bg-[#eee7f7]")} />

      <div className="space-y-2">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition",
                false
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
            false
              ? "border-white/10 bg-[#070611]"
              : "border-[#ded5ec] bg-[#fbf8ff]",
          )}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#9333ea] text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className={cn("text-sm font-semibold", false ? "text-white" : "text-[#21133f]")}>Pro Plan</div>
              <div className={cn("text-xs", false ? "text-slate-500" : "text-[#817397]")}>Renews on 20 Jun 2026</div>
            </div>
          </div>
          <button onClick={() => { window.location.href = "/pricing"; }} className="w-full rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#b337ff] px-4 py-3 text-sm font-semibold text-white">
            Upgrade Plan
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <button
            className={cn(
              "rounded-full p-3",
              false ? "bg-[#1a102d] text-[#c4b5fd]" : "bg-[#f0dcff] text-[#6f1cc4]",
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
        false
          ? "border-white/10 bg-[#070611]/92"
          : "border-[#eee7f7] bg-white/92",
      )}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <button className={cn("mb-4 rounded-xl border p-2 lg:hidden", false ? "border-white/10 text-white" : "border-[#ded5ec] text-[#5d5077]")}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className={cn("text-[30px] font-bold tracking-[-0.045em]", false ? "text-white" : "text-[#21133f]")}>
            Welcome to BuildSetu AI 👋
          </h1>
          <p className={cn("mt-1 text-sm", false ? "text-slate-400" : "text-[#6b5a84]")}>
            AI workspace for plans, interiors, BOQ, BBS and client documents
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <a
  href="/credits"
  className="group inline-flex h-12 items-center gap-3 rounded-full border border-[#e7ddf5] bg-white px-4 pr-3 text-[#241443] shadow-sm transition hover:-translate-y-0.5 hover:border-[#cfb6ff] hover:shadow-[0_10px_24px_rgba(124,58,237,0.14)]"
>
  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f6edff] via-[#ead8ff] to-[#d8b4fe] shadow-inner ring-1 ring-white/80">
    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.65)]" />
    <Sparkles className="h-4 w-4 text-[#7c3aed]" />
  </span>
  <span className="text-[15px] font-bold tracking-[-0.02em] text-[#3b2468]">120 Credits</span>
  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2d1455] text-[20px] font-semibold leading-none text-white shadow-sm transition group-hover:bg-[#4b1f8b]">
    +
  </span>
</a>

          <ThemeDropdown themeMode={themeMode} setThemeMode={setThemeMode} theme={theme} />

          <button
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border transition",
              false
                ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#fbf8ff]",
            )}
          >
            <Bell className="h-4 w-4" />
          </button>

          <div
            className={cn(
              "flex items-center gap-3 rounded-full border px-3 py-2",
              false
                ? "border-white/10 bg-white/[0.04]"
                : "border-[#ded5ec] bg-white",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#9333ea] text-sm font-bold text-white">
              SB
            </div>
            <div className="hidden md:block">
              <div className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>BuildSetu AI</div>
            </div>
            <ChevronDown className={cn("h-4 w-4", false ? "text-slate-500" : "text-[#817397]")} />
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
    <div className="flex w-full flex-nowrap items-center gap-2 overflow-hidden pb-0">
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
                ? false
                  ? "border-[#8b5cf6] bg-[#2b1755] text-white shadow-lg shadow-purple-950/20"
                  : "border-[#160b25] bg-[#160b25] text-white"
                : false
                  ? "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                  : "border-[#ded5ec] bg-white text-[#4c4166] hover:border-[#b88bea] hover:bg-[#fbf8ff]",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}


function toolSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ToolCard({ tool, theme }: { tool: Tool; theme: ResolvedTheme }) {
  const Icon = tool.icon;

  if (true) {
    return (
      <article className="light-card-shadow overflow-hidden rounded-2xl border border-[#ded5ec] bg-white transition hover:-translate-y-1 hover:border-[#a855f7]">
        <div className="relative h-[128px] overflow-hidden bg-[#0d0a17]">
          <img src={tool.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
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
              <Icon className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="min-h-[68px] text-[13px] font-normal leading-5 text-[#3f315d]">
            {tool.desc}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                window.location.href = `/tools/${toolSlug(tool.title)}`;
              }}
              className="inline-flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-[#6f1cc4] px-3 py-2 text-xs font-semibold leading-none text-white hover:bg-[#55129a]"
            >
              <span className="whitespace-nowrap">Launch Tool</span> <ArrowRight className="h-3.5 w-3.5 shrink-0" />
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
      <div className="relative h-[132px] overflow-hidden bg-[#0d0a17]">
        <img src={tool.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="ai-grid-bg absolute inset-0 opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-[#080611]" />
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
        false ? "bg-[#070611] text-white" : "bg-white text-[#21133f]",
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
      <div className="mb-5 flex items-center">
        <CategoryTabs activeCategory="All Tools" setActiveCategory={() => setActive("tools")} theme={theme} />
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
              false
                ? "border-white/10 bg-white/[0.035]"
                : "border-[#ded5ec] bg-white light-card-shadow",
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={cn("text-sm", false ? "text-slate-400" : "text-[#817397]")}>{label as string}</p>
                <p className={cn("mt-2 text-3xl font-semibold", false ? "text-white" : "text-[#21133f]")}>{value as string}</p>
              </div>
              <div className={cn("rounded-xl p-3", false ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
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
        false
          ? "border-[#7c3aed]/45 bg-[#0d0a17] ai-card-glow"
          : "border-[#ded5ec] bg-gradient-to-br from-[#fbf8ff] to-white light-card-shadow",
      )}
    >
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#7c3aed]/25 to-transparent" />
      <div className="relative">
        <h2 className={cn("text-2xl font-semibold tracking-[-0.04em]", false ? "text-white" : "text-[#21133f]")}>
          AI + Human Expertise
        </h2>
        <p className={cn("mt-1 text-sm", false ? "text-[#c4b5fd]" : "text-[#6f1cc4]")}>
          Perfect Design. Safe Construction.
        </p>

        <div className="mt-6 space-y-3">
          {["AI for Speed & Ideas", "Experts for Safety & Accuracy", "Review gate for BOQ, BBS and drawings"].map((item) => (
            <div key={item} className={cn("flex items-center gap-3 text-sm", false ? "text-slate-300" : "text-[#5d5077]")}>
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", false ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
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
    <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className={cn("text-lg font-semibold", false ? "text-white" : "text-[#21133f]")}>Recent Projects</h2>
          <p className={cn("text-sm", false ? "text-slate-500" : "text-[#817397]")}>Saved client workspaces</p>
        </div>
        <button onClick={() => setActive("projects")} className={cn("rounded-xl px-3 py-2 text-sm font-medium", false ? "bg-[#2b1755] text-white" : "bg-[#f0dcff] text-[#6f1cc4]")}>
          View all
        </button>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.title}
            className={cn("rounded-xl border p-3", false ? "border-white/10 bg-black/15" : "border-[#eee7f7] bg-[#fbf8ff]")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>{project.title}</h3>
                <p className={cn("mt-1 text-xs", false ? "text-slate-500" : "text-[#817397]")}>
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
      <div className="mb-5 flex items-center">
        <CategoryTabs activeCategory={category} setActiveCategory={setCategory} theme={theme} />
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
  const [liveProjects, setLiveProjects] = useState<LiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProjects() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/projects/list", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load projects");
      }

      setLiveProjects(data.projects || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageTitle title="Projects" desc="Database se saved client projects, brief, review status and exports." theme={theme} />
        <button
          onClick={loadProjects}
          className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white"
        >
          Refresh Projects
        </button>
      </div>

      {loading && (
        <div className={cn("rounded-2xl border p-5 text-sm", false ? "border-white/10 bg-white/[0.035] text-slate-300" : "border-[#ded5ec] bg-white text-[#5d5077] light-card-shadow")}>
          Loading projects...
        </div>
      )}

      {error && (
        <div className={cn("rounded-2xl border p-5 text-sm", false ? "border-[#ef4444]/30 bg-[#450a0a]/40 text-[#fecaca]" : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]")}>
          {error}
        </div>
      )}

      {!loading && !error && liveProjects.length === 0 && (
        <div className={cn("rounded-2xl border p-5 text-sm", false ? "border-white/10 bg-white/[0.035] text-slate-300" : "border-[#ded5ec] bg-white text-[#5d5077] light-card-shadow")}>
          No projects found. New Project section se first project create karo.
        </div>
      )}

      {!loading && !error && liveProjects.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {liveProjects.map((project) => {
            let structured: Record<string, unknown> | null = null;

            try {
              structured = project.brief?.structuredJson
                ? JSON.parse(project.brief.structuredJson)
                : null;
            } catch {
              structured = null;
            }

            return (
              <div key={project.id} className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>{project.title}</h3>
                    <p className={cn("mt-1 text-sm", false ? "text-slate-500" : "text-[#817397]")}>
                      {(project.projectType || "Project")} {project.location ? `• ${project.location}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={project.status.replaceAll("_", " ")} theme={theme} />
                </div>

                <div className={cn("mt-4 grid grid-cols-2 gap-2 rounded-xl p-3", false ? "bg-black/20" : "bg-[#fbf8ff]")}>
                  {[
                    ["Plot", project.plotSize || String(structured?.plotSize || "—")],
                    ["Facing", project.facing || String(structured?.facing || "—")],
                    ["Floors", project.floors || String(structured?.floors || "—")],
                    ["Budget", project.budget || String(structured?.budget || "—")],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className={cn("text-xs", false ? "text-slate-500" : "text-[#817397]")}>{label}</div>
                      <div className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["Tool Runs", project._count?.toolRuns || 0],
                    ["Renders", project._count?.renders || 0],
                    ["BOQ", project._count?.boqItems || 0],
                    ["BBS", project._count?.bbsItems || 0],
                    ["Agreements", project._count?.agreements || 0],
                  ].map(([label, count]) => (
                    <span key={label} className={cn("rounded-full border px-2.5 py-1 text-xs", false ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
                      {label}: {count}
                    </span>
                  ))}
                </div>

                {project.brief?.rawBrief && (
                  <p className={cn("mt-4 line-clamp-3 text-sm leading-6", false ? "text-slate-400" : "text-[#5d5077]")}>
                    {project.brief.rawBrief}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function PageTitle({ title, desc, theme }: { title: string; desc: string; theme: ResolvedTheme }) {
  return (
    <div className="mb-5">
      <h2 className={cn("text-[28px] font-semibold tracking-[-0.04em]", false ? "text-white" : "text-[#21133f]")}>{title}</h2>
      <p className={cn("mt-1 text-sm", false ? "text-slate-400" : "text-[#6b5a84]")}>{desc}</p>
    </div>
  );
}




type LiveProject = {
  id: string;
  title: string;
  projectType: string | null;
  location: string | null;
  plotSize: string | null;
  facing: string | null;
  floors: string | null;
  budget: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  brief?: {
    rawBrief: string;
    structuredJson: string | null;
    questionsJson: string | null;
  } | null;
  _count?: {
    renders: number;
    boqItems: number;
    bbsItems: number;
    agreements: number;
    toolRuns: number;
  };
};

type LiveRender = {
  id: string;
  projectId: string;
  renderType: string;
  roomType: string | null;
  prompt: string;
  imageUrl: string | null;
  version: number;
  status: string;
  createdAt: string;
  project?: {
    id: string;
    title: string;
    projectType: string | null;
    location: string | null;
  };
};

type LiveBoqItem = {
  id: string;
  projectId: string;
  itemCode: string | null;
  description: string;
  unit: string | null;
  quantity: number | null;
  rate: number | null;
  amount: number | null;
  drawingRef: string | null;
  status: string;
  createdAt: string;
};

type LiveBbsItem = {
  id: string;
  projectId: string;
  memberType: string;
  memberId: string | null;
  barMark: string | null;
  diameter: number | null;
  quantity: number | null;
  shapeCode: string | null;
  cuttingLength: number | null;
  totalLength: number | null;
  unitWeight: number | null;
  totalWeight: number | null;
  drawingRef: string | null;
  status: string;
  createdAt: string;
};

function NewProjectPage({ theme }: { theme: ResolvedTheme }) {
  const [activeTool, setActiveTool] = useState("Floor Plan");
  const [projectType, setProjectType] = useState("Residential House");
  const [houseType, setHouseType] = useState("Independent House");
  const [title, setTitle] = useState("30x40 North Facing House");
  const [location, setLocation] = useState("Raipur");
  const [plotWidth, setPlotWidth] = useState("30");
  const [plotDepth, setPlotDepth] = useState("40");
  const [facing, setFacing] = useState("North");
  const [floors, setFloors] = useState("G+1");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [budget, setBudget] = useState("30 - 40 Lakh");
  const [style, setStyle] = useState("Modern");
  const [spaces, setSpaces] = useState(["Living Room", "Kitchen", "Parking", "Puja Room", "Staircase", "Wash Area"]);
  const [brief, setBrief] = useState(
    "Create a modern residential house design for a 30x40 ft north facing plot. Ground floor plan with parking, living room, kitchen, puja room, staircase, 1 bathroom and good natural light. First floor with bedrooms and balcony. Modern elevation style with BOQ and client PDF.",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    projectId?: string;
    structuredBrief?: Record<string, unknown>;
    questions?: string[];
  } | null>(null);

  const toolOptions = [
    { name: "Floor Plan", icon: LayoutGrid, desc: "Create smart floor plan ideas" },
    { name: "Interior Design", icon: Sofa, desc: "Design beautiful interior concepts" },
    { name: "Exterior Elevation", icon: Building2, desc: "Generate modern elevations" },
    { name: "Estimate / BOQ", icon: Calculator, desc: "Material takeoff & cost estimate" },
    { name: "Client Proposal", icon: FileText, desc: "Professional proposal documents" },
    { name: "Furniture Layout", icon: Armchair, desc: "Plan furniture and space" },
  ];

  const styleOptions = ["Modern", "Minimal", "Contemporary", "Traditional", "Luxury", "More Styles"];
  const spaceOptions = ["Living Room", "Kitchen", "Dining Room", "Parking", "Puja Room", "Staircase", "Store Room", "Wash Area", "Balcony"];

  function toggleSpace(space: string) {
    setSpaces((current) =>
      current.includes(space)
        ? current.filter((item) => item !== space)
        : [...current, space],
    );
  }

  function buildPromptFromSelectors() {
    const plotSize = `${plotWidth}x${plotDepth} ft`;
    const prompt = `Create a ${style.toLowerCase()} ${projectType.toLowerCase()} design for a ${plotSize} ${facing.toLowerCase()} facing plot in ${location}. House type: ${houseType}. Floors: ${floors}. Bedrooms: ${bedrooms}. Bathrooms: ${bathrooms}. Key spaces: ${spaces.join(", ")}. Budget approx ₹${budget}. Required output: ${activeTool}, BOQ and client-ready design brief.`;
    setBrief(prompt);
    return prompt;
  }

  async function handleCreateProject() {
    try {
      setLoading(true);
      setMessage("");
      setResult(null);

      const finalBrief = buildPromptFromSelectors();

      const createRes = await fetch("/api/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          projectType,
          location,
          plotSize: `${plotWidth}x${plotDepth} ft`,
          facing,
          floors,
          budget,
          rawBrief: finalBrief,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.ok) {
        throw new Error(createData.error || "Project create failed");
      }

      const projectId = createData.project.id as string;

      const briefRes = await fetch("/api/ai/magic-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          rawBrief: finalBrief,
        }),
      });

      const briefData = await briefRes.json();

      if (!briefRes.ok || !briefData.ok) {
        throw new Error(briefData.error || "Magic Brief failed");
      }

      setResult({
        projectId,
        structuredBrief: briefData.structuredBrief,
        questions: briefData.questions,
      });

      setMessage("Project saved and Magic Brief generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setActiveTool("Floor Plan");
    setProjectType("Residential House");
    setHouseType("Independent House");
    setTitle("30x40 North Facing House");
    setLocation("Raipur");
    setPlotWidth("30");
    setPlotDepth("40");
    setFacing("North");
    setFloors("G+1");
    setBedrooms("2");
    setBathrooms("1");
    setBudget("30 - 40 Lakh");
    setStyle("Modern");
    setSpaces(["Living Room", "Kitchen", "Parking", "Puja Room", "Staircase", "Wash Area"]);
    setResult(null);
    setMessage("");
    setBrief("Create a modern residential house design for a 30x40 ft north facing plot. Ground floor plan with parking, living room, kitchen, puja room, staircase, 1 bathroom and good natural light. First floor with bedrooms and balcony. Modern elevation style with BOQ and client PDF.");
  }

  const summaryRows = [
    ["Project Type", projectType, Home],
    ["House Type", houseType, Home],
    ["Plot Size", `${plotWidth} ft x ${plotDepth} ft`, Ruler],
    ["Facing", facing, Compass],
    ["Floors", floors, Layers3],
    ["Bedrooms", bedrooms, BedDouble],
    ["Bathrooms", bathrooms, Bath],
    ["Key Spaces", spaces.slice(0, 4).join(", "), LayoutGrid],
    ["Style", style, Sparkles],
    ["Budget Approx.", `₹ ${budget}`, BadgeIndianRupee],
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-[#7c3aed]" />
            <h1 className={cn("text-3xl font-semibold tracking-tight", false ? "text-white" : "text-[#140b2d]")}>
              Create Architecture Designs with AI
            </h1>
          </div>
          <p className={cn("mt-3 max-w-3xl text-sm leading-6", false ? "text-slate-400" : "text-[#6f6187]")}>
            Select details or write a prompt — generate floor plan ideas, interior concepts, exterior elevation and client-ready design briefs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn("rounded-xl border px-4 py-2 text-sm font-medium", false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-white text-[#21133f] light-card-shadow")}>
            ✦ 120 AI Credits
          </div>
          <button className={cn("rounded-xl border p-2.5", false ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-[#ded5ec] bg-white text-[#6f1cc4]")}>
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {toolOptions.map(({ name, icon: Icon, desc }) => (
          <button
            key={name}
            onClick={() => setActiveTool(name)}
            className={cn(
              "rounded-2xl border p-5 text-center transition",
              activeTool === name
                ? false
                  ? "border-[#8b5cf6] bg-[#2b1755] text-white"
                  : "border-[#8b5cf6] bg-[#f4edff] text-[#21133f] shadow-[0_18px_50px_rgba(124,58,237,0.12)]"
                : false
                  ? "border-white/10 bg-white/[0.035] text-slate-300 hover:border-[#7c3aed]"
                  : "border-[#ded5ec] bg-white text-[#3f315d] hover:border-[#a855f7]",
            )}
          >
            <Icon className={cn("mx-auto h-9 w-9", activeTool === name ? "text-[#7c3aed]" : false ? "text-slate-400" : "text-[#7c3aed]")} />
            <div className="mt-4 text-sm font-semibold">{name}</div>
            <div className={cn("mt-2 text-xs leading-5", false ? "text-slate-500" : "text-[#817397]")}>{desc}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className={cn("text-xl font-semibold", false ? "text-white" : "text-[#140b2d]")}>Tell us what you want to create</h2>
              <p className={cn("mt-2 text-sm", false ? "text-slate-400" : "text-[#6f6187]")}>
                Write your requirement in your own words or use the quick selectors below.
              </p>
            </div>
            <button
              onClick={buildPromptFromSelectors}
              className={cn("rounded-xl border px-3 py-2 text-sm font-medium", false ? "border-white/10 bg-white/[0.04] text-slate-200" : "border-[#ded5ec] bg-white text-[#6f1cc4]")}
            >
              Examples
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Project Type</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
                <option>Residential House</option>
                <option>Flat Interior</option>
                <option>Shop / Showroom</option>
                <option>Office</option>
                <option>Villa / Duplex</option>
              </select>
            </div>

            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>House Type</label>
              <select value={houseType} onChange={(e) => setHouseType(e.target.value)} className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
                <option>Independent House</option>
                <option>Duplex</option>
                <option>Villa</option>
                <option>Apartment</option>
              </select>
            </div>

            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")} />
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Plot Size (ft)</label>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input value={plotWidth} onChange={(e) => setPlotWidth(e.target.value)} className={cn("h-12 rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")} />
                <span className={false ? "text-slate-500" : "text-[#817397]"}>×</span>
                <input value={plotDepth} onChange={(e) => setPlotDepth(e.target.value)} className={cn("h-12 rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")} />
              </div>
              <div className={cn("mt-1 grid grid-cols-2 text-center text-xs", false ? "text-slate-500" : "text-[#817397]")}>
                <span>Width</span>
                <span>Depth</span>
              </div>
            </div>

            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Floors</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {["G", "G+1", "G+2", "G+3"].map((item) => (
                  <button key={item} onClick={() => setFloors(item)} className={cn("h-11 rounded-xl border px-2 text-xs font-medium sm:text-sm", floors === item ? "border-[#7c3aed] bg-[#7c3aed] text-white" : false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-white text-[#3f315d]")}>{item}</button>
                ))}
              </div>
            </div>

            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Facing</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {["North", "South", "East", "West"].map((item) => (
                  <button key={item} onClick={() => setFacing(item)} className={cn("flex h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-medium sm:text-sm", facing === item ? "border-[#7c3aed] bg-[#f4edff] text-[#6f1cc4]" : false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-white text-[#3f315d]")}>
                    <Compass className="h-4 w-4" /> {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Bedrooms</label>
              <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
                <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
              </select>
            </div>
            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Bathrooms / Toilets</label>
              <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
                <option>1</option><option>2</option><option>3</option><option>4</option>
              </select>
            </div>
            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Budget Approx.</label>
              <select value={budget} onChange={(e) => setBudget(e.target.value)} className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}>
                <option>15 - 25 Lakh</option>
                <option>30 - 40 Lakh</option>
                <option>40 - 60 Lakh</option>
                <option>60 Lakh - 1 Cr</option>
                <option>1 Cr+</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Rooms & Spaces</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {spaceOptions.map((space) => {
                const selected = spaces.includes(space);
                return (
                  <button key={space} onClick={() => toggleSpace(space)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm", selected ? "border-[#7c3aed] bg-[#f4edff] text-[#6f1cc4]" : false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-white text-[#3f315d]")}>
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded border text-[10px]", selected ? "border-[#7c3aed] bg-[#7c3aed] text-white" : false ? "border-white/20" : "border-[#c7bad8]")}>{selected ? "✓" : ""}</span>
                    {space}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Style / Look</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {styleOptions.map((item) => (
                <button key={item} onClick={() => setStyle(item)} className={cn("overflow-hidden rounded-xl border p-2 text-xs font-medium sm:text-sm", style === item ? "border-[#7c3aed] bg-[#f4edff] text-[#6f1cc4]" : false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-white text-[#3f315d]")}>
                  <div className="mb-2 h-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(/tool-images/exterior-elevation.png)` }} />
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Prompt</label>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              className={cn("mt-2 min-h-28 w-full rounded-2xl border p-4 text-sm leading-6 outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
            />
          </div>

          {message && (
            <div className={cn("mt-4 rounded-xl border p-3 text-sm", message.includes("success")
              ? false
                ? "border-[#22c55e]/30 bg-[#052e16]/40 text-[#bbf7d0]"
                : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
              : false
                ? "border-[#ef4444]/30 bg-[#450a0a]/40 text-[#fecaca]"
                : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
            )}>
              {message}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Design Brief"} <Sparkles className="h-4 w-4" />
            </button>
            <button onClick={clearAll} className={cn("inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium", false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-white text-[#3f315d]")}>
              <RefreshCcw className="h-4 w-4" /> Clear All
            </button>
          </div>
        </section>

        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#7c3aed]" />
                <h2 className={cn("text-xl font-semibold", false ? "text-white" : "text-[#140b2d]")}>Your Design Brief</h2>
              </div>
              <p className={cn("mt-2 text-sm", false ? "text-slate-400" : "text-[#6f6187]")}>
                Review the AI generated brief. You can edit or add more details.
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", false ? "bg-[#2b1755] text-[#e9d5ff]" : "bg-[#f4edff] text-[#7c3aed]")}>AI Generated</span>
          </div>

          <div className={cn("rounded-2xl p-5 font-mono text-sm leading-7", false ? "bg-black/25 text-slate-200" : "bg-[#f4edff] text-[#21133f]")}>
            {brief}
          </div>

          <h3 className={cn("mt-5 text-sm font-semibold", false ? "text-white" : "text-[#21133f]")}>Brief Summary</h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {summaryRows.map(([label, value, Icon]) => (
              <div key={String(label)} className={cn("flex items-center gap-3 rounded-xl border p-3", false ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-white")}>
                {typeof Icon !== "string" && <Icon className="h-5 w-5 text-[#7c3aed]" />}
                <div>
                  <div className={cn("text-xs", false ? "text-slate-500" : "text-[#817397]")}>{String(label)}</div>
                  <div className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>{String(value || "—")}</div>
                </div>
              </div>
            ))}
          </div>

          {result?.structuredBrief && (
            <div className={cn("mt-5 rounded-2xl border p-4", false ? "border-white/10 bg-black/20" : "border-[#ded5ec] bg-[#fbf8ff]")}>
              <div className={cn("mb-3 flex items-center gap-2 text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>
                <CheckCircle2 className="h-4 w-4 text-[#12b76a]" />
                Structured Brief Saved
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(result.structuredBrief)
                  .filter(([key]) => !["safetyNotes", "detectedRooms", "priorityOutputs"].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className={cn("rounded-xl px-3 py-2", false ? "bg-white/[0.04]" : "bg-white")}>
                      <div className={cn("text-xs capitalize", false ? "text-slate-500" : "text-[#817397]")}>{key}</div>
                      <div className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>
                        {String(value || "Not detected")}
                      </div>
                    </div>
                  ))}
              </div>

              {result.questions && (
                <div className="mt-4">
                  <h4 className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Smart Questions</h4>
                  <div className="mt-2 space-y-2">
                    {result.questions.map((question, index) => (
                      <div key={question} className={cn("rounded-xl px-3 py-2 text-sm", false ? "bg-white/[0.04] text-slate-300" : "bg-white text-[#3f315d]")}>
                        {index + 1}. {question}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCreateProject}
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_40px_rgba(109,40,217,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Design Preview"} <ArrowRight className="h-4 w-4" />
          </button>

          <p className={cn("mt-3 text-center text-xs", false ? "text-slate-500" : "text-[#817397]")}>
            You can review and refine the results later.
          </p>

          {result?.projectId && (
            <div className={cn("mt-4 rounded-xl border p-3 text-xs", false ? "border-white/10 bg-white/[0.04] text-slate-500" : "border-[#eee7f7] bg-white text-[#817397]")}>
              Project ID: {result.projectId}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


function RenderStudio({ theme }: { theme: ResolvedTheme }) {
  const [projectsList, setProjectsList] = useState<LiveProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [renderType, setRenderType] = useState("Interior Render");
  const [roomType, setRoomType] = useState("Living Room");
  const [style, setStyle] = useState("Modern Indian Premium");
  const [prompt, setPrompt] = useState(
    "Premium modern Indian living room with walnut wood, beige walls, warm cove lighting, family friendly storage and luxury clean layout.",
  );
  const [renders, setRenders] = useState<LiveRender[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadProjectsAndRenders() {
    try {
      setHistoryLoading(true);
      setMessage("");

      const projectsResponse = await fetch("/api/projects/list", {
        cache: "no-store",
      });
      const projectsData = await projectsResponse.json();

      if (!projectsResponse.ok || !projectsData.ok) {
        throw new Error(projectsData.error || "Failed to load projects");
      }

      const loadedProjects = projectsData.projects || [];
      setProjectsList(loadedProjects);

      const selectedProjectId = projectId || loadedProjects[0]?.id || "";
      if (selectedProjectId && !projectId) {
        setProjectId(selectedProjectId);
      }

      const rendersUrl = selectedProjectId
        ? `/api/renders/list?projectId=${selectedProjectId}`
        : "/api/renders/list";

      const rendersResponse = await fetch(rendersUrl, {
        cache: "no-store",
      });
      const rendersData = await rendersResponse.json();

      if (!rendersResponse.ok || !rendersData.ok) {
        throw new Error(rendersData.error || "Failed to load renders");
      }

      setRenders(rendersData.renders || []);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load render studio data");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadRendersForProject(nextProjectId: string) {
    try {
      setHistoryLoading(true);
      setMessage("");

      const response = await fetch(`/api/renders/list?projectId=${nextProjectId}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load renders");
      }

      setRenders(data.renders || []);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load renders");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleCreateRender() {
    try {
      setLoading(true);
      setMessage("");

      if (!projectId) {
        throw new Error("Project select karo. Pehle New Project section se project create karo.");
      }

      const finalPrompt = `${prompt}\n\nStyle: ${style}`;

      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          renderType,
          roomType,
          prompt: finalPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save render");
      }

      setMessage(data.fallback ? "Demo preview saved. Real AI generation will work after billing is active." : "AI image generated and saved successfully.");
      await loadRendersForProject(projectId);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjectsAndRenders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageTitle title="Render Studio" desc="Interior and elevation render prompts save karo aur project-wise render history dekho." theme={theme} />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <StatusBadge status="LIVE" theme={theme} />

          <div className="mt-4 space-y-3">
            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Project</label>
              <select
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  loadRendersForProject(event.target.value);
                }}
                className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
              >
                {!projectsList.length && <option value="">No project found</option>}
                {projectsList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} {project.location ? `- ${project.location}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Render type</label>
                <select
                  value={renderType}
                  onChange={(event) => setRenderType(event.target.value)}
                  className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
                >
                  <option>Interior Render</option>
                  <option>Exterior Elevation</option>
                  <option>Site Photo Redesign</option>
                  <option>Render Enhancer</option>
                </select>
              </div>

              <div>
                <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Room / area</label>
                <select
                  value={roomType}
                  onChange={(event) => setRoomType(event.target.value)}
                  className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
                >
                  <option>Living Room</option>
                  <option>Bedroom</option>
                  <option>Kitchen</option>
                  <option>Front Elevation</option>
                  <option>Bathroom</option>
                  <option>Office</option>
                </select>
              </div>
            </div>

            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Style</label>
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                className={cn("mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
              >
                <option>Modern Indian Premium</option>
                <option>Budget Modern</option>
                <option>Luxury White + Wood</option>
                <option>Minimal Warm</option>
                <option>Neo Classical</option>
                <option>Contemporary Glass Facade</option>
              </select>
            </div>

            <div>
              <label className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>Prompt</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className={cn("mt-2 min-h-32 w-full rounded-2xl border p-4 text-sm leading-6 outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
              />
            </div>

            {message && (
              <div className={cn("rounded-xl border p-3 text-sm", message.includes("success")
                ? false
                  ? "border-[#22c55e]/30 bg-[#052e16]/40 text-[#bbf7d0]"
                  : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
                : false
                  ? "border-[#ef4444]/30 bg-[#450a0a]/40 text-[#fecaca]"
                  : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
              )}>
                {message}
              </div>
            )}

            <button
              onClick={handleCreateRender}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating Preview..." : "Generate Preview Image"} <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>Render history</h2>
              <p className={cn("mt-1 text-sm", false ? "text-slate-500" : "text-[#817397]")}>
                Saved render prompts and preview images.
              </p>
            </div>
            <button
              onClick={() => projectId ? loadRendersForProject(projectId) : loadProjectsAndRenders()}
              className={cn("rounded-xl border px-3 py-2 text-sm font-medium", false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-[#fbf8ff] text-[#6f1cc4]")}
            >
              Refresh
            </button>
          </div>

          {historyLoading && (
            <div className={cn("rounded-xl border p-4 text-sm", false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
              Loading render history...
            </div>
          )}

          {!historyLoading && renders.length === 0 && (
            <div className={cn("rounded-xl border p-4 text-sm", false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
              No renders saved yet. Left form se first render prompt save karo.
            </div>
          )}

          {!historyLoading && renders.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {renders.map((render) => (
                <div key={render.id} className={cn("overflow-hidden rounded-2xl border", false ? "border-white/10 bg-black/20" : "border-[#ded5ec] bg-white")}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#0d0a17]">
                    {render.imageUrl ? (
                      <img src={render.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className={cn("h-12 w-12", false ? "text-white/40" : "text-[#6b5a84]")} />
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <StatusBadge status={render.status} theme={theme} />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>{render.renderType}</h3>
                    <p className={cn("mt-1 text-xs", false ? "text-slate-500" : "text-[#817397]")}>
                      {render.roomType || "General"} • Version {render.version}
                    </p>
                    <p className={cn("mt-3 line-clamp-4 text-xs leading-5", false ? "text-slate-400" : "text-[#5d5077]")}>
                      {render.prompt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


function ProjectWorkspace({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Project Workspace" desc="BOQ, BBS, renders, exports and review status ek jagah." theme={theme} />
      <div className={cn("mb-5 rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status="AI Draft" theme={theme} />
              <StatusBadge status="Review Required" theme={theme} />
            </div>
            <h2 className={cn("text-[26px] font-semibold tracking-[-0.04em]", false ? "text-white" : "text-[#21133f]")}>
              30x40 North Facing House — Raipur
            </h2>
            <p className={cn("mt-2 text-sm", false ? "text-slate-500" : "text-[#817397]")}>
              Residential G+1 • Interior + Elevation MVP • BOQ/BBS staged for later phases
            </p>
          </div>
          <button className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white">
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <h2 className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>Project outputs</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Interior Render", "3 versions generated", "LIVE"],
              ["Front Elevation", "2 versions generated", "LIVE"],
              ["Floor Plan", "Concept queued", "PHASE 2"],
              ["Client PDF", "Ready to export", "LIVE"],
            ].map(([title, desc, status]) => (
              <div key={title} className={cn("rounded-2xl border p-4", false ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}>
                <h3 className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>{title}</h3>
                <p className={cn("mt-1 text-sm", false ? "text-slate-500" : "text-[#817397]")}>{desc}</p>
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
    <div className={cn("rounded-2xl border p-5", false ? "border-[#facc15]/20 bg-[#3b2507]/30" : "border-[#fed7aa] bg-[#fff7ed] light-card-shadow")}>
      <h2 className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>Safety and review layer</h2>
      <div className="mt-4 space-y-3">
        {[
          "Final construction documents require professional review.",
          "Structural member size and reinforcement are not finalized by AI.",
          "BOQ quantities are draft until drawings/site are verified.",
          "BBS requires engineer-entered reinforcement data.",
        ].map((item) => (
          <div key={item} className={cn("flex gap-3 rounded-xl border p-3 text-sm leading-6", false ? "border-[#facc15]/20 bg-black/20 text-[#fde68a]" : "border-[#fed7aa] bg-white text-[#9a3412]")}>
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}



function BoqPage({ theme }: { theme: ResolvedTheme }) {
  const [projectsList, setProjectsList] = useState<LiveProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<LiveBoqItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProjectsAndBoq() {
    try {
      setLoading(true);
      setMessage("");

      const projectsResponse = await fetch("/api/projects/list", { cache: "no-store" });
      const projectsData = await projectsResponse.json();

      if (!projectsResponse.ok || !projectsData.ok) {
        throw new Error(projectsData.error || "Failed to load projects");
      }

      const loadedProjects = projectsData.projects || [];
      setProjectsList(loadedProjects);

      const selectedProjectId = projectId || loadedProjects[0]?.id || "";
      if (selectedProjectId && !projectId) {
        setProjectId(selectedProjectId);
      }

      if (selectedProjectId) {
        await loadBoq(selectedProjectId);
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load BOQ data");
    } finally {
      setLoading(false);
    }
  }

  async function loadBoq(nextProjectId: string) {
    const response = await fetch(`/api/boq/list?projectId=${nextProjectId}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load BOQ");
    }

    setItems(data.items || []);
    setTotalAmount(Number(data.totalAmount || 0));
  }

  async function handleProjectChange(nextProjectId: string) {
    try {
      setProjectId(nextProjectId);
      setLoading(true);
      setMessage("");
      await loadBoq(nextProjectId);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load BOQ");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBoq() {
    try {
      setGenerating(true);
      setMessage("");

      if (!projectId) {
        throw new Error("Project select karo. Pehle New Project section se project create karo.");
      }

      const response = await fetch("/api/boq/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate BOQ");
      }

      setItems(data.items || []);
      setTotalAmount(Number(data.totalAmount || 0));
      setMessage(`BOQ generated successfully. ${data.count} items created.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to generate BOQ");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    loadProjectsAndBoq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageTitle title="BOQ / Estimate" desc="Project-wise draft BOQ, material quantity, amount summary and review status." theme={theme} />

      <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className={cn("h-12 rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
            >
              {!projectsList.length && <option value="">No project found</option>}
              {projectsList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} {project.location ? `- ${project.location}` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateBoq}
              disabled={generating || !projectId}
              className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate BOQ Draft"}
            </button>
          </div>

          <div className={cn("rounded-xl border px-4 py-3 text-sm", false ? "border-white/10 bg-black/20 text-slate-200" : "border-[#ded5ec] bg-[#fbf8ff] text-[#21133f]")}>
            Total: ₹{totalAmount.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <StatusBadge status="PHASE 3" theme={theme} />
          <span className={cn("text-sm", false ? "text-slate-400" : "text-[#817397]")}>
            {items.length} BOQ items
          </span>
        </div>

        {message && (
          <div className={cn("mb-5 rounded-xl border p-3 text-sm", message.includes("success")
            ? false
              ? "border-[#22c55e]/30 bg-[#052e16]/40 text-[#bbf7d0]"
              : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
            : false
              ? "border-[#ef4444]/30 bg-[#450a0a]/40 text-[#fecaca]"
              : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
          )}>
            {message}
          </div>
        )}

        {loading && (
          <div className={cn("rounded-xl border p-4 text-sm", false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
            Loading BOQ...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className={cn("rounded-xl border p-4 text-sm", false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
            No BOQ items found. Generate BOQ Draft button click karo.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className={cn("overflow-hidden rounded-2xl border", false ? "border-white/10" : "border-[#ded5ec]")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className={cn("text-xs uppercase tracking-wide", false ? "bg-white/[0.04] text-slate-400" : "bg-[#fbf8ff] text-[#817397]")}>
                  <tr>
                    <th className="p-4">Code</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", false ? "divide-white/10" : "divide-[#eee7f7]")}>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className={cn("p-4 font-medium", false ? "text-white" : "text-[#21133f]")}>{item.itemCode || "—"}</td>
                      <td className={false ? "text-slate-300" : "text-[#3f315d]"}>{item.description}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.unit || "—"}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.quantity ?? "—"}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>₹{Number(item.rate || 0).toLocaleString("en-IN")}</td>
                      <td className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>₹{Number(item.amount || 0).toLocaleString("en-IN")}</td>
                      <td>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs", false ? "bg-[#3b2507] text-[#fde68a]" : "bg-[#fff7ed] text-[#f97316]")}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={cn("mt-5 rounded-xl border p-4 text-sm leading-6", false ? "border-[#facc15]/20 bg-[#3b2507]/30 text-[#fde68a]" : "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]")}>
          BOQ draft planning ke liye hai. Final quantity, rates and scope drawings/site verification ke baad lock karein.
        </div>
      </section>
    </div>
  );
}




function BbsPage({ theme }: { theme: ResolvedTheme }) {
  const [projectsList, setProjectsList] = useState<LiveProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<LiveBbsItem[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProjectsAndBbs() {
    try {
      setLoading(true);
      setMessage("");

      const projectsResponse = await fetch("/api/projects/list", { cache: "no-store" });
      const projectsData = await projectsResponse.json();

      if (!projectsResponse.ok || !projectsData.ok) {
        throw new Error(projectsData.error || "Failed to load projects");
      }

      const loadedProjects = projectsData.projects || [];
      setProjectsList(loadedProjects);

      const selectedProjectId = projectId || loadedProjects[0]?.id || "";
      if (selectedProjectId && !projectId) {
        setProjectId(selectedProjectId);
      }

      if (selectedProjectId) {
        await loadBbs(selectedProjectId);
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load BBS data");
    } finally {
      setLoading(false);
    }
  }

  async function loadBbs(nextProjectId: string) {
    const response = await fetch(`/api/bbs/list?projectId=${nextProjectId}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load BBS");
    }

    setItems(data.items || []);
    setTotalWeight(Number(data.totalWeight || 0));
  }

  async function handleProjectChange(nextProjectId: string) {
    try {
      setProjectId(nextProjectId);
      setLoading(true);
      setMessage("");
      await loadBbs(nextProjectId);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load BBS");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateBbs() {
    try {
      setGenerating(true);
      setMessage("");

      if (!projectId) {
        throw new Error("Project select karo. Pehle New Project section se project create karo.");
      }

      const response = await fetch("/api/bbs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate BBS");
      }

      setItems(data.items || []);
      setTotalWeight(Number(data.totalWeight || 0));
      setMessage(`BBS draft generated successfully. ${data.count} items created.`);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to generate BBS");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    loadProjectsAndBbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageTitle title="BBS" desc="Project-wise draft Bar Bending Schedule, steel summary and engineer review status." theme={theme} />

      <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className={cn("h-12 rounded-xl border px-4 text-sm outline-none", false ? "border-white/10 bg-black/20 text-white" : "border-[#ded5ec] bg-white text-[#21133f]")}
            >
              {!projectsList.length && <option value="">No project found</option>}
              {projectsList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} {project.location ? `- ${project.location}` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateBbs}
              disabled={generating || !projectId}
              className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate BBS Draft"}
            </button>
          </div>

          <div className={cn("rounded-xl border px-4 py-3 text-sm", false ? "border-white/10 bg-black/20 text-slate-200" : "border-[#ded5ec] bg-[#fbf8ff] text-[#21133f]")}>
            Steel: {totalWeight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <StatusBadge status="PHASE 4" theme={theme} />
          <StatusBadge status="REVIEW" theme={theme} />
          <span className={cn("text-sm", false ? "text-slate-400" : "text-[#817397]")}>
            {items.length} BBS items
          </span>
        </div>

        {message && (
          <div className={cn("mb-5 rounded-xl border p-3 text-sm", message.includes("success")
            ? false
              ? "border-[#22c55e]/30 bg-[#052e16]/40 text-[#bbf7d0]"
              : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
            : false
              ? "border-[#ef4444]/30 bg-[#450a0a]/40 text-[#fecaca]"
              : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
          )}>
            {message}
          </div>
        )}

        {loading && (
          <div className={cn("rounded-xl border p-4 text-sm", false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
            Loading BBS...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className={cn("rounded-xl border p-4 text-sm", false ? "border-white/10 bg-black/20 text-slate-300" : "border-[#ded5ec] bg-[#fbf8ff] text-[#5d5077]")}>
            No BBS items found. Generate BBS Draft button click karo.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className={cn("overflow-hidden rounded-2xl border", false ? "border-white/10" : "border-[#ded5ec]")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className={cn("text-xs uppercase tracking-wide", false ? "bg-white/[0.04] text-slate-400" : "bg-[#fbf8ff] text-[#817397]")}>
                  <tr>
                    <th className="p-4">Member</th>
                    <th>Bar Mark</th>
                    <th>Dia</th>
                    <th>Qty</th>
                    <th>Shape</th>
                    <th>Cut Len</th>
                    <th>Total Len</th>
                    <th>Total Wt</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", false ? "divide-white/10" : "divide-[#eee7f7]")}>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className={cn("p-4 font-medium", false ? "text-white" : "text-[#21133f]")}>
                        {item.memberType} {item.memberId ? `- ${item.memberId}` : ""}
                      </td>
                      <td className={false ? "text-slate-300" : "text-[#3f315d]"}>{item.barMark || "—"}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.diameter ? `${item.diameter}mm` : "—"}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.quantity ?? "—"}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.shapeCode || "—"}</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.cuttingLength ?? "—"} m</td>
                      <td className={false ? "text-slate-400" : "text-[#5d5077]"}>{item.totalLength ?? "—"} m</td>
                      <td className={cn("font-medium", false ? "text-white" : "text-[#21133f]")}>
                        {Number(item.totalWeight || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg
                      </td>
                      <td>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs", false ? "bg-[#3b2507] text-[#fde68a]" : "bg-[#fff7ed] text-[#f97316]")}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className={cn("mt-5 rounded-xl border p-4 text-sm leading-6", false ? "border-[#facc15]/20 bg-[#3b2507]/30 text-[#fde68a]" : "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]")}>
          BBS draft planning ke liye hai. Final reinforcement details structural engineer ke approved drawings ke according verify karein.
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
          <div key={title as string} className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
            <Icon className="h-7 w-7 text-[#8b5cf6]" />
            <h3 className={cn("mt-4 font-medium", false ? "text-white" : "text-[#21133f]")}>{title as string}</h3>
            <p className={cn("mt-2 text-sm leading-6", false ? "text-slate-400" : "text-[#817397]")}>{desc as string}</p>
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
      <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="grid gap-4 md:grid-cols-4">
          {["AI Draft", "Under Review", "Changes Required", "Approved"].map((step, index) => (
            <div key={step} className={cn("rounded-2xl border p-5 text-center", false ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}>
              <div className={cn("mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium", false ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                {index + 1}
              </div>
              <div className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>{step}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}






type LiveAgreement = {
  id: string;
  projectId: string;
  title: string;
  scope: string | null;
  deliverables: string | null;
  paymentTerms: string | null;
  revisionTerms: string | null;
  disclaimer: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    title: string;
    projectType: string | null;
    location: string | null;
    plotSize: string | null;
    facing: string | null;
    floors: string | null;
    budget: string | null;
  };
};

function ClientAgreementPage({ theme }: { theme: ResolvedTheme }) {
  const [projectsList, setProjectsList] = useState<LiveProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [agreements, setAgreements] = useState<LiveAgreement[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<LiveAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [message, setMessage] = useState("");

  const [providerName, setProviderName] = useState("BuildSetu Design Partner");
  const [providerCompany, setProviderCompany] = useState("BuildSetu AI");
  const [providerGst, setProviderGst] = useState("");
  const [providerAddress, setProviderAddress] = useState("Raipur, Chhattisgarh");
  const [providerEmail, setProviderEmail] = useState("support@sikhadenge.in");
  const [providerPhone, setProviderPhone] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientGst, setClientGst] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [projectValue, setProjectValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Raipur, Chhattisgarh");

  async function loadProjectsAndAgreements() {
    try {
      setLoading(true);
      setMessage("");

      const projectsResponse = await fetch("/api/projects/list", { cache: "no-store" });
      const projectsData = await projectsResponse.json();

      if (!projectsResponse.ok || !projectsData.ok) {
        throw new Error(projectsData.error || "Failed to load projects");
      }

      const loadedProjects = projectsData.projects || [];
      setProjectsList(loadedProjects);

      const selectedProjectId = projectId || loadedProjects[0]?.id || "";
      if (selectedProjectId && !projectId) {
        setProjectId(selectedProjectId);
      }

      if (selectedProjectId) {
        await loadAgreements(selectedProjectId);
      }
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }

  async function loadAgreements(nextProjectId: string) {
    const response = await fetch(`/api/agreements/list?projectId=${nextProjectId}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load agreements");
    }

    const nextAgreements = data.agreements || [];
    setAgreements(nextAgreements);
    setSelectedAgreement(nextAgreements[0] || null);
  }

  async function handleProjectChange(nextProjectId: string) {
    try {
      setProjectId(nextProjectId);
      setLoading(true);
      setMessage("");
      await loadAgreements(nextProjectId);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAgreement() {
    try {
      setGenerating(true);
      setMessage("");

      if (!projectId) {
        throw new Error("Project select karo. Pehle New Project section se project create karo.");
      }

      const response = await fetch("/api/agreements/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          providerName,
          providerCompany,
          providerGst,
          providerAddress,
          providerEmail,
          providerPhone,
          clientName,
          clientCompany,
          clientGst,
          clientAddress,
          clientEmail,
          clientPhone,
          projectValue,
          startDate,
          completionDate,
          jurisdiction,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate agreement");
      }

      await loadAgreements(projectId);
      setSelectedAgreement(data.agreement);
      setMessage("Advanced client agreement generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to generate agreement");
    } finally {
      setGenerating(false);
    }
  }


  async function handleExportAgreementPdf() {
    try {
      setExportingPdf(true);
      setMessage("");

      if (!selectedAgreement?.id) {
        throw new Error("Agreement select karo ya pehle agreement generate karo.");
      }

      const response = await fetch("/api/agreements/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agreementId: selectedAgreement.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to export PDF");
      }

      setMessage("Agreement PDF exported successfully.");
      window.open(data.downloadUrl || data.pdfUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  useEffect(() => {
    loadProjectsAndAgreements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agreementSections = selectedAgreement
    ? [
        ["Scope + Party Details", selectedAgreement.scope],
        ["Deliverables", selectedAgreement.deliverables],
        ["Payment Terms", selectedAgreement.paymentTerms],
        ["Revision / Client Responsibility", selectedAgreement.revisionTerms],
        ["Terms, Conditions + Disclaimer", selectedAgreement.disclaimer],
      ]
    : [];

  return (
    <div>
      <PageTitle title="Client Agreement" desc="Advanced client agreement with both party details, GST, scope, payment terms and legal conditions." theme={theme} />

      <section className="rounded-2xl border border-[#ded5ec] bg-white p-5 light-card-shadow">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="h-12 rounded-xl border border-[#ded5ec] bg-white px-4 text-sm text-[#21133f] outline-none"
            >
              {!projectsList.length && <option value="">No project found</option>}
              {projectsList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} {project.location ? `- ${project.location}` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateAgreement}
              disabled={generating || !projectId}
              className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate Advanced Agreement"}
            </button>
          </div>

          <div className="rounded-xl border border-[#ded5ec] bg-[#fbf8ff] px-4 py-3 text-sm text-[#21133f]">
            Agreements: {agreements.length}
          </div>
        </div>

        <div className="mb-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#ded5ec] bg-[#fbf8ff] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[#21133f]">Service Provider / Designer Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Designer / contact person" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={providerCompany} onChange={(e) => setProviderCompany(e.target.value)} placeholder="Company / firm name" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={providerGst} onChange={(e) => setProviderGst(e.target.value)} placeholder="GSTIN" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={providerPhone} onChange={(e) => setProviderPhone(e.target.value)} placeholder="Phone" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} placeholder="Email" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none sm:col-span-2" />
              <textarea value={providerAddress} onChange={(e) => setProviderAddress(e.target.value)} placeholder="Company address" className="min-h-20 rounded-xl border border-[#ded5ec] bg-white p-3 text-sm text-[#21133f] outline-none sm:col-span-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#ded5ec] bg-[#fbf8ff] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[#21133f]">Client / Owner Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Client company / owner name" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={clientGst} onChange={(e) => setClientGst(e.target.value)} placeholder="Client GSTIN / optional" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Client phone" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Client email" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none sm:col-span-2" />
              <textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Client address" className="min-h-20 rounded-xl border border-[#ded5ec] bg-white p-3 text-sm text-[#21133f] outline-none sm:col-span-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-[#ded5ec] bg-white p-4 xl:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-[#21133f]">Commercial / Timeline Details</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input value={projectValue} onChange={(e) => setProjectValue(e.target.value)} placeholder="Project / design value" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start date" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} placeholder="Completion / handover date" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
              <input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Jurisdiction city/state" className="h-11 rounded-xl border border-[#ded5ec] bg-white px-3 text-sm text-[#21133f] outline-none" />
            </div>
          </div>
        </div>

        {message && (
          <div className={cn("mb-5 rounded-xl border p-3 text-sm", message.includes("success")
            ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
            : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
          )}>
            {message}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-[#ded5ec] bg-[#fbf8ff] p-4 text-sm text-[#5d5077]">
            Loading agreements...
          </div>
        )}

        {!loading && agreements.length === 0 && (
          <div className="rounded-xl border border-[#ded5ec] bg-[#fbf8ff] p-4 text-sm text-[#5d5077]">
            No agreement found. Generate Advanced Agreement button click karo.
          </div>
        )}

        {!loading && agreements.length > 0 && (
          <div className="grid gap-5 xl:grid-cols-[0.35fr_0.65fr]">
            <div className="space-y-3">
              {agreements.map((agreement) => (
                <button
                  key={agreement.id}
                  onClick={() => setSelectedAgreement(agreement)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    selectedAgreement?.id === agreement.id
                      ? "border-[#7c3aed] bg-[#f4edff]"
                      : "border-[#ded5ec] bg-white hover:border-[#a855f7]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#21133f]">{agreement.title}</h3>
                      <p className="mt-1 text-xs text-[#817397]">
                        {new Date(agreement.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-xs text-[#f97316]">
                      {agreement.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selectedAgreement && (
              <div className="rounded-2xl border border-[#ded5ec] bg-[#fbf8ff] p-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#140b2d]">{selectedAgreement.title}</h2>
                    <p className="mt-1 text-sm text-[#817397]">
                      {selectedAgreement.project?.projectType || "Project"} • {selectedAgreement.project?.location || "Location not set"}
                    </p>
                  </div>
                  <StatusBadge status={selectedAgreement.status} theme={theme} />
                </div>

                {selectedAgreement.project && (
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Plot", selectedAgreement.project.plotSize || "—"],
                      ["Facing", selectedAgreement.project.facing || "—"],
                      ["Floors", selectedAgreement.project.floors || "—"],
                      ["Budget", selectedAgreement.project.budget || "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white p-3">
                        <div className="text-xs text-[#817397]">{label}</div>
                        <div className="text-sm font-medium text-[#21133f]">{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {agreementSections.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[#eee7f7] bg-white p-4">
                      <h3 className="mb-2 text-sm font-semibold text-[#21133f]">{label}</h3>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-[#5d5077]">{value || "—"}</pre>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-medium text-white">
                    Copy Agreement
                  </button>
                  <button
                    onClick={handleExportAgreementPdf}
                    disabled={exportingPdf || !selectedAgreement}
                    className="rounded-xl border border-[#ded5ec] bg-white px-4 py-2.5 text-sm font-medium text-[#6f1cc4] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ApiPage({ theme }: { theme: ResolvedTheme }) {
  const apiItems = [
    ["Project Create API", "External website, CRM ya agency form se project create karne ke liye."],
    ["Brief Generator API", "Client requirement ko structured project brief aur smart questions me convert kare."],
    ["Render API", "Interior render, exterior elevation, site photo redesign aur render enhancer ke liye."],
    ["BOQ API", "Project data se BOQ draft, material quantity aur estimate summary generate kare."],
    ["BBS API", "Engineer-entered reinforcement data se BBS table aur steel summary banaye."],
    ["PDF Export API", "Client proposal, contractor package aur review package PDF export kare."],
    ["Webhook Events", "Project created, render completed, PDF ready, review requested jaise events bheje."],
    ["API Keys", "Agency/partner integration ke liye secure API key management."]
  ];

  return (
    <div>
      <PageTitle
        title="API"
        desc="BuildSetu AI tools ko external website, CRM, agency workflow ya client portal se connect karne ke liye developer access."
        theme={theme}
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <StatusBadge status="NEW" theme={theme} />

          <div className="mt-5">
            <h3 className={cn("text-lg font-semibold", false ? "text-white" : "text-[#21133f]")}>
              Developer API Access
            </h3>
            <p className={cn("mt-2 text-sm leading-6", false ? "text-slate-400" : "text-[#817397]")}>
              API se designers, architects, contractors aur agencies apni website/app se BuildSetu AI ke AI tools use kar sakenge.
              MVP me ye section documentation placeholder hai. Production me API keys, rate limits, logs aur billing add honge.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white">
              Generate API Key <Code2 className="h-4 w-4" />
            </button>
            <button className={cn("inline-flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium", false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-[#fbf8ff] text-[#6f1cc4]")}>
              View Documentation
            </button>
          </div>

          <div className={cn("mt-5 rounded-xl border p-4 text-sm leading-6", false ? "border-[#facc15]/20 bg-[#3b2507]/30 text-[#fde68a]" : "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]")}>
            API access abhi controlled/coming-soon rahega. Public API launch se pehle authentication, rate limit, credit deduction aur abuse protection required hai.
          </div>
        </section>

        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <h3 className={cn("text-lg font-semibold", false ? "text-white" : "text-[#21133f]")}>
            Planned API modules
          </h3>
          <p className={cn("mt-1 text-sm", false ? "text-slate-500" : "text-[#817397]")}>
            Ye endpoints future partner/agency integrations ke liye planned hain.
          </p>

          <div className="mt-5 grid gap-3">
            {apiItems.map(([title, desc]) => (
              <div
                key={title}
                className={cn("rounded-xl border p-4", false ? "border-white/10 bg-black/20" : "border-[#eee7f7] bg-[#fbf8ff]")}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", false ? "bg-[#2b1755] text-[#d8b4fe]" : "bg-[#f0dcff] text-[#6f1cc4]")}>
                    <Code2 className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className={cn("text-sm font-medium", false ? "text-white" : "text-[#21133f]")}>{title}</h4>
                    <p className={cn("mt-1 text-sm leading-6", false ? "text-slate-400" : "text-[#817397]")}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}


export default function SikhadengeBuildDashboard() {
  const [active, setActive] = useState<ViewKey>("dashboard");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
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
    if (active === "agreements") return <ClientAgreementPage theme={theme} />;
    if (active === "reviews") return <ReviewPage theme={theme} />;
    if (active === "api") return <ApiPage theme={theme} />;
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
