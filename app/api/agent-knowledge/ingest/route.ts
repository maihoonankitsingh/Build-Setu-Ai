import { NextRequest, NextResponse } from "next/server";
import { addBuildSetuKnowledge } from "@/lib/agent-knowledge/knowledge-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = String(body.projectId || "global");
    const title = String(body.title || body.fileName || body.url || "BuildSetu knowledge");
    const text = String(body.text || body.notes || body.content || "");
    const url = String(body.url || "");
    const imageUrl = String(body.imageUrl || body.referenceImageUrl || "");
    const fileName = String(body.fileName || "");

    if (!text && !url && !imageUrl && !fileName) {
      return NextResponse.json(
        {
          ok: false,
          error: "text, url, imageUrl, or fileName required.",
        },
        { status: 400 },
      );
    }

    const entry = addBuildSetuKnowledge({
      projectId,
      scope: body.scope === "global" ? "global" : "project",
      domain: body.domain || "general",
      sourceType: body.sourceType || (imageUrl ? "image" : url ? "reference_url" : "manual_text"),
      title,
      text: text || title,
      url,
      imageUrl,
      fileName,
      tags: Array.isArray(body.tags) ? body.tags : [],
      raw: {
        uploadedBy: "api",
        original: body,
      },
    });

    return NextResponse.json({
      ok: true,
      entry,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Knowledge ingest failed.",
      },
      { status: 500 },
    );
  }
}
