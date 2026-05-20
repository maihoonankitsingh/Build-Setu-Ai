import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  findUserByEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth-store";

const APP_URL = "https://build.sikhadenge.in";

function appUrl(path: string) {
  return new URL(path, APP_URL);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(appUrl("/login?error=invalid"));
  }

  const token = await createSession(user);
  const res = NextResponse.redirect(appUrl("/"));
  setSessionCookie(res, token);

  return res;
}
