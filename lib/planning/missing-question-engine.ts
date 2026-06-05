// BUILDSETU_PHASE_47B1_MISSING_QUESTION_ENGINE
// BUILDSETU_PHASE_47B3_INTERIOR_ONLY_MISSING_QUESTION_TUNING

type DimensionContextLike = {
  summary?: {
    totalPairs?: number;
    totalSingles?: number;
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
    confidence?: string;
  }>;
  warnings?: string[];
};

export type BuildSetuPlanningQuestionPriority = "critical" | "recommended" | "optional";

export type BuildSetuPlanningQuestion = {
  id: string;
  priority: BuildSetuPlanningQuestionPriority;
  question: string;
  reason: string;
  category:
    | "location_bylaw"
    | "plot"
    | "building_type"
    | "usage"
    | "floors"
    | "parking"
    | "budget"
    | "vastu"
    | "output"
    | "reference"
    | "mep_structure"
    | "interior"
    | "unknown";
};

export type BuildSetuMissingQuestionEngineResult = {
  readiness: "needs_critical_details" | "can_start_concept" | "ready_for_detailed_plan";
  criticalQuestions: BuildSetuPlanningQuestion[];
  recommendedQuestions: BuildSetuPlanningQuestion[];
  optionalQuestions: BuildSetuPlanningQuestion[];
  mergedMissingQuestions: string[];
  assumptionsAllowed: string[];
  riskFlags: string[];
  detected: {
    hasLocation: boolean;
    hasPlotDimension: boolean;
    hasRoomDimension: boolean;
    hasFacing: boolean;
    hasRoadWidth: boolean;
    hasBuildingType: boolean;
    hasFloors: boolean;
    hasOutputType: boolean;
    hasParking: boolean;
    hasBudget: boolean;
    hasVastuPreference: boolean;
    hasFamilyOrUsage: boolean;
    hasReference: boolean;
    hasInteriorOutput: boolean;
    isInteriorOnlyRequest: boolean;
    hasDoorWindowInfo: boolean;
    hasFurnitureIntent: boolean;
    hasInteriorStyle: boolean;
    hasElectricalLightingIntent: boolean;
  };
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(pattern: RegExp, text: string): boolean {
  return pattern.test(text);
}

function addQuestion(list: BuildSetuPlanningQuestion[], item: BuildSetuPlanningQuestion) {
  if (!list.some((existing) => existing.id === item.id)) {
    list.push(item);
  }
}

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const clean = cleanText(value);
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }

  return out;
}

export function buildPlanningMissingQuestionEngine(input: {
  inputText: string;
  parsedMissingQuestions?: string[];
  dimensionUnderstanding?: DimensionContextLike;
}): BuildSetuMissingQuestionEngineResult {
  const raw = cleanText(input.inputText);
  const text = raw.toLowerCase();
  const dim = input.dimensionUnderstanding;

  const hasPlotDimension = Boolean(
    dim?.summary?.hasPlotDimension || dim?.pairs?.some((pair) => pair.intent === "plot")
  );

  const hasRoomDimension = Boolean(
    dim?.summary?.hasRoomDimension || dim?.pairs?.some((pair) => pair.intent === "room")
  );

  const hasLocation = has(
    /\b(state|city|municipal|municipality|corporation|authority|nagar|panchayat|dda|bbmp|hmda|ghmc|bmc|mcd|jda|gda|lpa|development authority|local authority|delhi|mumbai|bangalore|bengaluru|hyderabad|pune|chennai|kolkata|jaipur|lucknow|ahmedabad|surat|indore|bhopal|patna|ranchi|gurgaon|gurugram|noida|ghaziabad|faridabad|chandigarh|karnataka|maharashtra|gujarat|rajasthan|uttar pradesh|madhya pradesh|bihar|jharkhand|west bengal|tamil nadu|telangana|andhra pradesh|kerala|punjab|haryana|odisha|assam|uttarakhand|himachal|goa)\b/i,
    text
  );

  const hasFacing = has(
    /\b(north|south|east|west|north east|north west|south east|south west|ne|nw|se|sw)\s*(facing)?\b/i,
    text
  );

  const hasRoadWidth = has(
    /\b(road|street|lane|rasta|approach)\b.{0,30}\b(\d+(?:\.\d+)?)\s*(ft|feet|m|meter|metre|mm)?\b/i,
    text
  );

  const hasBuildingType = has(
    /\b(residential|commercial|mixed|mixed-use|shop|showroom|office|clinic|restaurant|cafe|hotel|school|hospital|warehouse|factory|industrial|house|home|villa|duplex|bungalow|apartment|flat|bhk|pg|hostel|farmhouse)\b/i,
    text
  );

  const hasFloors = has(
    /\b(g\+\d+|ground\s*\+\s*\d+|\d+\s*floor|floor plan|storey|story|duplex|single floor|double floor|basement|stilt)\b/i,
    text
  );

  const hasOutputType = has(
    /\b(floor plan|layout|planning|working drawing|interior|elevation|facade|3d|render|boq|estimate|structure|mep|electrical|plumbing|ceiling|furniture)\b/i,
    text
  );

  const hasInteriorOutput = has(
    /\b(interior|room layout|bedroom|kitchen layout|living layout|furniture|wardrobe|queen bed|king bed|sofa|tv unit|false ceiling|ceiling|lighting|modular kitchen|toilet layout|washroom layout)\b/i,
    text
  );

  const hasPlotPlanningOutput = has(
    /\b(floor plan|building plan|house plan|naksha|site plan|working drawing|elevation|facade|3d|render|boq|estimate)\b/i,
    text
  );

  const hasStructureMepOutput = has(
    /\b(structure|structural|column|beam|slab|footing|foundation|mep|electrical load|plumbing|drainage|fire)\b/i,
    text
  );

  const hasDoorWindowInfo = has(/\b(door|window|opening|ventilator|balcony door|main door|entry)\b/i, text);
  const hasFurnitureIntent = has(/\b(bed|queen|king|single bed|wardrobe|dresser|study|sofa|tv unit|table|chair|counter|island|furniture)\b/i, text);
  const hasInteriorStyle = has(/\b(modern|minimal|luxury|premium|classic|contemporary|traditional|wooden|laminate|veneer|paint|theme|style|palette|material)\b/i, text);
  const hasElectricalLightingIntent = has(/\b(light|lighting|electrical|switch|socket|fan|ac point|tv point|false ceiling|cove|spotlight)\b/i, text);

  const hasParking = has(/\b(parking|car|bike|garage|stilt|driveway)\b/i, text);
  const hasBudget = has(/\b(budget|cost|estimate|lakh|lac|crore|cr|rs\.?|₹|per sqft|economy|standard|premium|luxury)\b/i, text);
  const hasVastuPreference = has(/\b(vastu|vaastu|vastu compliant|strict vastu)\b/i, text);
  const hasFamilyOrUsage = has(/\b(family|member|parents|kids|rental|tenant|self use|own use|investment|bhk|bedroom|users|staff|customers)\b/i, text);
  const hasReference = has(/\b(reference|image|photo|pdf|cad|dwg|sketch|upload|sample|same like|inspired)\b/i, text);

  const isInteriorOnlyRequest = Boolean(
    hasInteriorOutput &&
      hasRoomDimension &&
      !hasPlotDimension &&
      !hasPlotPlanningOutput &&
      !hasStructureMepOutput
  );

  const criticalQuestions: BuildSetuPlanningQuestion[] = [];
  const recommendedQuestions: BuildSetuPlanningQuestion[] = [];
  const optionalQuestions: BuildSetuPlanningQuestion[] = [];

  if (!hasLocation) {
    if (isInteriorOnlyRequest) {
      addQuestion(recommendedQuestions, {
        id: "interior-location-context",
        priority: "recommended",
        category: "interior",
        question: "Project city/state bata do, taaki climate, material availability aur local execution preference better align ho sake.",
        reason: "Interior-only work me location useful hai, but concept furniture/layout start karne ke liye hard blocker nahi hai.",
      });
    } else {
      addQuestion(criticalQuestions, {
        id: "state-city-local-authority",
        priority: "critical",
        category: "location_bylaw",
        question: "Project kis state/city/local authority ke under aata hai?",
        reason: "Setback, FAR/FSI, height, parking and approval rules local authority ke hisaab se change hote hain.",
      });
    }
  }

  if (!hasPlotDimension && !hasRoomDimension) {
    addQuestion(criticalQuestions, {
      id: "plot-or-room-dimension",
      priority: "critical",
      category: "plot",
      question: "Plot ya room ka exact size kya hai? Width x depth format me batao, jaise 30x40 ft.",
      reason: "Dimension ke bina practical layout, furniture fit, circulation and area calculation reliable nahi hoga.",
    });
  }

  if (hasPlotDimension && !hasFacing && !isInteriorOnlyRequest) {
    addQuestion(criticalQuestions, {
      id: "plot-facing",
      priority: "critical",
      category: "plot",
      question: "Plot ka facing kya hai: North, East, South, West ya corner?",
      reason: "Entry, parking, vastu, light/ventilation and elevation planning facing par depend karte hain.",
    });
  }

  if (hasPlotDimension && !hasRoadWidth && !isInteriorOnlyRequest) {
    addQuestion(criticalQuestions, {
      id: "road-width",
      priority: "critical",
      category: "location_bylaw",
      question: "Front road ki width kitni hai?",
      reason: "Road width se height/FAR/parking/fire access/bylaw risk affect ho sakta hai.",
    });
  }

  if (!hasBuildingType) {
    if (isInteriorOnlyRequest) {
      addQuestion(recommendedQuestions, {
        id: "interior-room-building-context",
        priority: "recommended",
        category: "interior",
        question: "Ye room residential bedroom/living/kitchen/office/clinic/shop me se kis use ke liye hai?",
        reason: "Interior layout me storage, circulation, lighting and furniture selection room use ke hisaab se optimize hota hai.",
      });
    } else {
      addQuestion(criticalQuestions, {
        id: "building-type",
        priority: "critical",
        category: "building_type",
        question: "Building type kya hai: residential, commercial, mixed-use, office, shop, clinic, school, warehouse etc.?",
        reason: "Occupancy ke hisaab se planning, fire, toilet, parking, accessibility and MEP requirements badalte hain.",
      });
    }
  }

  if (!hasOutputType) {
    addQuestion(recommendedQuestions, {
      id: "required-output",
      priority: "recommended",
      category: "output",
      question: "Aapko output kya chahiye: concept floor plan, dimensioned plan, interior, elevation, 3D render, BOQ, working drawing ya MEP/structure coordination?",
      reason: "Different output ke liye different detail level and checks required hote hain.",
    });
  }

  if (!hasFloors && !isInteriorOnlyRequest) {
    addQuestion(recommendedQuestions, {
      id: "floor-count",
      priority: "recommended",
      category: "floors",
      question: "Kitne floors plan karne hain: single floor, G+1, G+2, stilt, basement ya future expansion?",
      reason: "Staircase, lift, structure grid, service shaft and future rental planning floor count se decide hota hai.",
    });
  }

  if (!hasParking && !isInteriorOnlyRequest) {
    addQuestion(recommendedQuestions, {
      id: "parking-need",
      priority: "recommended",
      category: "parking",
      question: "Parking requirement kya hai: car, bike, stilt parking, garage ya no parking?",
      reason: "Parking front zoning, entry gate, staircase position and ground floor planning affect karti hai.",
    });
  }

  if (!hasFamilyOrUsage && !isInteriorOnlyRequest) {
    addQuestion(recommendedQuestions, {
      id: "family-usage",
      priority: "recommended",
      category: "usage",
      question: "Use-case kya hai: self-use, rental, family size, staff/customers/users count?",
      reason: "Room count, privacy, circulation, toilets and service areas actual users ke hisaab se plan hone chahiye.",
    });
  }

  if (isInteriorOnlyRequest) {
    if (!hasDoorWindowInfo) {
      addQuestion(recommendedQuestions, {
        id: "interior-door-window-position",
        priority: "recommended",
        category: "interior",
        question: "Room me door, window, balcony opening aur AC point ki position/size kya hai?",
        reason: "Bed, wardrobe, TV unit, circulation and lighting layout openings ke bina final nahi ho sakta.",
      });
    }

    if (!hasFurnitureIntent) {
      addQuestion(recommendedQuestions, {
        id: "interior-furniture-list",
        priority: "recommended",
        category: "interior",
        question: "Required furniture list batao: bed size, wardrobe, study, dresser, TV unit, sofa, storage etc.",
        reason: "Furniture footprint ke bina practical interior layout incomplete rahega.",
      });
    }

    if (!hasInteriorStyle || !hasBudget) {
      addQuestion(recommendedQuestions, {
        id: "interior-style-budget",
        priority: "recommended",
        category: "interior",
        question: "Interior style aur budget/finish level kya chahiye: economy, standard, premium, luxury, modern, minimal, wooden etc.?",
        reason: "Material palette, false ceiling, lighting and furniture detail style/budget se decide hota hai.",
      });
    }

    if (!hasElectricalLightingIntent) {
      addQuestion(recommendedQuestions, {
        id: "interior-electrical-lighting",
        priority: "recommended",
        category: "interior",
        question: "Lighting/electrical needs batao: fan, AC, TV point, study light, bedside switches, wardrobe light, false ceiling etc.",
        reason: "Interior working layout me electrical and lighting coordination important hota hai.",
      });
    }
  }

  if (!hasBudget && !isInteriorOnlyRequest) {
    addQuestion(optionalQuestions, {
      id: "budget-finish-level",
      priority: "optional",
      category: "budget",
      question: "Budget/finish level kya hai: economy, standard, premium ya luxury?",
      reason: "Material, elevation complexity, interior detail and construction specification budget se align karne hote hain.",
    });
  }

  if (!hasVastuPreference && !isInteriorOnlyRequest) {
    addQuestion(optionalQuestions, {
      id: "vastu-strictness",
      priority: "optional",
      category: "vastu",
      question: "Vastu preference chahiye kya? Soft, medium ya strict vastu?",
      reason: "Vastu ko safety, bylaw, structure and ventilation ke baad preference layer ki tarah apply karna safe hai.",
    });
  }

  if (!hasReference) {
    addQuestion(optionalQuestions, {
      id: "reference-files",
      priority: "optional",
      category: "reference",
      question: "Koi reference image/PDF/sketch/elevation/interior style upload karna hai?",
      reason: "Reference se style intent, room pattern, facade language and client preference better samajh aati hai.",
    });
  }

  const riskFlags: string[] = [];

  if (!hasLocation && !isInteriorOnlyRequest) {
    riskFlags.push("Local bylaw authority unknown: FAR/FSI, setbacks, height, parking and approval rules cannot be finalized.");
  }

  if (hasPlotDimension && !hasRoadWidth && !isInteriorOnlyRequest) {
    riskFlags.push("Road width unknown: height, fire access, parking and approval feasibility may be affected.");
  }

  if (hasPlotDimension && !hasFacing && !isInteriorOnlyRequest) {
    riskFlags.push("Plot facing unknown: entry, vastu, daylight and elevation assumptions may be wrong.");
  }

  if (!hasBudget) {
    riskFlags.push("Budget/finish level unknown: material and elevation/interior specification should remain assumption-based.");
  }

  if (isInteriorOnlyRequest && !hasDoorWindowInfo) {
    riskFlags.push("Door/window/opening positions unknown: interior layout can be conceptual, not final working layout.");
  }

  const assumptionsAllowed: string[] = [];

  if (hasPlotDimension) {
    assumptionsAllowed.push("Concept zoning can start using detected plot dimensions.");
  }

  if (hasRoomDimension) {
    assumptionsAllowed.push("Room/interior fit analysis can start using detected room dimensions.");
  }

  if (!hasLocation && !isInteriorOnlyRequest) {
    assumptionsAllowed.push("Use generic India planning assumptions only; do not claim final local compliance.");
  }

  if (isInteriorOnlyRequest) {
    assumptionsAllowed.push("Interior concept can start using detected room dimensions, with door/window positions treated as assumptions if missing.");
  }

  if (!hasVastuPreference && !isInteriorOnlyRequest) {
    assumptionsAllowed.push("Use functional planning first; add vastu only if user requests it.");
  }

  const mergedMissingQuestions = uniq([
    ...(input.parsedMissingQuestions || []),
    ...criticalQuestions.map((q) => q.question),
    ...recommendedQuestions.map((q) => q.question),
    ...optionalQuestions.map((q) => q.question),
  ]);

  const readiness =
    criticalQuestions.length > 2
      ? "needs_critical_details"
      : criticalQuestions.length > 0 || recommendedQuestions.length > 0
        ? "can_start_concept"
        : "ready_for_detailed_plan";

  return {
    readiness,
    criticalQuestions,
    recommendedQuestions,
    optionalQuestions,
    mergedMissingQuestions,
    assumptionsAllowed,
    riskFlags,
    detected: {
      hasLocation,
      hasPlotDimension,
      hasRoomDimension,
      hasFacing,
      hasRoadWidth,
      hasBuildingType,
      hasFloors,
      hasOutputType,
      hasParking,
      hasBudget,
      hasVastuPreference,
      hasFamilyOrUsage,
      hasReference,
      hasInteriorOutput,
      isInteriorOnlyRequest,
      hasDoorWindowInfo,
      hasFurnitureIntent,
      hasInteriorStyle,
      hasElectricalLightingIntent,
    },
  };
}

export function buildPlanningMissingQuestionPromptBlock(result: BuildSetuMissingQuestionEngineResult): string {
  const lines: string[] = [];

  lines.push("MISSING QUESTION ENGINE:");
  lines.push(`- Readiness: ${result.readiness}`);

  if (result.criticalQuestions.length) {
    lines.push("Critical questions:");
    result.criticalQuestions.slice(0, 8).forEach((q, index) => {
      lines.push(`${index + 1}. ${q.question} Reason: ${q.reason}`);
    });
  } else {
    lines.push("Critical questions: none");
  }

  if (result.recommendedQuestions.length) {
    lines.push("Recommended questions:");
    result.recommendedQuestions.slice(0, 8).forEach((q, index) => {
      lines.push(`${index + 1}. ${q.question}`);
    });
  }

  if (result.riskFlags.length) {
    lines.push("Risk flags:");
    result.riskFlags.slice(0, 8).forEach((risk) => lines.push(`- ${risk}`));
  }

  if (result.assumptionsAllowed.length) {
    lines.push("Assumptions allowed:");
    result.assumptionsAllowed.slice(0, 8).forEach((assumption) => lines.push(`- ${assumption}`));
  }

  return lines.join("\n");
}
