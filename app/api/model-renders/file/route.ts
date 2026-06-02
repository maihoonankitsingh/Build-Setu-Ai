import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeRenderFile(value: string) {
  const clean = String(value || "")
    .replace(/^\/+/, "")
    .replace(/^public\/+/, "");

  if (!clean.startsWith("generated/blender-renders/")) {
    throw new Error("Invalid render file path");
  }

  if (clean.includes("..") || clean.includes("\\") || clean.includes("\0")) {
    throw new Error("Unsafe render file path");
  }

  return clean;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const file = safeRenderFile(String(url.searchParams.get("file") || ""));

    const abs = path.join(process.cwd(), "public", file);
    const data = await fs.readFile(abs);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Render file not found" },
      { status: 404 }
    );
  }
}
