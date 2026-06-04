import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

function getCookieValueFromHeader(cookieHeader: string, name: string): string {
  // BUILDSETU_RESEARCH_DRAFT_CREATE_AUTH_GATE_V2
  const parts = String(cookieHeader || "").split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}

async function fileContainsText(filePath: string, needle: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > 5_000_000) return false;
    const text = await fs.readFile(filePath, "utf8");
    return text.includes(needle);
  } catch {
    return false;
  }
}

async function sessionTokenExistsInDataDir(token: string): Promise<boolean> {
  if (!token || token.length < 24) return false;

  const root = path.join(process.cwd(), "data");
  const allowedExt = new Set([".json", ".jsonl", ".txt"]);
  const queue: string[] = [root];
  let scanned = 0;

  while (queue.length && scanned < 1500) {
    const dir = queue.shift()!;
    let entries: import("fs").Dirent[];

    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".next" ||
          entry.name === ".git"
        ) {
          continue;
        }
        queue.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!allowedExt.has(path.extname(entry.name).toLowerCase())) continue;

      scanned += 1;
      if (await fileContainsText(full, token)) return true;
    }
  }

  return false;
}

async function authMeAcceptsCookie(request: Request, cookie: string): Promise<boolean> {
  try {
    const authUrl = new URL("/api/auth/me", request.url);
    const response = await fetch(authUrl.toString(), {
      headers: {
        cookie,
        "cache-control": "no-cache",
        "x-buildsetu-internal-auth-check": "research-draft-create",
      },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    const user =
      data?.user ??
      data?.session?.user ??
      data?.account ??
      data?.profile ??
      null;

    if (user && typeof user === "object") {
      return Boolean(
        user.id ??
          user.email ??
          user.phone ??
          user.name ??
          user.role
      );
    }

    return data?.authenticated === true || data?.isAuthenticated === true || data?.ok === true;
  } catch {
    return false;
  }
}

async function requireResearchDraftCreateAuth(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.trim()) return false;

  if (await authMeAcceptsCookie(request, cookie)) return true;

  const buildSetuSession = getCookieValueFromHeader(cookie, "buildsetu_session");
  if (await sessionTokenExistsInDataDir(buildSetuSession)) return true;

  return false;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResearchDraftStatus = "pending_review" | "approved" | "rejected" | "expired";

type ResearchDraftPayload = {
  category?: string;
  riskLevel?: "low" | "medium" | "medium_high" | "high" | string;
  requiresProfessionalReview?: boolean;
  jurisdiction?: {
    country?: string;
    stateOrProvinceOrEmirate?: string;
    cityOrAuthority?: string;
  };
  source?: {
    title?: string;
    url?: string;
    sourceUrl?: string;
    sourceType?: string;
    sourceCitation?: string;
    tags?: string[]; // BUILDSETU_RESEARCH_DRAFT_SOURCE_META_TYPES_V1
    publisher?: string;
    effectiveDate?: string;
    version?: string;
  };
  extracted?: {
    summary?: string;
    checklist?: string[];
    requiredDocuments?: string[];
    processSteps?: string[];
    cautions?: string[];
    blockedClaims?: string[];
  };
  confidence?: "low" | "medium" | "high" | string;
  mergeTarget?: string;
  tags?: string[]; // BUILDSETU_RESEARCH_DRAFT_TOP_LEVEL_TAGS_TYPE_FIX_V1
  smokeTestsRequired?: string[];
  createdBy?: string;
  notes?: string;
};

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "research-draft";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_");
}

function validatePayload(payload: ResearchDraftPayload): string[] {
  const errors: string[] = [];

  if (!safeString(payload.category)) errors.push("category is required");
  if (!safeString(payload.riskLevel)) errors.push("riskLevel is required");
  if (!safeString(payload.confidence)) errors.push("confidence is required");

  if (!safeString(payload.jurisdiction?.country)) errors.push("jurisdiction.country is required");
  if (!safeString(payload.source?.title)) errors.push("source.title is required");
  if (!safeString(payload.source?.url)) errors.push("source.url is required");
  if (!safeString(payload.source?.sourceType)) errors.push("source.sourceType is required");

  const summary = safeString(payload.extracted?.summary);
  const checklist = safeStringArray(payload.extracted?.checklist);
  const processSteps = safeStringArray(payload.extracted?.processSteps);

  if (!summary && checklist.length === 0 && processSteps.length === 0) {
    errors.push("extracted.summary or extracted.checklist or extracted.processSteps is required");
  }

  return errors;
}

export async function POST(request: NextRequest) {
  const isResearchDraftCreateAuthed = await requireResearchDraftCreateAuth(request);
  if (!isResearchDraftCreateAuthed) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED" },
      { status: 401 }
    );
  }


  try {
    const payload = (await request.json()) as ResearchDraftPayload;
    const errors = validatePayload(payload);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "VALIDATION_ERROR",
          errors
        },
        { status: 400 }
      );
    }

    const category = safeString(payload.category, "generalAecResearch");
    const riskLevel = safeString(payload.riskLevel, "medium");
    const confidence = safeString(payload.confidence, "medium");
    const sourceTitle = safeString(payload.source?.title, "Untitled source");

    const draftId = `draft_${timestampSlug()}_${slugify(category)}_${randomUUID().slice(0, 8)}`;
    const status: ResearchDraftStatus = "pending_review";

    const draft = {
      id: draftId,
      status,
      category,
      riskLevel,
      requiresProfessionalReview:
        typeof payload.requiresProfessionalReview === "boolean"
          ? payload.requiresProfessionalReview
          : ["high", "medium_high"].includes(riskLevel),
      jurisdiction: {
        country: safeString(payload.jurisdiction?.country, "unknown"),
        stateOrProvinceOrEmirate: safeString(payload.jurisdiction?.stateOrProvinceOrEmirate, "unknown"),
        cityOrAuthority: safeString(payload.jurisdiction?.cityOrAuthority, "unknown")
      },
      source: {
        title: sourceTitle,
        url: safeString(payload.source?.url),
        sourceUrl: safeString(payload.source?.sourceUrl, safeString(payload.source?.url)),
        sourceType: safeString(payload.source?.sourceType, "other"),
        sourceCitation: safeString(
          payload.source?.sourceCitation,
          sourceTitle && safeString(payload.source?.url) ? `${sourceTitle} — ${safeString(payload.source?.url)}` : ""
        ),
        tags: safeStringArray(payload.source?.tags),
        publisher: safeString(payload.source?.publisher, "unknown"),
        dateAccessed: todayIso(),
        effectiveDate: safeString(payload.source?.effectiveDate, "unknown"),
        version: safeString(payload.source?.version, "unknown")
      }, // BUILDSETU_RESEARCH_DRAFT_SOURCE_META_PRESERVE_V1
      extracted: {
        summary: safeString(payload.extracted?.summary),
        checklist: safeStringArray(payload.extracted?.checklist),
        requiredDocuments: safeStringArray(payload.extracted?.requiredDocuments),
        processSteps: safeStringArray(payload.extracted?.processSteps),
        cautions: safeStringArray(payload.extracted?.cautions),
        blockedClaims: safeStringArray(payload.extracted?.blockedClaims)
      },
      confidence,
      mergeTarget: safeString(payload.mergeTarget, "data/buildsetu-knowledge/*.json"),
      tags: safeStringArray(payload.tags),
      smokeTestsRequired: safeStringArray(payload.smokeTestsRequired),
      createdBy: safeString(payload.createdBy, "BuildSetu Research Draft API"),
      notes: safeString(payload.notes),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const draftsDir = path.join(process.cwd(), "data", "buildsetu-research", "drafts");
    await fs.mkdir(draftsDir, { recursive: true });

    const filename = `${draftId}_${slugify(sourceTitle)}.json`;
    const filePath = path.join(draftsDir, filename);
    await fs.writeFile(filePath, JSON.stringify(draft, null, 2) + "\n", "utf8");

    return NextResponse.json({
      ok: true,
      draftId,
      status,
      file: path.relative(process.cwd(), filePath),
      draft
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "CREATE_RESEARCH_DRAFT_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
