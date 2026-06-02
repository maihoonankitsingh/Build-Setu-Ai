import fs from "fs";
import path from "path";
import crypto from "crypto";

export type BuildSetuFeedbackType =
  | "good_output"
  | "bad_output"
  | "correction"
  | "style_preference"
  | "safety_rule"
  | "training_example"
  | "general_note";

export type BuildSetuFeedbackDomain =
  | "floor_plan"
  | "interior"
  | "exterior"
  | "structure"
  | "mep"
  | "boq"
  | "material"
  | "general";

export type BuildSetuFeedbackEntry = {
  id: string;
  projectId: string;
  userId: string;
  scope: "project" | "global";
  type: BuildSetuFeedbackType;
  domain: BuildSetuFeedbackDomain;
  title: string;
  userPrompt: string;
  agentOutput: string;
  correctedOutput: string;
  feedbackText: string;
  rating: number;
  tags: string[];
  extracted: {
    rules: string[];
    preferences: string[];
    avoid: string[];
    approvedPatterns: string[];
    safetyNotes: string[];
    trainingSignals: string[];
  };
  raw?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const ROOT = path.join(process.cwd(), "data", "agent-feedback");
const TRAINING_ROOT = path.join(process.cwd(), "data", "buildsetu-training");
const TRAINING_FILE = path.join(TRAINING_ROOT, "agent-training-cases.json");

function safeSegment(value: string) {
  return String(value || "global")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "global";
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileFor(projectId: string) {
  const id = safeSegment(projectId || "global");
  const dir = path.join(ROOT, id);
  ensureDir(dir);
  return path.join(dir, "feedback.json");
}

function readJson(file: string): BuildSetuFeedbackEntry[] {
  try {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(file: string, items: BuildSetuFeedbackEntry[]) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(items, null, 2) + "\n");
}

function uniq(items: string[]) {
  return Array.from(new Set(items.map((x) => String(x || "").trim()).filter(Boolean)));
}

function clean(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitLines(text: string) {
  return String(text || "")
    .split(/\r?\n|[.;]/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4);
}

function extractByPatterns(text: string, patterns: RegExp[], limit = 12) {
  const lines = splitLines(text);
  return uniq(lines.filter((line) => patterns.some((p) => p.test(line))).slice(0, limit));
}

function normalizeFeedbackType(value: unknown): BuildSetuFeedbackType {
  const t = clean(value || "general_note");
  const allowed: BuildSetuFeedbackType[] = [
    "good_output",
    "bad_output",
    "correction",
    "style_preference",
    "safety_rule",
    "training_example",
    "general_note",
  ];
  return allowed.includes(t as BuildSetuFeedbackType) ? (t as BuildSetuFeedbackType) : "general_note";
}

function normalizeDomain(value: unknown): BuildSetuFeedbackDomain {
  const d = clean(value || "general");
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
  return allowed.includes(d as BuildSetuFeedbackDomain) ? (d as BuildSetuFeedbackDomain) : "general";
}

function normalizeScope(value: unknown, projectId: string): "project" | "global" {
  if (clean(value) === "global" || projectId === "global") return "global";
  return "project";
}

function normalizeRating(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-5, Math.min(5, Math.round(n)));
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return uniq(value.map((x) => clean(x))).slice(0, 30);
  const text = clean(value);
  if (!text) return [];
  return uniq(text.split(",").map((x) => clean(x))).slice(0, 30);
}

export function extractBuildSetuFeedbackSignals(input: {
  type: BuildSetuFeedbackType;
  domain: BuildSetuFeedbackDomain;
  feedbackText?: string;
  correctedOutput?: string;
  agentOutput?: string;
}) {
  const body = [
    input.feedbackText || "",
    input.correctedOutput || "",
    input.type === "bad_output" ? input.agentOutput || "" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const rules = extractByPatterns(body, [
    /always|must|mandatory|make sure|ensure|future|next time|hamesha|dhyan|rule/i,
    /do not|don't|never|avoid|mat|nahi|galat|wrong/i,
    /dimension|plot|facing|road|parking|stair|kitchen|toilet|bedroom|living/i,
  ]);

  const preferences = extractByPatterns(body, [
    /prefer|preference|like|style|premium|modern|minimal|luxury|simple|clean|better/i,
    /wood|stone|glass|marble|tile|paint|lighting|color|material|facade|interior/i,
  ]);

  const avoid = extractByPatterns(body, [
    /avoid|do not|don't|never|mat|nahi|galat|wrong|bad|issue|problem|mistake/i,
    /hallucinate|invent|fake|random|repeat|same|incorrect/i,
  ]);

  const approvedPatterns =
    input.type === "good_output" || input.type === "training_example"
      ? extractByPatterns([input.feedbackText || "", input.correctedOutput || ""].join("\n"), [
          /good|best|approved|final|correct|use this|aisa|same style|pattern/i,
          /client-ready|professional|premium|clear|accurate|practical/i,
        ])
      : [];

  const safetyNotes = extractByPatterns(body, [
    /safety|licensed|engineer|architect|verify|approval|code|bye.?law|structure|rcc|load|foundation|beam|column/i,
  ]);

  const trainingSignals = uniq([
    ...rules.map((x) => `Rule: ${x}`),
    ...preferences.map((x) => `Preference: ${x}`),
    ...avoid.map((x) => `Avoid: ${x}`),
    ...approvedPatterns.map((x) => `Approved pattern: ${x}`),
    ...safetyNotes.map((x) => `Safety: ${x}`),
  ]).slice(0, 40);

  return {
    rules,
    preferences,
    avoid,
    approvedPatterns,
    safetyNotes,
    trainingSignals,
  };
}


function readAnyJson(file: string): any {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
}

function appendBuildSetuTrainingCaseFromFeedback(entry: BuildSetuFeedbackEntry) {
  if (entry.type !== "good_output" && entry.type !== "training_example") return null;

  const inputText = [entry.userPrompt, entry.feedbackText]
    .filter(Boolean)
    .join("\n\nFeedback instruction:\n")
    .trim();

  const idealOutput = [entry.correctedOutput, entry.agentOutput]
    .filter(Boolean)[0] || "";

  if (!inputText || !idealOutput) return null;

  const now = new Date().toISOString();
  const trainingCase = {
    id: `feedback_${entry.id}`,
    source: "agent_feedback_v1",
    feedbackId: entry.id,
    projectId: entry.projectId,
    userId: entry.userId,
    scope: entry.scope,
    domain: entry.domain,
    type: entry.type,
    title: entry.title,
    input: inputText,
    idealOutput,
    rejectedOutput: entry.type === "training_example" ? "" : entry.agentOutput || "",
    feedbackText: entry.feedbackText,
    rating: entry.rating,
    tags: entry.tags,
    extracted: entry.extracted,
    createdAt: now,
    updatedAt: now,
  };

  ensureDir(TRAINING_ROOT);

  const existing = readAnyJson(TRAINING_FILE);
  const items = Array.isArray(existing)
    ? existing
    : Array.isArray(existing?.cases)
      ? existing.cases
      : [];

  const withoutDuplicate = items.filter((item: any) => item?.id !== trainingCase.id);
  withoutDuplicate.unshift(trainingCase);

  fs.writeFileSync(TRAINING_FILE, JSON.stringify(withoutDuplicate.slice(0, 10000), null, 2) + "\n");

  return trainingCase;
}

export function addBuildSetuFeedback(input: {
  projectId?: string;
  userId?: string;
  scope?: "project" | "global";
  type?: BuildSetuFeedbackType;
  domain?: BuildSetuFeedbackDomain;
  title?: string;
  userPrompt?: string;
  agentOutput?: string;
  correctedOutput?: string;
  feedbackText?: string;
  rating?: number;
  tags?: string[] | string;
  raw?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const projectId = safeSegment(input.projectId || "global");
  const userId = safeSegment(input.userId || "anonymous");
  const type = normalizeFeedbackType(input.type);
  const domain = normalizeDomain(input.domain);
  const scope = normalizeScope(input.scope, projectId);

  const userPrompt = String(input.userPrompt || "").trim();
  const agentOutput = String(input.agentOutput || "").trim();
  const correctedOutput = String(input.correctedOutput || "").trim();
  const feedbackText = String(input.feedbackText || "").trim();
  const title = String(input.title || feedbackText || correctedOutput || "BuildSetu feedback").trim().slice(0, 180);

  const extracted = extractBuildSetuFeedbackSignals({
    type,
    domain,
    feedbackText,
    correctedOutput,
    agentOutput,
  });

  const entry: BuildSetuFeedbackEntry = {
    id: crypto
      .createHash("sha256")
      .update(`${projectId}|${userId}|${type}|${domain}|${title}|${feedbackText}|${correctedOutput}|${now}`)
      .digest("hex")
      .slice(0, 20),
    projectId,
    userId,
    scope,
    type,
    domain,
    title,
    userPrompt,
    agentOutput,
    correctedOutput,
    feedbackText,
    rating: normalizeRating(input.rating),
    tags: uniq(["feedback_v1", type, domain, ...normalizeTags(input.tags)]).slice(0, 30),
    extracted,
    raw: input.raw || {},
    createdAt: now,
    updatedAt: now,
  };

  const file = fileFor(projectId);
  const items = readJson(file);
  items.unshift(entry);
  writeJson(file, items.slice(0, 2000));

  const trainingCase = appendBuildSetuTrainingCaseFromFeedback(entry);
  if (trainingCase) {
    entry.raw = {
      ...(entry.raw || {}),
      trainingCaseId: trainingCase.id,
      trainingDataset: TRAINING_FILE,
    };
    const refreshed = readJson(file).map((item) => (item.id === entry.id ? entry : item));
    writeJson(file, refreshed.slice(0, 2000));
  }

  return entry;
}

export function listBuildSetuFeedback(input: {
  projectId?: string;
  domain?: BuildSetuFeedbackDomain | "all";
  type?: BuildSetuFeedbackType | "all";
  q?: string;
  limit?: number;
  includeGlobal?: boolean;
}) {
  const projectId = safeSegment(input.projectId || "global");
  const limit = Math.max(1, Math.min(300, Number(input.limit || 50)));
  const q = clean(input.q).toLowerCase();
  const domain = input.domain || "all";
  const type = input.type || "all";

  const projectItems = readJson(fileFor(projectId));
  const globalItems =
    input.includeGlobal !== false && projectId !== "global" ? readJson(fileFor("global")) : [];

  let items = [...projectItems, ...globalItems];

  if (domain !== "all") items = items.filter((x) => x.domain === domain);
  if (type !== "all") items = items.filter((x) => x.type === type);

  if (q) {
    items = items.filter((x) =>
      [
        x.title,
        x.userPrompt,
        x.agentOutput,
        x.correctedOutput,
        x.feedbackText,
        x.tags.join(" "),
        x.extracted.rules.join(" "),
        x.extracted.preferences.join(" "),
        x.extracted.avoid.join(" "),
        x.extracted.approvedPatterns.join(" "),
        x.extracted.safetyNotes.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  return items.slice(0, limit);
}

export function buildFeedbackContextForAgent(input: {
  projectId?: string;
  domain?: BuildSetuFeedbackDomain | "all";
  limit?: number;
}) {
  const items = listBuildSetuFeedback({
    projectId: input.projectId || "global",
    domain: input.domain || "all",
    type: "all",
    limit: input.limit || 12,
    includeGlobal: true,
  });

  if (!items.length) return "";

  return [
    "BUILDSETU FEEDBACK LEARNING CONTEXT:",
    ...items.map((item, idx) =>
      [
        `Feedback ${idx + 1}: ${item.title}`,
        `Type: ${item.type}`,
        `Domain: ${item.domain}`,
        `Rating: ${item.rating}`,
        item.feedbackText ? `Feedback: ${item.feedbackText.slice(0, 700)}` : "",
        item.correctedOutput ? `Corrected/approved output: ${item.correctedOutput.slice(0, 900)}` : "",
        item.extracted.rules.length ? `Rules: ${item.extracted.rules.join(" | ")}` : "",
        item.extracted.preferences.length ? `Preferences: ${item.extracted.preferences.join(" | ")}` : "",
        item.extracted.avoid.length ? `Avoid: ${item.extracted.avoid.join(" | ")}` : "",
        item.extracted.safetyNotes.length ? `Safety notes: ${item.extracted.safetyNotes.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n\n");
}
