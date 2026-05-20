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

function cleanEnv(value: string | undefined) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function getRazorpayClient() {
  const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are missing in BuildSetu .env");
  }

  if (!keyId.startsWith("rzp_")) {
    throw new Error("RAZORPAY_KEY_ID format invalid. It should start with rzp_");
  }

  return {
    keyId,
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    }),
  };
}

function extractRazorpayError(error: unknown) {
  const anyError = error as any;

  return {
    message:
      anyError?.error?.description ||
      anyError?.error?.reason ||
      anyError?.message ||
      "Failed to create Razorpay order",
    code: anyError?.error?.code || anyError?.code || null,
    field: anyError?.error?.field || null,
    statusCode: anyError?.statusCode || anyError?.status || null,
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
      receipt: `buildsetu_${packId}_${Date.now()}`.slice(0, 40),
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
    const details = extractRazorpayError(error);

    console.error("CREDITS_RAZORPAY_ORDER_ERROR", details, error);

    return NextResponse.json(
      {
        ok: false,
        error: details.message,
        code: details.code,
        field: details.field,
        statusCode: details.statusCode,
      },
      { status: 500 },
    );
  }
}
