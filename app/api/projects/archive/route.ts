import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import { getOrCreatePrismaUser } from "@/lib/prisma-user";

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const prismaUser = await getOrCreatePrismaUser({
      email: user.email,
      name: user.name,
    });

    const body = await request.json().catch(() => null);
    const id = safeString((body as any)?.id);

    if (!id) {
      return NextResponse.json({ ok: false, error: "project id is required" }, { status: 400 });
    }

    const existing = await prisma.project.findFirst({
      where: {
        id,
        userId: prismaUser.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        status: "ARCHIVED",
      },
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      prismaUserId: prismaUser.id,
      email: user.email,
      project,
    });
  } catch (error) {
    console.error("PROJECT_ARCHIVE_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to archive project" }, { status: 500 });
  }
}
