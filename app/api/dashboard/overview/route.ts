import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import { getOrCreatePrismaUser } from "@/lib/prisma-user";
import { prisma } from "@/lib/db";

const TOOL_RUNS_FILE = path.join(process.cwd(), "data", "generated", "tool-runs.json");

type ToolRun = {
  id?: string;
  createdAt?: string;
  slug?: string;
  title?: string;
  projectId?: string | null;
  userId?: string;
  email?: string;
  status?: string;
};

const IMAGE_TOOL_SLUGS = new Set([
  "interior-render",
  "exterior-elevation",
  "render-enhancer",
  "site-photo-redesign",
  "remove-furniture",
  "background-change",
  "photo-enhancer",
]);

async function readToolRuns(): Promise<ToolRun[]> {
  try {
    const raw = await fs.readFile(TOOL_RUNS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      stats: {
        activeProjects: 0,
        imagesGenerated: 0,
        reviewPending: 0,
        creditsLeft: 0,
      },
    });
  }

  const prismaUser = await getOrCreatePrismaUser({
    email: user.email,
    name: user.name,
  });

  const runs = await readToolRuns();

  const userRuns = runs.filter((run) => {
    if (run.userId && run.userId === user.id) return true;
    if (run.email && run.email.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  });

  const [activeProjects, prismaImagesGenerated] = await Promise.all([
    prisma.project.count({
      where: {
        userId: prismaUser.id,
      },
    }),
    prisma.render.count({
      where: {
        project: {
          userId: prismaUser.id,
        },
      },
    }),
  ]);

  const fileImageRuns = userRuns.filter((run) => IMAGE_TOOL_SLUGS.has(String(run.slug || ""))).length;
  const imagesGenerated = prismaImagesGenerated + fileImageRuns;
  const reviewPending = userRuns.filter((run) => run.status === "REVIEW_REQUIRED").length;

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: prismaUser.id,
    email: user.email,
    stats: {
      activeProjects,
      imagesGenerated,
      reviewPending,
      creditsLeft: Number(user.credits || 0),
    },
    recentRuns: userRuns.slice(0, 8),
  });
}
