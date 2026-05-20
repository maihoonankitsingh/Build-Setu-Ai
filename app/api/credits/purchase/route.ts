import { NextRequest, NextResponse } from "next/server";
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

async function getOrCreateDemoUser() {
  const user = await prisma.user.upsert({
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

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const packId = typeof body?.packId === "string" ? body.packId : "";
    const pack = PACKS[packId];

    if (!pack) {
      return NextResponse.json(
        { ok: false, error: "Invalid credit pack" },
        { status: 400 },
      );
    }

    const user = await getOrCreateDemoUser();

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
          note: `${pack.name} added. Amount ₹${pack.amount}. Payment gateway pending; demo/manual credit top-up.`,
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      ok: true,
      message: `${pack.credits} credits added`,
      pack,
      user: result.updatedUser,
      credits: result.updatedUser.credits,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("CREDITS_PURCHASE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to purchase credits" },
      { status: 500 },
    );
  }
}
