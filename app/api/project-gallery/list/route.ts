import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");

function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

async function readJson(fileName: string) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function arr(value: any) {
  return Array.isArray(value) ? value : [];
}

function pickImageUrl(item: any) {
  return (
    item.imageUrl ||
    item.publicUrl ||
    item.fileUrl ||
    item.url ||
    item.path ||
    item?.jsonData?.realImageUrl ||
    item?.jsonData?.primaryReferenceImageUrl ||
    ""
  );
}

function normalizeGalleryItem(input: {
  source: string;
  id: string;
  projectId: string;
  title: string;
  toolSlug?: string;
  type: string;
  role?: string;
  status?: string;
  imageUrl: string;
  file?: string;
  createdAt?: string;
}) {
  return {
    id: input.id,
    projectId: input.projectId,
    source: input.source,
    title: input.title || "Project Asset",
    toolSlug: input.toolSlug || "",
    type: input.type || "asset",
    role: input.role || "",
    status: input.status || "",
    imageUrl: input.imageUrl || "",
    file: input.file || "",
    createdAt: input.createdAt || "",
  };
}


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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = safeProjectId(String(url.searchParams.get("projectId") || ""));
    const filterTool = String(url.searchParams.get("toolSlug") || "");
    const type = String(url.searchParams.get("type") || "all");

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
    }

    const assetsDb = await readJson("project-assets.json");
    const conceptsDb = await readJson("project-concepts.json");
    const refsDb = await readJson("exterior-references.json");

    const rawAssets = arr(assetsDb.assets || assetsDb)
      .filter((a: any) => String(a.projectId || "") === projectId)
      .map((a: any) =>
        normalizeGalleryItem({
          source: "project-assets",
          id: String(a.id || a.file || a.imageUrl || Math.random()),
          projectId,
          title: String(a.title || a.renderType || a.roomType || a.type || "Generated Image"),
          toolSlug: String(a.toolSlug || ""),
          type: String(a.type || "generated_image"),
          role: String(a.role || a.roomType || a.renderType || ""),
          status: String(a.status || ""),
          imageUrl: pickImageUrl(a),
          file: String(a.file || ""),
          createdAt: String(a.createdAt || ""),
        })
      );

    const outputs = arr(conceptsDb.outputs)
      .filter((o: any) => String(o.projectId || "") === projectId)
      .map((o: any) =>
        normalizeGalleryItem({
          source: "project-concepts.outputs",
          id: String(o.id || o.imageUrl || Math.random()),
          projectId,
          title: String(o.title || o.outputType || "Project Output"),
          toolSlug: String(o.toolSlug || ""),
          type: "output",
          role: String(o.outputType || ""),
          status: String(o.status || ""),
          imageUrl: pickImageUrl(o),
          file: String(o.file || ""),
          createdAt: String(o.createdAt || o.updatedAt || ""),
        })
      );

    const masters = arr(conceptsDb.concepts)
      .filter((c: any) => String(c.projectId || "") === projectId && c.masterImageUrl)
      .map((c: any) =>
        normalizeGalleryItem({
          source: "project-concepts.concepts",
          id: String(c.id || c.masterImageUrl || Math.random()),
          projectId,
          title: String(c.title || "Master Concept"),
          toolSlug: String(c.toolSlug || ""),
          type: "master_concept",
          role: String(c.conceptType || "master"),
          status: String(c.status || ""),
          imageUrl: String(c.masterImageUrl || ""),
          file: "",
          createdAt: String(c.createdAt || c.updatedAt || ""),
        })
      );

    const references = arr(refsDb.references)
      .filter((r: any) => String(r.projectId || "") === projectId)
      .map((r: any) =>
        normalizeGalleryItem({
          source: "exterior-references",
          id: String(r.id || r.fileUrl || Math.random()),
          projectId,
          title: String(r.title || "Reference Image"),
          toolSlug: "exterior-elevation",
          type: "reference",
          role: String(r.role || ""),
          status: r.isPrimary ? "primary" : "",
          imageUrl: String(r.fileUrl || ""),
          file: String(r.file || ""),
          createdAt: String(r.createdAt || r.updatedAt || ""),
        })
      );

    const includeExperimental = String(url.searchParams.get("includeExperimental") || "") === "1";

    let items = [...masters, ...outputs, ...rawAssets, ...references]
      .filter((item) => item.imageUrl)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    if (!includeExperimental) {
      items = items.filter((item) => {
        const text = [
          item.imageUrl,
          item.file,
          item.title,
          item.role,
          item.status,
          item.source,
        ]
          .map((x) => String(x || "").toLowerCase())
          .join(" ");

        return !(
          text.includes("blender") ||
          text.includes("model-renders") ||
          text.includes("placeholder_exact_model_render")
        );
      });
    }

    const seen = new Set<string>();
    items = items.filter((item) => {
      const key = String(item.imageUrl || item.file || item.id || "");
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (filterTool) {
      items = items.filter((item) => item.toolSlug === filterTool || item.toolSlug === "");
    }

    if (type !== "all") {
      items = items.filter((item) => item.type === type || item.role === type || item.status === type);
    }

    return NextResponse.json({
      ok: true,
      projectId,
      count: items.length,
      items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Project gallery lookup failed" },
      { status: 500 }
    );
  }
}
