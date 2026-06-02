import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StatusFolder = "drafts" | "approved" | "rejected" | "merged";

const MAX_FILES_PER_FOLDER = 1000;

function researchRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "buildsetu-research");
}

async function readJsonFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function foldersForStatus(status: string | null): StatusFolder[] {
  if (status === "approved") return ["approved"];
  if (status === "rejected") return ["rejected"];
  if (status === "merged") return ["merged"];
  if (status === "pending_review" || status === "drafts") return ["drafts"];
  return ["drafts", "approved", "rejected", "merged"];
}

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const root = researchRoot();
    const folders = foldersForStatus(status);
    const drafts = [];

    for (const folder of folders) {
      const dir = path.join(/* turbopackIgnore: true */ root, folder);
      await fs.mkdir(dir, { recursive: true });

      const files = (await fs.readdir(dir))
        .filter((file) => /^[A-Za-z0-9._-]+\.json$/.test(file))
        .sort()
        .reverse()
        .slice(0, MAX_FILES_PER_FOLDER);

      for (const file of files) {
        const filePath = path.join(/* turbopackIgnore: true */ dir, file);
        const draft = await readJsonFile(filePath);

        if (draft) {
          drafts.push({
            folder,
            file: path.relative(process.cwd(), filePath),
            id: draft.id,
            status: draft.status,
            category: draft.category,
            riskLevel: draft.riskLevel,
            confidence: draft.confidence,
            jurisdiction: draft.jurisdiction,
            source: draft.source,
            review: draft.review,
            merge: draft.merge,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt
          });
        }
      }
    }

    drafts.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));

    return NextResponse.json({
      ok: true,
      status: status || "all",
      count: drafts.length,
      drafts: drafts.slice(0, 100)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "LIST_RESEARCH_DRAFTS_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
