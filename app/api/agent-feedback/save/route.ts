import { NextRequest, NextResponse } from "next/server";
import {
  addBuildSetuFeedback,
  type BuildSetuFeedbackDomain,
  type BuildSetuFeedbackType,
} from "@/lib/agent-feedback/feedback-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDomain(value: unknown): BuildSetuFeedbackDomain {
  const d = safe(value || "general");
  const allowed: BuildSetuFeedbackDomain[] = [
    "floor_plan",
    "interior",
    "exterior",
    "structure",
    "mep",
    "boq",
    "material",
    "general",
  ];
  return allowed.includes(d as BuildSetuFeedbackDomain) ? (d as BuildSetuFeedbackDomain) : "general";
}

function normalizeType(value: unknown): BuildSetuFeedbackType {
  const t = safe(value || "general_note");
  const allowed: BuildSetuFeedbackType[] = [
    "good_output",
    "bad_output",
    "correction",
    "style_preference",
    "safety_rule",
    "training_example",
    "general_note",
  ];
  return allowed.includes(t as BuildSetuFeedbackType) ? (t as BuildSetuFeedbackType) : "general_note";
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = safe(body.projectId || "global");
    const userId = safe(body.userId || "anonymous");
    const feedbackText = safe(body.feedbackText || body.feedback || body.note);
    const correctedOutput = safe(body.correctedOutput || body.approvedOutput);
    const agentOutput = safe(body.agentOutput || body.output);
    const userPrompt = safe(body.userPrompt || body.prompt);

    if (!feedbackText && !correctedOutput && !agentOutput) {
      return NextResponse.json(
        {
          ok: false,
          code: "FEEDBACK_REQUIRED",
          error: "feedbackText, correctedOutput, or agentOutput is required.",
        },
        { status: 400 },
      );
    }

    const entry = addBuildSetuFeedback({
      projectId,
      userId,
      scope: body.scope === "global" || projectId === "global" ? "global" : "project",
      type: normalizeType(body.type),
      domain: normalizeDomain(body.domain),
      title: safe(body.title),
      userPrompt,
      agentOutput,
      correctedOutput,
      feedbackText,
      rating: Number(body.rating || 0),
      tags: body.tags,
      raw: {
        source: "api-agent-feedback-save",
        conversationId: safe(body.conversationId),
        messageId: safe(body.messageId),
        projectTitle: safe(body.projectTitle),
        createdFrom: safe(body.createdFrom || "manual"),
      },
    });

    return NextResponse.json({
      ok: true,
      entry,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "FEEDBACK_SAVE_FAILED",
        error: error?.message || "Failed to save feedback.",
      },
      { status: 500 },
    );
  }
}
