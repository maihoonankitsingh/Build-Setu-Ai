import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  getProjectBrief,
  getProjectBriefCompleteness,
  getProjectStages,
  safeProjectId,
} from "@/lib/project-brief-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");

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
    item.masterImageUrl ||
    item.path ||
    item?.jsonData?.realImageUrl ||
    item?.jsonData?.primaryReferenceImageUrl ||
    ""
  );
}

function inferStage(item: any) {
  const stage = String(item.stageId || "").toLowerCase();
  if (stage) return stage;

  const text = `${item.toolSlug || ""} ${item.toolName || ""} ${item.outputType || ""} ${item.title || ""}`.toLowerCase();

  if (text.includes("structure") || text.includes("column") || text.includes("beam")) return "structure";
  if (text.includes("bbs") || text.includes("bar bending")) return "bbs";
  if (text.includes("boq") || text.includes("estimate")) return "boq";
  if (text.includes("exterior") || text.includes("elevation") || text.includes("facade")) return "exterior";
  if (text.includes("interior") || text.includes("room")) return "interior";
  if (text.includes("floor") || text.includes("plan") || text.includes("naksha") || text.includes("planning")) return "planning";
  if (text.includes("pdf") || text.includes("agreement") || text.includes("export")) return "export";

  return "other";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedProjectId = String(url.searchParams.get("projectId") || "");

    const briefDb = await readJson("project-briefs.json");
    const toolOutputDb = await readJson("project-tool-outputs.json");
    const assetsDb = await readJson("project-assets.json");
    const conceptsDb = await readJson("project-concepts.json");
    const refsDb = await readJson("exterior-references.json");

    const projects = arr(briefDb.briefs)
      .map((brief: any) => ({
        projectId: String(brief.projectId || ""),
        title: String(brief.title || brief.projectId || "Untitled Project"),
        city: String(brief.site?.city || ""),
        facing: String(brief.site?.facing || ""),
        plot: `${brief.site?.plotWidthFt || "?"} x ${brief.site?.plotDepthFt || "?"}`,
        updatedAt: String(brief.updatedAt || brief.createdAt || ""),
      }))
      .filter((p: any) => p.projectId)
      .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    const selectedProjectId = safeProjectId(
      requestedProjectId || projects[0]?.projectId || "test-project"
    );

    const brief = await getProjectBrief(selectedProjectId);
    const completeness = getProjectBriefCompleteness(brief);
    const stages = await getProjectStages(selectedProjectId);

    const toolOutputs = arr(toolOutputDb.outputs)
      .filter((o: any) => String(o.projectId || "") === selectedProjectId)
      .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    const conceptOutputs = arr(conceptsDb.outputs)
      .filter((o: any) => String(o.projectId || "") === selectedProjectId)
      .sort((a: any, b: any) => String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || "")));

    const concepts = arr(conceptsDb.concepts)
      .filter((c: any) => String(c.projectId || "") === selectedProjectId);

    const assets = arr(assetsDb.assets || assetsDb)
      .filter((a: any) => String(a.projectId || "") === selectedProjectId);

    const references = arr(refsDb.references)
      .filter((r: any) => String(r.projectId || "") === selectedProjectId);

    const gallery = [
      ...concepts.map((c: any) => ({
        id: String(c.id || c.masterImageUrl || ""),
        title: String(c.title || "Master Concept"),
        type: "master",
        stage: "exterior",
        status: String(c.status || ""),
        imageUrl: pickImageUrl(c),
        createdAt: String(c.createdAt || c.updatedAt || ""),
      })),
      ...conceptOutputs.map((o: any) => ({
        id: String(o.id || o.imageUrl || ""),
        title: String(o.title || o.outputType || "Output"),
        type: "output",
        stage: inferStage(o),
        status: String(o.status || ""),
        imageUrl: pickImageUrl(o),
        createdAt: String(o.createdAt || o.updatedAt || ""),
      })),
      ...assets.map((a: any) => ({
        id: String(a.id || a.file || a.imageUrl || ""),
        title: String(a.title || a.renderType || a.roomType || "Generated Image"),
        type: String(a.type || "asset"),
        stage: inferStage(a),
        status: String(a.status || ""),
        imageUrl: pickImageUrl(a),
        createdAt: String(a.createdAt || ""),
      })),
      ...references.map((r: any) => ({
        id: String(r.id || r.fileUrl || ""),
        title: String(r.title || "Reference"),
        type: "reference",
        stage: "exterior",
        status: r.isPrimary ? "primary" : "",
        imageUrl: pickImageUrl(r),
        createdAt: String(r.createdAt || r.updatedAt || ""),
      })),
    ]
      .filter((item) => item.imageUrl)
      .filter((item) => {
        const text = `${item.imageUrl} ${item.title} ${item.type}`.toLowerCase();
        return !(text.includes("blender") || text.includes("model-renders"));
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 24);

    const outputCountsByStage = toolOutputs.reduce<Record<string, number>>((acc, item: any) => {
      const stage = inferStage(item);
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      projectId: selectedProjectId,
      projects,
      brief,
      completeness,
      stages,
      toolOutputs: toolOutputs.slice(0, 12),
      conceptOutputs: conceptOutputs.slice(0, 12),
      gallery,
      references,
      outputCountsByStage,
      counts: {
        projects: projects.length,
        toolOutputs: toolOutputs.length,
        conceptOutputs: conceptOutputs.length,
        gallery: gallery.length,
        references: references.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Workspace summary failed" },
      { status: 500 }
    );
  }
}
