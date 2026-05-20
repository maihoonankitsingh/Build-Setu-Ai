import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS: Record<
  string,
  {
    name: string;
    interval: "monthly" | "yearly";
    amount: number;
    credits: number;
  }
> = {
  pro_monthly: {
    name: "Pro Plan",
    interval: "monthly",
    amount: 4999,
    credits: 100000,
  },
  max_monthly: {
    name: "Max Plan",
    interval: "monthly",
    amount: 9999,
    credits: 250000,
  },
  ultra_monthly: {
    name: "Ultra Plan",
    interval: "monthly",
    amount: 24999,
    credits: 750000,
  },
  pro_yearly: {
    name: "Pro Plan",
    interval: "yearly",
    amount: 49999,
    credits: 1200000,
  },
  max_yearly: {
    name: "Max Plan",
    interval: "yearly",
    amount: 99999,
    credits: 3000000,
  },
  ultra_yearly: {
    name: "Ultra Plan",
    interval: "yearly",
    amount: 249999,
    credits: 9000000,
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

function extractRazorpayError(error: unknown) {
  const anyError = error as any;

  return {
    message:
      anyError?.error?.description ||
      anyError?.error?.reason ||
      anyError?.message ||
      "Failed to create Razorpay plan order",
    code: anyError?.error?.code || anyError?.code || null,
    field: anyError?.error?.field || null,
    statusCode: anyError?.statusCode || anyError?.status || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const planId = typeof body?.planId === "string" ? body.planId : "";
    const plan = PLANS[planId];

    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "Invalid plan" },
        { status: 400 },
      );
    }

    const { keyId, client } = getRazorpayClient();

    const order = await client.orders.create({
      amount: plan.amount * 100,
      currency: "INR",
      receipt: `buildsetu_plan_${planId}_${Date.now()}`.slice(0, 40),
      notes: {
        app: "BuildSetu AI",
        planId,
        planName: plan.name,
        interval: plan.interval,
        credits: String(plan.credits),
      },
    });

    return NextResponse.json({
      ok: true,
      keyId,
      order,
      plan: {
        id: planId,
        ...plan,
      },
    });
  } catch (error) {
    const details = extractRazorpayError(error);

    console.error("PLAN_RAZORPAY_ORDER_ERROR", details, error);

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
