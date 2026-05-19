import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
  status: "PRELIMINARY_DRAFT" | "ENGINEER_REVIEW_REQUIRED";
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
      "BBS tabhi generate karein jab beam/slab/column/footing reinforcement details available ho.",
      "Bar diameter, spacing, cutting length, hooks, bends and lap lengths engineer drawing ke basis par enter karein.",
      "AI-generated BBS is draft only unless matched with approved reinforcement drawing.",
      "BOQ/BBS quantities drawing revision ke saath update karni hongi.",
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = {
      projectName: safe(body.projectName, "Structure Draft"),
      city: safe(body.city, "Raipur"),
      plotSize: safe(body.plotSize, "30x40 ft"),
      floors: safe(body.floors, "G+1"),
      buildingType: safe(body.buildingType, "Residential"),
      soilType: safe(body.soilType, "Unknown / to be tested"),
      span: safe(body.span, "10-12 ft typical room span"),
      requirement: safe(body.requirement, "Preliminary structure planning draft with column grid, beam slab notes and engineer checklist."),
    };

    const record: StructureRecord = {
      id: id(),
      createdAt: new Date().toISOString(),
      ...input,
      status: "ENGINEER_REVIEW_REQUIRED",
      draft: makeDraft(input),
    };

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
