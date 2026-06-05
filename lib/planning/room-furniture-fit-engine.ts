// BUILDSETU_PHASE_47G1_ROOM_FURNITURE_FIT_ENGINE

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
    confidence?: string;
  }>;
};

type BuildingTypeClassificationLike = {
  category?: string;
  planningMode?: string;
  riskLevel?: string;
};

export type BuildSetuFitStatus = "fits" | "tight" | "not_recommended" | "needs_more_info";

export type BuildSetuRoomFitCheck = {
  id: string;
  roomType:
    | "bedroom"
    | "kitchen"
    | "toilet"
    | "living"
    | "office"
    | "parking"
    | "staircase"
    | "generic_room";
  sourceDimension: string;
  widthFeet: number | null;
  depthFeet: number | null;
  areaSqFt: number | null;
  status: BuildSetuFitStatus;
  fitSummary: string;
  furnitureOrFixtureFit: string[];
  clearanceNotes: string[];
  warnings: string[];
  nextDataNeeded: string[];
};

export type BuildSetuRoomFurnitureFitEngineResult = {
  engineVersion: "47G-1";
  hasRoomFitContext: boolean;
  primaryUseDetected: string;
  checks: BuildSetuRoomFitCheck[];
  globalNotes: string[];
  professionalNotes: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(pattern: RegExp, text: string): boolean {
  return pattern.test(text);
}

function round1(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (!clean) return;
  if (!list.some((item) => item.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

function normalizedRoomTypeFromText(text: string): BuildSetuRoomFitCheck["roomType"] {
  if (has(/\b(bedroom|master|queen bed|king bed|wardrobe|dresser)\b/i, text)) return "bedroom";
  if (has(/\b(kitchen|modular kitchen|counter|sink|hob|chimney|island|parallel kitchen|l-shape|l shape)\b/i, text)) return "kitchen";
  if (has(/\b(toilet|bath|washroom|wc|shower)\b/i, text)) return "toilet";
  if (has(/\b(living|drawing|dining|sofa|tv unit)\b/i, text)) return "living";
  if (has(/\b(office|cabin|workstation|meeting|reception)\b/i, text)) return "office";
  if (has(/\b(parking|car parking|garage|stilt)\b/i, text)) return "parking";
  if (has(/\b(stair|staircase|tread|riser|landing)\b/i, text)) return "staircase";
  return "generic_room";
}

function inferRoomTypeForPair(inputText: string, pairRaw: string, index: number): BuildSetuRoomFitCheck["roomType"] {
  const text = inputText.toLowerCase();
  const raw = cleanText(pairRaw).toLowerCase();

  const rawIndex = raw ? text.indexOf(raw) : -1;
  if (rawIndex >= 0) {
    const before = text.slice(Math.max(0, rawIndex - 70), rawIndex);
    const after = text.slice(rawIndex + raw.length, Math.min(text.length, rawIndex + raw.length + 70));
    const local = `${before} ${after}`;
    const localType = normalizedRoomTypeFromText(local);
    if (localType !== "generic_room") return localType;
  }

  const globalType = normalizedRoomTypeFromText(text);
  if (globalType !== "generic_room") return globalType;

  if (index === 0 && has(/\binterior|room layout|furniture\b/i, text)) return "generic_room";

  return "generic_room";
}

function makeEmptyCheck(input: {
  id: string;
  roomType: BuildSetuRoomFitCheck["roomType"];
  sourceDimension: string;
  widthFeet: number | null;
  depthFeet: number | null;
  areaSqFt: number | null;
}): BuildSetuRoomFitCheck {
  return {
    id: input.id,
    roomType: input.roomType,
    sourceDimension: input.sourceDimension,
    widthFeet: round1(input.widthFeet),
    depthFeet: round1(input.depthFeet),
    areaSqFt: round1(input.areaSqFt),
    status: "needs_more_info",
    fitSummary: "More information is needed for reliable furniture/fixture fit.",
    furnitureOrFixtureFit: [],
    clearanceNotes: [],
    warnings: [],
    nextDataNeeded: [],
  };
}

function minSide(width: number | null, depth: number | null): number | null {
  if (typeof width !== "number" || typeof depth !== "number") return null;
  return Math.min(width, depth);
}

function maxSide(width: number | null, depth: number | null): number | null {
  if (typeof width !== "number" || typeof depth !== "number") return null;
  return Math.max(width, depth);
}

function evaluateBedroom(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const area = check.areaSqFt;
  const shortSide = minSide(w, d);
  const longSide = maxSide(w, d);

  if (!shortSide || !longSide || !area) return;

  if (area >= 120 && shortSide >= 10) {
    check.status = "fits";
    check.fitSummary = "Bedroom size is workable for a queen bed, wardrobe and basic circulation.";
    pushUnique(check.furnitureOrFixtureFit, "Queen bed approx 5 ft x 6.5 ft can fit.");
    pushUnique(check.furnitureOrFixtureFit, "Wardrobe depth approx 2 ft can fit on one wall.");
    pushUnique(check.clearanceNotes, "Keep approx 2.5 ft to 3 ft clear movement on at least one main side of bed.");
    pushUnique(check.clearanceNotes, "Keep wardrobe shutter/sliding clearance clear of bed edge.");
  } else if (area >= 90 && shortSide >= 9) {
    check.status = "tight";
    check.fitSummary = "Bedroom is compact; queen bed may fit but wardrobe/circulation will be tight.";
    pushUnique(check.furnitureOrFixtureFit, "Queen bed may fit with compact wardrobe planning.");
    pushUnique(check.furnitureOrFixtureFit, "Sliding wardrobe shutters are preferable in tight layout.");
    pushUnique(check.clearanceNotes, "Avoid oversized side tables or deep dresser.");
    pushUnique(check.warnings, "Circulation around bed may be constrained.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Bedroom size is too tight for comfortable queen bed + wardrobe layout.";
    pushUnique(check.furnitureOrFixtureFit, "Consider single bed, compact bed, foldable furniture or changing room use.");
    pushUnique(check.warnings, "Queen bed + full wardrobe likely compromises circulation.");
  }

  if (!has(/\b(door|window|opening|balcony)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Door/window/opening position is needed for final bed and wardrobe placement.");
  }

  if (!has(/\b(queen|king|single|bed size|wardrobe|dresser|study)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Confirm furniture list: queen/king/single bed, wardrobe, study, dresser, TV unit.");
  }
}

function evaluateKitchen(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const area = check.areaSqFt;
  const shortSide = minSide(w, d);

  if (!shortSide || !area) return;

  if (area >= 90 && shortSide >= 8.5) {
    check.status = "fits";
    check.fitSummary = "Kitchen size is workable for L-shape or compact parallel planning.";
    pushUnique(check.furnitureOrFixtureFit, "Counter depth approx 2 ft can be planned.");
    pushUnique(check.furnitureOrFixtureFit, "Sink, hob and refrigerator triangle can be conceptually planned.");
    pushUnique(check.clearanceNotes, "Try to keep approx 3 ft clear aisle where possible.");
  } else if (area >= 65 && shortSide >= 7) {
    check.status = "tight";
    check.fitSummary = "Kitchen is compact; straight or L-shape layout is safer than heavy parallel planning.";
    pushUnique(check.furnitureOrFixtureFit, "Straight counter or compact L-shape can work.");
    pushUnique(check.clearanceNotes, "Keep appliance shutters and movement aisle conflict-free.");
    pushUnique(check.warnings, "Parallel kitchen may feel tight unless second counter depth is reduced.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Kitchen size is very compact; use single-wall/utility style planning.";
    pushUnique(check.warnings, "Full modular kitchen with standard appliances may not fit comfortably.");
  }

  if (!has(/\b(sink|hob|chimney|fridge|refrigerator|utility|window|shaft)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Confirm sink, hob, chimney, refrigerator, window/shaft and utility point positions.");
  }
}

function evaluateToilet(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const area = check.areaSqFt;
  const shortSide = minSide(w, d);

  if (!shortSide || !area) return;

  if (area >= 35 && shortSide >= 5) {
    check.status = "fits";
    check.fitSummary = "Toilet/washroom size is workable for WC, basin and shower zoning.";
    pushUnique(check.furnitureOrFixtureFit, "WC + basin + shower can be conceptually planned.");
    pushUnique(check.clearanceNotes, "Keep wet/dry separation where possible.");
  } else if (area >= 25 && shortSide >= 4) {
    check.status = "tight";
    check.fitSummary = "Toilet is compact; fixtures can fit with careful door swing and wet-zone planning.";
    pushUnique(check.furnitureOrFixtureFit, "WC and basin can fit; shower zone may be compact.");
    pushUnique(check.warnings, "Avoid inward door swing if it blocks fixtures.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Toilet size is too tight for comfortable standard fixture placement.";
    pushUnique(check.warnings, "Fixture clearance and door swing may fail.");
  }

  if (!has(/\b(door|ventilator|shaft|window|wc|basin|shower)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Confirm door swing, shaft/ventilator, WC, basin and shower positions.");
  }
}

function evaluateLiving(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const area = check.areaSqFt;
  const shortSide = minSide(w, d);

  if (!shortSide || !area) return;

  if (area >= 160 && shortSide >= 10) {
    check.status = "fits";
    check.fitSummary = "Living room size is workable for sofa, TV unit and circulation.";
    pushUnique(check.furnitureOrFixtureFit, "3-seater sofa + TV wall can fit.");
    pushUnique(check.clearanceNotes, "Keep clear path between entry, seating and dining/rooms.");
  } else if (area >= 120 && shortSide >= 9) {
    check.status = "tight";
    check.fitSummary = "Living room is compact; use controlled furniture depth and wall-mounted TV unit.";
    pushUnique(check.furnitureOrFixtureFit, "Compact sofa or L-sofa can work depending on openings.");
    pushUnique(check.warnings, "Oversized sofa/center table can block circulation.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Living room is very compact for standard sofa + TV + circulation.";
    pushUnique(check.warnings, "Use minimal furniture or combine with dining carefully.");
  }

  if (!has(/\b(sofa|tv|dining|entry|window|balcony)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Confirm sofa size, TV wall, entry, window/balcony and dining relation.");
  }
}

function evaluateOffice(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const area = check.areaSqFt;
  const shortSide = minSide(w, d);

  if (!shortSide || !area) return;

  if (area >= 100 && shortSide >= 9) {
    check.status = "fits";
    check.fitSummary = "Office/cabin size is workable for desk, visitor chairs and storage.";
    pushUnique(check.furnitureOrFixtureFit, "Work desk + 2 visitor chairs + storage can fit.");
    pushUnique(check.clearanceNotes, "Keep clear movement behind chair and near entry.");
  } else if (area >= 70 && shortSide >= 7) {
    check.status = "tight";
    check.fitSummary = "Office/cabin is compact; use wall desk and limited visitor seating.";
    pushUnique(check.furnitureOrFixtureFit, "Single workstation or compact cabin can fit.");
    pushUnique(check.warnings, "Meeting table or bulky storage may not fit comfortably.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Office/cabin is too tight for standard workstation and visitor circulation.";
    pushUnique(check.warnings, "Use as small work nook or storage-support space.");
  }

  if (!has(/\b(workstation|desk|cabin|chair|meeting|storage|reception)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Confirm workstation count, desk size, storage and visitor seating.");
  }
}

function evaluateParking(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const shortSide = minSide(w, d);
  const longSide = maxSide(w, d);

  if (!shortSide || !longSide) return;

  if (shortSide >= 8.5 && longSide >= 16) {
    check.status = "fits";
    check.fitSummary = "Parking bay is workable for one standard car conceptually.";
    pushUnique(check.clearanceNotes, "Keep gate swing, column and turning movement clear.");
  } else if (shortSide >= 8 && longSide >= 14) {
    check.status = "tight";
    check.fitSummary = "Parking is tight; compact car may fit but movement/opening will be constrained.";
    pushUnique(check.warnings, "Column/gate/step placement can make parking unusable.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Parking dimension is not recommended for comfortable car parking.";
    pushUnique(check.warnings, "Consider bike parking or revise parking bay.");
  }

  if (!has(/\b(car|bike|gate|column|stilt|garage|driveway)\b/i, text)) {
    pushUnique(check.nextDataNeeded, "Confirm vehicle type, gate, column and driveway constraints.");
  }
}

function evaluateStaircase(check: BuildSetuRoomFitCheck, text: string) {
  const w = check.widthFeet;
  const d = check.depthFeet;
  const shortSide = minSide(w, d);

  if (!shortSide) return;

  if (shortSide >= 3.5) {
    check.status = "fits";
    check.fitSummary = "Staircase width is workable for residential concept planning.";
    pushUnique(check.clearanceNotes, "Final riser/tread/landing must be designed by drawing and code context.");
  } else if (shortSide >= 3) {
    check.status = "tight";
    check.fitSummary = "Staircase is tight; workable only with careful tread/riser/landing planning.";
    pushUnique(check.warnings, "Movement and furniture shifting may be difficult.");
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Staircase width below practical comfort; revise before planning.";
    pushUnique(check.warnings, "Unsafe/uncomfortable stair risk.");
  }

  pushUnique(check.nextDataNeeded, "Confirm floor-to-floor height, stair type, landing and available stairwell length.");
}

function evaluateGenericRoom(check: BuildSetuRoomFitCheck, text: string) {
  const area = check.areaSqFt;
  const shortSide = minSide(check.widthFeet, check.depthFeet);

  if (!area || !shortSide) return;

  if (area >= 120 && shortSide >= 9) {
    check.status = "fits";
    check.fitSummary = "Generic room size is workable for standard furniture planning.";
  } else if (area >= 80 && shortSide >= 7) {
    check.status = "tight";
    check.fitSummary = "Generic room is compact; furniture list and openings are required before final layout.";
  } else {
    check.status = "not_recommended";
    check.fitSummary = "Generic room is very compact; use-specific layout is required.";
  }

  pushUnique(check.nextDataNeeded, "Confirm room use and required furniture/fixtures.");
}

function evaluateCheck(check: BuildSetuRoomFitCheck, text: string) {
  if (!check.widthFeet || !check.depthFeet) {
    check.status = "needs_more_info";
    check.fitSummary = "Width/depth could not be read reliably.";
    pushUnique(check.nextDataNeeded, "Confirm exact width x depth.");
    return;
  }

  if (check.roomType === "bedroom") evaluateBedroom(check, text);
  else if (check.roomType === "kitchen") evaluateKitchen(check, text);
  else if (check.roomType === "toilet") evaluateToilet(check, text);
  else if (check.roomType === "living") evaluateLiving(check, text);
  else if (check.roomType === "office") evaluateOffice(check, text);
  else if (check.roomType === "parking") evaluateParking(check, text);
  else if (check.roomType === "staircase") evaluateStaircase(check, text);
  else evaluateGenericRoom(check, text);
}

export function buildRoomFurnitureFitEngine(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  buildingTypeClassification?: BuildingTypeClassificationLike;
}): BuildSetuRoomFurnitureFitEngineResult {
  const inputText = cleanText(input.inputText);
  const text = inputText.toLowerCase();
  const dim = input.dimensionUnderstanding;
  const planningMode = input.buildingTypeClassification?.planningMode || "";

  const roomPairs = dim?.pairs?.filter((pair) => pair.intent === "room") || [];
  const plotPairs = dim?.pairs?.filter((pair) => pair.intent === "plot") || [];

  const checks: BuildSetuRoomFitCheck[] = [];
  const globalNotes: string[] = [];
  const professionalNotes: string[] = [];

  roomPairs.slice(0, 12).forEach((pair, index) => {
    const roomType = inferRoomTypeForPair(text, pair.raw || "", index);
    const check = makeEmptyCheck({
      id: `room-fit-${index + 1}`,
      roomType,
      sourceDimension: pair.raw || `room-${index + 1}`,
      widthFeet: pair.widthFeet ?? null,
      depthFeet: pair.depthFeet ?? null,
      areaSqFt: pair.areaSqFt ?? null,
    });

    evaluateCheck(check, text);
    checks.push(check);
  });

  if (planningMode === "residential_building" || has(/\b(parking|car parking|garage|stilt)\b/i, text)) {
    const parkingPair = roomPairs.find((pair) => /parking|garage|stilt/i.test(`${pair.raw || ""} ${text}`));
    if (parkingPair && !checks.some((check) => check.roomType === "parking")) {
      const check = makeEmptyCheck({
        id: "parking-fit-1",
        roomType: "parking",
        sourceDimension: parkingPair.raw || "parking",
        widthFeet: parkingPair.widthFeet ?? null,
        depthFeet: parkingPair.depthFeet ?? null,
        areaSqFt: parkingPair.areaSqFt ?? null,
      });
      evaluateParking(check, text);
      checks.push(check);
    }
  }

  if (!checks.length && plotPairs.length) {
    pushUnique(globalNotes, "Plot dimension detected, but room-level dimensions are not available for furniture fit checks.");
    pushUnique(globalNotes, "Generate concept room sizes first, then run furniture fit validation.");
  }

  if (!checks.length && !plotPairs.length) {
    pushUnique(globalNotes, "No room or plot dimensions detected for fit checks.");
    pushUnique(globalNotes, "Ask user for room size in width x depth format.");
  }

  if (checks.some((check) => check.status === "not_recommended")) {
    pushUnique(globalNotes, "One or more spaces are not recommended for the intended furniture/fixture use.");
  }

  if (checks.some((check) => check.status === "tight")) {
    pushUnique(globalNotes, "Some spaces are workable but tight; compact furniture and exact opening positions are required.");
  }

  if (checks.some((check) => check.nextDataNeeded.length > 0)) {
    pushUnique(globalNotes, "Door/window/opening, furniture and service point positions are required before final working layout.");
  }

  pushUnique(professionalNotes, "These are preliminary fit checks; final interior/architectural drawings need exact wall thickness, openings, columns and site measurements.");
  pushUnique(professionalNotes, "Structural, MEP and local code requirements must be verified by qualified professionals where applicable.");

  return {
    engineVersion: "47G-1",
    hasRoomFitContext: checks.length > 0,
    primaryUseDetected: normalizedRoomTypeFromText(text),
    checks,
    globalNotes,
    professionalNotes,
  };
}

export function buildRoomFurnitureFitPromptBlock(result: BuildSetuRoomFurnitureFitEngineResult): string {
  const lines: string[] = [];

  lines.push("ROOM / FURNITURE FIT ENGINE:");
  lines.push(`- Has room fit context: ${result.hasRoomFitContext ? "yes" : "no"}`);
  lines.push(`- Primary use detected: ${result.primaryUseDetected}`);

  if (result.checks.length) {
    lines.push("Fit checks:");
    result.checks.slice(0, 10).forEach((check, index) => {
      lines.push(`${index + 1}. ${check.roomType} ${check.sourceDimension}: ${check.status} — ${check.fitSummary}`);
      check.furnitureOrFixtureFit.slice(0, 4).forEach((item) => lines.push(`   - Fit: ${item}`));
      check.clearanceNotes.slice(0, 4).forEach((item) => lines.push(`   - Clearance: ${item}`));
      check.warnings.slice(0, 4).forEach((item) => lines.push(`   - Warning: ${item}`));
      check.nextDataNeeded.slice(0, 4).forEach((item) => lines.push(`   - Need: ${item}`));
    });
  } else {
    lines.push("Fit checks: none");
  }

  if (result.globalNotes.length) {
    lines.push("Global notes:");
    result.globalNotes.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.professionalNotes.length) {
    lines.push("Professional notes:");
    result.professionalNotes.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
