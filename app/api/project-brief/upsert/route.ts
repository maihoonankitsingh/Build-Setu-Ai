import { NextResponse } from "next/server";
import { getProjectBriefCompleteness, getProjectStages, upsertProjectBrief } from "@/lib/project-brief-store";

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

export async function POST(req: Request) {

  // BUILDSETU_PRIVATE_API_POST_AUTH_APPLIED
  const isBuildSetuPrivateApiAuthed = await requireBuildSetuPrivateApiAuth(req);
  if (!isBuildSetuPrivateApiAuthed) {
    return buildSetuPrivateApiLoginRequiredResponse();
  }

  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "");
    const briefInput = body.brief && typeof body.brief === "object" ? body.brief : body;

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const brief = await upsertProjectBrief(projectId, briefInput);
    const completeness = getProjectBriefCompleteness(brief);
    const stages = await getProjectStages(projectId);

    return NextResponse.json({
      ok: true,
      action: "project_brief_saved",
      brief,
      completeness,
      stages,
      output: {
        title: "Project Brief Saved",
        summary: `Client brief save ho gaya. Completeness: ${completeness.score}%.`,
        sections: [
          `Plot: ${brief.site.plotWidthFt || "?"} x ${brief.site.plotDepthFt || "?"} ft`,
          `Facing: ${brief.site.facing || "Not specified"}`,
          `Floors: ${brief.building.floors || "Not specified"}`,
          `Budget: ${brief.preferences.budgetRange || "Not specified"}`,
        ],
        nextActions: ["Start Planning", "Create Floor Plan", "Open Exterior Tool"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project brief save failed" },
      { status: 500 }
    );
  }
}
