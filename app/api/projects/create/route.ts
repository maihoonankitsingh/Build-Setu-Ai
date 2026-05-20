import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";
import { getOrCreatePrismaUser } from "@/lib/prisma-user";

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const prismaUser = await getOrCreatePrismaUser({
      email: user.email,
      name: user.name,
    });

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const title = safeString((body as any).title);
    const rawBrief = safeString((body as any).rawBrief);

    if (!title && !rawBrief) {
      return NextResponse.json(
        { ok: false, error: "title or rawBrief is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        userId: prismaUser.id,
        title: title || "Untitled Build Project",
        projectType: safeString((body as any).projectType),
        location: safeString((body as any).location),
        plotSize: safeString((body as any).plotSize),
        facing: safeString((body as any).facing),
        floors: safeString((body as any).floors),
        budget: safeString((body as any).budget),
        brief: rawBrief
          ? {
              create: {
                rawBrief,
                structuredJson: (body as any).structuredJson
                  ? JSON.stringify((body as any).structuredJson)
                  : undefined,
                questionsJson: (body as any).questionsJson
                  ? JSON.stringify((body as any).questionsJson)
                  : undefined,
                answersJson: (body as any).answersJson
                  ? JSON.stringify((body as any).answersJson)
                  : undefined,
              },
            }
          : undefined,
      },
      include: {
        brief: true,
      },
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      prismaUserId: prismaUser.id,
      email: user.email,
      project,
    });
  } catch (error) {
    console.error("PROJECT_CREATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create project" },
      { status: 500 },
    );
  }
}
