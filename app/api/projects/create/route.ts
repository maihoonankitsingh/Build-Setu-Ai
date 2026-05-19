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

    const title = safeString(body.title);
    const rawBrief = safeString(body.rawBrief);

    if (!title && !rawBrief) {
      return NextResponse.json(
        { ok: false, error: "title or rawBrief is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        title: title || "Untitled Build Project",
        projectType: safeString(body.projectType),
        location: safeString(body.location),
        plotSize: safeString(body.plotSize),
        facing: safeString(body.facing),
        floors: safeString(body.floors),
        budget: safeString(body.budget),
        brief: rawBrief
          ? {
              create: {
                rawBrief,
                structuredJson: body.structuredJson
                  ? JSON.stringify(body.structuredJson)
                  : undefined,
                questionsJson: body.questionsJson
                  ? JSON.stringify(body.questionsJson)
                  : undefined,
                answersJson: body.answersJson
                  ? JSON.stringify(body.answersJson)
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
