import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession, getUsers, saveUsers } from "@/lib/auth-store";

async function expirePlanIfNeeded(userId: string) {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId) as any;

  if (!user) return null;

  const expiresAt = user.planExpiresAt ? new Date(user.planExpiresAt).getTime() : 0;
  const now = Date.now();

  if (user.planStatus === "active" && expiresAt && expiresAt <= now) {
    user.planStatus = "expired";
    user.planId = "free";
    user.planName = "Free";
    user.planExpiredAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    await saveUsers(users);
  }

  return user;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const sessionUser = await getUserFromSession(token) as any;

  if (!sessionUser) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      planId: null,
      planName: null,
      planStatus: null,
      planCycle: null,
      planExpiresAt: null,
    });
  }

  const user = await expirePlanIfNeeded(sessionUser.id) || sessionUser;

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: user.id,
    email: user.email,
    planId: user.planId || "free",
    planName: user.planName || "Free",
    planStatus: user.planStatus || "active",
    planCycle: user.planCycle || "free",
    planStartedAt: user.planStartedAt || null,
    planExpiresAt: user.planExpiresAt || null,
    credits: user.credits || 0,
  });
}
