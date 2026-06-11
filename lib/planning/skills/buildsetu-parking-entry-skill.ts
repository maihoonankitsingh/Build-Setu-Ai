// BUILDSETU_PARKING_ENTRY_SKILL_V1
// Validates vehicle bay, front approach, and entry sequence.
// This is a planning-level access gate, not a final site traffic drawing.

import type {
  BuildSetuPlanningSkill,
  BuildSetuSkillCheck,
  BuildSetuSkillReport,
  BuildSetuSkillStatus,
} from "./buildsetu-skill-types";

type ParkingRoom = {
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

type ParkingRect = {
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

function roomRect(room: ParkingRoom): ParkingRect | null {
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

function token(room: ParkingRect): string {
  return `${norm(room.id)} ${norm(room.name)} ${norm(room.kind)}`;
}

function isKind(room: ParkingRect, needles: string[]): boolean {
  const t = token(room);
  return needles.some((needle) => t.includes(norm(needle)));
}

function findOne(rects: ParkingRect[], needles: string[]): ParkingRect | null {
  return rects.find((room) => isKind(room, needles)) ?? null;
}

function sharedEdgeFt(a: ParkingRect, b: ParkingRect): number {
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

function gapFt(a: ParkingRect, b: ParkingRect): number {
  const dx = Math.max(0, Math.max(a.x - b.right, b.x - a.right));
  const dy = Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

function inferBounds(context: any, rects: ParkingRect[]) {
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

function insideBounds(room: ParkingRect, bounds: { width: number; height: number }): boolean {
  return room.x >= 0 && room.y >= 0 && room.right <= bounds.width && room.bottom <= bounds.height;
}

function exteriorSides(room: ParkingRect, bounds: { width: number; height: number }, toleranceFt = 3): string[] {
  const sides: string[] = [];
  if (room.x <= toleranceFt) sides.push("west/left");
  if (room.y <= toleranceFt) sides.push("north/top");
  if (bounds.width - room.right <= toleranceFt) sides.push("east/right");
  if (bounds.height - room.bottom <= toleranceFt) sides.push("south/bottom");
  return sides;
}

function buildAdjacency(rects: ParkingRect[], minEdgeFt = 2) {
  const graph = new Map<string, string[]>();
  for (const room of rects) graph.set(room.id, []);

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      if (sharedEdgeFt(a, b) >= minEdgeFt) {
        graph.get(a.id)!.push(b.id);
        graph.get(b.id)!.push(a.id);
      }
    }
  }

  return graph;
}

function hasGraphPath(graph: Map<string, string[]>, startId: string, targetIds: Set<string>): boolean {
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

export const buildSetuParkingEntrySkill: BuildSetuPlanningSkill = {
  id: "buildsetu.parking-entry.v1",
  name: "BuildSetu Parking Entry Skill",
  version: "1.0.0",
  category: "human-flow",

  run(context): BuildSetuSkillReport {
    const roomsRaw = Array.isArray((context as any)?.rooms) ? (context as any).rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as ParkingRect[];

    const checks: BuildSetuSkillCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      const note = "No valid rooms found for parking/entry review.";
      return {
        skillId: "buildsetu.parking-entry.v1",
        skillName: "BuildSetu Parking Entry Skill",
        version: "1.0.0",
        status: "fail",
        total: 0,
        blockers: [note],
        warnings,
        checks: [
          {
            id: "parking-room-rects",
            check: "Rooms must have valid rectangles for parking entry analysis",
            status: "fail",
            note,
            severity: "blocker",
          },
        ],
        metadata: { roomCount: 0 },
      };
    }

    const bounds = inferBounds(context, rects);
    const parking = findOne(rects, ["parking", "car", "bike"]);
    const lobby = findOne(rects, ["lobby", "entry"]);
    const living = findOne(rects, ["living"]);
    const dining = findOne(rects, ["dining"]);
    const passage = findOne(rects, ["passage"]);
    const kitchen = findOne(rects, ["kitchen"]);
    const stair = findOne(rects, ["stair", "staircase"]);

    if (!parking) {
      addFail(checks, blockers, "parking-present", "Parking bay should exist", "Parking bay missing.");
    } else {
      addPass(checks, "parking-present", "Parking bay should exist", `${parking.name} found.`);
    }

    if (parking) {
      if (insideBounds(parking, bounds)) {
        addPass(
          checks,
          "parking-inside-plot",
          "Parking should remain inside plot/building boundary",
          `${parking.name} is inside drawing bounds ${bounds.width}x${bounds.height}ft.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "parking-inside-plot",
          "Parking should remain inside plot/building boundary",
          `${parking.name} is out of drawing bounds: x=${parking.x}, y=${parking.y}, right=${parking.right}, bottom=${parking.bottom}, bounds=${bounds.width}x${bounds.height}.`
        );
      }

      const minSide = Math.min(parking.w, parking.h);
      const maxSide = Math.max(parking.w, parking.h);

      if (minSide >= 9 && maxSide >= 16 && parking.area >= 150) {
        addPass(
          checks,
          "parking-bay-size",
          "Parking bay should support car + bike planning",
          `${parking.name} size ${parking.w}x${parking.h}ft, area=${parking.area}sqft is feasible for car/bike parking.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "parking-bay-size",
          "Parking bay should support car + bike planning",
          `${parking.name} size ${parking.w}x${parking.h}ft, area=${parking.area}sqft is too small for car/bike parking.`
        );
      }

      const frontSides = exteriorSides(parking, bounds, 3);
      if (frontSides.length) {
        addPass(
          checks,
          "parking-front-approach",
          "Parking should have road/front approach potential",
          `${parking.name} has approach potential on ${frontSides.join(", ")} side.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "parking-front-approach",
          "Parking should have road/front approach potential",
          `${parking.name} has no exterior/front-side approach potential.`
        );
      }

      if (lobby) {
        const lobbyEdge = sharedEdgeFt(parking, lobby);
        if (lobbyEdge >= 3) {
          addPass(
            checks,
            "parking-lobby-entry-edge",
            "Parking should connect directly to entry lobby",
            `${parking.name} shares ${Number(lobbyEdge.toFixed(2))}ft entry edge with ${lobby.name}.`
          );
        } else {
          addFail(
            checks,
            blockers,
            "parking-lobby-entry-edge",
            "Parking should connect directly to entry lobby",
            `${parking.name} does not share sufficient entry edge with ${lobby.name}; edge=${Number(lobbyEdge.toFixed(2))}ft, gap=${Number(gapFt(parking, lobby).toFixed(2))}ft.`
          );
        }
      } else {
        addFail(
          checks,
          blockers,
          "parking-lobby-entry-edge",
          "Parking should connect directly to entry lobby",
          "Entry lobby missing, so parking-to-entry sequence cannot be validated."
        );
      }

      const graph = buildAdjacency(rects, 2);
      const entryTargets = new Set([lobby, living, dining, passage].filter(Boolean).map((room) => (room as ParkingRect).id));
      const coreTargets = new Set([passage, stair, kitchen].filter(Boolean).map((room) => (room as ParkingRect).id));

      if (entryTargets.size && hasGraphPath(graph, parking.id, entryTargets)) {
        addPass(
          checks,
          "parking-entry-sequence",
          "Entry sequence should connect parking/front to lobby/living/dining/passage",
          `${parking.name} has graph path to entry/public circulation.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "parking-entry-sequence",
          "Entry sequence should connect parking/front to lobby/living/dining/passage",
          `${parking.name} has no graph path to lobby/living/dining/passage.`
        );
      }

      if (coreTargets.size && hasGraphPath(graph, parking.id, coreTargets)) {
        addPass(
          checks,
          "parking-core-nonblocking",
          "Parking should not block core circulation",
          `${parking.name} connects to the building core through valid adjacency graph without isolated circulation.`
        );
      } else {
        addReview(
          checks,
          warnings,
          "parking-core-nonblocking",
          "Parking should not block core circulation",
          `${parking.name} core circulation path needs manual review.`
        );
      }

      const parkingDegree = graph.get(parking.id)?.length ?? 0;
      if (parkingDegree >= 1) {
        addPass(
          checks,
          "parking-not-isolated",
          "Parking should not be an isolated floating bay",
          `${parking.name} has ${parkingDegree} shared-edge connection(s) to building mass.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "parking-not-isolated",
          "Parking should not be an isolated floating bay",
          `${parking.name} has no shared-edge connection to building mass.`
        );
      }
    }

    const status: BuildSetuSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.parking-entry.v1",
      skillName: "BuildSetu Parking Entry Skill",
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
          parking: parking?.id ?? null,
          lobby: lobby?.id ?? null,
          living: living?.id ?? null,
          dining: dining?.id ?? null,
          passage: passage?.id ?? null,
          kitchen: kitchen?.id ?? null,
          stair: stair?.id ?? null,
        },
      },
    };
  },
};
