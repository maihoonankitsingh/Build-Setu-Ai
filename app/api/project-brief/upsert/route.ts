import { NextResponse } from "next/server";
import { getProjectBriefCompleteness, getProjectStages, upsertProjectBrief } from "@/lib/project-brief-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "");
    const briefInput = body.brief && typeof body.brief === "object" ? body.brief : body;

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const brief = await upsertProjectBrief(projectId, briefInput);
    const completeness = getProjectBriefCompleteness(brief);
    const stages = await getProjectStages(projectId);

    return NextResponse.json({
      ok: true,
      action: "project_brief_saved",
      brief,
      completeness,
      stages,
      output: {
        title: "Project Brief Saved",
        summary: `Client brief save ho gaya. Completeness: ${completeness.score}%.`,
        sections: [
          `Plot: ${brief.site.plotWidthFt || "?"} x ${brief.site.plotDepthFt || "?"} ft`,
          `Facing: ${brief.site.facing || "Not specified"}`,
          `Floors: ${brief.building.floors || "Not specified"}`,
          `Budget: ${brief.preferences.budgetRange || "Not specified"}`,
        ],
        nextActions: ["Start Planning", "Create Floor Plan", "Open Exterior Tool"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project brief save failed" },
      { status: 500 }
    );
  }
}
