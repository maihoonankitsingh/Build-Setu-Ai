import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUserFromRequest(request);

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const mode = body?.mode === "DEDUCT" ? "DEDUCT" : "ADD";
    const credits = Math.abs(Number(body?.credits || 0));
    const note =
      typeof body?.note === "string" && body.note.trim()
        ? body.note.trim()
        : `Admin ${mode.toLowerCase()} credits`;

    if (!userId || !Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valid userId and credits are required" },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, credits: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 },
      );
    }

    const delta = mode === "DEDUCT" ? -credits : credits;

    if (mode === "DEDUCT" && targetUser.credits < credits) {
      return NextResponse.json(
        { ok: false, error: "User does not have enough credits" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: delta,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          credits: true,
          status: true,
        },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          actionType: mode === "DEDUCT" ? "ADMIN_DEDUCT" : "ADMIN_ADD",
          creditsUsed: delta,
          note,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: mode === "DEDUCT" ? "ADMIN_DEDUCT_CREDITS" : "ADMIN_ADD_CREDITS",
          entityType: "User",
          entityId: userId,
          metadataJson: JSON.stringify({
            targetUserEmail: targetUser.email,
            credits,
            delta,
            note,
          }),
          ipAddress: request.headers.get("x-forwarded-for") || null,
          userAgent: request.headers.get("user-agent") || null,
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      ok: true,
      user: result.updatedUser,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("ADMIN_CREDIT_ACTION_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update credits" },
      { status: 500 },
    );
  }
}
