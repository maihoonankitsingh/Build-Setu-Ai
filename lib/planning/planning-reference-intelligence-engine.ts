// BUILDSETU_PHASE_47M1_REFERENCE_INTELLIGENCE_ENGINE

type BuildingTypeClassificationLike = {
  category?: string;
  planningMode?: string;
  riskLevel?: string;
};

type PlanningCategoryIntelligenceLike = {
  category?: string;
  planningMode?: string;
  detectedFacing?: string | null;
};

export type BuildSetuReferenceType =
  | "image"
  | "pdf"
  | "sketch"
  | "cad_dwg"
  | "floor_plan"
  | "interior_reference"
  | "elevation_reference"
  | "material_reference"
  | "unknown_reference";

export type BuildSetuReferenceIntelligenceResult = {
  engineVersion: "47M-1";
  hasReferenceIntent: boolean;
  detectedReferenceTypes: BuildSetuReferenceType[];
  referenceUseMode:
    | "no_reference"
    | "style_match"
    | "layout_extract"
    | "dimension_extract"
    | "material_palette_extract"
    | "compliance_review_support"
    | "mixed_reference_workflow";
  category: string;
  planningMode: string;
  extractionChecklist: string[];
  referencePlanningImpact: string[];
  requiredUserConfirmations: string[];
  safeHandlingRules: string[];
  nextActions: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(pattern: RegExp, text: string): boolean {
  return pattern.test(text);
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (!clean) return;
  if (!list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}


function hasExplicitReferenceIntent(text: string): boolean {
  // BUILDSETU_PHASE_47C_STRICT_REFERENCE_INTENT
  return /\b(reference|sample|upload|uploaded|file|attachment|attach|image|photo|picture|screenshot|pdf|cad|dwg|dxf|sketch|scan|same style|same like|similar to|inspired by|copy this|jaisa|aisa)\b/i.test(text);
}

function detectReferenceTypes(text: string): BuildSetuReferenceType[] {
  const types: BuildSetuReferenceType[] = [];

  if (has(/\b(image|photo|picture|jpg|jpeg|png|webp|screenshot)\b/i, text)) types.push("image");
  if (has(/\b(pdf|brochure|document|report)\b/i, text)) types.push("pdf");
  if (has(/\b(sketch|hand sketch|rough drawing|drawn|scan)\b/i, text)) types.push("sketch");
  if (has(/\b(cad|dwg|dxf|autocad)\b/i, text)) types.push("cad_dwg");
  if (has(/\b(floor plan|layout plan|working plan|architectural plan|naksha)\b/i, text)) types.push("floor_plan");
  if (has(/\b(interior|furniture|wardrobe|kitchen|ceiling|lighting|moodboard|theme)\b/i, text)) types.push("interior_reference");
  if (has(/\b(elevation|facade|front design|3d elevation|exterior)\b/i, text)) types.push("elevation_reference");
  if (has(/\b(material|tiles|paint|wood|laminate|veneer|stone|marble|texture|palette)\b/i, text)) types.push("material_reference");

  if (!types.length && has(/\b(reference|sample|upload|same like|similar|inspired|copy this|jaisa|aisa)\b/i, text)) {
    types.push("unknown_reference");
  }

  return Array.from(new Set(types));
}

function decideUseMode(types: BuildSetuReferenceType[], text: string): BuildSetuReferenceIntelligenceResult["referenceUseMode"] {
  if (!types.length) return "no_reference";

  const wantsStyle = has(/\b(style|look|theme|aesthetic|same like|similar|inspired|copy|jaisa|aisa|elevation|facade|interior)\b/i, text);
  const wantsLayout = has(/\b(layout|floor plan|room position|zoning|planning|adjacency|circulation)\b/i, text);
  const wantsDimension = has(/\b(dimension|size|measurement|width|depth|area|scale|feet|ft|mm|meter|metre)\b/i, text);
  const wantsMaterial = has(/\b(material|finish|tiles|paint|wood|laminate|veneer|stone|marble|texture|palette)\b/i, text);
  const wantsCompliance = has(/\b(bylaw|approval|setback|far|fsi|compliance|sanction|authority)\b/i, text);

  const modes = [wantsStyle, wantsLayout, wantsDimension, wantsMaterial, wantsCompliance].filter(Boolean).length;
  if (modes > 1) return "mixed_reference_workflow";
  if (wantsDimension) return "dimension_extract";
  if (wantsLayout) return "layout_extract";
  if (wantsMaterial) return "material_palette_extract";
  if (wantsCompliance) return "compliance_review_support";
  return "style_match";
}

export function buildPlanningReferenceIntelligenceEngine(input: {
  inputText: string;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  planningCategoryIntelligence?: PlanningCategoryIntelligenceLike;
}): BuildSetuReferenceIntelligenceResult {
  const inputText = cleanText(input.inputText);
  const text = inputText.toLowerCase();
  const category = cleanText(input.buildingTypeClassification?.category || input.planningCategoryIntelligence?.category || "unknown");
  const planningMode = cleanText(input.buildingTypeClassification?.planningMode || input.planningCategoryIntelligence?.planningMode || "unknown");

  const detectedReferenceTypes = detectReferenceTypes(text);
  const hasReferenceIntent = hasExplicitReferenceIntent(text);
  const referenceUseMode = hasReferenceIntent ? decideUseMode(detectedReferenceTypes, text) : "no_reference";

  const extractionChecklist: string[] = [];
  const referencePlanningImpact: string[] = [];
  const requiredUserConfirmations: string[] = [];
  const safeHandlingRules: string[] = [];
  const nextActions: string[] = [];

  if (!hasReferenceIntent) {
    pushUnique(extractionChecklist, "No reference intent detected.");
    pushUnique(nextActions, "Proceed with text-based planning. Ask for reference upload only if style/layout matching is required.");
  } else {
    pushUnique(extractionChecklist, "Identify reference type: image, PDF, sketch, CAD/DWG, floor plan, interior, elevation or material palette.");
    pushUnique(extractionChecklist, "Extract visible room names, zoning, circulation, door/window positions and major furniture/elevation/material cues.");
    pushUnique(extractionChecklist, "Separate confirmed information from inferred assumptions.");
    pushUnique(extractionChecklist, "Ask user to confirm unclear dimensions, scale, wall thickness, north/facing, road side and site constraints.");

    if (detectedReferenceTypes.includes("floor_plan") || detectedReferenceTypes.includes("sketch") || detectedReferenceTypes.includes("cad_dwg")) {
      pushUnique(extractionChecklist, "For plan/sketch/CAD reference: read room labels, dimensions, wall/opening positions, stair/lift/shaft/parking and plot boundary.");
      pushUnique(referencePlanningImpact, "Reference can influence zoning, room adjacency, circulation, service core and dimension assumptions.");
    }

    if (detectedReferenceTypes.includes("interior_reference") || planningMode === "room_interior") {
      pushUnique(extractionChecklist, "For interior reference: extract furniture layout, storage type, ceiling/lighting, material palette and clearances.");
      pushUnique(referencePlanningImpact, "Interior reference can guide furniture placement, finish level, lighting and storage logic.");
    }

    if (detectedReferenceTypes.includes("elevation_reference")) {
      pushUnique(extractionChecklist, "For elevation reference: extract massing, balcony/railing, window rhythm, facade material, color and style language.");
      pushUnique(referencePlanningImpact, "Elevation reference can guide facade style, proportion, material palette and 3D render prompt.");
    }

    if (detectedReferenceTypes.includes("material_reference")) {
      pushUnique(extractionChecklist, "For material reference: extract visible finishes, colors, texture, wood/stone/paint/metal/glass usage and quality level.");
      pushUnique(referencePlanningImpact, "Material reference can guide BOQ/specification assumptions, interior palette and render prompt.");
    }

    pushUnique(requiredUserConfirmations, "Confirm whether reference should be matched exactly, inspired by, or only used for partial ideas.");
    pushUnique(requiredUserConfirmations, "Confirm project dimensions/site constraints if reference belongs to another plot or room size.");
    pushUnique(requiredUserConfirmations, "Confirm priority: layout accuracy, vastu, style matching, budget, material, 3D render or working drawing.");

    pushUnique(safeHandlingRules, "Do not copy unsafe, non-compliant or structurally impossible reference details blindly.");
    pushUnique(safeHandlingRules, "Reference is visual/planning guidance only; final plan still needs local bylaw, structure and MEP verification.");
    pushUnique(safeHandlingRules, "If dimensions are not readable, mark them as assumptions and ask for confirmation.");
    pushUnique(safeHandlingRules, "If uploaded reference conflicts with user requirements, state the conflict before planning.");

    pushUnique(nextActions, "Create reference extraction summary first.");
    pushUnique(nextActions, "Map reference intent to layout, interior, elevation, material, MEP/structure or render workflow.");
    pushUnique(nextActions, "Generate planning output with explicit assumptions and user confirmations.");
  }

  if (category === "healthcare" || category === "educational" || category === "storage" || planningMode === "public_or_special_building" || planningMode === "industrial_storage") {
    pushUnique(safeHandlingRules, "High-risk/special-use reference must not override fire, accessibility, hygiene, structural, ventilation or local authority requirements.");
  }

  return {
    engineVersion: "47M-1",
    hasReferenceIntent,
    detectedReferenceTypes,
    referenceUseMode,
    category,
    planningMode,
    extractionChecklist,
    referencePlanningImpact,
    requiredUserConfirmations,
    safeHandlingRules,
    nextActions,
  };
}

export function buildPlanningReferenceIntelligencePromptBlock(result: BuildSetuReferenceIntelligenceResult): string {
  const lines: string[] = [];

  lines.push("PLANNING REFERENCE INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Has reference intent: ${result.hasReferenceIntent ? "yes" : "no"}`);
  lines.push(`- Reference use mode: ${result.referenceUseMode}`);
  lines.push(`- Reference types: ${result.detectedReferenceTypes.join(", ") || "none"}`);
  lines.push(`- Category: ${result.category}`);
  lines.push(`- Planning mode: ${result.planningMode}`);

  if (result.extractionChecklist.length) {
    lines.push("Extraction checklist:");
    result.extractionChecklist.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.referencePlanningImpact.length) {
    lines.push("Planning impact:");
    result.referencePlanningImpact.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.requiredUserConfirmations.length) {
    lines.push("Required confirmations:");
    result.requiredUserConfirmations.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.safeHandlingRules.length) {
    lines.push("Safe handling rules:");
    result.safeHandlingRules.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.nextActions.length) {
    lines.push("Reference next actions:");
    result.nextActions.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
