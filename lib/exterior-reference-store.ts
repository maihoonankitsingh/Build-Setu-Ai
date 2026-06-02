import fs from "fs/promises";
import path from "path";

export type ExteriorReferenceRole =
  | "primary_facade_reference"
  | "style_reference"
  | "material_reference"
  | "gate_reference"
  | "balcony_reference"
  | "lighting_reference"
  | "color_reference"
  | "other_reference";

export type ExteriorReferenceSource =
  | "upload"
  | "internet"
  | "generated"
  | "project_asset"
  | "manual_url";

export type ExteriorReferenceAsset = {
  id: string;
  projectId: string;
  title: string;
  source: ExteriorReferenceSource;
  role: ExteriorReferenceRole;
  fileUrl: string;
  file?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type ExteriorReferenceDb = {
  references: ExteriorReferenceAsset[];
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const REFERENCE_DB_PATH = path.join(DATA_DIR, "exterior-references.json");

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "extref") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

export function normalizeReferenceRole(value: string): ExteriorReferenceRole {
  const v = String(value || "").toLowerCase();

  if (v.includes("primary")) return "primary_facade_reference";
  if (v.includes("facade")) return "primary_facade_reference";
  if (v.includes("style")) return "style_reference";
  if (v.includes("material")) return "material_reference";
  if (v.includes("gate")) return "gate_reference";
  if (v.includes("balcony")) return "balcony_reference";
  if (v.includes("light")) return "lighting_reference";
  if (v.includes("color") || v.includes("colour")) return "color_reference";

  return "other_reference";
}

export function normalizeReferenceSource(value: string): ExteriorReferenceSource {
  const v = String(value || "").toLowerCase();

  if (v.includes("upload")) return "upload";
  if (v.includes("internet") || v.includes("web")) return "internet";
  if (v.includes("generated")) return "generated";
  if (v.includes("asset")) return "project_asset";
  if (v.includes("url")) return "manual_url";

  return "manual_url";
}

export async function readExteriorReferenceDb(): Promise<ExteriorReferenceDb> {
  try {
    const raw = await fs.readFile(REFERENCE_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      references: Array.isArray(parsed.references) ? parsed.references : [],
    };
  } catch {
    return { references: [] };
  }
}

export async function writeExteriorReferenceDb(db: ExteriorReferenceDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REFERENCE_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function addExteriorReference(input: {
  projectId: string;
  title?: string;
  source?: string;
  role?: string;
  fileUrl: string;
  file?: string;
  isPrimary?: boolean;
  notes?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const role = normalizeReferenceRole(input.role || "");
  const source = normalizeReferenceSource(input.source || "");

  if (!input.fileUrl) {
    throw new Error("fileUrl required");
  }

  const now = nowIso();
  const db = await readExteriorReferenceDb();

  let refs = db.references;

  const shouldBePrimary = Boolean(input.isPrimary) || role === "primary_facade_reference";

  if (shouldBePrimary) {
    refs = refs.map((ref) => {
      if (ref.projectId !== projectId) return ref;
      if (ref.role !== "primary_facade_reference") return ref;
      return { ...ref, isPrimary: false, updatedAt: now };
    });
  }

  const next: ExteriorReferenceAsset = {
    id: makeId(),
    projectId,
    title: input.title || "Exterior Reference",
    source,
    role,
    fileUrl: input.fileUrl,
    file: input.file || "",
    isPrimary: shouldBePrimary,
    notes: input.notes || "",
    createdAt: now,
    updatedAt: now,
  };

  db.references = [next, ...refs].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  await writeExteriorReferenceDb(db);

  return next;
}

export async function listExteriorReferences(projectIdRaw: string, roleRaw?: string) {
  const projectId = safeProjectId(projectIdRaw);
  const role = roleRaw ? normalizeReferenceRole(roleRaw) : "";

  const db = await readExteriorReferenceDb();

  return db.references.filter((ref) => {
    if (ref.projectId !== projectId) return false;
    if (role && ref.role !== role) return false;
    return true;
  });
}

export async function getExteriorReferencesByIds(projectIdRaw: string, ids: string[] = []) {
  const projectId = safeProjectId(projectIdRaw);
  const all = await listExteriorReferences(projectId);

  if (!ids.length) return all;

  const set = new Set(ids.map(String));
  return all.filter((ref) => set.has(ref.id));
}

export async function getExteriorReferenceContext(projectIdRaw: string, ids: string[] = []) {
  const refs = ids.length
    ? await getExteriorReferencesByIds(projectIdRaw, ids)
    : await listExteriorReferences(projectIdRaw);

  const primary = refs.find((ref) => ref.isPrimary) || refs.find((ref) => ref.role === "primary_facade_reference") || null;

  const grouped = refs.reduce<Record<string, ExteriorReferenceAsset[]>>((acc, ref) => {
    acc[ref.role] = acc[ref.role] || [];
    acc[ref.role].push(ref);
    return acc;
  }, {});

  return {
    references: refs,
    primary,
    grouped,
    referenceImageUrls: refs.map((ref) => ref.fileUrl).filter(Boolean),
    primaryImageUrl: primary?.fileUrl || "",
  };
}
