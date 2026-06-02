import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, "data", "generated");

const CANDIDATE_FILES = [
  "project-memory-events.json",
  "tool-chat-history.json",
  "project-assets.json",
  "project-workflow-outputs.json",
  "project-gallery.json",
  "project-concepts.json",
  "renders.json",
  "designs.json",
  "structure.json",
  "boq.json",
  "bbs.json",
];

type TimelineEntry = {
  id: string;
  projectId: string;
  toolSlug: string;
  toolName: string;
  type: string;
  role: string;
  title: string;
  text: string;
  imageUrl: string;
  output: unknown;
  sourceFile: string;
  createdAt: string;
  raw?: unknown;
};

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = asString(value).trim();
    if (text) return text;
  }
  return "";
}

function getObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function looksRenderable(obj: Record<string, unknown>): boolean {
  const keys = [
    "message",
    "content",
    "prompt",
    "response",
    "assistantMessage",
    "userMessage",
    "text",
    "summary",
    "output",
    "result",
    "imageUrl",
    "url",
    "assetUrl",
    "publicUrl",
    "printImageUrl",
    "pdfUrl",
    "svgUrl",
    "items",
    "rows",
  ];

  return keys.some((key) => obj[key] !== undefined && obj[key] !== null && asString(obj[key]).trim() !== "");
}

function normalizeToolName(slug: string): string {
  const map: Record<string, string> = {
    "floor-plan-ai": "Floor Plan AI",
    "exterior-elevation": "Exterior Elevation",
    "interior-render": "Interior Render",
    "boq-generator": "BOQ Generator",
    "bbs-generator": "BBS Generator",
    "working-drawings": "Working Drawings",
    "structural-plan": "Structural Plan",
    "column-beam-plan": "Column Beam Plan",
    "electrical-plan": "Electrical Plan",
    "plumbing-plan": "Plumbing Plan",
    "mep-plan": "MEP Plan",
    "client-pdf": "Client PDF",
  };
  return map[slug] || slug || "Project Tool";
}

function normalizeToolSlug(raw: string): string {
  const clean = String(raw || "").trim().toLowerCase();
  const map: Record<string, string> = {
    "floor-plan": "floor-plan-ai",
    floorplan: "floor-plan-ai",
    "floorplan-ai": "floor-plan-ai",
    exterior: "exterior-elevation",
    elevation: "exterior-elevation",
    facade: "exterior-elevation",
    interior: "interior-render",
    boq: "boq-generator",
    bbs: "bbs-generator",
    structure: "structural-plan",
    structural: "structural-plan",
  };
  return map[clean] || clean;
}

function getTime(obj: Record<string, unknown>): string {
  return firstString(
    obj.createdAt,
    obj.updatedAt,
    obj.timestamp,
    obj.time,
    obj.date,
    obj.generatedAt,
    obj.savedAt
  );
}

function entryFromObject(params: {
  obj: Record<string, unknown>;
  sourceFile: string;
  projectId: string;
  toolSlug: string;
  index: number;
}): TimelineEntry {
  const { obj, sourceFile, projectId, index } = params;

  const toolSlug = normalizeToolSlug(
    firstString(
      obj.toolSlug,
      obj.selectedToolSlug,
      obj.slug,
      obj.tool,
      obj.toolId,
      obj.renderType,
      obj.assetType,
      obj.outputType,
      params.toolSlug
    )
  );

  const imageUrl = firstString(
    obj.imageUrl,
    obj.printImageUrl,
    obj.url,
    obj.publicUrl,
    obj.assetUrl,
    obj.thumbnailUrl,
    obj.svgUrl,
    obj.pdfUrl
  );

  const text = firstString(
    obj.message,
    obj.content,
    obj.text,
    obj.prompt,
    obj.userPrompt,
    obj.response,
    obj.assistantMessage,
    obj.userMessage,
    obj.summary,
    obj.description,
    obj.notes
  );

  const output =
    obj.output ??
    obj.result ??
    obj.data ??
    obj.items ??
    obj.rows ??
    obj.assets ??
    null;

  const type = firstString(obj.type, obj.kind, obj.outputMode, obj.outputType, obj.assetType, obj.renderType, "activity");
  const role = firstString(obj.role, obj.sender, obj.author, obj.by, "system");
  const createdAt = getTime(obj) || new Date(0).toISOString();

  return {
    id: firstString(obj.id, obj._id, obj.runId, `${sourceFile}:${index}`),
    projectId,
    toolSlug,
    toolName: firstString(obj.toolName, obj.name, normalizeToolName(toolSlug)),
    type,
    role,
    title: firstString(obj.title, obj.name, obj.label, type),
    text,
    imageUrl,
    output,
    sourceFile,
    createdAt,
    raw: obj,
  };
}

function collectEntries(params: {
  node: unknown;
  sourceFile: string;
  targetProjectId: string;
  out: TimelineEntry[];
  ctx?: {
    projectMatch?: boolean;
    projectId?: string;
    toolSlug?: string;
  };
  depth?: number;
}) {
  const { node, sourceFile, targetProjectId, out } = params;
  const ctx = params.ctx || {};
  const depth = params.depth || 0;

  if (depth > 8 || out.length > 1200) return;

  if (Array.isArray(node)) {
    node.forEach((item) =>
      collectEntries({
        node: item,
        sourceFile,
        targetProjectId,
        out,
        ctx,
        depth: depth + 1,
      })
    );
    return;
  }

  if (!node || typeof node !== "object") return;

  const obj = getObj(node);

  const ownProjectId = firstString(
    obj.projectId,
    obj.selectedProjectId,
    obj.currentProjectId,
    obj.project_id,
    getObj(obj.project).id
  );

  const ownToolSlug = firstString(
    obj.toolSlug,
    obj.selectedToolSlug,
    obj.slug,
    obj.tool,
    obj.toolId,
    obj.renderType,
    obj.assetType,
    ctx.toolSlug
  );

  const projectMatch =
    ctx.projectMatch ||
    ownProjectId === targetProjectId ||
    firstString(obj.id) === targetProjectId;

  const currentProjectId = ownProjectId || ctx.projectId || targetProjectId;
  const currentToolSlug = ownToolSlug || ctx.toolSlug || "";

  if (projectMatch && looksRenderable(obj)) {
    out.push(
      entryFromObject({
        obj,
        sourceFile,
        projectId: currentProjectId,
        toolSlug: currentToolSlug,
        index: out.length,
      })
    );
  }

  for (const [key, value] of Object.entries(obj)) {
    // BUILDSETU_PROJECT_MEMORY_SKIP_NESTED_PAYLOADS
    // raw/output/result/data are payload containers. Traversing them creates duplicate timeline entries.
    if (
      key === "raw" ||
      key === "output" ||
      key === "result" ||
      key === "data" ||
      key === "items" ||
      key === "rows" ||
      key === "assets"
    ) {
      continue;
    }

    const keyIsProject = key === targetProjectId;
    const keyLooksTool =
      key.includes("floor") ||
      key.includes("exterior") ||
      key.includes("interior") ||
      key.includes("boq") ||
      key.includes("bbs") ||
      key.includes("structure") ||
      key.includes("electrical") ||
      key.includes("plumbing") ||
      key.includes("mep");

    collectEntries({
      node: value,
      sourceFile,
      targetProjectId,
      out,
      ctx: {
        projectMatch: projectMatch || keyIsProject,
        projectId: keyIsProject ? targetProjectId : currentProjectId,
        toolSlug: keyLooksTool ? key : currentToolSlug,
      },
      depth: depth + 1,
    });
  }
}

async function readJsonFile(file: string): Promise<unknown | null> {
  const full = path.join(GENERATED_DIR, file);
  try {
    const raw = await fs.readFile(full, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = String(url.searchParams.get("projectId") || "").trim();
  const currentToolSlug = normalizeToolSlug(String(url.searchParams.get("toolSlug") || "").trim());
  const mode = String(url.searchParams.get("mode") || "project").trim();

  if (!projectId) {
    return NextResponse.json({
      ok: false,
      error: "projectId required",
      entries: [],
      stats: {},
    });
  }

  const entries: TimelineEntry[] = [];

  for (const file of CANDIDATE_FILES) {
    const json = await readJsonFile(file);
    if (json) {
      collectEntries({
        node: json,
        sourceFile: file,
        targetProjectId: projectId,
        out: entries,
      });
    }
  }

  const dedupe = new Map<string, TimelineEntry>();

  for (const entry of entries) {
    const key = [
      entry.projectId,
      entry.toolSlug,
      entry.type,
      entry.title,
      entry.text.slice(0, 160),
      entry.imageUrl,
      JSON.stringify(entry.output || "").slice(0, 160),
    ].join("|");

    if (!dedupe.has(key)) dedupe.set(key, entry);
  }

  let timeline = [...dedupe.values()];

  if (mode === "tool" && currentToolSlug) {
    timeline = timeline.filter((entry) => normalizeToolSlug(entry.toolSlug) === currentToolSlug);
  }

  timeline.sort((a, b) => {
    const ta = Date.parse(a.createdAt || "") || 0;
    const tb = Date.parse(b.createdAt || "") || 0;
    return tb - ta;
  });

  const stats = timeline.reduce(
    (acc, entry) => {
      const key = entry.toolSlug || "unknown";
      acc.byTool[key] = (acc.byTool[key] || 0) + 1;
      acc.total += 1;
      if (entry.imageUrl) acc.images += 1;
      if (entry.output) acc.outputs += 1;
      return acc;
    },
    { total: 0, images: 0, outputs: 0, byTool: {} as Record<string, number> }
  );

  return NextResponse.json({
    ok: true,
    projectId,
    currentToolSlug,
    mode,
    stats,
    entries: timeline.slice(0, 120),
  });
}
