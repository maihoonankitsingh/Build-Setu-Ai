import { NextRequest, NextResponse } from "next/server";
import { generateLockedWorkingSet } from "@/lib/planning/project-plan-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "locked_project_working_set_v1",
    status: "POST projectId + prompt to generate working set from locked plan",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const result = await generateLockedWorkingSet({
    projectId: body?.projectId,
    projectTitle: body?.projectTitle,
    prompt: body?.prompt || body?.request || "",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
