import { NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function enhanceArchitecturePrompt(prompt: string, renderType: string, roomType?: string) {
  return [
    "Create a premium realistic architecture/interior design image.",
    `Render type: ${renderType}.`,
    roomType ? `Area: ${roomType}.` : "",
    `Design brief: ${prompt}`,
    "Style: modern Indian premium, clean luxury, realistic materials, professional lighting, high-detail 3D render.",
    "Avoid text, watermark, labels, distorted geometry, extra doors, impossible stairs, unsafe structural elements.",
    "Output should be presentation-ready for an interior designer or architect client.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is missing" },
        { status: 500 },
      );
    }

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

    const finalPrompt = enhanceArchitecturePrompt(prompt, renderType, roomType);

    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size: "1024x1024",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json(
        { ok: false, error: "Image generation failed: no image returned" },
        { status: 500 },
      );
    }

    const render = await prisma.render.create({
      data: {
        projectId,
        prompt: finalPrompt,
        renderType,
        roomType,
        status: "COMPLETED",
      },
    });

    const outputDir = path.join(process.cwd(), "public", "generated", "renders");
    await mkdir(outputDir, { recursive: true });

    const fileName = `${render.id}.png`;
    const filePath = path.join(outputDir, fileName);
    const imageBuffer = Buffer.from(b64, "base64");

    await writeFile(filePath, imageBuffer);

    const imageUrl = `/generated/renders/${fileName}`;

    const updatedRender = await prisma.render.update({
      where: { id: render.id },
      data: { imageUrl },
    });

    await prisma.toolRun.create({
      data: {
        projectId,
        toolType:
          renderType.toLowerCase().includes("exterior")
            ? "EXTERIOR_ELEVATION"
            : "INTERIOR_RENDER",
        inputJson: JSON.stringify({ projectId, prompt, finalPrompt, renderType, roomType }),
        outputJson: JSON.stringify({ renderId: render.id, imageUrl }),
        creditsUsed: 5,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      ok: true,
      render: updatedRender,
      imageUrl,
    });
  } catch (error) {
    console.error("IMAGE_GENERATION_ERROR", error);

    const message =
      error instanceof Error ? error.message : "Failed to generate image";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
