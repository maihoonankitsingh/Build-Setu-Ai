"use client";
import ToolUiStandardizer from "@/components/buildsetu/ToolUiStandardizer";


function buildSetuUiSafeJsonParse(value: unknown) {
  try {
    return JSON.parse(String(value || "{}"));
  } catch {
    return {};
  }
}

function buildSetuUiDomainAnswerText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildSetuUiShouldUseDomainAnswerLocal(payload: any) {
  // BUILDSETU_UI_DOMAIN_ANSWER_LOCAL_ROUTE_V1
  const toolText = buildSetuUiDomainAnswerText(`${payload?.toolSlug || ""} ${payload?.toolName || ""}`);
  const userText = buildSetuUiDomainAnswerText(
    payload?.message ||
      payload?.prompt ||
      (Array.isArray(payload?.messages) ? payload.messages.map((item: any) => item?.content || item?.text || "").join(" ") : "")
  );

  const combined = `${toolText} ${userText}`;

  const domainKeywordHit = [
    "domain aware",
    "domain-aware",
    "taxonomy",
    "interior",
    "exterior",
    "facade",
    "elevation",
    "boq",
    "bbs",
    "bar bending",
    "vastu",
    "mep",
    "material",
    "wardrobe",
    "false ceiling",
    "approval",
    "bylaw",
    "byelaw",
    "setback",
    "dimension",
    "kitchen",
    "lighting",
    "quantity",
    "takeoff"
  ].some((keyword) => combined.includes(keyword));

  const explicitGenerationIntent = [
    "generate image",
    "render image",
    "create image",
    "image generate",
    "photorealistic",
    "final render",
    "generate floor plan",
    "generate working plan",
    "generate boq",
    "generate bbs",
    "execute",
    "run tool"
  ].some((keyword) => userText.includes(keyword));

  const imageTool = [
    "image",
    "render",
    "exterior-elevation",
    "interior-render"
  ].some((keyword) => toolText.includes(keyword));

  return domainKeywordHit && !explicitGenerationIntent && !imageTool;
}


async function saveWebSearchResultAsSourceCandidateFromToolUi(args: {
  raw?: any;
  output?: any;
  tool?: any;
  prompt?: string;
  projectId?: string | null;
}) {
  // BUILDSETU_WEB_SEARCH_UI_SAVE_AS_SOURCE_CANDIDATE_V1
  const raw = args.raw || {};
  const output = args.output || {};
  const prompt = String(args.prompt || raw?.query || raw?.prompt || raw?.message || output?.query || "").trim();

  const candidateItemsRaw =
    Array.isArray(output?.items)
      ? output.items
      : Array.isArray(output?.results)
        ? output.results
        : Array.isArray(output?.sourceItems)
          ? output.sourceItems
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.results)
              ? raw.results
              : output?.sourceUrl || output?.url
                ? [output]
                : raw?.sourceUrl || raw?.url
                  ? [raw]
                  : [];

  const items = candidateItemsRaw
    .map((item: any) => ({
      title: String(item?.title || item?.name || item?.sourceTitle || item?.domain || item?.url || item?.sourceUrl || "Web source candidate").trim(),
      sourceUrl: String(item?.sourceUrl || item?.url || item?.href || "").trim(),
      url: String(item?.url || item?.sourceUrl || item?.href || "").trim(),
      sourceCitation: String(item?.sourceCitation || item?.citation || "").trim(),
      snippet: String(item?.snippet || item?.summary || item?.description || "").trim(),
      textPreview: String(item?.textPreview || item?.text || item?.content || "").trim(),
      domain: String(item?.domain || "").trim(),
      publisher: String(item?.publisher || item?.source || "").trim(),
      jurisdiction: String(item?.jurisdiction || "India").trim(),
      confidence: String(item?.confidence || "").trim(),
      authorityType: String(item?.authorityType || "").trim(),
    }))
    .filter((item: any) => item.sourceUrl || item.url)
    .slice(0, 12);

  if (!items.length) {
    throw new Error("No source URLs found in this web-search result.");
  }

  const res = await fetch("/api/agent-knowledge/web-search-candidate-capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      query: prompt || "web-search-ui-source-candidate",
      jurisdiction: "India",
      sourceIdPrefix: "web-search-ui",
      projectId: args.projectId || null,
      items,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `Candidate capture failed with HTTP ${res.status}`);
  }

  return data;
}

async function buildSetuUiFetchToolChatRun(url: RequestInfo | URL, init?: RequestInit) {
  if (String(url).includes("/api/tool-chat/run")) {
    const payload = buildSetuUiSafeJsonParse(init?.body);

    if (buildSetuUiShouldUseDomainAnswerLocal(payload)) {
      const localPayload = {
        projectId: payload?.projectId || "global",
        domain: "all",
        query:
          payload?.message ||
          payload?.prompt ||
          (Array.isArray(payload?.messages) ? payload.messages.map((item: any) => item?.content || item?.text || "").join("\n") : ""),
        limit: 6,
      };

      const response = await fetch("/api/tool-chat/domain-answer-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...((init?.headers as Record<string, string>) || {}),
        },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(localPayload),
      });

      const data = await response.clone().json().catch(() => null);

      if (response.ok && data?.ok) {
        const normalized = {
          ok: true,
          action: payload?.action || "chat",
          projectId: payload?.projectId || "global",
          projectTitle: payload?.projectTitle || "",
          toolSlug: payload?.toolSlug || "",
          toolName: payload?.toolName || "",
          taskType: "domain_aware_knowledge_answer",
          messages: [
            ...(Array.isArray(payload?.messages) ? payload.messages : []),
            {
              id: `domain-answer-${Date.now()}`,
              role: "assistant",
              text: data.answer || data?.output?.text || "",
              content: data.answer || data?.output?.text || "",
              time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
              kind: "normal",
            },
          ],
          output: data.output || {
            status: "READY",
            title: "Local domain-aware saved knowledge answer",
            text: data.answer || "",
            source: "domain_answer_local_api_v1",
          },
          imagePrompt: "",
          prompt: data.answer || "",
          readyToGenerate: false,
          canImage: false,
          source: "ui_domain_answer_local_route_v1",
          domainAnswer: data,
        };

        return new Response(JSON.stringify(normalized), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return response;
    }
  }

  return fetch(url, init);
}

import {
  useEffect,
  useMemo,
  useRef,
  useState } from "react"; import { useParams,
  useRouter,
  useSearchParams } from "next/navigation";  const ACTIVE_PROJECT_STORAGE_KEY = "buildsetu-active-project-id";

type BuildSetuImageModelId =
  | "auto"
  | "flux_1_dev"
  | "nano_banana_2"
  | "gpt_image_2"
  | "seedream_4_0";

const BUILDSETU_IMAGE_MODEL_STORAGE_KEY = "buildsetu-selected-image-model-v1";

const BUILDSETU_IMAGE_MODEL_OPTIONS: Array<{
  id: BuildSetuImageModelId;
  label: string;
  tag: string;
}> = [
  { id: "flux_1_dev", label: "FLUX.1-dev", tag: "Standard" },
  { id: "nano_banana_2", label: "Nano Banana 2", tag: "Premium" },
  { id: "gpt_image_2", label: "GPT Image 2", tag: "Ultra" },
  { id: "seedream_4_0", label: "Seedream 4.0", tag: "Budget" },
];

function normalizeBuildSetuImageModel(value: unknown): BuildSetuImageModelId {
  const text = String(value || "").trim();
  return BUILDSETU_IMAGE_MODEL_OPTIONS.some((item) => item.id === text)
    ? (text as BuildSetuImageModelId)
    : "flux_1_dev";
}    type ProjectItem = {   id: string;   title: string;   name?: string;   projectId?: string;   clientName?: string;   location?: string;   projectType?: string;   plotSize?: string;   facing?: string;   floors?: string;   requirements?: string;   brief?: string;   summary?: string;   createdAt?: string;   updatedAt?: string;   [key: string]: any; };  const fallbackProjects = [   {     id: "demo-project",
  title: "Demo Project",
  name: "Demo Project",
  projectId: "demo-project",
  clientName: "Client",
  location: "",
  projectType: "residential",
  plotSize: "",
  facing: "",
  floors: "",
  requirements: "",
  },
  ];   type ProjectImageAsset = {   id: string;   projectId?: string;   toolSlug?: string;   toolName?: string;   title?: string;   name?: string;   type?: string;   imageUrl?: string;   printImageUrl?: string;   publicUrl?: string;   url?: string;   assetUrl?: string;   thumbnailUrl?: string;   fileName?: string;   prompt?: string;   createdAt?: string;   updatedAt?: string;   source?: string;   [key: string]: any; };   import {   AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  Play,
  RefreshCw,
  Sparkles,
  Table2,
  User,
  Wand2,
  Zap,
  Archive,
  FolderKanban,
  PencilLine,
  FileSpreadsheet,
  SearchCheck,
  Download,
  UserRound,
} from "lucide-react";

type ToolKind = "brief" | "image" | "drawing" | "table" | "document";


function isBuildSetuInternalToolMessage(message: any) {
  const text = String(
    message?.text ||
      message?.content ||
      message?.message ||
      message?.prompt ||
      ""
  ).trim();

  if (!text) return false;

  const lower = text.toLowerCase();

  const markers = [
    "buildsetu tool task lock",
    "strict blocked outputs",
    "mandatory project source of truth",
    "final instruction",
    "follow the task lock",
    "do not generate",
    "do not change the project type",
    "camera rule",
    "master design mode",
    "duplicate prevention",
    "same house design dna",
    "style requirements:",
    "quality:",
    "camera:",
    "user request:",
    "output file/image:",
    "/api/ai/generated-image",
    "generate a standalone high-quality full-size image",
    "not a collage, not a board, not a crop",
    "negative prompt",
    "positive prompt",
  ];

  if (markers.some((marker) => lower.includes(marker))) return true;

  const promptLikeLongText =
    text.length > 700 &&
    (
      lower.includes("final instruction") ||
      lower.includes("user request") ||
      lower.includes("style requirements") ||
      lower.includes("camera") ||
      lower.includes("quality") ||
      lower.includes("output file") ||
      lower.includes("generated-image")
    );

  return promptLikeLongText;
}

function stripInternalContextText(value: any) {
  let text = String(value ?? "").trim();

  if (!text) return "";

  const markers = [
    "PROJECT COMPACT CONTEXT",
    "PROJECT CONTEXT",
    "TOOL WORKFLOW RULES",
    "IMPORTANT BEHAVIOR",
    "TOOL STATE",
    "RULES -----",
    "Current tool:",
    "Tool purpose:",
    "Tool prerequisites:",
  ];

  const hits = markers
    .map((marker) => text.indexOf(marker))
    .filter((index) => index >= 0);

  if (hits.length) {
    const cutAt = Math.min(...hits);
    text = text.slice(0, cutAt).trim();
  }

  text = text
    .replace(/\\n- Use project brief[\\s\\S]*$/g, "")
    .replace(/\\n- If enough project context[\\s\\S]*$/g, "")
    .replace(/\\n- If a prerequisite[\\s\\S]*$/g, "")
    .replace(/\\n- Keep output project-wise[\\s\\S]*$/g, "")
    .replace(/\\n- For structure\/BBS\/BOQ[\\s\\S]*$/g, "")
    .replace(/\\n- For exterior[\\s\\S]*$/g, "")
    .replace(/\\s+/g, " ")
    .trim();

  return text || "Project brief/context loaded internally.";
}

function sanitizeToolOutput(output: any) {
  if (!output || typeof output !== "object") return output;



  const clean = JSON.parse(JSON.stringify(output));

  if (typeof clean.summary === "string") {
    clean.summary = stripInternalContextText(clean.summary);
  }

  if (typeof clean.prompt === "string") {
    clean.prompt = stripInternalContextText(clean.prompt);
  }

  if (typeof clean.raw === "string") {
    clean.raw = stripInternalContextText(clean.raw);
  }

  if (Array.isArray(clean.sections)) {
    clean.sections = clean.sections
      .map((item: any) => stripInternalContextText(item))
      .filter(Boolean)
      .slice(0, 12);
  }

  if (Array.isArray(clean.keyPoints)) {
    clean.keyPoints = clean.keyPoints
      .map((item: any) => stripInternalContextText(item))
      .filter(Boolean)
      .slice(0, 12);
  }

  if (Array.isArray(clean.prompts)) {
    clean.prompts = clean.prompts.map((item: any) => ({
      ...item,
      prompt: stripInternalContextText(item?.prompt || ""),
    }));
  }

  return clean;
}



function buildPremiumFloorPlanPromptForImageModel(prompt: string, tool: any, projectTitle = "") {
  const toolText = `${tool?.slug || ""} ${tool?.name || ""}`.toLowerCase();
  const isFloorPlan =
    toolText.includes("floor-plan") ||
    toolText.includes("floor plan") ||
    toolText.includes("sketch-to-plan") ||
    toolText.includes("naksha");

  if (!isFloorPlan) return prompt;

  return [
    "Generate a premium furnished 2D architectural floor plan image only.",
    "This must match a professional house-plan sheet style: realistic furniture top-view icons, thick wall outlines, light floor textures, blue tiled toilets, kitchen counter details, car in parking, plants, gate, staircase, door arcs, windows, labels, room dimensions, north arrow and outer dimension arrows.",
    "Do not create exterior elevation, facade, 3D building, perspective view, street scene, or flat block diagram.",
    "Use the same quality level as a high-end furnished architectural floor plan reference.",
    projectTitle ? `Project: ${projectTitle}` : "",
    prompt || "",
  ].filter(Boolean).join("\\n");
}

function enforceStrict2DFloorPlanPrompt(prompt: string, toolSlug = "", toolName = "") {
  const text = String(prompt || "");
  const toolText = `${toolSlug} ${toolName} ${text}`.toLowerCase();

  const isFloorPlan =
    toolText.includes("floor-plan") ||
    toolText.includes("floor plan") ||
    toolText.includes("sketch-to-plan") ||
    toolText.includes("sketch to plan") ||
    toolText.includes("working plan") ||
    toolText.includes("naksha");

  if (!isFloorPlan) return text;

  return [
    text,
    "",
    "HARD STYLE LOCK:",
    "Only 2D top-view floor plan drawing.",
    "Flat orthographic architectural plan.",
    "CAD/blueprint style.",
    "Room labels, dimensions, walls, doors, windows and staircase only.",
    "No 3D render.",
    "No elevation.",
    "No facade.",
    "No exterior building view.",
    "No realistic house front.",
    "No perspective.",
    "No sky, trees, street scene or building massing.",
  ].join("\n");
}


function pickBuildSetuImageUrl(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;

  const direct =
    value.imageUrl ||
    value.displayUrl ||
    value.publicUrl ||
    value.url ||
    value.streamUrl ||
    value?.output?.imageUrl ||
    value?.output?.displayUrl ||
    value?.output?.publicUrl ||
    value?.output?.url ||
    value?.output?.streamUrl;

  if (typeof direct === "string" && direct.trim()) return direct.trim();

  if (Array.isArray(value.imageUrls) && value.imageUrls[0]) return String(value.imageUrls[0]);
  if (Array.isArray(value.images) && value.images[0]) return String(value.images[0]);

  return "";
}

function normalizeBuildSetuImageOutput(baseOutput: any, imageData: any, tool: any) {
  const imageUrl = pickBuildSetuImageUrl(imageData) || pickBuildSetuImageUrl(baseOutput);

  if (!imageUrl) return baseOutput;

  return {
    ...(baseOutput || {}),
    title:
      tool?.slug === "floor-plan-ai" || tool?.slug === "sketch-to-plan"
        ? "Floor Plan 2D Output"
        : baseOutput?.title || imageData?.title || tool?.outputLabel || "Generated Image",
    summary:
      tool?.slug === "floor-plan-ai" || tool?.slug === "sketch-to-plan"
        ? "2D floor plan generated successfully."
        : baseOutput?.summary || imageData?.summary || "Image generated successfully.",
    imageUrl,
    displayUrl: imageUrl,
    images: [imageUrl],
    imageUrls: [imageUrl],
    assetType: imageData?.assetType || baseOutput?.assetType,
    renderType: imageData?.renderType || baseOutput?.renderType,
    imageMode: imageData?.imageMode || baseOutput?.imageMode,
  };
}

function cleanImagePromptForGeneration(value: any) {
  const text = stripInternalContextText(value);
  return text.replace(/Context:\\s*$/i, "Context: selected project brief loaded internally.").trim();
}

function normalizeProjectGalleryItem(item: any, fallbackProjectId: string): ProjectImageAsset {
  return {
    id: String(item?.id || item?.imageUrl || item?.publicUrl || Math.random()),
    projectId: String(item?.projectId || fallbackProjectId),
    projectTitle: String(item?.projectTitle || ""),
    title: String(item?.title || item?.renderType || item?.roomType || item?.toolName || "Generated Image"),
    type: String(item?.type || item?.source || "asset"),
    role: String(item?.role || ""),
    status: String(item?.status || ""),
    toolSlug: String(item?.toolSlug || ""),
    toolName: String(item?.toolName || ""),
    renderType: String(item?.renderType || item?.title || item?.toolName || ""),
    roomType: String(item?.roomType || ""),
    imageUrl: String(item?.imageUrl || item?.publicUrl || item?.url || ""),
    publicUrl: String(item?.publicUrl || ""),
    createdAt: String(item?.createdAt || item?.updatedAt || ""),
  };
}



type ToolConfig = {
  slug: string;
  name: string;
  badge?: string;
  label?: string;
  description?: string;
  subtitle?: string;
  outputLabel: string;
  placeholder: string;
  quickPrompts: string[];
  checklist: string[];
  taskType?: string;
  outputMode?: string;
  renderType?: string;
  assetType?: string;
  imageMode?: string;
  category?: string;
  status?: string;
  icon?: any;
  [key: string]: any;
};

const baseTools: Record<string, ToolConfig> = {
  "magic-brief": {
    slug: "magic-brief",
    name: "Magic Brief",
    badge: "AI Brief",
    kind: "brief",
    description: "Project chat ko structured design brief me convert kare.",
    outputLabel: "Structured Project Brief",
    placeholder: "Requirement likho. AI project memory se context lega aur missing details poochega.",
    quickPrompts: ["30×40 G+1 house brief", "Interior + BOQ package", "Client proposal scope"],
    checklist: ["Project type", "Location", "Budget", "Rooms", "Deliverable"],
  },
  "interior-render": {
    slug: "interior-render",
    name: "Interior Render",
    badge: "Image Tool",
    kind: "image",
    description: "Room details se premium AI interior render workflow banaye.",
    outputLabel: "Interior Render Output",
    placeholder: "Room, style, color, furniture, lighting, budget aur reference likho.",
    quickPrompts: ["Modern living room", "Luxury bedroom", "Budget Indian kitchen"],
    checklist: ["Room", "Style", "Color", "Budget", "Reference"],
  },
  "exterior-elevation": {
    slug: "exterior-elevation",
    name: "Exterior Elevation",
    badge: "Image Tool",
    kind: "image",
    description: "Plot details se premium front elevation concept banaye.",
    outputLabel: "Exterior Elevation Output",
    placeholder: "Plot width, floors, balcony, gate, facade style, material aur lighting likho.",
    quickPrompts: ["30ft modern elevation", "Luxury G+1 facade", "Budget elevation"],
    checklist: ["Width", "Floors", "Style", "Material", "Gate"],
  },
  "floor-plan-ai": {
    slug: "floor-plan-ai",
    name: "Floor Plan AI",
    badge: "Planning Tool",
    kind: "drawing",
    description: "Project memory aur requirement se floor plan concept banaye.",
    outputLabel: "Floor Plan Concept",
    placeholder: "Plot size, facing, road side, rooms, staircase, parking aur vastu details likho.",
    quickPrompts: ["30×40 floor plan", "G+1 vastu plan", "Parking + 3BHK"],
    checklist: ["Plot", "Facing", "Rooms", "Staircase", "Vastu"],
  },
  "boq-generator": {
    slug: "boq-generator",
    name: "BOQ Generator",
    badge: "Estimate Tool",
    kind: "table",
    description: "Project scope ko BOQ draft aur estimate table me convert kare.",
    outputLabel: "BOQ Draft",
    placeholder: "Built-up area, scope, specs, city rates aur drawing reference likho.",
    quickPrompts: ["Rough BOQ", "Civil BOQ", "Interior BOQ"],
    checklist: ["Area", "Scope", "Rates", "Specs", "Export"],
  },
  // BUILDSETU_TOOL_PAGE_INTERNAL_TOOL_CONFIGS_V1
  "project-db-search": {
    slug: "project-db-search",
    name: "Project DB Search",
    title: "Project DB Search",
    badge: "Knowledge Tool",
    kind: "table",
    description: "Search saved project data, BOQ, BBS, renders, tool runs and project memory.",
    outputLabel: "Project DB Search Results",
    placeholder: "Search this project database for BOQ, BBS, renders, tool runs, saved outputs or project memory.",
    quickPrompts: ["Search BOQ", "Find BBS", "Find renders", "Search tool runs"],
    checklist: ["Select project", "Enter search query", "Review read-only results", "Use cited saved context"],
  },

  "web-search": {
    slug: "web-search",
    toolSlug: "web-search",
    name: "Web Search",
    title: "Web Search",
    category: "Research",
    description: "Search public web sources and return cited research snippets for BuildSetu project work.",
    outputLabel: "Web Search Results",
    quickPrompts: ["Search public references", "Find official sources", "Research building rules", "Compare source citations"],
    checklist: ["Enter search query or public URL", "Review cited sources", "Open useful references", "Save important sources to knowledge"],

    placeholder: "Search public web sources or paste a public URL...",
    cta: "Run Web Search",
    inputLabel: "Search query or public URL",
    inputType: "textarea",
    examples: [
      "latest low-cost residential construction material references",
      "https://example.com",
      "site:gov.in building bye laws residential setback",
    ],
    tags: ["research", "web", "citations"],
    sections: ["Research Summary", "Source Citations", "Useful Findings", "Next Steps"],
    nextActions: ["Open source", "Save to knowledge", "Run URL ingest", "Add to project notes"],
    marker: "BUILDSETU_WEB_SEARCH_UI_ENTRY_V1",
  },

  "url-ingest": {
    slug: "url-ingest",
    name: "URL Ingest",
    title: "URL Ingest",
    badge: "Knowledge Tool",
    kind: "table",
    description: "Add a public website/reference URL into BuildSetu knowledge with source citation.",
    outputLabel: "URL Ingest Result",
    placeholder: "Paste a public URL, for example: https://example.com/reference-page",
    quickPrompts: ["Ingest public URL", "Add reference page", "Save source citation"],
    checklist: ["Paste public URL", "Add title", "Run ingest", "Review Knowledge Inbox"],
  },
  "bbs-generator": {
    slug: "bbs-generator",
    name: "BBS Generator",
    badge: "Steel Tool",
    kind: "table",
    description: "Engineer input ke basis par BBS draft aur steel summary banaye.",
    outputLabel: "BBS Draft",
    placeholder: "Member type, ID, diameter, bar count, spacing, shape code aur length data likho.",
    quickPrompts: ["Beam BBS", "Column summary", "Floor-wise BBS"],
    checklist: ["Member", "Drawing", "Dia", "Length", "Review"],
  },
  "client-agreement": {
    slug: "client-agreement",
    name: "Client Agreement",
    badge: "Legal Draft",
    kind: "document",
    description: "Scope, payment, timeline aur terms se agreement draft banaye.",
    outputLabel: "Agreement Draft",
    placeholder: "Provider, client, scope, payment terms, timeline, revision policy aur jurisdiction likho.",
    quickPrompts: ["Interior agreement", "Architecture scope", "Contractor draft"],
    checklist: ["Parties", "Scope", "Payment", "Timeline", "Terms"],
  },
  "client-pdf": {
    slug: "client-pdf",
    name: "Client PDF",
    badge: "Export Tool",
    kind: "document",
    description: "Project outputs ko client-ready PDF package me convert kare.",
    outputLabel: "Client PDF Package",
    placeholder: "PDF me include sections likho: brief, renders, BOQ, agreement, next steps.",
    quickPrompts: ["Proposal PDF", "Concept package", "Contractor PDF"],
    checklist: ["Sections", "Brand", "Tone", "Images", "Export"],
  },
  "working-drawings": {
    slug: "working-drawings",
    name: "Working Drawings",
    badge: "Draft Tool",
    kind: "drawing",
    description: "Project brief se drawing checklist aur draft structure banaye.",
    outputLabel: "Working Drawing Draft",
    placeholder: "Drawing category, floor, area, dimensions, notes aur required details likho.",
    quickPrompts: ["Drawing list", "Interior package", "Electrical layout"],
    checklist: ["Category", "Floor", "Dimensions", "Refs", "Review"],
  },
};

const aliases: Record<string, keyof typeof baseTools> = {
  "site-photo-redesign": "interior-render",
  "render-enhancer": "interior-render",
  "background-change": "interior-render",
  "remove-furniture": "interior-render",
  "photo-enhancer": "interior-render",
  "false-ceiling-ai": "interior-render",
  "material-palette-ai": "interior-render",
  "mood-board": "interior-render",
  "sketch-to-plan": "floor-plan-ai",
  "vastu-check": "floor-plan-ai",
  "boq-estimate": "boq-generator",
  "cost-estimation": "boq-generator",
  "material-list": "boq-generator",
  "contractor-package": "client-pdf",
  "report-generator": "client-pdf",
  "document-generator": "client-pdf",
  "architect-chat": "magic-brief",
  "plumbing-plan": "working-drawings",
  "electrical-plan": "working-drawings",
  "rcc-structure": "working-drawings",
  "column-beam-plan": "working-drawings",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTool(slug: string): ToolConfig {
  const key = aliases[slug] || slug;
  if (baseTools[key]) return { ...baseTools[key], slug };

  return {
    slug,
    name: titleFromSlug(slug || "AI Tool"),
    badge: "BuildSetu Tool",
    kind: "brief",
    description: "Selected tool ke according AI guided workflow chalega.",
    outputLabel: "Floor Plan Concept",
    placeholder: "Requirement likho. AI project-wise details poochega aur output banayega.",
    quickPrompts: ["Use project data", "Create prompt", "Generate output"],
    checklist: ["Project", "Input", "Format", "Review", "Export"],
  };
}

function iconForKind(kind: ToolKind) {
  if (kind === "image") return ImageIcon;
  if (kind === "table") return Table2;
  if (kind === "document") return FileText;
  if (kind === "drawing") return ClipboardList;
  return Wand2;
}


type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | string;
  text: string;
  time: string;
  toolSlug?: string;
  toolName?: string;
  imageUrl?: string;
  output?: unknown;
  sourceFile?: string;
  [key: string]: any;
  researchDraft?: any;
};


function cleanProjectId(value: any): string {
  const text = String(value || "").trim();
  if (!text || text === "null" || text === "undefined") return "";
  return text;
}

function buildLocalPrompt(tool: ToolConfig, projectTitle: string, messages: ChatMessage[]) {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text)
    .join("\n");

  return [
    `Tool: ${tool.name}`,
    `Project: ${projectTitle}`,
    `Output: ${tool.outputLabel}`,
    "",
    "Requirement:",
    userText || "Use selected project data.",
    "",
    "Use saved project memory, ask missing details, then create structured output with review warning.",
  ].join("\n");
}

function getDisplayImageUrl(value: string) {
  const url = String(value || "").trim();
  if (!url) return "";

  if (url.startsWith("/api/ai/generated-image")) return url;

  if (url.startsWith("/generated/ai-images/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(url.replace(/^\/+/, ""))}`;
  }

  return url;
}



function getLatestStoredToolOutput() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("buildsetu-latest-tool-output");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.imageUrl ? parsed : null;
  } catch {
    return null;
  }
}



function buildSetuImagePriority(value: any): number {
  const text = JSON.stringify(value || "").toLowerCase();

  if (
    text.includes("exact_professional_floor_plan_v1") || text.includes("exact_professional_floor_plan") || text.includes("exact-professional-floor-plan") || text.includes("openai_professional_floor_plan_v1") ||
    text.includes("openai_professional_floor_plan") ||
    text.includes("professional_floor_plan") ||
    text.includes("openai-professional-floor-plan")
  ) {
    return 1000;
  }

  if (
    text.includes("working_drawing_sheet") ||
    text.includes("working-set") ||
    text.includes("locked_working_drawing")
  ) {
    return -1000;
  }

  return 0;
}

function sortBuildSetuPreviewImages(images: string[]) {
  return [...images].sort((a, b) => buildSetuImagePriority(b) - buildSetuImagePriority(a));
}


function normalizePreviewImageUrl(value: any): string {
  if (value && typeof value === "object") {
    return normalizePreviewImageUrl(
      value.imageUrl ||
        value.publicUrl ||
        value.url ||
        value.src ||
        value.path ||
        value.file ||
        value.assetUrl ||
        value.thumbnailUrl ||
        value.href ||
        ""
    );
  }

  const raw = String(value || "").trim();
  if (!raw || raw === "null" || raw === "undefined" || raw === "[object Object]") return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/api/ai/generated-image")) return raw;

  // Generated assets live under data/generated, not public/generated.
  // Preview must use the generated-image API route.
  if (raw.startsWith("/generated/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(raw.replace(/^\/+/, ""))}`;
  }

  if (raw.startsWith("generated/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(raw)}`;
  }

  if (raw.startsWith("data/generated/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(raw.replace(/^data\//, ""))}`;
  }

  return raw;
}

function safePreviewImageSrc(value: any): string {
  return normalizePreviewImageUrl(value);
}

// BUILDSETU_SAFE_PREVIEW_IMAGE_SRC
function withValidPreviewImages(output: any) {
  if (!output || typeof output !== "object") return output;

  const asset = output.asset || output.raw?.asset || output.exact?.asset || null;

  const imageUrl = normalizePreviewImageUrl(
    output.imageUrl ||
      output.publicUrl ||
      output.url ||
      output.path ||
      asset?.imageUrl ||
      asset?.publicUrl ||
      asset?.url ||
      asset?.assetUrl ||
      ""
  );

  const existingImages: string[] = Array.isArray(output.images)
    ? output.images
        .map((item: any) => normalizePreviewImageUrl(item))
        .filter((item: string) => Boolean(item))
    : [];

  const images: string[] = imageUrl
    ? [imageUrl, ...existingImages.filter((item: string) => item !== imageUrl)]
    : existingImages;

  return {
    ...output,
    imageUrl: imageUrl || output.imageUrl || "",
    publicUrl: normalizePreviewImageUrl(output.publicUrl) || imageUrl || "",
    images: Array.isArray(images) ? sortBuildSetuPreviewImages(images) : images,
  };
}


function normalizeToolChatGeneratedOutput(data: any) {
  const output = data?.output || data?.exact || data?.asset || null;
  const asset = data?.asset || output?.asset || data?.exact?.asset || null;

  const imageUrl =
    data?.imageUrl ||
    data?.publicUrl ||
    output?.imageUrl ||
    output?.publicUrl ||
    asset?.imageUrl ||
    asset?.publicUrl ||
    data?.exact?.imageUrl ||
    data?.exact?.publicUrl ||
    "";

  if (!imageUrl && !output && !asset) return null;

  return {
    title:
      output?.title ||
      asset?.title ||
      data?.exact?.plan?.title ||
      data?.plan?.title ||
      "Floor Plan Output",
    summary:
      output?.summary ||
      "Generated output is ready.",
    imageUrl,
    publicUrl:
      data?.publicUrl ||
      output?.publicUrl ||
      asset?.publicUrl ||
      data?.exact?.publicUrl ||
      imageUrl,
    asset: asset || output?.asset || null,
    plan: data?.plan || output?.plan || data?.exact?.plan || null,
    generationMode:
      data?.generationMode ||
      output?.generationMode ||
      asset?.generationMode ||
      data?.exact?.generationMode ||
      "",
    source:
      data?.source ||
      output?.source ||
      data?.exact?.source ||
      "",
    raw: data,
  };
}



function BuildSetuToolOutputReadyListener() {
  useEffect(() => {
    function onOutputReady(event: Event) {
      const custom = event as CustomEvent<any>;
      const detail = custom?.detail || {};
      if (!detail?.imageUrl) return;

      try {
        window.localStorage.setItem(
          "buildsetu-latest-tool-output",
          JSON.stringify({
            ...detail,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {}
    }

    window.addEventListener("buildsetu-tool-output-ready", onOutputReady as EventListener);

    return () => {
      window.removeEventListener("buildsetu-tool-output-ready", onOutputReady as EventListener);
    };
  }, []);

  return null;
}






function BuildSetuWebSearchSaveToKnowledgeCard({
  output,
  projectId,
}: {
  output: any;
  projectId?: string;
}) {
  // BUILDSETU_WEB_SEARCH_SAVE_CARD_COMPONENT_V1
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const raw = output?.raw || {};
  const rows = Array.isArray(output?.rows)
    ? output.rows
    : Array.isArray(raw?.items)
      ? raw.items
      : [];

  const slugText = String(raw?.toolSlug || raw?.slug || output?.toolSlug || output?.slug || "").toLowerCase();
  const internalTool = String(raw?.internalTool || "").toLowerCase();
  const titleText = String(output?.title || raw?.title || "").toLowerCase();

  const isWebSearch =
    slugText === "web-search" ||
    internalTool === "web_search" ||
    titleText.includes("web search");

  if (!isWebSearch || !rows.length) return null;

  const saveQuery =
    String(raw?.query || raw?.prompt || raw?.message || output?.sourceUrl || output?.summary || "web-search-ui-save").trim() ||
    "web-search-ui-save";

  return (
    <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-100">Save cited web results to Knowledge</p>
          <p className="mt-1 text-xs text-emerald-100/75">
            Saves sourceUrl/sourceCitation/snippet into BuildSetu Knowledge Inbox.
          </p>
          {message ? <p className="mt-2 text-xs font-semibold text-emerald-100">{message}</p> : null}
          {error ? <p className="mt-2 text-xs font-semibold text-red-200">{error}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            onClick={async () => {
              // BUILDSETU_WEB_SEARCH_SAVE_CARD_HANDLER_V1
              try {
                setSaving(true);
                setError("");
                setMessage("");

                const res = await fetch("/api/agent-knowledge/web-search-save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  cache: "no-store",
                  body: JSON.stringify({
                    projectId,
                    query: saveQuery,
                    prompt: saveQuery,
                    message: saveQuery,
                    domain: "web_search",
                    tags: ["web_search", "public_reference", "ui_saved"],
                    items: rows,
                  }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok || data?.ok === false) {
                  throw new Error(data?.error || data?.message || data?.code || "Save to Knowledge failed.");
                }

                const savedCount = Number(data?.savedCount || rows.length || 0);
                setMessage(`Saved ${savedCount} source(s). Open Knowledge Inbox to review.`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Save to Knowledge failed.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save to Knowledge"}
          </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await saveWebSearchResultAsSourceCandidateFromToolUi({
                          raw,
                          output,
                          tool: undefined,
                          prompt: String(raw?.query || raw?.prompt || raw?.message || output?.query || output?.sourceUrl || output?.summary || "web-search-ui-source-candidate").trim(),
                          projectId: typeof projectId === "string" ? projectId : null,
                        });

                        window.alert(
                          `Saved ${data?.savedCount ?? 0} source candidate(s). Review queue: ${data?.reviewQueuePath || "/workspace/official-source-review-queue"}`
                        );
                      } catch (err) {
                        window.alert(err instanceof Error ? err.message : "Source candidate save failed.");
                      }
                    }}
                    className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-400/20"
                  >
                    Save as Source Candidate
                  </button>


          <a
            href="/workspace/knowledge-inbox"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            Open Knowledge Inbox
          </a>
        </div>
      </div>
    </div>
  );
}


function ToolChatMessageIcon({ role }: { role?: string }) {
  const isUser = role === "user";

  return (
    <div className={cn("bsu-chat-message-avatar", isUser ? "user" : "assistant")} aria-hidden="true">
      {isUser ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
    </div>
  );
}

function ToolResearchDraftCard({ researchDraft }: { researchDraft?: any }) {
  if (!researchDraft?.created) return null;

  const draft = researchDraft?.draft || {};
  const source = draft?.source || {};
  const jurisdiction = draft?.jurisdiction || {};

  const draftId = String(researchDraft?.draftId || draft?.id || "");
  const category = String(researchDraft?.category || draft?.category || "research draft");
  const status = String(researchDraft?.status || draft?.status || "pending_review");
  const riskLevel = String(researchDraft?.riskLevel || draft?.riskLevel || "risk unknown");
  const confidence = String(researchDraft?.confidence || draft?.confidence || "confidence unknown");
  const sourceTitle = String(source?.title || "Source pending review");
  const sourceUrl = String(source?.url || "");
  const location = [jurisdiction?.country, jurisdiction?.stateOrProvinceOrEmirate, jurisdiction?.cityOrAuthority]
    .filter(Boolean)
    .join(" / ");

  const rows = [
    ["Source Title", sourceTitle],
    ["Draft ID", draftId],
    ["Category", category],
    ["Risk", riskLevel],
    ["Confidence", confidence],
    ["Jurisdiction", location || "—"],
    ["Source URL", sourceUrl || "—"]
  ];

  return (
    <div className="mt-3 overflow-hidden rounded-[22px] border border-[#d8c5ff] bg-white shadow-[0_12px_30px_rgba(72,30,130,0.08)]">
      <div className="flex items-start justify-between gap-3 border-b border-[#efe7fb] bg-[#fbf8ff] px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#d8c5ff] bg-white text-[#6d28d9]">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-black leading-5 tracking-[-0.02em] text-[#21133f]">
              Research Draft Created
            </div>
            <div className="mt-1 truncate text-[12px] font-semibold text-[#817397]">
              Source metadata saved to Knowledge Inbox for review.
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className="inline-flex h-7 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-black text-amber-700">
            {status.replace(/_/g, " ")}
          </span>
          <span className="hidden h-7 items-center rounded-full border border-[#eadcff] bg-[#f4edff] px-2.5 text-[11px] font-black text-[#6d28d9] sm:inline-flex">
            Review required before merge
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="overflow-hidden rounded-2xl border border-[#efe7fb]">
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={`grid grid-cols-[128px_minmax(0,1fr)] gap-3 px-3 py-2 text-[12px] leading-5 ${
                index !== rows.length - 1 ? "border-b border-[#efe7fb]" : ""
              }`}
            >
              <div className="font-black text-[#6d5b80]">{label}</div>
              <div className={label === "Source URL" ? "truncate font-bold text-[#5b21b6]" : "min-w-0 break-words font-semibold text-[#21133f]"}>
                {label === "Risk" ? (
                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600">{value}</span>
                ) : label === "Confidence" ? (
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">{value}</span>
                ) : (
                  value
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/?view=knowledgeInbox"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#7c3aed] bg-white px-3 text-[12px] font-black text-[#6d28d9] hover:bg-[#f7f1ff]"
          >
            <Archive className="h-4 w-4" />
            Open Knowledge Inbox
          </a>
          <span className="inline-flex h-9 items-center rounded-xl bg-[#fbf8ff] px-3 text-[12px] font-bold text-[#817397]">
            No auto-merge without approval
          </span>
        </div>
      </div>
    </div>
  );
}


function parseToolOutputMessage(text: string): any | null {
  const rawText = String(text || "").trim();

  const outputIndex = rawText.toLowerCase().indexOf("output:");
  const searchText = outputIndex >= 0 ? rawText.slice(outputIndex + "output:".length) : rawText;

  const firstBrace = searchText.indexOf("{");
  if (firstBrace < 0) return null;

  const candidate = searchText.slice(firstBrace);
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < candidate.length; i += 1) {
    const ch = candidate[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) return null;

  try {
    return JSON.parse(candidate.slice(0, end));
  } catch {
    return null;
  }
}

function ToolMessageContent({ text, isUserMessage }: { text: string; isUserMessage: boolean }) {
  if (isUserMessage) return <>{text}</>;

  const parsed = parseToolOutputMessage(text);

  if (!parsed) return <>{text}</>;

  const title = String(parsed.title || "Floor Plan Concept");
  const summary = String(parsed.summary || "");
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const source = String(parsed.source || "");
  const projectId = String(parsed.projectId || "");

  return (
    <div className="bsu-tool-output-card">
      <div className="bsu-tool-output-eyebrow">Output</div>
      <div className="bsu-tool-output-title">{title}</div>

      {summary ? (
        <div className="bsu-tool-output-summary">
          {summary.replace(/\\n/g, "\n").split("\n").filter(Boolean).slice(0, 5).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}

      {sections.length ? (
        <div className="bsu-tool-output-section-grid">
          {sections.slice(0, 12).map((item: any, index: number) => (
            <div key={`${item}-${index}`} className="bsu-tool-output-section-item">
              <span>{index + 1}</span>
              <p>{String(item).replace(/^\d+\.\s*/, "")}</p>
            </div>
          ))}
        </div>
      ) : null}
      {(source || projectId) ? (
        <div className="bsu-tool-output-meta">
          {source ? <span>Source: {source}</span> : null}
          {projectId ? <span>Project: {projectId}</span> : null}
        </div>
      ) : null}
    </div>
  );
}



// BUILDSETU_OUTPUT_PLANNING_METADATA_UI_V1
function getBuildSetuPlanningMetadata(output: any) {
  const candidates = [
    output,
    output?.raw,
    output?.asset,
    output?.raw?.asset,
    Array.isArray(output?.assets) ? output.assets[0] : null,
    Array.isArray(output?.raw?.assets) ? output.raw.assets[0] : null,
    Array.isArray(output?.outputs) ? output.outputs[0] : null,
    Array.isArray(output?.raw?.outputs) ? output.raw.outputs[0] : null,
    Array.isArray(output?.images) ? output.images[0] : null,
    output?.raw?.output,
  ].filter(Boolean);

  const findValue = (key: string) => {
    for (const item of candidates) {
      if (item && item[key]) return item[key];
    }
    return null;
  };

  const planningJson = findValue("planningJson");
  const validationReport = findValue("validationReport") || planningJson?.validation || [];
  const scoreReport = findValue("scoreReport") || planningJson?.scoreReport || null;

  return {
    planningJson,
    validationReport: Array.isArray(validationReport) ? validationReport : [],
    scoreReport,
    hasAny: Boolean(planningJson || (Array.isArray(validationReport) && validationReport.length) || scoreReport),
  };
}

function getBuildSetuValidationBadgeClass(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "fail") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}


// BUILDSETU_GPLUS1_EXACT_PACKAGE_HELPER_V1
function getBuildSetuAssetImageUrlForGPlusOne(asset: any) {
  return String(
    asset?.imageUrl ||
      asset?.publicUrl ||
      asset?.url ||
      asset?.assetUrl ||
      asset?.thumbnailUrl ||
      ""
  );
}

function getBuildSetuGPlusOneExactPackage(projectImages: any[], output: any) {
  const fromOutputAssets = [
    output?.asset,
    ...(Array.isArray(output?.assets) ? output.assets : []),
    ...(Array.isArray(output?.outputs) ? output.outputs : []),
  ].filter(Boolean);

  const fromGallery = Array.isArray(projectImages) ? projectImages : [];
  const candidates = [...fromOutputAssets, ...fromGallery].filter((item: any) => {
    const text = JSON.stringify(item || {}).toLowerCase();
    return (
      text.includes("exact_floor_plan_agent_v1") ||
      text.includes("exact-floor-plan-agent") ||
      text.includes("exact-floor-plan-source-of-truth")
    );
  });

  const seen = new Set<string>();
  const unique = candidates.filter((item: any) => {
    const key = String(item?.id || item?.imageUrl || item?.publicUrl || item?.url || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const isGround = (item: any) => {
    const text = JSON.stringify(item || {}).toLowerCase();
    return (
      item?.assetType === "ground_floor_plan" ||
      item?.command === "ground_floor_plan" ||
      text.includes("ground floor plan") ||
      text.includes("ground-floor-plan")
    );
  };

  const isFirst = (item: any) => {
    const text = JSON.stringify(item || {}).toLowerCase();
    return (
      item?.assetType === "first_floor_plan" ||
      item?.command === "first_floor_plan" ||
      text.includes("first floor plan") ||
      text.includes("first-floor-plan")
    );
  };

  const latestGround = unique.find(isGround) || null;
  const latestFirst = unique.find(isFirst) || null;

  return {
    hasAny: Boolean(latestGround || latestFirst),
    isComplete: Boolean(latestGround && latestFirst),
    ground: latestGround,
    first: latestFirst,
    floors: [
      latestGround ? { key: "ground", label: "Ground Floor", asset: latestGround } : null,
      latestFirst ? { key: "first", label: "First Floor", asset: latestFirst } : null,
    ].filter(Boolean),
  };
}



// BUILDSETU_EXACT_SVG_PREVIEW_PRIORITY_HELPER_V1
function isBuildSetuExactFloorPlanAsset(asset: any) {
  const text = JSON.stringify(asset || {}).toLowerCase();
  return (
    asset?.source === "exact_floor_plan_agent_v1" ||
    asset?.generationMode === "exact-floor-plan-source-of-truth" ||
    asset?.sourceOfTruth === true ||
    text.includes("exact_floor_plan_agent_v1") ||
    text.includes("exact-floor-plan-agent") ||
    text.includes("exact-floor-plan-source-of-truth")
  );
}

function isBuildSetuOpenAiFloorPlanPreview(asset: any) {
  const text = JSON.stringify(asset || {}).toLowerCase();
  return (
    asset?.source === "professional_openai_floor_plan_v1" ||
    asset?.provider === "openai" ||
    text.includes("professional_openai_floor_plan_v1") ||
    text.includes("openai-floor-plan-final") ||
    text.includes("beautified_openai_preview")
  );
}

function getBuildSetuFloorAssetRank(asset: any) {
  if (isBuildSetuExactFloorPlanAsset(asset)) {
    if (asset?.assetType === "ground_floor_plan") return 0;
    if (asset?.assetType === "first_floor_plan") return 1;
    return 2;
  }

  if (isBuildSetuOpenAiFloorPlanPreview(asset)) return 20;

  return 50;
}

function sortBuildSetuFloorPlanAssetsForDisplay(items: any[]) {
  return [...(Array.isArray(items) ? items : [])].sort((a: any, b: any) => {
    const rankA = getBuildSetuFloorAssetRank(a);
    const rankB = getBuildSetuFloorAssetRank(b);
    if (rankA !== rankB) return rankA - rankB;

    const timeA = Date.parse(a?.createdAt || a?.updatedAt || "") || 0;
    const timeB = Date.parse(b?.createdAt || b?.updatedAt || "") || 0;
    return timeB - timeA;
  });
}

function getBuildSetuPrimaryExactFloorPlanAsset(projectImages: any[], output: any) {
  const fromOutput = [
    output?.asset,
    ...(Array.isArray(output?.assets) ? output.assets : []),
    ...(Array.isArray(output?.outputs) ? output.outputs : []),
  ].filter(Boolean);

  const all = [...fromOutput, ...(Array.isArray(projectImages) ? projectImages : [])]
    .filter(Boolean)
    .filter((item: any) => {
      const text = JSON.stringify(item || {}).toLowerCase();
      return (
        isBuildSetuExactFloorPlanAsset(item) &&
        (
          item?.assetType === "ground_floor_plan" ||
          item?.assetType === "first_floor_plan" ||
          text.includes("ground floor plan") ||
          text.includes("first floor plan")
        )
      );
    });

  const sorted = sortBuildSetuFloorPlanAssetsForDisplay(all);
  return sorted[0] || null;
}

function getBuildSetuOutputWithExactSvgPriority(projectImages: any[], output: any) {
  const exact = getBuildSetuPrimaryExactFloorPlanAsset(projectImages, output);
  if (!exact) return output;

  const exactImageUrl = getBuildSetuAssetImageUrlForGPlusOne(exact);
  if (!exactImageUrl) return output;

  const openAiPreviewAsset =
    output?.openAiPreviewAsset ||
    (Array.isArray(output?.assets) ? output.assets.find(isBuildSetuOpenAiFloorPlanPreview) : null) ||
    (isBuildSetuOpenAiFloorPlanPreview(output?.asset) ? output.asset : null);

  return {
    ...(output || {}),
    imageUrl: exactImageUrl,
    url: exactImageUrl,
    publicUrl: exactImageUrl,
    exactTechnicalImageUrl: exactImageUrl,
    openAiPreviewImageUrl:
      output?.openAiPreviewImageUrl ||
      getBuildSetuAssetImageUrlForGPlusOne(openAiPreviewAsset) ||
      "",
    asset: {
      ...exact,
      role: "technical_source_of_truth",
      sourceOfTruth: true,
      previewRole: "main_technical_plan",
    },
    assets: sortBuildSetuFloorPlanAssetsForDisplay([
      exact,
      ...(Array.isArray(output?.assets) ? output.assets : []),
      ...(Array.isArray(projectImages) ? projectImages.filter(isBuildSetuExactFloorPlanAsset).slice(0, 4) : []),
    ]).filter((item: any, index: number, arr: any[]) => {
      const key = String(item?.id || item?.imageUrl || item?.publicUrl || item?.url || "");
      return key && arr.findIndex((x: any) => String(x?.id || x?.imageUrl || x?.publicUrl || x?.url || "") === key) === index;
    }),
    source: "tool_page_exact_svg_priority_v1",
    provider: "buildsetu-exact",
    generationMode: "exact-floor-plan-source-of-truth",
    sourceOfTruth: true,
    exactPriorityApplied: true,
  };
}


export default function ToolWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = String(params?.slug || "magic-brief");
  const requestedProjectId = cleanProjectId(String(searchParams?.get("projectId") || ""));
  const storedProjectId =
    typeof window !== "undefined"
      ? cleanProjectId(window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) || "")
      : "";
  const initialProjectId = requestedProjectId || storedProjectId || fallbackProjects[0].id;
  const tool = useMemo(() => getTool(slug), [slug]);
  const ToolIcon = iconForKind(tool.kind);

  const [projects, setProjects] = useState<ProjectItem[]>(fallbackProjects);
  const [projectId, setProjectId] = useState(initialProjectId);
  const selectedProject = projects.find((p) => p.id === projectId) || projects[0] || fallbackProjects[0];

  const [credits, setCredits] = useState("1,90,000");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<any>(null);
  const [projectImages, setProjectImages] = useState<ProjectImageAsset[]>([]);
  // BUILDSETU_EXACT_SVG_GALLERY_PRIORITY_V1
  const buildSetuProjectImagesForDisplay =
    tool?.slug === "floor-plan-ai"
      ? sortBuildSetuFloorPlanAssetsForDisplay(projectImages)
      : projectImages;


  // BUILDSETU_FORCE_OUTPUT_PREVIEW_FROM_LATEST_ASSET
  useEffect(() => {
    if (tool?.slug !== "floor-plan-ai") return;

    const currentImage =
      output?.imageUrl ||
      output?.publicUrl ||
      output?.asset?.imageUrl ||
      output?.asset?.publicUrl ||
      output?.raw?.imageUrl ||
      "";

    if (currentImage) return;

    const list = Array.isArray(projectImages) ? projectImages : [];

    // BUILDSETU_EXACT_SOURCE_OF_TRUTH_GALLERY_PRIORITY_V1
    const latestExactFloorPlan = list.find((item: any) => {
      const text = JSON.stringify(item || {}).toLowerCase();
      return (
        text.includes("exact_floor_plan_agent_v1") ||
        text.includes("exact-floor-plan-agent") ||
        text.includes("exact-floor-plan-source-of-truth") ||
        text.includes("source_of_truth")
      );
    });

    const latestFloorPlan =
      latestExactFloorPlan ||
      list.find((item: any) => {
        const text = JSON.stringify(item || {}).toLowerCase();
        return (
          text.includes("floor-plan-ai") ||
          text.includes("floor_plan_2d") ||
          text.includes("exact-floor-plan")
        );
      });

    if (!latestFloorPlan) return;

    const imageUrl =
      latestFloorPlan.imageUrl ||
      latestFloorPlan.publicUrl ||
      latestFloorPlan.url ||
      latestFloorPlan.assetUrl ||
      latestFloorPlan.thumbnailUrl ||
      "";

    if (!imageUrl) return;

    setOutput(withValidPreviewImages({
      title: latestFloorPlan.title || latestFloorPlan.viewLabel || "Floor Plan Output",
      summary: "Latest generated floor plan.",
      imageUrl,
      publicUrl: latestFloorPlan.publicUrl || imageUrl,
      asset: latestFloorPlan,
      generationMode: latestFloorPlan.generationMode || "exact_floor_plan_v1",
      source: "latest_gallery_asset_preview",
      sections: [
        latestFloorPlan.projectTitle ? `Project: ${latestFloorPlan.projectTitle}` : "",
        latestFloorPlan.toolName ? `Tool: ${latestFloorPlan.toolName}` : "Tool: Floor Plan AI",
        latestFloorPlan.generationMode ? `Mode: ${latestFloorPlan.generationMode}` : "",
      ].filter(Boolean),
    }));
  }, [projectImages, output, tool]);

  const [conceptStatus, setConceptStatus] = useState<any>(null);
  const [busy, setBusy] = useState<"chat" | "execute" | "">("");
  const [selectedImageModel, setSelectedImageModel] = useState<BuildSetuImageModelId>("flux_1_dev");
  const [imageModelMenuOpen, setImageModelMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(BUILDSETU_IMAGE_MODEL_STORAGE_KEY);
    if (saved) setSelectedImageModel(normalizeBuildSetuImageModel(saved === "seedream_4" ? "seedream_4_0" : saved));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(BUILDSETU_IMAGE_MODEL_STORAGE_KEY, selectedImageModel);
  }, [selectedImageModel]);

  const selectedImageModelOption =
    BUILDSETU_IMAGE_MODEL_OPTIONS.find((item) => item.id === selectedImageModel) ||
    BUILDSETU_IMAGE_MODEL_OPTIONS[0];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanBuildSetuCurrentModelSelectorText = () => {
      const blockedWords = new Set(["Run", "Send"]);

      const cleanTextNodes = (root: Element | null) => {
        if (!root) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodesToClean: Text[] = [];

        let node = walker.nextNode();
        while (node) {
          const text = (node.textContent || "").trim();
          if (blockedWords.has(text)) nodesToClean.push(node as Text);
          node = walker.nextNode();
        }

        nodesToClean.forEach((node) => {
          node.textContent = "";
        });
      };

      document
        .querySelectorAll(
          ".bsu-model-select-final, .bsu-model-select-trigger-final, .bsu-model-select-menu-final"
        )
        .forEach((root) => cleanTextNodes(root));
    };

    cleanBuildSetuCurrentModelSelectorText();

    const timers = [
      window.setTimeout(cleanBuildSetuCurrentModelSelectorText, 25),
      window.setTimeout(cleanBuildSetuCurrentModelSelectorText, 100),
      window.setTimeout(cleanBuildSetuCurrentModelSelectorText, 300),
    ];

    const observer = new MutationObserver(cleanBuildSetuCurrentModelSelectorText);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [imageModelMenuOpen, selectedImageModel]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cleanBuildSetuModelUiText = () => {
      const blockedWords = new Set(["Run", "Send"]);

      const cleanTextNodes = (root: Element | null) => {
        if (!root) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodesToClean: Text[] = [];

        let node = walker.nextNode();
        while (node) {
          const text = (node.textContent || "").trim();
          if (blockedWords.has(text)) nodesToClean.push(node as Text);
          node = walker.nextNode();
        }

        nodesToClean.forEach((node) => {
          node.textContent = "";
        });
      };

      document
        .querySelectorAll(".bsu-image-model-pill-final, .bsu-image-model-menu-final")
        .forEach((root) => cleanTextNodes(root));

      document.querySelectorAll(".bsu-image-model-layer-final").forEach((layer) => {
        let sibling = layer.nextElementSibling;
        let hops = 0;

        while (sibling && hops < 8) {
          const text = (sibling.textContent || "").trim();

          if (blockedWords.has(text)) {
            const element = sibling as HTMLElement;
            element.style.display = "none";
            element.setAttribute("aria-hidden", "true");
          }

          sibling = sibling.nextElementSibling;
          hops += 1;
        }
      });
    };

    cleanBuildSetuModelUiText();

    const timers = [
      window.setTimeout(cleanBuildSetuModelUiText, 25),
      window.setTimeout(cleanBuildSetuModelUiText, 100),
      window.setTimeout(cleanBuildSetuModelUiText, 300),
    ];

    const observer = new MutationObserver(cleanBuildSetuModelUiText);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [selectedImageModel]);
  const [activeStep, setActiveStep] = useState(0);
  const [memoryFound, setMemoryFound] = useState(false);

  const chatRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!projectId || typeof window === "undefined") return;

    window.localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);

    const url = new URL(window.location.href);
    if (url.pathname.startsWith("/tools/") && !url.searchParams.get("projectId")) {
      url.searchParams.set("projectId", projectId);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [projectId]);

  useEffect(() => {
    if (requestedProjectId && requestedProjectId !== projectId) {
      setProjectId(requestedProjectId);
    }
  }, [requestedProjectId]);


  async function loadProjectImages() {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/project-gallery/list?projectId=${encodeURIComponent(projectId)}&limit=80&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      const rawImages = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.images)
          ? data.images
          : [];
      setProjectImages(
        rawImages
          .map((item: any) => normalizeProjectGalleryItem(item, projectId))
          .filter((item: any) => item.imageUrl)
      );
    } catch {
      setProjectImages([]);
    }
  }

  function introMessage(): ChatMessage {
    return {
      id: makeId(),
      role: "assistant",
      text: `${tool.name} ready hai. Main selected project ki saved chat/ideation se context lunga. Requirement likho, phir sirf missing details ke questions poochunga.`,
      time: nowTime(),
    };
  }

  useEffect(() => {
    loadProjectImages();
  }, [projectId]);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const res = await fetch(`/api/projects/list?t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.projects) ? data.projects : [];

        if (!ignore && list.length) {
          const normalized = list.map((project: any) => ({
            id: String(project.id),
            title: String(project.title || project.name || "Untitled Project"),
            type: String(project.type || project.projectType || "Project"),
          }));
          setProjects(normalized);

          const preferredProjectId =
            requestedProjectId ||
            (typeof window !== "undefined"
              ? cleanProjectId(window.localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) || "")
              : "") ||
            projectId;

          const matchedProject = normalized.find((item: ProjectItem) => item.id === preferredProjectId);
          setProjectId(matchedProject?.id || normalized[0].id);
        }
      } catch {}

      try {
        const res = await fetch(`/api/credits/balance?t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const value = data?.credits ?? data?.balance ?? data?.creditsLeft;
        if (!ignore && value !== undefined && value !== null) {
          setCredits(Number(value).toLocaleString("en-IN"));
        }
      } catch {}
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setOutput(null);
      setActiveStep(0);
      setMemoryFound(false);

      try {
        const url = `/api/tool-chat/history?projectId=${encodeURIComponent(projectId)}&toolSlug=${encodeURIComponent(tool.slug)}&mode=project&t=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const savedMessages = Array.isArray(data?.messages) ? data.messages : [];
        const savedOutputs = Array.isArray(data?.outputs) ? data.outputs : [];

        if (!ignore) {
          setMessages(savedMessages.length ? savedMessages : [introMessage()]);
          setOutput(savedOutputs.length ? sanitizeToolOutput(savedOutputs[savedOutputs.length - 1]) : null);
          setActiveStep(savedOutputs.length ? 3 : savedMessages.length > 1 ? 1 : 0);
        }
      } catch {
        if (!ignore) setMessages([introMessage()]);
      }
    }

    if (projectId && tool.slug) loadHistory();

    return () => {
      ignore = true;
    };
  }, [projectId, tool.slug]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, output, busy]);

  function handleAttachFile(file: File | null) {
    if (!file) return;

    const fileNote = `[Attached file: ${file.name}]`;
    setInput((old) => (old ? `${old}\n${fileNote}` : fileNote));
  }

  function addQuickPrompt(text: string) {
    setInput((old) => (old ? `${old}\n${text}` : text));
  }


  function getToolImagePromptItems(data: any) {
    const outputPrompts = Array.isArray(data?.output?.prompts) ? data.output.prompts : [];

    const promptItems = outputPrompts
      .map((item: any, index: number) => ({
        label: String(item?.label || `View ${index + 1}`),
        prompt: String(item?.prompt || "").trim(),
      }))
      .filter((item: any) => item.prompt);

    if (tool.kind === "image" && promptItems.length) {
      return promptItems.slice(0, 4);
    }

    const singlePrompt = String(data?.imagePrompt || "").trim();

    return singlePrompt
      ? [
          {
            label: tool.name,
            prompt: singlePrompt,
          },
        ]
      : [];
  }

  async function generateToolImageSet(data: any) {
    const promptItems = getToolImagePromptItems(data);
    const generatedImages: Array<{
      label: string;
      imageUrl: string;
      publicUrl?: string;
      prompt: string;
      generationMode?: string;
      referenceImageUrl?: string;
    }> = [];
    const failedItems: string[] = [];

    console.log("[BuildSetu MultiView] promptItems", promptItems.map((item: any) => item.label));

    if (!promptItems.length) {
      return {
        promptItems,
        generatedImages,
        failedItems: ["No valid image prompts found."],
        firstImageUrl: "",
        anchorImageUrl: "",
      };
    }

    let masterImageUrl = "";
    let masterPublicUrl = "";
    let masterLabel = "";

    for (const [index, item] of promptItems.entries()) {
      const useMasterReference = index > 0 && Boolean(masterImageUrl);

      try {
        const imgRes = await fetch("/api/ai/buildsetu-image-router", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              projectId,
              projectTitle: selectedProject.title || projectId,
              toolSlug: tool.slug,
              toolName: tool.name,
            imageModel: selectedImageModel,
            selectedImageModel,
              imageMode:
                tool.slug === "floor-plan-ai" || tool.slug === "sketch-to-plan"
                  ? "premium_furnished_floor_plan_2d"
                  : undefined,
              assetType:
                tool.slug === "floor-plan-ai" || tool.slug === "sketch-to-plan"
                  ? "floor_plan_2d"
                  : undefined,
              renderType:
                tool.slug === "floor-plan-ai" || tool.slug === "sketch-to-plan"
                  ? "Premium Furnished 2D Floor Plan"
                  : `${tool.name} - ${item.label}`,
              roomType: item.label,
              prompt: buildPremiumFloorPlanPromptForImageModel(
                enforceStrict2DFloorPlanPrompt(String(item.prompt || ""), tool.slug, tool.name),
                tool,
                selectedProject.title || projectId
              ),
              viewLabel: item.label,
              referenceImageUrl: useMasterReference ? masterImageUrl : "",
              referenceImageLabel: useMasterReference ? masterLabel : "",
              masterDesignMode: useMasterReference ? "locked_master_view" : "",
              masterDesignReferenceUrl: useMasterReference ? masterImageUrl : "",
              masterDesignViewLabel: useMasterReference ? item.label : "",
            }),
        });

        const imgData = await imgRes.json().catch(() => ({}));
        const imageUrl = imgData?.imageUrl || imgData?.url || imgData?.path || "";
        const publicUrl = imgData?.publicUrl || "";
        const generationMode = imgData?.generationMode || "";

        console.log("[BuildSetu MultiView] generated", item.label, {
          ok: imgRes.ok,
          status: imgRes.status,
          imageUrl,
          generationMode,
          useMasterReference,
          referenceImageUrl: useMasterReference ? masterImageUrl : "",
          error: imgData?.error || "",
        });

        if (!imgRes.ok || !imageUrl) {
          failedItems.push(`${item.label}: ${imgData?.error || `HTTP ${imgRes.status}`}`);
          continue;
        }

        if (index === 0) {
          masterImageUrl = imageUrl;
          masterPublicUrl = publicUrl || imageUrl;
          masterLabel = item.label || "Master Front View";
        }

        generatedImages.push({
          label: item.label,
          imageUrl,
          publicUrl,
          prompt: item.prompt,
          generationMode: generationMode || (useMasterReference ? "reference_edit" : "text_generation"),
          referenceImageUrl: useMasterReference ? masterImageUrl : "",
        });
      } catch (error) {
        failedItems.push(`${item.label}: image API failed`);
      }
    }

    console.log("[BuildSetu MultiView] result", {
      total: promptItems.length,
      generated: generatedImages.length,
      failed: failedItems,
      masterImageUrl,
    });

    return {
      promptItems,
      generatedImages,
      failedItems,
      firstImageUrl: generatedImages[0]?.imageUrl || "",
      anchorImageUrl: masterImageUrl,
    };
  }

  function buildImageSetOutput(data: any, imageSet: any) {
    const baseOutput = data?.output || {};
    const total = imageSet.promptItems.length;
    const done = imageSet.generatedImages.length;
    const isMultiView = total > 1;

    return {
      ...baseOutput,
      title: baseOutput.title || tool.outputLabel,
      summary: done
        ? isMultiView
          ? `${done}/${total} same-design views generated successfully.`
          : "Image preview generated successfully."
        : imageSet.failedItems.join(" | ") || "Image API ne image URL return nahi kiya.",
      imageUrl: imageSet.firstImageUrl,
      images: imageSet.generatedImages,
      sections: [
        ...(Array.isArray(baseOutput.sections) ? baseOutput.sections : []),
        isMultiView
          ? `Generated ${done}/${total} full-size views using one master facade design and separate camera-specific generation prompts.`
          : "Generated single image preview.",
        ...(imageSet.failedItems.length ? [`Failed views: ${imageSet.failedItems.join(" | ")}`] : []),
      ].slice(0, 10),
    };
  }



  const visibleProjectImages = Array.isArray(projectImages)
    ? projectImages.filter((img: any) => img?.generationMode !== "same_house_multiview_board")
    : [];


  function isExteriorConceptTool() {
    const text = `${tool.slug || ""} ${tool.name || ""}`.toLowerCase();
    return text.includes("exterior") || text.includes("elevation");
  }

  async function runExteriorConceptChat(userText: string, nextMessages: ChatMessage[], mode: "chat" | "execute") {
    const res = await fetch("/api/exterior/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageModel: selectedImageModel,
        buildsetuImageModel: selectedImageModel,
        selectedImageModel,
        projectId,
        projectTitle: selectedProject.title,
        message: userText,
        mode,
        currentOutput: output,
        messages: nextMessages,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `Exterior chat failed HTTP ${res.status}`);
    }

    const assistantMessage: ChatMessage = {
      id: makeId(),
      role: "assistant",
      text: String(data?.chatText || data?.message || "Exterior output ready."),
      time: nowTime(),
    };

    setMessages([...nextMessages, assistantMessage]);

    if (data?.output) {
      setOutput(normalizeBuildSetuImageOutput(data.output, data, tool));
      setActiveStep(3);
    } else {
      setActiveStep(2);
    }

    setMemoryFound(Boolean(data?.hasActiveConcept || data?.concept));
    await loadProjectImages();
    await loadProjectConceptStatus();

    return data;
  }


  async function loadProjectConceptStatus() {
    if (!isExteriorConceptTool()) {
      setConceptStatus(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/project-concepts/active?projectId=${encodeURIComponent(projectId)}&toolSlug=${encodeURIComponent(tool.slug)}`
      );
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        setConceptStatus(data);
      } else {
        setConceptStatus({ ok: false, hasActiveConcept: false, concept: null, outputs: [] });
      }
    } catch {
      setConceptStatus({ ok: false, hasActiveConcept: false, concept: null, outputs: [] });
    }
  }

  useEffect(() => {
    if (!isExteriorConceptTool()) return;
    loadProjectConceptStatus();
  }, [projectId, tool.slug]);

  function renderConceptStatusPanel() {
    if (!isExteriorConceptTool()) return null;

    const concept = conceptStatus?.concept || null;
    const outputs = Array.isArray(conceptStatus?.outputs) ? conceptStatus.outputs : [];
    const status = concept?.status || "NOT_GENERATED";
    const isLocked = status === "LOCKED";

    const statusLabel = concept
      ? isLocked
        ? "Locked"
        : status === "DRAFT"
          ? "Draft"
          : status
      : "Not Generated";

    const statusClass = isLocked
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : concept
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

    return (
      <div className="mb-3 rounded-[22px] border border-[#eadfff] bg-[#fbf8ff] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8a76a6]">
              Project Concept Status
            </p>
            <h3 className="mt-1 truncate text-sm font-black tracking-[-0.04em] text-[#12072f]">
              {concept?.title || "No active exterior master"}
            </h3>
          </div>

          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#eadfff] bg-white px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9a86b5]">Outputs</p>
            <p className="mt-1 text-sm font-black text-[#12072f]">{outputs.length}</p>
          </div>

          <div className="rounded-2xl border border-[#eadfff] bg-white px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#9a86b5]">Mode</p>
            <p className="mt-1 truncate text-sm font-black text-[#12072f]">
              {concept ? "Project-wise" : "Waiting"}
            </p>
          </div>
        </div>

        <p className="mt-2 text-[11px] font-semibold leading-5 text-[#67567f]">
          {concept
            ? "Future outputs isi selected project ke locked concept/spec ke under save honge."
            : "Pehle Master Exterior Concept generate karke lock karo."}
        </p>
      </div>
    );
  }

  async function sendChat() {
    // BUILDSETU_SENDCHAT_DELEGATE_EXECUTE_V1
    // For generator tools, Enter/send must execute/generate instead of chat-only flow.
    const chatOnlyTool = ["architect-chat"].includes(tool.slug);

    if (!chatOnlyTool) {
      await executeTool();
      return;
    }

    const value = input.trim();
    if (!value || busy) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      text: value,
      time: nowTime(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setBusy("chat");
    setActiveStep((old) => Math.max(old, 1));

    try {
      if (isExteriorConceptTool()) {
        await runExteriorConceptChat(value, nextMessages, "chat");
        return;
      }

      const res = await buildSetuUiFetchToolChatRun("/api/tool-chat/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          projectId,
          projectTitle: selectedProject.title,
          toolSlug: tool.slug,
          toolName: tool.name,
            imageModel: selectedImageModel,
            selectedImageModel,
          messages: nextMessages,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setMemoryFound(Boolean(data?.projectMemoryFound));

      const apiMessages = Array.isArray(data?.messages)
        ? data.messages
        : data?.message
          ? [...nextMessages, data.message]
          : nextMessages;

      setMessages(apiMessages);

      if (getToolImagePromptItems(data).length) {
        setBusy("execute");
        const imageSet = await generateToolImageSet(data);
        setOutput(buildImageSetOutput(data, imageSet));

        // BUILDSETU_DIRECT_OUTPUT_PREVIEW_FROM_IMAGESET_RESPONSE
        try {
          const generatedOutput = normalizeToolChatGeneratedOutput(data);
          if (generatedOutput?.imageUrl) {
            setOutput(withValidPreviewImages(normalizeBuildSetuImageOutput(sanitizeToolOutput(generatedOutput), data, tool)));
          }
        } catch {}
        setActiveStep(3);
        await loadProjectImages();
        await loadProjectConceptStatus();
      }
    } catch {
      setMessages([
        ...nextMessages,
        {
          id: makeId(),
          role: "assistant",
          text: "Server/API unavailable hai. Thodi der baad retry karo.",
          time: nowTime(),
        },
      ]);
    } finally {
      setBusy("");
    }
  }


  // BUILDSETU_TOOL_PAGE_DIRECT_FLOOR_OPENAI_V2
  async function runFloorPlanOpenAiFinalChainV2(userText: string) {
    const currentProjectId =
      projectId ||
      selectedProject?.id ||
      new URLSearchParams(window.location.search).get("projectId") ||
      "";

    const cleanText = String(userText || "").trim() || "ground floor ka plan do";

    if (!currentProjectId) {
      throw new Error("Project ID missing for Floor Plan AI.");
    }

    const exactRes = await fetch("/api/floor-plan/exact-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        imageModel: selectedImageModel,
        buildsetuImageModel: selectedImageModel,
        selectedImageModel,
        projectId: currentProjectId,
        projectTitle: selectedProject?.title || selectedProject?.name || "",
        message: cleanText,
        prompt: cleanText,
        internalOnly: true,
        // BUILDSETU_EXACT_SOURCE_OF_TRUTH_SAVE_ASSET_V1
        saveAsset: true,
      }),
    });

    const exactData = await exactRes.json().catch(() => null);

    if (!exactRes.ok || !exactData?.ok) {
      throw new Error(exactData?.error || "Exact planning agent failed.");
    }

    const renderRes = await fetch("/api/floor-plan/professional-openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        imageModel: selectedImageModel,
        buildsetuImageModel: selectedImageModel,
        selectedImageModel,
        projectId: currentProjectId,
        toolSlug: "floor-plan-ai",
        command: exactData.command || "ground_floor_plan",
        outputTitle: exactData.title || "Ground Floor Plan",
        title: exactData.title || "Ground Floor Plan",
        assetType: exactData.command || exactData.asset?.assetType || "ground_floor_plan",
        planningSource: "exact_floor_plan_agent_v1",
        planningStatus: exactData.planningStatus,
        lockedPlan: {
          ...(exactData.plan || {}),
          planningJson: exactData.planningJson || exactData.asset?.planningJson || null,
          validationReport: exactData.validationReport || exactData.asset?.validationReport || null,
          scoreReport: exactData.scoreReport || exactData.asset?.scoreReport || null,
        },
        exactAsset: exactData.asset || null,
        exactImageUrl: exactData.imageUrl || exactData.asset?.imageUrl || "",
        // BUILDSETU_OPENAI_FINAL_METADATA_PASSTHROUGH_V1
        planningJson: exactData.planningJson || exactData.asset?.planningJson || null,
        validationReport: exactData.validationReport || exactData.asset?.validationReport || null,
        scoreReport: exactData.scoreReport || exactData.asset?.scoreReport || null,
        projectTitle: selectedProject?.title || selectedProject?.name || "",
        userMessage: cleanText,
        renderMode: "openai_final_image_from_tool_page_v2",
      }),
    });

    const renderData = await renderRes.json().catch(() => null);

    if (!renderRes.ok || !renderData?.ok) {
      throw new Error(renderData?.error || "OpenAI final floor plan render failed.");
    }

    const finalImageUrl =
      renderData.imageUrl ||
      renderData.asset?.imageUrl ||
      renderData.url ||
      renderData.publicUrl ||
      "";

    const finalTitle = renderData.title || exactData.title || "Ground Floor Plan";

    // BUILDSETU_EXACT_SOURCE_OF_TRUTH_MAIN_OUTPUT_V1
    const exactTechnicalImageUrl =
      exactData.imageUrl ||
      exactData.asset?.imageUrl ||
      exactData.asset?.publicUrl ||
      "";

    const exactTechnicalAsset = exactData.asset
      ? {
          ...exactData.asset,
          role: "technical_source_of_truth",
          provider: "buildsetu-exact",
          generationMode: "exact-floor-plan-source-of-truth",
          sourceOfTruth: true,
          sourceOfTruthCandidate: true,
          previewRole: "main_technical_plan",
        }
      : null;

    const openAiPreviewAsset = renderData.asset
      ? {
          ...renderData.asset,
          role: "beautified_openai_preview",
          previewRole: "visual_preview_only",
          sourceOfTruth: false,
        }
      : null;

    const primaryImageUrl = exactTechnicalImageUrl || finalImageUrl;
    const primaryAsset = exactTechnicalAsset || openAiPreviewAsset || renderData.asset || null;
    const combinedAssets = [exactTechnicalAsset, openAiPreviewAsset].filter(Boolean);

    return {
      ok: true,
      success: true,
      source: "tool_page_exact_source_of_truth_plus_openai_preview_v1",
      provider: "buildsetu-exact",
      generationMode: "exact-floor-plan-source-of-truth",
      toolSlug: "floor-plan-ai",
      toolName: finalTitle,
      projectId: currentProjectId,
      title: finalTitle,
      outputTitle: finalTitle,
      assetType: renderData.assetType || exactData.command || "ground_floor_plan",
      assetId: renderData.assetId || renderData.asset?.id || null,
      imageUrl: primaryImageUrl,
      url: primaryImageUrl,
      publicUrl: primaryImageUrl,
      exactTechnicalImageUrl,
      openAiPreviewImageUrl: finalImageUrl,
      asset: primaryAsset,
      assets: combinedAssets.length ? combinedAssets : primaryAsset ? [primaryAsset] : [],
      outputs: combinedAssets.length ? combinedAssets : primaryAsset ? [primaryAsset] : [],
      openAiPreviewAsset,
      planningJson: renderData.planningJson || exactData.planningJson || exactData.asset?.planningJson || null,
      validationReport: renderData.validationReport || exactData.validationReport || exactData.asset?.validationReport || null,
      scoreReport: renderData.scoreReport || exactData.scoreReport || exactData.asset?.scoreReport || null,
      planning: exactData,
      render: renderData,
      reply: `${finalTitle} ready hai. Exact technical plan source-of-truth hai; OpenAI image beautified preview ke रूप me saved hai.`,
      message: `${finalTitle} ready hai. Exact technical plan source-of-truth hai; OpenAI image beautified preview ke रूप me saved hai.`,
    };
  }


  async function executeTool() {

    // BUILDSETU_TOOL_PAGE_DIRECT_FLOOR_OPENAI_V2
    // Floor Plan AI: planning agent first, final image OpenAI/ChatGPT render second.
    if (tool?.slug === "floor-plan-ai") {
      const typedFloorText = String(input || "").trim() || "ground floor ka plan do";

      const userMessage = {
        id: `${Date.now()}-floor-openai-v2-user`,
        role: "user",
        text: typedFloorText,
        content: typedFloorText,
        time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
      };

      setMessages((prev: any[]) => [...prev, userMessage]);
      setInput("");
      setBusy("execute");
      setActiveStep(2);

      try {
        const result = await runFloorPlanOpenAiFinalChainV2(typedFloorText);

        const assistantMessage = {
          id: `${Date.now()}-floor-openai-v2-assistant`,
          role: "assistant",
          text: result.reply || result.message || "Ground Floor Plan ready hai.",
          content: result.reply || result.message || "Ground Floor Plan ready hai.",
          time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        };

        setMessages((prev: any[]) => [...prev, assistantMessage]);

        const finalImageUrl = result.imageUrl || result.asset?.imageUrl || result.url || result.publicUrl || "";
        const finalTitle = result.title || result.outputTitle || result.asset?.title || "Ground Floor Plan";

        const finalOutput = withValidPreviewImages(normalizeBuildSetuImageOutput(sanitizeToolOutput({
          ...(result.asset || {}),
          ...result,
          title: finalTitle,
          label: finalTitle,
          imageUrl: finalImageUrl,
          url: finalImageUrl,
          publicUrl: finalImageUrl,
          source: result.source,
          provider: "openai",
          generationMode: "openai-final-floor-plan",
          planningJson: result.planningJson || result.asset?.planningJson || result.planning?.planningJson || null,
          validationReport: result.validationReport || result.asset?.validationReport || result.planning?.validationReport || null,
          scoreReport: result.scoreReport || result.asset?.scoreReport || result.planning?.scoreReport || null,
        }), result, tool));

        setOutput(finalOutput);
        setProjectImages((prev: any[]) => {
          const asset = result.asset || finalOutput;
          return [asset, ...(Array.isArray(prev) ? prev : [])];
        });

        setActiveStep(3);
        try { await loadProjectImages(); } catch {}
      } catch (error: any) {
        const msg = error?.message || "OpenAI final floor plan generate nahi ho paya.";
        setMessages((prev: any[]) => [
          ...prev,
          {
            id: `${Date.now()}-floor-openai-v2-error`,
            role: "assistant",
            text: msg,
            content: msg,
            time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
          },
        ]);
      } finally {
        setBusy("");
      }

      return;
    }



    // BUILDSETU_FORCE_AGENT_FIRST_EXECUTE_V2
    // BUILDSETU_FORCE_AGENT_BY_SLUG_V1
    // Hard route visual/generative tools through Core Construction Agent first.
    const buildSetuAgentFirstToolSlugs = new Set([
      "floor-plan-ai",
      "sketch-to-plan",
      "interior-render",
      "exterior-elevation",
      "site-photo-redesign",
      "render-enhancer",
      "photo-enhancer",
      "background-change",
      "remove-furniture",
      "mood-board",
      "false-ceiling-ai",
      "material-palette-ai",
    ]);

    // BUILDSETU_TOOL_CHAT_PIPELINE_BYPASS_V1
    // These tools have dedicated /api/tool-chat/run execution paths.
    // Do not stop them inside the generic image-agent-first branch.
    const currentToolSlugForPipeline = String(tool?.slug || "");
    const shouldUseToolChatRunPipeline = new Set(["floor-plan-ai", "magic-brief"]).has(currentToolSlugForPipeline);

    const shouldUseBuildSetuAgentFirst =
      !shouldUseToolChatRunPipeline &&
      (tool?.kind === "image" ||
        buildSetuAgentFirstToolSlugs.has(currentToolSlugForPipeline));

    if (shouldUseBuildSetuAgentFirst) {
  
    // BUILDSETU_INTERNAL_TOOL_UI_DIRECT_RUN_V1
    if (["project-db-search", "url-ingest", "web-search"].includes(tool.slug)) { // BUILDSETU_WEB_SEARCH_UI_SAVE_TO_KNOWLEDGE_V1
      if (busy) return;

      const typedRequirement = input.trim();
      const prompt = typedRequirement || buildLocalPrompt(tool, selectedProject.title, messages);

      const runUserMessage: ChatMessage | null = typedRequirement
        ? {
            id: makeId(),
            role: "user",
            text: typedRequirement,
            time: nowTime(),
          }
        : null;

      const nextMessages = runUserMessage ? [...messages, runUserMessage] : messages;

      if (runUserMessage) {
        setMessages(nextMessages);
        setInput("");
      }

      setBusy("execute");
      setActiveStep(2);

      try {
        const payload =
          tool.slug === "project-db-search"
            ? {
                projectId,
                slug: "project-db-search",
                toolSlug: "project-db-search",
                query: prompt,
                prompt,
                message: prompt,
              }
            : tool.slug === "web-search"
              ? {
                  projectId,
                  slug: "web-search",
                  toolSlug: "web-search",
                  query: prompt,
                  prompt,
                  message: prompt,
                  url: /^https?:\/\//i.test(prompt) ? prompt : "",
                  sourceUrl: /^https?:\/\//i.test(prompt) ? prompt : "",
                  limit: 5,
                }
              : {
                  projectId,
                  slug: "url-ingest",
                  toolSlug: "url-ingest",
                  url: prompt,
                  sourceUrl: prompt,
                  title: selectedProject.title ? `${selectedProject.title} reference` : "Public URL reference",
                  domain: "buildsetu",
                  prompt,
                  message: prompt,
                };

        const res = await fetch("/api/tools/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        const ok = Boolean(res.ok && data?.ok !== false);

        const statusText =
          data?.code === "LOGIN_REQUIRED"
            ? "Login required hai. Is tool ko project scoped saved data access chahiye."
            : data?.code === "CREDIT_CHECK_FAILED"
              ? "Login/credits required hai. Credits page se plan/credits check karo."
              : data?.code === "URL_NOT_ALLOWED"
                ? "Private/local URL allowed nahi hai. Public website URL paste karo."
                : data?.error || data?.message || data?.detail || (ok ? "Tool run completed." : "Tool run failed.");

        const assistantMessage: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: ok
            ? `${tool.name} completed. ${data?.count ? `${data.count} item(s) processed.` : ""}`
            : `${tool.name}: ${statusText}`,
          time: nowTime(),
        };

        setMessages([...nextMessages, assistantMessage]);

        const toolRows = Array.isArray(data?.items) ? data.items : []; // BUILDSETU_INTERNAL_TOOL_OUTPUT_POLISH_V1
        const rowPreviewSections = toolRows.slice(0, 6).map((item: any, index: number) => {
          const itemTitle =
            item?.title ||
            item?.name ||
            item?.sourceCitation ||
            item?.sourceUrl ||
            item?.url ||
            item?.id ||
            `Result ${index + 1}`;

          const itemText =
            item?.summary ||
            item?.snippet ||
            item?.text ||
            item?.content ||
            item?.description ||
            "";

          return itemText
            ? `${String(itemTitle).slice(0, 90)}: ${String(itemText).replace(/\\s+/g, " ").slice(0, 220)}`
            : String(itemTitle).slice(0, 260);
        });

        const previewSections = (() => {
          if (data?.code === "LOGIN_REQUIRED") {
            return [
              "Login required: is tool ko saved project data access ke liye active session chahiye.",
              "Next action: Login page se sign in karke same tool dobara run karo.",
              "Security: project database search unauthenticated users ke liye blocked hai.",
            ];
          }

          if (data?.code === "CREDIT_CHECK_FAILED") {
            return [
              "Login/credits required: public URL reference ingest ke liye account aur available credits chahiye.",
              "Next action: Credits page par plan/credit status check karo.",
              "Safety: ingest auth + usage gate ke baad hi public URL fetch karega.",
            ];
          }

          if (data?.code === "URL_NOT_ALLOWED") {
            return [
              "URL blocked: private, local, localhost, reserved ya internal network URLs allowed nahi hain.",
              "Next action: sirf public website URL paste karo, for example manufacturer/spec/reference page.",
              "Security: SSRF guard active hai.",
            ];
          }

          if (ok && tool.slug === "url-ingest") {
            return [
              "Public URL reference processed.",
              "Source metadata/citation Knowledge Inbox me review ke liye available hona chahiye.",
              "Open Knowledge Inbox: /workspace/knowledge-inbox",
            ];
          }

          if (ok && tool.slug === "web-search" && rowPreviewSections.length) {
            return [
              ...rowPreviewSections,
              "Save available: Save to Knowledge stores cited web-search references; Save as Source Candidate sends official/source URLs to the manual review queue before any trusted merge.",
              "Open Knowledge Inbox after save: /workspace/knowledge-inbox",
            ];
          }

          if (rowPreviewSections.length) return rowPreviewSections;

          return [
            statusText || (ok ? "Tool run completed." : "Tool run failed."),
            data?.code ? `Status code: ${data.code}` : ok ? "Status: OK" : "Status: Failed",
            tool.slug === "project-db-search"
              ? "Tip: broader terms try karo, jaise BOQ, BBS, render, project brief, memory."
              : "Tip: public URL paste karo aur ingest ke baad Knowledge Inbox check karo.",
          ].filter(Boolean);
        })();

        setOutput(
          sanitizeToolOutput({
            title: tool.name,
            summary: statusText,
            sections: previewSections,
            rows: toolRows,
            raw: data,
            sourceUrl: tool.slug === "url-ingest" || tool.slug === "web-search" ? prompt : "",
            statusCode: data?.code || "",
          })
        );

        setActiveStep(3);
        return;
      } catch (err) {
        setMessages([
          ...nextMessages,
          {
            id: makeId(),
            role: "assistant",
            text: err instanceof Error ? `Server/API issue: ${err.message}` : "Server/API unavailable hai. Thodi der baad retry karo.",
            time: nowTime(),
          },
        ]);
        return;
      } finally {
        setBusy("");
      }
    }

    if (busy) return;

      const typedRequirementNow = input.trim();
      const basePromptNow =
        typedRequirementNow ||
        buildLocalPrompt(tool, selectedProject.title, messages) ||
        `Generate ${tool.name} using current project brief.`;

      const userMsgNow: ChatMessage | null = typedRequirementNow
        ? {
            id: makeId(),
            role: "user",
            text: typedRequirementNow,
            time: nowTime(),
          }
        : null;

      const nextMessagesNow = userMsgNow ? [...messages, userMsgNow] : messages;

      if (userMsgNow) {
        setMessages(nextMessagesNow);
        setInput("");
      }

      setBusy("execute");
      setActiveStep(2);

      try {
        console.log("[BuildSetu Agent First] calling /api/agent/run", {
          projectId,
          toolSlug: tool.slug,
          toolName: tool.name,
            imageModel: selectedImageModel,
            selectedImageModel,
        });

        const agentRes = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            action: "generate",
            projectId,
            toolSlug: tool.slug,
            toolName: tool.name,
            imageModel: selectedImageModel,
            selectedImageModel,
            message: basePromptNow,
            prompt: basePromptNow,
          }),
        });

        const agentData = await agentRes.json().catch(() => ({}));

        console.log("[BuildSetu Agent First] agent response", {
          ok: agentData?.ok,
          readyToGenerate: agentData?.decision?.readyToGenerate,
          outputMode: agentData?.decision?.outputMode,
          imagePromptFound: Boolean(agentData?.imagePrompt),
        });

        if (!agentRes.ok || agentData?.ok === false) {
          throw new Error(agentData?.error || "BuildSetu Core Agent failed");
        }

        setMemoryFound(true);

        const assistantMessage: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text:
            agentData?.responseText ||
            `${tool.name} ready hai. Core Construction Agent current project brief ke basis par output generate kar raha hai.`,
          time: nowTime(),
          researchDraft: agentData?.researchDraft,
        };

        setMessages([...nextMessagesNow, assistantMessage]);

        const promptItems = getToolImagePromptItems(agentData);

        if (!promptItems.length) {
          throw new Error("Agent image prompt missing");
        }

        const imageSet = await generateToolImageSet(agentData);
        setOutput(buildImageSetOutput(agentData, imageSet));
        setActiveStep(3);
        await loadProjectImages();
        await loadProjectConceptStatus();
        return;
      } catch (err) {
        console.error("[BuildSetu Agent First] failed", err);

        setMessages([
          ...nextMessagesNow,
          {
            id: makeId(),
            role: "assistant",
            text:
              err instanceof Error
                ? `Server/API issue: ${err.message}`
                : "Server/API unavailable hai. Thodi der baad retry karo.",
            time: nowTime(),
          },
        ]);
        return;
      } finally {
        setBusy("");
      }
    }


    if (busy) return;

    // BUILDSETU_ENTER_EXECUTE_V4
    // Execute/generate must use the currently typed or pasted user requirement.
    const typedRequirement = input.trim();

    const runUserMessage: ChatMessage | null = typedRequirement
      ? {
          id: makeId(),
          role: "user",
          text: typedRequirement,
          time: nowTime(),
        }
      : null;

    const nextMessages = runUserMessage ? [...messages, runUserMessage] : messages;

    if (runUserMessage) {
      setMessages(nextMessages);
      setInput("");
    }

    const prompt = typedRequirement || buildLocalPrompt(tool, selectedProject.title, nextMessages);
    setBusy("execute");
    setActiveStep(2);

    try {
      if (isExteriorConceptTool()) {
        await runExteriorConceptChat(`Generate Master Exterior Concept.\n${prompt}`, nextMessages, "execute");
        setActiveStep(3);
        return;
      }

      // BUILDSETU_DIRECT_AGENT_IMAGE_EXECUTE_V1
      // Image tools should use the Core Construction Agent directly, then generate images from agent imagePrompt.
      if (tool.kind === "image" && !shouldUseToolChatRunPipeline) {
        const agentRes = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate",
            projectId,
            toolSlug: tool.slug,
            toolName: tool.name,
            imageModel: selectedImageModel,
            selectedImageModel,
            message: prompt,
            prompt,
          }),
        });

        const agentData = await agentRes.json().catch(() => ({}));

        if (!agentRes.ok || agentData?.ok === false) {
          throw new Error(agentData?.error || "BuildSetu Core Agent failed");
        }

        const assistantMessage: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text:
            agentData?.responseText ||
            `${tool.name} ready hai. Core Construction Agent current project brief ke basis par output generate kar raha hai.`,
          time: nowTime(),
          researchDraft: agentData?.researchDraft,
        };

        setMessages([...nextMessages, assistantMessage]);

        if (getToolImagePromptItems(agentData).length) {
          const imageSet = await generateToolImageSet(agentData);
          setOutput(buildImageSetOutput(agentData, imageSet));
          setActiveStep(3);
          await loadProjectImages();
          await loadProjectConceptStatus();
          return;
        }

        throw new Error("Agent image prompt missing");
      }

      const res = await buildSetuUiFetchToolChatRun("/api/tool-chat/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          projectId,
          projectTitle: selectedProject.title,
          toolSlug: tool.slug,
          toolName: tool.name,
            imageModel: selectedImageModel,
            selectedImageModel,
          messages: nextMessages,
          prompt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setMemoryFound(Boolean(data?.projectMemoryFound));

      if (Array.isArray(data?.messages)) setMessages(data.messages);
      if (data?.output) setOutput(normalizeBuildSetuImageOutput(sanitizeToolOutput(data.output), data, tool));

      // BUILDSETU_DIRECT_OUTPUT_PREVIEW_FROM_TOOL_CHAT
      try {
        const generatedOutput = normalizeToolChatGeneratedOutput(data);
        if (generatedOutput?.imageUrl) {
          setOutput(withValidPreviewImages(normalizeBuildSetuImageOutput(sanitizeToolOutput(generatedOutput), data, tool)));
        }
      } catch {}

      // BUILDSETU_PRESENTATION_JOB_POLLING
      try {
        const jobId =
          data?.presentationJob?.id ||
          data?.presentation?.jobId ||
          data?.output?.presentationJob?.id ||
          data?.output?.presentation?.jobId ||
          "";

        if (jobId) {
          void (async () => {
            for (let i = 0; i < 36; i++) {
              await new Promise((resolve) => setTimeout(resolve, 5000));

              const statusRes = await fetch(`/api/floor-plan/presentation/status?jobId=${encodeURIComponent(jobId)}`, {
                cache: "no-store",
              });

              const statusData = await statusRes.json().catch(() => null);
              const result = statusData?.result;

              if (statusData?.status === "completed" && result?.imageUrl) {
                const presentationOutput = {
                  title: "Professional Floor Plan Ready",
                  summary: "OpenAI presentation image generated from exact floor plan.",
                  imageUrl: result.imageUrl,
                  publicUrl: result.publicUrl || result.imageUrl,
                  asset: result.asset,
                  generationMode: result.generationMode || "openai_floor_plan_presentation_from_exact_plan",
                  source: result.source || "openai_image_edit_from_exact_plan",
                  raw: statusData,
                };

                setOutput(withValidPreviewImages(normalizeBuildSetuImageOutput(sanitizeToolOutput(presentationOutput), data, tool)));

                if (result.asset) {
                  setProjectImages((prev: any[]) => [result.asset, ...(Array.isArray(prev) ? prev : [])]);
                }

                break;
              }

              if (statusData?.status === "failed") break;
            }
          })();
        }
      } catch {}

      if (getToolImagePromptItems(data).length) {
        setBusy("execute");
        const imageSet = await generateToolImageSet(data);
        setOutput(buildImageSetOutput(data, imageSet));
        setActiveStep(3);
        await loadProjectImages();
        await loadProjectConceptStatus();
      }

      setActiveStep(3);
    } catch {
      setOutput({
        title: tool.outputLabel,
        summary: "Execution API unavailable hai. Local prompt ready hai.",
        sections: ["Project-wise input collected.", "Prompt ready.", "Server/API check required."],
        prompt,
      });
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="buildsetu-tool-workspace h-screen overflow-hidden bg-[#fbfaff] text-[#12072f]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-160px] top-[-160px] h-[360px] w-[360px] rounded-full bg-[#8b5cf6]/20 blur-[90px]" />
        <div className="absolute right-[-120px] top-[90px] h-[320px] w-[320px] rounded-full bg-[#2563eb]/12 blur-[90px]" />
        <div className="absolute bottom-[-160px] left-[35%] h-[340px] w-[340px] rounded-full bg-[#a855f7]/12 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto grid h-full max-w-[1760px] grid-rows-[88px_minmax(0,1fr)] gap-4 px-4 py-3">
        <header className="relative overflow-hidden rounded-[24px] border border-[#d9c7ff] bg-white shadow-[0_14px_36px_rgba(72,30,130,0.12)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,#6d28d9_0%,#3b0764_50%,#111827_100%)]" />
          <div className="pointer-events-none absolute -left-12 -top-14 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute right-[18%] top-[-60px] h-32 w-48 rounded-full bg-[#60a5fa]/25 blur-2xl" />

          <div className="relative flex h-full items-center justify-between gap-3 px-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/12 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/18"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </button>

              <div className="hidden h-9 w-px bg-white/15 md:block" />

              <a
                href="/"
                className="buildsetu-tool-header-brand hidden h-12 shrink-0 items-center rounded-2xl border border-white/16 bg-white px-3 shadow-sm md:flex"
                aria-label="BuildSetu AI Dashboard"
              >
                <img
                  src="/brand/buildsetu-login-clean-logo.png"
                  alt="BuildSetu AI"
                  className="h-8 w-auto max-w-[178px] object-contain"
                />
              </a>

              <div className="hidden h-9 w-px bg-white/15 md:block" />

              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/14 text-white shadow-[0_0_24px_rgba(255,255,255,0.16)]">
                  <ToolIcon className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border border-white/70 bg-[#a78bfa]" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[23px] font-black leading-none tracking-[-0.055em] text-white">
                      {tool.name}
                    </h1>
                    <span className="rounded-full border border-white/15 bg-white/14 px-2.5 py-1 text-[11px] font-black text-white">
                      {tool.badge}
                    </span>
                    <span className="rounded-full border border-amber-300/40 bg-amber-300/18 px-2.5 py-1 text-[11px] font-black text-amber-100">
                      Review Required
                    </span>
                  </div>

                  <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-semibold text-white/72">
                    <span className="truncate">{tool.description}</span>
                    <span className="hidden text-white/30 lg:block">•</span>
                    <span className="hidden max-w-[360px] truncate lg:block">Project: {selectedProject.title}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/15 bg-white/12 px-3 py-1.5 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">Credits</p>
                <p className="mt-0.5 text-sm font-black text-white">{credits}</p>
              </div>
            </div>
          </div>
        </header>

        


        <section className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_340px] xl:grid-cols-[250px_minmax(0,1fr)_360px]">
          <aside className="hidden min-h-0 overflow-hidden rounded-[22px] border border-[#e6dcf7] bg-white shadow-[0_12px_30px_rgba(72,30,130,0.07)] lg:flex lg:flex-col">
            <div className="border-b border-[#efe7fb] bg-[linear-gradient(180deg,#ffffff,#fbf8ff)] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a76a6]">Project</p>
              <div className="relative mt-1.5">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full appearance-none truncate rounded-xl border border-[#ded1f4] bg-[#fbf8ff] px-3 py-2.5 pr-9 text-sm font-bold text-[#12072f] outline-none focus:border-[#7c3aed]"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c3aed]" />
              </div>

              <button
                onClick={() => setInput(`Selected project "${selectedProject.title}" ki saved chat/ideation use karke ${tool.name} ke liye missing questions poochho.`)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#ded1f4] bg-white px-3 py-2 text-sm font-bold text-[#6f1cc4] hover:bg-[#fbf8ff]"
              >
                <RefreshCw className="h-4 w-4" />
                Use Project Data
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#6d28d9]">PROJECT FLOW</p>
              <div className="bsu-flow-clean mt-3">
                <div className={cn("bsu-flow-clean-row", activeStep >= 0 && "active")}>
                  <div className="bsu-flow-clean-dot"><FolderKanban className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="bsu-flow-clean-title">Project</div>
                    <div className="bsu-flow-clean-desc">Project selection</div>
                  </div>
                </div>
                <div className={cn("bsu-flow-clean-row", activeStep >= 1 && "active")}>
                  <div className="bsu-flow-clean-dot"><PencilLine className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="bsu-flow-clean-title">Input</div>
                    <div className="bsu-flow-clean-desc">Provide requirements</div>
                  </div>
                </div>
                <div className={cn("bsu-flow-clean-row", activeStep >= 2 && "active")}>
                  <div className="bsu-flow-clean-dot"><FileSpreadsheet className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="bsu-flow-clean-title">Format</div>
                    <div className="bsu-flow-clean-desc">Select output format</div>
                  </div>
                </div>
                <div className={cn("bsu-flow-clean-row", activeStep >= 3 && "active")}>
                  <div className="bsu-flow-clean-dot"><SearchCheck className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="bsu-flow-clean-title">Review</div>
                    <div className="bsu-flow-clean-desc">AI review & validation</div>
                  </div>
                </div>
                <div className={cn("bsu-flow-clean-row", activeStep >= 4 && "active")}>
                  <div className="bsu-flow-clean-dot"><Download className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="bsu-flow-clean-title">Export</div>
                    <div className="bsu-flow-clean-desc">Export final output</div>
                  </div>
                </div>
              </div>

<p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a76a6]">Quick Start</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tool.quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => addQuickPrompt(prompt)}
                    className="rounded-full border border-[#ded1f4] bg-white px-3 py-1.5 text-xs font-bold text-[#6f1cc4] hover:bg-[#fbf8ff]"
                  >
                    + {prompt}
                  </button>
                ))}
              </div>
            </div>

            

          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#e6dcf7] bg-white shadow-[0_12px_30px_rgba(72,30,130,0.07)]">
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#efe7fb] bg-[linear-gradient(180deg,#ffffff,#fbf8ff)] px-4">
              <div className="min-w-0">
                <p className="text-[16px] font-black tracking-[-0.03em] text-[#21133f]">AI Guided Chat</p>
                <h2 className="mt-0.5 truncate text-sm font-semibold tracking-[-0.01em] text-[#817397]">{tool.outputLabel}</h2>
              </div>

              <div className="hidden items-center gap-1.5 md:flex">
                {["Context", "Prompt", "Run", "Review"].map((step, index) => (
                  <span
                    key={step}
                    className={cn(
                      "rounded-xl px-3 py-2 text-[11px] font-black",
                      index <= activeStep ? "bg-[#7c3aed] text-white shadow-[0_8px_18px_rgba(124,58,237,0.28)]" : "bg-[#f1eafd] text-[#8a76a6]"
                    )}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div ref={chatRef} className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4">
              <div className="mx-auto flex w-full max-w-[900px] flex-col gap-3">
                {messages.filter((message) => !isBuildSetuInternalToolMessage(message)).length === 0 ? (
                  <div className="mx-auto mt-8 max-w-[560px] rounded-[20px] border border-[#eadfff] bg-[#fbf8ff] px-4 py-3 text-center">
                    <p className="text-[13px] font-semibold leading-5 text-[#4b3a62]">
                      Aaj kya design karna hai? Requirement likho, main project memory use karke missing details poochunga aur phir output generate karunga.
                    </p>
                  </div>
                ) : null}

                {messages.filter((message) => !isBuildSetuInternalToolMessage(message)).map((message) => {
                  const isUserMessage = message.role === "user";
                  const isSystemMessage = message.role === "system";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        isUserMessage ? "justify-end" : "justify-start",
                        isSystemMessage && "justify-center"
                      )}
                    >
                      <ToolChatMessageIcon role={message.role} />
                      <div className={cn("min-w-0 max-w-[82%]", isSystemMessage && "max-w-[92%]")}>
                        <div
                          className={cn(
                            "whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[14px] leading-6 shadow-sm",
                            isUserMessage && "bg-[#7c3aed] text-white",
                            message.role === "assistant" && "border border-[#eadfff] bg-white text-[#2f2940]",
                            isSystemMessage && "rounded-full bg-[#f1eafd] px-3 py-1.5 text-center text-[12px] font-semibold text-[#7c3aed]"
                          )}
                        >
                          <ToolMessageContent text={message.text} isUserMessage={isUserMessage} />
                        </div>
                    {!isUserMessage && message.researchDraft?.created ? (
                      <ToolResearchDraftCard researchDraft={message.researchDraft} />
                    ) : null}

                        {!isSystemMessage ? (
                          <p
                            className={cn(
                              "mt-1 px-1 text-[10px] font-semibold leading-4",
                              isUserMessage ? "text-right text-[#8a76a6]" : "text-left text-[#9a86b5]"
                            )}
                          >
                            {message.time}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {busy === "execute" ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-[22px] border border-[#eadfff] bg-white px-4 py-3 text-[13px] font-semibold leading-5 text-[#7c3aed] shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executing {tool.name}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-[#efe7fb] bg-white px-3 py-2">
              <div className="bsu-tool-composer mx-auto flex min-h-[52px] max-w-[900px] items-end gap-2 rounded-[24px] border border-[#ded1f4] bg-white px-3 py-2 shadow-[0_8px_22px_rgba(72,30,130,0.07)]">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    handleAttachFile(e.target.files?.[0] || null);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ded1f4] bg-white text-[#7c3aed] transition hover:bg-[#f6efff] active:scale-95"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

                <div className="bsu-model-select-final relative z-[9999] shrink-0">
                  <div
                    role="button"
                    tabIndex={0}
                    data-label={selectedImageModelOption.label}
                    onClick={() => setImageModelMenuOpen((value) => !value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setImageModelMenuOpen((value) => !value);
                      }
                    }}
                    className="bsu-model-select-trigger-final flex h-11 w-[178px] items-center justify-between gap-3 rounded-[18px] border border-[#ded1f4] bg-[linear-gradient(180deg,#ffffff,#f8f3ff)] px-5 font-black shadow-[0_8px_24px_rgba(124,58,237,0.10)] transition hover:border-[#b994ff] hover:bg-[linear-gradient(180deg,#ffffff,#f1e8ff)] active:scale-[0.99]"
                  >
                    <ChevronDown className={cn("bsu-model-select-chevron-final h-4 w-4 shrink-0 transition", imageModelMenuOpen ? "rotate-180" : "")} />
                  </div>

                  {imageModelMenuOpen ? (
                    <div className="bsu-model-select-menu-final absolute bottom-[54px] left-0 z-[99999] w-[240px] overflow-hidden rounded-[20px] border border-[#ded1f4] bg-white p-2 shadow-[0_24px_70px_rgba(38,15,84,0.24)]">
                      {BUILDSETU_IMAGE_MODEL_OPTIONS.map((item) => {
                        const active = item.id === selectedImageModel;

                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            data-label={item.label}
                            data-active={active ? "true" : "false"}
                            onClick={() => {
                              setSelectedImageModel(item.id);
                              setImageModelMenuOpen(false);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedImageModel(item.id);
                                setImageModelMenuOpen(false);
                              }
                            }}
                            className={cn(
                              "bsu-model-select-option-final relative flex h-11 w-full cursor-pointer items-center rounded-[15px] px-3.5 transition",
                              active
                                ? "bg-[#7c3aed] shadow-[0_10px_24px_rgba(124,58,237,0.24)]"
                                : "hover:bg-[#f6efff]"
                            )}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();

                      // BUILDSETU_ENTER_EXECUTE_V4
                      // Enter generates output for tools. Shift+Enter keeps multiline input.
                      const chatOnlyTool = ["architect-chat"].includes(tool.slug);

                      if (chatOnlyTool) {
                        void sendChat();
                      } else {
                        void executeTool();
                      }
                    }
                  }}
                  placeholder={tool.placeholder}
                  rows={1}
                  className="min-h-[40px] max-h-[110px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] font-medium leading-5 text-[#12072f] outline-none placeholder:text-[#9a86b5]"
                />

                <div className="bsu-composer-action-area-final flex shrink-0 items-center gap-2 transition">
                  <button
                    type="button"
                    onClick={() => void executeTool()}
                    className="bsu-composer-run-button-final inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-[#ded1f4] bg-white px-5 font-black text-[#7c3aed] shadow-sm transition hover:bg-[#f8f3ff] active:scale-95"
                  >
                    <svg
                      className="h-5 w-5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M7.5 5.75L18.25 12L7.5 18.25V5.75Z"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => void sendChat()}
                    className="bsu-composer-send-button-final inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-[#a978f2] px-6 font-black text-white shadow-sm transition hover:bg-[#8f5ee8] active:scale-95"
                  >
                    <svg
                      className="h-5 w-5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M21 3L10.9 13.1"
                        stroke="currentColor"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 3L14.6 21L10.9 13.1L3 9.4L21 3Z"
                        stroke="currentColor"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#e6dcf7] bg-white shadow-[0_12px_30px_rgba(72,30,130,0.07)]">
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#efe7fb] bg-[linear-gradient(180deg,#ffffff,#fbf8ff)] px-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a76a6]">Output Preview</p>
                <h2 className="truncate text-base font-black tracking-[-0.04em] text-[#12072f]">{output ? tool.outputLabel : "Waiting"}</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fbf8ff] text-[#7c3aed]">
                <Zap className="h-5 w-5" />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {renderConceptStatusPanel()}


              {/* BUILDSETU_EXACT_SVG_PREVIEW_PRIORITY_OUTPUT_V1 */}
              {tool?.slug === "floor-plan-ai" && output && getBuildSetuPrimaryExactFloorPlanAsset(projectImages, output) ? (() => {
                const exactPrimary = getBuildSetuPrimaryExactFloorPlanAsset(projectImages, output);
                const exactUrl = getDisplayImageUrl(getBuildSetuAssetImageUrlForGPlusOne(exactPrimary));

                if (!exactPrimary || !exactUrl) return null;

                const counts = exactPrimary?.planningJson?.roomCounts || {};
                const score = exactPrimary?.scoreReport || {};

                return (
                  <div className="mb-3 rounded-[22px] border border-emerald-200 bg-[linear-gradient(180deg,#ffffff,#ecfdf5)] p-3 shadow-[0_12px_28px_rgba(16,185,129,0.10)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                          Main Technical Output
                        </p>
                        <h3 className="mt-1 truncate text-[15px] font-black tracking-[-0.04em] text-[#10231b]">
                          {exactPrimary.title || "Exact Floor Plan SVG"}
                        </h3>
                        <p className="mt-1 text-[11px] font-semibold leading-4 text-[#48685b]">
                          This exact SVG is the source-of-truth drawing. OpenAI preview is not the technical drawing.
                        </p>
                        <p className="mt-2 inline-flex rounded-full border border-emerald-200 bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          BUILDSETU_EXACT_SVG_UI_POLISH_V1 · Use this for technical review
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">
                        Source of Truth
                      </span>
                    </div>

                    <a href={exactUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm">
                      <img
                        src={exactUrl}
                        alt={exactPrimary.title || "Exact source-of-truth floor plan"}
                        className="h-72 w-full object-contain bg-white p-3"
                      />
                    </a>

                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-2xl bg-white px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-[#6b8b7d]">Bed</p>
                        <p className="text-[13px] font-black text-[#10231b]">{String(counts.bedrooms ?? "-")}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-[#6b8b7d]">Bath</p>
                        <p className="text-[13px] font-black text-[#10231b]">{String(counts.bathrooms ?? "-")}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-[#6b8b7d]">Parking</p>
                        <p className="text-[13px] font-black text-[#10231b]">{String(counts.parking ?? "-")}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-[#6b8b7d]">Score</p>
                        <p className="text-[13px] font-black text-[#10231b]">{String(score.total ?? "-")}</p>
                      </div>
                    </div>
                  </div>
                );
              })() : null}


              {/* BUILDSETU_GPLUS1_EXACT_PACKAGE_CARD_V1 */}
              {tool?.slug === "floor-plan-ai" ? (() => {
                const gplusOnePackage = getBuildSetuGPlusOneExactPackage(projectImages, output);

                if (!gplusOnePackage.hasAny) return null;

                return (
                  <div className="mb-3 rounded-[22px] border border-[#bfa7ff] bg-[linear-gradient(180deg,#ffffff,#f7f1ff)] p-3 shadow-[0_12px_28px_rgba(72,30,130,0.09)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7c3aed]">
                          Exact Source-of-Truth
                        </p>
                        <h3 className="mt-1 text-[15px] font-black tracking-[-0.04em] text-[#12072f]">
                          G+1 Floor Plan Package
                        </h3>
                        <p className="mt-1 text-[11px] font-semibold leading-4 text-[#67567f]">
                          Exact SVG technical drawings are primary. OpenAI images are visual previews only.
                        </p>
                      </div>

                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${
                        gplusOnePackage.isComplete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}>
                        {gplusOnePackage.isComplete ? "Complete" : "Partial"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {gplusOnePackage.floors.map((floor: any) => {
                        const asset = floor.asset;
                        const imageUrl = getDisplayImageUrl(getBuildSetuAssetImageUrlForGPlusOne(asset));
                        const counts = asset?.planningJson?.roomCounts || {};
                        const score = asset?.scoreReport || {};
                        const title = asset?.title || floor.label;

                        return (
                          <a
                            key={asset?.id || floor.key}
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={title}
                            className="group overflow-hidden rounded-[18px] border border-[#ded1f4] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="h-40 overflow-hidden bg-white">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={title}
                                  className="h-full w-full object-contain bg-white p-2 transition group-hover:scale-[1.02]"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] font-black text-[#8a76a6]">
                                  SVG
                                </div>
                              )}
                            </div>

                            <div className="p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[11px] font-black text-[#12072f]">{title}</p>
                                <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-black uppercase text-emerald-700">
                                  SVG
                                </span>
                              </div>
                              <div className="mt-1 grid grid-cols-3 gap-1 text-center">
                                <div className="rounded-xl bg-[#fbf8ff] px-1 py-1">
                                  <p className="text-[8px] font-black uppercase text-[#8a76a6]">Bed</p>
                                  <p className="text-[11px] font-black text-[#12072f]">{String(counts.bedrooms ?? "-")}</p>
                                </div>
                                <div className="rounded-xl bg-[#fbf8ff] px-1 py-1">
                                  <p className="text-[8px] font-black uppercase text-[#8a76a6]">Bath</p>
                                  <p className="text-[11px] font-black text-[#12072f]">{String(counts.bathrooms ?? "-")}</p>
                                </div>
                                <div className="rounded-xl bg-[#fbf8ff] px-1 py-1">
                                  <p className="text-[8px] font-black uppercase text-[#8a76a6]">Score</p>
                                  <p className="text-[11px] font-black text-[#12072f]">{String(score.total ?? "-")}</p>
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#eadfff] bg-white p-2.5">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a76a6]">Package Rule</p>
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-[#67567f]">
                        Ground floor: 1 bedroom, 1 bathroom, parking. First floor: 3 bedrooms, 2 bathrooms, balcony/terrace. Both must remain exact-agent SVG source-of-truth.
                      </p>
                    </div>
                  </div>
                );
              })() : null}


              {/* BUILDSETU_OUTPUT_PLANNING_METADATA_CARD_V1 */}

              {output ? (() => {
                const planningMeta = getBuildSetuPlanningMetadata(output);
                if (!planningMeta.hasAny) return null;

                const score = planningMeta.scoreReport;
                const validations = planningMeta.validationReport.slice(0, 6);
                const convention = planningMeta.planningJson?.plot?.drawingConvention || null;
                const roomCounts = planningMeta.planningJson?.roomCounts || null;

                return (
                  <div className="mb-3 rounded-[20px] border border-[#d9c7ff] bg-[linear-gradient(180deg,#ffffff,#fbf8ff)] p-3 shadow-[0_10px_24px_rgba(72,30,130,0.07)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7c3aed]">
                          Planning Brain
                        </p>
                        <h3 className="mt-1 text-[15px] font-black tracking-[-0.04em] text-[#12072f]">
                          Validation Report
                        </h3>
                      </div>

                      {score ? (
                        <div className="shrink-0 rounded-2xl border border-[#ded1f4] bg-white px-3 py-2 text-right shadow-sm">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a76a6]">Score</p>
                          <p className="mt-0.5 text-lg font-black leading-none text-[#6d28d9]">
                            {score.total ?? "-"}<span className="text-[11px] text-[#8a76a6]">/{score.max ?? 100}</span>
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase text-emerald-700">
                            {score.status || "review"}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {convention ? (
                      <div className="mt-3 rounded-2xl border border-[#eadfff] bg-white p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a76a6]">Drawing Convention</p>
                        <div className="mt-2 grid gap-1.5 text-[11px] font-bold text-[#3b2d54]">
                          <div>North arrow: {convention.northArrow || "UP"}</div>
                          <div>Top: {convention.topEdge || "-"}</div>
                          <div>Right: {convention.rightEdge || "-"}</div>
                        </div>
                      </div>
                    ) : null}

                    {roomCounts ? (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          ["Bedrooms", roomCounts.bedrooms],
                          ["Bathrooms", roomCounts.bathrooms],
                          ["Parking", roomCounts.parking],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-2xl border border-[#eadfff] bg-white px-2 py-2 text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a76a6]">{label}</p>
                            <p className="mt-0.5 text-sm font-black text-[#12072f]">{String(value ?? "-")}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {validations.length ? (
                      <div className="mt-3 space-y-1.5">
                        {validations.map((item: any, index: number) => (
                          <div key={`${item.id || item.check || index}`} className="rounded-2xl border border-[#eadfff] bg-white p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 text-[12px] font-black leading-4 text-[#21133f]">
                                {item.check || item.id || `Check ${index + 1}`}
                              </p>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${getBuildSetuValidationBadgeClass(item.status)}`}>
                                {item.status || "review"}
                              </span>
                            </div>
                            {item.note ? (
                              <p className="mt-1 text-[11px] font-semibold leading-4 text-[#67567f]">{item.note}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(score?.blockers) && score.blockers.length ? (
                      <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-2.5">
                        <p className="text-[11px] font-black text-red-700">Revision Blockers</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] font-semibold leading-4 text-red-700">
                          {score.blockers.slice(0, 4).map((item: string, index: number) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })() : null}


              {!output ? (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-[#d9c7ff] bg-[#fbf8ff]">
                  <div className="px-5 text-center">
                    <Sparkles className="mx-auto h-9 w-9 text-[#7c3aed]" />
                    <h3 className="mt-4 text-lg font-black tracking-[-0.05em] text-[#12072f]">Output yahan aayega</h3>
                    <p className="mx-auto mt-2 max-w-[250px] text-sm leading-6 text-[#67567f]">
                      Project memory aur chat input se tool-specific result generate hoga.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(output.images) && output.images.length ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* BUILDSETU_OUTPUT_IMAGES_SAFE_RENDER */}
{output.images.map((image: any, index: number) => {
                          const previewImageUrl = normalizePreviewImageUrl(image);
                          if (!previewImageUrl) return null;

                          return (
                          <a
                            key={`${image.imageUrl || index}-${image.label || "view"}`}
                            href={previewImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={image.label || `View ${index + 1}`}
                            className="group overflow-hidden rounded-[18px] border border-[#eadfff] bg-[#fbf8ff]"
                          >
                            <img
                              src={previewImageUrl}
                              alt={image.label || `Generated view ${index + 1}`}
                              className="h-28 w-full object-cover transition group-hover:scale-105"
                            />
                            <p className="truncate px-2 py-1.5 text-[10px] font-black text-[#46325f]">
                              {image.label || `View ${index + 1}`}
                            </p>
                          </a>
                          );
                        })}
                      </div>
                      {output.imageUrl ? (
                        <a
                          href={normalizePreviewImageUrl(output.imageUrl)}
                          download={`${tool.slug || "buildsetu"}-${Date.now()}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]"
                        >
                          Download First Image
                        </a>
                      ) : null}
                    </div>
                  ) : output.imageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={getDisplayImageUrl(output.imageUrl)}
                        alt={tool.outputLabel}
                        className="h-[210px] w-full rounded-[22px] object-cover shadow-[0_18px_44px_rgba(72,30,130,0.18)]"
                      />
                      <a
                        href={getDisplayImageUrl(output.imageUrl)}
                        download={`${tool.slug || "buildsetu"}-${Date.now()}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)]"
                      >
                        Download Image
                      </a>
                    </div>
                  ) : null}

                  <div className="rounded-[22px] border border-[#eadfff] bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7c3aed]">Generated</p>
                    <h3 className="mt-1 text-lg font-black tracking-[-0.05em] text-[#12072f]">{output.title || tool.outputLabel}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#67567f]">{output.summary || "Output ready."}</p>
                  </div>

                  <div className="rounded-[22px] border border-[#eadfff] bg-[#fbf8ff] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7c3aed]">Key Points</p>
                    <div className="mt-2 space-y-1.5">
                      {(output.sections || ["Project-wise output ready.", "Review warning included.", "Save/export next."]).slice(0, 8).map((item: string, index: number) => (
                        <div key={index} className="flex gap-2 rounded-2xl bg-white px-3 py-2.5 text-xs leading-5 text-[#46325f]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7c3aed]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <BuildSetuWebSearchSaveToKnowledgeCard
                    output={output}
                    projectId={projectId}
                  /> {/* BUILDSETU_WEB_SEARCH_SAVE_CARD_RENDER_V1 */}

                </div>
              )}
            </div>

            

            {visibleProjectImages.length ? (
              <div className="shrink-0 border-t border-[#efe7fb] bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a76a6]">Project Images Gallery</p>
                  <span className="rounded-full bg-[#f1eafd] px-2 py-1 text-[10px] font-black text-[#7c3aed]">{visibleProjectImages.length}</span>
                </div>

                <div className="grid max-h-[190px] grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {visibleProjectImages.map((image) => (
                    <a
                      key={image.id || image.imageUrl}
                      href={getDisplayImageUrl(image.imageUrl || image.publicUrl || image.url || image.assetUrl || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={image.toolName || image.renderType || "Generated image"}
                      className="group overflow-hidden rounded-2xl border border-[#eadfff] bg-[#fbf8ff]"
                    >
                      <img
                        src={getDisplayImageUrl(image.imageUrl || image.publicUrl || image.url || image.assetUrl || '')}
                        alt={image.toolName || image.renderType || "Generated image"}
                        className="h-20 w-full object-cover transition group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

          </aside>
        </section>
      </div>
      <ToolUiStandardizer />
      <BuildSetuToolOutputReadyListener />
</main>
  );
}
