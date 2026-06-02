import fs from "fs/promises";
import path from "path";
import { getExteriorSuggestions } from "@/lib/exterior-suggestions";
import { buildExteriorSpecFromDesignDna, upsertProjectConceptFromExteriorConcept, upsertProjectConceptOutputFromExteriorView } from "@/lib/project-concept-store";

export type ExteriorConceptStatus = "DRAFT" | "LOCKED" | "REPLACED";

export type ExteriorConcept = {
  id: string;
  projectId: string;
  title: string;
  status: ExteriorConceptStatus;
  isActive: boolean;
  masterImageUrl: string;
  masterPublicUrl?: string;
  masterFile?: string;
  designDna: Record<string, any>;
  specJson?: Record<string, any>;
  sourcePrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type ExteriorView = {
  id: string;
  projectId: string;
  conceptId: string;
  viewType: string;
  title: string;
  imageUrl?: string;
  publicUrl?: string;
  file?: string;
  prompt: string;
  generationMode: string;
  status: "AI_FINAL_DRAFT" | "SELECTED" | "REVIEW_REQUIRED" | "APPROVED";
  createdAt: string;
};

type ConceptDb = {
  concepts: ExteriorConcept[];
  views: ExteriorView[];
};

function dataDir() {
  return path.join(process.cwd(), "data", "generated");
}

function dbPath() {
  return path.join(dataDir(), "exterior-concepts.json");
}

function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function readExteriorDb(): Promise<ConceptDb> {
  try {
    const raw = await fs.readFile(dbPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      views: Array.isArray(parsed.views) ? parsed.views : [],
    };
  } catch {
    return { concepts: [], views: [] };
  }
}

export async function writeExteriorDb(db: ConceptDb) {
  await fs.mkdir(dataDir(), { recursive: true });
  await fs.writeFile(dbPath(), JSON.stringify(db, null, 2), "utf8");
}

export function extractFileFromGeneratedImageUrl(url: string) {
  const value = String(url || "").trim();

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const u = new URL(value);
      if (u.pathname.endsWith("/api/ai/generated-image")) {
        return String(u.searchParams.get("file") || "");
      }
      if (u.pathname.startsWith("/generated/ai-images/")) {
        return u.pathname.replace(/^\/+/, "");
      }
    }

    if (value.startsWith("/api/ai/generated-image")) {
      const u = new URL(value, "https://buildsetu.local");
      return String(u.searchParams.get("file") || "");
    }

    if (value.startsWith("/generated/ai-images/")) return value.replace(/^\/+/, "");
    if (value.startsWith("generated/ai-images/")) return value;
  } catch {}

  return "";
}

export function createDesignDnaFromPrompt(prompt: string, projectTitle = "") {
  const text = `${projectTitle} ${prompt}`.toLowerCase();

  const colors = [];
  if (text.includes("white")) colors.push("white");
  if (text.includes("grey") || text.includes("gray")) colors.push("grey");
  if (text.includes("black")) colors.push("black");
  if (!colors.length) colors.push("white", "grey", "black");

  const accentMaterials = [];
  if (text.includes("wood")) accentMaterials.push("wood texture");
  if (text.includes("stone")) accentMaterials.push("stone cladding");
  if (!accentMaterials.length) accentMaterials.push("wood texture accent panels");

  return {
    style: text.includes("luxury") ? "Luxury modern residential facade" : "Modern Indian residential facade",
    floorCount: text.includes("g+2") ? "G+2" : text.includes("g+1") ? "G+1" : "Project floor count as per master brief",
    massing: "Clean modern box/cuboid massing with practical buildable facade",
    facadeComposition: "Front hero facade with balcony, rectangular windows, gate and boundary wall",
    primaryColors: colors,
    accentMaterials,
    balconyStyle: "Front balcony with black slim metal railing",
    railingStyle: "Black horizontal/slim metal railing",
    gateStyle: "Modern black metal front gate with horizontal lines",
    boundaryWallStyle: "Simple modern boundary wall matching facade palette",
    windowStyle: "Black-framed rectangular aluminium/glass windows",
    doorStyle: "Warm wooden main door",
    lightingStyle: text.includes("warm") ? "Warm soffit/facade lighting" : "Soft exterior facade lighting",
    parkingPlacement: text.includes("parking") ? "Front parking provision" : "Parking as per floor plan",
    rooflineParapet: "Flat roof with clean parapet profile",
    notes: [
      "Master image is the design authority for this concept set.",
      "Future views should preserve the same design language unless user replaces master concept.",
      "AI-only views are concept-level; exact construction views require 3D/BIM/working drawing pipeline.",
    ],
  };
}

export async function createExteriorConcept(input: {
  projectId: string;
  projectTitle: string;
  masterImageUrl: string;
  masterPublicUrl?: string;
  masterFile?: string;
  sourcePrompt: string;
  status?: ExteriorConceptStatus;
  isActive?: boolean;
}) {
  const now = new Date().toISOString();
  const db = await readExteriorDb();
  const projectId = safeProjectId(input.projectId);
  const title = `${input.projectTitle || "Exterior"} Master Concept`;
  const designDna = createDesignDnaFromPrompt(input.sourcePrompt, input.projectTitle);

  const concept: ExteriorConcept = {
    id: makeId("ext"),
    projectId,
    title,
    status: input.status || "DRAFT",
    isActive: Boolean(input.isActive),
    masterImageUrl: input.masterImageUrl,
    masterPublicUrl: input.masterPublicUrl || "",
    masterFile: input.masterFile || extractFileFromGeneratedImageUrl(input.masterImageUrl),
    designDna,
    specJson: buildExteriorSpecFromDesignDna({ projectId, title, designDna, sourcePrompt: input.sourcePrompt }),
    sourcePrompt: input.sourcePrompt,
    createdAt: now,
    updatedAt: now,
  };

  if (concept.isActive || concept.status === "LOCKED") {
    db.concepts = db.concepts.map((c) =>
      c.projectId === projectId ? { ...c, isActive: false, status: c.status === "LOCKED" ? "REPLACED" : c.status, updatedAt: now } : c
    );
  }

  db.concepts.unshift(concept);
  await writeExteriorDb(db);
  await upsertProjectConceptFromExteriorConcept(concept);

  return concept;
}

export async function lockExteriorConcept(projectIdRaw: string, conceptId: string): Promise<ExteriorConcept> {
  const projectId = safeProjectId(projectIdRaw);
  const now = new Date().toISOString();
  const db = await readExteriorDb();

  const existing = db.concepts.find((c) => c.projectId === projectId && c.id === conceptId);

  if (!existing) {
    throw new Error("Exterior concept not found");
  }

  const lockedConcept: ExteriorConcept = {
    ...existing,
    status: "LOCKED",
    isActive: true,
    updatedAt: now,
  };

  db.concepts = db.concepts.map((c) => {
    if (c.projectId !== projectId) return c;

    if (c.id === conceptId) return lockedConcept;

    return {
      ...c,
      isActive: false,
      status: c.status === "LOCKED" ? "REPLACED" : c.status,
      updatedAt: now,
    };
  });

  await writeExteriorDb(db);
  await upsertProjectConceptFromExteriorConcept(lockedConcept);
  return lockedConcept;
}

export async function getActiveExteriorConcept(projectIdRaw: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readExteriorDb();

  return (
    db.concepts.find((c) => c.projectId === projectId && c.isActive && c.status === "LOCKED") ||
    db.concepts.find((c) => c.projectId === projectId && c.isActive) ||
    null
  );
}

export async function getLatestExteriorConcept(projectIdRaw: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readExteriorDb();

  return (
    db.concepts
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null
  );
}

export async function getExteriorConcept(projectIdRaw: string, conceptId: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readExteriorDb();
  return db.concepts.find((c) => c.projectId === projectId && c.id === conceptId) || null;
}

export async function addExteriorView(input: {
  projectId: string;
  conceptId: string;
  viewType: string;
  title: string;
  imageUrl?: string;
  publicUrl?: string;
  file?: string;
  prompt: string;
  generationMode: string;
}) {
  const now = new Date().toISOString();
  const db = await readExteriorDb();

  const view: ExteriorView = {
    id: makeId("extview"),
    projectId: safeProjectId(input.projectId),
    conceptId: input.conceptId,
    viewType: input.viewType,
    title: input.title,
    imageUrl: input.imageUrl || "",
    publicUrl: input.publicUrl || "",
    file: input.file || extractFileFromGeneratedImageUrl(input.imageUrl || input.publicUrl || ""),
    prompt: input.prompt,
    generationMode: input.generationMode,
    status: "AI_FINAL_DRAFT",
    createdAt: now,
  };

  db.views.unshift(view);
  await writeExteriorDb(db);
  await upsertProjectConceptOutputFromExteriorView(view);

  return view;
}

export async function listExteriorViews(projectIdRaw: string, conceptId?: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readExteriorDb();

  return db.views.filter((v) => v.projectId === projectId && (!conceptId || v.conceptId === conceptId));
}

export function formatSuggestionsForChat() {
  const suggestions = getExteriorSuggestions();
  const groups = suggestions.reduce<Record<string, typeof suggestions>>((acc, item) => {
    acc[item.category] ||= [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return [
    "Presentation:",
    ...(groups.presentation || []).map((s, i) => `${i + 1}. ${s.label}`),
    "",
    "Detail:",
    ...(groups.detail || []).map((s, i) => `${i + 1}. ${s.label}`),
    "",
    "Architectural / Technical:",
    ...[...(groups.architectural || []), ...(groups.technical || [])].map((s, i) => `${i + 1}. ${s.label}`),
  ].join("\n");
}
