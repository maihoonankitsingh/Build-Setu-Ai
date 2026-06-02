import { NextResponse } from "next/server";
import { runProjectModelRenderPlaceholder } from "@/lib/project-model-store";

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

    const result = await runProjectModelRenderPlaceholder({
      projectId,
      toolSlug,
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      action: "renderer_placeholder_ready",
      message: result.message,
      output: {
        title: "Renderer Placeholder Ready",
        summary: "Exact view render job placeholder complete ho gaya hai. Actual 3D renderer abhi connected nahi hai.",
        imageUrl: result.model.sourceMasterImageUrl || "",
        sections: [
          "Model status: RENDER_READY",
          `Render queue items: ${result.queue.length}`,
          `Outputs moved to RENDER_READY: ${result.renderedOutputs.length}`,
          "Actual 3D render engine integration pending hai.",
        ],
        nextActions: ["Connect 3D Renderer", "Download Render Job JSON", "Engineer Review"],
        model: result.model,
        queue: result.queue,
        renderedOutputs: result.renderedOutputs,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Run render placeholder failed" },
      { status: 500 }
    );
  }
}
