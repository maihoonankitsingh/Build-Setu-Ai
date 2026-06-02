export type RunpodServerlessImageArgs = {
  imageModel?: string;
  prompt: string;
  negativePrompt?: string;
  projectId?: string;
  toolSlug?: string;
  toolName?: string;
  mode?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  cfgScale?: number;
  imageUrl?: string;
  maskUrl?: string;
  workflow?: any;
  extra?: Record<string, any>;
};

export type RunpodServerlessImageResult = {
  imageModel?: string;
  ok: true;
  provider: "runpod_serverless";
  endpointId: string;
  model?: string;
  status?: string;
  b64?: string;
  remoteUrl?: string;
  raw: any;
};

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function configuredEndpointId() {
  return safe(process.env.RUNPOD_ENDPOINT_ID || process.env.BUILDSETU_RUNPOD_ENDPOINT_ID || "");
}

function configuredApiKey() {
  return safe(process.env.RUNPOD_API_KEY || process.env.BUILDSETU_RUNPOD_API_KEY || "");
}

export function isRunpodServerlessConfigured() {
  return Boolean(configuredEndpointId() && configuredApiKey());
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

export async function callRunpodServerlessImage(args: RunpodServerlessImageArgs): Promise<RunpodServerlessImageResult> {
  const endpointId = configuredEndpointId();
  const apiKey = configuredApiKey();

  if (!endpointId || !apiKey) {
    throw new Error("RUNPOD_ENDPOINT_ID or RUNPOD_API_KEY missing");
  }

  const prompt = safe(args.prompt);
  if (!prompt) {
    throw new Error("RunPod image prompt missing");
  }

  const input = {
    prompt,
    negative_prompt: safe(args.negativePrompt),
    projectId: safe(args.projectId),
    toolSlug: safe(args.toolSlug),
    toolName: safe(args.toolName),
    mode: safe(args.mode || args.toolSlug || "image_generation"),
    width: Number(args.width || 1024),
    height: Number(args.height || 1024),
    steps: Number(args.steps || process.env.RUNPOD_IMAGE_STEPS || 28),
    seed: Number(args.seed || -1),
    cfg_scale: Number(args.cfgScale || process.env.RUNPOD_IMAGE_CFG_SCALE || 7),
    image_url: safe(args.imageUrl),
    mask_url: safe(args.maskUrl),
    workflow: args.workflow || null,
    ...(args.extra || {}),
  };

  const res = await fetch(`https://api.runpod.ai/v2/${encodeURIComponent(endpointId)}/runsync`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      input,
      policy: {
        executionTimeout: Number(process.env.RUNPOD_IMAGE_EXECUTION_TIMEOUT_MS || 600000),
        ttl: Number(process.env.RUNPOD_IMAGE_TTL_MS || 900000),
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
    throw new Error(data?.error || data?.message || text || `RunPod request failed with ${res.status}`);
  }

  const status = safe(data?.status);
  if (status && !["COMPLETED", "IN_PROGRESS", "IN_QUEUE"].includes(status.toUpperCase())) {
    throw new Error(data?.error || data?.message || `RunPod job status: ${status}`);
  }

  const image = extractImagePayload(data);

  if (!image.b64 && !image.remoteUrl) {
    throw new Error("RunPod response did not include an image payload");
  }

  return {
    ok: true,
    provider: "runpod_serverless",
    imageModel: args.imageModel,
    endpointId,
    model: safe(data?.output?.model || data?.model || process.env.RUNPOD_IMAGE_MODEL || "runpod-serverless-image-worker"),
    status,
    b64: image.b64,
    remoteUrl: image.remoteUrl,
    raw: data,
  };
}
