import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    enabled: false,
    status: "held",
    message: "Subscription email reminders are currently disabled. Monthly subscription expiry option is kept for future use.",
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    enabled: false,
    status: "held",
    message: "Subscription email reminders are currently disabled. Monthly subscription expiry option is kept for future use.",
  });
}
