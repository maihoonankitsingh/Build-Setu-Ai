import { NextRequest, NextResponse } from "next/server";
import { runUniversalPlanningAgent } from "@/lib/planning/universal-planning-agent";
import { attachUniversalQualityBrainToPrompt } from "@/lib/agent-knowledge/universal-quality-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// BUILDSETU_QUALITY_BRAIN_UNIVERSAL_AGENT_V5B
function detectUniversalAgentDomainV5B(body: any) {
  const raw = String(body?.domain || body?.toolSlug || body?.toolName || body?.prompt || body?.userPrompt || body?.requirement || "").toLowerCase();
  if (/floor|plan|naksha|layout/.test(raw)) return "floor_plan";
  if (/interior|room|kitchen|bedroom|living|furniture|ceiling/.test(raw)) return "interior";
  if (/exterior|elevation|facade|front|gate|balcony/.test(raw)) return "exterior";
  if (/structure|column|beam|slab|footing|foundation|bbs/.test(raw)) return "structure";
  if (/boq|estimate|quantity|rate|cost/.test(raw)) return "boq";
  return "general";
}

function attachUniversalAgentQualityBrainV5B(body: any) {
  const basePrompt = String(body?.prompt || body?.userPrompt || body?.requirement || "");
  return attachUniversalQualityBrainToPrompt({
    basePrompt,
    projectId: body?.projectId || body?.projectContext?.projectId || body?.project?.id || "global",
    domain: detectUniversalAgentDomainV5B(body) as any,
    projectTitle: body?.projectTitle || body?.projectName || "",
    projectContext: body?.project || body?.projectContext || body,
  });
}


function safeUniversalAgentText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isReadOnlySavedKnowledgeUniversalAgentRequest(body: any) {
  const text = String(body?.prompt || body?.userPrompt || body?.requirement || body?.message || "").toLowerCase();

  const hasSavedKnowledgeIntent =
    text.includes("saved knowledge") ||
    text.includes("saved pdf") ||
    text.includes("saved audio") ||
    text.includes("saved video") ||
    text.includes("knowledge me") ||
    text.includes("knowledge mein") ||
    text.includes("saved file") ||
    text.includes("saved document");

  if (!hasSavedKnowledgeIntent) return false;

  const hasHardPlanningIntent =
    text.includes("full planning package") ||
    text.includes("working drawing") ||
    text.includes("generate floor plan") ||
    text.includes("floor plan banao") ||
    text.includes("plan generate") ||
    text.includes("drawing generate") ||
    text.includes("presentation plan") ||
    text.includes("image generate");

  return !hasHardPlanningIntent;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // BUILDSETU_UNIVERSAL_AGENT_READONLY_KNOWLEDGE_ANSWER_V1
    if (isReadOnlySavedKnowledgeUniversalAgentRequest(body)) {
      const userMessage = safeUniversalAgentText(body?.prompt || body?.userPrompt || body?.requirement || body?.message);
      const projectId = safeUniversalAgentText(body?.projectId || body?.projectContext?.projectId || body?.project?.id, "global");
      const userId = safeUniversalAgentText(body?.userId || body?.user?.id || body?.session?.userId, "anonymous");
      const planTier = safeUniversalAgentText(body?.planTier || body?.tier || body?.package, "premium");
      const projectTitle = safeUniversalAgentText(body?.projectTitle || body?.projectName, "");

      let answerText = "";
      let answerSource = "project-chat-saved-knowledge";

      try {
        const answerRes = await fetch(new URL("/api/project-chat/send", req.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: req.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            projectId,
            userId,
            planTier,
            projectTitle,
            message: userMessage,
          }),
        });

        const answerData = await answerRes.json().catch(() => ({}));
        answerText = safeUniversalAgentText(
          answerData?.reply ||
          answerData?.assistantMessage?.content ||
          answerData?.message ||
          ""
        );

        if (!answerRes.ok || !answerText) {
          answerSource = "readonly-knowledge-fallback";
          answerText = "Saved knowledge context available hai, lekin final answer generate nahi ho paya. Project-chat response verify karo.";
        }
      } catch (error: any) {
        answerSource = "readonly-knowledge-fallback";
        answerText = `Saved knowledge answer generate nahi ho paya: ${error?.message || "unknown error"}`;
      }

      return NextResponse.json({
        ok: true,
        source: "universal_agent_readonly_knowledge_answer_v1",
        status: "ready",
        projectId,
        projectTitle,
        taskType: "readonly_knowledge_answer",
        assistantMessage: answerText,
        output: {
          title: "Universal Agent saved knowledge answer",
          text: answerText,
          status: "READY",
          source: answerSource,
        },
        readyToGenerate: false,
        canImage: false,
      });
    }

    const result = await runUniversalPlanningAgent({
      prompt: attachUniversalAgentQualityBrainV5B(body),
      projectTitle: body?.projectTitle || body?.projectName || "",
      project: body?.project || body?.projectContext || {},
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "universal_planning_agent_v1",
        error: error?.message || "Universal planning failed",
      },
      { status: 500 }
    );
  }
}


export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "universal_planning_agent_v1",
    status: "POST /api/planning/universal-agent is ready",
  });
}
