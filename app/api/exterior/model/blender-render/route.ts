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
      action: "blender_real_render_ready",
      message: result.message,
      output: {
        title: "Blender Real Render Ready",
        summary: "Blender se same model/camera ke basis par real PNG render generate ho gaya.",
        imageUrl: result.renderedOutputs?.[0]?.imageUrl || result.model.sourceMasterImageUrl || "",
        sections: [
          "Renderer: Blender headless",
          `Rendered outputs: ${result.renderedOutputs.length}`,
          "Output imageUrl real Blender PNG par point kar raha hai.",
        ],
        nextActions: ["Generate more exact views", "Engineer Review", "Export Package"],
        model: result.model,
        queue: result.queue,
        renderedOutputs: result.renderedOutputs,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Blender render failed" },
      { status: 500 }
    );
  }
}
