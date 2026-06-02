import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function normalizeBuildSetuImageModelForApi(value: unknown): string {
  const text = String(value || "").trim();
  const allowed = new Set(["flux_1_dev", "nano_banana_2", "gpt_image_2", "seedream_4_0"]);
  return allowed.has(text) ? text : "flux_1_dev";
}

function readBuildSetuImageModelFromBody(body: any, req?: Request): string {
  return normalizeBuildSetuImageModelForApi(
    body?.imageModel ||
      body?.buildsetuImageModel ||
      body?.selectedImageModel ||
      req?.headers?.get?.("x-buildsetu-image-model")
  );
}

import {
  callRunpodServerlessImage,
  isRunpodServerlessConfigured,
} from "@/lib/buildsetu/runpod-serverless-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ImageModelId =
  | "auto"
  | "flux_1_dev"
  | "nano_banana_2"
  | "gpt_image_2"
  | "seedream_4_0";

type ImageProvider = "runpod_serverless" | "openai" | "external_api";

const IMAGE_MODEL_META: Record<
  ImageModelId,
  {
    label: string;
    provider: ImageProvider | "auto";
    envPrefix?: string;
    defaultModel?: string;
    tier: string;
  }
> = {
  auto: {
    label: "Auto",
    provider: "auto",
    tier: "Smart",
  },
  flux_1_dev: {
    label: "FLUX.1-dev",
    provider: "runpod_serverless",
    defaultModel: "flux_1_dev",
    tier: "Standard",
  },
  nano_banana_2: {
    label: "Nano Banana 2",
    provider: "external_api",
    envPrefix: "NANO_BANANA_2",
    defaultModel: "nano_banana_2",
    tier: "Premium",
  },
  gpt_image_2: {
    label: "GPT Image 2",
    provider: "openai",
    defaultModel: "gpt_image_2",
    tier: "Ultra",
  },
  seedream_4_0: {
    label: "Seedream 4.0",
    provider: "external_api",
    envPrefix: "SEEDREAM_4_0",
    defaultModel: "seedream_4_0",
    tier: "Budget",
  },
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function slug(value: unknown) {
  return safe(value, "image")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "image";
}

function normalizeImageModel(value: unknown): ImageModelId {
  const text = safe(value).toLowerCase();
  const aliases: Record<string, ImageModelId> = {
    seedream_4: "seedream_4_0",
    seedream4: "seedream_4_0",
    "seedream-4": "seedream_4_0",
    "seedream-4-0": "seedream_4_0",
    "seedream 4": "seedream_4_0",
    "seedream 4.0": "seedream_4_0",
  };
  const modelId = aliases[text] || text;

  return Object.prototype.hasOwnProperty.call(IMAGE_MODEL_META, modelId)
    ? (modelId as ImageModelId)
    : "auto";
}

function resolveAutoModel(body: any): ImageModelId {
  const toolSlug = safe(body?.toolSlug || body?.slug || body?.tool || "").toLowerCase();
  const mode = safe(body?.mode || body?.assetType || "").toLowerCase();

  if (mode.includes("budget") || toolSlug.includes("draft")) return "seedream_4_0";
  if (mode.includes("premium") || toolSlug.includes("presentation")) return "nano_banana_2";
  if (mode.includes("ultra")) return "gpt_image_2";

  return "flux_1_dev";
}

function extractPrompt(body: any) {
  return safe(
    body?.prompt ||
      body?.message ||
      body?.input?.prompt ||
      body?.imagePrompt ||
      body?.description ||
      ""
  );
}

function stripDataImage(value: string) {
  const text = safe(value);
  const match = text.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match?.[1] || "";
}

function looksLikeBase64Image(value: string) {
  const text = safe(value);
  if (text.length < 500) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^data:/i.test(text)) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(text);
}

function extractStringImage(value: any): { b64?: string; remoteUrl?: string } {
  if (typeof value !== "string") return {};
  const text = safe(value);

  if (!text) return {};
  if (/^https?:\/\//i.test(text)) return { remoteUrl: text };

  const dataB64 = stripDataImage(text);
  if (dataB64) return { b64: dataB64 };

  if (looksLikeBase64Image(text)) return { b64: text.replace(/\s+/g, "") };

  return {};
}

function extractImagePayload(data: any): { b64?: string; remoteUrl?: string } {
  const candidates: any[] = [
    data?.output,
    data?.result,
    data?.image,
    data?.imageUrl,
    data?.image_url,
    data?.url,
    data?.b64,
    data?.b64_json,
    data?.base64,
    data?.data?.[0]?.b64_json,
    data?.data?.[0]?.url,
    data?.output?.image,
    data?.output?.imageUrl,
    data?.output?.image_url,
    data?.output?.url,
    data?.output?.b64,
    data?.output?.b64_json,
    data?.output?.base64,
    data?.output?.images?.[0],
    data?.output?.images?.[0]?.url,
    data?.output?.images?.[0]?.imageUrl,
    data?.output?.images?.[0]?.image_url,
    data?.output?.images?.[0]?.b64,
    data?.output?.images?.[0]?.b64_json,
    data?.output?.images?.[0]?.base64,
  ];

  for (const item of candidates) {
    const direct = extractStringImage(item);
    if (direct.b64 || direct.remoteUrl) return direct;

    if (item && typeof item === "object") {
      const nested = extractImagePayload(item);
      if (nested.b64 || nested.remoteUrl) return nested;
    }
  }

  return {};
}

async function saveRemoteImage(url: string, absFile: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to download generated image: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  await writeFile(absFile, Buffer.from(arrayBuffer));
}

async function saveGeneratedImage(args: {
  projectId: string;
  toolSlug: string;
  title: string;
  b64?: string;
  remoteUrl?: string;
}) {
  const projectId = slug(args.projectId || "default-project");
  const toolSlug = slug(args.toolSlug || "buildsetu-image");
  const title = slug(args.title || toolSlug);
  const ts = Date.now();

  const folder = path.join(process.cwd(), "data/generated/ai-images", projectId, "multi-model-router");
  await mkdir(folder, { recursive: true });

  const fileName = `${ts}-${toolSlug}-${title}.png`;
  const absFile = path.join(folder, fileName);

  if (args.b64) {
    await writeFile(absFile, Buffer.from(args.b64, "base64"));
  } else if (args.remoteUrl) {
    await saveRemoteImage(args.remoteUrl, absFile);
  } else {
    throw new Error("No image payload to save");
  }

  const relFile = `generated/ai-images/${projectId}/multi-model-router/${fileName}`;
  const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(relFile)}`;

  return { relFile, imageUrl };
}

async function callOpenAiImage(args: {
  prompt: string;
  selectedModel: ImageModelId;
  width: number;
  height: number;
}) {
  const apiKey = safe(process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || "");
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const model =
    safe(process.env.OPENAI_GPT_IMAGE_2_MODEL) ||
    safe(process.env.OPENAI_IMAGE_MODEL) ||
    "gpt-image-1";

  const size =
    safe(process.env.OPENAI_IMAGE_SIZE) ||
    (args.width >= args.height ? "1536x1024" : "1024x1536");

  const quality = safe(process.env.OPENAI_IMAGE_QUALITY || "medium");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: args.prompt,
      n: 1,
      size,
      quality,
    }),
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || text || `OpenAI image request failed with ${res.status}`);
  }

  const image = extractImagePayload(data);
  if (!image.b64 && !image.remoteUrl) {
    throw new Error("OpenAI response did not include image payload");
  }

  return {
    provider: "openai",
    model,
    b64: image.b64,
    remoteUrl: image.remoteUrl,
    raw: data,
  };
}

async function callExternalImageProvider(args: {
  prompt: string;
  selectedModel: ImageModelId;
  envPrefix: string;
  width: number;
  height: number;
  body: any;
}) {
  const apiUrl = safe(process.env[`${args.envPrefix}_API_URL`]);
  const apiKey = safe(process.env[`${args.envPrefix}_API_KEY`]);
  const model = safe(process.env[`${args.envPrefix}_MODEL`]) || IMAGE_MODEL_META[args.selectedModel].defaultModel || args.selectedModel;

  if (!apiUrl || !apiKey) {
    throw new Error(`${args.envPrefix}_API_URL or ${args.envPrefix}_API_KEY missing`);
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: args.prompt,
      width: args.width,
      height: args.height,
      input: {
        prompt: args.prompt,
        width: args.width,
        height: args.height,
        projectId: args.body?.projectId,
        toolSlug: args.body?.toolSlug,
        toolName: args.body?.toolName,
        imageUrl: args.body?.imageUrl || args.body?.referenceImageUrl || "",
        maskUrl: args.body?.maskUrl || "",
        extra: args.body?.extra || {},
      },
    }),
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || text || `${args.envPrefix} request failed with ${res.status}`);
  }

  const image = extractImagePayload(data);
  if (!image.b64 && !image.remoteUrl) {
    throw new Error(`${args.envPrefix} response did not include image payload`);
  }

  return {
    provider: "external_api",
    model,
    b64: image.b64,
    remoteUrl: image.remoteUrl,
    raw: data,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const selectedRouterImageModel = readBuildSetuImageModelFromBody(body, req);
const prompt = extractPrompt(body);
    const projectId = safe(body?.projectId || body?.selectedProjectId || "default-project");
    const toolSlug = safe(body?.toolSlug || body?.slug || "buildsetu-image");
    const toolName = safe(body?.toolName || body?.name || toolSlug);
    const title = safe(body?.title || body?.outputTitle || toolName);
    const requestedModel = normalizeImageModel(
      body?.selectedImageModel ||
        body?.imageModel ||
        body?.modelId ||
        body?.model ||
        "auto"
    );
    const selectedModel = requestedModel === "auto" ? resolveAutoModel(body) : requestedModel;
    const modelMeta = IMAGE_MODEL_META[selectedModel];
    const dryRun =
      body?.dryRun === true ||
      body?.dryRun === "true" ||
      body?.debugDryRun === true ||
      body?.mode === "dryRun";

    if (dryRun) {
      const configured =
        modelMeta.provider === "runpod_serverless"
          ? isRunpodServerlessConfigured()
          : modelMeta.provider === "openai"
            ? Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN)
            : modelMeta.provider === "external_api" && modelMeta.envPrefix
              ? Boolean(process.env[`${modelMeta.envPrefix}_API_URL`] && process.env[`${modelMeta.envPrefix}_API_KEY`])
              : true;

      return NextResponse.json({
        ok: true,
        dryRun: true,
        selectedModel,
        imageModel: selectedModel,
        modelLabel: modelMeta.label,
        modelTier: modelMeta.tier,
        provider: modelMeta.provider,
        model: modelMeta.defaultModel || selectedModel,
        envPrefix: modelMeta.envPrefix || "",
        configured,
      });
    }


    const width = Number(body?.width || body?.size?.width || 1024);
    const height = Number(body?.height || body?.size?.height || 1024);

    if (!prompt) {
      return NextResponse.json(
        {
          ok: false,
          code: "IMAGE_PROMPT_MISSING",
          error: "Image prompt missing.",
        },
        { status: 400 }
      );
    }

    let result: {
      provider: string;
      model: string;
      b64?: string;
      remoteUrl?: string;
      raw: any;
    };

    if (modelMeta.provider === "runpod_serverless") {
      if (!isRunpodServerlessConfigured()) {
        return NextResponse.json(
          {
            ok: false,
            code: "RUNPOD_SERVERLESS_NOT_CONFIGURED",
            selectedModel,
            modelLabel: modelMeta.label,
            error: "RUNPOD_ENDPOINT_ID or RUNPOD_API_KEY missing on server.",
          },
          { status: 500 }
        );
      }

      const runpodResult = await callRunpodServerlessImage({
      imageModel: selectedRouterImageModel,
      prompt,
        negativePrompt: body?.negativePrompt || body?.negative_prompt || "",
        projectId,
        toolSlug,
        toolName,
        mode: body?.mode || body?.assetType || toolSlug,
        width,
        height,
        steps: Number(body?.steps || 28),
        seed: Number(body?.seed || -1),
        cfgScale: Number(body?.cfgScale || body?.cfg_scale || 7),
        imageUrl: body?.imageUrl || body?.referenceImageUrl || "",
        maskUrl: body?.maskUrl || "",
        workflow: body?.workflow || null,
        extra: {
          ...(body?.extra || {}),
          selectedModel,
          model: modelMeta.defaultModel,
        },
      });

      result = {
        provider: "runpod_serverless",
        model: runpodResult.model || modelMeta.defaultModel || selectedModel,
        b64: runpodResult.b64,
        remoteUrl: runpodResult.remoteUrl,
        raw: runpodResult.raw,
      };
    } else if (modelMeta.provider === "openai") {
      result = await callOpenAiImage({
        prompt,
        selectedModel,
        width,
        height,
      });
    } else if (modelMeta.provider === "external_api" && modelMeta.envPrefix) {
      result = await callExternalImageProvider({
        prompt,
        selectedModel,
        envPrefix: modelMeta.envPrefix,
        width,
        height,
        body,
      });
    } else {
      throw new Error(`Unsupported image model provider for ${selectedModel}`);
    }

    const saved = await saveGeneratedImage({
      projectId,
      toolSlug,
      title,
      b64: result.b64,
      remoteUrl: result.remoteUrl,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      requestedModel,
      selectedModel,
      modelLabel: modelMeta.label,
      modelTier: modelMeta.tier,
      provider: result.provider,
      source: "buildsetu_multi_image_model_router",
      generationMode: "multi_model_image_generation",
      title,
      projectId,
      toolSlug,
      toolName,
      imageUrl: saved.imageUrl,
      publicUrl: saved.imageUrl,
      url: saved.imageUrl,
      file: saved.relFile,
      model: result.model,
      raw: result.raw,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        provider: "buildsetu_multi_image_model_router",
        code: "IMAGE_GENERATION_FAILED",
        error: err instanceof Error ? err.message : "Image generation failed.",
      },
      { status: 500 }
    );
  }
}
