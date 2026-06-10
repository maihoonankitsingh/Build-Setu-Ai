// BUILDSETU_PLANNING_RAG_FOUNDATION_V1
import { existsSync, readFileSync } from "fs";
import path from "path";

export type BuildSetuPlanningRagHit = {
  id: string;
  source: string;
  title: string;
  score: number;
  text: string;
};

type Candidate = {
  id: string;
  source: string;
  title: string;
  text: string;
};

function safeText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function readJsonSafe(file: string): any {
  try {
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readTextSafe(file: string): string {
  try {
    if (!existsSync(file)) return "";
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function flattenObject(value: any, max = 2800): string {
  try {
    const text = safeText(JSON.stringify(value));
    return text.slice(0, max);
  } catch {
    return "";
  }
}

function tokenize(query: string) {
  const base = safeText(query).toLowerCase();
  const words = base
    .split(/[^a-z0-9]+/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);

  const important = [
    "floor",
    "plan",
    "vastu",
    "parking",
    "bedroom",
    "bathroom",
    "toilet",
    "kitchen",
    "staircase",
    "dining",
    "living",
    "pooja",
    "puja",
    "wash",
    "store",
    "east",
    "north",
    "corner",
    "plot",
    "road",
    "dimension",
    "setback",
    "ventilation",
    "entry",
    "lobby",
    "balcony",
    "terrace",
    "g1",
    "ground",
    "first",
  ];

  for (const term of important) {
    if (base.includes(term) && !words.includes(term)) words.push(term);
  }

  const dims = base.match(/\b\d{1,3}\s*[x×]\s*\d{1,3}\b/g) || [];
  for (const dim of dims) words.push(dim.replace(/\s+/g, ""));

  return Array.from(new Set(words)).slice(0, 80);
}

function scoreCandidate(queryTokens: string[], candidate: Candidate) {
  const hay = `${candidate.title} ${candidate.text}`.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (!token) continue;
    if (hay.includes(token)) score += token.length >= 6 ? 3 : 2;
  }

  if (hay.includes("49") && hay.includes("57")) score += 12;
  if (hay.includes("east") && hay.includes("north")) score += 10;
  if (hay.includes("exact") || hay.includes("source-of-truth")) score += 6;
  if (hay.includes("bedroom") || hay.includes("bathroom")) score += 3;
  if (hay.includes("vastu") || hay.includes("planning")) score += 3;

  return score;
}

function pushIfText(candidates: Candidate[], source: string, title: string, text: string) {
  const clean = safeText(text);
  if (!clean || clean.length < 20) return;
  candidates.push({
    id: `${source}:${candidates.length + 1}`,
    source,
    title,
    text: clean.slice(0, 2400),
  });
}

function loadPlanningCandidates(projectId?: string): Candidate[] {
  const root = process.cwd();
  const candidates: Candidate[] = [];

  const projectAssets = readJsonSafe(path.join(root, "data/generated/project-assets.json"));
  if (Array.isArray(projectAssets)) {
    for (const item of projectAssets) {
      if (projectId && String(item?.projectId || "") !== projectId) continue;

      const title = safeText(item?.title || item?.id || "Project asset");
      const text = [
        item?.source,
        item?.assetType,
        item?.title,
        item?.planningJson ? flattenObject(item.planningJson, 3200) : "",
        item?.validationReport ? flattenObject(item.validationReport, 1600) : "",
        item?.scoreReport ? flattenObject(item.scoreReport, 1600) : "",
      ].filter(Boolean).join(" ");

      pushIfText(candidates, "project-assets", title, text);
    }
  }

  const projectMemory = readJsonSafe(path.join(root, "data/generated/project-memory.json"));
  if (Array.isArray(projectMemory)) {
    for (const item of projectMemory) {
      if (projectId && String(item?.projectId || "") !== projectId) continue;
      pushIfText(
        candidates,
        "project-memory",
        safeText(item?.title || item?.type || "Project memory"),
        flattenObject(item, 2600),
      );
    }
  }

  const sourceWatchFiles = [
    "data/buildsetu-source-watch/inbox/latest.md",
    "data/buildsetu-source-watch/quality-gate/latest.json",
    "data/buildsetu-source-review-queue/status/latest.json",
    "data/agent-knowledge/source-watch/latest-updates.json",
  ];

  for (const rel of sourceWatchFiles) {
    const abs = path.join(root, rel);
    const text = rel.endsWith(".md") ? readTextSafe(abs) : flattenObject(readJsonSafe(abs), 2600);
    pushIfText(candidates, rel, rel.split("/").slice(-2).join("/"), text);
  }

  const knowledgeFiles = [
    "data/agent-knowledge/knowledge.json",
    "data/agent-knowledge/items.json",
    "data/agent-knowledge/index.json",
    "data/buildsetu-research/drafts",
  ];

  for (const rel of knowledgeFiles) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) continue;

    const parsed = readJsonSafe(abs);
    if (Array.isArray(parsed)) {
      for (const item of parsed.slice(0, 200)) {
        pushIfText(
          candidates,
          rel,
          safeText(item?.title || item?.name || item?.id || rel),
          flattenObject(item, 2400),
        );
      }
    } else if (parsed) {
      pushIfText(candidates, rel, rel, flattenObject(parsed, 2800));
    }
  }

  return candidates;
}

export function retrieveBuildSetuPlanningRagContext(args: {
  query: string;
  projectId?: string;
  limit?: number;
}) {
  const query = safeText(args.query);
  const projectId = safeText(args.projectId);
  const limit = Math.max(1, Math.min(12, Number(args.limit || 8)));

  const tokens = tokenize(query);
  const candidates = loadPlanningCandidates(projectId);

  const hits = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(tokens, candidate),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((candidate): BuildSetuPlanningRagHit => ({
      id: candidate.id,
      source: candidate.source,
      title: candidate.title,
      score: candidate.score,
      text: candidate.text.slice(0, 1200),
    }));

  const context = hits.length
    ? [
        "BUILDSETU_PLANNING_RAG_CONTEXT_V1",
        "Use these retrieved project/source facts as grounding. Do not copy blindly; reconcile with user requirements and geometry.",
        ...hits.map((hit, index) => {
          return [
            `RAG HIT ${index + 1}`,
            `source: ${hit.source}`,
            `title: ${hit.title}`,
            `score: ${hit.score}`,
            `text: ${hit.text}`,
          ].join("\n");
        }),
      ].join("\n\n")
    : [
        "BUILDSETU_PLANNING_RAG_CONTEXT_V1",
        "No strong local RAG hit found. Use explicit user requirements and hard geometry validation.",
      ].join("\n");

  return {
    query,
    projectId,
    hits,
    context,
  };
}

export function buildSetuHumanLikePlanningChecklist(args: {
  projectText: string;
  projectId?: string;
}) {
  const text = safeText(args.projectText).toLowerCase();

  const is49x57EastNorth =
    /49\s*[x×]\s*57|57\s*[x×]\s*49/.test(text) &&
    text.includes("east") &&
    text.includes("north");

  const asksGPlusOne =
    text.includes("g+1") ||
    text.includes("g plus 1") ||
    text.includes("ground and first") ||
    text.includes("first floor");

  const checklist = [
    "BUILDSETU_HUMAN_LIKE_PLANNING_CHECKLIST_V1",
    "Think like a practical residential architect before drawing:",
    "1. Confirm plot orientation, road sides, and dimension convention before rooms.",
    "2. Convert client words into floor-wise requirements: ground, first, terrace, parking, service.",
    "3. Fix entry, parking, staircase, wet areas, kitchen/service, living/dining, bedrooms in that order.",
    "4. Check circulation: every room must have an accessible path; avoid trapped rooms.",
    "5. Check daylight/ventilation: exterior rooms need external opening where possible.",
    "6. Check dimension consistency: displayed room labels must match locked room rectangles.",
    "7. Check missing/duplicate rooms: do not add default 3BHK unless user asks.",
    "8. Check final drawing convention: north arrow UP, road labels, plot labels, and room tags.",
  ];

  if (is49x57EastNorth) {
    checklist.push(
      "HARD LOCK for 49x57 East-North corner plot:",
      "Top horizontal edge must be NORTH SIDE ROAD = 57'.",
      "Right vertical edge must be EAST FRONT ROAD = 49'.",
      "Drawing coordinate system must be width 57 and height 49, not portrait 49x57.",
      "Reject any plan where top edge is 49 or right edge is 57.",
    );
  }

  if (asksGPlusOne) {
    checklist.push(
      "G+1 floor-wise planning:",
      "Ground floor should handle parking/public/service/basic bedroom requirements.",
      "First floor should handle private bedrooms, family lounge, balcony/terrace, stair continuation.",
      "Do not merge ground and first floor requirements into one drawing.",
    );
  }

  return checklist.join("\n");
}
