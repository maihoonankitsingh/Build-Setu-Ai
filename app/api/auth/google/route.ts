import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE } from "@/lib/auth-store";

const APP_URL = "https://build.sikhadenge.in";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return new NextResponse(
      "Google login is not configured. Missing GOOGLE_CLIENT_ID in .env",
      { status: 500 }
    );
  }

  const redirectUri = `${APP_URL}/api/auth/callback/google`;
  const state = randomBytes(16).toString("hex");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}
