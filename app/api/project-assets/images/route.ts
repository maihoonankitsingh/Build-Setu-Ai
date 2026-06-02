import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSETS_FILE = path.join(process.cwd(), "data", "generated", "project-assets.json");


function buildSetuAssetPriority(asset: any) {
  const text = JSON.stringify(asset || {}).toLowerCase();

  if (
    text.includes("exact_professional_floor_plan_v1") || text.includes("exact_professional_floor_plan") || text.includes("exact-professional-floor-plan") || text.includes("openai_professional_floor_plan_v1") ||
    text.includes("openai_professional_floor_plan") ||
    text.includes("professional_floor_plan") ||
    text.includes("openai-professional-floor-plan")
  ) {
    return 1000;
  }

  if (
    text.includes("floor-plan-ai") ||
    text.includes("floor_plan") ||
    text.includes("floor-plan")
  ) {
    return 500;
  }

  if (
    text.includes("working_drawing_sheet") ||
    text.includes("working-set") ||
    text.includes("locked_working_drawing")
  ) {
    return -1000;
  }

  return 0;
}

function buildSetuAssetTime(asset: any) {
  const created = Date.parse(String(asset?.createdAt || ""));
  if (Number.isFinite(created)) return created;

  const raw = String(asset?.id || asset?.file || asset?.imageUrl || "");
  const match = raw.match(/\d{10,}/);
  return match ? Number(match[0]) : 0;
}

function sortBuildSetuAssets(items: any[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = buildSetuAssetPriority(b) - buildSetuAssetPriority(a);
    if (priorityDiff) return priorityDiff;
    return buildSetuAssetTime(b) - buildSetuAssetTime(a);
  });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = String(url.searchParams.get("projectId") || "");
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 300);

    let store: any = { assets: [] };
    try {
      store = JSON.parse(await fs.readFile(ASSETS_FILE, "utf-8"));
    } catch {}

    const all = Array.isArray(store) ? store : Array.isArray(store.assets) ? store.assets : [];

    const images = all
      .filter((asset: any) => asset?.type === "image")
      .filter((asset: any) => !projectId || String(asset.projectId) === projectId)
      .slice(0, limit);

    return NextResponse.json({ ok: true, images: sortBuildSetuAssets(images) });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load project images", images: [] },
      { status: 500 }
    );
  }
}
