import { NextRequest, NextResponse } from "next/server";
import { runArchitectPlanningAgent } from "@/lib/floor-plan/architect-agent";
import { generateExactFloorPlanAsset } from "@/lib/floor-plan/exact-planner";
import { buildKnowledgeContextForAgent } from "@/lib/agent-knowledge/knowledge-store";
import { attachUniversalQualityBrainToPrompt } from "@/lib/agent-knowledge/universal-quality-brain";

// BUILDSETU_UNIVERSAL_QUALITY_BRAIN_V4_ROUTE
function attachFloorPlanUniversalQualityBrainV4(body: any, prompt: string) {
  return attachUniversalQualityBrainToPrompt({
    basePrompt: prompt,
    projectId: body?.projectId || body?.projectContext?.projectId || "global",
    domain: "floor_plan",
    projectTitle: body?.projectTitle || body?.projectName || body?.title || "",
    projectContext: body?.projectContext || body?.requirements || body?.projectBrief || {},
  });
}


// BUILDSETU_FLOOR_PLAN_KNOWLEDGE_ROUTE_INJECTION_V2C
function buildFloorPlanKnowledgePromptV2C(body: any) {
  const projectId = String(body?.projectId || body?.projectContext?.projectId || "global").trim() || "global";

  const projectKnowledge = buildKnowledgeContextForAgent({
    projectId,
    domain: "floor_plan",
    limit: 12,
  });

  const globalKnowledge =
    projectId === "global"
      ? ""
      : buildKnowledgeContextForAgent({
          projectId: "global",
          domain: "floor_plan",
          limit: 8,
        });

  const knowledge = [projectKnowledge, globalKnowledge].filter(Boolean).join("\n\n");
  const rawPrompt = String(body?.prompt || body?.message || body?.instruction || "").trim();

  if (!knowledge) return rawPrompt;

  return [
    rawPrompt,
    "BUILDSETU LEARNED PROJECT KNOWLEDGE:",
    knowledge,
    "Knowledge usage rule: apply saved project/global planning rules as memory. Do not override explicit selected project plot size/facing/BHK unless user says to change them.",
  ].filter(Boolean).join("\n\n");
}


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const promptWithKnowledgeV2C = attachFloorPlanUniversalQualityBrainV4(body, buildFloorPlanKnowledgePromptV2C(body));

    const agent = await runArchitectPlanningAgent({
      projectTitle: body?.projectTitle || body?.projectName || "Selected Project",
      prompt: promptWithKnowledgeV2C,
      projectContext: body?.projectContext || body?.project || {},
      useWeb: body?.useWeb === true,
    });

    if (agent.status === "need_more_details") {
      return NextResponse.json({
        ok: true,
        status: "need_more_details",
        assistantMessage: agent.assistantMessage,
        missingQuestions: agent.missingQuestions,
        agent,
      });
    }

    const exact = await generateExactFloorPlanAsset({
      ...body,
      prompt: agent.exactPlannerPrompt || body?.prompt || "",
      imagePrompt: agent.exactPlannerPrompt || body?.imagePrompt || body?.prompt || "",
      architectAgent: agent,
    });

    return NextResponse.json({
      ok: true,
      status: "planned",
      assistantMessage: agent.assistantMessage,
      agent,
      exact,
      imageUrl: exact.imageUrl,
      publicUrl: exact.publicUrl,
      plan: exact.plan,
      source: "architect_agent_plus_exact_planner",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Architect planning failed",
      },
      { status: 500 }
    );
  }
}
