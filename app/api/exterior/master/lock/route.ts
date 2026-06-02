import { NextResponse } from "next/server";
import { lockExteriorConcept } from "@/lib/exterior-concept-store";
import type { ExteriorConcept } from "@/lib/exterior-concept-store";
import { getExteriorSuggestions } from "@/lib/exterior-suggestions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const conceptId = String(body.conceptId || "");

    if (!projectId || !conceptId) {
      return NextResponse.json({ error: "projectId and conceptId required" }, { status: 400 });
    }

    const concept: ExteriorConcept = await lockExteriorConcept(projectId, conceptId);

    return NextResponse.json({
      ok: true,
      message: "Master exterior concept locked.",
      concept,
      suggestions: getExteriorSuggestions(),
      output: {
        title: "Master Exterior Concept Locked",
        summary: "Future exterior views will use this concept as source of truth.",
        imageUrl: concept.masterImageUrl,
        sections: [
          "Locked master image is now active.",
          "Future views should preserve this design DNA.",
          "Available next outputs: presentation views, detail views, architectural views and technical outputs.",
        ],
        nextActions: ["Suggest Next Views", "Generate Front Left 3/4", "Generate Gate Focus", "Generate Working Elevation"],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Lock failed" }, { status: 500 });
  }
}
