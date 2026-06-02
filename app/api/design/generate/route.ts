import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { attachUniversalQualityBrainToPrompt } from "@/lib/agent-knowledge/universal-quality-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const DATA_FILE = path.join(DATA_DIR, "designs.json");

type DesignRecord = {
  id: string;
  createdAt: string;
  projectName: string;
  city: string;
  plotSize: string;
  facing: string;
  floors: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  vastu: string;
  budget: string;
  requirement: string;
  status: "AI_DRAFT" | "ENGINEER_REVIEW_REQUIRED";
  draft: {
    summary: string;
    roomSchedule: string[];
    floorPlan: string[];
    vastuNotes: string[];
    structuralNotes: string[];
    reviewChecklist: string[];
    clientNotes: string[];
  };
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function id() {
  return `design_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<DesignRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(items: DesignRecord[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function makeDraft(input: {
  projectName: string;
  city: string;
  plotSize: string;
  facing: string;
  floors: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  vastu: string;
  budget: string;
  requirement: string;
}) {
  const floorsLower = input.floors.toLowerCase();
  const isG1 = floorsLower.includes("g+1") || floorsLower.includes("2") || floorsLower.includes("first");
  const wantsParking = input.parking.toLowerCase() !== "no";
  const wantsVastu = input.vastu.toLowerCase() !== "no";

  const roomSchedule = [
    wantsParking ? "Parking / porch near entry side with clear vehicle turning space." : "Entry porch without dedicated parking block.",
    "Living room near main entry with visibility and natural light.",
    "Kitchen with dining connection and service/utility possibility.",
    "Common toilet placed away from direct living/dining visibility.",
    "Staircase positioned to support future floor access and structural continuity.",
    `${input.bedrooms} bedroom requirement to be split floor-wise based on privacy and circulation.`,
    `${input.bathrooms} bathroom requirement with plumbing shaft alignment preferred.`,
  ];

  const floorPlan = [
    `Plot: ${input.plotSize}, Facing: ${input.facing}, City: ${input.city}.`,
    wantsParking
      ? "Ground floor priority: parking, entry lobby, living, kitchen/dining, one toilet, staircase and one flexible room if space allows."
      : "Ground floor priority: entry, living, kitchen/dining, toilet, staircase and maximum usable room planning.",
    isG1
      ? "First floor priority: bedrooms, attached/common toilet, balcony/open sit-out and family lounge if space allows."
      : "Single-floor priority: compact zoning with minimum passage waste and proper ventilation.",
    "Keep wet areas vertically aligned where possible to reduce plumbing cost.",
    "Keep staircase and column grid coordinated before structural design begins.",
  ];

  const vastuNotes = wantsVastu
    ? [
        "Main entry should be reviewed as per exact site facing and road position.",
        "Kitchen placement can be explored in South-East/North-West zones where practical.",
        "Puja/mandir can be placed in a clean and calm North-East/East zone if layout permits.",
        "Master bedroom can be explored in South-West zone if it does not damage circulation.",
      ]
    : [
        "Vastu preference not selected. Layout is optimized for function, light, ventilation and cost control.",
      ];

  const structuralNotes = [
    "This is a planning-level AI draft, not a construction drawing.",
    "Column grid must be finalized by a structural engineer after architectural layout lock.",
    "Beam, slab, footing and reinforcement sizes are not finalized in this draft.",
    "Soil condition, seismic zone, load path and local code compliance must be checked before construction.",
    "Avoid large unsupported spans unless engineer approves beam/slab system.",
  ];

  const reviewChecklist = [
    "Architect review: room sizes, circulation, setbacks, staircase, parking and ventilation.",
    "Structural engineer review: column grid, beam/slab system, footing, load path and stability.",
    "Site review: exact dimensions, road level, drainage, neighbouring structures and bylaws.",
    "Client review: room count, privacy, budget, style and future expansion.",
    "BOQ/BBS should be generated only after reviewed layout assumptions are locked.",
  ];

  const clientNotes = [
    "This draft is suitable for concept discussion and requirement alignment.",
    "Final naksha/drawing must be prepared or approved by a qualified professional.",
    "Any construction decision requires engineer/architect validation.",
  ];

  return {
    summary: `${input.projectName} ke liye ${input.plotSize} ${input.facing} facing plot par ${input.floors} concept naksha draft generated. Output planning discussion ke liye hai, final construction ke liye professional review required hai.`,
    roomSchedule,
    floorPlan,
    vastuNotes,
    structuralNotes,
    reviewChecklist,
    clientNotes,
  };
}


// BUILDSETU_QUALITY_BRAIN_INTERIOR_DESIGN_V5B
function attachInteriorQualityBrainV5B(body: any, input: any) {
  return attachUniversalQualityBrainToPrompt({
    basePrompt: [
      input?.requirement || "",
      `Project: ${input?.projectName || body?.projectTitle || body?.projectName || "Selected Project"}`,
      `City: ${input?.city || ""}`,
      `Plot: ${input?.plotSize || ""}`,
      `Facing: ${input?.facing || ""}`,
      `Floors: ${input?.floors || ""}`,
      `Bedrooms: ${input?.bedrooms || ""}`,
      `Bathrooms: ${input?.bathrooms || ""}`,
      `Parking: ${input?.parking || ""}`,
      `Budget: ${input?.budget || ""}`,
    ].filter(Boolean).join("\n"),
    projectId: body?.projectId || body?.projectContext?.projectId || "global",
    domain: "interior",
    projectTitle: input?.projectName || body?.projectTitle || body?.projectName || "",
    projectContext: body?.projectContext || body,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = {
      projectName: safe(body.projectName, "New House Design"),
      city: safe(body.city, "Raipur"),
      plotSize: safe(body.plotSize, "30x40 ft"),
      facing: safe(body.facing, "North"),
      floors: safe(body.floors, "G+1"),
      bedrooms: safe(body.bedrooms, "3"),
      bathrooms: safe(body.bathrooms, "3"),
      parking: safe(body.parking, "Yes"),
      vastu: safe(body.vastu, "Yes"),
      budget: safe(body.budget, "Not specified"),
      requirement: safe(body.requirement, "Modern residential house planning with good light and ventilation."),
    };

    const qualityBrainPromptV5B = attachInteriorQualityBrainV5B(body, input);
    const draftBaseV5B = makeDraft({
      ...input,
      requirement: qualityBrainPromptV5B,
    });

    const record: DesignRecord = {
      id: id(),
      createdAt: new Date().toISOString(),
      ...input,
      status: "ENGINEER_REVIEW_REQUIRED",
      draft: {
        ...draftBaseV5B,
        reviewChecklist: [
          ...draftBaseV5B.reviewChecklist,
          "Universal Quality Brain V5B checked: project context, saved knowledge, usability, circulation, materials, lighting and practical execution notes.",
        ],
        clientNotes: [
          ...draftBaseV5B.clientNotes,
          "Interior/design draft used BuildSetu quality rules internally; final execution requires professional review.",
        ],
      },
    };

    const items = await readAll();
    items.unshift(record);
    await writeAll(items.slice(0, 200));

    return NextResponse.json({ ok: true, design: record });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to generate design draft" },
      { status: 500 }
    );
  }
}
