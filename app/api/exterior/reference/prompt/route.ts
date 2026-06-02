import { NextResponse } from "next/server";
import { getExteriorReferenceContext } from "@/lib/exterior-reference-store";
import {
  buildReferenceDrivenMasterPrompt,
  buildReferenceDrivenViewPrompt,
  buildReferenceInstructionSummary,
  EXTERIOR_VIEW_LABELS,
} from "@/lib/exterior-reference-prompts";
import { getActiveProjectConcept } from "@/lib/project-concept-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const projectTitle = String(body.projectTitle || "");
    const mode = String(body.mode || "master");
    const userPrompt = String(body.prompt || body.userPrompt || "");
    const viewType = String(body.viewType || "FRONT_LEFT_3_4").toUpperCase();
    const referenceAssetIds = Array.isArray(body.referenceAssetIds) ? body.referenceAssetIds.map(String) : [];

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const referenceContext = await getExteriorReferenceContext(projectId, referenceAssetIds);

    if (mode === "view") {
      const concept = await getActiveProjectConcept(projectId, "exterior-elevation");
      const masterImageUrl = String(body.masterImageUrl || concept?.masterImageUrl || "");

      const prompt = buildReferenceDrivenViewPrompt({
        viewType,
        viewLabel: EXTERIOR_VIEW_LABELS[viewType] || viewType,
        masterImageUrl,
        userPrompt,
        references: referenceContext.references,
      });

      return NextResponse.json({
        ok: true,
        mode: "view",
        viewType,
        viewLabel: EXTERIOR_VIEW_LABELS[viewType] || viewType,
        prompt,
        referenceContext,
        concept: concept
          ? {
              id: concept.id,
              title: concept.title,
              status: concept.status,
              masterImageUrl: concept.masterImageUrl,
            }
          : null,
      });
    }

    const prompt = buildReferenceDrivenMasterPrompt({
      projectTitle,
      userPrompt,
      references: referenceContext.references,
    });

    return NextResponse.json({
      ok: true,
      mode: "master",
      prompt,
      referenceSummary: buildReferenceInstructionSummary(referenceContext.references),
      referenceContext,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reference prompt failed" },
      { status: 500 }
    );
  }
}
