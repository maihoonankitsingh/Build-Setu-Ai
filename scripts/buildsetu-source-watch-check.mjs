#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "config/buildsetu-source-watch.sources.json");
const STATE_DIR = path.join(ROOT, "data/buildsetu-source-watch");
const STATE_PATH = path.join(STATE_DIR, "state.json");
const CHANGES_DIR = path.join(STATE_DIR, "changes");
const DRAFTS_DIR = path.join(ROOT, "data/buildsetu-research/drafts");

const FORCE_ALERT = process.env.BUILDSETU_SOURCE_WATCH_FORCE_ALERT === "1";
const DRY_RUN = process.argv.includes("--dry-run");

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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "source";
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeId() {
  return crypto.randomBytes(4).toString("hex");
}

function dateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 BuildSetuSourceWatch/1.0",
        "accept": "text/html,application/pdf,application/xhtml+xml,text/plain,*/*",
      },
    });

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = sha256(buffer);

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get("content-type") || "",
      etag: res.headers.get("etag") || "",
      lastModified: res.headers.get("last-modified") || "",
      contentLengthHeader: res.headers.get("content-length") || "",
      bytes: buffer.length,
      hash,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildChangeDraft(source, previous, current, reason) {
  const now = new Date().toISOString();
  const id = `draft_${dateStamp()}_sourceupdate_${slugify(source.id)}_${safeId()}`;

  return {
    id,
    status: "pending_review",
    category: "sourceUpdate",
    riskLevel: "medium",
    requiresProfessionalReview: true,
    jurisdiction: {
      country: source.country || "IN",
      stateOrProvinceOrEmirate: "unknown",
      cityOrAuthority: "unknown"
    },
    source: {
      title: source.title,
      url: source.url,
      sourceUrl: source.url,
      sourceType: source.sourceType || "official_primary",
      sourceCitation: `${source.title} — ${source.url}`,
      tags: ["source_watch", "pending_review", ...(source.tags || [])],
      publisher: "trusted source watch",
      dateAccessed: now.slice(0, 10),
      effectiveDate: "unknown",
      version: "unknown"
    },
    extracted: {
      summary: `Source watcher detected a possible update for ${source.title}. Review the source before merging new facts into BuildSetu knowledge.`,
      checklist: [
        "Open source URL manually",
        "Compare updated content with previous known version",
        "Extract only verified construction/planning/interior/exterior facts",
        "Create or update reviewed knowledge entry",
        "Do not use unreviewed changed content for final professional claims"
      ],
      requiredDocuments: [],
      processSteps: [
        "Source watcher checks trusted source",
        "Change alert draft is created",
        "Human review validates update",
        "Reviewed update is merged into agent knowledge"
      ],
      cautions: [
        "This is an update alert, not automatically trusted knowledge.",
        "Do not treat detected source change as final regulation until reviewed."
      ],
      blockedClaims: [
        "Do not claim updated legal/building-code requirements without review."
      ]
    },
    confidence: "medium",
    mergeTarget: "data/buildsetu-knowledge/*.json",
    tags: ["source_watch", "pending_review", source.category || "source_update", ...(source.tags || [])],
    smokeTestsRequired: [],
    createdBy: "BuildSetu Source Watcher",
    notes: JSON.stringify({ reason, previous, current }, null, 2),
    createdAt: now,
    updatedAt: now
  };
}

function writeDraft(draft, source) {
  ensureDir(DRAFTS_DIR);
  const file = path.join(DRAFTS_DIR, `${draft.id}_${slugify(source.id)}.json`);
  writeJson(file, draft);
  return file;
}

async function main() {
  ensureDir(STATE_DIR);
  ensureDir(CHANGES_DIR);

  const config = readJson(CONFIG_PATH, null);
  if (!config || !Array.isArray(config.sources)) {
    throw new Error(`Invalid config: ${CONFIG_PATH}`);
  }

  const state = readJson(STATE_PATH, { version: 1, sources: {} });
  const report = {
    ok: true,
    checkedAt: new Date().toISOString(),
    forceAlert: FORCE_ALERT,
    dryRun: DRY_RUN,
    total: config.sources.length,
    changed: [],
    unchanged: [],
    failed: []
  };

  for (const source of config.sources) {
    try {
      const current = await fetchSource(source);
      const previous = state.sources[source.id] || null;

      let changed = false;
      let reason = "initial_baseline";

      if (!previous) {
        changed = FORCE_ALERT;
        reason = FORCE_ALERT ? "forced_initial_alert" : "initial_baseline";
      } else if (previous.hash !== current.hash) {
        changed = true;
        reason = "content_hash_changed";
      } else if ((previous.etag || "") !== (current.etag || "") && current.etag) {
        changed = true;
        reason = "etag_changed";
      } else if ((previous.lastModified || "") !== (current.lastModified || "") && current.lastModified) {
        changed = true;
        reason = "last_modified_changed";
      }

      state.sources[source.id] = {
        id: source.id,
        title: source.title,
        url: source.url,
        category: source.category,
        priority: source.priority,
        ...current,
        lastChangeReason: changed ? reason : previous?.lastChangeReason || "none"
      };

      if (changed) {
        const draft = buildChangeDraft(source, previous, current, reason);
        const draftFile = DRY_RUN ? "" : writeDraft(draft, source);

        report.changed.push({
          id: source.id,
          title: source.title,
          url: source.url,
          reason,
          draftId: draft.id,
          draftFile
        });
      } else {
        report.unchanged.push({ id: source.id, title: source.title, url: source.url });
      }
    } catch (error) {
      report.failed.push({
        id: source.id,
        title: source.title,
        url: source.url,
        error: cleanText(error?.message || error)
      });
    }
  }

  if (!DRY_RUN) {
    writeJson(STATE_PATH, state);
  }

  const reportFile = path.join(CHANGES_DIR, `source-watch-report-${dateStamp()}.json`);
  if (!DRY_RUN) {
    writeJson(reportFile, report);
  }

  console.log(JSON.stringify({ ...report, reportFile: DRY_RUN ? "" : reportFile }, null, 2));

  if (report.failed.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
