import {
  buildBuildSetuUsageSummary,
  type BuildSetuUsageKind,
} from "@/lib/agent-usage/usage-cost-store";

export type BuildSetuPlanTier =
  | "free"
  | "basic"
  | "standard"
  | "premium"
  | "admin"
  | "unlimited";

export type BuildSetuUsageLimit = {
  textEvents: number;
  imageGenerations: number;
  visionScans: number;
  webSearches: number;
  fileSearches: number;
  toolCalls: number;
  estimatedInr: number;
};

export type BuildSetuNextUsageRequest = {
  kind: BuildSetuUsageKind;
  textEvents?: number;
  imageGenerations?: number;
  visionScans?: number;
  webSearches?: number;
  fileSearches?: number;
  toolCalls?: number;
  estimatedInr?: number;
};

export const BUILDSETU_USAGE_LIMITS: Record<BuildSetuPlanTier, BuildSetuUsageLimit> = {
  free: {
    textEvents: 5,
    imageGenerations: 0,
    visionScans: 1,
    webSearches: 0,
    fileSearches: 1,
    toolCalls: 3,
    estimatedInr: 5,
  },
  basic: {
    textEvents: 40,
    imageGenerations: 0,
    visionScans: 3,
    webSearches: 0,
    fileSearches: 5,
    toolCalls: 25,
    estimatedInr: 150,
  },
  standard: {
    textEvents: 120,
    imageGenerations: 3,
    visionScans: 8,
    webSearches: 5,
    fileSearches: 20,
    toolCalls: 80,
    estimatedInr: 500,
  },
  premium: {
    textEvents: 300,
    imageGenerations: 10,
    visionScans: 20,
    webSearches: 20,
    fileSearches: 80,
    toolCalls: 200,
    estimatedInr: 1500,
  },
  admin: {
    textEvents: 999999,
    imageGenerations: 999999,
    visionScans: 999999,
    webSearches: 999999,
    fileSearches: 999999,
    toolCalls: 999999,
    estimatedInr: 999999,
  },
  unlimited: {
    textEvents: 999999,
    imageGenerations: 999999,
    visionScans: 999999,
    webSearches: 999999,
    fileSearches: 999999,
    toolCalls: 999999,
    estimatedInr: 999999,
  },
};

function clean(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeBuildSetuPlanTier(value: unknown): BuildSetuPlanTier {
  const text = clean(value || "free");

  if (text.includes("admin")) return "admin";
  if (text.includes("unlimited")) return "unlimited";
  if (text.includes("premium")) return "premium";
  if (text.includes("standard")) return "standard";
  if (text.includes("basic")) return "basic";
  if (text.includes("free")) return "free";

  return "free";
}

function number(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function plannedDelta(next?: Partial<BuildSetuNextUsageRequest>): Required<Omit<BuildSetuNextUsageRequest, "kind">> {
  const kind = clean(next?.kind || "other");

  const base = {
    textEvents: number(next?.textEvents),
    imageGenerations: number(next?.imageGenerations),
    visionScans: number(next?.visionScans),
    webSearches: number(next?.webSearches),
    fileSearches: number(next?.fileSearches),
    toolCalls: number(next?.toolCalls),
    estimatedInr: number(next?.estimatedInr),
  };

  if (kind === "text" && base.textEvents <= 0) base.textEvents = 1;
  if (kind === "image" && base.imageGenerations <= 0) base.imageGenerations = 1;
  if (kind === "vision" && base.visionScans <= 0) base.visionScans = 1;
  if (kind === "web_search" && base.webSearches <= 0) base.webSearches = 1;
  if (kind === "file_search" && base.fileSearches <= 0) base.fileSearches = 1;
  if (kind === "tool" && base.toolCalls <= 0) base.toolCalls = 1;

  return base;
}

export function checkBuildSetuUsageLimit(input: {
  projectId?: string;
  userId?: string;
  planTier?: BuildSetuPlanTier | string;
  next?: Partial<BuildSetuNextUsageRequest>;
}) {
  const planTier = normalizeBuildSetuPlanTier(input.planTier || "free");
  const limit = BUILDSETU_USAGE_LIMITS[planTier];
  const summary = buildBuildSetuUsageSummary({
    projectId: input.projectId || "",
    userId: input.userId || "",
    limit: 50000,
  });

  const byKind: any = summary.byKind || {};
  const totals: any = summary.totals || {};
  const delta = plannedDelta(input.next);

  const current = {
    textEvents: number(byKind.text?.events),
    imageGenerations: number(totals.imageCount),
    visionScans: number(totals.visionImageCount),
    webSearches: number(totals.webSearchCount),
    fileSearches: number(totals.fileSearchCount),
    toolCalls: number(totals.toolCallCount),
    estimatedInr: number(totals.estimatedInr),
  };

  const after = {
    textEvents: current.textEvents + delta.textEvents,
    imageGenerations: current.imageGenerations + delta.imageGenerations,
    visionScans: current.visionScans + delta.visionScans,
    webSearches: current.webSearches + delta.webSearches,
    fileSearches: current.fileSearches + delta.fileSearches,
    toolCalls: current.toolCalls + delta.toolCalls,
    estimatedInr: current.estimatedInr + delta.estimatedInr,
  };

  const checks = [
    {
      key: "textEvents",
      label: "Text/chat calls",
      current: current.textEvents,
      after: after.textEvents,
      limit: limit.textEvents,
    },
    {
      key: "imageGenerations",
      label: "Image generations",
      current: current.imageGenerations,
      after: after.imageGenerations,
      limit: limit.imageGenerations,
    },
    {
      key: "visionScans",
      label: "Vision/image scans",
      current: current.visionScans,
      after: after.visionScans,
      limit: limit.visionScans,
    },
    {
      key: "webSearches",
      label: "Web searches",
      current: current.webSearches,
      after: after.webSearches,
      limit: limit.webSearches,
    },
    {
      key: "fileSearches",
      label: "File searches",
      current: current.fileSearches,
      after: after.fileSearches,
      limit: limit.fileSearches,
    },
    {
      key: "toolCalls",
      label: "Tool calls",
      current: current.toolCalls,
      after: after.toolCalls,
      limit: limit.toolCalls,
    },
    {
      key: "estimatedInr",
      label: "Estimated AI cost INR",
      current: current.estimatedInr,
      after: after.estimatedInr,
      limit: limit.estimatedInr,
    },
  ];

  const exceeded = checks.filter((item) => item.after > item.limit);

  return {
    ok: exceeded.length === 0,
    allowed: exceeded.length === 0,
    code: exceeded.length ? "USAGE_LIMIT_EXCEEDED" : "USAGE_LIMIT_OK",
    planTier,
    projectId: input.projectId || "",
    userId: input.userId || "",
    limit,
    current,
    requestedDelta: delta,
    after,
    exceeded,
    summary: {
      totals: summary.totals,
      byKind: summary.byKind,
    },
    message: exceeded.length
      ? `Usage limit exceeded for ${exceeded.map((x) => x.label).join(", ")}.`
      : "Usage is within plan limits.",
  };
}
