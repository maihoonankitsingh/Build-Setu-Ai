import fs from "fs/promises";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), "data");
const DATA_DIR = path.join(process.cwd(), "data", "generated");
const ASSETS_FILE = path.join(DATA_DIR, "project-assets.json");

function safe(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function assetFileToAbsolute(file?: string | null) {
  const clean = safe(file).replace(/^\/+/, "");
  if (!clean) return "";

  if (clean.startsWith("data/")) return path.join(process.cwd(), clean);
  if (clean.startsWith("generated/")) return path.join(DATA_ROOT, clean);

  return path.join(DATA_DIR, clean);
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

async function convertSvgToPngBuffer(svgAbs: string) {
  const sharp = (eval("require")("sharp") as any);
  const svg = await fs.readFile(svgAbs);

  return sharp(svg, { density: 220 })
    .resize({
      width: 1536,
      height: 2048,
      fit: "contain",
      background: "#ffffff",
    })
    .png()
    .toBuffer();
}

function buildPresentationPrompt(params: {
  projectTitle: string;
  userPrompt: string;
  plan?: any;
}) {
  const plan = params.plan || {};
  const rooms = Array.isArray(plan?.rooms)
    ? plan.rooms
        .map((room: any) => `${room.name}: ${room.w}' x ${room.h}'`)
        .slice(0, 30)
        .join("; ")
    : "";

  return [
    "Convert the provided exact architectural floor plan reference into a premium professional client-ready Indian residential 2D floor plan presentation.",
    "",
    "Critical rule:",
    "- Preserve the same layout, room positions, plot proportion, facing, dimensions, room names, parking, staircase, toilets, kitchen, puja, and circulation from the reference image.",
    "- Do not invent a new plan.",
    "- Do not turn it into exterior elevation, facade, 3D house, perspective render, or interior render.",
    "- Output must remain a clean top-down 2D floor plan.",
    "",
    "Improve visual quality:",
    "- professional architect presentation style",
    "- clean black wall lines with realistic wall thickness",
    "- subtle floor texture/tile grid",
    "- furniture symbols in plan view: beds, wardrobes, sofa, dining table, kitchen counter, toilet fixtures, car, staircase",
    "- readable room labels and dimensions",
    "- north arrow, plot size, road/front side, title block",
    "- white/off-white sheet background",
    "- high-resolution premium look",
    "",
    "Text discipline:",
    "- keep labels short and legible",
    "- avoid spelling mistakes",
    "- avoid overlapping text",
    "- use English architectural labels",
    "",
    `Project: ${params.projectTitle}`,
    `User request: ${params.userPrompt}`,
    plan?.subtitle ? `Plan subtitle: ${plan.subtitle}` : "",
    rooms ? `Exact room schedule: ${rooms}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateFloorPlanPresentationFromExactPlan(args: {
  projectId: string;
  projectTitle: string;
  userPrompt: string;
  exact: any;
  architectAgent?: any;
}) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      reason: "OPENAI_API_KEY missing",
    };
  }

  const exactFile = args?.exact?.asset?.file || args?.exact?.asset?.publicUrl || args?.exact?.publicUrl || "";
  const svgAbs = assetFileToAbsolute(exactFile);

  if (!svgAbs || !svgAbs.endsWith(".svg")) {
    return {
      ok: false,
      skipped: true,
      reason: "Exact SVG file not available for presentation render",
      exactFile,
    };
  }

  const pngBuffer = await convertSvgToPngBuffer(svgAbs);
  const prompt = buildPresentationPrompt({
    projectTitle: args.projectTitle,
    userPrompt: args.userPrompt,
    plan: args?.exact?.plan,
  });

  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_EDIT_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", "high");
  form.append("n", "1");

  const blob = new Blob([pngBuffer], { type: "image/png" });
  form.append("image", blob, "exact-floor-plan-reference.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      skipped: true,
      reason: json?.error?.message || json?.message || `OpenAI image edit failed with ${response.status}`,
      raw: json,
    };
  }

  const b64 = json?.data?.[0]?.b64_json;
  const remoteUrl = json?.data?.[0]?.url;

  if (!b64 && !remoteUrl) {
    return {
      ok: false,
      skipped: true,
      reason: "OpenAI image edit returned no image",
      raw: json,
    };
  }

  const projectId = safe(args.projectId, "default-project")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .slice(0, 120) || "default-project";

  const now = Date.now();
  const fileDir = path.join(DATA_DIR, "ai-images", projectId);
  await fs.mkdir(fileDir, { recursive: true });

  const fileName = `${now}-presentation-floor-plan.png`;
  const fileRel = `generated/ai-images/${projectId}/${fileName}`;
  const fileAbs = path.join(fileDir, fileName);

  if (b64) {
    await fs.writeFile(fileAbs, Buffer.from(b64, "base64"));
  } else {
    const imgResponse = await fetch(remoteUrl);
    if (!imgResponse.ok) {
      return {
        ok: false,
        skipped: true,
        reason: "OpenAI image URL download failed",
      };
    }
    const arrayBuffer = await imgResponse.arrayBuffer();
    await fs.writeFile(fileAbs, Buffer.from(arrayBuffer));
  }

  const apiUrl = `/api/ai/generated-image?file=${encodeURIComponent(fileRel)}`;
  const publicUrl = `/${fileRel}`;

  const asset = {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    type: "image",
    projectId,
    projectTitle: args.projectTitle,
    toolSlug: "floor-plan-ai",
    toolName: "Floor Plan AI",
    renderType: "floor_plan_2d_presentation",
    assetType: "floor_plan_presentation",
    imageMode: "floor_plan_presentation",
    roomType: "Floor Plan Presentation",
    imageUrl: apiUrl,
    publicUrl,
    file: fileRel,
    sourceExactPlanFile: args?.exact?.asset?.file || "",
    prompt,
    revisedPrompt: json?.data?.[0]?.revised_prompt || "",
    generationMode: "openai_floor_plan_presentation_from_exact_plan",
    viewLabel: "Presentation Floor Plan",
    createdAt: new Date().toISOString(),
  };

  await appendAsset(asset);

  return {
    ok: true,
    imageUrl: apiUrl,
    publicUrl,
    url: apiUrl,
    path: apiUrl,
    asset,
    prompt,
    revisedPrompt: asset.revisedPrompt,
    source: "openai_image_edit_from_exact_plan",
    generationMode: "openai_floor_plan_presentation_from_exact_plan",
    exactReference: args?.exact?.asset?.file || "",
  };
}
