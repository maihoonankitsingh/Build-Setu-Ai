import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const items = await prisma.bOQItem.findMany({
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

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalAmount,
      items,
    });
  } catch (error) {
    console.error("BOQ_LIST_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to list BOQ items" },
      { status: 500 },
    );
  }
}
