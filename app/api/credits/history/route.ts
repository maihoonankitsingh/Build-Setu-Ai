import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import { readHistory } from "@/lib/billing-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      history: [],
      transactions: [],
    });
  }

  const history = await readHistory();
  const userHistory = history.filter((item) => {
    if (item.userId && item.userId === user.id) return true;
    if (item.email && item.email.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  });

  return NextResponse.json({
    ok: true,
    authenticated: true,
    userId: user.id,
    email: user.email,
    history: userHistory,
    transactions: userHistory,
  });
}
