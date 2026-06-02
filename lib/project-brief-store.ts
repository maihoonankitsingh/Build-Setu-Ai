import fs from "fs/promises";
import path from "path";

export type ProjectStageId =
  | "brief"
  | "planning"
  | "floor_plan"
  | "structure"
  | "bbs"
  | "boq"
  | "exterior"
  | "interior"
  | "export";

export type ProjectStageStatus =
  | "not_started"
  | "in_progress"
  | "draft_ready"
  | "review_required"
  | "approved"
  | "complete";

export type ProjectStage = {
  id: ProjectStageId;
  label: string;
  order: number;
  status: ProjectStageStatus;
  required: boolean;
  description: string;
  updatedAt?: string;
};

export type ProjectBrief = {
  projectId: string;
  title: string;

  client: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };

  site: {
    city: string;
    state: string;
    address: string;
    plotWidthFt: number | null;
    plotDepthFt: number | null;
    facing: string;
    roadWidthFt: number | null;
    cornerPlot: boolean;
    existingSiteNotes: string;
  };

  building: {
    projectType: string;
    floors: string;
    basement: boolean;
    terraceUse: string;
    familyMembers: string;
    bedrooms: number | null;
    bathrooms: number | null;
    parking: string;
    staircase: string;
    lift: boolean;
  };

  spaces: {
    living: boolean;
    dining: boolean;
    kitchen: boolean;
    puja: boolean;
    store: boolean;
    utility: boolean;
    office: boolean;
    guestRoom: boolean;
    balcony: boolean;
    garden: boolean;
    notes: string;
  };

  preferences: {
    vastu: string;
    style: string;
    materialPalette: string;
    exteriorStyle: string;
    interiorStyle: string;
    budgetRange: string;
    qualityLevel: string;
    timeline: string;
  };

  requirements: {
    mustHave: string[];
    avoid: string[];
    clientNotes: string;
    engineerReviewRequired: boolean;
    contractorPackageRequired: boolean;
    clientPdfRequired: boolean;
  };

  references: {
    hasReferenceImages: boolean;
    referenceNotes: string;
  };

  raw: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

type ProjectBriefDb = {
  briefs: ProjectBrief[];
  stages: Record<string, ProjectStage[]>;
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const BRIEF_DB_PATH = path.join(DATA_DIR, "project-briefs.json");

export const DEFAULT_PROJECT_STAGES: ProjectStage[] = [
  {
    id: "brief",
    label: "Client Brief",
    order: 1,
    status: "not_started",
    required: true,
    description: "Client, site, plot, family, budget, vastu, style and references.",
  },
  {
    id: "planning",
    label: "Planning / Naksha",
    order: 2,
    status: "not_started",
    required: true,
    description: "Project brief ke basis par planning aur zoning.",
  },
  {
    id: "floor_plan",
    label: "Floor-wise Plan",
    order: 3,
    status: "not_started",
    required: true,
    description: "Ground floor, first floor, room sizes and dimensions.",
  },
  {
    id: "structure",
    label: "Structure",
    order: 4,
    status: "not_started",
    required: true,
    description: "Column, beam, slab, staircase draft; engineer review required.",
  },
  {
    id: "bbs",
    label: "BBS",
    order: 5,
    status: "not_started",
    required: true,
    description: "Bar bending schedule draft from structural plan.",
  },
  {
    id: "boq",
    label: "BOQ / Estimate",
    order: 6,
    status: "not_started",
    required: true,
    description: "Material quantity, labour and cost estimate.",
  },
  {
    id: "exterior",
    label: "Exterior Elevation",
    order: 7,
    status: "not_started",
    required: true,
    description: "Master exterior design, references and view generation.",
  },
  {
    id: "interior",
    label: "Interior",
    order: 8,
    status: "not_started",
    required: false,
    description: "Room-wise interior concepts and working notes.",
  },
  {
    id: "export",
    label: "Export Package",
    order: 9,
    status: "not_started",
    required: true,
    description: "Client PDF, contractor package, BOQ/BBS and drawings.",
  },
];

export const PROJECT_BRIEF_WIZARD_SCHEMA = [
  {
    id: "client",
    title: "Client Details",
    fields: ["client.name", "client.phone", "client.email", "client.address"],
  },
  {
    id: "site",
    title: "Site / Plot Details",
    fields: [
      "site.city",
      "site.state",
      "site.address",
      "site.plotWidthFt",
      "site.plotDepthFt",
      "site.facing",
      "site.roadWidthFt",
      "site.cornerPlot",
      "site.existingSiteNotes",
    ],
  },
  {
    id: "building",
    title: "Building Requirement",
    fields: [
      "building.projectType",
      "building.floors",
      "building.basement",
      "building.terraceUse",
      "building.familyMembers",
      "building.bedrooms",
      "building.bathrooms",
      "building.parking",
      "building.staircase",
      "building.lift",
    ],
  },
  {
    id: "spaces",
    title: "Room / Space Requirement",
    fields: [
      "spaces.living",
      "spaces.dining",
      "spaces.kitchen",
      "spaces.puja",
      "spaces.store",
      "spaces.utility",
      "spaces.office",
      "spaces.guestRoom",
      "spaces.balcony",
      "spaces.garden",
      "spaces.notes",
    ],
  },
  {
    id: "preferences",
    title: "Preferences",
    fields: [
      "preferences.vastu",
      "preferences.style",
      "preferences.materialPalette",
      "preferences.exteriorStyle",
      "preferences.interiorStyle",
      "preferences.budgetRange",
      "preferences.qualityLevel",
      "preferences.timeline",
    ],
  },
  {
    id: "requirements",
    title: "Final Requirements",
    fields: [
      "requirements.mustHave",
      "requirements.avoid",
      "requirements.clientNotes",
      "requirements.engineerReviewRequired",
      "requirements.contractorPackageRequired",
      "requirements.clientPdfRequired",
    ],
  },
  {
    id: "references",
    title: "References",
    fields: ["references.hasReferenceImages", "references.referenceNotes"],
  },
];

function nowIso() {
  return new Date().toISOString();
}

export function safeProjectId(value: string) {
  return String(value || "default-project").replace(/[^a-zA-Z0-9_-]/g, "") || "default-project";
}

function asString(value: any, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function asNumberOrNull(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asBool(value: any, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (["true", "yes", "1", "haan"].includes(v)) return true;
    if (["false", "no", "0", "nahi"].includes(v)) return false;
  }
  return fallback;
}

function asStringArray(value: any) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function pick(obj: any, pathValue: string, fallback: any = "") {
  const parts = pathValue.split(".");
  let cur = obj || {};
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in cur) {
      cur = cur[part];
    } else {
      return fallback;
    }
  }
  return cur ?? fallback;
}

export async function readProjectBriefDb(): Promise<ProjectBriefDb> {
  try {
    const raw = await fs.readFile(BRIEF_DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
      stages: parsed.stages && typeof parsed.stages === "object" ? parsed.stages : {},
    };
  } catch {
    return { briefs: [], stages: {} };
  }
}

export async function writeProjectBriefDb(db: ProjectBriefDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(BRIEF_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function normalizeProjectBrief(projectIdRaw: string, input: Record<string, any> = {}, existing?: ProjectBrief | null): ProjectBrief {
  const projectId = safeProjectId(projectIdRaw);
  const now = nowIso();
  const raw = { ...(existing?.raw || {}), ...(input || {}) };

  return {
    projectId,
    title: asString(input.title ?? existing?.title, "Untitled Project"),

    client: {
      name: asString(pick(input, "client.name", existing?.client?.name || input.clientName || "")),
      phone: asString(pick(input, "client.phone", existing?.client?.phone || input.clientPhone || "")),
      email: asString(pick(input, "client.email", existing?.client?.email || input.clientEmail || "")),
      address: asString(pick(input, "client.address", existing?.client?.address || "")),
    },

    site: {
      city: asString(pick(input, "site.city", existing?.site?.city || input.city || "")),
      state: asString(pick(input, "site.state", existing?.site?.state || input.state || "")),
      address: asString(pick(input, "site.address", existing?.site?.address || input.siteAddress || "")),
      plotWidthFt: asNumberOrNull(pick(input, "site.plotWidthFt", existing?.site?.plotWidthFt ?? input.plotWidthFt)),
      plotDepthFt: asNumberOrNull(pick(input, "site.plotDepthFt", existing?.site?.plotDepthFt ?? input.plotDepthFt)),
      facing: asString(pick(input, "site.facing", existing?.site?.facing || input.facing || "")),
      roadWidthFt: asNumberOrNull(pick(input, "site.roadWidthFt", existing?.site?.roadWidthFt ?? input.roadWidthFt)),
      cornerPlot: asBool(pick(input, "site.cornerPlot", existing?.site?.cornerPlot ?? input.cornerPlot), false),
      existingSiteNotes: asString(pick(input, "site.existingSiteNotes", existing?.site?.existingSiteNotes || "")),
    },

    building: {
      projectType: asString(pick(input, "building.projectType", existing?.building?.projectType || input.projectType || "residential")),
      floors: asString(pick(input, "building.floors", existing?.building?.floors || input.floors || "")),
      basement: asBool(pick(input, "building.basement", existing?.building?.basement ?? input.basement), false),
      terraceUse: asString(pick(input, "building.terraceUse", existing?.building?.terraceUse || "")),
      familyMembers: asString(pick(input, "building.familyMembers", existing?.building?.familyMembers || "")),
      bedrooms: asNumberOrNull(pick(input, "building.bedrooms", existing?.building?.bedrooms ?? input.bedrooms)),
      bathrooms: asNumberOrNull(pick(input, "building.bathrooms", existing?.building?.bathrooms ?? input.bathrooms)),
      parking: asString(pick(input, "building.parking", existing?.building?.parking || input.parking || "")),
      staircase: asString(pick(input, "building.staircase", existing?.building?.staircase || input.staircase || "")),
      lift: asBool(pick(input, "building.lift", existing?.building?.lift ?? input.lift), false),
    },

    spaces: {
      living: asBool(pick(input, "spaces.living", existing?.spaces?.living ?? true), true),
      dining: asBool(pick(input, "spaces.dining", existing?.spaces?.dining ?? false), false),
      kitchen: asBool(pick(input, "spaces.kitchen", existing?.spaces?.kitchen ?? true), true),
      puja: asBool(pick(input, "spaces.puja", existing?.spaces?.puja ?? false), false),
      store: asBool(pick(input, "spaces.store", existing?.spaces?.store ?? false), false),
      utility: asBool(pick(input, "spaces.utility", existing?.spaces?.utility ?? false), false),
      office: asBool(pick(input, "spaces.office", existing?.spaces?.office ?? false), false),
      guestRoom: asBool(pick(input, "spaces.guestRoom", existing?.spaces?.guestRoom ?? false), false),
      balcony: asBool(pick(input, "spaces.balcony", existing?.spaces?.balcony ?? false), false),
      garden: asBool(pick(input, "spaces.garden", existing?.spaces?.garden ?? false), false),
      notes: asString(pick(input, "spaces.notes", existing?.spaces?.notes || "")),
    },

    preferences: {
      vastu: asString(pick(input, "preferences.vastu", existing?.preferences?.vastu || input.vastu || "")),
      style: asString(pick(input, "preferences.style", existing?.preferences?.style || input.style || "")),
      materialPalette: asString(pick(input, "preferences.materialPalette", existing?.preferences?.materialPalette || input.materialPalette || "")),
      exteriorStyle: asString(pick(input, "preferences.exteriorStyle", existing?.preferences?.exteriorStyle || input.exteriorStyle || "")),
      interiorStyle: asString(pick(input, "preferences.interiorStyle", existing?.preferences?.interiorStyle || input.interiorStyle || "")),
      budgetRange: asString(pick(input, "preferences.budgetRange", existing?.preferences?.budgetRange || input.budgetRange || "")),
      qualityLevel: asString(pick(input, "preferences.qualityLevel", existing?.preferences?.qualityLevel || input.qualityLevel || "")),
      timeline: asString(pick(input, "preferences.timeline", existing?.preferences?.timeline || input.timeline || "")),
    },

    requirements: {
      mustHave: asStringArray(pick(input, "requirements.mustHave", existing?.requirements?.mustHave || input.mustHave || [])),
      avoid: asStringArray(pick(input, "requirements.avoid", existing?.requirements?.avoid || input.avoid || [])),
      clientNotes: asString(pick(input, "requirements.clientNotes", existing?.requirements?.clientNotes || input.clientNotes || "")),
      engineerReviewRequired: asBool(pick(input, "requirements.engineerReviewRequired", existing?.requirements?.engineerReviewRequired ?? true), true),
      contractorPackageRequired: asBool(pick(input, "requirements.contractorPackageRequired", existing?.requirements?.contractorPackageRequired ?? true), true),
      clientPdfRequired: asBool(pick(input, "requirements.clientPdfRequired", existing?.requirements?.clientPdfRequired ?? true), true),
    },

    references: {
      hasReferenceImages: asBool(pick(input, "references.hasReferenceImages", existing?.references?.hasReferenceImages ?? false), false),
      referenceNotes: asString(pick(input, "references.referenceNotes", existing?.references?.referenceNotes || "")),
    },

    raw,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export async function upsertProjectBrief(projectIdRaw: string, input: Record<string, any>) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readProjectBriefDb();
  const existing = db.briefs.find((b) => b.projectId === projectId) || null;
  const brief = normalizeProjectBrief(projectId, input, existing);

  db.briefs = [brief, ...db.briefs.filter((b) => b.projectId !== projectId)];
  await writeProjectBriefDb(db);

  return brief;
}

export async function getProjectBrief(projectIdRaw: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readProjectBriefDb();
  return db.briefs.find((b) => b.projectId === projectId) || null;
}

function filled(value: any) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return Boolean(String(value ?? "").trim());
}

export function getProjectBriefCompleteness(brief: ProjectBrief | null) {
  if (!brief) {
    return {
      score: 0,
      filled: 0,
      total: 14,
      missing: [
        "title",
        "site.plotWidthFt",
        "site.plotDepthFt",
        "site.facing",
        "site.city",
        "building.floors",
        "building.bedrooms",
        "building.bathrooms",
        "building.parking",
        "preferences.budgetRange",
        "preferences.style",
        "requirements.clientNotes",
        "requirements.engineerReviewRequired",
        "references.referenceNotes",
      ],
    };
  }

  const required = [
    ["title", brief.title],
    ["site.plotWidthFt", brief.site.plotWidthFt],
    ["site.plotDepthFt", brief.site.plotDepthFt],
    ["site.facing", brief.site.facing],
    ["site.city", brief.site.city],
    ["building.floors", brief.building.floors],
    ["building.bedrooms", brief.building.bedrooms],
    ["building.bathrooms", brief.building.bathrooms],
    ["building.parking", brief.building.parking],
    ["preferences.budgetRange", brief.preferences.budgetRange],
    ["preferences.style", brief.preferences.style],
    ["requirements.clientNotes", brief.requirements.clientNotes],
    ["requirements.engineerReviewRequired", brief.requirements.engineerReviewRequired],
    ["references.referenceNotes", brief.references.referenceNotes],
  ];

  const missing = required.filter(([, value]) => !filled(value)).map(([key]) => String(key));
  const filledCount = required.length - missing.length;
  const score = Math.round((filledCount / required.length) * 100);

  return {
    score,
    filled: filledCount,
    total: required.length,
    missing,
  };
}

export async function getProjectStages(projectIdRaw: string) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readProjectBriefDb();
  const existing = db.stages[projectId] || [];
  const map = new Map(existing.map((s) => [s.id, s]));
  const brief = db.briefs.find((b) => b.projectId === projectId) || null;
  const completeness = getProjectBriefCompleteness(brief);

  return DEFAULT_PROJECT_STAGES.map((base) => {
    const stored = map.get(base.id);
    const merged: ProjectStage = {
      ...base,
      ...(stored || {}),
    };

    if (base.id === "brief") {
      if (completeness.score >= 80 && merged.status === "not_started") {
        merged.status = "draft_ready";
      }
      if (completeness.score >= 95) {
        merged.status = stored?.status === "approved" || stored?.status === "complete" ? stored.status : "draft_ready";
      }
    }

    return merged;
  }).sort((a, b) => a.order - b.order);
}

export async function updateProjectStage(projectIdRaw: string, stageId: ProjectStageId, status: ProjectStageStatus) {
  const projectId = safeProjectId(projectIdRaw);
  const db = await readProjectBriefDb();
  const current = await getProjectStages(projectId);

  const stages = current.map((stage) => {
    if (stage.id !== stageId) return stage;
    return {
      ...stage,
      status,
      updatedAt: nowIso(),
    };
  });

  db.stages[projectId] = stages;
  await writeProjectBriefDb(db);

  return stages;
}
