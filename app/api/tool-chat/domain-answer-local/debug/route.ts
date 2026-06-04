import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getUserFromSession } from "@/lib/auth-store";

export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

async function readJson(filePath: string, fallback: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function cleanText(value: unknown, max = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function countBy(items: AnyRecord[], key: string) {
  const counts: Record<string, number> = {};

  for (const item of items || []) {
    const value = cleanText(item?.[key] || "unknown", 100) || "unknown";
    counts[value] = (counts[value] || 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1]),
  );
}

function coverageByDomain(taxonomyDomains: AnyRecord[], seeds: AnyRecord[]) {
  const seedDomains = new Set(seeds.map((item: AnyRecord) => String(item?.domain || "")));
  return taxonomyDomains.map((domain: AnyRecord) => {
    const id = String(domain?.id || "");
    return {
      id,
      title: domain?.title || id,
      hasSeed: seedDomains.has(id),
      seedCount: seeds.filter((item: AnyRecord) => String(item?.domain || "") === id).length,
      reviewLevel: domain?.reviewLevel || "",
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    // BUILDSETU_DOMAIN_ANSWER_LOCAL_DEBUG_API_V1
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "LOGIN_REQUIRED" },
        { status: 401 },
      );
    }

    const root = process.cwd();
    const taxonomy = await readJson(path.join(root, "config/buildsetu-knowledge-taxonomy.json"), { domains: [] });
    const seedsConfig = await readJson(path.join(root, "config/buildsetu-domain-knowledge-seeds.json"), { items: [] });
    const sourcePacks = await readJson(path.join(root, "config/buildsetu-source-packs.json"), { packs: [] });
    const sourceWatch = await readJson(path.join(root, "config/buildsetu-source-watch.sources.json"), { sources: [] });

    const taxonomyDomains = Array.isArray(taxonomy?.domains) ? taxonomy.domains : [];
    const seeds = Array.isArray(seedsConfig?.items) ? seedsConfig.items : [];
    const packs = Array.isArray(sourcePacks?.packs) ? sourcePacks.packs : [];
    const watchSources = Array.isArray(sourceWatch?.sources) ? sourceWatch.sources : [];

    return NextResponse.json({
      ok: true,
      code: "BUILDSETU_DOMAIN_ANSWER_LOCAL_DEBUG",
      summary: {
        taxonomyDomainCount: taxonomyDomains.length,
        seedItemCount: seeds.length,
        sourcePackCount: packs.length,
        watchedSourceCount: watchSources.length,
        seedSourceTypeCounts: countBy(seeds, "sourceType"),
        seedDomainCounts: countBy(seeds, "domain"),
      },
      coverage: coverageByDomain(taxonomyDomains, seeds),
      seeds: seeds.map((item: AnyRecord) => ({
        id: item.id,
        domain: item.domain,
        sourceType: item.sourceType,
        title: item.title,
        tags: item.tags || [],
        sourceCitation: item.sourceCitation || "",
        warnings: item?.extracted?.warnings || [],
      })),
      sourcePacks: packs.map((pack: AnyRecord) => ({
        id: pack.id,
        title: pack.title,
        domains: pack.domains || [],
        status: pack.status || "",
        sourceCount: Array.isArray(pack.sources) ? pack.sources.length : 0,
        watchedSourceCount: Array.isArray(pack.sources)
          ? pack.sources.filter((source: AnyRecord) => source?.watch).length
          : 0,
      })),
      updatedAt: new Date().toISOString(),
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "DOMAIN_ANSWER_LOCAL_DEBUG_FAILED" },
      { status: 500 },
    );
  }
}
