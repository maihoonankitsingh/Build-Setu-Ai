import { NextResponse } from "next/server";
import { getProjectBrief, getProjectBriefCompleteness, getProjectStages } from "@/lib/project-brief-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const brief = await getProjectBrief(projectId);
    const completeness = getProjectBriefCompleteness(brief);
    const stages = await getProjectStages(projectId);

    return NextResponse.json({
      ok: true,
      hasBrief: Boolean(brief),
      brief,
      completeness,
      stages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project brief lookup failed" },
      { status: 500 }
    );
  }
}
