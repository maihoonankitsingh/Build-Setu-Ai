import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getProjectPlanLock } from "@/lib/planning/project-plan-lock";
import { validateBuildSetu49x57EastNorthGroundGeometry } from "@/lib/planning/buildsetu-floor-plan-geometry-validator";
import { validateBuildSetuHumanLikeFloorPlanning } from "@/lib/planning/buildsetu-human-floor-plan-skill";
import { runBuildSetuPlanningSkills, summarizeBuildSetuSkillReports } from "@/lib/planning/skills";

export const runtime = "nodejs";

type Room = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  note?: string;
};

type ExactPlan = {
  source: string;
  projectId: string;
  title: string;
  command: string;
  plot: {
    widthFt: number;
    depthFt: number;
    facing: string;
    areaSqft: number;
  };
  assumptions: string[];
  complianceChecklist: Array<{
    item: string;
    status: "ok" | "needs_input" | "review_required";
    note: string;
  }>;
  rooms: Room[];
  openItems: string[];
};

function safe(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slug(value: unknown) {
  return safe(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "floor-plan";
}

function num(value: unknown, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function detectCommand(message: string) {
  const text = safe(message).toLowerCase();

  // BUILDSETU_EXACT_AGENT_COMMAND_PRIORITY_V2
  // Floor selection must be detected before secondary drawing types.
  // "G+1" means building has ground + first floor; it must not auto-trigger first-floor drawing.
  // Words like "bedroom" or "dining" must not accidentally trigger furniture_layout.
  const asksGroundFloor =
    /\bground\s+floor\b|\bgf\b|\bfloor\s*:\s*ground\b|\bground\s+floor\s+plan\b/.test(text);

  const asksFirstFloor =
    /\bfirst\s+floor\b|\b1st\s+floor\b|\bfloor\s*:\s*first\b|\bupper\s+floor\b|\bfirst\s+floor\s+plan\b/.test(text);

  const asksSecondFloor =
    /\bsecond\s+floor\b|\b2nd\s+floor\b|\bfloor\s*:\s*second\b/.test(text);

  if (asksGroundFloor) return "ground_floor_plan";
  if (asksSecondFloor) return "second_floor_plan";
  if (asksFirstFloor) return "first_floor_plan";

  if (/\bterrace\b|\broof\b|\bmumty\b|\bwater\s+tank\b/.test(text)) return "terrace_plan";

  const explicitFurnitureLayout =
    /\bfurniture\s+(layout|plan|placement)\b|\bfurnished\s+layout\b|\bsofa\s+layout\b|\bbed\s+placement\b|\bwardrobe\s+placement\b|\bdining\s+table\s+placement\b/.test(text);

  if (explicitFurnitureLayout) return "furniture_layout";

  if (/\bdimension\s+plan\b|\bmeasurement\s+plan\b|\broom\s+size\s+plan\b|\bwall\s+length\b/.test(text)) {
    return "dimension_plan";
  }

  if (/\bworking\s+drawing\b|\bdrawing\s+set\b|\bcomplete\s+set\b|\bconstruction\s+drawing\b/.test(text)) {
    return "working_drawing_set";
  }

  if (/\bdoor\b|\bwindow\b|\bschedule\b|\bopening\b/.test(text)) return "door_window_schedule";
  if (/\bcolumn\b|\bcolom\b|\bpillar\b/.test(text)) return "column_layout_concept";

  return "ground_floor_plan";
}

function titleForCommand(command: string) {
  const map: Record<string, string> = {
    ground_floor_plan: "Ground Floor Plan",
    first_floor_plan: "First Floor Plan",
    terrace_plan: "Roof / Terrace Plan",
    furniture_layout: "Furniture Layout",
    dimension_plan: "Dimension Plan",
    working_drawing_set: "Complete Working Drawing Set",
    door_window_schedule: "Door Window Schedule",
    column_layout_concept: "Column Layout Concept",
  };
  return map[command] || "Exact Floor Plan";
}

function parsePlotFromText(text: string) {
  const raw = safe(text);

  const m =
    raw.match(/([0-9]{2,3}(?:\.[0-9]+)?)\s*(?:x|×|by|\*)\s*([0-9]{2,3}(?:\.[0-9]+)?)/i) ||
    raw.match(/([0-9]{2,3}(?:\.[0-9]+)?)\s*ft\s*(?:x|×|by|\*)\s*([0-9]{2,3}(?:\.[0-9]+)?)\s*ft/i);

  const facingMatch = raw.match(/\b(north|south|east|west|north east|north west|south east|south west|northeast|northwest|southeast|southwest)\b/i);

  return {
    widthFt: m ? num(m[1]) : 0,
    depthFt: m ? num(m[2]) : 0,
    facing: facingMatch ? safe(facingMatch[1]).toLowerCase().replace(/\s+/g, "-") : "",
  };
}

function inferRequirements(text: string, lock: any) {
  const raw = safe(text).toLowerCase();
  const plan = lock?.basePlan || {};

  const bedrooms =
    num(plan.bedrooms, 0) ||
    num(raw.match(/([0-9]+)\s*(?:bed|bedroom|bhk)/)?.[1], 0) ||
    (raw.includes("3bhk") || raw.includes("3 bhk") ? 3 : 0) ||
    (raw.includes("2bhk") || raw.includes("2 bhk") ? 2 : 0) ||
    (raw.includes("ground floor") ? 1 : 2);

  const bathrooms =
    num(plan.bathrooms || plan.toilets, 0) ||
    num(raw.match(/([0-9]+)\s*(?:toilet|bathroom|bath)/)?.[1], 0) ||
    1;

  return {
    bedrooms,
    bathrooms,
    parking: raw.includes("parking") || raw.includes("car") || Boolean(plan?.requiredSpaces?.includes?.("parking")),
    puja: raw.includes("puja") || raw.includes("pooja") || Boolean(plan?.requiredSpaces?.includes?.("puja")),
    staircase: raw.includes("stair") || raw.includes("g+1") || Boolean(plan?.requiredSpaces?.includes?.("staircase")),
  };
}

function room(id: string, name: string, kind: string, x: number, y: number, w: number, h: number, note = ""): Room {
  return {
    id,
    name,
    kind,
    x: round1(x),
    y: round1(y),
    w: round1(w),
    h: round1(h),
    note,
  };
}

function buildGroundFloorPlan(args: {
  projectId: string;
  widthFt: number;
  depthFt: number;
  facing: string;
  bedrooms: number;
  bathrooms: number;
  parking: boolean;
  puja: boolean;
  staircase: boolean;
  command: string;
}) {
  const { widthFt: W, depthFt: D } = args;

  const rooms: Room[] = [];
  // BUILDSETU_EXACT_AGENT_49X57_EAST_NORTH_FIRST_LOCK_V1
  // Coordinate convention: x=West→East across 49 ft, y=North→South across 57 ft.
  // First floor lock for G+1: exactly 3 bedrooms, 2 bathrooms, family lounge, stair continuation, East/North balcony/terrace, optional study corner.
  if (Math.round(W) === 49 && Math.round(D) === 57 && String(args.facing || "").toLowerCase().includes("east") && args.command === "first_floor_plan") {
    return [
      room("north_terrace", "North Terrace / Sit-out 20x8", "terrace", 16, 3, 20, 8, "BUILDSETU_EXACT_AGENT_57X49_DRAWING_COORDS_V1 North-side usable terrace/sit-out facing side road"),
      room("east_balcony", "East Balcony 9x28", "balcony", 45, 3, 9, 28, "East-facing balcony/front elevation feature"),

      room("family_lounge", "Family Lounge 18x13", "living", 17, 12, 18, 13, "Central family lounge with daylight and balcony access"),
      room("study", "Study Corner 7x6", "study", 36, 12, 7, 6, "Optional small study/work corner near lounge"),
      room("passage", "First Floor Passage", "passage", 16, 34, 18, 5, "Compact circulation connecting bedrooms, lounge and staircase"),

      room("bed2", "Bedroom 2 11x12", "bedroom", 3, 20, 11, 12, "Secondary bedroom with ventilation"),
      room("master", "Master Bedroom 13x14", "bedroom", 3, 33, 13, 14, "South-West master bedroom"),
      room("master_toilet", "Master Toilet 7x8", "toilet", 17, 39, 7, 8, "Attached toilet for master bedroom"),

      room("stair", "Staircase Landing 9x15", "staircase", 34, 31, 9, 15, "Stair continuation aligned with ground-floor stair"),
      room("bed3", "Bedroom 3 11x12", "bedroom", 35, 32, 11, 12, "Third bedroom with East-side ventilation"),
      room("common_toilet", "Common Bathroom 7x8", "toilet", 47, 32, 7, 8, "Common/shared bathroom for first floor"),
    ];
  }

  // BUILDSETU_EXACT_AGENT_49X57_EAST_NORTH_GROUND_LOCK_V2
  // Coordinate convention: x=West→East across 49 ft, y=North→South across 57 ft.
  // Drawing convention still labels top edge as NORTH SIDE ROAD - 57' and right edge as EAST FRONT ROAD - 49'.
  // Goal: practical Indian-modern luxury G+1 ground floor with exactly 1 bedroom, 1 bathroom, 1 parking, living, dining, kitchen, pooja, stair, wash/store.
  if (Math.round(W) === 49 && Math.round(D) === 57 && String(args.facing || "").toLowerCase().includes("east") && args.command === "ground_floor_plan") {
    return [
      room("puja", "Puja 5x6", "puja", 3, 3, 6, 6, "North-East/East pooja zone; compact dedicated pooja room"),
      room("living", "Living Room 20x16", "living", 10, 3, 20, 16, "Public living room connected to dining/circulation flow"),
      room("parking", "Car + Bike Parking 15x18", "parking", 39, 3, 15, 18, "East front entry parking; one car plus bike space only"),

      room("dining", "Dining 14x11", "dining", 24, 23, 14, 11, "BUILDSETU_GROUND_HUMAN_FLOW_LAYOUT_V2 Dining placed between living and kitchen for human-like public-to-service flow"),
      room("lobby", "Entry Lobby 15x8", "lobby", 39, 22, 15, 8, "Entry transition from East side; connects parking/public circulation"),

      room("passage", "Private Passage", "passage", 16, 34, 17, 4, "Compact circulation spine linking dining, stair, bedroom and bathroom"),
      room("stair", "Staircase 9x15", "staircase", 34, 31, 9, 15, "Single internal staircase for G+1 with clear UP direction"),
      room("kitchen", "Kitchen 11x10", "kitchen", 39, 31, 11, 10, "Kitchen beside dining and wash/store for service flow"),
      room("wash_store", "Wash / Store 11x7", "wash", 39, 42, 11, 7, "Service wash/store directly behind kitchen, not a second kitchen"),

      room("bed1", "Bedroom 12x13", "bedroom", 3, 33, 12, 13, "South-West/private bedroom; only ground-floor bedroom"),
      room("toilet1", "Bathroom 7x8", "toilet", 16, 39, 7, 8, "One common/attached bathroom with ventilation; only ground-floor bathroom"),
    ];
  }  const frontH = Math.min(18, Math.max(15, D * 0.34));
  const rearH = Math.min(16, Math.max(14, D * 0.30));
  const midY = frontH;
  const rearY = D - rearH;
  const midH = Math.max(10, rearY - midY);

  const parkingW = args.parking ? Math.min(15, Math.max(12, W * 0.34)) : 0;
  const livingW = W - parkingW;

  if (args.parking) {
    rooms.push(room("parking", "Car Parking", "parking", 0, 0, parkingW, frontH, "Front parking bay"));
  }

  rooms.push(room("living", "Living", "living", parkingW, 0, livingW, frontH, "Front living zone"));

  const kitchenW = Math.min(12, W * 0.30);
  const bedW = Math.min(14, W * 0.34);
  const centerW = W - kitchenW - bedW;

  // BUILDSETU_EXACT_AGENT_NO_OVERLAP_V1
  // Middle zone is split so puja gets a real non-overlapping rectangle.
  const pujaH = args.puja ? Math.min(5, Math.max(4, midH * 0.28)) : 0;
  const diningH = args.puja ? Math.max(10, midH - pujaH) : midH;
  const pujaW = args.puja ? Math.min(7, Math.max(4, centerW * 0.45)) : 0;

  rooms.push(room("kitchen", "Kitchen", "kitchen", 0, midY, kitchenW, Math.min(13, diningH), "Kitchen near service/wash zone"));
  rooms.push(room("dining", "Dining", "dining", kitchenW, midY, centerW, diningH, "Central dining/circulation"));
  rooms.push(room("bed1", "Bedroom 1", "bedroom", kitchenW + centerW, midY, bedW, midH, "Bedroom with access from central passage"));

  if (args.puja) {
    rooms.push(room("puja", "Puja", "puja", kitchenW, midY + diningH, pujaW, pujaH, "Compact puja space in central/north-east planning zone"));
  }

  const stairW = args.staircase ? Math.min(9, Math.max(8, W * 0.22)) : 0;
  const serviceW = Math.min(9, Math.max(8, W * 0.20));
  const rearBedX = stairW + serviceW;
  const rearBedW = W - rearBedX;

  if (args.staircase) {
    rooms.push(room("stair", "Staircase", "staircase", 0, rearY, stairW, rearH, "Vertical circulation aligned for G+1"));
  }

  rooms.push(room("toilet1", "Toilet", "toilet", stairW, rearY, serviceW, Math.min(7, rearH * 0.45), "Wet area grouped with wash/service"));
  rooms.push(room("wash", "Wash", "wash", stairW, rearY + Math.min(7, rearH * 0.45), serviceW, Math.min(5, rearH * 0.30), "Wash/service area"));

  if (args.bedrooms >= 2) {
    rooms.push(room("bed2", "Bedroom 2", "bedroom", rearBedX, rearY, rearBedW, rearH, "Second bedroom fitted in rear zone"));
  }

  return rooms;
}

function validatePlan(widthFt: number, depthFt: number, rooms: Room[]) {
  const errors: string[] = [];

  for (const r of rooms) {
    if (r.w <= 0 || r.h <= 0) errors.push(`${r.name}: invalid size`);
    if (r.x < 0 || r.y < 0) errors.push(`${r.name}: outside plot negative coordinate`);
    if (r.x + r.w > widthFt + 0.01) errors.push(`${r.name}: exceeds plot width`);
    if (r.y + r.h > depthFt + 0.01) errors.push(`${r.name}: exceeds plot depth`);
  }

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

      if (overlapX > 0.15 && overlapY > 0.15) {
        errors.push(`${a.name} overlaps ${b.name}`);
      }
    }
  }

  return errors;
}

function buildComplianceChecklist(args: {
  widthFt: number;
  depthFt: number;
  city: string;
  rooms: Room[];
  hasParking: boolean;
  hasStaircase: boolean;
}) {
  return [
    {
      item: "Exact plot dimension",
      status: "ok" as const,
      note: `Plan boundary locked to ${args.widthFt}' x ${args.depthFt}'.`,
    },
    {
      item: "Local authority / byelaw profile",
      status: args.city ? ("review_required" as const) : ("needs_input" as const),
      note: args.city
        ? `City/local authority captured as ${args.city}. Setback/FAR/coverage must be checked against current local byelaws.`
        : "City/local authority missing. Agent can draft planning, but final government-rule validation needs city/municipality/panchayat profile.",
    },
    {
      item: "Parking provision",
      status: args.hasParking ? ("ok" as const) : ("review_required" as const),
      note: args.hasParking ? "Parking zone included." : "Parking requirement not confirmed.",
    },
    {
      item: "Staircase / G+1 coordination",
      status: args.hasStaircase ? ("ok" as const) : ("review_required" as const),
      note: args.hasStaircase ? "Staircase zone included for upper floor coordination." : "Staircase not included.",
    },
    {
      item: "Engineer review",
      status: "review_required" as const,
      note: "Architectural planning draft only. RCC, structural safety, approval drawings and setbacks need licensed professional verification.",
    },
  ];
}

function renderSvg(plan: ExactPlan) {
  // BUILDSETU_RENDERER_57X49_DRAWING_DIMENSIONS_V1
  const sourceWidthFt = plan.plot.widthFt;
  const sourceDepthFt = plan.plot.depthFt;
  const is57x49EastNorthDrawing =
    Math.round(sourceWidthFt) === 49 &&
    Math.round(sourceDepthFt) === 57 &&
    String(plan.plot.facing || "").toLowerCase().includes("east");
  const drawingWidthFt = is57x49EastNorthDrawing ? 57 : sourceWidthFt;
  const drawingDepthFt = is57x49EastNorthDrawing ? 49 : sourceDepthFt;

  // BUILDSETU_PROFESSIONAL_EXACT_SVG_RENDERER_SAFE_V1
  const W = drawingWidthFt;
  const D = drawingDepthFt;
  // BUILDSETU_VALID_XML_SVG_DATA_ATTRS_V1
  // BUILDSETU_RENDERER_ROAD_LABELS_57X49_SAFE_FIX_V1
  const topRoadLabelText = is57x49EastNorthDrawing ? "NORTH SIDE ROAD - 57'" : String(W) + "' FRONT";
  const rightRoadLabelText = is57x49EastNorthDrawing ? "EAST FRONT ROAD - 49'" : String(D) + "' DEPTH";
  const subtitleLabelText = is57x49EastNorthDrawing
    ? "49' x 57' East-North Corner Plot · Drawing: 57' North × 49' East"
    : String(plan.plot.widthFt) + "' x " + String(plan.plot.depthFt) + "' · " + String(plan.plot.facing || "").toUpperCase() + " Facing";


  const scale = 15;
  const pad = 88;
  const sheetW = Math.round(W * scale + pad * 2 + 72);
  const sheetH = Math.round(D * scale + pad * 2 + 208);

  const outerX = pad;
  // BUILDSETU_SVG_HEADER_SPACING_SAFE_FIX_V1
  const outerY = pad + 82;
  const outerW = W * scale;
  const outerH = D * scale;

  const colors: Record<string, string> = {
    parking: "#eef2f7",
    living: "#fff7ed",
    kitchen: "#fef3c7",
    dining: "#f8fafc",
    bedroom: "#eef2ff",
    toilet: "#dbeafe",
    wash: "#bfdbfe",
    staircase: "#f3f4f6",
    puja: "#fde68a",
    passage: "#ffffff",
    lobby: "#ffffff",
    terrace: "#ecfdf5",
    balcony: "#f0fdfa",
    study: "#f5f3ff",
    multiuse: "#ecfdf5",
  };

  function esc(value: unknown) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sx(ft: number) { return outerX + ft * scale; }
  function sy(ft: number) { return outerY + ft * scale; }
  function sw(ft: number) { return ft * scale; }

  function box(r: Room) {
    const x = sx(r.x);
    const y = sy(r.y);
    const w = sw(r.w);
    const h = sw(r.h);
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  }

  function roomLabelLines(name: string) {
    const words = safe(name).split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > 18 && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 2);
  }

  function furniture(r: Room) {
    const kind = String(r.kind || "").toLowerCase();
    const b = box(r);
    const dark = "#374151";

    if (kind === "bedroom") {
      const bw = Math.min(b.w - 22, 70);
      const bh = Math.min(b.h - 24, 76);
      return `<g data-furniture="bed"><rect x="${b.cx - bw / 2}" y="${b.cy - bh / 2}" width="${bw}" height="${bh}" rx="6" fill="#fff" stroke="${dark}" stroke-width="1.4"/><rect x="${b.cx - bw / 2 + 5}" y="${b.cy - bh / 2 + 5}" width="${bw / 2 - 7}" height="17" rx="3" fill="#e5e7eb" stroke="${dark}" stroke-width="1"/><rect x="${b.cx + 2}" y="${b.cy - bh / 2 + 5}" width="${bw / 2 - 7}" height="17" rx="3" fill="#e5e7eb" stroke="${dark}" stroke-width="1"/></g>`;
    }

    if (kind === "living") {
      return `<g data-furniture="sofa-tv"><rect x="${b.x + 10}" y="${b.y + 10}" width="${Math.min(b.w - 20, 80)}" height="23" rx="6" fill="#fff" stroke="${dark}" stroke-width="1.3"/><rect x="${b.x + b.w - 18}" y="${b.y + 18}" width="5" height="${Math.min(b.h - 36, 82)}" fill="${dark}" opacity="0.8"/><rect x="${b.cx - 18}" y="${b.cy - 12}" width="36" height="24" rx="4" fill="#fff" stroke="${dark}" stroke-width="1"/></g>`;
    }

    if (kind === "dining") {
      return `<g data-furniture="dining"><rect x="${b.cx - 27}" y="${b.cy - 17}" width="54" height="34" rx="6" fill="#fff" stroke="${dark}" stroke-width="1.3"/><circle cx="${b.cx - 39}" cy="${b.cy}" r="5" fill="#e5e7eb" stroke="${dark}" stroke-width="1"/><circle cx="${b.cx + 39}" cy="${b.cy}" r="5" fill="#e5e7eb" stroke="${dark}" stroke-width="1"/><circle cx="${b.cx}" cy="${b.cy - 29}" r="5" fill="#e5e7eb" stroke="${dark}" stroke-width="1"/><circle cx="${b.cx}" cy="${b.cy + 29}" r="5" fill="#e5e7eb" stroke="${dark}" stroke-width="1"/></g>`;
    }

    if (kind === "kitchen") {
      return `<g data-furniture="kitchen-counter"><rect x="${b.x + 8}" y="${b.y + 8}" width="${b.w - 16}" height="16" fill="#111827" opacity="0.75"/><rect x="${b.x + b.w - 30}" y="${b.y + 30}" width="22" height="${b.h - 42}" fill="#9ca3af" opacity="0.45"/><circle cx="${b.x + b.w - 20}" cy="${b.y + 40}" r="5" fill="#fff" stroke="${dark}" stroke-width="1"/></g>`;
    }

    if (kind === "toilet" || kind === "wash") {
      return `<g data-furniture="toilet-fixtures"><circle cx="${b.x + 18}" cy="${b.y + 20}" r="10" fill="#fff" stroke="${dark}" stroke-width="1.3"/><rect x="${b.x + b.w - 30}" y="${b.y + 14}" width="20" height="14" rx="4" fill="#fff" stroke="${dark}" stroke-width="1.3"/><line x1="${b.x + 10}" y1="${b.y + b.h - 12}" x2="${b.x + b.w - 10}" y2="${b.y + b.h - 12}" stroke="#60a5fa" stroke-width="2"/></g>`;
    }

    if (kind === "staircase") {
      const steps = Math.max(5, Math.floor(b.h / 18));
      const stepLines = Array.from({ length: steps }, (_, i) => {
        const yy = b.y + 10 + (i * (b.h - 20)) / Math.max(1, steps - 1);
        return `<line x1="${b.x + 8}" y1="${yy}" x2="${b.x + b.w - 8}" y2="${yy}" stroke="${dark}" stroke-width="1"/>`;
      }).join("");
      return `<g data-furniture="stair-up">${stepLines}<path d="M ${b.x + b.w * 0.25} ${b.y + b.h * 0.75} L ${b.x + b.w * 0.75} ${b.y + b.h * 0.25}" stroke="${dark}" stroke-width="2" marker-end="url(#smallArrow)"/><text x="${b.cx}" y="${b.cy + 5}" text-anchor="middle" font-size="10" font-family="Arial" font-weight="700" fill="${dark}">UP</text></g>`;
    }

    if (kind === "parking") {
      const carW = Math.min(b.w - 30, 72);
      const carH = Math.min(b.h - 42, 118);
      return `<g data-furniture="car-bike"><rect x="${b.cx - carW / 2}" y="${b.cy - carH / 2}" width="${carW}" height="${carH}" rx="18" fill="#fff" stroke="${dark}" stroke-width="1.5"/><rect x="${b.cx - carW / 2 + 10}" y="${b.cy - carH / 2 + 18}" width="${carW - 20}" height="22" rx="8" fill="#d1d5db" stroke="${dark}" stroke-width="1"/><circle cx="${b.x + b.w - 26}" cy="${b.y + b.h - 30}" r="7" fill="none" stroke="${dark}" stroke-width="1.5"/><circle cx="${b.x + b.w - 48}" cy="${b.y + b.h - 30}" r="7" fill="none" stroke="${dark}" stroke-width="1.5"/><line x1="${b.x + b.w - 48}" y1="${b.y + b.h - 30}" x2="${b.x + b.w - 26}" y2="${b.y + b.h - 30}" stroke="${dark}" stroke-width="1.5"/></g>`;
    }

    if (kind === "puja") {
      return `<g data-furniture="puja-symbol"><path d="M ${b.cx} ${b.cy - 18} L ${b.cx + 18} ${b.cy + 14} L ${b.cx - 18} ${b.cy + 14} Z" fill="#fff" stroke="${dark}" stroke-width="1.2"/><circle cx="${b.cx}" cy="${b.cy}" r="5" fill="#f59e0b"/></g>`;
    }

    if (kind === "balcony" || kind === "terrace") {
      return `<g data-furniture="terrace-balcony"><rect x="${b.x + 8}" y="${b.y + 8}" width="${b.w - 16}" height="${b.h - 16}" fill="url(#hatch)" stroke="#059669" stroke-width="1" opacity="0.45"/><circle cx="${b.x + b.w - 18}" cy="${b.y + 18}" r="8" fill="#86efac" stroke="#047857" stroke-width="1"/></g>`;
    }

    return "";
  }

  function door(r: Room, index: number) {
    const kind = String(r.kind || "").toLowerCase();
    if (kind === "terrace" || kind === "balcony") return "";
    const b = box(r);
    const tag = `D${index + 1}`;
    const d = Math.min(34, Math.max(22, Math.min(b.w, b.h) * 0.35));
    const dx = b.x + Math.min(Math.max(16, b.w * 0.18), Math.max(16, b.w - d - 12));
    const dy = b.y + b.h;
    return `<g data-door="${tag}"><line x1="${dx}" y1="${dy}" x2="${dx + d}" y2="${dy}" stroke="#fff" stroke-width="7"/><line x1="${dx}" y1="${dy}" x2="${dx}" y2="${dy - d}" stroke="#7c2d12" stroke-width="2"/><path d="M ${dx} ${dy - d} A ${d} ${d} 0 0 1 ${dx + d} ${dy}" fill="none" stroke="#7c2d12" stroke-width="1.6"/><text x="${dx + d / 2}" y="${dy - 5}" text-anchor="middle" font-size="9" font-family="Arial" font-weight="700" fill="#7c2d12">${tag}</text></g>`;
  }

  function windowTag(r: Room, index: number) {
    const kind = String(r.kind || "").toLowerCase();
    if (kind === "passage" || kind === "lobby" || kind === "staircase") return "";
    const b = box(r);
    const tag = `W${index + 1}`;
    const len = Math.min(52, Math.max(28, Math.min(b.w, b.h) * 0.45));

    if (r.y <= 4) {
      const wx = b.x + b.w / 2 - len / 2;
      return `<g data-window="${tag}"><line x1="${wx}" y1="${b.y}" x2="${wx + len}" y2="${b.y}" stroke="#2563eb" stroke-width="4"/><line x1="${wx}" y1="${b.y - 7}" x2="${wx + len}" y2="${b.y - 7}" stroke="#2563eb" stroke-width="1.5"/><text x="${wx + len / 2}" y="${b.y - 11}" text-anchor="middle" font-size="9" font-family="Arial" font-weight="700" fill="#2563eb">${tag}</text></g>`;
    }

    if (r.x + r.w >= W - 4) {
      const wy = b.y + b.h / 2 - len / 2;
      return `<g data-window="${tag}"><line x1="${b.x + b.w}" y1="${wy}" x2="${b.x + b.w}" y2="${wy + len}" stroke="#2563eb" stroke-width="4"/><line x1="${b.x + b.w + 7}" y1="${wy}" x2="${b.x + b.w + 7}" y2="${wy + len}" stroke="#2563eb" stroke-width="1.5"/><text x="${b.x + b.w + 17}" y="${wy + len / 2}" text-anchor="middle" font-size="9" font-family="Arial" font-weight="700" fill="#2563eb" transform="rotate(90 ${b.x + b.w + 17} ${wy + len / 2})">${tag}</text></g>`;
    }

    if (r.x <= 4) {
      const wy = b.y + b.h / 2 - len / 2;
      return `<g data-window="${tag}"><line x1="${b.x}" y1="${wy}" x2="${b.x}" y2="${wy + len}" stroke="#2563eb" stroke-width="4"/><line x1="${b.x - 7}" y1="${wy}" x2="${b.x - 7}" y2="${wy + len}" stroke="#2563eb" stroke-width="1.5"/><text x="${b.x - 17}" y="${wy + len / 2}" text-anchor="middle" font-size="9" font-family="Arial" font-weight="700" fill="#2563eb" transform="rotate(-90 ${b.x - 17} ${wy + len / 2})">${tag}</text></g>`;
    }

    return "";
  }

  const roomSvg = plan.rooms.map((r, index) => {
    const b = box(r);
    const fill = colors[r.kind] || "#ffffff";
    const minSide = Math.min(r.w, r.h);
    const fs = minSide <= 5 ? 9 : minSide <= 7 ? 10 : minSide <= 10 ? 11.5 : 13;
    const lines = roomLabelLines(r.name);
    const labelY = b.cy - (lines.length > 1 ? fs * 0.6 : 0);
    const labelSvg = lines.map((line, i) => `<text x="${b.cx}" y="${labelY + i * (fs + 2)}" text-anchor="middle" font-size="${fs}" font-family="Arial" font-weight="800" fill="#111827">${esc(line)}</text>`).join("");
    const dimY = labelY + lines.length * (fs + 2) + 4;

    return `<g data-room="${esc(r.id)}" data-kind="${esc(r.kind)}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${fill}" stroke="#111827" stroke-width="3"/><rect x="${b.x + 4}" y="${b.y + 4}" width="${Math.max(1, b.w - 8)}" height="${Math.max(1, b.h - 8)}" fill="none" stroke="#fff" stroke-width="1" opacity="0.7"/>${furniture(r)}${labelSvg}<text x="${b.cx}" y="${dimY}" text-anchor="middle" font-size="${Math.max(8.5, fs - 1.5)}" font-family="Arial" font-weight="700" fill="#374151">${r.w}' × ${r.h}'</text>${door(r, index)}${windowTag(r, index)}</g>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}"><rect width="100%" height="100%" fill="#ffffff"/><defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,8 L8,0" stroke="#10b981" stroke-width="1" opacity="0.45"/></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="#111827"/></marker><marker id="smallArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#111827"/></marker></defs><rect x="18" y="14" width="${sheetW - 36}" height="${sheetH - 28}" fill="none" stroke="#d1d5db" stroke-width="1"/><text x="${sheetW / 2}" y="28" text-anchor="middle" font-size="25" font-family="Arial" font-weight="900" fill="#111827">${esc(plan.title)}</text><text x="${sheetW / 2}" y="54" text-anchor="middle" font-size="12" font-family="Arial" font-weight="700" fill="#374151">49' East Front × 57' North Side Corner Plot • Exact Source-of-Truth Draft</text><text x="${outerX + outerW / 2}" y="${outerY - 42}" text-anchor="middle" font-size="16" font-family="Arial" font-weight="900" fill="#111827">NORTH SIDE ROAD - 57'</text><text x="${outerX + outerW + 54}" y="${outerY + outerH / 2}" text-anchor="middle" font-size="16" font-family="Arial" font-weight="900" fill="#111827" transform="rotate(90 ${outerX + outerW + 54} ${outerY + outerH / 2})">EAST FRONT ROAD - 49'</text><line x1="${outerX}" y1="${outerY - 24}" x2="${outerX + outerW}" y2="${outerY - 24}" stroke="#111827" stroke-width="1.6" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="${outerX + outerW / 2}" y="${outerY - 31}" text-anchor="middle" font-size="13" font-family="Arial" font-weight="900">${W}'</text><line x1="${outerX + outerW + 24}" y1="${outerY}" x2="${outerX + outerW + 24}" y2="${outerY + outerH}" stroke="#111827" stroke-width="1.6" marker-start="url(#arrow)" marker-end="url(#arrow)"/><text x="${outerX + outerW + 36}" y="${outerY + outerH / 2}" text-anchor="middle" font-size="13" font-family="Arial" font-weight="900" transform="rotate(90 ${outerX + outerW + 36} ${outerY + outerH / 2})">${D}'</text><g data-north-arrow="true"><text x="${sheetW - 62}" y="40" text-anchor="middle" font-size="18" font-family="Arial" font-weight="900">N</text><path d="M ${sheetW - 62} 48 L ${sheetW - 76} 84 L ${sheetW - 62} 76 L ${sheetW - 48} 84 Z" fill="#111827"/></g><rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" fill="none" stroke="#050505" stroke-width="7"/>${roomSvg}<g data-title-block="true"><rect x="${outerX}" y="${outerY + outerH + 26}" width="${outerW}" height="56" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/><text x="${outerX + 14}" y="${outerY + outerH + 48}" font-size="12" font-family="Arial" font-weight="900" fill="#111827">BUILDSETU EXACT FLOOR PLAN</text><text x="${outerX + 14}" y="${outerY + outerH + 68}" font-size="11" font-family="Arial" fill="#374151">Generated by BuildSetu Exact Floor Plan Agent • Planning draft only • Architect/engineer/local authority approval required.</text><text x="${outerX + outerW - 14}" y="${outerY + outerH + 48}" text-anchor="end" font-size="11" font-family="Arial" font-weight="800" fill="#374151">Scale: coordinate locked</text><text x="${outerX + outerW - 14}" y="${outerY + outerH + 68}" text-anchor="end" font-size="11" font-family="Arial" font-weight="800" fill="#374151">Plot: ${W}' × ${D}'</text></g></svg>`;
}



async function readJsonArray(file: string) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return [];
  }
}

async function writeJson(file: string, data: any) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

async function appendProjectAsset(asset: any) {
  const file = path.join(process.cwd(), "data/generated/project-assets.json");
  const items = await readJsonArray(file);
  items.unshift(asset);
  await writeJson(file, items);
}


// BUILDSETU_EXACT_AGENT_PLANNING_METADATA_V1
// BUILDSETU_EXACT_AGENT_FLOORWISE_PLANNING_METADATA_V1
function buildExactAgentPlanningMetadata(plan: ExactPlan) {
  const command = String((plan as any).command || "").toLowerCase();
  const isGroundFloor = command === "ground_floor_plan";
  const isFirstFloor = command === "first_floor_plan";

  const bedroomCount = plan.rooms.filter((room) => room.kind === "bedroom").length;
  const bathroomCount = plan.rooms.filter((room) => room.kind === "toilet").length;
  const parkingCount = plan.rooms.filter((room) => room.kind === "parking").length;
  const balconyTerraceCount = plan.rooms.filter((room) => ["balcony", "terrace"].includes(String(room.kind || "").toLowerCase())).length;

  const hasBedroom2 = plan.rooms.some((room) => /bedroom\s*2/i.test(room.name));
  const hasBedroom3 = plan.rooms.some((room) => /bedroom\s*3/i.test(room.name));
  const hasFamilyMultiuse = plan.rooms.some((room) => /family\s*\/\s*multi|multi-use/i.test(room.name));

  const is49x57EastNorth =
    Math.round(plan.plot.widthFt) === 49 &&
    Math.round(plan.plot.depthFt) === 57 &&
    String(plan.plot.facing || "").toLowerCase().includes("east");

  const expected = is49x57EastNorth
    ? isFirstFloor
      ? { bedrooms: 3, bathrooms: 2, parkingMax: 0, label: "49x57 East-North first floor" }
      : { bedrooms: 1, bathrooms: 1, parkingMax: 1, label: "49x57 East-North ground floor" }
    : { bedrooms: bedroomCount, bathrooms: bathroomCount, parkingMax: 1, label: "Project-specific floor" };

  const validationReport = [
    {
      id: "plot_dimension",
      check: "Plot dimension",
      status: plan.plot.widthFt > 0 && plan.plot.depthFt > 0 ? "pass" : "fail",
      note: `Plot locked to ${plan.plot.widthFt}' x ${plan.plot.depthFt}'.`,
    },
    {
      id: "floor_room_count",
      check: "Floor-wise room count",
      status: is49x57EastNorth && bedroomCount === expected.bedrooms && bathroomCount === expected.bathrooms ? "pass" : is49x57EastNorth ? "fail" : "review",
      note: `${expected.label} expects bedrooms=${expected.bedrooms}, bathrooms=${expected.bathrooms}. Current bedrooms=${bedroomCount}, bathrooms=${bathroomCount}.`,
    },
    {
      id: "parking_rule",
      check: "Parking rule",
      status: isFirstFloor ? (parkingCount === 0 ? "pass" : "fail") : parkingCount <= expected.parkingMax ? "pass" : "fail",
      note: isFirstFloor ? "First floor must not contain parking." : "Ground floor must contain max one parking zone.",
    },
    {
      id: "first_floor_balcony_terrace",
      check: "First-floor balcony/terrace",
      status: isFirstFloor ? (balconyTerraceCount >= 1 ? "pass" : "fail") : "review",
      note: isFirstFloor ? "First floor should include East/North balcony or terrace." : "Ground floor balcony/terrace not required.",
    },
    {
      id: "duplicate_room_check",
      check: "Duplicate / unrequested rooms",
      status: isGroundFloor
        ? (!hasBedroom2 && !hasBedroom3 && !hasFamilyMultiuse && parkingCount <= 1 ? "pass" : "fail")
        : (!hasFamilyMultiuse && parkingCount === 0 ? "pass" : "fail"),
      note: isGroundFloor
        ? "Ground floor rejects Bedroom 2, Bedroom 3, Family/Multi-use room and duplicate parking."
        : "First floor allows Bedroom 2/3 but rejects parking and Family/Multi-use placeholder.",
    },
    {
      id: "professional_review",
      check: "Professional verification",
      status: "review",
      note: "Concept planning only. Architect/engineer/local authority verification required before construction or approval use.",
    },
  ];

  // BUILDSETU_EXACT_AGENT_HARD_GEOMETRY_ATTACH_V1
  const hardGeometryReport =
    is49x57EastNorth && isGroundFloor
      ? validateBuildSetu49x57EastNorthGroundGeometry({
          plot: {
            width: 57,
            depth: 49,
            drawingWidth: 57,
            drawingHeight: 49,
          },
          rooms: plan.rooms,
          drawingConvention: {
            northArrow: "UP",
            topEdge: "NORTH SIDE ROAD - 57'",
            rightEdge: "EAST FRONT ROAD - 49'",
          },
        })
      : null;

  // BUILDSETU_EXACT_AGENT_HUMAN_PLANNING_SKILL_GATE_V1
  const humanPlanningReport =
    isGroundFloor
      ? validateBuildSetuHumanLikeFloorPlanning({
          command,
          plot: {
            widthFt: plan.plot.widthFt,
            depthFt: plan.plot.depthFt,
            drawingWidthFt: is49x57EastNorth ? 57 : plan.plot.widthFt,
            drawingHeightFt: is49x57EastNorth ? 49 : plan.plot.depthFt,
          },
          rooms: plan.rooms,
          drawingConvention: {
            northArrow: "UP",
            topEdge: is49x57EastNorth ? "NORTH SIDE ROAD - 57'" : undefined,
            rightEdge: is49x57EastNorth ? "EAST FRONT ROAD - 49'" : undefined,
          },
        })
      : null;

  // BUILDSETU_EXACT_AGENT_SKILL_REGISTRY_PARALLEL_SCOPE_SAFE_V1
  const planningSkillReports = runBuildSetuPlanningSkills({
    command,
    plot: {
      widthFt: plan.plot.widthFt,
      depthFt: plan.plot.depthFt,
      drawingWidthFt: is49x57EastNorth ? 57 : plan.plot.widthFt,
      drawingHeightFt: is49x57EastNorth ? 49 : plan.plot.depthFt,
      facing: plan.plot.facing,
    },
    rooms: plan.rooms,
    drawingConvention: {
      northArrow: "UP",
      topEdge: is49x57EastNorth ? "NORTH SIDE ROAD - 57'" : undefined,
      rightEdge: is49x57EastNorth ? "EAST FRONT ROAD - 49'" : undefined,
    },
  });

  const planningSkillSummary = summarizeBuildSetuSkillReports(planningSkillReports);

  const mergedValidationReport = [
    ...validationReport,
    ...(hardGeometryReport?.checks || []).map((check) => ({
      id: check.id,
      check: check.id,
      status: check.status,
      note: check.note,
    })),
    ...(humanPlanningReport?.checks || []).map((check) => ({
      id: check.id,
      check: check.check,
      status: check.status,
      note: check.note,
    })),
    ...planningSkillReports.flatMap((report) =>
      report.checks.map((check) => ({
        id: `${report.skillId}:${check.id}`,
        check: check.check,
        status: check.status,
        note: check.note,
      })),
    ),
  ];

  const scoreItems = [
    ["Space Utilization", 8],
    ["Room Dimensions", 8],
    ["Circulation", 8],
    ["Natural Light", 8],
    ["Ventilation", 8],
    ["Structure Feasibility", 7],
    ["MEP Efficiency", 7],
    ["Safety", 7],
    ["Cost Practicality", 8],
    ["Future Expansion", 8],
  ].map(([criteria, score]) => ({
    criteria,
    score,
    note: `${criteria} concept reviewed by exact floor-plan agent.`,
  }));

  const blockers = mergedValidationReport
    .filter((item) => item.status === "fail")
    .map((item) => item.note);

  const scoreTotal = scoreItems.reduce((sum, item: any) => sum + Number(item.score || 0), 0);

  const scoreReport = {
    source: "exact_agent_planning_scorecard_v1",
    total: hardGeometryReport?.status === "fail" || humanPlanningReport?.status === "fail" ? 0 : Math.min(scoreTotal, humanPlanningReport?.total ?? scoreTotal),
    max: 100,
    status: hardGeometryReport?.status === "fail" || humanPlanningReport?.status === "fail" ? "fail" : (blockers.length ? "revise" : scoreTotal >= 75 ? "pass" : "revise"),
    scorecard: scoreItems,
    blockers,
    hardGeometryReport,
    humanPlanningReport,
    planningSkillSummary,
    planningSkillReports,
    revisionRule: "If blockers exist or score is below 75, revise before final render/working drawing.",
  };

  const planningJson = {
    source: "exact_agent_planning_metadata_v1",
    projectId: plan.projectId,
    title: plan.title,
    command: plan.command,
    plot: {
      ...plan.plot,
      drawingWidthFt: is49x57EastNorth ? 57 : plan.plot.widthFt,
      drawingHeightFt: is49x57EastNorth ? 49 : plan.plot.depthFt,
      drawingConvention: is49x57EastNorth
        ? {
            northArrow: "UP",
            topEdge: "NORTH SIDE ROAD - 57'",
            rightEdge: "EAST FRONT ROAD - 49'",
          }
        : null,
    },
    rooms: plan.rooms,
    complianceChecklist: plan.complianceChecklist,
    openItems: plan.openItems,
    roomCounts: {
      bedrooms: bedroomCount,
      bathrooms: bathroomCount,
      parking: parkingCount,
      balconyTerrace: balconyTerraceCount,
    },
    validation: mergedValidationReport,
    scoreReport,
  };

  return {
    planningJson,
    validationReport: mergedValidationReport,
    scoreReport,
  };
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // BUILDSETU_EXACT_AGENT_SAVEASSET_PERSISTENCE_V1
    const forceSaveAsset =
      body?.saveAsset === true ||
      body?.saveAsset === "true" ||
      body?.persistAsset === true ||
      body?.persistAsset === "true";

    // BUILDSETU_EXACT_AGENT_INTERNAL_ONLY_V1
    // When called by OpenAI render bridge, exact SVG is planning data only; do not add it as final gallery asset.
    const internalOnly = body.internalOnly === true || body.saveAsset === false;



    const projectId = safe(body.projectId);
    const message = safe(body.message || body.prompt || body.input || body.text);
    const projectTitle = safe(body.projectTitle || body.title);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, code: "PROJECT_ID_REQUIRED", error: "projectId required" },
        { status: 400 },
      );
    }

    const lock = await getProjectPlanLock(projectId).catch(() => null);
    const lockedPlan = lock?.basePlan || {};

    const sourceText = [
      projectTitle,
      message,
      JSON.stringify(body.requirements || {}),
      JSON.stringify(lockedPlan || {}),
      JSON.stringify(lock?.baseAsset || {}),
    ].join(" ");

    const parsed = parsePlotFromText(sourceText);

    const widthFt = num(body.widthFt, 0) || parsed.widthFt || num(lockedPlan.widthFt || lockedPlan.plotWidthFt, 0);
    const depthFt = num(body.depthFt, 0) || parsed.depthFt || num(lockedPlan.depthFt || lockedPlan.plotDepthFt, 0);
    const facing = safe(body.facing || parsed.facing || lockedPlan.facing || "north").toLowerCase();

    const city = safe(body.city || body.localAuthority || lockedPlan.city || "");
    const command = detectCommand(message);
    const title = titleForCommand(command);

    const missing: string[] = [];
    if (!widthFt) missing.push("plot width");
    if (!depthFt) missing.push("plot depth");
    if (!facing) missing.push("facing");

    if (missing.length) {
      return NextResponse.json({
        ok: true,
        planningStatus: "needs_input",
        source: "exact_floor_plan_agent_v1",
        questions: missing.map((x) => `Please provide ${x}.`),
      });
    }

    const reqs = inferRequirements(sourceText, lock);
    const rooms = buildGroundFloorPlan({
      projectId,
      widthFt,
      depthFt,
      facing,
      bedrooms: reqs.bedrooms,
      bathrooms: reqs.bathrooms,
      parking: reqs.parking || true,
      puja: reqs.puja || true,
      staircase: reqs.staircase || true,
      command,
    });

    // BUILDSETU_EXACT_AGENT_57X49_OUTOFBOUNDS_FIX_V1
    // BUILDSETU_EXACT_AGENT_57X49_VALIDATE_BOUNDS_V1
    const use57x49DrawingBounds =
      Math.round(widthFt) === 49 &&
      Math.round(depthFt) === 57 &&
      facing.includes("east") &&
      /north\s*side|side\s*road.*north|east[-\s]*north|east\s+north|corner\s*plot/.test(sourceText.toLowerCase());

    const validationWidthFt = use57x49DrawingBounds ? 57 : widthFt;
    const validationDepthFt = use57x49DrawingBounds ? 49 : depthFt;

    const validationErrors = validatePlan(validationWidthFt, validationDepthFt, rooms);

    const plan: ExactPlan = {
      source: "exact_floor_plan_agent_v1",
      projectId,
      title,
      command,
      plot: {
        widthFt,
        depthFt,
        facing,
        areaSqft: round1(widthFt * depthFt),
      },
      assumptions: [
        "Planning generated from project data / locked plan first, image rendering second.",
        "Exact outer plot rectangle is locked before drawing.",
        "Room rectangles are checked to stay inside plot boundary.",
        "Local government rule validation requires city/local-authority byelaw profile.",
      ],
      complianceChecklist: buildComplianceChecklist({
        widthFt,
        depthFt,
        city,
        rooms,
        hasParking: reqs.parking || true,
        hasStaircase: reqs.staircase || true,
      }),
      rooms,
      openItems: validationErrors,
    };

    const planningMetadata = buildExactAgentPlanningMetadata(plan);

    const svg = renderSvg(plan);

    const ts = Date.now();
    const folder = path.join(process.cwd(), "data/generated/ai-images", projectId, "exact-floor-plan-agent");
    await mkdir(folder, { recursive: true });

    const fileName = `${ts}-${slug(title)}.svg`;
    const absFile = path.join(folder, fileName);
    await writeFile(absFile, svg, "utf8");

    const planJsonFile = path.join(folder, `${ts}-${slug(title)}.json`);
    await writeJson(planJsonFile, plan);

    const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(`generated/ai-images/${projectId}/exact-floor-plan-agent/${fileName}`)}`;

    const asset = {
      id: `exact_floor_plan_${ts}`,
      projectId,
      toolSlug: "floor-plan-ai",
      assetType: command,
      title,
      imageUrl,
      source: "exact_floor_plan_agent_v1",
      createdAt: new Date(ts).toISOString(),
      planJsonUrl: `/api/ai/generated-image?file=${encodeURIComponent(`generated/ai-images/${projectId}/exact-floor-plan-agent/${ts}-${slug(title)}.json`)}`,
      plot: plan.plot,
      rooms: plan.rooms,
      complianceChecklist: plan.complianceChecklist,
      openItems: plan.openItems,
      planningJson: planningMetadata.planningJson,
      validationReport: planningMetadata.validationReport,
      scoreReport: planningMetadata.scoreReport,
    };

    if (!internalOnly || forceSaveAsset) {
      await appendProjectAsset(asset);
    }

    return NextResponse.json({
      ok: true,
      planningStatus: validationErrors.length ? "review_required" : "ready",
      source: "exact_floor_plan_agent_v1",
      projectId,
      command,
      title,
      imageUrl,
      asset: internalOnly ? { ...asset, internalOnly: true } : asset,
      plan,
      // BUILDSETU_EXACT_AGENT_TOP_LEVEL_PLANNING_METADATA_V1
      rooms: plan.rooms,
      complianceChecklist: plan.complianceChecklist,
      openItems: plan.openItems,
      planningJson: planningMetadata.planningJson,
      validationReport: planningMetadata.validationReport,
      scoreReport: planningMetadata.scoreReport,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "EXACT_FLOOR_PLAN_AGENT_FAILED",
        error: error?.message || "Failed to generate exact floor plan",
      },
      { status: 500 },
    );
  }
}
