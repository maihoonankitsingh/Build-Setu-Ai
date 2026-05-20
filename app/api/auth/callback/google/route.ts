import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  createSession,
  setSessionCookie,
  upsertGoogleUser,
} from "@/lib/auth-store";

const APP_URL = "https://build.sikhadenge.in";

function appRedirect(path: string) {
  return NextResponse.redirect(new URL(path, APP_URL));
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const savedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;

    if (!code || !state || !savedState || state !== savedState) {
      return appRedirect("/login?error=google_state");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Google OAuth missing env", {
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
      });
      return appRedirect("/login?error=google_config");
    }

    const redirectUri = `${APP_URL}/api/auth/callback/google`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("Google token exchange failed", {
        status: tokenRes.status,
        redirectUri,
        body: text,
      });
      return appRedirect("/login?error=google_token");
    }

    const tokenJson = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    });

    if (!profileRes.ok) {
      const text = await profileRes.text();
      console.error("Google profile fetch failed", {
        status: profileRes.status,
        body: text,
      });
      return appRedirect("/login?error=google_profile");
    }

    const profile = await profileRes.json();

    if (!profile.email) {
      return appRedirect("/login?error=google_email");
    }

    const user = await upsertGoogleUser({
      googleId: String(profile.sub || ""),
      email: String(profile.email || ""),
      name: String(profile.name || profile.email || "BuildSetu User"),
      avatar: String(profile.picture || ""),
    });

    const sessionToken = await createSession(user);

    const res = NextResponse.redirect(new URL("/", APP_URL));
    setSessionCookie(res, sessionToken);
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/", maxAge: 0 });

    return res;
  } catch (error) {
    console.error("Google callback failed", error);
    return appRedirect("/login?error=google_failed");
  }
}
