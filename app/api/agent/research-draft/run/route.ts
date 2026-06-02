import { NextRequest, NextResponse } from "next/server";
import { runBuildSetuAgent } from "@/lib/agents/buildsetu-agent";
import { maybeCreateResearchDraftFromAgentRun } from "@/lib/agents/buildsetu-agent-research-draft-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input = {
      projectId: safeString(body.projectId, "agent-research-draft-project"),
      toolSlug: safeString(body.toolSlug, "floor-plan-ai"),
      toolName: safeString(body.toolName, "BuildSetu Agent"),
      action: safeString(body.action, "generate"),
      message: safeString(body.message),
      projectTitle: safeString(body.projectTitle, "Agent Research Draft")
    };

    if (!input.message) {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_ERROR",
          errors: ["message is required"]
        },
        { status: 400 }
      );
    }

    const agentResult = await runBuildSetuAgent(input as any);
    const researchDraft = await maybeCreateResearchDraftFromAgentRun(input, agentResult as any);

    return NextResponse.json({
      ok: true,
      agent: agentResult,
      researchDraft
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "AGENT_RESEARCH_DRAFT_RUN_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
