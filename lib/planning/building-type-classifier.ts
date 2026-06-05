// BUILDSETU_PHASE_47C1_BUILDING_TYPE_CLASSIFIER

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

type MissingQuestionContextLike = {
  detected?: {
    hasInteriorOutput?: boolean;
    isInteriorOnlyRequest?: boolean;
    hasPlotDimension?: boolean;
    hasRoomDimension?: boolean;
    hasBuildingType?: boolean;
    hasOutputType?: boolean;
  };
  readiness?: string;
};

export type BuildSetuBuildingCategory =
  | "residential"
  | "commercial"
  | "mixed_use"
  | "interior_only"
  | "educational"
  | "healthcare"
  | "hospitality"
  | "industrial"
  | "storage"
  | "institutional"
  | "religious"
  | "renovation"
  | "special_high_risk"
  | "unknown";

export type BuildSetuOccupancyGroup =
  | "residential_dwelling"
  | "commercial_business"
  | "mercantile"
  | "assembly"
  | "educational"
  | "institutional_healthcare"
  | "industrial"
  | "storage"
  | "mixed"
  | "interior_fitout"
  | "unknown";

export type BuildSetuBuildingTypeClassification = {
  category: BuildSetuBuildingCategory;
  subType: string;
  occupancyGroup: BuildSetuOccupancyGroup;
  planningMode:
    | "room_interior"
    | "residential_building"
    | "commercial_building"
    | "mixed_use_building"
    | "public_or_special_building"
    | "industrial_storage"
    | "renovation"
    | "unknown";
  confidence: "high" | "medium" | "low";
  riskLevel: "low" | "medium" | "high";
  detectedSignals: string[];
  recommendedPlanningFocus: string[];
  escalationFlags: string[];
  assumptions: string[];
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

function score(text: string, patterns: Array<[RegExp, string]>): { score: number; signals: string[] } {
  const signals: string[] = [];
  let total = 0;

  for (const [pattern, signal] of patterns) {
    if (has(pattern, text)) {
      total += 1;
      pushUnique(signals, signal);
    }
  }

  return { score: total, signals };
}

export function classifyBuildSetuBuildingType(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  missingQuestionEngine?: MissingQuestionContextLike;
}): BuildSetuBuildingTypeClassification {
  const raw = cleanText(input.inputText);
  const text = raw.toLowerCase();
  const dim = input.dimensionUnderstanding;
  const missing = input.missingQuestionEngine;

  const hasPlotDimension = Boolean(
    dim?.summary?.hasPlotDimension || dim?.pairs?.some((pair) => pair.intent === "plot")
  );

  const hasRoomDimension = Boolean(
    dim?.summary?.hasRoomDimension || dim?.pairs?.some((pair) => pair.intent === "room")
  );

  const hasInteriorOnly = Boolean(
    missing?.detected?.isInteriorOnlyRequest ||
      (hasRoomDimension &&
        has(/\b(interior|room layout|bedroom|kitchen layout|living layout|furniture|wardrobe|modular kitchen|toilet layout|washroom layout|false ceiling|lighting)\b/i, text) &&
        !hasPlotDimension)
  );

  const detectedSignals: string[] = [];
  const recommendedPlanningFocus: string[] = [];
  const escalationFlags: string[] = [];
  const assumptions: string[] = [];

  const residential = score(text, [
    [/\b(residential|house|home|villa|bungalow|duplex|flat|apartment|bhk|bedroom|master bedroom|living|pooja|kitchen)\b/i, "residential words"],
    [/\b(self use|family|parents|kids|rental floor|tenant|g\+\d+)\b/i, "residential use words"],
  ]);

  const commercial = score(text, [
    [/\b(commercial|shop|showroom|office|cabin|reception|retail|mall|store|salon|studio|co-working|coworking)\b/i, "commercial words"],
    [/\b(customer|billing|display|workstation|meeting room|pantry|business)\b/i, "commercial function words"],
  ]);

  const mixedUse = score(text, [
    [/\b(mixed use|mixed-use|shop\s*\+\s*home|shop\s*\+\s*residence|office\s*\+\s*residence|ground commercial|upper residential|commercial ground|residential above)\b/i, "mixed-use words"],
  ]);

  const healthcare = score(text, [
    [/\b(clinic|hospital|nursing home|doctor|consultation|opd|patient|procedure room|pharmacy|diagnostic|lab)\b/i, "healthcare words"],
  ]);

  const educational = score(text, [
    [/\b(school|college|coaching|institute|classroom|tuition|training center|library|lab room)\b/i, "educational words"],
  ]);

  const hospitality = score(text, [
    [/\b(hotel|restaurant|cafe|café|banquet|guest house|resort|lodge|dining hall|commercial kitchen)\b/i, "hospitality words"],
  ]);

  const industrial = score(text, [
    [/\b(factory|industrial|workshop|manufacturing|production|plant|shed|machine|machinery)\b/i, "industrial words"],
  ]);

  const storage = score(text, [
    [/\b(warehouse|godown|storage|cold storage|logistics|loading dock|inventory)\b/i, "storage words"],
  ]);

  const institutional = score(text, [
    [/\b(community hall|auditorium|assembly|public building|institutional|old age home|hostel|dormitory)\b/i, "institutional words"],
  ]);

  const religious = score(text, [
    [/\b(temple|mandir|mosque|masjid|church|gurudwara|religious|prayer hall)\b/i, "religious words"],
  ]);

  const renovation = score(text, [
    [/\b(renovation|remodel|existing|old house|modify|extension|addition|repair|retrofit|interior upgrade)\b/i, "renovation words"],
  ]);

  const riskWords = score(text, [
    [/\b(high rise|high-rise|basement|stilt|fire noc|fire safety|assembly|hospital|school|warehouse|factory|industrial|hazardous|banquet|auditorium|restaurant|commercial kitchen|lift|escalator)\b/i, "special/high-risk trigger"],
  ]);

  const scoreMap: Array<{
    category: BuildSetuBuildingCategory;
    subType: string;
    occupancyGroup: BuildSetuOccupancyGroup;
    planningMode: BuildSetuBuildingTypeClassification["planningMode"];
    score: number;
    signals: string[];
  }> = [
    {
      category: "mixed_use",
      subType: "mixed-use building",
      occupancyGroup: "mixed",
      planningMode: "mixed_use_building",
      score: mixedUse.score + Math.min(commercial.score, 1) + Math.min(residential.score, 1),
      signals: [...mixedUse.signals, ...commercial.signals, ...residential.signals],
    },
    {
      category: "healthcare",
      subType: has(/\bhospital\b/i, text) ? "hospital" : "clinic / healthcare fitout",
      occupancyGroup: "institutional_healthcare",
      planningMode: "public_or_special_building",
      score: healthcare.score,
      signals: healthcare.signals,
    },
    {
      category: "educational",
      subType: has(/\bschool\b/i, text) ? "school" : "coaching / education space",
      occupancyGroup: "educational",
      planningMode: "public_or_special_building",
      score: educational.score,
      signals: educational.signals,
    },
    {
      category: "hospitality",
      subType: has(/\brestaurant|cafe|café\b/i, text) ? "restaurant / cafe" : "hotel / hospitality",
      occupancyGroup: "assembly",
      planningMode: "commercial_building",
      score: hospitality.score,
      signals: hospitality.signals,
    },
    {
      category: "industrial",
      subType: "industrial / workshop",
      occupancyGroup: "industrial",
      planningMode: "industrial_storage",
      score: industrial.score,
      signals: industrial.signals,
    },
    {
      category: "storage",
      subType: "warehouse / storage",
      occupancyGroup: "storage",
      planningMode: "industrial_storage",
      score: storage.score,
      signals: storage.signals,
    },
    {
      category: "institutional",
      subType: "institutional / assembly",
      occupancyGroup: "assembly",
      planningMode: "public_or_special_building",
      score: institutional.score,
      signals: institutional.signals,
    },
    {
      category: "religious",
      subType: "religious building",
      occupancyGroup: "assembly",
      planningMode: "public_or_special_building",
      score: religious.score,
      signals: religious.signals,
    },
    {
      category: "commercial",
      subType: has(/\boffice|cabin|workstation|meeting\b/i, text)
        ? "office"
        : has(/\bshop|showroom|retail|store\b/i, text)
          ? "shop / showroom"
          : "commercial",
      occupancyGroup: has(/\bshop|showroom|retail|store\b/i, text) ? "mercantile" : "commercial_business",
      planningMode: "commercial_building",
      score: commercial.score,
      signals: commercial.signals,
    },
    {
      category: "residential",
      subType: has(/\bduplex\b/i, text)
        ? "duplex"
        : has(/\bapartment|flat\b/i, text)
          ? "apartment / flat"
          : has(/\bvilla|bungalow\b/i, text)
            ? "villa / bungalow"
            : "residential house",
      occupancyGroup: "residential_dwelling",
      planningMode: "residential_building",
      score: residential.score,
      signals: residential.signals,
    },
  ];

  let best = scoreMap.sort((a, b) => b.score - a.score)[0];

  // BUILDSETU_PHASE_47C2_HEALTHCARE_PRIORITY
  // Healthcare/clinic words must win over generic commercial/mixed-use scoring.
  if (healthcare.score > 0) {
    best = {
      category: "healthcare",
      subType: has(/\bhospital\b/i, text) ? "hospital" : "clinic / healthcare fitout",
      occupancyGroup: "institutional_healthcare",
      planningMode: "public_or_special_building",
      score: healthcare.score + 3,
      signals: healthcare.signals,
    };
  }

  if (educational.score > 0 && best.category !== "healthcare") {
    best = {
      category: "educational",
      subType: has(/\bschool\b/i, text) ? "school" : "coaching / education space",
      occupancyGroup: "educational",
      planningMode: "public_or_special_building",
      score: educational.score + 3,
      signals: educational.signals,
    };
  }

  if (hasInteriorOnly) {
    best = {
      category: "interior_only",
      subType: has(/\bkitchen|modular kitchen\b/i, text)
        ? "kitchen interior"
        : has(/\btoilet|washroom|bath\b/i, text)
          ? "toilet / washroom interior"
          : has(/\boffice|cabin|reception\b/i, text)
            ? "office interior"
            : "room interior",
      occupancyGroup: "interior_fitout",
      planningMode: "room_interior",
      score: Math.max(2, best?.score || 0),
      signals: ["interior-only request", ...(best?.signals || [])],
    };
  }

  if (renovation.score > 0 && !hasInteriorOnly) {
    pushUnique(detectedSignals, "renovation/remodel detected");
  }

  if (!best || best.score <= 0) {
    best = {
      category: "unknown",
      subType: "unknown",
      occupancyGroup: "unknown",
      planningMode: "unknown",
      score: 0,
      signals: [],
    };
  }

  for (const signal of best.signals) pushUnique(detectedSignals, signal);
  if (hasPlotDimension) pushUnique(detectedSignals, "plot dimensions detected");
  if (hasRoomDimension) pushUnique(detectedSignals, "room dimensions detected");
  if (riskWords.score > 0) riskWords.signals.forEach((signal) => pushUnique(detectedSignals, signal));

  if (best.planningMode === "room_interior") {
    recommendedPlanningFocus.push(
      "Furniture footprint and circulation clearance",
      "Door/window/opening positions",
      "Electrical, lighting, AC and switch/socket coordination",
      "Material palette, finish level and storage"
    );
    assumptions.push("Interior concept can start with room dimensions; door/window positions must be confirmed for final layout.");
  }

  if (best.planningMode === "residential_building") {
    recommendedPlanningFocus.push(
      "Entry, parking, staircase and service core",
      "Bedroom/living/kitchen adjacency",
      "Light, ventilation and privacy",
      "Vastu preference if requested"
    );
  }

  if (best.planningMode === "commercial_building") {
    recommendedPlanningFocus.push(
      "Customer/staff circulation",
      "Display or workstation layout",
      "Toilet, pantry and service zoning",
      "Signage, facade and accessibility"
    );
  }

  if (best.planningMode === "mixed_use_building") {
    recommendedPlanningFocus.push(
      "Independent residential/commercial access",
      "Parking and service separation",
      "Noise/privacy control",
      "Fire/accessibility risk review"
    );
  }

  if (best.planningMode === "public_or_special_building") {
    recommendedPlanningFocus.push(
      "Occupant load and exits",
      "Accessibility and fire-safety coordination",
      "Toilet count and public circulation",
      "Professional compliance review"
    );
  }

  if (best.planningMode === "industrial_storage") {
    recommendedPlanningFocus.push(
      "Loading/unloading movement",
      "Structural span and floor loading",
      "Fire safety and ventilation",
      "Utility/service access"
    );
  }

  let riskLevel: BuildSetuBuildingTypeClassification["riskLevel"] = "low";

  if (
    best.planningMode === "public_or_special_building" ||
    best.planningMode === "industrial_storage" ||
    riskWords.score > 0
  ) {
    riskLevel = "high";
  } else if (
    best.planningMode === "commercial_building" ||
    best.planningMode === "mixed_use_building" ||
    renovation.score > 0
  ) {
    riskLevel = "medium";
  }

  if (riskLevel === "high") {
    escalationFlags.push("High-risk/public/special-use project: fire, accessibility, MEP and licensed professional review required.");
  }

  if (best.category === "healthcare") {
    escalationFlags.push("Healthcare planning requires patient flow, hygiene, accessibility, fire and local healthcare norms review.");
  }

  if (best.category === "educational") {
    escalationFlags.push("Educational building planning requires exit, toilet, accessibility, fire and local authority review.");
  }

  if (best.category === "industrial" || best.category === "storage") {
    escalationFlags.push("Industrial/storage planning requires structural loading, fire safety, ventilation and utility review.");
  }

  if (best.category === "unknown") {
    assumptions.push("Building type is unclear; ask user to classify use before detailed planning.");
  }

  const confidence =
    best.score >= 2 || hasInteriorOnly || mixedUse.score > 0
      ? "high"
      : best.score === 1
        ? "medium"
        : "low";

  return {
    category: riskWords.score > 0 && best.category === "unknown" ? "special_high_risk" : best.category,
    subType: best.subType,
    occupancyGroup: best.occupancyGroup,
    planningMode: best.planningMode,
    confidence,
    riskLevel,
    detectedSignals,
    recommendedPlanningFocus,
    escalationFlags,
    assumptions,
  };
}

export function buildBuildingTypeClassifierPromptBlock(result: BuildSetuBuildingTypeClassification): string {
  const lines: string[] = [];

  lines.push("BUILDING TYPE CLASSIFIER:");
  lines.push(`- Category: ${result.category}`);
  lines.push(`- Sub type: ${result.subType}`);
  lines.push(`- Occupancy group: ${result.occupancyGroup}`);
  lines.push(`- Planning mode: ${result.planningMode}`);
  lines.push(`- Confidence: ${result.confidence}`);
  lines.push(`- Risk level: ${result.riskLevel}`);

  if (result.detectedSignals.length) {
    lines.push("Detected signals:");
    result.detectedSignals.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.recommendedPlanningFocus.length) {
    lines.push("Planning focus:");
    result.recommendedPlanningFocus.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.escalationFlags.length) {
    lines.push("Escalation flags:");
    result.escalationFlags.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.assumptions.length) {
    lines.push("Assumptions:");
    result.assumptions.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
