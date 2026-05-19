import { NextResponse } from "next/server";
import OpenAI from "openai";
import { copyFile, mkdir } from "fs/promises";
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

function getFallbackSource(renderType: string) {
  const lower = renderType.toLowerCase();

  if (lower.includes("exterior") || lower.includes("elevation")) {
    return "exterior-elevation.png";
  }

  if (lower.includes("site")) {
    return "site-photo-redesign.png";
  }

  if (lower.includes("enhancer")) {
    return "render-enhancer.png";
  }

  return "interior-render.png";
}

async function saveRenderRecord({
  projectId,
  prompt,
  finalPrompt,
  renderType,
  roomType,
  imageUrl,
  fallback,
  errorMessage,
}: {
  projectId: string;
  prompt: string;
  finalPrompt: string;
  renderType: string;
  roomType?: string;
  imageUrl: string;
  fallback: boolean;
  errorMessage?: string;
}) {
  const render = await prisma.render.create({
    data: {
      projectId,
      prompt: finalPrompt,
      renderType,
      roomType,
      imageUrl,
      status: fallback ? "REVIEW_REQUIRED" : "COMPLETED",
    },
  });

  await prisma.toolRun.create({
    data: {
      projectId,
      toolType:
        renderType.toLowerCase().includes("exterior")
          ? "EXTERIOR_ELEVATION"
          : "INTERIOR_RENDER",
      inputJson: JSON.stringify({ projectId, prompt, finalPrompt, renderType, roomType }),
      outputJson: JSON.stringify({
        renderId: render.id,
        imageUrl,
        fallback,
        errorMessage: errorMessage || null,
      }),
      creditsUsed: fallback ? 0 : 5,
      status: fallback ? "REVIEW_REQUIRED" : "COMPLETED",
    },
  });

  return render;
}

async function createFallbackRender({
  projectId,
  prompt,
  finalPrompt,
  renderType,
  roomType,
  errorMessage,
}: {
  projectId: string;
  prompt: string;
  finalPrompt: string;
  renderType: string;
  roomType?: string;
  errorMessage?: string;
}) {
  const outputDir = path.join(process.cwd(), "public", "generated", "renders");
  await mkdir(outputDir, { recursive: true });

  const tempId = `demo-${Date.now()}`;
  const fileName = `${tempId}.png`;
  const imageUrl = `/generated/renders/${fileName}`;

  const fallbackFile = getFallbackSource(renderType);
  const sourcePath = path.join(process.cwd(), "public", "tool-images", fallbackFile);
  const outputPath = path.join(outputDir, fileName);

  await copyFile(sourcePath, outputPath);

  const render = await saveRenderRecord({
    projectId,
    prompt,
    finalPrompt,
    renderType,
    roomType,
    imageUrl,
    fallback: true,
    errorMessage,
  });

  return {
    ok: true,
    fallback: true,
    warning:
      "Demo fallback image saved. Real AI image generation will work after OpenAI billing is active.",
    render,
    imageUrl,
    providerError: errorMessage || null,
  };
}

export async function POST(request: Request) {
  let projectId = "";
  let prompt = "";
  let finalPrompt = "";
  let renderType = "Interior Render";
  let roomType: string | undefined;

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    projectId = safeString(body.projectId) || "";
    prompt = safeString(body.prompt) || "";
    renderType = safeString(body.renderType) || "Interior Render";
    roomType = safeString(body.roomType);

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

    finalPrompt = enhanceArchitecturePrompt(prompt, renderType, roomType);

    if (!process.env.OPENAI_API_KEY) {
      if (process.env.OPENAI_IMAGE_FALLBACK === "1") {
        const fallback = await createFallbackRender({
          projectId,
          prompt,
          finalPrompt,
          renderType,
          roomType,
          errorMessage: "OPENAI_API_KEY is missing",
        });

        return NextResponse.json(fallback);
      }

      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is missing" },
        { status: 500 },
      );
    }

    try {
      const imageResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: finalPrompt,
        size: "1024x1024",
      });

      const b64 = imageResponse.data?.[0]?.b64_json;

      if (!b64) {
        throw new Error("Image generation failed: no image returned");
      }

      const outputDir = path.join(process.cwd(), "public", "generated", "renders");
      await mkdir(outputDir, { recursive: true });

      const tempId = `ai-${Date.now()}`;
      const fileName = `${tempId}.png`;
      const filePath = path.join(outputDir, fileName);
      const imageUrl = `/generated/renders/${fileName}`;

      const { writeFile } = await import("fs/promises");
      await writeFile(filePath, Buffer.from(b64, "base64"));

      const render = await saveRenderRecord({
        projectId,
        prompt,
        finalPrompt,
        renderType,
        roomType,
        imageUrl,
        fallback: false,
      });

      return NextResponse.json({
        ok: true,
        fallback: false,
        render,
        imageUrl,
      });
    } catch (providerError) {
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : "Image provider failed";

      if (process.env.OPENAI_IMAGE_FALLBACK === "1") {
        const fallback = await createFallbackRender({
          projectId,
          prompt,
          finalPrompt,
          renderType,
          roomType,
          errorMessage,
        });

        return NextResponse.json(fallback);
      }

      throw providerError;
    }
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
