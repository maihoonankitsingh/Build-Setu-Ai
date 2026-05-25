import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const itemId = body && typeof body === "object" ? String((body as any).itemId || "") : "";

    if (!itemId) {
      return NextResponse.json({ ok: false, error: "itemId is required" }, { status: 400 });
    }

    const item = await prisma.bOQItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error("BOQ_DELETE_ITEM_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to delete BOQ item" }, { status: 500 });
  }
}
