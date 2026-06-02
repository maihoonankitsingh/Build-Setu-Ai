import { NextResponse } from "next/server";
import { buildProjectContext } from "@/lib/project-context-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "");
    const toolSlug = String(url.searchParams.get("toolSlug") || "generic-tool");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const context = await buildProjectContext({ projectId, toolSlug });

    return NextResponse.json({
      ok: true,
      context,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project context build failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "");
    const toolSlug = String(body.toolSlug || "generic-tool");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const context = await buildProjectContext({ projectId, toolSlug });

    return NextResponse.json({
      ok: true,
      context,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project context build failed" },
      { status: 500 }
    );
  }
}
