import { NextResponse } from "next/server";
import {
  formatSuggestionsForChat,
  getActiveExteriorConcept,
  getLatestExteriorConcept,
  lockExteriorConcept,
} from "@/lib/exterior-concept-store";
import { findSuggestionByViewType, getExteriorSuggestions } from "@/lib/exterior-suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function internalUrl(path: string) {
  const port = process.env.PORT || "3016";
  return `http://127.0.0.1:${port}${path}`;
}

function normalizedText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s/+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isExteriorGenerateMasterIntent(text: string) {
  const t = normalizedText(text);

  return (
    t.includes("generate master") ||
    t.includes("master concept") ||
    t.includes("master exterior") ||
    t.includes("final master") ||
    t.includes("master front") ||
    t.includes("first final image") ||
    t.includes("pehle ek final") ||
    t.includes("master image") ||
    t.includes("generate one final master") ||
    t.includes("generate master exterior concept") ||
    t.includes("master exterior concept generate") ||
    t.includes("master concept generate")
  );
}

function isLockIntent(text: string) {
  const t = normalizedText(text);
  return t.includes("lock") || t.includes("master lock") || t.includes("lock master") || t.includes("final karo");
}

function isSuggestIntent(text: string) {
  const t = normalizedText(text);
  return (
    t.includes("suggest") ||
    t.includes("suggestion") ||
    t.includes("next view") ||
    t.includes("next output") ||
    t.includes("aage") ||
    t.includes("option") ||
    t.includes("kya generate")
  );
}


function isCreateModelIntent(text: string) {
  const t = normalizedText(text);
  return (
    t.includes("create 3d") ||
    t.includes("generate 3d") ||
    t.includes("3d model") ||
    t.includes("bim model") ||
    t.includes("create bim") ||
    t.includes("generate bim") ||
    t.includes("model spec") ||
    t.includes("exact model")
  );
}


function isPrepareRenderIntent(text: string) {
  const t = normalizedText(text);
  return (
    t.includes("prepare render") ||
    t.includes("render queue") ||
    t.includes("render exact") ||
    t.includes("exact render") ||
    t.includes("run renderer") ||
    t.includes("model ready") ||
    t.includes("render views")
  );
}


function isRunRendererIntent(text: string) {
  const t = normalizedText(text);
  return (
    t.includes("run renderer") ||
    t.includes("execute renderer") ||
    t.includes("renderer execute") ||
    t.includes("render final") ||
    t.includes("final exact render") ||
    t.includes("generate final exact") ||
    t.includes("render job")
  );
}


function isBlenderRenderIntent(text: string) {
  const t = normalizedText(text);
  return (
    t.includes("blender render") ||
    t.includes("blender se render") ||
    t.includes("real render") ||
    t.includes("actual render") ||
    t.includes("real 3d render") ||
    t.includes("3d render karo") ||
    t.includes("final blender") ||
    t.includes("real image render") ||
    t.includes("png render")
  );
}

function detectViewType(text: string) {
  const t = normalizedText(text);

  // Master generation text contains normal design elements like gate/balcony/elevation.
  // Do not treat those as requested view types.
  if (isExteriorGenerateMasterIntent(text)) return "";

  if (t.includes("front left") || t.includes("left 3/4") || t.includes("left three")) return "FRONT_LEFT_3_4";
  if (t.includes("front right") || t.includes("right 3/4") || t.includes("right three")) return "FRONT_RIGHT_3_4";
  if (t.includes("street wide") || t.includes("wide view") || t.includes("road view") || t.includes("street view")) return "STREET_WIDE";
  if (t.includes("evening hero") || t.includes("night view") || t.includes("night render") || t.includes("hero view")) return "EVENING_HERO";
  if (t.includes("daylight view") || t.includes("day view") || t.includes("morning view")) return "DAYLIGHT_VIEW";

  if (t.includes("gate focus") || t.includes("gate view") || t.includes("gate close") || t.includes("gate detail")) return "GATE_FOCUS";
  if (t.includes("balcony focus") || t.includes("balcony view") || t.includes("balcony close") || t.includes("balcony detail")) return "BALCONY_FOCUS";
  if (t.includes("entrance focus") || t.includes("entry focus") || t.includes("entrance view") || t.includes("main door view")) return "ENTRANCE_FOCUS";
  if (t.includes("material close") || t.includes("material view") || t.includes("material sheet")) return "MATERIAL_CLOSEUP";

  if (t.includes("working elevation") || t.includes("dimension elevation") || t.includes("elevation with dimensions")) return "WORKING_ELEVATION";
  if (t.includes("front elevation draft") || t.includes("flat elevation")) return "FRONT_ELEVATION_DRAFT";
  if (t.includes("left side elevation") || t.includes("left side view")) return "LEFT_SIDE_ELEVATION";
  if (t.includes("right side elevation") || t.includes("right side view")) return "RIGHT_SIDE_ELEVATION";
  if (t.includes("rear elevation") || t.includes("back side view") || t.includes("rear view")) return "REAR_ELEVATION";
  if (t.includes("facade material") || t.includes("material sheet")) return "FACADE_MATERIAL_SHEET";

  const exact = getExteriorSuggestions().find((s) => {
    const label = s.label.toLowerCase();
    const viewType = s.viewType.toLowerCase().replace(/_/g, " ");
    return t.includes(label) || t.includes(viewType);
  });

  return exact?.viewType || "";
}

function messageOutput(
  title: string,
  summary: string,
  sections: string[] = [],
  imageUrl = "",
  extra: any = {}
) {
  return {
    title,
    summary,
    imageUrl,
    sections,
    nextActions: ["Suggest Next Views", "Generate another view", "Lock/Replace Master Concept"],
    ...extra,
  };
}

function compactConcept(concept: any) {
  if (!concept) return null;

  return {
    id: concept.id || "",
    projectId: concept.projectId || "",
    title: concept.title || "Exterior Concept",
    status: concept.status || "",
    isActive: Boolean(concept.isActive),
    masterImageUrl: concept.masterImageUrl || "",
  };
}

function compactModel(model: any) {
  if (!model) return null;

  const renderQueue = Array.isArray(model?.modelSpec?.renderQueue) ? model.modelSpec.renderQueue : [];
  const renderPipeline = model?.modelSpec?.renderPipeline || {};

  return {
    id: model.id || "",
    projectId: model.projectId || "",
    toolSlug: model.toolSlug || "exterior-elevation",
    conceptId: model.conceptId || "",
    modelType: model.modelType || "",
    status: model.status || "",
    sourceConceptTitle: model.sourceConceptTitle || "",
    sourceMasterImageUrl: model.sourceMasterImageUrl || "",
    renderQueueCount: renderQueue.length,
    renderPipelineStatus: renderPipeline.status || "",
    renderer: renderPipeline.renderer || "",
    updatedAt: model.updatedAt || "",
  };
}

function compactQueue(queue: any) {
  if (!Array.isArray(queue)) return [];

  return queue.map((item) => ({
    outputId: item.outputId || "",
    outputType: item.outputType || "",
    title: item.title || item.outputType || "Render View",
    status: item.status || "",
    renderStatus: item.renderStatus || "",
    realImageUrl: item.realImageUrl || "",
    realRenderer: item.realRenderer || "",
    realRenderedAt: item.realRenderedAt || "",
  }));
}

function compactRenderedOutputs(outputs: any) {
  if (!Array.isArray(outputs)) return [];

  return outputs.map((output) => ({
    id: output.id || "",
    outputType: output.outputType || "",
    title: output.title || output.outputType || "Rendered Output",
    status: output.status || "",
    imageUrl: output.imageUrl || output.publicUrl || output?.jsonData?.realImageUrl || "",
    file: output.file || output?.jsonData?.realRenderFile || "",
    generationMode: output.generationMode || "",
    renderer: output?.jsonData?.realRenderer || "",
    renderedAt: output?.jsonData?.realRenderedAt || output.updatedAt || "",
  }));
}

function compactOutput(base: any, extra: any = {}) {
  return {
    title: extra.title || base?.title || "Output Ready",
    summary: extra.summary || base?.summary || "Output ready.",
    imageUrl: extra.imageUrl || base?.imageUrl || "",
    sections: Array.isArray(base?.sections) ? base.sections : [],
    nextActions: Array.isArray(base?.nextActions) ? base.nextActions : [],
    ...extra,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "default-project");
    const projectTitle = String(body.projectTitle || "Selected Project");
    const message = String(body.message || body.userText || body.prompt || "").trim();
    const currentOutput = body.currentOutput || {};
    const suggestions = getExteriorSuggestions();

    const activeConcept = await getActiveExteriorConcept(projectId);
    const latestConcept = await getLatestExteriorConcept(projectId);

    if (isLockIntent(message)) {
      const conceptId =
        String(body.conceptId || "") ||
        String(currentOutput?.concept?.id || "") ||
        String(latestConcept?.id || "");

      if (!conceptId) {
        return NextResponse.json({
          ok: true,
          action: "lock_missing",
          chatText: "Lock karne ke liye pehle Master Exterior Concept generate karo.",
          suggestions,
          output: messageOutput("Master Concept Missing", "Pehle master exterior concept generate karna hoga."),
        });
      }

      const concept = await lockExteriorConcept(projectId, conceptId);

      return NextResponse.json({
        ok: true,
        action: "lock_master",
        chatText: `Master exterior concept lock ho gaya hai. Ab isi design ke basis par next views generate honge.\n\n${formatSuggestionsForChat()}`,
        concept,
        suggestions,
        output: messageOutput(
          "Master Exterior Concept Locked",
          "Future exterior outputs will use this locked concept.",
          [
            "Master image is now active.",
            "Next suggestions locked master concept ke basis par aayenge.",
            "Aap option name likh sakte ho: Gate Focus View, Street Wide View, Working Elevation.",
          ],
          concept.masterImageUrl,
          { concept }
        ),
      });
    }

    if (isSuggestIntent(message)) {
      const concept = activeConcept || latestConcept || null;

      return NextResponse.json({
        ok: true,
        action: "suggestions",
        hasActiveConcept: Boolean(activeConcept),
        concept,
        suggestions,
        chatText: activeConcept
          ? `Master exterior concept locked hai. Is design ke basis par aap ye outputs generate kar sakte hain:\n\n${formatSuggestionsForChat()}

Aap option name likh sakte ho, jaise: "Gate Focus View generate karo".`
          : `Abhi master exterior concept locked nahi hai.\n\nPehle ek Master Exterior Concept generate karo, fir Lock Master Concept karo.\n\nAvailable future outputs:\n${formatSuggestionsForChat()}`,
        output: activeConcept
          ? messageOutput("Suggested Exterior Outputs", "Locked master concept ke basis par next outputs ready hain.", [
              formatSuggestionsForChat(),
            ], activeConcept.masterImageUrl, { concept: activeConcept })
          : messageOutput("Master Concept Required", "Pehle master exterior concept generate/lock karo.", [formatSuggestionsForChat()]),
      });
    }

    if (isExteriorGenerateMasterIntent(message) || !activeConcept) {
      const masterRes = await fetch(internalUrl("/api/exterior/master/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectTitle,
          prompt: message || "Generate one final master exterior image.",
        }),
      });

      const masterData = await masterRes.json().catch(() => ({}));

      if (!masterRes.ok || !masterData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: masterData?.error || `Master generation failed HTTP ${masterRes.status}`,
          },
          { status: masterRes.status || 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        action: "generate_master",
        chatText:
          "Master exterior concept ready hai. Ab `lock master` likho, fir main isi design ke basis par next views suggest/generate karunga.",
        concept: masterData.concept,
        view: masterData.view,
        suggestions: masterData.suggestions || suggestions,
        output: {
          ...(masterData.output || {}),
          concept: masterData.concept,
          view: masterData.view,
        },
      });
    }

    if (isCreateModelIntent(message)) {
      const concept = activeConcept || latestConcept || null;

      if (!concept) {
        return NextResponse.json({
          ok: true,
          action: "model_requires_master",
          chatText: "3D/BIM model banane ke liye pehle master exterior concept generate aur lock karo.",
          suggestions,
          output: messageOutput("Master Concept Required", "3D/BIM model ke liye locked master concept required hai.", [
            "Step 1: Generate Master Exterior Concept",
            "Step 2: Lock Master Concept",
            "Step 3: Create 3D/BIM Model",
          ]),
        });
      }

      const modelRes = await fetch(internalUrl("/api/exterior/model/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: concept.id,
        }),
      });

      const modelData = await modelRes.json().catch(() => ({}));

      if (!modelRes.ok || !modelData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: modelData?.error || `Model spec failed HTTP ${modelRes.status}`,
          },
          { status: modelRes.status || 500 }
        );
      }

      const cleanConcept = compactConcept(modelData.concept);
      const cleanModel = compactModel(modelData.model);

      return NextResponse.json({
        ok: true,
        action: "model_spec_ready",
        chatText: `3D/BIM model spec ready hai. ${modelData.pendingOutputs?.length || 0} exact view request queue me linked hain.`,
        hasActiveConcept: Boolean(cleanConcept),
        concept: cleanConcept,
        model: cleanModel,
        suggestions,
        output: compactOutput(modelData.output, {
          imageUrl: modelData.output?.imageUrl || cleanConcept?.masterImageUrl || "",
          concept: cleanConcept,
          model: cleanModel,
        }),
      });
    }

    if (isPrepareRenderIntent(message)) {
      const concept = activeConcept || latestConcept || null;

      if (!concept) {
        return NextResponse.json({
          ok: true,
          action: "render_requires_master",
          chatText: "Exact render queue ke liye pehle master exterior concept lock karo.",
          suggestions,
          output: messageOutput("Master Concept Required", "Exact render queue ke liye locked master concept required hai.", [
            "Step 1: Generate Master Exterior Concept",
            "Step 2: Lock Master Concept",
            "Step 3: Create 3D/BIM Model",
            "Step 4: Prepare Render Queue",
          ]),
        });
      }

      const renderRes = await fetch(internalUrl("/api/exterior/model/prepare-render"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: concept.id,
        }),
      });

      const renderData = await renderRes.json().catch(() => ({}));

      if (!renderRes.ok || !renderData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: renderData?.error || `Render queue failed HTTP ${renderRes.status}`,
          },
          { status: renderRes.status || 500 }
        );
      }

      const cleanConcept = compactConcept(renderData.concept || concept);
      const cleanModel = compactModel(renderData.model);
      const cleanQueue = compactQueue(renderData.queue);

      return NextResponse.json({
        ok: true,
        action: "render_queue_ready",
        chatText: `Exact render queue ready hai. ${cleanQueue.length} exact view item renderer ke liye ready hain.`,
        hasActiveConcept: Boolean(cleanConcept),
        concept: cleanConcept,
        model: cleanModel,
        queue: cleanQueue,
        suggestions,
        output: compactOutput(renderData.output, {
          imageUrl: renderData.output?.imageUrl || cleanConcept?.masterImageUrl || "",
          concept: cleanConcept,
          model: cleanModel,
          queue: cleanQueue,
        }),
      });
    }

    if (isRunRendererIntent(message)) {
      const concept = activeConcept || latestConcept || null;

      if (!concept) {
        return NextResponse.json({
          ok: true,
          action: "renderer_requires_master",
          chatText: "Renderer chalane ke liye pehle master exterior concept lock karo.",
          suggestions,
          output: messageOutput("Master Concept Required", "Renderer ke liye locked master concept required hai.", [
            "Step 1: Generate Master Exterior Concept",
            "Step 2: Lock Master Concept",
            "Step 3: Create 3D/BIM Model",
            "Step 4: Prepare Render Queue",
            "Step 5: Run Renderer",
          ]),
        });
      }

      const renderRes = await fetch(internalUrl("/api/exterior/model/run-render"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: concept.id,
        }),
      });

      const renderData = await renderRes.json().catch(() => ({}));

      if (!renderRes.ok || !renderData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: renderData?.error || `Renderer failed HTTP ${renderRes.status}`,
          },
          { status: renderRes.status || 500 }
        );
      }

      const cleanConcept = compactConcept(concept);
      const cleanModel = compactModel(renderData.model);
      const cleanQueue = compactQueue(renderData.queue);
      const cleanRenderedOutputs = compactRenderedOutputs(renderData.renderedOutputs);

      return NextResponse.json({
        ok: true,
        action: "renderer_placeholder_ready",
        chatText: `Renderer placeholder complete hai. ${cleanRenderedOutputs.length} exact view output RENDER_READY me move hua. Actual 3D renderer integration abhi pending hai.`,
        hasActiveConcept: Boolean(cleanConcept),
        concept: cleanConcept,
        model: cleanModel,
        queue: cleanQueue,
        renderedOutputs: cleanRenderedOutputs,
        suggestions,
        output: compactOutput(renderData.output, {
          imageUrl: cleanRenderedOutputs[0]?.imageUrl || renderData.output?.imageUrl || cleanConcept?.masterImageUrl || "",
          concept: cleanConcept,
          model: cleanModel,
          queue: cleanQueue,
          renderedOutputs: cleanRenderedOutputs,
        }),
      });
    }

    if (isBlenderRenderIntent(message)) {
      return NextResponse.json({
        ok: true,
        action: "blender_render_disabled",
        chatText: "Blender render abhi client output ke liye disabled hai. Current Blender quality professional exterior render ke level ki nahi hai. Client ke liye AI Master Exterior Image aur reference-driven view generation use karo.",
        suggestions,
        output: messageOutput(
          "Blender Render Disabled",
          "Current Blender auto-render client-ready nahi hai. Isliye low-quality render dikhane ke bajay is flow ko disabled rakha gaya hai.",
          [
            "Use AI Master Exterior Image for client presentation.",
            "Use locked master image as reference for next views.",
            "Use reference-driven single-view generation.",
          ],
          activeConcept?.masterImageUrl || latestConcept?.masterImageUrl || ""
        ),
      });
    }

    if (false && isBlenderRenderIntent(message)) {
      const concept = activeConcept || latestConcept || null;

      if (!concept) {
        return NextResponse.json({
          ok: true,
          action: "blender_render_requires_master",
          chatText: "Blender render ke liye pehle master exterior concept generate aur lock karo.",
          suggestions,
          output: messageOutput("Master Concept Required", "Blender render ke liye locked master concept required hai.", [
            "Step 1: Generate Master Exterior Concept",
            "Step 2: Lock Master Concept",
            "Step 3: Create 3D/BIM Model",
            "Step 4: Prepare Render Queue",
            "Step 5: Blender Render",
          ]),
        });
      }

      const blenderRes = await fetch(internalUrl("/api/exterior/model/blender-render"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: concept.id,
        }),
      });

      const blenderData = await blenderRes.json().catch(() => ({}));

      if (!blenderRes.ok || !blenderData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: blenderData?.error || `Blender render failed HTTP ${blenderRes.status}`,
          },
          { status: blenderRes.status || 500 }
        );
      }

      const cleanConcept = compactConcept(concept);
      const cleanModel = compactModel(blenderData.model);
      const cleanQueue = compactQueue(blenderData.queue);
      const cleanRenderedOutputs = compactRenderedOutputs(blenderData.renderedOutputs);
      const renderedCount = cleanRenderedOutputs.length;
      const firstImage = cleanRenderedOutputs[0]?.imageUrl || blenderData.output?.imageUrl || "";

      return NextResponse.json({
        ok: true,
        action: "blender_real_render_ready",
        chatText: renderedCount
          ? `Blender render ready hai. ${renderedCount} real render output available hai.`
          : "Blender render ke liye koi pending renderable item nahi mila. Pehle exact view request, model spec aur render queue prepare karo.",
        hasActiveConcept: Boolean(cleanConcept),
        concept: cleanConcept,
        model: cleanModel,
        queue: cleanQueue,
        renderedOutputs: cleanRenderedOutputs,
        suggestions,
        output: compactOutput(blenderData.output, {
          title: blenderData.output?.title || "Blender Real Render Ready",
          summary: blenderData.output?.summary || "Blender se real PNG render available hai.",
          imageUrl: firstImage || cleanConcept?.masterImageUrl || "",
          concept: cleanConcept,
          model: cleanModel,
          queue: cleanQueue,
          renderedOutputs: cleanRenderedOutputs,
        }),
      });
    }

    const viewType = detectViewType(message);

    // REFERENCE_DRIVEN_VIEW_CHAT_FLOW
    // Client-facing exterior views should use locked master image as primary reference.
    // This avoids low-quality Blender output and avoids random redesigns.
    if (viewType) {
      const concept = activeConcept || latestConcept || null;

      if (!concept || !concept.masterImageUrl || concept.status !== "LOCKED") {
        return NextResponse.json({
          ok: true,
          action: "master_required_for_reference_view",
          chatText: "Pehle Master Exterior Concept generate aur lock karo. Uske baad same master image ke basis par selected views generate honge.",
          hasActiveConcept: Boolean(concept),
          concept: compactConcept(concept),
          suggestions,
          output: messageOutput(
            "Master Concept Required",
            "Same-house view generation ke liye locked master image required hai.",
            [
              "Step 1: Generate Master Exterior Concept",
              "Step 2: Lock Master",
              "Step 3: Generate one selected view at a time",
              "Example: Front Left 3/4 View generate karo",
            ],
            concept?.masterImageUrl || ""
          ),
        });
      }

      const refViewRes = await fetch(internalUrl("/api/exterior/reference-view/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          viewType,
          prompt: message,
          dryRun: false,
        }),
      });

      const refViewData = await refViewRes.json().catch(() => ({}));

      if (!refViewRes.ok || !refViewData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: refViewData?.error || `Reference view generation failed HTTP ${refViewRes.status}`,
          },
          { status: refViewRes.status || 500 }
        );
      }

      const cleanConcept = compactConcept(refViewData.concept || concept);
      const generatedView = refViewData.view || refViewData.output?.view || null;
      const imageUrl = refViewData.output?.imageUrl || generatedView?.imageUrl || concept.masterImageUrl || "";

      return NextResponse.json({
        ok: true,
        action: refViewData.action || "reference_view_generated",
        chatText: `${refViewData.viewLabel || generatedView?.title || "Selected View"} ready hai. Locked master image ko primary reference use karke generate hua hai.`,
        hasActiveConcept: Boolean(cleanConcept),
        concept: cleanConcept,
        view: generatedView
          ? {
              id: generatedView.id || "",
              title: generatedView.title || refViewData.viewLabel || "",
              outputType: generatedView.outputType || viewType,
              status: generatedView.status || "",
              imageUrl,
              generationMode: generatedView.generationMode || "reference_driven_ai_view",
            }
          : null,
        suggestions,
        output: compactOutput(refViewData.output, {
          title: refViewData.output?.title || refViewData.viewLabel || "Reference View Generated",
          summary:
            refViewData.output?.summary ||
            "Locked master image ke basis par selected view generate ho gaya.",
          imageUrl,
          sections: [
            "Primary reference: locked master image",
            `Selected view: ${refViewData.viewLabel || viewType}`,
            "Rule: same house, camera angle only",
            "One view per generation",
          ],
          nextActions: [
            "Generate Front Right 3/4 View",
            "Generate Street Wide View",
            "Generate Day View",
            "Generate Gate Focus View",
          ],
          concept: cleanConcept,
          view: generatedView
            ? {
                id: generatedView.id || "",
                title: generatedView.title || refViewData.viewLabel || "",
                outputType: generatedView.outputType || viewType,
                status: generatedView.status || "",
                imageUrl,
                generationMode: generatedView.generationMode || "reference_driven_ai_view",
              }
            : null,
        }),
      });
    }

    // Legacy view path below is intentionally bypassed for client-facing exterior views.
    const legacyViewType = "";


    if (legacyViewType) {
      if (!activeConcept) {
        return NextResponse.json({
          ok: true,
          action: "view_requires_master",
          chatText:
            "Is view ke liye pehle master concept lock karo. Pehle `Generate Master Exterior Concept`, fir `lock master`.",
          suggestions,
          output: messageOutput("Master Concept Required", "Requested view ke liye locked master concept required hai.", [
            "Step 1: Generate Master Exterior Concept",
            "Step 2: Lock Master Concept",
            `Step 3: Generate ${findSuggestionByViewType(viewType)?.label || viewType}`,
          ]),
        });
      }

      const viewRes = await fetch(internalUrl("/api/exterior/view/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: activeConcept.id,
          viewType,
          userInstruction: message,
        }),
      });

      const viewData = await viewRes.json().catch(() => ({}));

      if (!viewRes.ok || !viewData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: viewData?.error || `View generation failed HTTP ${viewRes.status}`,
          },
          { status: viewRes.status || 500 }
        );
      }

      const exact3d = viewData?.action === "exact_view_requires_3d";

      return NextResponse.json({
        ok: true,
        action: exact3d ? "exact_view_requires_3d" : "generate_view",
        chatText: exact3d
          ? `${viewData.view?.title || "Exact view"} request save ho gaya hai. Same elevation ka exact alag angle generate karne ke liye 3D/BIM model required hai; random AI image block kar diya gaya hai.`
          : `${viewData.view?.title || "Exterior view"} ready hai. Ye current locked master design ke basis par generate hua hai.`,
        concept: viewData.concept,
        view: viewData.view,
        suggestions: viewData.suggestions || suggestions,
        output: {
          ...(viewData.output || {}),
          concept: viewData.concept,
          view: viewData.view,
        },
      });
    }



    return NextResponse.json({
      ok: true,
      action: "default_suggestions",
      concept: activeConcept,
      suggestions,
      chatText: `Master exterior concept active hai. Aap next output choose kar sakte hain:\n\n${formatSuggestionsForChat()}`,
      output: messageOutput("Suggested Exterior Outputs", "Active master concept ke basis par next outputs ready hain.", [
        formatSuggestionsForChat(),
      ], activeConcept.masterImageUrl, { concept: activeConcept }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Exterior chat failed" },
      { status: 500 }
    );
  }
}
