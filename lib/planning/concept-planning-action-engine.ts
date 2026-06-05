// BUILDSETU_PHASE_47F1_CONCEPT_PLANNING_ACTION_ENGINE

type DimensionContextLike = {
  summary?: {
    hasPlotDimension?: boolean;
    hasRoomDimension?: boolean;
    primaryPlotAreaSqFt?: number | null;
  };
  pairs?: Array<{
    raw?: string;
    intent?: string;
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
  }>;
};

type MissingQuestionEngineLike = {
  readiness?: string;
  criticalQuestions?: Array<{ id?: string; question?: string; category?: string; reason?: string }>;
  recommendedQuestions?: Array<{ id?: string; question?: string; category?: string; reason?: string }>;
  assumptionsAllowed?: string[];
  riskFlags?: string[];
  detected?: Record<string, unknown>;
};

type BuildingTypeClassificationLike = {
  category?: string;
  subType?: string;
  occupancyGroup?: string;
  planningMode?: string;
  confidence?: string;
  riskLevel?: string;
  recommendedPlanningFocus?: string[];
  escalationFlags?: string[];
};

type PlanningModeQuestionTuningLike = {
  mode?: string;
  category?: string;
  riskLevel?: string;
  criticalQuestions?: Array<{ id?: string; question?: string; category?: string; reason?: string }>;
  recommendedQuestions?: Array<{ id?: string; question?: string; category?: string; reason?: string }>;
  planningFocus?: string[];
  professionalEscalations?: string[];
  outputGuidance?: string[];
};

export type BuildSetuConceptPlanningAction = {
  actionId: string;
  priority: "primary" | "secondary" | "verification";
  title: string;
  detail: string;
};

export type BuildSetuConceptPlanningZone = {
  zone: string;
  placementLogic: string;
  adjacency: string[];
  notes: string[];
};

export type BuildSetuConceptPlanningActionEngineResult = {
  engineVersion: "47F-1";
  canStartConcept: boolean;
  actionMode:
    | "ask_critical_first"
    | "start_concept_with_assumptions"
    | "start_detailed_concept"
    | "safety_first_concept";
  planningMode: string;
  category: string;
  riskLevel: string;
  conceptActions: BuildSetuConceptPlanningAction[];
  zoningMoves: BuildSetuConceptPlanningZone[];
  adjacencyLogic: string[];
  circulationLogic: string[];
  serviceCoreLogic: string[];
  dimensionalChecks: string[];
  professionalVerification: string[];
  outputSequence: string[];
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

function addAction(
  list: BuildSetuConceptPlanningAction[],
  action: BuildSetuConceptPlanningAction
) {
  if (!list.some((item) => item.actionId === action.actionId)) {
    list.push(action);
  }
}

function addZone(
  list: BuildSetuConceptPlanningZone[],
  zone: BuildSetuConceptPlanningZone
) {
  if (!list.some((item) => item.zone.toLowerCase() === zone.zone.toLowerCase())) {
    list.push(zone);
  }
}

function getPlotPair(dim?: DimensionContextLike) {
  return dim?.pairs?.find((pair) => pair.intent === "plot") || null;
}

function getRoomPairs(dim?: DimensionContextLike) {
  return dim?.pairs?.filter((pair) => pair.intent === "room") || [];
}

function questionCount(items?: Array<unknown>): number {
  return Array.isArray(items) ? items.length : 0;
}

export function buildConceptPlanningActionEngine(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  planningMissingQuestionEngine?: MissingQuestionEngineLike;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  planningModeQuestionTuning?: PlanningModeQuestionTuningLike;
}): BuildSetuConceptPlanningActionEngineResult {
  const text = cleanText(input.inputText).toLowerCase();
  const dim = input.dimensionUnderstanding;
  const mq = input.planningMissingQuestionEngine;
  const building = input.buildingTypeClassification;
  const modeTuning = input.planningModeQuestionTuning;

  const planningMode = cleanText(building?.planningMode || modeTuning?.mode || "unknown");
  const category = cleanText(building?.category || modeTuning?.category || "unknown");
  const riskLevel = cleanText(building?.riskLevel || modeTuning?.riskLevel || "unknown");

  const baseCriticalCount = questionCount(mq?.criticalQuestions);
  const modeCriticalCount = questionCount(modeTuning?.criticalQuestions);
  const totalCriticalCount = baseCriticalCount + modeCriticalCount;

  const plotPair = getPlotPair(dim);
  const roomPairs = getRoomPairs(dim);

  const hasPlotDimension = Boolean(dim?.summary?.hasPlotDimension || plotPair);
  const hasRoomDimension = Boolean(dim?.summary?.hasRoomDimension || roomPairs.length);
  const hasRoad = Boolean(mq?.detected?.hasRoadWidth) || has(/\b(road|street|lane|rasta)\b/i, text);
  const hasFacing = Boolean(mq?.detected?.hasFacing) || has(/\b(north|south|east|west|facing)\b/i, text);
  const hasParking = Boolean(mq?.detected?.hasParking) || has(/\b(parking|car|bike|garage|stilt)\b/i, text);
  const hasBudget = Boolean(mq?.detected?.hasBudget) || has(/\b(budget|standard|premium|luxury|economy|cost|estimate)\b/i, text);

  let actionMode: BuildSetuConceptPlanningActionEngineResult["actionMode"] = "start_concept_with_assumptions";

  if (riskLevel === "high" || planningMode === "public_or_special_building" || planningMode === "industrial_storage") {
    actionMode = totalCriticalCount > 0 ? "safety_first_concept" : "start_concept_with_assumptions";
  } else if (totalCriticalCount > 2) {
    actionMode = "ask_critical_first";
  } else if (totalCriticalCount > 0) {
    actionMode = "start_concept_with_assumptions";
  } else {
    actionMode = "start_detailed_concept";
  }

  const canStartConcept =
    actionMode === "start_concept_with_assumptions" ||
    actionMode === "start_detailed_concept" ||
    actionMode === "safety_first_concept";

  const conceptActions: BuildSetuConceptPlanningAction[] = [];
  const zoningMoves: BuildSetuConceptPlanningZone[] = [];
  const adjacencyLogic: string[] = [];
  const circulationLogic: string[] = [];
  const serviceCoreLogic: string[] = [];
  const dimensionalChecks: string[] = [];
  const professionalVerification: string[] = [];
  const outputSequence: string[] = [];

  if (totalCriticalCount > 0) {
    addAction(conceptActions, {
      actionId: "resolve-critical-questions",
      priority: actionMode === "ask_critical_first" ? "primary" : "verification",
      title: "Resolve critical planning blockers",
      detail: "Ask critical questions before finalizing any detailed dimensions, approval assumptions or working drawings.",
    });
  }

  if (hasPlotDimension && plotPair) {
    pushUnique(
      dimensionalChecks,
      `Use detected plot ${plotPair.raw || ""}: approx ${plotPair.widthFeet ?? "?"} ft x ${plotPair.depthFeet ?? "?"} ft, area ${plotPair.areaSqFt ?? "?"} sq ft.`
    );
  }

  if (hasRoomDimension) {
    for (const pair of roomPairs.slice(0, 6)) {
      pushUnique(
        dimensionalChecks,
        `Use detected room ${pair.raw || ""}: approx ${pair.widthFeet ?? "?"} ft x ${pair.depthFeet ?? "?"} ft, area ${pair.areaSqFt ?? "?"} sq ft.`
      );
    }
  }

  if (!hasPlotDimension && planningMode !== "room_interior") {
    pushUnique(dimensionalChecks, "Plot dimension is missing; keep building concept schematic until width x depth is confirmed.");
  }

  if (!hasRoomDimension && planningMode === "room_interior") {
    pushUnique(dimensionalChecks, "Room dimension is missing; furniture layout cannot be reliable until width x depth is confirmed.");
  }

  if (planningMode === "room_interior") {
    addAction(conceptActions, {
      actionId: "interior-furniture-layout",
      priority: "primary",
      title: "Prepare furniture layout options",
      detail: "Use room dimensions to place main furniture first, then confirm circulation, openings and electrical points.",
    });

    addZone(zoningMoves, {
      zone: "Primary furniture zone",
      placementLogic: "Place bed/sofa/work counter based on longest usable wall and clear movement path from entry.",
      adjacency: ["wardrobe/storage", "TV/study/wall feature", "window/opening"],
      notes: ["Avoid blocking door swing and window access.", "Keep furniture layout flexible until opening positions are confirmed."],
    });

    addZone(zoningMoves, {
      zone: "Storage and service wall",
      placementLogic: "Use dead wall or less-visible wall for wardrobe, tall unit, utility or storage.",
      adjacency: ["entry path", "bed/work zone", "electrical points"],
      notes: ["Confirm wardrobe depth and shutter type.", "Coordinate switch/socket and AC point."],
    });

    pushUnique(adjacencyLogic, "Keep bed/sofa/work area close to natural light but away from direct circulation conflict.");
    pushUnique(adjacencyLogic, "Place wardrobe/storage on a wall that does not cut door/window movement.");
    pushUnique(circulationLogic, "Maintain clear path from door to main use zone and window/balcony access.");
    pushUnique(serviceCoreLogic, "Coordinate AC, fan, light, TV, study and bedside switch points with furniture position.");
    pushUnique(outputSequence, "1. Confirm door/window/electrical points.");
    pushUnique(outputSequence, "2. Generate 2 furniture layout options.");
    pushUnique(outputSequence, "3. Add false ceiling/lighting/storage/material notes.");
  }

  if (planningMode === "residential_building") {
    addAction(conceptActions, {
      actionId: "residential-zoning",
      priority: "primary",
      title: "Prepare residential zoning",
      detail: "Create zoning around entry, parking, staircase, living, kitchen, bedrooms, toilets and service areas.",
    });

    addZone(zoningMoves, {
      zone: "Public zone",
      placementLogic: "Place living/drawing near entry for visitor access without disturbing private bedrooms.",
      adjacency: ["entry", "dining", "staircase if common"],
      notes: ["Keep privacy buffer before bedrooms.", "Use front light/ventilation when possible."],
    });

    addZone(zoningMoves, {
      zone: "Private bedroom zone",
      placementLogic: "Place bedrooms away from direct entry and noisy road edge where possible.",
      adjacency: ["toilets", "wardrobe niche", "family circulation"],
      notes: ["Avoid toilet doors directly opening into living/dining.", "Maintain ventilation through window/shaft/open side."],
    });

    addZone(zoningMoves, {
      zone: "Service zone",
      placementLogic: "Cluster kitchen, utility, toilets and shafts to reduce plumbing complexity.",
      adjacency: ["dining", "utility", "toilet shaft"],
      notes: ["Keep wet areas stacked for future floors.", "Coordinate ventilation shaft."],
    });

    if (hasParking) {
      pushUnique(circulationLogic, "Keep parking entry independent from main pedestrian entry where possible.");
    } else {
      pushUnique(circulationLogic, "Reserve front zone for possible car/bike parking until user confirms parking requirement.");
    }

    pushUnique(circulationLogic, "Use a simple loop or short corridor; avoid long dead passages in compact plots.");
    pushUnique(serviceCoreLogic, "Place staircase and toilet/kitchen shafts so future floor expansion remains possible.");
    pushUnique(adjacencyLogic, "Living should connect to dining/kitchen but remain buffered from bedrooms.");
    pushUnique(outputSequence, "1. Confirm local authority, family size and any missing road/facing details.");
    pushUnique(outputSequence, "2. Generate zoning option with room list and approximate dimensions.");
    pushUnique(outputSequence, "3. Add light/ventilation, stair, parking and service-core notes.");
  }

  if (planningMode === "mixed_use_building") {
    addAction(conceptActions, {
      actionId: "mixed-use-separation",
      priority: "primary",
      title: "Separate commercial and residential planning",
      detail: "Prepare concept with separate access, privacy, parking and service separation for shop/office and residence.",
    });

    addZone(zoningMoves, {
      zone: "Commercial frontage",
      placementLogic: "Keep shop/showroom/office toward road-facing side for visibility and customer access.",
      adjacency: ["customer entry", "display/work area", "service/store"],
      notes: ["Avoid customer circulation crossing residential entry.", "Plan shutter/signage/service access separately."],
    });

    addZone(zoningMoves, {
      zone: "Residential access core",
      placementLogic: "Place residential stair/entry independently from commercial frontage wherever plot allows.",
      adjacency: ["staircase", "parking", "residential lobby"],
      notes: ["Separate entry improves rental value, privacy and security.", "Confirm if staircase should be internal or external."],
    });

    pushUnique(adjacencyLogic, "Commercial zone should use road frontage; residence should get privacy and separate entry.");
    pushUnique(circulationLogic, "Avoid mixing customer movement with family circulation.");
    pushUnique(serviceCoreLogic, "Separate commercial storage/service and residential utility where possible.");
    pushUnique(professionalVerification, "Mixed-use may trigger different parking, fire, signage and approval requirements.");
    pushUnique(outputSequence, "1. Confirm separate entry/staircase requirement.");
    pushUnique(outputSequence, "2. Generate commercial frontage + residential access zoning.");
    pushUnique(outputSequence, "3. Add parking/service/privacy separation notes.");
  }

  if (planningMode === "commercial_building") {
    addAction(conceptActions, {
      actionId: "commercial-circulation",
      priority: "primary",
      title: "Prepare commercial circulation and service zoning",
      detail: "Plan customer/staff flow, display or workstation zone, service areas, toilets and accessibility.",
    });

    addZone(zoningMoves, {
      zone: "Customer/front zone",
      placementLogic: "Place reception/display/customer interaction near entry/frontage.",
      adjacency: ["entry", "waiting/display", "billing/reception"],
      notes: ["Keep front zone clear and visible.", "Coordinate signage and facade intent."],
    });

    addZone(zoningMoves, {
      zone: "Back/service zone",
      placementLogic: "Place pantry, store, staff area and toilets away from primary customer view.",
      adjacency: ["staff circulation", "service entry if available", "toilets"],
      notes: ["Avoid service movement crossing customer waiting area.", "Confirm accessibility needs."],
    });

    pushUnique(circulationLogic, "Separate customer and staff circulation where possible.");
    pushUnique(serviceCoreLogic, "Cluster toilet/pantry/service areas for plumbing and maintenance efficiency.");
    pushUnique(professionalVerification, "Commercial use may require accessibility, fire, signage, toilet and parking checks.");
    pushUnique(outputSequence, "1. Confirm staff/customer capacity and service spaces.");
    pushUnique(outputSequence, "2. Generate front/back zoning and circulation plan.");
  }

  if (planningMode === "public_or_special_building") {
    addAction(conceptActions, {
      actionId: "safety-first-layout",
      priority: "primary",
      title: "Prepare safety-first concept",
      detail: "For healthcare/education/public use, plan flow and zoning only at concept level until capacity, exits and compliance are verified.",
    });

    addZone(zoningMoves, {
      zone: "Public reception/waiting zone",
      placementLogic: "Place reception/waiting near entry with clear visibility and controlled movement.",
      adjacency: ["entry", "toilets", "main circulation"],
      notes: ["Avoid congestion at entry.", "Confirm occupant capacity and accessibility."],
    });

    if (category === "healthcare") {
      addZone(zoningMoves, {
        zone: "Clinical/private zone",
        placementLogic: "Separate consultation/procedure areas from waiting while keeping patient flow simple.",
        adjacency: ["consultation", "procedure", "handwash/service", "staff access"],
        notes: ["Keep hygiene, privacy and patient movement central.", "Professional healthcare review required."],
      });
      pushUnique(adjacencyLogic, "Patient flow should move from reception to waiting to consultation/procedure without crossing service areas.");
    }

    if (category === "educational") {
      addZone(zoningMoves, {
        zone: "Learning zone",
        placementLogic: "Group classrooms/training rooms away from noisy entry and service areas.",
        adjacency: ["corridor", "toilets", "admin/staff"],
        notes: ["Confirm student capacity and exit width.", "Professional fire/accessibility review required."],
      });
      pushUnique(adjacencyLogic, "Student circulation should be direct, legible and separated from admin/service where possible.");
    }

    pushUnique(circulationLogic, "Prioritize clear entry, exit, emergency movement and accessible route.");
    pushUnique(serviceCoreLogic, "Plan toilets, handwash/service, MEP and fire provisions early.");
    pushUnique(professionalVerification, "High-risk/public-use planning requires fire, accessibility, MEP and local authority verification.");
    pushUnique(outputSequence, "1. Confirm occupant capacity and entry/exit requirements.");
    pushUnique(outputSequence, "2. Generate safety-first concept zoning only.");
    pushUnique(outputSequence, "3. Escalate to licensed professionals for final compliance.");
  }

  if (planningMode === "industrial_storage") {
    addAction(conceptActions, {
      actionId: "industrial-storage-layout",
      priority: "primary",
      title: "Prepare industrial/storage movement plan",
      detail: "Plan loading/unloading, racking/storage grid, clear height, structural span, fire and service access.",
    });

    addZone(zoningMoves, {
      zone: "Loading/unloading zone",
      placementLogic: "Keep truck/vehicle movement direct from gate to loading dock/shutter.",
      adjacency: ["entry gate", "dock/shutter", "storage aisle"],
      notes: ["Confirm vehicle type and turning radius.", "Avoid conflict with office/visitor movement."],
    });

    addZone(zoningMoves, {
      zone: "Storage/racking zone",
      placementLogic: "Plan racks or storage bays based on aisle width, clear height and handling equipment.",
      adjacency: ["loading zone", "fire aisle", "office/security"],
      notes: ["Confirm floor loading and rack type.", "Structural and fire review required."],
    });

    pushUnique(circulationLogic, "Keep vehicle, forklift/manual movement and staff movement clearly separated.");
    pushUnique(serviceCoreLogic, "Plan power, ventilation, fire safety, toilet, office and security room zones.");
    pushUnique(professionalVerification, "Industrial/storage projects need structural loading, fire, ventilation and utility verification.");
    pushUnique(outputSequence, "1. Confirm clear height, racking, vehicle type and loading needs.");
    pushUnique(outputSequence, "2. Generate loading + storage movement concept.");
    pushUnique(outputSequence, "3. Escalate structural/fire/utility checks.");
  }

  if (!conceptActions.length) {
    addAction(conceptActions, {
      actionId: "collect-core-details",
      priority: "primary",
      title: "Collect core planning details",
      detail: "Building type or planning mode is unclear; collect use, dimensions, location, output type and constraints first.",
    });
    pushUnique(outputSequence, "1. Ask use-case, dimensions, location and desired output.");
  }

  if (!hasRoad && planningMode !== "room_interior") {
    pushUnique(professionalVerification, "Road width is unknown; height, parking, fire access and bylaw feasibility must remain unfinalized.");
  }

  if (!hasFacing && hasPlotDimension && planningMode !== "room_interior") {
    pushUnique(professionalVerification, "Plot facing is unknown; entry, vastu, daylight and elevation assumptions may change.");
  }

  if (!hasBudget) {
    pushUnique(professionalVerification, "Budget/finish level is unknown; material, interior and elevation choices should remain assumption-based.");
  }

  if (riskLevel === "high") {
    pushUnique(professionalVerification, "High-risk classification: keep output concept-level until licensed professional verification.");
  }

  if (!outputSequence.length) {
    pushUnique(outputSequence, "1. Confirm missing questions.");
    pushUnique(outputSequence, "2. Generate concept zoning.");
    pushUnique(outputSequence, "3. Add verification notes.");
  }

  return {
    engineVersion: "47F-1",
    canStartConcept,
    actionMode,
    planningMode,
    category,
    riskLevel,
    conceptActions,
    zoningMoves,
    adjacencyLogic,
    circulationLogic,
    serviceCoreLogic,
    dimensionalChecks,
    professionalVerification,
    outputSequence,
  };
}

export function buildConceptPlanningActionPromptBlock(result: BuildSetuConceptPlanningActionEngineResult): string {
  const lines: string[] = [];

  lines.push("CONCEPT PLANNING ACTION ENGINE:");
  lines.push(`- Action mode: ${result.actionMode}`);
  lines.push(`- Can start concept: ${result.canStartConcept ? "yes" : "no"}`);
  lines.push(`- Planning mode: ${result.planningMode}`);
  lines.push(`- Category: ${result.category}`);
  lines.push(`- Risk level: ${result.riskLevel}`);

  if (result.conceptActions.length) {
    lines.push("Concept actions:");
    result.conceptActions.slice(0, 8).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}: ${item.detail}`);
    });
  }

  if (result.zoningMoves.length) {
    lines.push("Zoning moves:");
    result.zoningMoves.slice(0, 8).forEach((zone, index) => {
      lines.push(`${index + 1}. ${zone.zone}: ${zone.placementLogic}`);
    });
  }

  if (result.adjacencyLogic.length) {
    lines.push("Adjacency logic:");
    result.adjacencyLogic.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.circulationLogic.length) {
    lines.push("Circulation logic:");
    result.circulationLogic.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.serviceCoreLogic.length) {
    lines.push("Service/core logic:");
    result.serviceCoreLogic.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.dimensionalChecks.length) {
    lines.push("Dimensional checks:");
    result.dimensionalChecks.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.professionalVerification.length) {
    lines.push("Professional verification:");
    result.professionalVerification.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.outputSequence.length) {
    lines.push("Output sequence:");
    result.outputSequence.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
