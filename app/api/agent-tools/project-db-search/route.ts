import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import { getOrCreatePrismaUser } from "@/lib/prisma-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 25;

function safeText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeProjectId(value: unknown) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function safeLimit(value: unknown) {
  const n = Number(value || 10);
  if (!Number.isFinite(n)) return 10;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

function toPlain(value: any): any {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === "function") continue;
      out[key] = toPlain(val);
    }
    return out;
  }
  return value;
}

function makeSnippet(value: any, query: string) {
  const text = safeText(JSON.stringify(toPlain(value)));
  if (!query) return text.slice(0, 420);

  const low = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = low.indexOf(q);

  if (idx < 0) return text.slice(0, 420);

  const start = Math.max(0, idx - 160);
  const end = Math.min(text.length, idx + q.length + 260);
  return text.slice(start, end);
}

function recordMatches(value: any, query: string) {
  const q = query.toLowerCase();
  if (!q) return true;
  return safeText(JSON.stringify(toPlain(value))).toLowerCase().includes(q);
}

function resultItem(source: string, record: any, query: string) {
  const plain = toPlain(record);
  return {
    source,
    id: safeText(plain?.id || plain?.projectId || ""),
    projectId: safeText(plain?.projectId || plain?.id || ""),
    title: safeText(plain?.title || plain?.name || plain?.toolName || plain?.description || source),
    createdAt: plain?.createdAt || null,
    updatedAt: plain?.updatedAt || null,
    snippet: makeSnippet(plain, query),
    record: plain,
  };
}

async function getAuthenticatedPrismaUser(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authUser = await getUserFromSession(token);

  if (!authUser) return { authUser: null, prismaUser: null };

  const prismaUser = await getOrCreatePrismaUser({
    authUserId: authUser.id,
    email: authUser.email,
    name: authUser.name,
    image: (authUser as any).image || (authUser as any).picture || "",
  } as any);

  return { authUser, prismaUser };
}

async function runProjectDbSearch(args: {
  req: NextRequest;
  projectId: string;
  query: string;
  limit: number;
}) {
  // BUILDSETU_PROJECT_DB_SEARCH_READONLY_V1
  const { authUser, prismaUser } = await getAuthenticatedPrismaUser(args.req);

  if (!authUser || !prismaUser) {
    return NextResponse.json(
      { ok: false, code: "LOGIN_REQUIRED", error: "Please login to search project database." },
      { status: 401 }
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: args.projectId,
      userId: prismaUser.id,
    },
  });

  if (!project) {
    return NextResponse.json(
      { ok: false, code: "PROJECT_NOT_FOUND_OR_FORBIDDEN", error: "Project not found or access denied." },
      { status: 404 }
    );
  }

  const [designBrief, boqItems, bbsItems, renders, toolRuns, agreements] = await Promise.all([
    prisma.designBrief.findUnique({ where: { projectId: args.projectId } }).catch(() => null),
    prisma.bOQItem.findMany({ where: { projectId: args.projectId }, take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.bBSItem.findMany({ where: { projectId: args.projectId }, take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.render.findMany({ where: { projectId: args.projectId }, take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.toolRun.findMany({ where: { projectId: args.projectId }, take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.clientAgreement.findMany({ where: { projectId: args.projectId }, take: 100, orderBy: { createdAt: "desc" } }).catch(() => []),
  ]);

  const records: Array<{ source: string; value: any }> = [
    { source: "project", value: project },
    ...(designBrief ? [{ source: "designBrief", value: designBrief }] : []),
    ...boqItems.map((value) => ({ source: "boqItem", value })),
    ...bbsItems.map((value) => ({ source: "bbsItem", value })),
    ...renders.map((value) => ({ source: "render", value })),
    ...toolRuns.map((value) => ({ source: "toolRun", value })),
    ...agreements.map((value) => ({ source: "clientAgreement", value })),
  ];

  const results = records
    .filter((item) => recordMatches(item.value, args.query))
    .slice(0, args.limit)
    .map((item) => resultItem(item.source, item.value, args.query));

  return NextResponse.json({
    ok: true,
    tool: "project_db_search",
    projectId: args.projectId,
    query: args.query,
    count: results.length,
    results,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = safeProjectId(url.searchParams.get("projectId"));
  const query = safeText(url.searchParams.get("q") || url.searchParams.get("query") || "");
  const limit = safeLimit(url.searchParams.get("limit"));

  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_ID_REQUIRED", error: "projectId is required." }, { status: 400 });
  }

  return runProjectDbSearch({ req, projectId, query, limit });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const projectId = safeProjectId(body.projectId || body.selectedProjectId);
  const query = safeText(body.q || body.query || body.message || "");
  const limit = safeLimit(body.limit);

  if (!projectId) {
    return NextResponse.json({ ok: false, code: "PROJECT_ID_REQUIRED", error: "projectId is required." }, { status: 400 });
  }

  return runProjectDbSearch({ req, projectId, query, limit });
}
