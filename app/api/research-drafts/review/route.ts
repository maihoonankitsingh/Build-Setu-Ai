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

type ReviewAction = "approve" | "reject";
type StatusFolder = "drafts" | "approved" | "rejected" | "merged";

type ReviewPayload = {
  draftId?: string;
  action?: ReviewAction | string;
  reviewer?: string;
  reviewNotes?: string;
  professionalReviewRequired?: boolean;
  mergeReady?: boolean;
};

const STATUS_FOLDERS: StatusFolder[] = ["drafts", "approved", "rejected", "merged"];
const MAX_FILES_PER_FOLDER = 1000;

function researchRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "buildsetu-research");
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isSafeDraftId(value: string): boolean {
  return /^draft_[A-Za-z0-9_-]{8,220}$/.test(value);
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
}

async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
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

export async function POST(request: NextRequest) {
  const isResearchDraftReviewAuthed = await requireResearchDraftRouteAuth(request);
  if (!isResearchDraftReviewAuthed) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED" },
      { status: 401 }
    );
  }


  try {
    const payload = (await request.json()) as ReviewPayload;

    const draftId = safeString(payload.draftId);
    const action = safeString(payload.action) as ReviewAction;
    const reviewer = safeString(payload.reviewer, "BuildSetu reviewer");
    const reviewNotes = safeString(payload.reviewNotes);

    const errors: string[] = [];

    if (!draftId) errors.push("draftId is required");
    if (draftId && !isSafeDraftId(draftId)) errors.push("draftId format is invalid");
    if (!["approve", "reject"].includes(action)) errors.push("action must be approve or reject");

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, error: "VALIDATION_ERROR", errors }, { status: 400 });
    }

    const found = await findDraftFile(draftId);

    if (!found) {
      return NextResponse.json({ ok: false, error: "DRAFT_NOT_FOUND", draftId }, { status: 404 });
    }

    const current = await readJson(found.filePath);
    const oldStatus = safeString(current.status, "unknown");

    if (oldStatus === "merged") {
      return NextResponse.json(
        { ok: false, error: "DRAFT_ALREADY_MERGED", draftId, status: oldStatus },
        { status: 400 }
      );
    }

    if (oldStatus === "approved" && action === "approve") {
      return NextResponse.json({
        ok: true,
        draftId,
        status: "approved",
        message: "Draft is already approved.",
        file: path.relative(process.cwd(), found.filePath),
        draft: current
      });
    }

    if (oldStatus === "rejected" && action === "reject") {
      return NextResponse.json({
        ok: true,
        draftId,
        status: "rejected",
        message: "Draft is already rejected.",
        file: path.relative(process.cwd(), found.filePath),
        draft: current
      });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const targetFolder: StatusFolder = action === "approve" ? "approved" : "rejected";
    const targetDir = path.join(/* turbopackIgnore: true */ researchRoot(), targetFolder);
    await fs.mkdir(targetDir, { recursive: true });

    const updated = {
      ...current,
      status: newStatus,
      review: {
        action,
        reviewer,
        reviewNotes,
        reviewedAt: new Date().toISOString(),
        professionalReviewRequired:
          typeof payload.professionalReviewRequired === "boolean"
            ? payload.professionalReviewRequired
            : Boolean(current.requiresProfessionalReview),
        mergeReady: action === "approve" ? Boolean(payload.mergeReady) : false
      },
      updatedAt: new Date().toISOString()
    };

    const cleanOriginalName = path.basename(found.filePath).replace(/^(approved_|rejected_|merged_)/, "");
    const targetName = `${sanitizeFilePart(newStatus)}_${sanitizeFilePart(cleanOriginalName)}`;
    const targetFile = path.join(/* turbopackIgnore: true */ targetDir, targetName);

    await fs.writeFile(targetFile, JSON.stringify(updated, null, 2) + "\n", "utf8");

    if (found.filePath !== targetFile) {
      await fs.unlink(found.filePath).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      draftId,
      oldStatus,
      status: newStatus,
      action,
      file: path.relative(process.cwd(), targetFile),
      draft: updated
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "REVIEW_RESEARCH_DRAFT_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
