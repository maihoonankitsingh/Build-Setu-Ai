import { NextResponse } from "next/server";
import { addExteriorView, getActiveExteriorConcept, getExteriorConcept } from "@/lib/exterior-concept-store";
import { upsertProjectConceptOutput } from "@/lib/project-concept-store";
import { findSuggestionByViewType, getExteriorSuggestions } from "@/lib/exterior-suggestions";
import { attachUniversalQualityBrainToPrompt } from "@/lib/agent-knowledge/universal-quality-brain";

function cameraRule(viewType: string) {
  const v = String(viewType || "").toUpperCase();

  if (v.includes("FRONT_LEFT")) {
    return "Generate a front-left 3/4 perspective. Left side depth must be visible. Do not create a straight front elevation.";
  }

  if (v.includes("FRONT_RIGHT")) {
    return "Generate a front-right 3/4 perspective. Right side depth must be visible. Do not create a straight front elevation.";
  }

  if (v.includes("STREET")) {
    return "Generate a wider street context view with road, boundary wall, gate and surrounding context visible.";
  }

  if (v.includes("EVENING") || v.includes("NIGHT")) {
    return "Generate an evening hero render with warm facade lights, balcony/soffit glow and premium client presentation feel.";
  }

  if (v.includes("DAYLIGHT")) {
    return "Generate a clean daylight render where facade materials and colors are clearly visible.";
  }

  if (v.includes("GATE")) {
    return "Generate a gate focus view. Gate, boundary wall, entrance pillar and front access should be prominent.";
  }

  if (v.includes("BALCONY")) {
    return "Generate a balcony focus view. Balcony railing, soffit, light, facade frame and wall treatment should be prominent.";
  }

  if (v.includes("ENTRANCE")) {
    return "Generate an entrance focus view. Main door, porch, steps, entry wall and lighting should be prominent.";
  }

  if (v.includes("MATERIAL")) {
    return "Generate a material close-up view showing wood texture, grey/white finish, railing and light details.";
  }

  if (v.includes("WORKING")) {
    return "Generate a clean conceptual working elevation style image with facade notes/dimension intent. Keep it contractor-reference oriented.";
  }

  if (v.includes("SIDE")) {
    return "Generate a side elevation/perspective concept consistent with the master facade design language.";
  }

  if (v.includes("REAR")) {
    return "Generate a rear elevation concept consistent with the master facade design language.";
  }

  return "Generate the requested view as a full-size standalone image.";
}


function internalImageApiUrl() {
  const port = process.env.PORT || "3016";
  return `http://127.0.0.1:${port}/api/ai/generate-image`;
}


function requiresExact3DView(viewType: string) {
  const v = String(viewType || "").toUpperCase();
  return [
    "FRONT_LEFT_3_4",
    "FRONT_RIGHT_3_4",
    "STREET_WIDE",
    "LEFT_SIDE_ELEVATION",
    "RIGHT_SIDE_ELEVATION",
    "REAR_ELEVATION",
    "WORKING_ELEVATION",
    "FRONT_ELEVATION_DRAFT",
  ].includes(v);
}


// BUILDSETU_QUALITY_BRAIN_EXTERIOR_VIEW_V5B
function attachExteriorViewQualityBrainV5B(body: any, prompt: string, concept: any, viewType: string) {
  return attachUniversalQualityBrainToPrompt({
    basePrompt: [
      prompt,
      `View type: ${viewType || ""}`,
      concept?.title ? `Locked concept: ${concept.title}` : "",
      concept?.masterImageUrl ? `Locked master image: ${concept.masterImageUrl}` : "",
    ].filter(Boolean).join("\n"),
    projectId: body?.projectId || concept?.projectId || body?.projectContext?.projectId || "global",
    domain: "exterior",
    projectTitle: concept?.title || body?.projectTitle || body?.projectName || "Selected Project",
    projectContext: body?.projectContext || body,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const conceptId = String(body.conceptId || "");
    const viewType = String(body.viewType || "").toUpperCase();
    const userInstruction = String(body.userInstruction || body.prompt || "").trim();

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    if (!viewType) {
      return NextResponse.json({ error: "viewType required" }, { status: 400 });
    }

    const concept = conceptId
      ? await getExteriorConcept(projectId, conceptId)
      : await getActiveExteriorConcept(projectId);

    if (!concept) {
      return NextResponse.json(
        { error: "No active master exterior concept found. Generate and lock master concept first." },
        { status: 400 }
      );
    }

    const suggestion = findSuggestionByViewType(viewType);
    const title = suggestion?.label || viewType.replace(/_/g, " ");

    if (requiresExact3DView(viewType)) {
      const request = await upsertProjectConceptOutput({
        id: `exactview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        conceptId: concept.id,
        toolSlug: "exterior-elevation",
        toolName: "Exterior Elevation",
        conceptType: "exterior",
        outputType: viewType,
        title,
        prompt: userInstruction,
        generationMode: "exact_view_requires_3d_bim",
        jsonData: {
          requestedViewType: viewType,
          masterConceptId: concept.id,
          masterImageUrl: concept.masterImageUrl,
          reason: "Exact same elevation with different camera views requires a 3D/BIM/massing pipeline.",
        },
        status: "PENDING_3D_MODEL",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        action: "exact_view_requires_3d",
        message: `${title} exact view request saved. Exact same elevation view needs 3D/BIM model generation.`,
        concept,
        view: request,
        output: {
          title,
          summary: "Exact same elevation ke alag angle ke liye 3D/BIM model required hai. Random AI image generation block kar diya gaya hai.",
          imageUrl: concept.masterImageUrl,
          sections: [
            "Current master elevation locked hai.",
            "AI-only image generation same exact house rotate nahi kar sakta.",
            "Is requested view ko Exact View Queue me save kar diya gaya hai.",
            "Next required step: 3D/BIM/massing model generate karke same model se camera renders nikaalne honge.",
          ],
          nextActions: [
            "Create 3D/BIM Model",
            "Generate Exact Front Left View",
            "Generate Exact Front Right View",
            "Generate Exact Street View",
          ],
          concept,
          view: request,
        },
      });
    }

    const dna = concept.designDna || {};
    const qualityUserInstructionV5B = attachExteriorViewQualityBrainV5B(body, userInstruction, concept, viewType);

    const finalPrompt = [
      `Generate ${title} for the locked master exterior concept.`,
      "",
      "LOCKED MASTER DESIGN DNA:",
      `Style: ${dna.style || "Modern Indian residential facade"}`,
      `Floor count: ${dna.floorCount || "As per project brief"}`,
      `Massing: ${dna.massing || "Modern cuboid massing"}`,
      `Facade composition: ${dna.facadeComposition || "Front facade with balcony, gate and boundary wall"}`,
      `Primary colors: ${(dna.primaryColors || []).join(", ") || "white, grey, black"}`,
      `Accent materials: ${(dna.accentMaterials || []).join(", ") || "wood texture"}`,
      `Balcony: ${dna.balconyStyle || "front balcony with black railing"}`,
      `Railing: ${dna.railingStyle || "black slim railing"}`,
      `Gate: ${dna.gateStyle || "modern black gate"}`,
      `Boundary wall: ${dna.boundaryWallStyle || "modern matching boundary wall"}`,
      `Windows: ${dna.windowStyle || "black-framed rectangular windows"}`,
      `Door: ${dna.doorStyle || "wooden main door"}`,
      `Lighting: ${dna.lightingStyle || "warm facade lighting"}`,
      `Parking: ${dna.parkingPlacement || "front parking"}`,
      `Roof/parapet: ${dna.rooflineParapet || "flat roof with clean parapet"}`,
      "",
      "VIEW RULE:",
      cameraRule(viewType),
      "",
      "CONSISTENCY RULE:",
      "Preserve the master concept's design behavior, material family, facade language, railing style, window style, gate language, colors and overall architectural identity.",
      "Do not create a different architectural style.",
      "Do not generate a collage, board or multiple views.",
      "Generate one high-quality full-size standalone image.",
      "",
      qualityUserInstructionV5B ? `User instruction: ${qualityUserInstructionV5B}` : "",
      "",
      "Note: this is AI concept-level visualization under the locked master concept. Exact 3D geometry requires future BIM/3D render pipeline.",
    ].join("\n");

    const imageRes = await fetch(internalImageApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        projectTitle: concept.title,
        toolSlug: "exterior-elevation",
        toolName: "Exterior Elevation",
        renderType: `Exterior Elevation - ${title}`,
        roomType: title,
        viewLabel: title,
        prompt: finalPrompt,
        masterDesignMode: "locked_exterior_concept_dna_guided",
      }),
    });

    const imageData = await imageRes.json().catch(() => ({}));

    if (!imageRes.ok || !imageData?.imageUrl) {
      return NextResponse.json(
        { error: imageData?.error || `Image generation failed HTTP ${imageRes.status}` },
        { status: imageRes.status || 500 }
      );
    }

    const view = await addExteriorView({
      projectId,
      conceptId: concept.id,
      viewType,
      title,
      imageUrl: imageData.imageUrl,
      publicUrl: imageData.publicUrl || "",
      file: imageData.file || "",
      prompt: finalPrompt,
      generationMode: "master_dna_guided_generation",
    });

    return NextResponse.json({
      ok: true,
      message: `${title} generated under locked master exterior concept.`,
      concept,
      view,
      suggestions: getExteriorSuggestions(),
      output: {
        title,
        summary: "Generated using locked master exterior design DNA.",
        imageUrl: imageData.imageUrl,
        sections: [
          "Output belongs to active Exterior Concept Set.",
          "Design DNA was injected from locked master image concept.",
          "For exact construction-grade camera consistency, future 3D/BIM render pipeline is required.",
        ],
        nextActions: ["Suggest Next Views", "Generate another view", "Create Working Elevation", "Export concept set"],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "View generation failed" }, { status: 500 });
  }
}
