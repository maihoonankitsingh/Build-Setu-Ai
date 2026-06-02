import fs from "fs/promises";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), "data");
const DATA_DIR = path.join(process.cwd(), "data", "generated");
const ASSETS_FILE = path.join(DATA_DIR, "project-assets.json");

type PlotInfo = {
  widthFt: number;
  depthFt: number;
  facing: string;
  title: string;
};

type RoomRect = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  category: string;
};

type SheetInput = {
  sheetNo: string;
  sheetType: string;
  title: string;
  purpose: string;
  projectTitle: string;
  plot: PlotInfo;
  rooms: RoomRect[];
  requestPrompt: string;
  derivedFloor: string;
};

function safe(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function slugify(value: unknown) {
  return safe(value, "sheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "sheet";
}

function esc(value: unknown) {
  return safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(value: unknown, fallback = 0) {
  const n = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function fmt(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function wrap(text: string, max = 24) {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function readAssets() {
  try {
    const raw = await fs.readFile(ASSETS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.assets)) return parsed.assets;
    if (Array.isArray(parsed?.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

async function appendAssets(newAssets: any[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = await readAssets();

  const currentProjectId = safe(newAssets?.[0]?.projectId);
  const cleaned = existing.filter((asset: any) => {
    if (!currentProjectId) return true;

    const sameProject = safe(asset?.projectId) === currentProjectId;
    const isWorkingSheet =
      safe(asset?.assetType) === "working_drawing_sheet" ||
      safe(asset?.renderType) === "locked_working_drawing_sheet" ||
      safe(asset?.imageMode) === "working_drawing_sheet" ||
      String(asset?.file || "").includes("/working-set/");

    return !(sameProject && isWorkingSheet);
  });

  const merged = [...newAssets, ...cleaned].slice(0, 1400);
  await fs.writeFile(ASSETS_FILE, JSON.stringify(merged, null, 2), "utf8");
}

function detectPlot(lock: any, projectTitle: string): PlotInfo {
  const plan = lock?.basePlan || {};
  const combined = `${projectTitle} ${JSON.stringify(plan)} ${JSON.stringify(lock?.baseAsset || {})}`;

  let width = num(plan?.widthFt || plan?.plotWidthFt, 0);
  let depth = num(plan?.depthFt || plan?.plotDepthFt, 0);

  if (!width || !depth) {
    const m = combined.match(/\b(\d{2,4})\s*(?:x|×|\*)\s*(\d{2,4})\b/i);
    if (m) {
      width = Number(m[1]);
      depth = Number(m[2]);
    }
  }

  if (!width) width = 41;
  if (!depth) depth = 51;

  const lower = combined.toLowerCase();
  const facing =
    lower.includes("south") ? "south" :
    lower.includes("east") ? "east" :
    lower.includes("west") ? "west" :
    lower.includes("north") ? "north" :
    "north";

  return {
    widthFt: width,
    depthFt: depth,
    facing,
    title: safe(plan?.title || lock?.baseAsset?.title || projectTitle, projectTitle),
  };
}

function roomCategory(name: string) {
  const t = name.toLowerCase();
  if (/toilet|bath|wash|utility|kitchen|plumbing/.test(t)) return "wet";
  if (/parking|porch|gate|road/.test(t)) return "parking";
  if (/stair/.test(t)) return "stair";
  if (/bed/.test(t)) return "bedroom";
  if (/living|drawing|dining|lounge/.test(t)) return "living";
  if (/puja|mandir/.test(t)) return "puja";
  return "room";
}

function normalizeRooms(lock: any, plot: PlotInfo, derivedFloor: string): RoomRect[] {
  const rawRooms = Array.isArray(lock?.basePlan?.rooms) ? lock.basePlan.rooms : [];

  const extracted = rawRooms
    .map((room: any, index: number): RoomRect | null => {
      const name = safe(room?.name || room?.label || room?.title, `Room ${index + 1}`);
      const x = num(room?.x ?? room?.left ?? room?.rect?.x, NaN);
      const y = num(room?.y ?? room?.top ?? room?.rect?.y, NaN);
      const w = num(room?.w ?? room?.width ?? room?.rect?.w, NaN);
      const h = num(room?.h ?? room?.height ?? room?.rect?.h, NaN);

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h) || w <= 1 || h <= 1) {
        return null;
      }

      return {
        id: `r-${index + 1}`,
        name,
        x,
        y,
        w,
        h,
        category: roomCategory(name),
      };
    })
    .filter(Boolean) as RoomRect[];

  if (extracted.length >= 5) return extracted;

  return fallbackResidentialRooms(plot, derivedFloor);
}

function fallbackResidentialRooms(plot: PlotInfo, derivedFloor: string): RoomRect[] {
  const W = plot.widthFt;
  const D = plot.depthFt;
  const isUpper = Boolean(derivedFloor && !/ground/i.test(derivedFloor));

  const x0 = 0;
  const x1 = W * 0.34;
  const x2 = W * 0.66;
  const y0 = 0;
  const y1 = D * 0.22;
  const y2 = D * 0.52;
  const y3 = D * 0.75;

  if (isUpper) {
    return [
      { id: "r1", name: "Family Lounge", x: x0, y: y0, w: x2, h: y1, category: "living" },
      { id: "r2", name: "Bedroom 1", x: x2, y: y0, w: W - x2, h: y1, category: "bedroom" },
      { id: "r3", name: "Bedroom 2", x: x0, y: y1, w: x1, h: y2 - y1, category: "bedroom" },
      { id: "r4", name: "Toilet Stack", x: x1, y: y1, w: W * 0.16, h: D * 0.16, category: "wet" },
      { id: "r5", name: "Staircase", x: x2, y: y1, w: W - x2, h: D * 0.22, category: "stair" },
      { id: "r6", name: "Open Terrace", x: x0, y: y2, w: x2, h: D - y2, category: "room" },
      { id: "r7", name: "Pantry", x: x2, y: y2, w: W - x2, h: D * 0.16, category: "wet" },
      { id: "r8", name: "Balcony / Sitout", x: x2, y: y3, w: W - x2, h: D - y3, category: "living" },
    ];
  }

  return [
    { id: "r1", name: "Parking / Porch", x: x2, y: y0, w: W - x2, h: y1, category: "parking" },
    { id: "r2", name: "Drawing Room", x: x0, y: y0, w: x1, h: y1, category: "living" },
    { id: "r3", name: "Living Room", x: x1, y: y0, w: x2 - x1, h: y1, category: "living" },
    { id: "r4", name: "Master Bedroom", x: x0, y: y1, w: x1, h: y2 - y1, category: "bedroom" },
    { id: "r5", name: "Dining Area", x: x1, y: y1, w: x2 - x1, h: y2 - y1, category: "living" },
    { id: "r6", name: "Kitchen", x: x2, y: y1, w: W - x2, h: D * 0.18, category: "wet" },
    { id: "r7", name: "Staircase", x: x2, y: y1 + D * 0.18, w: W - x2, h: D * 0.18, category: "stair" },
    { id: "r8", name: "Attached Toilet", x: x0, y: y2, w: W * 0.17, h: D * 0.12, category: "wet" },
    { id: "r9", name: "Bedroom 2", x: x0, y: y2 + D * 0.12, w: x1, h: D - (y2 + D * 0.12), category: "bedroom" },
    { id: "r10", name: "Puja", x: x1, y: y2, w: W * 0.16, h: D * 0.11, category: "puja" },
    { id: "r11", name: "Common Toilet", x: x1 + W * 0.16, y: y2, w: W * 0.16, h: D * 0.12, category: "wet" },
    { id: "r12", name: "Bedroom 3", x: x1, y: y2 + D * 0.12, w: x2 - x1, h: D - (y2 + D * 0.12), category: "bedroom" },
    { id: "r13", name: "Utility / Wash", x: x2, y: y2, w: W - x2, h: D * 0.12, category: "wet" },
    { id: "r14", name: "Store / Lobby", x: x2, y: y2 + D * 0.12, w: W - x2, h: D - (y2 + D * 0.12), category: "room" },
  ];
}

function colorFor(room: RoomRect) {
  if (room.category === "wet") return "#dbeafe";
  if (room.category === "bedroom") return "#fef3c7";
  if (room.category === "living") return "#ecfdf5";
  if (room.category === "parking") return "#e5e7eb";
  if (room.category === "stair") return "#ede9fe";
  if (room.category === "puja") return "#fce7f3";
  return "#f8fafc";
}

function createMapper(plot: PlotInfo, originX = 110, originY = 290, maxW = 1040, maxH = 1360) {
  const scale = Math.min(maxW / plot.widthFt, maxH / plot.depthFt);
  const planW = plot.widthFt * scale;
  const planH = plot.depthFt * scale;
  const offsetX = originX + (maxW - planW) / 2;
  const offsetY = originY + (maxH - planH) / 2;

  return {
    scale,
    planW,
    planH,
    offsetX,
    offsetY,
    x: (ft: number) => offsetX + ft * scale,
    y: (ft: number) => offsetY + ft * scale,
    w: (ft: number) => ft * scale,
    h: (ft: number) => ft * scale,
  };
}

function renderRoomBase(room: RoomRect, map: ReturnType<typeof createMapper>, faded = false) {
  const x = map.x(room.x);
  const y = map.y(room.y);
  const w = map.w(room.w);
  const h = map.h(room.h);
  const labelLines = wrap(room.name.toUpperCase(), 15).slice(0, 2);
  const opacity = faded ? 0.36 : 1;

  const label = labelLines
    .map((line, i) => `<tspan x="${x + w / 2}" dy="${i === 0 ? 0 : 25}">${esc(line)}</tspan>`)
    .join("");

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colorFor(room)}" stroke="#111827" stroke-width="4" opacity="${opacity}"/>
    <text x="${x + w / 2}" y="${y + h / 2 - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#111827" opacity="${opacity}">${label}</text>
    <text x="${x + w / 2}" y="${y + h / 2 + 42}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#374151" opacity="${opacity}">${fmt(room.w)}' x ${fmt(room.h)}'</text>
  `;
}

function roomCenter(room: RoomRect, map: ReturnType<typeof createMapper>) {
  return {
    x: map.x(room.x + room.w / 2),
    y: map.y(room.y + room.h / 2),
  };
}

function renderFurniture(room: RoomRect, map: ReturnType<typeof createMapper>) {
  const x = map.x(room.x);
  const y = map.y(room.y);
  const w = map.w(room.w);
  const h = map.h(room.h);
  const t = room.name.toLowerCase();

  if (/bed/.test(t)) {
    return `
      <rect x="${x + w * 0.18}" y="${y + h * 0.22}" width="${w * 0.48}" height="${h * 0.42}" fill="#ffffff" stroke="#6b7280" stroke-width="2"/>
      <rect x="${x + w * 0.2}" y="${y + h * 0.25}" width="${w * 0.20}" height="${h * 0.12}" fill="#f3f4f6" stroke="#6b7280"/>
      <rect x="${x + w * 0.42}" y="${y + h * 0.25}" width="${w * 0.20}" height="${h * 0.12}" fill="#f3f4f6" stroke="#6b7280"/>
      <rect x="${x + w * 0.75}" y="${y + h * 0.1}" width="${w * 0.10}" height="${h * 0.72}" fill="#a16207" opacity="0.65"/>
    `;
  }

  if (/living|drawing|lounge/.test(t)) {
    return `
      <rect x="${x + w * 0.12}" y="${y + h * 0.15}" width="${w * 0.18}" height="${h * 0.55}" fill="#d6d3d1" stroke="#78716c"/>
      <rect x="${x + w * 0.35}" y="${y + h * 0.62}" width="${w * 0.42}" height="${h * 0.15}" fill="#d6d3d1" stroke="#78716c"/>
      <rect x="${x + w * 0.42}" y="${y + h * 0.35}" width="${w * 0.20}" height="${h * 0.18}" fill="#b45309" opacity="0.55"/>
    `;
  }

  if (/dining/.test(t)) {
    return `
      <rect x="${x + w * 0.35}" y="${y + h * 0.28}" width="${w * 0.30}" height="${h * 0.28}" fill="#b45309" opacity="0.65"/>
      <circle cx="${x + w * 0.28}" cy="${y + h * 0.42}" r="12" fill="#d6d3d1"/>
      <circle cx="${x + w * 0.72}" cy="${y + h * 0.42}" r="12" fill="#d6d3d1"/>
      <circle cx="${x + w * 0.50}" cy="${y + h * 0.20}" r="12" fill="#d6d3d1"/>
      <circle cx="${x + w * 0.50}" cy="${y + h * 0.65}" r="12" fill="#d6d3d1"/>
    `;
  }

  if (/kitchen/.test(t)) {
    return `
      <rect x="${x + w * 0.08}" y="${y + h * 0.15}" width="${w * 0.80}" height="${h * 0.16}" fill="#9ca3af" opacity="0.8"/>
      <rect x="${x + w * 0.65}" y="${y + h * 0.18}" width="${w * 0.16}" height="${h * 0.10}" fill="#e5e7eb" stroke="#374151"/>
      <circle cx="${x + w * 0.28}" cy="${y + h * 0.23}" r="10" fill="#111827"/>
    `;
  }

  if (/toilet|bath|wash/.test(t)) {
    return `
      <circle cx="${x + w * 0.35}" cy="${y + h * 0.48}" r="18" fill="#ffffff" stroke="#111827" stroke-width="2"/>
      <rect x="${x + w * 0.62}" y="${y + h * 0.25}" width="${w * 0.20}" height="${h * 0.18}" fill="#ffffff" stroke="#111827"/>
      <circle cx="${x + w * 0.72}" cy="${y + h * 0.75}" r="8" fill="#0ea5e9"/>
    `;
  }

  if (/stair/.test(t)) {
    const lines = Array.from({ length: 7 }, (_, i) => {
      const yy = y + h * 0.20 + i * h * 0.08;
      return `<line x1="${x + w * 0.18}" y1="${yy}" x2="${x + w * 0.82}" y2="${yy}" stroke="#111827" stroke-width="2"/>`;
    }).join("");
    return `
      ${lines}
      <path d="M ${x + w * 0.25} ${y + h * 0.82} L ${x + w * 0.75} ${y + h * 0.82}" stroke="#111827" stroke-width="3"/>
      <path d="M ${x + w * 0.75} ${y + h * 0.82} L ${x + w * 0.66} ${y + h * 0.74}" stroke="#111827" stroke-width="3"/>
      <text x="${x + w * 0.5}" y="${y + h * 0.9}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="900">UP</text>
    `;
  }

  if (/parking|porch/.test(t)) {
    return `
      <rect x="${x + w * 0.25}" y="${y + h * 0.18}" width="${w * 0.38}" height="${h * 0.66}" rx="25" fill="#f9fafb" stroke="#111827" stroke-width="2"/>
      <circle cx="${x + w * 0.30}" cy="${y + h * 0.36}" r="10" fill="#9ca3af"/>
      <circle cx="${x + w * 0.58}" cy="${y + h * 0.36}" r="10" fill="#9ca3af"/>
      <circle cx="${x + w * 0.30}" cy="${y + h * 0.68}" r="10" fill="#9ca3af"/>
      <circle cx="${x + w * 0.58}" cy="${y + h * 0.68}" r="10" fill="#9ca3af"/>
    `;
  }

  if (/puja|mandir/.test(t)) {
    return `
      <rect x="${x + w * 0.35}" y="${y + h * 0.22}" width="${w * 0.30}" height="${h * 0.42}" fill="#fde68a" stroke="#92400e"/>
      <text x="${x + w * 0.50}" y="${y + h * 0.78}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="900" fill="#92400e">NE</text>
    `;
  }

  return "";
}

function renderDimensionOverlay(plot: PlotInfo, rooms: RoomRect[], map: ReturnType<typeof createMapper>) {
  const left = map.offsetX;
  const top = map.offsetY;
  const right = map.offsetX + map.planW;
  const bottom = map.offsetY + map.planH;

  const roomDims = rooms
    .slice(0, 14)
    .map((room) => {
      const x = map.x(room.x);
      const y = map.y(room.y);
      const w = map.w(room.w);
      const h = map.h(room.h);
      return `
        <line x1="${x}" y1="${y + h + 8}" x2="${x + w}" y2="${y + h + 8}" stroke="#2563eb" stroke-width="2"/>
        <text x="${x + w / 2}" y="${y + h + 27}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="800" fill="#2563eb">${fmt(room.w)}'</text>
      `;
    })
    .join("");

  return `
    <g>
      <line x1="${left}" y1="${top - 55}" x2="${right}" y2="${top - 55}" stroke="#111827" stroke-width="3"/>
      <line x1="${left}" y1="${top - 75}" x2="${left}" y2="${top - 35}" stroke="#111827" stroke-width="3"/>
      <line x1="${right}" y1="${top - 75}" x2="${right}" y2="${top - 35}" stroke="#111827" stroke-width="3"/>
      <text x="${(left + right) / 2}" y="${top - 70}" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">${fmt(plot.widthFt)}'</text>

      <line x1="${left - 55}" y1="${top}" x2="${left - 55}" y2="${bottom}" stroke="#111827" stroke-width="3"/>
      <line x1="${left - 75}" y1="${top}" x2="${left - 35}" y2="${top}" stroke="#111827" stroke-width="3"/>
      <line x1="${left - 75}" y1="${bottom}" x2="${left - 35}" y2="${bottom}" stroke="#111827" stroke-width="3"/>
      <text x="${left - 82}" y="${(top + bottom) / 2}" text-anchor="middle" transform="rotate(-90 ${left - 82} ${(top + bottom) / 2})" font-family="Arial" font-size="28" font-weight="900">${fmt(plot.depthFt)}'</text>
      ${roomDims}
    </g>
  `;
}

function columnPositions(plot: PlotInfo) {
  const xs = [0, plot.widthFt * 0.33, plot.widthFt * 0.66, plot.widthFt];
  const ys = [0, plot.depthFt * 0.33, plot.depthFt * 0.66, plot.depthFt];
  const points: { x: number; y: number; label: string }[] = [];

  let count = 1;
  for (const y of ys) {
    for (const x of xs) {
      points.push({ x, y, label: `C${count++}` });
    }
  }
  return points;
}

function renderColumnOverlay(plot: PlotInfo, map: ReturnType<typeof createMapper>) {
  return columnPositions(plot).map((p) => {
    const x = map.x(p.x);
    const y = map.y(p.y);
    return `
      <rect x="${x - 13}" y="${y - 13}" width="26" height="26" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/>
      <text x="${x + 18}" y="${y - 16}" font-family="Arial" font-size="14" font-weight="900" fill="#dc2626">${p.label}</text>
    `;
  }).join("");
}

function renderBeamOverlay(plot: PlotInfo, map: ReturnType<typeof createMapper>) {
  const xs = [0, plot.widthFt * 0.33, plot.widthFt * 0.66, plot.widthFt];
  const ys = [0, plot.depthFt * 0.33, plot.depthFt * 0.66, plot.depthFt];

  const hLines = ys.map((y) => `<line x1="${map.x(0)}" y1="${map.y(y)}" x2="${map.x(plot.widthFt)}" y2="${map.y(y)}" stroke="#7c3aed" stroke-width="8" opacity="0.75"/>`).join("");
  const vLines = xs.map((x) => `<line x1="${map.x(x)}" y1="${map.y(0)}" x2="${map.x(x)}" y2="${map.y(plot.depthFt)}" stroke="#7c3aed" stroke-width="8" opacity="0.75"/>`).join("");

  return `<g>${hLines}${vLines}</g>`;
}

function renderElectricalOverlay(rooms: RoomRect[], map: ReturnType<typeof createMapper>) {
  return rooms.map((room) => {
    const c = roomCenter(room, map);
    const x = map.x(room.x);
    const y = map.y(room.y);
    return `
      <circle cx="${c.x}" cy="${c.y}" r="13" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
      <text x="${c.x}" y="${c.y + 6}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="900" fill="#111827">L</text>
      <rect x="${x + 8}" y="${y + 8}" width="22" height="16" fill="#22c55e" stroke="#14532d"/>
    `;
  }).join("");
}

function renderPlumbingOverlay(plot: PlotInfo, rooms: RoomRect[], map: ReturnType<typeof createMapper>, drainage = false) {
  const wetRooms = rooms.filter((room) => /wet|toilet|kitchen|utility|wash|bath/i.test(`${room.category} ${room.name}`));
  const shaftX = map.x(plot.widthFt * 0.83);
  const outY = map.y(plot.depthFt + 2);

  const lines = wetRooms.map((room) => {
    const c = roomCenter(room, map);
    return `
      <path d="M ${c.x} ${c.y} L ${shaftX} ${c.y} L ${shaftX} ${outY}" fill="none" stroke="${drainage ? "#92400e" : "#0ea5e9"}" stroke-width="${drainage ? 5 : 4}" opacity="0.9"/>
      <circle cx="${c.x}" cy="${c.y}" r="9" fill="${drainage ? "#92400e" : "#0ea5e9"}"/>
    `;
  }).join("");

  return `
    <g>
      ${lines}
      <rect x="${shaftX - 18}" y="${map.y(0)}" width="36" height="${map.planH}" fill="${drainage ? "#fed7aa" : "#bae6fd"}" opacity="0.45" stroke="${drainage ? "#92400e" : "#0369a1"}" stroke-dasharray="8 6"/>
      <text x="${shaftX + 30}" y="${map.y(plot.depthFt * 0.5)}" font-family="Arial" font-size="18" font-weight="900" fill="${drainage ? "#92400e" : "#0369a1"}">SERVICE SHAFT</text>
    </g>
  `;
}

function renderPlanCanvas(input: SheetInput, mode: string) {
  const map = createMapper(input.plot);
  const faded = ["column_layout", "beam_layout", "electrical_layout", "plumbing_layout", "drainage_layout"].includes(mode);
  const roomBase = input.rooms.map((room) => renderRoomBase(room, map, faded)).join("");
  const furniture = ["furniture_plan", "presentation_plan", "floor_plan", "dimension_plan"].includes(mode)
    ? input.rooms.map((room) => renderFurniture(room, map)).join("")
    : "";

  const dimensions = mode === "dimension_plan" || mode === "floor_plan" || mode === "presentation_plan"
    ? renderDimensionOverlay(input.plot, input.rooms, map)
    : "";

  const columns = mode === "column_layout" || mode === "footing_layout" || mode === "slab_layout"
    ? renderColumnOverlay(input.plot, map)
    : "";

  const beams = mode === "beam_layout" || mode === "slab_layout"
    ? renderBeamOverlay(input.plot, map)
    : "";

  const electrical = mode === "electrical_layout" ? renderElectricalOverlay(input.rooms, map) : "";
  const plumbing = mode === "plumbing_layout" ? renderPlumbingOverlay(input.plot, input.rooms, map, false) : "";
  const drainage = mode === "drainage_layout" ? renderPlumbingOverlay(input.plot, input.rooms, map, true) : "";

  return `
    <rect x="70" y="230" width="1180" height="1510" fill="#ffffff" stroke="#111827" stroke-width="3"/>
    <text x="90" y="265" font-family="Arial" font-size="22" font-weight="900" fill="#111827">${esc(input.plot.title)}</text>
    <text x="1220" y="265" text-anchor="end" font-family="Arial" font-size="18" font-weight="800" fill="#374151">Facing: ${esc(input.plot.facing.toUpperCase())}</text>
    <text x="${map.offsetX + map.planW / 2}" y="${map.offsetY - 105}" text-anchor="middle" font-family="Arial" font-size="26" font-weight="900">ROAD / ENTRY SIDE</text>
    <rect x="${map.offsetX}" y="${map.offsetY}" width="${map.planW}" height="${map.planH}" fill="none" stroke="#111827" stroke-width="8"/>
    ${roomBase}
    ${furniture}
    ${dimensions}
    ${beams}
    ${columns}
    ${electrical}
    ${plumbing}
    ${drainage}
    <text x="${map.offsetX + map.planW / 2}" y="${map.offsetY + map.planH + 48}" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900">${fmt(input.plot.widthFt)}' x ${fmt(input.plot.depthFt)}' LOCKED PLAN</text>
  `;
}

function renderToiletDetail(input: SheetInput) {
  const toiletRooms = input.rooms.filter((room) => /toilet|bath|wash/i.test(room.name)).slice(0, 2);
  const rooms = toiletRooms.length ? toiletRooms : [
    { id: "t1", name: "Common Toilet", x: 0, y: 0, w: 7, h: 5, category: "wet" },
    { id: "t2", name: "Attached Toilet", x: 0, y: 0, w: 8, h: 5, category: "wet" },
  ];

  const detailBlocks = rooms.map((room, index) => {
    const ox = index === 0 ? 130 : 820;
    const oy = 360;
    const w = 520;
    const h = 720;

    return `
      <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="#ffffff" stroke="#111827" stroke-width="4"/>
      <text x="${ox + 20}" y="${oy + 42}" font-family="Arial" font-size="26" font-weight="900">${esc(room.name.toUpperCase())}</text>
      <text x="${ox + 20}" y="${oy + 75}" font-family="Arial" font-size="18" font-weight="700">${fmt(room.w)}' x ${fmt(room.h)}' enlarged working detail</text>

      <rect x="${ox + 70}" y="${oy + 130}" width="${w - 140}" height="${h - 220}" fill="#eff6ff" stroke="#111827" stroke-width="4"/>
      <path d="M ${ox + 70} ${oy + 130} L ${ox + 150} ${oy + 210}" stroke="#111827" stroke-width="3" fill="none"/>
      <text x="${ox + 95}" y="${oy + 195}" font-family="Arial" font-size="15" font-weight="800">D2</text>

      <circle cx="${ox + 190}" cy="${oy + 325}" r="42" fill="#ffffff" stroke="#111827" stroke-width="3"/>
      <rect x="${ox + 150}" y="${oy + 365}" width="80" height="28" fill="#ffffff" stroke="#111827"/>
      <text x="${ox + 190}" y="${oy + 430}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900">WC</text>

      <rect x="${ox + 345}" y="${oy + 200}" width="80" height="60" fill="#ffffff" stroke="#111827" stroke-width="3"/>
      <circle cx="${ox + 385}" cy="${oy + 230}" r="16" fill="#dbeafe" stroke="#111827"/>
      <text x="${ox + 385}" y="${oy + 290}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900">BASIN</text>

      <circle cx="${ox + 390}" cy="${oy + 470}" r="14" fill="#0ea5e9"/>
      <text x="${ox + 390}" y="${oy + 510}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#0369a1">FT</text>

      <path d="M ${ox + 190} ${oy + 325} L ${ox + 390} ${oy + 470} L ${ox + 460} ${oy + 560}" stroke="#92400e" stroke-width="5" fill="none"/>
      <path d="M ${ox + 385} ${oy + 230} L ${ox + 390} ${oy + 470}" stroke="#0ea5e9" stroke-width="4" fill="none"/>

      <text x="${ox + 70}" y="${oy + 665}" font-family="Arial" font-size="17" font-weight="800">Notes: wet wall, floor trap slope, waterproofing, tile dado.</text>
    `;
  }).join("");

  return `
    <rect x="70" y="230" width="1460" height="1510" fill="#ffffff" stroke="#111827" stroke-width="3"/>
    ${detailBlocks}
    <rect x="130" y="1160" width="1280" height="430" fill="#fff7ed" stroke="#9a3412" stroke-width="3"/>
    <text x="160" y="1210" font-family="Arial" font-size="28" font-weight="900" fill="#9a3412">TOILET EXECUTION NOTES</text>
    <text x="160" y="1260" font-family="Arial" font-size="22" font-weight="700">• Maintain slope towards floor trap.</text>
    <text x="160" y="1300" font-family="Arial" font-size="22" font-weight="700">• WC soil pipe, basin waste and floor drain to connect to service shaft.</text>
    <text x="160" y="1340" font-family="Arial" font-size="22" font-weight="700">• Final waterproofing, pipe diameter and trap details plumber/MEP engineer verify kare.</text>
    <text x="160" y="1380" font-family="Arial" font-size="22" font-weight="700">• Door swing should not clash with WC or basin.</text>
  `;
}

function renderScheduleSheet(input: SheetInput) {
  const rows = [
    ["D1", "Main Door", "3'-6\" x 7'-0\"", "Entry / living"],
    ["D2", "Internal Door", "3'-0\" x 7'-0\"", "Bedrooms / kitchen"],
    ["D3", "Toilet Door", "2'-6\" x 7'-0\"", "Toilets"],
    ["W1", "Window", "4'-0\" x 4'-0\"", "Bedrooms / living"],
    ["W2", "Ventilator", "2'-0\" x 1'-6\"", "Toilets"],
  ];

  const trs = rows.map((row, index) => {
    const y = 430 + index * 80;
    return `
      <rect x="140" y="${y}" width="1180" height="80" fill="${index % 2 ? "#f8fafc" : "#ffffff"}" stroke="#111827"/>
      <text x="170" y="${y + 50}" font-family="Arial" font-size="22" font-weight="900">${row[0]}</text>
      <text x="330" y="${y + 50}" font-family="Arial" font-size="22" font-weight="700">${row[1]}</text>
      <text x="650" y="${y + 50}" font-family="Arial" font-size="22" font-weight="700">${row[2]}</text>
      <text x="930" y="${y + 50}" font-family="Arial" font-size="22" font-weight="700">${row[3]}</text>
    `;
  }).join("");

  return `
    <rect x="70" y="230" width="1460" height="1510" fill="#ffffff" stroke="#111827" stroke-width="3"/>
    <text x="140" y="330" font-family="Arial" font-size="34" font-weight="900">DOOR / WINDOW / VENTILATOR SCHEDULE</text>
    <rect x="140" y="370" width="1180" height="60" fill="#111827"/>
    <text x="170" y="410" font-family="Arial" font-size="20" font-weight="900" fill="#ffffff">MARK</text>
    <text x="330" y="410" font-family="Arial" font-size="20" font-weight="900" fill="#ffffff">TYPE</text>
    <text x="650" y="410" font-family="Arial" font-size="20" font-weight="900" fill="#ffffff">SIZE</text>
    <text x="930" y="410" font-family="Arial" font-size="20" font-weight="900" fill="#ffffff">LOCATION</text>
    ${trs}
    <text x="140" y="950" font-family="Arial" font-size="24" font-weight="900">Note: final sizes site/client requirement aur ventilation rule ke according verify honge.</text>
  `;
}

function renderElevationOrSection(input: SheetInput, section = false) {
  return `
    <rect x="70" y="230" width="1460" height="1510" fill="#ffffff" stroke="#111827" stroke-width="3"/>
    <text x="130" y="320" font-family="Arial" font-size="34" font-weight="900">${section ? "BUILDING SECTION CONCEPT" : "FRONT ELEVATION CONCEPT"}</text>
    <line x1="150" y1="1340" x2="1350" y2="1340" stroke="#111827" stroke-width="5"/>
    <rect x="250" y="820" width="900" height="520" fill="#f8fafc" stroke="#111827" stroke-width="5"/>
    <line x1="250" y1="1080" x2="1150" y2="1080" stroke="#111827" stroke-width="4"/>
    <rect x="340" y="910" width="160" height="120" fill="#dbeafe" stroke="#111827" stroke-width="3"/>
    <rect x="640" y="910" width="160" height="120" fill="#dbeafe" stroke="#111827" stroke-width="3"/>
    <rect x="940" y="910" width="120" height="430" fill="#e5e7eb" stroke="#111827" stroke-width="3"/>
    <text x="700" y="1450" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900">${section ? "Section levels/slab/stair concept from locked plan" : "Facade opening concept from locked plan"}</text>
    <text x="130" y="1540" font-family="Arial" font-size="22" font-weight="700">Final elevation/section requires actual heights, plinth, floor level, lintel, slab and local approval format.</text>
  `;
}

function renderSitePlan(input: SheetInput) {
  return `
    <rect x="70" y="230" width="1460" height="1510" fill="#ffffff" stroke="#111827" stroke-width="3"/>
    <text x="130" y="320" font-family="Arial" font-size="34" font-weight="900">SITE / SETBACK PLAN</text>
    <rect x="330" y="430" width="750" height="930" fill="#f9fafb" stroke="#111827" stroke-width="6"/>
    <rect x="400" y="500" width="610" height="790" fill="#ffffff" stroke="#2563eb" stroke-width="4" stroke-dasharray="12 10"/>
    <text x="705" y="400" text-anchor="middle" font-family="Arial" font-size="30" font-weight="900">${fmt(input.plot.widthFt)}'</text>
    <text x="1115" y="900" text-anchor="middle" transform="rotate(90 1115 900)" font-family="Arial" font-size="30" font-weight="900">${fmt(input.plot.depthFt)}'</text>
    <text x="705" y="1450" text-anchor="middle" font-family="Arial" font-size="34" font-weight="900">ROAD / ${esc(input.plot.facing.toUpperCase())} FACING</text>
    <text x="130" y="1550" font-family="Arial" font-size="22" font-weight="700">Setback dimensions must be filled as per city/municipality bylaws.</text>
  `;
}

function renderIndexSheet(input: SheetInput, allSheets: any[]) {
  const list = allSheets.slice(0, 19).map((sheet: any, index: number) => {
    const y = 430 + index * 50;
    return `<text x="150" y="${y}" font-family="Arial" font-size="24" font-weight="800">${String(index + 1).padStart(2, "0")}. ${esc(sheet.title || sheet.type)}</text>`;
  }).join("");

  return `
    <rect x="70" y="230" width="1460" height="1510" fill="#ffffff" stroke="#111827" stroke-width="3"/>
    <text x="130" y="320" font-family="Arial" font-size="38" font-weight="900">COMPLETE WORKING DRAWING SET INDEX</text>
    <text x="130" y="365" font-family="Arial" font-size="24" font-weight="700">${esc(input.plot.title)} | ${fmt(input.plot.widthFt)}' x ${fmt(input.plot.depthFt)}' | ${esc(input.plot.facing.toUpperCase())}</text>
    ${list}
    <text x="130" y="1500" font-family="Arial" font-size="22" font-weight="700">All sheets are derived from locked base plan. Final execution requires architect/engineer validation.</text>
  `;
}

function buildSvg(input: SheetInput, allSheets: any[]) {
  const mode = input.sheetType;
  let main = "";

  if (mode === "complete_working_set") main = renderIndexSheet(input, allSheets);
  else if (mode === "toilet_detail") main = renderToiletDetail(input);
  else if (mode === "door_window_schedule") main = renderScheduleSheet(input);
  else if (mode === "elevation") main = renderElevationOrSection(input, false);
  else if (mode === "section") main = renderElevationOrSection(input, true);
  else if (mode === "site_plan") main = renderSitePlan(input);
  else main = renderPlanCanvas(input, mode);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2200" viewBox="0 0 1600 2200">
  <rect width="1600" height="2200" fill="#f1f5f9"/>
  <rect x="35" y="35" width="1530" height="2130" fill="#ffffff" stroke="#111827" stroke-width="4"/>
  <rect x="70" y="70" width="1460" height="130" fill="#111827"/>
  <text x="100" y="118" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#ffffff">${esc(input.projectTitle)}</text>
  <text x="100" y="172" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff">${esc(input.title)}</text>
  <text x="1480" y="118" text-anchor="end" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#ffffff">${esc(input.sheetNo)}</text>
  ${main}
  <rect x="70" y="2060" width="1460" height="70" fill="#111827"/>
  <text x="100" y="2105" font-family="Arial" font-size="20" font-weight="800" fill="#ffffff">Generated from locked project plan. Concept drawings only; final RCC/MEP/approval drawings require licensed professional validation.</text>
</svg>`;
}

export async function createLockedWorkingDrawingAssets(args: {
  projectId: string;
  projectTitle: string;
  lock: any;
  planningPackage: any;
  request: any;
}) {
  const projectId = slugify(args.projectId);
  const projectTitle = safe(args.projectTitle, "Locked Project");
  const lock = args.lock || {};
  const plot = detectPlot(lock, projectTitle);
  const derivedFloor = safe(args.request?.derivedFloor);
  const rooms = normalizeRooms(lock, plot, derivedFloor);

  const workingPlans = Array.isArray(args.planningPackage?.workingPlans)
    ? args.planningPackage.workingPlans
    : [];

  if (!workingPlans.length) {
    return {
      ok: false,
      reason: "No working plans available",
      assets: [],
    };
  }

  const now = Date.now();
  const outDir = path.join(DATA_DIR, "ai-images", projectId, "working-set");
  await fs.mkdir(outDir, { recursive: true });

  const assets: any[] = [];

  for (let i = 0; i < workingPlans.length; i++) {
    const sheet = workingPlans[i] || {};
    const sheetNo = `A-${String(i + 1).padStart(2, "0")}`;
    const sheetType = safe(sheet.type || "working_sheet");
    const title = safe(sheet.title || sheetType, `Working Sheet ${i + 1}`);
    const slug = slugify(`${sheetNo}-${sheetType}`);
    const fileName = `${now}-${slug}.svg`;
    const fileRel = `generated/ai-images/${projectId}/working-set/${fileName}`;
    const fileAbs = path.join(outDir, fileName);

    const svg = buildSvg({
      sheetNo,
      sheetType,
      title,
      purpose: safe(sheet.purpose),
      projectTitle,
      plot,
      rooms,
      requestPrompt: safe(args.request?.prompt, "Locked working set"),
      derivedFloor,
    }, workingPlans);

    await fs.writeFile(fileAbs, svg, "utf8");

    const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(fileRel)}`;

    assets.push({
      id: `${now}-${slug}`,
      type: "image",
      projectId,
      projectTitle,
      toolSlug: "floor-plan-ai",
      toolName: "Floor Plan AI",
      renderType: "locked_working_drawing_sheet",
      assetType: "working_drawing_sheet",
      imageMode: "working_drawing_sheet",
      title,
      viewLabel: title,
      sheetNo,
      sheetType,
      imageUrl,
      publicUrl: `/${fileRel}`,
      file: fileRel,
      source: "real_working_drawing_renderer_v1",
      generationMode: "real_working_drawing_svg_v1",
      createdAt: new Date().toISOString(),
    });
  }

  await appendAssets(assets);

  return {
    ok: true,
    source: "real_working_drawing_renderer_v1",
    count: assets.length,
    assets,
    packageAsset:
      assets.find((asset: any) => asset.sheetType === "floor_plan") ||
      assets.find((asset: any) => asset.sheetType === "presentation_plan") ||
      assets[0] ||
      null,
  };
}
