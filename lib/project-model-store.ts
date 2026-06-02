import fs from "fs/promises";
import path from "path";
import {
  getActiveProjectConcept,
  listProjectConceptOutputs,
  listProjectConcepts,
  readProjectConceptDb,
  writeProjectConceptDb,
  type ProjectConcept,
  type ProjectConceptOutput,
} from "@/lib/project-concept-store";

export type ProjectModelStatus =
  | "NOT_STARTED"
  | "SPEC_READY"
  | "MODEL_READY"
  | "RENDER_READY"
  | "FAILED";

export type ProjectModel = {
  id: string;
  projectId: string;
  toolSlug: string;
  toolName: string;
  conceptId: string;
  conceptType: string;
  modelType: "exterior_massing" | "interior_room" | "generic";
  status: ProjectModelStatus;
  isActive: boolean;

  sourceConceptTitle: string;
  sourceMasterImageUrl?: string;

  requestedViews: Array<{
    outputId: string;
    outputType: string;
    title: string;
    status: string;
  }>;

  modelSpec: Record<string, any>;
  modelFile?: string;

  createdAt: string;
  updatedAt: string;
};

type ProjectModelDb = {
  models: ProjectModel[];
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const MODEL_DB_PATH = path.join(DATA_DIR, "project-models.json");

function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

function safeToolSlug(value: string) {
  return String(value || "generic-tool")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "generic-tool";
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export async function readProjectModelDb(): Promise<ProjectModelDb> {
  try {
    const raw = await fs.readFile(MODEL_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      models: Array.isArray(parsed.models) ? parsed.models : [],
    };
  } catch {
    return { models: [] };
  }
}

export async function writeProjectModelDb(db: ProjectModelDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(MODEL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function parsePlotSizeFromText(text: string) {
  const value = String(text || "");
  const match = value.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})/i);

  if (!match) {
    return {
      widthFt: null,
      depthFt: null,
      source: "not_found",
    };
  }

  return {
    widthFt: Number(match[1]),
    depthFt: Number(match[2]),
    source: "prompt",
  };
}

function floorCountToLevels(floorCount: string) {
  const f = String(floorCount || "").toUpperCase();

  if (f.includes("G+3")) return 4;
  if (f.includes("G+2")) return 3;
  if (f.includes("G+1")) return 2;
  if (f.includes("G")) return 1;

  return 2;
}

function defaultCameraForView(viewType: string) {
  const v = String(viewType || "").toUpperCase();

  if (v === "FRONT_LEFT_3_4") {
    return { camera: "front-left-3/4", position: [-18, 8, 24], target: [0, 8, 0], lens: "28mm" };
  }

  if (v === "FRONT_RIGHT_3_4") {
    return { camera: "front-right-3/4", position: [18, 8, 24], target: [0, 8, 0], lens: "28mm" };
  }

  if (v === "STREET_WIDE") {
    return { camera: "street-wide", position: [0, 7, 42], target: [0, 8, 0], lens: "24mm" };
  }

  if (v === "LEFT_SIDE_ELEVATION") {
    return { camera: "left-side", position: [-36, 8, 0], target: [0, 8, 0], lens: "35mm" };
  }

  if (v === "RIGHT_SIDE_ELEVATION") {
    return { camera: "right-side", position: [36, 8, 0], target: [0, 8, 0], lens: "35mm" };
  }

  if (v === "REAR_ELEVATION") {
    return { camera: "rear", position: [0, 8, -32], target: [0, 8, 0], lens: "35mm" };
  }

  return { camera: "front", position: [0, 8, 30], target: [0, 8, 0], lens: "35mm" };
}

export function buildExteriorModelSpec(concept: ProjectConcept, pendingOutputs: ProjectConceptOutput[]) {
  const dna = concept.designDna || {};
  const spec = concept.specJson || {};
  const prompt = String(concept.sourcePrompt || "");
  const plot = parsePlotSizeFromText(prompt);
  const levels = floorCountToLevels(dna.floorCount || spec?.building?.floorCount || "");

  const requestedViews = pendingOutputs.map((output) => ({
    outputId: output.id,
    outputType: output.outputType,
    title: output.title,
    status: output.status,
    camera: defaultCameraForView(output.outputType),
  }));

  return {
    version: 1,
    modelSpecType: "exterior_massing_spec",
    source: "locked_project_concept",
    units: "feet",
    coordinateSystem: {
      x: "plot width",
      y: "height",
      z: "plot depth",
      origin: "front center at road edge",
    },
    project: {
      projectId: concept.projectId,
      toolSlug: concept.toolSlug,
      conceptId: concept.id,
      title: concept.title,
      masterImageUrl: concept.masterImageUrl || "",
    },
    plot: {
      widthFt: plot.widthFt,
      depthFt: plot.depthFt,
      source: plot.source,
      roadSide: "front / north if available from project brief",
    },
    buildingEnvelope: {
      levels,
      floorCount: dna.floorCount || spec?.building?.floorCount || "as per project brief",
      approxFloorHeightFt: 10,
      parapetHeightFt: 3,
      massing: dna.massing || spec?.building?.massing || "modern massing from locked concept",
    },
    facadeSystem: {
      style: dna.style || spec?.facade?.style || "modern residential facade",
      composition: dna.facadeComposition || spec?.facade?.composition || "",
      primaryColors: dna.primaryColors || spec?.facade?.primaryColors || [],
      accentMaterials: dna.accentMaterials || spec?.facade?.accentMaterials || [],
      windowStyle: dna.windowStyle || spec?.facade?.windowStyle || "",
      doorStyle: dna.doorStyle || spec?.facade?.doorStyle || "",
      lightingStyle: dna.lightingStyle || spec?.facade?.lightingStyle || "",
      balconyStyle: dna.balconyStyle || spec?.detailRules?.balconyStyle || "",
      railingStyle: dna.railingStyle || spec?.detailRules?.railingStyle || "",
      gateStyle: dna.gateStyle || spec?.siteFront?.gateStyle || "",
      boundaryWallStyle: dna.boundaryWallStyle || spec?.siteFront?.boundaryWallStyle || "",
      parkingPlacement: dna.parkingPlacement || spec?.siteFront?.parkingPlacement || "",
    },
    lockedRules: [
      "All exact views must use this same model spec.",
      "Do not regenerate facade independently for exact camera views.",
      "Exact views must be rendered from the same model/camera system.",
      "Model spec is project-wise and concept-wise.",
    ],
    requestedViews,
    renderQueue: requestedViews.map((view) => ({
      outputId: view.outputId,
      outputType: view.outputType,
      title: view.title,
      camera: view.camera,
      status: "WAITING_FOR_MODEL_READY",
    })),
  };
}

async function writeModelSpecFile(model: ProjectModel) {
  const dir = path.join(DATA_DIR, "models", model.projectId);
  await fs.mkdir(dir, { recursive: true });

  const file = path.join(dir, `${model.id}.json`);
  await fs.writeFile(file, JSON.stringify(model.modelSpec, null, 2), "utf8");

  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

export async function getConceptForModel(input: {
  projectId: string;
  toolSlug: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = safeToolSlug(input.toolSlug || "exterior-elevation");

  if (input.conceptId) {
    const concepts = await listProjectConcepts(projectId, toolSlug);
    return concepts.find((c) => c.id === input.conceptId) || null;
  }

  return getActiveProjectConcept(projectId, toolSlug);
}

export async function createOrUpdateProjectModel(input: {
  projectId: string;
  toolSlug: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = safeToolSlug(input.toolSlug || "exterior-elevation");
  const now = nowIso();

  const concept = await getConceptForModel({ projectId, toolSlug, conceptId: input.conceptId });

  if (!concept) {
    throw new Error("Active locked project concept not found");
  }

  const outputs = await listProjectConceptOutputs(projectId, concept.id);
  const pendingOutputs = outputs.filter((o) => o.status === "PENDING_3D_MODEL");

  const db = await readProjectModelDb();

  const existing = db.models.find(
    (m) =>
      m.projectId === projectId &&
      m.toolSlug === toolSlug &&
      m.conceptId === concept.id &&
      m.isActive
  );

  const modelSpec = buildExteriorModelSpec(concept, pendingOutputs);

  const model: ProjectModel = {
    id: existing?.id || makeId("model"),
    projectId,
    toolSlug,
    toolName: concept.toolName || "Exterior Elevation",
    conceptId: concept.id,
    conceptType: concept.conceptType || "exterior",
    modelType: "exterior_massing",
    status: "SPEC_READY",
    isActive: true,
    sourceConceptTitle: concept.title,
    sourceMasterImageUrl: concept.masterImageUrl || "",
    requestedViews: pendingOutputs.map((o) => ({
      outputId: o.id,
      outputType: o.outputType,
      title: o.title,
      status: o.status,
    })),
    modelSpec,
    modelFile: existing?.modelFile || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  model.modelFile = await writeModelSpecFile(model);

  db.models = [
    model,
    ...db.models
      .filter((m) => m.id !== model.id)
      .map((m) => {
        const sameScope = m.projectId === projectId && m.toolSlug === toolSlug && m.conceptId === concept.id;
        return sameScope ? { ...m, isActive: false, updatedAt: now } : m;
      }),
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  await writeProjectModelDb(db);

  return { concept, model, pendingOutputs };
}

export async function getActiveProjectModel(input: {
  projectId: string;
  toolSlug: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = safeToolSlug(input.toolSlug || "exterior-elevation");

  const db = await readProjectModelDb();

  return (
    db.models.find(
      (m) =>
        m.projectId === projectId &&
        m.toolSlug === toolSlug &&
        m.isActive &&
        (!input.conceptId || m.conceptId === input.conceptId)
    ) || null
  );
}

export async function listProjectModels(input: {
  projectId: string;
  toolSlug?: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = input.toolSlug ? safeToolSlug(input.toolSlug) : "";

  const db = await readProjectModelDb();

  return db.models.filter((m) => {
    if (m.projectId !== projectId) return false;
    if (toolSlug && m.toolSlug !== toolSlug) return false;
    if (input.conceptId && m.conceptId !== input.conceptId) return false;
    return true;
  });
}


export async function getProjectModelRenderQueue(input: {
  projectId: string;
  toolSlug?: string;
  conceptId?: string;
}) {
  const model = await getActiveProjectModel({
    projectId: input.projectId,
    toolSlug: input.toolSlug || "exterior-elevation",
    conceptId: input.conceptId,
  });

  const queue = Array.isArray(model?.modelSpec?.renderQueue) ? model.modelSpec.renderQueue : [];

  return {
    hasActiveModel: Boolean(model),
    model,
    queue,
  };
}

export async function prepareProjectModelRenderQueue(input: {
  projectId: string;
  toolSlug?: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = safeToolSlug(input.toolSlug || "exterior-elevation");
  const now = nowIso();

  const modelResult = await getProjectModelRenderQueue({
    projectId,
    toolSlug,
    conceptId: input.conceptId,
  });

  if (!modelResult.model) {
    throw new Error("Active project model not found. Create 3D/BIM model spec first.");
  }

  const currentModel = modelResult.model;

  const preparedQueue = (modelResult.queue || []).map((item: any) => ({
    ...item,
    status:
      item.status === "WAITING_FOR_MODEL_READY" || item.status === "PENDING_3D_MODEL"
        ? "READY_TO_RENDER"
        : item.status || "READY_TO_RENDER",
    preparedAt: item.preparedAt || now,
  }));

  const updatedModel: ProjectModel = {
    ...currentModel,
    status: "MODEL_READY",
    modelSpec: {
      ...(currentModel.modelSpec || {}),
      renderQueue: preparedQueue,
      renderPipeline: {
        status: "READY_TO_RENDER",
        preparedAt: now,
        note: "Actual render engine is not connected yet. Queue is prepared for future model renderer.",
      },
    },
    updatedAt: now,
  };

  updatedModel.modelFile = await writeModelSpecFile(updatedModel);

  const modelDb = await readProjectModelDb();
  modelDb.models = [
    updatedModel,
    ...modelDb.models.filter((m) => m.id !== updatedModel.id),
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  await writeProjectModelDb(modelDb);

  const conceptDb = await readProjectConceptDb();
  const queueIds = new Set(preparedQueue.map((item: any) => String(item.outputId || "")));

  const updatedOutputs: any[] = [];

  conceptDb.outputs = conceptDb.outputs.map((output) => {
    const shouldUpdate =
      output.projectId === projectId &&
      output.conceptId === updatedModel.conceptId &&
      queueIds.has(output.id) &&
      output.status === "PENDING_3D_MODEL";

    if (!shouldUpdate) return output;

    const nextOutput = {
      ...output,
      status: "PENDING_RENDER" as const,
      jsonData: {
        ...(output.jsonData || {}),
        modelId: updatedModel.id,
        renderQueueStatus: "READY_TO_RENDER",
        renderPreparedAt: now,
      },
      updatedAt: now,
    };

    updatedOutputs.push(nextOutput);
    return nextOutput;
  });

  await writeProjectConceptDb(conceptDb);

  return {
    model: updatedModel,
    queue: preparedQueue,
    updatedOutputs,
  };
}


async function writeRenderResultFile(input: {
  projectId: string;
  modelId: string;
  outputId: string;
  result: Record<string, any>;
}) {
  const dir = path.join(DATA_DIR, "model-renders", input.projectId);
  await fs.mkdir(dir, { recursive: true });

  const file = path.join(dir, `${input.modelId}-${input.outputId}.json`);
  await fs.writeFile(file, JSON.stringify(input.result, null, 2), "utf8");

  return path.relative(process.cwd(), file).replace(/\\/g, "/");
}

export async function runProjectModelRenderPlaceholder(input: {
  projectId: string;
  toolSlug?: string;
  conceptId?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = safeToolSlug(input.toolSlug || "exterior-elevation");
  const now = nowIso();

  const modelResult = await getProjectModelRenderQueue({
    projectId,
    toolSlug,
    conceptId: input.conceptId,
  });

  if (!modelResult.model) {
    throw new Error("Active project model not found. Create model spec and prepare render queue first.");
  }

  const currentModel = modelResult.model;
  const queue = Array.isArray(currentModel?.modelSpec?.renderQueue) ? currentModel.modelSpec.renderQueue : [];

  const readyItems = queue.filter((item: any) => String(item.status || "") === "READY_TO_RENDER");

  if (!readyItems.length) {
    return {
      model: currentModel,
      queue,
      renderedOutputs: [],
      message: "No READY_TO_RENDER items found.",
    };
  }

  const conceptDb = await readProjectConceptDb();
  const outputById = new Map(conceptDb.outputs.map((o) => [o.id, o]));

  const renderedOutputs: any[] = [];

  const renderedQueue = await Promise.all(
    queue.map(async (item: any) => {
      if (String(item.status || "") !== "READY_TO_RENDER") return item;

      const sourceOutput = outputById.get(String(item.outputId || ""));
      const renderResult = {
        version: 1,
        renderResultType: "placeholder_exact_model_render",
        rendererStatus: "PLACEHOLDER_READY",
        projectId,
        toolSlug,
        conceptId: currentModel.conceptId,
        modelId: currentModel.id,
        outputId: item.outputId,
        outputType: item.outputType,
        title: item.title,
        camera: item.camera || {},
        sourceMasterImageUrl: currentModel.sourceMasterImageUrl || "",
        modelFile: currentModel.modelFile || "",
        createdAt: now,
        note: "Actual 3D renderer is not connected yet. This record confirms the exact-view render job is ready and tied to the locked model/camera.",
      };

      const renderResultFile = await writeRenderResultFile({
        projectId,
        modelId: currentModel.id,
        outputId: String(item.outputId || "output"),
        result: renderResult,
      });

      const nextOutput = sourceOutput
        ? {
            ...sourceOutput,
            status: "RENDER_READY" as const,
            jsonData: {
              ...(sourceOutput.jsonData || {}),
              modelId: currentModel.id,
              camera: item.camera || {},
              renderResultFile,
              renderStatus: "PLACEHOLDER_READY",
              rendererMode: "placeholder_no_3d_engine_connected",
              renderedAt: now,
            },
            updatedAt: now,
          }
        : null;

      if (nextOutput) {
        outputById.set(nextOutput.id, nextOutput);
        renderedOutputs.push(nextOutput);
      }

      return {
        ...item,
        status: "RENDER_READY",
        renderStatus: "PLACEHOLDER_READY",
        renderResultFile,
        renderedAt: now,
      };
    })
  );

  const updatedModel: ProjectModel = {
    ...currentModel,
    status: "RENDER_READY",
    modelSpec: {
      ...(currentModel.modelSpec || {}),
      renderQueue: renderedQueue,
      renderPipeline: {
        ...(currentModel.modelSpec?.renderPipeline || {}),
        status: "PLACEHOLDER_RENDER_READY",
        renderedAt: now,
        note: "Renderer placeholder completed. Actual 3D render engine integration is still pending.",
      },
    },
    updatedAt: now,
  };

  updatedModel.modelFile = await writeModelSpecFile(updatedModel);

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
    queue: renderedQueue,
    renderedOutputs,
    message: "Renderer placeholder completed. Outputs moved to RENDER_READY.",
  };
}

