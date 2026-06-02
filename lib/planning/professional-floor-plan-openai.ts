import fs from "fs/promises";
import path from "path";
import { createFloorPlanImagePrompt } from "@/lib/planning/floor-plan-prompt-agent";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const ASSETS_FILE = path.join(DATA_DIR, "project-assets.json");

type ProfessionalFloorPlanArgs = {
  projectId: string;
  projectTitle?: string;
  prompt: string;
  project?: any;
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

function parsePlot(text: string) {
  const m = text.match(/\b(\d{2,4})\s*(?:x|×|\*)\s*(\d{2,4})\b/i);
  return {
    width: m ? Number(m[1]) : 41,
    depth: m ? Number(m[2]) : 51,
  };
}

function parseFacing(text: string) {
  const t = text.toLowerCase();
  if (t.includes("south")) return "south";
  if (t.includes("east")) return "east";
  if (t.includes("west")) return "west";
  if (t.includes("north")) return "north";
  return "north";
}

function parseFloor(text: string) {
  const t = text.toLowerCase();
  if (/\bsecond\s*floor\b|\b2nd\s*floor\b/.test(t)) return "second floor";
  if (/\bfirst\s*floor\b|\b1st\s*floor\b/.test(t)) return "first floor";
  if (/\bground\s*floor\b|\bgf\b/.test(t)) return "ground floor";
  return "ground floor";
}

function parseBhk(text: string) {
  const m = text.toLowerCase().match(/\b([1-9])\s*bhk\b/);
  return m ? `${m[1]}BHK` : "3BHK";
}

function buildProfessionalPlannerPrompt(args: ProfessionalFloorPlanArgs) {
  const projectTitle = safe(args.projectTitle, "41 x 51 ft North Facing House");

  // Important: do not inject old projectMemory / working-set JSON here.
  // Only use the fresh user requirement + clean project title.
  const raw = `${projectTitle}\n${args.prompt}`;
  const plot = parsePlot(raw);
  const facing = parseFacing(raw);
  const floor = parseFloor(raw);
  const bhk = parseBhk(raw);

  return `
You are generating a professional Indian residential architectural floor plan image.

STYLE LOCK:
- Match the exact professional presentation style of the provided reference floor plan image if a reference image is attached.
- If no reference image is attached, still use this exact style: premium top-down 2D furnished architectural plan, crisp black outer/interior walls, realistic furniture symbols, beige/white floor tiles, blue toilet tiles, dark kitchen counter, clean door swings, window tags, dimension arrows, north arrow, front gate, and bottom title.
- Output must look like a polished architect/client presentation drawing, not a rough sketch.

PROJECT:
- Project title: ${projectTitle}
- Plot size: ${plot.width}' x ${plot.depth}'
- Facing: ${facing.toUpperCase()} facing
- Floor: ${floor}
- Type: ${bhk} Indian residential house
- User requirement: ${args.prompt}

MANDATORY LAYOUT FOR 41' x 51' NORTH-FACING 3BHK:
- Top-left: MASTER BEDROOM, label exactly: MASTER BEDROOM 13'0" x 14'0"
- Below master: ATTACHED TOILET, label exactly: ATTACHED TOILET 8'0" x 5'0"
- Middle-left: BEDROOM 2, label exactly: BEDROOM 2 13'0" x 11'0"
- Bottom-left: BEDROOM 3, label exactly: BEDROOM 3 13'0" x 11'0"
- Top-center: DINING AREA, label exactly: DINING AREA 13'0" x 14'6"
- Top-right: UTILITY / WASH, label exactly: UTILITY / WASH 11'0" x 4'6"
- Right/top: KITCHEN, label exactly: KITCHEN 11'0" x 9'6"
- Right-center: COMMON TOILET, label exactly: COMMON TOILET 7'6" x 5'0"
- Center: LOBBY / PASSAGE, label exactly: LOBBY / PASSAGE 5'6" WIDE
- Center small room: PUJA, label exactly: PUJA 4'0" x 4'0"
- Center-lower: LIVING ROOM, label exactly: LIVING ROOM 13'0" x 15'0"
- Front/lower-center: DRAWING ROOM, label exactly: DRAWING ROOM 13'0" x 11'0"
- Front/lower-right: PARKING / PORCH, label exactly: PARKING / PORCH 12'0" x 17'6"
- Right-center near toilet: STAIRCASE with UP arrow.
- Bottom/front: FRONT GATE 12'0" WIDE.

MANDATORY VISUAL ELEMENTS:
- Show overall dimension 41' across the top with arrow dimension line.
- Show overall dimension 51' on the right side with vertical arrow dimension line.
- Show North arrow at top-right with label N.
- Show bottom title exactly: GROUND FLOOR PLAN (41' X 51')
- Show bottom-left info box exactly:
  PLOT SIZE: 41' X 51'
  3BHK HOUSE PLAN
  BUILT-UP AREA: ~1760 SQ.FT
- Show one car in parking/porch.
- Show furniture: beds, wardrobes, sofa set, dining table, kitchen counter, sink, stove, washing machine, toilet fixtures, puja icon, stair treads.
- Show door swings and tags: D1, D2, MD.
- Show window/vent tags: W1, W2, W3, V.
- Keep labels clean, centered, readable, and not overlapping.

VASTU / INDIAN PLANNING RULES:
- Puja near North-East / center-north zone where possible.
- Kitchen on South-East / East-side service zone where possible.
- Master bedroom on South-West / left private zone.
- Toilets grouped around service/wet zones.
- Staircase in side/service zone.
- Parking near front road.
- Public to private zoning: drawing/living/dining first, bedrooms private, service zones grouped.

STRICT NEGATIVE RULES:
- Do not create exterior elevation.
- Do not create 3D perspective.
- Do not create interior render.
- Do not create a UI screenshot.
- Do not create a rough black-white schematic.
- Do not hallucinate wrong plot size like 40' or 80'.
- Do not corrupt text or dimensions.
- Do not omit room dimensions.
- Do not make random room names.
- Do not generate working drawing sheets.
- Do not generate structural/column/beam/electrical/plumbing sheets in this request.

FINAL OUTPUT:
A single high-quality professional furnished 2D ground floor plan image, visually close to the reference plan style, with correct 41' x 51' dimensions, clean labels, clean furniture, clear north arrow, and front gate.
`.trim();
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

  // Professional floor-plan ko top par rakho, old bad professional floor-plan same project ke liye remove karo.
  const cleaned = existing.filter((item: any) => {
    const sameProject = safe(item?.projectId) === safe(asset?.projectId);
    const isOldProfessional =
      safe(item?.source) === "openai_professional_floor_plan_v1" ||
      safe(item?.assetType) === "professional_floor_plan" ||
      String(item?.file || "").includes("openai-professional-floor-plan");

    return !(sameProject && isOldProfessional);
  });

  const merged = [asset, ...cleaned].slice(0, 1400);
  await fs.writeFile(ASSETS_FILE, JSON.stringify(merged, null, 2), "utf8");
}

function mimeFromPath(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

async function getStyleReferenceBuffer() {
  const refPath = safe(process.env.BUILDSETU_FLOOR_PLAN_STYLE_REF);

  if (!refPath) return null;

  const abs = path.isAbsolute(refPath)
    ? refPath
    : path.join(process.cwd(), refPath.replace(/^\/+/, ""));

  try {
    const buffer = await fs.readFile(abs);
    return {
      buffer,
      filename: path.basename(abs) || "floor-plan-style-reference.png",
      mime: mimeFromPath(abs),
      abs,
    };
  } catch {
    return null;
  }
}

async function openAIImageGeneration(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing in environment");

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = process.env.OPENAI_IMAGE_SIZE || "1024x1536";
  const quality = process.env.OPENAI_IMAGE_QUALITY || "high";

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      n: 1,
    }),
  });

  const json: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI image generation failed: ${response.status}`);
  }

  const b64 = json?.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");

  const url = json?.data?.[0]?.url;
  if (url) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI response did not contain image data");
}

async function openAIImageReferenceEdit(prompt: string, reference: { buffer: Buffer; filename: string; mime: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing in environment");

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = process.env.OPENAI_IMAGE_SIZE || "1024x1536";
  const quality = process.env.OPENAI_IMAGE_QUALITY || "high";

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("quality", quality);
  form.append("image[]", new Blob([new Uint8Array(reference.buffer)], { type: reference.mime }), reference.filename);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const json: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.error?.message || `OpenAI image reference edit failed: ${response.status}`);
  }

  const b64 = json?.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, "base64");

  const url = json?.data?.[0]?.url;
  if (url) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI response did not contain image data");
}

async function fetchOpenAIImage(prompt: string) {
  const reference = await getStyleReferenceBuffer();

  if (reference) {
    try {
      const buffer = await openAIImageReferenceEdit(prompt, reference);
      return {
        buffer,
        mode: "openai_images_api_reference_edit",
        referencePath: reference.abs,
      };
    } catch (error) {
      // Fallback to text-only image generation if reference edit fails.
      const buffer = await openAIImageGeneration(prompt);
      return {
        buffer,
        mode: "openai_images_api_generation_fallback",
        referencePath: reference.abs,
        referenceError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const buffer = await openAIImageGeneration(prompt);
  return {
    buffer,
    mode: "openai_images_api_generation",
    referencePath: "",
  };
}

export async function generateProfessionalOpenAIFloorPlan(args: ProfessionalFloorPlanArgs) {
  const projectId = safe(args.projectId);
  if (!projectId) throw new Error("projectId is required");

  const projectTitle = safe(args.projectTitle, "41 x 51 ft North Facing House");
  const promptAgent = createFloorPlanImagePrompt({
    projectId,
    projectTitle,
    userPrompt: args.prompt,
  });
  const prompt = promptAgent.imagePrompt;

  const result = await fetchOpenAIImage(prompt);

  const cleanProjectId = slugify(projectId);
  const now = Date.now();
  const fileRel = `generated/ai-images/${cleanProjectId}/${now}-openai-professional-floor-plan.png`;
  const fileAbs = path.join(DATA_DIR, fileRel.replace(/^generated\//, ""));

  await fs.mkdir(path.dirname(fileAbs), { recursive: true });
  await fs.writeFile(fileAbs, result.buffer);

  const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(fileRel)}`;

  const asset = {
    id: `${now}-openai-professional-floor-plan`,
    type: "image",
    projectId,
    projectTitle,
    toolSlug: "floor-plan-ai",
    toolName: "Floor Plan AI",
    renderType: "openai_professional_floor_plan",
    assetType: "professional_floor_plan",
    imageMode: "professional_floor_plan",
    title: "Professional Floor Plan",
    viewLabel: "Professional Floor Plan",
    imageUrl,
    publicUrl: `/${fileRel}`,
    file: fileRel,
    source: "openai_professional_floor_plan_v1",
    generationMode: result.mode,
    styleReferencePath: result.referencePath,
    referenceError: result.referenceError || "",
    prompt,
    promptAgent,
    createdAt: new Date().toISOString(),
  };

  await appendProjectAsset(asset);

  return {
    ok: true,
    source: "openai_professional_floor_plan_v1",
    title: "Professional Floor Plan",
    projectId,
    projectTitle,
    imageUrl,
    publicUrl: asset.publicUrl,
    asset,
  };
}
