import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type DynamicBoqItem = {
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

  if (directFloors > 0) return Math.max(1, Math.min(10, Math.round(directFloors)));

  const gPlusMatch = title.match(/g\s*\+\s*(\d+)/i);
  if (gPlusMatch) return Math.max(1, Math.min(10, Number(gPlusMatch[1]) + 1));

  const floorMatch = title.match(/(\d+)\s*(?:floor|floors|storey|storeys|story|stories)/i);
  if (floorMatch) return Math.max(1, Math.min(10, Number(floorMatch[1])));

  if (/duplex/i.test(title)) return 2;
  if (/villa/i.test(title)) return 2;

  return 1;
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
  };
}

function inferBaseRate(project: any, title: string) {
  const directRate = readFirstNumber(project, [
    "ratePerSqft",
    "budgetRate",
    "constructionRate",
    "estimatedRate",
  ]);

  if (directRate > 0) return directRate;

  const text = `${title} ${project?.projectType || ""} ${project?.type || ""}`.toLowerCase();

  let rate = 1850;

  if (text.includes("commercial") || text.includes("office") || text.includes("shop")) rate = 2450;
  if (text.includes("interior")) rate = 1250;
  if (text.includes("renovation") || text.includes("repair")) rate = 950;
  if (text.includes("warehouse") || text.includes("shed")) rate = 1350;
  if (text.includes("premium") || text.includes("luxury")) rate *= 1.28;
  if (text.includes("basic") || text.includes("economy")) rate *= 0.82;

  return Math.round(rate);
}

function makeItem(
  itemCode: string,
  description: string,
  unit: string,
  quantity: number,
  amount: number,
  drawingRef: string,
): DynamicBoqItem {
  const safeQuantity = Math.max(1, round2(quantity));
  const safeAmount = Math.max(0, round2(amount));
  const rate = round2(safeAmount / safeQuantity);

  return {
    itemCode,
    description,
    unit,
    quantity: safeQuantity,
    rate,
    amount: safeAmount,
    status: "Review Required",
    drawingRef,
  };
}

function buildDynamicBoq(project: any) {
  const area = inferAreas(project);
  const baseRate = inferBaseRate(project, area.title);
  const totalBudget = round2(area.builtUpArea * baseRate);

  const items: DynamicBoqItem[] = [
    makeItem("1.01", "Site clearing, layout marking and temporary setup", "Sqft", area.plotArea, totalBudget * 0.025, "AI-BOQ-SITE"),
    makeItem("1.02", "Earthwork excavation and foundation trenching", "Cum", area.builtUpArea * 0.035, totalBudget * 0.06, "AI-BOQ-FOUNDATION"),
    makeItem("2.01", "PCC bed and levelling course", "Cum", area.builtUpArea * 0.018, totalBudget * 0.045, "AI-BOQ-PCC"),
    makeItem("2.02", "RCC concrete for footing, column, beam and slab", "Cum", area.builtUpArea * 0.085, totalBudget * 0.18, "AI-BOQ-RCC"),
    makeItem("2.03", "Reinforcement steel cutting, bending and placing", "Kg", area.builtUpArea * 3.8, totalBudget * 0.16, "AI-BOQ-STEEL"),
    makeItem("3.01", "Brick/block masonry work", "Sqft", area.builtUpArea * 0.75, totalBudget * 0.105, "AI-BOQ-MASONRY"),
    makeItem("4.01", "Internal and external plaster", "Sqft", area.builtUpArea * 2.25, totalBudget * 0.075, "AI-BOQ-PLASTER"),
    makeItem("4.02", "Flooring and skirting work", "Sqft", area.builtUpArea * 0.88, totalBudget * 0.105, "AI-BOQ-FLOORING"),
    makeItem("5.01", "Electrical conduiting, wiring, fixtures and DB points", "Sqft", area.builtUpArea, totalBudget * 0.075, "AI-BOQ-ELECTRICAL"),
    makeItem("5.02", "Plumbing, sanitary lines, CP fittings and fixtures", "Sqft", area.builtUpArea, totalBudget * 0.07, "AI-BOQ-PLUMBING"),
    makeItem("6.01", "Doors, windows, grills and hardware", "Sqft", area.builtUpArea, totalBudget * 0.07, "AI-BOQ-JOINERY"),
    makeItem("7.01", "Putty, primer and painting work", "Sqft", area.builtUpArea * 2.25, totalBudget * 0.055, "AI-BOQ-PAINT"),
  ];

  const currentTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const contingency = Math.max(0, totalBudget - currentTotal);

  items.push(makeItem("8.01", "Wastage, handling, tools, supervision and contingency", "Lump Sum", 1, contingency, "AI-BOQ-CONTINGENCY"));

  return {
    area,
    baseRate,
    totalBudget: round2(items.reduce((sum, item) => sum + item.amount, 0)),
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

    const generated = buildDynamicBoq(project);

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

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
      totalAmount: round2(totalAmount),
      estimateInputs: {
        plotArea: generated.area.plotArea,
        builtUpArea: generated.area.builtUpArea,
        floors: generated.area.floors,
        baseRate: generated.baseRate,
      },
    });
  } catch (error) {
    console.error("BOQ_GENERATE_DYNAMIC_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to generate dynamic BOQ" }, { status: 500 });
  }
}
