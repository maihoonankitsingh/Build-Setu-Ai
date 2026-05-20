import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sumNumbers(items: any[], key: string) {
  return items.reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
}

export async function GET(request: NextRequest) {
  const admin = await getAuthUserFromRequest(request);

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Admin access required" },
      { status: 403 },
    );
  }

  const [
    users,
    payments,
    subscriptions,
    transactions,
    toolRuns,
    projectCount,
    renderCount,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
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
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.planSubscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.toolRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.project.count(),
    prisma.render.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  const verifiedPayments = payments.filter((payment) => payment.status === "VERIFIED");
  const verifiedRevenue = sumNumbers(verifiedPayments, "amount");
  const totalWalletCredits = sumNumbers(users, "credits");
  const totalCreditsPurchased = transactions
    .filter((txn) => Number(txn.creditsUsed) > 0)
    .reduce((sum, txn) => sum + Number(txn.creditsUsed), 0);
  const totalCreditsUsed = Math.abs(
    transactions
      .filter((txn) => Number(txn.creditsUsed) < 0)
      .reduce((sum, txn) => sum + Number(txn.creditsUsed), 0),
  );

  const toolStats = Object.values(
    toolRuns.reduce((acc: any, run) => {
      const key = run.toolType;
      acc[key] ||= {
        toolType: key,
        count: 0,
        creditsUsed: 0,
        completed: 0,
        failed: 0,
      };

      acc[key].count += 1;
      acc[key].creditsUsed += Number(run.creditsUsed || 0);
      if (run.status === "COMPLETED") acc[key].completed += 1;
      if (run.status === "FAILED") acc[key].failed += 1;

      return acc;
    }, {}),
  ).sort((a: any, b: any) => b.count - a.count);

  const recentActivity = [
    ...payments.slice(0, 20).map((payment) => ({
      id: `payment-${payment.id}`,
      type: "PAYMENT",
      title: `${payment.itemName || payment.type} · ₹${payment.amount.toLocaleString("en-IN")}`,
      subtitle: `${payment.user?.email || "No user"} · ${payment.status}`,
      createdAt: payment.createdAt,
    })),
    ...transactions.slice(0, 20).map((txn) => ({
      id: `txn-${txn.id}`,
      type: "CREDIT",
      title: `${txn.actionType} · ${txn.creditsUsed > 0 ? "+" : ""}${txn.creditsUsed.toLocaleString("en-IN")} credits`,
      subtitle: `${txn.user?.email || "No user"} · ${txn.note || ""}`,
      createdAt: txn.createdAt,
    })),
    ...toolRuns.slice(0, 20).map((run) => ({
      id: `tool-${run.id}`,
      type: "TOOL",
      title: `${run.toolType} · ${run.status}`,
      subtitle: `${run.user?.email || "No user"} · ${run.creditsUsed.toLocaleString("en-IN")} credits`,
      createdAt: run.createdAt,
    })),
  ].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))).slice(0, 30);

  return NextResponse.json({
    ok: true,
    summary: {
      userCount: users.length,
      activeUserCount: users.filter((user) => user.status === "ACTIVE").length,
      paymentCount: payments.length,
      verifiedPaymentCount: verifiedPayments.length,
      activeSubscriptionCount: subscriptions.filter((sub) => sub.status === "ACTIVE").length,
      transactionCount: transactions.length,
      toolRunCount: toolRuns.length,
      projectCount,
      renderCount,
      verifiedRevenue,
      totalWalletCredits,
      totalCreditsPurchased,
      totalCreditsUsed,
    },
    users,
    payments,
    subscriptions,
    transactions,
    toolRuns,
    toolStats,
    recentActivity,
    auditLogs,
  });
}
