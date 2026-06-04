import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export const runtime = "nodejs";

type JsonObject = Record<string, any>;

async function readBuildSetuJson(filePath: string, fallback: JsonObject) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function countWatchedSources(sourcePacks: JsonObject) {
  let total = 0;
  let watched = 0;

  for (const pack of sourcePacks?.packs || []) {
    for (const source of pack?.sources || []) {
      total += 1;
      if (source?.watch) watched += 1;
    }
  }

  return { total, watched };
}

function summarizeDomains(taxonomy: JsonObject) {
  return (taxonomy?.domains || []).map((domain: JsonObject) => ({
    id: domain.id,
    title: domain.title,
    reviewLevel: domain.reviewLevel,
    scope: domain.scope || [],
    outputUse: domain.outputUse || [],
  }));
}

function summarizePacks(sourcePacks: JsonObject) {
  return (sourcePacks?.packs || []).map((pack: JsonObject) => ({
    id: pack.id,
    title: pack.title,
    domains: pack.domains || [],
    priority: pack.priority || "medium",
    status: pack.status || "unknown",
    sourceCount: Array.isArray(pack.sources) ? pack.sources.length : 0,
    watchedSourceCount: Array.isArray(pack.sources)
      ? pack.sources.filter((source: JsonObject) => source?.watch).length
      : 0,
    plannedTopics: pack.plannedTopics || [],
    disclaimer: pack.disclaimer || "",
  }));
}

export async function GET(request: NextRequest) {
  // BUILDSETU_KNOWLEDGE_TAXONOMY_API_V1
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "LOGIN_REQUIRED" },
      { status: 401 },
    );
  }

  const root = process.cwd();

  const taxonomyPath = path.join(root, "config/buildsetu-knowledge-taxonomy.json");
  const sourcePacksPath = path.join(root, "config/buildsetu-source-packs.json");
  const sourceWatchPath = path.join(root, "config/buildsetu-source-watch.sources.json");

  const taxonomy = await readBuildSetuJson(taxonomyPath, { version: 0, domains: [] });
  const sourcePacks = await readBuildSetuJson(sourcePacksPath, { version: 0, packs: [] });
  const sourceWatch = await readBuildSetuJson(sourceWatchPath, { version: 0, sources: [] });

  const watchedCounts = countWatchedSources(sourcePacks);

  return NextResponse.json({
    ok: true,
    code: "BUILDSETU_KNOWLEDGE_TAXONOMY",
    taxonomy: {
      version: taxonomy.version || 0,
      description: taxonomy.description || "",
      safetyPolicy: taxonomy.safetyPolicy || {},
      domainCount: Array.isArray(taxonomy.domains) ? taxonomy.domains.length : 0,
      domains: summarizeDomains(taxonomy),
    },
    sourcePacks: {
      version: sourcePacks.version || 0,
      description: sourcePacks.description || "",
      autoUpdatePolicy: sourcePacks.autoUpdatePolicy || {},
      packCount: Array.isArray(sourcePacks.packs) ? sourcePacks.packs.length : 0,
      watchedSourceCount: watchedCounts.watched,
      totalSourceCount: watchedCounts.total,
      packs: summarizePacks(sourcePacks),
    },
    sourceWatcher: {
      version: sourceWatch.version || 0,
      sourceCount: Array.isArray(sourceWatch.sources) ? sourceWatch.sources.length : 0,
      sourcePackSync: sourceWatch.sourcePackSync || null,
      watchedSources: (sourceWatch.sources || []).map((source: JsonObject) => ({
        id: source.id,
        title: source.title,
        url: source.url,
        category: source.category,
        priority: source.priority,
        sourcePackId: source.sourcePackId || "",
        domains: source.domains || [],
        tags: source.tags || [],
      })),
    },
    updatedAt: new Date().toISOString(),
    userId: user.id,
  });
}
