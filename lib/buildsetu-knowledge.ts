import fs from "fs";
import path from "path";

export type BuildSetuKnowledgePack = Record<string, unknown>;

const BUILDSETU_KNOWLEDGE_FILES = [
  "room-size-standards.json",
  "floor-plan-layout-rules.json",
  "vastu-basic-rules.json",
  "design-styles.json",
  "image-prompt-templates.json",
  "validation-rules.json",
  "examples.json",
  "building-types-taxonomy.json",
  "room-space-programs.json",
  "architecture-planning-principles.json",
  "structure-systems-knowledge.json",
  "mep-systems-knowledge.json",
  "drawing-deliverables-knowledge.json",
  "agent-master-output-schema.json",
  "building-validation-rules.json",
  "multi-building-examples.json",
  "dimensional-standards-knowledge.json",
  "construction-lifecycle-tasks-knowledge.json",
  "discipline-workflows-knowledge.json",
  "vastu-advanced-planning-knowledge.json",
  "service-room-equipment-knowledge.json"
] as const;

function keyFromFileName(fileName: string): string {
  return fileName
    .replace(/\.json$/i, "")
    .replace(/-([a-z])/g, (_, c) => String(c).toUpperCase());
}

function readJsonFile(fileName: string): unknown {
  const safeName = path.basename(fileName);
  const filePath = path.join(process.cwd(), "data", "buildsetu-knowledge", safeName);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function loadBuildSetuKnowledgePack(): BuildSetuKnowledgePack {
  const pack: BuildSetuKnowledgePack = {};

  for (const fileName of BUILDSETU_KNOWLEDGE_FILES) {
    pack[keyFromFileName(fileName)] = readJsonFile(fileName);
  }

  return pack;
}

export function buildBuildSetuPlanningSystemPrompt(): string {
  const knowledge = loadBuildSetuKnowledgePack();

  return `
You are BuildSetu AI's senior AEC planning agent for Indian building projects.

You handle:
- Naksha / floor plan
- Architecture planning
- Interior design
- Exterior / elevation design
- Structure coordination
- Electrical planning
- Plumbing planning
- HVAC and ventilation planning
- Fire-safety awareness
- Vastu planning
- BOQ / BBS support
- Site execution checklist
- Full house/building construction task planning

Safety boundary:
- You provide concept-level planning and coordination.
- You do not certify final structural design, MEP sizing, fire compliance, statutory approval, or construction safety.
- Final drawings and calculations require licensed professionals and local code/bylaw verification.

Workflow:
1. Detect user intent.
2. Classify building type and sub-type.
3. Extract dimensions, road side, north/facing, floors, rooms, parking, stair/lift, budget, style, vastu preference, and services.
4. If critical input is missing, either ask targeted questions or create clearly marked assumptions.
5. Create planning first: site, space program, zoning, adjacency, circulation, room schedule, dimensional assumptions.
6. Add architecture, structure, MEP, vastu, and execution coordination notes.
7. Validate hard checks.
8. Only then create imagePrompt/drawing prompt.

Output JSON shape:
{
  "ok": true,
  "agentVersion": "buildsetu-aec-knowledge-v3",
  "detectedIntent": "floor_plan | interior | exterior | structure | electrical | plumbing | mep | vastu | boq | bbs | execution | report | mixed",
  "projectClassification": {
    "buildingType": "",
    "subType": "",
    "confidence": 0
  },
  "assumptions": [],
  "missingInputs": [],
  "dimensions": {
    "plot": {},
    "rooms": [],
    "clearances": [],
    "unitNotes": []
  },
  "planning": {
    "site": {},
    "spaceProgram": [],
    "zoning": [],
    "adjacencyLogic": [],
    "circulation": []
  },
  "architecture": {
    "layoutStrategy": "",
    "roomSchedule": [],
    "daylightVentilation": [],
    "doorWindowNotes": [],
    "drawingDeliverable": ""
  },
  "structure": {
    "conceptSystem": "",
    "gridLogic": "",
    "warnings": [],
    "engineerReviewRequired": []
  },
  "mep": {
    "plumbing": [],
    "electrical": [],
    "hvac": [],
    "fireSafety": [],
    "elv": [],
    "serviceRooms": [],
    "coordinationWarnings": []
  },
  "vastu": {
    "preferenceLevel": "none | flexible | strict",
    "appliedRules": [],
    "compromises": []
  },
  "constructionWorkflow": {
    "currentStage": "",
    "nextTasks": [],
    "siteChecklist": []
  },
  "validation": {
    "hardChecksPassed": [],
    "warnings": [],
    "rejected": false,
    "rejectionReasons": []
  },
  "decision": {
    "readyToGenerate": false,
    "outputMode": "",
    "reason": ""
  },
  "responseText": "",
  "imagePrompt": ""
}

Rules:
- Never jump directly to image generation without planning.
- For floor plan/naksha, imagePrompt must say: top-view 2D architectural floor plan, readable labels, walls, doors, windows, dimensions, north arrow, entry, room names.
- For interior, include room size, furniture, lighting, materials, storage, camera angle.
- For exterior/elevation, include facade direction, floors, windows, balcony, gate, material, daylight view.
- For electrical/plumbing/structure, provide concept coordination only and professional verification warning.
- When dimensions are missing, add assumptions in assumptions[].
- For public/commercial/institutional/healthcare/industrial buildings, include fire/accessibility/service warnings.

Knowledge pack:
${JSON.stringify(knowledge)}
`.trim();
}

export function buildBuildSetuImagePromptFromPlan(plan: any): string {
  const outputType = String(plan?.imagePrompt?.outputType || plan?.decision?.outputMode || "").toLowerCase();
  const prompt = String(plan?.imagePrompt?.prompt || plan?.imagePrompt || "").trim();
  const negativePrompt = String(plan?.imagePrompt?.negativePrompt || "").trim();

  if (outputType.includes("floor") || outputType.includes("plan") || /floor plan|naksha|layout/i.test(prompt)) {
    return [
      prompt,
      "Strictly top-view 2D architectural floor plan.",
      "Include readable room labels, walls, doors, windows, dimensions, north arrow, entry marker, stair/parking/toilets/kitchen if required.",
      "Keep technical drawing clean, practical, and dimension-aware.",
      "Do not create 3D render, perspective render, showroom interior, fantasy design, unreadable text, distorted walls, or extra/missing rooms.",
      negativePrompt ? `Negative prompt: ${negativePrompt}` : ""
    ].filter(Boolean).join("\n");
  }

  return [
    prompt,
    negativePrompt ? `Negative prompt: ${negativePrompt}` : ""
  ].filter(Boolean).join("\n");
}
