import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function safeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function round3(value: number) {
  return Number(value.toFixed(3));
}

function steelUnitWeightKgPerM(diameterMm: number) {
  if (!diameterMm) return 0;
  return Number(((diameterMm * diameterMm) / 162).toFixed(3));
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const projectId = safeString((body as any).projectId);
    const memberType = safeString((body as any).memberType);
    const memberId = safeString((body as any).memberId);
    const barMark = safeString((body as any).barMark);
    const diameter = safeNumber((body as any).diameter);
    const quantity = safeNumber((body as any).quantity);
    const shapeCode = safeString((body as any).shapeCode) || "Straight";
    const cuttingLength = safeNumber((body as any).cuttingLength);
    const drawingRef = safeString((body as any).drawingRef) || "Manual Entry";
    const status = safeString((body as any).status) || "AI Final Draft - Engineer Review Required";

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    }

    if (!memberType || !memberId || !barMark) {
      return NextResponse.json(
        { ok: false, error: "memberType, memberId and barMark are required" },
        { status: 400 },
      );
    }

    if (!diameter || !quantity || !cuttingLength) {
      return NextResponse.json(
        { ok: false, error: "diameter, quantity and cuttingLength are required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const duplicate = await prisma.bBSItem.findFirst({
      where: { projectId, barMark },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { ok: false, error: "Duplicate bar mark already exists for this project" },
        { status: 409 },
      );
    }

    const unitWeight = steelUnitWeightKgPerM(diameter);
    const totalLength = round3(quantity * cuttingLength);
    const totalWeight = round2(totalLength * unitWeight);

    const item = await prisma.bBSItem.create({
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
        totalWeight,
        drawingRef,
        status,
      },
    });

    return NextResponse.json({
      ok: true,
      item,
      message: "BBS row created successfully",
    });
  } catch (error) {
    console.error("BBS_CREATE_ROW_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to create BBS row" }, { status: 500 });
  }
}
