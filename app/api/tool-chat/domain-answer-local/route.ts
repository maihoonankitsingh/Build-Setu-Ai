import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  architecture_planning: ["floor plan", "planning", "layout", "space", "room", "circulation", "zoning", "setback", "ventilation", "plot", "facing", "site"],
  interior_design: ["interior", "kitchen", "wardrobe", "false ceiling", "lighting", "furniture", "finishes", "storage", "tv unit", "modular", "clearance"],
  exterior_design: ["exterior", "elevation", "facade", "front", "balcony", "terrace", "cladding", "massing", "opening", "compound wall"],
  civil_construction: ["construction", "foundation", "rcc", "masonry", "plaster", "waterproofing", "site work", "curing", "concrete", "shuttering"],
  construction_materials: ["material", "cement", "steel", "sand", "aggregate", "brick", "block", "tile", "paint", "wood", "glass", "hardware"],
  vastu_guidance: ["vastu", "pooja", "north east", "south west", "entrance", "orientation", "mandir", "kitchen direction", "bedroom direction"],
  units_dimensions: ["dimension", "unit", "feet", "meter", "metre", "mm", "sqm", "sqft", "clearance", "door size", "window size", "stair", "parking"],
  boq: ["boq", "quantity", "takeoff", "rate", "item", "estimation", "cost", "cement", "steel", "brick", "plaster", "scope"],
  bbs: ["bbs", "bar bending", "reinforcement", "rebar", "cut length", "shape code", "stirrup", "main bar", "steel schedule"],
  mep_basics: ["mep", "plumbing", "electrical", "hvac", "drainage", "shaft", "pipe", "wiring", "db", "switch", "water supply"],
  approvals_bylaws: ["approval", "bylaw", "bye law", "byelaw", "far", "fsi", "setback", "height", "noc", "fire", "authority", "permit", "nbc", "bis"],
  quality_check: ["quality", "checklist", "inspection", "snag", "testing", "workmanship", "handover", "site qc", "defect"],
  execution_planning: ["execution", "schedule", "sequence", "procurement", "labour", "labor", "timeline", "task", "phase", "workflow"]
};

function cleanText(value: unknown, max = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_+.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readJson(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function inferDomains(query: string, requestedDomain: string) {
  // BUILDSETU_DOMAIN_ANSWER_LOCAL_API_V1
  const q = normalize(query);
  const requested = normalize(requestedDomain || "all");
  const scores: Record<string, number> = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;

    if (requested && requested !== "all" && requested === domain) score += 100;

    for (const keyword of keywords) {
      const k = normalize(keyword);
      if (k && q.includes(k)) score += Math.max(8, k.length);
    }

    if (score > 0) scores[domain] = score;
  }

  const inferredDomains = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([domain]) => domain);

  return {
    requestedDomain: requested || "all",
    inferredDomains,
    scores,
    primaryDomain: inferredDomains[0] || (requested !== "all" ? requested : "general"),
  };
}

function taxonomyItems(taxonomy: AnyRecord, intent: AnyRecord) {
  const wanted = new Set<string>(intent?.inferredDomains || []);

  return (taxonomy?.domains || [])
    .filter((domain: AnyRecord) => !wanted.size || wanted.has(String(domain?.id || "")))
    .map((domain: AnyRecord) => {
      const id = String(domain?.id || "taxonomy_domain");
      const title = String(domain?.title || id);
      const scope = Array.isArray(domain?.scope) ? domain.scope : [];
      const outputUse = Array.isArray(domain?.outputUse) ? domain.outputUse : [];
      const reviewLevel = String(domain?.reviewLevel || "");

      return {
        id: `taxonomy-${id}`,
        domain: id,
        sourceType: "taxonomy",
        title: `${title} domain guide`,
        text: [
          `BuildSetu taxonomy domain: ${title}`,
          `Domain id: ${id}`,
          reviewLevel ? `Review level: ${reviewLevel}` : "",
          scope.length ? `Scope: ${scope.join(", ")}` : "",
          outputUse.length ? `Output use: ${outputUse.join(", ")}` : "",
        ].filter(Boolean).join("\n"),
        sourceCitation: "",
        sourceUrl: "",
        score: 300,
        extracted: {
          warnings: reviewLevel.includes("required") ? ["Professional review required for final use."] : [],
        },
      };
    });
}

function itemCombinedText(item: AnyRecord) {
  return normalize([
    item?.title,
    item?.domain,
    item?.sourceType,
    Array.isArray(item?.tags) ? item.tags.join(" ") : "",
    item?.text,
    item?.snippet,
    item?.textPreview,
    item?.sourceUrl,
    item?.sourceCitation,
  ].filter(Boolean).join(" "));
}

function itemBody(item: AnyRecord) {
  return cleanText(
    item?.text ||
      item?.textPreview ||
      item?.snippet ||
      item?.content ||
      item?.summary ||
      item?.raw?.original?.text ||
      item?.raw?.text ||
      "",
    520,
  );
}

const DOMAIN_ANSWER_RANKING_POLICY = "primary_domain_seed_priority_v2"; // BUILDSETU_DOMAIN_ANSWER_RANKING_PRECISION_V2

function tokenScoreForItem(text: string, query: string) {
  const stopwords = new Set(["batao", "kya", "hai", "ke", "liye", "and", "the", "with", "for", "checklist"]);
  const qTokens = normalize(query)
    .split(" ")
    .filter((token) => token.length >= 3 && !stopwords.has(token));

  let score = 0;

  for (const token of qTokens) {
    if (text.includes(token)) score += 8 + Math.min(10, token.length);
  }

  return score;
}

function scoreItem(item: AnyRecord, query: string, intent: AnyRecord) {
  const text = itemCombinedText(item);
  const inferredDomains = Array.isArray(intent?.inferredDomains) ? intent.inferredDomains : [];
  const primaryDomain = normalize(intent?.primaryDomain || inferredDomains[0] || "");
  const itemDomain = normalize(item?.domain);
  const sourceType = normalize(item?.sourceType);
  const tagSet = new Set(Array.isArray(item?.tags) ? item.tags.map((tag: unknown) => normalize(tag)) : []);

  let score = Number(item?.score || 0);
  const directTokenScore = tokenScoreForItem(text, query);
  score += directTokenScore;

  inferredDomains.forEach((domain: unknown, index: number) => {
    const normalizedDomain = normalize(domain);
    const isPrimary = index === 0;
    const baseWeight = Math.max(10, 44 - index * 10);

    if (itemDomain === normalizedDomain) {
      score += baseWeight + (isPrimary ? 95 : 28);
    }

    if (tagSet.has(normalizedDomain)) {
      score += baseWeight + (isPrimary ? 45 : 18);
    }

    if (text.includes(normalizedDomain.replace(/_/g, " "))) {
      score += isPrimary ? 24 : 8;
    }
  });

  const isPrimaryDomainItem = Boolean(primaryDomain && itemDomain === primaryDomain);
  const isInferredDomainItem = inferredDomains.map((domain: unknown) => normalize(domain)).includes(itemDomain);

  if (isPrimaryDomainItem && sourceType === "curated_starter") score += 140;
  if (isPrimaryDomainItem && sourceType === "taxonomy") score += 120;

  if (!isPrimaryDomainItem && isInferredDomainItem && sourceType === "curated_starter") score += 28;
  if (!isPrimaryDomainItem && isInferredDomainItem && sourceType === "taxonomy") score += 20;

  if (!isInferredDomainItem && sourceType === "curated_starter") {
    score -= directTokenScore >= 55 ? 12 : 70;
  }

  if (!isInferredDomainItem && sourceType === "taxonomy") {
    score -= 55;
  }

  return score;
}

function rankItems(items: AnyRecord[], query: string, intent: AnyRecord, limit: number) {
  // BUILDSETU_DOMAIN_ANSWER_PRIMARY_SEED_GUARD_V2
  const maxItems = Math.max(1, Math.min(limit, 10));
  const inferredDomains = Array.isArray(intent?.inferredDomains) ? intent.inferredDomains : [];
  const primaryDomain = normalize(intent?.primaryDomain || inferredDomains[0] || "");

  const ranked: AnyRecord[] = items
    .map((item: AnyRecord) => ({
      ...item,
      score: scoreItem(item, query, intent),
      matchedDomains: inferredDomains,
    }))
    .filter((item: AnyRecord) => Number(item?.score || 0) > 0)
    .sort((a: AnyRecord, b: AnyRecord) => Number(b?.score || 0) - Number(a?.score || 0));

  const primaryCurated = ranked.find((item: AnyRecord) => normalize(item?.domain) === primaryDomain && normalize(item?.sourceType) === "curated_starter");
  const primaryTaxonomy = ranked.find((item: AnyRecord) => normalize(item?.domain) === primaryDomain && normalize(item?.sourceType) === "taxonomy");

  const selected: AnyRecord[] = [];

  for (const mustHave of [primaryTaxonomy, primaryCurated]) {
    if (mustHave && !selected.some((item: AnyRecord) => item?.id === mustHave?.id)) selected.push(mustHave);
  }

  for (const item of ranked) {
    if (selected.length >= maxItems) break;
    if (!selected.some((existing: AnyRecord) => existing?.id === item?.id)) selected.push(item);
  }

  return selected.slice(0, maxItems);
}

function summarizeKnowledgeItems(items: AnyRecord[]) {
  // BUILDSETU_DOMAIN_ANSWER_LOCAL_KNOWLEDGE_SUMMARY_V1
  const sourceTypeCounts: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};
  const sourceCitationCounts: Record<string, number> = {};

  for (const item of items || []) {
    const sourceType = cleanText(item?.sourceType || "unknown", 80) || "unknown";
    const domain = cleanText(item?.domain || "unknown", 80) || "unknown";
    const citation = cleanText(item?.sourceCitation || item?.sourceUrl || "", 180);

    sourceTypeCounts[sourceType] = (sourceTypeCounts[sourceType] || 0) + 1;
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    if (citation) sourceCitationCounts[citation] = (sourceCitationCounts[citation] || 0) + 1;
  }

  return {
    totalItems: items.length,
    sourceTypeCounts,
    domainCounts,
    topSources: Object.entries(sourceCitationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count })),
  };
}

function flattenKnowledge(data: any): AnyRecord[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.knowledge)) return data.knowledge;

  if (data && typeof data === "object") {
    const out: AnyRecord[] = [];
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) out.push(...value.filter((item) => item && typeof item === "object") as AnyRecord[]);
      else if (value && typeof value === "object") out.push(value as AnyRecord);
    }
    return out;
  }

  return [];
}

async function readLocalKnowledge(root: string) {
  const candidates = [
    "config/buildsetu-domain-knowledge-seeds.json", // BUILDSETU_DOMAIN_KNOWLEDGE_SEEDS_READ_V1
    "data/agent-knowledge/web-search/knowledge.json",
    "data/agent-knowledge/knowledge.json",
    "data/buildsetu-knowledge/knowledge.json"
  ];

  const all: AnyRecord[] = [];

  for (const rel of candidates) {
    const data = await readJson(path.join(root, rel), null);
    if (data) all.push(...flattenKnowledge(data));
  }

  return all;
}

function buildAnswer(items: AnyRecord[], intent: AnyRecord, query: string) {
  const inferredDomains = Array.isArray(intent?.inferredDomains) ? intent.inferredDomains : [];
  const primaryDomain = String(intent?.primaryDomain || inferredDomains[0] || "general");

  if (!items.length) {
    return `Saved knowledge me "${cleanText(query, 240)}" ke liye relevant domain-aware item nahi mila.`;
  }

  const lines = [
    "Saved knowledge ke basis par domain-aware answer:",
    "",
    `Detected domain: ${primaryDomain}`,
  ];

  if (inferredDomains.length) lines.push(`Matched domains: ${inferredDomains.join(", ")}`);

  lines.push("");

  for (const item of items.slice(0, 5)) {
    const title = cleanText(item?.title || item?.sourceType || "Knowledge item", 160);
    const domain = cleanText(item?.domain || "", 80);
    const body = itemBody(item);
    const warning = Array.isArray(item?.extracted?.warnings) && item.extracted.warnings.length
      ? ` Warning: ${cleanText(item.extracted.warnings.join(" | "), 180)}`
      : "";
    const citation = cleanText(item?.sourceCitation || item?.sourceUrl || "", 280);

    lines.push(`- ${title}${domain ? ` [${domain}]` : ""}${body ? `: ${body}` : ""}${warning}`);
    if (citation) lines.push(`  Source: ${citation}`);
  }

  const citations = Array.from(new Set(items.map((item) => String(item?.sourceCitation || item?.sourceUrl || "").trim()).filter(Boolean))).slice(0, 8);

  if (citations.length) {
    lines.push("");
    lines.push("Sources:");
    for (const citation of citations) lines.push(`- ${citation}`);
  }

  lines.push("");
  lines.push("Note: Final structural, approval, MEP, fire-safety, BOQ/BBS ya legal decisions ke liye professional review required hai.");

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user) {
      return NextResponse.json({ ok: false, error: "LOGIN_REQUIRED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const projectId = cleanText(body?.projectId || "global", 160) || "global";
    const query = cleanText(body?.query || body?.message || body?.prompt || "", 2000);
    const domain = cleanText(body?.domain || "all", 80) || "all";
    const limit = Math.max(1, Math.min(Number(body?.limit || 6), 10));

    if (!query) {
      return NextResponse.json({ ok: false, error: "QUERY_REQUIRED" }, { status: 400 });
    }

    const root = process.cwd();
    const taxonomy = await readJson(path.join(root, "config/buildsetu-knowledge-taxonomy.json"), { domains: [] });
    const intent = inferDomains(query, domain);
    const localKnowledge = await readLocalKnowledge(root);
    const taxonomyKnowledge = taxonomyItems(taxonomy, intent);
    const candidateItems = [...taxonomyKnowledge, ...localKnowledge];
    const items = rankItems(candidateItems, query, intent, limit);
    const answer = buildAnswer(items, intent, query);
    const knowledgeSummary = {
      ...summarizeKnowledgeItems(items),
      candidateSummary: summarizeKnowledgeItems(candidateItems),
      taxonomyItemCount: taxonomyKnowledge.length,
      localKnowledgeItemCount: localKnowledge.length,
      rankingPolicy: DOMAIN_ANSWER_RANKING_POLICY,
    };

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_DOMAIN_ANSWER_LOCAL",
      projectId,
      query,
      domain,
      answer,
      primaryDomain: intent.primaryDomain,
      inferredDomains: intent.inferredDomains,
      knowledgeSummary,
      items,
      output: {
        status: "READY",
        title: "Local domain-aware saved knowledge answer",
        text: answer,
        source: "domain_answer_local_api_v1",
      },
      updatedAt: new Date().toISOString(),
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "DOMAIN_ANSWER_LOCAL_FAILED",
      },
      { status: 500 },
    );
  }
}
