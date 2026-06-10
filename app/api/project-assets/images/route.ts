import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
// BUILDSETU_PROJECT_ASSETS_IMAGES_EXACT_BUCKET_ORDER_V1

async function readJsonArray(file: string) {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function imageUrlOf(item: any) {
  return String(
    item?.imageUrl ||
      item?.publicUrl ||
      item?.url ||
      item?.assetUrl ||
      item?.thumbnailUrl ||
      ""
  );
}

function normalizeAsset(item: any) {
  const imageUrl = imageUrlOf(item);

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

// BUILDSETU_PROJECT_ASSETS_IMAGES_STRICT_EXACT_DETECTION_V1
function isExact(item: any) {
  const source = String(item?.source || "");
  const id = String(item?.id || "");
  const imageUrl = imageUrlOf(item);

  return (
    source === "exact_floor_plan_agent_v1" ||
    id.startsWith("exact_floor_plan_") ||
    imageUrl.includes("/exact-floor-plan-agent/") ||
    imageUrl.includes("exact-floor-plan-agent")
  );
}

function isOpenAiPreview(item: any) {
  const source = String(item?.source || "");
  const id = String(item?.id || "");
  const imageUrl = imageUrlOf(item);

  return (
    source === "professional_openai_floor_plan_v1" ||
    id.startsWith("openai_floor_plan_") ||
    imageUrl.includes("/openai-floor-plan-final/") ||
    imageUrl.includes("openai-floor-plan-final")
  );
}

function dedupeByIdOrUrl(items: any[]) {
  const seen = new Set<string>();
  return items.filter((item: any) => {
    const key = String(item?.id || imageUrlOf(item) || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newest(items: any[]) {
  return [...items].sort((a: any, b: any) => createdTime(b) - createdTime(a));
}

function buildExactFirstOrder(items: any[]) {
  const valid = items.filter((item: any) => imageUrlOf(item));

  const exact = newest(valid.filter(isExact));
  const openai = newest(valid.filter(isOpenAiPreview));
  const other = newest(valid.filter((item: any) => !isExact(item) && !isOpenAiPreview(item)));

  const latestGround = exact.find((item: any) => item?.assetType === "ground_floor_plan");
  const latestFirst = exact.find((item: any) => item?.assetType === "first_floor_plan");

  const exactRest = exact.filter((item: any) => item !== latestGround && item !== latestFirst);

  return dedupeByIdOrUrl([
    latestGround,
    latestFirst,
    ...exactRest,
    ...openai,
    ...other,
  ].filter(Boolean));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 80) || 80));

    const file = path.join(process.cwd(), "data/generated/project-assets.json");
    const all = await readJsonArray(file);

    const filtered = all.filter((item: any) => {
      if (!item) return false;
      if (projectId && String(item.projectId || "") !== projectId) return false;

      const imageUrl = imageUrlOf(item);
      if (!imageUrl) return false;

      if (String(item.source || "") === "exact_floor_plan_agent_v1") return true;
      if (String(item.source || "") === "professional_openai_floor_plan_v1") return true;
      if (String(item.toolSlug || "") === "floor-plan-ai") return true;
      if (/\.(png|jpg|jpeg|webp|svg)(\?|$)/i.test(imageUrl)) return true;

      return false;
    });

    const ordered = buildExactFirstOrder(filtered)
      .slice(0, limit)
      .map(normalizeAsset);

    return NextResponse.json({
      ok: true,
      items: ordered,
      images: ordered,
      assets: ordered,
      total: ordered.length,
      source: "project-assets-json",
      includesExactSvg: true,
      exactFirstOrder: true,
      orderPolicy: "latest exact ground, latest exact first, exact rest, OpenAI previews, other images",
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
