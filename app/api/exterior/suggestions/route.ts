import { NextResponse } from "next/server";
import { getActiveExteriorConcept, formatSuggestionsForChat } from "@/lib/exterior-concept-store";
import { getExteriorSuggestions } from "@/lib/exterior-suggestions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const concept = await getActiveExteriorConcept(projectId);
    const suggestions = getExteriorSuggestions();

    return NextResponse.json({
      ok: true,
      hasActiveConcept: Boolean(concept),
      concept,
      suggestions,
      chatText: concept
        ? `Master exterior concept locked hai. Is design ke basis par aap ye outputs generate kar sakte hain:\n\n${formatSuggestionsForChat()}\n\nAap option name likh sakte ho, jaise: "Gate Focus View generate karo".`
        : "Abhi master exterior concept locked nahi hai. Pehle Generate Master Exterior Concept karo, fir usko Lock Master Concept karo.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Suggestions failed" }, { status: 500 });
  }
}
