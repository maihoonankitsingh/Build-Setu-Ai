import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const DATA_FILE = path.join(DATA_DIR, "tool-runs.json");

// BUILDSETU_TOOL_CREDIT_DEDUCTION_V1
const DEMO_EMAIL = "demo@buildsetu.ai";

const TOOL_CREDIT_COSTS: Record<string, number> = {
  "magic-brief": 500,
  "architect-chat": 500,
  "floor-plan-ai": 1000,
  "sketch-to-plan": 1000,
  "vastu-check": 500,
  "working-drawings": 1500,
  "boq-generator": 1000,
  "bbs-generator": 1500,
  "column-beam-plan": 1500,
  "client-pdf": 500,
  "client-agreement": 1000,
  "contractor-package": 1500,
  "material-palette-ai": 500,
  "false-ceiling-ai": 500,
  "mood-board": 500,
};

class NotEnoughCreditsError extends Error {
  currentCredits: number;
  requiredCredits: number;

  constructor(currentCredits: number, requiredCredits: number) {
    super("Not enough credits. Please buy more credits to continue.");
    this.currentCredits = currentCredits;
    this.requiredCredits = requiredCredits;
  }
}

function getToolCreditCost(slug: string) {
  return TOOL_CREDIT_COSTS[slug] || 500;
}

async function deductDemoCredits({
  credits,
  note,
  projectId,
}: {
  credits: number;
  note: string;
  projectId: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: {
        email: DEMO_EMAIL,
        name: "BuildSetu Demo User",
        credits: 120,
      },
      select: {
        id: true,
        credits: true,
      },
    });

    if (user.credits < credits) {
      throw new NotEnoughCreditsError(user.credits, credits);
    }

    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        credits: {
          decrement: credits,
        },
      },
      select: {
        id: true,
        credits: true,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: user.id,
        projectId,
        actionType: "USE",
        creditsUsed: -credits,
        note,
      },
    });

    return updated;
  });
}


type ToolRun = {
  id: string;
  createdAt: string;
  slug: string;
  title: string;
  projectId: string | null;
  prompt: string;
  status: "AI_DRAFT" | "REVIEW_REQUIRED";
  sections: Array<{
    title: string;
    items: string[];
  }>;
  nextActions: string[];
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function id() {
  return `toolrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<ToolRun[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ToolRun[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

const toolProfiles: Record<string, { title: string; category: string; sections: string[]; nextActions: string[] }> = {
  "magic-brief": {
    title: "Magic Brief",
    category: "Brief",
    sections: ["Structured Requirement", "Detected Rooms", "Clarifying Questions", "Safety Notes"],
    nextActions: ["Create project", "Generate Naksha", "Generate BOQ", "Export PDF"],
  },
  "interior-render": {
    title: "Interior Render",
    category: "Render",
    sections: ["Render Prompt", "Style Direction", "Material Palette", "Negative Prompt", "Review Checklist"],
    nextActions: ["Generate render", "Review image", "Add to PDF"],
  },
  "exterior-elevation": {
    title: "Exterior Elevation",
    category: "Render",
    sections: ["Elevation Prompt", "Facade Elements", "Material Direction", "Lighting Notes", "Review Checklist"],
    nextActions: ["Generate elevation", "Review facade", "Add to PDF"],
  },
  "render-enhancer": {
    title: "Render Enhancer",
    category: "Image Tools",
    sections: ["Enhancement Plan", "Lighting Fixes", "Material Clarity", "Composition Notes"],
    nextActions: ["Upload image", "Enhance render", "Compare before/after"],
  },
  "site-photo-redesign": {
    title: "Site Photo Redesign",
    category: "Image Tools",
    sections: ["Redesign Direction", "Visible Site Constraints", "Material Suggestions", "Execution Notes"],
    nextActions: ["Upload site photo", "Generate redesign", "Add to client proposal"],
  },
  "sketch-to-plan": {
    title: "Sketch to Plan",
    category: "Planning",
    sections: ["Sketch Interpretation", "Room Layout", "Dimension Assumptions", "Missing Inputs", "Review Checklist"],
    nextActions: ["Upload sketch", "Open Naksha Studio", "Engineer review"],
  },
  "floor-plan-ai": {
    title: "Floor Plan AI",
    category: "Planning",
    sections: ["Room Schedule", "Floor Plan Logic", "Vastu Notes", "Circulation Notes", "Review Checklist"],
    nextActions: ["Open Naksha Studio", "Generate Structure", "Export PDF"],
  },
  "architect-chat": {
    title: "Architect Chat",
    category: "Assistant",
    sections: ["Answer", "Design Reasoning", "Practical Suggestions", "Professional Review Notes"],
    nextActions: ["Save notes", "Create task", "Add to proposal"],
  },
  "mood-board": {
    title: "Mood Board",
    category: "Interior",
    sections: ["Mood Direction", "Color Palette", "Furniture Style", "Lighting Mood", "Material Notes"],
    nextActions: ["Generate render", "Create material palette", "Add to PDF"],
  },
  "remove-furniture": {
    title: "Remove Furniture",
    category: "Image Tools",
    sections: ["Edit Instruction", "Masking Notes", "Room Restoration Plan", "Review Checklist"],
    nextActions: ["Upload room image", "Generate edit", "Review output"],
  },
  "background-change": {
    title: "Background Change",
    category: "Image Tools",
    sections: ["Background Direction", "Lighting Match", "Perspective Notes", "Quality Checklist"],
    nextActions: ["Upload image", "Generate background", "Review output"],
  },
  "photo-enhancer": {
    title: "Photo Enhancer",
    category: "Image Tools",
    sections: ["Enhancement Plan", "Sharpness", "Lighting", "Color Correction", "Export Notes"],
    nextActions: ["Upload photo", "Enhance", "Download"],
  },
  "working-drawings": {
    title: "Working Drawings",
    category: "Construction",
    sections: ["Drawing Index", "Architectural Checklist", "Structural Checklist", "MEP Checklist", "Missing Inputs"],
    nextActions: ["Open Structure Studio", "Prepare BOQ", "Review drawings"],
  },
  "boq-generator": {
    title: "BOQ Generator",
    category: "Estimation",
    sections: ["Scope Assumptions", "BOQ Heads", "Material Quantity Notes", "Rate Assumptions", "Review Checklist"],
    nextActions: ["Generate BOQ", "Verify quantities", "Export PDF"],
  },
  "bbs-generator": {
    title: "BBS Generator",
    category: "Structural",
    sections: ["Member Inputs", "Reinforcement Assumptions", "BBS Handoff", "Engineer Checklist", "Warning Notes"],
    nextActions: ["Open Structure Studio", "Generate BBS", "Engineer approval"],
  },
  "column-beam-plan": {
    title: "Column Beam Plan",
    category: "Structural",
    sections: ["Column Grid Direction", "Beam Slab Notes", "Foundation Caution", "Load Path Warning", "Engineer Checklist"],
    nextActions: ["Open Structure Studio", "Engineer review", "Prepare BBS"],
  },
  "material-palette-ai": {
    title: "Material Palette AI",
    category: "Interior",
    sections: ["Material Palette", "Flooring", "Wall Finish", "Hardware", "Budget Notes"],
    nextActions: ["Create mood board", "Generate render", "Add to PDF"],
  },
  "false-ceiling-ai": {
    title: "False Ceiling AI",
    category: "Interior",
    sections: ["Ceiling Concept", "Lighting Layout", "Cove/Profile Notes", "Material Notes", "Execution Checklist"],
    nextActions: ["Generate render", "Add electrical notes", "Client approval"],
  },
  "vastu-check": {
    title: "Vastu Check",
    category: "Planning",
    sections: ["Vastu Observations", "Room Placement Notes", "Entry/Kitchen/Puja Notes", "Practical Compromises", "Review Checklist"],
    nextActions: ["Open Naksha Studio", "Revise layout", "Client review"],
  },
  "client-pdf": {
    title: "Client PDF",
    category: "Presentation",
    sections: ["PDF Scope", "Included Sections", "Missing Inputs", "Export Notes"],
    nextActions: ["Open Reports", "Export Full PDF", "Share with client"],
  },
  "client-agreement": {
    title: "Client Agreement",
    category: "Presentation",
    sections: ["Agreement Scope", "Deliverables", "Payment Terms", "Revision Terms", "Disclaimer Notes"],
    nextActions: ["Generate agreement", "Export agreement PDF", "Client sign-off"],
  },
  "contractor-package": {
    title: "Contractor Package",
    category: "Construction",
    sections: ["Package Scope", "Drawing Index", "BOQ Summary", "Work Sequence", "Site Checklist"],
    nextActions: ["Generate BOQ", "Prepare drawings", "Export contractor PDF"],
  },
};

function buildItems(section: string, title: string, prompt: string) {
  const base = safe(prompt, "No prompt provided.");

  const commonReview = [
    `${title} output AI draft hai. Final use se pehle professional review required hai.`,
    `Input basis: ${base}`,
  ];

  if (section.toLowerCase().includes("prompt")) {
    return [
      `Create a professional ${title.toLowerCase()} output based on: ${base}`,
      "Use realistic materials, practical proportions, Indian residential context and client-ready presentation language.",
      "Avoid unsafe structural elements, impossible geometry, text artifacts, watermarks and unclear instructions.",
    ];
  }

  if (section.toLowerCase().includes("checklist") || section.toLowerCase().includes("review")) {
    return [
      "Client requirement and site dimensions verify karein.",
      "Architect/engineer review status mark karein.",
      "Final execution se pehle dimensions, byelaws, structure and budget validate karein.",
      ...commonReview.slice(0, 1),
    ];
  }

  if (section.toLowerCase().includes("warning") || section.toLowerCase().includes("caution")) {
    return [
      "Construction ya execution decision AI draft ke basis par directly na lein.",
      "Structural, MEP, legal and safety items qualified professional se approve karayein.",
      "Large spans, cantilever, column shifting, wall removal and reinforcement details engineer approval ke bina unsafe ho sakte hain.",
    ];
  }

  return [
    `${section} for ${title}: ${base}`,
    "Output ko client discussion, planning and internal workflow ke draft ke roop me use karein.",
    "Final version professional review ke baad lock karein.",
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = safe(body.slug);
    const profile = toolProfiles[slug] || {
      title: safe(body.title, "BuildSetu Tool"),
      category: "Custom",
      sections: ["Output", "Suggested Steps", "Review Checklist"],
      nextActions: ["Review", "Save", "Export"],
    };

    const prompt = safe(body.prompt, `${profile.title} ke liye output generate karo.`);
    const projectId = safe(body.projectId, "") || null;

    const requiredCredits = getToolCreditCost(slug);
    const creditResult = await deductDemoCredits({
      credits: requiredCredits,
      note: `${profile.title} tool execution`,
      projectId,
    });

    const run: ToolRun = {
      id: id(),
      createdAt: new Date().toISOString(),
      slug,
      title: profile.title,
      projectId,
      prompt,
      status: "REVIEW_REQUIRED",
      sections: profile.sections.map((section) => ({
        title: section,
        items: buildItems(section, profile.title, prompt),
      })),
      nextActions: profile.nextActions,
    };

    const items = await readAll();
    items.unshift(run);
    await writeAll(items.slice(0, 300));

    return NextResponse.json({ ok: true, run, credits: creditResult.credits, creditsUsed: requiredCredits });
  } catch (error: any) {
    if (error instanceof NotEnoughCreditsError) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_ENOUGH_CREDITS",
          error: error.message,
          credits: error.currentCredits,
          requiredCredits: error.requiredCredits,
          buyCreditsUrl: "/credits",
        },
        { status: 402 },
      );
    }

    return NextResponse.json(
      { ok: false, error: error?.message || "Tool execution failed" },
      { status: 500 }
    );
  }
}
