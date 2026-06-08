import fs from "fs/promises";
import path from "path";
import { runUniversalPlanningAgent } from "@/lib/planning/universal-planning-agent";
import { createLockedWorkingDrawingAssets } from "@/lib/planning/locked-working-drawing-assets";

const DATA_ROOT = path.join(process.cwd(), "data");
const DATA_DIR = path.join(process.cwd(), "data", "generated");
const ASSETS_FILE = path.join(DATA_DIR, "project-assets.json");
const LOCKS_FILE = path.join(DATA_DIR, "project-plan-locks.json");

type LockedPlan = {
  id: string;
  projectId: string;
  projectTitle: string;
  lockedAt: string;
  source: "project_plan_lock_v1";
  baseAsset: any;
  basePlan: any;
  baseImageUrl: string;
  basePublicUrl: string;
  planFingerprint: string;
  lockRules: string[];
};

function safe(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function makeId(projectId: string) {
  return `plan-lock-${projectId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJson(file: string, fallback: any) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: any) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.assets)) return value.assets;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function toGeneratedApiUrl(value: unknown) {
  const raw = safe(value);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/api/ai/generated-image")) return raw;
  if (raw.startsWith("/generated/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(raw.replace(/^\/+/, ""))}`;
  }
  if (raw.startsWith("generated/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(raw)}`;
  }
  if (raw.startsWith("data/generated/")) {
    return `/api/ai/generated-image?file=${encodeURIComponent(raw.replace(/^data\//, ""))}`;
  }
  return raw;
}

function fileToAbs(value: unknown) {
  const raw = safe(value).replace(/^\/+/, "");
  if (!raw) return "";

  if (raw.startsWith("data/")) return path.join(process.cwd(), raw);
  if (raw.startsWith("generated/")) return path.join(DATA_ROOT, raw);
  if (raw.startsWith("ai-images/")) return path.join(DATA_DIR, raw);

  return path.join(DATA_DIR, raw);
}

function isFloorPlanAsset(asset: any) {
  const text = JSON.stringify(asset || {}).toLowerCase();
  return (
    text.includes("floor-plan-ai") ||
    text.includes("floor_plan") ||
    text.includes("floor-plan") ||
    text.includes("exact-floor-plan") ||
    text.includes("presentation-floor-plan")
  );
}

function assetProjectMatches(asset: any, projectId: string) {
  const pid = safe(projectId);
  if (!pid) return false;

  // STRICT_PROJECT_ASSET_MATCH_V1
  // Never use substring/JSON-wide matching here.
  // Example: projectId "test-project" must NOT match
  // "test-project-41x51-v8-floorfix".
  const candidates = [
    asset?.projectId,
    asset?.project?.id,
    asset?.asset?.projectId,
    asset?.metadata?.projectId,
    asset?.context?.projectId,
  ]
    .map((value) => safe(value))
    .filter(Boolean);

  return candidates.some((candidate) => candidate === pid);
}

function assetTime(asset: any) {
  const created = Date.parse(safe(asset?.createdAt));
  if (Number.isFinite(created)) return created;

  const idMatch = safe(asset?.id).match(/\d{10,}/);
  if (idMatch) return Number(idMatch[0]);

  const fileMatch = safe(asset?.file || asset?.imageUrl || asset?.publicUrl).match(/\d{10,}/);
  if (fileMatch) return Number(fileMatch[0]);

  return 0;
}

async function readLatestExactPlanJson(projectId: string, asset: any) {
  const candidates = [
    asset?.plan,
    asset?.exact?.plan,
    asset?.raw?.plan,
    asset?.output?.plan,
  ].filter(Boolean);

  if (candidates[0]) return candidates[0];

  const projectDir = path.join(DATA_DIR, "ai-images", projectId);

  try {
    const files = await fs.readdir(projectDir);
    const jsonFiles = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      if (!file.includes("exact-floor-plan")) continue;

      const abs = path.join(projectDir, file);
      const stat = await fs.stat(abs);
      jsonFiles.push({ abs, mtime: stat.mtimeMs });
    }

    jsonFiles.sort((a, b) => b.mtime - a.mtime);

    for (const item of jsonFiles) {
      const parsed = await readJson(item.abs, null);
      if (parsed?.plan) return parsed.plan;
      if (parsed?.title || parsed?.rooms || parsed?.widthFt) return parsed;
    }
  } catch {}

  return {
    title: asset?.title || asset?.viewLabel || "Locked Floor Plan",
    subtitle: asset?.subtitle || "",
    widthFt: asset?.widthFt || "",
    depthFt: asset?.depthFt || "",
    facing: asset?.facing || "",
    rooms: asset?.rooms || [],
  };
}

async function readAssets() {
  const parsed = await readJson(ASSETS_FILE, []);
  return asArray(parsed);
}

async function readLocks(): Promise<Record<string, LockedPlan>> {
  const parsed = await readJson(LOCKS_FILE, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

async function writeLocks(locks: Record<string, LockedPlan>) {
  await writeJson(LOCKS_FILE, locks);
}

export async function getProjectPlanLock(projectId: string) {
  const locks = await readLocks();
  return locks[safe(projectId)] || null;
}


// BUILDSETU_BRIEF_ALIGNED_PLAN_LOCK_V1
function bsToNumber(value: any, fallback = 0): number {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function bsRound(value: number) {
  return Math.round(value * 10) / 10;
}

function bsClamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function bsText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function bsAssetPrompt(asset: any) {
  return bsText([
    asset?.prompt,
    asset?.summary,
    asset?.description,
    asset?.title,
    asset?.label,
  ].filter(Boolean).join(" "));
}

function bsParsePlotFromAsset(asset: any, rawBasePlan: any) {
  const text = bsAssetPrompt(asset);

  let width = bsToNumber(asset?.widthFt || rawBasePlan?.widthFt || rawBasePlan?.plotWidthFt, 0);
  let depth = bsToNumber(asset?.depthFt || rawBasePlan?.depthFt || rawBasePlan?.plotDepthFt, 0);

  const plotMatch =
    text.match(/Plot Size:\s*([0-9.]+)\s*x\s*([0-9.]+)\s*ft/i) ||
    text.match(/Plot:\s*([0-9.]+)\s*x\s*([0-9.]+)\s*ft/i) ||
    text.match(/([0-9.]+)\s*x\s*([0-9.]+)\s*ft/i);

  if (plotMatch) {
    width = bsToNumber(plotMatch[1], width);
    depth = bsToNumber(plotMatch[2], depth);
  }

  if (!width) width = 30;
  if (!depth) depth = 40;

  return {
    widthFt: width,
    depthFt: depth,
  };
}

function bsParseFacingFromAsset(asset: any, rawBasePlan: any) {
  const text = bsAssetPrompt(asset);
  const match = text.match(/Facing:\s*([A-Za-z-]+)/i);
  return bsText(match?.[1] || rawBasePlan?.facing || "North").toLowerCase();
}

function bsParseCountFromAsset(asset: any, rawBasePlan: any, kind: "bedroom" | "bathroom") {
  const text = bsAssetPrompt(asset);

  if (kind === "bedroom") {
    const match =
      text.match(/Bedrooms:\s*([0-9]+)/i) ||
      text.match(/bedrooms=([0-9]+)/i) ||
      text.match(/([0-9]+)\s*bedrooms?/i);
    return bsClamp(bsToNumber(match?.[1], bsToNumber(rawBasePlan?.bedrooms, 2)), 1, 8);
  }

  const match =
    text.match(/Bathrooms\/Toilets:\s*([0-9]+)/i) ||
    text.match(/Bathrooms:\s*([0-9]+)/i) ||
    text.match(/bathrooms=([0-9]+)/i) ||
    text.match(/([0-9]+)\s*(?:bathrooms?|toilets?|washrooms?)/i);

  return bsClamp(bsToNumber(match?.[1], bsToNumber(rawBasePlan?.bathrooms || rawBasePlan?.toilets, 1)), 1, 8);
}

function bsRequiredSpacesFromAsset(asset: any) {
  const text = bsAssetPrompt(asset);
  const match = text.match(/Required Spaces:\s*(.*?)(?:Client Notes:|USER REQUEST:|MANDATORY RULES:|PROJECT CONTEXT:|$)/i);
  const raw = bsText(match?.[1] || "");

  const spaces = raw
    .split(/,|\||;/)
    .map((item) => bsText(item).toLowerCase())
    .filter(Boolean);

  return {
    living: spaces.some((s) => /living|drawing/.test(s)) || /living room|drawing room/i.test(text),
    kitchen: spaces.some((s) => /kitchen/.test(s)) || /kitchen/i.test(text),
    parking: spaces.some((s) => /parking|porch/.test(s)) || /parking/i.test(text),
    puja: spaces.some((s) => /puja|mandir|temple/.test(s)) || /puja room|mandir/i.test(text),
    staircase: spaces.some((s) => /stair/.test(s)) || /staircase/i.test(text),
    wash: spaces.some((s) => /wash|utility/.test(s)) || /wash area|utility/i.test(text),
  };
}

function bsFitRoom(room: any, widthFt: number, depthFt: number) {
  const x = bsClamp(bsToNumber(room.x, 0), 0, widthFt - 1);
  const y = bsClamp(bsToNumber(room.y, 0), 0, depthFt - 1);
  const w = bsClamp(bsToNumber(room.w, 1), 1, Math.max(1, widthFt - x));
  const h = bsClamp(bsToNumber(room.h, 1), 1, Math.max(1, depthFt - y));

  return {
    ...room,
    x: bsRound(x),
    y: bsRound(y),
    w: bsRound(w),
    h: bsRound(h),
  };
}

function bsBuildBriefAlignedRooms(input: {
  widthFt: number;
  depthFt: number;
  bedrooms: number;
  bathrooms: number;
  spaces: ReturnType<typeof bsRequiredSpacesFromAsset>;
}) {
  const W = input.widthFt;
  const D = input.depthFt;
  const rooms: any[] = [];

  const leftW = bsClamp(bsRound(W * 0.42), 10, Math.max(11, W - 10));
  const rightW = bsRound(W - leftW);
  const parkingH = bsClamp(bsRound(D * 0.25), 8, 12);

  if (input.spaces.parking) {
    rooms.push({ id: "parking", name: "PARKING / PORCH", x: 0, y: 0, w: leftW, h: parkingH, kind: "parking" });
  }

  if (input.spaces.living) {
    rooms.push({ id: "living", name: "LIVING ROOM", x: leftW, y: 0, w: rightW, h: bsClamp(bsRound(D * 0.30), 10, 14), kind: "living" });
  }

  const bedZoneStartY = input.spaces.parking ? parkingH : 0;
  const bedZoneH = Math.max(10, D - bedZoneStartY);
  const eachBedH = bsClamp(bsRound(bedZoneH / input.bedrooms), 9, 14);

  for (let i = 0; i < input.bedrooms; i++) {
    const y = bedZoneStartY + i * eachBedH;
    rooms.push({
      id: `bed${i + 1}`,
      name: input.bedrooms === 1 ? "BEDROOM" : `BEDROOM ${i + 1}`,
      x: 0,
      y,
      w: leftW,
      h: eachBedH,
      kind: "bedroom",
    });
  }

  if (input.spaces.kitchen) {
    rooms.push({ id: "kitchen", name: "KITCHEN", x: leftW, y: 12, w: bsRound(rightW * 0.55), h: 9, kind: "kitchen" });
  }

  for (let i = 0; i < input.bathrooms; i++) {
    rooms.push({
      id: `toilet${i + 1}`,
      name: input.bathrooms === 1 ? "TOILET" : `TOILET ${i + 1}`,
      x: leftW + bsRound(rightW * 0.55),
      y: 12 + i * 6,
      w: bsRound(rightW * 0.45),
      h: 6,
      kind: "toilet",
    });
  }

  if (input.spaces.puja) {
    rooms.push({ id: "puja", name: "PUJA ROOM", x: leftW, y: 21, w: bsClamp(bsRound(rightW * 0.28), 4, 6), h: 5, kind: "puja" });
  }

  if (input.spaces.staircase) {
    rooms.push({
      id: "stair",
      name: "STAIRCASE",
      x: leftW + bsRound(rightW * 0.55),
      y: input.bathrooms > 1 ? 24 : 18,
      w: bsRound(rightW * 0.45),
      h: 10,
      kind: "stair",
    });
  }

  if (input.spaces.wash) {
    rooms.push({ id: "wash", name: "WASH AREA", x: leftW, y: bsClamp(D - 9, 24, D - 3), w: bsRound(rightW * 0.55), h: 5, kind: "wash" });
  }

  rooms.push({ id: "passage", name: "PASSAGE", x: leftW, y: bsClamp(D - 7, 22, D - 2), w: rightW, h: 7, kind: "passage" });

  return rooms
    .map((room) => bsFitRoom(room, W, D))
    .filter((room) => room.w > 0 && room.h > 0);
}

function bsNormalizeLockedBasePlanFromBrief(args: {
  projectId: string;
  projectTitle: string;
  asset: any;
  rawBasePlan: any;
}) {
  const plot = bsParsePlotFromAsset(args.asset, args.rawBasePlan);
  const facing = bsParseFacingFromAsset(args.asset, args.rawBasePlan);
  const bedrooms = bsParseCountFromAsset(args.asset, args.rawBasePlan, "bedroom");
  const bathrooms = bsParseCountFromAsset(args.asset, args.rawBasePlan, "bathroom");
  const spaces = bsRequiredSpacesFromAsset(args.asset);

  const rooms = bsBuildBriefAlignedRooms({
    widthFt: plot.widthFt,
    depthFt: plot.depthFt,
    bedrooms,
    bathrooms,
    spaces,
  });

  return {
    ...(args.rawBasePlan || {}),
    projectId: args.projectId,
    projectTitle: args.projectTitle,
    title: "GROUND FLOOR PLAN",
    subtitle: `${plot.widthFt}' x ${plot.depthFt}' ${facing.toUpperCase()} FACING HOUSE`,
    widthFt: plot.widthFt,
    depthFt: plot.depthFt,
    facing,
    roadLabel: "ROAD",
    floorLabel: "Ground Floor",
    bedrooms,
    bathrooms,
    requiredSpaces: Object.entries(spaces)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name),
    rooms,
    source: "brief_aligned_project_plan_lock_v1",
    sourceAssetId: args.asset?.id || "",
    sourceAssetUrl: args.asset?.imageUrl || args.asset?.publicUrl || args.asset?.url || "",
    lockDataWarning: "Structured room plan is brief-aligned for downstream BOQ/BBS/working drawings. Visual image remains the original OpenAI floor plan asset.",
  };
}


export async function lockLatestProjectPlan(args: {
  projectId: string;
  projectTitle?: string;
  force?: boolean;
}) {
  const projectId = safe(args.projectId);
  if (!projectId) {
    return { ok: false, error: "projectId is required" };
  }

  const existing = await getProjectPlanLock(projectId);
  if (existing && !args.force) {
    return {
      ok: true,
      status: "already_locked",
      lock: existing,
    };
  }

  const assets = await readAssets();

  const latestAsset = assets
    .filter((asset) => assetProjectMatches(asset, projectId))
    .filter(isFloorPlanAsset)
    .sort((a, b) => assetTime(b) - assetTime(a))[0];

  if (!latestAsset) {
    return {
      ok: false,
      error: "No floor plan asset found for this project. Generate floor plan first, then lock.",
      projectId,
    };
  }

  const rawBasePlan = await readLatestExactPlanJson(projectId, latestAsset);
  const basePlan = bsNormalizeLockedBasePlanFromBrief({
    projectId,
    projectTitle: safe(args.projectTitle) || safe(latestAsset?.projectTitle) || safe(latestAsset?.title) || safe(latestAsset?.label) || projectId,
    asset: latestAsset,
    rawBasePlan,
  });

  const imageUrl = toGeneratedApiUrl(
    latestAsset?.imageUrl ||
      latestAsset?.publicUrl ||
      latestAsset?.url ||
      latestAsset?.assetUrl ||
      latestAsset?.file ||
      ""
  );

  const publicUrl = toGeneratedApiUrl(
    latestAsset?.publicUrl ||
      latestAsset?.imageUrl ||
      latestAsset?.url ||
      latestAsset?.assetUrl ||
      latestAsset?.file ||
      ""
  );

  const projectTitle =
    safe(args.projectTitle) ||
    safe(latestAsset?.projectTitle) ||
    safe(basePlan?.projectTitle) ||
    `Project ${projectId}`;

  const planFingerprint = JSON.stringify({
    projectId,
    title: basePlan?.title,
    subtitle: basePlan?.subtitle,
    widthFt: basePlan?.widthFt,
    depthFt: basePlan?.depthFt,
    facing: basePlan?.facing,
    rooms: basePlan?.rooms,
    assetFile: latestAsset?.file,
  });

  const lock: LockedPlan = {
    id: makeId(projectId),
    projectId,
    projectTitle,
    lockedAt: new Date().toISOString(),
    source: "project_plan_lock_v1",
    baseAsset: latestAsset,
    basePlan,
    baseImageUrl: imageUrl,
    basePublicUrl: publicUrl,
    planFingerprint,
    lockRules: [
      "Use this locked plan as source of truth.",
      "Do not change plot size, facing, main room positions, staircase core, wet zones or structural grid unless user explicitly asks revision.",
      "All working drawings must derive from this locked plan.",
      "Second/first floor plans must align staircase, shafts, wet zones and structural grid with this locked base plan.",
      "Presentation image may be polished, but locked JSON/SVG plan remains construction source of truth.",
    ],
  };

  const locks = await readLocks();
  locks[projectId] = lock;
  await writeLocks(locks);

  return {
    ok: true,
    status: "locked",
    lock,
  };
}

function detectFloorRequest(prompt: string) {
  const t = prompt.toLowerCase();

  if (/\bsecond\s*floor\b|\b2nd\s*floor\b|\bff2\b|\b2nd\b/.test(t)) return "second floor";
  if (/\bfirst\s*floor\b|\b1st\s*floor\b|\bff\b/.test(t)) return "first floor";
  if (/\bground\s*floor\b|\bgf\b/.test(t)) return "ground floor";
  if (/\bterrace\b|\broof\b/.test(t)) return "terrace/roof plan";

  return "";
}

export async function generateLockedWorkingSet(args: {
  projectId: string;
  projectTitle?: string;
  prompt?: string;
}) {
  const projectId = safe(args.projectId);
  const prompt = safe(args.prompt, "complete working drawing set");

  if (!projectId) {
    return { ok: false, error: "projectId is required" };
  }

  let lock = await getProjectPlanLock(projectId);

  if (!lock) {
    const lockResult = await lockLatestProjectPlan({
      projectId,
      projectTitle: args.projectTitle,
      force: false,
    });

    if (!lockResult.ok) return lockResult;

    if (!lockResult.lock) {
      return {
        ok: false,
        error: "Project plan lock could not be created.",
        projectId,
      };
    }

    lock = lockResult.lock as LockedPlan;
  }

  if (!lock) {
    return {
      ok: false,
      error: "Project plan lock unavailable.",
      projectId,
    };
  }

  const plan = lock.basePlan || {};
  const width = safe(plan?.widthFt || plan?.plotWidthFt);
  const depth = safe(plan?.depthFt || plan?.plotDepthFt);
  const facing = safe(plan?.facing);
  const derivedFloor = detectFloorRequest(prompt);

  const universalPrompt = [
    width && depth ? `${width}x${depth}` : "",
    facing ? `${facing} facing` : "",
    lock.projectTitle,
    prompt,
    "Use locked base plan.",
    "Do not alter locked ground floor plan.",
    "Generate requested working plans based on same locked layout, same staircase, same wet shafts, same column/grid logic.",
    derivedFloor
      ? `Generate ${derivedFloor} as derived plan from locked base plan with same staircase/core/shaft/grid alignment.`
      : "",
    "Include complete working drawing set if requested: floor plan, furniture, dimension, door-window, column, beam, footing, slab, staircase, electrical, plumbing, drainage, toilet detail and presentation plan.",
  ]
    .filter(Boolean)
    .join(" ");

  const planningPackage = await runUniversalPlanningAgent({
    prompt: universalPrompt,
    projectTitle: lock.projectTitle,
    project: {
      projectId,
      lockedPlan: lock.basePlan,
      lockedAsset: lock.baseAsset,
      lockRules: lock.lockRules,
    },
  });

  const lockedPlanningPackage = {
    ...planningPackage,
    status: "ready_to_plan",
    missingQuestions: [],
    assistantMessage: derivedFloor
      ? `Locked base plan ke according ${derivedFloor} planning package ready hai. Staircase, shafts, wet zones and structural grid alignment locked plan se follow karna hai.`
      : "Locked base plan ke according complete working drawing package ready hai. Base plan change nahi hoga.",
    requirement: {
      ...planningPackage.requirement,
      plotWidthFt: Number(width || planningPackage.requirement?.plotWidthFt || 0) || planningPackage.requirement?.plotWidthFt,
      plotDepthFt: Number(depth || planningPackage.requirement?.plotDepthFt || 0) || planningPackage.requirement?.plotDepthFt,
      facing: facing || planningPackage.requirement?.facing || "",
      floors: derivedFloor || planningPackage.requirement?.floors || "locked base plan",
      floorFocus: derivedFloor || planningPackage.requirement?.floorFocus || "locked base plan",
    },
  };

  // BUILDSETU_LOCKED_WORKING_DRAWING_ASSETS
  let generatedSheets: any = null;

  try {
    generatedSheets = await createLockedWorkingDrawingAssets({
      projectId,
      projectTitle: lock.projectTitle,
      lock,
      planningPackage: lockedPlanningPackage,
      request: {
        prompt,
        derivedFloor,
      },
    });
  } catch (error: any) {
    generatedSheets = {
      ok: false,
      reason: error?.message || "Working drawing assets failed",
      assets: [],
    };
  }

  return {
    ok: true,
    source: "locked_project_working_set_v1",
    status: "ready",
    projectId,
    projectTitle: lock.projectTitle,
    lock,
    request: {
      prompt,
      derivedFloor,
    },
    planningPackage: lockedPlanningPackage,
    generatedSheets,
    lockedOutputRules: [
      "Base plan is locked.",
      "All working drawings must reference the locked base plan.",
      "Second/first floor must keep staircase, shafts, wet zones and structural grid aligned.",
      "Structural outputs are concept-level until licensed structural engineer validates.",
    ],
  };
}
