import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_FILE = path.join(process.cwd(), "data", "generated", "structures.json");

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const structures = JSON.parse(raw);
    return NextResponse.json({ ok: true, structures: Array.isArray(structures) ? structures : [] });
  } catch {
    return NextResponse.json({ ok: true, structures: [] });
  }
}
