import { NextResponse } from "next/server";
import { getExteriorReferenceContext } from "@/lib/exterior-reference-store";
import { buildReferenceDrivenViewPrompt, EXTERIOR_VIEW_LABELS } from "@/lib/exterior-reference-prompts";
import { getActiveProjectConcept, upsertProjectConceptOutput } from "@/lib/project-concept-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFromReq(req: Request) {
  return new URL(req.url).origin;
}

function makeId(prefix = "refview") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractImageUrl(data: any) {
  return (
    data?.imageUrl ||
    data?.publicUrl ||
    data?.fileUrl ||
    data?.url ||
    data?.output?.imageUrl ||
    data?.image?.url ||
    data?.asset?.imageUrl ||
    ""
  );
}


function internalApiUrl(path: string) {
  const port = process.env.PORT || "3016";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `http://127.0.0.1:${port}${cleanPath}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const userPrompt = String(body.prompt || body.userPrompt || "");
    const viewType = String(body.viewType || "FRONT_LEFT_3_4").toUpperCase();
    const dryRun = Boolean(body.dryRun);
    const referenceAssetIds = Array.isArray(body.referenceAssetIds) ? body.referenceAssetIds.map(String) : [];

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const concept = await getActiveProjectConcept(projectId, "exterior-elevation");

    if (!concept || !concept.masterImageUrl) {
      return NextResponse.json({
        ok: true,
        action: "master_required",
        chatText: "Pehle Master Exterior Concept generate aur lock karo. Uske baad reference-driven views generate honge.",
        output: {
          title: "Master Required",
          summary: "Locked master image ke bina same-house view generate nahi karna chahiye.",
          sections: [
            "Step 1: Generate Master Concept",
            "Step 2: Lock Master",
            "Step 3: Generate selected view using locked master as primary reference",
          ],
        },
      });
    }

    const referenceContext = await getExteriorReferenceContext(projectId, referenceAssetIds);
    const viewLabel = EXTERIOR_VIEW_LABELS[viewType] || viewType;

    const finalPrompt = buildReferenceDrivenViewPrompt({
      viewType,
      viewLabel,
      masterImageUrl: concept.masterImageUrl,
      userPrompt,
      references: referenceContext.references,
    });

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        action: "reference_view_prompt_ready",
        dryRun: true,
        viewType,
        viewLabel,
        prompt: finalPrompt,
        concept: {
          id: concept.id,
          title: concept.title,
          status: concept.status,
          masterImageUrl: concept.masterImageUrl,
        },
        referenceContext,
        output: {
          title: `${viewLabel} Prompt Ready`,
          summary: "Dry-run mode: image generate nahi hua. Strong reference-driven prompt ready hai.",
          imageUrl: concept.masterImageUrl,
          sections: [
            "Primary reference: locked master image",
            `Selected view: ${viewLabel}`,
            `Support references: ${referenceContext.references.length}`,
            "One view per generation only",
          ],
          nextActions: ["Generate selected view", "Regenerate same view", "Save to project gallery"],
        },
      });
    }

    const aiRes = await fetch(internalApiUrl("/api/ai/generate-image"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        toolSlug: "exterior-elevation",
        toolName: "Exterior Elevation",
        renderType: `Exterior ${viewLabel}`,
        roomType: viewLabel,
        prompt: finalPrompt,
        imagePrompt: finalPrompt,
        generationMode: "reference_driven_ai_view",
        primaryReferenceImageUrl: concept.masterImageUrl,
        referenceImageUrls: [concept.masterImageUrl, ...referenceContext.referenceImageUrls].filter(Boolean),
        referenceAssetIds,
      }),
    });

    const aiData = await aiRes.json().catch(() => ({}));
    const imageUrl = extractImageUrl(aiData);
    const now = new Date().toISOString();

    const output = await upsertProjectConceptOutput({
      id: makeId(),
      projectId,
      conceptId: concept.id,
      toolSlug: "exterior-elevation",
      toolName: "Exterior Elevation",
      conceptType: "exterior",
      outputType: viewType,
      title: viewLabel,
      imageUrl,
      publicUrl: imageUrl,
      file: String(aiData?.file || aiData?.asset?.file || ""),
      prompt: finalPrompt,
      generationMode: "reference_driven_ai_view",
      jsonData: {
        aiOk: Boolean(aiRes.ok && aiData?.ok !== false),
        aiStatus: aiRes.status,
        primaryReferenceImageUrl: concept.masterImageUrl,
        supportReferenceImageUrls: referenceContext.referenceImageUrls,
        referenceAssetIds,
        note: "Locked master image is the primary reference. Support references are secondary.",
      },
      status: imageUrl ? "AI_FINAL_DRAFT" : "REVIEW_REQUIRED",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      ok: true,
      action: imageUrl ? "reference_view_generated" : "reference_view_prompt_saved",
      viewType,
      viewLabel,
      prompt: finalPrompt,
      concept: {
        id: concept.id,
        title: concept.title,
        status: concept.status,
        masterImageUrl: concept.masterImageUrl,
      },
      referenceContext,
      aiResponse: aiData,
      view: output,
      output: {
        title: viewLabel,
        summary: imageUrl
          ? "Locked master image ke basis par selected view generate ho gaya."
          : "Image route ne image URL return nahi kiya. Prompt/output record save ho gaya.",
        imageUrl: imageUrl || concept.masterImageUrl,
        sections: [
          "Primary reference: locked master image",
          `Selected view: ${viewLabel}`,
          `Support references: ${referenceContext.references.length}`,
          "Rule: same house, camera angle only",
        ],
        nextActions: ["Generate another selected view", "Regenerate same view", "Save/export package"],
        view: output,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Reference view generation failed" },
      { status: 500 }
    );
  }
}
