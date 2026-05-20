import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] || "";
  const pathname = request.nextUrl.pathname;

  if (
    host === "buildai.sikhadenge.in" &&
    pathname === "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/buildai";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
