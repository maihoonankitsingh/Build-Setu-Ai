import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

const bbsTemplate = [
  ["Footing", "F1", "B1", 12, 24, "L", 3.8, 91.2, 0.888],
  ["Footing", "F2", "B2", 12, 24, "L", 3.8, 91.2, 0.888],
  ["Column", "C1", "B3", 16, 8, "Straight", 3.6, 28.8, 1.58],
  ["Column", "C2", "B4", 16, 8, "Straight", 3.6, 28.8, 1.58],
  ["Beam", "B1", "B5", 12, 12, "Bent", 4.2, 50.4, 0.888],
  ["Beam", "B2", "B6", 12, 12, "Bent", 4.2, 50.4, 0.888],
  ["Slab", "S1", "B7", 10, 80, "Straight", 3.2, 256, 0.617],
  ["Stirrups", "ST1", "B8", 8, 180, "Stirrup", 1.1, 198, 0.395],
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

    await prisma.bBSItem.deleteMany({
      where: { projectId },
    });

    const items = await Promise.all(
      bbsTemplate.map(([memberType, memberId, barMark, diameter, quantity, shapeCode, cuttingLength, totalLength, unitWeight]) =>
        prisma.bBSItem.create({
          data: {
            projectId,
            memberType,
            memberId,
            barMark,
            diameter,
            quantity,
            shapeCode,
            cuttingLength,
            totalLength,
            unitWeight,
            totalWeight: Number(totalLength) * Number(unitWeight),
            drawingRef: "AI Draft - engineer review required",
            status: "Review Required",
          },
        }),
      ),
    );

    const totalWeight = items.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0);

    await prisma.toolRun.create({
      data: {
        projectId,
        toolType: "BBS_GENERATOR",
        inputJson: JSON.stringify({
          projectId,
          projectTitle: project.title,
          brief: project.brief?.rawBrief || null,
        }),
        outputJson: JSON.stringify({
          itemCount: items.length,
          totalWeight,
          disclaimer: "Draft BBS only. Final BBS requires structural drawings and engineer review.",
        }),
        creditsUsed: 3,
        status: "REVIEW_REQUIRED",
      },
    });

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalWeight,
      items,
      disclaimer: "Draft BBS only. Final BBS requires structural drawings and engineer review.",
    });
  } catch (error) {
    console.error("BBS_GENERATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate BBS" },
      { status: 500 },
    );
  }
}
