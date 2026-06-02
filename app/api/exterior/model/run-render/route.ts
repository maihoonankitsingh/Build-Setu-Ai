import { NextResponse } from "next/server";
import { runProjectModelRenderPlaceholder } from "@/lib/project-model-store";

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

    const result = await runProjectModelRenderPlaceholder({
      projectId,
      toolSlug: "exterior-elevation",
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      action: "exterior_renderer_placeholder_ready",
      message: result.message,
      output: {
        title: "Exterior Renderer Placeholder Ready",
        summary: "Same model/camera ke exact render jobs placeholder mode me ready hain. Actual 3D engine pending hai.",
        imageUrl: result.model.sourceMasterImageUrl || "",
        sections: [
          "Model status: RENDER_READY",
          `Render queue items: ${result.queue.length}`,
          `Outputs moved to RENDER_READY: ${result.renderedOutputs.length}`,
          "No fake image generated. Actual 3D renderer integration pending.",
        ],
        nextActions: ["Connect 3D Renderer", "Generate Final Exact Views", "Engineer Review"],
        model: result.model,
        queue: result.queue,
        renderedOutputs: result.renderedOutputs,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Exterior run render failed" },
      { status: 500 }
    );
  }
}
