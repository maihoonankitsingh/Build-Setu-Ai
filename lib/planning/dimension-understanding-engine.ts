// BUILDSETU_PHASE_47A1_DIMENSION_UNDERSTANDING_ENGINE

export type BuildSetuDimensionUnit = "ft" | "in" | "mm" | "cm" | "m" | "unknown";

export type BuildSetuDimensionIntent =
  | "plot"
  | "room"
  | "parking"
  | "setback"
  | "floor_height"
  | "door"
  | "window"
  | "staircase"
  | "corridor"
  | "wall"
  | "furniture"
  | "site"
  | "unknown";

export type BuildSetuNormalizedLength = {
  raw: string;
  value: number;
  unit: BuildSetuDimensionUnit;
  feet: number | null;
  inches: number | null;
  mm: number | null;
  meters: number | null;
};

export type BuildSetuDimensionPair = {
  raw: string;
  intent: BuildSetuDimensionIntent;
  width: BuildSetuNormalizedLength;
  depth: BuildSetuNormalizedLength;
  areaSqFt: number | null;
  areaSqM: number | null;
  confidence: "high" | "medium" | "low";
  nearbyText: string;
};

export type BuildSetuDimensionSingle = {
  raw: string;
  intent: BuildSetuDimensionIntent;
  length: BuildSetuNormalizedLength;
  confidence: "high" | "medium" | "low";
  nearbyText: string;
};

export type BuildSetuDimensionUnderstandingResult = {
  sourceText: string;
  pairs: BuildSetuDimensionPair[];
  singles: BuildSetuDimensionSingle[];
  plotCandidates: BuildSetuDimensionPair[];
  roomCandidates: BuildSetuDimensionPair[];
  warnings: string[];
  summary: {
    totalPairs: number;
    totalSingles: number;
    hasPlotDimension: boolean;
    hasRoomDimension: boolean;
    primaryPlotAreaSqFt: number | null;
  };
};


// BUILDSETU_PHASE_47A1_DIMENSION_EXAMPLES
export const BUILDSETU_PHASE_47A1_SUPPORTED_DIMENSION_EXAMPLES = [
  "30x40",
  "30 x 40 ft",
  "30 by 40 feet",
  "41*51",
  "10'-6\" x 12'-0\"",
  "10 ft 6 in",
  "10.5 ft",
  "3200 mm",
  "3.2 m",
  "10 by 12 room"
] as const;

const FT_TO_MM = 304.8;
const M_TO_MM = 1000;
const CM_TO_MM = 10;

function round(value: number, precision = 3): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function normalizeWhitespace(text: string): string {
  return String(text || "")
    .replace(/[×✕]/g, "x")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function detectIntent(nearbyText: string): BuildSetuDimensionIntent {
  const t = nearbyText.toLowerCase();

  if (/(plot|site|land|lot|frontage|front|depth|width|road side|corner plot|east facing|north facing|south facing|west facing)/i.test(t)) return "plot";
  if (/(bedroom|master|living|drawing|dining|kitchen|toilet|bath|washroom|pooja|puja|store|utility|balcony|terrace|office|cabin|shop|showroom|hall|room)/i.test(t)) return "room";
  if (/(parking|car|garage|stilt|driveway)/i.test(t)) return "parking";
  if (/(setback|margin|open space|side open|front open|rear open)/i.test(t)) return "setback";
  if (/(floor height|clear height|floor to floor|floor-to-floor|ceiling height|plinth height)/i.test(t)) return "floor_height";
  if (/(door|main door|shutter)/i.test(t)) return "door";
  if (/(window|ventilator|opening)/i.test(t)) return "window";
  if (/(stair|staircase|steps|riser|tread|landing)/i.test(t)) return "staircase";
  if (/(corridor|passage|lobby|circulation)/i.test(t)) return "corridor";
  if (/(wall|partition|thickness)/i.test(t)) return "wall";
  if (/(bed|wardrobe|sofa|table|counter|island|furniture|tv unit)/i.test(t)) return "furniture";

  return "unknown";
}

function inferUnit(unitText: string | undefined, fallback: BuildSetuDimensionUnit = "ft"): BuildSetuDimensionUnit {
  const u = String(unitText || "").toLowerCase().trim();

  if (/^(ft|feet|foot|')$/.test(u)) return "ft";
  if (/^(in|inch|inches|")$/.test(u)) return "in";
  if (/^(mm|millimeter|millimetre|millimeters|millimetres)$/.test(u)) return "mm";
  if (/^(cm|centimeter|centimetre|centimeters|centimetres)$/.test(u)) return "cm";
  if (/^(m|meter|metre|meters|metres)$/.test(u)) return "m";

  return fallback;
}

function normalizeLength(raw: string, value: number, unit: BuildSetuDimensionUnit): BuildSetuNormalizedLength {
  let mm: number | null = null;

  if (unit === "ft") mm = value * FT_TO_MM;
  if (unit === "in") mm = value * 25.4;
  if (unit === "mm") mm = value;
  if (unit === "cm") mm = value * CM_TO_MM;
  if (unit === "m") mm = value * M_TO_MM;

  return {
    raw,
    value,
    unit,
    feet: mm == null ? null : round(mm / FT_TO_MM, 3),
    inches: mm == null ? null : round(mm / 25.4, 2),
    mm: mm == null ? null : round(mm, 1),
    meters: mm == null ? null : round(mm / M_TO_MM, 3),
  };
}

function parseFeetInches(raw: string): BuildSetuNormalizedLength | null {
  const text = raw.trim();

  const quoteMatch = text.match(/^(\d+(?:\.\d+)?)\s*'\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?)?$/i);
  if (quoteMatch) {
    const feet = Number(quoteMatch[1] || 0);
    const inches = Number(quoteMatch[2] || 0);
    return normalizeLength(raw, feet + inches / 12, "ft");
  }

  const ftInMatch = text.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s*(?:(\d+(?:\.\d+)?)\s*(?:in|inch|inches))?$/i);
  if (ftInMatch) {
    const feet = Number(ftInMatch[1] || 0);
    const inches = Number(ftInMatch[2] || 0);
    return normalizeLength(raw, feet + inches / 12, "ft");
  }

  return null;
}

function parseLength(raw: string, fallbackUnit: BuildSetuDimensionUnit = "ft"): BuildSetuNormalizedLength | null {
  const text = raw.trim();
  if (!text) return null;

  const feetInches = parseFeetInches(text);
  if (feetInches) return feetInches;

  const m = text.match(/^(\d+(?:\.\d+)?)\s*(ft|feet|foot|in|inch|inches|mm|cm|m|meter|metre|meters|metres)?$/i);
  if (!m) return null;

  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;

  const unit = inferUnit(m[2], fallbackUnit);
  return normalizeLength(raw, value, unit);
}

function contextWindow(text: string, start: number, end: number): string {
  return text.slice(Math.max(0, start - 70), Math.min(text.length, end + 70)).trim();
}

function pairConfidence(intent: BuildSetuDimensionIntent, raw: string): "high" | "medium" | "low" {
  if (intent === "plot" || intent === "room") return "high";
  if (/(ft|feet|foot|'|mm|cm|meter|metre|m)/i.test(raw)) return "high";
  if (/x|by|\*/i.test(raw)) return "medium";
  return "low";
}

function makePair(raw: string, leftRaw: string, rightRaw: string, fallbackUnit: BuildSetuDimensionUnit, nearbyText: string): BuildSetuDimensionPair | null {
  const width = parseLength(leftRaw, fallbackUnit);
  const depth = parseLength(rightRaw, fallbackUnit);

  if (!width || !depth || width.feet == null || depth.feet == null) return null;

  const areaSqFt = round(width.feet * depth.feet, 2);
  const areaSqM = round(areaSqFt * 0.092903, 2);
  const intent = detectIntent(nearbyText);

  return {
    raw,
    intent,
    width,
    depth,
    areaSqFt,
    areaSqM,
    confidence: pairConfidence(intent, raw),
    nearbyText,
  };
}

function dedupePairs(pairs: BuildSetuDimensionPair[]): BuildSetuDimensionPair[] {
  const seen = new Set<string>();
  const out: BuildSetuDimensionPair[] = [];

  for (const p of pairs) {
    const key = [
      p.raw.toLowerCase(),
      p.intent,
      p.width.feet,
      p.depth.feet,
      p.nearbyText.toLowerCase().slice(0, 40),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }

  return out;
}

function dedupeSingles(singles: BuildSetuDimensionSingle[]): BuildSetuDimensionSingle[] {
  const seen = new Set<string>();
  const out: BuildSetuDimensionSingle[] = [];

  for (const s of singles) {
    const key = [
      s.raw.toLowerCase(),
      s.intent,
      s.length.feet,
      s.nearbyText.toLowerCase().slice(0, 40),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

export function understandBuildSetuDimensions(inputText: string): BuildSetuDimensionUnderstandingResult {
  const sourceText = normalizeWhitespace(inputText);
  const pairs: BuildSetuDimensionPair[] = [];
  const singles: BuildSetuDimensionSingle[] = [];
  const warnings: string[] = [];

  if (!sourceText) {
    return {
      sourceText,
      pairs,
      singles,
      plotCandidates: [],
      roomCandidates: [],
      warnings: ["No input text found for dimension extraction."],
      summary: {
        totalPairs: 0,
        totalSingles: 0,
        hasPlotDimension: false,
        hasRoomDimension: false,
        primaryPlotAreaSqFt: null,
      },
    };
  }

  const pairPatterns = [
    /((?:\d+(?:\.\d+)?\s*'\s*\d*(?:\.\d+)?\s*(?:"|in|inch|inches)?|\d+(?:\.\d+)?\s*(?:ft|feet|foot|mm|cm|m|meter|metre|meters|metres)?))\s*(?:x|by|\*)\s*((?:\d+(?:\.\d+)?\s*'\s*\d*(?:\.\d+)?\s*(?:"|in|inch|inches)?|\d+(?:\.\d+)?\s*(?:ft|feet|foot|mm|cm|m|meter|metre|meters|metres)?))/gi,
  ];

  for (const pattern of pairPatterns) {
    for (const match of sourceText.matchAll(pattern)) {
      const raw = match[0];
      const start = match.index || 0;
      const end = start + raw.length;
      const nearbyText = contextWindow(sourceText, start, end);

      const hasExplicitMetric = /(mm|cm|meter|metre|meters|metres|\bm\b)/i.test(raw);
      const fallbackUnit: BuildSetuDimensionUnit = hasExplicitMetric ? "m" : "ft";

      const pair = makePair(raw, match[1], match[2], fallbackUnit, nearbyText);
      if (pair) pairs.push(pair);
    }
  }

  const singlePattern = /(\d+(?:\.\d+)?\s*(?:ft|feet|foot|mm|cm|m|meter|metre|meters|metres|in|inch|inches)|\d+(?:\.\d+)?\s*'\s*\d*(?:\.\d+)?\s*(?:"|in|inch|inches)?)/gi;

  for (const match of sourceText.matchAll(singlePattern)) {
    const raw = match[0];
    const start = match.index || 0;
    const end = start + raw.length;
    const nearbyText = contextWindow(sourceText, start, end);
    const intent = detectIntent(nearbyText);
    const length = parseLength(raw, "ft");

    if (!length) continue;

    singles.push({
      raw,
      intent,
      length,
      confidence: intent === "unknown" ? "medium" : "high",
      nearbyText,
    });
  }

  const cleanPairs = dedupePairs(pairs);
  const cleanSingles = dedupeSingles(singles);

  const plotCandidates = cleanPairs.filter((p) => p.intent === "plot");
  const roomCandidates = cleanPairs.filter((p) => p.intent === "room");

  const primaryPlotAreaSqFt =
    plotCandidates[0]?.areaSqFt ??
    cleanPairs.find((p) => p.areaSqFt != null && p.areaSqFt >= 100)?.areaSqFt ??
    null;

  if (!plotCandidates.length) {
    warnings.push("Plot dimension not confidently detected. Ask user for plot width and depth.");
  }

  if (cleanPairs.some((p) => p.confidence !== "high")) {
    warnings.push("Some dimensions were detected without strong nearby context. Confirm whether they are plot, room, setback, door/window, or furniture dimensions.");
  }

  return {
    sourceText,
    pairs: cleanPairs,
    singles: cleanSingles,
    plotCandidates,
    roomCandidates,
    warnings,
    summary: {
      totalPairs: cleanPairs.length,
      totalSingles: cleanSingles.length,
      hasPlotDimension: plotCandidates.length > 0,
      hasRoomDimension: roomCandidates.length > 0,
      primaryPlotAreaSqFt,
    },
  };
}

export function buildDimensionUnderstandingPromptBlock(inputText: string): string {
  const result = understandBuildSetuDimensions(inputText);

  const pairLines = result.pairs.slice(0, 12).map((p, index) => {
    return `${index + 1}. ${p.raw} => ${p.width.feet ?? "?"} ft x ${p.depth.feet ?? "?"} ft, area ${p.areaSqFt ?? "?"} sq ft, intent ${p.intent}, confidence ${p.confidence}`;
  });

  const singleLines = result.singles.slice(0, 12).map((s, index) => {
    return `${index + 1}. ${s.raw} => ${s.length.feet ?? "?"} ft / ${s.length.mm ?? "?"} mm, intent ${s.intent}, confidence ${s.confidence}`;
  });

  return [
    "DIMENSION UNDERSTANDING:",
    `- Total dimension pairs: ${result.summary.totalPairs}`,
    `- Total single dimensions: ${result.summary.totalSingles}`,
    `- Plot dimension detected: ${result.summary.hasPlotDimension ? "yes" : "no"}`,
    `- Room dimension detected: ${result.summary.hasRoomDimension ? "yes" : "no"}`,
    `- Primary plot area sq ft: ${result.summary.primaryPlotAreaSqFt ?? "unknown"}`,
    pairLines.length ? "Dimension pairs:\n" + pairLines.join("\n") : "Dimension pairs: none",
    singleLines.length ? "Single dimensions:\n" + singleLines.join("\n") : "Single dimensions: none",
    result.warnings.length ? "Dimension warnings:\n- " + result.warnings.join("\n- ") : "Dimension warnings: none",
  ].join("\n");
}
