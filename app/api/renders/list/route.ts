import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const renders = await prisma.render.findMany({
      where: projectId ? { projectId } : undefined,
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
