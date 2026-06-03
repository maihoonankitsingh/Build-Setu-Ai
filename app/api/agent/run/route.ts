import { NextRequest, NextResponse } from "next/server";
import { runBuildSetuAgent } from "@/lib/agents/buildsetu-agent";

import { maybeCreateResearchDraftFromAgentRun } from "@/lib/agents/buildsetu-agent-research-draft-runtime";



function getAgentRunResearchDraftMessage(result: any): string {
  const finalPrompt = typeof result?.finalPrompt === "string" ? result.finalPrompt : "";
  const match = finalPrompt.match(/USER REQUEST:\s*([\s\S]*?)(?:\nOUTPUT RULES:|\nPROJECT CONTEXT:|$)/);
  if (match?.[1]?.trim()) return match[1].trim();
  if (typeof result?.responseText === "string") return result.responseText;
  return "";
}


// BUILDSETU_AGENT_PROJECT_ID_SANITIZE_V2

function stripBuildSetuInternalFeedbackContext(value: unknown) {
  // BUILDSETU_AGENT_RUN_STRIP_FEEDBACK_CONTEXT_V1
  const text = String(value ?? "");
  const marker = "BUILDSETU CORE AGENT FEEDBACK CONTEXT:";
  const start = text.indexOf(marker);
  if (start < 0) return text;

  const afterStart = text.slice(start);
  const boundaryCandidates = [
    "\n\nBuildSetu Reasoning Controller:",
    "\n\nBuildSetu Output Quality Evaluator:",
    "\n\nBuildSetu Internet Knowledge Update Router:",
    "\n\nBuildSetu AEC knowledge requirements:",
    "\n\nBUILDSETU PLANNER TRAINING LAYER:",
  ];

  let end = text.length;
  for (const boundary of boundaryCandidates) {
    const index = afterStart.indexOf(boundary);
    if (index > 0) end = Math.min(end, start + index);
  }

  return `${text.slice(0, start)}${text.slice(end)}`
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeBuildSetuAgentRunResultForResponse(result: any): any {
  if (!result || typeof result !== "object") return result;
  return {
    ...result,
    finalPrompt: stripBuildSetuInternalFeedbackContext(result.finalPrompt),
  };
}

function sanitizeBuildSetuProjectId(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    const decoded = decodeURIComponent(raw);

    const fromProjectParam = decoded.match(/[?&]projectId=([a-zA-Z0-9_-]{10,})/);
    if (fromProjectParam?.[1]) return fromProjectParam[1];

    const firstToken = decoded.split(/\s+/)[0] || "";
    const firstTokenMatch = firstToken.match(/^([a-zA-Z0-9_-]{10,})$/);
    if (firstTokenMatch?.[1]) return firstTokenMatch[1];

    const anyToken = decoded.match(/([a-zA-Z0-9_-]{10,})/);
    if (anyToken?.[1]) return anyToken[1];
  } catch {}

  const fallback = raw.match(/([a-zA-Z0-9_-]{10,})/);
  return fallback?.[1] || raw;
}


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = sanitizeBuildSetuProjectId(body.projectId || body.selectedProjectId || "");
    const toolSlug = String(body.toolSlug || body.slug || "magic-brief").trim();
    const toolName = String(body.toolName || body.name || toolSlug).trim();
    const action = String(body.action || "chat") as any;
    const message = String(body.message || body.prompt || body.userText || "").trim();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "projectId required" },
        { status: 400 }
      );
    }

    const result = await runBuildSetuAgent({
      projectId,
      toolSlug,
      toolName,
      action,
      message,
    });

    // AGENT_RUN_RESEARCH_DRAFT_CONNECTOR_ACTIVE
    const researchDraft1Input = {
      projectId: typeof result.projectId === "string" ? result.projectId : "",
      toolSlug: typeof result.toolSlug === "string" ? result.toolSlug : "",
      toolName: "",
      action: typeof result.action === "string" ? result.action : "",
      message: getAgentRunResearchDraftMessage(result),
      projectTitle: ""
    };

    const researchDraft1 = await maybeCreateResearchDraftFromAgentRun(researchDraft1Input, result).catch((error) => ({
      created: false,
      error: "AGENT_RESEARCH_DRAFT_CREATE_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    }));

    return NextResponse.json({ ...sanitizeBuildSetuAgentRunResultForResponse(result), researchDraft: researchDraft1 });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "BuildSetu agent failed",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const projectId = sanitizeBuildSetuProjectId(url.searchParams.get("projectId") || "");
    const toolSlug = String(url.searchParams.get("toolSlug") || "magic-brief").trim();
    const toolName = String(url.searchParams.get("toolName") || toolSlug).trim();
    const action = String(url.searchParams.get("action") || "chat") as any;
    const message = String(url.searchParams.get("message") || "").trim();

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "projectId required" },
        { status: 400 }
      );
    }

    const result = await runBuildSetuAgent({
      projectId,
      toolSlug,
      toolName,
      action,
      message,
    });

    // AGENT_RUN_RESEARCH_DRAFT_CONNECTOR_ACTIVE
    const researchDraft2Input = {
      projectId: typeof result.projectId === "string" ? result.projectId : "",
      toolSlug: typeof result.toolSlug === "string" ? result.toolSlug : "",
      toolName: "",
      action: typeof result.action === "string" ? result.action : "",
      message: getAgentRunResearchDraftMessage(result),
      projectTitle: ""
    };

    const researchDraft2 = await maybeCreateResearchDraftFromAgentRun(researchDraft2Input, result).catch((error) => ({
      created: false,
      error: "AGENT_RESEARCH_DRAFT_CREATE_FAILED",
      message: error instanceof Error ? error.message : "Unknown error"
    }));

    return NextResponse.json({ ...sanitizeBuildSetuAgentRunResultForResponse(result), researchDraft: researchDraft2 });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "BuildSetu agent failed",
      },
      { status: 500 }
    );
  }
}
