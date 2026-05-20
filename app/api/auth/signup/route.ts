import { NextRequest, NextResponse } from "next/server";
import { createEmailUser, createSession, setSessionCookie } from "@/lib/auth-store";

const APP_URL = "https://build.sikhadenge.in";

function appUrl(path: string) {
  return new URL(path, APP_URL);
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const phone = String(form.get("phone") || "").trim();

    if (!email || !password || password.length < 6) {
      return NextResponse.redirect(appUrl("/login?mode=signup&error=invalid"));
    }

    const user = await createEmailUser({ name, email, password, phone });
    const token = await createSession(user);

    const res = NextResponse.redirect(appUrl("/"));
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "SIGNUP_FAILED";
    const code = message === "USER_ALREADY_EXISTS" ? "exists" : "failed";
    return NextResponse.redirect(appUrl(`/login?mode=signup&error=${code}`));
  }
}
