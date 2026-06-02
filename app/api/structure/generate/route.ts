import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getProjectPlanLock } from "@/lib/planning/project-plan-lock";
import { attachUniversalQualityBrainToPrompt } from "@/lib/agent-knowledge/universal-quality-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const DATA_FILE = path.join(DATA_DIR, "structures.json");

type StructureRecord = {
  id: string;
  createdAt: string;
  projectName: string;
  city: string;
  plotSize: string;
  floors: string;
  buildingType: string;
  soilType: string;
  span: string;
  requirement: string;
  status: "AI_FINAL_DRAFT" | "AI_FINAL_DRAFT_ENGINEER_REVIEW_REQUIRED" | "ENGINEER_REVIEW_REQUIRED";
  draft: {
    summary: string;
    columnGrid: string[];
    beamSlabNotes: string[];
    foundationNotes: string[];
    loadPathWarnings: string[];
    engineerChecklist: string[];
    bbsHandoffNotes: string[];
  };
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function id() {
  return `structure_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<StructureRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StructureRecord[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function makeDraft(input: {
  projectName: string;
  city: string;
  plotSize: string;
  floors: string;
  buildingType: string;
  soilType: string;
  span: string;
  requirement: string;
}) {
  const floorsLower = input.floors.toLowerCase();
  const isMultiFloor = floorsLower.includes("g+1") || floorsLower.includes("g+2") || floorsLower.includes("multi") || floorsLower.includes("duplex");

  return {
    summary:
      `${input.projectName} ke liye ${input.plotSize} ${input.floors} ${input.buildingType} ka preliminary structural planning draft generated. ` +
      `Ye construction drawing nahi hai. Column, beam, slab, footing aur reinforcement final karne ke liye qualified structural engineer approval required hai.`,

    columnGrid: [
      "Architectural layout lock hone ke baad column grid finalize karein; staircase, parking aur room clear spans ko grid ke saath coordinate karein.",
      `Approx span input: ${input.span}. Large unsupported spans avoid karein jab tak engineer beam/slab system approve na kare.`,
      "Columns ko walls/corners/intersections ke saath align karna preferable hai, taki beams concealed/functional rahein.",
      "Parking/living area me column obstruction minimize karein, but column removal ya shifting engineer review ke bina na karein.",
      isMultiFloor
        ? "G+1/G+2 structure me vertical column continuity maintain karna important hai."
        : "Single floor structure me future expansion possibility ho to column/footing capacity engineer se check karayein.",
    ],

    beamSlabNotes: [
      "Beam depth/width and reinforcement AI se final nahi hota; engineer span, load and code ke according design karega.",
      "Wet areas, staircase landing, balcony and cantilever zones ko special review chahiye.",
      "Slab thickness and reinforcement live load, span, occupancy and support condition ke basis par finalize hoga.",
      "Openings, ducts and shafts beam/slab reinforcement ko affect kar sakte hain; final drawing me coordinate karein.",
      "Beam-slab layout BOQ/BBS se pehle reviewed structural drawing me lock hona chahiye.",
    ],

    foundationNotes: [
      `Soil type input: ${input.soilType}. Actual footing type soil bearing capacity and site condition ke according finalize hoga.`,
      "Isolated footing common low-rise option ho sakta hai, but raft/combined footing need site and column load par depend karegi.",
      "Neighbouring foundation, drainage, water table and filled soil condition site inspection se verify karein.",
      "Footing depth/size/reinforcement engineer calculation ke bina final nahi karna hai.",
      "Soil test recommended hai, especially G+1/G+2, poor soil, filled plot ya high-load structure ke liye.",
    ],

    loadPathWarnings: [
      "Load path roof/slab se beam, beam se column, column se footing, footing se soil tak continuous hona chahiye.",
      "Floating columns, transfer beams, long cantilevers, large cut-outs and unsupported walls high-risk items hain.",
      "Staircase, balcony, water tank and masonry wall loads special consideration require karte hain.",
      "Architectural changes after structure design BBS/BOQ ko change kar sakte hain.",
      "Construction decision before engineer approval unsafe and non-compliant ho sakta hai.",
    ],

    engineerChecklist: [
      "Architectural plan dimensions and wall layout freeze.",
      "Column grid, beam layout, slab panel and staircase structure review.",
      "Foundation recommendation based on soil/site data.",
      "Load calculation, seismic/wind consideration and local code compliance.",
      "Reinforcement detailing, development length, lap length and bar spacing check.",
      "Final structural drawings stamped/approved by qualified professional.",
    ],

    bbsHandoffNotes: [
      "AI BBS can be generated from structural assumptions and then updated after engineer review.",
      "Bar diameter, spacing, cutting length, hooks, bends and lap lengths engineer drawing ke basis par enter karein.",
      "AI generates structural and BBS final draft with assumptions; engineer verification is required before construction execution.",
      "BOQ/BBS quantities drawing revision ke saath update karni hongi.",
    ],
  };
}


// BUILDSETU_LOCKED_PLAN_STRUCTURE_V3
function lockedStructureNum(value: any, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function lockedStructureRound(value: number) {
  return Math.round(value * 10) / 10;
}

function lockedStructureText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lockedStructureParseFloors(lock: any, body: any) {
  const text = lockedStructureText([
    lock?.basePlan?.floors,
    lock?.baseAsset?.prompt,
    lock?.baseAsset?.summary,
    body?.floors,
    body?.requirement,
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

function lockedStructureRoomSpan(room: any) {
  const w = lockedStructureNum(room?.w, 0);
  const h = lockedStructureNum(room?.h, 0);
  return Math.max(w, h);
}

function buildLockedPlanStructureInput(lock: any, body: any) {
  if (!lock?.basePlan) return {};

  const plan = lock.basePlan || {};
  const rooms = Array.isArray(plan.rooms) ? plan.rooms : [];

  const widthFt = lockedStructureNum(plan.widthFt || plan.plotWidthFt, 0);
  const depthFt = lockedStructureNum(plan.depthFt || plan.plotDepthFt, 0);
  const floors = lockedStructureParseFloors(lock, body);

  const wetRooms = rooms.filter((room: any) => {
    const text = lockedStructureText(`${room?.kind || ""} ${room?.name || ""}`).toLowerCase();
    return /toilet|bath|wash|kitchen|utility/.test(text);
  });

  const stairRooms = rooms.filter((room: any) => {
    const text = lockedStructureText(`${room?.kind || ""} ${room?.name || ""}`).toLowerCase();
    return /stair/.test(text);
  });

  const maxSpanFt = rooms.reduce((max: number, room: any) => Math.max(max, lockedStructureRoomSpan(room)), 0);

  return {
    lockedPlan: true,
    structureSource: "locked_plan_structure_v1",
    lockedPlanId: lock.id,
    baseAssetId: lock?.baseAsset?.id || "",
    baseImageUrl: lock?.baseImageUrl || lock?.baseAsset?.imageUrl || "",
    widthFt,
    depthFt,
    plotArea: widthFt && depthFt ? lockedStructureRound(widthFt * depthFt) : null,
    floors,
    floorLabel: floors === 2 ? "G+1" : `${floors} floor(s)`,
    roomCount: rooms.length,
    bedrooms: plan.bedrooms || rooms.filter((r: any) => /bed/i.test(`${r?.kind} ${r?.name}`)).length,
    bathrooms: plan.bathrooms || rooms.filter((r: any) => /toilet|bath/i.test(`${r?.kind} ${r?.name}`)).length,
    facing: plan.facing || "",
    requiredSpaces: plan.requiredSpaces || [],
    maxSpanFt: lockedStructureRound(maxSpanFt),
    wetRoomCount: wetRooms.length,
    stairCount: stairRooms.length,
    structuralSpanInput: `${lockedStructureRound(maxSpanFt || 12)} ft max architectural span from locked plan`,
    structuralFloorInput: floors === 2 ? "G+1" : `${floors} floor(s)`,
    lockedRooms: rooms.map((room: any) => ({
      id: room?.id || "",
      name: room?.name || "",
      kind: room?.kind || "",
      x: room?.x,
      y: room?.y,
      w: room?.w,
      h: room?.h,
    })),
  };
}

function enhanceStructureDraftWithLockedPlan(draft: any, input: any) {
  if (!input?.lockedPlan) return draft;

  const basis = {
    source: "locked_plan_structure_v1",
    lockedPlanId: input.lockedPlanId,
    baseAssetId: input.baseAssetId,
    baseImageUrl: input.baseImageUrl,
    widthFt: input.widthFt,
    depthFt: input.depthFt,
    plotArea: input.plotArea,
    floors: input.floors,
    floorLabel: input.floorLabel,
    roomCount: input.roomCount,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    maxSpanFt: input.maxSpanFt,
  };

  return {
    ...draft,
    source: "locked_plan_structure_v1",
    lockedPlanId: input.lockedPlanId,
    baseAssetId: input.baseAssetId,
    baseImageUrl: input.baseImageUrl,
    planningBasis: basis,
    columnGrid: [
      `Locked plan basis: ${input.widthFt}' x ${input.depthFt}' ${String(input.facing || "").toUpperCase()} facing, ${input.floorLabel}, ${input.roomCount} rooms.`,
      `Column grid draft: align columns with external walls, room corners, staircase edge, wet-wall stack and major partition intersections.`,
      `Suggested planning grid: approx 10-12 ft bay spacing; avoid clear span above ${input.maxSpanFt || 12} ft without engineer-approved beam sizing.`,
      `Parking/living obstruction check required before final column placement.`,
      ...(Array.isArray(draft?.columnGrid) ? draft.columnGrid : []),
    ],
    beamSlabNotes: [
      `Beam/slab draft derived from locked floor plan, not generic project fields.`,
      `G+1 continuity: maintain vertical column continuity from footing to roof level.`,
      `Slab panels should coordinate with room rectangles and wet zones; final slab thickness/bar spacing requires structural engineer design.`,
      ...(Array.isArray(draft?.beamSlabNotes) ? draft.beamSlabNotes : []),
    ],
    footingNotes: [
      `Footing planning basis uses ${input.plotArea} sqft plot and ${input.floorLabel} load assumption.`,
      `Footing size/depth/reinforcement must be finalized after soil bearing capacity and column load calculation.`,
      ...(Array.isArray(draft?.footingNotes) ? draft.footingNotes : []),
    ],
    bbsHandoffNotes: [
      `BBS handoff source: locked_plan_structure_v1 + locked_plan_bbs_v1.`,
      `Use lockedPlanId ${input.lockedPlanId} for BOQ/BBS/structure coordination.`,
      `AI BBS remains planning draft; final bar marks, lap length, bend deduction and cutting length require engineer-approved RCC drawings.`,
      ...(Array.isArray(draft?.bbsHandoffNotes) ? draft.bbsHandoffNotes : []),
    ],
  };
}



// BUILDSETU_QUALITY_BRAIN_STRUCTURE_V5B
function buildStructureQualityBrainPromptV5B(body: any) {
  const basePrompt = [
    body?.requirement || "",
    `Project: ${body?.projectName || body?.projectTitle || ""}`,
    `City: ${body?.city || ""}`,
    `Plot: ${body?.plotSize || ""}`,
    `Floors: ${body?.floors || ""}`,
    `Building type: ${body?.buildingType || ""}`,
    `Soil: ${body?.soilType || ""}`,
    `Span: ${body?.span || ""}`,
  ].filter(Boolean).join("\n");

  return attachUniversalQualityBrainToPrompt({
    basePrompt,
    projectId: body?.projectId || body?.projectContext?.projectId || "global",
    domain: "structure",
    projectTitle: body?.projectName || body?.projectTitle || "",
    projectContext: body?.projectContext || body,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const structureQualityBrainPromptV5B = buildStructureQualityBrainPromptV5B(body);

    
    const bodyProjectIdForLock = String((body as any)?.projectId || "").trim();
    const projectPlanLock = bodyProjectIdForLock
      ? await getProjectPlanLock(bodyProjectIdForLock).catch(() => null)
      : null;
    const lockedStructureInput = buildLockedPlanStructureInput(projectPlanLock, body);
const input = {
      
      ...lockedStructureInput,projectName: safe(body.projectName, "Structure Draft"),
      city: safe(body.city, "Raipur"),
      plotSize: safe(body.plotSize, "30x40 ft"),
      floors: safe(body.floors, "G+1"),
      buildingType: safe(body.buildingType, "Residential"),
      soilType: safe(body.soilType, "Unknown / to be tested"),
      span: safe(body.span, "10-12 ft typical room span"),
      requirement: safe(structureQualityBrainPromptV5B, "Preliminary structural planning with engineer review required."),
    };

    const record: StructureRecord = {
      id: id(),
      createdAt: new Date().toISOString(),
      ...input,
      status: "AI_FINAL_DRAFT_ENGINEER_REVIEW_REQUIRED",
      draft: enhanceStructureDraftWithLockedPlan(makeDraft(input), input),
    };

    // BUILDSETU_STRUCTURE_RECORD_PROJECT_INPUT_V1
    // Persist project linkage and full input so project workspace/list can find this structure record.
    (input as any).projectId = bodyProjectIdForLock;
    (record as any).projectId = bodyProjectIdForLock;
    (record as any).input = input;
    (record as any).source = (input as any).structureSource || (record as any)?.draft?.source || "structure_route";

    const items = await readAll();
    items.unshift(record);
    await writeAll(items.slice(0, 200));

    return NextResponse.json({ ok: true, structure: record });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate structure draft" },
      { status: 500 }
    );
  }
}
