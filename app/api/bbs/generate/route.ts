import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type BBSSeedRow = {
  memberType: string;
  memberId: string;
  barMark: string;
  diameter: number;
  quantity: number;
  shapeCode: string;
  cuttingLength: number;
  drawingRef: string;
  status: string;
};

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function steelUnitWeightKgPerM(diameterMm: number) {
  return Number(((diameterMm * diameterMm) / 162).toFixed(3));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function round3(value: number) {
  return Number(value.toFixed(3));
}

function buildBbsRows(projectTitle: string): BBSSeedRow[] {
  const normalizedTitle = projectTitle.toLowerCase();
  const looksLikeG1 =
    normalizedTitle.includes("g+1") ||
    normalizedTitle.includes("duplex") ||
    normalizedTitle.includes("first floor");

  const commonRows: BBSSeedRow[] = [
    {
      memberType: "Footing",
      memberId: "F1",
      barMark: "F1-BTM-12-01",
      diameter: 12,
      quantity: 24,
      shapeCode: "L",
      cuttingLength: 3.8,
      drawingRef: "STR-FOOTING-01",
      status: "Engineer Review Required",
    },
    {
      memberType: "Footing",
      memberId: "F2",
      barMark: "F2-BTM-12-01",
      diameter: 12,
      quantity: 24,
      shapeCode: "L",
      cuttingLength: 3.8,
      drawingRef: "STR-FOOTING-01",
      status: "Engineer Review Required",
    },
    {
      memberType: "Column",
      memberId: "C1",
      barMark: "C1-VERT-16-01",
      diameter: 16,
      quantity: 8,
      shapeCode: "Straight",
      cuttingLength: looksLikeG1 ? 6.9 : 3.6,
      drawingRef: "STR-COLUMN-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Column",
      memberId: "C1",
      barMark: "C1-TIE-08-01",
      diameter: 8,
      quantity: looksLikeG1 ? 56 : 28,
      shapeCode: "Stirrup/Tie",
      cuttingLength: 1.15,
      drawingRef: "STR-COLUMN-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Column",
      memberId: "C2",
      barMark: "C2-VERT-16-01",
      diameter: 16,
      quantity: 8,
      shapeCode: "Straight",
      cuttingLength: looksLikeG1 ? 6.9 : 3.6,
      drawingRef: "STR-COLUMN-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Beam",
      memberId: "B1",
      barMark: "B1-TOP-12-01",
      diameter: 12,
      quantity: 4,
      shapeCode: "Bent",
      cuttingLength: 4.6,
      drawingRef: "STR-BEAM-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Beam",
      memberId: "B1",
      barMark: "B1-BOT-12-01",
      diameter: 12,
      quantity: 4,
      shapeCode: "Straight",
      cuttingLength: 4.4,
      drawingRef: "STR-BEAM-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Beam",
      memberId: "B1",
      barMark: "B1-STP-08-01",
      diameter: 8,
      quantity: 36,
      shapeCode: "Stirrup",
      cuttingLength: 1.2,
      drawingRef: "STR-BEAM-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Slab",
      memberId: "S1",
      barMark: "S1-MAIN-10-01",
      diameter: 10,
      quantity: 82,
      shapeCode: "Straight",
      cuttingLength: 3.4,
      drawingRef: "STR-SLAB-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Slab",
      memberId: "S1",
      barMark: "S1-DIST-08-01",
      diameter: 8,
      quantity: 92,
      shapeCode: "Straight",
      cuttingLength: 3.1,
      drawingRef: "STR-SLAB-01",
      status: "Engineer Input Required",
    },
    {
      memberType: "Staircase",
      memberId: "ST1",
      barMark: "ST1-MAIN-12-01",
      diameter: 12,
      quantity: looksLikeG1 ? 18 : 10,
      shapeCode: "Bent",
      cuttingLength: 4.2,
      drawingRef: "STR-STAIR-01",
      status: "Engineer Input Required",
    },
  ];

  if (!looksLikeG1) return commonRows;

  return [
    ...commonRows,
    {
      memberType: "Beam",
      memberId: "B2",
      barMark: "B2-TOP-12-01",
      diameter: 12,
      quantity: 4,
      shapeCode: "Bent",
      cuttingLength: 4.8,
      drawingRef: "STR-BEAM-02",
      status: "Engineer Input Required",
    },
    {
      memberType: "Beam",
      memberId: "B2",
      barMark: "B2-STP-08-01",
      diameter: 8,
      quantity: 38,
      shapeCode: "Stirrup",
      cuttingLength: 1.2,
      drawingRef: "STR-BEAM-02",
      status: "Engineer Input Required",
    },
    {
      memberType: "Slab",
      memberId: "S2",
      barMark: "S2-MAIN-10-01",
      diameter: 10,
      quantity: 78,
      shapeCode: "Straight",
      cuttingLength: 3.2,
      drawingRef: "STR-SLAB-02",
      status: "Engineer Input Required",
    },
  ];
}

function summarizeByDiameter(items: Array<{ diameter: number | null; totalWeight: unknown }>) {
  const summary = new Map<number, number>();

  for (const item of items) {
    const diameter = Number(item.diameter || 0);
    const weight = Number(item.totalWeight || 0);
    if (!diameter || !Number.isFinite(weight)) continue;
    summary.set(diameter, (summary.get(diameter) || 0) + weight);
  }

  return Array.from(summary.entries())
    .sort(([a], [b]) => a - b)
    .map(([diameter, totalWeight]) => ({
      diameter,
      totalWeight: round2(totalWeight),
    }));
}

function summarizeByMemberType(items: Array<{ memberType: string | null; totalWeight: unknown }>) {
  const summary = new Map<string, number>();

  for (const item of items) {
    const memberType = item.memberType || "Unknown";
    const weight = Number(item.totalWeight || 0);
    if (!Number.isFinite(weight)) continue;
    summary.set(memberType, (summary.get(memberType) || 0) + weight);
  }

  return Array.from(summary.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([memberType, totalWeight]) => ({
      memberType,
      totalWeight: round2(totalWeight),
    }));
}

function findDuplicateBarMarks(rows: Array<{ barMark: string }>) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.barMark)) duplicates.add(row.barMark);
    seen.add(row.barMark);
  }

  return Array.from(duplicates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const projectId = safeString((body as { projectId?: unknown }).projectId);

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

    const seedRows = buildBbsRows(project.title || "BuildSetu Project");
    const duplicateBarMarks = findDuplicateBarMarks(seedRows);

    await prisma.bBSItem.deleteMany({
      where: { projectId },
    });

    const items = await Promise.all(
      seedRows.map((row) => {
        const unitWeight = steelUnitWeightKgPerM(row.diameter);
        const totalLength = round3(row.quantity * row.cuttingLength);
        const totalWeight = round2(totalLength * unitWeight);

        return prisma.bBSItem.create({
          data: {
            projectId,
            memberType: row.memberType,
            memberId: row.memberId,
            barMark: row.barMark,
            diameter: row.diameter,
            quantity: row.quantity,
            shapeCode: row.shapeCode,
            cuttingLength: row.cuttingLength,
            totalLength,
            unitWeight,
            totalWeight,
            drawingRef: row.drawingRef,
            status: row.status,
          },
        });
      }),
    );

    const totalWeight = round2(
      items.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0),
    );

    const wastagePercent = 3;
    const weightWithWastage = round2(totalWeight * (1 + wastagePercent / 100));
    const diameterSummary = summarizeByDiameter(items);
    const memberTypeSummary = summarizeByMemberType(items);

    const missingInputs = [
      "Approved structural drawings not uploaded.",
      "Column schedule final reinforcement not confirmed.",
      "Beam schedule final top/bottom bars and stirrup spacing not confirmed.",
      "Slab main/distribution bar spacing not confirmed.",
      "Footing size, depth and reinforcement not confirmed.",
      "Lap length, development length and bend deduction rules need engineer confirmation.",
    ];

    const validationAlerts = [
      "This BBS is a planning draft only.",
      "Final BBS must be prepared from engineer-approved RCC drawings.",
      "Do not use this output for steel cutting, site execution or billing without structural review.",
      ...duplicateBarMarks.map((mark) => `Duplicate bar mark detected: ${mark}`),
    ];

    const reviewPackage = {
      projectId,
      projectTitle: project.title,
      itemCount: items.length,
      totalWeight,
      wastagePercent,
      weightWithWastage,
      diameterSummary,
      memberTypeSummary,
      missingInputs,
      validationAlerts,
      status: "REVIEW_REQUIRED",
      nextStep: "Upload/enter approved structural schedules or request structural engineer review.",
    };

    await prisma.toolRun.create({
      data: {
        projectId,
        toolType: "BBS_GENERATOR",
        inputJson: JSON.stringify({
          projectId,
          projectTitle: project.title,
          brief: project.brief?.rawBrief || null,
        }),
        outputJson: JSON.stringify(reviewPackage),
        creditsUsed: 1500,
        status: "REVIEW_REQUIRED",
      },
    });

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalWeight,
      wastagePercent,
      weightWithWastage,
      diameterSummary,
      memberTypeSummary,
      missingInputs,
      validationAlerts,
      items,
      reviewPackage,
      disclaimer:
        "AI-generated BBS draft for planning only. Final reinforcement, cutting length, bend deduction, lap length, development length and site execution must be verified by a qualified structural engineer.",
    });
  } catch (error) {
    console.error("BBS_GENERATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate BBS" },
      { status: 500 },
    );
  }
}
