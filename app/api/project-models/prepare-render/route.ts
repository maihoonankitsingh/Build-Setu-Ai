import { NextResponse } from "next/server";
import { prepareProjectModelRenderQueue } from "@/lib/project-model-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const toolSlug = String(body.toolSlug || "exterior-elevation");
    const conceptId = String(body.conceptId || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const result = await prepareProjectModelRenderQueue({
      projectId,
      toolSlug,
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      action: "render_queue_ready",
      message: "Model render queue prepared. Exact views are now waiting for actual renderer execution.",
      ...result,
      output: {
        title: "Exact Render Queue Ready",
        summary: "3D/BIM model spec MODEL_READY hai. Exact view queue renderer ke liye ready hai.",
        imageUrl: result.model.sourceMasterImageUrl || "",
        sections: [
          "Model status: MODEL_READY",
          `Render queue items: ${result.queue.length}`,
          `Outputs moved to PENDING_RENDER: ${result.updatedOutputs.length}`,
          "Next step: actual 3D renderer integration.",
        ],
        nextActions: ["Run Renderer", "Render Exact Views", "Engineer Review"],
        model: result.model,
        queue: result.queue,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Prepare render queue failed" },
      { status: 500 }
    );
  }
}
