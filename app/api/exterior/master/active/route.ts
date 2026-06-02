import { NextResponse } from "next/server";
import { getActiveExteriorConcept, listExteriorViews } from "@/lib/exterior-concept-store";
import { getExteriorSuggestions } from "@/lib/exterior-suggestions";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const concept = await getActiveExteriorConcept(projectId);
    const views = concept ? await listExteriorViews(projectId, concept.id) : [];

    return NextResponse.json({
      ok: true,
      hasActiveConcept: Boolean(concept),
      concept,
      views,
      suggestions: getExteriorSuggestions(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Active concept lookup failed" }, { status: 500 });
  }
}
