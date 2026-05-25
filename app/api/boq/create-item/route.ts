import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const projectId = cleanString((body as any).projectId);
    const itemCode = cleanString((body as any).itemCode, "MANUAL");
    const description = cleanString((body as any).description);
    const unit = cleanString((body as any).unit, "Sqft");
    const quantity = cleanNumber((body as any).quantity);
    const rate = cleanNumber((body as any).rate);
    const status = cleanString((body as any).status, "Draft");
    const drawingRef = cleanString((body as any).drawingRef, "Manual Entry");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ ok: false, error: "description is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const amount = Number((quantity * rate).toFixed(2));

    const item = await prisma.bOQItem.create({
      data: {
        projectId,
        itemCode,
        description,
        unit,
        quantity,
        rate,
        amount,
        status,
        drawingRef,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("BOQ_CREATE_ITEM_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to create BOQ item" }, { status: 500 });
  }
}
