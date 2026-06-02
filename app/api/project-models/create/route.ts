import { NextResponse } from "next/server";
import { createOrUpdateProjectModel } from "@/lib/project-model-store";

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

    const { concept, model, pendingOutputs } = await createOrUpdateProjectModel({
      projectId,
      toolSlug,
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      action: "model_spec_ready",
      message: "3D/BIM model specification created. Exact view renders can be produced after model generation.",
      concept,
      model,
      pendingOutputs,
      output: {
        title: "3D/BIM Model Spec Ready",
        summary: "Locked master concept se project-wise exterior massing/model spec create ho gaya hai.",
        imageUrl: concept.masterImageUrl || "",
        sections: [
          "Model status: SPEC_READY",
          `Exact view queue items: ${pendingOutputs.length}`,
          "Next step: actual 3D/BIM geometry/model generation.",
          "Render step: same model se front-left, front-right, street-wide, side/rear views nikaalne honge.",
        ],
        nextActions: ["Generate 3D Model", "Render Exact Views", "Engineer Review"],
        concept,
        model,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project model creation failed" },
      { status: 500 }
    );
  }
}
