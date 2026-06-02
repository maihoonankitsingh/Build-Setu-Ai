import fs from "fs";
import path from "path";
import crypto from "crypto";

export type BuildSetuUsageKind =
  | "text"
  | "vision"
  | "image"
  | "file_search"
  | "web_search"
  | "tool"
  | "fallback"
  | "other";

export type BuildSetuUsageStatus = "success" | "failed" | "skipped";

export type BuildSetuUsageEntry = {
  id: string;
  createdAt: string;
  projectId: string;
  userId: string;
  route: string;
  source: string;
  kind: BuildSetuUsageKind;
  provider: string;
  model: string;
  status: BuildSetuUsageStatus;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  imageCount: number;
  visionImageCount: number;
  webSearchCount: number;
  fileSearchCount: number;
  toolCallCount: number;
  latencyMs: number;
  estimatedUsd: number;
  estimatedInr: number;
  creditsUsed: number;
  metadata: Record<string, unknown>;
};

const ROOT = path.join(process.cwd(), "data", "agent-usage");
const USAGE_FILE = path.join(ROOT, "usage-events.json");
const SUMMARY_FILE = path.join(ROOT, "usage-summary.json");

const USD_TO_INR = Number(process.env.BUILDSETU_USD_TO_INR || 95);

// Conservative configurable defaults. Exact billing can be reconciled later from provider dashboard.
const DEFAULT_RATES = {
  textInputPer1MUsd: Number(process.env.BUILDSETU_COST_TEXT_INPUT_1M_USD || 0.25),
  textOutputPer1MUsd: Number(process.env.BUILDSETU_COST_TEXT_OUTPUT_1M_USD || 2.0),
  visionImageUsd: Number(process.env.BUILDSETU_COST_VISION_IMAGE_USD || 0.002),
  imageGenerationUsd: Number(process.env.BUILDSETU_COST_IMAGE_GENERATION_USD || 0.05),
  webSearchUsd: Number(process.env.BUILDSETU_COST_WEB_SEARCH_USD || 0.01),
  fileSearchUsd: Number(process.env.BUILDSETU_COST_FILE_SEARCH_USD || 0.0025),
  toolCallUsd: Number(process.env.BUILDSETU_COST_TOOL_CALL_USD || 0),
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeSegment(value: unknown, fallback = "global") {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || fallback;
}

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function number(value: unknown, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKind(value: unknown): BuildSetuUsageKind {
  const kind = clean(value || "other") as BuildSetuUsageKind;
  const allowed: BuildSetuUsageKind[] = [
    "text",
    "vision",
    "image",
    "file_search",
    "web_search",
    "tool",
    "fallback",
    "other",
  ];
  return allowed.includes(kind) ? kind : "other";
}

function normalizeStatus(value: unknown): BuildSetuUsageStatus {
  const status = clean(value || "success") as BuildSetuUsageStatus;
  const allowed: BuildSetuUsageStatus[] = ["success", "failed", "skipped"];
  return allowed.includes(status) ? status : "success";
}

function readJsonArray(file: string): any[] {
  try {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(file: string, data: unknown) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

function roundMoney(value: number) {
  return Math.round(value * 1000000) / 1000000;
}

export function estimateBuildSetuUsageCost(input: {
  kind?: BuildSetuUsageKind;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  visionImageCount?: number;
  webSearchCount?: number;
  fileSearchCount?: number;
  toolCallCount?: number;
}) {
  const inputTokens = Math.max(0, number(input.inputTokens));
  const outputTokens = Math.max(0, number(input.outputTokens));
  const imageCount = Math.max(0, number(input.imageCount));
  const visionImageCount = Math.max(0, number(input.visionImageCount));
  const webSearchCount = Math.max(0, number(input.webSearchCount));
  const fileSearchCount = Math.max(0, number(input.fileSearchCount));
  const toolCallCount = Math.max(0, number(input.toolCallCount));

  let usd = 0;

  usd += (inputTokens / 1_000_000) * DEFAULT_RATES.textInputPer1MUsd;
  usd += (outputTokens / 1_000_000) * DEFAULT_RATES.textOutputPer1MUsd;
  usd += imageCount * DEFAULT_RATES.imageGenerationUsd;
  usd += visionImageCount * DEFAULT_RATES.visionImageUsd;
  usd += webSearchCount * DEFAULT_RATES.webSearchUsd;
  usd += fileSearchCount * DEFAULT_RATES.fileSearchUsd;
  usd += toolCallCount * DEFAULT_RATES.toolCallUsd;

  return {
    estimatedUsd: roundMoney(usd),
    estimatedInr: roundMoney(usd * USD_TO_INR),
  };
}

export function addBuildSetuUsageEvent(input: {
  projectId?: string;
  userId?: string;
  route?: string;
  source?: string;
  kind?: BuildSetuUsageKind;
  provider?: string;
  model?: string;
  status?: BuildSetuUsageStatus;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  visionImageCount?: number;
  webSearchCount?: number;
  fileSearchCount?: number;
  toolCallCount?: number;
  latencyMs?: number;
  estimatedUsd?: number;
  estimatedInr?: number;
  creditsUsed?: number;
  metadata?: Record<string, unknown>;
}) {
  const inputTokens = Math.max(0, number(input.inputTokens));
  const outputTokens = Math.max(0, number(input.outputTokens));
  const requestedTotalTokens = Math.max(0, number(input.totalTokens, 0));
  const totalTokens = requestedTotalTokens > 0 ? requestedTotalTokens : inputTokens + outputTokens;

  const imageCount = Math.max(0, number(input.imageCount));
  const visionImageCount = Math.max(0, number(input.visionImageCount));
  const webSearchCount = Math.max(0, number(input.webSearchCount));
  const fileSearchCount = Math.max(0, number(input.fileSearchCount));
  const toolCallCount = Math.max(0, number(input.toolCallCount));

  const cost =
    typeof input.estimatedUsd === "number" || typeof input.estimatedInr === "number"
      ? {
          estimatedUsd: roundMoney(number(input.estimatedUsd)),
          estimatedInr: roundMoney(number(input.estimatedInr)),
        }
      : estimateBuildSetuUsageCost({
          kind: normalizeKind(input.kind),
          inputTokens,
          outputTokens,
          imageCount,
          visionImageCount,
          webSearchCount,
          fileSearchCount,
          toolCallCount,
        });

  const now = new Date().toISOString();

  const entry: BuildSetuUsageEntry = {
    id: crypto
      .createHash("sha256")
      .update(`${now}|${input.projectId || ""}|${input.userId || ""}|${input.route || ""}|${input.model || ""}|${Math.random()}`)
      .digest("hex")
      .slice(0, 20),
    createdAt: now,
    projectId: safeSegment(input.projectId || "global"),
    userId: safeSegment(input.userId || "anonymous", "anonymous"),
    route: clean(input.route || "unknown"),
    source: clean(input.source || "manual"),
    kind: normalizeKind(input.kind),
    provider: clean(input.provider || "unknown"),
    model: clean(input.model || "unknown"),
    status: normalizeStatus(input.status),
    inputTokens,
    outputTokens,
    totalTokens,
    imageCount,
    visionImageCount,
    webSearchCount,
    fileSearchCount,
    toolCallCount,
    latencyMs: Math.max(0, number(input.latencyMs)),
    estimatedUsd: cost.estimatedUsd,
    estimatedInr: cost.estimatedInr,
    creditsUsed: Math.max(0, number(input.creditsUsed)),
    metadata: input.metadata || {},
  };

  const items = readJsonArray(USAGE_FILE);
  items.unshift(entry);
  writeJson(USAGE_FILE, items.slice(0, 50000));
  writeJson(SUMMARY_FILE, buildBuildSetuUsageSummary({ limit: 50000 }));

  return entry;
}

export function listBuildSetuUsageEvents(input: {
  projectId?: string;
  userId?: string;
  kind?: BuildSetuUsageKind | "all";
  limit?: number;
}) {
  const projectId = clean(input.projectId);
  const userId = clean(input.userId);
  const kind = clean(input.kind || "all");
  const limit = Math.max(1, Math.min(1000, number(input.limit, 100)));

  let items = readJsonArray(USAGE_FILE) as BuildSetuUsageEntry[];

  if (projectId) items = items.filter((x) => x.projectId === safeSegment(projectId));
  if (userId) items = items.filter((x) => x.userId === safeSegment(userId, "anonymous"));
  if (kind && kind !== "all") items = items.filter((x) => x.kind === kind);

  return items.slice(0, limit);
}

export function buildBuildSetuUsageSummary(input: {
  projectId?: string;
  userId?: string;
  limit?: number;
}) {
  const items = listBuildSetuUsageEvents({
    projectId: input.projectId,
    userId: input.userId,
    kind: "all",
    limit: input.limit || 50000,
  });

  const totals = {
    events: items.length,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    imageCount: 0,
    visionImageCount: 0,
    webSearchCount: 0,
    fileSearchCount: 0,
    toolCallCount: 0,
    latencyMs: 0,
    estimatedUsd: 0,
    estimatedInr: 0,
    creditsUsed: 0,
  };

  const byKind: Record<string, any> = {};
  const byProject: Record<string, any> = {};
  const byModel: Record<string, any> = {};

  function addTo(bucket: Record<string, any>, key: string, item: BuildSetuUsageEntry) {
    const k = key || "unknown";
    if (!bucket[k]) {
      bucket[k] = {
        events: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        imageCount: 0,
        visionImageCount: 0,
        webSearchCount: 0,
        fileSearchCount: 0,
        toolCallCount: 0,
        estimatedUsd: 0,
        estimatedInr: 0,
        creditsUsed: 0,
      };
    }

    const b = bucket[k];
    b.events += 1;
    b.inputTokens += item.inputTokens;
    b.outputTokens += item.outputTokens;
    b.totalTokens += item.totalTokens;
    b.imageCount += item.imageCount;
    b.visionImageCount += item.visionImageCount;
    b.webSearchCount += item.webSearchCount;
    b.fileSearchCount += item.fileSearchCount;
    b.toolCallCount += item.toolCallCount;
    b.estimatedUsd = roundMoney(b.estimatedUsd + item.estimatedUsd);
    b.estimatedInr = roundMoney(b.estimatedInr + item.estimatedInr);
    b.creditsUsed += item.creditsUsed;
  }

  for (const item of items) {
    totals.inputTokens += item.inputTokens;
    totals.outputTokens += item.outputTokens;
    totals.totalTokens += item.totalTokens;
    totals.imageCount += item.imageCount;
    totals.visionImageCount += item.visionImageCount;
    totals.webSearchCount += item.webSearchCount;
    totals.fileSearchCount += item.fileSearchCount;
    totals.toolCallCount += item.toolCallCount;
    totals.latencyMs += item.latencyMs;
    totals.estimatedUsd = roundMoney(totals.estimatedUsd + item.estimatedUsd);
    totals.estimatedInr = roundMoney(totals.estimatedInr + item.estimatedInr);
    totals.creditsUsed += item.creditsUsed;

    addTo(byKind, item.kind, item);
    addTo(byProject, item.projectId, item);
    addTo(byModel, `${item.provider}:${item.model}`, item);
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    filters: {
      projectId: input.projectId || "",
      userId: input.userId || "",
    },
    currency: {
      usdToInr: USD_TO_INR,
      note: "Estimated cost only. Reconcile final billing with provider dashboard.",
    },
    totals,
    byKind,
    byProject,
    byModel,
    recent: items.slice(0, Math.min(20, items.length)),
  };
}
