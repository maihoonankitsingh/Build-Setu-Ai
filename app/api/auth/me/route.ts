import { getUserProfilePhoto } from "@/lib/auth/profile-photo-store";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession, safeUser } from "@/lib/auth-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  
  const savedProfilePhoto = getUserProfilePhoto(user?.email);
  if (savedProfilePhoto && user) {
    (user as any).image = (user as any).image || savedProfilePhoto;
    (user as any).picture = (user as any).picture || savedProfilePhoto;
    (user as any).avatarUrl = (user as any).avatarUrl || savedProfilePhoto;
  }
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
