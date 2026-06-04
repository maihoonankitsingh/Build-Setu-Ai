import { NextRequest, NextResponse } from "next/server";
import { appendProjectMemoryEvent } from "@/lib/project-memory-events";

import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

function bsPrivateApiCookieValue(cookieHeader: string, name: string): string {
  // BUILDSETU_PRIVATE_API_AUTH_GATE_V1
  const parts = String(cookieHeader || "").split(";");

  for (const part of parts) {
    const index = part.indexOf("=");
    if (index < 0) continue;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return "";
}

async function requireBuildSetuPrivateApiAuth(request: Request): Promise<boolean> {
  const token = bsPrivateApiCookieValue(request.headers.get("cookie") || "", AUTH_COOKIE);
  const user = await getUserFromSession(token || undefined);

  return Boolean(
    user?.id ||
      user?.email ||
      user?.phone ||
      user?.name
  );
}

function buildSetuPrivateApiLoginRequiredResponse(): Response {
  return new Response(
    JSON.stringify({ ok: false, error: "LOGIN_REQUIRED" }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {

  // BUILDSETU_PRIVATE_API_POST_AUTH_APPLIED
  const isBuildSetuPrivateApiAuthed = await requireBuildSetuPrivateApiAuth(req);
  if (!isBuildSetuPrivateApiAuthed) {
    return buildSetuPrivateApiLoginRequiredResponse();
  }

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
