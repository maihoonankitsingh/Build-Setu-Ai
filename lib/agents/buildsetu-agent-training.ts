import fs from "fs";
import path from "path";

type TrainingCase = {
  id: string;
  intent: string;
  country: string;
  keywords: string[];
  userInput: string;
  expectedBehavior: string[];
  mustInclude: string[];
  mustAvoid: string[];
};

type TrainingDataset = {
  version: string;
  purpose: string;
  rules: string[];
  cases: TrainingCase[];
};

function loadTrainingDataset(): TrainingDataset {
  const filePath = path.join(process.cwd(), "data", "buildsetu-training", "agent-training-cases.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function scoreCase(input: string, item: TrainingCase): number {
  const text = input.toLowerCase();
  let score = 0;

  for (const keyword of item.keywords || []) {
    if (text.includes(String(keyword).toLowerCase())) score += 3;
  }

  if (item.intent && text.includes(item.intent.replace("_", " "))) score += 2;
  if (item.country && text.includes(item.country.toLowerCase())) score += 2;

  return score;
}


function detectQualityTrainingIntent(message: string): string {
  const t = String(message || "").toLowerCase();

  if (/(structure|rcc|column|beam|slab|footing|foundation|is code|rebar|steel)/i.test(t)) return "structure";
  if (/(interior|bedroom|living|kitchen|wardrobe|false ceiling|room design)/i.test(t)) return "interior";
  if (/(exterior|elevation|facade|front design|front elevation)/i.test(t)) return "exterior";
  if (/(electrical|wiring|switch|socket|db|mcb|earthing)/i.test(t)) return "electrical";
  if (/(plumbing|pipe|water line|drainage|sewer|shaft|tank|pump)/i.test(t)) return "plumbing";
  if (/(boq|estimate|costing|material quantity)/i.test(t)) return "boq";
  if (/(bbs|bar bending|reinforcement)/i.test(t)) return "bbs";
  if (/(naksha|floor plan|floorplan|2d floor plan|house layout|villa)/i.test(t)) return "floor_plan";

  return "mixed";
}

function qualityCaseIdsForIntent(intent: string): string[] {
  if (intent === "floor_plan") return ["quality_floor_plan_visual_guard"];
  if (intent === "interior") return ["quality_interior_scope_guard"];
  if (intent === "structure") return ["quality_structure_no_fake_rebar"];
  return [];
}



function researchPipelineCaseIdsForMessage(message: string): string[] {
  const t = String(message || "").toLowerCase();
  const ids: string[] = [];

  if (/(trusted source|official source|approval rules|municipal|development authority|far|fsi|setback)/i.test(t)) {
    ids.push("trusted_source_registry_approval_rules");
    ids.push("internet_router_latest_approval_rules");
  }

  if (/(cement|steel|material rate|current rate|market rate|rate internet|permanent knowledge|boq estimate|cost update)/i.test(t)) {
    ids.push("research_draft_pipeline_material_rates");
    ids.push("internet_router_material_rate_current");
  }

  if (/(manufacturer datasheet|datasheet|product spec|waterproofing.*spec|material spec)/i.test(t)) {
    ids.push("research_pipeline_product_datasheet_review");
    ids.push("internet_router_product_datasheet_waterproofing");
  }

  return ids;
}



function modelStyleCaseIdsForMessage(message: string): string[] {
  const t = String(message || "").toLowerCase();
  const ids: string[] = [];

  if (/(chatgpt model|model style|agent architecture|model runtime|agent brain)/i.test(t)) {
    ids.push("model_style_runtime_architecture");
  }

  if (/(data se train|trained data|training data|fine tune|finetune|rag|knowledge base)/i.test(t)) {
    ids.push("model_style_data_training_pipeline");
  }

  if (/(planner|executor|verifier|tool router|orchestrator)/i.test(t)) {
    ids.push("model_style_planner_executor_verifier");
  }

  if (/(feedback loop|smoke test|quality evaluator|self check|evaluation)/i.test(t)) {
    ids.push("model_style_feedback_evaluation_loop");
  }

  return ids;
}


export function getBuildSetuTrainingBlock(message: string): string {
  const input = String(message || "").trim();
  if (!input) return "";

  let data: TrainingDataset;
  try {
    data = loadTrainingDataset();
  } catch {
    return "";
  }

  const rankedBase = (data.cases || [])
    .map((item) => ({ item, score: scoreCase(input, item) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => row.item);

  const qualityIds = new Set(qualityCaseIdsForIntent(detectQualityTrainingIntent(input)));
  const forcedQualityCases = (data.cases || []).filter((item) => qualityIds.has(item.id));

  const researchPipelineIds = new Set(researchPipelineCaseIdsForMessage(input));
  const forcedResearchPipelineCases = (data.cases || []).filter((item) => researchPipelineIds.has(item.id));

  const modelStyleIds = new Set(modelStyleCaseIdsForMessage(input));
  const forcedModelStyleCases = (data.cases || []).filter((item) => modelStyleIds.has(item.id));

  const seen = new Set<string>();
  const ranked = [...rankedBase, ...forcedQualityCases, ...forcedResearchPipelineCases, ...forcedModelStyleCases].filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  if (!ranked.length) return "";

  const lines: string[] = [
    "BuildSetu agent training examples to follow:",
    "Use these examples as behavior guidance, not as user-visible copy."
  ];

  for (const item of ranked) {
    lines.push(`Training case: ${item.id}`);
    lines.push(`- Intent: ${item.intent}`);
    lines.push(`- Country: ${item.country}`);
    lines.push(`- Example input: ${item.userInput}`);
    lines.push(`- Expected behavior: ${(item.expectedBehavior || []).join(" | ")}`);
    lines.push(`- Must include: ${(item.mustInclude || []).join(", ")}`);
    lines.push(`- Must avoid: ${(item.mustAvoid || []).join(", ")}`);
  }

  lines.push("Global training rule: keep answer scoped to requested task and keep professional certification boundary clear.");

  return lines.join("\n");
}
