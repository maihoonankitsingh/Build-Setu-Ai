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

    const itemId = cleanString((body as any).itemId);

    if (!itemId) {
      return NextResponse.json({ ok: false, error: "itemId is required" }, { status: 400 });
    }

    const existing = await prisma.bOQItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "BOQ item not found" }, { status: 404 });
    }

    const itemCode = cleanString((body as any).itemCode, existing.itemCode || "MANUAL");
    const description = cleanString((body as any).description, existing.description || "Manual BOQ item");
    const unit = cleanString((body as any).unit, existing.unit || "Sqft");
    const quantity = cleanNumber((body as any).quantity, Number(existing.quantity || 0));
    const rate = cleanNumber((body as any).rate, Number(existing.rate || 0));
    const status = cleanString((body as any).status, existing.status || "Draft");
    const drawingRef = cleanString((body as any).drawingRef, existing.drawingRef || "Manual Entry");
    const amount = Number((quantity * rate).toFixed(2));

    const item = await prisma.bOQItem.update({
      where: { id: itemId },
      data: {
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
    console.error("BOQ_UPDATE_ITEM_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to update BOQ item" }, { status: 500 });
  }
}
