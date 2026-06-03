import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { buildProjectContext } from "@/lib/project-context-builder";
import { runBuildSetuAgent } from "@/lib/agents/buildsetu-agent";
import { getBuildSetuToolTaskLock } from "@/lib/buildsetu-tool-task-lock";
import { appendProjectMemoryEvent } from "@/lib/project-memory-events";
import { runArchitectPlanningAgent } from "@/lib/floor-plan/architect-agent";
import { generateExactFloorPlanAsset } from "@/lib/floor-plan/exact-planner";
import { startFloorPlanPresentationJob } from "@/lib/floor-plan/presentation-jobs";
import { generateLockedWorkingSet, lockLatestProjectPlan } from "@/lib/planning/project-plan-lock";
import { generateProfessionalOpenAIFloorPlan } from "@/lib/planning/professional-floor-plan-openai";
import { attachUniversalQualityBrainToPrompt, type BuildSetuAgentDomain } from "@/lib/agent-knowledge/universal-quality-brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRole = "assistant" | "user" | "system";

type SavedMessage = {
  id: string;
  role: ChatRole;
  text: string;
  time: string;
  kind?: "normal" | "prompt" | "output";
};

type ThreadStore = {
  threads: Record<
    string,
    {
      projectId: string;
      projectTitle: string;
      toolSlug: string;
      toolName: string;
      messages: SavedMessage[];
      outputs: any[];
      projectMemory?: string;
      updatedAt: string;
    }
  >;
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const TOOL_CHAT_FILE = path.join(DATA_DIR, "tool-chat-history.json");

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function threadKey(projectId: string, toolSlug: string) {
  return `${projectId || "default"}::${toolSlug || "tool"}`;
}

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function latestUserText(messages: any[]) {
  return safe([...messages].reverse().find((item) => item?.role === "user")?.text);
}

function compactJson(value: unknown, max = 1800) {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return text.length > max ? `${text.slice(0, max)}...` : text;
  } catch {
    return "";
  }
}

function cleanIncomingMessages(messages: any[]): SavedMessage[] {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message && typeof message === "object")
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message): SavedMessage => {
      const role: ChatRole = message.role === "user" ? "user" : "assistant";

      return {
        id: safe(message.id, makeId()),
        role,
        text: safe(message.text || message.content || message.message),
        time: safe(message.time, nowTime()),
        kind: "normal",
      };
    })
    .filter((message) => message.text);
}

async function readStore(): Promise<ThreadStore> {
  try {
    const raw = await fs.readFile(TOOL_CHAT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.threads) return parsed;
  } catch {}
  return { threads: {} };
}

async function writeStore(store: ThreadStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TOOL_CHAT_FILE, JSON.stringify(store, null, 2), "utf8");
}

async function getProjectMemory(projectId: string, toolSlug: string) {
  try {
    const context = await buildProjectContext({ projectId, toolSlug });
    return compactJson(context, 2200);
  } catch {
    return "";
  }
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function detectTask(toolSlug: string, userText: string) {
  const text = userText.toLowerCase();

  if (toolSlug === "floor-plan-ai") {
    if (
      hasAny(text, [
        "first floor",
        "1st floor",
        "ff",
        "upper floor",
        "upar",
        "upar wala",
        "pehla floor",
        "dusra floor",
        "second floor",
        "terrace floor",
      ])
    ) {
      return "first_floor_plan";
    }

    if (
      hasAny(text, [
        "ground floor",
        "gf",
        "ground",
        "neeche",
        "niche",
        "base floor",
        "lower floor",
        "parking floor",
      ])
    ) {
      return "ground_floor_plan";
    }

    if (
      hasAny(text, [
        "g+1",
        "g plus 1",
        "g plus one",
        "duplex",
        "both floor",
        "all floor",
        "dono floor",
        "ground and first",
        "full plan",
        "complete plan",
        "poora plan",
        "pura plan",
      ])
    ) {
      return "g_plus_1_floor_plan";
    }

    if (
      hasAny(text, [
        "working plan",
        "working drawing",
        "dimension plan",
        "architectural drawing",
        "construction plan",
      ])
    ) {
      return "working_floor_plan";
    }

    return "floor_plan_2d";
  }

  if (toolSlug === "interior-render") {
    if (hasAny(text, ["bedroom", "master bedroom", "kids room", "guest room"])) return "bedroom_interior";
    if (hasAny(text, ["kitchen", "modular kitchen"])) return "kitchen_interior";
    if (hasAny(text, ["living", "hall", "drawing room", "tv unit", "lounge"])) return "living_room_interior";
    if (hasAny(text, ["bathroom", "toilet", "washroom"])) return "bathroom_interior";
    return "interior_render";
  }

  if (toolSlug === "exterior-elevation") {
    if (hasAny(text, ["front", "front view", "facade", "main elevation"])) return "front_elevation";
    if (hasAny(text, ["side", "side view", "left view", "right view"])) return "side_elevation";
    if (hasAny(text, ["night", "lighting", "evening"])) return "night_elevation";
    return "exterior_elevation";
  }

  // BUILDSETU_TOOL_CHAT_MEP_STRUCTURE_DETECT_TASK_V1
  if (toolSlug.includes("boq")) return "boq_document";
  if (toolSlug.includes("bbs")) return "bbs_document";
  if (toolSlug.includes("electrical")) return "electrical_concept";
  if (toolSlug.includes("plumbing")) return "plumbing_concept";
  if (toolSlug.includes("mep")) return "mep_concept";
  if (toolSlug.includes("working")) return "working_drawing";
  if (
    toolSlug.includes("structure") ||
    toolSlug.includes("structural") ||
    toolSlug.includes("rcc") ||
    toolSlug.includes("column-beam")
  ) return "structure_concept";

  return "tool_task";
}


function isCompleteFloorPlanRequirement(text: string) {
  const t = String(text || "").toLowerCase();

  const hasPlot = /\b\d{2,3}\s*[x×]\s*\d{2,3}\b/.test(t);
  const hasFacing = /\b(north|south|east|west)\b/.test(t) || /facing/.test(t);
  const hasFloor = /ground|gf|first|1st|floor|g\+1/.test(t);
  const hasBedrooms = /\b[1-6]\s*bhk\b|\b[1-6]\s*bed(room)?s?\b/.test(t);
  const hasToilet = /toilet|bath|washroom/.test(t);
  const hasKitchen = /kitchen|rasoi/.test(t);
  const hasPlanningIntent = /plan|floor plan|naksha|layout|planning/.test(t);

  const hasCore =
    hasPlot &&
    hasFacing &&
    hasFloor &&
    hasBedrooms &&
    hasToilet &&
    hasKitchen &&
    hasPlanningIntent;

  return hasCore;
}




function isProfessionalOpenAIFloorPlanRequest(text: string) {
  const t = String(text || "").toLowerCase();

  const wantsPlan =
    /floor\s*plan|naksha|naks[a-z]*|plan\s*banao|ghar\s+ka\s+plan|ground\s+floor|first\s+floor|second\s+floor|professional\s+plan|proper\s+plan|architect\s+plan/.test(t);

  const isWorkingSet =
    /working\s+drawing|working\s+set|complete\s+working|column|colom|beam|footing|foundation|slab|electrical|plumbing|drainage|toilet\s+detail/.test(t);

  const isLock =
    /lock\s+karo|locked\s+plan|current\s+plan\s+lock/.test(t);

  return wantsPlan && !isWorkingSet && !isLock;
}


function isProjectPlanLockRequest(text: string) {
  const t = String(text || "").toLowerCase();

  return (
    /current\s+plan\s+lock/.test(t) ||
    /plan\s+lock\s+karo/.test(t) ||
    /lock\s+current\s+plan/.test(t) ||
    /lock\s+this\s+plan/.test(t) ||
    /is\s+project\s+ka\s+current\s+plan\s+lock/.test(t) ||
    /isi\s+plan\s+ko\s+lock/.test(t)
  );
}

function isLockedPlanWorkingSetRequest(text: string) {
  const t = String(text || "").toLowerCase();

  const hasLockedRef =
    /locked\s+plan/.test(t) ||
    /isi\s+locked/.test(t) ||
    /same\s+locked/.test(t) ||
    /isi\s+plan\s+ke\s+according/.test(t) ||
    /same\s+plan\s+ke\s+according/.test(t) ||
    /jo\s+plan\s+generate/.test(t) ||
    /base\s+plan/.test(t);

  const wantsDerived =
    /working\s+drawing|working\s+set|complete\s+working|dimension\s+plan|furniture\s+plan|column|colom|beam|footing|foundation|slab|electrical|plumbing|drainage|toilet\s+detail|second\s+floor|first\s+floor|terrace|roof|floor\s+plan/.test(t);

  return hasLockedRef && wantsDerived;
}

function summarizeLockedWorkingSetOutput(result: any) {
  const sheets = Array.isArray(result?.planningPackage?.workingPlans)
    ? result.planningPackage.workingPlans
        .map((sheet: any) => sheet?.title || sheet?.type || "")
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const derivedFloor = String(result?.request?.derivedFloor || "").trim();

  const header = derivedFloor
    ? `Locked plan ke according ${derivedFloor} planning package ready hai.`
    : "Locked plan ke according complete working drawing package ready hai.";

  const sheetText = sheets.length
    ? `\n\nIncluded sheets:\n${sheets.map((item: string, index: number) => `${index + 1}. ${item}`).join("\n")}`
    : "";

  const generatedCount = Number(result?.generatedSheets?.count || 0);
  const generatedText = generatedCount
    ? `\n\nGenerated drawing files: ${generatedCount} SVG working sheets gallery/output me save ho gaye.`
    : "";

  return `${header}

Base plan change nahi kiya gaya. Staircase, shaft, wet zone aur column/grid alignment locked plan se follow karna hai.${sheetText}${generatedText}

Note: Column, beam, slab, footing aur structural details concept-level hain; final RCC design licensed structural engineer verify karega.`;
}



function isReadOnlyKnowledgeChatRequest(action: string, toolSlug: string, toolName: string, userText: string) {
  const a = String(action || "").toLowerCase();
  const slug = String(toolSlug || "").toLowerCase();
  const name = String(toolName || "").toLowerCase();
  const text = String(userText || "").toLowerCase();

  if (a !== "chat") return false;

  const isKnowledgeTool =
    slug.includes("knowledge") ||
    name.includes("knowledge") ||
    text.includes("saved knowledge") ||
    text.includes("saved pdf") ||
    text.includes("saved audio") ||
    text.includes("saved video") ||
    text.includes("knowledge me") ||
    text.includes("knowledge mein");

  if (!isKnowledgeTool) return false;

  const hasHardGenerationIntent = hasAny(text, [
    "generate image",
    "image generate",
    "render",
    "create image",
    "draw",
    "floor plan banao",
    "plan banao",
    "design banao",
    "execute",
    "run tool",
    "tool run",
  ]);

  return !hasHardGenerationIntent;
}

function wantsGeneration(action: string, userText: string) {
  const text = userText.toLowerCase();

  if (action === "execute") return true;

  return hasAny(text, [
    "generate",
    "banao",
    "bnao",
    "bana",
    "banana",
    "banado",
    "bna do",
    "bana do",
    "do",
    "de do",
    "chahiye",
    "chahie",
    "chahta",
    "chahti",
    "create",
    "draw",
    "design",
    "plan",
    "layout",
    "render",
    "image",
    "output",
    "draft",
    "naksha",
    "map",
    "view",
    "elevation",
    "interior",
    "boq",
    "bbs",
    "working drawing",
    "estimate",
  ]);
}


// BUILDSETU_FLOOR_PLAN_EXACT_DIMENSION_LOCK_V1
function bsFloorPlanExactDimensionLock(sourceText: any) {
  const raw = String(sourceText || "").replace(/\s+/g, " ").trim();

  const match =
    raw.match(/(?:plot|site|project|size|house|plan)?[^0-9]{0,30}([0-9]{2,3}(?:\.[0-9]+)?)\s*(?:x|×|by|\*)\s*([0-9]{2,3}(?:\.[0-9]+)?)/i) ||
    raw.match(/([0-9]{2,3}(?:\.[0-9]+)?)\s*ft\s*(?:x|×|by|\*)\s*([0-9]{2,3}(?:\.[0-9]+)?)\s*ft/i);

  if (!match) {
    return [
      "MANDATORY FLOOR PLAN DIMENSION RULE:",
      "Use exact project plot dimensions from project memory. Do not invent square plot dimensions.",
      "Dimension labels must match the project title and project brief exactly.",
    ].join("\\n");
  }

  const width = Number(match[1]);
  const depth = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(depth) || width <= 0 || depth <= 0) {
    return "";
  }

  const facingMatch = raw.match(/\b(north|south|east|west|north-east|north-west|south-east|south-west)\b/i);
  const facing = facingMatch ? facingMatch[1].toUpperCase() : "";

  return [
    "MANDATORY EXACT PLOT SIZE LOCK:",
    `Plot size is exactly ${width}' x ${depth}'${facing ? `, ${facing} facing` : ""}.`,
    `Draw the outer plot boundary as a rectangle, not a square.`,
    `Horizontal/frontage dimension label must be ${width}' exactly.`,
    `Vertical/depth dimension label must be ${depth}' exactly.`,
    `Never label both sides as ${depth}' x ${depth}' or ${width}' x ${width}'.`,
    `Title block must mention ${width}' x ${depth}' exactly.`,
    "Room layout must fit inside this exact rectangle.",
    "If drawing dimension labels, all labels must be consistent with the exact plot size.",
  ].join("\\n");
}




function isBuildSetuTextOnlyToolChatAction(action: string, toolSlug: string, taskType: string) {
  // BUILDSETU_TOOL_CHAT_TEXT_ONLY_CHAT_BYPASS_V1
  const a = String(action || "").toLowerCase();
  if (!["chat", "ask"].includes(a)) return false;

  const slug = String(toolSlug || "").toLowerCase();
  const task = String(taskType || "").toLowerCase();

  if (
    slug.includes("boq") ||
    slug.includes("bbs") ||
    slug.includes("electrical") ||
    slug.includes("plumbing") ||
    slug.includes("structure") ||
    slug.includes("working")
  ) {
    return true;
  }

  return [
    "boq_document",
    "bbs_document",
    "electrical_concept",
    "plumbing_concept",
    "structure_drawing",
    "structure_concept",
    "working_drawing",
  ].includes(task);
}

function domainForToolFeedbackBrain(toolSlug: string, userText: string): BuildSetuAgentDomain {
  const slug = String(toolSlug || "").toLowerCase();
  const text = String(userText || "").toLowerCase();

  if (slug.includes("floor") || /floor\s*plan|naksha|layout|plot|parking|stair|bedroom|kitchen|toilet|vastu|road|facing/.test(text)) {
    return "floor_plan";
  }

  if (slug.includes("interior") || /interior|bedroom design|kitchen design|living|wardrobe|false ceiling|furniture|lighting|tile|paint|laminate/.test(text)) {
    return "interior";
  }

  if (slug.includes("exterior") || slug.includes("elevation") || /exterior|elevation|facade|front view|boundary|gate|balcony|cladding/.test(text)) {
    return "exterior";
  }

  if (slug.includes("structure") || slug.includes("bbs") || /structure|column|beam|slab|footing|foundation|rcc|steel|load|span|bbs/.test(text)) {
    return "structure";
  }

  if (slug.includes("boq") || /boq|estimate|cost|rate|quantity|material|cement|steel|sand|aggregate|brick/.test(text)) {
    return "boq";
  }

  if (slug.includes("mep") || /plumbing|electrical|mep|drainage|water supply|hvac/.test(text)) {
    return "mep";
  }

  return "general";
}

function attachToolFeedbackBrain(args: {
  basePrompt: string;
  projectId?: string;
  toolSlug: string;
  projectTitle: string;
  userText: string;
}) {
  return attachUniversalQualityBrainToPrompt({
    basePrompt: args.basePrompt,
    projectId: args.projectId || "global",
    domain: domainForToolFeedbackBrain(args.toolSlug, args.userText),
    projectTitle: args.projectTitle,
  });
}

function buildToolPrompt(args: {
  projectId?: string;
  toolSlug: string;
  toolName: string;
  projectTitle: string;
  userText: string;
  projectMemory: string;
  taskType: string;
}) {
  const { projectId, toolSlug, toolName, projectTitle, userText, projectMemory, taskType } = args;

  if (toolSlug === "floor-plan-ai") {
    const floorPlanExactDimensionLock = bsFloorPlanExactDimensionLock(`${projectTitle}\n${projectMemory}\n${userText}`);

    return attachToolFeedbackBrain({
      basePrompt: [
        floorPlanExactDimensionLock,
        "CRITICAL: The generated floor plan must obey the exact dimension lock above. If the project is 41 x 51, do not draw or label 51 x 51.",
      "STRICT ARCHITECTURAL FLOOR PLAN MODE.",
      "Generate ONLY a flat 2D top-view architectural floor plan sheet.",
      "Do NOT generate exterior elevation, facade, 3D house, perspective render, interior render, or random building photo.",
      "",
      `Project: ${projectTitle}`,
      `Requested task: ${taskType}`,
      `User instruction: ${userText}`,
      "",
      "Use the selected project details as source of truth.",
      "If project details include plot size, facing, floors, rooms, vastu, parking, staircase, road side, use them exactly.",
      "",
      "Drawing requirements:",
      "- professional client-ready architectural floor plan",
      "- top-down orthographic plan",
      "- room labels in English",
      "- approximate room dimensions",
      "- wall thickness, doors, windows, stair arrows",
      "- parking/porch if requested or present in project brief",
      "- road labels and north arrow",
      "- vastu zoning if project asks for vastu",
      "",
      "Project memory/context:",
      projectMemory || "Project context unavailable. Use user instruction only.",
      ].join("\n"),
      projectId,
      toolSlug,
      projectTitle,
      userText,
    });
  }

  if (toolSlug === "interior-render") {
    return attachToolFeedbackBrain({
      basePrompt: [
      "STRICT INTERIOR RENDER MODE.",
      "Generate ONLY an interior room render for the selected project.",
      "Do NOT generate floor plan, exterior elevation, facade, or building massing.",
      "",
      `Project: ${projectTitle}`,
      `Requested task: ${taskType}`,
      `User instruction: ${userText}`,
      "",
      "Use selected project memory, locked references, style, room type, material palette, lighting, furniture and layout context.",
      "Output must be client-ready, realistic, clean, and practical for Indian residential execution.",
      "",
      "Project memory/context:",
      projectMemory || "Project context unavailable. Use user instruction only.",
      ].join("\n"),
      projectId,
      toolSlug,
      projectTitle,
      userText,
    });
  }

  if (toolSlug === "exterior-elevation") {
    return attachToolFeedbackBrain({
      basePrompt: [
      "STRICT EXTERIOR ELEVATION MODE.",
      "Generate ONLY exterior elevation/facade output for the selected project.",
      "Do NOT generate floor plan or interior render.",
      "",
      `Project: ${projectTitle}`,
      `Requested task: ${taskType}`,
      `User instruction: ${userText}`,
      "",
      "Use project memory for plot size, floors, road side, facing, balcony, gate, material and style.",
      "Output must be a clean client-ready exterior elevation view.",
      "",
      "Project memory/context:",
      projectMemory || "Project context unavailable. Use user instruction only.",
      ].join("\n"),
      projectId,
      toolSlug,
      projectTitle,
      userText,
    });
  }

  return attachToolFeedbackBrain({
    basePrompt: [
    `STRICT ${toolName.toUpperCase()} MODE.`,
    `Generate only the selected tool output: ${toolName}.`,
    `Project: ${projectTitle}`,
    `Requested task: ${taskType}`,
    `User instruction: ${userText}`,
    "",
    "Use selected project memory as source of truth.",
    "",
    "Project memory/context:",
    projectMemory || "Project context unavailable. Use user instruction only.",
    ].join("\n"),
    projectId,
    toolSlug,
    projectTitle,
    userText,
  });
}


function isBuildSetuTextDocumentTaskForVisibleResponse(toolSlug: string, taskType: string) {
  // BUILDSETU_TOOL_CHAT_VISIBLE_TEXT_RESPONSE_V1
  const slug = String(toolSlug || "").toLowerCase();
  const task = String(taskType || "").toLowerCase();

  if (
    slug.includes("boq") ||
    slug.includes("bbs") ||
    slug.includes("electrical") ||
    slug.includes("plumbing") ||
    slug.includes("structure") ||
    slug.includes("structural") ||
    slug.includes("rcc") ||
    slug.includes("working")
  ) {
    return true;
  }

  return [
    "boq_document",
    "bbs_document",
    "electrical_concept",
    "plumbing_concept",
    "structure_concept",
    "structure_drawing",
    "working_drawing",
  ].includes(task);
}

function cleanBuildSetuVisibleResponseText(value: unknown) {
  return String(value || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function enrichBuildSetuVisibleResponseForTask(responseText: string, toolSlug: string, taskType: string) {
  // BUILDSETU_TOOL_CHAT_VISIBLE_RESPONSE_TASK_ADDENDUM_V1
  const base = cleanBuildSetuVisibleResponseText(responseText);
  const slug = String(toolSlug || "").toLowerCase();
  const task = String(taskType || "").toLowerCase();
  const hay = `${slug} ${task}`;
  const low = base.toLowerCase();

  function appendOnce(title: string, lines: string[]) {
    if (low.includes(title.toLowerCase())) return base;
    return cleanBuildSetuVisibleResponseText([
      base,
      "",
      title,
      ...lines,
    ].join("\n"));
  }

  if (hay.includes("electrical")) {
    return appendOnce("Electrical concept checklist:", [
      "- Light points: room-wise light and fan point planning.",
      "- Switch boards: room-wise switchboard zones and control grouping.",
      "- Socket points: 6A/16A power sockets for room, kitchen, utility and appliance zones.",
      "- DB location: dry, accessible distribution board location with MCB/RCCB review.",
      "- Safety boundary: final load calculation, wire size, MCB rating, earthing and execution require licensed electrician/electrical engineer verification.",
    ]);
  }

  if (hay.includes("plumbing")) {
    return appendOnce("Plumbing concept checklist:", [
      "- Water supply: kitchen/toilet/utility water point routing concept.",
      "- Drainage: soil pipe, waste pipe and floor trap routing concept.",
      "- Shaft: wet wall and plumbing shaft coordination.",
      "- Slope/pressure: drainage slope and water pressure assumptions must be verified.",
      "- Safety boundary: pipe sizing, waterproofing, sewer/STP/septic connection and site execution require qualified plumbing/MEP professional verification.",
    ]);
  }

  if (hay.includes("boq")) {
    return appendOnce("BOQ estimate checklist:", [
      "- Quantity assumptions: item-wise quantities must come from drawings/site measurement.",
      "- Rate assumptions: city, material grade, labour scope and GST/transport assumptions must be stated.",
      "- Review boundary: final BOQ/estimate requires QS/estimator/site verification.",
    ]);
  }

  if (hay.includes("bbs")) {
    return appendOnce("BBS draft checklist:", [
      "- Member-wise schedule: footing, column, beam, slab and stair members where drawings are available.",
      "- Bar details: dia, spacing, lap, hook, bend and cutting length must not be invented.",
      "- Review boundary: final BBS requires structural drawings and licensed structural engineer approval.",
    ]);
  }

  if (hay.includes("structure")) {
    return appendOnce("Structure concept checklist:", [
      "- Column/beam/slab/foundation coordination must stay concept-level.",
      "- Do not provide final member sizes, rebar design or certified calculations.",
      "- Review boundary: final structural design requires soil data, drawings and licensed structural engineer approval.",
    ]);
  }

  return base;
}

function buildVisibleToolChatAssistantText(args: {
  toolSlug: string;
  toolName: string;
  taskType: string;
  shouldGenerate: boolean;
  buildSetuAgentResult?: any;
  fallbackText: string;
}) {
  const { toolSlug, taskType, shouldGenerate, buildSetuAgentResult, fallbackText } = args;

  if (!shouldGenerate && isBuildSetuTextDocumentTaskForVisibleResponse(toolSlug, taskType)) {
    const responseText = cleanBuildSetuVisibleResponseText(buildSetuAgentResult?.responseText);
    if (responseText) return enrichBuildSetuVisibleResponseForTask(responseText, toolSlug, taskType);
  }

  return fallbackText;
}


async function fetchBuildSetuCoreAgentResponseForTextChat(args: {
  req: NextRequest;
  projectId: string;
  toolSlug: string;
  toolName: string;
  userText: string;
}) {
  // BUILDSETU_TOOL_CHAT_CORE_RESPONSE_BRIDGE_V1
  try {
    const res = await fetch(new URL("/api/agent/run", args.req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: args.req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        projectId: args.projectId,
        toolSlug: args.toolSlug,
        toolName: args.toolName,
        action: "chat",
        message: args.userText,
      }),
    });

    const data = await res.json().catch(() => null);
    if (data && data.ok && typeof data.responseText === "string" && data.responseText.trim()) {
      return data;
    }
  } catch {
    return null;
  }

  return null;
}

function buildAssistantText(args: {
  toolSlug: string;
  toolName: string;
  taskType: string;
  shouldGenerate: boolean;
}) {
  const { toolSlug, toolName, taskType, shouldGenerate } = args;

  if (shouldGenerate) {
    if (toolSlug === "floor-plan-ai") {
      return `Samjha. ${toolName} ke rules ke under ${taskType.replaceAll("_", " ")} generate kar raha hoon. Project details aur chat instruction use honge.`;
    }

    return `Samjha. ${toolName} ke rules ke under output generate kar raha hoon. Project details aur chat instruction use honge.`;
  }

  if (toolSlug === "floor-plan-ai") {
    return "Samjha. Floor Plan AI selected project details se chalega. Batao: ground floor, first floor, G+1, parking, rooms, staircase aur vastu me kya chahiye?";
  }

  if (toolSlug === "interior-render") {
    return "Samjha. Interior Render selected project memory se chalega. Room type, style, material, lighting aur reference details likho.";
  }

  if (toolSlug === "exterior-elevation") {
    return "Samjha. Exterior Elevation selected project memory se chalega. Front/side view, floors, material, balcony, gate aur style details likho.";
  }

  return `Samjha. ${toolName} selected project details se chalega. Requirement likho, main tool-specific output ready karunga.`;
}

function isImageTool(toolSlug: string, lock: any) {
  if (lock && lock.allowImageGeneration === false) return false;

  return [
    "floor-plan-ai",
    "interior-render",
    "exterior-elevation",
    "sketch-to-plan",
    "site-photo-redesign",
    "render-enhancer",
    "mood-board",
    "material-palette-ai",
    "false-ceiling-ai",
  ].includes(toolSlug);
}


// BUILDSETU_FLOOR_PLAN_TOOL_COMMAND_ROUTER_V1
function bsFloorPlanCommandText(value: any) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function bsDetectFloorPlanToolCommand(rawText: any) {
  const text = bsFloorPlanCommandText(rawText);

  if (!text) return null;

  const isFloor = /floor|florr|plan|naksha|naks?ha|layout|drawing|working|dimension|furniture|terrace|roof|ground|first|1st|g\+1/i.test(text);
  if (!isFloor) return null;

  if (/working|drawing set|complete set|full set|construction drawing|submission/i.test(text)) {
    return {
      kind: "working_drawing_set",
      assetType: "working_drawing_sheet",
      title: "Complete Working Drawing Set",
      shortLabel: "working drawing set",
      mode: "working-set",
      instruction: "Generate a complete architectural working drawing set from the locked project plan. Include cover sheet, architectural floor plan, furniture layout, dimension plan, door-window schedule, terrace plan, site/setback plan, staircase detail, electrical layout concept, plumbing layout concept, drainage layout concept and presentation plan. Keep RCC/structural items only as concept-level coordination and mark engineer review required.",
    };
  }

  if (/ground|g\.?f\.?|gf|main floor|lower floor/i.test(text)) {
    return {
      kind: "ground_floor_plan",
      assetType: "ground_floor_plan",
      title: "Ground Floor Plan",
      shortLabel: "ground floor plan",
      mode: "ground-floor",
      instruction: "Generate only the ground floor architectural plan from the locked project brief. Show room names, walls, entry, parking, living, kitchen, puja, staircase, toilet/wash, circulation, north arrow, plot boundary and key dimensions. Do not generate first floor in this output.",
    };
  }

  if (/first|1st|upper floor|second level|g\+1.*floor|floor 1/i.test(text)) {
    return {
      kind: "first_floor_plan",
      assetType: "first_floor_plan",
      title: "First Floor Plan",
      shortLabel: "first floor plan",
      mode: "first-floor",
      instruction: "Generate only the first floor architectural plan coordinated with the locked ground floor plan. Align staircase, vertical shafts, wet areas and structural wall lines. Show room names, terrace/balcony if applicable, circulation, north arrow and key dimensions. Do not generate ground floor in this output.",
    };
  }

  if (/terrace|roof|mumty|stair head|water tank/i.test(text)) {
    return {
      kind: "terrace_plan",
      assetType: "terrace_plan",
      title: "Roof / Terrace Plan",
      shortLabel: "terrace plan",
      mode: "terrace-plan",
      instruction: "Generate only the roof / terrace plan from the locked project plan. Include staircase headroom/mumty, terrace open area, parapet, water tank zone, drainage slope arrows, rainwater outlet points, service shaft continuation and key dimensions.",
    };
  }

  if (/furniture|bed layout|sofa|dining|wardrobe|interior furniture/i.test(text)) {
    return {
      kind: "furniture_layout",
      assetType: "furniture_layout",
      title: "Furniture Layout",
      shortLabel: "furniture layout",
      mode: "furniture-layout",
      instruction: "Generate only the furniture layout over the locked floor plan. Show beds, wardrobe, sofa, dining, kitchen counter, toilet fixtures, parking car, puja placement, circulation clearance and room labels. Keep it as an architectural furniture planning sheet.",
    };
  }

  if (/dimension|measurement|size|wall length|room size|dimensional/i.test(text)) {
    return {
      kind: "dimension_plan",
      assetType: "dimension_plan",
      title: "Dimension Plan",
      shortLabel: "dimension plan",
      mode: "dimension-plan",
      instruction: "Generate only the dimension plan from the locked floor plan. Show plot dimensions, room sizes, wall-to-wall dimensions, opening positions, staircase dimensions, parking dimensions, north arrow and clear readable dimension strings.",
    };
  }

  if (/door|window|opening|schedule/i.test(text)) {
    return {
      kind: "door_window_schedule",
      assetType: "door_window_schedule",
      title: "Door Window Schedule",
      shortLabel: "door window schedule",
      mode: "door-window-schedule",
      instruction: "Generate a door and window marking plan with opening IDs and a compact schedule. Include D1/D2/D3 and W1/W2 style labels, approximate sizes, swing direction, ventilation notes and room-wise opening placement.",
    };
  }

  if (/column|colom|column layout|pillar/i.test(text)) {
    return {
      kind: "architectural_column_coordination",
      assetType: "column_layout_concept",
      title: "Column Layout Concept",
      shortLabel: "column layout concept",
      mode: "column-layout-concept",
      instruction: "Generate an architectural column location coordination plan only. Align conceptual columns with room corners, external walls, staircase zone and major wall intersections. Mark clearly: final RCC column design must be verified by licensed structural engineer.",
    };
  }

  if (/electrical|light|switch|socket/i.test(text)) {
    return {
      kind: "electrical_layout_concept",
      assetType: "electrical_layout_concept",
      title: "Electrical Layout Concept",
      shortLabel: "electrical layout concept",
      mode: "electrical-layout-concept",
      instruction: "Generate an electrical layout concept over the locked floor plan. Include light points, switch boards, socket points, fan points, DB location concept and room-wise labels. Mark as concept-level layout.",
    };
  }

  if (/plumbing|pipe|water line|drainage|sewer/i.test(text)) {
    return {
      kind: "plumbing_layout_concept",
      assetType: "plumbing_layout_concept",
      title: "Plumbing / Drainage Layout Concept",
      shortLabel: "plumbing layout concept",
      mode: "plumbing-layout-concept",
      instruction: "Generate a plumbing and drainage concept layout over the locked floor plan. Include kitchen/toilet/wash water points, drainage route concept, shaft/duct, rainwater outlet if terrace-related and service notes.",
    };
  }

  return null;
}

function bsBuildFloorPlanCommandPrompt(command: any, originalText: string, projectId: string) {
  if (!command) return originalText;

  return [
    `[Floor Plan Tool Command: ${command.title}]`,
    `ProjectId: ${projectId || "current-project"}`,
    `User request: ${originalText}`,
    ``,
    command.instruction,
    ``,
    `Use the current locked project brief and locked source plan as the only planning basis.`,
    `Maintain same plot, facing, room requirements, staircase, parking and vastu constraints from project memory.`,
    `Output must be a clean professional architectural sheet, readable labels, clear linework, north arrow, title block and practical Indian residential planning style.`,
    `Do not mix unrelated tools. This output belongs inside Floor Plan AI tool only.`,
  ].join("\\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const action = safe(body.action, "chat");
    const projectId = safe(body.projectId);
    const projectTitle = safe(body.projectTitle || body.projectName || projectId, "Selected Project");
    const toolSlug = safe(body.toolSlug || body.slug, "tool");
    const toolName = safe(body.toolName || body.name, toolSlug);
    // BUILDSETU_TOOL_CHAT_DIRECT_BODY_MESSAGE_V2
    // Allow tool chat to execute direct chat commands from message/prompt/input/text.
    const directToolChatText = String(
      body.message ||
      body.prompt ||
      body.input ||
      body.text ||
      body.userText ||
      ""
    ).trim();

    if ((!Array.isArray(body.messages) || body.messages.length === 0) && directToolChatText) {
      body.messages = [{ role: "user", content: directToolChatText }];
    }

    const floorPlanToolCommand = String(body.toolSlug || "").includes("floor-plan")
      ? bsDetectFloorPlanToolCommand(directToolChatText || body.prompt || body.message || body.input || latestUserText(body.messages || []))
      : null;

    if (floorPlanToolCommand) {
      const originalFloorPlanText = directToolChatText || String(body.prompt || body.message || body.input || "").trim();
      body.floorPlanCommand = floorPlanToolCommand;
      body.floorPlanCommandKind = floorPlanToolCommand.kind;
      body.floorPlanOutputTitle = floorPlanToolCommand.title;
      body.floorPlanAssetType = floorPlanToolCommand.assetType;
      body.toolName = floorPlanToolCommand.title;
      body.prompt = bsBuildFloorPlanCommandPrompt(
        floorPlanToolCommand,
        originalFloorPlanText,
        String(body.projectId || "")
      );
    }

    const incomingMessages = cleanIncomingMessages(body.messages || []);
    const userText = safe(body.prompt || directToolChatText || latestUserText(incomingMessages));

    // BUILDSETU_HARD_FLOOR_PLAN_OPENAI_BRIDGE_V2
    // Hard intercept: Floor Plan AI chat commands must return OpenAI final image, not exact-agent SVG/block draft.
    const hardFloorPlanToolLike = `${body.toolSlug || ""} ${body.toolName || ""}`.toLowerCase();
    const hardFloorPlanText = [
      body.message,
      body.prompt,
      body.input,
      body.text,
      body.userText,
      userText,
      directToolChatText,
      latestUserText(body.messages || []),
      latestUserText(incomingMessages || []),
    ]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    const hardFloorPlanCommand =
      floorPlanToolCommand ||
      (hardFloorPlanToolLike.includes("floor-plan") || hardFloorPlanToolLike.includes("floor plan")
        ? bsDetectFloorPlanToolCommand(hardFloorPlanText || "ground floor ka plan do")
        : null);

    if (
      hardFloorPlanCommand &&
      (
        hardFloorPlanToolLike.includes("floor-plan") ||
        hardFloorPlanToolLike.includes("floor plan") ||
        hardFloorPlanToolLike.includes("floorplan")
      )
    ) {
      const hardProjectId = String(body.projectId || "").trim();

      if (!hardProjectId) {
        return NextResponse.json(
          {
            ok: false,
            code: "PROJECT_ID_REQUIRED",
            error: "Project ID missing for Floor Plan AI generation.",
          },
          { status: 400 },
        );
      }

      const hardUserText =
        hardFloorPlanText ||
        String(body.prompt || body.message || "ground floor ka plan do").trim();

      const hardExactRes = await fetch(new URL("/api/floor-plan/exact-agent", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          projectId: hardProjectId,
          projectTitle: body.projectTitle || body.projectName || body.title || "",
          message: hardUserText,
          prompt: hardUserText,
          command: hardFloorPlanCommand.kind,
          title: hardFloorPlanCommand.title,
          assetType: hardFloorPlanCommand.assetType,
          requirements: body.requirements || body.projectBrief || {},
          facing: body.facing || "",
          city: body.city || body.localAuthority || "",
          internalOnly: true,
          saveAsset: false,
        }),
      });

      const hardExactData = await hardExactRes.json().catch(() => null);

      if (!hardExactRes.ok || !hardExactData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: "EXACT_FLOOR_PLAN_AGENT_FAILED",
            error: hardExactData?.error || "Exact floor plan agent failed.",
            details: hardExactData || null,
          },
          { status: hardExactRes.status || 500 },
        );
      }

      const hardTitle =
        hardExactData.title ||
        hardFloorPlanCommand.title ||
        "Ground Floor Plan";

      const hardRenderRes = await fetch(new URL("/api/floor-plan/professional-openai", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          projectId: hardProjectId,
          toolSlug: body.toolSlug || "floor-plan-ai",
          command: hardFloorPlanCommand.kind,
          outputTitle: hardTitle,
          title: hardTitle,
          assetType:
            hardFloorPlanCommand.assetType ||
            hardExactData.asset?.assetType ||
            "ground_floor_plan",

          planningSource: "exact_floor_plan_agent_v1",
          planningStatus: hardExactData.planningStatus,
          lockedPlan: hardExactData.plan || {},
          exactAsset: hardExactData.asset || null,
          exactImageUrl: hardExactData.imageUrl || hardExactData.asset?.imageUrl || "",

          projectTitle: body.projectTitle || body.projectName || body.title || "",
          userMessage: hardUserText,
          renderMode: "openai_final_image_from_planning_agent",
        }),
      });

      const hardRenderData = await hardRenderRes.json().catch(() => null);

      if (!hardRenderRes.ok || !hardRenderData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: "OPENAI_FINAL_FLOOR_PLAN_FAILED",
            error: hardRenderData?.error || "OpenAI final floor plan render failed.",
            planning: hardExactData || null,
            render: hardRenderData || null,
          },
          { status: hardRenderRes.status || 500 },
        );
      }

      const hardFinalTitle =
        hardRenderData.title ||
        hardTitle ||
        "Ground Floor Plan";

      const hardFinalImageUrl =
        hardRenderData.imageUrl ||
        hardRenderData.asset?.imageUrl ||
        hardRenderData.url ||
        hardRenderData.publicUrl ||
        "";

      const hardFinalAsset = hardRenderData.asset || {
        id: hardRenderData.assetId || null,
        projectId: hardProjectId,
        toolSlug: body.toolSlug || "floor-plan-ai",
        assetType:
          hardRenderData.assetType ||
          hardFloorPlanCommand.assetType ||
          "ground_floor_plan",
        title: hardFinalTitle,
        imageUrl: hardFinalImageUrl,
        source: "professional_openai_floor_plan_v1",
        provider: "openai",
        generationMode: "openai-final-floor-plan",
      };

      const hardAssistantMessage = {
        id: `${Date.now()}-hard-openai-floor-plan`,
        role: "assistant",
        text: `${hardFinalTitle} ready hai. Planning agent ne layout lock kiya aur final image ChatGPT/OpenAI se generate hui hai.`,
        content: `${hardFinalTitle} ready hai. Planning agent ne layout lock kiya aur final image ChatGPT/OpenAI se generate hui hai.`,
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      return NextResponse.json({
        ok: true,
        success: true,
        source: "hard_exact_plan_plus_openai_render_v2",
        provider: "openai",
        generationMode: "openai-final-floor-plan",
        toolSlug: body.toolSlug || "floor-plan-ai",
        toolName: hardFinalTitle,
        projectId: hardProjectId,

        floorPlanCommand: hardFloorPlanCommand.kind,
        floorPlanOutputTitle: hardFinalTitle,
        floorPlanAssetType:
          hardFinalAsset.assetType ||
          hardFloorPlanCommand.assetType ||
          "ground_floor_plan",

        title: hardFinalTitle,
        outputTitle: hardFinalTitle,
        assetType:
          hardFinalAsset.assetType ||
          hardFloorPlanCommand.assetType ||
          "ground_floor_plan",
        assetId: hardFinalAsset.id || null,

        imageUrl: hardFinalImageUrl,
        url: hardFinalImageUrl,
        publicUrl: hardFinalImageUrl,

        planningStatus: hardExactData.planningStatus,
        plan: hardExactData.plan,
        planning: hardExactData,
        render: hardRenderData,

        asset: hardFinalAsset,
        assets: [hardFinalAsset],
        outputs: [hardFinalAsset],

        reply: hardAssistantMessage.text,
        message: hardAssistantMessage.text,
        messages: [...incomingMessages, hardAssistantMessage].slice(-80),
      });
    }


    const taskType = detectTask(toolSlug, userText);
    const lock = getBuildSetuToolTaskLock(toolSlug, toolName);
    const projectMemory = await getProjectMemory(projectId, toolSlug);

    const readOnlyKnowledgeChat = isReadOnlyKnowledgeChatRequest(action, toolSlug, toolName, userText);
    const actionIntent = String(action || "").toLowerCase();
    const textOnlyToolChatAction = isBuildSetuTextOnlyToolChatAction(actionIntent, toolSlug, taskType);
    const shouldGenerate = !readOnlyKnowledgeChat && !textOnlyToolChatAction && (
      wantsGeneration(action, userText) || ["execute", "generate", "run"].includes(actionIntent)
    );

    // BUILDSETU_TOOL_CHAT_READONLY_KNOWLEDGE_ACTUAL_ANSWER_V1
    if (readOnlyKnowledgeChat) {
      const knowledgeUserId = safe((body as any).userId || (body as any).user?.id || (body as any).session?.userId, "anonymous");
      const knowledgePlanTier = safe((body as any).planTier || (body as any).tier || (body as any).package, "premium");

      let answerText = "";
      let answerSource = "project-chat-saved-knowledge";

      try {
        const answerRes = await fetch(new URL("/api/project-chat/send", req.url), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: req.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            projectId: projectId || "global",
            userId: knowledgeUserId || "anonymous",
            planTier: knowledgePlanTier || "premium",
            projectTitle,
            message: userText,
          }),
        });

        const answerData = await answerRes.json().catch(() => ({}));
        answerText = safe(
          answerData?.reply ||
          answerData?.assistantMessage?.content ||
          answerData?.message ||
          ""
        );

        if (!answerRes.ok || !answerText) {
          answerSource = "readonly-knowledge-fallback";
          answerText = "Saved knowledge context available hai, lekin final answer generate nahi ho paya. Project-chat response verify karo.";
        }
      } catch (error: any) {
        answerSource = "readonly-knowledge-fallback";
        answerText = `Saved knowledge answer generate nahi ho paya: ${error?.message || "unknown error"}`;
      }

      const assistantMessage: SavedMessage = {
        id: makeId(),
        role: "assistant",
        text: answerText,
        time: nowTime(),
        kind: "normal",
      };

      const messages = [...incomingMessages, assistantMessage].slice(-80);

      return NextResponse.json({
        ok: true,
        action,
        projectId,
        projectTitle,
        toolSlug,
        toolName,
        taskType: "readonly_knowledge_answer",
        projectMemoryFound: Boolean(projectMemory),
        buildSetuAgent: null,
        messages,
        output: {
          id: makeId(),
          title: `${toolName} saved knowledge answer`,
          text: answerText,
          status: "READY",
          source: answerSource,
        },
        imagePrompt: "",
        prompt: answerText,
        readyToGenerate: false,
        canImage: false,
        source: "tool_chat_readonly_knowledge_actual_answer_v1",
      });
    }

    // BUILDSETU_TOOL_CHAT_AGENT_BRIDGE_V1
    // Use in-house BuildSetu Agent as source-of-truth prompt compiler for Floor Plan AI.
    let buildSetuAgentResult: any = null;
    let buildSetuAgentImagePrompt = "";
    let buildSetuAgentResponseText = "";

    try {
      const bridgeToolSlug = String(toolSlug || "").toLowerCase();
      const bridgeToolName = String(toolName || toolSlug || "Tool");
      // BUILDSETU_DIRECT_MESSAGE_BRIDGE_V5
      // Use direct message/prompt from frontend execute calls when messages array is empty/stale.
      const directBridgeUserText = String((body as any)?.message || (body as any)?.userText || (body as any)?.prompt || "").trim();
      const bridgeUserText = String(directBridgeUserText || userText || "");

      if (shouldGenerate) {
        buildSetuAgentResult = await runBuildSetuAgent({
          projectId,
          toolSlug,
          toolName: bridgeToolName,
          action: "generate",
          message: bridgeUserText || "Current project brief ke basis par premium furnished 2D architectural floor plan generate karo.",
        });

        if (
          buildSetuAgentResult?.ok &&
          buildSetuAgentResult?.decision?.readyToGenerate &&
          buildSetuAgentResult?.imagePrompt
        ) {
          buildSetuAgentImagePrompt = String(buildSetuAgentResult.imagePrompt || "");
          buildSetuAgentResponseText = String(buildSetuAgentResult.responseText || "");
        }
      }
    } catch (agentError) {
      console.warn("BUILDSETU_TOOL_CHAT_AGENT_BRIDGE_V1 failed", agentError);
    }


    // BUILDSETU_TOOL_CHAT_CREDIT_RUN_OUTPUT_FALLBACK_V1
    // /api/tools/run returns { ok, run, credits }, while the tool page preview reads data.output.
    // Keep UI unchanged: expose the credited run as output when no richer output is produced later.
    let creditRunOutput: any = null;

    // BUILDSETU_TOOL_CHAT_CREDIT_GATE_V1
    // Tool chat is the active frontend execution route. Charge credits on execute only.
    if (shouldGenerate) {
      const creditRes = await fetch(new URL("/api/tools/run", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          slug: toolSlug,
          title: toolName,
          projectId,
          prompt: userText || `${toolName} execution`,
          source: "/api/tool-chat/run",
        }),
      });

      const creditData = await creditRes.json().catch(() => ({}));

      if (creditData?.run && !creditRunOutput) {
        creditRunOutput = {
          ...creditData.run,
          id: creditData.run.id || makeId(),
          title: creditData.run.title || toolName || "Tool Output",
          status: creditData.run.status || "REVIEW_REQUIRED",
          toolSlug,
          toolName,
          projectId,
          credits: creditData.credits,
          creditsUsed: creditData.creditsUsed,
          source: "/api/tools/run",
        };
      }

      if (!creditRes.ok || creditData?.ok === false) {
        const insufficient = creditData?.code === "NOT_ENOUGH_CREDITS";

        return NextResponse.json(
          {
            ok: false,
            code: creditData?.code || "CREDIT_CHECK_FAILED",
            error: creditData?.error || "Credit check failed",
            credits: creditData?.credits ?? 0,
            requiredCredits: creditData?.requiredCredits,
            buyCreditsUrl: creditData?.buyCreditsUrl || "/credits",
            messages: [
              {
                id: makeId(),
                role: "assistant",
                text: insufficient
                  ? `Credits kam hain. Is tool ko chalane ke liye ${creditData?.requiredCredits || "required"} credits chahiye. Current balance: ${creditData?.credits ?? 0}.`
                  : "Credit check fail ho gaya. Login/session aur credit balance verify karo.",
                time: nowTime(),
              },
            ],
          },
          { status: insufficient ? 402 : 400 }
        );
      }
    }

    // BUILDSETU_TOOL_CHAT_EXACT_FLOOR_PLAN_BRIDGE_V1
    // Floor Plan Tool commands must use deterministic exact planner first.
    if (floorPlanToolCommand && String(body.toolSlug || "").includes("floor-plan")) {
      const exactBridgeProjectId = String(body.projectId || "").trim();
      const exactBridgeUserText = String(
        userText ||
        directToolChatText ||
        latestUserText(incomingMessages) ||
        body.prompt ||
        body.message ||
        ""
      ).trim();

      if (!exactBridgeProjectId) {
        return NextResponse.json(
          {
            ok: false,
            code: "PROJECT_ID_REQUIRED",
            error: "Project ID missing for exact floor plan generation.",
          },
          { status: 400 },
        );
      }

      const exactRes = await fetch(new URL("/api/floor-plan/exact-agent", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          projectId: exactBridgeProjectId,
          projectTitle: body.projectTitle || body.projectName || body.title || "",
          message: exactBridgeUserText,
          prompt: exactBridgeUserText,
          command: floorPlanToolCommand.kind,
          title: floorPlanToolCommand.title,
          assetType: floorPlanToolCommand.assetType,
          requirements: body.requirements || body.projectBrief || {},
          facing: body.facing || "",
          city: body.city || body.localAuthority || "",
        }),
      });

      const exactData = await exactRes.json().catch(() => null);

      if (!exactRes.ok || !exactData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: "EXACT_FLOOR_PLAN_AGENT_FAILED",
            error: exactData?.error || "Exact floor plan agent failed.",
            details: exactData || null,
          },
          { status: exactRes.status || 500 },
        );
      }

      // BUILDSETU_EXACT_PLAN_TO_OPENAI_RENDER_V1
      const exactTitle = exactData.title || floorPlanToolCommand.title || "Ground Floor Plan";

      // Step 2: final image OpenAI se generate hogi, planning exact agent karega
      const renderRes = await fetch(new URL("/api/floor-plan/professional-openai", req.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          projectId: exactBridgeProjectId,
          toolSlug: body.toolSlug || "floor-plan-ai",
          command: floorPlanToolCommand.kind,
          outputTitle: exactTitle,
          assetType: exactData.asset?.assetType || floorPlanToolCommand.assetType || "ground_floor_plan",

          planningSource: "exact_floor_plan_agent_v1",
          planningStatus: exactData.planningStatus,
          lockedPlan: exactData.plan || {},
          exactAsset: exactData.asset || null,
          exactImageUrl: exactData.imageUrl || exactData.asset?.imageUrl || "",

          projectTitle: body.projectTitle || body.projectName || body.title || "",
          userMessage: exactBridgeUserText,

          renderMode: "openai_final_image",
          style: "professional architectural 2D floor plan, clean, premium, dimension-aware, labeled rooms, top view, polished presentation"
        }),
      });

      const renderData = await renderRes.json().catch(() => null);

      if (!renderRes.ok || !renderData?.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: "OPENAI_FLOOR_PLAN_RENDER_FAILED",
            error: renderData?.error || "OpenAI floor plan render failed.",
            planning: exactData || null,
            render: renderData || null,
          },
          { status: renderRes.status || 500 },
        );
      }

      const finalTitle = renderData.title || exactTitle || "Ground Floor Plan";
      const finalImageUrl =
        renderData.imageUrl ||
        renderData.asset?.imageUrl ||
        renderData.url ||
        renderData.publicUrl ||
        "";

      const finalAsset = renderData.asset || {
        id: renderData.assetId || null,
        title: finalTitle,
        imageUrl: finalImageUrl,
        assetType: renderData.assetType || exactData.asset?.assetType || floorPlanToolCommand.assetType,
      };

      const assistantMessage = {
        id: `${Date.now()}-openai-floor-plan`,
        role: "assistant",
        text: `${finalTitle} ready hai. Planning agent ne layout lock kiya aur final image ChatGPT/OpenAI se generate hui hai.`,
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      return NextResponse.json({
        ok: true,
        success: true,
        source: "exact_plan_plus_openai_render_v1",
        provider: "openai",
        generationMode: "openai-final-floor-plan",
        toolSlug: body.toolSlug || "floor-plan-ai",
        toolName: finalTitle,
        projectId: exactBridgeProjectId,

        floorPlanCommand: floorPlanToolCommand.kind,
        floorPlanOutputTitle: finalTitle,
        floorPlanAssetType: finalAsset.assetType || floorPlanToolCommand.assetType,

        title: finalTitle,
        outputTitle: finalTitle,
        assetType: finalAsset.assetType || floorPlanToolCommand.assetType,
        assetId: finalAsset.id || null,
        imageUrl: finalImageUrl,
        url: finalImageUrl,
        publicUrl: finalImageUrl,

        planningStatus: exactData.planningStatus,
        plan: exactData.plan,
        planning: exactData,
        render: renderData,

        asset: finalAsset,
        assets: finalAsset ? [finalAsset] : [],
        outputs: finalAsset ? [finalAsset] : [],

        reply: assistantMessage.text,
        message: assistantMessage.text,
        messages: [...incomingMessages, assistantMessage].slice(-80),
      });
    }


    const canImage = isImageTool(toolSlug, lock);

    // BUILDSETU_FLOOR_PLAN_ARCHITECT_AGENT_CHAT_CONNECT
    if (toolSlug === "floor-plan-ai") {
      // BUILDSETU_LOCKED_PLAN_CHAT_FLOW_CONNECT
      if (isProjectPlanLockRequest(userText)) {
        const lockResult = await lockLatestProjectPlan({
          projectId,
          projectTitle,
          force: true,
        });
        const lockAny = lockResult as any;

        const assistantText = lockResult?.ok
          ? "Current project plan lock ho gaya. Ab isi locked base plan ke according working drawing set, column layout, beam layout, electrical, plumbing ya second floor plan generate kar sakte ho."
          : `Plan lock nahi ho paya: ${(lockResult as any)?.error || "No floor plan asset found for this project. Pehle floor plan generate karo."}`;

        const assistantMessage: SavedMessage = {
          id: makeId(),
          role: "assistant",
          text: assistantText,
          time: nowTime(),
          kind: lockResult?.ok ? "output" : "normal",
        };

        const messages = [...incomingMessages, assistantMessage].slice(-80);
        const key = threadKey(projectId, toolSlug);
        const store = await readStore();

        const output = {
          title: lockResult?.ok ? "Project Plan Locked" : "Project Plan Lock Failed",
          summary: assistantText,
          source: "project_plan_lock_v1",
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          lock: lockAny?.lock || null,
          baseImageUrl: lockAny?.lock?.baseImageUrl || "",
          imageUrl: lockAny?.lock?.baseImageUrl || "",
          publicUrl: lockAny?.lock?.basePublicUrl || lockAny?.lock?.baseImageUrl || "",
        };

        store.threads[key] = {
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          outputs: lockResult?.ok ? [output, ...(store.threads[key]?.outputs || [])].slice(0, 50) : (store.threads[key]?.outputs || []),
          projectMemory,
          updatedAt: new Date().toISOString(),
        };

        await writeStore(store);

        await appendProjectMemoryEvent({
          projectId,
          toolSlug,
          toolName,
          type: lockResult?.ok ? "project-plan-locked" : "project-plan-lock-failed",
          role: "assistant",
          title: output.title,
          text: assistantText,
          output,
          source: "/api/tool-chat/run",
          raw: { userText, lockResult },
        }).catch(() => null);

        return NextResponse.json({
          ok: Boolean(lockResult?.ok),
          status: lockResult?.ok ? "locked" : "failed",
          action,
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          output,
          lock: lockAny?.lock || null,
          source: "project_plan_lock_v1",
        }, { status: lockResult?.ok ? 200 : 400 });
      }

      if (isLockedPlanWorkingSetRequest(userText)) {
        const lockedResult = await generateLockedWorkingSet({
          projectId,
          projectTitle,
          prompt: userText,
        });
        const lockedAny = lockedResult as any;

        const assistantText = lockedResult?.ok
          ? summarizeLockedWorkingSetOutput(lockedResult)
          : `Locked working set generate nahi ho paya: ${(lockedResult as any)?.error || "Pehle current plan lock karo."}`;

        const assistantMessage: SavedMessage = {
          id: makeId(),
          role: "assistant",
          text: assistantText,
          time: nowTime(),
          kind: lockedResult?.ok ? "output" : "normal",
        };

        const messages = [...incomingMessages, assistantMessage].slice(-80);
        const key = threadKey(projectId, toolSlug);
        const store = await readStore();

        const generatedSheetAssets = Array.isArray(lockedAny?.generatedSheets?.assets)
          ? lockedAny.generatedSheets.assets
          : [];

        const primaryGeneratedImageUrl =
          lockedAny?.generatedSheets?.packageAsset?.imageUrl ||
          lockedAny?.lock?.baseImageUrl ||
          "";

        const primaryGeneratedPublicUrl =
          lockedAny?.generatedSheets?.packageAsset?.publicUrl ||
          lockedAny?.lock?.basePublicUrl ||
          lockedAny?.lock?.baseImageUrl ||
          "";

        const orderedGeneratedImages = [
          primaryGeneratedImageUrl,
          ...generatedSheetAssets
            .map((asset: any) => asset?.imageUrl || "")
            .filter(Boolean)
            .filter((url: string) => url !== primaryGeneratedImageUrl),
        ].filter(Boolean);

        const output = {
          title: lockedAny?.request?.derivedFloor
            ? `${lockedAny.request.derivedFloor} From Locked Plan`
            : "Locked Plan Working Set",
          summary: assistantText,
          source: "locked_project_working_set_v1",
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          imageUrl: primaryGeneratedImageUrl,
          publicUrl: primaryGeneratedPublicUrl,
          images: orderedGeneratedImages,
          lock: lockedAny?.lock || null,
          planningPackage: lockedAny?.planningPackage || null,
          workingPlans: lockedAny?.planningPackage?.workingPlans || [],
          generatedSheets: lockedAny?.generatedSheets || null,
          lockedOutputRules: lockedAny?.lockedOutputRules || [],
          request: lockedAny?.request || {},
        };

        store.threads[key] = {
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          outputs: lockedResult?.ok ? [output, ...(store.threads[key]?.outputs || [])].slice(0, 50) : (store.threads[key]?.outputs || []),
          projectMemory,
          updatedAt: new Date().toISOString(),
        };

        await writeStore(store);

        await appendProjectMemoryEvent({
          projectId,
          toolSlug,
          toolName,
          type: lockedAny?.request?.derivedFloor
            ? "locked-plan-derived-floor"
            : "locked-plan-working-set",
          role: "assistant",
          title: output.title,
          text: assistantText,
          output,
          source: "/api/tool-chat/run",
          raw: { userText, lockedResult },
        }).catch(() => null);

        return NextResponse.json({
          ok: Boolean(lockedResult?.ok),
          status: lockedResult?.ok ? "ready" : "failed",
          action,
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          output,
          lockedResult,
          source: "locked_project_working_set_v1",
        }, { status: lockedResult?.ok ? 200 : 400 });
      }

      // BUILDSETU_OPENAI_PROFESSIONAL_FLOOR_PLAN_CHAT_CONNECT
      if (isProfessionalOpenAIFloorPlanRequest(userText)) {
        const generated = await generateProfessionalOpenAIFloorPlan({
          projectId,
          projectTitle,
          prompt: userText,
          project: {},
        });

        const assistantText = generated?.ok
          ? "Professional floor plan prompt-agent ne requirement samajh kar OpenAI image generation se ready kar diya. Ye floor-plan presentation image hai; structure/working drawing nahi."
          : "Professional floor plan generate nahi ho paya.";

        const assistantMessage: SavedMessage = {
          id: makeId(),
          role: "assistant",
          text: assistantText,
          time: nowTime(),
          kind: generated?.ok ? "output" : "normal",
        };

        const messages = [...incomingMessages, assistantMessage].slice(-80);
        const key = threadKey(projectId, toolSlug);
        const store = await readStore();

        const output = {
          title: generated?.title || "Professional Floor Plan",
          summary: assistantText,
          source: "openai_professional_floor_plan_v1",
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          imageUrl: generated?.imageUrl || "",
          publicUrl: generated?.publicUrl || generated?.imageUrl || "",
          images: generated?.imageUrl ? [generated.imageUrl] : [],
          asset: generated?.asset || null,
        };

        store.threads[key] = {
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          outputs: generated?.ok ? [output, ...(store.threads[key]?.outputs || [])].slice(0, 50) : (store.threads[key]?.outputs || []),
          projectMemory,
          updatedAt: new Date().toISOString(),
        };

        await writeStore(store);

        await appendProjectMemoryEvent({
          projectId,
          toolSlug,
          toolName,
          type: generated?.ok ? "openai-professional-floor-plan" : "openai-professional-floor-plan-failed",
          role: "assistant",
          title: output.title,
          text: assistantText,
          output,
          source: "/api/tool-chat/run",
          raw: { userText, generated },
        }).catch(() => null);

        return NextResponse.json({
          ok: Boolean(generated?.ok),
          status: generated?.ok ? "ready" : "failed",
          action,
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          output,
          generated,
          source: "openai_professional_floor_plan_v1",
        }, { status: generated?.ok ? 200 : 500 });
      }

      const architectAgent = await runArchitectPlanningAgent({
        projectTitle,
        prompt: userText,
        projectContext: {
          projectId,
          projectTitle,
          projectMemory,
          incomingMessages,
          body,
        },
        useWeb:
          body?.useWeb === true ||
          process.env.BUILDSETU_ARCHITECT_AGENT_WEB === "1" ||
          process.env.BUILDSETU_ARCHITECT_AGENT_WEB === "true",
      });

      const __bsCompleteFloorPlanRequirement = isCompleteFloorPlanRequirement(userText);

      if (architectAgent.status === "need_more_details" && !__bsCompleteFloorPlanRequirement) {
        const questionText =
          architectAgent.missingQuestions.length > 0
            ? `${architectAgent.assistantMessage}\n\n${architectAgent.missingQuestions
                .map((q, index) => `${index + 1}. ${q}`)
                .join("\n")}`
            : architectAgent.assistantMessage;

        const assistantMessage: SavedMessage = {
          id: makeId(),
          role: "assistant",
          text: questionText,
          time: nowTime(),
          kind: "normal",
        };

        const messages = [...incomingMessages, assistantMessage].slice(-80);
        const key = threadKey(projectId, toolSlug);
        const store = await readStore();

        store.threads[key] = {
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          outputs: store.threads[key]?.outputs || [],
          projectMemory,
          updatedAt: new Date().toISOString(),
        };

        await writeStore(store);

        await appendProjectMemoryEvent({
          projectId,
          toolSlug,
          toolName,
          type: "architect-agent-missing-details",
          role: "assistant",
          title: "Architect Agent needs more details",
          text: questionText,
          output: architectAgent,
          source: "/api/tool-chat/run",
          raw: { action, userText },
        }).catch(() => null);

        return NextResponse.json({
          ok: true,
          status: "need_more_details",
          action,
          projectId,
          projectTitle,
          toolSlug,
          toolName,
          messages,
          output: null,
          architectAgent,
          missingQuestions: architectAgent.missingQuestions,
          readyToGenerate: false,
          canImage: false,
          imagePrompt: "",
          prompt: "",
        });
      }

      // BUILDSETU_COMPLETE_REQUIREMENT_OVERRIDE_ACTIVE
      const exact = await generateExactFloorPlanAsset({
        ...body,
        projectId,
        projectTitle,
        toolSlug: "floor-plan-ai",
        toolName: "Floor Plan AI",
        taskType,
        renderType: "floor_plan_2d",
        outputType: "drawing",
        assetType: "floor_plan_2d",
        imageMode: "floor_plan_2d",
        prompt: architectAgent.exactPlannerPrompt || userText,
        imagePrompt: architectAgent.exactPlannerPrompt || userText,
        architectAgent,
      });

      let presentationJob: any = null;
      let presentation: any = null;

      try {
        presentationJob = await startFloorPlanPresentationJob({
          projectId,
          projectTitle,
          userPrompt: architectAgent.exactPlannerPrompt || userText,
          exact,
          architectAgent,
        });

        presentation = {
          ok: false,
          queued: true,
          jobId: presentationJob.id,
          status: presentationJob.status,
          reason: "Presentation image is generating in background.",
        };
      } catch (error: any) {
        console.error("FLOOR_PLAN_PRESENTATION_JOB_START_FAILED", error?.message || error);
        presentation = {
          ok: false,
          skipped: true,
          reason: error?.message || "presentation job start failed",
        };
      }

      const previewImageUrl = exact.imageUrl;
      const previewPublicUrl = exact.publicUrl;
      const previewAsset = exact.asset;

      const assistantMessage: SavedMessage = {
        id: makeId(),
        role: "assistant",
        text:
          `${architectAgent.assistantMessage}\n\n` +
          `Exact planning ho gayi. Professional presentation image ${presentation?.ok ? "generate ho gayi" : "fallback exact plan se ready hai"}.`,
        time: nowTime(),
        kind: "output",
      };

      const output = {
        title: presentation?.ok ? "Professional Floor Plan Ready" : "Exact Floor Plan Ready",
        summary: presentation?.ok
          ? "Architect Planning Agent ne planning ki, Exact Planner ne layout lock kiya, aur OpenAI image edit ne professional presentation plan banaya."
          : "Architect Planning Agent ne requirement samjhi aur Exact Planner ne dimensioned floor plan generate kiya.",
        sections: [
          `Project: ${projectTitle}`,
          `Tool: ${toolName}`,
          `Planning: Architect Planning Agent`,
          `Exact layout: Exact Planner`,
          presentation?.jobId ? `Presentation: queued background job ${presentation.jobId}` : `Presentation: exact SVG fallback`,
          `Plan: ${exact?.plan?.title || "Floor Plan"}`,
          `Plot: ${exact?.plan?.widthFt || ""}' x ${exact?.plan?.depthFt || ""}' ${exact?.plan?.facing || ""} facing`,
        ],
        imageUrl: previewImageUrl,
        publicUrl: previewPublicUrl,
        asset: previewAsset,
        plan: exact.plan,
        architectAgent,
        exact,
        presentation,
        prompts: [],
        prompt: architectAgent.exactPlannerPrompt || userText,
        taskType,
        toolSlug,
        toolName,
        projectId,
        presentationJob,
        generationMode: presentation?.jobId
          ? "architect_agent_exact_planner_presentation_queued"
          : "architect_agent_plus_exact_planner",
      };

      const messages = [...incomingMessages, assistantMessage].slice(-80);
      const key = threadKey(projectId, toolSlug);
      const store = await readStore();

      store.threads[key] = {
        projectId,
        projectTitle,
        toolSlug,
        toolName,
        messages,
        outputs: [output, ...(store.threads[key]?.outputs || [])].slice(0, 50),
        projectMemory,
        updatedAt: new Date().toISOString(),
      };

      await writeStore(store);

      await appendProjectMemoryEvent({
        projectId,
        toolSlug,
        toolName,
        type: "architect-agent-exact-plan",
        role: "assistant",
        title: "Architect Agent exact floor plan generated",
        text: assistantMessage.text,
        output,
        source: "/api/tool-chat/run",
        raw: {
          action,
          taskType,
          userText,
          architectStatus: architectAgent.status,
        },
      }).catch(() => null);

      return NextResponse.json({
        ok: true,
        status: "planned",
        action,
        projectId,
        projectTitle,
        toolSlug,
        toolName,
        taskType,
        messages,
        output,
        architectAgent,
        exact,
        presentation,
        presentationJob,
        imageUrl: output.imageUrl,
        publicUrl: output.publicUrl,
        plan: exact.plan,
        readyToGenerate: false,
        canImage: true,
        imagePrompt: "",
        prompt: architectAgent.exactPlannerPrompt || userText,
        source: "architect_agent_plus_exact_planner",
      });
    }



    const compiledPrompt = buildToolPrompt({
      projectId,
      toolSlug,
      toolName,
      projectTitle,
      userText,
      projectMemory,
      taskType,
    });

    if (
      !shouldGenerate &&
      isBuildSetuTextDocumentTaskForVisibleResponse(toolSlug, taskType) &&
      !(buildSetuAgentResult?.responseText)
    ) {
      const bridgedAgentResult = await fetchBuildSetuCoreAgentResponseForTextChat({
        req,
        projectId,
        toolSlug,
        toolName,
        userText,
      });
      if (bridgedAgentResult?.responseText) {
        buildSetuAgentResult = bridgedAgentResult;
      }
    }

    const assistantMessage: SavedMessage = {
      id: makeId(),
      role: "assistant",
      text: buildVisibleToolChatAssistantText({
        toolSlug,
        toolName,
        taskType,
        shouldGenerate,
        buildSetuAgentResult,
        fallbackText: buildAssistantText({
          toolSlug,
          toolName,
          taskType,
          shouldGenerate,
        }),
      }),
      time: nowTime(),
      kind: shouldGenerate ? "prompt" : "normal",
    };

    const messages = [...incomingMessages, assistantMessage].slice(-80);

    const output = shouldGenerate
      ? {
          title: `${toolName} — ${taskType.replaceAll("_", " ")}`,
          summary: `${toolName} prompt ready hai. Selected project details aur chat instruction use kiya gaya hai.`,
          sections: [
            `Project: ${projectTitle}`,
            `Tool: ${toolName}`,
            `Task: ${taskType.replaceAll("_", " ")}`,
            "Rules: active tool ke output type tak restricted.",
          ],
          prompts: canImage
            ? [
                {
                  title: `${toolName} generation prompt`,
                  prompt: compiledPrompt,
                  toolSlug,
                  toolName,
                  taskType,
                },
              ]
            : [],
          prompt: compiledPrompt,
          taskType,
          toolSlug,
          toolName,
          projectId,
        }
      : null;

    const key = threadKey(projectId, toolSlug);
    const store = await readStore();

    store.threads[key] = {
      projectId,
      projectTitle,
      toolSlug,
      toolName,
      messages,
      outputs: output ? [output, ...(store.threads[key]?.outputs || [])].slice(0, 50) : store.threads[key]?.outputs || [],
      projectMemory,
      updatedAt: new Date().toISOString(),
    };

    await writeStore(store);

    await appendProjectMemoryEvent({
      projectId,
      toolSlug,
      toolName,
      type: shouldGenerate ? "compiled-tool-prompt" : "tool-chat",
      role: "assistant",
      title: shouldGenerate ? `${toolName} prompt ready` : `${toolName} chat`,
      text: assistantMessage.text,
      output: output || null,
      source: "/api/tool-chat/run",
      raw: {
        action,
        taskType,
        userText,
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      action,
      projectId,
      projectTitle,
      toolSlug,
      toolName,
      taskType,
      responseText: assistantMessage.text,
      projectMemoryFound: Boolean(projectMemory),
      buildSetuAgent: buildSetuAgentResult
        ? {
            ok: Boolean(buildSetuAgentResult.ok),
            agentVersion: buildSetuAgentResult.agentVersion || "",
            taskType: buildSetuAgentResult.decision?.taskType || "",
            canProceed: Boolean(buildSetuAgentResult.decision?.canProceed),
            readyToGenerate: Boolean(buildSetuAgentResult.decision?.readyToGenerate),
            briefTitle: buildSetuAgentResult.contextSummary?.briefTitle || "",
            completeness: buildSetuAgentResult.contextSummary?.completeness ?? null,
            ignoredMismatchedAssets: buildSetuAgentResult.contextSummary?.ignoredMismatchedAssets ?? null,
          }
        : null,
      messages,
      output: output || creditRunOutput,
      imagePrompt: shouldGenerate && canImage ? (buildSetuAgentImagePrompt || compiledPrompt) : "",
      prompt: compiledPrompt,
      readyToGenerate: shouldGenerate,
      canImage,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Tool chat failed",
        messages: [
          {
            id: makeId(),
            role: "assistant",
            text: "Server/API unavailable hai. Thodi der baad retry karo.",
            time: nowTime(),
          },
        ],
      },
      { status: 500 }
    );
  }
}
