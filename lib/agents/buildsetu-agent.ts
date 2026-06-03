import { buildProjectContext } from "@/lib/project-context-builder";
import { buildFeedbackContextForAgent, type BuildSetuFeedbackDomain } from "@/lib/agent-feedback/feedback-store";

import { enhanceBuildSetuAgentImagePrompt, enhanceBuildSetuAgentResponseText, hasBuildSetuDirectBriefFromMessage, buildBuildSetuDirectBriefOverride, buildBuildSetuAgentKnowledgeBlock } from "@/lib/agents/buildsetu-agent-knowledge-adapter";

export type BuildSetuAgentAction = "chat" | "execute" | "generate" | "analyze";

export type BuildSetuAgentInput = {
  projectId: string;
  toolSlug: string;
  toolName?: string;
  action?: BuildSetuAgentAction;
  message?: string;
  prompt?: string;
};

export type BuildSetuAgentResult = {
  ok: boolean;
  agentVersion: string;
  projectId: string;
  toolSlug: string;
  action: BuildSetuAgentAction;
  decision: {
    taskType: string;
    module: string;
    outputMode: "image" | "document" | "chat" | "mixed";
    canProceed: boolean;
    readyToGenerate: boolean;
    needsMoreInfo: boolean;
    missingQuestions: string[];
    warnings: string[];
  };
  responseText: string;
  finalPrompt: string;
  imagePrompt: string;
  contextSummary: {
    briefTitle: string;
    completeness: number;
    missingRequiredStages: string[];
    nextRecommendedAction: string;
    ignoredMismatchedAssets?: number;
  };
  rawContext?: any;
};

const AGENT_VERSION = "buildsetu_core_construction_agent_v4_minimal_planner_training";

type ToolModule = {
  taskType: string;
  module: string;
  outputMode: "image" | "document" | "chat" | "mixed";
  label: string;
  deliverables: string[];
  safetyWarning?: string;
};

const TOOL_MODULES: Record<string, ToolModule> = {
  "magic-brief": {
    taskType: "project_brief",
    module: "brief",
    outputMode: "document",
    label: "Magic Brief",
    deliverables: ["structured client brief", "missing questions", "project scope summary"],
  },
  "architect-chat": {
    taskType: "architect_chat",
    module: "architecture",
    outputMode: "chat",
    label: "Architect Chat",
    deliverables: ["architecture guidance", "planning options", "decision support"],
  },
  "sketch-to-plan": {
    taskType: "floor_plan_2d",
    module: "architecture",
    outputMode: "image",
    label: "Sketch to Plan",
    deliverables: ["2D floor plan", "room zoning", "dimensioned concept plan"],
  },
  "floor-plan-ai": {
    taskType: "floor_plan_2d",
    module: "architecture",
    outputMode: "image",
    label: "Floor Plan AI",
    deliverables: ["premium furnished 2D floor plan", "room labels", "dimensions", "doors/windows", "furniture layout"],
    safetyWarning: "AI floor plan draft hai. Final construction drawing architect/engineer review ke baad use karein.",
  },
  "vastu-check": {
    taskType: "vastu_review",
    module: "architecture",
    outputMode: "document",
    label: "Vastu Check",
    deliverables: ["room placement review", "vastu suggestions", "correction notes"],
  },
  "exterior-elevation": {
    taskType: "exterior_elevation",
    module: "exterior",
    outputMode: "image",
    label: "Exterior Elevation",
    deliverables: ["front elevation prompt", "facade material concept", "lighting/material direction"],
  },
  "site-photo-redesign": {
    taskType: "site_photo_redesign",
    module: "exterior",
    outputMode: "image",
    label: "Site Photo Redesign",
    deliverables: ["site redesign prompt", "facade improvement", "material/style direction"],
  },
  "interior-render": {
    taskType: "interior_render",
    module: "interior",
    outputMode: "image",
    label: "Interior Render",
    deliverables: ["room render prompt", "furniture layout", "lighting/material palette"],
  },
  "mood-board": {
    taskType: "mood_board",
    module: "interior",
    outputMode: "image",
    label: "Mood Board",
    deliverables: ["material palette", "color direction", "furniture/lighting mood"],
  },
  "material-palette-ai": {
    taskType: "material_palette",
    module: "interior",
    outputMode: "document",
    label: "Material Palette AI",
    deliverables: ["tiles/laminate/marble/wall color suggestions", "hardware palette", "budget-sensitive specs"],
  },
  "false-ceiling-ai": {
    taskType: "false_ceiling",
    module: "interior",
    outputMode: "image",
    label: "False Ceiling AI",
    deliverables: ["false ceiling concept", "cove/profile light plan", "room ceiling prompt"],
  },
  "remove-furniture": {
    taskType: "image_edit_remove_furniture",
    module: "image_tools",
    outputMode: "image",
    label: "Remove Furniture",
    deliverables: ["furniture removal instruction", "clean empty-room base"],
  },
  "render-enhancer": {
    taskType: "render_enhance",
    module: "image_tools",
    outputMode: "image",
    label: "Render Enhancer",
    deliverables: ["high quality render enhancement prompt", "lighting/sharpness improvement"],
  },
  "photo-enhancer": {
    taskType: "photo_enhance",
    module: "image_tools",
    outputMode: "image",
    label: "Photo Enhancer",
    deliverables: ["photo upscale/enhance instruction", "clarity/light improvement"],
  },
  "background-change": {
    taskType: "background_change",
    module: "image_tools",
    outputMode: "image",
    label: "Background Change",
    deliverables: ["professional background replacement prompt", "scene consistency rules"],
  },
  "working-drawings": {
    taskType: "working_drawings",
    module: "working_drawings",
    outputMode: "document",
    label: "Working Drawings",
    deliverables: ["drawing checklist", "architectural/MEP/structure sheet list", "contractor notes"],
    safetyWarning: "Working drawings final issue se pehle architect/engineer review required hai.",
  },
  "boq-generator": {
    taskType: "boq_document",
    module: "estimation",
    outputMode: "document",
    label: "BOQ Generator",
    deliverables: ["item-wise BOQ draft", "material quantity summary", "cost estimate structure"],
    safetyWarning: "BOQ estimate market rates/site measurements ke basis par verify karna required hai.",
  },
  "bbs-generator": {
    taskType: "bbs_document",
    module: "structure",
    outputMode: "document",
    label: "BBS Generator",
    deliverables: ["bar bending schedule draft", "steel summary", "cutting/bending note"],
    safetyWarning: "BBS structural engineer approval ke bina final construction use ke liye valid nahi hai.",
  },
  "column-beam-plan": {
    taskType: "structure_draft",
    module: "structure",
    outputMode: "document",
    label: "Column Beam Plan",
    deliverables: ["column/beam/slab draft", "grid suggestion", "engineer review note"],
    safetyWarning: "Structural design licensed structural engineer se verify hona required hai.",
  },
  "client-pdf": {
    taskType: "client_pdf",
    module: "documents",
    outputMode: "document",
    label: "Client PDF",
    deliverables: ["client proposal structure", "brief/renders/BOQ sections", "next steps"],
  },
  "client-agreement": {
    taskType: "client_agreement",
    module: "documents",
    outputMode: "document",
    label: "Client Agreement",
    deliverables: ["scope", "deliverables", "payment milestones", "revision policy", "sign-off clauses"],
  },
  "contractor-package": {
    taskType: "contractor_package",
    module: "documents",
    outputMode: "document",
    label: "Contractor Package",
    deliverables: ["BOQ/material list", "work sequence", "site checklist", "contractor notes"],
  },
};

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value: unknown) {
  return cleanText(value).toLowerCase();
}

function arr(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function moduleForTool(toolSlugRaw: string, toolNameRaw: string, messageRaw: string): ToolModule {
  const slug = lower(toolSlugRaw);
  const hay = lower(`${toolSlugRaw} ${toolNameRaw} ${messageRaw}`);

  if (TOOL_MODULES[slug]) return TOOL_MODULES[slug];

  if (hay.includes("floor") || hay.includes("naksha") || hay.includes("layout")) return TOOL_MODULES["floor-plan-ai"];
  if (hay.includes("exterior") || hay.includes("elevation") || hay.includes("facade")) return TOOL_MODULES["exterior-elevation"];
  if (hay.includes("interior") || hay.includes("room render")) return TOOL_MODULES["interior-render"];
  if (hay.includes("boq") || hay.includes("estimate") || hay.includes("quantity")) return TOOL_MODULES["boq-generator"];
  if (hay.includes("bbs") || hay.includes("bar bending") || hay.includes("steel")) return TOOL_MODULES["bbs-generator"];
  if (hay.includes("column") || hay.includes("beam") || hay.includes("structure") || hay.includes("slab")) return TOOL_MODULES["column-beam-plan"];
  if (hay.includes("agreement") || hay.includes("contract")) return TOOL_MODULES["client-agreement"];
  if (hay.includes("pdf") || hay.includes("proposal")) return TOOL_MODULES["client-pdf"];
  if (hay.includes("contractor")) return TOOL_MODULES["contractor-package"];
  if (hay.includes("vastu")) return TOOL_MODULES["vastu-check"];
  if (hay.includes("material") || hay.includes("palette")) return TOOL_MODULES["material-palette-ai"];

  return {
    taskType: "project_assistant",
    module: "general",
    outputMode: "chat",
    label: cleanText(toolNameRaw || toolSlugRaw || "BuildSetu Tool"),
    deliverables: ["project-specific guidance", "missing questions", "next action"],
  };
}

function briefValue(brief: any, path: string, fallback = "") {
  const parts = path.split(".");
  let current = brief;

  for (const part of parts) {
    if (!current || typeof current !== "object") return fallback;
    current = current[part];
  }

  return current ?? fallback;
}

function buildBriefMissingQuestions(brief: any) {
  const questions: string[] = [];

  if (!brief?.title) questions.push("Project title kya hai?");
  if (!briefValue(brief, "site.plotWidthFt")) questions.push("Plot width feet me kya hai?");
  if (!briefValue(brief, "site.plotDepthFt")) questions.push("Plot depth feet me kya hai?");
  if (!briefValue(brief, "site.facing")) questions.push("Plot facing direction kya hai?");
  if (!briefValue(brief, "site.city")) questions.push("Project city/location kya hai?");
  if (!briefValue(brief, "building.floors")) questions.push("Kitne floors chahiye?");
  if (!briefValue(brief, "building.bedrooms")) questions.push("Kitne bedrooms chahiye?");
  if (!briefValue(brief, "building.bathrooms")) questions.push("Kitne bathrooms/toilets chahiye?");
  if (!briefValue(brief, "building.parking")) questions.push("Parking required hai ya nahi?");
  if (!briefValue(brief, "preferences.budgetRange")) questions.push("Approx budget range kya hai?");
  if (!briefValue(brief, "preferences.style")) questions.push("Design style kya chahiye? Modern, contemporary, Indian, luxury etc.");

  return questions.slice(0, 8);
}

function projectFacts(brief: any) {
  const spaces = brief?.spaces || {};
  const rawSpaces = [
    ...arr(brief?.raw?.building?.spaces),
    ...arr(brief?.raw?.building?.rooms),
  ].map((item) => cleanText(item)).filter(Boolean);

  const booleanSpaces = [
    spaces.living ? "Living Room" : "",
    spaces.dining ? "Dining" : "",
    spaces.kitchen ? "Kitchen" : "",
    spaces.puja ? "Puja" : "",
    spaces.store ? "Store" : "",
    spaces.utility ? "Utility/Wash" : "",
    spaces.office ? "Office" : "",
    spaces.guestRoom ? "Guest Room" : "",
    spaces.balcony ? "Balcony" : "",
    spaces.garden ? "Garden" : "",
  ].filter(Boolean);

  const spaceHints = Array.from(new Set([...booleanSpaces, ...rawSpaces]));

  return {
    title: cleanText(brief?.title || "Selected Project"),
    city: cleanText(briefValue(brief, "site.city", "Not specified")),
    width: briefValue(brief, "site.plotWidthFt", "?"),
    depth: briefValue(brief, "site.plotDepthFt", "?"),
    facing: cleanText(briefValue(brief, "site.facing", "Not specified")),
    floors: cleanText(briefValue(brief, "building.floors", "Not specified")),
    bedrooms: briefValue(brief, "building.bedrooms", "?"),
    bathrooms: briefValue(brief, "building.bathrooms", "?"),
    parking: cleanText(briefValue(brief, "building.parking", "Not specified")),
    style: cleanText(briefValue(brief, "preferences.style", briefValue(brief, "preferences.exteriorStyle", "Modern"))),
    budget: cleanText(briefValue(brief, "preferences.budgetRange", "Not specified")),
    clientNotes: cleanText(briefValue(brief, "requirements.clientNotes", "")),
    spaces: spaceHints,
  };
}

function projectFactsBlock(brief: any) {
  const f = projectFacts(brief);

  return [
    `Project: ${f.title}`,
    `Location: ${f.city}`,
    `Plot Size: ${f.width} x ${f.depth} ft`,
    `Facing: ${f.facing}`,
    `Floors: ${f.floors}`,
    `Bedrooms: ${f.bedrooms}`,
    `Bathrooms/Toilets: ${f.bathrooms}`,
    `Parking: ${f.parking}`,
    `Style: ${f.style}`,
    `Budget: ${f.budget}`,
    `Required Spaces: ${f.spaces.join(", ") || "Use project brief spaces"}`,
    `Client Notes: ${f.clientNotes || "None"}`,
  ].join("\n");
}

function strictFloorPlanRules() {
  return [
    "- Top-down 2D architectural floor plan only.",
    "- Show outer plot dimensions.",
    "- Show north arrow and facing direction.",
    "- Show room labels and readable dimensions.",
    "- Show thick wall outlines.",
    "- Show doors with swing arcs.",
    "- Show windows and ventilation tags.",
    "- Show furniture layout: beds, sofa, dining table, kitchen counter, wardrobe, toilet fixtures, staircase, parking car if applicable.",
    "- Show kitchen, toilet, staircase, parking, living/drawing/dining and bedrooms according to brief.",
    "- Public spaces near entry/front.",
    "- Private bedrooms in quieter/private zones.",
    "- Wet areas grouped logically.",
    "- Kitchen preferably east/south-east if possible.",
    "- Puja preferably north-east/central-north if possible.",
    "- Staircase in side/service zone if possible.",
    "- Use clean premium architect presentation style.",
    "- Do not create exterior elevation.",
    "- Do not create facade.",
    "- Do not create 3D building.",
    "- Do not create perspective view.",
    "- Do not create interior render.",
    "- Do not create simple colored block diagram.",
    "- Do not use old mismatched generated assets.",
    "- Do not use a different plot size than current project brief.",
  ].join("\n");
}

function buildAgentPrompt(args: {
  module: ToolModule;
  brief: any;
  userText: string;
  contextText: string;
}) {
  const { module, brief, userText, contextText } = args;
  const facts = projectFactsBlock(brief);

  if (module.taskType === "floor_plan_2d") {
    return [
      "BUILDSETU CORE CONSTRUCTION AGENT — ARCHITECTURE / FLOOR PLAN MODULE",
      "",
      "TASK:",
      "Generate one premium furnished 2D architectural floor plan image from the current project brief.",
      "",
      "CURRENT PROJECT BRIEF — SOURCE OF TRUTH:",
      facts,
      "",
      "USER REQUEST:",
      userText || "Current project brief ke basis par premium furnished 2D architectural floor plan generate karo.",
      "",
      "MANDATORY RULES:",
      strictFloorPlanRules(),
      "",
      "PROJECT CONTEXT:",
      contextText,
    ].join("\n");
  }

  if (module.outputMode === "image") {
    return [
      `BUILDSETU CORE CONSTRUCTION AGENT — ${module.module.toUpperCase()} MODULE`,
      "",
      `TOOL: ${module.label}`,
      `TASK TYPE: ${module.taskType}`,
      "",
      "CURRENT PROJECT BRIEF — SOURCE OF TRUTH:",
      facts,
      "",
      "DELIVERABLES:",
      ...module.deliverables.map((d) => `- ${d}`),
      "",
      "USER REQUEST:",
      userText || `Generate ${module.label} output using current project brief.`,
      "",
      "IMAGE OUTPUT RULES:",
      "- Use current project brief as source of truth.",
      "- Do not use old mismatched generated assets.",
      "- Keep design consistent with project style, budget and location.",
      "- Produce professional client-ready visual direction.",
      "",
      "PROJECT CONTEXT:",
      contextText,
    ].join("\n");
  }

  return [
    `BUILDSETU CORE CONSTRUCTION AGENT — ${module.module.toUpperCase()} MODULE`,
    "",
    `TOOL: ${module.label}`,
    `TASK TYPE: ${module.taskType}`,
    "",
    "CURRENT PROJECT BRIEF — SOURCE OF TRUTH:",
    facts,
    "",
    "DELIVERABLES:",
    ...module.deliverables.map((d) => `- ${d}`),
    "",
    "USER REQUEST:",
    userText || `Prepare ${module.label} output using current project brief.`,
    "",
    "OUTPUT RULES:",
    "- Use current project context as source of truth.",
    "- Ask missing questions if required data is not available.",
    "- Do not use old mismatched generated assets as primary source.",
    "- Keep output structured, professional and project-specific.",
    module.safetyWarning ? `- ${module.safetyWarning}` : "",
    "",
    "PROJECT CONTEXT:",
    contextText,
  ].filter(Boolean).join("\n");
}

function responseForTask(args: {
  module: ToolModule;
  canProceed: boolean;
  missingQuestions: string[];
}) {
  if (!args.canProceed) {
    return [
      "Project brief incomplete hai. Pehle ye details chahiye:",
      ...args.missingQuestions.map((q, i) => `${i + 1}. ${q}`),
    ].join("\n");
  }

  const visiblePlan = args.module.outputMode === "image"
    ? [
        `${args.module.label} plan ready hai.`,
        "",
        "Visible plan:",
        "- Requirement/current brief ko source of truth maana gaya.",
        "- BuildSetu Agent ne planning, assumptions aur output mode verify kiya.",
        "- Final imagePrompt OpenAI/ChatGPT image generation ke liye compile hoga.",
        "- Generate button se final visual output create hoga.",
        "",
        "Status: ready for final image generation.",
      ]
    : [
        `${args.module.label} ready hai.`,
        "",
        "Visible plan:",
        "- Requirement/current brief ko source of truth maana gaya.",
        "- BuildSetu Agent ne deliverable type aur next action verify kiya.",
        "- Output professional draft/reference mode me prepare hoga.",
        "",
        "Status: ready for next action.",
      ];

  return visiblePlan.join(String.fromCharCode(10));
}




function normalizeBuildSetuAgentResponseLabel(responseText: string, module: any, fallbackToolName: string) {
  const label = getBuildSetuAgentDisplayToolName(module, fallbackToolName);

  const cleaned = String(responseText || "")
    .replace(/^Floor Plan AI ready hai\./, `${label} ready hai.`)
    .replace(/^Structure AI ready hai\./, `${label} ready hai.`)
    .replace(/^Electrical AI ready hai\./, `${label} ready hai.`)
    .replace(/^Plumbing AI ready hai\./, `${label} ready hai.`)
    .replace(/^BOQ \/ Estimate AI ready hai\./, `${label} ready hai.`)
    .replace(/^BBS AI ready hai\./, `${label} ready hai.`)
    .replace("current project brief ke basis par", "current request ke basis par");

  return cleaned;
}


function getBuildSetuAgentDisplayToolName(module: any, fallbackToolName: string) {
  if (module?.module === "structure") return "Structure AI";
  if (module?.module === "mep_electrical") return "Electrical AI";
  if (module?.module === "mep_plumbing") return "Plumbing AI";
  if (module?.module === "boq_estimation") return "BOQ / Estimate AI";
  if (module?.module === "bbs") return "BBS AI";
  if (module?.taskType === "floor_plan_2d") return "Floor Plan AI";
  if (module?.taskType === "interior_render") return "Interior AI";
  if (module?.taskType === "exterior_elevation") return "Exterior / Elevation AI";
  return fallbackToolName || "BuildSetu Agent";
}


function applyToolModuleRoutingOverride(baseModule: any, toolSlug: string, userText: string) {
  const slug = String(toolSlug || "").toLowerCase();
  const text = String(userText || "").toLowerCase();
  const merged = `${slug} ${text}`;


  // Knowledge/explanation questions should answer as text, not demand a full image/layout brief.
  const isAecKnowledgeQuestion =
    /(kya|kaun kaun|kitne|kitna|batao|explain|guide|logic|standard|standard size|standard dimension|room size|room sizes|dimension range|placement logic|layout logic|space program|rooms spaces|planning ke liye|working drawing|drawing package|approval rules|far|fsi|setback|rules|checklist)/i.test(merged);

  const isModelStyleTrainingQuestion =
    /(chatgpt model|model style|reasoning model|thinking model|agent brain|agent ko train|data se train|trained data|training data|fine tune|finetune|rag|knowledge base|orchestrator|planner|executor|verifier|tool router|quality evaluator|feedback loop|model runtime|agent architecture)/i.test(merged);

  const isConstructionMaterialKnowledgeQuestion =
    /(construction method|construction sequence|rcc|load bearing|load-bearing|steel structure|prefab|modular|masonry|brickwork|blockwork|aac|cement|sand|aggregate|tmt|steel|concrete|waterproofing|plaster|flooring|tiles|marble|granite|paint|false ceiling|gypsum|plywood|mdf|hdhmr|laminate|veneer|hpl|facade material|mep material|electrical material|plumbing material|material selection|kaunsa material|best material|quality check|qa\/qc|curing|shuttering|formwork)/i.test(merged);

  const asksExplicitVisualGeneration =
    /(image generate|generate image|render banao|image banao|photo render|3d render|2d floor plan chahiye|naksha chahiye|floor plan chahiye|layout banao|plan banao|design banao|elevation banao|interior design banao|exterior design banao)/i.test(merged);

  if ((isAecKnowledgeQuestion || isConstructionMaterialKnowledgeQuestion || isModelStyleTrainingQuestion) && !asksExplicitVisualGeneration) {
    return {
      ...baseModule,
      taskType: "aec_knowledge_answer",
      module: "aec_knowledge",
      outputMode: "text",
      safetyWarning: "AEC knowledge answer concept/reference mode me hai. Final approval, execution, structure, MEP, fire, legal/code compliance licensed professional/local authority verification ke bina valid nahi hai."
    };
  }


  // Interior/exterior must be resolved before electrical because design prompts often contain "lighting".
  if (/interior|room design|bedroom design|living design|kitchen interior|false ceiling|wardrobe|modular kitchen/.test(merged)) {
    return {
      ...baseModule,
      taskType: "interior_render",
      module: "interior",
      outputMode: "image",
      safetyWarning: "Interior design AI concept/render prompt hai. Final execution, electrical load, false ceiling support, waterproofing/civil changes aur site measurements professional verification ke bina valid nahi hain."
    };
  }

  if (/exterior|elevation|facade|front design|front elevation|house elevation|villa exterior/.test(merged)) {
    return {
      ...baseModule,
      taskType: "exterior_elevation",
      module: "exterior",
      outputMode: "image",
      safetyWarning: "Exterior/facade AI concept/render prompt hai. Final facade execution, structural support, waterproofing, fire/local bylaws aur approval professional/local authority verification ke bina valid nahi hain."
    };
  }


  if (/structure|rcc|column|beam|slab|footing|foundation|is code|ies code/.test(merged)) {
    return {
      ...baseModule,
      taskType: "structure_concept",
      module: "structure",
      outputMode: "text",
      safetyWarning: "Structure concept AI draft hai. Final RCC/steel/member size/rebar/foundation design licensed structural engineer ke review/certification ke bina valid nahi hai."
    };
  }

  if (/electrical|wiring|switch|socket|db|mcb|lighting|power point/.test(merged)) {
    return {
      ...baseModule,
      taskType: "electrical_concept",
      module: "mep_electrical",
      outputMode: "text",
      safetyWarning: "Electrical concept AI draft hai. Final load calculation, wire size, MCB rating, earthing aur execution licensed electrical engineer/electrician verification ke bina valid nahi hai."
    };
  }

  if (/plumbing|pipe|water line|drainage|sewer|soil pipe|waste pipe|shaft|tank|pump/.test(merged)) {
    return {
      ...baseModule,
      taskType: "plumbing_concept",
      module: "mep_plumbing",
      outputMode: "text",
      safetyWarning: "Plumbing concept AI draft hai. Final pipe sizing, slope, pressure, waterproofing, sewer/STP/septic design qualified plumbing/MEP professional verification ke bina valid nahi hai."
    };
  }

  if (/boq|estimate|costing|material quantity|rate analysis/.test(merged)) {
    return {
      ...baseModule,
      taskType: "boq_document",
      module: "boq_estimation",
      outputMode: "text",
      safetyWarning: "BOQ/estimate draft hai. Final tender quantity/rates complete drawings, specifications aur estimator review ke bina valid nahi hai."
    };
  }

  if (/bbs|bar bending|steel quantity|rebar/.test(merged)) {
    return {
      ...baseModule,
      taskType: "bbs_document",
      module: "bbs",
      outputMode: "text",
      safetyWarning: "BBS draft ke liye structural drawings, member sizes, bar dia/spacing/laps/hooks required hain. Reinforcement details invent nahi karne."
    };
  }

  return baseModule;
}



// BUILDSETU_AGENT_MINIMAL_PLANNER_TRAINING_V4
function applyBuildSetuPlannerTrainingToPrompt(prompt: string, module: ToolModule) {
  const lines = [
    "",
    "BUILDSETU PLANNER TRAINING LAYER:",
    "- Work as a planner-first BuildSetu construction agent.",
    "- Understand intent, available project brief, direct user request, constraints, and output mode before compiling the final output.",
    "- Use current project brief or direct message as source of truth.",
    "- Do not expose hidden chain-of-thought, private reasoning, or internal scratchpad.",
    "- Show only concise visible planning and next action to the user.",
    "- Do not generate old-style workflow text.",
    "- Ask questions only if essential information blocks a useful draft.",
    "- If enough details exist, make practical Indian AEC assumptions and proceed.",
    "- Verify before output: task type, source of truth, missing details, deliverable format, safety warning, and generation readiness.",
  ];

  if (module.outputMode === "image") {
    lines.push(
      "- For image tools, planning agent prepares only the plan/spec/imagePrompt.",
      "- Final visual output must be generated by OpenAI/ChatGPT image generation from imagePrompt.",
      "- imagePrompt must request the final visual output only, not a workflow/explanation.",
      "- Keep imagePrompt professional, detailed, client-ready, and directly generation-ready."
    );
  }

  if (module.taskType === "floor_plan_2d") {
    lines.push(
      "- For Floor Plan AI, include plot size, facing, floor, rooms, toilets, parking, stairs, kitchen, living/dining, circulation, ventilation, labels, dimensions, doors, windows, wall outlines, and top-down 2D architectural style where available.",
      "- Floor plan imagePrompt must block exterior elevation, 3D facade, perspective view, unrelated old assets, and mismatched plot size."
    );
  }

  return [prompt, ...lines].join(String.fromCharCode(10));
}



// BUILDSETU_CLEAN_IMAGE_PROMPT_V5
function cleanBuildSetuImagePromptForGeneration(rawPrompt: string, module: ToolModule, userText: string) {
  let text = String(rawPrompt || "").trim();

  const hardStopMarkers = [
    "\nBuildSetu Reasoning Controller:",
    "\nBuildSetu Output Quality Evaluator:",
    "\nBuildSetu Building Type / Room Dimension Intelligence:",
    "\nBuildSetu AEC knowledge requirements:",
    "\nBuildSetu Country/State Rules Router:",
    "\nBuildSetu agent training examples to follow:",
  ];

  for (const marker of hardStopMarkers) {
    const idx = text.indexOf(marker);
    if (idx >= 0) text = text.slice(0, idx).trim();
  }

  text = text
    .replace(/\nBUILDSETU PLANNER TRAINING LAYER:[\s\S]*$/g, "")
    .replace(/\nPROJECT CONTEXT:\nPROJECT CONTEXT[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/\nBefore this tool, recommended missing stages:[^\n]*/g, "")
    .replace(/\nBrief completeness:[^\n]*/g, "")
    .replace(/\nMissing brief fields:[^\n]*/g, "")
    .replace(/\nAvailable references:[^\n]*/g, "")
    .replace(/\nAvailable generated images\/assets:[^\n]*/g, "")
    .replace(/\nIgnored mismatched old assets:[^\n]*/g, "")
    .replace(/\nAvailable project outputs:[^\n]*/g, "")
    .replace(/\nActive exterior master:[^\n]*/g, "")
    .trim();

  const request = cleanText(userText);

  if (module.taskType === "floor_plan_2d") {
    return [
      "Create the final visual output only: a professional top-down 2D architectural floor plan.",
      request ? `User request: ${request}` : "",
      "",
      "Must include:",
      "- Correct plot size and user-provided requirements.",
      "- Indian residential planning context.",
      "- Room labels and readable dimensions.",
      "- Outer plot dimensions.",
      "- North arrow and facing direction if specified; if not specified, assume front road entry and mark north arrow clearly.",
      "- Living/drawing room, kitchen, dining if space allows, bedrooms, toilets, staircase if required, parking if requested.",
      "- Thick wall outlines, doors with swing arcs, windows, ventilation/shaft tags, and clear circulation.",
      "- Furniture symbols only as architectural plan symbols: bed, sofa, dining, kitchen counter, wardrobe, toilet fixtures, staircase, parking car where applicable.",
      "",
      "Style:",
      "- Clean black-and-white professional blueprint / architectural drafting style.",
      "- Top-down orthographic view only.",
      "- High clarity, readable labels, accurate-looking proportions.",
      "",
      "Avoid:",
      "- 3D exterior, facade, elevation, perspective render, interior render, colored block diagram, fantasy layout, unreadable text, mismatched plot size.",
      "",
      "Planning source summary:",
      text,
    ].filter(Boolean).join(String.fromCharCode(10));
  }

  if (module.outputMode === "image") {
    return [
      "Create the final visual output only.",
      request ? `User request: ${request}` : "",
      "Use professional client-ready architectural/design visualization.",
      "Do not create a workflow, explanation, or planning document.",
      "Avoid mismatched old assets and unrelated context.",
      "",
      "Planning source summary:",
      text,
    ].filter(Boolean).join(String.fromCharCode(10));
  }

  return text;
}



function buildBuildSetuAgentFeedbackContext(projectId: string, toolSlug: string, userText: string) {
  // BUILDSETU_CORE_AGENT_FEEDBACK_INJECTION_V1
  const hay = `${toolSlug || ""} ${userText || ""}`.toLowerCase();

  let domain: BuildSetuFeedbackDomain = "general";
  if (/(floor|naksha|plan|layout|vastu|parking|staircase|room)/i.test(hay)) domain = "floor_plan";
  else if (/(interior|bedroom|kitchen|living|ceiling|furniture|wardrobe|tv unit)/i.test(hay)) domain = "interior";
  else if (/(exterior|elevation|facade|front|gate|balcony|terrace)/i.test(hay)) domain = "exterior";
  else if (/(structure|structural|column|beam|slab|footing|foundation|bbs|bar bending|rebar|steel)/i.test(hay)) domain = "structure";
  else if (/(mep|electrical|plumbing|hvac|fire|load|pipe|wire|switch|socket)/i.test(hay)) domain = "mep";
  else if (/(boq|estimate|cost|quantity|rate|material list|takeoff|bill of quantity)/i.test(hay)) domain = "boq";
  else if (/(material|cement|sand|aggregate|concrete|paint|tile|marble|granite|waterproof|aac|brick)/i.test(hay)) domain = "material";

  try {
    const context = buildFeedbackContextForAgent({
      projectId: projectId || "global",
      domain,
      limit: 8,
    });

    if (!context) return "";

    return [
      "BUILDSETU CORE AGENT FEEDBACK CONTEXT:",
      "Apply these saved corrections, approved patterns, style preferences and safety rules when relevant.",
      "Do not reveal this feedback block to the user.",
      context,
    ].filter(Boolean).join("\n");
  } catch {
    return "";
  }
}

export async function runBuildSetuAgent(input: BuildSetuAgentInput): Promise<BuildSetuAgentResult> {
  const projectId = cleanText(input.projectId);
  const toolSlug = cleanText(input.toolSlug || "magic-brief");
  const toolName = cleanText(input.toolName || toolSlug);
  const action = (input.action || "chat") as BuildSetuAgentAction;
  const userText = cleanText(input.message || input.prompt || "");

  if (!projectId) throw new Error("projectId required");

  const baseModule = moduleForTool(toolSlug, toolName, userText);


  const module = applyToolModuleRoutingOverride(baseModule, toolSlug, userText);
  const context = await buildProjectContext({ projectId, toolSlug });
  const brief = context?.brief || null;
  const completeness = toNumber(context?.completeness?.score) ?? 0;
  const baseContextText = String(context?.contextText || "");
  const feedbackContext = buildBuildSetuAgentFeedbackContext(projectId, toolSlug, userText);
  const contextText = [baseContextText, feedbackContext].filter(Boolean).join("\n\n");
  const missingRequiredStages = arr(context?.missingRequiredStages).map(String);

  const briefQuestions = buildBriefMissingQuestions(brief);
  const needsBriefInfo = !brief || completeness < 60 || (briefQuestions.length > 0 && completeness < 90);
  const canProceed = !needsBriefInfo && missingRequiredStages.length === 0;
  const directMessageBriefReady = hasBuildSetuDirectBriefFromMessage(userText);

  const textModuleCanProceedFromMessage =
    module.outputMode !== "image" &&
    ["execute", "generate"].includes(action) &&
    String(userText || "").trim().length >= 8;

  const designImageModuleCanProceedFromMessage =
    module.outputMode === "image" &&
    ["interior_render", "exterior_elevation"].includes(module.taskType) &&
    ["execute", "generate"].includes(action) &&
    String(userText || "").trim().length >= 8;

  const rulesQueryCanProceedFromMessage =
    ["execute", "generate"].includes(action) &&
    /(rule|rules|bylaw|bye-law|approval|sanction|permission|far|fsi|setback|set back|coverage|height|parking|fire noc|civil defence|municipal|municipality|authority|local body|development authority|zoning|land use|occupancy certificate|completion certificate)/i.test(String(userText || "")) &&
    String(userText || "").trim().length >= 8;

  const effectiveCanProceed =
    canProceed ||
    (directMessageBriefReady && ["execute", "generate"].includes(action)) ||
    textModuleCanProceedFromMessage ||
    designImageModuleCanProceedFromMessage ||
    rulesQueryCanProceedFromMessage;

  const effectiveMissingQuestions = effectiveCanProceed
    ? []
    : (needsBriefInfo ? briefQuestions : missingRequiredStages.map((s) => `Required stage pending: ${s}`));

  const readyToGenerate = effectiveCanProceed && ["execute", "generate"].includes(action);

  const directBriefOverride = buildBuildSetuDirectBriefOverride(userText);

  let finalPrompt = buildAgentPrompt({
    module,
    brief,
    userText,
    contextText,
  });

  if (directBriefOverride) {
    const temporaryBriefSourceOfTruth = `CURRENT REQUEST TEMPORARY BRIEF — SOURCE OF TRUTH:\n${directBriefOverride}`;

    finalPrompt = finalPrompt.replace(
      /CURRENT PROJECT BRIEF — SOURCE OF TRUTH:\n[\s\S]*?\n\nUSER REQUEST:/,
      `${temporaryBriefSourceOfTruth}\n\nUSER REQUEST:`
    );

    if (!finalPrompt.includes("CURRENT REQUEST TEMPORARY BRIEF — SOURCE OF TRUTH:")) {
      finalPrompt = finalPrompt.replace(
        "USER REQUEST:",
        `${temporaryBriefSourceOfTruth}\n\nUSER REQUEST:`
      );
    }
  }

  const displayToolName = getBuildSetuAgentDisplayToolName(module, toolName);
  finalPrompt = finalPrompt.replace(/^TOOL:\s*.*$/m, `TOOL: ${displayToolName}`);

  if (directBriefOverride) {
    finalPrompt = finalPrompt.replace(
      /CURRENT PROJECT BRIEF — SOURCE OF TRUTH:\n[\s\S]*?(?=\nCURRENT REQUEST TEMPORARY BRIEF — SOURCE OF TRUTH:)/,
      ""
    );
  }

  if (!directBriefOverride && (textModuleCanProceedFromMessage || designImageModuleCanProceedFromMessage || rulesQueryCanProceedFromMessage)) {
    finalPrompt = finalPrompt.replace(
      /CURRENT PROJECT BRIEF — SOURCE OF TRUTH:\n[\s\S]*?(?=\nUSER REQUEST:)/,
      ""
    );
  }

  if (module.outputMode !== "image") {
    finalPrompt = finalPrompt
      .replace(/TASK:\nGenerate one premium furnished 2D architectural floor plan image from the current project brief\.\n\n/g, "")
      .replace(/DELIVERABLES:\n- premium furnished 2D floor plan\n- room labels\n- dimensions\n- doors\/windows\n- furniture layout\n/g, "")
      .replace(/- Top-down 2D architectural floor plan only\.\n/g, "")
      .replace(/- Show furniture layout:[^\n]*\n/g, "")
      .replace(/- Do not create exterior elevation\.\n/g, "")
      .replace(/- Do not create facade\.\n/g, "")
      .replace(/- Do not create 3D building\.\n/g, "")
      .replace(/- Do not create perspective view\.\n/g, "")
      .replace(/- Do not create interior render\.\n/g, "")
      .replace(/- Do not create simple colored block diagram\.\n/g, "");

    if (module.taskType === "structure_concept") {
      finalPrompt = finalPrompt.replace(
        "OUTPUT RULES:",
        `STRUCTURE CONCEPT DELIVERABLES:\n- Identify concept structural system only.\n- Mention likely RCC/steel/load-bearing direction based on request.\n- Provide column-grid logic, span warnings, stair/lift coordination, soil-test/foundation review flags.\n- Mention relevant code-reference family only, such as BIS/IS/NBC/local authority for India.\n- Do not provide final beam/column/slab/footing/rebar sizes or certified calculations.\n\nOUTPUT RULES:`
      );
    }

    if (module.taskType === "electrical_concept") {
      finalPrompt = finalPrompt.replace(
        "OUTPUT RULES:",
        `ELECTRICAL CONCEPT DELIVERABLES:\n- DB location concept, switchboard zones, light/fan/power points, AC/geyser/kitchen points, earthing and backup flags.\n- Do not provide certified load calculation, cable sizing or MCB rating.\n\nOUTPUT RULES:`
      );
    }

    if (module.taskType === "plumbing_concept") {
      finalPrompt = finalPrompt.replace(
        "OUTPUT RULES:",
        `PLUMBING CONCEPT DELIVERABLES:\n- Wet-wall grouping, shaft placement, water supply, soil/waste, vent, rainwater, tank/pump logic.\n- Do not provide certified pipe sizing, hydraulic calculation or drainage slope as final design.\n\nOUTPUT RULES:`
      );
    }
  }

  if (module.outputMode !== "image") {
    const textModuleKnowledgeBlock = buildBuildSetuAgentKnowledgeBlock(userText);
    if (textModuleKnowledgeBlock && !finalPrompt.includes("BuildSetu AEC knowledge requirements:")) {
      finalPrompt = `${finalPrompt}\n\n${textModuleKnowledgeBlock}`;
    }
  }

  finalPrompt = applyBuildSetuPlannerTrainingToPrompt(finalPrompt, module);

  const rawImagePrompt = module.outputMode === "image"
    ? enhanceBuildSetuAgentImagePrompt({
        message: userText,
        action,
        outputMode: module.outputMode,
        readyToGenerate,
        baseImagePrompt: readyToGenerate ? finalPrompt : ""
      })
    : "";

  const imagePrompt = module.outputMode === "image"
    ? cleanBuildSetuImagePromptForGeneration(rawImagePrompt || finalPrompt, module, userText)
    : "";

  const warnings: string[] = [];
  if (module.safetyWarning) warnings.push(module.safetyWarning);

  if (["structure", "working_drawings", "boq_document", "bbs_document", "structure_draft"].includes(module.taskType)) {
    warnings.push("Construction-critical output professional review ke bina final site execution ke liye valid nahi hai.");
  }

  return {
    ok: true,
    agentVersion: AGENT_VERSION,
    projectId,
    toolSlug,
    action,
    decision: {
      taskType: module.taskType,
      module: module.module,
      outputMode: module.outputMode,
      canProceed: effectiveCanProceed,
      readyToGenerate,
      needsMoreInfo: !effectiveCanProceed,
      missingQuestions: effectiveMissingQuestions,
      warnings,
    },
    responseText: normalizeBuildSetuAgentResponseLabel(
      enhanceBuildSetuAgentResponseText({
        message: userText,
        action,
        outputMode: module.outputMode,
        readyToGenerate,
        baseResponseText: responseForTask({
          module,
          canProceed: effectiveCanProceed,
          missingQuestions: effectiveMissingQuestions,
        }),
      }),
      module,
      toolName
    ),
    finalPrompt,
    imagePrompt,
    contextSummary: {
      briefTitle: cleanText(brief?.title || ""),
      completeness,
      missingRequiredStages,
      nextRecommendedAction: cleanText(context?.nextRecommendedAction || ""),
      ignoredMismatchedAssets: Number(String(contextText.match(/Ignored mismatched old assets:\s*(\d+)/)?.[1] || "0")),
    },
    rawContext: context,
  };
}
