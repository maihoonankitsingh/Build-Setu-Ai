import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      credits: 0,
      balance: 0,
    });
  }

  const credits = Number(user.credits || 0);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: user.id,
    email: user.email,
    credits,
    balance: credits,
  });
}
