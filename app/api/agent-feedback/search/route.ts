import { NextRequest, NextResponse } from "next/server";
import {
  buildFeedbackContextForAgent,
  listBuildSetuFeedback,
  type BuildSetuFeedbackDomain,
  type BuildSetuFeedbackType,
} from "@/lib/agent-feedback/feedback-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safe(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDomain(value: unknown): BuildSetuFeedbackDomain | "all" {
  const d = safe(value || "all");
  if (d === "all") return "all";
  const allowed: BuildSetuFeedbackDomain[] = [
    "floor_plan",
    "interior",
    "exterior",
    "structure",
    "mep",
    "boq",
    "material",
    "general",
  ];
  return allowed.includes(d as BuildSetuFeedbackDomain) ? (d as BuildSetuFeedbackDomain) : "all";
}

function normalizeType(value: unknown): BuildSetuFeedbackType | "all" {
  const t = safe(value || "all");
  if (t === "all") return "all";
  const allowed: BuildSetuFeedbackType[] = [
    "good_output",
    "bad_output",
    "correction",
    "style_preference",
    "safety_rule",
    "training_example",
    "general_note",
  ];
  return allowed.includes(t as BuildSetuFeedbackType) ? (t as BuildSetuFeedbackType) : "all";
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const projectId = safe(url.searchParams.get("projectId") || "global");
    const domain = normalizeDomain(url.searchParams.get("domain"));
    const type = normalizeType(url.searchParams.get("type"));
    const q = safe(url.searchParams.get("q"));
    const limit = Number(url.searchParams.get("limit") || 20);

    const items = listBuildSetuFeedback({
      projectId,
      domain,
      type,
      q,
      limit,
      includeGlobal: url.searchParams.get("includeGlobal") !== "false",
    });

    const context = buildFeedbackContextForAgent({
      projectId,
      domain,
      limit: Math.min(Math.max(1, limit), 20),
    });

    return NextResponse.json({
      ok: true,
      projectId,
      domain,
      type,
      q,
      count: items.length,
      items,
      context,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        code: "FEEDBACK_SEARCH_FAILED",
        error: error?.message || "Failed to search feedback.",
      },
      { status: 500 },
    );
  }
}
