import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { attachUniversalQualityBrainToPrompt, type BuildSetuAgentDomain } from "@/lib/agent-knowledge/universal-quality-brain";
import { addBuildSetuUsageEvent } from "@/lib/agent-usage/usage-cost-store";
import { checkBuildSetuUsageLimit } from "@/lib/agent-usage/usage-limit-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  messageType: string;
  content: string;
  projectTitle?: string;
  intent?: string;
  status?: string;
  createdAt: string;
};

type Store = {
  projects: Record<string, ChatMessage[]>;
};

const DATA_DIR = path.join(process.cwd(), "data", "generated");
const STORE_PATH = path.join(DATA_DIR, "project-chat-history.json");

function joinLines(lines: string[]) {
  return lines.filter(Boolean).join(String.fromCharCode(10));
}

function detectIntent(message: string) {
  const t = message.toLowerCase();

  if (!t || ["hi", "hello", "hey", "hii", "hy", "namaste", "bhai", "bro"].includes(t.trim())) return "greeting";
  if (/floor|plan|layout|naksha|working plan|ghar ka plan|room placement/.test(t)) return "floor_plan";
  if (/boq|estimate|cost|budget|rate|quantity|material/.test(t)) return "boq";
  if (/bbs|steel|bar|beam|column|slab|rcc|reinforcement|footing/.test(t)) return "bbs";
  if (/interior|living|bedroom|kitchen|furniture|false ceiling|wardrobe|color|colour/.test(t)) return "interior";
  if (/exterior|elevation|front|facade|building look|modern look/.test(t)) return "exterior";
  if (/proposal|client|pdf|agreement|presentation|quotation|document/.test(t)) return "proposal";

  return "general";
}

function fallbackReply(message: string, projectTitle: string, history: ChatMessage[]) {
  const intent = detectIntent(message);
  const p = projectTitle || "selected project";

  if (intent === "greeting") {
    return {
      intent,
      reply: joinLines([
        "Haan bhai, main BuildSetu AI assistant hoon.",
        "",
        "Main selected project ke context me baat karunga.",
        "",
        `Project: ${p}`,
        "",
        "Aap mujhe batao is project me pehle kya banana hai:",
        "1. Floor plan direction",
        "2. BOQ estimate",
        "3. BBS / steel draft",
        "4. Interior design idea",
        "5. Exterior elevation idea",
        "6. Client proposal / PDF",
      ]),
    };
  }

  if (intent === "floor_plan") {
    const hasAnswered =
      /2\s*floor|two\s*floor|ground floor|first floor|2bhk|3bhk|kitchen|bathroom|parking|stair|vastu/i.test(message) &&
      message.length > 40;

    if (hasAnswered) {
      return {
        intent,
        reply: joinLines([
          "Samjha bhai. Requirement clear hai.",
          "",
          `Project: ${p}`,
          "",
          "Initial floor planning direction:",
          "",
          "Ground Floor:",
          "1. Front side par parking + main entry plan karo.",
          "2. Staircase ko side zone me rakhna better rahega, taki circulation clear rahe.",
          "3. Kitchen ko South-East zone me rakhna vastu ke hisaab se better option hai.",
          "4. Bathroom/toilet ko West/North-West side me adjust karo.",
          "5. 3 rooms ko light/ventilation ke basis par distribute karo.",
          "",
          "First Floor:",
          "1. 2BHK layout: 1 master bedroom + 1 bedroom + living/lobby.",
          "2. Stair ke paas lobby rakho.",
          "3. Rental use chahiye to independent kitchen + toilet planning karo.",
          "4. Front side par balcony useful rahegi.",
          "",
          "Ab confirm karo: road north side hai, car parking chahiye, aur first floor rental use hai ya family use?",
        ]),
      };
    }

    return {
      intent,
      reply: joinLines([
        "Samjha bhai. Floor plan ke liye pehle requirement freeze karte hain.",
        "",
        `Project: ${p}`,
        "",
        "Ye details ek message me bhejo:",
        "1. Total floors",
        "2. Ground floor rooms",
        "3. First floor rooms",
        "4. Parking type",
        "5. Staircase internal/external",
        "6. Vastu strict ya flexible",
      ]),
    };
  }

  return {
    intent,
    reply: joinLines([
      "Samjha bhai. Main selected project ke context me answer dunga.",
      "",
      `Project: ${p}`,
      "",
      `Aapka message: ${message}`,
      "",
      "Isko kis output me convert karna hai?",
      "1. Floor plan direction",
      "2. BOQ estimate",
      "3. BBS draft",
      "4. Interior idea",
      "5. Exterior elevation",
      "6. Client proposal",
      history.length ? "" : "Ek option type karo, phir main exact guided questions poochunga.",
    ]),
  };
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.projects && typeof parsed.projects === "object") return parsed as Store;
  } catch {}
  return { projects: {} };
}

async function writeStore(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function makeMessage(role: "user" | "assistant", content: string, projectTitle: string, intent: string, status: string): ChatMessage {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    messageType: "normal",
    content,
    projectTitle,
    intent,
    status,
    createdAt: new Date().toISOString(),
  };
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();

  const chunks: string[] = [];
  const output = Array.isArray(data?.output) ? data.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") chunks.push(c.text);
      if (typeof c?.output_text === "string") chunks.push(c.output_text);
    }
  }

  return chunks.join("\n").trim();
}


function detectBuildSetuChatDomainForBrain(message: string): BuildSetuAgentDomain {
  const text = String(message || "").toLowerCase();

  if (/floor\s*plan|naksha|layout|plot|parking|stair|bedroom|kitchen|toilet|vastu|road|facing/.test(text)) {
    return "floor_plan";
  }

  if (/interior|bedroom design|kitchen design|living|wardrobe|false ceiling|furniture|lighting|tile|paint|laminate/.test(text)) {
    return "interior";
  }

  if (/exterior|elevation|facade|front view|boundary|gate|balcony|cladding/.test(text)) {
    return "exterior";
  }

  if (/structure|column|beam|slab|footing|foundation|rcc|steel|load|span|bbs/.test(text)) {
    return "structure";
  }

  if (/boq|estimate|cost|rate|quantity|material|cement|steel|sand|aggregate|brick/.test(text)) {
    return "boq";
  }

  if (/plumbing|electrical|mep|drainage|water supply|hvac/.test(text)) {
    return "mep";
  }

  return "general";
}

function buildSystemPrompt(projectTitle: string, projectId = "global", userMessage = "") {
  const basePrompt = joinLines([
    "You are BuildSetu AI, a project-wise construction/design assistant for India.",
    "",
    "# Core identity",
    "- You help with floor planning, vastu-aware layout direction, BOQ, BBS/steel guidance, interior design, exterior elevation, material planning, site execution, reports, and client proposals.",
    "- You are not a generic chatbot. You always answer inside the selected project context.",
    "- Current selected project: " + projectTitle,
    "",
    "# Language behavior",
    "- Reply in the user's language.",
    "- If the user writes Hinglish, reply in natural Hinglish.",
    "- Understand spelling mistakes and local terms: colom=column, kitnchn=kitchen, starir=stair, kithe/kaha=where, nhi pta=nahi pata, bbs=bar bending schedule.",
    "- Keep tone practical, clear, and direct.",
    "",
    "# Conversation behavior",
    "- Continue from previous chat history. Do not restart the flow unless the user asks.",
    "- Do not repeat the same checklist once the user has answered it.",
    "- If the user says they do not know details, guide them with safe assumptions and ask only the next useful questions.",
    "- Answer the actual question first, then ask follow-up questions.",
    "- Avoid long generic menus unless the user is starting from hello or unclear intent.",
    "",
    "# Floor plan behavior",
    "- When user gives plot/floor/room details, create an initial planning direction.",
    "- Include zoning, circulation, staircase, parking, kitchen, toilet, light/ventilation, and vastu-aware suggestions.",
    "- Mention missing confirmations at the end.",
    "",
    "# BBS / structure behavior",
    "- If user asks columns/beam/steel without drawings, give rough planning-level guidance, not final structural design.",
    "- For a 30x40 G+1 residential project, you may discuss rough column grid logic such as 9 to 12 columns, but clearly say final column size, footing, beam, slab, and steel must be checked by a qualified structural engineer.",
    "- Never present rough structural guidance as final construction drawings.",
    "",
    "# BOQ behavior",
    "- Ask for built-up area, floors, city, quality level, and scope when missing.",
    "- If enough info exists, create BOQ sections and assumptions.",
    "",
    "# Output style",
    "- Use headings and numbered steps.",
    "- Keep answers useful and actionable.",
    "- End with 2 to 4 specific next questions, not a generic option menu.",
  ]);

  return attachUniversalQualityBrainToPrompt({
    basePrompt,
    projectId,
    domain: detectBuildSetuChatDomainForBrain(userMessage),
    projectTitle,
  });
}


function extractResponsesUsageTokens(data: any) {
  const usage = data?.usage || {};
  const inputTokens =
    Number(usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens ?? usage.promptTokens ?? 0) || 0;
  const outputTokens =
    Number(usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens ?? usage.completionTokens ?? 0) || 0;
  const totalTokens =
    Number(usage.total_tokens ?? usage.totalTokens ?? 0) || inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

async function callOpenAI(input: {
  projectId?: string;
  userId?: string;
  projectTitle: string;
  message: string;
  history: ChatMessage[];
}) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return "";

  const model = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
  const startedAt = Date.now();
  const recentHistory = input.history.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const payload = {
    model,
    instructions: buildSystemPrompt(input.projectTitle, (input as any).projectId || "global", input.message),
    input: [
      ...recentHistory,
      {
        role: "user",
        content: input.message,
      },
    ],
    temperature: 0.45,
    max_output_tokens: 1100,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    addBuildSetuUsageEvent({
      projectId: input.projectId || "global",
      userId: input.userId || "anonymous",
      route: "/api/project-chat/send",
      source: "project-chat-openai-responses",
      kind: "text",
      provider: "openai",
      model,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      metadata: {
        httpStatus: response.status,
        error: data?.error?.message || "OpenAI response failed",
        code: data?.error?.code || "",
        type: data?.error?.type || "",
      },
    });

    throw new Error(data?.error?.message || "OpenAI response failed");
  }

  const tokens = extractResponsesUsageTokens(data);

  addBuildSetuUsageEvent({
    projectId: input.projectId || "global",
    userId: input.userId || "anonymous",
    route: "/api/project-chat/send",
    source: "project-chat-openai-responses",
    kind: "text",
    provider: "openai",
    model,
    status: "success",
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    totalTokens: tokens.totalTokens,
    latencyMs: Date.now() - startedAt,
    metadata: {
      responseId: data?.id || "",
      projectTitle: input.projectTitle,
    },
  });

  return extractOutputText(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = String(body.projectId || "").trim();
  const userId = String(body.userId || body.user?.id || body.session?.userId || "anonymous").trim() || "anonymous";
  const planTier = String(body.planTier || body.tier || body.package || "free").trim() || "free";
  const projectTitle = String(body.projectTitle || "selected project").replace(/^PROJECT\s+/i, "").trim();
  const message = String(body.message || body.content || "").trim();

  if (!projectId) return NextResponse.json({ ok: false, error: "projectId required" }, { status: 400 });
  if (!message) return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });

  const usageLimit = checkBuildSetuUsageLimit({
    projectId,
    userId,
    planTier,
    next: {
      kind: "text",
      textEvents: 1,
    },
  });

  if (!usageLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: usageLimit.code,
        error: usageLimit.message,
        planTier: usageLimit.planTier,
        limit: usageLimit.limit,
        current: usageLimit.current,
        after: usageLimit.after,
        exceeded: usageLimit.exceeded,
        upgradeRequired: true,
      },
      { status: 402 },
    );
  }


  const store = await readStore();
  const current = Array.isArray(store.projects[projectId]) ? store.projects[projectId] : [];

  let source: "openai" | "fallback" = "fallback";
  let intent = detectIntent(message);
  let reply = "";

  try {
    reply = await callOpenAI({ projectId, userId, projectTitle, message, history: current });
    if (reply) source = "openai";
  } catch (error) {
    reply = "";
  }

  if (!reply) {
    const fb = fallbackReply(message, projectTitle, current);
    reply = fb.reply;
    intent = fb.intent;
    source = "fallback";
  }

  const userMessage = makeMessage("user", message, projectTitle, intent, "USER_MESSAGE");
  const assistantMessage = makeMessage(
    "assistant",
    reply,
    projectTitle,
    intent,
    source === "openai" ? "BUILDSETU_GPT_BRAIN" : "BUILDSETU_FALLBACK_BRAIN"
  );

  if (body.persist !== false) {
    store.projects[projectId] = [...current, userMessage, assistantMessage].slice(-300);
    await writeStore(store);
  }

  return NextResponse.json({
    ok: true,
    projectId,
    projectTitle,
    intent,
    source,
    reply,
    userMessage,
    assistantMessage,
  });
}
