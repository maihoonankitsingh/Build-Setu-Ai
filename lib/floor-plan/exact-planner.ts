import fs from "fs/promises";
import path from "path";

type Facing = "north" | "south" | "east" | "west";

type ExactPlanRequest = {
  projectId: string;
  projectTitle: string;
  prompt: string;
  widthFt: number;
  depthFt: number;
  facing: Facing;
  floor: "ground" | "first" | "second";
  bedrooms: number;
  toilets: number;
  parking: boolean;
  staircase: boolean;
  puja: boolean;
  kitchen: boolean;
  living: boolean;
  dining: boolean;
};

type RoomItem = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: string;
};

type ExactPlan = {
  title: string;
  subtitle: string;
  widthFt: number;
  depthFt: number;
  facing: Facing;
  roadLabel: string;
  floorLabel: string;
  rooms: RoomItem[];
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const ASSETS_FILE = path.join(DATA_DIR, "project-assets.json");

function safeText(value: unknown, fallback = ""): string {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeFacingValue(value: unknown): Facing | "" {
  const text = String(value || "").toLowerCase().trim();
  if (!text) return "";

  const corner = text.match(/\b(north|south|east|west)\s*[-/]\s*(north|south|east|west)\b/);
  if (corner?.[1]) return corner[1] as Facing;

  if (/front\s*road\s*(is|:)?\s*(on\s*)?east|east\s*front|frontage.*east|road\s*on\s*east|facing\s*east|east[-\s]*facing/.test(text)) return "east";
  if (/front\s*road\s*(is|:)?\s*(on\s*)?north|north\s*front|frontage.*north|road\s*on\s*north|facing\s*north|north[-\s]*facing/.test(text)) return "north";
  if (/front\s*road\s*(is|:)?\s*(on\s*)?south|south\s*front|frontage.*south|road\s*on\s*south|facing\s*south|south[-\s]*facing/.test(text)) return "south";
  if (/front\s*road\s*(is|:)?\s*(on\s*)?west|west\s*front|frontage.*west|road\s*on\s*west|facing\s*west|west[-\s]*facing/.test(text)) return "west";

  if (/\beast\b/.test(text)) return "east";
  if (/\bnorth\b/.test(text)) return "north";
  if (/\bsouth\b/.test(text)) return "south";
  if (/\bwest\b/.test(text)) return "west";

  return "";
}

function detectFacing(text: string): Facing {
  const t = text.toLowerCase();

  const explicit =
    normalizeFacingValue(t.match(/(?:north|south|east|west)[-\s]*facing/)?.[0]) ||
    normalizeFacingValue(t.match(/facing\s*(?:north|south|east|west)/)?.[0]) ||
    normalizeFacingValue(t.match(/road\s*on\s*(?:north|south|east|west)/)?.[0]) ||
    normalizeFacingValue(t.match(/(?:north|south|east|west)\s*side/)?.[0]);

  if (explicit) return explicit;

  // Avoid picking south/east/west from vastu zone words like south-east/south-west
  // unless user explicitly says plot/facing/road direction.
  if (/\bnorth\b/.test(t)) return "north";
  if (/\bsouth\b/.test(t)) return "south";
  if (/\beast\b/.test(t)) return "east";
  if (/\bwest\b/.test(t)) return "west";

  return "north";
}

// BUILDSETU_EXACT_PLANNER_FLOOR_DETECTION_V8_1
function detectFloor(text: string): "ground" | "first" | "second" {
  const t = String(text || "").toLowerCase();

  // "G+1" means building has ground + first floor; it is not itself a first-floor drawing request.
  if (/(?:floor\s*:\s*ground|ground\s+floor|gf\b|floor\s*0|\bground\b)/.test(t)) {
    return "ground";
  }

  if (/(?:floor\s*:\s*second|second\s+floor|2nd\s+floor|floor\s*2|\bg\s*\+\s*2\b)/.test(t)) {
    return "second";
  }

  if (/(?:floor\s*:\s*first|first\s+floor|1st\s+floor|floor\s*1|\bff\b|upper\s+floor)/.test(t)) {
    return "first";
  }

  return "ground";
}

function parsePlotSize(text: string): { widthFt: number; depthFt: number } {
  const m = text.match(/(\d{1,3})\s*[x×]\s*(\d{1,3})/i);
  if (m) {
    return {
      widthFt: Number(m[1]) || 41,
      depthFt: Number(m[2]) || 51,
    };
  }
  return { widthFt: 41, depthFt: 51 };
}

function detectBedrooms(text: string): number {
  const t = text.toLowerCase();

  if (/ground\s+floor[\s\S]{0,220}(?:exactly\s*)?(?:1|one)\s+bed(room)?\s+only/.test(t)) return 1;
  if (/ground\s+floor[\s\S]{0,220}(?:1|one)\s+bed(room)?/.test(t)) return 1;
  if (/(?:1|one)\s+bed(room)?\s+only/.test(t)) return 1;
  if (/ground\s+floor\s+must\s+have\s+exactly\s+1\s+bedroom/.test(t)) return 1;

  const bhk = t.match(/(\d)\s*bhk/);
  if (bhk) return Math.max(1, Number(bhk[1]) || 3);

  const bed = t.match(/(\d)\s*bed(room)?/);
  if (bed) return Math.max(1, Number(bed[1]) || 3);

  return 3;
}

function detectToilets(text: string): number {
  const t = text.toLowerCase();
  const m = t.match(/(\d)\s*(toilet|bath|washroom)/);
  if (m) return Math.max(1, Number(m[1]) || 2);
  return 2;
}

function normalizeRequest(body: any): ExactPlanRequest {
  const projectId =
    safeText(body?.projectId, "default-project")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 120) || "default-project";

  const projectTitle = safeText(body?.projectTitle || body?.projectName, "Selected Project");
  const prompt = safeText(body?.imagePrompt || body?.prompt || body?.userPrompt, "");
  const combined = `${projectTitle} ${prompt} ${safeText(body?.plotSize)} ${safeText(body?.facing)}`.trim();

  const size = parsePlotSize(combined);

  const agentPlot = body?.architectAgent?.requirement?.plot || {};
  const agentWidth = Number(agentPlot?.widthFt || 0);
  const agentDepth = Number(agentPlot?.depthFt || 0);
  const widthFt = agentWidth > 0 ? agentWidth : size.widthFt;
  const depthFt = agentDepth > 0 ? agentDepth : size.depthFt;

  const facing =
    normalizeFacingValue(agentPlot?.facing) ||
    normalizeFacingValue(body?.facing) ||
    detectFacing(combined);

  const agentFloorRaw = String(body?.architectAgent?.requirement?.floor || "").toLowerCase();
  const floor =
    agentFloorRaw.includes("second") ? "second" :
    agentFloorRaw.includes("first") ? "first" :
    agentFloorRaw.includes("ground") ? "ground" :
    detectFloor(combined);

  return {
    projectId,
    projectTitle,
    prompt,
    widthFt,
    depthFt,
    facing,
    floor,
    bedrooms: detectBedrooms(combined),
    toilets: detectToilets(combined),
    parking: /parking|porch|car/i.test(combined) || true,
    staircase: /stair|stairs|staircase/i.test(combined) || true,
    puja: /puja|mandir|pooja/i.test(combined) || true,
    kitchen: true,
    living: true,
    dining: true,
  };
}

function room(id: string, name: string, x: number, y: number, w: number, h: number, kind = "room"): RoomItem {
  return { id, name, x, y, w, h, kind };
}


function is49x57EastNorthGroundRequest(req: ExactPlanRequest): boolean {
  const t = `${req.projectTitle} ${req.prompt}`.toLowerCase();
  const plotMatch = Math.round(req.widthFt) === 49 && Math.round(req.depthFt) === 57;
  const eastFront = req.facing === "east" || /front\s*road.*east|east\s*front|east[-\s]*north/.test(t);
  const northSide = /north\s*side|side\s*road.*north|east[-\s]*north|east\s+north|corner\s*plot/.test(t);
  return plotMatch && eastFront && northSide && req.floor === "ground";
}

function build49x57EastNorthGroundFloorPlan(req: ExactPlanRequest): ExactPlan {
  const rooms: RoomItem[] = [
    room("parking", "CAR + BIKE PARKING", 34, 4, 13, 18, "parking"),
    room("living", "LIVING ROOM", 3, 4, 23, 14, "living"),
    room("puja", "PUJA", 27, 4, 6, 5, "puja"),

    room("dining", "DINING", 18, 20, 14, 11, "dining"),
    room("entry_lobby", "ENTRY / LOBBY", 34, 24, 13, 10, "lobby"),

    room("staircase", "STAIRCASE", 27, 37, 8, 14, "stair"),
    room("kitchen", "KITCHEN", 36, 37, 10, 10, "kitchen"),
    room("wash_store", "WASH / STORE", 36, 48, 10, 6, "utility"),

    room("bedroom", "BEDROOM", 3, 40, 12, 12, "bedroom"),
    room("toilet", "TOILET", 18, 40, 7, 5, "toilet"),
    room("passage", "PASSAGE", 18, 32, 17, 5, "passage"),
  ];

  return {
    title: "GROUND FLOOR PLAN",
    subtitle: "49' x 57' EAST FRONT + NORTH SIDE CORNER PLOT",
    widthFt: 49,
    depthFt: 57,
    facing: "east",
    roadLabel: "EAST FRONT ROAD + NORTH SIDE ROAD",
    floorLabel: "Ground Floor",
    rooms,
  };
}

function buildTemplate41x51North3BHK(req: ExactPlanRequest): ExactPlan {
  const rooms: RoomItem[] = [
    room("master", "MASTER BEDROOM", 0, 0, 13, 14, "bedroom"),
    room("toilet_attached", "ATTACHED TOILET", 0, 14, 8, 5, "toilet"),
    room("bed2", "BEDROOM 2", 0, 19, 13, 11, "bedroom"),
    room("bed3", "BEDROOM 3", 0, 30, 13, 11, "bedroom"),

    room("dining", "DINING AREA", 13, 0, 13, 14.5, "dining"),
    room("passage", "LOBBY / PASSAGE", 13, 14.5, 13, 14.5, "passage"),
    room("living", "LIVING ROOM", 13, 29, 13, 12, "living"),
    room("drawing", "DRAWING ROOM", 13, 41, 13, 10, "drawing"),
    room("puja", "PUJA", 17, 18.5, 4, 4, "puja"),

    room("utility", "UTILITY / WASH", 26, 0, 11, 4.5, "utility"),
    room("kitchen", "KITCHEN", 26, 4.5, 11, 9.5, "kitchen"),
    room("common_toilet", "COMMON TOILET", 26, 14, 7.5, 5, "toilet"),
    room("staircase", "STAIRCASE", 26, 19, 10, 12, "stair"),
    room("parking", "PARKING / PORCH", 26, 31, 12, 17.5, "parking"),
  ];

  return {
    title: req.floor === "first" ? "FIRST FLOOR PLAN" : "GROUND FLOOR PLAN",
    subtitle: `${req.widthFt}' x ${req.depthFt}' ${req.facing.toUpperCase()} FACING HOUSE`,
    widthFt: req.widthFt,
    depthFt: req.depthFt,
    facing: req.facing,
    roadLabel: "ROAD",
    floorLabel: req.floor === "first" ? "First Floor" : "Ground Floor",
    rooms,
  };
}

function buildGenericPlan(req: ExactPlanRequest): ExactPlan {
  const w = req.widthFt;
  const h = req.depthFt;

  const left = 13;
  const center = Math.max(10, Math.min(13, w - 28));
  const right = w - left - center;

  const rooms: RoomItem[] = [
    room("bed1", "BEDROOM 1", 0, 0, left, 12, "bedroom"),
    room("bed2", "BEDROOM 2", 0, 12, left, 11, "bedroom"),
    room("living", "LIVING ROOM", 0, 23, left, 12, "living"),
    room("parking", "PARKING / PORCH", 0, 35, left, h - 35, "parking"),

    room("dining", "DINING", left, 0, center, 12, "dining"),
    room("passage", "PASSAGE", left, 12, center, 13, "passage"),
    room("puja", "PUJA", left + 2, 16, 4, 4, "puja"),
    room("drawing", "DRAWING ROOM", left, 25, center, 12, "drawing"),
    room("entry", "ENTRY / PORCH", left, 37, center, h - 37, "porch"),

    room("kitchen", "KITCHEN", left + center, 0, right, 10, "kitchen"),
    room("toilet1", "TOILET 1", left + center, 10, right, 5, "toilet"),
    room("bed3", "BEDROOM 3", left + center, 15, right, 12, "bedroom"),
    room("stair", "STAIRCASE", left + center, 27, right, 10, "stair"),
    room("toilet2", "TOILET 2", left + center, 37, right, 5, "toilet"),
    room("utility", "UTILITY", left + center, 42, right, h - 42, "utility"),
  ];

  return {
    title: req.floor === "first" ? "FIRST FLOOR PLAN" : "GROUND FLOOR PLAN",
    subtitle: `${req.widthFt}' x ${req.depthFt}' ${req.facing.toUpperCase()} FACING HOUSE`,
    widthFt: req.widthFt,
    depthFt: req.depthFt,
    facing: req.facing,
    roadLabel: "ROAD",
    floorLabel: req.floor === "first" ? "First Floor" : "Ground Floor",
    rooms,
  };
}

function buildExactPlan(req: ExactPlanRequest): ExactPlan {
  if (is49x57EastNorthGroundRequest(req)) return build49x57EastNorthGroundFloorPlan(req);

  const isTemplateCase =
    req.widthFt === 41 &&
    req.depthFt === 51 &&
    req.facing === "north" &&
    req.bedrooms >= 3 &&
    req.parking &&
    req.staircase;

  if (isTemplateCase) {
    return buildTemplate41x51North3BHK(req);
  }

  return buildGenericPlan(req);
}

function fillForKind(kind?: string): string {
  switch (kind) {
    case "bedroom":
      return "#f8f3ea";
    case "toilet":
      return "#dfefff";
    case "kitchen":
      return "#efefe8";
    case "living":
    case "drawing":
      return "#f4f4f0";
    case "dining":
      return "#f6f1e8";
    case "parking":
      return "#f0f0f0";
    case "stair":
      return "#eeeeee";
    case "puja":
      return "#fbf4da";
    case "passage":
      return "#fafafa";
    default:
      return "#fafafa";
  }
}

function esc(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function roomCenterText(room: RoomItem): string {
  return `${Math.round(room.w * 10) / 10}' x ${Math.round(room.h * 10) / 10}'`;
}

function renderFurniture(room: RoomItem, scale: number, ox: number, oy: number): string {
  const x = ox + room.x * scale;
  const y = oy + room.y * scale;
  const w = room.w * scale;
  const h = room.h * scale;

  if (room.kind === "bedroom") {
    const bx = x + w * 0.18;
    const by = y + h * 0.18;
    const bw = w * 0.52;
    const bh = h * 0.44;
    return `
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#f7f1e7" stroke="#8a8a8a" stroke-width="1.5"/>
      <rect x="${bx}" y="${by}" width="${bw}" height="${bh * 0.22}" fill="#e8ddcf" stroke="#8a8a8a" stroke-width="1"/>
      <rect x="${x + w * 0.76}" y="${y + h * 0.12}" width="${w * 0.12}" height="${h * 0.66}" fill="#a97c50"/>
    `;
  }

  if (room.kind === "dining") {
    return `
      <rect x="${x + w * 0.28}" y="${y + h * 0.28}" width="${w * 0.42}" height="${h * 0.28}" fill="#b58a5e" stroke="#6d4c2f" stroke-width="1.5"/>
      <rect x="${x + w * 0.22}" y="${y + h * 0.34}" width="${w * 0.06}" height="${h * 0.12}" fill="#d8d0c8"/>
      <rect x="${x + w * 0.70}" y="${y + h * 0.34}" width="${w * 0.06}" height="${h * 0.12}" fill="#d8d0c8"/>
      <rect x="${x + w * 0.36}" y="${y + h * 0.20}" width="${w * 0.12}" height="${h * 0.06}" fill="#d8d0c8"/>
      <rect x="${x + w * 0.52}" y="${y + h * 0.20}" width="${w * 0.12}" height="${h * 0.06}" fill="#d8d0c8"/>
      <rect x="${x + w * 0.36}" y="${y + h * 0.58}" width="${w * 0.12}" height="${h * 0.06}" fill="#d8d0c8"/>
      <rect x="${x + w * 0.52}" y="${y + h * 0.58}" width="${w * 0.12}" height="${h * 0.06}" fill="#d8d0c8"/>
    `;
  }

  if (room.kind === "living" || room.kind === "drawing") {
    return `
      <rect x="${x + w * 0.12}" y="${y + h * 0.18}" width="${w * 0.18}" height="${h * 0.46}" fill="#e6e0d6" stroke="#777" stroke-width="1.5"/>
      <rect x="${x + w * 0.40}" y="${y + h * 0.30}" width="${w * 0.18}" height="${h * 0.16}" fill="#caa47c" stroke="#777" stroke-width="1.5"/>
      <rect x="${x + w * 0.12}" y="${y + h * 0.72}" width="${w * 0.32}" height="${h * 0.12}" fill="#e6e0d6" stroke="#777" stroke-width="1.5"/>
    `;
  }

  if (room.kind === "kitchen") {
    return `
      <rect x="${x + w * 0.08}" y="${y + h * 0.10}" width="${w * 0.78}" height="${h * 0.14}" fill="#6b6b6b"/>
      <rect x="${x + w * 0.56}" y="${y + h * 0.08}" width="${w * 0.14}" height="${h * 0.10}" fill="#dedede" stroke="#777" stroke-width="1"/>
      <rect x="${x + w * 0.08}" y="${y + h * 0.68}" width="${w * 0.40}" height="${h * 0.14}" fill="#c8b59d"/>
    `;
  }

  if (room.kind === "toilet") {
    return `
      <circle cx="${x + w * 0.28}" cy="${y + h * 0.55}" r="${Math.max(8, Math.min(w, h) * 0.10)}" fill="#fff" stroke="#666" stroke-width="1.5"/>
      <rect x="${x + w * 0.18}" y="${y + h * 0.18}" width="${w * 0.18}" height="${h * 0.12}" fill="#fff" stroke="#666" stroke-width="1.2"/>
    `;
  }

  if (room.kind === "stair") {
    let steps = "";
    for (let i = 0; i < 7; i++) {
      const yy = y + h * 0.14 + i * (h * 0.08);
      steps += `<line x1="${x + w * 0.18}" y1="${yy}" x2="${x + w * 0.82}" y2="${yy}" stroke="#777" stroke-width="1.3"/>`;
    }
    steps += `<text x="${x + w * 0.5}" y="${y + h * 0.92}" text-anchor="middle" font-family="Arial" font-size="${Math.max(14, scale * 0.45)}" font-weight="700">UP →</text>`;
    return steps;
  }

  if (room.kind === "parking") {
    return `
      <rect x="${x + w * 0.18}" y="${y + h * 0.16}" width="${w * 0.44}" height="${h * 0.62}" rx="18" fill="#efefef" stroke="#777" stroke-width="1.5"/>
      <rect x="${x + w * 0.28}" y="${y + h * 0.28}" width="${w * 0.24}" height="${h * 0.30}" rx="8" fill="#ffffff" stroke="#aaa" stroke-width="1"/>
    `;
  }

  return "";
}


// BUILDSETU_EXACT_PLANNER_PROFESSIONAL_SVG_V7
function round1(value: number): number {
  return Math.round(Number(value || 0) * 10) / 10;
}

function clampNum(value: number, min: number, max: number): number {
  const n = Number(value || 0);
  return Math.max(min, Math.min(max, n));
}

function roomLabelLines(name: string): string[] {
  const clean = esc(name || "").replace(/\s+/g, " ").trim();
  if (clean.includes(" / ")) return clean.split(" / ").slice(0, 2);
  const words = clean.split(" ");
  if (words.length <= 2) return [clean];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function renderProfessionalDoor(room: RoomItem, scale: number, ox: number, oy: number, plan: ExactPlan): string {
  const x = ox + room.x * scale;
  const y = oy + room.y * scale;
  const w = room.w * scale;
  const h = room.h * scale;

  const doorW = clampNum(Math.min(w, h) * 0.38, 34, 74);
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (room.kind === "toilet" || room.kind === "stair" || room.kind === "utility" || room.w <= 7) {
    const dy = y + h * 0.55;
    const sideX = room.x + room.w >= plan.widthFt - 0.2 ? x : x + w;
    const openX = room.x + room.w >= plan.widthFt - 0.2 ? sideX - doorW : sideX;
    const arcX = room.x + room.w >= plan.widthFt - 0.2 ? sideX - doorW : sideX + doorW;
    return `
      <line x1="${sideX}" y1="${dy - doorW / 2}" x2="${sideX}" y2="${dy + doorW / 2}" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      <line x1="${sideX}" y1="${dy - doorW / 2}" x2="${openX}" y2="${dy - doorW / 2}" stroke="#111" stroke-width="2"/>
      <path d="M ${openX} ${dy - doorW / 2} Q ${arcX} ${dy - doorW / 2} ${arcX} ${dy + doorW / 2}" fill="none" stroke="#777" stroke-width="1.5" stroke-dasharray="3 3"/>
    `;
  }

  const bottomY = y + h;
  const doorX1 = cx - doorW / 2;
  const doorX2 = cx + doorW / 2;

  return `
    <line x1="${doorX1}" y1="${bottomY}" x2="${doorX2}" y2="${bottomY}" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <line x1="${doorX1}" y1="${bottomY}" x2="${doorX1}" y2="${bottomY - doorW}" stroke="#111" stroke-width="2"/>
    <path d="M ${doorX1} ${bottomY - doorW} Q ${doorX1 + doorW} ${bottomY - doorW} ${doorX2} ${bottomY}" fill="none" stroke="#777" stroke-width="1.5" stroke-dasharray="3 3"/>
  `;
}

function renderProfessionalWindows(room: RoomItem, scale: number, ox: number, oy: number, plan: ExactPlan): string {
  const x = ox + room.x * scale;
  const y = oy + room.y * scale;
  const w = room.w * scale;
  const h = room.h * scale;

  const touchesTop = room.y <= 0.01;
  const touchesLeft = room.x <= 0.01;
  const touchesRight = room.x + room.w >= plan.widthFt - 0.01;
  const touchesBottom = room.y + room.h >= plan.depthFt - 0.01;
  const winW = clampNum(Math.min(w, h) * 0.46, 38, 96);

  const parts: string[] = [];
  const label = room.kind === "toilet" || room.kind === "utility" ? "V" : room.kind === "kitchen" ? "W1" : "W2";

  if (touchesTop) {
    const cx = x + w / 2;
    parts.push(`
      <line x1="${cx - winW / 2}" y1="${y}" x2="${cx + winW / 2}" y2="${y}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <line x1="${cx - winW / 2}" y1="${y - 5}" x2="${cx + winW / 2}" y2="${y - 5}" stroke="#111" stroke-width="2"/>
      <line x1="${cx - winW / 2}" y1="${y + 5}" x2="${cx + winW / 2}" y2="${y + 5}" stroke="#111" stroke-width="2"/>
      <text x="${cx}" y="${y - 12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800">${label}</text>
    `);
  }

  if (touchesBottom) {
    const cx = x + w / 2;
    parts.push(`
      <line x1="${cx - winW / 2}" y1="${y + h}" x2="${cx + winW / 2}" y2="${y + h}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <line x1="${cx - winW / 2}" y1="${y + h - 5}" x2="${cx + winW / 2}" y2="${y + h - 5}" stroke="#111" stroke-width="2"/>
      <line x1="${cx - winW / 2}" y1="${y + h + 5}" x2="${cx + winW / 2}" y2="${y + h + 5}" stroke="#111" stroke-width="2"/>
      <text x="${cx}" y="${y + h + 21}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800">${label}</text>
    `);
  }

  if (touchesLeft) {
    const cy = y + h / 2;
    parts.push(`
      <line x1="${x}" y1="${cy - winW / 2}" x2="${x}" y2="${cy + winW / 2}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <line x1="${x - 5}" y1="${cy - winW / 2}" x2="${x - 5}" y2="${cy + winW / 2}" stroke="#111" stroke-width="2"/>
      <line x1="${x + 5}" y1="${cy - winW / 2}" x2="${x + 5}" y2="${cy + winW / 2}" stroke="#111" stroke-width="2"/>
      <text x="${x - 13}" y="${cy + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="13" font-weight="800">${label}</text>
    `);
  }

  if (touchesRight) {
    const cy = y + h / 2;
    parts.push(`
      <line x1="${x + w}" y1="${cy - winW / 2}" x2="${x + w}" y2="${cy + winW / 2}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
      <line x1="${x + w - 5}" y1="${cy - winW / 2}" x2="${x + w - 5}" y2="${cy + winW / 2}" stroke="#111" stroke-width="2"/>
      <line x1="${x + w + 5}" y1="${cy - winW / 2}" x2="${x + w + 5}" y2="${cy + winW / 2}" stroke="#111" stroke-width="2"/>
      <text x="${x + w + 13}" y="${cy + 4}" font-family="Arial, sans-serif" font-size="13" font-weight="800">${label}</text>
    `);
  }

  return parts.join("\n");
}

function renderProfessionalRoomTag(room: RoomItem, scale: number, ox: number, oy: number): string {
  const x = ox + room.x * scale;
  const y = oy + room.y * scale;
  const w = room.w * scale;
  const h = room.h * scale;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const small = room.w <= 5 || room.h <= 5;
  const labelSize = small ? 11 : room.w <= 8 || room.h <= 6 ? 13 : 17;
  const dimSize = small ? 10 : 13;
  const lines = roomLabelLines(room.name);

  const labelSvg = lines.length === 1
    ? `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${labelSize}" font-weight="900" fill="#111">${lines[0]}</text>`
    : `<text x="${cx}" y="${cy - 13}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${labelSize}" font-weight="900" fill="#111">${lines[0]}</text>
       <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${labelSize}" font-weight="900" fill="#111">${lines[1]}</text>`;

  return `
    ${labelSvg}
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${dimSize}" font-weight="700" fill="#222">${esc(roomCenterText(room))}</text>
  `;
}

function renderPlannerLegendV7(x: number, y: number): string {
  return `
    <g font-family="Arial, sans-serif" fill="#111">
      <rect x="${x}" y="${y}" width="420" height="112" fill="#fff" stroke="#111" stroke-width="2"/>
      <text x="${x + 18}" y="${y + 30}" font-size="18" font-weight="900">DRAWING LEGEND</text>
      <line x1="${x + 20}" y1="${y + 52}" x2="${x + 75}" y2="${y + 52}" stroke="#111" stroke-width="5"/>
      <text x="${x + 90}" y="${y + 58}" font-size="14" font-weight="700">Wall</text>
      <path d="M ${x + 185} ${y + 70} Q ${x + 235} ${y + 35} ${x + 285} ${y + 70}" fill="none" stroke="#777" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="${x + 300}" y="${y + 58}" font-size="14" font-weight="700">Door swing</text>
      <line x1="${x + 20}" y1="${y + 88}" x2="${x + 75}" y2="${y + 88}" stroke="#111" stroke-width="2"/>
      <line x1="${x + 20}" y1="${y + 96}" x2="${x + 75}" y2="${y + 96}" stroke="#111" stroke-width="2"/>
      <text x="${x + 90}" y="${y + 98}" font-size="14" font-weight="700">Window / Vent</text>
    </g>
  `;
}


function renderSvg(plan: ExactPlan): string {
  const scale = clampNum(1120 / Math.max(plan.widthFt, 1), 22, 28);
  const ox = 170;
  const oy = 235;
  const plotW = plan.widthFt * scale;
  const plotH = plan.depthFt * scale;
  const width = Math.round(ox * 2 + plotW + 260);
  const height = Math.round(oy + plotH + 430);

  const wall = "#101010";
  const innerWall = "#1f2933";
  const titleFont = "Arial, Helvetica, sans-serif";

  const gridLines: string[] = [];
  for (let gx = 5; gx < plan.widthFt; gx += 5) {
    const x = ox + gx * scale;
    gridLines.push(`<line x1="${x}" y1="${oy}" x2="${x}" y2="${oy + plotH}" stroke="#efefef" stroke-width="1"/>`);
  }
  for (let gy = 5; gy < plan.depthFt; gy += 5) {
    const y = oy + gy * scale;
    gridLines.push(`<line x1="${ox}" y1="${y}" x2="${ox + plotW}" y2="${y}" stroke="#efefef" stroke-width="1"/>`);
  }

  const roomSvg = plan.rooms
    .map((r) => {
      const x = ox + r.x * scale;
      const y = oy + r.y * scale;
      const w = r.w * scale;
      const h = r.h * scale;

      return `
        <g>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffef9" stroke="${innerWall}" stroke-width="3.2"/>
          <rect x="${x + 7}" y="${y + 7}" width="${Math.max(0, w - 14)}" height="${Math.max(0, h - 14)}" fill="none" stroke="#e5e7eb" stroke-width="1"/>
          <g opacity="0.62">${renderFurniture(r, scale, ox, oy)}</g>
          ${renderProfessionalDoor(r, scale, ox, oy, plan)}
          ${renderProfessionalWindows(r, scale, ox, oy, plan)}
          ${renderProfessionalRoomTag(r, scale, ox, oy)}
        </g>
      `;
    })
    .join("\n");

  const roadIsTop = plan.facing === "north";
  const roadY = roadIsTop ? oy - 128 : oy + plotH + 104;
  const frontTextY = roadIsTop ? oy - 34 : oy + plotH + 38;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="geometricPrecision">
  <defs>
    <pattern id="paperTextureV7" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#f7f7f2"/>
      <path d="M0 40 H80 M40 0 V80" stroke="#eeeeea" stroke-width="1"/>
    </pattern>
    <marker id="arrowV7" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
      <path d="M0,0 L10,5 L0,10 Z" fill="#111"/>
    </marker>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#paperTextureV7)"/>

  <text x="${width / 2}" y="54" text-anchor="middle" font-family="${titleFont}" font-size="34" font-weight="900" fill="#111">
    ${esc(plan.title)}
  </text>
  <text x="${width / 2}" y="94" text-anchor="middle" font-family="${titleFont}" font-size="23" font-weight="800" letter-spacing="1.5" fill="#222">
    ${esc(plan.subtitle)}
  </text>

  <line x1="${ox}" y1="${oy - 74}" x2="${ox + plotW}" y2="${oy - 74}" stroke="#111" stroke-width="2.2" marker-start="url(#arrowV7)" marker-end="url(#arrowV7)"/>
  <text x="${ox + plotW / 2}" y="${oy - 93}" text-anchor="middle" font-family="${titleFont}" font-size="28" font-weight="900">${round1(plan.widthFt)}'</text>

  <line x1="${ox - 74}" y1="${oy}" x2="${ox - 74}" y2="${oy + plotH}" stroke="#111" stroke-width="2.2" marker-start="url(#arrowV7)" marker-end="url(#arrowV7)"/>
  <text x="${ox - 105}" y="${oy + plotH / 2}" transform="rotate(-90 ${ox - 105} ${oy + plotH / 2})" text-anchor="middle" font-family="${titleFont}" font-size="28" font-weight="900">${round1(plan.depthFt)}'</text>

  <g>
    <circle cx="${ox + plotW - 78}" cy="${oy - 36}" r="31" fill="#fff" stroke="#111" stroke-width="2"/>
    <path d="M ${ox + plotW - 78} ${oy - 76} L ${ox + plotW - 64} ${oy - 24} L ${ox + plotW - 78} ${oy - 33} L ${ox + plotW - 92} ${oy - 24} Z" fill="#111"/>
    <text x="${ox + plotW - 78}" y="${oy - 84}" text-anchor="middle" font-family="${titleFont}" font-size="24" font-weight="900">N</text>
  </g>

  <rect x="${ox}" y="${oy}" width="${plotW}" height="${plotH}" fill="#ffffff" stroke="${wall}" stroke-width="9"/>
  <g>${gridLines.join("\n")}</g>
  <rect x="${ox + 13}" y="${oy + 13}" width="${plotW - 26}" height="${plotH - 26}" fill="none" stroke="#111" stroke-width="1.4" opacity="0.55"/>

  ${roomSvg}

  <g font-family="${titleFont}" font-size="15" font-weight="900" fill="#111">
    <text x="${ox + plotW * 0.26}" y="${frontTextY}">FRONT / ENTRY SIDE</text>
    <text x="${ox + plotW * 0.64}" y="${frontTextY}">MAIN GATE</text>
  </g>

  <rect x="${ox}" y="${roadY}" width="${plotW}" height="52" fill="#fff" stroke="#111" stroke-width="2.5"/>
  <text x="${ox + plotW / 2}" y="${roadY + 35}" text-anchor="middle" font-family="${titleFont}" font-size="30" font-weight="900" letter-spacing="7">
    ${esc(plan.roadLabel)} / ${plan.facing.toUpperCase()} SIDE
  </text>

  ${renderPlannerLegendV7(ox + plotW + 48, oy + 20)}

  <rect x="${ox + plotW + 48}" y="${oy + 160}" width="420" height="178" fill="#fff" stroke="#111" stroke-width="2"/>
  <text x="${ox + plotW + 68}" y="${oy + 196}" font-family="${titleFont}" font-size="19" font-weight="900">TITLE BLOCK</text>
  <text x="${ox + plotW + 68}" y="${oy + 232}" font-family="${titleFont}" font-size="16" font-weight="700">Project: ${esc(plan.subtitle)}</text>
  <text x="${ox + plotW + 68}" y="${oy + 260}" font-family="${titleFont}" font-size="16" font-weight="700">Drawing: ${esc(plan.title)}</text>
  <text x="${ox + plotW + 68}" y="${oy + 288}" font-family="${titleFont}" font-size="16" font-weight="700">Scale: Conceptual / not for execution</text>
  <text x="${ox + plotW + 68}" y="${oy + 316}" font-family="${titleFont}" font-size="16" font-weight="700">Review: Architect/Engineer required</text>

  <rect x="${ox}" y="${height - 72}" width="${plotW}" height="40" fill="#ffffff" stroke="#d1d5db" stroke-width="1"/>
  <text x="${ox + plotW / 2}" y="${height - 47}" text-anchor="middle" font-family="${titleFont}" font-size="15" fill="#555">
    Exact Planner v7: professional concept SVG. Final construction drawing ke liye architect / engineer validation required.
  </text>
</svg>`;
}
async function appendAsset(asset: any) {
  try {
    const raw = await fs.readFile(ASSETS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.assets) ? parsed.assets : [];
    items.unshift(asset);
    await fs.writeFile(ASSETS_FILE, JSON.stringify(items.slice(0, 500), null, 2), "utf8");
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(ASSETS_FILE, JSON.stringify([asset], null, 2), "utf8");
  }
}

export function isExactFloorPlanRequest(body: any): boolean {
  const slug = safeText(body?.toolSlug).toLowerCase();
  const rt = safeText(body?.renderType || body?.taskType || body?.imageMode || body?.assetType || body?.outputType).toLowerCase();
  const p = safeText(body?.imagePrompt || body?.prompt).toLowerCase();

  if (slug === "floor-plan-ai") return true;
  if (rt.includes("floor_plan")) return true;
  if (/\bfloor plan\b|\bnaksha\b|\b3bhk\b|\b2bhk\b|\bground floor\b|\bfirst floor\b/.test(p)) return true;

  return false;
}

export async function generateExactFloorPlanAsset(body: any) {
  const req = normalizeRequest(body);
  const plan = buildExactPlan(req);
  const svg = renderSvg(plan);

  const fileDir = path.join(DATA_DIR, "ai-images", req.projectId);
  await fs.mkdir(fileDir, { recursive: true });

  const now = Date.now();
  const fileName = `${now}-exact-floor-plan.svg`;
  const fileRel = `generated/ai-images/${req.projectId}/${fileName}`;
  const fileAbs = path.join(fileDir, fileName);

  const jsonName = `${now}-exact-floor-plan.json`;
  const jsonRel = `generated/ai-images/${req.projectId}/${jsonName}`;
  const jsonAbs = path.join(fileDir, jsonName);

  await fs.writeFile(fileAbs, svg, "utf8");
  await fs.writeFile(jsonAbs, JSON.stringify(plan, null, 2), "utf8");

  const apiUrl = `/api/ai/generated-image?file=${encodeURIComponent(fileRel)}`;
  const publicUrl = `/${fileRel}`;

  const asset = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    type: "image",
    projectId: req.projectId,
    projectTitle: req.projectTitle,
    toolSlug: "floor-plan-ai",
    toolName: "Floor Plan AI",
    renderType: "floor_plan_2d",
    assetType: "floor_plan_2d",
    imageMode: "floor_plan_2d",
    roomType: "Floor Plan",
    imageUrl: apiUrl,
    publicUrl,
    file: fileRel,
    planJsonFile: jsonRel,
    prompt: req.prompt,
    revisedPrompt: "",
    referenceImageUrl: "",
    generationMode: "exact_floor_plan_v7_professional_svg",
    preserveAnchorDesign: false,
    viewLabel: plan.floorLabel,
    createdAt: new Date().toISOString(),
  };

  await appendAsset(asset);

  return {
    ok: true,
    imageUrl: apiUrl,
    url: apiUrl,
    path: apiUrl,
    publicUrl,
    asset,
    prompt: req.prompt,
    revisedPrompt: "",
    source: "exact_floor_plan_engine",
    floorPlanHardlocked: true,
    assetType: "floor_plan_2d",
    imageMode: "floor_plan_2d",
    renderType: "floor_plan_2d",
    generationMode: "exact_floor_plan_v7_professional_svg",
    plan,
    planJsonFile: jsonRel,
  };
}
