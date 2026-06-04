#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PACKS_PATH = path.join(ROOT, "config/buildsetu-source-packs.json");
const WATCH_PATH = path.join(ROOT, "config/buildsetu-source-watch.sources.json");
const DRY_RUN = process.argv.includes("--dry-run");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function cleanArray(values) {
  return Array.from(new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean)));
}

function normalizeSource(source, pack) {
  return {
    id: source.id,
    title: source.title,
    category: source.category || pack.domains?.[0] || "source_update",
    priority: source.priority || pack.priority || "medium",
    country: source.country || "IN",
    sourceType: source.sourceType || "official_primary",
    url: source.url,
    sourcePackId: pack.id,
    sourcePackTitle: pack.title,
    domains: cleanArray([...(pack.domains || []), ...(source.domains || [])]),
    tags: cleanArray(["source_pack", pack.id, ...(pack.domains || []), ...(source.tags || [])])
  };
}

function main() {
  const packsConfig = readJson(PACKS_PATH, null);
  if (!packsConfig || !Array.isArray(packsConfig.packs)) {
    throw new Error(`Invalid source pack config: ${PACKS_PATH}`);
  }

  const watchConfig = readJson(WATCH_PATH, {
    version: 1,
    description: "BuildSetu trusted source watch registry.",
    sources: []
  });

  if (!Array.isArray(watchConfig.sources)) watchConfig.sources = [];

  const byId = new Map(watchConfig.sources.map((source) => [source.id, source]));
  const added = [];
  const updated = [];
  const unchanged = [];
  const skipped = [];

  for (const pack of packsConfig.packs) {
    for (const source of pack.sources || []) {
      if (!source.watch) {
        skipped.push({ id: source.id, reason: "watch_false", packId: pack.id });
        continue;
      }

      if (!source.id || !source.url || !source.title) {
        skipped.push({ id: source.id || "missing_id", reason: "missing_required_fields", packId: pack.id });
        continue;
      }

      const normalized = normalizeSource(source, pack);
      const existing = byId.get(normalized.id);

      if (!existing) {
        byId.set(normalized.id, normalized);
        added.push(normalized.id);
        continue;
      }

      const merged = {
        ...existing,
        ...normalized,
        tags: cleanArray([...(existing.tags || []), ...(normalized.tags || [])]),
        domains: cleanArray([...(existing.domains || []), ...(normalized.domains || [])])
      };

      if (JSON.stringify(existing) !== JSON.stringify(merged)) {
        byId.set(normalized.id, merged);
        updated.push(normalized.id);
      } else {
        unchanged.push(normalized.id);
      }
    }
  }

  const nextConfig = {
    ...watchConfig,
    version: watchConfig.version || 1,
    description: watchConfig.description || "BuildSetu trusted source watch registry.",
    sources: Array.from(byId.values()).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    sourcePackSync: {
      enabled: true,
      lastSyncedAt: new Date().toISOString(),
      autoMerge: false,
      reviewRequired: true
    }
  };

  if (!DRY_RUN) writeJson(WATCH_PATH, nextConfig);

  console.log(JSON.stringify({
    ok: true,
    dryRun: DRY_RUN,
    packs: packsConfig.packs.length,
    totalWatchSources: nextConfig.sources.length,
    added,
    updated,
    unchanged,
    skipped
  }, null, 2));
}

main();
