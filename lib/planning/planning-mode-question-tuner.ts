// BUILDSETU_PHASE_47D1_PLANNING_MODE_QUESTION_TUNER

type BuildingTypeClassificationLike = {
  category?: string;
  subType?: string;
  occupancyGroup?: string;
  planningMode?: string;
  confidence?: string;
  riskLevel?: string;
};

type MissingQuestionEngineLike = {
  readiness?: string;
  criticalQuestions?: Array<{ id?: string; question?: string; category?: string }>;
  recommendedQuestions?: Array<{ id?: string; question?: string; category?: string }>;
  optionalQuestions?: Array<{ id?: string; question?: string; category?: string }>;
  detected?: Record<string, unknown>;
};

type DimensionContextLike = {
  summary?: {
    hasPlotDimension?: boolean;
    hasRoomDimension?: boolean;
    primaryPlotAreaSqFt?: number | null;
  };
  pairs?: Array<{
    raw?: string;
    intent?: string;
    areaSqFt?: number | null;
  }>;
};

export type BuildSetuModeQuestionPriority = "critical" | "recommended" | "optional";

export type BuildSetuModeQuestion = {
  id: string;
  priority: BuildSetuModeQuestionPriority;
  category:
    | "residential"
    | "commercial"
    | "mixed_use"
    | "healthcare"
    | "educational"
    | "industrial_storage"
    | "interior"
    | "public_safety"
    | "mep_structure"
    | "execution"
    | "unknown";
  question: string;
  reason: string;
};

export type BuildSetuPlanningModeQuestionTuningResult = {
  mode: string;
  category: string;
  riskLevel: string;
  criticalQuestions: BuildSetuModeQuestion[];
  recommendedQuestions: BuildSetuModeQuestion[];
  optionalQuestions: BuildSetuModeQuestion[];
  planningFocus: string[];
  professionalEscalations: string[];
  outputGuidance: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(pattern: RegExp, text: string): boolean {
  return pattern.test(text);
}

function add(list: BuildSetuModeQuestion[], item: BuildSetuModeQuestion) {
  if (!list.some((existing) => existing.id === item.id)) {
    list.push(item);
  }
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (!clean) return;

  if (!list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

export function buildPlanningModeQuestionTuning(input: {
  inputText: string;
  buildingTypeClassification?: BuildingTypeClassificationLike;
  missingQuestionEngine?: MissingQuestionEngineLike;
  dimensionUnderstanding?: DimensionContextLike;
}): BuildSetuPlanningModeQuestionTuningResult {
  const text = cleanText(input.inputText).toLowerCase();
  const classification = input.buildingTypeClassification || {};
  const dim = input.dimensionUnderstanding;
  const detected = input.missingQuestionEngine?.detected || {};

  const mode = cleanText(classification.planningMode || "unknown");
  const category = cleanText(classification.category || "unknown");
  const riskLevel = cleanText(classification.riskLevel || "unknown");

  const hasPlotDimension = Boolean(
    dim?.summary?.hasPlotDimension || dim?.pairs?.some((pair) => pair.intent === "plot")
  );

  const hasRoomDimension = Boolean(
    dim?.summary?.hasRoomDimension || dim?.pairs?.some((pair) => pair.intent === "room")
  );

  const hasUserCapacity = has(
    /\b(capacity|students?|patients?|staff|workers?|customers?|occupants?|seats?|beds?|family members?|people|persons?)\b/i,
    text
  );

  const hasToiletInfo = has(/\b(toilet|washroom|wc|urinal|bath)\b/i, text);
  const hasEntryExitInfo = has(/\b(entry|exit|gate|staircase|stair|lift|fire exit|emergency exit|ramp)\b/i, text);
  const hasServiceInfo = has(/\b(service|shaft|pantry|utility|storage|loading|unloading|pump|tank|electrical|plumbing|mep|hvac|ac)\b/i, text);
  const hasParkingInfo = Boolean(detected.hasParking) || has(/\b(parking|car|bike|stilt|garage)\b/i, text);
  const hasBudget = Boolean(detected.hasBudget) || has(/\b(budget|cost|estimate|standard|premium|luxury|economy|lakh|crore|₹|rs)\b/i, text);
  const hasReference = Boolean(detected.hasReference) || has(/\b(reference|image|photo|pdf|cad|dwg|sketch|sample|upload)\b/i, text);

  const criticalQuestions: BuildSetuModeQuestion[] = [];
  const recommendedQuestions: BuildSetuModeQuestion[] = [];
  const optionalQuestions: BuildSetuModeQuestion[] = [];
  const planningFocus: string[] = [];
  const professionalEscalations: string[] = [];
  const outputGuidance: string[] = [];

  if (mode === "room_interior") {
    pushUnique(planningFocus, "Furniture footprint, clear circulation and storage planning");
    pushUnique(planningFocus, "Door/window/opening position and electrical point coordination");
    pushUnique(outputGuidance, "Generate interior concept first; final working layout needs exact door/window/electrical points.");

    if (!hasRoomDimension) {
      add(criticalQuestions, {
        id: "interior-room-dimension",
        priority: "critical",
        category: "interior",
        question: "Room ka exact size width x depth format me batao.",
        reason: "Interior layout furniture fit aur circulation clearance room dimensions ke bina reliable nahi hoga.",
      });
    }

    if (!has(/\b(door|window|opening|balcony|entry)\b/i, text)) {
      add(recommendedQuestions, {
        id: "interior-openings",
        priority: "recommended",
        category: "interior",
        question: "Door, window, balcony opening aur AC point ki exact position batao.",
        reason: "Furniture placement, TV wall, wardrobe and lighting plan openings ke hisaab se set hote hain.",
      });
    }

    if (!hasBudget) {
      add(recommendedQuestions, {
        id: "interior-budget-style",
        priority: "recommended",
        category: "interior",
        question: "Interior style aur budget/finish level kya chahiye?",
        reason: "Material palette, false ceiling, lighting and storage design budget/style ke hisaab se change hota hai.",
      });
    }

    if (!hasReference) {
      add(optionalQuestions, {
        id: "interior-reference",
        priority: "optional",
        category: "interior",
        question: "Koi reference image/PDF/sketch/moodboard upload karna hai?",
        reason: "Reference se style intent aur detailing better match hoti hai.",
      });
    }
  }

  if (mode === "residential_building") {
    pushUnique(planningFocus, "Family use, privacy, bedroom zoning and daily circulation");
    pushUnique(planningFocus, "Parking, staircase, service core, light and ventilation");
    pushUnique(outputGuidance, "Can generate concept zoning with assumptions; detailed plan needs local authority, road width and family requirements.");

    if (!hasUserCapacity) {
      add(recommendedQuestions, {
        id: "residential-family-size",
        priority: "recommended",
        category: "residential",
        question: "Family size aur bedroom requirement kya hai?",
        reason: "Bedroom count, toilet count, living/dining size and privacy family structure se decide hota hai.",
      });
    }

    if (!hasParkingInfo) {
      add(recommendedQuestions, {
        id: "residential-parking",
        priority: "recommended",
        category: "residential",
        question: "Car/bike parking requirement kya hai?",
        reason: "Parking se entry gate, staircase position and ground-floor zoning affect hoti hai.",
      });
    }

    if (!has(/\b(future|rental|tenant|expansion|separate entry)\b/i, text)) {
      add(optionalQuestions, {
        id: "residential-future-rental",
        priority: "optional",
        category: "residential",
        question: "Future expansion ya rental floor/separate entry ka plan chahiye kya?",
        reason: "Aaj ka staircase/service core future floor and rental use ke हिसाब se plan karna better hota hai.",
      });
    }
  }

  if (mode === "commercial_building") {
    pushUnique(planningFocus, "Customer/staff circulation and front-facing business visibility");
    pushUnique(planningFocus, "Reception/display/workstation/service zoning");
    pushUnique(outputGuidance, "Commercial planning should include accessibility, toilets, signage, services and fire-access assumptions.");

    if (!hasUserCapacity) {
      add(recommendedQuestions, {
        id: "commercial-users",
        priority: "recommended",
        category: "commercial",
        question: "Expected customers/staff/workstations/seating capacity kitni hai?",
        reason: "Circulation, toilet, waiting, display and service area capacity ke हिसाब se plan hote hain.",
      });
    }

    if (!hasToiletInfo) {
      add(recommendedQuestions, {
        id: "commercial-toilets",
        priority: "recommended",
        category: "commercial",
        question: "Toilet/pantry/store/service area requirement kya hai?",
        reason: "Commercial use me staff/customer comfort aur approval feasibility ke liye service spaces important hote hain.",
      });
    }

    if (!hasEntryExitInfo) {
      add(recommendedQuestions, {
        id: "commercial-access",
        priority: "recommended",
        category: "commercial",
        question: "Entry, exit, shutter/frontage and accessibility/ramp requirement kya hai?",
        reason: "Customer movement, signage, safety and accessibility front access se depend karte hain.",
      });
    }
  }

  if (mode === "mixed_use_building") {
    pushUnique(planningFocus, "Separate residential and commercial entries");
    pushUnique(planningFocus, "Noise/privacy/service/parking separation");
    pushUnique(outputGuidance, "Mixed-use concept can start, but final layout needs local bylaw and fire/accessibility review.");

    if (!hasEntryExitInfo) {
      add(criticalQuestions, {
        id: "mixed-use-separate-access",
        priority: "critical",
        category: "mixed_use",
        question: "Residential aur commercial ke liye separate entry/staircase chahiye kya?",
        reason: "Mixed-use me privacy, security, rental and circulation separation main planning decision hota hai.",
      });
    }

    if (!hasParkingInfo) {
      add(recommendedQuestions, {
        id: "mixed-use-parking",
        priority: "recommended",
        category: "mixed_use",
        question: "Shop/customers aur residence ke parking requirement kya hain?",
        reason: "Mixed-use parking conflict avoid karne ke liye early zoning required hoti hai.",
      });
    }

    if (!hasServiceInfo) {
      add(recommendedQuestions, {
        id: "mixed-use-service",
        priority: "recommended",
        category: "mixed_use",
        question: "Commercial loading/service/storage aur residential utility ko separate rakhna hai kya?",
        reason: "Service separation se noise, smell, privacy and daily operation problems reduce hote hain.",
      });
    }
  }

  if (mode === "public_or_special_building") {
    pushUnique(planningFocus, "Occupant capacity, circulation, exits and public safety");
    pushUnique(planningFocus, "Toilet count, accessibility, fire-safety and MEP coordination");
    pushUnique(outputGuidance, "Public/special-use output must stay concept-level until licensed professional and local authority verification.");
    pushUnique(professionalEscalations, "Fire, accessibility, MEP and local authority review required before final drawings.");

    if (!hasUserCapacity) {
      add(criticalQuestions, {
        id: "public-capacity",
        priority: "critical",
        category: "public_safety",
        question: "Expected users/occupants capacity kitni hai?",
        reason: "Exit width, toilet count, circulation, fire load and service sizing capacity se decide hote hain.",
      });
    }

    if (!hasEntryExitInfo) {
      add(criticalQuestions, {
        id: "public-exit-access",
        priority: "critical",
        category: "public_safety",
        question: "Entry, exit, emergency exit, lift/ramp/staircase requirements kya hain?",
        reason: "Public/special buildings me safe exit and accessibility core planning constraint hota hai.",
      });
    }

    if (!hasToiletInfo) {
      add(recommendedQuestions, {
        id: "public-toilets",
        priority: "recommended",
        category: "public_safety",
        question: "Male/female/accessible toilet requirement ya expected count kya hai?",
        reason: "Public use me toilet count and accessibility planning early stage me define karna hota hai.",
      });
    }

    if (category === "healthcare") {
      add(recommendedQuestions, {
        id: "healthcare-flow",
        priority: "recommended",
        category: "healthcare",
        question: "Patient flow kya hoga: reception, waiting, consultation, procedure, pharmacy/lab, staff/service?",
        reason: "Clinic/hospital layout me patient flow, hygiene and privacy primary planning logic hota hai.",
      });
      pushUnique(professionalEscalations, "Healthcare norms, hygiene, patient safety and local licensing review required.");
    }

    if (category === "educational") {
      add(recommendedQuestions, {
        id: "education-classroom-count",
        priority: "recommended",
        category: "educational",
        question: "Classroom count, student capacity, staff room, admin/reception and toilet requirement kya hai?",
        reason: "Educational planning me student flow, exits, toilets and classroom sizes user count ke हिसाब se decide hote hain.",
      });
      pushUnique(professionalEscalations, "Educational building needs exit, toilet, fire and accessibility review.");
    }
  }

  if (mode === "industrial_storage") {
    pushUnique(planningFocus, "Loading/unloading movement, racking/storage grid and clear height");
    pushUnique(planningFocus, "Structural span, floor loading, ventilation, fire safety and utility access");
    pushUnique(outputGuidance, "Industrial/storage planning must remain concept-level until structural, fire and utility checks are done.");
    pushUnique(professionalEscalations, "Structural engineer and fire-safety review required for span/loading/storage planning.");

    if (!has(/\b(clear height|height|racking|rack|storage racks|pallet)\b/i, text)) {
      add(criticalQuestions, {
        id: "warehouse-clear-height-racking",
        priority: "critical",
        category: "industrial_storage",
        question: "Required clear height, racking/storage type and aisle width kya hai?",
        reason: "Warehouse/storage layout clear height, racks and movement aisle ke bina practical nahi hota.",
      });
    }

    if (!has(/\b(loading|unloading|truck|dock|shutter|gate)\b/i, text)) {
      add(criticalQuestions, {
        id: "warehouse-loading",
        priority: "critical",
        category: "industrial_storage",
        question: "Loading/unloading vehicle type, dock/gate/shutter requirement kya hai?",
        reason: "Warehouse planning me truck movement and loading zone primary zoning factor hai.",
      });
    }

    if (!hasServiceInfo) {
      add(recommendedQuestions, {
        id: "warehouse-services",
        priority: "recommended",
        category: "industrial_storage",
        question: "Power, ventilation, fire safety, office/toilet/security room requirement kya hai?",
        reason: "Industrial/storage use me services and safety planning early stage me define karni hoti hai.",
      });
    }
  }

  return {
    mode,
    category,
    riskLevel,
    criticalQuestions,
    recommendedQuestions,
    optionalQuestions,
    planningFocus,
    professionalEscalations,
    outputGuidance,
  };
}

export function buildPlanningModeQuestionPromptBlock(result: BuildSetuPlanningModeQuestionTuningResult): string {
  const lines: string[] = [];

  lines.push("PLANNING MODE QUESTION TUNING:");
  lines.push(`- Mode: ${result.mode}`);
  lines.push(`- Category: ${result.category}`);
  lines.push(`- Risk level: ${result.riskLevel}`);

  if (result.criticalQuestions.length) {
    lines.push("Mode-specific critical questions:");
    result.criticalQuestions.slice(0, 8).forEach((q, index) => {
      lines.push(`${index + 1}. ${q.question} Reason: ${q.reason}`);
    });
  } else {
    lines.push("Mode-specific critical questions: none");
  }

  if (result.recommendedQuestions.length) {
    lines.push("Mode-specific recommended questions:");
    result.recommendedQuestions.slice(0, 8).forEach((q, index) => {
      lines.push(`${index + 1}. ${q.question}`);
    });
  }

  if (result.planningFocus.length) {
    lines.push("Mode-specific planning focus:");
    result.planningFocus.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.professionalEscalations.length) {
    lines.push("Professional escalation:");
    result.professionalEscalations.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.outputGuidance.length) {
    lines.push("Output guidance:");
    result.outputGuidance.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
