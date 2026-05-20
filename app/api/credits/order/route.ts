import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import {
  CREDIT_PACKS,
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
    const packId = String(body.packId || body.planId || body.pack || "pro-credit-pack");
    const pack = CREDIT_PACKS[packId] || CREDIT_PACKS["pro-credit-pack"];

    if (!pack.amountPaise || pack.amountPaise <= 0) {
      return NextResponse.json({ ok: false, error: "INVALID_PAID_PACK" }, { status: 400 });
    }

    const receipt = makeReceipt("cred");
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: pack.amountPaise,
      receipt,
      notes: {
        userId: user.id,
        email: user.email,
        type: "credits",
        packId,
        credits: String(pack.credits),
      },
    });

    await saveBillingOrder({
      id: `bo_${Date.now()}`,
      razorpayOrderId: razorpayOrder.id,
      userId: user.id,
      email: user.email,
      type: "credits",
      status: "created",
      amountPaise: pack.amountPaise,
      currency: "INR",
      credits: pack.credits,
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
      amount: pack.amountPaise,
      amountPaise: pack.amountPaise,
      currency: "INR",
      credits: pack.credits,
      packId,
      userId: user.id,
      email: user.email,

      // Backward-compatible response for current credits page
      order: {
        id: razorpayOrder.id,
        amount: pack.amountPaise,
        currency: "INR",
        receipt,
      },
      pack: {
        id: packId,
        key: packId,
        name: pack.label,
        label: pack.label,
        credits: pack.credits,
        amount: pack.amountPaise,
        amountPaise: pack.amountPaise,
      },
    });
  } catch (error) {
    console.error("credits/order failed", error);
    return NextResponse.json({ ok: false, error: "ORDER_CREATE_FAILED" }, { status: 500 });
  }
}
