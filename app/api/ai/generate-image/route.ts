import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { addBuildSetuUsageEvent } from "@/lib/agent-usage/usage-cost-store";
import { checkBuildSetuUsageLimit } from "@/lib/agent-usage/usage-limit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// BUILDSETU_OPENAI_IMAGE_ONLY_V1
// This route generates images only through OpenAI GPT Image API.
// No local SVG/mock fallback is allowed here.

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractPrompt(body: any) {
  const direct =
    body?.imagePrompt ||
    body?.prompt ||
    body?.finalPrompt ||
    body?.text ||
    body?.message ||
    body?.input;

  if (direct) return cleanText(direct);

  if (Array.isArray(body?.prompts) && body.prompts[0]) {
    const first = body.prompts[0];
    return cleanText(first?.prompt || first?.imagePrompt || first?.text || first);
  }

  if (Array.isArray(body?.items) && body.items[0]) {
    const first = body.items[0];
    return cleanText(first?.prompt || first?.imagePrompt || first?.text || first);
  }

  if (Array.isArray(body?.images) && body.images[0]) {
    const first = body.images[0];
    return cleanText(first?.prompt || first?.imagePrompt || first?.text || first);
  }

  return "";
}

function sanitizeProjectId(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const decoded = decodeURIComponent(raw);
    const fromParam = decoded.match(/[?&]projectId=([a-zA-Z0-9_-]{10,})/);
    if (fromParam?.[1]) return fromParam[1];

    const any = decoded.match(/([a-zA-Z0-9_-]{10,})/);
    if (any?.[1]) return any[1];
  } catch {}

  const fallback = raw.match(/([a-zA-Z0-9_-]{10,})/);
  return fallback?.[1] || raw;
}

function safeFilePart(value: unknown) {
  return String(value || "image")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

async function saveBase64Image(args: {
  b64: string;
  projectId: string;
  toolSlug: string;
}) {
  const projectId = safeFilePart(args.projectId || "project");
  const toolSlug = safeFilePart(args.toolSlug || "tool");
  const dir = path.join(process.cwd(), "data", "generated", "ai-images", projectId);

  await mkdir(dir, { recursive: true });

  const fileName = `${Date.now()}-${toolSlug}-openai.png`;
  const abs = path.join(dir, fileName);

  await writeFile(abs, Buffer.from(args.b64, "base64"));

  const relative = `generated/ai-images/${projectId}/${fileName}`;
  const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(relative)}`;

  return {
    abs,
    relative,
    imageUrl,
  };
}


// BUILDSETU_OPENAI_ASSET_REGISTER_V1
const PROJECT_ASSETS_FILE = path.join(process.cwd(), "data", "generated", "project-assets.json");
const PROJECT_MEMORY_FILE = path.join(process.cwd(), "data", "generated", "project-memory-events.json");

async function readJsonArray(filePath: string) {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray(filePath: string, items: any[]) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf-8");
}

function assetTypeForTool(toolSlug: string) {
  const slug = cleanText(toolSlug).toLowerCase();

  if (slug.includes("floor-plan") || slug.includes("sketch-to-plan")) return "floor_plan_2d";
  if (slug.includes("exterior") || slug.includes("elevation") || slug.includes("site-photo")) return "exterior_elevation";
  if (slug.includes("interior")) return "interior_render";
  if (slug.includes("mood")) return "mood_board";
  if (slug.includes("ceiling")) return "false_ceiling";
  if (slug.includes("material")) return "material_palette";

  return "generated_image";
}

async function registerOpenAiGeneratedAsset(args: {
  projectId: string;
  toolSlug: string;
  toolName: string;
  imageUrl: string;
  file: string;
  prompt: string;
  model: string;
  size: string;
  quality: string;
}) {
  const now = new Date().toISOString();
  const assetType = assetTypeForTool(args.toolSlug);
  const id = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const asset = {
    id,
    projectId: args.projectId,
    title:
      assetType === "floor_plan_2d"
        ? "OpenAI Floor Plan"
        : `OpenAI ${args.toolName || args.toolSlug || "Generated Image"}`,
    label:
      assetType === "floor_plan_2d"
        ? "Floor Plan AI"
        : args.toolName || args.toolSlug || "Generated Image",
    assetType,
    type: assetType,
    category: assetType,
    toolSlug: args.toolSlug,
    toolName: args.toolName,
    imageUrl: args.imageUrl,
    publicUrl: args.imageUrl,
    url: args.imageUrl,
    src: args.imageUrl,
    file: args.file,
    provider: "openai",
    source: "openai_image_api",
    generationMode: "openai_chatgpt_image_api",
    model: args.model,
    size: args.size,
    quality: args.quality,
    prompt: args.prompt,
    status: "generated",
    stageId: assetType === "floor_plan_2d" ? "floor_plan" : args.toolSlug,
    stageStatus: "draft_ready",
    sourceOfTruthCandidate: assetType === "floor_plan_2d",
    locked: false,
    createdAt: now,
    updatedAt: now,
  };

  const assets = await readJsonArray(PROJECT_ASSETS_FILE);
  assets.unshift(asset);
  await writeJsonArray(PROJECT_ASSETS_FILE, assets);

  const memory = await readJsonArray(PROJECT_MEMORY_FILE);
  memory.unshift({
    id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: args.projectId,
    type: "generated_asset",
    eventType: "generated_asset",
    toolSlug: args.toolSlug,
    toolName: args.toolName,
    title: asset.title,
    summary:
      assetType === "floor_plan_2d"
        ? "OpenAI GPT Image API se floor plan generate hua. Ye floor plan lock/source-of-truth candidate hai."
        : "OpenAI GPT Image API se image output generate hua.",
    imageUrl: args.imageUrl,
    publicUrl: args.imageUrl,
    assetId: id,
    assetType,
    provider: "openai",
    source: "openai_image_api",
    createdAt: now,
  });
  await writeJsonArray(PROJECT_MEMORY_FILE, memory);

  return asset;
}



async function enforceBuildSetuHeavyRouteAuthGate(req: NextRequest, args: {
  projectId?: string;
  userId?: string;
  kind: "image" | "vision" | "file_search";
  estimatedInr?: number;
}) {
  // BUILDSETU_HEAVY_ROUTE_AUTH_USAGE_GATE_V1
  const authRes = await fetch(new URL("/api/auth/me", req.url), {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
    cache: "no-store",
  }).catch(() => null);

  const authData = authRes ? await authRes.json().catch(() => null) : null;

  if (!authData?.authenticated) {
    return NextResponse.json(
      {
        ok: false,
        code: "CREDIT_CHECK_FAILED",
        error: "Please login to use this tool.",
        buyCreditsUrl: "/credits",
      },
      { status: 401 }
    );
  }

  const user = authData?.user || {};
  const planTier = String(user.planId || user.planName || user.plan || user.tier || "free");
  const userId = String(user.id || user.email || args.userId || "authenticated");
  const kind = args.kind;

  const limitBody: any = {
    projectId: args.projectId || "global",
    userId,
    planTier,
    kind,
    estimatedInr: Number(args.estimatedInr || 0),
  };

  if (kind === "image") limitBody.imageGenerations = 1;
  if (kind === "vision") limitBody.visionScans = 1;
  if (kind === "file_search") limitBody.fileSearches = 1;

  const limitRes = await fetch(new URL("/api/agent-usage/check-limit", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify(limitBody),
  }).catch(() => null);

  const limitData = limitRes ? await limitRes.json().catch(() => null) : null;

  if (!limitRes || !limitRes.ok || limitData?.allowed === false || limitData?.ok === false) {
    return NextResponse.json(
      {
        ok: false,
        code: limitData?.code || "USAGE_LIMIT_EXCEEDED",
        error: limitData?.message || "Usage limit exceeded for your plan.",
        usage: limitData || null,
        buyCreditsUrl: "/credits",
      },
      { status: limitRes?.status || 402 }
    );
  }

  return null;
}


export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          provider: "openai",
          code: "OPENAI_API_KEY_MISSING",
          error: "OPENAI_API_KEY missing on server.",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const prompt = extractPrompt(body);
    const projectId = sanitizeProjectId(
      body?.projectId ||
      body?.selectedProjectId ||
      body?.contextSummary?.projectId ||
      ""
    );
    const userId = cleanText(body?.userId || body?.user?.id || body?.session?.userId || "anonymous") || "anonymous";
    const planTier = cleanText(body?.planTier || body?.tier || body?.package || "free") || "free";
    const toolSlug = cleanText(body?.toolSlug || body?.slug || body?.tool || "buildsetu-image");

    const buildSetuGenerateImageHeavyGate = await enforceBuildSetuHeavyRouteAuthGate(req, {
      projectId: projectId || "global",
      userId,
      kind: "image",
      estimatedInr: 5,
    });
    if (buildSetuGenerateImageHeavyGate) return buildSetuGenerateImageHeavyGate;

    if (!prompt) {
      return NextResponse.json(
        {
          ok: false,
          provider: "openai",
          code: "IMAGE_PROMPT_MISSING",
          error: "Image prompt missing.",
        },
        { status: 400 }
      );
    }

    const imageUsageLimit = checkBuildSetuUsageLimit({
      // BUILDSETU_HEAVY_ROUTE_EXISTING_LIMIT_DELEGATED_V1
      planTier: "unlimited",
      projectId: projectId || "global",
      userId,
      next: {
        kind: "image",
        imageGenerations: 1,
      },
    });

    if (!imageUsageLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          provider: "openai",
          code: imageUsageLimit.code,
          error: imageUsageLimit.message,
          planTier: imageUsageLimit.planTier,
          limit: imageUsageLimit.limit,
          current: imageUsageLimit.current,
          after: imageUsageLimit.after,
          exceeded: imageUsageLimit.exceeded,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const size = process.env.OPENAI_IMAGE_SIZE || "1536x1024";
    const quality = process.env.OPENAI_IMAGE_QUALITY || "medium";
    const startedAt = Date.now();

    const openaiPayload: Record<string, any> = {
      model,
      prompt,
      n: 1,
      size,
      quality,
    };

    // GPT image models return b64_json by default.
    // Keep this route OpenAI-only: no mock/local SVG fallback.
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });

    const openaiJson: any = await openaiRes.json().catch(() => ({}));

    if (!openaiRes.ok) {
      addBuildSetuUsageEvent({
        projectId: projectId || "global",
        userId,
        route: "/api/ai/generate-image",
        source: "openai-image-generation",
        kind: "image",
        provider: "openai",
        model,
        status: "failed",
        imageCount: 0,
        latencyMs: Date.now() - startedAt,
        metadata: {
          httpStatus: openaiRes.status,
          code: openaiJson?.error?.code || "OPENAI_IMAGE_API_FAILED",
          type: openaiJson?.error?.type || "",
          error:
            openaiJson?.error?.message ||
            openaiJson?.message ||
            "OpenAI image generation failed.",
          size,
          quality,
          toolSlug,
          promptLength: prompt.length,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          provider: "openai",
          code: "OPENAI_IMAGE_API_FAILED",
          status: openaiRes.status,
          error:
            openaiJson?.error?.message ||
            openaiJson?.message ||
            "OpenAI image generation failed.",
          details: openaiJson?.error || openaiJson,
        },
        { status: 500 }
      );
    }

    const first = openaiJson?.data?.[0] || {};
    const b64 = first?.b64_json;

    if (!b64) {
      addBuildSetuUsageEvent({
        projectId: projectId || "global",
        userId,
        route: "/api/ai/generate-image",
        source: "openai-image-generation",
        kind: "image",
        provider: "openai",
        model,
        status: "failed",
        imageCount: 0,
        latencyMs: Date.now() - startedAt,
        metadata: {
          code: "OPENAI_IMAGE_B64_MISSING",
          error: "OpenAI response did not include b64_json.",
          size,
          quality,
          toolSlug,
          promptLength: prompt.length,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          provider: "openai",
          code: "OPENAI_IMAGE_B64_MISSING",
          error: "OpenAI response did not include b64_json.",
          details: openaiJson,
        },
        { status: 500 }
      );
    }

    const saved = await saveBase64Image({
      b64,
      projectId,
      toolSlug,
    });

    const imageItem = {
      url: saved.imageUrl,
      imageUrl: saved.imageUrl,
      publicUrl: saved.imageUrl,
      src: saved.imageUrl,
      file: saved.relative,
      provider: "openai",
      model,
      size,
      quality,
      revisedPrompt: first?.revised_prompt || "",
      prompt,
      projectId,
      toolSlug,
    };

    const registeredAsset = await registerOpenAiGeneratedAsset({
      projectId,
      toolSlug,
      toolName: cleanText(body?.toolName || body?.name || toolSlug),
      imageUrl: saved.imageUrl,
      file: saved.relative,
      prompt,
      model,
      size,
      quality,
    });

    addBuildSetuUsageEvent({
      projectId: projectId || "global",
      userId,
      route: "/api/ai/generate-image",
      source: "openai-image-generation",
      kind: "image",
      provider: "openai",
      model,
      status: "success",
      imageCount: 1,
      latencyMs: Date.now() - startedAt,
      metadata: {
        size,
        quality,
        toolSlug,
        promptLength: prompt.length,
        imageUrl: saved.imageUrl,
        file: saved.relative,
        assetId: registeredAsset.id,
        revisedPrompt: first?.revised_prompt || "",
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      provider: "openai",
      source: "openai_image_api",
      model,
      size,
      quality,
      projectId,
      toolSlug,
      prompt,
      imageUrl: saved.imageUrl,
      url: saved.imageUrl,
      publicUrl: saved.imageUrl,
      file: saved.relative,
      asset: registeredAsset,
      assetId: registeredAsset.id,
      assetType: registeredAsset.assetType,
      images: [imageItem],
      outputs: [imageItem],
      generated: 1,
      total: 1,
      failed: [],
      generationMode: "openai_chatgpt_image_api",
      message: "Image generated with OpenAI GPT Image API.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        provider: "openai",
        code: "OPENAI_IMAGE_ROUTE_ERROR",
        error: error?.message || "OpenAI image route failed.",
      },
      { status: 500 }
    );
  }
}
