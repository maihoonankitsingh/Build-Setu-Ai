import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_ROOT = process.env.BUILDSETU_PUBLIC_ROOT || "/var/www/build.sikhadenge.in/sikhadenge-build/public";
const DATA_ROOT = process.env.BUILDSETU_DATA_ROOT || "/var/www/build.sikhadenge.in/sikhadenge-build/data";

function contentTypeFor(filePath: string) {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";

  return "application/octet-stream";
}

function cleanRelativeFile(value: string) {
  const decoded = decodeURIComponent(String(value || ""));
  const cleaned = decoded
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^data\//, "");

  if (!cleaned) return "";
  if (cleaned.includes("..")) return "";
  if (cleaned.includes("\0")) return "";
  if (cleaned.startsWith("/")) return "";

  return cleaned;
}

function safeJoin(root: string, ...parts: string[]) {
  const cleanRoot = String(root || "").replace(/\/+$/, "");
  const cleanParts = parts
    .map((part) => String(part || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);

  return [cleanRoot, ...cleanParts].join("/");
}

function generatedImageCandidates(cleaned: string) {
  if (cleaned.startsWith("generated/")) {
    const sub = cleaned.slice("generated/".length);
    return [
      safeJoin(PUBLIC_ROOT, "generated", sub),
      safeJoin(DATA_ROOT, "generated", sub),
    ];
  }

  if (cleaned.startsWith("ai-images/")) {
    const sub = cleaned.slice("ai-images/".length);
    return [
      safeJoin(PUBLIC_ROOT, "ai-images", sub),
      safeJoin(DATA_ROOT, "ai-images", sub),
      safeJoin(DATA_ROOT, "generated", "ai-images", sub),
    ];
  }

  return [];
}

async function findGeneratedImageFile(relativeFile: string) {
  const cleaned = cleanRelativeFile(relativeFile);
  if (!cleaned) return null;

  const candidates = generatedImageCandidates(cleaned);
  if (!candidates.length) return null;

  for (const filePath of candidates) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) return filePath;
    } catch {}
  }

  return null;
}

function fileParam(req: NextRequest) {
  const url = new URL(req.url);

  return (
    url.searchParams.get("file") ||
    url.searchParams.get("path") ||
    url.searchParams.get("image") ||
    ""
  );
}

export async function GET(req: NextRequest) {
  const file = fileParam(req);
  const filePath = await findGeneratedImageFile(file);

  if (!filePath) {
    return NextResponse.json(
      {
        ok: false,
        error: "Generated image file not found",
        file,
      },
      { status: 404 }
    );
  }

  const buffer = await fs.readFile(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": String(buffer.length),
    },
  });
}

export async function HEAD(req: NextRequest) {
  const file = fileParam(req);
  const filePath = await findGeneratedImageFile(file);

  if (!filePath) {
    return new NextResponse(null, { status: 404 });
  }

  const stat = await fs.stat(filePath);

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": String(stat.size),
    },
  });
}
