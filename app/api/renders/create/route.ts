import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const projectId = safeString(body.projectId);
    const prompt = safeString(body.prompt);
    const renderType = safeString(body.renderType) || "Interior Render";
    const roomType = safeString(body.roomType);

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

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found" },
        { status: 404 },
      );
    }

    const render = await prisma.render.create({
      data: {
        projectId,
        prompt,
        renderType,
        roomType,
        imageUrl: safeString(body.imageUrl),
        status: "COMPLETED",
      },
    });

    await prisma.toolRun.create({
      data: {
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
