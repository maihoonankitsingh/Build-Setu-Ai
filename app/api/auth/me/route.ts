import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { ok: false, user: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: publicUser(user),
  });
}
