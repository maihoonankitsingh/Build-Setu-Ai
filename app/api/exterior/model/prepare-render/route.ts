import { NextResponse } from "next/server";
import { prepareProjectModelRenderQueue } from "@/lib/project-model-store";

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

    const result = await prepareProjectModelRenderQueue({
      projectId,
      toolSlug: "exterior-elevation",
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      action: "exterior_render_queue_ready",
      message: "Exterior exact render queue prepared.",
      ...result,
      output: {
        title: "Exterior Exact Render Queue Ready",
        summary: "Same model spec se exact camera renders nikaalne ke liye queue ready hai.",
        imageUrl: result.model.sourceMasterImageUrl || "",
        sections: [
          "Model status: MODEL_READY",
          `Render queue items: ${result.queue.length}`,
          `Outputs moved to PENDING_RENDER: ${result.updatedOutputs.length}`,
          "Next phase: renderer execution will create final exact view outputs.",
        ],
        nextActions: ["Run Renderer", "Render Exact Front Left", "Render Exact Front Right", "Render Exact Street View"],
        model: result.model,
        queue: result.queue,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Exterior prepare render failed" },
      { status: 500 }
    );
  }
}
