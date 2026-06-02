import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProjectPlanLock } from "@/lib/planning/project-plan-lock";

type RateMasterCity = {
  cityMultiplier?: number;
  labourMultiplier?: number;
  materialMultiplier?: number;
};

type RateMasterItem = {
  itemCode: string;
  category: string;
  description: string;
  unit: string;
  quantityBasis: "plotArea" | "builtUpArea" | "lumpSum";
  quantityFactor: number;
  rate: number;
  rateType: "material" | "labour" | "materialLabour" | "percentage";
  percentageOfSubtotal?: number;
  drawingRef: string;
};

type RateMaster = {
  version: string;
  source: string;
  note: string;
  currency: string;
  defaultCity: string;
  cities: Record<string, RateMasterCity>;
  qualityMultipliers: Record<string, number>;
  projectTypeMultipliers: Record<string, number>;
  items: RateMasterItem[];
};

type GeneratedBoqItem = {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  status: string;
  drawingRef: string;
};

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function readFirstNumber(project: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = project?.[key];
    const numberValue = toNumber(value, 0);
    if (numberValue > 0) return numberValue;
  }
  return fallback;
}

function parseDimensionText(text: string) {
  const normalized = text.replace(/×/g, "x");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)/i);

  if (!match) return { width: 0, length: 0, area: 0 };

  const width = Number(match[1]);
  const length = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(length)) {
    return { width: 0, length: 0, area: 0 };
  }

  return {
    width,
    length,
    area: round2(width * length),
  };
}

function inferFloors(project: any, title: string) {
  const directFloors = readFirstNumber(project, [
    "floors",
    "floorCount",
    "numberOfFloors",
    "totalFloors",
    "storeys",
    "stories",
  ]);

  if (directFloors > 0) return Math.max(1, Math.min(20, Math.round(directFloors)));

  const gPlusMatch = title.match(/g\s*\+\s*(\d+)/i);
  if (gPlusMatch) return Math.max(1, Math.min(20, Number(gPlusMatch[1]) + 1));

  const floorMatch = title.match(/(\d+)\s*(?:floor|floors|storey|storeys|story|stories)/i);
  if (floorMatch) return Math.max(1, Math.min(20, Number(floorMatch[1])));

  if (/duplex/i.test(title)) return 2;
  if (/villa/i.test(title)) return 2;

  return 1;
}

function inferCity(project: any, title: string, rateMaster: RateMaster) {
  const text = `${title} ${project?.location || ""} ${project?.city || ""} ${project?.address || ""}`.toLowerCase();

  for (const city of Object.keys(rateMaster.cities)) {
    if (city !== "Default" && text.includes(city.toLowerCase())) return city;
  }

  return rateMaster.defaultCity || "Default";
}

function inferQuality(project: any, title: string, rateMaster: RateMaster) {
  const text = `${title} ${project?.quality || ""} ${project?.finishQuality || ""} ${project?.package || ""}`.toLowerCase();

  if (text.includes("luxury")) return "Luxury";
  if (text.includes("premium")) return "Premium";
  if (text.includes("basic") || text.includes("economy")) return "Basic";
  if (rateMaster.qualityMultipliers.Standard) return "Standard";

  return Object.keys(rateMaster.qualityMultipliers)[0] || "Standard";
}

function inferProjectType(project: any, title: string, rateMaster: RateMaster) {
  const direct = String(project?.projectType || project?.type || "").trim();
  const text = `${title} ${direct}`.toLowerCase();

  if (text.includes("commercial") || text.includes("office") || text.includes("shop")) return "Commercial";
  if (text.includes("interior")) return "Interior";
  if (text.includes("renovation") || text.includes("repair")) return "Renovation";
  if (text.includes("warehouse") || text.includes("shed")) return "Warehouse";
  if (rateMaster.projectTypeMultipliers.Residential) return "Residential";

  return Object.keys(rateMaster.projectTypeMultipliers)[0] || "Residential";
}

function inferAreas(project: any) {
  const title = String(project?.title || project?.name || "");
  const dimensions = parseDimensionText(title);

  const width = readFirstNumber(project, ["plotWidth", "width", "siteWidth"]) || dimensions.width;
  const length = readFirstNumber(project, ["plotLength", "length", "siteLength"]) || dimensions.length;

  const directPlotArea = readFirstNumber(project, [
    "plotArea",
    "area",
    "siteArea",
    "landArea",
    "plotSize",
  ]);

  const plotArea = directPlotArea || (width && length ? width * length : dimensions.area) || 1200;
  const floors = inferFloors(project, title);

  const directBuiltUpArea = readFirstNumber(project, [
    "builtUpArea",
    "builtupArea",
    "constructionArea",
    "totalBuiltUpArea",
    "coveredArea",
  ]);

  const coverage = Math.min(0.9, Math.max(0.45, readFirstNumber(project, ["coverage", "coverageRatio"], 0.78)));
  const builtUpArea = directBuiltUpArea || round2(plotArea * coverage * floors);

  return {
    title,
    width,
    length,
    plotArea: round2(plotArea),
    floors,
    builtUpArea: round2(builtUpArea),
    coverage,
  };
}

async function loadRateMaster(): Promise<RateMaster> {
  const filePath = join(process.cwd(), "data/generated/boq-rate-master.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as RateMaster;
}

function getRateMultiplier(rateType: RateMasterItem["rateType"], cityConfig: RateMasterCity) {
  if (rateType === "labour") return cityConfig.labourMultiplier || cityConfig.cityMultiplier || 1;
  if (rateType === "material") return cityConfig.materialMultiplier || cityConfig.cityMultiplier || 1;
  if (rateType === "materialLabour") return cityConfig.cityMultiplier || 1;
  return 1;
}

function getQuantity(item: RateMasterItem, area: ReturnType<typeof inferAreas>) {
  if (item.quantityBasis === "plotArea") return area.plotArea * item.quantityFactor;
  if (item.quantityBasis === "builtUpArea") return area.builtUpArea * item.quantityFactor;
  return item.quantityFactor || 1;
}


// BUILDSETU_LOCKED_PLAN_BOQ_V1
function lockedBoqNum(value: any, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function lockedBoqRound2(value: number) {
  return Math.round(value * 100) / 100;
}

function lockedBoqText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lockedBoqParseFloors(lock: any, project: any) {
  const text = lockedBoqText([
    lock?.basePlan?.floors,
    lock?.baseAsset?.prompt,
    lock?.baseAsset?.summary,
    project?.title,
    project?.projectType,
    project?.description,
  ].filter(Boolean).join(" "));

  const gPlus = text.match(/\bG\s*\+\s*([0-9]+)\b/i);
  if (gPlus) return Math.max(1, Number(gPlus[1]) + 1);

  const floorsLabel = text.match(/Floors:\s*([A-Za-z0-9+\s-]+)/i);
  if (floorsLabel) {
    const g = floorsLabel[1].match(/G\s*\+\s*([0-9]+)/i);
    if (g) return Math.max(1, Number(g[1]) + 1);
    const n = floorsLabel[1].match(/([0-9]+)/);
    if (n) return Math.max(1, Number(n[1]));
  }

  return 1;
}

function lockedBoqRoomArea(room: any) {
  const w = lockedBoqNum(room?.w, 0);
  const h = lockedBoqNum(room?.h, 0);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

function buildLockedPlanBoqArea(lock: any, project: any) {
  if (!lock?.basePlan) return null;

  const plan = lock.basePlan || {};
  const rooms = Array.isArray(plan.rooms) ? plan.rooms : [];

  const widthFt = lockedBoqNum(plan.widthFt || plan.plotWidthFt, 0);
  const depthFt = lockedBoqNum(plan.depthFt || plan.plotDepthFt, 0);

  if (!widthFt || !depthFt) return null;

  const plotArea = lockedBoqRound2(widthFt * depthFt);
  const floors = lockedBoqParseFloors(lock, project);

  const nonParkingRooms = rooms.filter((room: any) => {
    const text = lockedBoqText(`${room?.kind || ""} ${room?.name || ""}`).toLowerCase();
    return !/parking|porch|open/.test(text);
  });

  const groundBuiltAreaRaw = nonParkingRooms.reduce(
    (sum: number, room: any) => sum + lockedBoqRoomArea(room),
    0,
  );

  const groundBuiltArea = groundBuiltAreaRaw > 0
    ? Math.min(plotArea * 0.8, Math.max(plotArea * 0.55, groundBuiltAreaRaw))
    : plotArea * 0.72;

  const coverage = lockedBoqRound2(groundBuiltArea / plotArea);
  const builtUpArea = lockedBoqRound2(groundBuiltArea * floors);

  return {
    title: lockedBoqText(plan.projectTitle || project?.title || "Locked Project Plan"),
    plotArea,
    builtUpArea,
    floors,
    coverage,
    widthFt,
    depthFt,
    facing: plan.facing || "",
    roomCount: rooms.length,
    bedrooms: plan.bedrooms || rooms.filter((r: any) => /bed/i.test(`${r?.kind} ${r?.name}`)).length,
    bathrooms: plan.bathrooms || rooms.filter((r: any) => /toilet|bath/i.test(`${r?.kind} ${r?.name}`)).length,
    source: "locked_plan_boq_v1",
    lockedPlanId: lock.id,
    baseAssetId: lock?.baseAsset?.id || "",
    baseImageUrl: lock?.baseImageUrl || lock?.baseAsset?.imageUrl || "",
  };
}


function buildRateMasterBoq(project: any, rateMaster: RateMaster, lockedAreaOverride?: any) {
  const area = lockedAreaOverride || inferAreas(project);
  const city = inferCity(project, area.title, rateMaster);
  const quality = inferQuality(project, area.title, rateMaster);
  const projectType = inferProjectType(project, area.title, rateMaster);

  const cityConfig = rateMaster.cities[city] || rateMaster.cities[rateMaster.defaultCity] || { cityMultiplier: 1 };
  const qualityMultiplier = rateMaster.qualityMultipliers[quality] || 1;
  const projectTypeMultiplier = rateMaster.projectTypeMultipliers[projectType] || 1;

  const items: GeneratedBoqItem[] = [];
  let subtotal = 0;

  for (const rateItem of rateMaster.items) {
    if (rateItem.rateType === "percentage") continue;

    const quantity = Math.max(1, round2(getQuantity(rateItem, area)));
    const rateMultiplier = getRateMultiplier(rateItem.rateType, cityConfig);
    const rate = round2(rateItem.rate * rateMultiplier * qualityMultiplier * projectTypeMultiplier);
    const amount = round2(quantity * rate);

    subtotal += amount;

    items.push({
      itemCode: rateItem.itemCode,
      description: rateItem.description,
      unit: rateItem.unit,
      quantity,
      rate,
      amount,
      status: "AI Final Draft - Review Required",
      drawingRef: rateItem.drawingRef,
    });
  }

  for (const rateItem of rateMaster.items) {
    if (rateItem.rateType !== "percentage") continue;

    const quantity = 1;
    const percentage = rateItem.percentageOfSubtotal || 0;
    const amount = round2((subtotal * percentage) / 100);
    const rate = amount;

    items.push({
      itemCode: rateItem.itemCode,
      description: rateItem.description,
      unit: rateItem.unit,
      quantity,
      rate,
      amount,
      status: "AI Final Draft - Review Required",
      drawingRef: rateItem.drawingRef,
    });
  }

  const totalAmount = round2(items.reduce((sum, item) => sum + item.amount, 0));

  return {
    area,
    city,
    quality,
    projectType,
    rateMasterVersion: rateMaster.version,
    rateSource: rateMaster.source,
    rateNote: rateMaster.note,
    totalAmount,
    items,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const projectId = body && typeof body === "object" ? String((body as any).projectId || "") : "";

    if (!projectId) {
      return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
    }

    const project: any = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const rateMaster = await loadRateMaster();
    const projectPlanLock = await getProjectPlanLock(projectId).catch(() => null);
    const lockedAreaOverride = buildLockedPlanBoqArea(projectPlanLock, project);
    const generated = buildRateMasterBoq(project, rateMaster, lockedAreaOverride);

    await prisma.bOQItem.deleteMany({
      where: {
        projectId,
        NOT: {
          OR: [
            { drawingRef: { contains: "Manual" } },
            { itemCode: { startsWith: "M-" } },
          ],
        },
      },
    });

    for (const item of generated.items) {
      await prisma.bOQItem.create({
        data: {
          projectId,
          itemCode: item.itemCode,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          status: item.status,
          drawingRef: item.drawingRef,
        },
      });
    }

    const items = await prisma.bOQItem.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    const totalAmount = round2(items.reduce((sum, item) => sum + Number(item.amount || 0), 0));

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
      totalAmount,
      estimateInputs: {
        source: generated.area.source || "rate_master_project_fields",
        lockedPlanId: generated.area.lockedPlanId || null,
        baseAssetId: generated.area.baseAssetId || null,
        baseImageUrl: generated.area.baseImageUrl || null,
        widthFt: generated.area.widthFt || null,
        depthFt: generated.area.depthFt || null,
        roomCount: generated.area.roomCount || null,
        bedrooms: generated.area.bedrooms || null,
        bathrooms: generated.area.bathrooms || null,
        plotArea: generated.area.plotArea,
        builtUpArea: generated.area.builtUpArea,
        floors: generated.area.floors,
        coverage: generated.area.coverage,
        city: generated.city,
        quality: generated.quality,
        projectType: generated.projectType,
      },
      rateSource: {
        source: generated.rateSource,
        version: generated.rateMasterVersion,
        note: generated.rateNote,
      },
    });
  } catch (error) {
    console.error("BOQ_GENERATE_RATE_MASTER_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to generate rate-master based BOQ" }, { status: 500 });
  }
}
