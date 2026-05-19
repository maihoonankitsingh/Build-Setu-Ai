import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

const residentialBoqTemplate = [
  ["1.01", "Site clearing and layout marking", "Sqft", 1200, 3],
  ["1.02", "Excavation for foundation", "Cum", 35, 280],
  ["2.01", "PCC below footing", "Cum", 8, 5200],
  ["3.01", "RCC footing, column and beam concrete", "Cum", 28, 7800],
  ["3.02", "Reinforcement steel as per reviewed drawing", "Kg", 2450, 68],
  ["4.01", "Brick/block masonry work", "Sqft", 2100, 95],
  ["5.01", "Internal and external plaster", "Sqft", 4800, 38],
  ["6.01", "Flooring tiles with basic material", "Sqft", 1850, 145],
  ["7.01", "Wall putty and paint", "Sqft", 4800, 32],
  ["8.01", "Basic electrical work", "Sqft", 1850, 85],
  ["9.01", "Basic plumbing work", "Lump Sum", 1, 145000],
  ["10.01", "Interior design execution allowance", "Lump Sum", 1, 350000],
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const projectId = safeString(body.projectId);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "projectId is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { brief: true },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 },
      );
    }

    await prisma.bOQItem.deleteMany({
      where: { projectId },
    });

    const items = await Promise.all(
      residentialBoqTemplate.map(([itemCode, description, unit, quantity, rate]) =>
        prisma.bOQItem.create({
          data: {
            projectId,
            itemCode,
            description,
            unit,
            quantity,
            rate,
            amount: Number(quantity) * Number(rate),
            status: "Draft",
            drawingRef: "AI Draft - review required",
          },
        }),
      ),
    );

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    await prisma.toolRun.create({
      data: {
        projectId,
        toolType: "BOQ_GENERATOR",
        inputJson: JSON.stringify({
          projectId,
          projectTitle: project.title,
          brief: project.brief?.rawBrief || null,
        }),
        outputJson: JSON.stringify({
          itemCount: items.length,
          totalAmount,
          disclaimer: "Draft BOQ only. Verify with drawings, site and professional review.",
        }),
        creditsUsed: 2,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalAmount,
      items,
      disclaimer: "Draft BOQ only. Verify with drawings, site and professional review.",
    });
  } catch (error) {
    console.error("BOQ_GENERATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate BOQ" },
      { status: 500 },
    );
  }
}
