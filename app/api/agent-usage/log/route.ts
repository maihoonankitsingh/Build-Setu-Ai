import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { addBuildSetuUsageEvent } from "@/lib/agent-usage/usage-cost-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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


export async function POST(req: NextRequest) {
  const guard = await requireUsageDebugAccess(req);
  if (guard) return guard;
  try {
    const body = await req.json().catch(() => ({}));

    const entry = addBuildSetuUsageEvent({
      projectId: body.projectId || "global",
      userId: body.userId || "anonymous",
      route: body.route || "manual",
      source: body.source || "api-agent-usage-log",
      kind: body.kind || "other",
      provider: body.provider || "unknown",
      model: body.model || "unknown",
      status: body.status || "success",
      inputTokens: body.inputTokens || 0,
      outputTokens: body.outputTokens || 0,
      totalTokens: typeof body.totalTokens === "number" ? body.totalTokens : undefined,
      imageCount: body.imageCount || 0,
      visionImageCount: body.visionImageCount || 0,
      webSearchCount: body.webSearchCount || 0,
      fileSearchCount: body.fileSearchCount || 0,
      toolCallCount: body.toolCallCount || 0,
      latencyMs: body.latencyMs || 0,
      estimatedUsd: typeof body.estimatedUsd === "number" ? body.estimatedUsd : undefined,
      estimatedInr: typeof body.estimatedInr === "number" ? body.estimatedInr : undefined,
      creditsUsed: body.creditsUsed || 0,
      metadata: body.metadata || {},
    });

    return NextResponse.json({
      ok: true,
      entry,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "USAGE_LOG_FAILED",
        error: error?.message || "Failed to log usage.",
      },
      { status: 500 },
    );
  }
}
