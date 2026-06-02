import { NextRequest, NextResponse } from "next/server";
import { getProjectPlanLock, lockLatestProjectPlan } from "@/lib/planning/project-plan-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = String(url.searchParams.get("projectId") || "").trim();

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "projectId is required" },
      { status: 400 }
    );
  }

  const lock = await getProjectPlanLock(projectId);

  return NextResponse.json({
    ok: true,
    source: "project_plan_lock_v1",
    locked: Boolean(lock),
    lock,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const result = await lockLatestProjectPlan({
    projectId: body?.projectId,
    projectTitle: body?.projectTitle,
    force: body?.force === true,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
