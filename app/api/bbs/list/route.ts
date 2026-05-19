import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const items = await prisma.bBSItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: {
        createdAt: "asc",
      },
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

    const totalWeight = items.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0);

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalWeight,
      items,
    });
  } catch (error) {
    console.error("BBS_LIST_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to list BBS items" },
      { status: 500 },
    );
  }
}
