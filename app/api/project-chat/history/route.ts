import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

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

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool_result" | "system";
  messageType: string;
  toolSlug?: string;
  toolName?: string;
  content: string;
  finalPrompt?: string;
  resultJson?: unknown;
  imageUrl?: string | null;
  status?: string;
  createdAt: string;
};

type ChatStore = {
  projects: Record<string, ChatMessage[]>;
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const STORE_PATH = path.join(DATA_DIR, "project-chat-history.json");

async function readStore(): Promise<ChatStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object" && parsed.projects && typeof parsed.projects === "object") {
      return parsed as ChatStore;
    }

    return { projects: {} };
  } catch {
    return { projects: {} };
  }
}

async function writeStore(store: ChatStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function makeMessage(body: any): ChatMessage {
  const now = new Date().toISOString();

  return {
    id: String(body.id || `${body.role || "message"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    role: ["user", "assistant", "tool_result", "system"].includes(body.role) ? body.role : "assistant",
    messageType: String(body.messageType || "normal"),
    toolSlug: body.toolSlug ? String(body.toolSlug) : "",
    toolName: body.toolName ? String(body.toolName) : "",
    content: String(body.content || ""),
    finalPrompt: body.finalPrompt ? String(body.finalPrompt) : "",
    resultJson: body.resultJson ?? null,
    imageUrl: body.imageUrl ? String(body.imageUrl) : null,
    status: body.status ? String(body.status) : "",
    createdAt: String(body.createdAt || now),
  };
}

export async function GET(request: NextRequest) {

  // BUILDSETU_PRIVATE_API_GET_AUTH_APPLIED
  const isBuildSetuPrivateApiAuthed = await requireBuildSetuPrivateApiAuth(request);
  if (!isBuildSetuPrivateApiAuthed) {
    return buildSetuPrivateApiLoginRequiredResponse();
  }

  const projectId = String(request.nextUrl.searchParams.get("projectId") || "").trim();

  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  }

  const store = await readStore();
  const messages = Array.isArray(store.projects[projectId]) ? store.projects[projectId] : [];

  return NextResponse.json({
    ok: true,
    projectId,
    messages,
  });
}

export async function POST(request: NextRequest) {

  // BUILDSETU_PRIVATE_API_POST_AUTH_APPLIED
  const isBuildSetuPrivateApiAuthed = await requireBuildSetuPrivateApiAuth(request);
  if (!isBuildSetuPrivateApiAuthed) {
    return buildSetuPrivateApiLoginRequiredResponse();
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = String(body.projectId || "").trim();

  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  }

  const message = makeMessage(body);

  const store = await readStore();
  const current = Array.isArray(store.projects[projectId]) ? store.projects[projectId] : [];

  store.projects[projectId] = [...current, message].slice(-300);

  await writeStore(store);

  return NextResponse.json({
    ok: true,
    projectId,
    message,
    messages: store.projects[projectId],
  });
}

export async function DELETE(request: NextRequest) {

  // BUILDSETU_PRIVATE_API_DELETE_AUTH_APPLIED
  const isBuildSetuPrivateApiAuthed = await requireBuildSetuPrivateApiAuth(request);
  if (!isBuildSetuPrivateApiAuthed) {
    return buildSetuPrivateApiLoginRequiredResponse();
  }

  const projectId = String(request.nextUrl.searchParams.get("projectId") || "").trim();

  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  }

  const store = await readStore();
  store.projects[projectId] = [];
  await writeStore(store);

  return NextResponse.json({
    ok: true,
    projectId,
    messages: [],
  });
}
