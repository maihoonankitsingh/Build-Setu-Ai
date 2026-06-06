import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRAFT_DIR = path.join(ROOT, "data/buildsetu-research/drafts");
const OUT_DIR = path.join(ROOT, "data/buildsetu-source-watch/quality-gate");
const OUT_FILE = path.join(OUT_DIR, "latest.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function listDrafts(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name))
    .sort();
}

function safeUrl(value) {
  try {
    return new URL(String(value || ""));
  } catch {
    return null;
  }
}

function parseNotes(notes) {
  if (!notes) return null;
  if (typeof notes === "object") return notes;
  if (typeof notes !== "string") return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

function normalizedPath(urlObj) {
  const p = (urlObj?.pathname || "/").replace(/\/+$/, "");
  return p || "/";
}

function shouldQuarantineSourceUpdate(draft) {
  if (draft?.category !== "sourceUpdate") return null;
  if (draft?.status !== "pending_review") return null;

  const sourceUrl = draft?.source?.sourceUrl || draft?.source?.url || "";
  const source = safeUrl(sourceUrl);
  const notes = parseNotes(draft?.notes);
  const currentFinal = safeUrl(notes?.current?.finalUrl || "");
  const currentStatus = notes?.current?.status;
  const reason = notes?.reason || "";

  const sourcePath = normalizedPath(source);
  const finalPath = normalizedPath(currentFinal);

  if (!source) {
    return {
      code: "invalid_source_url",
      reason: "Source URL is missing or invalid.",
      severity: "medium"
    };
  }

  if (currentStatus && Number(currentStatus) >= 300) {
    return {
      code: "non_200_current_status",
      reason: `Current fetch status is ${currentStatus}; update cannot be trusted as content change.`,
      severity: "medium"
    };
  }

  if (currentFinal && source.hostname !== currentFinal.hostname) {
    return {
      code: "host_changed_after_redirect",
      reason: `Fetch final host changed from ${source.hostname} to ${currentFinal.hostname}.`,
      severity: "high"
    };
  }

  if (currentFinal && sourcePath !== "/" && !finalPath.startsWith(sourcePath)) {
    return {
      code: "path_changed_after_redirect",
      reason: `Fetch final path ${finalPath} does not match intended source path ${sourcePath}.`,
      severity: "high"
    };
  }

  const isHomepageSource = sourcePath === "/";
  const weakReason = ["content_hash_changed", "last_modified_changed"].includes(reason);

  if (isHomepageSource && weakReason) {
    return {
      code: "homepage_hash_or_last_modified_only",
      reason: "Root homepage hash/last-modified changed; this is not enough to create a trusted building-code update.",
      severity: "medium"
    };
  }

  return null;
}

const files = listDrafts(DRAFT_DIR);
const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  scannedDrafts: files.length,
  quarantined: [],
  keptPending: [],
  skipped: []
};

for (const file of files) {
  let draft;
  try {
    draft = readJson(file);
  } catch (err) {
    report.skipped.push({ file: path.relative(ROOT, file), reason: `json_read_failed: ${err.message}` });
    continue;
  }

  const quarantine = shouldQuarantineSourceUpdate(draft);
  if (!quarantine) {
    if (draft?.category === "sourceUpdate" && draft?.status === "pending_review") {
      report.keptPending.push({
        file: path.relative(ROOT, file),
        id: draft.id || null,
        title: draft?.source?.title || draft.title || null
      });
    }
    continue;
  }

  const beforeStatus = draft.status;
  draft.status = "needs_source_url_review";
  draft.updatedAt = new Date().toISOString();
  draft.qualityGate = {
    quarantined: true,
    quarantinedAt: draft.updatedAt,
    previousStatus: beforeStatus,
    code: quarantine.code,
    reason: quarantine.reason,
    severity: quarantine.severity,
    policy: "Do not show as active pending source-update draft until exact source URL and final fetched content are manually verified."
  };

  draft.extracted = draft.extracted || {};
  draft.extracted.cautions = Array.isArray(draft.extracted.cautions) ? draft.extracted.cautions : [];
  const caution = `Quality gate quarantine: ${quarantine.reason}`;
  if (!draft.extracted.cautions.includes(caution)) {
    draft.extracted.cautions.push(caution);
  }

  writeJson(file, draft);

  report.quarantined.push({
    file: path.relative(ROOT, file),
    id: draft.id || null,
    title: draft?.source?.title || draft.title || null,
    code: quarantine.code,
    reason: quarantine.reason
  });
}

writeJson(OUT_FILE, report);
console.log(JSON.stringify(report, null, 2));
