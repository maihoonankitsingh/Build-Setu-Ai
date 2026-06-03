import { mkdir, readFile, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  addBuildSetuKnowledge,
  type BuildSetuKnowledgeDomain,
  type BuildSetuKnowledgeSourceType,
} from "@/lib/agent-knowledge/knowledge-store";
import {
  extractBuildSetuPdfPages,
  formatBuildSetuPdfPagesForText,
} from "@/lib/agent-knowledge/pdf-page-extract";
import { addBuildSetuUsageEvent } from "@/lib/agent-usage/usage-cost-store";
import { checkBuildSetuUsageLimit } from "@/lib/agent-usage/usage-limit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const execFileAsync = promisify(execFile);

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function cleanFileName(name: string) {
  return (
    safe(name)
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase() || "uploaded-file"
  );
}

function normalizeDomain(value: unknown): BuildSetuKnowledgeDomain {
  const v = safe(value).toLowerCase();
  if (v === "floor_plan") return "floor_plan";
  if (v === "interior") return "interior";
  if (v === "exterior") return "exterior";
  if (v === "structure") return "structure";
  if (v === "boq") return "boq";
  return "general";
}

function extension(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase().replace(".", "");
  return ext;
}

function detectType(fileName: string, mime: string) {
  const ext = extension(fileName);
  const m = safe(mime).toLowerCase();

  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  if (m.startsWith("video/") || ["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "video";
  if (
    m.startsWith("text/") ||
    ["txt", "md", "csv", "json", "html", "css", "js", "ts", "tsx", "jsx", "xml", "yaml", "yml"].includes(ext)
  ) return "text";

  return "binary";
}

async function saveUniversalFile(file: File, uploadId: string) {
  const fileName = cleanFileName(file.name || "uploaded-file");
  const fileType = safe(file.type) || "application/octet-stream";
  const bytes = Buffer.from(await file.arrayBuffer());

  if (bytes.length > 50 * 1024 * 1024) {
    throw new Error("File too large. Max 50MB allowed for universal scan.");
  }

  const folder = path.join(process.cwd(), "data", "agent-knowledge", "uploads", "universal", uploadId);
  await mkdir(folder, { recursive: true });

  const savedName = `${Date.now()}-${fileName}`;
  const absPath = path.join(folder, savedName);
  await writeFile(absPath, bytes);

  return {
    fileName,
    fileType,
    fileSize: bytes.length,
    absPath,
    relativePath: path.relative(process.cwd(), absPath),
    bytes,
  };
}

async function extractAudioText(saved: any, notes: string) {
  const apiKey = safe(process.env.OPENAI_API_KEY);
  const model = safe(process.env.OPENAI_AUDIO_MODEL || "whisper-1") || "whisper-1";

  if (!apiKey) {
    return notes || "Audio uploaded but OPENAI_API_KEY is missing, so transcription was skipped.";
  }

  try {
    const bytes = await readFile(saved.absPath);
    const blob = new Blob([bytes], { type: saved.fileType || "audio/wav" });

    const form = new FormData();
    form.append("model", model);
    form.append("file", blob, saved.fileName || "audio.wav");
    form.append("response_format", "json");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      return [
        "Audio uploaded but transcription failed.",
        `OpenAI audio error: ${data?.error?.message || res.statusText}`,
        notes ? `Notes: ${notes}` : "",
      ].filter(Boolean).join("\n");
    }

    const text = safe(data?.text).slice(0, 300000);
    return text || notes || "Audio uploaded but no speech text was detected.";
  } catch (error: any) {
    return [
      "Audio uploaded but transcription failed.",
      `Extractor error: ${error?.message || "unknown error"}`,
      notes ? `Notes: ${notes}` : "",
    ].filter(Boolean).join("\n");
  }
}

async function extractVideoText(saved: any, notes: string) {
  const basePath = String(saved.absPath || "").replace(/\.[^.]+$/, "");
  const audioPath = `${basePath}-video-audio.wav`;
  const framePath = `${basePath}-frame-1.jpg`;

  const parts: string[] = [];

  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        saved.absPath,
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        audioPath,
      ],
      {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    const audioText = await extractAudioText(
      {
        ...saved,
        absPath: audioPath,
        fileName: `${saved.fileName || "video"}.audio.wav`,
        fileType: "audio/wav",
      },
      notes,
    );

    if (safe(audioText)) {
      parts.push("Video audio transcript:");
      parts.push(audioText);
    }
  } catch (error: any) {
    parts.push(`Video audio extraction failed: ${error?.message || "unknown error"}`);
  }

  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        "00:00:01",
        "-i",
        saved.absPath,
        "-frames:v",
        "1",
        framePath,
      ],
      {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    parts.push(`Video key frame extracted: ${framePath}`);
  } catch (error: any) {
    parts.push(`Video key frame extraction failed: ${error?.message || "unknown error"}`);
  }

  if (notes) parts.push(`Notes: ${notes}`);

  return parts.filter(Boolean).join("\n\n") || "Video uploaded but no extractable audio/text was found.";
}

async function extractPdfText(savedPath: string, notes: string) {
  try {
    const { stdout } = await execFileAsync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", savedPath, "-"],
      {
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
      },
    );

    const text = safe(stdout).slice(0, 300000);
    if (text) return text;

    return notes || "PDF uploaded but no extractable text was found. Scanned PDF OCR will be added later.";
  } catch (error: any) {
    return [
      "PDF uploaded but text extraction failed.",
      `Extractor error: ${error?.message || "unknown error"}`,
      notes ? `Notes: ${notes}` : "",
      "Scanned PDF OCR will be added later.",
    ].filter(Boolean).join("\n");
  }
}

function bestEffortText(kind: string, saved: any, notes: string) {
  if (kind === "text") {
    const text = saved.bytes.toString("utf8").slice(0, 300000);
    return text || notes || "Text file uploaded but no readable text found.";
  }

  return [
    `Universal file scan accepted.`,
    `Detected type: ${kind}`,
    `File name: ${saved.fileName}`,
    `File type: ${saved.fileType}`,
    `File size: ${saved.fileSize}`,
    `Saved path: ${saved.absPath}`,
    notes ? `Notes: ${notes}` : "",
    kind === "pdf" ? "PDF deep extraction will run in Phase 3.3." : "",
    kind === "audio" ? "Audio transcription will run in Phase 3.5." : "",
    kind === "video" ? "Video frame/audio scan will run in Phase 3.6." : "",
  ].filter(Boolean).join("\n");
}

async function delegateImageToVision(req: NextRequest, input: {
  file: File;
  projectId: string;
  userId: string;
  planTier: string;
  domain: string;
  sourceType: string;
  title: string;
  notes: string;
}) {
  const fd = new FormData();
  fd.append("file", input.file, input.file.name || "image.png");
  fd.append("projectId", input.projectId);
  fd.append("userId", input.userId);
  fd.append("planTier", input.planTier);
  fd.append("domain", input.domain);
  fd.append("sourceType", input.sourceType || "screenshot");
  fd.append("title", input.title);
  fd.append("notes", input.notes);

  const headers: Record<string, string> = {};
  const token = safe(process.env.BUILDSETU_KNOWLEDGE_INGEST_TOKEN);
  if (token) headers["x-buildsetu-knowledge-token"] = token;

  const url = new URL("/api/agent-knowledge/vision-scan", req.url);
  const res = await fetch(url, {
    method: "POST",
    body: fd,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(
    {
      ...data,
      universalScan: true,
      detectedType: "image",
      delegatedTo: "/api/agent-knowledge/vision-scan",
    },
    { status: res.status },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const contentType = safe(req.headers.get("content-type")).toLowerCase();

    let projectId = "global";
    let userId = "anonymous";
    let planTier = "free";
    let domain = "general";
    let sourceType = "file_upload";
    let title = "Universal scanned file";
    let notes = "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const candidate = form.get("file");

      if (candidate && typeof candidate === "object" && "arrayBuffer" in candidate) {
        file = candidate as File;
      }

      projectId = safe(form.get("projectId") || "global") || "global";
      userId = safe(form.get("userId") || "anonymous") || "anonymous";
      planTier = safe(form.get("planTier") || form.get("tier") || form.get("package") || "free") || "free";
      domain = safe(form.get("domain") || "general") || "general";
      sourceType = safe(form.get("sourceType") || "file_upload") || "file_upload";
      title = safe(form.get("title") || file?.name || "Universal scanned file") || "Universal scanned file";
      notes = safe(form.get("notes") || form.get("text"));
    } else {
      return NextResponse.json(
        {
          ok: false,
          code: "MULTIPART_REQUIRED",
          error: "Send multipart/form-data with file field.",
        },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json(
        {
          ok: false,
          code: "FILE_REQUIRED",
          error: "Multipart file field is required.",
        },
        { status: 400 },
      );
    }

    const detectedType = detectType(file.name || title, file.type || "");

    if (detectedType === "image") {
      return delegateImageToVision(req, {
        file,
        projectId,
        userId,
        planTier,
        domain,
        sourceType,
        title,
        notes,
      });
    }

    const usageLimit = checkBuildSetuUsageLimit({
      projectId,
      userId,
      planTier,
      next: {
        kind: "file_search" as any,
        fileSearches: 1,
      },
    });

    if (!usageLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          code: usageLimit.code,
          error: usageLimit.message,
          planTier: usageLimit.planTier,
          limit: usageLimit.limit,
          current: usageLimit.current,
          after: usageLimit.after,
          exceeded: usageLimit.exceeded,
          upgradeRequired: true,
          entry: null,
        },
        { status: 402 },
      );
    }

    const saved = await saveUniversalFile(file, uploadId);
    let pdfPages: any[] = [];
    let extractedText = bestEffortText(detectedType, saved, notes);
    if (detectedType === "pdf") {
      // BUILDSETU_UNIVERSAL_SCAN_PDF_PAGEWISE_EXTRACTION_V1
      pdfPages = extractBuildSetuPdfPages({
        absPath: (saved as any).absPath || (saved as any).savedPath,
        fileName: saved.fileName,
        fileType: saved.fileType,
      });

      extractedText = pdfPages.length
        ? formatBuildSetuPdfPagesForText(pdfPages)
        : await extractPdfText(saved.absPath, notes);
    }

    if (detectedType === "audio") {
      extractedText = await extractAudioText(saved, notes);
    }

    if (detectedType === "video") {
      extractedText = await extractVideoText(saved, notes);
    }

    const knowledgeText = [
      `Universal scan title: ${title}`,
      `Detected type: ${detectedType}`,
      `Domain: ${domain}`,
      `File name: ${saved.fileName}`,
      `File type: ${saved.fileType}`,
      `Saved path: ${saved.absPath}`,
      "",
      pdfPages.length
        ? `PDF page citations:\n${pdfPages.map((page) => `- Page ${page.pageNumber}: ${page.sourceCitation}`).join("\n")}`
        : detectedType === "pdf"
          ? "PDF text extraction completed without page-wise citation. Scanned PDF OCR remains pending."
          : "",
      extractedText,
    ].join("\n");

    const entry = addBuildSetuKnowledge({
      projectId,
      scope: projectId === "global" ? "global" : "project",
      domain: normalizeDomain(domain),
      sourceType: "file_upload" as BuildSetuKnowledgeSourceType,
      title,
      text: knowledgeText,
      imageUrl: "",
      fileName: saved.fileName,
      tags: ["universal_scan", detectedType, "file_upload"].filter(Boolean),
      raw: {
        uploadedBy: "universal-scan",
        uploadId,
        detectedType,
        file: {
          fileName: saved.fileName,
          fileType: saved.fileType,
          fileSize: saved.fileSize,
          savedPath: saved.absPath,
          relativePath: saved.relativePath,
        },
        notes,
        extractedText: extractedText.slice(0, 20000),
        pdfPages: pdfPages.map((page) => ({
          pageNumber: page.pageNumber,
          sourcePage: page.sourcePage,
          pageIndex: page.pageIndex,
          pageRange: page.pageRange,
          sourceCitation: page.sourceCitation,
          extractionMethod: page.extractionMethod,
          textPreview: String(page.text || "").slice(0, 1000),
        })),
      },
    });

    (addBuildSetuUsageEvent as any)({
      projectId,
      userId,
      route: "/api/agent-knowledge/universal-scan",
      source: "universal-scan",
      kind: "file_search",
      provider: "local",
      model: "universal-scan-v1",
      status: "success",
      fileSearchCount: 1,
      latencyMs: Date.now() - startedAt,
      metadata: {
        detectedType,
        fileName: saved.fileName,
        fileType: saved.fileType,
        fileSize: saved.fileSize,
        entryId: entry?.id || "",
      },
    });

    return NextResponse.json({
      ok: true,
      universalScan: true,
      detectedType,
      uploadId,
      projectId,
      domain,
      sourceType,
      file: {
        fileName: saved.fileName,
        fileType: saved.fileType,
        fileSize: saved.fileSize,
        savedPath: saved.absPath,
      },
      extracted: {
        textPreview: extractedText.slice(0, 2000),
        note:
          detectedType === "pdf"
            ? "PDF text extraction completed when text is available. Scanned PDF OCR pending next phase."
            : detectedType === "audio"
              ? "Audio transcription completed when speech is available."
              : detectedType === "video"
                ? "Video audio/key-frame extraction completed when available."
                : "",
      },
      entry,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNIVERSAL_SCAN_FAILED",
        error: error?.message || "Universal scan failed.",
      },
      { status: 500 },
    );
  }
}
