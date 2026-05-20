import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, clearSessionCookie, destroySession } from "@/lib/auth-store";

const APP_URL = "https://build.sikhadenge.in";

async function logout(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  await destroySession(token);

  const res = NextResponse.redirect(new URL("/login", APP_URL));
  clearSessionCookie(res);
  return res;
}

export async function GET(request: NextRequest) {
  return logout(request);
}

export async function POST(request: NextRequest) {
  return logout(request);
}
