import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "BBS row not found" }, { status: 404 });
    }

    await prisma.bBSItem.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      id,
      message: "BBS row deleted successfully",
    });
  } catch (error) {
    console.error("BBS_DELETE_ROW_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to delete BBS row" }, { status: 500 });
  }
}
