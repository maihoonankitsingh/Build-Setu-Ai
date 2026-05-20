import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import { getOrCreatePrismaUser } from "@/lib/prisma-user";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        count: 0,
        renders: [],
      });
    }

    const prismaUser = await getOrCreatePrismaUser({
      email: user.email,
      name: user.name,
    });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const renders = await prisma.render.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        project: {
          userId: prismaUser.id,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            projectType: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      authenticated: true,
      userId: prismaUser.id,
      email: user.email,
      count: renders.length,
      renders,
    });
  } catch (error) {
    console.error("RENDER_LIST_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to list renders" },
      { status: 500 },
    );
  }
}
