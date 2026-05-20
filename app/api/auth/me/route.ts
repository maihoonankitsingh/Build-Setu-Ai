import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession, safeUser } from "@/lib/auth-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: safeUser(user),
  });
}
