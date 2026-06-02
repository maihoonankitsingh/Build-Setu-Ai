import { NextRequest, NextResponse } from "next/server";
import { appendProjectMemoryEvent } from "@/lib/project-memory-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const event = await appendProjectMemoryEvent({
    projectId: String(body.projectId || body.selectedProjectId || body.project?.id || ""),
    toolSlug: String(body.toolSlug || body.slug || body.tool || ""),
    toolName: String(body.toolName || body.name || ""),
    type: String(body.type || "tool-event"),
    role: String(body.role || "system"),
    title: String(body.title || ""),
    text: String(body.text || body.message || body.prompt || body.response || ""),
    imageUrl: String(body.imageUrl || body.url || body.assetUrl || body.publicUrl || ""),
    output: body.output ?? body.result ?? body.data ?? null,
    source: String(body.source || ""),
    raw: body.raw ?? body,
  });

  return NextResponse.json({ ok: true, event });
}
