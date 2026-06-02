import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const ASSETS_FILE = path.join(DATA_DIR, "project-assets.json");

type Room = {
  key: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  label?: string;
};

function safe(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function slugify(value: unknown) {
  return safe(value, "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "project";
}

function esc(value: unknown) {
  return safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

async function appendProjectAsset(asset: any) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const existing = await readAssets();

  const cleaned = existing.filter((item: any) => {
    const sameProject = safe(item?.projectId) === safe(asset?.projectId);
    const isOldExact =
      safe(item?.source) === "exact_professional_floor_plan_v1" ||
      safe(item?.assetType) === "exact_professional_floor_plan" ||
      String(item?.file || "").includes("exact-professional-floor-plan");

    return !(sameProject && isOldExact);
  });

  const merged = [asset, ...cleaned].slice(0, 1400);
  await fs.writeFile(ASSETS_FILE, JSON.stringify(merged, null, 2), "utf8");
}

const plot = {
  w: 41,
  h: 51,
};

const SCALE = 24;
const OX = 90;
const OY = 115;

function X(ft: number) {
  return OX + ft * SCALE;
}

function Y(ft: number) {
  return OY + ft * SCALE;
}

function W(ft: number) {
  return ft * SCALE;
}

function H(ft: number) {
  return ft * SCALE;
}

function roomRect(room: Room) {
  return `
  <rect x="${X(room.x)}" y="${Y(room.y)}" width="${W(room.w)}" height="${H(room.h)}" fill="${room.fill}" stroke="#111827" stroke-width="4"/>
  <text x="${X(room.x + room.w / 2)}" y="${Y(room.y + room.h / 2) - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#111827">${esc(room.name)}</text>
  <text x="${X(room.x + room.w / 2)}" y="${Y(room.y + room.h / 2) + 24}" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#111827">${esc(room.label || `${room.w}' x ${room.h}'`)}</text>
`;
}

function door(x: number, y: number, r = 42, label = "D1", flip = false) {
  const d = flip
    ? `M ${X(x)} ${Y(y)} A ${r} ${r} 0 0 0 ${X(x) - r} ${Y(y) + r}`
    : `M ${X(x)} ${Y(y)} A ${r} ${r} 0 0 1 ${X(x) + r} ${Y(y) + r}`;

  return `
  <path d="${d}" fill="none" stroke="#7c2d12" stroke-width="3"/>
  <line x1="${X(x)}" y1="${Y(y)}" x2="${X(x)}" y2="${Y(y) + r}" stroke="#7c2d12" stroke-width="3"/>
  <text x="${X(x) + (flip ? -32 : 28)}" y="${Y(y) + 22}" font-family="Arial" font-size="15" font-weight="900">${label}</text>
`;
}

function windowTag(x1: number, y1: number, x2: number, y2: number, label: string) {
  return `
  <line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="#38bdf8" stroke-width="6"/>
  <line x1="${X(x1)}" y1="${Y(y1) - 4}" x2="${X(x2)}" y2="${Y(y2) - 4}" stroke="#ffffff" stroke-width="2"/>
  <text x="${(X(x1) + X(x2)) / 2}" y="${Y(y1) - 12}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="900">${label}</text>
`;
}

function bed(x: number, y: number, w = 6.2, h = 5.2) {
  return `
  <rect x="${X(x)}" y="${Y(y)}" width="${W(w)}" height="${H(h)}" fill="#ede7d9" stroke="#8d7b68" stroke-width="2"/>
  <rect x="${X(x + 0.2)}" y="${Y(y + 0.2)}" width="${W(w / 2 - 0.3)}" height="${H(1.2)}" fill="#f8fafc" stroke="#cbd5e1"/>
  <rect x="${X(x + w / 2 + 0.1)}" y="${Y(y + 0.2)}" width="${W(w / 2 - 0.3)}" height="${H(1.2)}" fill="#f8fafc" stroke="#cbd5e1"/>
`;
}

function wardrobe(x: number, y: number, w = 1.0, h = 8.0) {
  return `
  <rect x="${X(x)}" y="${Y(y)}" width="${W(w)}" height="${H(h)}" fill="#a16207" opacity="0.72" stroke="#713f12"/>
  ${Array.from({ length: 7 }, (_, i) => `<line x1="${X(x)}" y1="${Y(y + i * h / 7)}" x2="${X(x + w)}" y2="${Y(y + i * h / 7)}" stroke="#713f12"/>`).join("")}
`;
}

function sofa(x: number, y: number) {
  return `
  <rect x="${X(x)}" y="${Y(y)}" width="${W(4.6)}" height="${H(1.2)}" rx="8" fill="#d6d3d1" stroke="#78716c"/>
  <rect x="${X(x)}" y="${Y(y + 1.2)}" width="${W(1.2)}" height="${H(4.4)}" rx="8" fill="#d6d3d1" stroke="#78716c"/>
  <rect x="${X(x + 2.2)}" y="${Y(y + 2.4)}" width="${W(2.0)}" height="${H(1.6)}" fill="#b45309" opacity="0.7"/>
`;
}

function dining(x: number, y: number) {
  return `
  <rect x="${X(x)}" y="${Y(y)}" width="${W(3.8)}" height="${H(6.4)}" rx="6" fill="#b45309" opacity="0.78" stroke="#78350f"/>
  ${Array.from({ length: 3 }, (_, i) => `<rect x="${X(x - 0.9)}" y="${Y(y + 0.6 + i * 1.7)}" width="${W(0.7)}" height="${H(0.9)}" fill="#e7e5e4" stroke="#78716c"/>`).join("")}
  ${Array.from({ length: 3 }, (_, i) => `<rect x="${X(x + 4.0)}" y="${Y(y + 0.6 + i * 1.7)}" width="${W(0.7)}" height="${H(0.9)}" fill="#e7e5e4" stroke="#78716c"/>`).join("")}
`;
}

function kitchenCounter(x: number, y: number, w: number, h: number) {
  return `
  <rect x="${X(x)}" y="${Y(y)}" width="${W(w)}" height="${H(1.2)}" fill="#404040"/>
  <rect x="${X(x + w - 3)}" y="${Y(y + 0.2)}" width="${W(1.7)}" height="${H(0.8)}" fill="#e5e7eb" stroke="#111827"/>
  <circle cx="${X(x + 1.5)}" cy="${Y(y + 0.6)}" r="8" fill="#111827"/>
`;
}

function toiletFixture(x: number, y: number) {
  return `
  <circle cx="${X(x)}" cy="${Y(y)}" r="18" fill="#ffffff" stroke="#111827" stroke-width="2"/>
  <rect x="${X(x + 1.2)}" y="${Y(y - 0.8)}" width="${W(1.2)}" height="${H(1)}" fill="#ffffff" stroke="#111827"/>
  <circle cx="${X(x + 2.8)}" cy="${Y(y + 1.5)}" r="8" fill="#0ea5e9"/>
`;
}

function stair(x: number, y: number, w: number, h: number) {
  const steps = Array.from({ length: 8 }, (_, i) => {
    const yy = y + 0.7 + i * ((h - 1.4) / 8);
    return `<line x1="${X(x + 0.6)}" y1="${Y(yy)}" x2="${X(x + w - 0.6)}" y2="${Y(yy)}" stroke="#111827" stroke-width="2"/>`;
  }).join("");

  return `
  ${steps}
  <path d="M ${X(x + 1.2)} ${Y(y + h - 1)} L ${X(x + w - 1.2)} ${Y(y + h - 1)}" stroke="#111827" stroke-width="3"/>
  <path d="M ${X(x + w - 1.2)} ${Y(y + h - 1)} L ${X(x + w - 2.0)} ${Y(y + h - 1.8)}" stroke="#111827" stroke-width="3"/>
  <text x="${X(x + w / 2)}" y="${Y(y + h - 0.2)}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900">UP</text>
`;
}

function car(x: number, y: number, w = 6.2, h = 11.8) {
  return `
  <rect x="${X(x)}" y="${Y(y)}" width="${W(w)}" height="${H(h)}" rx="35" fill="#f8fafc" stroke="#111827" stroke-width="2"/>
  <rect x="${X(x + 0.8)}" y="${Y(y + 2.2)}" width="${W(w - 1.6)}" height="${H(2.2)}" rx="14" fill="#111827" opacity="0.75"/>
  <rect x="${X(x + 0.8)}" y="${Y(y + 7.2)}" width="${W(w - 1.6)}" height="${H(2.4)}" rx="14" fill="#111827" opacity="0.35"/>
  <circle cx="${X(x + 0.4)}" cy="${Y(y + 3.5)}" r="8" fill="#6b7280"/>
  <circle cx="${X(x + w - 0.4)}" cy="${Y(y + 3.5)}" r="8" fill="#6b7280"/>
  <circle cx="${X(x + 0.4)}" cy="${Y(y + 8.7)}" r="8" fill="#6b7280"/>
  <circle cx="${X(x + w - 0.4)}" cy="${Y(y + 8.7)}" r="8" fill="#6b7280"/>
`;
}

function dimensionLines() {
  return `
  <line x1="${X(0)}" y1="${Y(-2.3)}" x2="${X(41)}" y2="${Y(-2.3)}" stroke="#111827" stroke-width="3"/>
  <line x1="${X(0)}" y1="${Y(-3.1)}" x2="${X(0)}" y2="${Y(-1.5)}" stroke="#111827" stroke-width="3"/>
  <line x1="${X(41)}" y1="${Y(-3.1)}" x2="${X(41)}" y2="${Y(-1.5)}" stroke="#111827" stroke-width="3"/>
  <text x="${X(20.5)}" y="${Y(-3.1)}" text-anchor="middle" font-family="Arial" font-size="32" font-weight="900">41'</text>

  <line x1="${X(44)}" y1="${Y(0)}" x2="${X(44)}" y2="${Y(51)}" stroke="#111827" stroke-width="3"/>
  <line x1="${X(43.2)}" y1="${Y(0)}" x2="${X(44.8)}" y2="${Y(0)}" stroke="#111827" stroke-width="3"/>
  <line x1="${X(43.2)}" y1="${Y(51)}" x2="${X(44.8)}" y2="${Y(51)}" stroke="#111827" stroke-width="3"/>
  <text x="${X(45.2)}" y="${Y(25.5)}" transform="rotate(-90 ${X(45.2)} ${Y(25.5)})" text-anchor="middle" font-family="Arial" font-size="32" font-weight="900">51'</text>
`;
}

function northArrow() {
  return `
  <circle cx="${X(44)}" cy="${Y(-5)}" r="38" fill="#ffffff" stroke="#111827" stroke-width="3"/>
  <path d="M ${X(44)} ${Y(-6.4)} L ${X(43)} ${Y(-3.7)} L ${X(44)} ${Y(-4.3)} L ${X(45)} ${Y(-3.7)} Z" fill="#111827"/>
  <text x="${X(44)}" y="${Y(-7.2)}" text-anchor="middle" font-family="Arial" font-size="32" font-weight="900">N</text>
`;
}

function createSvg(projectTitle: string) {
  const rooms: Room[] = [
    { key: "master", name: "MASTER BEDROOM", x: 0, y: 0, w: 13, h: 13.5, fill: "#f7f0df", label: `13'0" x 14'0"` },
    { key: "attached", name: "ATTACHED\nTOILET", x: 0, y: 13.5, w: 9, h: 5, fill: "#dbeafe", label: `8'0" x 5'0"` },
    { key: "bed2", name: "BEDROOM 2", x: 0, y: 18.5, w: 13, h: 11, fill: "#f7f0df", label: `13'0" x 11'0"` },
    { key: "bed3", name: "BEDROOM 3", x: 0, y: 29.5, w: 13, h: 13, fill: "#f7f0df", label: `13'0" x 11'0"` },
    { key: "dining", name: "DINING AREA", x: 13, y: 0, w: 14.5, h: 18.5, fill: "#fbf7ee", label: `13'0" x 14'6"` },
    { key: "utility", name: "UTILITY / WASH", x: 27.5, y: 0, w: 13.5, h: 4.6, fill: "#eadfce", label: `11'0" x 4'6"` },
    { key: "kitchen", name: "KITCHEN", x: 27.5, y: 4.6, w: 13.5, h: 11, fill: "#fbf7ee", label: `11'0" x 9'6"` },
    { key: "common", name: "COMMON TOILET", x: 27.5, y: 15.6, w: 10.2, h: 5.0, fill: "#dbeafe", label: `7'6" x 5'0"` },
    { key: "stair", name: "STAIRCASE", x: 27.5, y: 20.6, w: 10.2, h: 9.5, fill: "#f3f4f6", label: "UP" },
    { key: "lobby", name: "LOBBY / PASSAGE", x: 13, y: 18.5, w: 14.5, h: 12, fill: "#fbf7ee", label: `5'6" WIDE` },
    { key: "puja", name: "PUJA", x: 13, y: 18.5, w: 4, h: 4, fill: "#fce7f3", label: `4'0" x 4'0"` },
    { key: "living", name: "LIVING ROOM", x: 13, y: 30.5, w: 14.5, h: 10.5, fill: "#fbf7ee", label: `13'0" x 15'0"` },
    { key: "drawing", name: "DRAWING ROOM", x: 13, y: 41, w: 14.5, h: 8.5, fill: "#fbf7ee", label: `13'0" x 11'0"` },
    { key: "parking", name: "PARKING / PORCH", x: 27.5, y: 30.1, w: 13.5, h: 18.9, fill: "#e5e7eb", label: `12'0" x 17'6"` },
  ];

  const roomSvg = rooms.map(roomRect).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1250" height="1550" viewBox="0 0 1250 1550">
  <rect width="1250" height="1550" fill="#ffffff"/>
  ${dimensionLines()}
  ${northArrow()}

  <rect x="${X(0)}" y="${Y(0)}" width="${W(41)}" height="${H(51)}" fill="none" stroke="#111827" stroke-width="8"/>
  ${roomSvg}

  ${bed(1.2, 1.5, 6.8, 5.8)}
  ${wardrobe(11.4, 1.2, 1.1, 10.8)}
  ${toiletFixture(3.5, 16.1)}

  ${bed(1.2, 20.2, 6.8, 5.5)}
  ${wardrobe(11.4, 19.4, 1.1, 9.5)}

  ${bed(1.2, 32, 6.8, 5.5)}
  ${wardrobe(11.4, 31, 1.1, 9.8)}

  ${dining(18.4, 3.3)}
  ${kitchenCounter(29.4, 6.2, 10.3, 1.2)}
  <rect x="${X(38.6)}" y="${Y(1.0)}" width="${W(1.3)}" height="${H(1.5)}" fill="#d1d5db" stroke="#111827"/>
  <rect x="${X(28.5)}" y="${Y(12)}" width="${W(2.0)}" height="${H(2.8)}" fill="#d1d5db" stroke="#111827"/>

  ${toiletFixture(31.5, 18.0)}
  ${stair(28.3, 21.0, 8.5, 8.2)}

  <rect x="${X(14.0)}" y="${Y(19.2)}" width="${W(2.2)}" height="${H(2.2)}" fill="#fde68a" stroke="#92400e"/>
  <text x="${X(15.1)}" y="${Y(22.3)}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="900" fill="#92400e">ॐ</text>

  ${sofa(14.2, 32.3)}
  <rect x="${X(18.8)}" y="${Y(35.2)}" width="${W(2)}" height="${H(1.6)}" fill="#b45309" opacity="0.65"/>

  <rect x="${X(14.0)}" y="${Y(44.0)}" width="${W(3.6)}" height="${H(1.2)}" fill="#d6d3d1" stroke="#78716c"/>
  <rect x="${X(19.5)}" y="${Y(44.5)}" width="${W(3.0)}" height="${H(1.2)}" fill="#b45309" opacity="0.7"/>
  <rect x="${X(15.0)}" y="${Y(47.2)}" width="${W(4.6)}" height="${H(1.1)}" fill="#d6d3d1" stroke="#78716c"/>

  ${car(30.7, 34.0, 6.3, 11.5)}

  ${door(13, 11.5, 42, "D1")}
  ${door(9, 13.5, 36, "D2")}
  ${door(13, 21.2, 42, "D1")}
  ${door(13, 31.2, 42, "D1")}
  ${door(27.5, 2.7, 36, "D2")}
  ${door(27.5, 7.4, 42, "D1")}
  ${door(27.5, 16.5, 36, "D2")}
  ${door(27.5, 32.0, 42, "D1")}
  ${door(23.5, 41.0, 44, "MD")}

  ${windowTag(2, 0, 8.5, 0, "W2")}
  ${windowTag(16, 0, 23, 0, "W2")}
  ${windowTag(33, 0, 38, 0, "W3")}
  ${windowTag(0, 5, 0, 9, "W2")}
  ${windowTag(0, 15, 0, 17, "V")}
  ${windowTag(0, 22, 0, 27, "W2")}
  ${windowTag(0, 35, 0, 40, "W2")}
  ${windowTag(5, 42.5, 10, 42.5, "W1")}
  ${windowTag(38.0, 17, 41, 17, "V")}
  ${windowTag(41, 38, 41, 43, "W1")}

  <line x1="${X(0)}" y1="${Y(49.5)}" x2="${X(41)}" y2="${Y(49.5)}" stroke="#cbd5e1" stroke-width="3"/>
  <text x="${X(34)}" y="${Y(48.6)}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900">FRONT GATE</text>
  <text x="${X(34)}" y="${Y(49.5)}" text-anchor="middle" font-family="Arial" font-size="16" font-weight="800">12'0" WIDE</text>
  <path d="M ${X(29)} ${Y(51)} L ${X(33)} ${Y(48.8)} L ${X(36)} ${Y(51)}" fill="none" stroke="#111827" stroke-width="3"/>

  <rect x="${X(-1)}" y="${Y(45.8)}" width="${W(12.8)}" height="${H(4.0)}" fill="#ffffff" stroke="#111827" stroke-width="2"/>
  <text x="${X(-0.3)}" y="${Y(47.0)}" font-family="Arial" font-size="20" font-weight="900" fill="#172554">PLOT SIZE: 41' X 51'</text>
  <text x="${X(-0.3)}" y="${Y(48.1)}" font-family="Arial" font-size="20" font-weight="900" fill="#172554">3BHK HOUSE PLAN</text>
  <text x="${X(-0.3)}" y="${Y(49.2)}" font-family="Arial" font-size="20" font-weight="900" fill="#172554">BUILT-UP AREA: ~1760 SQ.FT</text>

  <text x="${X(20.5)}" y="${Y(54.1)}" text-anchor="middle" font-family="Arial" font-size="32" font-weight="900">GROUND FLOOR PLAN (41' X 51')</text>
</svg>`;
}

export async function generateExactProfessionalFloorPlan(args: {
  projectId: string;
  projectTitle?: string;
  prompt?: string;
}) {
  const projectId = safe(args.projectId);
  if (!projectId) throw new Error("projectId is required");

  const projectTitle = safe(args.projectTitle, "41 x 51 ft North Facing House");
  const cleanProjectId = slugify(projectId);
  const now = Date.now();

  const fileRel = `generated/ai-images/${cleanProjectId}/${now}-exact-professional-floor-plan.svg`;
  const fileAbs = path.join(DATA_DIR, fileRel.replace(/^generated\//, ""));

  await fs.mkdir(path.dirname(fileAbs), { recursive: true });
  await fs.writeFile(fileAbs, createSvg(projectTitle), "utf8");

  const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(fileRel)}`;

  const asset = {
    id: `${now}-exact-professional-floor-plan`,
    type: "image",
    projectId,
    projectTitle,
    toolSlug: "floor-plan-ai",
    toolName: "Floor Plan AI",
    renderType: "exact_professional_floor_plan",
    assetType: "exact_professional_floor_plan",
    imageMode: "exact_professional_floor_plan",
    title: "Exact Professional Floor Plan",
    viewLabel: "Exact Professional Floor Plan",
    imageUrl,
    publicUrl: `/${fileRel}`,
    file: fileRel,
    source: "exact_professional_floor_plan_v1",
    generationMode: "deterministic_svg_renderer",
    prompt: safe(args.prompt),
    createdAt: new Date().toISOString(),
  };

  await appendProjectAsset(asset);

  return {
    ok: true,
    source: "exact_professional_floor_plan_v1",
    title: "Exact Professional Floor Plan",
    projectId,
    projectTitle,
    imageUrl,
    publicUrl: asset.publicUrl,
    asset,
  };
}
