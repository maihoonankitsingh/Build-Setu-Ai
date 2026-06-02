import { mkdir, writeFile } from "fs/promises";
import path from "path";

type Room = {
  id?: string;
  name?: string;
  kind?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  note?: string;
};

type NormalizedRoom = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  note: string;
};

export type BuildSetuFloorPlanSvgFallbackArgs = {
  projectId: string;
  title: string;
  assetType?: string;
  lockedPlan?: any;
  prompt?: string;
  providerError?: string;
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function esc(value: unknown) {
  return safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(value: unknown) {
  return safe(value, "floor-plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "floor-plan";
}

function num(value: unknown, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function roomColor(kind: string, index: number) {
  const k = kind.toLowerCase();
  if (k.includes("bed")) return "#eaf1ff";
  if (k.includes("kitchen")) return "#fff4dc";
  if (k.includes("toilet") || k.includes("bath") || k.includes("wash")) return "#e6f7ff";
  if (k.includes("parking")) return "#f1f5f9";
  if (k.includes("living")) return "#f5edff";
  if (k.includes("dining")) return "#ecfdf5";
  if (k.includes("stair")) return "#fef2f2";
  if (k.includes("puja")) return "#fff7ed";
  return ["#f8fafc", "#eef2ff", "#f0fdf4", "#fff7ed"][index % 4];
}

function defaultRooms(widthFt: number, depthFt: number): Room[] {
  const frontH = Math.max(14, Math.min(18, depthFt * 0.34));
  const rearH = Math.max(13, Math.min(16, depthFt * 0.30));
  const midH = Math.max(10, depthFt - frontH - rearH);
  const parkingW = Math.max(11, Math.min(15, widthFt * 0.34));
  const livingW = widthFt - parkingW;
  const kitchenW = Math.max(9, Math.min(12, widthFt * 0.28));
  const bedW = Math.max(11, Math.min(14, widthFt * 0.34));
  const centerW = Math.max(8, widthFt - kitchenW - bedW);
  const rearY = depthFt - rearH;
  const stairW = Math.max(7, Math.min(9, widthFt * 0.20));
  const serviceW = Math.max(7, Math.min(9, widthFt * 0.20));

  return [
    { id: "parking", name: "Car Parking", kind: "parking", x: 0, y: 0, w: parkingW, h: frontH },
    { id: "living", name: "Living", kind: "living", x: parkingW, y: 0, w: livingW, h: frontH },
    { id: "kitchen", name: "Kitchen", kind: "kitchen", x: 0, y: frontH, w: kitchenW, h: midH },
    { id: "dining", name: "Dining", kind: "dining", x: kitchenW, y: frontH, w: centerW, h: midH },
    { id: "bed1", name: "Bedroom 1", kind: "bedroom", x: kitchenW + centerW, y: frontH, w: bedW, h: midH },
    { id: "stair", name: "Staircase", kind: "staircase", x: 0, y: rearY, w: stairW, h: rearH },
    { id: "toilet", name: "Toilet", kind: "toilet", x: stairW, y: rearY, w: serviceW, h: rearH * 0.55 },
    { id: "wash", name: "Wash", kind: "wash", x: stairW, y: rearY + rearH * 0.55, w: serviceW, h: rearH * 0.45 },
    { id: "bed2", name: "Bedroom 2", kind: "bedroom", x: stairW + serviceW, y: rearY, w: widthFt - stairW - serviceW, h: rearH },
  ];
}

function normalizeRooms(plan: any, widthFt: number, depthFt: number): NormalizedRoom[] {
  const source: any[] =
    Array.isArray(plan?.rooms) && plan.rooms.length
      ? plan.rooms
      : defaultRooms(widthFt, depthFt);

  const normalized: NormalizedRoom[] = source
    .map((room: any, index: number): NormalizedRoom => ({
      id: safe(room?.id, `room-${index + 1}`),
      name: safe(room?.name, `Room ${index + 1}`),
      kind: safe(room?.kind || room?.type, "room"),
      x: Math.max(0, num(room?.x, 0)),
      y: Math.max(0, num(room?.y, 0)),
      w: Math.max(1, num(room?.w || room?.width, 8)),
      h: Math.max(1, num(room?.h || room?.height || room?.depth, 8)),
      note: safe(room?.note),
    }))
    .filter((room: NormalizedRoom) => room.x < widthFt && room.y < depthFt)
    .map((room: NormalizedRoom): NormalizedRoom => ({
      ...room,
      w: Math.min(room.w, Math.max(1, widthFt - room.x)),
      h: Math.min(room.h, Math.max(1, depthFt - room.y)),
    }));

  return normalized;
}

export async function generateBuildSetuFloorPlanSvgFallback(args: BuildSetuFloorPlanSvgFallbackArgs) {
  const plan = args.lockedPlan || {};
  const plot = plan.plot || {};
  const projectId = slug(args.projectId || "default-project");
  const title = safe(args.title, "Floor Plan");
  const assetType = safe(args.assetType || plan.command || "floor_plan_2d", "floor_plan_2d");

  const widthFt = num(plot.widthFt || plot.width || plan.widthFt || plan.plotWidthFt, 41);
  const depthFt = num(plot.depthFt || plot.depth || plan.depthFt || plan.plotDepthFt, 51);
  const facing = safe(plot.facing || plan.facing || "north", "north").toUpperCase();
  const rooms = normalizeRooms(plan, widthFt, depthFt);

  const sheetW = 1600;
  const sheetH = 1100;
  const marginX = 120;
  const topY = 150;
  const maxPlanW = sheetW - marginX * 2;
  const maxPlanH = sheetH - 260;
  const scale = Math.min(maxPlanW / widthFt, maxPlanH / depthFt);
  const planW = widthFt * scale;
  const planH = depthFt * scale;
  const ox = (sheetW - planW) / 2;
  const oy = topY;

  const roomSvg = rooms
    .map((room: NormalizedRoom, index: number) => {
      const x = ox + room.x * scale;
      const y = oy + room.y * scale;
      const w = room.w * scale;
      const h = room.h * scale;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const font = Math.max(13, Math.min(24, Math.min(w, h) / 7));
      const fill = roomColor(room.kind, index);

      const furniture =
        room.kind.toLowerCase().includes("bed")
          ? `<rect x="${x + w * 0.18}" y="${y + h * 0.48}" width="${w * 0.46}" height="${h * 0.30}" rx="8" fill="#ffffff" stroke="#64748b" stroke-width="2"/><rect x="${x + w * 0.20}" y="${y + h * 0.51}" width="${w * 0.18}" height="${h * 0.10}" rx="4" fill="#e2e8f0"/>`
          : room.kind.toLowerCase().includes("kitchen")
            ? `<rect x="${x + w * 0.10}" y="${y + h * 0.12}" width="${w * 0.16}" height="${h * 0.72}" fill="#ffffff" stroke="#64748b" stroke-width="2"/><circle cx="${x + w * 0.18}" cy="${y + h * 0.30}" r="${Math.max(5, Math.min(w, h) * 0.045)}" fill="none" stroke="#64748b" stroke-width="2"/>`
            : room.kind.toLowerCase().includes("living")
              ? `<rect x="${x + w * 0.12}" y="${y + h * 0.20}" width="${w * 0.35}" height="${h * 0.18}" rx="10" fill="#ffffff" stroke="#64748b" stroke-width="2"/><rect x="${x + w * 0.58}" y="${y + h * 0.18}" width="${w * 0.20}" height="${h * 0.07}" fill="#64748b"/>`
              : room.kind.toLowerCase().includes("parking")
                ? `<rect x="${x + w * 0.18}" y="${y + h * 0.32}" width="${w * 0.58}" height="${h * 0.34}" rx="18" fill="#ffffff" stroke="#64748b" stroke-width="2"/><circle cx="${x + w * 0.30}" cy="${y + h * 0.70}" r="8" fill="#64748b"/><circle cx="${x + w * 0.64}" cy="${y + h * 0.70}" r="8" fill="#64748b"/>`
                : room.kind.toLowerCase().includes("stair")
                  ? Array.from({ length: 7 }).map((_, i) => `<line x1="${x + w * 0.18}" y1="${y + h * (0.16 + i * 0.10)}" x2="${x + w * 0.82}" y2="${y + h * (0.16 + i * 0.10)}" stroke="#64748b" stroke-width="2"/>`).join("")
                  : "";

      return `
        <g>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#111827" stroke-width="5"/>
          ${furniture}
          <text x="${cx}" y="${cy - font * 0.25}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${font}" font-weight="800" fill="#111827">${esc(room.name)}</text>
          <text x="${cx}" y="${cy + font * 1.05}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(11, font * 0.70)}" font-weight="700" fill="#475569">${room.w.toFixed(1)}' × ${room.h.toFixed(1)}'</text>
        </g>
      `;
    })
    .join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="40" y="40" width="${sheetW - 80}" height="${sheetH - 80}" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <text x="80" y="90" font-family="Arial, sans-serif" font-size="38" font-weight="900" fill="#111827">${esc(title)}</text>
  <text x="80" y="128" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#475569">${widthFt}' × ${depthFt}' • ${esc(facing)} Facing • BuildSetu fallback renderer</text>

  <rect x="${ox}" y="${oy}" width="${planW}" height="${planH}" fill="#ffffff" stroke="#000000" stroke-width="8"/>
  ${roomSvg}

  <line x1="${ox}" y1="${oy - 36}" x2="${ox + planW}" y2="${oy - 36}" stroke="#111827" stroke-width="3"/>
  <line x1="${ox}" y1="${oy - 48}" x2="${ox}" y2="${oy - 24}" stroke="#111827" stroke-width="3"/>
  <line x1="${ox + planW}" y1="${oy - 48}" x2="${ox + planW}" y2="${oy - 24}" stroke="#111827" stroke-width="3"/>
  <text x="${ox + planW / 2}" y="${oy - 50}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#111827">${widthFt}' FRONT</text>

  <line x1="${ox + planW + 42}" y1="${oy}" x2="${ox + planW + 42}" y2="${oy + planH}" stroke="#111827" stroke-width="3"/>
  <line x1="${ox + planW + 30}" y1="${oy}" x2="${ox + planW + 54}" y2="${oy}" stroke="#111827" stroke-width="3"/>
  <line x1="${ox + planW + 30}" y1="${oy + planH}" x2="${ox + planW + 54}" y2="${oy + planH}" stroke="#111827" stroke-width="3"/>
  <text x="${ox + planW + 76}" y="${oy + planH / 2}" transform="rotate(90 ${ox + planW + 76} ${oy + planH / 2})" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#111827">${depthFt}' DEPTH</text>

  <g transform="translate(${sheetW - 190},80)">
    <circle cx="45" cy="45" r="38" fill="#f8fafc" stroke="#111827" stroke-width="3"/>
    <path d="M45 12 L58 50 L45 42 L32 50 Z" fill="#7c3aed"/>
    <text x="45" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="900" fill="#111827">N</text>
  </g>

  <rect x="80" y="${sheetH - 118}" width="${sheetW - 160}" height="58" rx="10" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="105" y="${sheetH - 82}" font-family="Arial, sans-serif" font-size="17" font-weight="800" fill="#334155">Note: OpenAI image provider unavailable/billing-limited. This is deterministic BuildSetu SVG fallback generated from locked planning data.</text>
</svg>`;

  const ts = Date.now();
  const folder = path.join(process.cwd(), "data/generated/ai-images", projectId, "floor-plan-fallback");
  await mkdir(folder, { recursive: true });

  const fileName = `${ts}-${slug(title)}-${slug(assetType)}-fallback.svg`;
  const absFile = path.join(folder, fileName);
  await writeFile(absFile, svg, "utf8");

  const relFile = `generated/ai-images/${projectId}/floor-plan-fallback/${fileName}`;
  const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(relFile)}`;

  return {
    ok: true,
    provider: "buildsetu-deterministic-svg",
    model: "buildsetu-floor-plan-svg-fallback-v1",
    source: "buildsetu_floor_plan_svg_fallback",
    generationMode: "deterministic_floor_plan_svg_fallback",
    fallback: true,
    relFile,
    imageUrl,
    widthFt,
    depthFt,
    facing,
    roomsCount: rooms.length,
    providerError: safe(args.providerError),
  };
}
