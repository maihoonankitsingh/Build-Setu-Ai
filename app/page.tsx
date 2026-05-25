"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
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
  | "api"  | "projectWorkspace";

const BUILDSETU_ACTIVE_VIEW_STORAGE_KEY = "buildsetu_active_view";

const BUILDSETU_VIEW_KEYS = ['dashboard', 'tools', 'projects', 'studio', 'renders', 'boq', 'bbs', 'exports', 'agreements', 'reviews', 'api', 'projectWorkspace'] as ViewKey[];

function isBuildSetuViewKey(value: unknown): value is ViewKey {
  return typeof value === "string" && BUILDSETU_VIEW_KEYS.includes(value as ViewKey);
}

function getInitialBuildSetuViewKey(): ViewKey {
  if (typeof window === "undefined") return "dashboard";

  try {
    const hashValue = window.location.hash.replace(/^#\/?/, "").trim();
    if (isBuildSetuViewKey(hashValue)) return hashValue;

    const savedValue = window.localStorage.getItem(BUILDSETU_ACTIVE_VIEW_STORAGE_KEY);
    if (isBuildSetuViewKey(savedValue)) return savedValue;
  } catch {}

  return "dashboard";
}

function persistBuildSetuViewKey(view: ViewKey) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(BUILDSETU_ACTIVE_VIEW_STORAGE_KEY, view);
  } catch {}
}


const Bbs3DViewer = dynamic(() => import("@/components/bbs/Bbs3DViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[360px] place-items-center rounded-[22px] border border-[#eee8fb] bg-[#fbfaff] text-xs font-bold text-[#817397]">
      Loading 3D reinforcement viewer...
    </div>
  ),
});

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
  icon: BuildSetuIcon;
  visual: string;
  visualLabel: string;
  imageUrl: string;
  featured?: boolean;
};

type BuildSetuIcon = React.ComponentType<{ className?: string }>;

const navItems: Array<{ id: ViewKey | "credits"; label: string; icon: BuildSetuIcon; href?: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tools", label: "All Tools", icon: Boxes },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "studio", label: "New Project", icon: Plus },
  { id: "renders", label: "Render Studio", icon: ImageIcon },
  { id: "boq", label: "BOQ / Estimate", icon: Calculator },
  { id: "bbs", label: "BBS", icon: ClipboardList },
  { id: "reviews", label: "Verifications", icon: ShieldCheck },
  { id: "exports", label: "Exports", icon: FileText },
  { id: "agreements", label: "Client Agreement", icon: ScrollText },
  { id: "credits", label: "Credits", icon: CreditCard, href: "/credits" },
];

const bottomNav: Array<{ label: string; icon: BuildSetuIcon }> = [
  { label: "Support", icon: Headphones },
  { label: "Settings", icon: Settings },
];

const categories: Array<{ label: ToolCategory; icon: BuildSetuIcon }> = [
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
    cost: "500 Credits / Brief",
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
    cost: "2,500 Credits / Render",
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
    cost: "2,500 Credits / Elevation",
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
    cost: "2,500 Credits / Enhance",
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
    cost: "2,500 Credits / Redesign",
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
    cost: "1,000 Credits / Plan",
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
    cost: "1,000 Credits / Plan",
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
    cost: "500 Credits / Chat",
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
    cost: "500 Credits / Board",
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
    cost: "2,500 Credits / Remove",
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
    cost: "2,500 Credits / Change",
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
    cost: "2,500 Credits / Enhance",
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
    cost: "1,500 Credits / Package",
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
    cost: "1,000 Credits / BOQ",
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
    cost: "1,500 Credits / BBS",
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
    cost: "1,500 Credits / Draft",
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
    cost: "500 Credits / Palette",
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
    cost: "500 Credits / Ceiling",
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
    cost: "500 Credits / Check",
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
    cost: "500 Credits / PDF",
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
    cost: "1,000 Credits / Agreement",
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
    cost: "1,500 Credits / Package",
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
    status: "Verification Required",
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
      "Verification Required": "bg-[#fff7ed] text-[#f97316]",
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
    "Verification Required": "border border-[#facc15]/40 bg-[#3b2507] text-[#fde68a]",
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
                <Icon className="h-[13px] w-[13px] shrink-0" />
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
  const [sidebarCredits, setSidebarCredits] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/credits/balance", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;

        const raw =
          data.credits ??
          data.balance ??
          data.creditBalance ??
          data.user?.credits ??
          data.wallet?.credits ??
          null;

        const value = Number(raw);
        if (Number.isFinite(value)) setSidebarCredits(value);
      })
      .catch(() => {
        if (mounted) setSidebarCredits(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const creditLabel =
    sidebarCredits === null
      ? "Loading"
      : new Intl.NumberFormat("en-IN").format(sidebarCredits);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 hidden h-screen w-[244px] overflow-hidden border-r px-4 py-3 lg:flex lg:flex-col",
        false
          ? "border-white/10 bg-[#090713]/96 text-white"
          : "border-[#eee7f7] bg-white text-[#21133f]",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] via-[#9333ea] to-[#4f46e5] text-white shadow-lg shadow-purple-900/20">
          <Hammer className="h-4.5 w-4.5" />
        </div>
        <div className={cn("text-[17px] font-bold leading-none tracking-[-0.035em] whitespace-nowrap", false ? "text-white" : "text-[#21133f]")}>
          BuildSetu <span className="text-[#b794ff]">AI</span>
        </div>
      </div>

      <nav className="space-y-0.5">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const withDivider = index === 5 || index === 9;

          return (
            <div key={item.id}>
              {withDivider && <div className={cn("my-1.5 h-px", false ? "bg-white/10" : "bg-[#eee7f7]")} />}
              <button
                onClick={() => {
                  if (item.href) {
                    window.location.href = item.href;
                    return;
                  }

                  if (item.id === "exports") {
                    window.location.href = "/reports";
                    return;
                  }

                  setActive(item.id as ViewKey);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-[5px] text-left text-[14px] font-medium transition",
                  selected
                    ? false
                      ? "bg-[#2b1755] text-white shadow-lg shadow-purple-950/20"
                      : "bg-[#f0dcff] text-[#6f1cc4]"
                    : false
                      ? "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      : "text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#6f1cc4]",
                )}
              >
                <Icon className="h-[16px] w-[16px] shrink-0" />
                <span className="text-[14px] leading-none tracking-[-0.01em]">{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className={cn("my-1.5 h-px", false ? "bg-white/10" : "bg-[#eee7f7]")} />

      <div className="space-y-0.5">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-[5px] text-left text-[14px] font-medium transition",
                false
                  ? "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  : "text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#6f1cc4]",
              )}
            >
              <Icon className="h-[16px] w-[16px] shrink-0" />
              <span className="text-[14px] leading-none tracking-[-0.01em]">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#6d5dfc] via-[#8b5cf6] to-[#c084fc] p-2.5 text-white shadow-lg shadow-purple-900/15">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-white/18">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <div className="text-[11.5px] font-semibold leading-none">Credits</div>
          </div>

          <div className="text-[19px] font-bold leading-none tracking-[-0.03em]">{creditLabel}</div>
          <div className="mt-1 text-[14px] font-medium text-white/78">Available Credits</div>

          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-[72%] rounded-full bg-white/65" />
          </div>

          <div className="mt-2 text-[14px] font-medium text-white/82">Plan: Pro</div>

          <button
            onClick={() => {
              window.location.href = "/pricing";
            }}
            className="mt-1.5 w-full rounded-xl border border-white/55 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/18"
          >
            Upgrade Plan
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
        "sticky top-0 z-20 border-b backdrop-blur-xl",
        false ? "border-white/10 bg-[#070611]/85" : "border-[#eee7f7] bg-white/92",
      )}
    >
      <div className="flex h-[58px] items-center gap-3 px-4 lg:ml-[244px] lg:px-6">
        <button
          aria-label="Toggle sidebar"
          className={cn(
            "hidden h-10 w-10 items-center justify-center rounded-xl border lg:flex",
            false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-white text-[#21133f] light-card-shadow",
          )}
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>

        <div
          className={cn(
            "relative hidden h-9 w-full max-w-[480px] items-center rounded-xl border px-4 md:flex",
            false ? "border-white/10 bg-white/[0.04]" : "border-[#ded5ec] bg-white light-card-shadow",
          )}
        >
          <Search className="mr-3 h-4 w-4 text-[#817397]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#817397]"
            placeholder="Search projects, documents, BOQ, BBS..."
          />
          <span className="rounded-md border border-[#eee7f7] px-2 py-1 text-[10px] text-[#817397]">⌘ K</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setThemeMode(themeMode === "light" ? "system" : "light")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border",
              false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-white text-[#5d5077] light-card-shadow",
            )}
          >
            <Sun className="h-4 w-4" />
          </button>

          <button
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl border",
              false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-white text-[#5d5077] light-card-shadow",
            )}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#7c3aed]" />
          </button>

          <button
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-3 py-2",
              false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-white text-[#21133f] light-card-shadow",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] text-sm font-bold text-white">
              SB
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-sm font-semibold leading-none">BuildSetu AI</div>
              <div className="mt-1 text-xs text-[#817397]">Workspace</div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#817397]" />
          </button>
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
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((category) => {
        const Icon = category.icon;
        const selected = activeCategory === category.label;

        return (
          <button
            key={category.label}
            onClick={() => setActiveCategory(category.label)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
              selected
                ? false
                  ? "border-[#7c3aed] bg-[#2b1755] text-white"
                  : "border-[#14071f] bg-[#14071f] text-white"
                : false
                  ? "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.06]"
                  : "border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#f7f0ff] hover:text-[#6f1cc4]",
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
              <Icon className="h-[13px] w-[13px] shrink-0" />
            </div>
          </div>
        </div>

        <div className="p-3.5">
          <p className="min-h-[68px] text-[13px] font-normal leading-5 text-[#3f315d]">
            {tool.desc}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                window.location.href = `/tools/${toolSlug(tool.title)}`;
              }}
              className="inline-flex flex-1 min-w-0 items-center justify-center gap-2 rounded-lg bg-[#6f1cc4] px-3 py-2 text-xs font-semibold leading-none text-white hover:bg-[#55129a]"
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
          <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#c4b5fd]">
            {tool.visualLabel}
          </div>
          <h3 className="text-[20px] font-semibold leading-none tracking-[-0.04em] text-white">
            {tool.title}
          </h3>
        </div>
      </div>

      <div className="p-3.5">
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
      <main className="lg:ml-[244px]">
        <div className="px-4 py-3 lg:px-6">{children}</div>
      </main>
    </div>
  );
}

type DashboardOverviewState = {
  activeProjects?: number;
  totalProjects?: number;
  imagesGenerated?: number;
  reviewPending?: number;
  creditsLeft?: number;
  boqGenerated?: number;
  bbsGenerated?: number;
  usedCredits?: number;
  totalCredits?: number;
};

type DashboardProjectState = {
  id?: string;
  title?: string;
  name?: string;
  projectType?: string;
  type?: string;
  location?: string;
  city?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
};

function Dashboard({
  setActive,
  theme,
}: {
  setActive: (id: ViewKey) => void;
  theme: ResolvedTheme;
}) {
  const [overview, setOverview] = useState<DashboardOverviewState>({});
  const [dashboardProjects, setDashboardProjects] = useState<DashboardProjectState[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const [overviewRes, projectsRes] = await Promise.all([
          fetch("/api/dashboard/overview", { cache: "no-store" }),
          fetch("/api/projects/list", { cache: "no-store" }),
        ]);

        const overviewData = overviewRes.ok ? await overviewRes.json() : {};
        const projectData = projectsRes.ok ? await projectsRes.json() : {};

        if (!mounted) return;

        setOverview(overviewData?.stats ?? overviewData ?? {});
        setDashboardProjects(Array.isArray(projectData?.projects) ? projectData.projects : []);
      } catch {
        if (!mounted) return;
        setOverview({});
        setDashboardProjects([]);
      } finally {
        if (mounted) setLoadingDashboard(false);
      }
    }

    loadDashboard();

    const interval = window.setInterval(loadDashboard, 30000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const formatNumber = (value: unknown, fallback = 0) => {
    const number = Number(value ?? fallback);
    return new Intl.NumberFormat("en-IN").format(Number.isFinite(number) ? number : fallback);
  };

  const totalProjects = Number(overview.totalProjects ?? overview.activeProjects ?? dashboardProjects.length ?? 0);
  const activeProjects = Number(overview.activeProjects ?? dashboardProjects.length ?? 0);
  const creditsLeft = Number(overview.creditsLeft ?? 0);
  const usedCredits = Number(overview.usedCredits ?? Math.max(0, Number(overview.totalCredits ?? 0) - creditsLeft));
  const totalCredits = Number(overview.totalCredits ?? (creditsLeft + usedCredits || creditsLeft || 1));
  const creditPercent = Math.max(0, Math.min(100, Math.round((usedCredits / Math.max(totalCredits, 1)) * 100)));

  const statCards = [
    {
      label: "Total Projects",
      value: formatNumber(totalProjects),
      sub: `${formatNumber(activeProjects)} Active`,
      icon: FolderKanban,
    },
    {
      label: "BOQ Generated",
      value: formatNumber(overview.boqGenerated ?? 0),
      sub: "This Month",
      icon: FileText,
    },
    {
      label: "BBS Generated",
      value: formatNumber(overview.bbsGenerated ?? 0),
      sub: "This Month",
      icon: ClipboardList,
    },
    {
      label: "Credits Balance",
      value: formatNumber(creditsLeft),
      sub: "Available Credits",
      icon: CreditCard,
    },
  ];

  const fallbackProjects = [
    {
      title: "Skyline Residences",
      type: "Residential",
      status: "In Progress",
      imageUrl: "/tool-images/exterior-elevation.png",
      updated: "Updated 2h ago",
    },
    {
      title: "Maple Interiors",
      type: "Interior Design",
      status: "BOQ Ready",
      imageUrl: "/tool-images/interior-render.png",
      updated: "Updated 5h ago",
    },
    {
      title: "Vertex Corporate Park",
      type: "Commercial",
      status: "In Progress",
      imageUrl: "/tool-images/working-drawings.png",
      updated: "Updated 1d ago",
    },
    {
      title: "Hilltop Villa",
      type: "Residential",
      status: "BBS Ready",
      imageUrl: "/tool-images/client-pdf.png",
      updated: "Updated 2d ago",
    },
  ];

  const projectCards = dashboardProjects.slice(0, 4).map((project, index) => ({
    title: project.title ?? project.name ?? `Project ${index + 1}`,
    type: project.projectType ?? project.type ?? project.location ?? project.city ?? "BuildSetu Project",
    status: project.status ?? (index % 2 ? "Verification Required" : "In Progress"),
    imageUrl:
      (project as any).imageUrl ??
      (project as any).coverImage ??
      (project as any).thumbnailUrl ??
      (project as any).renderUrl ??
      "",
    updated: project.updatedAt ? "Recently updated" : "Saved project",
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-3">
        <section className="flex flex-col gap-4 py-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.045em] text-[#21133f]">
              Welcome back, BuildSetu 👋
            </h1>
            <p className="mt-1 text-xs text-[#817397]">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>

          <button
            onClick={() => setActive("studio")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6d5dfc] to-[#9333ea] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-900/15"
          >
            <Plus className="h-4 w-4" />
            New Project
            <ChevronDown className="h-4 w-4" />
          </button>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <DashboardStatCard key={card.label} {...card} loading={loadingDashboard} />
          ))}
        </section>

        <section className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-[-0.03em] text-[#21133f]">Recent Projects</h2>
              <p className="text-xs text-[#817397]">Latest client workspaces and project status.</p>
            </div>
            <button
              onClick={() => setActive("projects")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f1cc4]"
            >
              View all projects
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {projectCards.map((project) => (
              <DashboardProjectCard key={project.title} project={project} />
            ))}
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-3">
          <ProjectsByStage totalProjects={totalProjects || 24} />
          <MonthlyActivity />
          <CreditUsage usedCredits={usedCredits} totalCredits={totalCredits} creditPercent={creditPercent} setActive={setActive} />
        </section>
      </div>

      <DashboardAiAssistant setActive={setActive} />
    </div>
  );
}

function DashboardStatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  icon: BuildSetuIcon;
  loading: boolean;
}) {
  return (
    <article className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eee7f7] bg-[#f5edff] text-[#7c3aed]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#817397]">{label}</p>
          <p className="mt-1 text-[19px] font-bold leading-none tracking-[-0.04em] text-[#21133f]">
            {loading ? "—" : value}
          </p>
          <p className="mt-1.5 text-[11px] font-semibold text-[#6f1cc4]">{sub}</p>
        </div>
      </div>
    </article>
  );
}

function DashboardProjectCard({
  project,
}: {
  project: {
    title: string;
    type: string;
    status: string;
    imageUrl: string;
    updated: string;
  };
}) {
  const statusClass =
    project.status.toLowerCase().includes("ready")
      ? "bg-[#ecfdf3] text-[#079455]"
      : project.status.toLowerCase().includes("review")
        ? "bg-[#fff7ed] text-[#f97316]"
        : "bg-[#f0dcff] text-[#6f1cc4]";

  return (
    <article className="overflow-hidden rounded-2xl border border-[#eee7f7] bg-white">
      <div
        className="h-[88px] bg-cover bg-center"
        style={{ backgroundImage: `url(${project.imageUrl})` }}
      />
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-[#21133f]">{project.title}</h3>
            <p className="mt-0.5 truncate text-[11px] text-[#817397]">{project.type}</p>
          </div>
          <button className="text-[#817397]">⋮</button>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
            {project.status}
          </span>
          <span className="text-[11px] text-[#817397]">{project.updated}</span>
        </div>
      </div>
    </article>
  );
}

function ProjectsByStage({ totalProjects }: { totalProjects: number }) {
  const total = Math.max(totalProjects, 1);
  const rows = [
    ["In Progress", Math.ceil(total * 0.33), "bg-[#6d5dfc]"],
    ["BOQ Ready", Math.ceil(total * 0.25), "bg-[#8b5cf6]"],
    ["BBS Ready", Math.ceil(total * 0.21), "bg-[#b794ff]"],
    ["Completed", Math.max(1, total - Math.ceil(total * 0.79)), "bg-[#eadbff]"],
  ];

  return (
    <section className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#21133f]">Projects by Stage</h2>
        <span className="rounded-full bg-[#f6efff] px-2.5 py-1 text-[10px] font-semibold text-[#7c3aed]">Live</span>
      </div>

      <div className="flex min-h-[150px] items-center gap-5">
        <div
          className="flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-full shadow-inner"
          style={{ background: "conic-gradient(#6d5dfc 0 33%, #8b5cf6 33% 58%, #b794ff 58% 79%, #eadbff 79% 100%)" }}
        >
          <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-white shadow-sm">
            <span className="text-[24px] font-bold leading-none text-[#21133f]">{totalProjects}</span>
            <span className="mt-1 text-[10px] text-[#817397]">Total</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {rows.map(([label, count, color]) => (
            <div key={label as string} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="flex min-w-0 items-center gap-2 text-[#5d5077]">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color as string}`} />
                <span className="truncate">{label as string}</span>
              </span>
              <span className="font-semibold text-[#21133f]">{count as number}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MonthlyActivity() {
  const points = "12,82 70,62 128,34 186,44 244,24 302,14";

  return (
    <section className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#21133f]">Monthly Activity</h2>
          <p className="mt-1 text-[10px] text-[#817397]">Project actions this month</p>
        </div>
        <span className="rounded-lg border border-[#eee7f7] bg-white px-2 py-1 text-[10px] text-[#5d5077]">This Month</span>
      </div>

      <div className="mt-3 h-[98px]">
        <svg viewBox="0 0 320 110" className="h-full w-full overflow-visible">
          {[20, 45, 70, 95].map((y) => (
            <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#eee7f7" strokeDasharray="4 4" />
          ))}
          <polyline points={`12,100 ${points} 302,100`} fill="#7c3aed" opacity="0.08" />
          <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.split(" ").map((point) => {
            const [x, y] = point.split(",").map(Number);
            return <circle key={point} cx={x} cy={y} r="3" fill="white" stroke="#7c3aed" strokeWidth="2" />;
          })}
          {[["Week 1", 12], ["Week 2", 102], ["Week 3", 192], ["Week 4", 282]].map(([label, x]) => (
            <text key={label as string} x={x as number} y="108" fontSize="10" fill="#817397">{label as string}</text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function CreditUsage({
  usedCredits,
  totalCredits,
  creditPercent,
  setActive,
}: {
  usedCredits: number;
  totalCredits: number;
  creditPercent: number;
  setActive: (id: ViewKey) => void;
}) {
  const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(Number.isFinite(value) ? value : 0);
  const remaining = Math.max(0, totalCredits - usedCredits);

  return (
    <section className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#21133f]">Credit Usage</h2>
        <span className="rounded-full bg-[#f6efff] px-2.5 py-1 text-[10px] font-semibold text-[#7c3aed]">{creditPercent}% Used</span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div
          className="flex h-[108px] w-[108px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#6d5dfc 0 ${creditPercent}%, #eee7f7 ${creditPercent}% 100%)` }}
        >
          <div className="flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-white shadow-sm">
            <span className="text-[22px] font-bold leading-none text-[#21133f]">{creditPercent}%</span>
            <span className="mt-1 text-[10px] text-[#817397]">Used</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5 text-[12px]">
          <div className="flex justify-between gap-3">
            <span className="text-[#817397]">Used Credits</span>
            <span className="font-semibold text-[#21133f]">{formatNumber(usedCredits)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#817397]">Remaining</span>
            <span className="font-semibold text-[#21133f]">{formatNumber(remaining)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[#817397]">Total Credits</span>
            <span className="font-semibold text-[#21133f]">{formatNumber(totalCredits)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          window.location.href = "/credits";
        }}
        className="mt-3 w-full rounded-xl border border-[#8b5cf6] px-3 py-1.5 text-xs font-semibold text-[#6f1cc4] transition hover:bg-[#f7f0ff]"
      >
        Buy More Credits
      </button>
    </section>
  );
}

function DashboardAiAssistant({ setActive }: { setActive: (id: ViewKey) => void }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Hi BuildSetu 👋 Main project planning, BOQ, BBS, proposal aur design ideas me help kar sakta hoon.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const sendMessage = async (text?: string) => {
    const message = String(text ?? input).trim();
    if (!message || sending) return;

    const nextMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages }),
      });

      const data = await res.json();

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data?.ok
            ? data.reply
            : data?.error || "AI response generate nahi ho paya. Please dobara try karo.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Network/API issue aa raha hai. Please server logs check karo aur dobara try karo.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const actions = [
    {
      title: "Generate BOQ",
      desc: "BOQ ke liye inputs batao",
      icon: Calculator,
      prompt: "Mere selected project ke liye BOQ banane ke liye kaun kaun se inputs chahiye? Step-by-step batao.",
      action: () => setActive("boq"),
    },
    {
      title: "Generate BBS",
      desc: "Steel draft planning",
      icon: ClipboardList,
      prompt: "BBS draft generate karne ke liye engineer se kaun se structural inputs lene honge?",
      action: () => setActive("bbs"),
    },
    {
      title: "Project Proposal",
      desc: "Client proposal draft",
      icon: FileText,
      prompt: "Client ke liye ek professional project proposal structure bana do.",
      action: () => setActive("exports"),
    },
    {
      title: "Material Takeoff",
      desc: "Quantity checklist",
      icon: Ruler,
      prompt: "Material takeoff ke liye project drawing se kya kya quantities extract karni chahiye?",
      action: () => setActive("boq"),
    },
    {
      title: "Design Ideas",
      desc: "Interior/exterior ideas",
      icon: Lightbulb,
      prompt: "Modern Indian home ke liye practical interior aur exterior design ideas do.",
      action: () => setActive("tools"),
    },
  ];

  return (
    <aside className="sticky top-[74px] rounded-[22px] border border-[#ded5ec] bg-white p-4 light-card-shadow">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#21133f]">
          <Sparkles className="h-4 w-4 text-[#7c3aed]" />
          AI Assistant
        </h2>
        <span className="text-xl leading-none text-[#817397]">−</span>
      </div>

      <div className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={cn(
              "rounded-2xl px-3 py-2 text-[11.5px] leading-relaxed",
              message.role === "user"
                ? "ml-8 bg-[#7c3aed] text-white"
                : "mr-4 bg-[#fbf8ff] text-[#21133f] border border-[#eee7f7]",
            )}
          >
            {message.content}
          </div>
        ))}

        {sending && (
          <div className="mr-4 rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] px-3 py-2 text-[11.5px] text-[#817397]">
            Thinking...
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => sendMessage(item.prompt)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[#eee7f7] bg-[#fbf8ff] px-3 py-2.5 text-left transition hover:border-[#c4b5fd] hover:bg-[#f7f0ff]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f0dcff] text-[#6f1cc4]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-[#21133f]">{item.title}</span>
                <span className="mt-0.5 block truncate text-[10.5px] leading-snug text-[#817397]">{item.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#eee7f7] bg-white p-1.5">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-2 text-[11.5px] outline-none placeholder:text-[#817397]"
            placeholder="Ask anything about your project..."
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#6d5dfc] to-[#9333ea] text-white disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] leading-snug text-[#817397]">
          AI can make mistakes. Please verify BOQ, BBS, legal and structural outputs.
        </p>
      </form>
    </aside>
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
          {["AI for Speed & Ideas", "Experts for Safety & Accuracy", "Verification gate for BOQ, BBS and drawings"].map((item) => (
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




function PageTitle({
  title,
  desc,
  theme,
}: {
  title: string;
  desc: string;
  theme: ResolvedTheme;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.045em] text-[#21133f]">
        {title}
      </h1>
      <p className="mt-0.5 text-xs text-[#817397]">{desc}</p>
    </div>
  );
}

function ProjectsPage({ theme, setActive, setSelectedProject }: { theme: ResolvedTheme; setActive: (id: ViewKey) => void; setSelectedProject: (project: LiveProject | null) => void }) {
  const [liveProjects, setLiveProjects] = useState<LiveProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [editForm, setEditForm] = useState({
    title: "",
    projectType: "",
    location: "",
    plotSize: "",
    facing: "",
    floors: "",
    budget: "",
  });

  async function loadProjects() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/projects/list", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Projects load failed");
      }

      setLiveProjects(data.projects || []);
    } catch (err: any) {
      setError(err?.message || "Projects load failed");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(project: LiveProject) {
    const item = project as any;

    setNotice("");
    setEditingId(item.id || "");
    setEditForm({
      title: item.title || "",
      projectType: item.projectType || "",
      location: item.location || "",
      plotSize: item.plotSize || "",
      facing: item.facing || "",
      floors: item.floors || "",
      budget: item.budget || "",
    });
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm({
      title: "",
      projectType: "",
      location: "",
      plotSize: "",
      facing: "",
      floors: "",
      budget: "",
    });
  }

  async function saveProject(projectId: string) {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const res = await fetch("/api/projects/update", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          ...editForm,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Project update failed");
      }

      setNotice("Project updated successfully.");
      cancelEdit();
      await loadProjects();
    } catch (err: any) {
      setError(err?.message || "Project update failed");
    } finally {
      setLoading(false);
    }
  }

  async function archiveProject(projectId: string) {
    if (!window.confirm("Archive this project?")) return;

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const res = await fetch("/api/projects/archive", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Project archive failed");
      }

      setNotice("Project archived successfully.");
      await loadProjects();
    } catch (err: any) {
      setError(err?.message || "Project archive failed");
    } finally {
      setLoading(false);
    }
  }

  async function restoreProject(projectId: string) {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const res = await fetch("/api/projects/restore", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Project restore failed");
      }

      setNotice("Project restored successfully.");
      await loadProjects();
    } catch (err: any) {
      setError(err?.message || "Project restore failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(projectId: string) {
    if (!window.confirm("Delete this project permanently? This cannot be undone.")) return;

    try {
      setLoading(true);
      setError("");
      setNotice("");

      const res = await fetch("/api/projects/delete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Project delete failed");
      }

      setNotice("Project deleted successfully.");
      await loadProjects();
    } catch (err: any) {
      setError(err?.message || "Project delete failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    const interval = window.setInterval(loadProjects, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const activeProjects = liveProjects.filter((project) => String((project as any).status || "") !== "ARCHIVED");
  const archivedProjects = liveProjects.filter((project) => String((project as any).status || "") === "ARCHIVED");

  const filteredProjects = liveProjects.filter((project) => {
    const item = project as any;
    const status = String(item.status || "AI_DRAFT");
    const archived = status === "ARCHIVED";

    if (statusFilter === "active" && archived) return false;
    if (statusFilter === "archived" && !archived) return false;

    if (!normalizedQuery) return true;

    const haystack = [
      item.title,
      item.projectType,
      item.location,
      item.plotSize,
      item.facing,
      item.floors,
      item.budget,
      item.id,
      status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  const totalOutputs = liveProjects.reduce((sum, project) => {
    const count = (project as any)._count || {};
    return sum + Number(count.renders || 0) + Number(count.boqItems || 0) + Number(count.bbsItems || 0) + Number(count.agreements || 0);
  }, 0);

  const projectStats = [
    { label: "Total Projects", value: liveProjects.length, icon: FolderKanban },
    { label: "Active", value: activeProjects.length, icon: CheckCircle2 },
    { label: "Archived", value: archivedProjects.length, icon: ShieldCheck },
    { label: "Outputs", value: totalOutputs, icon: Layers3 },
  ];

  const formatDate = (value: unknown) => {
    if (!value) return "Recently";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-[20px] border border-[#eee7f7] bg-gradient-to-br from-white via-white to-[#fbf8ff] px-4 py-3 light-card-shadow md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">Project workspace</p>
          <h1 className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.045em] text-[#21133f]">Projects</h1>
          <p className="mt-1 text-xs text-[#817397]">
            Real-time client projects, outputs, revisions and project actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadProjects}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#ded5ec] bg-white px-3 text-xs font-semibold text-[#5d5077] hover:bg-[#f7f0ff]"
          >
            <Search className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setActive("studio")}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-[#6d5dfc] to-[#9333ea] px-4 text-xs font-semibold text-white shadow-lg shadow-purple-900/15"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {projectStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0dcff] text-[#6f1cc4]">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#817397]">{stat.label}</p>
                  <p className="mt-1 text-[20px] font-bold leading-none text-[#21133f]">{stat.value}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-[20px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex h-9 min-w-0 flex-1 items-center rounded-xl border border-[#ded5ec] bg-white px-3">
            <Search className="mr-2 h-4 w-4 text-[#817397]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#817397]"
              placeholder="Search by title, city, type, status, ID..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["active", `Active (${activeProjects.length})`],
              ["archived", `Archived (${archivedProjects.length})`],
              ["all", `All (${liveProjects.length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id as "active" | "archived" | "all")}
                className={cn(
                  "h-9 rounded-xl px-3 text-xs font-semibold transition",
                  statusFilter === id
                    ? "bg-[#21133f] text-white"
                    : "border border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#f7f0ff]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {loading && (
        <div className="rounded-2xl border border-[#ded5ec] bg-white p-5 text-sm font-semibold text-[#6b5a84]">
          Loading projects...
        </div>
      )}

      {!loading && !error && filteredProjects.length === 0 && (
        <div className="rounded-[22px] border border-dashed border-[#ded5ec] bg-[#fbf8ff] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0dcff] text-[#6f1cc4]">
            <FolderKanban className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-[#21133f]">No projects found</h3>
          <p className="mt-1 text-xs text-[#817397]">
            Search/filter change karo ya New Project section se first project create karo.
          </p>
        </div>
      )}

      {!loading && !error && filteredProjects.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredProjects.map((project) => {
            const item = project as any;
            const isEditing = editingId === item.id;
            const status = String(item.status || "AI_DRAFT");
            const archived = status === "ARCHIVED";
            const count = item._count || {};
            const latestRender = Array.isArray(item.renders) && item.renders.length ? item.renders[0] : null;
            const coverImage = latestRender?.imageUrl || latestRender?.url || latestRender?.renderUrl || "";

            return (
              <article
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-[22px] border bg-white light-card-shadow",
                  archived ? "border-slate-200 opacity-75" : "border-[#ded5ec]",
                )}
              >
                <div className="grid md:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="relative min-h-[132px] bg-gradient-to-br from-[#14071f] via-[#3b0764] to-[#7c3aed]">
                    {coverImage ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <FolderKanban className="mx-auto h-7 w-7 opacity-90" />
                          <p className="mt-2 text-xs font-semibold">BuildSetu Project</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#6f1cc4]">
                      {status.replaceAll("_", " ")}
                    </div>
                  </div>

                  <div className="p-3.5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-[#21133f]">
                          {item.title || "Untitled Project"}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-[#786a91]">
                          {(item.projectType || "Project")} {item.location ? `• ${item.location}` : ""}
                        </p>
                        <p className="mt-1 text-[10.5px] text-[#9a88b3]">
                          Updated: {formatDate(item.updatedAt || item.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(project)}
                          className="h-8 rounded-xl border border-[#ded5ec] bg-white px-3 text-[11px] font-semibold text-[#21133f]"
                        >
                          Edit
                        </button>

                        {archived ? (
                          <button
                            type="button"
                            onClick={() => restoreProject(item.id)}
                            className="h-8 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-700"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => archiveProject(item.id)}
                            className="h-8 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-semibold text-amber-700"
                          >
                            Archive
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteProject(item.id)}
                          className="h-8 rounded-xl border border-red-200 bg-red-50 px-3 text-[11px] font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        ["Renders", count.renders || 0],
                        ["BOQ", count.boqItems || 0],
                        ["BBS", count.bbsItems || 0],
                        ["Docs", count.agreements || 0],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-xl border border-[#eee7f7] bg-[#fbf8ff] px-2 py-2 text-center">
                          <p className="text-[13px] font-bold text-[#21133f]">{String(value)}</p>
                          <p className="mt-0.5 text-[10px] text-[#817397]">{label as string}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="max-w-full truncate text-[10.5px] text-[#9a88b3]">ID: {item.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(project);
                          try {
                            window.localStorage.setItem("buildsetu_active_project", JSON.stringify(project));
                          } catch {}
                          setActive("projectWorkspace");
                        }}
                        className="rounded-xl bg-[#21133f] px-3.5 py-1.5 text-[11px] font-semibold text-white"
                      >
                        Open Project
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 rounded-2xl border border-[#eadcff] bg-[#fbf8ff] p-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <ProjectInput label="Title" value={editForm.title} onChange={(value) => setEditForm((prev) => ({ ...prev, title: value }))} />
                          <ProjectInput label="Project Type" value={editForm.projectType} onChange={(value) => setEditForm((prev) => ({ ...prev, projectType: value }))} />
                          <ProjectInput label="Location" value={editForm.location} onChange={(value) => setEditForm((prev) => ({ ...prev, location: value }))} />
                          <ProjectInput label="Plot Size" value={editForm.plotSize} onChange={(value) => setEditForm((prev) => ({ ...prev, plotSize: value }))} />
                          <ProjectInput label="Facing" value={editForm.facing} onChange={(value) => setEditForm((prev) => ({ ...prev, facing: value }))} />
                          <ProjectInput label="Floors" value={editForm.floors} onChange={(value) => setEditForm((prev) => ({ ...prev, floors: value }))} />
                          <ProjectInput label="Budget" value={editForm.budget} onChange={(value) => setEditForm((prev) => ({ ...prev, budget: value }))} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveProject(item.id)}
                            className="h-9 rounded-xl bg-[#21133f] px-4 text-xs font-semibold text-white"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-9 rounded-xl border border-[#ded5ec] bg-white px-4 text-xs font-semibold text-[#21133f]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.08em] text-[#8b7ca6]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-[#ded5ec] bg-white px-3 text-sm font-bold text-[#21133f] outline-none"
      />
    </label>
  );
}

function ProjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#eee6f8] bg-[#fbf8ff] p-3">
      <p className="text-[11px] font-black uppercase text-[#8b7ca6]">{label}</p>
      <p className="mt-1 text-xl font-black text-[#21133f]">{Number(value || 0).toLocaleString("en-IN")}</p>
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

function NewProjectPage({
  theme,
  setActive,
  setSelectedProject,
}: {
  theme: ResolvedTheme;
  setActive: (id: ViewKey) => void;
  setSelectedProject?: (project: LiveProject | null) => void;
}) {
  const [projectName, setProjectName] = useState("30x40 North Facing House");
  const [projectType, setProjectType] = useState("Residential House");
  const [houseType, setHouseType] = useState("Independent House");
  const [location, setLocation] = useState("Raipur");
  const [width, setWidth] = useState("30");
  const [depth, setDepth] = useState("40");
  const [facing, setFacing] = useState("North");
  const [floors, setFloors] = useState("G+1");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");
  const [budget, setBudget] = useState("30 - 40 Lakh");
  const [style, setStyle] = useState("Modern");
  const [spaces, setSpaces] = useState<string[]>(["Living Room", "Kitchen", "Parking", "Puja Room", "Staircase", "Wash Area"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleSpace(space: string) {
    setSpaces((current) =>
      current.includes(space) ? current.filter((item) => item !== space) : [...current, space],
    );
  }

  const requirement = [
    `Project: ${projectName || "Untitled Project"}`,
    `Type: ${projectType}`,
    `House Type: ${houseType}`,
    `Location: ${location}`,
    `Plot: ${width || "-"} x ${depth || "-"} ft`,
    `Facing: ${facing}`,
    `Floors: ${floors}`,
    `Bedrooms: ${bedrooms}`,
    `Bathrooms: ${bathrooms}`,
    `Budget: ${budget}`,
    `Spaces: ${spaces.join(", ") || "Not selected"}`,
    `Style: ${style}`,
  ].join("\n");

  async function createProjectAndOpenChat() {
    setSaving(true);
    setError("");

    try {
      const title = projectName.trim() || `${width || "30"}x${depth || "40"} ${facing} Facing House`;

      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          title,
          projectType,
          houseType,
          location,
          plotWidth: width,
          plotDepth: depth,
          plotSize: `${width}x${depth}`,
          facing,
          floors,
          bedrooms,
          bathrooms,
          budget,
          style,
          spaces,
          requirement,
          description: requirement,
          status: "ACTIVE",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Project create failed");
      }

      const createdProject = data.project || data.item || data.data || {
        id: data.projectId || data.id,
        title,
        projectType,
        location,
      };

      if (!createdProject?.id) {
        throw new Error("Project created but project id missing");
      }

      try {
        window.localStorage.setItem("buildsetu_active_project", JSON.stringify(createdProject));
      } catch {}

      setSelectedProject?.(createdProject);
      setActive("projectWorkspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project create failed");
    } finally {
      setSaving(false);
    }
  }

  const allSpaces = ["Living Room", "Kitchen", "Dining Room", "Parking", "Puja Room", "Staircase", "Store Room", "Wash Area", "Balcony"];
  const floorsList = ["G", "G+1", "G+2", "G+3"];
  const facingList = ["North", "South", "East", "West"];
  const styleList = ["Modern", "Minimal", "Contemporary", "Traditional", "Luxury"];

  return (
    <div className="bsu-intake-page">
      <div className="bsu-intake-hero">
        <div>
          <p className="bsu-intake-kicker">New Project</p>
          <h1>Create New Project</h1>
          <p>
            Basic project details save karo. Project create hone ke baad Design Brief, Plan,
            Interior, Exterior, BOQ, BBS aur Docs project chat me run honge.
          </p>
        </div>
        <div className="bsu-intake-credit">Project Intake</div>
      </div>

      <div className="bsu-intake-grid">
        <section className="bsu-intake-card">
          <div className="bsu-intake-card-head">
            <div>
              <h2>Project Details</h2>
              <p>Permanent project information yahan save hoga.</p>
            </div>
          </div>

          <div className="bsu-intake-form">
            <label className="bsu-intake-field wide">
              <span>Project Name</span>
              <input className="bsu-intake-input" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>

            <label className="bsu-intake-field">
              <span>Project Type</span>
              <select className="bsu-intake-input" value={projectType} onChange={(event) => setProjectType(event.target.value)}>
                <option>Residential House</option>
                <option>Commercial</option>
                <option>Villa</option>
                <option>Apartment</option>
                <option>Office</option>
              </select>
            </label>

            <label className="bsu-intake-field">
              <span>House Type</span>
              <select className="bsu-intake-input" value={houseType} onChange={(event) => setHouseType(event.target.value)}>
                <option>Independent House</option>
                <option>Duplex</option>
                <option>Villa</option>
                <option>Farm House</option>
                <option>Rental Unit</option>
              </select>
            </label>

            <label className="bsu-intake-field">
              <span>Location</span>
              <input className="bsu-intake-input" value={location} onChange={(event) => setLocation(event.target.value)} />
            </label>

            <div className="bsu-intake-field">
              <span>Plot Size</span>
              <div className="bsu-size-row">
                <input className="bsu-intake-input" value={width} onChange={(event) => setWidth(event.target.value)} placeholder="Width" />
                <b>×</b>
                <input className="bsu-intake-input" value={depth} onChange={(event) => setDepth(event.target.value)} placeholder="Depth" />
              </div>
            </div>

            <div className="bsu-intake-field wide">
              <span>Floors</span>
              <div className="bsu-chip-row">
                {floorsList.map((item) => (
                  <button key={item} type="button" onClick={() => setFloors(item)} className={floors === item ? "bsu-intake-chip selected" : "bsu-intake-chip"}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="bsu-intake-field wide">
              <span>Facing</span>
              <div className="bsu-chip-row">
                {facingList.map((item) => (
                  <button key={item} type="button" onClick={() => setFacing(item)} className={facing === item ? "bsu-intake-chip selected" : "bsu-intake-chip"}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="bsu-intake-field">
              <span>Bedrooms</span>
              <select className="bsu-intake-input" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)}>
                <option>1</option><option>2</option><option>3</option><option>4</option><option>5+</option>
              </select>
            </label>

            <label className="bsu-intake-field">
              <span>Bathrooms</span>
              <select className="bsu-intake-input" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)}>
                <option>1</option><option>2</option><option>3</option><option>4+</option>
              </select>
            </label>

            <label className="bsu-intake-field">
              <span>Budget</span>
              <select className="bsu-intake-input" value={budget} onChange={(event) => setBudget(event.target.value)}>
                <option>Below 20 Lakh</option>
                <option>20 - 30 Lakh</option>
                <option>30 - 40 Lakh</option>
                <option>40 - 60 Lakh</option>
                <option>60 Lakh+</option>
              </select>
            </label>

            <div className="bsu-intake-field wide">
              <span>Rooms & Spaces</span>
              <div className="bsu-space-grid">
                {allSpaces.map((item) => (
                  <button key={item} type="button" onClick={() => toggleSpace(item)} className={spaces.includes(item) ? "bsu-intake-chip selected" : "bsu-intake-chip"}>
                    {spaces.includes(item) ? "✓ " : ""}{item}
                  </button>
                ))}
              </div>
            </div>

            <div className="bsu-intake-field wide">
              <span>Style</span>
              <div className="bsu-chip-row">
                {styleList.map((item) => (
                  <button key={item} type="button" onClick={() => setStyle(item)} className={style === item ? "bsu-intake-chip selected" : "bsu-intake-chip"}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="bsu-intake-field wide">
              <span>Project Requirement</span>
              <textarea className="bsu-intake-textarea" value={requirement} readOnly />
            </label>
          </div>

          {error ? <p className="bsu-intake-error">{error}</p> : null}

          <div className="bsu-intake-actions">
            <button type="button" onClick={createProjectAndOpenChat} disabled={saving} className="bsu-primary-action">
              {saving ? "Creating Project..." : "Create Project & Open Chat"}
            </button>
            <button type="button" className="bsu-secondary-action" onClick={() => {
              setProjectName("");
              setLocation("");
              setWidth("");
              setDepth("");
              setSpaces([]);
            }}>
              Clear
            </button>
          </div>
        </section>

        <aside className="bsu-intake-summary">
          <div className="bsu-summary-card">
            <div className="bsu-summary-head">
              <div>
                <p>Project Summary</p>
                <h2>{projectName || "Untitled Project"}</h2>
              </div>
              <span>Draft</span>
            </div>

            <div className="bsu-summary-preview">
              <p>{requirement}</p>
            </div>

            <div className="bsu-summary-grid">
              <div><span>Project Type</span><strong>{projectType}</strong></div>
              <div><span>House Type</span><strong>{houseType}</strong></div>
              <div><span>Plot Size</span><strong>{width || "-"} ft × {depth || "-"} ft</strong></div>
              <div><span>Facing</span><strong>{facing}</strong></div>
              <div><span>Floors</span><strong>{floors}</strong></div>
              <div><span>Bedrooms</span><strong>{bedrooms}</strong></div>
              <div><span>Bathrooms</span><strong>{bathrooms}</strong></div>
              <div><span>Budget</span><strong>{budget}</strong></div>
              <div className="wide"><span>Spaces</span><strong>{spaces.join(", ") || "Not selected"}</strong></div>
              <div className="wide"><span>Style</span><strong>{style}</strong></div>
            </div>

            <button type="button" onClick={createProjectAndOpenChat} disabled={saving} className="bsu-primary-action full">
              {saving ? "Creating Project..." : "Create Project & Open Chat"}
            </button>

            <p className="bsu-summary-note">Project create hone ke baad sabhi tools project chat ke andar run honge.</p>
          </div>
        </aside>
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating Preview..." : "Generate Preview Image"} <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
          <div className="mb-3 flex items-center justify-between">
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

                  <div className="p-3.5">
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
              <StatusBadge status="Verification Required" theme={theme} />
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
                    <th className="p-3.5">Code</th>
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
  type BbsProject = {
    id: string;
    title: string;
    projectType?: string | null;
    location?: string | null;
  };

  type BbsItem = {
    id?: string;
    memberType?: string | null;
    memberId?: string | null;
    barMark?: string | null;
    diameter?: number | null;
    quantity?: number | null;
    shapeCode?: string | null;
    cuttingLength?: number | null;
    totalLength?: number | null;
    unitWeight?: number | null;
    totalWeight?: number | null;
    drawingRef?: string | null;
    status?: string | null;
    createdAt?: string | null;
  };

  type BbsManualForm = {
    id?: string;
    memberType: string;
    memberId: string;
    barMark: string;
    diameter: string;
    quantity: string;
    shapeCode: string;
    cuttingLength: string;
    drawingRef: string;
    status: string;
  };

  const emptyBbsManualForm: BbsManualForm = {
    memberType: "Column",
    memberId: "",
    barMark: "",
    diameter: "12",
    quantity: "1",
    shapeCode: "Straight",
    cuttingLength: "1",
    drawingRef: "Manual Entry",
    status: "Manual Edit - Engineer Review Required",
  };

  const [projects, setProjects] = useState<BbsProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<BbsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState<BbsManualForm>(emptyBbsManualForm);
  const [openBbsDropdown, setOpenBbsDropdown] = useState<string | null>(null);
  const [bbsSearchQuery, setBbsSearchQuery] = useState("");
  const [bbsDiameterFilter, setBbsDiameterFilter] = useState("All");
  const [bbsMemberFilter, setBbsMemberFilter] = useState("All");
  const [bbsStatusFilter, setBbsStatusFilter] = useState("All");

  const numberFormat = useMemo(() => new Intl.NumberFormat("en-IN"), []);
  const weightFormat = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) || null,
    [projects, projectId],
  );

  function bbsUnitWeight(diameterValue: string | number) {
    const diameter = Number(diameterValue || 0);
    if (!Number.isFinite(diameter) || diameter <= 0) return 0;
    return Number(((diameter * diameter) / 162).toFixed(3));
  }

  function bbsPreviewTotals(form: BbsManualForm) {
    const diameter = Number(form.diameter || 0);
    const quantity = Number(form.quantity || 0);
    const cuttingLength = Number(form.cuttingLength || 0);
    const unitWeight = bbsUnitWeight(diameter);
    const totalLength = Number((quantity * cuttingLength).toFixed(3));
    const totalWeight = Number((totalLength * unitWeight).toFixed(2));

    return {
      diameter,
      quantity,
      cuttingLength,
      unitWeight,
      totalLength,
      totalWeight,
    };
  }

  function updateManualForm(field: keyof BbsManualForm, value: string) {
    setManualForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateManualRow() {
    setManualForm({
      ...emptyBbsManualForm,
      memberId: `M${items.length + 1}`,
      barMark: `MANUAL-${items.length + 1}-${Date.now().toString().slice(-5)}`,
    });
    setManualFormOpen(true);
  }

  function openEditManualRow(item: BbsItem) {
    setManualForm({
      id: item.id,
      memberType: item.memberType || "Column",
      memberId: item.memberId || "",
      barMark: item.barMark || "",
      diameter: String(item.diameter || ""),
      quantity: String(item.quantity || ""),
      shapeCode: item.shapeCode || "Straight",
      cuttingLength: String(item.cuttingLength || ""),
      drawingRef: item.drawingRef || "Manual Entry",
      status: item.status || "Manual Edit - Engineer Review Required",
    });
    setManualFormOpen(true);
  }

  function closeManualForm() {
    setManualFormOpen(false);
    setManualForm(emptyBbsManualForm);
  }

  const bbsMemberTypeOptions = ["Footing", "Column", "Beam", "Slab", "Staircase", "Lintel", "Chajja", "Retaining Wall", "Pile Cap"];
  const bbsDiameterOptions = ["6", "8", "10", "12", "16", "20", "25", "32"];
  const bbsBarsOptions = ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "18", "20", "24", "28", "32", "36", "38", "40", "48", "56", "64", "72", "78", "82", "92"];
  const bbsShapeCodeOptions = ["Straight", "Bent", "L", "U", "Stirrup", "Stirrup/Tie", "Hook"];
  const bbsCuttingLengthOptions = ["0.45", "0.65", "1.00", "1.15", "1.20", "1.44", "3.10", "3.20", "3.40", "3.50", "3.60", "3.80", "4.20", "4.40", "4.60", "4.80", "6.90"];
  const bbsStatusOptions = [
    "Manual Edit - Engineer Review Required",
    "Engineer Input Required",
    "Engineer Review Required",
    "Edited - Engineer Review Required",
    "Approved by Engineer",
    "Hold / Missing Input",
  ];

  function getBbsMemberIdOptions(memberType: string) {
    const key = memberType.toLowerCase();

    if (key.includes("footing")) return ["F1", "F2", "F3", "F4", "F5", "F6"];
    if (key.includes("column")) return ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"];
    if (key.includes("beam")) return ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10"];
    if (key.includes("slab")) return ["S1", "S2", "S3", "S4", "S5", "S6"];
    if (key.includes("stair")) return ["ST1", "ST2", "ST3", "ST4"];
    if (key.includes("lintel")) return ["L1", "L2", "L3", "L4"];
    if (key.includes("chajja")) return ["CH1", "CH2", "CH3", "CH4"];
    if (key.includes("retaining")) return ["RW1", "RW2", "RW3", "RW4"];
    if (key.includes("pile")) return ["PC1", "PC2", "PC3", "PC4"];

    return ["M1", "M2", "M3", "M4"];
  }

  function getBbsDrawingRefOptions(memberType: string) {
    const key = memberType.toLowerCase();

    if (key.includes("footing")) return ["STR-FOOTING-01", "STR-FOOTING-02", "STR-FOUNDATION-01", "Manual Entry"];
    if (key.includes("column")) return ["STR-COLUMN-01", "STR-COLUMN-02", "STR-RCC-01", "Manual Entry"];
    if (key.includes("beam")) return ["STR-BEAM-01", "STR-BEAM-02", "STR-RCC-02", "Manual Entry"];
    if (key.includes("slab")) return ["STR-SLAB-01", "STR-SLAB-02", "STR-RCC-03", "Manual Entry"];
    if (key.includes("stair")) return ["STR-STAIR-01", "STR-STAIR-02", "Manual Entry"];

    return ["STR-RCC-01", "Manual Entry"];
  }

  function updateManualMemberType(memberType: string) {
    const memberIds = getBbsMemberIdOptions(memberType);
    const drawingRefs = getBbsDrawingRefOptions(memberType);

    setManualForm((current) => ({
      ...current,
      memberType,
      memberId: memberIds.includes(current.memberId) ? current.memberId : memberIds[0],
      drawingRef: drawingRefs.includes(current.drawingRef) ? current.drawingRef : drawingRefs[0],
    }));
  }

  function bbsShapeTag(shapeCode: string) {
    const key = shapeCode.toLowerCase();

    if (key.includes("stirrup")) return "STP";
    if (key.includes("tie")) return "TIE";
    if (key === "l") return "L";
    if (key === "u") return "U";
    if (key.includes("bent")) return "BENT";
    if (key.includes("hook")) return "HOOK";

    return "MAIN";
  }

  function applyAutoBarMark() {
    setManualForm((current) => {
      const memberId = current.memberId || getBbsMemberIdOptions(current.memberType)[0] || "M1";
      const diameter = current.diameter || "12";
      const tag = bbsShapeTag(current.shapeCode);
      const suffix = Date.now().toString().slice(-4);

      return {
        ...current,
        barMark: `${memberId}-${tag}-${diameter}-${suffix}`,
      };
    });
  }

  const totalBars = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );

  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0),
    [items],
  );

  const diameterSummary = useMemo(() => {
    const summary = new Map<number, number>();

    for (const item of items) {
      const diameter = Number(item.diameter || 0);
      const weight = Number(item.totalWeight || 0);
      if (!diameter || !Number.isFinite(weight)) continue;
      summary.set(diameter, (summary.get(diameter) || 0) + weight);
    }

    return Array.from(summary.entries())
      .sort(([a], [b]) => a - b)
      .map(([diameter, weight]) => ({ diameter, weight }));
  }, [items]);

  const diameterUsageSummary = useMemo(() => {
    const colorPalette = ["#6d35ff", "#5d9cff", "#63d99c", "#ffac45", "#ff6f91", "#8b5cf6", "#22c55e", "#f97316"];
    const map = new Map<number, { diameter: number; weight: number; bars: number; length: number }>();

    items.forEach((item) => {
      const diameter = Number(item.diameter || 0);
      if (!diameter) return;

      const current = map.get(diameter) || { diameter, weight: 0, bars: 0, length: 0 };
      current.weight = Number((current.weight + Number(item.totalWeight || 0)).toFixed(2));
      current.bars += Number(item.quantity || 0);
      current.length = Number((current.length + Number(item.totalLength || 0)).toFixed(2));
      map.set(diameter, current);
    });

    const total = Array.from(map.values()).reduce((sum, row) => sum + row.weight, 0);

    return Array.from(map.values())
      .sort((a, b) => b.weight - a.weight)
      .map((row, index) => ({
        ...row,
        percent: total ? Number(((row.weight / total) * 100).toFixed(1)) : 0,
        color: colorPalette[index % colorPalette.length],
      }));
  }, [items]);

  const topDiameterUsage = diameterUsageSummary[0] || null;

  const diameterConicGradient = useMemo(() => {
    if (!diameterUsageSummary.length) {
      return "conic-gradient(#efe7ff 0deg 360deg)";
    }

    let startPercent = 0;
    const parts = diameterUsageSummary.map((row) => {
      const endPercent = startPercent + row.percent;
      const segment = `${row.color} ${startPercent}% ${endPercent}%`;
      startPercent = endPercent;
      return segment;
    });

    return `conic-gradient(${parts.join(", ")})`;
  }, [diameterUsageSummary]);

  const memberSummary = useMemo(() => {
    const summary = new Map<string, number>();

    for (const item of items) {
      const memberType = item.memberType || "Unknown";
      const weight = Number(item.totalWeight || 0);
      if (!Number.isFinite(weight)) continue;
      summary.set(memberType, (summary.get(memberType) || 0) + weight);
    }

    return Array.from(summary.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([memberType, weight]) => ({ memberType, weight }));
  }, [items]);

  const selectedColumn = useMemo(() => {
    const columnRows = items.filter((item) => (item.memberType || "").toLowerCase().includes("column"));
    const mainBarItem =
      columnRows.find((item) => (item.barMark || "").toLowerCase().includes("vert")) ||
      columnRows.find((item) => Number(item.diameter || 0) >= 12) ||
      columnRows[0];

    const stirrupItem =
      columnRows.find((item) => (item.shapeCode || "").toLowerCase().includes("stirrup")) ||
      columnRows.find((item) => (item.shapeCode || "").toLowerCase().includes("tie"));

    return {
      id: mainBarItem?.memberId || "C1",
      section: "450 × 450 mm",
      height: "4200 mm",
      mainBars: mainBarItem?.diameter ? `${mainBarItem.quantity || 8}-${mainBarItem.diameter}mm` : "12-16mm",
      stirrups: stirrupItem?.diameter ? `${stirrupItem.diameter}mm @ 150mm` : "8mm @ 150mm",
      cover: "40 mm",
      concrete: "M30",
      steel: "Fe 500D",
      location: selectedProject?.location || "Ground Floor",
      type: mainBarItem?.memberType || "Column",
    };
  }, [items, selectedProject]);

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects/list", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load projects");
      }

      const nextProjects = Array.isArray(data.projects) ? data.projects : [];
      setProjects(nextProjects);

      if (!projectId && nextProjects[0]?.id) {
        setProjectId(nextProjects[0].id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load projects");
    }
  }

  async function loadBbs(nextProjectId: string) {
    if (!nextProjectId) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/bbs/list?projectId=${nextProjectId}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to load BBS");
      }

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      if (nextItems[0]?.createdAt) {
        setLastGeneratedAt(new Date(nextItems[0].createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load BBS data");
    } finally {
      setLoading(false);
    }
  }

  async function generateBbs() {
    if (!projectId) {
      setMessage("Please select a project first.");
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
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

      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      setLastGeneratedAt(
        nextItems[0]?.createdAt
          ? new Date(nextItems[0].createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
          : new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      );
      setMessage(`BBS generated successfully. ${data.count || data.items?.length || 0} items created.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to generate BBS");
    } finally {
      setGenerating(false);
    }
  }

  async function saveManualRow() {
    if (!projectId) {
      setMessage("Please select a project first.");
      return;
    }

    const totals = bbsPreviewTotals(manualForm);

    if (!manualForm.memberType.trim() || !manualForm.memberId.trim() || !manualForm.barMark.trim()) {
      setMessage("Member type, member ID and bar mark are required.");
      return;
    }

    if (!totals.diameter || !totals.quantity || !totals.cuttingLength) {
      setMessage("Diameter, number of bars and cutting length are required.");
      return;
    }

    setManualSaving(true);
    setMessage("");

    try {
      const response = await fetch(manualForm.id ? "/api/bbs/update-row" : "/api/bbs/create-row", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: manualForm.id,
          projectId,
          memberType: manualForm.memberType,
          memberId: manualForm.memberId,
          barMark: manualForm.barMark,
          diameter: totals.diameter,
          quantity: totals.quantity,
          shapeCode: manualForm.shapeCode,
          cuttingLength: totals.cuttingLength,
          drawingRef: manualForm.drawingRef,
          status: manualForm.status,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save BBS row");
      }

      setMessage(manualForm.id ? "BBS row updated successfully." : "Manual BBS row added successfully.");
      closeManualForm();
      await loadBbs(projectId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save BBS row");
    } finally {
      setManualSaving(false);
    }
  }

  async function deleteManualRow(item: BbsItem) {
    if (!item.id) {
      setMessage("BBS row ID missing.");
      return;
    }

    const ok = window.confirm(`Delete BBS row ${item.barMark || item.id}?`);
    if (!ok) return;

    setMessage("");

    try {
      const response = await fetch("/api/bbs/delete-row", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: item.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete BBS row");
      }

      setMessage("BBS row deleted successfully.");
      await loadBbs(projectId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete BBS row");
    }
  }

  function exportCsv() {
    const header = [
      "Mark",
      "Member Type",
      "Member ID",
      "Bar Diameter mm",
      "Shape Code",
      "No of Bars",
      "Cutting Length m",
      "Total Length m",
      "Unit Weight kg/m",
      "Total Weight kg",
      "Drawing Ref",
      "Status",
    ];

    const rows = items.map((item) => [
      item.barMark || "",
      item.memberType || "",
      item.memberId || "",
      item.diameter ?? "",
      item.shapeCode || "",
      item.quantity ?? "",
      item.cuttingLength ?? "",
      item.totalLength ?? "",
      item.unitWeight ?? "",
      item.totalWeight ?? "",
      item.drawingRef || "",
      item.status || "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buildsetu-bbs-${projectId || "draft"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportExcel() {
    if (!filteredBbsItems.length) {
      setMessage("No filtered BBS rows available to export.");
      return;
    }

    try {
      const XLSX = await import("xlsx");

      const rows = filteredBbsItems.map((item, index) => ({
        "S.No": index + 1,
        "Bar Mark": item.barMark || "",
        "Member Type": item.memberType || "",
        "Member ID": item.memberId || "",
        "Diameter (mm)": item.diameter || "",
        "Shape Code": item.shapeCode || "",
        "No. of Bars": item.quantity || "",
        "Cutting Length (m)": item.cuttingLength || "",
        "Total Length (m)": item.totalLength || "",
        "Unit Weight (kg/m)": item.unitWeight || "",
        "Total Weight (kg)": item.totalWeight || "",
        "Drawing Ref": item.drawingRef || "",
        "Status": item.status || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 30 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BBS");
      XLSX.writeFile(workbook, `buildsetu-bbs-${selectedProject?.title || "project"}.xlsx`);

      setMessage("BBS Excel file exported.");
    } catch {
      setMessage("Unable to export Excel file.");
    }
  }

  function shareReport() {
    const text = `BuildSetu AI BBS Report\nProject: ${selectedProject?.title || "Project"}\nTotal Bars: ${totalBars}\nTotal Weight: ${weightFormat.format(totalWeight)} kg\nStatus: Engineer Review Required`;
    navigator.clipboard?.writeText(text);
    setMessage("BBS report summary copied.");
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectId) loadBbs(projectId);
  }, [projectId]);

  const topStats = [
    ["Total Bars", numberFormat.format(totalBars || 0), "▦"],
    ["Total Wt", `${weightFormat.format(totalWeight || 0)} kg`, "♟"],
    ["Concrete Grade", "M30", "⬡"],
    ["Steel Grade", "Fe 500D", "工"],
  ];

  function BbsManualSelect({
    label,
    value,
    options,
    onChange,
    className = "",
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    className?: string;
  }) {
    const dropdownKey = `bbs-${label}`;
    const open = openBbsDropdown === dropdownKey;

    return (
      <label className={className}>
        <span className="text-[10px] font-black uppercase tracking-wide text-[#8d7aa8]">{label}</span>
        <div className="relative mt-1.5">
          <button
            type="button"
            onClick={() => setOpenBbsDropdown(open ? null : dropdownKey)}
            className={`flex h-9 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left text-[12px] font-semibold text-[#21133f] shadow-sm outline-none transition ${
              open
                ? "border-[#6d35ff] ring-4 ring-[#6d35ff]/10"
                : "border-[#e6e0f5] hover:border-[#cbbcff]"
            }`}
          >
            <span className="truncate">{value || "Select"}</span>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-[#f4efff] text-[#6d35ff] transition ${open ? "rotate-180" : ""}`}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          {open ? (
            <div className="absolute left-0 right-0 top-[calc(100%+7px)] z-[120] max-h-60 overflow-auto rounded-2xl border border-[#e6e0f5] bg-white p-1.5 shadow-[0_18px_45px_rgba(33,19,63,0.16)]">
              {options.map((option) => {
                const selected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpenBbsDropdown(null);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[12px] font-bold transition ${
                      selected
                        ? "bg-[#6d35ff] text-white"
                        : "text-[#21133f] hover:bg-[#f6f1ff] hover:text-[#6d35ff]"
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {selected ? <span className="text-[11px]">✓</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </label>
    );
  }


  const bbsMemberFilterOptions = useMemo(() => {
    return ["All", ...Array.from(new Set(items.map((item) => item.memberType || "Other"))).sort()];
  }, [items]);

  const bbsDiameterFilterOptions = useMemo(() => {
    return ["All", ...Array.from(new Set(items.map((item) => Number(item.diameter || 0)).filter(Boolean))).sort((a, b) => a - b).map(String)];
  }, [items]);

  const bbsStatusFilterOptions = useMemo(() => {
    return ["All", ...Array.from(new Set(items.map((item) => item.status || "Review Required"))).sort()];
  }, [items]);

  const filteredBbsItems = useMemo(() => {
    const query = bbsSearchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery = !query || [
        item.barMark,
        item.memberType,
        item.memberId,
        item.shapeCode,
        item.drawingRef,
        item.status,
        item.diameter ? `${item.diameter}mm` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesDiameter = bbsDiameterFilter === "All" || String(item.diameter || "") === bbsDiameterFilter;
      const matchesMember = bbsMemberFilter === "All" || (item.memberType || "Other") === bbsMemberFilter;
      const matchesStatus = bbsStatusFilter === "All" || (item.status || "Review Required") === bbsStatusFilter;

      return matchesQuery && matchesDiameter && matchesMember && matchesStatus;
    });
  }, [bbsDiameterFilter, bbsMemberFilter, bbsSearchQuery, bbsStatusFilter, items]);

  function clearBbsFilters() {
    setBbsSearchQuery("");
    setBbsDiameterFilter("All");
    setBbsMemberFilter("All");
    setBbsStatusFilter("All");
  }

  function exportBbsPdf() {
    const reportRows = filteredBbsItems;

    if (!reportRows.length) {
      setMessage("No BBS rows available to export PDF.");
      return;
    }

    const projectTitle = selectedProject?.title || "BBS Project";
    const generatedOn = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    const tableRows = reportRows
      .map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.barMark || ""}</td>
          <td>${item.memberType || ""} ${item.memberId || ""}</td>
          <td>${item.diameter || ""} mm</td>
          <td>${item.shapeCode || ""}</td>
          <td>${item.quantity || 0}</td>
          <td>${Number(item.cuttingLength || 0).toFixed(2)} m</td>
          <td>${Number(item.totalLength || 0).toFixed(2)} m</td>
          <td>${Number(item.unitWeight || 0).toFixed(3)}</td>
          <td>${weightFormat.format(Number(item.totalWeight || 0))}</td>
          <td>${item.status || "Review Required"}</td>
        </tr>
      `)
      .join("");

    const diameterRows = diameterSummary
      .map((row) => `
        <div class="summary-card">
          <span>${row.diameter} mm</span>
          <strong>${weightFormat.format(row.weight)} kg</strong>
        </div>
      `)
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>BBS Report - ${projectTitle}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #161032;
              font-family: Arial, sans-serif;
            }

            .page {
              padding: 28px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #eee8fb;
              padding-bottom: 18px;
              margin-bottom: 18px;
            }

            .brand {
              font-size: 14px;
              font-weight: 900;
              color: #6d35ff;
              margin-bottom: 8px;
            }

            h1 {
              margin: 0;
              font-size: 28px;
              line-height: 1.15;
            }

            .muted {
              color: #766a90;
              font-size: 12px;
              line-height: 1.55;
            }

            .meta {
              text-align: right;
              font-size: 12px;
              line-height: 1.7;
            }

            .stats {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 18px 0;
            }

            .stat {
              border: 1px solid #eee8fb;
              border-radius: 14px;
              padding: 12px;
              background: #fbfaff;
            }

            .stat span {
              display: block;
              color: #817397;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .stat strong {
              display: block;
              margin-top: 5px;
              font-size: 15px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 14px;
              font-size: 10px;
            }

            th {
              background: #f5f1ff;
              color: #6d35ff;
              text-align: left;
              font-weight: 900;
              border: 1px solid #e7ddff;
              padding: 8px;
            }

            td {
              border: 1px solid #eee8fb;
              padding: 7px;
              vertical-align: top;
              font-weight: 700;
            }

            .summary {
              margin-top: 18px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
            }

            .summary-card {
              border: 1px solid #eee8fb;
              background: #fbfaff;
              border-radius: 14px;
              padding: 10px;
              font-size: 11px;
            }

            .summary-card span {
              display: block;
              color: #817397;
              font-weight: 900;
            }

            .summary-card strong {
              display: block;
              margin-top: 4px;
            }

            .note {
              margin-top: 18px;
              border: 1px solid #f5d89d;
              background: #fffaf0;
              border-radius: 14px;
              padding: 12px;
              color: #9a6412;
              font-size: 11px;
              line-height: 1.6;
              font-weight: 700;
            }

            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            @media print {
              .page {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <div class="brand">BuildSetu AI</div>
                <h1>Bar Bending Schedule Report</h1>
                <p class="muted">Project-wise reinforcement schedule generated for engineer review.</p>
              </div>
              <div class="meta">
                <strong>${projectTitle}</strong><br/>
                Generated: ${generatedOn}<br/>
                Status: Engineer Review Required
              </div>
            </div>

            <div class="stats">
              <div class="stat"><span>Total Bars</span><strong>${numberFormat.format(totalBars || 0)}</strong></div>
              <div class="stat"><span>Total Weight</span><strong>${weightFormat.format(totalWeight || 0)} kg</strong></div>
              <div class="stat"><span>Concrete Grade</span><strong>M30</strong></div>
              <div class="stat"><span>Steel Grade</span><strong>Fe 500D</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Bar Mark</th>
                  <th>Member</th>
                  <th>Dia</th>
                  <th>Shape</th>
                  <th>Bars</th>
                  <th>Cut Length</th>
                  <th>Total Length</th>
                  <th>Unit Wt</th>
                  <th>Total Wt</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>

            <h3>Diameter-wise Steel Summary</h3>
            <div class="summary">${diameterRows || '<div class="summary-card"><span>No summary</span><strong>—</strong></div>'}</div>

            <div class="note">
              This is an AI-generated BBS draft for planning and discussion only. Final reinforcement, cutting length, bend deduction, lap length, development length, steel cutting, billing and site execution must be verified by a qualified structural engineer.
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      setMessage("Popup blocked. Allow popups to export PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <div className="max-w-full overflow-x-hidden space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <PageTitle
          title="BBS Generator"
          desc="Generate detailed Bar Bending Schedules from structural drawings with engineer review controls."
          theme={theme}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-11 min-w-[240px] rounded-2xl border border-[#e6e0f5] bg-white px-4 text-sm font-semibold text-[#21133f] shadow-sm outline-none focus:border-[#6d35ff]"
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>

          <button className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-[#e6e0f5] bg-white px-5 text-sm font-bold text-[#21133f] shadow-sm hover:bg-[#f8f5ff]">
            <span>⇧</span>
            Import Drawings
          </button>

          <button
            onClick={openCreateManualRow}
            disabled={!projectId}
            className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-[#d7ccff] bg-[#fbf8ff] px-5 text-sm font-bold text-[#6d35ff] shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>＋</span>
            Add Manual Row
          </button>

          <button
            onClick={generateBbs}
            disabled={generating || !projectId}
            className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-r from-[#6d35ff] to-[#3b1fb5] px-6 text-sm font-bold text-white shadow-lg shadow-[#6d35ff]/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>✦</span>
            {generating ? "Generating..." : "Generate BBS"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[#e7ddff] bg-[#fbf8ff] px-5 py-3 text-sm font-semibold text-[#4b2a91]">
          {message}
        </div>
      ) : null}

      {manualFormOpen ? (
        <section className="rounded-[22px] border border-[#ddd2ff] bg-white p-4 shadow-[0_10px_26px_rgba(33,19,63,0.06)]">
          <div className="flex flex-col gap-1">
            <div>
              <h2 className="text-lg font-black text-[#161032]">
                {manualForm.id ? "Edit BBS Row" : "Add Manual BBS Row"}
              </h2>
              <p className="mt-1 text-[11px] font-medium text-[#817397]">
                Enter reinforcement data manually. Total length and steel weight auto-calculate before saving.
              </p>
            </div>

          </div>

          <div className="mt-3 rounded-[18px] border border-[#eee8fb] bg-[#fbfaff] p-3">
            <div className="grid gap-2.5 md:grid-cols-3 xl:grid-cols-6">
              <BbsManualSelect
                label="Member Type"
                value={manualForm.memberType}
                options={bbsMemberTypeOptions}
                onChange={updateManualMemberType}
              />

              <BbsManualSelect
                label="Member ID"
                value={manualForm.memberId}
                options={getBbsMemberIdOptions(manualForm.memberType)}
                onChange={(value) => updateManualForm("memberId", value)}
              />

              <label className="xl:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#8d7aa8]">Bar Mark</span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    value={manualForm.barMark}
                    onChange={(event) => updateManualForm("barMark", event.target.value)}
                    placeholder="C1-MAIN-16-01"
                    className="h-9 min-w-0 flex-1 rounded-xl border border-[#e6e0f5] bg-white px-3 text-[12px] font-semibold text-[#21133f] shadow-sm outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
                  />
                  <button
                    type="button"
                    onClick={applyAutoBarMark}
                    className="h-9 whitespace-nowrap rounded-xl border border-[#d7ccff] bg-white px-3 text-[11px] font-black text-[#6d35ff] shadow-sm hover:bg-[#f6f1ff]"
                  >
                    Auto
                  </button>
                </div>
              </label>

              <BbsManualSelect
                label="Diameter mm"
                value={`${manualForm.diameter} mm`}
                options={bbsDiameterOptions.map((option) => `${option} mm`)}
                onChange={(value) => updateManualForm("diameter", value.replace(" mm", ""))}
              />

              <BbsManualSelect
                label="Bars"
                value={manualForm.quantity}
                options={bbsBarsOptions}
                onChange={(value) => updateManualForm("quantity", value)}
              />

              <BbsManualSelect
                label="Shape Code"
                value={manualForm.shapeCode}
                options={bbsShapeCodeOptions}
                onChange={(value) => updateManualForm("shapeCode", value)}
              />

              <BbsManualSelect
                label="Cutting Length m"
                value={`${manualForm.cuttingLength} m`}
                options={bbsCuttingLengthOptions.map((option) => `${option} m`)}
                onChange={(value) => updateManualForm("cuttingLength", value.replace(" m", ""))}
              />

              <BbsManualSelect
                label="Drawing Ref"
                value={manualForm.drawingRef}
                options={getBbsDrawingRefOptions(manualForm.memberType)}
                onChange={(value) => updateManualForm("drawingRef", value)}
              />

              <BbsManualSelect
                label="Status"
                value={manualForm.status}
                options={bbsStatusOptions}
                onChange={(value) => updateManualForm("status", value)}
                className="xl:col-span-2"
              />
            </div>

            <div className="mt-3 grid gap-2.5 md:grid-cols-4">
              {[
                ["Total Len", `${bbsPreviewTotals(manualForm).totalLength.toFixed(3)} m`],
                ["Unit Wt", `${bbsPreviewTotals(manualForm).unitWeight.toFixed(3)} kg/m`],
                ["Total Wt", `${bbsPreviewTotals(manualForm).totalWeight.toFixed(2)} kg`],
                ["Formula", "d²/162"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#eee8fb] bg-white px-3 py-2 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#8d7aa8]">{label}</p>
                  <p className="mt-0.5 text-[12px] font-black text-[#21133f]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={closeManualForm}
              className="rounded-xl border border-[#eee8fb] bg-white px-5 py-2 text-[12px] font-black text-[#817397] shadow-sm hover:bg-[#f8f5ff]"
            >
              Cancel
            </button>
            <button
              onClick={saveManualRow}
              disabled={manualSaving}
              className="rounded-xl bg-gradient-to-r from-[#21133f] to-[#6d35ff] px-6 py-2 text-[12px] font-black text-white shadow-lg shadow-[#6d35ff]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {manualSaving ? "Saving..." : manualForm.id ? "Save Changes" : "Add Row"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_410px] 2xl:grid-cols-[minmax(0,1fr)_450px]">
        <section className="min-w-0 self-start rounded-[24px] border border-[#ece8f8] bg-white p-4 shadow-[0_8px_24px_rgba(33,19,63,0.055)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-[#161032]">Bar Bending Schedule</h2>
              <p className="mt-1 text-[11px] font-medium text-[#817397]">
                Project-wise member schedule, cutting length and steel quantity.
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#f3edff] px-3 py-1 text-xs font-bold text-[#6d35ff]">
              Engineer Review Required
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {topStats.map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-[#eee8fb] bg-[#fbfaff] p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe7ff] text-lg text-[#6d35ff]">
                    {icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8d7aa8]">{label}</p>
                    <p className="mt-1 text-sm font-black text-[#161032]">{value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#eee8fb] bg-[#fbfaff] px-4 py-3">
            <p className="text-[11px] font-bold text-[#817397]">
              Scroll horizontally to view status, drawing reference and edit actions.
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#6d35ff]">
              {filteredBbsItems.length} rows
            </span>
          </div>

          <div className="mt-3 grid gap-2 rounded-2xl border border-[#eee8fb] bg-[#fbfaff] p-3 md:grid-cols-[minmax(0,1fr)_150px_150px_170px_88px]">
            <input
              value={bbsSearchQuery}
              onChange={(event) => setBbsSearchQuery(event.target.value)}
              placeholder="Search mark, member, shape, drawing ref..."
              className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none transition focus:border-[#6d35ff] focus:ring-4 focus:ring-[#6d35ff]/10"
            />

            <select
              value={bbsDiameterFilter}
              onChange={(event) => setBbsDiameterFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none"
            >
              {bbsDiameterFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All Dia" : `${option} mm`}
                </option>
              ))}
            </select>

            <select
              value={bbsMemberFilter}
              onChange={(event) => setBbsMemberFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none"
            >
              {bbsMemberFilterOptions.map((option) => (
                <option key={option} value={option}>{option === "All" ? "All Members" : option}</option>
              ))}
            </select>

            <select
              value={bbsStatusFilter}
              onChange={(event) => setBbsStatusFilter(event.target.value)}
              className="h-10 rounded-xl border border-[#e6e0f5] bg-white px-3 text-xs font-bold text-[#21133f] outline-none"
            >
              {bbsStatusFilterOptions.map((option) => (
                <option key={option} value={option}>{option === "All" ? "All Status" : option}</option>
              ))}
            </select>

            <button
              onClick={clearBbsFilters}
              className="h-10 rounded-xl border border-[#e4d9ff] bg-white px-3 text-xs font-black text-[#6d35ff] hover:bg-[#f4efff]"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-[#eee8fb] bg-white">
            <div className="max-h-[500px] overflow-auto overscroll-contain">
              <table className="min-w-[1040px] w-full table-fixed border-collapse bg-white text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#f5f1ff] text-[#6d35ff]">
                  <tr>
                    {[
                      "Mark",
                      "Diameter",
                      "Shape Code",
                      "Bars",
                      "Cut Length",
                      "Total Len",
                      "Unit Wt",
                      "Total Wt",
                      "Status",
                      "Actions",
                    ].map((head) => (
                      <th key={head} className="border-b border-[#e7ddff] px-3 py-2.5 font-black first:w-[145px]">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center font-semibold text-[#817397]">
                        Loading BBS...
                      </td>
                    </tr>
                  ) : filteredBbsItems.length ? (
                    filteredBbsItems.map((item, index) => (
                      <tr key={item.id || `${item.barMark}-${index}`} className="border-b border-[#f0edf7] hover:bg-[#fbfaff]">
                        <td className="break-words px-3 py-2.5 font-black text-[#21133f]">{item.barMark || `BBS-${index + 1}`}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#21133f]">{item.diameter || "-"} mm</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex min-w-[46px] items-center justify-center rounded-lg border border-[#e7ddff] bg-white px-2 py-1 font-bold text-[#4b2a91]">
                            {item.shapeCode || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-[#21133f]">{item.quantity || 0}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#21133f]">{Number(item.cuttingLength || 0).toFixed(2)} m</td>
                        <td className="px-3 py-2.5 font-semibold text-[#21133f]">{Number(item.totalLength || 0).toFixed(2)} m</td>
                        <td className="px-3 py-2.5 font-semibold text-[#21133f]">{Number(item.unitWeight || 0).toFixed(3)}</td>
                        <td className="px-3 py-3 font-black text-[#21133f]">{weightFormat.format(Number(item.totalWeight || 0))}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-[#fff7e8] px-3 py-1 text-[11px] font-black text-[#9a6412]">
                            {item.status || "Review Required"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditManualRow(item)}
                              className="rounded-xl border border-[#d7ccff] bg-[#fbf8ff] px-3 py-1.5 text-[11px] font-black text-[#6d35ff]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteManualRow(item)}
                              className="rounded-xl border border-[#ffd7d7] bg-[#fff8f8] px-3 py-1.5 text-[11px] font-black text-[#df3d3d]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center">
                        <p className="text-[13px] font-black text-[#21133f]">No BBS generated yet</p>
                        <p className="mt-1 text-[11px] font-medium text-[#817397]">
                          Project select karke Generate BBS button click karo.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              onClick={exportExcel}
              disabled={!items.length}
              className="rounded-2xl border border-[#d9f2e3] bg-[#f6fff9] px-4 py-3 text-sm font-black text-[#0f8a45] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ▣ Export BBS CSV
            </button>
            <button
              onClick={exportBbsPdf}
              disabled={!items.length}
              className="rounded-2xl border border-[#ffe0e0] bg-[#fff8f8] px-4 py-3 text-sm font-black text-[#df3d3d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ◇ Export BBS PDF
            </button>
            <button
              onClick={shareReport}
              disabled={!items.length}
              className="rounded-2xl border border-[#e4dcff] bg-[#fbf8ff] px-4 py-3 text-sm font-black text-[#6d35ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↗ Share Report
            </button>
          </div>
        </section>

        <section className="min-w-0 self-start rounded-[24px] border border-[#ece8f8] bg-white p-4 shadow-[0_8px_24px_rgba(33,19,63,0.055)]">
          <div className="grid gap-4">
            


            
            <div className="mb-4 rounded-[24px] border border-[#ece8f8] bg-white p-4 shadow-[0_10px_28px_rgba(33,19,63,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#161032]">Dia-wise Steel Usage</h3>
                  <p className="mt-1 text-[11px] font-medium text-[#817397]">
                    Shows which bar diameter is used most in this BBS.
                  </p>
                </div>
                <span className="rounded-full bg-[#f3edff] px-3 py-1 text-[10px] font-black text-[#6d35ff]">
                  Usage
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[145px_1fr]">
                <div className="relative mx-auto grid h-[145px] w-[145px] place-items-center rounded-full" style={{ background: diameterConicGradient }}>
                  <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white shadow-inner">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-[#817397]">Most Used</p>
                      <p className="mt-1 text-lg font-black text-[#161032]">
                        {topDiameterUsage ? `${topDiameterUsage.diameter} mm` : "—"}
                      </p>
                      <p className="text-[10px] font-bold text-[#817397]">
                        {topDiameterUsage ? `${topDiameterUsage.percent}%` : "No data"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {diameterUsageSummary.length ? (
                    diameterUsageSummary.slice(0, 5).map((row) => (
                      <div key={row.diameter} className="grid grid-cols-[18px_1fr_58px_76px] items-center gap-2 text-[11px]">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="font-bold text-[#5f5471]">{row.diameter} mm bar</span>
                        <span className="text-right font-black text-[#817397]">{row.percent}%</span>
                        <span className="text-right font-black text-[#21133f]">{weightFormat.format(row.weight)} kg</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-[#eee8fb] bg-[#fbfaff] p-4 text-[11px] font-bold text-[#817397]">
                      Generate BBS to see dia-wise steel usage.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Top Dia", topDiameterUsage ? `${topDiameterUsage.diameter} mm` : "—"],
                  ["Bars", topDiameterUsage ? numberFormat.format(topDiameterUsage.bars) : "—"],
                  ["Length", topDiameterUsage ? `${weightFormat.format(topDiameterUsage.length)} m` : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#fbfaff] px-3 py-2">
                    <p className="text-[10px] font-bold text-[#817397]">{label}</p>
                    <p className="mt-0.5 text-[12px] font-black text-[#21133f]">{value}</p>
                  </div>
                ))}
              </div>
            </div>

<Bbs3DViewer column={selectedColumn} totalBars={totalBars} totalWeight={totalWeight} />





          </div>
        </section>
      </div>

      <section className="rounded-[22px] border border-[#e7ddff] bg-white p-4 shadow-[0_10px_26px_rgba(33,19,63,0.05)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-[#6d35ff]">Column {selectedColumn.id}</h3>
            <p className="mt-1 text-[11px] font-medium text-[#817397]">
              Selected reinforcement member details for review and drawing verification.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#f3edff] px-3 py-1 text-[11px] font-black text-[#6d35ff]">
            Detail Panel
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            ["Section", selectedColumn.section],
            ["Height", selectedColumn.height],
            ["Main Bars", selectedColumn.mainBars],
            ["Stirrups", selectedColumn.stirrups],
            ["Cover", selectedColumn.cover],
            ["Concrete Grade", selectedColumn.concrete],
            ["Steel Grade", selectedColumn.steel],
            ["Location", selectedColumn.location],
            ["Element Type", selectedColumn.type],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#f0edf7] bg-[#fbfaff] px-3 py-2.5 text-xs">
              <span className="block font-bold text-[#817397]">{label}</span>
              <span className="mt-1 block font-black text-[#21133f]">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
          <button className="rounded-2xl border border-[#d7ccff] bg-[#fbf8ff] px-4 py-3 text-xs font-black text-[#6d35ff]">
            ↗ View in Drawing
          </button>

          <div className="rounded-2xl border border-[#ffe3b3] bg-[#fffaf0] p-3">
            <p className="text-xs font-black text-[#9a6412]">Review Gate</p>
            <p className="mt-1 text-[11px] leading-5 text-[#9a6412]">
              Cutting length, bend deduction, lap length and development length must be checked by a structural engineer.
            </p>
          </div>
        </div>
      </section>


      <section className="rounded-[22px] border border-[#e7ddff] bg-white p-4 shadow-[0_8px_20px_rgba(33,19,63,0.045)]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#48bd70] text-xl font-black text-white">
              ✓
            </div>
            <div>
              <p className="text-sm font-black text-[#188a46]">
                {items.length ? "BBS Generated Successfully" : "BBS Ready to Generate"}
              </p>
              <p className="mt-1 text-[11px] font-medium leading-5 text-[#817397]">
                {items.length
                  ? "Your Bar Bending Schedule has been generated with review status."
                  : "Select project and generate a professional BBS draft."}
              </p>
            </div>
          </div>

          {[
            ["▥", numberFormat.format(totalBars || 0), "Total Bars"],
            ["♟", `${weightFormat.format(totalWeight || 0)} kg`, "Total Weight"],
            ["◎", items.length ? "Review" : "Pending", "Accuracy Gate"],
            ["◷", lastGeneratedAt || "Not generated", "Generated On"],
          ].map(([icon, value, label]) => (
            <div key={label} className="flex items-center gap-3 border-l border-[#e5ddfb] pl-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#efe7ff] text-lg text-[#6d35ff]">
                {icon}
              </div>
              <div>
                <p className="text-base font-black text-[#21133f]">{value}</p>
                <p className="text-[11px] font-bold text-[#817397]">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#eee8fb] bg-white p-3">
            <h3 className="text-[13px] font-black text-[#21133f]">Diameter-wise Steel Summary</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {diameterSummary.length ? (
                diameterSummary.map((row) => (
                  <div key={row.diameter} className="rounded-xl bg-[#f8f5ff] px-3 py-2.5">
                    <p className="text-[11px] font-bold text-[#817397]">{row.diameter} mm</p>
                    <p className="mt-0.5 text-[12px] font-black text-[#21133f]">{weightFormat.format(row.weight)} kg</p>
                  </div>
                ))
              ) : (
                <p className="text-xs font-semibold text-[#817397]">No summary yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#eee8fb] bg-white p-3">
            <h3 className="text-[13px] font-black text-[#21133f]">Member-wise Steel Summary</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {memberSummary.length ? (
                memberSummary.map((row) => (
                  <div key={row.memberType} className="rounded-xl bg-[#f8f5ff] px-3 py-2.5">
                    <p className="text-[11px] font-bold text-[#817397]">{row.memberType}</p>
                    <p className="mt-0.5 text-[12px] font-black text-[#21133f]">{weightFormat.format(row.weight)} kg</p>
                  </div>
                ))
              ) : (
                <p className="text-xs font-semibold text-[#817397]">No summary yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-[#ffe3b3] bg-[#fffaf0] px-5 py-4 text-sm font-semibold leading-6 text-[#8a5a0a]">
        This is an AI-generated BBS draft for planning and discussion only. Final reinforcement, cutting length,
        bend deduction, lap length, development length, steel cutting, billing and site execution must be verified
        by a qualified structural engineer.
      </div>
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
          ["Structural Verification Package", "Plan, grid, column/beam/slab draft, checklist.", ShieldCheck],
        ].map(([title, desc, Icon]) => (
          <div key={title as string} className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
            <Icon className="h-7 w-7 text-[#8b5cf6]" />
            <h3 className={cn("mt-4 font-medium", false ? "text-white" : "text-[#21133f]")}>{title as string}</h3>
            <p className={cn("mt-2 text-sm leading-6", false ? "text-slate-400" : "text-[#817397]")}>{desc as string}</p>
            <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-3 text-sm font-medium text-white">
              Generate PDF <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificationPage({ theme }: { theme: ResolvedTheme }) {
  return (
    <div>
      <PageTitle title="Verifications" desc="Professional review workflow for BOQ, BBS, drawings and structural drafts." theme={theme} />
      <section className={cn("rounded-2xl border p-5", false ? "border-white/10 bg-white/[0.035]" : "border-[#ded5ec] bg-white light-card-shadow")}>
        <div className="grid gap-4 md:grid-cols-4">
          {["AI Draft", "Under Verification", "Changes Required", "Approved"].map((step, index) => (
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
        ["Output", selectedAgreement.deliverables],
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
                      <p className="mt-0.5 text-[11px] text-[#817397]">
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
                    <p className="mt-0.5 text-[11px] text-[#817397]">
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
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white">
              Generate API Key <Code2 className="h-4 w-4" />
            </button>
            <button className={cn("inline-flex w-full items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium", false ? "border-white/10 bg-white/[0.04] text-white" : "border-[#ded5ec] bg-[#fbf8ff] text-[#6f1cc4]")}>
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



function ProjectWorkspaceShell({
  project,
  setActive,
  theme,
}: {
  project: LiveProject | null;
  setActive: (id: ViewKey) => void;
  theme: ResolvedTheme;
}) {
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "drawings" | "boq" | "files">("overview");

  if (!project) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#ded5ec] bg-[#fbf8ff] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0dcff] text-[#6f1cc4]">
          <FolderKanban className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#21133f]">No project selected</h1>
        <p className="mt-2 text-sm text-[#817397]">
          Projects section se project open karo. Uske baad drawing package, BOQ, BBS aur reports project-wise dikhenge.
        </p>
        <button
          onClick={() => setActive("projects")}
          className="mt-5 rounded-xl bg-[#21133f] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  const item = project as any;
  const count = item._count || {};
  const status = String(item.status || "AI_DRAFT").replaceAll("_", " ");
  const projectTitle = item.title || "Untitled Project";

  const meta = [
    ["Type", item.projectType || "Not set"],
    ["Location", item.location || "Not set"],
    ["Plot", item.plotSize || "Not set"],
    ["Facing", item.facing || "Not set"],
    ["Floors", item.floors || "Not set"],
    ["Budget", item.budget || "Not set"],
  ];

  const drawingPackages = [
    ["Floor Plan", "Room dimensions, wall thickness, doors/windows", FolderKanban],
    ["Working Plan", "Centerline, levels, site notes, construction references", Ruler],
    ["Electrical Plan", "Switches, lights, power points, DB location", Lightbulb],
    ["Plumbing Plan", "Water line, drainage, shaft, slope notes", Layers3],
    ["Structure Plan", "Column, beam, slab, footing draft; engineer review", ShieldCheck],
    ["Elevation / Exterior", "Front elevation, heights, facade material notes", ImageIcon],
    ["Interior Package", "Room-wise furniture, ceiling, wall elevation, finishes", Sparkles],
    ["Vastu Layout", "Direction, entry, room placement, practical correction", CheckCircle2],
  ] as const;

  const outputStats = [
    ["Renders", count.renders || 0, ImageIcon],
    ["BOQ Items", count.boqItems || 0, Calculator],
    ["BBS Items", count.bbsItems || 0, ClipboardList],
    ["Docs", count.agreements || 0, FileText],
  ] as const;

  const tabs = [
    ["overview", "Overview"],
    ["drawings", "Drawing Package"],
    ["boq", "BOQ / BBS"],
    ["files", "Files / Reports"],
  ] as const;

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button
              onClick={() => setActive("projects")}
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#6f1cc4]"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to Projects
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[26px] font-bold leading-tight tracking-[-0.045em] text-[#21133f]">
                {projectTitle}
              </h1>
              <span className="rounded-full bg-[#f0dcff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6f1cc4]">
                {status}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                Site-ready workspace
              </span>
            </div>

            <p className="mt-2 text-sm text-[#817397]">
              Dimensioned plans, working drawings, BOQ, BBS, reports and client files under one project.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setWorkspaceTab("drawings")}
              className="rounded-xl border border-[#ded5ec] bg-white px-4 py-2 text-xs font-semibold text-[#5d5077] hover:bg-[#f7f0ff]"
            >
              Drawing Package
            </button>
            <button
              onClick={() => setActive("boq")}
              className="rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white"
            >
              Generate BOQ
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {meta.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a88b3]">{label}</p>
              <p className="mt-1 truncate text-xs font-semibold text-[#21133f]">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {outputStats.map(([label, value, Icon]) => (
          <article key={label} className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0dcff] text-[#6f1cc4]">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#817397]">{label}</p>
                <p className="mt-1 text-[20px] font-bold leading-none text-[#21133f]">{value}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[22px] border border-[#ded5ec] bg-white p-3 light-card-shadow">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setWorkspaceTab(id)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                workspaceTab === id
                  ? "bg-[#21133f] text-white"
                  : "border border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#f7f0ff]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {workspaceTab === "overview" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">Site-ready checklist</h2>
            <p className="mt-1 text-xs text-[#817397]">
              Drawing output me ye details mandatory honi chahiye taki mistrī/site team drawing dekh ke kaam kar sake.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Scale + unit",
                "North direction",
                "Overall dimensions",
                "Room dimensions",
                "Wall thickness",
                "Door/window schedule",
                "Level marks",
                "Drawing number + revision",
              ].map((check) => (
                <div key={check} className="flex items-center gap-2 rounded-xl border border-[#eee7f7] bg-[#fbf8ff] px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6f1cc4]" />
                  <span className="text-xs font-semibold text-[#5d5077]">{check}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">Project flow</h2>
            <div className="mt-4 space-y-3">
              {[
                ["01", "Brief + requirements", "Plot, facing, rooms, budget, vastu"],
                ["02", "Dimensioned drawings", "Plan, electrical, plumbing, elevation"],
                ["03", "BOQ + BBS", "Quantities, rates, steel draft"],
                ["04", "Verification + export", "Engineer/client review and PDFs"],
              ].map(([step, title, desc]) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f0dcff] text-xs font-bold text-[#6f1cc4]">{step}</span>
                  <div>
                    <p className="text-xs font-bold text-[#21133f]">{title}</p>
                    <p className="mt-0.5 text-[11px] text-[#817397]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {workspaceTab === "drawings" ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {drawingPackages.map(([title, desc, Icon]) => (
            <article key={title} className="rounded-[20px] border border-[#ded5ec] bg-white p-4 light-card-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f0dcff] text-[#6f1cc4]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                  AI Draft
                </span>
              </div>

              <h3 className="mt-3 text-sm font-bold text-[#21133f]">{title}</h3>
              <p className="mt-1 min-h-[34px] text-[11px] leading-snug text-[#817397]">{desc}</p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[#fbf8ff] px-2 py-2">
                  <p className="text-[10px] text-[#9a88b3]">Scale</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#21133f]">1:50 / 1:100</p>
                </div>
                <div className="rounded-xl bg-[#fbf8ff] px-2 py-2">
                  <p className="text-[10px] text-[#9a88b3]">Unit</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#21133f]">ft-inch / mm</p>
                </div>
              </div>

              <button
                onClick={() => setActive("tools")}
                className="mt-4 w-full rounded-xl border border-[#8b5cf6] px-3 py-2 text-xs font-semibold text-[#6f1cc4] hover:bg-[#f7f0ff]"
              >
                Generate / Edit
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {workspaceTab === "boq" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">BOQ Package</h2>
            <p className="mt-1 text-xs text-[#817397]">Drawing reference ke saath civil, interior, electrical, plumbing quantities.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Civil BOQ", "Interior BOQ", "Electrical BOQ", "Plumbing BOQ"].map((item) => (
                <div key={item} className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3 text-xs font-semibold text-[#5d5077]">
                  {item}
                </div>
              ))}
            </div>
            <button onClick={() => setActive("boq")} className="mt-4 rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">
              Open BOQ Tool
            </button>
          </div>

          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">BBS Package</h2>
            <p className="mt-1 text-xs text-[#817397]">Structure drawing ke base par steel schedule draft. Final engineer review required.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Footing BBS", "Column BBS", "Beam BBS", "Slab BBS"].map((item) => (
                <div key={item} className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3 text-xs font-semibold text-[#5d5077]">
                  {item}
                </div>
              ))}
            </div>
            <button onClick={() => setActive("bbs")} className="mt-4 rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">
              Open BBS Tool
            </button>
          </div>
        </section>
      ) : null}

      {workspaceTab === "files" ? (
        <section className="rounded-[22px] border border-dashed border-[#ded5ec] bg-[#fbf8ff] p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#6f1cc4]" />
          <h2 className="mt-3 text-base font-bold text-[#21133f]">Files and reports</h2>
          <p className="mt-1 text-xs text-[#817397]">
            Yaha project PDFs, reports, agreement, exported drawings aur uploaded reference files save honge.
          </p>
          <button onClick={() => setActive("exports")} className="mt-4 rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">
            Open Reports
          </button>
        </section>
      ) : null}
    </div>
  );
}



type BuildSetuProjectTask = {
  id: string;
  title: string;
  category: string;
  toolName: string;
  view: ViewKey;
  outputFormat: string;
  dimensionRule: string;
  requiredInputs: string[];
  deliverables: string[];
  scale: string;
  unit: string;
  review: string;
};

const buildSetuTaskGroups: Record<string, string[]> = {
  Architectural: [
    "Site Plan",
    "Location Plan",
    "Floor Plan",
    "Furniture Layout Plan",
    "Working Plan",
    "Dimension Plan",
    "Door-Window Plan",
    "Door-Window Schedule",
    "Wall Layout Plan",
    "Partition Plan",
    "Staircase Plan",
    "Section Plan",
    "Elevation Plan",
    "Terrace Plan",
    "Roof Plan",
    "Parking Plan",
    "Landscape Plan",
    "Vastu Layout Plan",
  ],
  Structural: [
    "Structural Input Checklist",
    "Soil Report / SBC Entry",
    "Structural Grid Plan",
    "Column Layout Plan",
    "Footing Layout Plan",
    "Foundation Plan",
    "Plinth Beam Plan",
    "Ground Floor Beam Layout",
    "First Floor Beam Layout",
    "Roof Beam Layout",
    "Slab Layout Plan",
    "Roof Slab Plan",
    "Staircase Structural Plan",
    "Lintel / Chajja Detail",
    "RCC Detail Drawing",
    "Reinforcement Detail",
    "Column Schedule",
    "Beam Schedule",
    "Slab Schedule",
    "Footing Schedule",
    "BBS Drawing",
    "Steel Weight Summary",
    "Structural BOQ",
    "Engineer Verification Sheet",
    "Site-ready Structural Drawing Set",
  ],
  Electrical: [
    "Electrical Point Layout",
    "Lighting Layout",
    "Switchboard Layout",
    "Power Point Layout",
    "AC Point Layout",
    "DB / Meter Panel Layout",
    "Wiring Route Plan",
    "CCTV / Data / Internet Layout",
  ],
  Plumbing: [
    "Water Supply Plan",
    "Drainage Plan",
    "Toilet Plumbing Plan",
    "Kitchen Plumbing Plan",
    "Sewer Line Plan",
    "Rainwater Harvesting Plan",
    "Tank / Pump Line Plan",
    "Plumbing Shaft Plan",
  ],
  Interior: [
    "Room-wise Interior Layout",
    "Living Room Design",
    "Dining Area Design",
    "Kitchen Design",
    "Master Bedroom Design",
    "Kids Bedroom Design",
    "Guest Bedroom Design",
    "Pooja Room Design",
    "Home Office / Study Design",
    "Bathroom Design",
    "TV Unit Detail",
    "Wardrobe Detail",
    "Bed Back Panel Detail",
    "Study Table Detail",
    "Dressing Unit Detail",
    "Modular Kitchen Detail",
    "False Ceiling Plan",
    "Ceiling Level Detail",
    "Cove Lighting Detail",
    "Wall Elevation Drawing",
    "Flooring / Tile Layout Plan",
    "Material Finish Schedule",
    "Interior Electrical Coordination",
    "Interior Plumbing Coordination",
    "Interior BOQ",
    "Interior Execution Drawing",
  ],
  Exterior: [
    "Front Elevation",
    "Side Elevation",
    "Rear Elevation",
    "3D Exterior View",
    "Facade Detail",
    "Boundary Wall Plan",
    "Gate Design",
    "Exterior Lighting Plan",
    "Material Palette / Finish Schedule",
  ],
  "MEP Services": [
    "HVAC Plan",
    "Fire Fighting Plan",
    "Fire Alarm Plan",
    "Ventilation Plan",
    "Solar Panel Layout",
    "Lift Plan",
    "Security System Plan",
    "Automation / Smart Home Plan",
  ],
  Documentation: [
    "BOQ",
    "Cost Estimate",
    "Material List",
    "Work Schedule",
    "Client Proposal",
    "Agreement",
    "Site Execution Drawing",
    "Revision Drawing",
    "As-built Drawing",
    "Handover Report",
  ],
};

function buildTaskId(category: string, title: string) {
  return `${category}-${title}`
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildTaskView(category: string, title: string): ViewKey {
  const t = title.toLowerCase();
  if (t.includes("bbs") || t.includes("steel weight")) return "bbs";
  if (t.includes("boq") || t.includes("estimate") || t.includes("material list")) return "boq";
  if (category === "Structural") return "tools";
  if (t.includes("agreement")) return "agreements";
  if (t.includes("proposal") || t.includes("report") || t.includes("handover")) return "exports";
  return "tools";
}

function buildTaskTool(category: string, title: string) {
  const t = title.toLowerCase();
  if (t.includes("boq")) return "BOQ Tool";
  if (t.includes("bbs")) return "BBS Tool";
  if (category === "Structural") return "Structure Tool";
  if (category === "Electrical") return "Electrical Tool";
  if (category === "Plumbing") return "Plumbing Tool";
  if (category === "Interior") return "Interior Tool";
  if (category === "Exterior") return "Exterior / Elevation Tool";
  if (category === "MEP Services") return "MEP Tool";
  if (t.includes("agreement")) return "Agreement Tool";
  if (t.includes("proposal") || t.includes("report")) return "Report Tool";
  return `${title} Tool`;
}

function buildTaskScale(category: string, title: string) {
  const t = title.toLowerCase();
  if (t.includes("schedule") || t.includes("boq") || t.includes("estimate") || t.includes("list") || t.includes("agreement") || t.includes("proposal")) return "Table / Document";
  if (category === "Interior") return "1:20 / 1:50";
  if (category === "Structural") return "1:50 / 1:100";
  if (category === "MEP Services") return "1:100";
  return "1:50 / 1:100";
}

function buildTaskUnit(category: string, title: string) {
  const t = title.toLowerCase();
  if (t.includes("boq") || t.includes("estimate")) return "INR + construction units";
  if (t.includes("bbs") || category === "Structural") return "mm / kg";
  if (category === "Interior" || category === "MEP Services" || category === "Electrical" || category === "Plumbing") return "mm preferred";
  return "ft-inch / mm";
}

function buildTaskVerification(category: string, title: string) {
  const t = title.toLowerCase();
  if (category === "Structural" || t.includes("bbs")) return "Engineer approval required";
  if (category === "Electrical" || category === "Plumbing" || category === "MEP Services") return "MEP review required";
  if (t.includes("agreement")) return "Legal review required";
  if (t.includes("boq") || t.includes("estimate")) return "Estimator review required";
  return "Designer / architect review required";
}

function buildTaskDimensionRule(category: string, title: string) {
  if (category === "Structural") return "Grid lines, centerline, member marks, member sizes, levels, reinforcement reference and engineer review stamp.";
  if (category === "Electrical") return "Point locations, mounting height, switchboard tag, circuit note, DB reference and room/wall reference.";
  if (category === "Plumbing") return "Fixture point, pipe route, drain slope, shaft/chamber reference, pipe size note and floor level.";
  if (category === "Interior") return "Room size, wall side, furniture width-height-depth, ceiling level, material code, finish code and revision.";
  if (category === "Exterior") return "Facade height, openings, projections, material notes, floor levels and elevation references.";
  if (category === "MEP Services") return "Equipment location, route, clearance, service access, level, size and safety note.";
  if (category === "Documentation") return "Drawing reference, quantity/source reference, version, approval status and export format.";
  return "Scale, north direction, overall dimension, room dimension, wall thickness, opening size, level mark and revision.";
}

function buildTaskInputs(category: string, title: string) {
  const base = ["Project brief", "Plot size", "Facing", "Floors", "Location"];
  if (category === "Structural") return [...base, "Architectural floor plan", "Soil/SBC input", "Load assumptions", "Engineer notes"];
  if (category === "Interior") return [...base, "Room size", "Room photos/reference", "Style", "Material preference", "Budget"];
  if (category === "Electrical") return [...base, "Floor plan", "Furniture layout", "Appliance list", "Switchboard preference"];
  if (category === "Plumbing") return [...base, "Floor plan", "Toilet/kitchen layout", "Shaft location", "Tank/pump location"];
  if (category === "Exterior") return [...base, "Floor height", "Elevation preference", "Material palette", "Reference image"];
  if (category === "Documentation") return [...base, "Selected drawings", "Rates", "Scope", "Client details"];
  return [...base, "Room requirements", "Setbacks", "Vastu preference", "Client notes"];
}

function buildTaskOutput(category: string, title: string) {
  const t = title.toLowerCase();
  if (t.includes("boq")) return ["BOQ table", "Cost summary", "Client PDF"];
  if (t.includes("bbs")) return ["BBS table", "Steel weight summary", "Engineer review sheet"];
  if (category === "Interior") return ["Dimensioned drawing", "Material/finish notes", "BOQ reference"];
  if (category === "Structural") return ["Structural draft", "Member schedule", "Engineer review sheet"];
  if (category === "Documentation") return ["PDF document", "Version record", "Client-ready export"];
  return ["Dimensioned drawing", "PDF/SVG export", "Revision record"];
}

const buildSetuProjectTasks: BuildSetuProjectTask[] = Object.entries(buildSetuTaskGroups).flatMap(([category, titles]) =>
  titles.map((title) => ({
    id: buildTaskId(category, title),
    title,
    category,
    toolName: buildTaskTool(category, title),
    view: buildTaskView(category, title),
    outputFormat: buildTaskOutput(category, title).join(" + "),
    dimensionRule: buildTaskDimensionRule(category, title),
    requiredInputs: buildTaskInputs(category, title),
    deliverables: buildTaskOutput(category, title),
    scale: buildTaskScale(category, title),
    unit: buildTaskUnit(category, title),
    review: buildTaskVerification(category, title),
  })),
);

function ProjectWorkspaceTaskBoardShell({
  project,
  setActive,
  theme,
}: {
  project: LiveProject | null;
  setActive: (id: ViewKey) => void;
  theme: ResolvedTheme;
}) {
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "tasks" | "boq" | "files">("tasks");
  const [taskCategory, setTaskCategory] = useState("All");
  const [selectedTask, setSelectedTask] = useState<BuildSetuProjectTask | null>(buildSetuProjectTasks[0] || null);

  if (!project) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#ded5ec] bg-[#fbf8ff] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0dcff] text-[#6f1cc4]">
          <FolderKanban className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#21133f]">No project selected</h1>
        <p className="mt-2 text-sm text-[#817397]">Projects section se project open karo.</p>
        <button onClick={() => setActive("projects")} className="mt-5 rounded-xl bg-[#21133f] px-5 py-2.5 text-sm font-semibold text-white">
          Go to Projects
        </button>
      </div>
    );
  }

  const item = project as any;
  const count = item._count || {};
  const projectTitle = item.title || "Untitled Project";
  const status = String(item.status || "AI_DRAFT").replaceAll("_", " ");
  const categories = ["All", ...Array.from(new Set(buildSetuProjectTasks.map((task) => task.category)))];
  const visibleTasks = buildSetuProjectTasks.filter((task) => taskCategory === "All" || task.category === taskCategory);

  const tabs = [
    ["overview", "Overview"],
    ["tasks", "Task Board"],
    ["boq", "BOQ / BBS"],
    ["files", "Files / Reports"],
  ] as const;

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button onClick={() => setActive("projects")} className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-[#6f1cc4]">
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Back to Projects
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[26px] font-bold leading-tight tracking-[-0.045em] text-[#21133f]">{projectTitle}</h1>
              <span className="rounded-full bg-[#f0dcff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6f1cc4]">{status}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                {buildSetuProjectTasks.length} Project Tasks
              </span>
            </div>
            <p className="mt-2 text-sm text-[#817397]">
              Project-wise task board. Har task ka specific tool, required inputs, dimension checklist, output format aur review flow hoga.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWorkspaceTab("tasks")} className="rounded-xl border border-[#ded5ec] bg-white px-4 py-2 text-xs font-semibold text-[#5d5077] hover:bg-[#f7f0ff]">
              Open Task Board
            </button>
            <button onClick={() => setActive("boq")} className="rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">
              Generate BOQ
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Total Tasks", buildSetuProjectTasks.length, FolderKanban],
          ["Renders", count.renders || 0, ImageIcon],
          ["BOQ Items", count.boqItems || 0, Calculator],
          ["BBS Items", count.bbsItems || 0, ClipboardList],
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-[18px] border border-[#ded5ec] bg-white px-3 py-2.5 light-card-shadow">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0dcff] text-[#6f1cc4]">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#817397]">{label as string}</p>
                <p className="mt-1 text-[20px] font-bold leading-none text-[#21133f]">{String(value)}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[22px] border border-[#ded5ec] bg-white p-3 light-card-shadow">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setWorkspaceTab(id)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                workspaceTab === id ? "bg-[#21133f] text-white" : "border border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#f7f0ff]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {workspaceTab === "overview" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">Site-ready dimension checklist</h2>
            <p className="mt-1 text-xs text-[#817397]">Har drawing/task output me ye details mandatory rahengi.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {["Scale + unit", "North direction", "Overall dimensions", "Room dimensions", "Wall thickness", "Door/window schedule", "Level marks", "Drawing number + revision"].map((check) => (
                <div key={check} className="flex items-center gap-2 rounded-xl border border-[#eee7f7] bg-[#fbf8ff] px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-[#6f1cc4]" />
                  <span className="text-xs font-semibold text-[#5d5077]">{check}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">Project execution flow</h2>
            <div className="mt-4 space-y-3">
              {[
                ["01", "Select task", "Project ke andar exact task choose hoga"],
                ["02", "Open specific tool", "Sirf us task ka tool open hoga"],
                ["03", "Generate output", "Drawing requirements ke according output banega"],
                ["04", "Verification/export", "Verification ke baad PDF/report/site-ready export"],
              ].map(([step, title, desc]) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f0dcff] text-xs font-bold text-[#6f1cc4]">{step}</span>
                  <div>
                    <p className="text-xs font-bold text-[#21133f]">{title}</p>
                    <p className="mt-0.5 text-[11px] text-[#817397]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {workspaceTab === "tasks" ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-4 light-card-shadow">
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setTaskCategory(category)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    taskCategory === category ? "bg-[#21133f] text-white" : "border border-[#ded5ec] bg-white text-[#5d5077] hover:bg-[#f7f0ff]",
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "rounded-[18px] border p-3 text-left transition hover:border-[#c4b5fd] hover:bg-[#fbf8ff]",
                    selectedTask?.id === task.id ? "border-[#8b5cf6] bg-[#fbf8ff]" : "border-[#eee7f7] bg-white",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-[#f0dcff] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#6f1cc4]">{task.category}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">AI Draft</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-[#21133f]">{task.title}</h3>
                  <p className="mt-1 text-[11px] text-[#817397]">{task.toolName}</p>
                  <div className="mt-3 rounded-xl bg-[#f7f0ff] px-2 py-1.5 text-[10px] font-semibold text-[#6f1cc4]">
                    {task.scale} • {task.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-[22px] border border-[#ded5ec] bg-white p-4 light-card-shadow">
            {selectedTask ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7c3aed]">Specific task</p>
                <h2 className="mt-2 text-lg font-bold text-[#21133f]">{selectedTask.title}</h2>
                <p className="mt-1 text-xs text-[#817397]">{selectedTask.category}</p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a88b3]">Specific Tool</p>
                    <p className="mt-1 text-xs font-semibold text-[#21133f]">{selectedTask.toolName}</p>
                  </div>

                  <div className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a88b3]">Required Inputs</p>
                    <div className="mt-2 space-y-1.5">
                      {selectedTask.requiredInputs.map((item) => (
                        <p key={item} className="text-[11px] text-[#5d5077]">• {item}</p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a88b3]">Dimension Rule</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#21133f]">{selectedTask.dimensionRule}</p>
                  </div>

                  <div className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a88b3]">Output</p>
                    <div className="mt-2 space-y-1.5">
                      {selectedTask.deliverables.map((item) => (
                        <p key={item} className="text-[11px] text-[#5d5077]">• {item}</p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a88b3]">Scale</p>
                      <p className="mt-1 text-xs font-semibold text-[#21133f]">{selectedTask.scale}</p>
                    </div>
                    <div className="rounded-2xl border border-[#eee7f7] bg-[#fbf8ff] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a88b3]">Unit</p>
                      <p className="mt-1 text-xs font-semibold text-[#21133f]">{selectedTask.unit}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Verification</p>
                    <p className="mt-1 text-xs font-semibold text-amber-800">{selectedTask.review}</p>
                  </div>
                </div>

                <button
                  onClick={() => setActive(selectedTask.view)}
                  className="mt-4 w-full rounded-xl bg-[#21133f] px-4 py-2.5 text-xs font-semibold text-white"
                >
                  Open {selectedTask.toolName}
                </button>

                <p className="mt-3 text-[10.5px] leading-relaxed text-[#817397]">
                  Ye task isi project ke context me execute hoga. Next phase me output project/task/version ke andar save hoga.
                </p>
              </>
            ) : null}
          </aside>
        </section>
      ) : null}

      {workspaceTab === "boq" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">BOQ Package</h2>
            <p className="mt-1 text-xs text-[#817397]">Drawing reference ke saath BOQ generate hoga.</p>
            <button onClick={() => setActive("boq")} className="mt-4 rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">Open BOQ Tool</button>
          </div>
          <div className="rounded-[22px] border border-[#ded5ec] bg-white p-5 light-card-shadow">
            <h2 className="text-base font-bold text-[#21133f]">BBS Package</h2>
            <p className="mt-1 text-xs text-[#817397]">Structural drawings ke base par BBS draft. Engineer review required.</p>
            <button onClick={() => setActive("bbs")} className="mt-4 rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">Open BBS Tool</button>
          </div>
        </section>
      ) : null}

      {workspaceTab === "files" ? (
        <section className="rounded-[22px] border border-dashed border-[#ded5ec] bg-[#fbf8ff] p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#6f1cc4]" />
          <h2 className="mt-3 text-base font-bold text-[#21133f]">Files and reports</h2>
          <p className="mt-1 text-xs text-[#817397]">Project PDFs, reports, agreements, exported drawings aur uploaded reference files yaha save honge.</p>
          <button onClick={() => setActive("exports")} className="mt-4 rounded-xl bg-[#21133f] px-4 py-2 text-xs font-semibold text-white">Open Reports</button>
        </section>
      ) : null}
    </div>
  );
}




function ProjectTaskChatInterfaceShell({
  project,
  setActive,
  theme,
}: {
  project: LiveProject | null;
  setActive: (id: ViewKey) => void;
  theme: ResolvedTheme;
}) {
  type ProjectUnifiedChatMessage = {
    id: string;
    role?: "user" | "assistant" | "tool_result" | "system";
    messageType?: string;
    toolSlug?: string;
    toolName?: string;
    content?: string;
    finalPrompt?: string;
    resultJson?: any;
    imageUrl?: string | null;
    status?: string;
    createdAt?: string;
  };

  type ProjectChatRender = {
    id: string;
    renderType?: string | null;
    roomType?: string | null;
    imageUrl?: string | null;
    status?: string | null;
    createdAt?: string | null;
  };

  const projectId = String(project?.id || "");
  const projectTitle = String(project?.title || "Project Workspace");

  const toolOptions = [
    { slug: "design-brief-tool", name: "Design Brief Tool" },
    { slug: "working-plan-tool", name: "Working Plan Tool" },
    { slug: "floor-plan-tool", name: "Floor Plan Tool" },
    { slug: "interior-design-tool", name: "Interior Design Tool" },
    { slug: "exterior-elevation-tool", name: "Exterior Elevation Tool" },
    { slug: "image-generation-tool", name: "Image Generation Tool" },
    { slug: "site-redesign-tool", name: "Site Redesign Tool" },
    { slug: "plumbing-plan-tool", name: "Plumbing Plan Tool" },
    { slug: "electrical-plan-tool", name: "Electrical Plan Tool" },
    { slug: "rcc-structure-tool", name: "RCC Structure Tool" },
    { slug: "boq-estimate-tool", name: "BOQ Estimate Tool" },
    { slug: "bbs-tool", name: "BBS Tool" },
    { slug: "mep-tool", name: "MEP Tool" },
    { slug: "material-list-tool", name: "Material List Tool" },
    { slug: "cost-estimation-tool", name: "Cost Estimation Tool" },
    { slug: "site-execution-tool", name: "Site Execution Tool" },
    { slug: "quality-check-tool", name: "Quality Check Tool" },
    { slug: "client-agreement-tool", name: "Client Agreement Tool" },
    { slug: "document-generator-tool", name: "Document Generator Tool" },
    { slug: "report-generator-tool", name: "Report Generator Tool" },
    { slug: "verification-tool", name: "Verification Tool" },
    { slug: "export-package-tool", name: "Export Package Tool" },
  ];

  const [selectedToolSlug, setSelectedToolSlug] = useState("design-brief-tool");
  const [guidedTaskSlug, setGuidedTaskSlug] = useState("");
  const [guidedQuestionIndex, setGuidedQuestionIndex] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<string[]>([]);
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [projectUnifiedChat, setProjectUnifiedChat] = useState<ProjectUnifiedChatMessage[]>([]);
  const [loadingUnifiedChat, setLoadingUnifiedChat] = useState(false);
  const [unifiedChatError, setUnifiedChatError] = useState("");
  const [recentRenders, setRecentRenders] = useState<ProjectChatRender[]>([]);
  const [loadingRenders, setLoadingRenders] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [sending, setSending] = useState(false);
  const [executingPromptId, setExecutingPromptId] = useState("");
  const chatStreamRef = useRef<HTMLDivElement | null>(null);

  const selectedTool = toolOptions.find((tool) => tool.slug === selectedToolSlug) || toolOptions[0];

  const guidedToolCards = [
    { slug: "working-plan-tool", name: "Working Plan" },
    { slug: "exterior-elevation-tool", name: "Exterior" },
    { slug: "interior-design-tool", name: "Interior" },
    { slug: "boq-estimate-tool", name: "BOQ" },
    { slug: "bbs-tool", name: "BBS" },
    { slug: "plumbing-plan-tool", name: "Plumbing" },
    { slug: "electrical-plan-tool", name: "Electrical" },
    { slug: "client-agreement-tool", name: "Agreement" },
  ];

  const guidedQuestionBank: Record<string, string[]> = {
    "working-plan-tool": [
      "Plot size, facing aur floors confirm karo.",
      "Bedrooms, bathrooms aur key rooms confirm karo.",
      "Parking, staircase position aur entrance preference batao.",
      "Vastu required hai kya?",
      "Kitchen open chahiye ya closed?",
      "Rental unit ya separate entry chahiye?",
      "Balcony, wash area, store room ya puja room me kya chahiye?",
      "Koi special requirement ya restriction hai?",
    ],
    "exterior-elevation-tool": [
      "Elevation style confirm karo: modern, minimal, luxury, traditional ya contemporary?",
      "Color preference kya hai?",
      "Material preference: wood, stone, glass, concrete, tiles?",
      "Balcony, railing aur window style preference batao.",
      "Parking gate aur boundary wall visible chahiye?",
      "Day view chahiye ya night lighting view?",
      "Floors aur front width confirm karo.",
      "Koi reference ya special facade requirement hai?",
    ],
    "interior-design-tool": [
      "Kaunsa room design karna hai?",
      "Room size ya approximate area batao.",
      "Style preference: modern, minimal, luxury, traditional?",
      "Color/material preference kya hai?",
      "Furniture requirement kya hai?",
      "Lighting mood: warm, bright, premium ya natural?",
      "Storage requirement hai kya?",
      "Koi special reference ya restriction hai?",
    ],
    "boq-estimate-tool": [
      "Built-up area aur floors confirm karo.",
      "Construction quality: basic, standard ya premium?",
      "City/location confirm karo.",
      "Civil work only chahiye ya plumbing/electrical bhi include?",
      "Interior/finishing include karna hai?",
      "Material rate local market ke basis par chahiye?",
      "Labour included chahiye?",
      "Output detailed BOQ chahiye ya summary estimate?",
    ],
    "bbs-tool": [
      "Structure type confirm karo: RCC frame, load-bearing ya mixed?",
      "Floors aur slab count confirm karo.",
      "Column/beam layout available hai kya?",
      "Concrete grade aur steel grade batao, agar known hai.",
      "Footing type known hai kya?",
      "Staircase included chahiye?",
      "Output format: bar mark wise ya summary?",
      "Koi structural note ya assumption add karna hai?",
    ],
    "plumbing-plan-tool": [
      "Bathrooms, kitchen aur wash areas count confirm karo.",
      "Water tank location: terrace, underground ya both?",
      "Drainage line side preference hai?",
      "Septic tank ya municipal connection?",
      "Hot/cold water required hai?",
      "Rainwater harvesting chahiye?",
      "Shaft/duct available hai kya?",
      "Koi special plumbing requirement hai?",
    ],
    "electrical-plan-tool": [
      "Rooms aur floors confirm karo.",
      "Light/fan/socket basic layout chahiye ya detailed?",
      "AC points required hain?",
      "Inverter/solar provision chahiye?",
      "Main DB location preference?",
      "CCTV, internet, bell, outdoor lighting required?",
      "Kitchen heavy load points required?",
      "Koi special electrical requirement hai?",
    ],
    "client-agreement-tool": [
      "Agreement kis ke beech hoga: client and contractor/designer/architect?",
      "Project scope kya include hoga?",
      "Payment milestone batao.",
      "Timeline/delivery date batao.",
      "Revision policy kya chahiye?",
      "Exclusions kya rahenge?",
      "Professional review/safety clause include karna hai?",
      "Koi special legal/commercial condition hai?",
    ],
  };

  function getGuidedQuestions(slug: string) {
    return guidedQuestionBank[slug] || [
      "Requirement ka objective batao.",
      "Project details confirm karo.",
      "Output format kya chahiye?",
      "Koi special requirement hai?",
    ];
  }

  function getToolNameBySlug(slug: string) {
    return toolOptions.find((tool) => tool.slug === slug)?.name || "Selected Tool";
  }

  function getExecuteButtonLabel(message: ProjectUnifiedChatMessage) {
    const text = `${message.toolSlug || ""} ${message.toolName || ""}`.toLowerCase();
    const isImageTool =
      text.includes("interior") ||
      text.includes("exterior") ||
      text.includes("elevation") ||
      text.includes("render") ||
      text.includes("image");

    if (isImageTool) return "Generate Image";
    if (text.includes("working-plan")) return "Generate Working Plan";
    if (text.includes("boq")) return "Generate BOQ";
    if (text.includes("bbs")) return "Generate BBS";
    if (text.includes("plumbing")) return "Generate Plumbing Plan";
    if (text.includes("electrical")) return "Generate Electrical Plan";
    if (text.includes("agreement")) return "Generate Agreement";

    return `Generate ${message.toolName || "Output"}`;
  }

  function isImageGenerationTool() {
    const text = `${selectedTool.slug} ${selectedTool.name}`.toLowerCase();
    return (
      text.includes("interior") ||
      text.includes("exterior") ||
      text.includes("elevation") ||
      text.includes("render") ||
      text.includes("image")
    );
  }

  function getImageSrc(value?: string | null) {
    if (!value) return "";
    const text = String(value);
    if (text.startsWith("http") || text.startsWith("/") || text.startsWith("data:")) return text;
    return `data:image/png;base64,${text}`;
  }

  function formatTime(value?: string | null) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  async function loadProjectUnifiedChat() {
    if (!projectId) return;

    setLoadingUnifiedChat(true);
    setUnifiedChatError("");

    try {
      const response = await fetch(`/api/project-chat/history?projectId=${encodeURIComponent(projectId)}&t=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load project chat history");
      }

      setProjectUnifiedChat(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      setUnifiedChatError(error instanceof Error ? error.message : "Failed to load project chat history");
    } finally {
      setLoadingUnifiedChat(false);
    }
  }

  async function loadProjectRenders() {
    if (!projectId) return;

    setLoadingRenders(true);
    setRenderError("");

    try {
      const response = await fetch(`/api/renders/list?projectId=${encodeURIComponent(projectId)}&t=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load recent images");
      }

      setRecentRenders(Array.isArray(data.renders) ? data.renders.slice(0, 8) : []);
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Failed to load recent images");
    } finally {
      setLoadingRenders(false);
    }
  }

  useEffect(() => {
    void loadProjectUnifiedChat();
    void loadProjectRenders();
  }, [projectId]);

  function scrollProjectChatToBottom(behavior: ScrollBehavior = "smooth") {
    const node = chatStreamRef.current;
    if (!node) return;

    requestAnimationFrame(() => {
      node.scrollTo({
        top: node.scrollHeight,
        behavior,
      });
    });
  }

  useEffect(() => {
    scrollProjectChatToBottom(projectUnifiedChat.length > 2 ? "smooth" : "auto");
  }, [
    projectUnifiedChat.length,
    loadingUnifiedChat,
    sending,
    guidedTaskSlug,
    guidedQuestionIndex,
  ]);

  async function saveProjectChatMessage(payload: {
    role: "user" | "assistant" | "tool_result" | "system";
    messageType: "brief" | "question" | "answer" | "prompt" | "result" | "image" | "normal";
    content: string;
    finalPrompt?: string;
    resultJson?: unknown;
    imageUrl?: string | null;
    status?: string;
  }) {
    if (!projectId) return null;

    try {
      const response = await fetch("/api/project-chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          projectId,
          role: payload.role,
          messageType: payload.messageType,
          toolSlug: selectedTool.slug,
          toolName: selectedTool.name,
          content: payload.content,
          finalPrompt: payload.finalPrompt || "",
          resultJson: payload.resultJson ?? null,
          imageUrl: payload.imageUrl || null,
          status: payload.status || "",
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) return null;

      return data.message;
    } catch {
      return null;
    }
  }

  function buildFinalPrompt(userPrompt: string) {
    const lower = `${selectedTool.slug} ${selectedTool.name}`.toLowerCase();

    const base = [
      `Project: ${projectTitle}`,
      `Selected tool: ${selectedTool.name}`,
      "",
      "Designer brief:",
      userPrompt,
      "",
    ];

    if (lower.includes("exterior") || lower.includes("elevation")) {
      return [
        "Create a photorealistic architectural exterior elevation render.",
        "",
        ...base,
        "Requirements:",
        "- Modern Indian residential elevation",
        "- Realistic proportions",
        "- Clean facade, practical structure, premium material finish",
        "- Include road-side full building view",
        "- Avoid distorted geometry, random text, wrong floors, unsafe cantilevers",
      ].join("\n");
    }

    if (lower.includes("interior")) {
      return [
        "Create a photorealistic interior design render.",
        "",
        ...base,
        "Requirements:",
        "- Practical room layout",
        "- Realistic furniture scale",
        "- Premium lighting and materials",
        "- Avoid clutter, wrong scale, unrealistic reflections",
      ].join("\n");
    }

    return [
      ...base,
      "Generate a project-wise BuildSetu AI draft.",
      "Include assumptions, missing information, deliverables, review checklist, and professional review warning.",
    ].join("\n");
  }

  function buildAssistantReply(userPrompt: string, finalPrompt: string) {
    const lower = `${selectedTool.slug} ${selectedTool.name}`.toLowerCase();

    if (lower.includes("design-brief")) {
      return [
        "Brief received. I will convert this into a designer-ready project brief.",
        "",
        "Next I will verify:",
        "• plot and facing",
        "• floor requirement",
        "• room requirement",
        "• style and budget",
        "• output checklist",
        "",
        "Generated prompt is ready for the selected Design Brief Tool.",
      ].join("\n");
    }

    if (lower.includes("interior") || lower.includes("exterior") || lower.includes("elevation")) {
      return [
        "Image/render requirement received.",
        "",
        "I prepared a structured visual prompt with style, materials, camera angle, lighting and avoid-rules.",
        "",
        "Generated prompt is ready for the selected image/render tool.",
      ].join("\n");
    }

    return [
      "Requirement received.",
      "",
      `I prepared a structured prompt for ${selectedTool.name}.`,
      "This will stay saved inside this project chat history.",
    ].join("\n");
  }

  async function generateImageForProject(finalPrompt: string) {
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          projectId,
          prompt: finalPrompt,
          renderType: selectedTool.name,
          roomType: selectedTool.name,
          toolSlug: selectedTool.slug,
          toolName: selectedTool.name,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Image generation failed");
      }

      const image =
        data.imageUrl ||
        data.url ||
        data.image ||
        data.base64 ||
        data.b64_json ||
        data.output?.[0]?.imageUrl ||
        data.output?.[0]?.url ||
        data.output?.[0]?.b64_json ||
        "";

      if (!image) {
        throw new Error("Image API response me image nahi mila");
      }

      return {
        image,
        data,
      };
    } catch (error) {
      return {
        image: "",
        error: error instanceof Error ? error.message : "Image generation failed",
      };
    }
  }

  async function startGuidedTask(slug: string) {
    const questions = getGuidedQuestions(slug);
    const toolName = getToolNameBySlug(slug);

    setSelectedToolSlug(slug);
    setToolDropdownOpen(false);
    setGuidedTaskSlug(slug);
    setGuidedQuestionIndex(0);
    setGuidedAnswers([]);

    const intro = `${toolName} ke liye main kuch details confirm karunga.\n\nQ1. ${questions[0]}`;

    const assistantMessage: ProjectUnifiedChatMessage = {
      id: `guided_start_${Date.now()}`,
      role: "assistant",
      messageType: "question",
      toolSlug: slug,
      toolName,
      content: intro,
      status: "BRIEFING",
      createdAt: new Date().toISOString(),
    };

    setProjectUnifiedChat((current) => [...current, assistantMessage]);

    await saveProjectChatMessage({
      role: "assistant",
      messageType: "question",
      content: intro,
      status: "BRIEFING",
    });
  }

  function buildGuidedFinalPrompt(slug: string, answers: string[]) {
    const questions = getGuidedQuestions(slug);
    const toolName = getToolNameBySlug(slug);

    const qa = questions
      .map((question, index) => `Q${index + 1}. ${question}\nA${index + 1}. ${answers[index] || "Not answered"}`)
      .join("\n\n");

    return [
      `Project: ${projectTitle}`,
      `Selected tool: ${toolName}`,
      "",
      "Project guided briefing:",
      qa,
      "",
      "Generate a professional project-wise output.",
      "Use only verified details from this project and briefing.",
      "Mention assumptions clearly.",
      "Keep output client-ready and review-ready.",
    ].join("\n");
  }

  async function handleGuidedAnswer(userText: string) {
    if (!guidedTaskSlug) return false;

    const slug = guidedTaskSlug;
    const toolName = getToolNameBySlug(slug);
    const questions = getGuidedQuestions(slug);
    const nextAnswers = [...guidedAnswers, userText];
    const currentQuestionNo = guidedQuestionIndex + 1;

    setPrompt("");
    setSending(true);

    const userMessage: ProjectUnifiedChatMessage = {
      id: `guided_answer_${Date.now()}`,
      role: "user",
      messageType: "answer",
      toolSlug: slug,
      toolName,
      content: userText,
      status: "ANSWER_SAVED",
      createdAt: new Date().toISOString(),
    };

    setProjectUnifiedChat((current) => [...current, userMessage]);

    await saveProjectChatMessage({
      role: "user",
      messageType: "answer",
      content: userText,
      status: "ANSWER_SAVED",
    });

    if (currentQuestionNo < questions.length) {
      const nextQuestionText = `Q${currentQuestionNo + 1}. ${questions[currentQuestionNo]}`;

      const assistantQuestion: ProjectUnifiedChatMessage = {
        id: `guided_question_${Date.now()}`,
        role: "assistant",
        messageType: "question",
        toolSlug: slug,
        toolName,
        content: nextQuestionText,
        status: "BRIEFING",
        createdAt: new Date().toISOString(),
      };

      setGuidedAnswers(nextAnswers);
      setGuidedQuestionIndex(currentQuestionNo);
      setProjectUnifiedChat((current) => [...current, assistantQuestion]);

      await saveProjectChatMessage({
        role: "assistant",
        messageType: "question",
        content: nextQuestionText,
        status: "BRIEFING",
      });

      setSending(false);
      return true;
    }

    const finalPrompt = buildGuidedFinalPrompt(slug, nextAnswers);

    const readyText = `${toolName} briefing complete hai. Final prompt project chat me save ho gaya hai. Ab is tool ka output generate kiya ja sakta hai.`;

    const readyMessage: ProjectUnifiedChatMessage = {
      id: `guided_ready_${Date.now()}`,
      role: "assistant",
      messageType: "prompt",
      toolSlug: slug,
      toolName,
      content: readyText,
      finalPrompt,
      resultJson: { answers: nextAnswers, questions },
      status: "PROMPT_READY",
      createdAt: new Date().toISOString(),
    };

    setProjectUnifiedChat((current) => [...current, readyMessage]);

    await saveProjectChatMessage({
      role: "assistant",
      messageType: "prompt",
      content: readyText,
      finalPrompt,
      resultJson: { answers: nextAnswers, questions },
      status: "PROMPT_READY",
    });

    setGuidedAnswers(nextAnswers);
    setGuidedQuestionIndex(0);
    setGuidedTaskSlug("");
    setSending(false);

    void loadProjectUnifiedChat();
    return true;
  }

  async function executeSavedPrompt(message: ProjectUnifiedChatMessage) {
    if (!projectId || !message.finalPrompt || !message.toolSlug) return;

    setExecutingPromptId(message.id);

    try {
      const response = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({
          projectId,
          toolSlug: message.toolSlug,
          toolName: message.toolName || getToolNameBySlug(message.toolSlug),
          prompt: message.finalPrompt,
          requirement: message.finalPrompt,
          sourceMessageId: message.id,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Tool execution failed");
      }

      const resultText =
        data.text ||
        data.resultText ||
        data.output ||
        data.result?.text ||
        data.result?.summary ||
        `${message.toolName || "Tool"} output generated successfully.`;

      const resultMessage: ProjectUnifiedChatMessage = {
        id: `tool_result_${Date.now()}`,
        role: "assistant",
        messageType: "result",
        toolSlug: message.toolSlug,
        toolName: message.toolName,
        content: String(resultText),
        finalPrompt: message.finalPrompt,
        resultJson: data,
        imageUrl: data.imageUrl || data.url || data.image || null,
        status: "RESULT_GENERATED",
        createdAt: new Date().toISOString(),
      };

      setProjectUnifiedChat((current) => [...current, resultMessage]);

      await saveProjectChatMessage({
        role: "assistant",
        messageType: "result",
        content: String(resultText),
        finalPrompt: message.finalPrompt,
        resultJson: data,
        imageUrl: data.imageUrl || data.url || data.image || null,
        status: "RESULT_GENERATED",
      });

      void loadProjectUnifiedChat();
      void loadProjectRenders();
    } catch (error) {
      const failText = error instanceof Error ? error.message : "Tool execution failed";

      const failMessage: ProjectUnifiedChatMessage = {
        id: `tool_failed_${Date.now()}`,
        role: "assistant",
        messageType: "result",
        toolSlug: message.toolSlug,
        toolName: message.toolName,
        content: `Tool execution failed: ${failText}`,
        finalPrompt: message.finalPrompt,
        resultJson: { error: failText },
        status: "EXECUTION_FAILED",
        createdAt: new Date().toISOString(),
      };

      setProjectUnifiedChat((current) => [...current, failMessage]);

      await saveProjectChatMessage({
        role: "assistant",
        messageType: "result",
        content: `Tool execution failed: ${failText}`,
        finalPrompt: message.finalPrompt,
        resultJson: { error: failText },
        status: "EXECUTION_FAILED",
      });
    } finally {
      setExecutingPromptId("");
    }
  }

  async function generateOutput(event?: any) {
    event?.preventDefault();

    const userText = prompt.trim();
    if (!userText || sending || !projectId) return;

    if (guidedTaskSlug) {
      await handleGuidedAnswer(userText);
      return;
    }

    const finalPrompt = buildFinalPrompt(userText);

    const userMessage: ProjectUnifiedChatMessage = {
      id: `local_user_${Date.now()}`,
      role: "user",
      messageType: "brief",
      toolSlug: selectedTool.slug,
      toolName: selectedTool.name,
      content: userText,
      finalPrompt,
      status: "BRIEFING",
      createdAt: new Date().toISOString(),
    };

    setProjectUnifiedChat((current) => [...current, userMessage]);
    setPrompt("");
    setSending(true);

    await saveProjectChatMessage({
      role: "user",
      messageType: "brief",
      content: userText,
      finalPrompt,
      status: "BRIEFING",
    });

    const assistantText = buildAssistantReply(userText, finalPrompt);

    const assistantMessage: ProjectUnifiedChatMessage = {
      id: `local_ai_${Date.now()}`,
      role: "assistant",
      messageType: "result",
      toolSlug: selectedTool.slug,
      toolName: selectedTool.name,
      content: assistantText,
      finalPrompt,
      resultJson: { summary: assistantText },
      status: "RESULT_GENERATED",
      createdAt: new Date().toISOString(),
    };

    setProjectUnifiedChat((current) => [...current, assistantMessage]);

    await saveProjectChatMessage({
      role: "assistant",
      messageType: "result",
      content: assistantText,
      finalPrompt,
      resultJson: { summary: assistantText },
      status: "RESULT_GENERATED",
    });

    if (isImageGenerationTool()) {
      const imageResult = await generateImageForProject(finalPrompt);

      if (imageResult.image) {
        const imageMessage: ProjectUnifiedChatMessage = {
          id: `local_img_${Date.now()}`,
          role: "assistant",
          messageType: "image",
          toolSlug: selectedTool.slug,
          toolName: selectedTool.name,
          content: "Generated image preview ready.",
          finalPrompt,
          resultJson: imageResult.data || {},
          imageUrl: imageResult.image,
          status: "RESULT_GENERATED",
          createdAt: new Date().toISOString(),
        };

        setProjectUnifiedChat((current) => [...current, imageMessage]);

        await saveProjectChatMessage({
          role: "assistant",
          messageType: "image",
          content: "Generated image preview ready.",
          finalPrompt,
          resultJson: imageResult.data || {},
          imageUrl: imageResult.image,
          status: "RESULT_GENERATED",
        });

        void loadProjectRenders();
      } else {
        const failText = `Image generation failed: ${imageResult.error || "unknown error"}`;

        const failMessage: ProjectUnifiedChatMessage = {
          id: `local_img_fail_${Date.now()}`,
          role: "assistant",
          messageType: "result",
          toolSlug: selectedTool.slug,
          toolName: selectedTool.name,
          content: failText,
          finalPrompt,
          resultJson: { error: imageResult.error },
          status: "IMAGE_FAILED",
          createdAt: new Date().toISOString(),
        };

        setProjectUnifiedChat((current) => [...current, failMessage]);

        await saveProjectChatMessage({
          role: "assistant",
          messageType: "result",
          content: failText,
          finalPrompt,
          resultJson: { error: imageResult.error },
          status: "IMAGE_FAILED",
        });
      }
    }

    setSending(false);
    void loadProjectUnifiedChat();
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl rounded-[28px] border border-dashed border-[#ded5ec] bg-[#fbf8ff] p-10 text-center">
        <h1 className="text-2xl font-black text-[#21133f]">Project select karo</h1>
        <p className="mt-2 text-sm text-[#817397]">Project chat open karne ke liye pehle ek project select karo.</p>
        <button
          type="button"
          onClick={() => setActive("projects")}
          className="mt-5 rounded-2xl bg-[#21133f] px-5 py-3 text-sm font-bold text-white"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const fileMessages = projectUnifiedChat
    .filter((message) => message.finalPrompt || message.status === "RESULT_GENERATED")
    .slice(-4)
    .reverse();

  return (
    <div className="bsu-pw-shell">
<div className="bsu-pw-layout">
        <section className="bsu-chat-panel">
          <header className="bsu-chat-header">
            <div className="bsu-chat-title-row">
              <div className="bsu-chat-project-icon">⌂</div>
              <div>
                <h1>{projectTitle}</h1>
                <p>BuildSetu ko batao kya banana hai. Sahi tool automatically select ho jayega.</p>
              </div>
            </div>

            <div className="bsu-chat-header-actions">
              <span>PROJECT CHAT</span>
              <button type="button">⋯</button>
            </div>
          </header>

          <div ref={chatStreamRef} className="bsu-chat-stream">
            <div className="bsu-msg-row assistant">
              <div className="bsu-avatar ai">AI</div>
              <div className="bsu-msg assistant">
                <p>Hello. Main BuildSetu AI hoon. Is project ke liye planning, design brief, BOQ, renders aur documents me help kar sakta hoon.</p>

              </div>
            </div>

            {loadingUnifiedChat ? (
              <div className="bsu-msg-row assistant">
                <div className="bsu-avatar ai">AI</div>
                <div className="bsu-msg assistant">
                  <p>Project chat history loading...</p>
                </div>
              </div>
            ) : null}

            {unifiedChatError ? (
              <div className="bsu-msg-row assistant">
                <div className="bsu-avatar ai">!</div>
                <div className="bsu-msg assistant error">
                  <p>{unifiedChatError}</p>
                </div>
              </div>
            ) : null}

            {projectUnifiedChat.map((message) => {
              const isUser = message.role === "user";
              const src = getImageSrc(message.imageUrl);

              return (
                <div key={message.id} className={isUser ? "bsu-msg-row user" : "bsu-msg-row assistant"}>
                  {!isUser ? <div className="bsu-avatar ai">AI</div> : null}

                  <div className={isUser ? "bsu-msg user" : "bsu-msg assistant"}>
                    {!isUser && message.toolName ? (
                      <div className="bsu-msg-tool">{message.toolName}</div>
                    ) : null}

                    <p>{message.content}</p>

                    {src ? (
                      <div className="bsu-inline-image">
                        <div className="bsu-inline-image-head">
                          <strong>Generated Preview</strong>
                          <span>{message.status === "RESULT_GENERATED" ? "Generated" : message.status === "REVIEW_REQUIRED" ? "Review Required" : message.status || "Ready"}</span>
                        </div>
                        <img src={src} alt="Generated design" />
                      </div>
                    ) : null}

                    {message.finalPrompt ? (
                      <details className="bsu-prompt-box">
                        <summary>View generated prompt</summary>
                        <pre>{message.finalPrompt}</pre>
                      </details>
                    ) : null}

                    {!isUser && message.finalPrompt && message.status === "PROMPT_READY" ? (
                      <button
                        type="button"
                        className="bsu-execute-tool-btn"
                        onClick={() => void executeSavedPrompt(message)}
                        disabled={executingPromptId === message.id}
                      >
                        {executingPromptId === message.id ? "Generating..." : getExecuteButtonLabel(message)}
                      </button>
                    ) : null}

                    <small>{formatTime(message.createdAt)}</small>
                  </div>

                  {isUser ? <div className="bsu-avatar user">SB</div> : null}
                </div>
              );
            })}
          </div>
          <form onSubmit={generateOutput} className="bsu-chat-composer">
            <div className="bsu-tool-picker">
              <button
                type="button"
                className="bsu-tool-trigger"
                onClick={() => setToolDropdownOpen((value) => !value)}
                aria-expanded={toolDropdownOpen}
              >
                <span>{selectedTool.name}</span>
                <span className="bsu-tool-chevron">⌄</span>
              </button>

              {toolDropdownOpen ? (
                <div className="bsu-tool-menu">
                  {toolOptions.map((tool) => (
                    <button
                      key={tool.slug}
                      type="button"
                      className={tool.slug === selectedToolSlug ? "bsu-tool-option active" : "bsu-tool-option"}
                      onClick={() => {
                        void startGuidedTask(tool.slug);
                      }}
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={guidedTaskSlug ? "Answer the current question..." : "Select a tool from dropdown or message BuildSetu AI..."}
              className="bsu-chat-input"
            />

            <button type="submit" disabled={sending || !prompt.trim()} className="bsu-send-btn">
              {sending ? "..." : "➤"}
            </button>
          </form>

          <p className="bsu-chat-note">Final drawings, BOQ, BBS and site execution outputs should be reviewed before use.</p>
        </section>

        <aside className="bsu-assets-panel">
          <div className="bsu-assets-section">
            <div className="bsu-assets-head">
              <div>
                <h2>Recent Images</h2>
                <p>Project renders aur generated visuals.</p>
              </div>
              <button type="button" onClick={() => void loadProjectRenders()}>
                {loadingRenders ? "Loading" : "Refresh"}
              </button>
            </div>

            {renderError ? <p className="bsu-assets-error">{renderError}</p> : null}

            <div className="bsu-assets-list">
              {recentRenders.length > 0 ? (
                recentRenders.map((render) => (
                  <div key={render.id} className="bsu-asset-card">
                    {getImageSrc(render.imageUrl) ? (
                      <img src={getImageSrc(render.imageUrl)} alt={render.renderType || "Render"} />
                    ) : null}
                    <div>
                      <strong>{render.renderType || render.roomType || "Generated Image"}</strong>
                      <span>{render.status === "REVIEW_REQUIRED" ? "Review Required" : render.status === "RESULT_GENERATED" ? "Generated" : render.status || "Draft"}</span>
                    </div>
                    <button type="button">⋮</button>
                  </div>
                ))
              ) : (
                <div className="bsu-empty-card">Abhi recent images nahi hain.</div>
              )}
            </div>
          </div>

          <div className="bsu-assets-section">
            <div className="bsu-assets-head">
              <div>
                <h2>Project Files</h2>
                <p>Saved prompts aur outputs.</p>
              </div>
              <button type="button">View all</button>
            </div>

            <div className="bsu-file-list">
              {fileMessages.length > 0 ? (
                fileMessages.map((message) => (
                  <div key={message.id} className="bsu-file-card">
                    <span>{message.messageType === "image" ? "IMG" : "DOC"}</span>
                    <div>
                      <strong>{message.toolName || "BuildSetu Output"}</strong>
                      <small>{message.status === "RESULT_GENERATED" ? "Generated" : message.status === "BRIEFING" ? "Brief Saved" : message.status || "Saved"} · {formatTime(message.createdAt)}</small>
                    </div>
                    <button type="button">⋮</button>
                  </div>
                ))
              ) : (
                <div className="bsu-empty-card">Abhi project files nahi hain.</div>
              )}
            </div>

            <button type="button" className="bsu-upload-btn">Upload Files</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function SikhadengeBuildDashboard() {
  function handleTopBackNavigation() {
    if (active === "projectWorkspace") {
      setActive("projects");
      return;
    }

    if (active !== "dashboard") {
      setActive("dashboard");
      return;
    }

    if (typeof window !== "undefined") {
      window.history.back();
    }
  }




  // BUILDSETU_DASHBOARD_AUTH_GUARD_V1
  useEffect(() => {
    const guardDashboard = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => null);

        if (!data?.authenticated) {
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("DASHBOARD_AUTH_GUARD_ERROR", error);
        window.location.href = "/login";
      }
    };

    guardDashboard();
  }, []);

  // BUILDSETU_DASHBOARD_OVERVIEW_V1
  useEffect(() => {
    const setDashboardValue = (label: string, value: number) => {
      const formatted = Number(value || 0).toLocaleString("en-IN");

      document.querySelectorAll("p, span, div").forEach((node) => {
        const el = node as HTMLElement;
        const text = (el.textContent || "").trim();
        const parentText = (el.parentElement?.textContent || "").trim();

        if (parentText.includes(label) && /^\d[\d,]*$/.test(text)) {
          el.textContent = formatted;
        }
      });
    };

    const loadOverview = async () => {
      try {
        const res = await fetch("/api/dashboard/overview", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json();

        if (!res.ok || !data?.ok || !data?.authenticated) return;

        const stats = data.stats || {};

        setDashboardValue("Active Projects", Number(stats.activeProjects || 0));
        setDashboardValue("Images Generated", Number(stats.imagesGenerated || 0));
        setDashboardValue("Verification Pending", Number(stats.reviewPending || 0));
        setDashboardValue("Credits Left", Number(stats.creditsLeft || 0));
      } catch (error) {
        console.error("DASHBOARD_OVERVIEW_LOAD_ERROR", error);
      }
    };

    loadOverview();
    const interval = window.setInterval(loadOverview, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // BUILDSETU_LIVE_CREDITS_BALANCE_V1
  useEffect(() => {
    const applyCreditsToDom = (credits: number) => {
      const creditText = `${credits.toLocaleString("en-IN")} Credits`;

      document.querySelectorAll("span, p, div").forEach((node) => {
        const el = node as HTMLElement;
        const text = (el.textContent || "").trim();

        if (text === "120 Credits" || /^\d[\d,]* Credits$/.test(text)) {
          el.textContent = creditText;
        }

        const parentText = (el.parentElement?.textContent || "").trim();
        if (text === "120" && parentText.includes("Credits Left")) {
          el.textContent = credits.toLocaleString("en-IN");
        }
      });
    };

    const loadCredits = async () => {
      try {
        const res = await fetch("/api/credits/balance", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.ok) return;

        const credits = Number(data.credits || 0);
        applyCreditsToDom(credits);
      } catch (error) {
        console.error("DASHBOARD_CREDITS_LOAD_ERROR", error);
      }
    };

    loadCredits();

    const interval = window.setInterval(loadCredits, 15000);

    const observer = new MutationObserver(() => {
      loadCredits();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);



  // BUILDSETU_TOOL_BUTTON_ALIGN_V4
  useEffect(() => {
    const applyToolCardAlignment = () => {
      const nodes = Array.from(document.querySelectorAll("button, a"));

      nodes.forEach((node) => {
        const text = (node.textContent || "").replace(/\s+/g, " ").trim();

        if (!text.startsWith("Launch Tool")) return;

        const actionWrap = node.parentElement;
        if (!actionWrap) return;

        actionWrap.classList.add("buildsetu-tool-card-actions-align");

        const body = actionWrap.parentElement;
        if (body) {
          body.classList.add("buildsetu-tool-card-body-align");
        }

        const card = body?.parentElement;
        if (card) {
          card.classList.add("buildsetu-tool-card-align");
        }
      });
    };

    applyToolCardAlignment();

    const observer = new MutationObserver(() => {
      applyToolCardAlignment();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);



  // BUILDSETU_APP_WIDE_THEME_CLICK_V3
  useEffect(() => {
    type Mode = "light" | "dark" | "system";

    const applyMode = (mode: Mode) => {
      if (typeof window === "undefined") return;

      if (typeof (window as any).__buildsetuSetTheme === "function") {
        (window as any).__buildsetuSetTheme(mode);
      } else {
        localStorage.setItem("buildsetu-theme-mode", mode);
        const resolved =
          mode === "system"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : mode;

        document.documentElement.dataset.buildsetuThemeMode = mode;
        document.documentElement.dataset.buildsetuTheme = resolved;
      }
    };

    const handleClick = (event: MouseEvent) => {
      let el = event.target as HTMLElement | null;

      for (let i = 0; el && i < 8; i += 1) {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();

        if (text === "Light Mode") {
          event.preventDefault();
          applyMode("light");
          return;
        }

        if (text === "Dark Mode") {
          event.preventDefault();
          applyMode("dark");
          return;
        }

        if (text === "System") {
          event.preventDefault();
          applyMode("system");
          return;
        }

        el = el.parentElement;
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => document.removeEventListener("click", handleClick, true);
  }, []);



  // BUILDSETU_HARD_THEME_FIX_V2
  useEffect(() => {
    type Mode = "light" | "dark" | "system";

    const isMode = (value: string | null): value is Mode => {
      return value === "light" || value === "dark" || value === "system";
    };

    const resolveMode = (mode: Mode) => {
      if (mode === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      return mode;
    };

    const markMenu = (mode: Mode) => {
      const activeLabel =
        mode === "light" ? "Light Mode" : mode === "dark" ? "Dark Mode" : "System";

      document.querySelectorAll("button, [role='button'], div").forEach((node) => {
        const el = node as HTMLElement;
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();

        if (text !== "Light Mode" && text !== "Dark Mode" && text !== "System") return;

        el.classList.remove("bg-[#ead2ff]", "bg-[#efe0ff]", "bg-purple-100", "text-[#7c3aed]");
        el.classList.add("text-[#4e4168]");

        if (text === activeLabel) {
          el.classList.add("bg-[#ead2ff]", "text-[#7c3aed]");
          el.classList.remove("text-[#4e4168]");
        }
      });
    };

    const applyMode = (mode: Mode) => {
      const resolved = resolveMode(mode);

      document.documentElement.dataset.buildsetuThemeMode = mode;
      document.documentElement.dataset.buildsetuTheme = resolved;
      document.body.dataset.buildsetuTheme = resolved;

      document.documentElement.classList.toggle("theme-dark", resolved === "dark");
      document.documentElement.classList.toggle("theme-light", resolved === "light");
      document.body.classList.toggle("theme-dark", resolved === "dark");
      document.body.classList.toggle("theme-light", resolved === "light");

      localStorage.setItem("buildsetu-theme-mode", mode);

      markMenu(mode);
    };

    const saved = localStorage.getItem("buildsetu-theme-mode");
    applyMode(isMode(saved) ? saved : "light");

    const handleClick = (event: MouseEvent) => {
      let el = event.target as HTMLElement | null;

      for (let i = 0; el && i < 8; i += 1) {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();

        if (text === "Light Mode") {
          event.preventDefault();
          applyMode("light");
          return;
        }

        if (text === "Dark Mode") {
          event.preventDefault();
          applyMode("dark");
          return;
        }

        if (text === "System") {
          event.preventDefault();
          applyMode("system");
          return;
        }

        el = el.parentElement;
      }
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = () => {
      const current = localStorage.getItem("buildsetu-theme-mode");
      if (current === "system") applyMode("system");
    };

    document.addEventListener("click", handleClick, true);
    media.addEventListener("change", handleSystemChange);

    const observer = new MutationObserver(() => {
      const current = localStorage.getItem("buildsetu-theme-mode");
      markMenu(isMode(current) ? current : "light");
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", handleClick, true);
      media.removeEventListener("change", handleSystemChange);
      observer.disconnect();
    };
  }, []);


  const [active, setActive] = useState<ViewKey>(() => getInitialBuildSetuViewKey());

  useEffect(() => {
    persistBuildSetuViewKey(active);
  }, [active]);

  const [selectedProject, setSelectedProject] = useState<LiveProject | null>(null);

  useEffect(() => {
    if (selectedProject) return;

    try {
      const raw = window.localStorage.getItem("buildsetu_active_project");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (parsed?.id) {
        setSelectedProject(parsed);
      }
    } catch {}
  }, [selectedProject]);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const theme = useResolvedTheme(themeMode);

  const content = () => {
    if (active === "dashboard") return <Dashboard setActive={setActive} theme={theme} />;
    if (active === "tools") return <AllToolsPage theme={theme} />;
    if (active === "projectWorkspace") {
      return (
        <ProjectTaskChatInterfaceShell
          project={selectedProject}
          setActive={setActive}
          theme={theme}
        />
      );
    }
    if (active === "projects") {
      return <ProjectsPage theme={theme} setActive={setActive} setSelectedProject={setSelectedProject} />;
    }
    if (active === "studio") return <NewProjectPage theme={theme} setActive={setActive} setSelectedProject={setSelectedProject} />;
    if (active === "renders") return <RenderStudio theme={theme} />;
    if (active === "boq") return <BoqPage theme={theme} />;
    if (active === "bbs") return <BbsPage theme={theme} />;
    if (active === "exports") return <ExportPage theme={theme} />;
    if (active === "agreements") return <ClientAgreementPage theme={theme} />;
    if (active === "reviews") return <VerificationPage theme={theme} />;
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
