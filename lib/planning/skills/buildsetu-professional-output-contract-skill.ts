// BUILDSETU_PROFESSIONAL_OUTPUT_CONTRACT_SKILL_V1
// Validates that generated plan JSON is presentation-ready:
// labels, dimensions, room program, access intent, MEP/stair/parking evidence,
// and enough metadata for a user-facing professional floor-plan output.

import type {
  BuildSetuPlanningSkill,
  BuildSetuSkillCheck,
  BuildSetuSkillReport,
  BuildSetuSkillStatus,
} from "./buildsetu-skill-types";

type OutputRoom = {
  id?: string;
  name?: string;
  kind?: string;
  note?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
};

type OutputRect = {
  id: string;
  name: string;
  kind: string;
  note: string;
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

function roomRect(room: OutputRoom): OutputRect | null {
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
    note: String((room as any).note ?? ""),
    x,
    y,
    w,
    h,
    right: x + w,
    bottom: y + h,
    area: w * h,
  };
}

// BUILDSETU_PROFESSIONAL_OUTPUT_STRICT_ROOM_SELECTOR_V1
function token(room: OutputRect): string {
  // Selector matching must use only identity fields.
  // Room notes contain relationship prose such as "shares edge with living";
  // using notes here causes false matches like Puja being selected as Living.
  return `${norm(room.id)} ${norm(room.name)} ${norm(room.kind)}`;
}

function isKind(room: OutputRect, needles: string[]): boolean {
  const t = token(room);
  return needles.some((needle) => t.includes(norm(needle)));
}

function findOne(rects: OutputRect[], needles: string[]): OutputRect | null {
  return rects.find((room) => isKind(room, needles)) ?? null;
}

function findAll(rects: OutputRect[], needles: string[]): OutputRect[] {
  return rects.filter((room) => isKind(room, needles));
}

function hasDimensionLabel(room: OutputRect): boolean {
  const label = `${room.name} ${room.note}`;
  if (/\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?\b/i.test(label)) return true;
  return room.w > 0 && room.h > 0;
}

function sharedEdgeFt(a: OutputRect, b: OutputRect): number {
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

function inferBounds(context: any, rects: OutputRect[]) {
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

function insideBounds(room: OutputRect, bounds: { width: number; height: number }): boolean {
  return room.x >= 0 && room.y >= 0 && room.right <= bounds.width && room.bottom <= bounds.height;
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

const requiredProgram = [
  { id: "program-living", label: "Living", needles: ["living"] },
  { id: "program-dining", label: "Dining", needles: ["dining"] },
  { id: "program-kitchen", label: "Kitchen", needles: ["kitchen"] },
  { id: "program-puja", label: "Puja", needles: ["puja"] },
  { id: "program-parking", label: "Parking", needles: ["parking"] },
  { id: "program-lobby", label: "Lobby / entry", needles: ["lobby", "entry"] },
  { id: "program-passage", label: "Passage", needles: ["passage"] },
  { id: "program-stair", label: "Stair", needles: ["stair", "staircase"] },
  { id: "program-bedroom", label: "Bedroom", needles: ["bedroom", "bed1"] },
  { id: "program-bathroom", label: "Bathroom / toilet", needles: ["bathroom", "toilet"] },
  { id: "program-wash-store", label: "Wash / store", needles: ["wash", "store", "wash-store"] },
];

const requiredAccessPairs = [
  { id: "contract-access-living-dining", from: ["living"], to: ["dining"], label: "Living to dining" },
  { id: "contract-access-dining-kitchen", from: ["dining"], to: ["kitchen"], label: "Dining to kitchen" },
  { id: "contract-access-parking-lobby", from: ["parking"], to: ["lobby", "entry"], label: "Parking to lobby" },
  { id: "contract-access-passage-bedroom", from: ["passage"], to: ["bedroom", "bed1"], label: "Passage to bedroom" },
  { id: "contract-access-passage-bathroom", from: ["passage"], to: ["bathroom", "toilet"], label: "Passage to bathroom" },
  { id: "contract-access-passage-stair", from: ["passage"], to: ["stair", "staircase"], label: "Passage to stair" },
  { id: "contract-access-kitchen-wash", from: ["kitchen"], to: ["wash", "store", "wash-store"], label: "Kitchen to wash/store" },
];

export const buildSetuProfessionalOutputContractSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.professional-output-contract.v1",
  name: "BuildSetu Professional Output Contract Skill",
  version: "1.0.0",
  category: "render-qa",

  run(context): BuildSetuSkillReport {
    const roomsRaw = Array.isArray((context as any)?.rooms) ? (context as any).rooms : [];
    const rects = roomsRaw.map(roomRect).filter(Boolean) as OutputRect[];

    const checks: BuildSetuSkillCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!rects.length) {
      const note = "No valid rooms found for professional output contract review.";
      return {
        skillId: "buildsetu.professional-output-contract.v1",
        skillName: "BuildSetu Professional Output Contract Skill",
        version: "1.0.0",
        status: "fail",
        total: 0,
        blockers: [note],
        warnings,
        checks: [
          {
            id: "contract-room-rects",
            check: "Plan output must include valid room rectangles",
            status: "fail",
            note,
            severity: "blocker",
          },
        ],
        metadata: { roomCount: 0 },
      };
    }

    const bounds = inferBounds(context, rects);

    const invalidLabels = rects.filter((room) => !room.id || !room.name || !room.kind);
    if (!invalidLabels.length) {
      addPass(
        checks,
        "contract-room-labels",
        "Every room should have id, label/name, and kind",
        `All ${rects.length} rooms have id/name/kind labels.`
      );
    } else {
      addFail(
        checks,
        blockers,
        "contract-room-labels",
        "Every room should have id, label/name, and kind",
        `${invalidLabels.length} room(s) missing id/name/kind label.`
      );
    }

    const missingDimensions = rects.filter((room) => !hasDimensionLabel(room));
    if (!missingDimensions.length) {
      addPass(
        checks,
        "contract-room-dimensions",
        "Every room should expose dimensions",
        `All ${rects.length} rooms expose numeric dimensions.`
      );
    } else {
      addFail(
        checks,
        blockers,
        "contract-room-dimensions",
        "Every room should expose dimensions",
        `Rooms missing dimensions: ${missingDimensions.map((room) => room.name).join(", ")}.`
      );
    }

    const outOfBounds = rects.filter((room) => !insideBounds(room, bounds));
    if (!outOfBounds.length) {
      addPass(
        checks,
        "contract-room-boundary",
        "Professional output should keep all rooms inside drawing bounds",
        `All rooms stay inside ${bounds.width}x${bounds.height}ft drawing bounds.`
      );
    } else {
      addFail(
        checks,
        blockers,
        "contract-room-boundary",
        "Professional output should keep all rooms inside drawing bounds",
        `Rooms out of bounds: ${outOfBounds.map((room) => room.name).join(", ")}.`
      );
    }

    const missingProgram: string[] = [];
    for (const item of requiredProgram) {
      const room = findOne(rects, item.needles);
      if (room) {
        addPass(checks, item.id, `${item.label} should be present`, `${item.label} found as ${room.name}.`);
      } else {
        missingProgram.push(item.label);
        addFail(checks, blockers, item.id, `${item.label} should be present`, `${item.label} missing from professional output.`);
      }
    }

    let passedAccessPairs = 0;
    for (const pair of requiredAccessPairs) {
      const from = findOne(rects, pair.from);
      const to = findOne(rects, pair.to);

      if (!from || !to) {
        addReview(
          checks,
          warnings,
          pair.id,
          `${pair.label} access intent should be represented`,
          `${pair.label} access cannot be fully checked because one room is missing.`
        );
        continue;
      }

      const edge = sharedEdgeFt(from, to);
      if (edge >= 2) {
        passedAccessPairs += 1;
        addPass(
          checks,
          pair.id,
          `${pair.label} access intent should be represented`,
          `${pair.label} has ${Number(edge.toFixed(2))}ft shared edge/access intent.`
        );
      } else {
        addFail(
          checks,
          blockers,
          pair.id,
          `${pair.label} access intent should be represented`,
          `${pair.label} missing shared access edge.`
        );
      }
    }

    const notesWithIntent = rects.filter((room) =>
      /share|edge|entry|vent|shaft|service|parking|stair|passage|boundary|core/i.test(room.note)
    );

    if (notesWithIntent.length >= Math.min(8, rects.length)) {
      addPass(
        checks,
        "contract-professional-notes",
        "Output should include professional planning notes",
        `${notesWithIntent.length} rooms include professional planning notes for access/service/edge/core intent.`
      );
    } else {
      addReview(
        checks,
        warnings,
        "contract-professional-notes",
        "Output should include professional planning notes",
        `Only ${notesWithIntent.length} rooms include professional planning notes; add more final drawing annotations if needed.`
      );
    }

    const living = findOne(rects, ["living"]);
    const bedroom = findOne(rects, ["bedroom", "bed1"]);
    const kitchen = findOne(rects, ["kitchen"]);
    const bathroom = findOne(rects, ["bathroom", "toilet"]);
    const washStore = findOne(rects, ["wash", "store", "wash-store"]);
    const stair = findOne(rects, ["stair", "staircase"]);
    const parking = findOne(rects, ["parking"]);

    const professionalEvidence = {
      ventilation: Boolean(living && bedroom && kitchen && bathroom && washStore),
      wetPlumbing: Boolean(kitchen && bathroom && washStore),
      verticalCore: Boolean(stair),
      parkingEntry: Boolean(parking),
    };

    if (Object.values(professionalEvidence).every(Boolean)) {
      addPass(
        checks,
        "contract-discipline-evidence",
        "Output should include evidence for ventilation, wet plumbing, stair core and parking",
        "Plan includes room evidence for ventilation, wet plumbing, stair core and parking-entry disciplines."
      );
    } else {
      addFail(
        checks,
        blockers,
        "contract-discipline-evidence",
        "Output should include evidence for ventilation, wet plumbing, stair core and parking",
        `Missing discipline evidence: ${Object.entries(professionalEvidence)
          .filter(([, ok]) => !ok)
          .map(([key]) => key)
          .join(", ")}.`
      );
    }

    const roomCountOk = rects.length >= 10;
    if (roomCountOk) {
      addPass(
        checks,
        "contract-room-count",
        "Professional ground-floor output should include full room set",
        `Plan includes ${rects.length} room objects.`
      );
    } else {
      addFail(
        checks,
        blockers,
        "contract-room-count",
        "Professional ground-floor output should include full room set",
        `Plan includes only ${rects.length} room objects.`
      );
    }

    const status: BuildSetuSkillStatus = blockers.length ? "fail" : warnings.length ? "review" : "pass";
    const total = blockers.length ? 0 : warnings.length ? 88 : 100;

    return {
      skillId: "buildsetu.professional-output-contract.v1",
      skillName: "BuildSetu Professional Output Contract Skill",
      version: "1.0.0",
      status,
      total,
      blockers,
      warnings,
      checks,
      metadata: {
        roomCount: rects.length,
        drawingBounds: bounds,
        passedAccessPairs,
        requiredAccessPairCount: requiredAccessPairs.length,
        missingProgram,
        professionalEvidence,
        checkedRoomIds: {
          living: living?.id ?? null,
          bedroom: bedroom?.id ?? null,
          kitchen: kitchen?.id ?? null,
          bathroom: bathroom?.id ?? null,
          washStore: washStore?.id ?? null,
          stair: stair?.id ?? null,
          parking: parking?.id ?? null,
        },
      },
    };
  },
};
