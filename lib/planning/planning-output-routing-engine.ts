// BUILDSETU_PHASE_47O1_OUTPUT_ROUTING_ENGINE

type BuildingTypeClassificationLike = {
  category?: string;
  planningMode?: string;
  riskLevel?: string;
};

type ConceptPlanningActionEngineLike = {
  actionMode?: string;
  canStartConcept?: boolean;
};

type PlanningReferenceIntelligenceLike = {
  hasReferenceIntent?: boolean;
  referenceUseMode?: string;
  detectedReferenceTypes?: string[];
};

type RoomFurnitureFitEngineLike = {
  hasRoomFitContext?: boolean;
};

export type BuildSetuOutputRoute =
  | "concept_floor_plan"
  | "interior_layout"
  | "working_drawing"
  | "elevation_design"
  | "three_d_render_prompt"
  | "boq_estimate"
  | "mep_concept"
  | "structure_concept"
  | "reference_extraction"
  | "professional_review";

export type BuildSetuPlanningOutputRouteItem = {
  route: BuildSetuOutputRoute;
  priority: "primary" | "secondary" | "blocked";
  reason: string;
  prerequisites: string[];
  targetApiOrWorkflow: string;
};

export type BuildSetuPlanningOutputRoutingResult = {
  engineVersion: "47O-1";
  category: string;
  planningMode: string;
  requestedOutputs: BuildSetuOutputRoute[];
  routePlan: BuildSetuPlanningOutputRouteItem[];
  blockedOutputs: BuildSetuPlanningOutputRouteItem[];
  nextActionOrder: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(pattern: RegExp, text: string): boolean {
  return pattern.test(text);
}

function pushUnique<T>(list: T[], value: T, keyFn: (item: T) => string = (item) => String(item)) {
  const key = keyFn(value).toLowerCase();
  if (!list.some((item) => keyFn(item).toLowerCase() === key)) {
    list.push(value);
  }
}

function addRoute(list: BuildSetuPlanningOutputRouteItem[], item: BuildSetuPlanningOutputRouteItem) {
  pushUnique(list, item, (x) => x.route);
}

export function buildPlanningOutputRoutingEngine(input: {
  inputText: string;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  conceptPlanningActionEngine?: ConceptPlanningActionEngineLike;
  planningReferenceIntelligence?: PlanningReferenceIntelligenceLike;
  roomFurnitureFitEngine?: RoomFurnitureFitEngineLike;
}): BuildSetuPlanningOutputRoutingResult {
  const text = cleanText(input.inputText).toLowerCase();
  const category = cleanText(input.buildingTypeClassification?.category || "unknown");
  const planningMode = cleanText(input.buildingTypeClassification?.planningMode || "unknown");
  const riskLevel = cleanText(input.buildingTypeClassification?.riskLevel || "unknown");
  const canStartConcept = input.conceptPlanningActionEngine?.canStartConcept !== false;

  const requestedOutputs: BuildSetuOutputRoute[] = [];
  const routePlan: BuildSetuPlanningOutputRouteItem[] = [];
  const blockedOutputs: BuildSetuPlanningOutputRouteItem[] = [];
  const nextActionOrder: string[] = [];

  if (has(/\b(floor plan|layout|plan|zoning|room arrangement|naksha)\b/i, text)) requestedOutputs.push("concept_floor_plan");
  if (has(/\b(interior|furniture|wardrobe|kitchen|ceiling|lighting)\b/i, text)) requestedOutputs.push("interior_layout");
  if (has(/\b(working drawing|working plan|dimension drawing|submission drawing|architectural drawing)\b/i, text)) requestedOutputs.push("working_drawing");
  if (has(/\b(elevation|facade|front design|exterior)\b/i, text)) requestedOutputs.push("elevation_design");
  if (has(/\b(3d|render|rendering|visualization|image prompt)\b/i, text)) requestedOutputs.push("three_d_render_prompt");
  if (has(/\b(boq|estimate|cost|quantity|material list)\b/i, text)) requestedOutputs.push("boq_estimate");
  if (has(/\b(mep|electrical|plumbing|drainage|hvac|ac point|water tank|pump)\b/i, text)) requestedOutputs.push("mep_concept");
  if (has(/\b(structure|column|beam|slab|footing|foundation)\b/i, text)) requestedOutputs.push("structure_concept");

  if (input.planningReferenceIntelligence?.hasReferenceIntent) requestedOutputs.push("reference_extraction");

  if (!requestedOutputs.length) {
    if (planningMode === "room_interior") requestedOutputs.push("interior_layout");
    else requestedOutputs.push("concept_floor_plan");
  }

  const needsReview = riskLevel === "high" || planningMode === "public_or_special_building" || planningMode === "industrial_storage";
  if (needsReview) requestedOutputs.push("professional_review");

  for (const route of Array.from(new Set(requestedOutputs))) {
    if (route === "concept_floor_plan") {
      addRoute(routePlan, {
        route,
        priority: canStartConcept ? "primary" : "blocked",
        reason: canStartConcept ? "Concept zoning can start with current planning context." : "Critical planning blockers must be resolved first.",
        prerequisites: ["plot dimensions", "location/local authority", "road width", "facing", "floor count", "parking/stair requirement"],
        targetApiOrWorkflow: "/api/planning/universal-agent -> conceptPlanningActionEngine",
      });
    }

    if (route === "interior_layout") {
      addRoute(routePlan, {
        route,
        priority: input.roomFurnitureFitEngine?.hasRoomFitContext ? "primary" : "secondary",
        reason: "Interior output should use room fit, standards grade, openings and furniture requirements.",
        prerequisites: ["room dimensions", "door/window positions", "furniture list", "style/reference", "budget/finish level"],
        targetApiOrWorkflow: "/api/planning/universal-agent -> roomFurnitureFitEngine + roomSpaceStandardsEngine",
      });
    }

    if (route === "reference_extraction") {
      addRoute(routePlan, {
        route,
        priority: "primary",
        reason: "Reference intent is detected and should be interpreted before applying style/layout/material assumptions.",
        prerequisites: ["uploaded file", "reference use intent", "exact/inspired/partial-match confirmation"],
        targetApiOrWorkflow: "project-assets upload + planningReferenceIntelligence",
      });
    }

    if (route === "elevation_design") {
      addRoute(routePlan, {
        route,
        priority: "secondary",
        reason: "Elevation should follow approved floor plan, facade style and material palette.",
        prerequisites: ["approved massing", "floor heights", "opening positions", "style reference", "material palette"],
        targetApiOrWorkflow: "/api/exterior/reference-master/generate or /api/exterior/view/generate",
      });
    }

    if (route === "three_d_render_prompt") {
      addRoute(routePlan, {
        route,
        priority: "secondary",
        reason: "3D/render prompt should follow approved plan/elevation/interior direction.",
        prerequisites: ["view type", "style", "materials", "camera angle", "approved concept"],
        targetApiOrWorkflow: "/api/ai/generate-image or exterior/model render workflow",
      });
    }

    if (route === "boq_estimate") {
      addRoute(routePlan, {
        route,
        priority: "secondary",
        reason: "BOQ requires scope, area, specifications and drawing assumptions.",
        prerequisites: ["approved scope", "area", "material/spec level", "item list"],
        targetApiOrWorkflow: "/api/boq/generate",
      });
    }

    if (route === "mep_concept") {
      addRoute(routePlan, {
        route,
        priority: needsReview ? "primary" : "secondary",
        reason: "MEP coordination should be concept-level until exact loads and consultant review.",
        prerequisites: ["room zoning", "wet area stack", "electrical load", "plumbing/drainage route", "AC/HVAC need"],
        targetApiOrWorkflow: "planningCategoryIntelligence -> MEP notes; future /api/mep/generate",
      });
    }

    if (route === "structure_concept") {
      addRoute(routePlan, {
        route,
        priority: needsReview ? "primary" : "secondary",
        reason: "Structure output must remain concept-level; final sizes require structural engineer.",
        prerequisites: ["span", "floor count", "soil/site info", "load assumptions", "structural grid"],
        targetApiOrWorkflow: "/api/structure/generate",
      });
    }

    if (route === "working_drawing") {
      addRoute(blockedOutputs, {
        route,
        priority: "blocked",
        reason: "Working drawings should not be finalized until concept plan, dimensions, structure, MEP and local bylaw checks are confirmed.",
        prerequisites: ["approved concept", "site measurements", "local authority", "structure", "MEP", "professional review"],
        targetApiOrWorkflow: "locked-working-set + professional drawing workflow",
      });
    }

    if (route === "professional_review") {
      addRoute(routePlan, {
        route,
        priority: "primary",
        reason: "High-risk/special-use output requires professional review before finalization.",
        prerequisites: ["licensed architect/engineer review", "fire/accessibility/MEP/local authority checks"],
        targetApiOrWorkflow: "professional verification checklist",
      });
    }
  }

  routePlan
    .filter((item) => item.priority === "primary")
    .forEach((item) => nextActionOrder.push(`Primary: ${item.route} — ${item.reason}`));

  routePlan
    .filter((item) => item.priority === "secondary")
    .forEach((item) => nextActionOrder.push(`Secondary: ${item.route} — ${item.reason}`));

  blockedOutputs.forEach((item) => nextActionOrder.push(`Blocked: ${item.route} — ${item.reason}`));

  return {
    engineVersion: "47O-1",
    category,
    planningMode,
    requestedOutputs: Array.from(new Set(requestedOutputs)),
    routePlan,
    blockedOutputs,
    nextActionOrder,
  };
}

export function buildPlanningOutputRoutingPromptBlock(result: BuildSetuPlanningOutputRoutingResult): string {
  const lines: string[] = [];

  lines.push("PLANNING OUTPUT ROUTING:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Category: ${result.category}`);
  lines.push(`- Planning mode: ${result.planningMode}`);
  lines.push(`- Requested outputs: ${result.requestedOutputs.join(", ") || "none"}`);

  if (result.routePlan.length) {
    lines.push("Route plan:");
    result.routePlan.slice(0, 10).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.route} [${item.priority}]: ${item.reason}`);
      item.prerequisites.slice(0, 5).forEach((p) => lines.push(`   - Prerequisite: ${p}`));
    });
  }

  if (result.blockedOutputs.length) {
    lines.push("Blocked outputs:");
    result.blockedOutputs.slice(0, 8).forEach((item) => lines.push(`- ${item.route}: ${item.reason}`));
  }

  return lines.join("\n");
}
