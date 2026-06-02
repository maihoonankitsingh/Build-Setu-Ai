import { NextResponse } from "next/server";
import { createOrUpdateProjectModel } from "@/lib/project-model-store";

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

    const result = await createOrUpdateProjectModel({
      projectId,
      toolSlug: "exterior-elevation",
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      action: "exterior_model_spec_ready",
      message: "Exterior 3D/BIM model spec ready.",
      ...result,
      output: {
        title: "Exterior 3D/BIM Model Spec Ready",
        summary: "Same locked exterior concept ke exact views ke liye model spec create ho gaya hai.",
        imageUrl: result.concept.masterImageUrl || "",
        sections: [
          "Model status: SPEC_READY",
          `Pending exact views: ${result.pendingOutputs.length}`,
          "Next step: actual 3D/BIM model generation.",
        ],
        nextActions: ["Generate 3D Model", "Render Exact Views", "Engineer Review"],
        concept: result.concept,
        model: result.model,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Exterior model create failed" },
      { status: 500 }
    );
  }
}
