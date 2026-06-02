import { NextResponse } from "next/server";
import { createExteriorConcept, addExteriorView } from "@/lib/exterior-concept-store";
import { getExteriorSuggestions } from "@/lib/exterior-suggestions";
import { attachUniversalQualityBrainToPrompt } from "@/lib/agent-knowledge/universal-quality-brain";


function internalImageApiUrl() {
  const port = process.env.PORT || "3016";
  return `http://127.0.0.1:${port}/api/ai/generate-image`;
}


// BUILDSETU_QUALITY_BRAIN_EXTERIOR_MASTER_V5B
function attachExteriorMasterQualityBrainV5B(body: any, prompt: string) {
  return attachUniversalQualityBrainToPrompt({
    basePrompt: prompt,
    projectId: body?.projectId || body?.projectContext?.projectId || "global",
    domain: "exterior",
    projectTitle: body?.projectTitle || body?.projectName || "Selected Project",
    projectContext: body?.projectContext || body,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "default-project");
    const projectTitle = String(body.projectTitle || "Selected Project");
    const userPrompt = String(body.prompt || body.userPrompt || "").trim();

    const qualityUserPromptV5B = attachExteriorMasterQualityBrainV5B(body, userPrompt);

    if (!userPrompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const finalPrompt = [
      "Generate ONE final master exterior concept image.",
      "This image will be locked as the source of truth for all future exterior views.",
      "Create a high-quality standalone front/hero view.",
      "Do not create collage, board, multi-view sheet or multiple houses.",
      "",
      `Project: ${projectTitle}`,
      "",
      "User requirement:",
      qualityUserPromptV5B,
      "",
      "Must show: facade, balcony, gate, boundary wall, window language, material palette, lighting style and parking/front access where applicable.",
    ].join("\n");

    const imageRes = await fetch(internalImageApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        projectTitle,
        toolSlug: "exterior-elevation",
        toolName: "Exterior Elevation",
        renderType: "Exterior Elevation - Master Exterior Concept",
        roomType: "Master Exterior Concept",
        viewLabel: "Master Exterior Concept",
        prompt: finalPrompt,
      }),
    });

    const imageData = await imageRes.json().catch(() => ({}));

    if (!imageRes.ok || !imageData?.imageUrl) {
      return NextResponse.json(
        { error: imageData?.error || `Image generation failed HTTP ${imageRes.status}` },
        { status: imageRes.status || 500 }
      );
    }

    const concept = await createExteriorConcept({
      projectId,
      projectTitle,
      masterImageUrl: imageData.imageUrl,
      masterPublicUrl: imageData.publicUrl || "",
      masterFile: imageData.file || "",
      sourcePrompt: userPrompt,
      status: "DRAFT",
      isActive: false,
    });

    const view = await addExteriorView({
      projectId,
      conceptId: concept.id,
      viewType: "MASTER_FRONT",
      title: "Master Front Exterior Image",
      imageUrl: imageData.imageUrl,
      publicUrl: imageData.publicUrl || "",
      file: imageData.file || "",
      prompt: finalPrompt,
      generationMode: "master_generation",
    });

    return NextResponse.json({
      ok: true,
      message: "Master exterior concept generated. Lock this concept to use it for future views.",
      concept,
      view,
      suggestions: getExteriorSuggestions(),
      output: {
        title: "Master Exterior Concept",
        summary: "Master image ready. Lock this concept before generating future views.",
        imageUrl: imageData.imageUrl,
        sections: [
          "Master exterior image generated.",
          "Use Lock Master Concept to make this design the active source of truth.",
          "After locking, chat can suggest front-left, front-right, street-wide, gate focus, balcony focus, working elevation and more.",
        ],
        nextActions: ["Lock Master Concept", "Suggest Next Views", "Generate View From Master"],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Master generate failed" }, { status: 500 });
  }
}
