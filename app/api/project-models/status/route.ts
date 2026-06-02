import { NextResponse } from "next/server";
import { getActiveProjectModel, listProjectModels } from "@/lib/project-model-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const projectId = String(url.searchParams.get("projectId") || "");
    const toolSlug = String(url.searchParams.get("toolSlug") || "exterior-elevation");
    const conceptId = String(url.searchParams.get("conceptId") || "");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const activeModel = await getActiveProjectModel({
      projectId,
      toolSlug,
      conceptId: conceptId || undefined,
    });

    const models = await listProjectModels({
      projectId,
      toolSlug,
      conceptId: conceptId || undefined,
    });

    return NextResponse.json({
      ok: true,
      hasActiveModel: Boolean(activeModel),
      activeModel,
      models,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project model status failed" },
      { status: 500 }
    );
  }
}
