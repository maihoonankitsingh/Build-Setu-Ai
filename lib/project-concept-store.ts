import fs from "fs/promises";
import path from "path";

export type ProjectConceptStatus = "DRAFT" | "LOCKED" | "REPLACED" | "ARCHIVED";
export type ProjectConceptType = "exterior" | "interior" | "floor_plan" | "structure" | "boq" | "bbs" | "document" | "generic";

export type ProjectConcept = {
  id: string;
  projectId: string;
  toolSlug: string;
  toolName: string;
  conceptType: ProjectConceptType;
  title: string;
  status: ProjectConceptStatus;
  isActive: boolean;

  masterImageUrl?: string;
  masterPublicUrl?: string;
  masterFile?: string;

  designDna: Record<string, any>;
  specJson: Record<string, any>;

  sourcePrompt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectConceptOutput = {
  id: string;
  projectId: string;
  conceptId: string;
  toolSlug: string;
  toolName: string;
  conceptType: ProjectConceptType;

  outputType: string;
  title: string;

  imageUrl?: string;
  publicUrl?: string;
  file?: string;
  pdfUrl?: string;

  prompt?: string;
  generationMode?: string;
  jsonData?: Record<string, any>;

  status: "AI_DRAFT" | "AI_FINAL_DRAFT" | "REVIEW_REQUIRED" | "APPROVED" | "REJECTED" | "PENDING_3D_MODEL" | "PENDING_RENDER" | "RENDER_READY";
  createdAt: string;
  updatedAt?: string;
};

type ProjectConceptDb = {
  concepts: ProjectConcept[];
  outputs: ProjectConceptOutput[];
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const PROJECT_CONCEPTS_FILE = path.join(DATA_DIR, "project-concepts.json");

function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

function safeToolSlug(value: string) {
  return String(value || "generic-tool").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "generic-tool";
}

function nowIso() {
  return new Date().toISOString();
}

export async function readProjectConceptDb(): Promise<ProjectConceptDb> {
  try {
    const raw = await fs.readFile(PROJECT_CONCEPTS_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return {
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      outputs: Array.isArray(parsed.outputs) ? parsed.outputs : [],
    };
  } catch {
    return { concepts: [], outputs: [] };
  }
}

export async function writeProjectConceptDb(db: ProjectConceptDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROJECT_CONCEPTS_FILE, JSON.stringify(db, null, 2), "utf8");
}

export function buildExteriorSpecFromDesignDna(input: any): Record<string, any> {
  const dna = input?.designDna || input || {};
  const sourcePrompt = String(input?.sourcePrompt || "");

  return {
    version: 1,
    specType: "exterior_facade_spec",
    source: "locked_master_concept",
    plot: {
      projectId: input?.projectId || "",
      title: input?.title || "",
      inferredFromPrompt: sourcePrompt,
    },
    building: {
      floorCount: dna.floorCount || "as per project brief",
      massing: dna.massing || "modern buildable massing",
      rooflineParapet: dna.rooflineParapet || "flat roof with clean parapet",
    },
    facade: {
      composition: dna.facadeComposition || "front facade composition from master concept",
      style: dna.style || "modern Indian residential facade",
      primaryColors: dna.primaryColors || ["white", "grey"],
      accentMaterials: dna.accentMaterials || ["wood texture"],
      windowStyle: dna.windowStyle || "black-framed rectangular windows",
      doorStyle: dna.doorStyle || "wooden main door",
      lightingStyle: dna.lightingStyle || "warm facade lighting",
    },
    siteFront: {
      gateStyle: dna.gateStyle || "modern black metal gate",
      boundaryWallStyle: dna.boundaryWallStyle || "modern boundary wall",
      parkingPlacement: dna.parkingPlacement || "front parking as per project brief",
    },
    detailRules: {
      balconyStyle: dna.balconyStyle || "front balcony",
      railingStyle: dna.railingStyle || "black slim metal railing",
    },
    consistencyRules: [
      "All future outputs must belong to this projectId and conceptId.",
      "Preserve locked concept design DNA and specJson.",
      "Do not silently switch facade style/material family.",
      "Exact same geometry views require future 3D/BIM pipeline.",
    ],
  };
}

export async function upsertProjectConcept(concept: ProjectConcept) {
  const db = await readProjectConceptDb();
  const now = nowIso();

  const next: ProjectConcept = {
    ...concept,
    projectId: safeProjectId(concept.projectId),
    toolSlug: safeToolSlug(concept.toolSlug),
    status: concept.status || "DRAFT",
    isActive: Boolean(concept.isActive),
    designDna: concept.designDna || {},
    specJson: concept.specJson || {},
    createdAt: concept.createdAt || now,
    updatedAt: concept.updatedAt || now,
  };

  let concepts = db.concepts.filter((c) => c.id !== next.id);

  if (next.isActive || next.status === "LOCKED") {
    concepts = concepts.map((c) => {
      const sameScope =
        c.projectId === next.projectId &&
        c.toolSlug === next.toolSlug &&
        c.conceptType === next.conceptType;

      if (!sameScope) return c;

      return {
        ...c,
        isActive: false,
        status: c.status === "LOCKED" ? "REPLACED" : c.status,
        updatedAt: now,
      };
    });
  }

  db.concepts = [next, ...concepts].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  await writeProjectConceptDb(db);

  return next;
}

export async function upsertProjectConceptOutput(output: ProjectConceptOutput) {
  const db = await readProjectConceptDb();
  const now = nowIso();

  const next: ProjectConceptOutput = {
    ...output,
    projectId: safeProjectId(output.projectId),
    toolSlug: safeToolSlug(output.toolSlug),
    jsonData: output.jsonData || {},
    status: output.status || "AI_FINAL_DRAFT",
    createdAt: output.createdAt || now,
    updatedAt: output.updatedAt || now,
  };

  db.outputs = [next, ...db.outputs.filter((o) => o.id !== next.id)].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );

  await writeProjectConceptDb(db);

  return next;
}

export async function getActiveProjectConcept(projectIdRaw: string, toolSlugRaw: string, conceptType?: ProjectConceptType) {
  const projectId = safeProjectId(projectIdRaw);
  const toolSlug = safeToolSlug(toolSlugRaw);
  const db = await readProjectConceptDb();

  return (
    db.concepts.find(
      (c) =>
        c.projectId === projectId &&
        c.toolSlug === toolSlug &&
        c.isActive &&
        c.status === "LOCKED" &&
        (!conceptType || c.conceptType === conceptType)
    ) ||
    db.concepts.find(
      (c) =>
        c.projectId === projectId &&
        c.toolSlug === toolSlug &&
        c.isActive &&
        (!conceptType || c.conceptType === conceptType)
    ) ||
    null
  );
}

export async function listProjectConcepts(projectIdRaw: string, toolSlugRaw?: string, conceptType?: ProjectConceptType) {
  const projectId = safeProjectId(projectIdRaw);
  const toolSlug = toolSlugRaw ? safeToolSlug(toolSlugRaw) : "";

  const db = await readProjectConceptDb();

  return db.concepts.filter((c) => {
    if (c.projectId !== projectId) return false;
    if (toolSlug && c.toolSlug !== toolSlug) return false;
    if (conceptType && c.conceptType !== conceptType) return false;
    return true;
  });
}

export async function listProjectConceptOutputs(projectIdRaw: string, conceptId?: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readProjectConceptDb();

  return db.outputs.filter((o) => o.projectId === projectId && (!conceptId || o.conceptId === conceptId));
}

export async function upsertProjectConceptFromExteriorConcept(exteriorConcept: any) {
  const designDna = exteriorConcept?.designDna || {};
  const specJson =
    exteriorConcept?.specJson ||
    buildExteriorSpecFromDesignDna({
      projectId: exteriorConcept?.projectId,
      title: exteriorConcept?.title,
      designDna,
      sourcePrompt: exteriorConcept?.sourcePrompt,
    });

  return upsertProjectConcept({
    id: String(exteriorConcept?.id || ""),
    projectId: String(exteriorConcept?.projectId || "default-project"),
    toolSlug: "exterior-elevation",
    toolName: "Exterior Elevation",
    conceptType: "exterior",
    title: String(exteriorConcept?.title || "Exterior Concept"),
    status: exteriorConcept?.status || "DRAFT",
    isActive: Boolean(exteriorConcept?.isActive),
    masterImageUrl: exteriorConcept?.masterImageUrl || "",
    masterPublicUrl: exteriorConcept?.masterPublicUrl || "",
    masterFile: exteriorConcept?.masterFile || "",
    designDna,
    specJson,
    sourcePrompt: exteriorConcept?.sourcePrompt || "",
    createdAt: exteriorConcept?.createdAt || nowIso(),
    updatedAt: exteriorConcept?.updatedAt || nowIso(),
  });
}

export async function upsertProjectConceptOutputFromExteriorView(view: any) {
  return upsertProjectConceptOutput({
    id: String(view?.id || ""),
    projectId: String(view?.projectId || "default-project"),
    conceptId: String(view?.conceptId || ""),
    toolSlug: "exterior-elevation",
    toolName: "Exterior Elevation",
    conceptType: "exterior",
    outputType: String(view?.viewType || "OUTPUT"),
    title: String(view?.title || view?.viewType || "Exterior Output"),
    imageUrl: view?.imageUrl || "",
    publicUrl: view?.publicUrl || "",
    file: view?.file || "",
    prompt: view?.prompt || "",
    generationMode: view?.generationMode || "",
    jsonData: {
      viewType: view?.viewType || "",
      source: "exterior-concept-store",
    },
    status: view?.status || "AI_FINAL_DRAFT",
    createdAt: view?.createdAt || nowIso(),
    updatedAt: view?.updatedAt || view?.createdAt || nowIso(),
  });
}
