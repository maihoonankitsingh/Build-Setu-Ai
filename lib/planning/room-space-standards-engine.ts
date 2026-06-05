// BUILDSETU_PHASE_47H1_ROOM_SPACE_STANDARDS_ENGINE

import standardsData from "../../data/buildsetu-knowledge/room-space-dimension-standards-v1.json";

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

type RoomFurnitureFitEngineLike = {
  primaryUseDetected?: string;
  checks?: Array<{
    id?: string;
    roomType?: string;
    sourceDimension?: string;
    widthFeet?: number | null;
    depthFeet?: number | null;
    areaSqFt?: number | null;
    status?: string;
  }>;
};

type BuildingTypeClassificationLike = {
  category?: string;
  planningMode?: string;
  riskLevel?: string;
};

type StandardGrade = "compact" | "standard" | "premium";

type SpaceGradeData = {
  minWidthFt: number;
  minDepthFt: number;
  minAreaSqFt: number;
  notes: string[];
};

type SpaceStandardData = {
  label: string;
  grades: Record<StandardGrade, SpaceGradeData>;
  fitRules: string[];
};

type StandardsData = {
  id: string;
  version: string;
  scope: string;
  importantNote: string;
  spaces: Record<string, SpaceStandardData>;
};

export type BuildSetuRoomSpaceGrade =
  | "below_minimum"
  | "compact"
  | "standard"
  | "premium"
  | "unknown";

export type BuildSetuRoomSpaceStandardCheck = {
  id: string;
  sourceDimension: string;
  detectedRoomType: string;
  standardsKey: string;
  standardsLabel: string;
  widthFeet: number | null;
  depthFeet: number | null;
  areaSqFt: number | null;
  shortSideFt: number | null;
  longSideFt: number | null;
  grade: BuildSetuRoomSpaceGrade;
  matchedGrade: StandardGrade | null;
  recommendation: string;
  targetRanges: string[];
  standardsNotes: string[];
  fitRules: string[];
  warnings: string[];
};

export type BuildSetuRoomSpaceStandardsEngineResult = {
  engineVersion: "47H-1";
  standardsId: string;
  standardsVersion: string;
  hasStandardsContext: boolean;
  checks: BuildSetuRoomSpaceStandardCheck[];
  globalRecommendations: string[];
  standardsDisclaimer: string[];
};

const DATA = standardsData as StandardsData;

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

function minSide(width: number | null, depth: number | null): number | null {
  if (typeof width !== "number" || typeof depth !== "number") return null;
  return Math.min(width, depth);
}

function maxSide(width: number | null, depth: number | null): number | null {
  if (typeof width !== "number" || typeof depth !== "number") return null;
  return Math.max(width, depth);
}

function mapRoomTypeToStandardKey(roomType: string, sourceText: string, globalText: string): string {
  const t = `${roomType} ${sourceText} ${globalText}`.toLowerCase();

  if (has(/\b(master bedroom|master)\b/i, t)) return "master_bedroom";
  if (has(/\b(bedroom|bed|wardrobe)\b/i, t)) return "bedroom";
  if (has(/\b(kitchen|modular|hob|sink|fridge|counter)\b/i, t)) return "kitchen";
  if (has(/\b(toilet|washroom|bath|wc|shower)\b/i, t)) return "toilet";
  if (has(/\b(living|drawing|sofa|tv unit)\b/i, t)) return "living";
  if (has(/\b(dining)\b/i, t)) return "dining";
  if (has(/\b(pooja|puja|mandir)\b/i, t)) return "pooja";
  if (has(/\b(utility|laundry|washing)\b/i, t)) return "utility";
  if (has(/\b(balcony)\b/i, t)) return "balcony";
  if (has(/\b(parking|garage|stilt|car)\b/i, t)) return "parking";
  if (has(/\b(stair|staircase)\b/i, t)) return "staircase";
  if (has(/\b(office|cabin|workstation|meeting)\b/i, t)) return "office_cabin";
  if (has(/\b(clinic|consultation|procedure|patient)\b/i, t)) return "clinic_consultation";
  if (has(/\b(classroom|class|coaching|student)\b/i, t)) return "classroom";
  if (has(/\b(warehouse|rack|racking|aisle|storage)\b/i, t)) return "warehouse_aisle";

  return "bedroom";
}

function gradeSpace(input: {
  widthFeet: number | null;
  depthFeet: number | null;
  areaSqFt: number | null;
  standard: SpaceStandardData;
}): {
  grade: BuildSetuRoomSpaceGrade;
  matchedGrade: StandardGrade | null;
  notes: string[];
  warnings: string[];
} {
  const width = input.widthFeet;
  const depth = input.depthFeet;
  const area = input.areaSqFt;
  const standard = input.standard;

  const shortSide = minSide(width, depth);
  const longSide = maxSide(width, depth);

  if (!shortSide || !longSide || !area) {
    return {
      grade: "unknown",
      matchedGrade: null,
      notes: [],
      warnings: ["Width/depth/area missing; standards comparison cannot be completed."],
    };
  }

  const compact = standard.grades.compact;
  const standardGrade = standard.grades.standard;
  const premium = standard.grades.premium;

  const passCompact =
    shortSide >= Math.min(compact.minWidthFt, compact.minDepthFt) &&
    longSide >= Math.max(compact.minWidthFt, compact.minDepthFt) &&
    area >= compact.minAreaSqFt;

  const passStandard =
    shortSide >= Math.min(standardGrade.minWidthFt, standardGrade.minDepthFt) &&
    longSide >= Math.max(standardGrade.minWidthFt, standardGrade.minDepthFt) &&
    area >= standardGrade.minAreaSqFt;

  const passPremium =
    shortSide >= Math.min(premium.minWidthFt, premium.minDepthFt) &&
    longSide >= Math.max(premium.minWidthFt, premium.minDepthFt) &&
    area >= premium.minAreaSqFt;

  if (passPremium) {
    return { grade: "premium", matchedGrade: "premium", notes: premium.notes || [], warnings: [] };
  }

  if (passStandard) {
    return { grade: "standard", matchedGrade: "standard", notes: standardGrade.notes || [], warnings: [] };
  }

  if (passCompact) {
    return {
      grade: "compact",
      matchedGrade: "compact",
      notes: compact.notes || [],
      warnings: ["Space is compact; use exact opening/furniture/service positions before final layout."],
    };
  }

  return {
    grade: "below_minimum",
    matchedGrade: null,
    notes: [],
    warnings: [
      `Below compact planning benchmark for ${standard.label}. Revise use, furniture list or room size.`,
    ],
  };
}

function buildTargetRanges(standard: SpaceStandardData): string[] {
  return [
    `Compact: min ${standard.grades.compact.minWidthFt} ft x ${standard.grades.compact.minDepthFt} ft / ${standard.grades.compact.minAreaSqFt} sq ft.`,
    `Standard: min ${standard.grades.standard.minWidthFt} ft x ${standard.grades.standard.minDepthFt} ft / ${standard.grades.standard.minAreaSqFt} sq ft.`,
    `Premium: min ${standard.grades.premium.minWidthFt} ft x ${standard.grades.premium.minDepthFt} ft / ${standard.grades.premium.minAreaSqFt} sq ft.`,
  ];
}

export function buildRoomSpaceStandardsEngine(input: {
  inputText: string;
  dimensionUnderstanding?: DimensionContextLike;
  roomFurnitureFitEngine?: RoomFurnitureFitEngineLike;
  buildingTypeClassification?: BuildingTypeClassificationLike;
}): BuildSetuRoomSpaceStandardsEngineResult {
  const inputText = cleanText(input.inputText);
  const checks: BuildSetuRoomSpaceStandardCheck[] = [];
  const globalRecommendations: string[] = [];
  const standardsDisclaimer: string[] = [];

  const fitChecks = input.roomFurnitureFitEngine?.checks || [];
  const roomPairs = input.dimensionUnderstanding?.pairs?.filter((pair) => pair.intent === "room") || [];

  const sourceItems = fitChecks.length
    ? fitChecks.map((check, index) => ({
        id: check.id || `standards-fit-${index + 1}`,
        roomType: cleanText(check.roomType || input.roomFurnitureFitEngine?.primaryUseDetected || "generic_room"),
        sourceDimension: cleanText(check.sourceDimension || `room-${index + 1}`),
        widthFeet: check.widthFeet ?? null,
        depthFeet: check.depthFeet ?? null,
        areaSqFt: check.areaSqFt ?? null,
      }))
    : roomPairs.map((pair, index) => ({
        id: `standards-room-${index + 1}`,
        roomType: cleanText(input.roomFurnitureFitEngine?.primaryUseDetected || "generic_room"),
        sourceDimension: cleanText(pair.raw || `room-${index + 1}`),
        widthFeet: pair.widthFeet ?? null,
        depthFeet: pair.depthFeet ?? null,
        areaSqFt: pair.areaSqFt ?? null,
      }));

  sourceItems.slice(0, 12).forEach((item, index) => {
    const standardsKey = mapRoomTypeToStandardKey(item.roomType, item.sourceDimension, inputText);
    const standard = DATA.spaces[standardsKey] || DATA.spaces.bedroom;

    const graded = gradeSpace({
      widthFeet: item.widthFeet,
      depthFeet: item.depthFeet,
      areaSqFt: item.areaSqFt,
      standard,
    });

    const warnings = [...graded.warnings];

    if (graded.grade === "below_minimum") {
      pushUnique(globalRecommendations, `${standard.label}: below compact benchmark; revise layout or room size.`);
    }

    if (graded.grade === "compact") {
      pushUnique(globalRecommendations, `${standard.label}: compact planning; use space-saving furniture and exact openings.`);
    }

    if (graded.grade === "standard" || graded.grade === "premium") {
      pushUnique(globalRecommendations, `${standard.label}: ${graded.grade} benchmark achieved for concept planning.`);
    }

    checks.push({
      id: item.id || `standards-check-${index + 1}`,
      sourceDimension: item.sourceDimension,
      detectedRoomType: item.roomType,
      standardsKey,
      standardsLabel: standard.label,
      widthFeet: round1(item.widthFeet),
      depthFeet: round1(item.depthFeet),
      areaSqFt: round1(item.areaSqFt),
      shortSideFt: round1(minSide(item.widthFeet, item.depthFeet)),
      longSideFt: round1(maxSide(item.widthFeet, item.depthFeet)),
      grade: graded.grade,
      matchedGrade: graded.matchedGrade,
      recommendation:
        graded.grade === "premium"
          ? `${standard.label} is premium-sized for concept planning.`
          : graded.grade === "standard"
            ? `${standard.label} meets standard concept planning benchmark.`
            : graded.grade === "compact"
              ? `${standard.label} meets compact benchmark; plan carefully.`
              : graded.grade === "below_minimum"
                ? `${standard.label} is below compact benchmark; revise size/use/furniture.`
                : `${standard.label} could not be graded due to incomplete dimensions.`,
      targetRanges: buildTargetRanges(standard),
      standardsNotes: graded.notes,
      fitRules: standard.fitRules || [],
      warnings,
    });
  });

  if (!checks.length) {
    pushUnique(globalRecommendations, "No room-level dimension available for standards grading.");
    pushUnique(globalRecommendations, "Ask user for room dimensions or generate concept room sizes first.");
  }

  pushUnique(standardsDisclaimer, DATA.importantNote);
  pushUnique(standardsDisclaimer, "Room standards are planning heuristics; verify final dimensions with site measurement, wall thickness, structure, MEP and local code context.");

  return {
    engineVersion: "47H-1",
    standardsId: DATA.id,
    standardsVersion: DATA.version,
    hasStandardsContext: checks.length > 0,
    checks,
    globalRecommendations,
    standardsDisclaimer,
  };
}

export function buildRoomSpaceStandardsPromptBlock(result: BuildSetuRoomSpaceStandardsEngineResult): string {
  const lines: string[] = [];

  lines.push("ROOM / SPACE DIMENSION STANDARDS ENGINE:");
  lines.push(`- Standards: ${result.standardsId}`);
  lines.push(`- Version: ${result.standardsVersion}`);
  lines.push(`- Has standards context: ${result.hasStandardsContext ? "yes" : "no"}`);

  if (result.checks.length) {
    lines.push("Standards checks:");
    result.checks.slice(0, 10).forEach((check, index) => {
      lines.push(`${index + 1}. ${check.standardsLabel} ${check.sourceDimension}: ${check.grade} — ${check.recommendation}`);
      check.targetRanges.slice(0, 3).forEach((item) => lines.push(`   - Target: ${item}`));
      check.standardsNotes.slice(0, 3).forEach((item) => lines.push(`   - Note: ${item}`));
      check.warnings.slice(0, 3).forEach((item) => lines.push(`   - Warning: ${item}`));
    });
  } else {
    lines.push("Standards checks: none");
  }

  if (result.globalRecommendations.length) {
    lines.push("Global recommendations:");
    result.globalRecommendations.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
  }

  if (result.standardsDisclaimer.length) {
    lines.push("Standards disclaimer:");
    result.standardsDisclaimer.slice(0, 4).forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}
