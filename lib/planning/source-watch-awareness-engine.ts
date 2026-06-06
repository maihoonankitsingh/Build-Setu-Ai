// BUILDSETU_PHASE_47A_SOURCE_WATCH_AWARENESS_ENGINE
import fs from "node:fs";
import path from "node:path";

type SourceWatchUpdateDraft = {
  id?: string;
  status?: string;
  category?: string;
  riskLevel?: string;
  title?: string;
  url?: string;
  sourceCitation?: string;
  summary?: string;
  requiresProfessionalReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
  file?: string;
};

type SourceWatchInbox = {
  schema?: string;
  generatedAt?: string;
  purpose?: string;
  summary?: {
    sourceCount?: number;
    latestCheckedAt?: string;
    pendingSourceUpdateDrafts?: number;
    latestChangedSources?: number;
    latestFailedSources?: number;
  };
  latestReport?: {
    checkedAt?: string;
    changedCount?: number;
    failedCount?: number;
    changed?: Array<{
      id?: string;
      title?: string;
      url?: string;
      reason?: string;
      draftId?: string;
      draftFile?: string;
    }>;
    failed?: Array<{
      id?: string;
      title?: string;
      url?: string;
      error?: string;
    }>;
  };
  pendingSourceUpdateDrafts?: SourceWatchUpdateDraft[];
  agentInstructions?: string[];
  safety?: {
    trustedKnowledgeWrite?: boolean;
    trustedKnowledgeChanged?: boolean;
    trustedMergeExecuted?: boolean;
    mergeActionAvailable?: boolean;
    sourceRegistryChanged?: boolean;
    autoMerge?: boolean;
    requiresHumanReview?: boolean;
  };
};

function cleanText(value: unknown, max = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function readJsonSafe(filePath: string): SourceWatchInbox | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function shouldSurfaceSourceWatchAwareness(inputText: string) {
  const q = cleanText(inputText, 4000).toLowerCase();

  const triggers = [
    "latest",
    "current",
    "new update",
    "update",
    "recent",
    "rule",
    "rules",
    "byelaw",
    "bye-law",
    "building code",
    "approval",
    "sanction",
    "far",
    "fsi",
    "setback",
    "height",
    "parking",
    "noc",
    "fire",
    "mohua",
    "bis",
    "nbc",
    "dda",
    "cpwd",
    "development authority",
    "municipality",
    "material rate",
    "price",
    "schedule of rates",
    "sor",
    "government",
    "official source",
    "source update",
    "web update",
  ];

  return triggers.some((trigger) => q.includes(trigger));
}

export function buildSourceWatchAwarenessEngine(inputText: string) {
  const inboxPath = path.join(process.cwd(), "data/agent-knowledge/source-watch/latest-updates.json");
  const inbox = readJsonSafe(inboxPath);
  const triggered = shouldSurfaceSourceWatchAwareness(inputText);

  const safety = {
    trustedKnowledgeWrite: inbox?.safety?.trustedKnowledgeWrite === true,
    trustedKnowledgeChanged: inbox?.safety?.trustedKnowledgeChanged === true,
    trustedMergeExecuted: inbox?.safety?.trustedMergeExecuted === true,
    mergeActionAvailable: inbox?.safety?.mergeActionAvailable === true,
    sourceRegistryChanged: inbox?.safety?.sourceRegistryChanged === true,
    autoMerge: inbox?.safety?.autoMerge === true,
    requiresHumanReview: inbox?.safety?.requiresHumanReview !== false,
  };

  const pendingDrafts = Array.isArray(inbox?.pendingSourceUpdateDrafts)
    ? inbox!.pendingSourceUpdateDrafts.slice(0, 5).map((draft) => ({
        title: cleanText(draft.title, 220),
        status: cleanText(draft.status, 80),
        riskLevel: cleanText(draft.riskLevel, 80),
        url: cleanText(draft.url, 600),
        createdAt: cleanText(draft.createdAt, 80),
        file: cleanText(draft.file, 500),
      }))
    : [];

  const latestChanged = Array.isArray(inbox?.latestReport?.changed)
    ? inbox!.latestReport!.changed!.slice(0, 5).map((item) => ({
        id: cleanText(item.id, 180),
        title: cleanText(item.title, 220),
        url: cleanText(item.url, 600),
        reason: cleanText(item.reason, 120),
        draftFile: cleanText(item.draftFile, 500),
      }))
    : [];

  const latestFailed = Array.isArray(inbox?.latestReport?.failed)
    ? inbox!.latestReport!.failed!.slice(0, 5).map((item) => ({
        id: cleanText(item.id, 180),
        title: cleanText(item.title, 220),
        url: cleanText(item.url, 600),
        error: cleanText(item.error, 220),
      }))
    : [];

  return {
    available: Boolean(inbox),
    triggered,
    inboxPath: "data/agent-knowledge/source-watch/latest-updates.json",
    generatedAt: cleanText(inbox?.generatedAt, 80),
    latestCheckedAt: cleanText(inbox?.summary?.latestCheckedAt, 80),
    sourceCount: Number(inbox?.summary?.sourceCount || 0),
    pendingSourceUpdateDrafts: Number(inbox?.summary?.pendingSourceUpdateDrafts || 0),
    latestChangedSources: Number(inbox?.summary?.latestChangedSources || 0),
    latestFailedSources: Number(inbox?.summary?.latestFailedSources || 0),
    latestChanged,
    latestFailed,
    pendingDrafts,
    safety,
    responsePolicy: [
      "Use this as live source-update awareness only.",
      "Do not treat pending source-watch updates as trusted knowledge.",
      "Mention pending review when user asks for latest/current official rules.",
      "Never execute trusted merge or trusted knowledge write from this engine.",
      "For high-risk building/legal/code claims, require official source review and professional/local authority verification.",
    ],
  };
}

export function buildSourceWatchAwarenessPromptBlock(engine: ReturnType<typeof buildSourceWatchAwarenessEngine>) {
  if (!engine.available) {
    return [
      "## Source Watch Live Update Awareness",
      "- Status: inbox unavailable.",
      "- Policy: do not claim latest source-watch status.",
    ].join("\n");
  }

  if (!engine.triggered && engine.pendingSourceUpdateDrafts <= 0 && engine.latestChangedSources <= 0) {
    return [
      "## Source Watch Live Update Awareness",
      `- Last checked: ${engine.latestCheckedAt || "unknown"}`,
      "- No relevant pending source update awareness needs to be surfaced for this query.",
      "- Trusted knowledge write: false",
      "- Trusted merge executed: false",
    ].join("\n");
  }

  const lines = [
    "## Source Watch Live Update Awareness",
    `- Inbox generated at: ${engine.generatedAt || "unknown"}`,
    `- Last source check: ${engine.latestCheckedAt || "unknown"}`,
    `- Watch sources: ${engine.sourceCount}`,
    `- Pending source update drafts: ${engine.pendingSourceUpdateDrafts}`,
    `- Latest changed sources: ${engine.latestChangedSources}`,
    `- Latest failed source checks: ${engine.latestFailedSources}`,
    "- Safety: this is awareness only, not trusted merged knowledge.",
    `- Trusted knowledge write: ${engine.safety.trustedKnowledgeWrite}`,
    `- Trusted merge executed: ${engine.safety.trustedMergeExecuted}`,
    `- Merge action available: ${engine.safety.mergeActionAvailable}`,
  ];

  if (engine.latestChanged.length) {
    lines.push("", "Latest changed source signals:");
    for (const item of engine.latestChanged) {
      lines.push(`- ${item.title || item.id}: ${item.reason || "changed"} — ${item.url || "URL unavailable"}`);
    }
  }

  if (engine.pendingDrafts.length) {
    lines.push("", "Pending source update drafts:");
    for (const item of engine.pendingDrafts) {
      lines.push(`- ${item.title || "Untitled source update"} | status=${item.status || "unknown"} | risk=${item.riskLevel || "unknown"}`);
    }
  }

  if (engine.latestFailed.length) {
    lines.push("", "Latest failed source checks:");
    for (const item of engine.latestFailed) {
      lines.push(`- ${item.title || item.id}: ${item.error || "fetch failed"}`);
    }
  }

  lines.push(
    "",
    "Agent response rules:",
    "- If user asks about latest/current building rules, official sources, material rates, byelaws, codes or approvals, mention that source-watch has pending review items when applicable.",
    "- Do not present pending source-watch drafts as final verified rules.",
    "- Keep final compliance/legal/professional claims bounded to reviewed trusted knowledge and official verification."
  );

  return lines.join("\n");
}
