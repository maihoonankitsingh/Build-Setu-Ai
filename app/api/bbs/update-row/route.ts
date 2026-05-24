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

    const id = safeString((body as any).id);

    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const existing = await prisma.bBSItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "BBS row not found" }, { status: 404 });
    }

    const memberType = safeString((body as any).memberType) || existing.memberType;
    const memberId = safeString((body as any).memberId) || existing.memberId;
    const barMark = safeString((body as any).barMark) || existing.barMark;
    const diameter = safeNumber((body as any).diameter, Number(existing.diameter || 0));
    const quantity = safeNumber((body as any).quantity, Number(existing.quantity || 0));
    const shapeCode = safeString((body as any).shapeCode) || existing.shapeCode;
    const cuttingLength = safeNumber((body as any).cuttingLength, Number(existing.cuttingLength || 0));
    const drawingRef = safeString((body as any).drawingRef) || existing.drawingRef;
    const status = safeString((body as any).status) || existing.status;

    if (barMark && barMark !== existing.barMark) {
      const duplicate = await prisma.bBSItem.findFirst({
        where: {
          projectId: existing.projectId,
          barMark,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { ok: false, error: "Duplicate bar mark already exists for this project" },
          { status: 409 },
        );
      }
    }

    const unitWeight = steelUnitWeightKgPerM(diameter);
    const totalLength = round3(quantity * cuttingLength);
    const totalWeight = round2(totalLength * unitWeight);

    const item = await prisma.bBSItem.update({
      where: { id },
      data: {
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
      message: "BBS row updated successfully",
    });
  } catch (error) {
    console.error("BBS_UPDATE_ROW_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to update BBS row" }, { status: 500 });
  }
}
