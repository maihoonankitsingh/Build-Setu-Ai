import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getAuthUserFromRequest(request);

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Admin access required" },
      { status: 403 },
    );
  }

  const [
    userCount,
    paymentCount,
    transactionCount,
    toolRunCount,
    users,
    payments,
    transactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.payment.count(),
    prisma.creditTransaction.count(),
    prisma.toolRun.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        credits: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  const revenue = await prisma.payment.aggregate({
    where: { status: "VERIFIED" },
    _sum: { amount: true },
  });

  return NextResponse.json({
    ok: true,
    summary: {
      userCount,
      paymentCount,
      transactionCount,
      toolRunCount,
      verifiedRevenue: revenue._sum.amount || 0,
    },
    users,
    payments,
    transactions,
  });
}
