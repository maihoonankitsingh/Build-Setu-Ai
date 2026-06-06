#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const WATCH_CONFIG_PATH = path.join(ROOT, "config/buildsetu-source-watch.sources.json");
const WATCH_STATE_PATH = path.join(ROOT, "data/buildsetu-source-watch/state.json");
const CHANGES_DIR = path.join(ROOT, "data/buildsetu-source-watch/changes");
const RESEARCH_DRAFTS_DIR = path.join(ROOT, "data/buildsetu-research/drafts");

const INBOX_DIR = path.join(ROOT, "data/buildsetu-source-watch/inbox");
const INBOX_JSON = path.join(INBOX_DIR, "latest.json");
const INBOX_MD = path.join(INBOX_DIR, "latest.md");

const AGENT_INBOX_DIR = path.join(ROOT, "data/agent-knowledge/source-watch");
const AGENT_INBOX_JSON = path.join(AGENT_INBOX_DIR, "latest-updates.json");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value, "utf8");
}

function clean(value, max = 2000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function listJsonFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => path.join(dir, name))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch {
    return [];
  }
}

function latestReports(limit = 10) {
  return listJsonFiles(CHANGES_DIR).slice(0, limit).map((file) => {
    const data = readJson(file, {});
    return {
      file: path.relative(ROOT, file),
      checkedAt: data.checkedAt || "",
      ok: data.ok === true,
      total: data.total || 0,
      changedCount: Array.isArray(data.changed) ? data.changed.length : 0,
      unchangedCount: Array.isArray(data.unchanged) ? data.unchanged.length : 0,
      failedCount: Array.isArray(data.failed) ? data.failed.length : 0,
      changed: (data.changed || []).map((item) => ({
        id: clean(item.id, 240),
        title: clean(item.title, 300),
        url: clean(item.url, 1400),
        reason: clean(item.reason, 160),
        draftId: clean(item.draftId, 260),
        draftFile: clean(item.draftFile, 1000),
      })),
      failed: (data.failed || []).map((item) => ({
        id: clean(item.id, 240),
        title: clean(item.title, 300),
        url: clean(item.url, 1400),
        error: clean(item.error, 500),
      })),
    };
  });
}

function sourceUpdateDrafts(limit = 50) {
  return listJsonFiles(RESEARCH_DRAFTS_DIR)
    .filter((file) => path.basename(file).includes("sourceupdate"))
    .slice(0, limit)
    .map((file) => {
      const data = readJson(file, {});
      return {
        file: path.relative(ROOT, file),
        id: clean(data.id, 260),
        status: clean(data.status, 120),
        category: clean(data.category, 120),
        riskLevel: clean(data.riskLevel, 120),
        title: clean(data?.source?.title || data.title, 300),
        url: clean(data?.source?.url || data?.source?.sourceUrl || data.url, 1400),
        sourceCitation: clean(data?.source?.sourceCitation, 1600),
        summary: clean(data?.extracted?.summary || data.summary, 1000),
        requiresProfessionalReview: data.requiresProfessionalReview === true,
        createdAt: clean(data.createdAt, 120),
        updatedAt: clean(data.updatedAt, 120),
        createdBy: clean(data.createdBy, 160),
        tags: Array.isArray(data.tags) ? data.tags.map((x) => clean(x, 120)).filter(Boolean) : [],
      };
    });
}

function stateSummary() {
  const state = readJson(WATCH_STATE_PATH, { sources: {} });
  const sources = Object.values(state.sources || {});

  let okCount = 0;
  let failedCount = 0;
  let changedReasonCount = {};

  for (const source of sources) {
    if (source?.ok === true) okCount += 1;
    else failedCount += 1;

    const reason = clean(source?.lastChangeReason || "unknown", 120);
    changedReasonCount[reason] = (changedReasonCount[reason] || 0) + 1;
  }

  const latestCheckedAt = sources
    .map((s) => clean(s?.checkedAt, 120))
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || "";

  return {
    sourceCount: sources.length,
    okCount,
    failedCount,
    latestCheckedAt,
    changeReasonBreakdown: changedReasonCount,
  };
}

function configSummary() {
  const config = readJson(WATCH_CONFIG_PATH, { sources: [] });
  const sources = Array.isArray(config.sources) ? config.sources : [];

  return {
    sourceCount: sources.length,
    watchEnabledCount: sources.length,
    updatedAt: clean(config.updatedAt, 120),
    updatedBy: clean(config.updatedBy, 160),
  };
}

function buildMarkdown(inbox) {
  const lines = [];

  lines.push("# BuildSetu Source Watch Live Update Inbox");
  lines.push("");
  lines.push(`- Generated At: ${inbox.generatedAt}`);
  lines.push(`- Watch Sources: ${inbox.config.sourceCount}`);
  lines.push(`- Last Source Check: ${inbox.state.latestCheckedAt || "unknown"}`);
  lines.push(`- Pending Source Update Drafts: ${inbox.pendingSourceUpdateDrafts.length}`);
  lines.push(`- Latest Report Changed Count: ${inbox.latestReport?.changedCount ?? 0}`);
  lines.push(`- Latest Report Failed Count: ${inbox.latestReport?.failedCount ?? 0}`);
  lines.push("");
  lines.push("Safety:");
  lines.push(`- Trusted Knowledge Write: ${inbox.safety.trustedKnowledgeWrite}`);
  lines.push(`- Trusted Merge Executed: ${inbox.safety.trustedMergeExecuted}`);
  lines.push(`- Merge Action Available: ${inbox.safety.mergeActionAvailable}`);
  lines.push("");

  lines.push("## Latest Changed Sources");
  if (!inbox.latestReport?.changed?.length) {
    lines.push("");
    lines.push("No latest changed sources detected in the latest report.");
  } else {
    lines.push("");
    for (const item of inbox.latestReport.changed) {
      lines.push(`- ${item.title || item.id}`);
      lines.push(`  - Reason: ${item.reason}`);
      lines.push(`  - URL: ${item.url}`);
      lines.push(`  - Draft: ${item.draftFile || item.draftId}`);
    }
  }

  lines.push("");
  lines.push("## Pending Source Update Drafts");
  if (!inbox.pendingSourceUpdateDrafts.length) {
    lines.push("");
    lines.push("No pending source update drafts found.");
  } else {
    lines.push("");
    for (const draft of inbox.pendingSourceUpdateDrafts.slice(0, 20)) {
      lines.push(`- ${draft.title || draft.id}`);
      lines.push(`  - Status: ${draft.status}`);
      lines.push(`  - Risk: ${draft.riskLevel}`);
      lines.push(`  - URL: ${draft.url}`);
      lines.push(`  - File: ${draft.file}`);
    }
  }

  lines.push("");
  lines.push("## Agent Use Policy");
  lines.push("");
  lines.push("- Treat these updates as awareness signals only.");
  lines.push("- Do not use unreviewed source changes as final building-code/legal/compliance claims.");
  lines.push("- Convert updates to review drafts, QA them, then merge only through approved trusted merge flow.");
  lines.push("- Keep trustedKnowledgeWrite=false and trustedMergeExecuted=false until explicit reviewed merge.");

  return lines.join("\n") + "\n";
}

function main() {
  const reports = latestReports(10);
  const drafts = sourceUpdateDrafts(50);
  const latestReport = reports[0] || null;

  const inbox = {
    schema: "buildsetu-source-watch-live-inbox-v1",
    generatedAt: new Date().toISOString(),
    purpose: "Agent-readable source update awareness inbox. This is not trusted knowledge.",
    config: configSummary(),
    state: stateSummary(),
    latestReport,
    recentReports: reports,
    pendingSourceUpdateDrafts: drafts.filter((draft) => draft.status !== "merged" && draft.status !== "approved"),
    latestSourceUpdateDrafts: drafts.slice(0, 20),
    agentInstructions: [
      "Read this inbox before answering questions that depend on current building rules, source updates, government byelaws, codes, standards, material rates or official references.",
      "If pending source updates exist, mention that updates are pending review before giving final guidance.",
      "Never treat source-watch alerts as trusted knowledge until QA and trusted merge are completed.",
      "Use source URL, source citation, checkedAt and draft status when explaining update status."
    ],
    safety: {
      trustedKnowledgeWrite: false,
      trustedKnowledgeChanged: false,
      trustedMergeExecuted: false,
      mergeActionAvailable: false,
      sourceRegistryChanged: false,
      autoMerge: false,
      requiresHumanReview: true
    }
  };

  writeJson(INBOX_JSON, inbox);
  writeText(INBOX_MD, buildMarkdown(inbox));
  writeJson(AGENT_INBOX_JSON, {
    schema: inbox.schema,
    generatedAt: inbox.generatedAt,
    purpose: inbox.purpose,
    summary: {
      sourceCount: inbox.config.sourceCount,
      latestCheckedAt: inbox.state.latestCheckedAt,
      pendingSourceUpdateDrafts: inbox.pendingSourceUpdateDrafts.length,
      latestChangedSources: inbox.latestReport?.changedCount || 0,
      latestFailedSources: inbox.latestReport?.failedCount || 0
    },
    latestReport: inbox.latestReport,
    pendingSourceUpdateDrafts: inbox.pendingSourceUpdateDrafts.slice(0, 20),
    agentInstructions: inbox.agentInstructions,
    safety: inbox.safety
  });

  console.log(JSON.stringify({
    ok: true,
    inboxJson: path.relative(ROOT, INBOX_JSON),
    inboxMarkdown: path.relative(ROOT, INBOX_MD),
    agentInboxJson: path.relative(ROOT, AGENT_INBOX_JSON),
    sourceCount: inbox.config.sourceCount,
    latestCheckedAt: inbox.state.latestCheckedAt,
    pendingSourceUpdateDrafts: inbox.pendingSourceUpdateDrafts.length,
    latestChangedSources: inbox.latestReport?.changedCount || 0,
    latestFailedSources: inbox.latestReport?.failedCount || 0,
    trustedKnowledgeWrite: false,
    trustedMergeExecuted: false,
    mergeActionAvailable: false
  }, null, 2));
}

main();
