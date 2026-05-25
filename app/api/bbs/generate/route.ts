import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type BbsRow = {
  memberType: string;
  memberId: string;
  barMark: string;
  diameter: number;
  shapeCode: string;
  bars: number;
  cuttingLength: number;
  totalLength: number;
  unitWeight: number;
  totalWeight: number;
  drawingRef: string;
  status: string;
};

function round2(value: number) {
  return Number(value.toFixed(2));
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function unitWeight(diameter: number) {
  return round2((diameter * diameter) / 162);
}

function parseDimensionText(text: string) {
  const normalized = text.replace(/×/g, "x").replace(/'/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)/i);

  if (!match) return { width: 0, length: 0, area: 0 };

  const width = Number(match[1]);
  const length = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(length)) {
    return { width: 0, length: 0, area: 0 };
  }

  return { width, length, area: round2(width * length) };
}

function readFirstNumber(project: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const numberValue = toNumber(project?.[key], 0);
    if (numberValue > 0) return numberValue;
  }
  return fallback;
}

function inferFloors(project: any, title: string) {
  const directFloors = readFirstNumber(project, ["floors", "floorCount", "numberOfFloors", "totalFloors", "storeys", "stories"]);
  if (directFloors > 0) return Math.max(1, Math.min(20, Math.round(directFloors)));

  const gPlusMatch = title.match(/g\s*\+\s*(\d+)/i);
  if (gPlusMatch) return Math.max(1, Math.min(20, Number(gPlusMatch[1]) + 1));

  const floorMatch = title.match(/(\d+)\s*(?:floor|floors|storey|storeys|story|stories)/i);
  if (floorMatch) return Math.max(1, Math.min(20, Number(floorMatch[1])));

  if (/duplex|villa/i.test(title)) return 2;
  return 1;
}

function inferProjectAreas(project: any) {
  const title = String(project?.title || project?.name || "");
  const dimensions = parseDimensionText(title);

  const width = readFirstNumber(project, ["plotWidth", "width", "siteWidth"]) || dimensions.width;
  const length = readFirstNumber(project, ["plotLength", "length", "siteLength"]) || dimensions.length;
  const directPlotArea = readFirstNumber(project, ["plotArea", "area", "siteArea", "landArea", "plotSize"]);

  const plotArea = directPlotArea || (width && length ? width * length : dimensions.area) || 1200;
  const floors = inferFloors(project, title);

  const directBuiltUpArea = readFirstNumber(project, ["builtUpArea", "builtupArea", "constructionArea", "totalBuiltUpArea", "coveredArea"]);
  const coverage = Math.min(0.9, Math.max(0.45, readFirstNumber(project, ["coverage", "coverageRatio"], 0.78)));
  const builtUpArea = directBuiltUpArea || round2(plotArea * coverage * floors);

  return {
    title,
    width,
    length,
    plotArea: round2(plotArea),
    floors,
    coverage,
    builtUpArea: round2(builtUpArea),
  };
}

function inferSteelFactor(project: any, title: string) {
  const directFactor = readFirstNumber(project, ["steelFactor", "steelKgPerSqft", "bbsSteelFactor"], 0);
  if (directFactor > 0) return directFactor;

  const text = `${title} ${project?.projectType || ""} ${project?.type || ""}`.toLowerCase();
  let factor = 3.8;

  if (text.includes("commercial") || text.includes("office") || text.includes("shop")) factor = 4.6;
  if (text.includes("warehouse") || text.includes("shed")) factor = 2.8;
  if (text.includes("premium") || text.includes("heavy")) factor *= 1.12;
  if (text.includes("basic") || text.includes("economy")) factor *= 0.9;

  return round2(factor);
}

function buildRows(project: any) {
  const area = inferProjectAreas(project);
  const steelFactor = inferSteelFactor(project, area.title);
  const targetSteelWeight = round2(area.builtUpArea * steelFactor);
  const floorFactor = Math.max(1, area.floors);
  const root = Math.sqrt(area.plotArea);

  const templates = [
    ["Footing", "F1", "F1-BTM-16-01", 16, "L", round2(Math.max(3.8, Math.min(6.2, root / 12))), 0.13, "EST-BBS-FOOTING-BOTTOM"],
    ["Footing", "F1", "F1-TOP-12-01", 12, "Straight", round2(Math.max(3.6, Math.min(5.8, root / 13))), 0.08, "EST-BBS-FOOTING-TOP"],
    ["Footing", "F1", "F1-STP-10-01", 10, "Stirrup", 1.35, 0.04, "EST-BBS-FOOTING-STIRRUP"],
    ["Column", "C1", "C1-VERT-16-01", 16, "Straight", round2(3.6 * floorFactor), 0.1, "EST-BBS-COLUMN-VERTICAL"],
    ["Column", "C1", "C1-TIE-08-01", 8, "Stirrup/Tie", 1.25, 0.08, "EST-BBS-COLUMN-TIE"],
    ["Beam", "B1", "B1-TOP-12-01", 12, "Bent", round2(Math.max(4.2, Math.min(6.4, root / 11))), 0.09, "EST-BBS-BEAM-TOP"],
    ["Beam", "B1", "B1-BOT-16-01", 16, "Straight", round2(Math.max(4.4, Math.min(6.8, root / 10.5))), 0.08, "EST-BBS-BEAM-BOTTOM"],
    ["Beam", "B1", "B1-STP-08-01", 8, "Stirrup", 1.35, 0.05, "EST-BBS-BEAM-STIRRUP"],
    ["Slab", "S1", "S1-MAIN-10-01", 10, "Straight", round2(Math.max(3.8, Math.min(5.2, root / 14))), 0.16, "EST-BBS-SLAB-MAIN"],
    ["Slab", "S1", "S1-DIST-08-01", 8, "Straight", round2(Math.max(3.2, Math.min(4.8, root / 15))), 0.12, "EST-BBS-SLAB-DISTRIBUTION"],
    ["Slab", "S1", "S1-CHAIR-12-01", 12, "Chair", 1.2, 0.02, "EST-BBS-SLAB-CHAIR"],
    ["Staircase", "ST1", "ST1-MAIN-12-01", 12, "Bent", 4.2, 0.04, "EST-BBS-STAIRCASE-MAIN"],
    ["Staircase", "ST1", "ST1-DIST-08-01", 8, "Straight", 3.1, 0.03, "EST-BBS-STAIRCASE-DISTRIBUTION"],
  ] as const;

  const rows: BbsRow[] = templates.map((template) => {
    const [memberType, memberId, barMark, diameter, shapeCode, cuttingLength, weightShare, drawingRef] = template;
    const targetWeight = targetSteelWeight * weightShare;
    const uw = unitWeight(diameter);
    const bars = Math.max(1, Math.round(targetWeight / Math.max(0.01, uw * cuttingLength)));
    const totalLength = round2(bars * cuttingLength);
    const totalWeight = round2(totalLength * uw);

    return {
      memberType,
      memberId,
      barMark,
      diameter,
      shapeCode,
      bars,
      cuttingLength,
      totalLength,
      unitWeight: uw,
      totalWeight,
      drawingRef,
      status: "Engineer Review Required",
    };
  });

  return {
    area,
    steelFactor,
    targetSteelWeight,
    rows,
  };
}

function getBbsModelFieldNames() {
  const model = Prisma.dmmf.datamodel.models.find((item) => item.name === "BBSItem");
  return new Set((model?.fields || []).map((field) => field.name));
}

function assignFirstAvailable(target: Record<string, unknown>, fields: Set<string>, names: string[], value: unknown) {
  const name = names.find((fieldName) => fields.has(fieldName));
  if (name) target[name] = value;
}

function toCreateData(projectId: string, row: BbsRow) {
  const fields = getBbsModelFieldNames();
  const data: Record<string, unknown> = {};

  if (fields.has("projectId")) data.projectId = projectId;

  assignFirstAvailable(data, fields, ["memberType", "member", "memberCategory"], row.memberType);
  assignFirstAvailable(data, fields, ["memberId", "memberNo", "memberName"], row.memberId);
  assignFirstAvailable(data, fields, ["barMark", "mark", "barCode"], row.barMark);
  assignFirstAvailable(data, fields, ["diameter", "diameterMm", "barDiameter"], row.diameter);
  assignFirstAvailable(data, fields, ["shapeCode", "shape", "barShape"], row.shapeCode);
  assignFirstAvailable(data, fields, ["bars", "barCount", "numberOfBars", "noOfBars", "quantity", "qty"], row.bars);
  assignFirstAvailable(data, fields, ["cuttingLength", "cutLength", "length"], row.cuttingLength);
  assignFirstAvailable(data, fields, ["totalLength", "totalLen"], row.totalLength);
  assignFirstAvailable(data, fields, ["unitWeight", "unitWt", "weightPerMeter"], row.unitWeight);
  assignFirstAvailable(data, fields, ["totalWeight", "totalWt", "weight"], row.totalWeight);
  assignFirstAvailable(data, fields, ["drawingRef", "drawingReference", "ref"], row.drawingRef);
  assignFirstAvailable(data, fields, ["status", "reviewStatus"], row.status);

  return data;
}

function readRowNumber(item: any, names: string[], fallback = 0) {
  for (const name of names) {
    const value = Number(item?.[name]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function summarizeByDiameter(items: any[]) {
  const map = new Map<number, number>();

  for (const item of items) {
    const diameter = readRowNumber(item, ["diameter", "diameterMm", "barDiameter"]);
    const weight = readRowNumber(item, ["totalWeight", "totalWt", "weight"]);

    if (!diameter) continue;
    map.set(diameter, (map.get(diameter) || 0) + weight);
  }

  return Array.from(map.entries()).map(([diameter, totalWeight]) => ({
    diameter,
    totalWeight: round2(totalWeight),
  })).sort((a, b) => a.diameter - b.diameter);
}

function summarizeByMemberType(items: any[]) {
  const map = new Map<string, number>();

  for (const item of items) {
    const memberType = String(item.memberType || item.member || item.memberCategory || "Other");
    const weight = readRowNumber(item, ["totalWeight", "totalWt", "weight"]);

    map.set(memberType, (map.get(memberType) || 0) + weight);
  }

  return Array.from(map.entries()).map(([memberType, totalWeight]) => ({
    memberType,
    totalWeight: round2(totalWeight),
  })).sort((a, b) => b.totalWeight - a.totalWeight);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const projectId = body && typeof body === "object" ? String((body as any).projectId || "") : "";

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    }

    const project: any = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const generated = buildRows(project);

    await prisma.bBSItem.deleteMany({
      where: {
        projectId,
        NOT: {
          OR: [
            { drawingRef: { contains: "Manual" } },
            { barMark: { startsWith: "MANUAL" } },
          ],
        },
      },
    });

    for (const row of generated.rows) {
      await prisma.bBSItem.create({
        data: toCreateData(projectId, row) as any,
      });
    }

    const items = await prisma.bBSItem.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    const totalBars = items.reduce((sum: number, item: any) => sum + readRowNumber(item, ["bars", "barCount", "numberOfBars", "noOfBars", "quantity", "qty"]), 0);
    const totalWeight = round2(items.reduce((sum: number, item: any) => sum + readRowNumber(item, ["totalWeight", "totalWt", "weight"]), 0));
    const wastagePercent = 3;
    const weightWithWastage = round2(totalWeight * (1 + wastagePercent / 100));

    return NextResponse.json({
      ok: true,
      count: items.length,
      items,
      totalBars,
      totalWeight,
      wastagePercent,
      weightWithWastage,
      diameterSummary: summarizeByDiameter(items),
      memberSummary: summarizeByMemberType(items),
      estimateInputs: {
        plotArea: generated.area.plotArea,
        builtUpArea: generated.area.builtUpArea,
        floors: generated.area.floors,
        coverage: generated.area.coverage,
        steelFactor: generated.steelFactor,
        targetSteelWeight: generated.targetSteelWeight,
      },
      disclaimer:
        "Estimated BBS draft generated from project size and steel kg/sq.ft factor. Final bar mark, cutting length, lap length, development length, bend deduction and site execution must be verified by a qualified structural engineer.",
    });
  } catch (error) {
    console.error("BBS_GENERATE_DYNAMIC_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to generate dynamic BBS" }, { status: 500 });
  }
}
