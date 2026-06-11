// BUILDSETU_WET_PLUMBING_SKILL_V1
// Validates wet-area clustering, drainage feasibility, and service stack logic.
// This is a planning-level MEP feasibility gate, not a final plumbing drawing.

import type {
  BuildSetuPlanningSkill,
  BuildSetuSkillCheck,
  BuildSetuSkillReport,
  BuildSetuSkillStatus,
} from "./buildsetu-skill-types";

type WetRoom = {
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

type WetRect = {
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

function roomRect(room: WetRoom): WetRect | null {
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

function token(room: WetRect): string {
  return `${norm(room.id)} ${norm(room.name)} ${norm(room.kind)}`;
}

function isKind(room: WetRect, needles: string[]): boolean {
  const t = token(room);
  return needles.some((needle) => t.includes(norm(needle)));
}

function findOne(rects: WetRect[], needles: string[]): WetRect | null {
  return rects.find((room) => isKind(room, needles)) ?? null;
}

function findAll(rects: WetRect[], needles: string[]): WetRect[] {
  return rects.filter((room) => isKind(room, needles));
}

function sharedEdgeFt(a: WetRect, b: WetRect): number {
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

function gapFt(a: WetRect, b: WetRect): number {
  const dx = Math.max(0, Math.max(a.x - b.right, b.x - a.right));
  const dy = Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

function bbox(rects: WetRect[]) {
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.right));
  const maxY = Math.max(...rects.map((r) => r.bottom));
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    area: (maxX - minX) * (maxY - minY),
  };
}

function inferBounds(context: any, rects: WetRect[]) {
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

function exteriorSides(room: WetRect, bounds: { width: number; height: number }, toleranceFt = 3): string[] {
  const sides: string[] = [];
  if (room.x <= toleranceFt) sides.push("west/left");
  if (room.y <= toleranceFt) sides.push("north/top");
  if (bounds.width - room.right <= toleranceFt) sides.push("east/right");
  if (bounds.height - room.bottom <= toleranceFt) sides.push("south/bottom");
  return sides;
}

function hasAnySharedEdge(room: WetRect, others: WetRect[], minEdgeFt = 2): boolean {
  return others.some((other) => other.id !== room.id && sharedEdgeFt(room, other) >= minEdgeFt);
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

export const buildSetuWetPlumbingSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.wet-plumbing.v1",
  name: "BuildSetu Wet Plumbing Skill",
  version: "1.0.0",
  category: "domain-rule",

  run(context): BuildSetuSkillReport {
    const roomsRaw = Array.isArray((context as any)?.rooms) ? (context as any).rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as WetRect[];

    const checks: BuildSetuSkillCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      const note = "No valid rooms found for wet-area plumbing review.";
      return {
        skillId: "buildsetu.wet-plumbing.v1",
        skillName: "BuildSetu Wet Plumbing Skill",
        version: "1.0.0",
        status: "fail",
        total: 0,
        blockers: [note],
        warnings,
        checks: [
          {
            id: "wet-room-rects",
            check: "Rooms must have valid rectangles for plumbing stack analysis",
            status: "fail",
            note,
            severity: "blocker",
          },
        ],
        metadata: { roomCount: 0 },
      };
    }

    const bounds = inferBounds(context, rects);

    const kitchen = findOne(rects, ["kitchen"]);
    const washStore = findOne(rects, ["wash-store", "wash", "store"]);
    const bathroom = findOne(rects, ["bathroom", "toilet"]);
    const passage = findOne(rects, ["passage"]);
    const stair = findOne(rects, ["stair", "staircase"]);
    const bedroom = findOne(rects, ["bedroom", "bed1"]);

    const wetRooms = [kitchen, washStore, bathroom].filter(Boolean) as WetRect[];

    if (!kitchen) {
      addFail(checks, blockers, "wet-kitchen-present", "Kitchen should exist for plumbing stack review", "Kitchen missing.");
    } else {
      addPass(checks, "wet-kitchen-present", "Kitchen should exist for plumbing stack review", `${kitchen.name} found.`);
    }

    if (!washStore) {
      addReview(checks, warnings, "wet-wash-store-present", "Wash/store should exist for service plumbing", "Wash/store missing; service plumbing needs manual review.");
    } else {
      addPass(checks, "wet-wash-store-present", "Wash/store should exist for service plumbing", `${washStore.name} found.`);
    }

    if (!bathroom) {
      addFail(checks, blockers, "wet-bathroom-present", "Bathroom/toilet should exist for plumbing stack review", "Bathroom/toilet missing.");
    } else {
      addPass(checks, "wet-bathroom-present", "Bathroom/toilet should exist for plumbing stack review", `${bathroom.name} found.`);
    }

    if (kitchen && washStore) {
      const edge = sharedEdgeFt(kitchen, washStore);
      if (edge >= 2.5) {
        addPass(
          checks,
          "wet-kitchen-wash-service-edge",
          "Kitchen should share service edge with wash/store",
          `${kitchen.name} shares ${Number(edge.toFixed(2))}ft service edge with ${washStore.name}.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "wet-kitchen-wash-service-edge",
          "Kitchen should share service edge with wash/store",
          `${kitchen.name} does not share sufficient service edge with ${washStore.name}; edge=${Number(edge.toFixed(2))}ft, gap=${Number(gapFt(kitchen, washStore).toFixed(2))}ft.`
        );
      }
    }

    if (bathroom) {
      const passageEdge = passage ? sharedEdgeFt(bathroom, passage) : 0;
      const stairEdge = stair ? sharedEdgeFt(bathroom, stair) : 0;
      const bedroomEdge = bedroom ? sharedEdgeFt(bathroom, bedroom) : 0;
      const hasWetShaftRoute = Math.max(passageEdge, stairEdge, bedroomEdge) >= 2;

      if (hasWetShaftRoute) {
        addPass(
          checks,
          "wet-bathroom-shaft-route",
          "Bathroom should have shaft/duct/wet-wall route",
          `${bathroom.name} has feasible wet/shaft route: passageEdge=${Number(passageEdge.toFixed(2))}ft, stairEdge=${Number(stairEdge.toFixed(2))}ft, bedroomWetWallEdge=${Number(bedroomEdge.toFixed(2))}ft.`
        );
      } else {
        addFail(
          checks,
          blockers,
          "wet-bathroom-shaft-route",
          "Bathroom should have shaft/duct/wet-wall route",
          `${bathroom.name} has no clear shaft/duct/wet-wall route through passage/stair/bedroom edge.`
        );
      }
    }

    for (const wetRoom of wetRooms) {
      if (hasAnySharedEdge(wetRoom, rects, 2)) {
        addPass(
          checks,
          `wet-not-isolated-${norm(wetRoom.id)}`,
          "Wet rooms should not be isolated from the building mass",
          `${wetRoom.name} is connected to adjacent room mass.`
        );
      } else {
        addFail(
          checks,
          blockers,
          `wet-not-isolated-${norm(wetRoom.id)}`,
          "Wet rooms should not be isolated from the building mass",
          `${wetRoom.name} is isolated and has no usable shared edge.`
        );
      }
    }

    if (wetRooms.length >= 2) {
      const wetBox = bbox(wetRooms);
      const wetArea = wetRooms.reduce((sum, room) => sum + room.area, 0);
      const fillRatio = wetBox.area > 0 ? wetArea / wetBox.area : 0;

      if (wetBox.width <= 38 && wetBox.height <= 24 && fillRatio >= 0.35) {
        addPass(
          checks,
          "wet-stack-compactness",
          "Wet-area plumbing stack should remain compact enough for efficient MEP routing",
          `Wet-area stack is compact: width=${Number(wetBox.width.toFixed(2))}ft, height=${Number(wetBox.height.toFixed(2))}ft, fill=${Math.round(fillRatio * 100)}%.`
        );
      } else {
        addReview(
          checks,
          warnings,
          "wet-stack-compactness",
          "Wet-area plumbing stack should remain compact enough for efficient MEP routing",
          `Wet-area stack needs MEP review: width=${Number(wetBox.width.toFixed(2))}ft, height=${Number(wetBox.height.toFixed(2))}ft, fill=${Math.round(fillRatio * 100)}%.`
        );
      }
    }

    if (washStore) {
      const sides = exteriorSides(washStore, bounds, 3);
      if (sides.length) {
        addPass(
          checks,
          "wet-service-exterior-discharge",
          "Wash/store should have exterior/service discharge potential",
          `${washStore.name} has exterior/service discharge potential on ${sides.join(", ")} side.`
        );
      } else {
        addReview(
          checks,
          warnings,
          "wet-service-exterior-discharge",
          "Wash/store should have exterior/service discharge potential",
          `${washStore.name} is internal; discharge/shaft routing needs working drawing review.`
        );
      }
    }

    const status: BuildSetuSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.wet-plumbing.v1",
      skillName: "BuildSetu Wet Plumbing Skill",
      version: "1.0.0",
      status,
      total,
      blockers,
      warnings,
      checks,
      metadata: {
        roomCount: rects.length,
        wetRoomIds: wetRooms.map((room) => room.id),
        checkedRoomIds: {
          kitchen: kitchen?.id ?? null,
          washStore: washStore?.id ?? null,
          bathroom: bathroom?.id ?? null,
          passage: passage?.id ?? null,
          stair: stair?.id ?? null,
          bedroom: bedroom?.id ?? null,
        },
      },
    };
  },
};
