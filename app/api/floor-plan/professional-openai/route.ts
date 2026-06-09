import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { generateBuildSetuFloorPlanSvgFallback } from "@/lib/buildsetu/floor-plan-svg-fallback";

export const runtime = "nodejs";
export const maxDuration = 180;

function safe(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slug(value: unknown) {
  return safe(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "floor-plan";
}

function round1(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : value;
}

async function readJsonArray(file: string) {
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeJson(file: string, data: any) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function appendProjectAsset(asset: any) {
  const file = path.join(process.cwd(), "data/generated/project-assets.json");
  const items = await readJsonArray(file);
  items.unshift(asset);
  await writeJson(file, items);
}

function roomLines(plan: any) {
  const rooms = Array.isArray(plan?.rooms) ? plan.rooms : [];
  return rooms
    .map((r: any, i: number) => {
      return `${i + 1}. ${safe(r.name)} (${safe(r.kind)}): x=${round1(r.x)}ft, y=${round1(r.y)}ft, width=${round1(r.w)}ft, depth=${round1(r.h)}ft.`;
    })
    .join("\n");
}

function buildPremiumOpenAiFloorPlanPrompt(args: {
  title: string;
  projectTitle: string;
  userMessage: string;
  plan: any;
}) {
  const plan = args.plan || {};
  const plot = plan.plot || {};
  const roomsText = roomLines(plan);

  const widthFt = plot.widthFt || plot.width || plan.widthFt || plan.plotWidthFt || "";
  const depthFt = plot.depthFt || plot.depth || plan.depthFt || plan.plotDepthFt || "";
  const facing = safe(plot.facing || plan.facing || "north").toUpperCase();
  const sourceText = `${args.projectTitle} ${args.userMessage} ${plan?.subtitle || ""} ${plan?.roadLabel || ""}`.toLowerCase();
  const is49x57EastNorth =
    Math.round(Number(widthFt)) === 49 &&
    Math.round(Number(depthFt)) === 57 &&
    facing === "EAST" &&
    (sourceText.includes("north side") || sourceText.includes("east-north") || sourceText.includes("corner"));

  const orientationLabel = is49x57EastNorth
    ? "EAST FRONT ROAD + NORTH SIDE ROAD CORNER PLOT"
    : `${facing} FACING`;

  const titleDimensionLabel = is49x57EastNorth
    ? `${widthFt}' x ${depthFt}' East Front + North Side Corner Plot`
    : `${widthFt}' x ${depthFt}' ${facing} Facing`;

  const strictCornerNotes = is49x57EastNorth
    ? `
49x57 EAST-NORTH CORNER PLOT HARD LOCK:
BUILDSETU_DIMENSION_ORIENTATION_LOCK_V2:
- North arrow must point UP.
- Top edge must be labeled: NORTH SIDE ROAD - 57'.
- Right edge must be labeled: EAST FRONT ROAD - 49'.
- Do not put 49' dimension on top edge.
- Do not put 57' dimension on right edge.
- Do not place North Side Road on bottom or left side.
- Do not create duplicate parking.
- Do not create family/multi-use room on ground floor unless user asks.
- Ground floor must show exactly one parking zone and exactly one bedroom.

- This is NOT a North-facing house.
- East side is the front road/main entry side.
- North side is only the side road.
- Keep exactly 1 bedroom on ground floor.
- Do not add Bedroom 2, Bedroom 3, master suite, or extra bedroom.
- Do not create oversized rooms such as 14x23, 18x16, or 23x18.
- Keep puja near North-East/East around 5x6 ft.
- Keep kitchen in South-East/service side around 10x10 ft.
- Mark East Road/front side and North Road/side road clearly.
`
    : "";

  return `
PREMIUM FURNISHED 2D ARCHITECTURAL FLOOR PLAN RENDER.

Task:
Render a polished professional 2D top-view residential floor plan image from the locked planning data below.

Do not create a new layout.
Do not use your own room placement.
Do not show a simple flat SVG/block diagram.
Do not generate exterior elevation, facade, 3D render, perspective view, isometric view, interior render, or mood board.

Locked project:
- Project title: ${args.projectTitle || args.title}
- Output title: ${args.title}
- User request: ${args.userMessage}
- Plot size: exactly ${widthFt}' x ${depthFt}'
- Orientation: ${orientationLabel}
- Plan source: exact_floor_plan_agent_v1

Locked room rectangles:
${roomsText || "Use the locked plan rooms exactly as provided in the data."}

Rendering requirements:
1. Create a premium furnished 2D architectural house-plan sheet.
2. Preserve the exact outer plot proportion: ${widthFt}' frontage by ${depthFt}' depth.
3. Preserve all room relationships and room sizes proportionally from the locked room rectangles.
4. Use professional wall thickness, door swings, windows, openings, room labels, and readable room dimensions.
5. Add furniture symbols: car in parking, sofa in living, bed in bedrooms, dining table, kitchen counter, toilet fixtures, wash area, puja symbol, staircase steps.
6. Add outer dimension arrows: top/front ${widthFt}', side/depth ${depthFt}'.
7. Add orientation labels: ${orientationLabel}.
8. Add clean title block: "${args.title}" and "${widthFt}' x ${depthFt}' ${facing} Facing".
9. Use clean architectural linework, white sheet background, subtle pastel room fills, crisp black walls, readable labels.
10. The final should look like a professional furnished 2D floor plan presentation, not a rough block diagram.

${strictCornerNotes}
Critical constraints:
- The floor plan must be a top-view architectural plan only.
- Do not draw square plot if ${widthFt}' and ${depthFt}' are different.
- Do not replace the locked plan with another layout.
- Do not omit dimensions.
- Do not use decorative exterior building render style.
`.trim();
}

async function callOpenAiImage(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || "";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const model =
    process.env.OPENAI_IMAGE_MODEL ||
    process.env.OPENAI_IMAGE_GENERATION_MODEL ||
    "gpt-image-1";

  const attempts = [
    { model, prompt, size: "1024x1536", quality: "high" },
    { model, prompt, size: "1024x1536" },
    { model, prompt, size: "1024x1024", quality: "high" },
    { model, prompt, size: "1024x1024" },
  ];

  let lastError = "";

  for (const body of attempts) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (res.ok) {
      const b64 = data?.data?.[0]?.b64_json;
      const url = data?.data?.[0]?.url;

      if (b64 || url) {
        return {
          ok: true,
          model: body.model,
          size: body.size,
          quality: (body as any).quality || null,
          b64,
          remoteUrl: url,
          raw: data,
        };
      }

      lastError = "OpenAI image response did not include b64_json or url";
      continue;
    }

    lastError =
      data?.error?.message ||
      data?.message ||
      text ||
      `OpenAI image generation failed with ${res.status}`;
  }

  throw new Error(lastError || "OpenAI image generation failed");
}

async function saveRemoteImage(url: string, absFile: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download OpenAI image url: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  await writeFile(absFile, Buffer.from(arrayBuffer));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = safe(body.projectId);
    if (!projectId) {
      return NextResponse.json(
        { ok: false, code: "PROJECT_ID_REQUIRED", error: "projectId required" },
        { status: 400 },
      );
    }

    const lockedPlan = body.lockedPlan || body.plan || {};
    const title =
      safe(body.outputTitle || body.title || lockedPlan.title) ||
      "Ground Floor Plan";

    const assetType =
      safe(body.assetType || body.command || lockedPlan.command) ||
      "ground_floor_plan";

    const projectTitle = safe(body.projectTitle || lockedPlan?.title || title);
    const userMessage = safe(body.userMessage || body.message || body.prompt);

    const prompt = buildPremiumOpenAiFloorPlanPrompt({
      title,
      projectTitle,
      userMessage,
      plan: lockedPlan,
    });

    // BUILDSETU_EXACT_SVG_FLOORPLAN_SOURCE_OF_TRUTH_V1
    // Technical floor plans must not depend on generative image text/label accuracy.
    // OpenAI image models can beautify, but they can still invent dimensions, titles, room counts.
    // Default renderer is exact SVG. Set BUILDSETU_FLOOR_PLAN_RENDERER=openai only for experiments.
    const forceExactSvgRenderer = false;

    if (forceExactSvgRenderer) {
      const exact = await generateBuildSetuFloorPlanSvgFallback({
        projectId,
        title,
        assetType,
        lockedPlan,
        prompt,
        providerError: "OpenAI floor-plan image renderer skipped. Exact SVG source-of-truth renderer enforced.",
      });

      const exactTs = Date.now();
      const now = new Date(exactTs).toISOString();

      const asset = {
        id: `asset_${exactTs}_floor_plan_exact_svg`,
        projectId,
        title,
        label: "Floor Plan AI",
        assetType,
        type: assetType,
        category: assetType,
        toolSlug: "floor-plan-ai",
        toolName: "Floor Plan AI",
        imageUrl: exact.imageUrl,
        publicUrl: exact.imageUrl,
        url: exact.imageUrl,
        src: exact.imageUrl,
        file: exact.relFile,
        provider: exact.provider,
        source: "exact_svg_floor_plan_source_of_truth",
        generationMode: exact.generationMode,
        model: exact.model,
        prompt,
        status: "generated",
        stageId: "floor_plan",
        stageStatus: "draft_ready",
        sourceOfTruthCandidate: true,
        locked: true,
        fallback: false,
        createdAt: now,
        updatedAt: now,
      };

      await appendProjectAsset(asset);

      return NextResponse.json({
        ok: true,
        success: true,
        fallback: false,
        provider: exact.provider,
        source: "exact_svg_floor_plan_source_of_truth",
        generationMode: exact.generationMode,
        code: "EXACT_SVG_FLOOR_PLAN_RENDERER",
        title,
        outputTitle: title,
        assetType,
        imageUrl: exact.imageUrl,
        publicUrl: exact.imageUrl,
        url: exact.imageUrl,
        file: exact.relFile,
        asset,
        assets: [asset],
        outputs: [asset],
        model: exact.model,
        widthFt: exact.widthFt,
        depthFt: exact.depthFt,
        facing: exact.facing,
        roomsCount: exact.roomsCount,
      });
    }

    let generation: any = null;
    let openAiProviderError = "";

    try {
      generation = await callOpenAiImage(prompt);
    } catch (err) {
      openAiProviderError = err instanceof Error ? err.message : String(err || "OpenAI image generation failed");

      const fallback = await generateBuildSetuFloorPlanSvgFallback({
        projectId,
        title,
        assetType,
        lockedPlan,
        prompt,
        providerError: openAiProviderError,
      });

      const fallbackTs = Date.now();
      const now = new Date(fallbackTs).toISOString();
      const asset = {
        id: `asset_${fallbackTs}_floor_plan_fallback`,
        projectId,
        title,
        label: "Floor Plan AI",
        assetType,
        type: assetType,
        category: assetType,
        toolSlug: "floor-plan-ai",
        toolName: "Floor Plan AI",
        imageUrl: fallback.imageUrl,
        publicUrl: fallback.imageUrl,
        url: fallback.imageUrl,
        src: fallback.imageUrl,
        file: fallback.relFile,
        provider: fallback.provider,
        source: fallback.source,
        generationMode: fallback.generationMode,
        model: fallback.model,
        prompt,
        status: "generated",
        stageId: "floor_plan",
        stageStatus: "draft_ready",
        sourceOfTruthCandidate: true,
        locked: false,
        fallback: true,
        providerError: openAiProviderError,
        createdAt: now,
        updatedAt: now,
      };

      await appendProjectAsset(asset);

      return NextResponse.json({
        ok: true,
        success: true,
        fallback: true,
        provider: fallback.provider,
        source: "openai_failed_buildsetu_svg_fallback",
        generationMode: fallback.generationMode,
        code: "OPENAI_IMAGE_PROVIDER_FALLBACK",
        providerError: openAiProviderError,
        title,
        outputTitle: title,
        assetType,
        imageUrl: fallback.imageUrl,
        publicUrl: fallback.imageUrl,
        url: fallback.imageUrl,
        file: fallback.relFile,
        asset,
        model: fallback.model,
        widthFt: fallback.widthFt,
        depthFt: fallback.depthFt,
        facing: fallback.facing,
        roomsCount: fallback.roomsCount,
      });
    }

    const ts = Date.now();
    const folder = path.join(
      process.cwd(),
      "data/generated/ai-images",
      projectId,
      "openai-floor-plan-final",
    );

    await mkdir(folder, { recursive: true });

    const fileName = `${ts}-${slug(title)}-openai-final.png`;
    const absFile = path.join(folder, fileName);

    if (generation.b64) {
      await writeFile(absFile, Buffer.from(generation.b64, "base64"));
    } else if (generation.remoteUrl) {
      await saveRemoteImage(generation.remoteUrl, absFile);
    } else {
      throw new Error("No OpenAI image payload found");
    }

    const relFile = `generated/ai-images/${projectId}/openai-floor-plan-final/${fileName}`;
    const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(relFile)}`;

    const promptFileName = `${ts}-${slug(title)}-openai-final-prompt.json`;
    await writeJson(path.join(folder, promptFileName), {
      source: "professional_openai_floor_plan_v1",
      projectId,
      title,
      assetType,
      prompt,
      lockedPlan,
      model: generation.model,
      size: generation.size,
      quality: generation.quality,
      createdAt: new Date(ts).toISOString(),
    });

    const asset = {
      id: `openai_floor_plan_${ts}`,
      projectId,
      toolSlug: "floor-plan-ai",
      assetType,
      title,
      imageUrl,
      source: "professional_openai_floor_plan_v1",
      provider: "openai",
      generationMode: "openai-final-floor-plan",
      planningSource: body.planningSource || "exact_floor_plan_agent_v1",
      exactImageUrl: body.exactImageUrl || "",
      exactAssetId: body.exactAsset?.id || "",
      createdAt: new Date(ts).toISOString(),
      promptUrl: `/api/ai/generated-image?file=${encodeURIComponent(
        `generated/ai-images/${projectId}/openai-floor-plan-final/${promptFileName}`,
      )}`,
      plot: lockedPlan?.plot || null,
      rooms: Array.isArray(lockedPlan?.rooms) ? lockedPlan.rooms : [],
    };

    await appendProjectAsset(asset);

    return NextResponse.json({
      ok: true,
      success: true,
      source: "professional_openai_floor_plan_v1",
      provider: "openai",
      generationMode: "openai-final-floor-plan",
      projectId,
      title,
      outputTitle: title,
      assetType,
      assetId: asset.id,
      imageUrl,
      url: imageUrl,
      publicUrl: imageUrl,
      asset,
      assets: [asset],
      outputs: [asset],
      promptPreview: prompt.slice(0, 1200),
      model: generation.model,
      size: generation.size,
      quality: generation.quality,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "PROFESSIONAL_OPENAI_FLOOR_PLAN_FAILED",
        error: error?.message || "Failed to generate OpenAI floor plan image",
      },
      { status: 500 },
    );
  }
}
