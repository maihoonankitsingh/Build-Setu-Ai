import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_DIR = path.join(process.cwd(), "public", "generated", "reports");

export async function GET(req: NextRequest) {
  try {
    const fileName = req.nextUrl.searchParams.get("fileName") || "";

    if (!fileName || fileName.includes("/") || fileName.includes("\\") || !fileName.endsWith(".pdf")) {
      return NextResponse.json({ ok: false, error: "Invalid fileName" }, { status: 400 });
    }

    const filePath = path.join(REPORT_DIR, fileName);
    const bytes = await fs.readFile(filePath);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "PDF not found" }, { status: 404 });
  }
}
