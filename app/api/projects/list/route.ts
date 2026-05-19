import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
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
