import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const DATA_FILE = path.join(DATA_DIR, "plan-subscriptions.json");
const DEMO_EMAIL = "demo@buildsetu.ai";

const PLANS: Record<
  string,
  {
    name: string;
    interval: "monthly" | "yearly";
    amount: number;
    credits: number;
  }
> = {
  starter_monthly: {
    name: "Starter Plan",
    interval: "monthly",
    amount: 2499,
    credits: 120,
  },
  pro_monthly: {
    name: "Pro Plan",
    interval: "monthly",
    amount: 4999,
    credits: 400,
  },
  agency_monthly: {
    name: "Agency Plan",
    interval: "monthly",
    amount: 12999,
    credits: 1200,
  },
  starter_yearly: {
    name: "Starter Plan",
    interval: "yearly",
    amount: 24999,
    credits: 1500,
  },
  pro_yearly: {
    name: "Pro Plan",
    interval: "yearly",
    amount: 49999,
    credits: 5200,
  },
  agency_yearly: {
    name: "Agency Plan",
    interval: "yearly",
    amount: 129999,
    credits: 16000,
  },
};

type PlanStatus = {
  userEmail: string;
  planId: string;
  planName: string;
  interval: "monthly" | "yearly";
  amount: number;
  credits: number;
  status: "ACTIVE";
  paymentId: string;
  orderId: string;
  startedAt: string;
  renewsAt: string;
};

function verifySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw new Error("Razorpay secret is missing");
  }

  const expected = crypto
    .createHmac("sha256", secret.trim().replace(/^["']|["']$/g, ""))
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function readAll(): Promise<PlanStatus[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(items: PlanStatus[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function addInterval(date: Date, interval: "monthly" | "yearly") {
  const next = new Date(date);
  if (interval === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "BuildSetu Demo User",
      credits: 120,
    },
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const planId = typeof body?.planId === "string" ? body.planId : "";
    const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

    const plan = PLANS[planId];

    if (!plan || !orderId || !paymentId || !signature) {
      return NextResponse.json(
        { ok: false, error: "Invalid plan payment verification payload" },
        { status: 400 },
      );
    }

    const valid = verifySignature({ orderId, paymentId, signature });

    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Payment signature verification failed" },
        { status: 400 },
      );
    }

    const user = await getOrCreateDemoUser();

    const existing = await prisma.creditTransaction.findFirst({
      where: {
        userId: user.id,
        actionType: "PURCHASE",
        note: {
          contains: paymentId,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const renewsAt = addInterval(now, plan.interval);

    const planStatus: PlanStatus = {
      userEmail: DEMO_EMAIL,
      planId,
      planName: plan.name,
      interval: plan.interval,
      amount: plan.amount,
      credits: plan.credits,
      status: "ACTIVE",
      paymentId,
      orderId,
      startedAt: now.toISOString(),
      renewsAt: renewsAt.toISOString(),
    };

    const all = await readAll();
    const filtered = all.filter((item) => item.userEmail !== DEMO_EMAIL);
    filtered.unshift(planStatus);
    await writeAll(filtered.slice(0, 100));

    if (existing) {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, credits: true },
      });

      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "Plan payment already verified",
        plan: planStatus,
        credits: current?.credits ?? user.credits,
        transaction: existing,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: plan.credits,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          credits: true,
        },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          userId: user.id,
          actionType: "PURCHASE",
          creditsUsed: plan.credits,
          note: `${plan.name} ${plan.interval} activated via Razorpay. Amount ₹${plan.amount}. order=${orderId}; payment=${paymentId}`,
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      ok: true,
      message: `${plan.name} activated successfully`,
      plan: planStatus,
      user: result.updatedUser,
      credits: result.updatedUser.credits,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("PLAN_RAZORPAY_VERIFY_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to verify plan payment",
      },
      { status: 500 },
    );
  }
}
