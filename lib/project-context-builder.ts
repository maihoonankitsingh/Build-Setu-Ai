import fs from "fs/promises";
import path from "path";
import {
  getProjectBrief,
  getProjectBriefCompleteness,
  getProjectStages,
  safeProjectId,
  type ProjectBrief,
} from "@/lib/project-brief-store";

const DATA_DIR = path.join(process.cwd(), "data", "generated");

type ToolRule = {
  toolSlug: string;
  label: string;
  requiredStages: string[];
  recommendedPreviousOutputs: string[];
  description: string;
};

export const TOOL_CONTEXT_RULES: ToolRule[] = [
  {
    toolSlug: "magic-brief",
    label: "Magic Brief",
    requiredStages: [],
    recommendedPreviousOutputs: [],
    description: "Client requirement se structured project brief generate/refine karta hai.",
  },
  {
    toolSlug: "planning",
    label: "Planning / Naksha",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: [],
    description: "Project brief se zoning, room placement aur concept naksha.",
  },
  {
    toolSlug: "architect-chat",
    label: "Architect Chat",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["planning_output"],
    description: "Project-wide architectural discussion and guided decisions.",
  },
  {
    toolSlug: "sketch-to-plan",
    label: "Sketch to Plan",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: [],
    description: "Sketch/reference se initial floor plan concept.",
  },
  {
    toolSlug: "floor-plan-ai",
    label: "Floor Plan AI",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["planning_output"],
    description: "Project brief se planning, zoning aur floor-wise dimension plan generate kare.",
  },
  {
    toolSlug: "floor-plan",
    label: "Floor-wise Plan",
    requiredStages: ["brief", "planning"],
    recommendedPreviousOutputs: ["planning_output"],
    description: "Ground floor, first floor, room sizes and dimensions.",
  },
  {
    toolSlug: "vastu-check",
    label: "Vastu Check",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["floor_plan"],
    description: "Room placement, entry, kitchen, mandir and bedroom vastu review.",
  },
  {
    toolSlug: "structure",
    label: "Structure",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["floor_plan"],
    description: "Floor plan se column, beam, slab and staircase draft.",
  },
  {
    toolSlug: "column-beam-plan",
    label: "Column Beam Plan",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["floor_plan"],
    description: "Column, beam, slab aur grid draft. Engineer review required.",
  },
  {
    toolSlug: "bbs",
    label: "BBS",
    requiredStages: ["brief", "structure"],
    recommendedPreviousOutputs: ["structure_output"],
    description: "Structure draft se bar bending schedule.",
  },
  {
    toolSlug: "bbs-generator",
    label: "BBS Generator",
    requiredStages: ["brief", "structure"],
    recommendedPreviousOutputs: ["structure_output"],
    description: "Engineer input ke basis par bar bending schedule draft.",
  },
  {
    toolSlug: "boq",
    label: "BOQ / Estimate",
    requiredStages: ["brief", "floor_plan", "structure"],
    recommendedPreviousOutputs: ["floor_plan", "structure_output"],
    description: "Brief + plan + structure se quantity/cost estimate.",
  },
  {
    toolSlug: "boq-generator",
    label: "BOQ Generator",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["floor_plan"],
    description: "Item-wise BOQ, material quantity and estimate draft.",
  },
  {
    toolSlug: "exterior-elevation",
    label: "Exterior Elevation",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["floor_plan", "exterior_reference"],
    description: "Brief + front dimension + references se exterior master and views.",
  },
  {
    toolSlug: "site-photo-redesign",
    label: "Site Photo Redesign",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["site_photo", "reference_image"],
    description: "Existing site/photo ko project brief ke according redesign karta hai.",
  },
  {
    toolSlug: "interior-render",
    label: "Interior Render",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["floor_plan", "room_details"],
    description: "Room dimensions + style reference se interior render concepts.",
  },
  {
    toolSlug: "interior",
    label: "Interior",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["floor_plan", "room_details"],
    description: "Room-wise interior concepts and working notes.",
  },
  {
    toolSlug: "mood-board",
    label: "Mood Board",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["client_preferences"],
    description: "Material, color, furniture and lighting palette.",
  },
  {
    toolSlug: "material-palette-ai",
    label: "Material Palette AI",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["client_preferences"],
    description: "Tiles, laminate, marble, wall color and hardware palette suggestions.",
  },
  {
    toolSlug: "false-ceiling-ai",
    label: "False Ceiling AI",
    requiredStages: ["brief", "floor_plan"],
    recommendedPreviousOutputs: ["room_details"],
    description: "False ceiling, cove light and profile light concepts.",
  },
  {
    toolSlug: "remove-furniture",
    label: "Remove Furniture",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["room_photo"],
    description: "Room image se furniture remove karke redesign base ready karta hai.",
  },
  {
    toolSlug: "render-enhancer",
    label: "Render Enhancer",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["generated_image"],
    description: "Existing render/image ko presentation quality enhance karta hai.",
  },
  {
    toolSlug: "photo-enhancer",
    label: "Photo Enhancer",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["generated_image"],
    description: "Image upscale, sharpen and quality enhancement.",
  },
  {
    toolSlug: "background-change",
    label: "Background Change",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["generated_image"],
    description: "Property/render background ko professional look deta hai.",
  },
  {
    toolSlug: "working-drawings",
    label: "Working Drawings",
    requiredStages: ["brief", "floor_plan", "structure"],
    recommendedPreviousOutputs: ["floor_plan", "structure_output"],
    description: "Architectural, electrical, plumbing and structural working drawing checklist/package.",
  },
  {
    toolSlug: "client-pdf",
    label: "Client PDF",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["approved_outputs"],
    description: "Brief, renders, plan notes, material palette and estimate ka client proposal PDF.",
  },
  {
    toolSlug: "contractor-package",
    label: "Contractor Package",
    requiredStages: ["brief", "boq"],
    recommendedPreviousOutputs: ["boq", "working_drawings"],
    description: "BOQ, material list, work sequence and site checklist package.",
  },
  {
    toolSlug: "client-agreement",
    label: "Client Agreement",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["scope", "estimate"],
    description: "Scope, deliverables, payment milestones, revision and sign-off agreement.",
  },
  {
    toolSlug: "export",
    label: "Export Package",
    requiredStages: ["brief"],
    recommendedPreviousOutputs: ["approved_outputs"],
    description: "Approved outputs se client/contractor package.",
  },
];

function ruleForTool(toolSlugRaw: string) {
  const toolSlug = String(toolSlugRaw || "").toLowerCase();
  return (
    TOOL_CONTEXT_RULES.find((r) => r.toolSlug === toolSlug) ||
    TOOL_CONTEXT_RULES.find((r) => toolSlug.includes(r.toolSlug)) ||
    {
      toolSlug,
      label: toolSlug || "Tool",
      requiredStages: ["brief"],
      recommendedPreviousOutputs: [],
      description: "Generic project tool.",
    }
  );
}

async function readJson(fileName: string) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function arr(value: any) {
  return Array.isArray(value) ? value : [];
}


// BUILDSETU_BRIEF_ASSET_MATCH_V1
function normalizeAssetMatchText(value: any) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

function briefPlotTokens(brief: ProjectBrief | null) {
  if (!brief) return [];

  const width = String(brief.site?.plotWidthFt || "").trim();
  const depth = String(brief.site?.plotDepthFt || "").trim();

  const tokens = new Set<string>();

  if (width && depth) {
    tokens.add(`${width}x${depth}`);
    tokens.add(`${width} x ${depth}`);
    tokens.add(`${width}' x ${depth}'`);
    tokens.add(`${width} ft x ${depth} ft`);
  }

  return Array.from(tokens).map(normalizeAssetMatchText).filter(Boolean);
}

function assetLooksMismatchedWithBrief(asset: any, brief: ProjectBrief | null) {
  if (!brief) return false;

  const text = normalizeAssetMatchText([
    asset?.title,
    asset?.projectTitle,
    asset?.prompt,
    asset?.renderType,
    asset?.assetType,
    asset?.imageMode,
    asset?.file,
    asset?.imageUrl,
    asset?.publicUrl,
  ].join(" "));

  if (!text) return false;

  const currentTokens = briefPlotTokens(brief);
  const hasCurrentPlot = currentTokens.some((token) => token && text.includes(token));

  const plotLikeMatches = text.match(/\b\d{2,3}\s*x\s*\d{2,3}\b/g) || [];
  const hasDifferentPlot =
    plotLikeMatches.length > 0 &&
    !plotLikeMatches.some((match) => currentTokens.includes(normalizeAssetMatchText(match)));

  const title = normalizeAssetMatchText(brief.title || "");
  const assetTitle = normalizeAssetMatchText(asset?.title || asset?.projectTitle || "");

  const hasDifferentNamedHouse =
    assetTitle.includes("house") &&
    title.includes("house") &&
    title &&
    assetTitle &&
    assetTitle !== title &&
    !assetTitle.includes(title) &&
    !title.includes(assetTitle);

  return Boolean((hasDifferentPlot && !hasCurrentPlot) || hasDifferentNamedHouse);
}

function annotateAssetsForCurrentBrief(assets: any[], brief: ProjectBrief | null) {
  return assets.map((asset) => {
    const mismatchedWithCurrentBrief = assetLooksMismatchedWithBrief(asset, brief);

    return {
      ...asset,
      mismatchedWithCurrentBrief,
      contextRole: mismatchedWithCurrentBrief ? "reference_only_mismatched_brief" : "current_project_asset",
    };
  });
}

function stageFromOutput(output: any) {
  const stageId = String(output.stageId || "");
  if (stageId) return stageId;

  const toolSlug = String(output.toolSlug || "").toLowerCase();
  const outputType = String(output.outputType || output.renderType || output.title || "").toLowerCase();

  if (toolSlug.includes("bbs") || outputType.includes("bbs")) return "bbs";
  if (toolSlug.includes("boq") || outputType.includes("boq") || outputType.includes("estimate")) return "boq";
  if (toolSlug.includes("structure") || outputType.includes("column") || outputType.includes("beam") || outputType.includes("slab")) return "structure";
  if (toolSlug.includes("exterior") || outputType.includes("elevation") || outputType.includes("front_left") || outputType.includes("front")) return "exterior";
  if (toolSlug.includes("interior") || toolSlug.includes("design") || outputType.includes("interior") || outputType.includes("bedroom")) return "interior";
  if (outputType.includes("floor") || outputType.includes("plan") || outputType.includes("naksha")) return "floor_plan";
  if (outputType.includes("planning") || outputType.includes("zoning")) return "planning";

  return "other";
}

function briefText(brief: ProjectBrief | null) {
  if (!brief) return "No project brief found.";

  return [
    `Project: ${brief.title}`,
    `Client: ${brief.client.name || "Not specified"}`,
    `Location: ${[brief.site.city, brief.site.state].filter(Boolean).join(", ") || "Not specified"}`,
    `Plot: ${brief.site.plotWidthFt || "?"} x ${brief.site.plotDepthFt || "?"} ft`,
    `Facing: ${brief.site.facing || "Not specified"}`,
    `Floors: ${brief.building.floors || "Not specified"}`,
    `Rooms: bedrooms=${brief.building.bedrooms ?? "?"}, bathrooms=${brief.building.bathrooms ?? "?"}`,
    `Parking: ${brief.building.parking || "Not specified"}`,
    `Vastu: ${brief.preferences.vastu || "Not specified"}`,
    `Style: ${brief.preferences.style || brief.preferences.exteriorStyle || "Not specified"}`,
    `Materials: ${brief.preferences.materialPalette || "Not specified"}`,
    `Budget: ${brief.preferences.budgetRange || "Not specified"}`,
    `Quality: ${brief.preferences.qualityLevel || "Not specified"}`,
    `Client notes: ${brief.requirements.clientNotes || "None"}`,
    `Must have: ${brief.requirements.mustHave.join(", ") || "None"}`,
    `Avoid: ${brief.requirements.avoid.join(", ") || "None"}`,
  ].join("\n");
}

export async function buildProjectContext(input: {
  projectId: string;
  toolSlug?: string;
}) {
  const projectId = safeProjectId(input.projectId);
  const toolSlug = String(input.toolSlug || "generic-tool");
  const rule = ruleForTool(toolSlug);

  const brief = await getProjectBrief(projectId);
  const completeness = getProjectBriefCompleteness(brief);
  const stages = await getProjectStages(projectId);

  const assetsDb = await readJson("project-assets.json");
  const conceptsDb = await readJson("project-concepts.json");
  const refsDb = await readJson("exterior-references.json");
  const toolOutputsDb = await readJson("project-tool-outputs.json");

  const rawAssets = arr(assetsDb.assets || assetsDb).filter((a: any) => String(a.projectId || "") === projectId);
  const assets = annotateAssetsForCurrentBrief(rawAssets, brief);
  const currentBriefAssets = assets.filter((a: any) => !a.mismatchedWithCurrentBrief);
  const mismatchedBriefAssets = assets.filter((a: any) => a.mismatchedWithCurrentBrief);
  const concepts = arr(conceptsDb.concepts).filter((c: any) => String(c.projectId || "") === projectId);
  const conceptOutputs = arr(conceptsDb.outputs).filter((o: any) => String(o.projectId || "") === projectId);
  const toolOutputs = arr(toolOutputsDb.outputs)
    .filter((o: any) => String(o.projectId || "") === projectId)
    .map((o: any) => ({
      ...o,
      outputType: o.stageId || o.outputType || o.toolSlug || "tool_output",
      jsonData: o.output || o.jsonData || {},
    }));
  const outputs = [...conceptOutputs, ...toolOutputs].sort((a: any, b: any) =>
    String(b.createdAt || b.updatedAt || "").localeCompare(String(a.createdAt || a.updatedAt || ""))
  );
  const references = arr(refsDb.references).filter((r: any) => String(r.projectId || "") === projectId);

  const outputsByStage = outputs.reduce<Record<string, any[]>>((acc, output) => {
    const stage = stageFromOutput(output);
    acc[stage] = acc[stage] || [];
    acc[stage].push(output);
    return acc;
  }, {});

  const currentStageMap = new Map(stages.map((s) => [s.id, s]));
  const missingRequiredStages = rule.requiredStages.filter((stageId) => {
    if (stageId === "brief") return completeness.score < 60;
    const stage = currentStageMap.get(stageId as any);
    const stageOutputs = outputsByStage[stageId] || [];
    const stageReady =
      stageOutputs.length > 0 ||
      ["draft_ready", "review_required", "approved", "complete"].includes(String(stage?.status || ""));
    return !stageReady;
  });

  const latestExteriorMaster =
    concepts.find((c: any) => String(c.toolSlug || "") === "exterior-elevation" && c.isActive && c.masterImageUrl) ||
    concepts.find((c: any) => String(c.toolSlug || "") === "exterior-elevation" && c.masterImageUrl) ||
    null;

  const latestImages = currentBriefAssets
    .filter((a: any) => String(a.type || "").includes("image") || a.imageUrl || a.publicUrl)
    .slice(0, 24);

  const contextText = [
    "PROJECT CONTEXT",
    "---------------",
    briefText(brief),
    "",
    `Brief completeness: ${completeness.score}%`,
    completeness.missing.length ? `Missing brief fields: ${completeness.missing.join(", ")}` : "Missing brief fields: none",
    "",
    `Current tool: ${rule.label}`,
    `Tool purpose: ${rule.description}`,
    "",
    `Available references: ${references.length}`,
    `Available generated images/assets: ${latestImages.length}`,
    `Ignored mismatched old assets: ${mismatchedBriefAssets.length}`,
    `Available project outputs: ${outputs.length}`,
    "BUILDSETU_PROJECT_WORKING_PROGRAM_STANDARD_V4: Project section standard working program = 1 Client Brief, 2 Site/Jurisdiction, 3 Concept Planning, 4 Floor Plan/Naksha, 5 Locked Plan, 6 Working Drawings, 7 Structure, 8 MEP, 9 BOQ/BBS, 10 Exterior/Interior, 11 Review/Export.",
    "Project section rule: every tool must use selected projectId, master brief, saved project memory, locked plan/assets and previous outputs as source of truth.",
    "Project section rule: do not create random/global output when selected project context exists.",
    latestExteriorMaster ? `Active exterior master: ${latestExteriorMaster.title || latestExteriorMaster.id}` : "Active exterior master: none",
    "",
    missingRequiredStages.length
      ? `Before this tool, recommended missing stages: ${missingRequiredStages.join(", ")}`
      : "Tool prerequisites: ready or enough context available",
  ].join("\n");

  return {
    projectId,
    toolSlug,
    rule,
    brief,
    completeness,
    stages,
    assets: latestImages,
    references,
    concepts,
    outputs,
    outputsByStage,
    latestExteriorMaster,
    missingRequiredStages,
    contextText,
    nextRecommendedAction: missingRequiredStages.length
      ? `Complete ${missingRequiredStages[0]} before ${rule.label}`
      : `Proceed with ${rule.label}`,
  };
}
