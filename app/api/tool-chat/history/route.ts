import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

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

const DATA_DIR = path.join(process.cwd(), "data", "generated");

const SOURCE_FILES = [
  "tool-chat-history.json",
  "project-memory-events.json",
  "project-assets.json",
  "project-workflow-outputs.json",
  "project-gallery.json",
  "renders.json",
  "designs.json",
  "boq.json",
  "bbs.json",
  "structure.json",
];

type GuidedChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  time: string;
  toolSlug?: string;
  toolName?: string;
  imageUrl?: string;
  output?: unknown;
  sourceFile?: string;
};

function safeString(value: unknown): string {
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
    const text = safeString(value).trim();
    if (text) return text;
  }
  return "";
}

function safeJson(value: unknown, max = 1200): string {
  if (value === null || value === undefined) return "";
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > max ? `${text.slice(0, max)}...` : text;
  } catch {
    return "";
  }
}

function asObj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeToolSlug(value: unknown): string {
  const clean = safeString(value).trim().toLowerCase();
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

function toolNameFromSlug(slug: string): string {
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

function getRole(obj: Record<string, unknown>): "user" | "assistant" | "system" {
  const raw = firstString(obj.role, obj.sender, obj.author, obj.by).toLowerCase();
  if (raw.includes("user") || raw.includes("client")) return "user";
  if (raw.includes("assistant") || raw.includes("ai") || raw.includes("tool")) return "assistant";
  return "assistant";
}

function buildMessageText(obj: Record<string, unknown>): string {
  const output =
    obj.output ??
    obj.result ??
    obj.data ??
    obj.items ??
    obj.rows ??
    obj.assets ??
    null;

  const base = firstString(
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
    obj.notes,
    obj.title
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

  const outputText = output ? safeJson(output, 1000) : "";
  const parts = [];

  if (base) parts.push(base);
  if (imageUrl) parts.push(`Output file/image: ${imageUrl}`);
  if (outputText && outputText !== base) parts.push(`Output:\n${outputText}`);

  return parts.join("\n\n").trim();
}

function hasChatLikeContent(obj: Record<string, unknown>): boolean {
  return Boolean(buildMessageText(obj));
}

function getProjectId(obj: Record<string, unknown>): string {
  return firstString(
    obj.projectId,
    obj.selectedProjectId,
    obj.currentProjectId,
    obj.project_id,
    asObj(obj.project).id
  );
}

function getToolSlug(obj: Record<string, unknown>, fallback = ""): string {
  return normalizeToolSlug(
    firstString(
      obj.toolSlug,
      obj.selectedToolSlug,
      obj.slug,
      obj.tool,
      obj.toolId,
      obj.renderType,
      obj.assetType,
      obj.outputType,
      fallback
    )
  );
}


function isVisibleGuidedChatText(textValue: unknown): boolean {
  const text = safeString(textValue).trim();
  if (!text) return false;

  const lower = text.toLowerCase();

  const blockedMarkers = [
    "buildsetu tool task lock",
    "strict blocked outputs",
    "mandatory project source of truth",
    "final instruction",
    "follow the task lock",
    "do not generate",
    "do not change the project type",
    "camera rule",
    "master design mode",
    "duplicate prevention",
    "same house design dna",
    "style requirements:",
    "quality:",
    "camera:",
    "negative prompt",
    "positive prompt",
    "output file/image:",
    "/api/ai/generated-image",
    "generate a standalone high-quality full-size image",
    "not a collage, not a board, not a crop",
    "use the same locked interior concept",
    "generate side/detail view",
    "generate opposite wall view",
    "same layout and material identity",
    "only camera angle changes",
  ];

  if (blockedMarkers.some((marker) => lower.includes(marker))) return false;

  const looksLikeGeneratedPrompt =
    text.length > 350 &&
    (
      lower.includes("context:") ||
      lower.includes("camera") ||
      lower.includes("style") ||
      lower.includes("quality") ||
      lower.includes("generate")
    );

  if (looksLikeGeneratedPrompt) return false;

  return true;
}

function normalizeVisibleMessageTime(value: unknown): string {
  const raw = safeString(value).trim();
  const parsed = Date.parse(raw);

  if (!raw || !Number.isFinite(parsed) || parsed <= 1000) {
    return "";
  }

  try {
    return new Date(parsed).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}


function collectMessages(params: {
  node: unknown;
  targetProjectId: string;
  sourceFile: string;
  out: GuidedChatMessage[];
  ctx?: {
    projectMatch?: boolean;
    projectId?: string;
    toolSlug?: string;
    toolName?: string;
  };
  depth?: number;
}) {
  const { node, targetProjectId, sourceFile, out } = params;
  const ctx = params.ctx || {};
  const depth = params.depth || 0;

  if (depth > 8 || out.length > 1500) return;

  if (Array.isArray(node)) {
    node.forEach((item) =>
      collectMessages({
        node: item,
        targetProjectId,
        sourceFile,
        out,
        ctx,
        depth: depth + 1,
      })
    );
    return;
  }

  if (!node || typeof node !== "object") return;

  const obj = asObj(node);
  const ownProjectId = getProjectId(obj);
  const projectMatch = ctx.projectMatch || ownProjectId === targetProjectId || firstString(obj.id) === targetProjectId;

  const toolSlug = getToolSlug(obj, ctx.toolSlug || "");
  const toolName = firstString(obj.toolName, obj.name, ctx.toolName, toolNameFromSlug(toolSlug));

  if (projectMatch && hasChatLikeContent(obj)) {
    const text = buildMessageText(obj);

    if (text) {
      const finalText = toolName ? `[${toolName}]\n${text}` : text;

      out.push({
        id: firstString(obj.id, obj._id, obj.runId, `${sourceFile}:${out.length}`),
        role: getRole(obj),
        text: finalText,
        time: getTime(obj) || new Date(0).toISOString(),
        toolSlug,
        toolName,
        imageUrl: firstString(
          obj.imageUrl,
          obj.printImageUrl,
          obj.url,
          obj.publicUrl,
          obj.assetUrl,
          obj.thumbnailUrl,
          obj.svgUrl,
          obj.pdfUrl
        ),
        output:
          obj.output ??
          obj.result ??
          obj.data ??
          obj.items ??
          obj.rows ??
          obj.assets ??
          null,
        sourceFile,
      });
    }
  }

  for (const [key, value] of Object.entries(obj)) {
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

    collectMessages({
      node: value,
      targetProjectId,
      sourceFile,
      out,
      ctx: {
        projectMatch: projectMatch || keyIsProject,
        projectId: keyIsProject ? targetProjectId : ownProjectId || ctx.projectId,
        toolSlug: keyLooksTool ? key : toolSlug || ctx.toolSlug,
        toolName,
      },
      depth: depth + 1,
    });
  }
}

async function readJson(file: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {

  // BUILDSETU_PRIVATE_API_GET_AUTH_APPLIED
  const isBuildSetuPrivateApiAuthed = await requireBuildSetuPrivateApiAuth(req);
  if (!isBuildSetuPrivateApiAuthed) {
    return buildSetuPrivateApiLoginRequiredResponse();
  }

  const url = new URL(req.url);
  const projectId = String(url.searchParams.get("projectId") || "").trim();
  const currentToolSlug = normalizeToolSlug(String(url.searchParams.get("toolSlug") || url.searchParams.get("currentToolSlug") || "").trim());
  const mode = String(url.searchParams.get("mode") || "project").trim();

  if (!projectId) {
    return NextResponse.json({
      ok: false,
      error: "projectId required",
      messages: [],
      projectId: "",
      toolSlug: currentToolSlug,
      mode,
    });
  }

  const collected: GuidedChatMessage[] = [];

  for (const file of SOURCE_FILES) {
    const json = await readJson(file);
    if (json) {
      collectMessages({
        node: json,
        targetProjectId: projectId,
        sourceFile: file,
        out: collected,
      });
    }
  }

  let messages = collected;

  if (mode === "tool" && currentToolSlug) {
    messages = messages.filter((message) => normalizeToolSlug(message.toolSlug || "") === currentToolSlug);
  }

  const dedupe = new Map<string, GuidedChatMessage>();

  for (const message of messages) {
    const key = [
      message.role,
      message.toolSlug,
      message.text.slice(0, 260),
      message.imageUrl || "",
      safeJson(message.output, 160),
    ].join("|");

    if (!dedupe.has(key)) dedupe.set(key, message);
  }

  messages = [...dedupe.values()]
    .filter((message) => isVisibleGuidedChatText(message.text))
    .map((message) => ({
      ...message,
      time: normalizeVisibleMessageTime(message.time),
    }))
    .sort((a, b) => {
      const ta = Date.parse(a.time || "") || 0;
      const tb = Date.parse(b.time || "") || 0;
      return ta - tb;
    });

  return NextResponse.json({
    ok: true,
    projectId,
    toolSlug: currentToolSlug,
    mode,
    projectWide: mode !== "tool",
    messages: messages.slice(-160),
    stats: {
      total: messages.length,
      byTool: messages.reduce((acc, item) => {
        const key = item.toolSlug || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
}
