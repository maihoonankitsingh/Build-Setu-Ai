import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

// BUILDSETU_PROJECT_ASSETS_IMAGES_EXACT_SVG_FALLBACK_V1
async function readJsonArray(file: string) {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeAsset(item: any) {
  const imageUrl =
    item?.imageUrl ||
    item?.publicUrl ||
    item?.url ||
    item?.assetUrl ||
    item?.thumbnailUrl ||
    "";

  return {
    ...item,
    imageUrl,
    publicUrl: item?.publicUrl || imageUrl,
    url: item?.url || imageUrl,
    thumbnailUrl: item?.thumbnailUrl || imageUrl,
    kind: item?.kind || item?.assetType || item?.type || "project_asset",
  };
}

function createdTime(item: any) {
  return Date.parse(item?.createdAt || item?.updatedAt || "") || 0;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 80) || 80));

    const file = path.join(process.cwd(), "data/generated/project-assets.json");
    const all = await readJsonArray(file);

    const items = all
      .filter((item: any) => {
        if (!item) return false;
        if (projectId && String(item.projectId || "") !== projectId) return false;

        const imageUrl =
          item.imageUrl ||
          item.publicUrl ||
          item.url ||
          item.assetUrl ||
          item.thumbnailUrl ||
          "";

        // Include exact SVG source-of-truth floor plans and normal generated images.
        if (String(item.source || "") === "exact_floor_plan_agent_v1" && imageUrl) return true;
        if (String(item.source || "") === "professional_openai_floor_plan_v1" && imageUrl) return true;
        if (String(item.toolSlug || "") === "floor-plan-ai" && imageUrl) return true;
        if (imageUrl && /\.(png|jpg|jpeg|webp|svg)(\?|$)/i.test(imageUrl)) return true;

        return false;
      })
      .sort((a: any, b: any) => createdTime(b) - createdTime(a))
      .slice(0, limit)
      .map(normalizeAsset);

    return NextResponse.json({
      ok: true,
      items,
      images: items,
      assets: items,
      total: items.length,
      source: "project-assets-json",
      includesExactSvg: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load project assets.",
        items: [],
        images: [],
        assets: [],
        total: 0,
      },
      { status: 500 },
    );
  }
}
