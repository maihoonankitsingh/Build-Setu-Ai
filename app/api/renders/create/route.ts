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

    const projectId = safeString((body as any).projectId);
    const prompt = safeString((body as any).prompt);
    const renderType = safeString((body as any).renderType) || "Interior Render";
    const roomType = safeString((body as any).roomType);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "projectId is required" },
        { status: 400 },
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "prompt is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: prismaUser.id,
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found for current user" },
        { status: 404 },
      );
    }

    const render = await prisma.render.create({
      data: {
        projectId,
        prompt,
        renderType,
        roomType,
        imageUrl: safeString((body as any).imageUrl),
        status: "COMPLETED",
      },
    });

    await prisma.toolRun.create({
      data: {
        userId: prismaUser.id,
        projectId,
        toolType:
          renderType.toLowerCase().includes("exterior")
            ? "EXTERIOR_ELEVATION"
            : "INTERIOR_RENDER",
        inputJson: JSON.stringify({ projectId, prompt, renderType, roomType }),
        outputJson: JSON.stringify({ renderId: render.id, imageUrl: render.imageUrl }),
        creditsUsed: 1,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      ok: true,
      userId: prismaUser.id,
      email: user.email,
      render,
    });
  } catch (error) {
    console.error("RENDER_CREATE_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create render" },
      { status: 500 },
    );
  }
}
