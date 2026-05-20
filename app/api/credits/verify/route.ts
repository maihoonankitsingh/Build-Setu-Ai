import { NextRequest, NextResponse } from "next/server";
import {
  addCreditsToUser,
  appendHistory,
  findBillingOrder,
  updateBillingOrder,
  verifyRazorpaySignature,
} from "@/lib/billing-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const razorpayOrderId = String(body.razorpay_order_id || body.razorpayOrderId || body.orderId || "");
    const razorpayPaymentId = String(body.razorpay_payment_id || body.razorpayPaymentId || body.paymentId || "");
    const razorpaySignature = String(body.razorpay_signature || body.razorpaySignature || body.signature || "");

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ ok: false, error: "MISSING_PAYMENT_FIELDS" }, { status: 400 });
    }

    const order = await findBillingOrder(razorpayOrderId);

    if (!order || order.type !== "credits") {
      return NextResponse.json({ ok: false, error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    if (order.status === "verified") {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        credits: order.credits,
        userId: order.userId,
        email: order.email,
      });
    }

    const valid = verifyRazorpaySignature({
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!valid) {
      await updateBillingOrder(order.razorpayOrderId, { status: "failed", razorpayPaymentId });
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 400 });
    }

    const user = await addCreditsToUser(order.userId, order.credits);

    await updateBillingOrder(order.razorpayOrderId, {
      status: "verified",
      razorpayPaymentId,
    });

    await appendHistory({
      userId: order.userId,
      email: order.email,
      type: "PURCHASE",
      credits: order.credits,
      amountPaise: order.amountPaise,
      description: `Credit purchase +${order.credits.toLocaleString("en-IN")} credits`,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId,
    });

    return NextResponse.json({
      ok: true,
      userId: order.userId,
      email: order.email,
      creditsAdded: order.credits,
      balance: user.credits,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId,
    });
  } catch (error) {
    console.error("credits/verify failed", error);
    return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 500 });
  }
}
