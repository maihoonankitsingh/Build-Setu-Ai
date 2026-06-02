import { NextResponse } from "next/server";
import { DEFAULT_PROJECT_STAGES, PROJECT_BRIEF_WIZARD_SCHEMA } from "@/lib/project-brief-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    schema: PROJECT_BRIEF_WIZARD_SCHEMA,
    stages: DEFAULT_PROJECT_STAGES,
  });
}
