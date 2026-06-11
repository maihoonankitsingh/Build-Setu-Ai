// BUILDSETU_DOOR_TOPOLOGY_SKILL_V1
// Validates usable access/opening relationships between rooms.
// This is stricter than generic adjacency: it checks intended movement pairs.

import type {
  BuildSetuPlanningSkill,
  BuildSetuSkillCheck,
  BuildSetuSkillReport,
  BuildSetuSkillStatus,
} from "./buildsetu-skill-types";

type DoorTopologyRoom = {
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

type DoorTopologyRect = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  right: number;
  bottom: number;
};

type DoorAccessPair = {
  id: string;
  from: string[];
  to: string[];
  check: string;
  minOpeningFt?: number;
  allowNearFt?: number;
};

function n(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roomRect(room: DoorTopologyRoom): DoorTopologyRect | null {
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
  };
}

function roomToken(room: DoorTopologyRect): string {
  return `${normalize(room.id)} ${normalize(room.name)} ${normalize(room.kind)}`;
}

function matchRoom(room: DoorTopologyRect, selectors: string[]): boolean {
  const token = roomToken(room);
  return selectors.some((selector) => token.includes(normalize(selector)));
}

function findRoom(rects: DoorTopologyRect[], selectors: string[]): DoorTopologyRect | null {
  return rects.find((room) => matchRoom(room, selectors)) ?? null;
}

function sharedOpeningFt(a: DoorTopologyRect, b: DoorTopologyRect): number {
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

function gapDistanceFt(a: DoorTopologyRect, b: DoorTopologyRect): number {
  const dx = Math.max(0, Math.max(a.x - b.right, b.x - a.right));
  const dy = Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

function accessPasses(a: DoorTopologyRect, b: DoorTopologyRect, minOpeningFt: number, allowNearFt: number) {
  const openingFt = sharedOpeningFt(a, b);
  const gapFt = gapDistanceFt(a, b);

  return {
    ok: openingFt >= minOpeningFt || gapFt <= allowNearFt,
    openingFt,
    gapFt,
    relation: openingFt >= minOpeningFt ? "shared-opening" : gapFt <= allowNearFt ? "near-access" : "disconnected",
  };
}

const requiredPairs: DoorAccessPair[] = [
  {
    id: "door-living-dining",
    from: ["living"],
    to: ["dining"],
    check: "Living should have usable opening/access to dining",
    minOpeningFt: 3,
    allowNearFt: 1,
  },
  {
    id: "door-dining-kitchen",
    from: ["dining"],
    to: ["kitchen"],
    check: "Dining should have usable opening/access to kitchen",
    minOpeningFt: 2,
    allowNearFt: 1,
  },
  {
    id: "door-parking-lobby",
    from: ["parking"],
    to: ["lobby", "entry"],
    check: "Parking should connect to entry lobby",
    minOpeningFt: 3,
    allowNearFt: 1,
  },
  {
    id: "door-passage-bedroom",
    from: ["passage"],
    to: ["bedroom", "bed1"],
    check: "Private passage should connect to bedroom",
    minOpeningFt: 2.5,
    allowNearFt: 1,
  },
  {
    id: "door-passage-bathroom",
    from: ["passage"],
    to: ["bathroom", "toilet"],
    check: "Private passage should connect to bathroom/toilet",
    minOpeningFt: 2,
    allowNearFt: 1,
  },
  {
    id: "door-passage-stair",
    from: ["passage"],
    to: ["stair", "staircase"],
    check: "Passage should connect to staircase",
    minOpeningFt: 3,
    allowNearFt: 1,
  },
  {
    id: "door-kitchen-wash-store",
    from: ["kitchen"],
    to: ["wash", "store", "wash-store"],
    check: "Kitchen should connect to wash/store service area",
    minOpeningFt: 2.5,
    allowNearFt: 1,
  },
];

export const buildSetuDoorTopologySkill: BuildSetuPlanningSkill = {
  id: "buildsetu.door-topology.v1",
  name: "BuildSetu Door Topology Skill",
  version: "1.0.0",
  category: "human-flow",

  run(context): BuildSetuSkillReport {
    const roomsRaw = Array.isArray((context as any)?.rooms) ? (context as any).rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as DoorTopologyRect[];

    const checks: BuildSetuSkillCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      const note = "No valid rooms found for door topology review.";
      blockers.push(note);

      return {
        skillId: "buildsetu.door-topology.v1",
        skillName: "BuildSetu Door Topology Skill",
        version: "1.0.0",
        status: "fail",
        total: 0,
        blockers,
        warnings,
        checks: [
          {
            id: "door-room-rects",
            check: "Rooms must have valid rectangles for door topology analysis",
            status: "fail",
            note,
            severity: "blocker",
          },
        ],
        metadata: { roomCount: 0 },
      };
    }

    const accessEdges: Array<{
      id: string;
      from: string;
      to: string;
      openingFt: number;
      gapFt: number;
      relation: string;
    }> = [];

    for (const pair of requiredPairs) {
      const from = findRoom(rects, pair.from);
      const to = findRoom(rects, pair.to);

      if (!from || !to) {
        const note = `Missing room for ${pair.id}: from=${Boolean(from)}, to=${Boolean(to)}.`;
        warnings.push(note);
        checks.push({
          id: pair.id,
          check: pair.check,
          status: "review",
          note,
          severity: "warning",
        });
        continue;
      }

      const minOpeningFt = pair.minOpeningFt ?? 2.5;
      const allowNearFt = pair.allowNearFt ?? 1;
      const result = accessPasses(from, to, minOpeningFt, allowNearFt);

      accessEdges.push({
        id: pair.id,
        from: from.id,
        to: to.id,
        openingFt: result.openingFt,
        gapFt: result.gapFt,
        relation: result.relation,
      });

      if (result.ok) {
        checks.push({
          id: pair.id,
          check: pair.check,
          status: "pass",
          note: `${from.name} connects to ${to.name} by ${result.relation}; opening=${Number(result.openingFt.toFixed(2))}ft, gap=${Number(result.gapFt.toFixed(2))}ft.`,
          severity: "info",
        });
      } else {
        const note = `${from.name} does not have a usable door/opening relationship to ${to.name}; opening=${Number(result.openingFt.toFixed(2))}ft, gap=${Number(result.gapFt.toFixed(2))}ft.`;
        blockers.push(note);
        checks.push({
          id: pair.id,
          check: pair.check,
          status: "fail",
          note,
          severity: "blocker",
        });
      }
    }

    const status: BuildSetuSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.door-topology.v1",
      skillName: "BuildSetu Door Topology Skill",
      version: "1.0.0",
      status,
      total,
      blockers,
      warnings,
      checks,
      metadata: {
        roomCount: rects.length,
        requiredPairCount: requiredPairs.length,
        passedPairCount: checks.filter((check) => check.status === "pass").length,
        accessEdges,
      },
    };
  },
};
