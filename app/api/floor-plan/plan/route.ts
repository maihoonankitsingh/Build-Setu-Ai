import { NextRequest, NextResponse } from "next/server";
import { generateExactFloorPlanAsset } from "@/lib/floor-plan/exact-planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await generateExactFloorPlanAsset(body);
  return NextResponse.json(result);
}
