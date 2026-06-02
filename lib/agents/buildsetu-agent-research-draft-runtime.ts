import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

type AgentResearchDraftInput = {
  projectId?: string;
  toolSlug?: string;
  toolName?: string;
  action?: string;
  message?: string;
  projectTitle?: string;
};

type AgentResultLike = {
  ok?: boolean;
  decision?: Record<string, unknown>;
  responseText?: string;
  finalPrompt?: string;
  imagePrompt?: string;
};

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeArray(values: string[]): string[] {
  return values.filter((item) => item && item.trim()).map((item) => item.trim());
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "research-draft";
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "_");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shouldCreateResearchDraft(message: string): boolean {
  return /(research draft|draft banao|draft create|pending review|knowledge update|official source se|internet se.*draft|latest.*draft|current.*draft|datasheet.*draft|source.*draft|update.*knowledge)/i.test(message);
}

function detectCategory(message: string): string {
  if (/(approval|sanction|permit|far|fsi|setback|municipal|municipality|development authority|civil defence|fire noc|occupancy certificate)/i.test(message)) {
    return "authorityApprovalBylaws";
  }

  if (/(building code|is code|nbc|ibc|irc|nfpa|nec|eurocode|ncc|bca|structural code|electrical code|plumbing code)/i.test(message)) {
    return "codeStandardsReference";
  }

  if (/(rate|price|cost|cement|steel|labour|boq|market rate|material rate)/i.test(message)) {
    return "materialRatesCost";
  }

  if (/(datasheet|manufacturer|product spec|waterproofing material|paint spec|pipe spec|wire spec|board spec|material spec)/i.test(message)) {
    return "productMaterialSpecs";
  }

  if (/(climate|flood|seismic|earthquake|cyclone|wind|coastal|rainfall|snow load)/i.test(message)) {
    return "climateHazardSiteContext";
  }

  if (/(method statement|construction process|qa\/qc|curing|plaster method|tile laying|false ceiling method)/i.test(message)) {
    return "constructionMethodsBestPractice";
  }

  if (/(interior design|facade trend|design inspiration|reference image|catalog style)/i.test(message)) {
    return "designReferenceTrend";
  }

  return "generalAecResearch";
}

function riskForCategory(category: string): "low" | "medium" | "medium_high" | "high" {
  if (category === "authorityApprovalBylaws" || category === "codeStandardsReference") return "high";
  if (category === "materialRatesCost" || category === "climateHazardSiteContext") return "medium_high";
  if (category === "productMaterialSpecs" || category === "constructionMethodsBestPractice") return "medium";
  return "medium";
}

function detectJurisdiction(message: string) {
  const lower = message.toLowerCase();

  const country =
    /uae|dubai|abu dhabi|sharjah/.test(lower) ? "UAE" :
    /usa|united states|california|texas|florida|new york/.test(lower) ? "USA" :
    /uk|united kingdom|england|london/.test(lower) ? "UK" :
    /canada|ontario|toronto|british columbia/.test(lower) ? "Canada" :
    /australia|sydney|melbourne|queensland/.test(lower) ? "Australia" :
    /india|raipur|chhattisgarh|delhi|mumbai|maharashtra|bangalore|bengaluru|karnataka/.test(lower) ? "India" :
    "unknown";

  const stateOrProvinceOrEmirate =
    /chhattisgarh|raipur/.test(lower) ? "Chhattisgarh" :
    /dubai/.test(lower) ? "Dubai" :
    /abu dhabi/.test(lower) ? "Abu Dhabi" :
    /sharjah/.test(lower) ? "Sharjah" :
    /maharashtra|mumbai/.test(lower) ? "Maharashtra" :
    /karnataka|bangalore|bengaluru/.test(lower) ? "Karnataka" :
    "unknown";

  const cityOrAuthority =
    /raipur/.test(lower) ? "Raipur local authority" :
    /dubai/.test(lower) ? "Dubai Municipality / relevant authority" :
    /abu dhabi/.test(lower) ? "Abu Dhabi relevant authority" :
    /mumbai/.test(lower) ? "Mumbai local authority" :
    /bangalore|bengaluru/.test(lower) ? "Bengaluru local authority" :
    "unknown";

  return { country, stateOrProvinceOrEmirate, cityOrAuthority };
}

function extractFirstUrl(message: string): string {
  const match = message.match(/https?:\/\/[^\s"'<>]+/i);
  const raw = match?.[0] || "";
  const cleaned = raw.replace(/[.,;:)]+$/g, "");
  return cleaned || "pending-source://manual-review-required";
}

function extractSourceTitle(message: string, category: string): string {
  const explicit = message.match(/source title\s*:\s*([\s\S]*?)(?:\.\s*Source URL\s*:|,\s*Source URL\s*:|Source URL\s*:|Category\s*:|Country\s+|Isko\s+|pending review|$)/i)?.[1];

  if (explicit?.trim()) {
    return explicit
      .trim()
      .replace(/[.;,:]+$/g, "")
      .slice(0, 140);
  }

  if (category === "authorityApprovalBylaws") return "Pending official authority source";
  if (category === "materialRatesCost") return "Pending current market/rate source";
  if (category === "productMaterialSpecs") return "Pending manufacturer datasheet source";
  if (category === "codeStandardsReference") return "Pending official code/standards source";
  return "Pending reviewed source";
}

function sourceTypeForCategory(category: string): string {
  if (category === "authorityApprovalBylaws" || category === "codeStandardsReference") return "official_primary";
  if (category === "productMaterialSpecs" || category === "constructionMethodsBestPractice") return "manufacturer_primary";
  if (category === "materialRatesCost") return "vendor_market";
  if (category === "designReferenceTrend") return "design_reference";
  return "recognized_reference";
}

function mergeTargetForCategory(category: string): string {
  if (category === "authorityApprovalBylaws") return "data/buildsetu-knowledge/country-state-rules-router.json";
  if (category === "productMaterialSpecs" || category === "constructionMethodsBestPractice") return "data/buildsetu-knowledge/construction-material-methods-knowledge.json";
  if (category === "materialRatesCost") return "data/buildsetu-knowledge/boq-cost-research-knowledge.json";
  if (category === "climateHazardSiteContext") return "data/buildsetu-knowledge/climate-hazard-knowledge.json";
  if (category === "codeStandardsReference") return "data/buildsetu-knowledge/country-state-rules-router.json";
  return "data/buildsetu-knowledge/research-merged-knowledge.json";
}

function checklistForCategory(category: string): string[] {
  if (category === "authorityApprovalBylaws") {
    return ["verify official authority source", "extract approval process", "extract required drawings", "check FAR/FSI/setback/parking/fire categories", "mark professional/local authority verification required"];
  }

  if (category === "materialRatesCost") {
    return ["verify source/date/location", "extract rate range", "separate material and labour assumptions", "mark estimate confidence", "avoid guaranteed cost claim"];
  }

  if (category === "productMaterialSpecs") {
    return ["verify manufacturer source", "extract use area", "extract application method", "extract cautions", "avoid guaranteed performance claim"];
  }

  if (category === "codeStandardsReference") {
    return ["verify official code/standards source", "extract version/reference only", "avoid copying full code text", "mark professional verification required"];
  }

  return ["verify source", "extract summary", "extract checklist", "mark cautions", "run smoke tests before merge"];
}

function blockedClaimsForCategory(category: string): string[] {
  const common = ["final approval", "certified design", "guaranteed compliance"];

  if (category === "authorityApprovalBylaws") return [...common, "guaranteed FAR/FSI", "legal compliance certificate"];
  if (category === "materialRatesCost") return [...common, "fixed guaranteed cost", "final tender quantity without drawings"];
  if (category === "productMaterialSpecs") return [...common, "guaranteed waterproofing", "final system design"];
  if (category === "codeStandardsReference") return [...common, "full copied code text", "final code compliance"];
  return common;
}

function excerpt(value: unknown, max = 900): string {
  const text = safeString(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export async function maybeCreateResearchDraftFromAgentRun(input: AgentResearchDraftInput, agentResult: AgentResultLike) {
  const message = safeString(input.message);

  if (!shouldCreateResearchDraft(message)) {
    return {
      created: false,
      reason: "research draft trigger not detected"
    };
  }

  const category = detectCategory(message);
  const riskLevel = riskForCategory(category);
  const detectedJurisdiction = detectJurisdiction(message);
  const jurisdiction =
    detectedJurisdiction.country === "unknown" &&
    category === "materialRatesCost" &&
    !/(worldwide|global|usa|uk|uae|dubai|canada|australia|europe)/i.test(message) &&
    /(cement|steel|boq|rate|price|cost|material|ke liye|karo|source se|estimate)/i.test(message)
      ? {
          country: "India",
          stateOrProvinceOrEmirate: "unknown",
          cityOrAuthority: "India / local market source required"
        }
      : detectedJurisdiction;

  const sourceTitle = extractSourceTitle(message, category);
  const sourceUrl = extractFirstUrl(message);
  const sourceType = sourceTypeForCategory(category);

  const draftId = `draft_${timestampSlug()}_${slugify(category)}_${randomUUID().slice(0, 8)}`;

  const summaryParts = safeArray([
    `Agent research draft created from user request: ${message}`,
    excerpt(agentResult.responseText, 700),
    excerpt(agentResult.finalPrompt, 700)
  ]);

  const draft = {
    id: draftId,
    status: "pending_review",
    category,
    riskLevel,
    requiresProfessionalReview: ["high", "medium_high", "medium"].includes(riskLevel),
    jurisdiction,
    source: {
      title: sourceTitle,
      url: sourceUrl,
      sourceType,
      publisher: sourceUrl.startsWith("pending-source://") ? "pending manual source review" : "user/request provided source",
      dateAccessed: todayIso(),
      effectiveDate: "unknown",
      version: "unknown"
    },
    extracted: {
      summary: summaryParts.join("\n\n"),
      checklist: checklistForCategory(category),
      requiredDocuments: category === "authorityApprovalBylaws"
        ? ["site plan", "floor plans", "sections", "elevations", "area statement", "authority forms where applicable"]
        : [],
      processSteps: ["create pending_review draft", "review source metadata", "approve/reject", "merge only after mergeReady=true", "run smoke tests"],
      cautions: [
        "This draft is not final compliance.",
        "Verify source authority, date, jurisdiction and applicability before merge.",
        "Professional/local authority verification required for high-risk construction data."
      ],
      blockedClaims: blockedClaimsForCategory(category)
    },
    confidence: sourceUrl.startsWith("pending-source://") ? "low" : "medium",
    mergeTarget: mergeTargetForCategory(category),
    smokeTestsRequired: ["research_draft_agent_connector_smoke", "no_final_compliance_claim"],
    createdBy: "BuildSetu Agent Research Draft Runtime",
    project: {
      projectId: safeString(input.projectId, "unknown"),
      projectTitle: safeString(input.projectTitle, "unknown"),
      toolSlug: safeString(input.toolSlug, "unknown"),
      toolName: safeString(input.toolName, "unknown"),
      action: safeString(input.action, "unknown")
    },
    agentDecision: agentResult.decision || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const draftsDir = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "buildsetu-research", "drafts");
  await fs.mkdir(draftsDir, { recursive: true });

  const fileName = `${draftId}_${slugify(sourceTitle)}.json`;
  const filePath = path.join(/* turbopackIgnore: true */ draftsDir, fileName);

  await fs.writeFile(filePath, JSON.stringify(draft, null, 2) + "\n", "utf8");

  return {
    created: true,
    draftId,
    status: "pending_review",
    category,
    riskLevel,
    confidence: draft.confidence,
    file: path.relative(process.cwd(), filePath),
    draft
  };
}
