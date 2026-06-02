import { NextResponse } from "next/server";
import { runBlenderExteriorRender } from "@/lib/blender-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const conceptId = String(body.conceptId || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const result = await runBlenderExteriorRender({
      projectId,
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      action: "project_model_blender_real_render_ready",
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project Blender render failed" },
      { status: 500 }
    );
  }
}
