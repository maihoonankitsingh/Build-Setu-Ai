import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const agreements = await prisma.clientAgreement.findMany({
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
            plotSize: true,
            facing: true,
            floors: true,
            budget: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      count: agreements.length,
      agreements,
    });
  } catch (error) {
    console.error("AGREEMENT_LIST_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to list client agreements" },
      { status: 500 },
    );
  }
}
