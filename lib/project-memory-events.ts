import fs from "fs/promises";
import path from "path";

export type ProjectMemoryEventInput = {
  projectId: string;
  toolSlug?: string;
  toolName?: string;
  type?: string;
  role?: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  output?: unknown;
  source?: string;
  raw?: unknown;
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const EVENTS_FILE = path.join(DATA_DIR, "project-memory-events.json");

function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeToolSlug(value: unknown): string {
  const clean = safeString(value).trim().toLowerCase();
  const map: Record<string, string> = {
    "floor-plan": "floor-plan-ai",
    floorplan: "floor-plan-ai",
    "floorplan-ai": "floor-plan-ai",
    exterior: "exterior-elevation",
    elevation: "exterior-elevation",
    facade: "exterior-elevation",
    interior: "interior-render",
    boq: "boq-generator",
    bbs: "bbs-generator",
    structure: "structural-plan",
    structural: "structural-plan",
  };
  return map[clean] || clean;
}

async function readEvents(): Promise<any[]> {
  try {
    const raw = await fs.readFile(EVENTS_FILE, "utf8");
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function writeEvents(events: any[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events.slice(-2500), null, 2), "utf8");
}

export async function appendProjectMemoryEvent(input: ProjectMemoryEventInput) {
  const projectId = safeString(input.projectId).trim();
  if (!projectId) return null;

  const createdAt = new Date().toISOString();
  const event = {
    id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    projectId,
    toolSlug: normalizeToolSlug(input.toolSlug || ""),
    toolName: safeString(input.toolName || input.toolSlug || "Project Tool"),
    type: safeString(input.type || "tool-event"),
    role: safeString(input.role || "system"),
    title: safeString(input.title || input.type || "Project Activity"),
    text: safeString(input.text || ""),
    imageUrl: safeString(input.imageUrl || ""),
    output: input.output ?? null,
    source: safeString(input.source || ""),
    raw: input.raw ?? null,
    createdAt,
    updatedAt: createdAt,
  };

  const events = await readEvents();
  events.push(event);
  await writeEvents(events);

  return event;
}
