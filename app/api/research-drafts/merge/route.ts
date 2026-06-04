import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

async function requireResearchDraftRouteAuth(request: NextRequest): Promise<boolean> {
  // BUILDSETU_RESEARCH_DRAFT_ROUTES_AUTH_GATE_V1
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  return Boolean(
    user?.id ||
      user?.email ||
      user?.phone ||
      user?.name
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusFolder = "approved" | "merged" | "drafts" | "rejected";

type MergePayload = {
  draftId?: string;
  reviewer?: string;
  mergeNotes?: string;
  targetOverride?: string;
};

const STATUS_FOLDERS: StatusFolder[] = ["approved", "merged", "drafts", "rejected"];
const MAX_FILES_PER_FOLDER = 1000;
const DEFAULT_MERGE_TARGET = "data/buildsetu-knowledge/research-merged-knowledge.json";

function researchRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "buildsetu-research");
}

function projectPath(...parts: string[]): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ...parts);
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function isSafeDraftId(value: string): boolean {
  return /^draft_[A-Za-z0-9_-]{8,220}$/.test(value);
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_");
}

async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function findDraftFile(draftId: string): Promise<{ filePath: string; folder: StatusFolder } | null> {
  const root = researchRoot();

  for (const folder of STATUS_FOLDERS) {
    const dir = path.join(/* turbopackIgnore: true */ root, folder);
    await fs.mkdir(dir, { recursive: true });

    const files = (await fs.readdir(dir))
      .filter((file) => /^[A-Za-z0-9._-]+\.json$/.test(file))
      .slice(0, MAX_FILES_PER_FOLDER);

    for (const file of files) {
      const filePath = path.join(/* turbopackIgnore: true */ dir, file);

      try {
        const data = await readJson(filePath);
        if (data.id === draftId) return { filePath, folder };
      } catch {
        continue;
      }
    }
  }

  return null;
}

function normalizeMergeTarget(target: string): string {
  const normalized = target.replace(/\\/g, "/").replace(/^\/+/, "").trim();

  if (!normalized || normalized.includes("*")) return DEFAULT_MERGE_TARGET;

  return normalized;
}

function validateMergeTarget(target: string): string | null {
  const normalized = target.replace(/\\/g, "/").replace(/^\/+/, "");

  if (!normalized.startsWith("data/buildsetu-knowledge/")) {
    return "mergeTarget must start with data/buildsetu-knowledge/";
  }

  if (!normalized.endsWith(".json")) {
    return "mergeTarget must be a .json file";
  }

  if (normalized.includes("..")) {
    return "mergeTarget cannot contain ..";
  }

  if (normalized.includes("*")) {
    return "mergeTarget cannot contain wildcard *";
  }

  return null;
}

function researchUpdateEntry(draft: Record<string, unknown>, reviewer: string, mergeNotes: string) {
  const source = (draft.source || {}) as Record<string, unknown>;
  const jurisdiction = (draft.jurisdiction || {}) as Record<string, unknown>;
  const extracted = (draft.extracted || {}) as Record<string, unknown>;

  return {
    id: safeString(draft.id),
    category: safeString(draft.category),
    riskLevel: safeString(draft.riskLevel),
    confidence: safeString(draft.confidence),
    jurisdiction: {
      country: safeString(jurisdiction.country, "unknown"),
      stateOrProvinceOrEmirate: safeString(jurisdiction.stateOrProvinceOrEmirate, "unknown"),
      cityOrAuthority: safeString(jurisdiction.cityOrAuthority, "unknown")
    },
    source: {
      title: safeString(source.title),
      url: safeString(source.url),
      sourceType: safeString(source.sourceType),
      publisher: safeString(source.publisher, "unknown"),
      dateAccessed: safeString(source.dateAccessed, "unknown"),
      effectiveDate: safeString(source.effectiveDate, "unknown"),
      version: safeString(source.version, "unknown")
    },
    extracted: {
      summary: safeString(extracted.summary),
      checklist: safeStringArray(extracted.checklist),
      requiredDocuments: safeStringArray(extracted.requiredDocuments),
      processSteps: safeStringArray(extracted.processSteps),
      cautions: safeStringArray(extracted.cautions),
      blockedClaims: safeStringArray(extracted.blockedClaims)
    },
    review: draft.review || null,
    merge: {
      mergedAt: new Date().toISOString(),
      mergedBy: reviewer,
      mergeNotes,
      mergeMode: "safe_append_researchUpdates"
    }
  };
}

export async function POST(request: NextRequest) {
  const isResearchDraftMergeAuthed = await requireResearchDraftRouteAuth(request);
  if (!isResearchDraftMergeAuthed) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED" },
      { status: 401 }
    );
  }


  try {
    const payload = (await request.json()) as MergePayload;

    const draftId = safeString(payload.draftId);
    const reviewer = safeString(payload.reviewer, "BuildSetu merge reviewer");
    const mergeNotes = safeString(payload.mergeNotes);

    const errors: string[] = [];

    if (!draftId) errors.push("draftId is required");
    if (draftId && !isSafeDraftId(draftId)) errors.push("draftId format is invalid");

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, error: "VALIDATION_ERROR", errors }, { status: 400 });
    }

    const found = await findDraftFile(draftId);

    if (!found) {
      return NextResponse.json({ ok: false, error: "DRAFT_NOT_FOUND", draftId }, { status: 404 });
    }

    const draft = await readJson(found.filePath);
    const status = safeString(draft.status);
    const review = (draft.review || {}) as Record<string, unknown>;
    const mergeReady = review.mergeReady === true;

    if (status === "merged") {
      return NextResponse.json({
        ok: true,
        draftId,
        status: "merged",
        message: "Draft is already merged.",
        file: path.relative(process.cwd(), found.filePath),
        draft
      });
    }

    if (status !== "approved") {
      return NextResponse.json(
        { ok: false, error: "DRAFT_NOT_APPROVED", draftId, status, message: "Only approved drafts can be merged." },
        { status: 400 }
      );
    }

    if (!mergeReady) {
      return NextResponse.json(
        { ok: false, error: "DRAFT_NOT_MERGE_READY", draftId, message: "Approved draft must have review.mergeReady=true before merge." },
        { status: 400 }
      );
    }

    const rawTarget =
      typeof payload.targetOverride === "string" && payload.targetOverride.trim()
        ? payload.targetOverride
        : safeString(draft.mergeTarget, DEFAULT_MERGE_TARGET);

    const targetRel = normalizeMergeTarget(rawTarget);
    const targetError = validateMergeTarget(targetRel);

    if (targetError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_MERGE_TARGET", message: targetError, target: rawTarget },
        { status: 400 }
      );
    }

    const targetPath = projectPath(targetRel);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    let targetJson: Record<string, unknown> = {};
    let targetExisted = true;

    try {
      targetJson = await readJson(targetPath);
    } catch {
      targetExisted = false;
      targetJson = {
        version: "1.0",
        purpose: "Research merged knowledge container.",
        researchUpdates: []
      };
    }

    const backupDir = projectPath("_safe_backups", "research_draft_merges");
    await fs.mkdir(backupDir, { recursive: true });

    const backupFile = path.join(
      /* turbopackIgnore: true */ backupDir,
      `${timestampSlug()}_${sanitizeFilePart(path.basename(targetRel))}.bak.json`
    );

    if (targetExisted) {
      await fs.copyFile(targetPath, backupFile);
    } else {
      await writeJson(backupFile, { createdBecauseTargetDidNotExist: true, target: targetRel });
    }

    const existingUpdates = Array.isArray(targetJson.researchUpdates) ? targetJson.researchUpdates : [];
    const alreadyMerged = existingUpdates.some((item) => {
      if (!item || typeof item !== "object") return false;
      return (item as Record<string, unknown>).id === draftId;
    });

    if (alreadyMerged) {
      return NextResponse.json({
        ok: true,
        draftId,
        status: "already_merged_in_target",
        target: targetRel,
        backup: path.relative(process.cwd(), backupFile),
        message: "Draft entry already exists in target researchUpdates."
      });
    }

    const entry = researchUpdateEntry(draft, reviewer, mergeNotes);
    const nextResearchUpdates = [...existingUpdates, entry];

    const updatedTarget = {
      ...targetJson,
      researchUpdates: nextResearchUpdates,
      researchUpdateVersion: `research-${timestampSlug()}`,
      lastResearchMerge: {
        draftId,
        mergedAt: new Date().toISOString(),
        mergedBy: reviewer,
        backup: path.relative(process.cwd(), backupFile)
      }
    };

    await writeJson(targetPath, updatedTarget);

    const updatedDraft = {
      ...draft,
      status: "merged",
      merge: {
        target: targetRel,
        backup: path.relative(process.cwd(), backupFile),
        mergedAt: new Date().toISOString(),
        mergedBy: reviewer,
        mergeNotes
      },
      updatedAt: new Date().toISOString()
    };

    const mergedDir = path.join(/* turbopackIgnore: true */ researchRoot(), "merged");
    await fs.mkdir(mergedDir, { recursive: true });

    const mergedFile = path.join(
      /* turbopackIgnore: true */ mergedDir,
      `merged_${sanitizeFilePart(path.basename(found.filePath).replace(/^approved_/, ""))}`
    );

    await writeJson(mergedFile, updatedDraft);
    await fs.unlink(found.filePath).catch(() => undefined);

    const mergeLogDir = path.join(/* turbopackIgnore: true */ researchRoot(), "merge-logs");
    await fs.mkdir(mergeLogDir, { recursive: true });

    const mergeLog = {
      id: `merge_${timestampSlug()}_${sanitizeFilePart(draftId)}`,
      draftId,
      target: targetRel,
      backup: path.relative(process.cwd(), backupFile),
      mergedFile: path.relative(process.cwd(), mergedFile),
      mergedAt: new Date().toISOString(),
      mergedBy: reviewer,
      mergeNotes,
      smokeTestsRequired: safeStringArray(draft.smokeTestsRequired),
      blockedClaims: safeStringArray(((draft.extracted || {}) as Record<string, unknown>).blockedClaims)
    };

    const mergeLogFile = path.join(/* turbopackIgnore: true */ mergeLogDir, `${mergeLog.id}.json`);
    await writeJson(mergeLogFile, mergeLog);

    return NextResponse.json({
      ok: true,
      draftId,
      status: "merged",
      target: targetRel,
      targetExisted,
      backup: path.relative(process.cwd(), backupFile),
      mergedFile: path.relative(process.cwd(), mergedFile),
      mergeLog: path.relative(process.cwd(), mergeLogFile),
      researchUpdatesCount: nextResearchUpdates.length,
      smokeTestsRequired: mergeLog.smokeTestsRequired,
      draft: updatedDraft
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "MERGE_RESEARCH_DRAFT_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
