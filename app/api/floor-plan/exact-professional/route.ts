import { NextRequest, NextResponse } from "next/server";
import { generateExactProfessionalFloorPlan } from "@/lib/planning/exact-professional-floor-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "exact_professional_floor_plan_v1",
    status: "POST projectId + prompt to generate exact 41x51 professional floor plan",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const result = await generateExactProfessionalFloorPlan({
      projectId: body?.projectId,
      projectTitle: body?.projectTitle || body?.projectName,
      prompt: body?.prompt || body?.userPrompt || body?.requirement || "",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        source: "exact_professional_floor_plan_v1",
        error: error?.message || "Exact professional floor plan failed",
      },
      { status: 500 }
    );
  }
}
