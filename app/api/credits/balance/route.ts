import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@buildsetu.ai";

async function getOrCreateDemoUser() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "BuildSetu Demo User",
      credits: 120,
    },
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
    },
  });

  return user;
}

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    return NextResponse.json({
      ok: true,
      user,
      credits: user.credits,
    });
  } catch (error) {
    console.error("CREDITS_BALANCE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to fetch credits balance" },
      { status: 500 },
    );
  }
}
