// BUILDSETU_STAIR_CORE_SKILL_V1
// Validates G+1 stair / vertical core feasibility.
// This is a planning-level stair core gate, not final structural stair detailing.

import type {
  BuildSetuPlanningSkill,
  BuildSetuSkillCheck,
  BuildSetuSkillReport,
  BuildSetuSkillStatus,
} from "./buildsetu-skill-types";

type StairRoom = {
  id?: string;
  name?: string;
  kind?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
};

type StairRect = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  right: number;
  bottom: number;
  area: number;
};

function n(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function norm(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roomRect(room: StairRoom): StairRect | null {
  const x = n((room as any).x);
  const y = n((room as any).y);
  const w = n((room as any).w ?? (room as any).width);
  const h = n((room as any).h ?? (room as any).height);

  if (x === null || y === null || w === null || h === null) return null;
  if (w <= 0 || h <= 0) return null;

  return {
    id: String(room.id ?? room.name ?? "room"),
    name: String(room.name ?? room.id ?? "Room"),
    kind: String(room.kind ?? ""),
    x,
    y,
    w,
    h,
    right: x + w,
    bottom: y + h,
    area: w * h,
  };
}

function token(room: StairRect): string {
  return `${norm(room.id)} ${norm(room.name)} ${norm(room.kind)}`;
}

function isKind(room: StairRect, needles: string[]): boolean {
  const t = token(room);
  return needles.some((needle) => t.includes(norm(needle)));
}

function findOne(rects: StairRect[], needles: string[]): StairRect | null {
  return rects.find((room) => isKind(room, needles)) ?? null;
}

function sharedEdgeFt(a: StairRect, b: StairRect): number {
  const eps = 0.001;

  const verticalTouch =
    Math.abs(a.right - b.x) <= eps ||
    Math.abs(b.right - a.x) <= eps;

  if (verticalTouch) {
    return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
  }

  const horizontalTouch =
    Math.abs(a.bottom - b.y) <= eps ||
    Math.abs(b.bottom - a.y) <= eps;

  if (horizontalTouch) {
    return Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
  }

  return 0;
}

function gapFt(a: StairRect, b: StairRect): number {
  const dx = Math.max(0, Math.max(a.x - b.right, b.x - a.right));
  const dy = Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

function inferBounds(context: any, rects: StairRect[]) {
  const plot = context?.plot ?? {};
  const width =
    n(plot.drawingWidthFt) ??
    n(plot.widthFt) ??
    n(plot.width) ??
    Math.max(...rects.map((room) => room.right), 0);

  const height =
    n(plot.drawingHeightFt) ??
    n(plot.depthFt) ??
    n(plot.heightFt) ??
    n(plot.depth) ??
    Math.max(...rects.map((room) => room.bottom), 0);

  return { width, height };
}

function insideBounds(room: StairRect, bounds: { width: number; height: number }): boolean {
  return room.x >= 0 && room.y >= 0 && room.right <= bounds.width && room.bottom <= bounds.height;
}

function exteriorSides(room: StairRect, bounds: { width: number; height: number }, toleranceFt = 3): string[] {
  const sides: string[] = [];
  if (room.x <= toleranceFt) sides.push("west/left");
  if (room.y <= toleranceFt) sides.push("north/top");
  if (bounds.width - room.right <= toleranceFt) sides.push("east/right");
  if (bounds.height - room.bottom <= toleranceFt) sides.push("south/bottom");
  return sides;
}

function connectedByEdge(a: StairRect, b: StairRect, minEdgeFt = 2): boolean {
  return sharedEdgeFt(a, b) >= minEdgeFt;
}

function buildAdjacency(rects: StairRect[], minEdgeFt = 2) {
  const graph = new Map<string, string[]>();
  for (const room of rects) graph.set(room.id, []);

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      if (connectedByEdge(a, b, minEdgeFt)) {
        graph.get(a.id)!.push(b.id);
        graph.get(b.id)!.push(a.id);
      }
    }
  }

  return graph;
}

function hasGraphPath(
  graph: Map<string, string[]>,
  startId: string,
  targetIds: Set<string>
): boolean {
  const queue = [startId];
  const visited = new Set<string>([startId]);

  while (queue.length) {
    const current = queue.shift()!;
    if (targetIds.has(current)) return true;

    for (const next of graph.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

function addPass(checks: BuildSetuSkillCheck[], id: string, check: string, note: string) {
  checks.push({ id, check, status: "pass", note, severity: "info" });
}

function addFail(
  checks: BuildSetuSkillCheck[],
  blockers: string[],
  id: string,
  check: string,
  note: string
) {
  blockers.push(note);
  checks.push({ id, check, status: "fail", note, severity: "blocker" });
}

function addReview(
  checks: BuildSetuSkillCheck[],
  warnings: string[],
  id: string,
  check: string,
  note: string
) {
  warnings.push(note);
  checks.push({ id, check, status: "review", note, severity: "warning" });
}

export const buildSetuStairCoreSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.stair-core.v1",
  name: "BuildSetu Stair Core Skill",
  version: "1.0.0",
  category: "human-flow",

  run(context): BuildSetuSkillReport {
    const roomsRaw = Array.isArray((context as any)?.rooms) ? (context as any).rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as StairRect[];

    const checks: BuildSetuSkillCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      const note = "No valid rooms found for stair core review.";
      return {
        skillId: "buildsetu.stair-core.v1",
        skillName: "BuildSetu Stair Core Skill",
        version: "1.0.0",
        status: "fail",
        total: 0,
        blockers: [note],
        warnings,
        checks: [
          {
            id: "stair-room-rects",
            check: "Rooms must have valid rectangles for stair core analysis",
            status: "fail",
            note,
            severity: "blocker",
          },
        ],
        metadata: { roomCount: 0 },
      };
    }

    const bounds = inferBounds(context, rects);
    const stair = findOne(rects, ["stair", "staircase"]);
    const passage = findOne(rects, ["passage"]);
    const lobby = findOne(rects, ["lobby", "entry"]);
    const dining = findOne(rects, ["dining"]);
    const living = findOne(rects, ["living"]);
    const bedroom = findOne(rects, ["bedroom", "bed1"]);
    const bathroom = findOne(rects, ["bathroom", "toilet"]);

    if (!stair) {
      addFail(checks, blockers, "stair-present", "Staircase should exist for G+1 planning", "Staircase missing.");
    } else {
      addPass(checks, "stair-present", "Staircase should exist for G+1 planning", `${stair.name} found.`);
    }

    if (stair) {
      if (insideBounds(stair, bounds)) {
        addPass(
          checks,
          "stair-inside-plot",
          "Staircase should stay inside plot/building boundary",
          `${stair.name} is inside drawing bounds ${bounds.width}x${bounds.height}ft.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "stair-inside-plot",
          "Staircase should stay inside plot/building boundary",
          `${stair.name} is out of drawing bounds: x=${stair.x}, y=${stair.y}, right=${stair.right}, bottom=${stair.bottom}, bounds=${bounds.width}x${bounds.height}.`
        );
      }

      const minSide = Math.min(stair.w, stair.h);
      const maxSide = Math.max(stair.w, stair.h);

      if (minSide >= 8 && maxSide >= 12 && stair.area >= 95) {
        addPass(
          checks,
          "stair-size-feasibility",
          "Staircase should have feasible G+1 footprint",
          `${stair.name} size ${stair.w}x${stair.h}ft, area=${stair.area}sqft is feasible for planning-level G+1 stair core.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "stair-size-feasibility",
          "Staircase should have feasible G+1 footprint",
          `${stair.name} size ${stair.w}x${stair.h}ft, area=${stair.area}sqft is too small for G+1 stair core.`
        );
      }

      const passageEdge = passage ? sharedEdgeFt(stair, passage) : 0;
      const lobbyEdge = lobby ? sharedEdgeFt(stair, lobby) : 0;
      const diningEdge = dining ? sharedEdgeFt(stair, dining) : 0;

      if (Math.max(passageEdge, lobbyEdge, diningEdge) >= 3) {
        addPass(
          checks,
          "stair-circulation-edge",
          "Staircase should connect to circulation spine",
          `${stair.name} connects to circulation: passageEdge=${Number(passageEdge.toFixed(2))}ft, lobbyEdge=${Number(lobbyEdge.toFixed(2))}ft, diningEdge=${Number(diningEdge.toFixed(2))}ft.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "stair-circulation-edge",
          "Staircase should connect to circulation spine",
          `${stair.name} has no usable circulation edge; passageEdge=${Number(passageEdge.toFixed(2))}ft, lobbyEdge=${Number(lobbyEdge.toFixed(2))}ft, diningEdge=${Number(diningEdge.toFixed(2))}ft.`
        );
      }

      const graph = buildAdjacency(rects, 2);
      const publicTargets = new Set(
        [living, dining, lobby].filter(Boolean).map((room) => (room as StairRect).id)
      );
      const privateTargets = new Set(
        [bedroom, bathroom].filter(Boolean).map((room) => (room as StairRect).id)
      );

      if (publicTargets.size && hasGraphPath(graph, stair.id, publicTargets)) {
        addPass(
          checks,
          "stair-public-zone-path",
          "Staircase should have graph path to public/circulation zone",
          `${stair.name} has graph path to public/circulation zone.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "stair-public-zone-path",
          "Staircase should have graph path to public/circulation zone",
          `${stair.name} does not have graph path to living/dining/lobby.`
        );
      }

      if (privateTargets.size && hasGraphPath(graph, stair.id, privateTargets)) {
        addPass(
          checks,
          "stair-private-zone-path",
          "Staircase should have graph path to private/service zone without isolation",
          `${stair.name} has graph path to bedroom/bathroom zone.`
        );
      } else {
        addReview(
          checks,
          warnings,
          "stair-private-zone-path",
          "Staircase should have graph path to private/service zone without isolation",
          `${stair.name} private/service path needs manual review.`
        );
      }

      const sides = exteriorSides(stair, bounds, 3);
      if (sides.length) {
        addPass(
          checks,
          "stair-light-vent-potential",
          "Stair core should have light/ventilation or external-side potential",
          `${stair.name} has light/vent/exterior potential on ${sides.join(", ")} side.`
        );
      } else {
        addReview(
          checks,
          warnings,
          "stair-light-vent-potential",
          "Stair core should have light/ventilation or external-side potential",
          `${stair.name} is internal; stairwell light/vent route needs working drawing review.`
        );
      }

      if (bathroom) {
        const bathEdge = sharedEdgeFt(stair, bathroom);
        if (bathEdge >= 2) {
          addPass(
            checks,
            "stair-wet-shaft-support",
            "Stair core should support nearby wet shaft/duct route when applicable",
            `${stair.name} can support wet/duct coordination with ${bathroom.name}; shared edge=${Number(bathEdge.toFixed(2))}ft.`
          );
        } else {
          addReview(
            checks,
            warnings,
            "stair-wet-shaft-support",
            "Stair core should support nearby wet shaft/duct route when applicable",
            `${stair.name} does not share wet shaft edge with bathroom; gap=${Number(gapFt(stair, bathroom).toFixed(2))}ft.`
          );
        }
      }
    }

    const status: BuildSetuSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.stair-core.v1",
      skillName: "BuildSetu Stair Core Skill",
      version: "1.0.0",
      status,
      total,
      blockers,
      warnings,
      checks,
      metadata: {
        roomCount: rects.length,
        drawingBounds: bounds,
        checkedRoomIds: {
          stair: stair?.id ?? null,
          passage: passage?.id ?? null,
          lobby: lobby?.id ?? null,
          dining: dining?.id ?? null,
          living: living?.id ?? null,
          bedroom: bedroom?.id ?? null,
          bathroom: bathroom?.id ?? null,
        },
      },
    };
  },
};
