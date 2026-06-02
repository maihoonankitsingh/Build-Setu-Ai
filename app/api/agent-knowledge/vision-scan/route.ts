import { addBuildSetuUsageEvent } from "@/lib/agent-usage/usage-cost-store";
import { checkBuildSetuUsageLimit } from "@/lib/agent-usage/usage-limit-store";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  addBuildSetuKnowledge,
  type BuildSetuKnowledgeDomain,
  type BuildSetuKnowledgeSourceType,
} from "@/lib/agent-knowledge/knowledge-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type VisionScanJson = {
  summary?: string;
  planningRules?: string[];
  styleNotes?: string[];
  materialIdeas?: string[];
  roomIdeas?: string[];
  structuralNotes?: string[];
  warnings?: string[];
  whatIsGood?: string[];
  whatToAvoid?: string[];
};

function safe(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value: unknown) {
  return (
    safe(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "vision-image"
  );
}

function extensionOf(fileName: string) {
  return path.extname(fileName || "").toLowerCase();
}

function normalizeDomain(value: unknown): BuildSetuKnowledgeDomain {
  const domain = safe(value || "general");
  const allowed: BuildSetuKnowledgeDomain[] = [
    "floor_plan",
    "interior",
    "exterior",
    "structure",
    "mep",
    "boq",
    "general",
  ];
  return allowed.includes(domain as BuildSetuKnowledgeDomain)
    ? (domain as BuildSetuKnowledgeDomain)
    : "general";
}

function normalizeSourceType(value: unknown): BuildSetuKnowledgeSourceType {
  const sourceType = safe(value || "screenshot");
  if (sourceType === "image" || sourceType === "screenshot" || sourceType === "reference_url") {
    return sourceType;
  }
  return "screenshot";
}

function parseTags(value: unknown) {
  const text = safe(value);
  if (!text) return ["vision_scan", "image_reference"];
  return text
    .split(",")
    .map((item) => safe(item))
    .filter(Boolean)
    .slice(0, 20);
}

function mimeFor(fileName: string, fileType: string) {
  const ext = extensionOf(fileName);
  if (fileType.startsWith("image/")) return fileType;
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "";
}

function isAllowedImage(fileName: string, fileType: string) {
  const ext = extensionOf(fileName);
  return (
    fileType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp"].includes(ext)
  );
}

async function saveUploadedImage(file: File, uploadId: string) {
  const originalName = safe(file.name) || "vision-image.png";
  const fileType = safe(file.type);
  const mime = mimeFor(originalName, fileType);

  if (!isAllowedImage(originalName, fileType) || !mime) {
    throw new Error("Only PNG, JPG, JPEG, or WEBP image upload is supported.");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image too large. Max 12MB allowed for vision scan.");
  }

  const cleanName = `${Date.now()}-${slug(originalName)}${extensionOf(originalName) || ".png"}`;
  const folder = path.join(process.cwd(), "data", "agent-knowledge", "uploads", "vision", uploadId);
  await mkdir(folder, { recursive: true });

  const absPath = path.join(folder, cleanName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  return {
    absPath,
    fileName: originalName,
    fileType: mime,
    fileSize: file.size,
    dataUrl,
  };
}


async function cleanupFailedVisionUpload(fileReport: any) {
  const savedPath = safe(fileReport?.savedPath);
  if (!savedPath) return;

  const uploadsRoot = path.join(process.cwd(), "data", "agent-knowledge", "uploads", "vision");
  const folder = path.dirname(savedPath);
  const relative = path.relative(uploadsRoot, folder);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return;

  await rm(folder, { recursive: true, force: true });
}

function firstJsonObject(text: string) {
  const raw = safe(text);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function arr(value: unknown) {
  if (Array.isArray(value)) return value.map((x) => safe(x)).filter(Boolean).slice(0, 30);
  const text = safe(value);
  return text ? [text] : [];
}

function normalizeScanJson(value: any): VisionScanJson {
  return {
    summary: safe(value?.summary),
    planningRules: arr(value?.planningRules),
    styleNotes: arr(value?.styleNotes),
    materialIdeas: arr(value?.materialIdeas),
    roomIdeas: arr(value?.roomIdeas),
    structuralNotes: arr(value?.structuralNotes),
    warnings: arr(value?.warnings),
    whatIsGood: arr(value?.whatIsGood),
    whatToAvoid: arr(value?.whatToAvoid),
  };
}

function buildPrompt(args: { domain: BuildSetuKnowledgeDomain; title: string; notes: string }) {
  return [
    "You are BuildSetu Vision Knowledge Scanner for construction/design references.",
    "Analyze the uploaded image/screenshot/floor plan/reference.",
    "Extract reusable knowledge for future BuildSetu agents.",
    "",
    `Domain: ${args.domain}`,
    args.title ? `Title: ${args.title}` : "",
    args.notes ? `User notes: ${args.notes}` : "",
    "",
    "Return ONLY valid JSON with this exact shape:",
    "{",
    '  "summary": "short description of what image shows",',
    '  "planningRules": ["practical layout/zoning/circulation rules"],',
    '  "styleNotes": ["style, facade, interior, lighting, proportion notes"],',
    '  "materialIdeas": ["materials, finishes, colors, textures"],',
    '  "roomIdeas": ["room/layout/furniture/use ideas"],',
    '  "structuralNotes": ["visible structural/load/opening cautions only"],',
    '  "warnings": ["professional verification, code/safety/site-condition warnings"],',
    '  "whatIsGood": ["good reusable ideas"],',
    '  "whatToAvoid": ["mistakes or limitations to avoid"]',
    "}",
    "",
    "Do not invent exact dimensions, legal code, column size, beam size, cost, or approval claims.",
    "For floor plans, focus on parking, entry, public/private/service zones, wet areas, stairs, room adjacency, doors/windows, ventilation, road/facing if visible.",
    "For interiors, focus on furniture scale, storage, lighting, circulation, materials, color palette.",
    "For exteriors, focus on massing, facade, openings, balcony, gate, materials, lighting, constructability.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function scanWithOpenAI(args: {
  dataUrl: string;
  domain: BuildSetuKnowledgeDomain;
  title: string;
  notes: string;
}) {
  const apiKey = safe(process.env.OPENAI_API_KEY);
  const model = safe(process.env.OPENAI_VISION_MODEL || "gpt-4o-mini");

  if (!apiKey) {
    return {
      visionUsed: false,
      model,
      rawText: "",
      parsed: normalizeScanJson({
        summary: "Image uploaded but OpenAI vision scan was skipped because OPENAI_API_KEY is not configured.",
        warnings: ["Vision scan pending: configure OPENAI_API_KEY and retry to extract visual knowledge."],
      }),
      error: "OPENAI_API_KEY missing",
    };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1400,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(args) },
            { type: "image_url", image_url: { url: args.dataUrl } },
          ],
        },
      ],
    }),
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const message =
      safe(json?.error?.message) ||
      safe(json?.message) ||
      `OpenAI vision scan failed with HTTP ${res.status}`;
    return {
      visionUsed: false,
      model,
      rawText: "",
      parsed: normalizeScanJson({
        summary: "Image uploaded but vision model scan failed.",
        warnings: [`Vision scan failed: ${message}`],
      }),
      error: message,
    };
  }

  const rawText = safe(json?.choices?.[0]?.message?.content);
  const parsed = normalizeScanJson(firstJsonObject(rawText) || { summary: rawText });

  return {
    visionUsed: true,
    model,
    rawText,
    parsed,
    error: "",
  };
}

function buildKnowledgeText(args: {
  title: string;
  domain: BuildSetuKnowledgeDomain;
  notes: string;
  fileName: string;
  imageUrl: string;
  savedPath: string;
  scan: VisionScanJson;
}) {
  const s = args.scan;

  const lines = [
    `Vision reference title: ${args.title}`,
    `Domain: ${args.domain}`,
    args.fileName ? `File name: ${args.fileName}` : "",
    args.imageUrl ? `Image URL: ${args.imageUrl}` : "",
    args.savedPath ? `Saved path: ${args.savedPath}` : "",
    args.notes ? `User notes: ${args.notes}` : "",
    s.summary ? `Summary: ${s.summary}` : "",
    ...arr(s.planningRules).map((x) => `Planning rule: ${x}`),
    ...arr(s.styleNotes).map((x) => `Style note: ${x}`),
    ...arr(s.materialIdeas).map((x) => `Material idea: ${x}`),
    ...arr(s.roomIdeas).map((x) => `Room idea: ${x}`),
    ...arr(s.structuralNotes).map((x) => `Structural note: ${x}`),
    ...arr(s.warnings).map((x) => `Warning: ${x}`),
    ...arr(s.whatIsGood).map((x) => `Good reference idea: ${x}`),
    ...arr(s.whatToAvoid).map((x) => `Avoid: ${x}`),
  ];

  return lines.filter(Boolean).join("\n");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const requiredToken = safe(process.env.BUILDSETU_KNOWLEDGE_INGEST_TOKEN);
    if (requiredToken) {
      const provided =
        safe(req.headers.get("x-buildsetu-knowledge-token")) ||
        safe(req.headers.get("authorization")).replace(/^Bearer\s+/i, "");

      if (provided !== requiredToken) {
        return NextResponse.json(
          { ok: false, code: "UNAUTHORIZED", error: "Invalid knowledge ingest token." },
          { status: 401 },
        );
      }
    }

    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const contentType = safe(req.headers.get("content-type")).toLowerCase();

    let projectId = "global";
    let userId = "anonymous";
    let planTier = "free";
    let scope: "project" | "global" = "project";
    let domain: BuildSetuKnowledgeDomain = "general";
    let sourceType: BuildSetuKnowledgeSourceType = "screenshot";
    let title = "Vision scanned reference";
    let notes = "";
    let tags = ["vision_scan", "image_reference"];
    let imageUrl = "";
    let dataUrl = "";
    let fileName = "";
    let savedPath = "";
    let fileReport: any = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");

      projectId = safe(form.get("projectId") || "global");
      userId = safe(form.get("userId") || userId || "anonymous") || "anonymous";
      planTier = safe(form.get("planTier") || form.get("tier") || form.get("package") || planTier || "free") || "free";
      scope = form.get("scope") === "global" || projectId === "global" ? "global" : "project";
      domain = normalizeDomain(form.get("domain"));
      sourceType = normalizeSourceType(form.get("sourceType"));
      title = safe(form.get("title")) || "Vision scanned reference";
      notes = safe(form.get("notes") || form.get("text"));
      tags = parseTags(form.get("tags"));

      imageUrl = safe(form.get("imageUrl"));
      dataUrl = safe(form.get("dataUrl"));

      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const saved = await saveUploadedImage(file as File, uploadId);
        dataUrl = saved.dataUrl;
        fileName = saved.fileName;
        savedPath = saved.absPath;
        fileReport = {
          fileName: saved.fileName,
          fileType: saved.fileType,
          fileSize: saved.fileSize,
          savedPath: saved.absPath,
        };
      }
    } else {
      const body = await req.json().catch(() => ({}));

      projectId = safe(body.projectId || "global");
      userId = safe(body.userId || body.user?.id || body.session?.userId || userId || "anonymous") || "anonymous";
      planTier = safe(body.planTier || body.tier || body.package || planTier || "free") || "free";
      scope = body.scope === "global" || projectId === "global" ? "global" : "project";
      domain = normalizeDomain(body.domain);
      sourceType = normalizeSourceType(body.sourceType);
      title = safe(body.title) || safe(body.fileName) || "Vision scanned reference";
      notes = safe(body.notes || body.text || body.prompt);
      tags = Array.isArray(body.tags) ? body.tags.map((x: unknown) => safe(x)).filter(Boolean) : parseTags(body.tags);

      imageUrl = safe(body.imageUrl || body.referenceImageUrl);
      dataUrl = safe(body.dataUrl);

      const base64 = safe(body.imageBase64 || body.base64);
      const mime = safe(body.mime || body.fileType || "image/png");
      if (!dataUrl && base64) {
        dataUrl = base64.startsWith("data:") ? base64 : `data:${mime};base64,${base64}`;
      }

      fileName = safe(body.fileName);
    }

    const imageInput = dataUrl || imageUrl;
    if (!imageInput) {
      return NextResponse.json(
        {
          ok: false,
          code: "IMAGE_REQUIRED",
          error: "Upload multipart field file, or send JSON imageUrl/dataUrl/imageBase64.",
        },
        { status: 400 },
      );
    }

    const visionUsageLimit = checkBuildSetuUsageLimit({
      projectId,
      userId,
      planTier,
      next: {
        kind: "vision",
        visionScans: 1,
      },
    });

    if (!visionUsageLimit.allowed) {
      await cleanupFailedVisionUpload(fileReport);

      return NextResponse.json(
        {
          ok: false,
          code: visionUsageLimit.code,
          error: visionUsageLimit.message,
          planTier: visionUsageLimit.planTier,
          limit: visionUsageLimit.limit,
          current: visionUsageLimit.current,
          after: visionUsageLimit.after,
          exceeded: visionUsageLimit.exceeded,
          upgradeRequired: true,
          entry: null,
        },
        { status: 402 },
      );
    }

    const scanResult = await scanWithOpenAI({
      dataUrl: imageInput,
      domain,
      title,
      notes,
    });

    if (!scanResult.visionUsed && scanResult.error) {
      addBuildSetuUsageEvent({
        projectId,
        userId,
        route: "/api/agent-knowledge/vision-scan",
        source: "vision-scan-openai",
        kind: "vision",
        provider: "openai",
        model: scanResult.model || "unknown",
        status: "failed",
        visionImageCount: 1,
        latencyMs: Date.now() - startedAt,
        metadata: {
          code: "VISION_MODEL_UNAVAILABLE",
          warning: scanResult.error || "",
          sourceType,
          domain,
          title,
          fileName: fileReport?.fileName || "",
          fileSize: fileReport?.fileSize || 0,
        },
      });

      await cleanupFailedVisionUpload(fileReport);

      return NextResponse.json(
        {
          ok: false,
          code: "VISION_MODEL_UNAVAILABLE",
          message:
            "Image upload was accepted, but visual knowledge was not saved because the vision model failed.",
          uploadId,
          projectId,
          domain,
          sourceType,
          visionUsed: false,
          model: scanResult.model,
          warning: scanResult.error,
          file: fileReport,
          extracted: scanResult.parsed,
          entry: null,
        },
        { status: 424 },
      );
    }

    const text = buildKnowledgeText({
      title,
      domain,
      notes,
      fileName,
      imageUrl,
      savedPath,
      scan: scanResult.parsed,
    });

    const entry = addBuildSetuKnowledge({
      projectId,
      scope,
      domain,
      sourceType,
      title,
      text,
      imageUrl: imageUrl || savedPath || "",
      fileName,
      tags,
      raw: {
        uploadedBy: "vision-scan",
        uploadId,
        file: fileReport,
        notes,
        vision: {
          used: scanResult.visionUsed,
          model: scanResult.model,
          error: scanResult.error,
          rawText: scanResult.rawText,
          parsed: scanResult.parsed,
        },
      },
    });

    addBuildSetuUsageEvent({
      projectId,
      userId,
      route: "/api/agent-knowledge/vision-scan",
      source: "vision-scan-openai-success",
      kind: "vision",
      provider: "openai",
      model: scanResult.model || "unknown",
      status: "success",
      visionImageCount: 1,
      latencyMs: Date.now() - startedAt,
      metadata: {
        sourceType,
        domain,
        title,
        fileName: fileReport?.fileName || "",
        fileSize: fileReport?.fileSize || 0,
        entryId: entry?.id || "",
      },
    });

return NextResponse.json({
      ok: true,
      uploadId,
      projectId,
      domain,
      sourceType,
      visionUsed: scanResult.visionUsed,
      model: scanResult.model,
      warning: "",
      file: fileReport,
      extracted: scanResult.parsed,
      entry,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "VISION_SCAN_FAILED",
        error: error?.message || "Vision scan failed.",
      },
      { status: 500 },
    );
  }
}
