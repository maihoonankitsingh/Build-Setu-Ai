import { NextRequest, NextResponse } from "next/server";
import { checkBuildSetuUsageLimit } from "@/lib/agent-usage/usage-limit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const result = checkBuildSetuUsageLimit({
      projectId: safe(url.searchParams.get("projectId") || "global"),
      userId: safe(url.searchParams.get("userId")),
      planTier: safe(url.searchParams.get("planTier") || url.searchParams.get("tier") || "free"),
      next: {
        kind: safe(url.searchParams.get("kind") || "text") as any,
        textEvents: number(url.searchParams.get("textEvents")),
        imageGenerations: number(url.searchParams.get("imageGenerations")),
        visionScans: number(url.searchParams.get("visionScans")),
        webSearches: number(url.searchParams.get("webSearches")),
        fileSearches: number(url.searchParams.get("fileSearches")),
        toolCalls: number(url.searchParams.get("toolCalls")),
        estimatedInr: number(url.searchParams.get("estimatedInr")),
      },
    });

    return NextResponse.json(result, { status: result.allowed ? 200 : 402 });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        code: "USAGE_LIMIT_CHECK_FAILED",
        error: error?.message || "Failed to check usage limit.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const result = checkBuildSetuUsageLimit({
      projectId: safe(body.projectId || "global"),
      userId: safe(body.userId),
      planTier: safe(body.planTier || body.tier || "free"),
      next: {
        kind: safe(body.kind || body.next?.kind || "text") as any,
        textEvents: number(body.textEvents ?? body.next?.textEvents),
        imageGenerations: number(body.imageGenerations ?? body.next?.imageGenerations),
        visionScans: number(body.visionScans ?? body.next?.visionScans),
        webSearches: number(body.webSearches ?? body.next?.webSearches),
        fileSearches: number(body.fileSearches ?? body.next?.fileSearches),
        toolCalls: number(body.toolCalls ?? body.next?.toolCalls),
        estimatedInr: number(body.estimatedInr ?? body.next?.estimatedInr),
      },
    });

    return NextResponse.json(result, { status: result.allowed ? 200 : 402 });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        code: "USAGE_LIMIT_CHECK_FAILED",
        error: error?.message || "Failed to check usage limit.",
      },
      { status: 500 },
    );
  }
}
