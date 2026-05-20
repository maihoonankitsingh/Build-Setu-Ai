import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import {
  PLAN_PACKS,
  createRazorpayOrder,
  makeReceipt,
  saveBillingOrder,
} from "@/lib/billing-store";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const planId = String(body.planId || body.packId || "pro");
    const plan = PLAN_PACKS[planId] || PLAN_PACKS.pro;

    const receipt = makeReceipt("plan");
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: plan.amountPaise,
      receipt,
      notes: {
        userId: user.id,
        email: user.email,
        type: "plan",
        planId,
        planName: plan.label,
        credits: String(plan.credits),
      },
    });

    await saveBillingOrder({
      id: `bo_${Date.now()}`,
      razorpayOrderId: razorpayOrder.id,
      userId: user.id,
      email: user.email,
      type: "plan",
      status: "created",
      amountPaise: plan.amountPaise,
      currency: "INR",
      credits: plan.credits,
      planId,
      planName: plan.label,
      receipt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,

      // New flat response
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: plan.amountPaise,
      amountPaise: plan.amountPaise,
      currency: "INR",
      credits: plan.credits,
      planId,
      planName: plan.label,
      userId: user.id,
      email: user.email,

      // Backward-compatible response for current pricing page
      order: {
        id: razorpayOrder.id,
        amount: plan.amountPaise,
        currency: "INR",
        receipt,
      },
      plan: {
        id: planId,
        key: planId,
        name: plan.label,
        label: plan.label,
        credits: plan.credits,
        amount: plan.amountPaise,
        amountPaise: plan.amountPaise,
      },
    });
  } catch (error) {
    console.error("plans/order failed", error);
    return NextResponse.json({ ok: false, error: "PLAN_ORDER_CREATE_FAILED" }, { status: 500 });
  }
}
