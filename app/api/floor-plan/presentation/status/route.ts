import { NextRequest, NextResponse } from "next/server";
import { getFloorPlanPresentationJob } from "@/lib/floor-plan/presentation-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jobId = String(url.searchParams.get("jobId") || "").trim();

  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: "jobId is required" },
      { status: 400 }
    );
  }

  const job = await getFloorPlanPresentationJob(jobId);

  if (!job) {
    return NextResponse.json(
      { ok: false, error: "job not found", jobId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    job,
    status: job.status,
    result: job.result || null,
    error: job.error || "",
  });
}
