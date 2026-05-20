import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@buildsetu.ai";

const PACKS: Record<
  string,
  {
    name: string;
    credits: number;
    amount: number;
  }
> = {
  starter: {
    name: "Starter Credit Pack",
    credits: 50000,
    amount: 2499,
  },
  pro: {
    name: "Pro Credit Pack",
    credits: 100000,
    amount: 4999,
  },
  agency: {
    name: "Agency Credit Pack",
    credits: 300000,
    amount: 12999,
  },
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
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
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

    const packId = typeof body?.packId === "string" ? body.packId : "";
    const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

    const pack = PACKS[packId];

    if (!pack || !orderId || !paymentId || !signature) {
      return NextResponse.json(
        { ok: false, error: "Invalid payment verification payload" },
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

    if (existing) {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, credits: true },
      });

      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "Payment already verified",
        credits: current?.credits ?? user.credits,
        transaction: existing,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: pack.credits,
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
          creditsUsed: pack.credits,
          note: `${pack.name} added via Razorpay. Amount ₹${pack.amount}. order=${orderId}; payment=${paymentId}`,
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      ok: true,
      message: `${pack.credits} credits added successfully`,
      pack: {
        id: packId,
        ...pack,
      },
      user: result.updatedUser,
      credits: result.updatedUser.credits,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("CREDITS_RAZORPAY_VERIFY_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to verify Razorpay payment",
      },
      { status: 500 },
    );
  }
}
