import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import {
  buildBuildSetuUsageSummary,
  listBuildSetuUsageEvents,
} from "@/lib/agent-usage/usage-cost-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safe(value: unknown) {
  return String(value ?? "").trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}


function usageDebugToken(req: NextRequest) {
  return String(
    req.headers.get("x-buildsetu-usage-token") ||
    req.headers.get("x-buildsetu-admin-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();
}

function isLocalUsageRequest(req: NextRequest) {
  const host = String(req.headers.get("host") || "").toLowerCase();
  const forwardedFor = String(req.headers.get("x-forwarded-for") || "").trim();

  return (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    forwardedFor === "127.0.0.1" ||
    forwardedFor === "::1"
  );
}

async function requireUsageDebugAccess(req: NextRequest) {
  // BUILDSETU_USAGE_DEBUG_GUARD_V1
  const configuredToken = String(
    process.env.BUILDSETU_USAGE_DEBUG_TOKEN ||
    process.env.BUILDSETU_INTERNAL_API_TOKEN ||
    process.env.BUILDSETU_ADMIN_TOKEN ||
    ""
  ).trim();

  const providedToken = usageDebugToken(req);

  if (configuredToken && providedToken && providedToken === configuredToken) {
    return null;
  }

  const user = await getAuthUserFromRequest(req).catch(() => null);
  if (user && user.role === "ADMIN") {
    return null;
  }

  if (!configuredToken && isLocalUsageRequest(req)) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Usage debug endpoint requires admin session or usage debug token.",
    },
    { status: 401 }
  );
}


export async function GET(req: NextRequest) {
  const guard = await requireUsageDebugAccess(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);

    const projectId = safe(url.searchParams.get("projectId"));
    const userId = safe(url.searchParams.get("userId"));
    const kind = safe(url.searchParams.get("kind") || "all") as any;
    const limit = Number(url.searchParams.get("limit") || 100);
    const includeEvents = url.searchParams.get("events") === "true";

    const summary = buildBuildSetuUsageSummary({
      projectId,
      userId,
      limit: Math.max(1, Math.min(50000, limit)),
    });

    return NextResponse.json({
      ...summary,
      events: includeEvents
        ? listBuildSetuUsageEvents({
            projectId,
            userId,
            kind,
            limit: Math.min(1000, limit),
          })
        : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "USAGE_SUMMARY_FAILED",
        error: error?.message || "Failed to build usage summary.",
      },
      { status: 500 },
    );
  }
}
