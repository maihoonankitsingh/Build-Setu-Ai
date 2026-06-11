import type { BuildSetuPlanningSkill, BuildSetuSkillCheck, BuildSetuSkillStatus } from "./buildsetu-skill-types";

// BUILDSETU_BUILDING_ENVELOPE_SKILL_V1
// Validates whether the room layout behaves like one connected architectural mass,
// not scattered/floating room boxes.

type BuildSetuEnvelopeRoom = {
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

type BuildSetuEnvelopeSkillStatus = BuildSetuSkillStatus;

type BuildSetuEnvelopeCheck = BuildSetuSkillCheck;

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function roomRect(room: BuildSetuEnvelopeRoom) {
  const x = num((room as any).x);
  const y = num((room as any).y);
  const w = num((room as any).w ?? (room as any).width);
  const h = num((room as any).h ?? (room as any).height);

  if (x === null || y === null || w === null || h === null) return null;
  if (w <= 0 || h <= 0) return null;

  return {
    id: String(room.id ?? room.name ?? "room"),
    name: String(room.name ?? room.id ?? "Room"),
    kind: String(room.kind ?? "").toLowerCase(),
    x,
    y,
    w,
    h,
    right: x + w,
    bottom: y + h,
    area: w * h,
  };
}

function sharedEdgeOverlap(a: ReturnType<typeof roomRect>, b: ReturnType<typeof roomRect>): number {
  if (!a || !b) return 0;

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

function gapDistance(a: ReturnType<typeof roomRect>, b: ReturnType<typeof roomRect>): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  const dx = Math.max(0, Math.max(a.x - b.right, b.x - a.right));
  const dy = Math.max(0, Math.max(a.y - b.bottom, b.y - a.bottom));
  return Math.sqrt(dx * dx + dy * dy);
}

function isEnvelopeConnected(a: ReturnType<typeof roomRect>, b: ReturnType<typeof roomRect>): boolean {
  if (!a || !b) return false;

  // Real shared wall is strongest.
  if (sharedEdgeOverlap(a, b) >= 2) return true;

  // Controlled tolerance for circulation/service edges that are almost touching.
  return gapDistance(a, b) <= 2;
}

function connectedComponents(rects: NonNullable<ReturnType<typeof roomRect>>[]) {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const rect of rects) {
    if (visited.has(rect.id)) continue;

    const queue = [rect];
    const component: string[] = [];
    visited.add(rect.id);

    while (queue.length) {
      const current = queue.shift()!;
      component.push(current.id);

      for (const other of rects) {
        if (visited.has(other.id)) continue;
        if (isEnvelopeConnected(current, other)) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }

    components.push(component);
  }

  return components;
}

function bbox(rects: NonNullable<ReturnType<typeof roomRect>>[]) {
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

function hasKind(rects: NonNullable<ReturnType<typeof roomRect>>[], kindNeedles: string[]) {
  return rects.some((r) => kindNeedles.some((needle) => r.kind.includes(needle) || r.name.toLowerCase().includes(needle)));
}

function largestComponentShare(components: string[][], totalRooms: number): number {
  if (!totalRooms) return 0;
  return Math.max(...components.map((c) => c.length), 0) / totalRooms;
}

export const buildSetuBuildingEnvelopeSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.building-envelope.v1",
  name: "BuildSetu Building Envelope Skill",
  version: "1.0.0",
  category: "geometry",

  run(context: any) {
    const roomsRaw = Array.isArray(context?.rooms) ? context.rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as NonNullable<ReturnType<typeof roomRect>>[];

    const checks: BuildSetuEnvelopeCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      blockers.push("No valid rooms found for building-envelope review.");
      checks.push({
        id: "envelope-room-rects",
        check: "Rooms must have valid rectangles for building envelope analysis",
        status: "fail",
        note: "No valid room rectangles found.",
        severity: "blocker",
      });

      return {
        skillId: "buildsetu.building-envelope.v1",
        skillName: "BuildSetu Building Envelope Skill",
        version: "1.0.0",
        status: "fail" as BuildSetuEnvelopeSkillStatus,
        total: 0,
        blockers,
        warnings,
        checks,
        metadata: { roomCount: 0 },
      };
    }

    const components = connectedComponents(rects);
    const largestShare = largestComponentShare(components, rects.length);

    if (components.length === 1) {
      checks.push({
        id: "envelope-connected-component",
        check: "Building mass should form one connected component",
        status: "pass",
        note: `All ${rects.length} rooms are connected into one building mass.`,
        severity: "info",
      });
    } else if (largestShare >= 0.9) {
      const note = `Envelope has ${components.length} components, but largest component contains ${Math.round(largestShare * 100)}% of rooms. Review minor service split.`;
      warnings.push(note);
      checks.push({
        id: "envelope-connected-component",
        check: "Building mass should form one connected component",
        status: "review",
        note,
        severity: "warning",
      });
    } else {
      const note = `Envelope is fragmented into ${components.length} components. Largest component contains only ${Math.round(largestShare * 100)}% of rooms.`;
      blockers.push(note);
      checks.push({
        id: "envelope-connected-component",
        check: "Building mass should form one connected component",
        status: "fail",
        note,
        severity: "blocker",
      });
    }

    const box = bbox(rects);
    const roomArea = rects.reduce((sum, r) => sum + r.area, 0);
    const envelopeFillRatio = box.area > 0 ? roomArea / box.area : 0;

    if (envelopeFillRatio >= 0.58) {
      checks.push({
        id: "envelope-fill-ratio",
        check: "Building envelope should not contain excessive dead voids",
        status: "pass",
        note: `Envelope fill ratio is ${Math.round(envelopeFillRatio * 100)}%.`,
        severity: "info",
      });
    } else if (envelopeFillRatio >= 0.48) {
      const note = `Envelope fill ratio is ${Math.round(envelopeFillRatio * 100)}%; review possible dead voids.`;
      warnings.push(note);
      checks.push({
        id: "envelope-fill-ratio",
        check: "Building envelope should not contain excessive dead voids",
        status: "review",
        note,
        severity: "warning",
      });
    } else {
      const note = `Envelope fill ratio is ${Math.round(envelopeFillRatio * 100)}%, indicating too much dead/empty space inside bounding mass.`;
      blockers.push(note);
      checks.push({
        id: "envelope-fill-ratio",
        check: "Building envelope should not contain excessive dead voids",
        status: "fail",
        note,
        severity: "blocker",
      });
    }

    const hasPublic = hasKind(rects, ["living", "dining", "lobby", "parking"]);
    const hasService = hasKind(rects, ["kitchen", "wash", "store", "toilet", "bath"]);
    const hasPrivate = hasKind(rects, ["bedroom", "passage", "stair"]);

    if (hasPublic && hasService && hasPrivate) {
      checks.push({
        id: "envelope-zone-coverage",
        check: "Public, service and private zones should all participate in the mass",
        status: "pass",
        note: "Public, service and private zones are all present in the envelope.",
        severity: "info",
      });
    } else {
      const note = `Envelope zone coverage incomplete: public=${hasPublic}, service=${hasService}, private=${hasPrivate}.`;
      warnings.push(note);
      checks.push({
        id: "envelope-zone-coverage",
        check: "Public, service and private zones should all participate in the mass",
        status: "review",
        note,
        severity: "warning",
      });
    }

    const hasCirculation = hasKind(rects, ["passage", "lobby", "stair"]);
    if (hasCirculation) {
      checks.push({
        id: "envelope-circulation-spine",
        check: "Envelope should include a circulation spine",
        status: "pass",
        note: "Circulation spine is represented by lobby/passage/stair room types.",
        severity: "info",
      });
    } else {
      const note = "No lobby/passage/stair circulation spine found in envelope.";
      warnings.push(note);
      checks.push({
        id: "envelope-circulation-spine",
        check: "Envelope should include a circulation spine",
        status: "review",
        note,
        severity: "warning",
      });
    }

    const status: BuildSetuEnvelopeSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.building-envelope.v1",
      skillName: "BuildSetu Building Envelope Skill",
      version: "1.0.0",
      status,
      total,
      blockers,
      warnings,
      checks,
      metadata: {
        roomCount: rects.length,
        componentCount: components.length,
        components,
        largestComponentShare: largestShare,
        envelopeBounds: box,
        roomArea,
        envelopeFillRatio,
      },
    };
  },
};
