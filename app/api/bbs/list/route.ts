import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function round2(value: number) {
  return Number(value.toFixed(2));
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

function findDuplicateBarMarks(items: Array<{ barMark: string | null }>) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    const mark = item.barMark || "";
    if (!mark) continue;
    if (seen.has(mark)) duplicates.add(mark);
    seen.add(mark);
  }

  return Array.from(duplicates);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const items = await prisma.bBSItem.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: [
        { memberType: "asc" },
        { memberId: "asc" },
        { barMark: "asc" },
      ],
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

    const totalWeight = round2(
      items.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0),
    );
    const wastagePercent = 3;
    const weightWithWastage = round2(totalWeight * (1 + wastagePercent / 100));
    const duplicateBarMarks = findDuplicateBarMarks(items);

    const validationAlerts = [
      "AI generates complete BBS draft with assumptions. Engineer verification and sign-off are required before construction execution.",
      "Verify cutting length, bend deduction, lap length and development length before site use.",
      ...duplicateBarMarks.map((mark) => `Duplicate bar mark detected: ${mark}`),
    ];

    return NextResponse.json({
      ok: true,
      count: items.length,
      totalWeight,
      wastagePercent,
      weightWithWastage,
      diameterSummary: summarizeByDiameter(items),
      memberTypeSummary: summarizeByMemberType(items),
      duplicateBarMarks,
      validationAlerts,
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
