import { NextResponse } from "next/server";
import { getProjectStages, updateProjectStage, type ProjectStageId, type ProjectStageStatus } from "@/lib/project-brief-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const stages = await getProjectStages(projectId);

    return NextResponse.json({
      ok: true,
      stages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project stages lookup failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "");
    const stageId = String(body.stageId || "") as ProjectStageId;
    const status = String(body.status || "") as ProjectStageStatus;

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    if (!stageId || !status) {
      return NextResponse.json({ ok: false, error: "stageId and status required" }, { status: 400 });
    }

    const stages = await updateProjectStage(projectId, stageId, status);

    return NextResponse.json({
      ok: true,
      action: "project_stage_updated",
      stages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project stage update failed" },
      { status: 500 }
    );
  }
}
