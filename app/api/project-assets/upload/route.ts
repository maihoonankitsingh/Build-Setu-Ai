import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const projectIdRaw = String(formData.get("projectId") || "draft");
    const projectId = safeName(projectIdRaw) || "draft";
    const files = formData.getAll("files");

    if (!files.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "No files uploaded."
        },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "generated", "project-assets", projectId);
    await mkdir(uploadDir, { recursive: true });

    const assets = [];

    for (const item of files) {
      if (!(item instanceof File)) continue;

      const originalName = item.name || "asset";
      const clean = safeName(originalName) || "asset";
      const fileName = `${Date.now()}-${clean}`;
      const targetPath = path.join(uploadDir, fileName);
      const bytes = Buffer.from(await item.arrayBuffer());

      await writeFile(targetPath, bytes);

      assets.push({
        fileName,
        originalName,
        size: item.size,
        type: item.type || "application/octet-stream",
        url: `/generated/project-assets/${projectId}/${fileName}`
      });
    }

    return NextResponse.json({
      ok: true,
      projectId,
      assets
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Asset upload failed."
      },
      { status: 500 }
    );
  }
}
