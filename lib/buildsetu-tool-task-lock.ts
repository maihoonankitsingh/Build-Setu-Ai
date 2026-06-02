export type BuildSetuTaskType =
  | "floor_plan_2d"
  | "exterior_elevation"
  | "interior_render"
  | "working_drawing"
  | "structure_drawing"
  | "boq_document"
  | "bbs_document"
  | "electrical_plan"
  | "plumbing_plan"
  | "mep_plan"
  | "false_ceiling_plan"
  | "furniture_layout"
  | "material_list"
  | "cost_estimate"
  | "client_pdf"
  | "contractor_package"
  | "agreement_document"
  | "generic_project_assistant";

export type BuildSetuOutputMode =
  | "image"
  | "document"
  | "drawing"
  | "table"
  | "pdf"
  | "package";

export type BuildSetuToolLock = {
  slug: string;
  label: string;
  taskType: BuildSetuTaskType;
  outputMode: BuildSetuOutputMode;
  outputType?: BuildSetuOutputMode | string | null;
  renderType?: string | null;
  assetType?: string | null;
  imageMode?: string | null;
  allowImageGeneration: boolean;
  imageAllowed?: boolean | null;
  allowLocalSvgFallback: boolean;
  localGenerator?: string | null;
  requiresMasterBrief: boolean;
  requiresLockedFloorPlan: boolean;
  requiresLockedExteriorConcept: boolean;
  requiresLockedInteriorConcept: boolean;
  qualityMode: "premium" | "technical" | "document";
  positivePrompt: string;
  negativePrompt: string;
};

const FLOOR_PLAN_POSITIVE = `
TASK LOCK: FLOOR PLAN AI ONLY.
Generate a premium furnished top-down 2D architectural floor plan sheet.
Output must show plot boundary, room labels, room dimensions, furniture layout, doors, windows, staircase, parking, kitchen, toilets, balcony/terrace if required, north arrow, road/facing label, area notes and professional architectural sheet styling.
Use the selected project brief as source of truth.
`;

const FLOOR_PLAN_NEGATIVE = `
STRICT BLOCKED OUTPUTS:
Do NOT generate exterior elevation.
Do NOT generate 3D house.
Do NOT generate facade.
Do NOT generate perspective render.
Do NOT generate interior room render.
Do NOT generate simple colored block diagram.
Do NOT generate generic SVG box layout.
Do NOT change the project type.
`;

const EXTERIOR_POSITIVE = `
TASK LOCK: EXTERIOR ELEVATION ONLY.
Generate exterior building elevation/render based on the selected project and locked floor plan.
For multi-view output, keep same facade identity, material palette, balcony style, window style, gate, roofline, colors and boundary wall. Only camera angle may change.
`;

const EXTERIOR_NEGATIVE = `
STRICT BLOCKED OUTPUTS:
Do NOT generate floor plan.
Do NOT generate interior room design.
Do NOT generate BOQ/BBS.
Do NOT change facade identity between views.
Do NOT create random unrelated building design.
`;

const INTERIOR_POSITIVE = `
TASK LOCK: INTERIOR DESIGN ONLY.
Generate interior room render/design for the selected room using the selected project, locked floor plan and room context.
For multi-view output, keep same furniture, wall treatment, ceiling design, lighting, material palette and layout. Only camera angle may change.
`;

const INTERIOR_NEGATIVE = `
STRICT BLOCKED OUTPUTS:
Do NOT generate floor plan.
Do NOT generate exterior elevation.
Do NOT generate full building facade.
Do NOT change furniture/layout/material identity between room views.
Do NOT generate BOQ/BBS.
`;

const DOCUMENT_NEGATIVE = `
STRICT BLOCKED OUTPUTS:
Do NOT call image generation.
Do NOT generate render image.
Do NOT generate exterior/floor/interior visual unless this document specifically references an already locked source.
Generate structured professional text/table/document output only.
`;

const DRAWING_NEGATIVE = `
STRICT BLOCKED OUTPUTS:
Do NOT generate artistic render.
Do NOT generate random image.
Do NOT generate unrelated facade/interior/floor plan.
Generate technical drawing/specification output from locked project data only.
`;

export const BUILDSETU_TOOL_TASK_LOCKS: Record<string, BuildSetuToolLock> = {
  "floor-plan-ai": {
    slug: "floor-plan-ai",
    label: "Floor Plan AI",
    taskType: "floor_plan_2d",
    outputMode: "image",
    allowImageGeneration: true,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: false,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "premium",
    positivePrompt: FLOOR_PLAN_POSITIVE,
    negativePrompt: FLOOR_PLAN_NEGATIVE,
  },

  "exterior-elevation": {
    slug: "exterior-elevation",
    label: "Exterior Elevation",
    taskType: "exterior_elevation",
    outputMode: "image",
    allowImageGeneration: true,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "premium",
    positivePrompt: EXTERIOR_POSITIVE,
    negativePrompt: EXTERIOR_NEGATIVE,
  },

  "interior-render": {
    slug: "interior-render",
    label: "Interior Render",
    taskType: "interior_render",
    outputMode: "image",
    allowImageGeneration: true,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "premium",
    positivePrompt: INTERIOR_POSITIVE,
    negativePrompt: INTERIOR_NEGATIVE,
  },

  "working-drawings": {
    slug: "working-drawings",
    label: "Working Drawings",
    taskType: "working_drawing",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: WORKING DRAWINGS ONLY. Generate technical sheets, dimensions, notes, scale, sheet number, revision and execution details from locked project data.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "structural-plan": {
    slug: "structural-plan",
    label: "Structural Plan",
    taskType: "structure_drawing",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: STRUCTURE DRAWING ONLY. Generate structural grid, columns, beams, slab/footing assumptions and engineer-review-ready notes.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "column-beam-plan": {
    slug: "column-beam-plan",
    label: "Column Beam Plan",
    taskType: "structure_drawing",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: COLUMN/BEAM PLAN ONLY. Generate column layout, beam layout, slab assumptions and structural notes from locked floor plan.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "boq-generator": {
    slug: "boq-generator",
    label: "BOQ Generator",
    taskType: "boq_document",
    outputMode: "table",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: BOQ ONLY. Generate itemized BOQ with sections, quantities, units, rate assumptions, amount, notes and review status.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },

  "bbs-generator": {
    slug: "bbs-generator",
    label: "BBS Generator",
    taskType: "bbs_document",
    outputMode: "table",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: BBS ONLY. Generate bar bending schedule with member, dia, spacing, length, shape, quantity, weight, wastage and engineer review warning.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },

  "electrical-plan": {
    slug: "electrical-plan",
    label: "Electrical Plan",
    taskType: "electrical_plan",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: ELECTRICAL PLAN ONLY. Generate electrical point layout, switchboard schedule, lighting plan, load notes and execution notes.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "plumbing-plan": {
    slug: "plumbing-plan",
    label: "Plumbing Plan",
    taskType: "plumbing_plan",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: PLUMBING PLAN ONLY. Generate water supply, drainage, sanitary points, shaft notes and execution notes.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "mep-plan": {
    slug: "mep-plan",
    label: "MEP Plan",
    taskType: "mep_plan",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: MEP PLAN ONLY. Generate coordinated mechanical/electrical/plumbing planning notes and technical schedules.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "false-ceiling": {
    slug: "false-ceiling",
    label: "False Ceiling",
    taskType: "false_ceiling_plan",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: FALSE CEILING PLAN ONLY. Generate ceiling layout, levels, cove, lights, sections, material notes and execution notes.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "furniture-layout": {
    slug: "furniture-layout",
    label: "Furniture Layout",
    taskType: "furniture_layout",
    outputMode: "drawing",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "technical",
    positivePrompt: "TASK LOCK: FURNITURE LAYOUT ONLY. Generate furniture placement, clearances, sizes, room-wise layout and execution notes.",
    negativePrompt: DRAWING_NEGATIVE,
  },

  "material-list": {
    slug: "material-list",
    label: "Material List",
    taskType: "material_list",
    outputMode: "table",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: MATERIAL LIST ONLY. Generate material schedule with category, specification, quantity assumption, unit and notes.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },

  "cost-estimator": {
    slug: "cost-estimator",
    label: "Cost Estimator",
    taskType: "cost_estimate",
    outputMode: "table",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: COST ESTIMATE ONLY. Generate budget estimate with assumptions, category-wise cost, rate notes and contingency.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },

  "client-pdf": {
    slug: "client-pdf",
    label: "Client PDF",
    taskType: "client_pdf",
    outputMode: "pdf",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: false,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: CLIENT PDF ONLY. Generate client presentation package from already generated/locked project assets.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },

  "contractor-package": {
    slug: "contractor-package",
    label: "Contractor Package",
    taskType: "contractor_package",
    outputMode: "package",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: true,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: CONTRACTOR PACKAGE ONLY. Generate contractor/site execution package from locked drawings, notes, BOQ and review status.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },

  "agreement": {
    slug: "agreement",
    label: "Agreement",
    taskType: "agreement_document",
    outputMode: "document",
    allowImageGeneration: false,
    allowLocalSvgFallback: false,
    requiresMasterBrief: true,
    requiresLockedFloorPlan: false,
    requiresLockedExteriorConcept: false,
    requiresLockedInteriorConcept: false,
    qualityMode: "document",
    positivePrompt: "TASK LOCK: AGREEMENT DOCUMENT ONLY. Generate agreement draft/terms document. Do not generate images or design renders.",
    negativePrompt: DOCUMENT_NEGATIVE,
  },
};

const SLUG_ALIASES: Record<string, string> = {
  "floor-plan": "floor-plan-ai",
  "floorplan": "floor-plan-ai",
  "floorplan-ai": "floor-plan-ai",
  "floor-plan-generator": "floor-plan-ai",

  "exterior": "exterior-elevation",
  "elevation": "exterior-elevation",
  "exterior-render": "exterior-elevation",
  "facade": "exterior-elevation",

  "interior": "interior-render",
  "room-interior": "interior-render",
  "interior-design": "interior-render",

  "boq": "boq-generator",
  "estimate": "cost-estimator",
  "cost-estimation": "cost-estimator",

  "bbs": "bbs-generator",
  "bar-bending-schedule": "bbs-generator",

  "structure": "structural-plan",
  "structural": "structural-plan",
  "column-beam": "column-beam-plan",

  "electrical": "electrical-plan",
  "plumbing": "plumbing-plan",
  "mep": "mep-plan",

  "pdf": "client-pdf",
  "client-presentation": "client-pdf",
  "contractor": "contractor-package",
};

export function normalizeBuildSetuToolSlug(slug?: string | null): string {
  const clean = String(slug || "").trim().toLowerCase();
  return SLUG_ALIASES[clean] || clean;
}

export function getBuildSetuToolTaskLock(slug?: string | null, fallbackSlug?: string | null): BuildSetuToolLock {
  const normalized = normalizeBuildSetuToolSlug(slug || fallbackSlug);

  const baseLock: BuildSetuToolLock =
    BUILDSETU_TOOL_TASK_LOCKS[normalized] || {
      slug: normalized || "unknown",
      label: "Project Assistant",
      taskType: "generic_project_assistant",
      outputMode: "document",
      outputType: "document",
      renderType: "generic_project_assistant",
      assetType: "document",
      imageMode: "none",
      allowImageGeneration: false,
      imageAllowed: false,
      allowLocalSvgFallback: false,
      localGenerator: null,
      requiresMasterBrief: true,
      requiresLockedFloorPlan: false,
      requiresLockedExteriorConcept: false,
      requiresLockedInteriorConcept: false,
      qualityMode: "document",
      positivePrompt:
        "TASK LOCK: PROJECT ASSISTANT ONLY. Answer using selected project context. Do not generate images unless this slug is explicitly registered for image generation.",
      negativePrompt: DOCUMENT_NEGATIVE,
    };

  return {
    ...baseLock,
    outputType: baseLock.outputMode,
    renderType: baseLock.renderType || baseLock.taskType,
    assetType: baseLock.assetType || baseLock.outputMode,
    imageMode: baseLock.imageMode || (baseLock.allowImageGeneration ? "image" : "none"),
    imageAllowed: baseLock.allowImageGeneration,
    localGenerator: baseLock.localGenerator ?? null,
  };
}

export function buildToolLockedPrompt(params: {
  slug?: string | null;
  userPrompt?: string | null;
  projectContext?: string | null;
}): string {
  const lock = getBuildSetuToolTaskLock(params.slug);

  return `
BUILDSETU TOOL TASK LOCK
Tool: ${lock.label}
Slug: ${lock.slug}
Task Type: ${lock.taskType}
Output Mode: ${lock.outputMode}
Quality Mode: ${lock.qualityMode}
Image Generation Allowed: ${lock.allowImageGeneration ? "YES" : "NO"}

MANDATORY PROJECT SOURCE OF TRUTH:
${params.projectContext || "Use selected project master brief, locked concepts, materials, budget, location and required outputs if available."}

ALLOWED OUTPUT RULE:
${lock.positivePrompt}

BLOCKED OUTPUT RULE:
${lock.negativePrompt}

USER REQUEST:
${params.userPrompt || ""}

FINAL INSTRUCTION:
Follow the task lock above even if the user prompt or generic pipeline conflicts with it.
`.trim();
}

export function assertImageAllowedForTool(slug?: string | null): void {
  const lock = getBuildSetuToolTaskLock(slug);
  if (!lock.allowImageGeneration) {
    throw new Error(
      `Image generation blocked by BuildSetu task lock. Tool "${lock.slug}" is ${lock.taskType} and output mode is ${lock.outputMode}.`
    );
  }
}

export function getTaskLockedImagePayload(params: {
  slug?: string | null;
  prompt?: string | null;
  projectContext?: string | null;
}) {
  const lock = getBuildSetuToolTaskLock(params.slug);

  return {
    taskType: lock.taskType,
    outputMode: lock.outputMode,
    outputType: lock.outputMode,
    renderType: lock.renderType || lock.taskType,
    assetType: lock.assetType || lock.outputMode,
    imageMode: lock.imageMode || (lock.allowImageGeneration ? "image" : "none"),
    qualityMode: lock.qualityMode,
    allowImageGeneration: lock.allowImageGeneration,
    allowLocalSvgFallback: lock.allowLocalSvgFallback,
    imagePrompt: buildToolLockedPrompt({
      slug: lock.slug,
      userPrompt: params.prompt,
      projectContext: params.projectContext,
    }),
  };
}


// BACKWARD_COMPAT_EXPORTS_FOR_EXISTING_ROUTES
export function buildBuildSetuLockedImagePrompt(
  args?: any,
  promptArg?: string | null,
  projectContextArg?: string | null
): string {
  if (typeof args === "string") {
    return buildToolLockedPrompt({
      slug: args,
      userPrompt: promptArg || "",
      projectContext: projectContextArg || "",
    });
  }

  const input = args || {};
  const slug =
    input.slug ||
    input.toolSlug ||
    input.selectedToolSlug ||
    input.tool ||
    input.toolId ||
    input.taskSlug ||
    input.taskType ||
    "";

  const userPrompt =
    input.imagePrompt ||
    input.prompt ||
    input.userPrompt ||
    input.message ||
    promptArg ||
    "";

  const projectContextRaw =
    input.projectContext ||
    input.context ||
    input.selectedProject ||
    input.project ||
    input.masterBrief ||
    projectContextArg ||
    "";

  const projectContext =
    typeof projectContextRaw === "string"
      ? projectContextRaw
      : JSON.stringify(projectContextRaw);

  return buildToolLockedPrompt({
    slug,
    userPrompt,
    projectContext,
  });
}

export function normalizeBuildSetuToolOutput(output?: any, fallbackSlug?: string | null, fallbackName?: string | null): any {
  const raw = output || {};
  const slug =
    raw.slug ||
    raw.toolSlug ||
    raw.selectedToolSlug ||
    raw.tool ||
    raw.toolId ||
    fallbackSlug ||
    fallbackName ||
    "";

  const lock = getBuildSetuToolTaskLock(slug, fallbackName);

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return {
      ...raw,
      toolSlug: raw.toolSlug || lock.slug,
      taskType: raw.taskType || lock.taskType,
      outputMode: raw.outputMode || lock.outputMode,
      outputType: raw.outputType || raw.outputMode || lock.outputMode,
      renderType: raw.renderType || lock.renderType || lock.taskType,
      assetType: raw.assetType || lock.assetType || lock.outputMode,
      imageMode: raw.imageMode || lock.imageMode || (lock.allowImageGeneration ? "image" : "none"),
      qualityMode: raw.qualityMode || lock.qualityMode,
      allowImageGeneration: lock.allowImageGeneration,
      allowLocalSvgFallback: lock.allowLocalSvgFallback,
      taskLocked: true,
    };
  }

  return {
    content: raw,
    toolSlug: lock.slug,
    taskType: lock.taskType,
    outputMode: lock.outputMode,
    qualityMode: lock.qualityMode,
    allowImageGeneration: lock.allowImageGeneration,
    allowLocalSvgFallback: lock.allowLocalSvgFallback,
    taskLocked: true,
  };
}

