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
