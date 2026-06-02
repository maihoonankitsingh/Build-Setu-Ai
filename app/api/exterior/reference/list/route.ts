import { NextResponse } from "next/server";
import { listExteriorReferences } from "@/lib/exterior-reference-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "");
    const role = String(url.searchParams.get("role") || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const references = await listExteriorReferences(projectId, role || undefined);

    return NextResponse.json({
      ok: true,
      references,
      count: references.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reference list failed" },
      { status: 500 }
    );
  }
}
