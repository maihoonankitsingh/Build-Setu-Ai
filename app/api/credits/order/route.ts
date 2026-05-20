import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    credits: 120,
    amount: 2499,
  },
  pro: {
    name: "Pro Credit Pack",
    credits: 400,
    amount: 4999,
  },
  agency: {
    name: "Agency Credit Pack",
    credits: 1200,
    amount: 12999,
  },
};

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are missing");
  }

  return {
    keyId,
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    }),
  };
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

    const { keyId, client } = getRazorpayClient();

    const order = await client.orders.create({
      amount: pack.amount * 100,
      currency: "INR",
      receipt: `buildsetu_${packId}_${Date.now()}`,
      notes: {
        app: "BuildSetu AI",
        packId,
        packName: pack.name,
        credits: String(pack.credits),
      },
    });

    return NextResponse.json({
      ok: true,
      keyId,
      order,
      pack: {
        id: packId,
        ...pack,
      },
    });
  } catch (error) {
    console.error("CREDITS_RAZORPAY_ORDER_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create Razorpay order",
      },
      { status: 500 },
    );
  }
}
