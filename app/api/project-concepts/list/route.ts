import { NextResponse } from "next/server";
import { listProjectConcepts, listProjectConceptOutputs } from "@/lib/project-concept-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const projectId = String(url.searchParams.get("projectId") || "");
    const toolSlug = String(url.searchParams.get("toolSlug") || "");
    const conceptId = String(url.searchParams.get("conceptId") || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const concepts = await listProjectConcepts(projectId, toolSlug || undefined);
    const outputs = await listProjectConceptOutputs(projectId, conceptId || undefined);

    return NextResponse.json({
      ok: true,
      concepts,
      outputs,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Project concept list failed" }, { status: 500 });
  }
}
