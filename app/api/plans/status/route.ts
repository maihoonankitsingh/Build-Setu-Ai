import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token) as any;

  if (!user) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      planId: null,
      planName: null,
      planStatus: null,
    });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: user.id,
    email: user.email,
    planId: user.planId || "free",
    planName: user.planName || "Free",
    planStatus: user.planStatus || "active",
    credits: user.credits || 0,
  });
}
