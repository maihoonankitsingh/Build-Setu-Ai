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
        projects: [],
      });
    }

    const prismaUser = await getOrCreatePrismaUser({
      email: user.email,
      name: user.name,
    });

    const projects = await prisma.project.findMany({
      where: {
        userId: prismaUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        brief: true,
        renders: {
          take: 3,
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            renders: true,
            boqItems: true,
            bbsItems: true,
            agreements: true,
            toolRuns: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      authenticated: true,
      userId: user.id,
      prismaUserId: prismaUser.id,
      email: user.email,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("PROJECT_LIST_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to list projects" },
      { status: 500 },
    );
  }
}
