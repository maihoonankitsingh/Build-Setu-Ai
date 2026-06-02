import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

function resolveGeneratedImagePath(input: string) {
  const value = String(input || "").trim();
  if (!value) return "";

  let file = "";

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      if (url.pathname.endsWith("/api/ai/generated-image")) {
        file = String(url.searchParams.get("file") || "");
      } else if (url.pathname.startsWith("/generated/ai-images/")) {
        file = url.pathname.replace(/^\/+/, "");
      }
    } else if (value.startsWith("/api/ai/generated-image")) {
      const url = new URL(value, "https://buildsetu.local");
      file = String(url.searchParams.get("file") || "");
    } else if (value.startsWith("/generated/ai-images/")) {
      file = value.replace(/^\/+/, "");
    } else if (value.startsWith("generated/ai-images/")) {
      file = value;
    }
  } catch {
    file = "";
  }

  file = decodeURIComponent(file).replace(/^\/+/, "");

  if (
    !file ||
    file.includes("..") ||
    !file.startsWith("generated/ai-images/") ||
    !/\.(png|jpg|jpeg|webp)$/i.test(file)
  ) {
    return "";
  }

  return path.join(process.cwd(), "public", file);
}

async function appendAssets(newAssets: any[]) {
  const dataDir = path.join(process.cwd(), "data", "generated");
  const assetsPath = path.join(dataDir, "project-assets.json");

  await fs.mkdir(dataDir, { recursive: true });

  let existingRaw = "";
  let existing: any = { assets: [] };

  try {
    existingRaw = await fs.readFile(assetsPath, "utf8");
    const parsed = JSON.parse(existingRaw);
    if (Array.isArray(parsed)) {
      existing = { assets: parsed };
    } else if (parsed && Array.isArray(parsed.assets)) {
      existing = parsed;
    }
  } catch {
    existing = { assets: [] };
  }

  existing.assets = [...newAssets, ...(existing.assets || [])];
  await fs.writeFile(assetsPath, JSON.stringify(existing, null, 2), "utf8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const projectId = normalizeProjectId(String(body.projectId || ""));
    const projectTitle = String(body.projectTitle || "Selected Project");
    const toolSlug = String(body.toolSlug || "exterior-elevation");
    const toolName = String(body.toolName || "Exterior Elevation");
    const boardImageUrl = String(body.boardImageUrl || "").trim();
    const labels = Array.isArray(body.labels) ? body.labels.slice(0, 4) : [];

    if (!boardImageUrl) {
      return NextResponse.json({ error: "boardImageUrl missing" }, { status: 400 });
    }

    const sourcePath = resolveGeneratedImagePath(boardImageUrl);
    if (!sourcePath) {
      return NextResponse.json({ error: "Could not resolve board image path" }, { status: 400 });
    }

    const image = sharp(sourcePath);
    const meta = await image.metadata();

    const width = meta.width || 0;
    const height = meta.height || 0;

    if (!width || !height) {
      return NextResponse.json({ error: "Invalid board image dimensions" }, { status: 400 });
    }

    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    const quadrants = [
      {
        label: String(labels[0] || "Front Elevation View"),
        crop: { left: 0, top: 0, width: halfW, height: halfH },
      },
      {
        label: String(labels[1] || "Front Left 3/4 View"),
        crop: { left: halfW, top: 0, width: width - halfW, height: halfH },
      },
      {
        label: String(labels[2] || "Front Right 3/4 View"),
        crop: { left: 0, top: halfH, width: halfW, height: height - halfH },
      },
      {
        label: String(labels[3] || "Street Wide View"),
        crop: { left: halfW, top: halfH, width: width - halfW, height: height - halfH },
      },
    ];

    const outDirRel = path.join("generated", "ai-images", projectId);
    const outDirAbs = path.join(process.cwd(), "public", outDirRel);
    await fs.mkdir(outDirAbs, { recursive: true });

    const createdAt = new Date().toISOString();
    const stamp = Date.now();

    const createdAssets: any[] = [];
    const images: any[] = [];

    for (let i = 0; i < quadrants.length; i++) {
      const q = quadrants[i];
      const filename = `${stamp}-${i + 1}-${slugify(toolSlug)}-${slugify(q.label)}-split.png`;
      const relFile = path.join(outDirRel, filename).replace(/\\/g, "/");
      const absFile = path.join(outDirAbs, filename);

      await sharp(sourcePath)
        .extract(q.crop)
        .png()
        .toFile(absFile);

      const imageUrl = `/api/ai/generated-image?file=${encodeURIComponent(relFile)}`;
      const publicUrl = `/${relFile}`;

      const asset = {
        id: `${stamp}-${i + 1}-${slugify(q.label)}`,
        projectId,
        projectTitle,
        toolSlug,
        toolName,
        renderType: `${toolName} - ${q.label}`,
        roomType: q.label,
        viewLabel: q.label,
        generationMode: "same_house_board_split",
        sourceBoardUrl: boardImageUrl,
        file: relFile,
        imageUrl,
        publicUrl,
        createdAt,
      };

      createdAssets.push(asset);
      images.push({
        label: q.label,
        imageUrl,
        publicUrl,
        file: relFile,
        generationMode: "same_house_board_split",
      });
    }

    await appendAssets(createdAssets);

    return NextResponse.json({
      ok: true,
      generationMode: "same_house_board_split",
      images,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Board split failed" },
      { status: 500 }
    );
  }
}
