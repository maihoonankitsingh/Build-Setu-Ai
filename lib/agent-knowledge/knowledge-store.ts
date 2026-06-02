import fs from "fs";
import path from "path";
import crypto from "crypto";

export type BuildSetuKnowledgeDomain =
  | "floor_plan"
  | "interior"
  | "exterior"
  | "structure"
  | "mep"
  | "boq"
  | "general";

export type BuildSetuKnowledgeSourceType =
  | "manual_text"
  | "pdf"
  | "image"
  | "screenshot"
  | "public_url"
  | "reference_url"
  | "scraped_public_page";

export type BuildSetuKnowledgeEntry = {
  id: string;
  projectId: string;
  scope: "project" | "global";
  domain: BuildSetuKnowledgeDomain;
  sourceType: BuildSetuKnowledgeSourceType;
  title: string;
  text: string;
  url?: string;
  fileName?: string;
  imageUrl?: string;
  tags: string[];
  extracted: {
    planningRules: string[];
    styleNotes: string[];
    constraints: string[];
    roomIdeas: string[];
    materialIdeas: string[];
    structuralNotes: string[];
    warnings: string[];
  };
  raw?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const ROOT = path.join(process.cwd(), "data", "agent-knowledge");

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
  return path.join(dir, "knowledge.json");
}

function readJson(file: string): BuildSetuKnowledgeEntry[] {
  try {
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJson(file: string, items: BuildSetuKnowledgeEntry[]) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(items, null, 2));
}

function uniq(items: string[]) {
  return Array.from(new Set(items.map((x) => String(x || "").trim()).filter(Boolean)));
}

function extractLines(text: string, patterns: RegExp[], limit = 12) {
  const lines = String(text || "")
    .split(/\r?\n|[.;]/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4);

  return uniq(lines.filter((line) => patterns.some((p) => p.test(line))).slice(0, limit));
}

export function buildSetuExtractKnowledge(text: string, domain: BuildSetuKnowledgeDomain) {
  const body = String(text || "");

  const planningRules = extractLines(body, [
    /zoning|zone|public|private|service|circulation|ventilation|light|entry|privacy/i,
    /parking|stair|lobby|passage|kitchen|toilet|bedroom|living|dining/i,
    /vastu|north|south|east|west|road|facing/i,
  ]);

  const styleNotes = extractLines(body, [
    /modern|minimal|luxury|premium|contemporary|traditional|theme|style|facade|elevation|interior/i,
    /wood|marble|stone|concrete|glass|texture|color|lighting|false ceiling|wardrobe/i,
  ]);

  const constraints = extractLines(body, [
    /budget|cost|limit|constraint|avoid|must|required|mandatory|not allowed|setback|bye.?law|approval/i,
    /column|beam|span|load|structure|foundation|soil|seismic/i,
  ]);

  const roomIdeas = extractLines(body, [
    /room|bedroom|master|toilet|bath|kitchen|dining|living|drawing|puja|store|utility|balcony|terrace/i,
  ]);

  const materialIdeas = extractLines(body, [
    /tile|paint|wood|ply|laminate|marble|granite|stone|glass|steel|aluminium|brick|concrete|gypsum/i,
  ]);

  const structuralNotes = extractLines(body, [
    /column|beam|slab|footing|foundation|load|span|cantilever|staircase|seismic|soil|rcc|steel/i,
  ]);

  const warnings = extractLines(body, [
    /approval|licensed|engineer|architect|safety|fire|code|bye.?law|verify|site condition/i,
  ]);

  if (domain === "structure" && !warnings.length) {
    warnings.push("Structure-related output must be verified by a qualified structural engineer before execution.");
  }

  return {
    planningRules,
    styleNotes,
    constraints,
    roomIdeas,
    materialIdeas,
    structuralNotes,
    warnings,
  };
}

export function addBuildSetuKnowledge(input: {
  projectId?: string;
  scope?: "project" | "global";
  domain?: BuildSetuKnowledgeDomain;
  sourceType?: BuildSetuKnowledgeSourceType;
  title?: string;
  text?: string;
  url?: string;
  fileName?: string;
  imageUrl?: string;
  tags?: string[];
  raw?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const projectId = safeSegment(input.projectId || "global");
  const domain = input.domain || "general";
  const sourceType = input.sourceType || "manual_text";
  const text = String(input.text || "").trim();
  const title = String(input.title || input.fileName || input.url || "BuildSetu knowledge").trim();

  const entry: BuildSetuKnowledgeEntry = {
    id: crypto
      .createHash("sha256")
      .update(`${projectId}|${domain}|${sourceType}|${title}|${text}|${input.url || ""}|${now}`)
      .digest("hex")
      .slice(0, 20),
    projectId,
    scope: input.scope || (projectId === "global" ? "global" : "project"),
    domain,
    sourceType,
    title,
    text,
    url: input.url || "",
    fileName: input.fileName || "",
    imageUrl: input.imageUrl || "",
    tags: uniq(input.tags || []),
    extracted: buildSetuExtractKnowledge(text, domain),
    raw: input.raw || {},
    createdAt: now,
    updatedAt: now,
  };

  const file = fileFor(projectId);
  const items = readJson(file);
  items.unshift(entry);
  writeJson(file, items.slice(0, 1000));

  return entry;
}

export function listBuildSetuKnowledge(input: {
  projectId?: string;
  domain?: BuildSetuKnowledgeDomain | "all";
  q?: string;
  limit?: number;
}) {
  const projectId = safeSegment(input.projectId || "global");
  const limit = Math.max(1, Math.min(200, Number(input.limit || 50)));
  const q = String(input.q || "").toLowerCase().trim();
  const domain = input.domain || "all";

  const projectItems = readJson(fileFor(projectId));
  const globalItems = projectId === "global" ? [] : readJson(fileFor("global"));
  let items = [...projectItems, ...globalItems];

  if (domain !== "all") items = items.filter((x) => x.domain === domain);
  if (q) {
    items = items.filter((x) =>
      [
        x.title,
        x.text,
        x.url || "",
        x.fileName || "",
        x.imageUrl || "",
        x.tags.join(" "),
        x.extracted.planningRules.join(" "),
        x.extracted.styleNotes.join(" "),
        x.extracted.constraints.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  return items.slice(0, limit);
}

export function buildKnowledgeContextForAgent(input: {
  projectId?: string;
  domain?: BuildSetuKnowledgeDomain | "all";
  limit?: number;
}) {
  const items = listBuildSetuKnowledge({
    projectId: input.projectId || "global",
    domain: input.domain || "all",
    limit: input.limit || 12,
  });

  if (!items.length) return "";

  return [
    "BUILDSETU PROJECT KNOWLEDGE CONTEXT:",
    ...items.map((item, idx) =>
      [
        `Knowledge ${idx + 1}: ${item.title}`,
        `Domain: ${item.domain}`,
        `Source: ${item.sourceType}`,
        item.url ? `URL: ${item.url}` : "",
        item.imageUrl ? `Image: ${item.imageUrl}` : "",
        item.text ? `Notes: ${item.text.slice(0, 900)}` : "",
        item.extracted.planningRules.length ? `Planning rules: ${item.extracted.planningRules.join(" | ")}` : "",
        item.extracted.styleNotes.length ? `Style notes: ${item.extracted.styleNotes.join(" | ")}` : "",
        item.extracted.constraints.length ? `Constraints: ${item.extracted.constraints.join(" | ")}` : "",
        item.extracted.structuralNotes.length ? `Structure notes: ${item.extracted.structuralNotes.join(" | ")}` : "",
        item.extracted.warnings.length ? `Warnings: ${item.extracted.warnings.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n\n");
}
