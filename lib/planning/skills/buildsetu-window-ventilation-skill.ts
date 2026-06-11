// BUILDSETU_WINDOW_VENTILATION_SKILL_V1
// Topology-aware ventilation/window placement review.
// This does not replace detailed architectural window scheduling; it verifies that
// key room types have exterior wall, service shaft, or near-boundary ventilation potential.

import type {
  BuildSetuPlanningSkill,
  BuildSetuSkillCheck,
  BuildSetuSkillReport,
  BuildSetuSkillStatus,
} from "./buildsetu-skill-types";

type VentRoom = {
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

type VentRect = {
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

function n(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function norm(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roomRect(room: VentRoom): VentRect | null {
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

function token(room: VentRect): string {
  return `${norm(room.id)} ${norm(room.name)} ${norm(room.kind)}`;
}

function isKind(room: VentRect, needles: string[]): boolean {
  const t = token(room);
  return needles.some((needle) => t.includes(norm(needle)));
}

function findOne(rects: VentRect[], needles: string[]): VentRect | null {
  return rects.find((room) => isKind(room, needles)) ?? null;
}

function findAll(rects: VentRect[], needles: string[]): VentRect[] {
  return rects.filter((room) => isKind(room, needles));
}

function inferDrawingBounds(context: any, rects: VentRect[]) {
  const plot = context?.plot ?? {};
  const drawingWidthFt =
    n(plot.drawingWidthFt) ??
    n(plot.widthFt) ??
    n(plot.width) ??
    Math.max(...rects.map((room) => room.right), 0);

  const drawingHeightFt =
    n(plot.drawingHeightFt) ??
    n(plot.depthFt) ??
    n(plot.heightFt) ??
    n(plot.depth) ??
    Math.max(...rects.map((room) => room.bottom), 0);

  return {
    width: drawingWidthFt,
    height: drawingHeightFt,
  };
}

function exteriorSides(room: VentRect, bounds: { width: number; height: number }, toleranceFt = 3): string[] {
  const sides: string[] = [];

  if (room.x <= toleranceFt) sides.push("west/left");
  if (room.y <= toleranceFt) sides.push("north/top");
  if (bounds.width - room.right <= toleranceFt) sides.push("east/right");
  if (bounds.height - room.bottom <= toleranceFt) sides.push("south/bottom");

  return sides;
}

function sharedEdgeFt(a: VentRect, b: VentRect): number {
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

function distanceToExterior(room: VentRect, bounds: { width: number; height: number }): number {
  return Math.min(
    Math.max(0, room.x),
    Math.max(0, room.y),
    Math.max(0, bounds.width - room.right),
    Math.max(0, bounds.height - room.bottom)
  );
}

// BUILDSETU_WINDOW_VENTILATION_BATHROOM_SHAFT_CIRCULATION_V1
function adjacentExteriorService(room: VentRect, rects: VentRect[], bounds: { width: number; height: number }) {
  const serviceRooms = rects.filter((candidate) =>
    candidate.id !== room.id &&
    isKind(candidate, ["wash", "store", "toilet", "bathroom", "kitchen", "shaft", "duct", "service"])
  );

  for (const service of serviceRooms) {
    const serviceSides = exteriorSides(service, bounds, 3);
    if (serviceSides.length && sharedEdgeFt(room, service) >= 2) {
      return {
        room: service,
        exteriorSides: serviceSides,
        sharedEdgeFt: sharedEdgeFt(room, service),
        mode: "adjacent-exterior-service",
      };
    }
  }

  // Internal toilets commonly ventilate via planned shaft/duct aligned with
  // staircase, passage or circulation void. This is not a final window schedule;
  // it is a planning feasibility gate.
  if (isKind(room, ["toilet", "bathroom"])) {
    const shaftCandidates = rects.filter((candidate) =>
      candidate.id !== room.id &&
      isKind(candidate, ["stair", "staircase", "passage", "lobby", "circulation", "duct", "shaft"])
    );

    for (const shaft of shaftCandidates) {
      const edge = sharedEdgeFt(room, shaft);
      if (edge >= 2) {
        return {
          room: shaft,
          exteriorSides: exteriorSides(shaft, bounds, 3),
          sharedEdgeFt: edge,
          mode: "planned-circulation-shaft",
        };
      }
    }
  }

  return null;
}

function ventilationEvidence(room: VentRect, rects: VentRect[], bounds: { width: number; height: number }) {
  const sides = exteriorSides(room, bounds, 3);
  if (sides.length) {
    return {
      ok: true,
      mode: "direct-exterior",
      note: `${room.name} has direct exterior ventilation potential on ${sides.join(", ")} side.`,
    };
  }

  const dist = distanceToExterior(room, bounds);
  if (dist <= 3) {
    return {
      ok: true,
      mode: "near-exterior",
      note: `${room.name} is within ${Number(dist.toFixed(2))}ft of exterior edge; ventilation/window placement is feasible with façade/setback treatment.`,
    };
  }

  const service = adjacentExteriorService(room, rects, bounds);
  if (service) {
    const mode = service.mode === "planned-circulation-shaft" ? "planned-circulation-shaft" : "service-shaft-or-wet-wall";
    const exteriorNote = service.exteriorSides.length
      ? `, exterior side ${service.exteriorSides.join(", ")}`
      : ", shaft/duct route to be detailed in working drawing";

    return {
      ok: true,
      mode,
      note: `${room.name} can ventilate through adjacent ${service.room.name}; shared edge ${Number(service.sharedEdgeFt.toFixed(2))}ft${exteriorNote}.`,
    };
  }

  return {
    ok: false,
    mode: "missing",
    note: `${room.name} has no direct exterior, near-exterior, or adjacent service-shaft ventilation evidence.`,
  };
}

function checkRoomVentilation(
  id: string,
  check: string,
  room: VentRect | null,
  rects: VentRect[],
  bounds: { width: number; height: number },
  blockers: string[],
  warnings: string[]
): BuildSetuSkillCheck {
  if (!room) {
    const note = `${check}: target room missing.`;
    warnings.push(note);
    return {
      id,
      check,
      status: "review",
      note,
      severity: "warning",
    };
  }

  const evidence = ventilationEvidence(room, rects, bounds);

  if (evidence.ok) {
    return {
      id,
      check,
      status: "pass",
      note: evidence.note,
      severity: "info",
    };
  }

  // For wet/service rooms, treat missing evidence as blocker because odor/moisture exhaust is mandatory.
  const isWetOrService = isKind(room, ["kitchen", "wash", "store", "toilet", "bathroom"]);
  if (isWetOrService) {
    blockers.push(evidence.note);
    return {
      id,
      check,
      status: "fail",
      note: evidence.note,
      severity: "blocker",
    };
  }

  warnings.push(evidence.note);
  return {
    id,
    check,
    status: "review",
    note: evidence.note,
    severity: "warning",
  };
}

export const buildSetuWindowVentilationSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.window-ventilation.v1",
  name: "BuildSetu Window Ventilation Skill",
  version: "1.0.0",
  category: "domain-rule",

  run(context): BuildSetuSkillReport {
    const roomsRaw = Array.isArray((context as any)?.rooms) ? (context as any).rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as VentRect[];

    const checks: BuildSetuSkillCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      const note = "No valid rooms found for ventilation placement review.";
      return {
        skillId: "buildsetu.window-ventilation.v1",
        skillName: "BuildSetu Window Ventilation Skill",
        version: "1.0.0",
        status: "fail",
        total: 0,
        blockers: [note],
        warnings,
        checks: [
          {
            id: "ventilation-room-rects",
            check: "Rooms must have valid rectangles for ventilation analysis",
            status: "fail",
            note,
            severity: "blocker",
          },
        ],
        metadata: { roomCount: 0 },
      };
    }

    const bounds = inferDrawingBounds(context, rects);

    const living = findOne(rects, ["living"]);
    const bedrooms = findAll(rects, ["bedroom", "bed1"]);
    const bedroom = bedrooms[0] ?? null;
    const kitchen = findOne(rects, ["kitchen"]);
    const bathroom = findOne(rects, ["bathroom", "toilet"]);
    const washStore = findOne(rects, ["wash-store", "wash", "store"]);

    checks.push(
      checkRoomVentilation(
        "ventilation-living",
        "Living should have window/ventilation potential",
        living,
        rects,
        bounds,
        blockers,
        warnings
      )
    );

    checks.push(
      checkRoomVentilation(
        "ventilation-bedroom",
        "Bedroom should have window/ventilation potential",
        bedroom,
        rects,
        bounds,
        blockers,
        warnings
      )
    );

    checks.push(
      checkRoomVentilation(
        "ventilation-kitchen",
        "Kitchen should have exhaust/window/shaft ventilation potential",
        kitchen,
        rects,
        bounds,
        blockers,
        warnings
      )
    );

    checks.push(
      checkRoomVentilation(
        "ventilation-bathroom",
        "Bathroom/toilet should have vent/shaft/window ventilation potential",
        bathroom,
        rects,
        bounds,
        blockers,
        warnings
      )
    );

    checks.push(
      checkRoomVentilation(
        "ventilation-wash-store",
        "Wash/store should have ventilation potential",
        washStore,
        rects,
        bounds,
        blockers,
        warnings
      )
    );

    const exteriorRoomCount = rects.filter((room) => exteriorSides(room, bounds, 3).length > 0).length;
    if (exteriorRoomCount >= 3) {
      checks.push({
        id: "ventilation-exterior-distribution",
        check: "Multiple rooms should have exterior ventilation distribution",
        status: "pass",
        note: `${exteriorRoomCount} rooms have direct exterior/near-exterior ventilation potential.`,
        severity: "info",
      });
    } else {
      const note = `Only ${exteriorRoomCount} rooms have direct exterior/near-exterior ventilation potential.`;
      warnings.push(note);
      checks.push({
        id: "ventilation-exterior-distribution",
        check: "Multiple rooms should have exterior ventilation distribution",
        status: "review",
        note,
        severity: "warning",
      });
    }

    const status: BuildSetuSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.window-ventilation.v1",
      skillName: "BuildSetu Window Ventilation Skill",
      version: "1.0.0",
      status,
      total,
      blockers,
      warnings,
      checks,
      metadata: {
        roomCount: rects.length,
        drawingBounds: bounds,
        exteriorRoomCount,
        checkedRoomIds: {
          living: living?.id ?? null,
          bedroom: bedroom?.id ?? null,
          kitchen: kitchen?.id ?? null,
          bathroom: bathroom?.id ?? null,
          washStore: washStore?.id ?? null,
        },
      },
    };
  },
};
