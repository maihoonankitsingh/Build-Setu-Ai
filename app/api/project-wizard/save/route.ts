import { NextResponse } from "next/server";
import { buildProjectContext } from "@/lib/project-context-builder";
import { getProjectBriefCompleteness, getProjectStages, upsertProjectBrief } from "@/lib/project-brief-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "");
    const toolSlug = String(body.nextToolSlug || "planning");
    const briefInput = body.brief && typeof body.brief === "object" ? body.brief : body;

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const brief = await upsertProjectBrief(projectId, briefInput);
    const completeness = getProjectBriefCompleteness(brief);
    const stages = await getProjectStages(projectId);
    const context = await buildProjectContext({ projectId, toolSlug });

    return NextResponse.json({
      ok: true,
      action: "project_wizard_saved",
      brief,
      completeness,
      stages,
      context,
      output: {
        title: "Project Wizard Saved",
        summary: "Project brief wizard data save ho gaya. Ab selected tool project context ke saath start ho sakta hai.",
        sections: [
          `Brief completeness: ${completeness.score}%`,
          `Next tool: ${context.rule.label}`,
          context.nextRecommendedAction,
        ],
        nextActions: ["Start Planning", "Open Tool Page", "Upload References"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project wizard save failed" },
      { status: 500 }
    );
  }
}
