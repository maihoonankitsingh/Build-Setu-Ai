import { execFileSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { addBuildSetuKnowledge } from "@/lib/agent-knowledge/knowledge-store";
import {
  extractBuildSetuPdfPages,
  formatBuildSetuPdfPagesForText,
  isBuildSetuPdfFile,
} from "@/lib/agent-knowledge/pdf-page-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type IngestedFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
  savedPath: string;
  extractedText: string;
};

function safe(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slug(value: unknown) {
  return (
    safe(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "knowledge-file"
  );
}

function normalizeDomain(value: unknown) {
  return safe(value || "buildsetu");
}

function normalizeSourceType(value: unknown) {
  return safe(value || "file_upload");
}

function parseTags(value: unknown) {
  const text = safe(value);
  if (!text) return ["file_upload"];
  return text
    .split(",")
    .map((item) => safe(item))
    .filter(Boolean)
    .slice(0, 20);
}

function extensionOf(fileName: string) {
  return path.extname(fileName || "").toLowerCase();
}

function isTextLike(fileName: string, fileType: string) {
  const ext = extensionOf(fileName);
  return (
    fileType.startsWith("text/") ||
    [
      ".txt",
      ".md",
      ".markdown",
      ".json",
      ".csv",
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".css",
      ".html",
      ".xml",
      ".yaml",
      ".yml",
    ].includes(ext)
  );
}

function tryExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      timeout: 25000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

async function saveUploadedFile(file: File, uploadId: string) {
  const originalName = safe(file.name) || "upload.bin";
  const cleanName = `${Date.now()}-${slug(originalName)}${extensionOf(originalName)}`;
  const folder = path.join(process.cwd(), "data", "agent-knowledge", "uploads", uploadId);
  await mkdir(folder, { recursive: true });

  const absPath = path.join(folder, cleanName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buffer);

  return { absPath, buffer };
}

async function extractText(file: File, absPath: string, buffer: Buffer) {
  const fileName = safe(file.name);
  const fileType = safe(file.type);
  const ext = extensionOf(fileName);

  if (isTextLike(fileName, fileType)) {
    return buffer.toString("utf8").replace(/\u0000/g, "").trim();
  }

  if (ext === ".pdf" || fileType === "application/pdf") {
    const text = tryExec("pdftotext", [absPath, "-"]);
    return text.trim();
  }

  if (fileType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    const text = tryExec("tesseract", [absPath, "stdout"]);
    return text.trim();
  }

  return "";
}

function chunkText(text: string, maxChars = 9000) {
  const cleaned = safe(text);
  if (!cleaned) return [];

  const chunks: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    chunks.push(cleaned.slice(i, i + maxChars));
    i += maxChars;
  }

  return chunks;
}

async function addKnowledgeEntry(entry: Record<string, any>) {
  const addFn = addBuildSetuKnowledge as unknown as (...args: any[]) => any;

  try {
    return await addFn(entry);
  } catch (firstError) {
    try {
      return await addFn(entry.domain, entry.sourceType, entry.title, entry.content, entry);
    } catch {
      throw firstError;
    }
  }
}

async function ingestOneFile(args: {
  file: File;
  uploadId: string;
  domain: string;
  sourceType: string;
  titlePrefix: string;
  tags: string[];
}) {
  const { absPath, buffer } = await saveUploadedFile(args.file, args.uploadId);
  const pdfPages = isBuildSetuPdfFile(safe(args.file.name), safe(args.file.type))
    ? extractBuildSetuPdfPages({
        absPath,
        fileName: safe(args.file.name),
        fileType: safe(args.file.type),
      })
    : [];

  const extractedText = pdfPages.length
    ? formatBuildSetuPdfPagesForText(pdfPages)
    : await extractText(args.file, absPath, buffer);

  const fallbackText = [
    `File uploaded for BuildSetu agent knowledge.`,
    `File name: ${safe(args.file.name)}`,
    `File type: ${safe(args.file.type) || "unknown"}`,
    `File size: ${args.file.size} bytes`,
    extractedText ? "" : "No extractable text was found. For scanned PDFs/images, install pdftotext/tesseract or upload text notes.",
  ]
    .filter(Boolean)
    .join("\n");

  const content = extractedText || fallbackText;
  const knowledgeChunks = pdfPages.length
    ? pdfPages.flatMap((page) => {
        const pageContent = [
          `File uploaded for BuildSetu agent knowledge.`,
          `File name: ${safe(args.file.name)}`,
          `File type: ${safe(args.file.type) || "application/pdf"}`,
          `File size: ${args.file.size} bytes`,
          `PDF page: ${page.pageNumber}`,
          `Source page: ${page.sourcePage}`,
          `Source citation: ${page.sourceCitation}`,
          `Extraction method: ${page.extractionMethod}`,
          "",
          page.text,
        ].join("\n");

        const pageChunks = chunkText(pageContent);
        return pageChunks.map((text, pageChunkIndex) => ({
          text,
          pageNumber: page.pageNumber,
          sourcePage: page.sourcePage,
          pageIndex: page.pageIndex,
          pageRange: page.pageRange,
          sourceCitation: page.sourceCitation,
          extractionMethod: page.extractionMethod,
          pageChunkIndex,
          pageChunks: pageChunks.length,
        }));
      })
    : chunkText(content).map((text, index) => ({
        text,
        pageNumber: null as number | null,
        sourcePage: null as number | null,
        pageIndex: null as number | null,
        pageRange: "",
        sourceCitation: "",
        extractionMethod: isBuildSetuPdfFile(safe(args.file.name), safe(args.file.type)) ? "pdftotext-fallback" : "file-text",
        pageChunkIndex: index,
        pageChunks: chunkText(content).length,
      }));

  const chunks = knowledgeChunks.map((item) => item.text);
  const added: any[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const title =
      chunks.length > 1
        ? `${args.titlePrefix || safe(args.file.name)} — Part ${index + 1}`
        : args.titlePrefix || safe(args.file.name);

    const result = await addKnowledgeEntry({
      domain: args.domain,
      sourceType: args.sourceType,
      title,
      content: chunk,
      text: chunk,
      tags: args.tags,
      source: {
        kind: "file_upload",
        fileName: safe(args.file.name),
        fileType: safe(args.file.type),
        savedPath: absPath,
      },
      metadata: {
        uploadId: args.uploadId,
        chunkIndex: index,
        chunks: chunks.length,
        fileSize: args.file.size,
        pageNumber: knowledgeChunks[index]?.pageNumber ?? null,
        sourcePage: knowledgeChunks[index]?.sourcePage ?? null,
        pageIndex: knowledgeChunks[index]?.pageIndex ?? null,
        pageRange: knowledgeChunks[index]?.pageRange || "",
        sourceCitation: knowledgeChunks[index]?.sourceCitation || "",
        extractionMethod: knowledgeChunks[index]?.extractionMethod || "",
        extracted: Boolean(extractedText),
      },
      createdAt: new Date().toISOString(),
    });

    added.push(result);
  }

  const fileReport: IngestedFile = {
    fileName: safe(args.file.name),
    fileType: safe(args.file.type) || "unknown",
    fileSize: args.file.size,
    savedPath: absPath,
    extractedText: extractedText ? "yes" : "no",
  };

  return { file: fileReport, chunks: chunks.length, added };
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

    const contentType = safe(req.headers.get("content-type")).toLowerCase();
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const files = form
        .getAll("file")
        .filter((item): item is File => typeof item === "object" && item !== null && "arrayBuffer" in item);

      if (!files.length) {
        return NextResponse.json(
          { ok: false, code: "FILE_REQUIRED", error: "Upload at least one file using field name file." },
          { status: 400 },
        );
      }

      const domain = normalizeDomain(form.get("domain"));
      const sourceType = normalizeSourceType(form.get("sourceType"));
      const titlePrefix = safe(form.get("title"));
      const tags = parseTags(form.get("tags"));

      const results = [];
      const buildSetuFileIngestFormHeavyGate = await enforceBuildSetuHeavyRouteAuthGate(req, {
        projectId: safe(form.get("projectId") || "global"),
        userId: safe(form.get("userId") || "anonymous"),
        kind: "file_search",
        estimatedInr: Math.max(0.25, files.length * 0.25),
      });
      if (buildSetuFileIngestFormHeavyGate) return buildSetuFileIngestFormHeavyGate;

      for (const file of files) {
        results.push(
          await ingestOneFile({
            file,
            uploadId,
            domain,
            sourceType,
            titlePrefix,
            tags,
          }),
        );
      }

      return NextResponse.json({
        ok: true,
        uploadId,
        mode: "multipart",
        files: results.length,
        results,
      });
    }

    const body = await req.json().catch(() => ({}));

    const buildSetuFileIngestJsonHeavyGate = await enforceBuildSetuHeavyRouteAuthGate(req, {
      projectId: safe(body.projectId || "global"),
      userId: safe(body.userId || body.user?.id || body.session?.userId || "anonymous"),
      kind: "file_search",
      estimatedInr: 0.25,
    });
    if (buildSetuFileIngestJsonHeavyGate) return buildSetuFileIngestJsonHeavyGate;
    const content = safe(body.content || body.text || body.markdown || body.notes);

    if (!content) {
      return NextResponse.json(
        { ok: false, code: "CONTENT_REQUIRED", error: "Send multipart file upload or JSON content/text." },
        { status: 400 },
      );
    }

    const domain = normalizeDomain(body.domain);
    const sourceType = normalizeSourceType(body.sourceType);
    const title = safe(body.title) || "Manual knowledge note";
    const tags = parseTags(body.tags || "manual_note");

    const chunks = chunkText(content);
    const added = [];

    for (let index = 0; index < chunks.length; index += 1) {
      added.push(
        await addKnowledgeEntry({
          domain,
          sourceType,
          title: chunks.length > 1 ? `${title} — Part ${index + 1}` : title,
          content: chunks[index],
          text: chunks[index],
          tags,
          source: { kind: "manual_json" },
          metadata: { uploadId, chunkIndex: index, chunks: chunks.length },
          createdAt: new Date().toISOString(),
        }),
      );
    }

    return NextResponse.json({
      ok: true,
      uploadId,
      mode: "json",
      chunks: chunks.length,
      added,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "KNOWLEDGE_FILE_INGEST_FAILED",
        error: error?.message || "Knowledge file ingest failed.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/agent-knowledge/file-ingest",
    methods: ["POST"],
    accepts: ["multipart/form-data field=file", "application/json content/text"],
  });
}
