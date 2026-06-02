import fs from "fs/promises";
import path from "path";
import {
  safeProjectId,
  updateProjectStage,
  type ProjectStageId,
  type ProjectStageStatus,
} from "@/lib/project-brief-store";

export type ProjectToolOutputRecord = {
  id: string;
  projectId: string;
  projectTitle: string;
  toolSlug: string;
  toolName: string;
  stageId: ProjectStageId;
  stageStatus: ProjectStageStatus;
  action: string;
  title: string;
  summary: string;
  status: string;
  output: any;
  imagePrompt: string;
  sourceMessage: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectToolOutputDb = {
  outputs: ProjectToolOutputRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const TOOL_OUTPUT_DB_PATH = path.join(DATA_DIR, "project-tool-outputs.json");

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "toolout") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function text(value: any, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

export function inferProjectStageFromToolSlug(toolSlugRaw: string, toolNameRaw = ""): ProjectStageId {
  const value = `${toolSlugRaw || ""} ${toolNameRaw || ""}`
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  // Brief / intake
  if (
    value.includes("magic brief") ||
    value.includes("client brief") ||
    value.includes("project intake") ||
    value.includes("brief")
  ) {
    return "brief";
  }

  // Planning / naksha / floor plan
  if (
    value.includes("sketch to plan") ||
    value.includes("floor plan ai") ||
    value.includes("floor plan") ||
    value.includes("naksha") ||
    value.includes("planning") ||
    value.includes("vastu")
  ) {
    if (value.includes("vastu")) return "planning";
    if (value.includes("sketch")) return "planning";
    return "floor_plan";
  }

  // Structural
  if (
    value.includes("structure") ||
    value.includes("structural") ||
    value.includes("column") ||
    value.includes("beam") ||
    value.includes("slab") ||
    value.includes("column beam")
  ) {
    return "structure";
  }

  // BBS
  if (value.includes("bbs") || value.includes("bar bending")) {
    return "bbs";
  }

  // BOQ / estimate
  if (
    value.includes("boq") ||
    value.includes("estimate") ||
    value.includes("estimation") ||
    value.includes("quantity") ||
    value.includes("material quantity")
  ) {
    return "boq";
  }

  // Exterior
  if (
    value.includes("exterior") ||
    value.includes("elevation") ||
    value.includes("facade") ||
    value.includes("site photo redesign")
  ) {
    return "exterior";
  }

  // Interior and visual design
  if (
    value.includes("interior") ||
    value.includes("mood board") ||
    value.includes("material palette") ||
    value.includes("false ceiling") ||
    value.includes("remove furniture") ||
    value.includes("room") ||
    value.includes("ceiling")
  ) {
    return "interior";
  }

  // Export / presentation / package / agreements
  if (
    value.includes("working drawing") ||
    value.includes("presentation") ||
    value.includes("client pdf") ||
    value.includes("pdf") ||
    value.includes("contractor package") ||
    value.includes("client agreement") ||
    value.includes("agreement") ||
    value.includes("report") ||
    value.includes("export") ||
    value.includes("render enhancer") ||
    value.includes("photo enhancer") ||
    value.includes("background change")
  ) {
    return "export";
  }

  // Generic architect chat should work as planning-context assistant.
  if (value.includes("architect chat") || value.includes("architect")) {
    return "planning";
  }

  return "planning";
}

export function stageStatusForToolOutput(stageId: ProjectStageId): ProjectStageStatus {
  if (stageId === "structure" || stageId === "bbs") return "review_required";
  return "draft_ready";
}

export async function readProjectToolOutputDb(): Promise<ProjectToolOutputDb> {
  try {
    const raw = await fs.readFile(TOOL_OUTPUT_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      outputs: Array.isArray(parsed.outputs) ? parsed.outputs : [],
    };
  } catch {
    return { outputs: [] };
  }
}

export async function writeProjectToolOutputDb(db: ProjectToolOutputDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TOOL_OUTPUT_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function saveToolOutputAndStage(input: {
  projectId: string;
  projectTitle: string;
  toolSlug: string;
  toolName: string;
  action: string;
  output: any;
  imagePrompt?: string;
  sourceMessage?: string;
}) {
  const projectId = safeProjectId(input.projectId);

  if (!projectId || projectId === "default-project") {
    return null;
  }

  const stageId = inferProjectStageFromToolSlug(input.toolSlug, input.toolName);
  const stageStatus = stageStatusForToolOutput(stageId);
  const now = nowIso();

  const output = input.output && typeof input.output === "object" ? input.output : {};
  const title = text(output.title, `${input.toolName || input.toolSlug} Output`);
  const summary = text(output.summary, "");
  const status = text(output.status, stageStatus);

  const record: ProjectToolOutputRecord = {
    id: makeId(),
    projectId,
    projectTitle: text(input.projectTitle, projectId),
    toolSlug: text(input.toolSlug, ""),
    toolName: text(input.toolName, ""),
    stageId,
    stageStatus,
    action: text(input.action, "chat"),
    title,
    summary,
    status,
    output,
    imagePrompt: text(input.imagePrompt, ""),
    sourceMessage: text(input.sourceMessage, ""),
    createdAt: now,
    updatedAt: now,
  };

  const db = await readProjectToolOutputDb();
  db.outputs = [record, ...db.outputs]
    .filter((item) => item && item.projectId)
    .slice(0, 1000);

  await writeProjectToolOutputDb(db);

  const stages = await updateProjectStage(projectId, stageId, stageStatus);

  return {
    record,
    stageUpdate: {
      stageId,
      status: stageStatus,
      stages,
    },
  };
}
