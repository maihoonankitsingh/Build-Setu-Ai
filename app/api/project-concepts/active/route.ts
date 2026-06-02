import { NextResponse } from "next/server";
import { getActiveProjectConcept, listProjectConceptOutputs } from "@/lib/project-concept-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const projectId = String(url.searchParams.get("projectId") || "");
    const toolSlug = String(url.searchParams.get("toolSlug") || "exterior-elevation");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const concept = await getActiveProjectConcept(projectId, toolSlug);
    const outputs = concept ? await listProjectConceptOutputs(projectId, concept.id) : [];

    return NextResponse.json({
      ok: true,
      hasActiveConcept: Boolean(concept),
      concept,
      outputs,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Active project concept lookup failed" }, { status: 500 });
  }
}
