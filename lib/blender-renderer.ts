import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  getActiveProjectModel,
  readProjectModelDb,
  writeProjectModelDb,
} from "@/lib/project-model-store";
import {
  readProjectConceptDb,
  writeProjectConceptDb,
} from "@/lib/project-concept-store";

const execFileAsync = promisify(execFile);

function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

function publicRenderDir(projectId: string) {
  return path.join(process.cwd(), "public", "generated", "blender-renders", projectId);
}

function publicUrlFor(fileName: string, projectId: string) {
  const file = `generated/blender-renders/${projectId}/${fileName}`;
  return `/api/model-renders/file?file=${encodeURIComponent(file)}`;
}

export async function runBlenderExteriorRender(input: {
  projectId: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);

  const model = await getActiveProjectModel({
    projectId,
    toolSlug: "exterior-elevation",
    conceptId: input.conceptId,
  });

  if (!model) {
    throw new Error("Active model not found. Create/prepare model first.");
  }

  const modelFile = path.join(process.cwd(), model.modelFile || "");
  const scriptFile = path.join(process.cwd(), "scripts", "blender", "render_exterior_model.py");

  await fs.access(modelFile);
  await fs.access(scriptFile);

  const queue = Array.isArray(model.modelSpec?.renderQueue) ? model.modelSpec.renderQueue : [];
  const renderable = queue.filter((item: any) => {
    const status = String(item.status || "");
    return ["READY_TO_RENDER", "RENDER_READY"].includes(status) && !item.realImageUrl;
  });

  const conceptDb = await readProjectConceptDb();

  if (!renderable.length) {
    const existingRenderedOutputs = conceptDb.outputs.filter((output: any) => {
      return (
        output.projectId === projectId &&
        output.conceptId === model.conceptId &&
        output.toolSlug === "exterior-elevation" &&
        output.status === "RENDER_READY" &&
        String(output.generationMode || "") === "blender_headless_real_render" &&
        Boolean(output.imageUrl || output.jsonData?.realImageUrl)
      );
    });

    return {
      model,
      renderedOutputs: existingRenderedOutputs,
      queue,
      message: existingRenderedOutputs.length
        ? "Existing Blender real render found."
        : "No renderable items found.",
    };
  }

  await fs.mkdir(publicRenderDir(projectId), { recursive: true });

  const outputById = new Map(conceptDb.outputs.map((o) => [o.id, o]));

  const updatedQueue: any[] = [];
  const renderedOutputs: any[] = [];

  for (const item of queue) {
    const shouldRender = renderable.some((r: any) => String(r.outputId) === String(item.outputId));

    if (!shouldRender) {
      updatedQueue.push(item);
      continue;
    }

    const outputType = String(item.outputType || "EXACT_VIEW");
    const fileName = `${model.id}-${item.outputId}-${outputType.toLowerCase()}.png`;
    const outputPng = path.join(publicRenderDir(projectId), fileName);
    const imageUrl = publicUrlFor(fileName, projectId);

    const startedAt = new Date().toISOString();

    const { stdout, stderr } = await execFileAsync(
      "blender",
      ["-b", "--python", scriptFile, "--", modelFile, outputType, outputPng],
      {
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 10,
      }
    );

    await fs.access(outputPng);

    const completedAt = new Date().toISOString();

    const nextItem = {
      ...item,
      status: "REAL_RENDER_READY",
      renderStatus: "REAL_RENDER_READY",
      realImageUrl: imageUrl,
      realRenderFile: path.relative(process.cwd(), outputPng).replace(/\\/g, "/"),
      realRenderer: "blender_headless",
      realRenderedAt: completedAt,
      blenderLog: String(stdout || "").slice(-2000),
      blenderErrorLog: String(stderr || "").slice(-2000),
    };

    updatedQueue.push(nextItem);

    const sourceOutput = outputById.get(String(item.outputId || ""));
    if (sourceOutput) {
      const nextOutput = {
        ...sourceOutput,
        imageUrl,
        publicUrl: imageUrl,
        file: nextItem.realRenderFile,
        status: "RENDER_READY" as const,
        generationMode: "blender_headless_real_render",
        jsonData: {
          ...(sourceOutput.jsonData || {}),
          modelId: model.id,
          camera: item.camera || {},
          realImageUrl: imageUrl,
          realRenderFile: nextItem.realRenderFile,
          realRenderer: "blender_headless",
          realRenderStatus: "REAL_RENDER_READY",
          realRenderStartedAt: startedAt,
          realRenderedAt: completedAt,
        },
        updatedAt: completedAt,
      };

      outputById.set(nextOutput.id, nextOutput);
      renderedOutputs.push(nextOutput);
    }
  }

  const now = new Date().toISOString();

  const updatedModel = {
    ...model,
    status: "RENDER_READY" as const,
    modelSpec: {
      ...(model.modelSpec || {}),
      renderQueue: updatedQueue,
      renderPipeline: {
        ...(model.modelSpec?.renderPipeline || {}),
        status: "REAL_RENDER_READY",
        renderer: "blender_headless",
        renderedAt: now,
        note: "Real Blender render completed for renderable queue items.",
      },
    },
    updatedAt: now,
  };

  await fs.writeFile(modelFile, JSON.stringify(updatedModel.modelSpec, null, 2), "utf8");

  const modelDb = await readProjectModelDb();
  modelDb.models = [
    updatedModel,
    ...modelDb.models.filter((m) => m.id !== updatedModel.id),
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  await writeProjectModelDb(modelDb);

  conceptDb.outputs = conceptDb.outputs.map((output) => outputById.get(output.id) || output);
  await writeProjectConceptDb(conceptDb);

  return {
    model: updatedModel,
    queue: updatedQueue,
    renderedOutputs,
    message: "Blender real render completed.",
  };
}
