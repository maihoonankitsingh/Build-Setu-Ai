// BUILDSETU_HUMAN_FLOOR_PLAN_SKILL_V1

export type BuildSetuHumanPlanningRoom = {
  id?: string;
  name?: string;
  kind?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type BuildSetuHumanPlanningReport = {
  status: "pass" | "fail" | "review";
  total: number;
  blockers: string[];
  warnings: string[];
  checks: Array<{
    id: string;
    check: string;
    status: "pass" | "fail" | "review";
    note: string;
  }>;
};

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function text(room: BuildSetuHumanPlanningRoom) {
  return `${room.id || ""} ${room.name || ""} ${room.kind || ""}`.toLowerCase();
}

function findRoom(rooms: BuildSetuHumanPlanningRoom[], patterns: RegExp[]) {
  return rooms.find((room) => patterns.some((pattern) => pattern.test(text(room)))) || null;
}

function roomsBy(rooms: BuildSetuHumanPlanningRoom[], pattern: RegExp) {
  return rooms.filter((room) => pattern.test(text(room)));
}

function overlap1d(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function gap1d(a1: number, a2: number, b1: number, b2: number) {
  if (a2 < b1) return b1 - a2;
  if (b2 < a1) return a1 - b2;
  return 0;
}

function near(a: BuildSetuHumanPlanningRoom | null, b: BuildSetuHumanPlanningRoom | null, maxGap = 4) {
  if (!a || !b) return false;

  const ax1 = n(a.x);
  const ay1 = n(a.y);
  const ax2 = ax1 + n(a.w);
  const ay2 = ay1 + n(a.h);

  const bx1 = n(b.x);
  const by1 = n(b.y);
  const bx2 = bx1 + n(b.w);
  const by2 = by1 + n(b.h);

  const xGap = gap1d(ax1, ax2, bx1, bx2);
  const yGap = gap1d(ay1, ay2, by1, by2);
  const xOverlap = overlap1d(ax1, ax2, bx1, bx2);
  const yOverlap = overlap1d(ay1, ay2, by1, by2);

  const verticalNear = xGap <= maxGap && yOverlap >= 3;
  const horizontalNear = yGap <= maxGap && xOverlap >= 3;

  return verticalNear || horizontalNear;
}

function addCheck(
  checks: BuildSetuHumanPlanningReport["checks"],
  blockers: string[],
  warnings: string[],
  id: string,
  check: string,
  ok: boolean,
  passNote: string,
  failNote: string,
  severity: "fail" | "review" = "fail",
) {
  if (ok) {
    checks.push({ id, check, status: "pass", note: passNote });
    return;
  }

  checks.push({ id, check, status: severity, note: failNote });

  if (severity === "fail") blockers.push(failNote);
  else warnings.push(failNote);
}

export function validateBuildSetuHumanLikeFloorPlanning(args: {
  command?: string;
  plot?: { drawingWidthFt?: number; drawingHeightFt?: number; widthFt?: number; depthFt?: number };
  rooms: BuildSetuHumanPlanningRoom[];
  drawingConvention?: any;
}): BuildSetuHumanPlanningReport {
  const rooms = Array.isArray(args.rooms) ? args.rooms : [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks: BuildSetuHumanPlanningReport["checks"] = [];

  const isGround = String(args.command || "").includes("ground");
  const width = n(args.plot?.drawingWidthFt || args.plot?.widthFt || 57);
  const height = n(args.plot?.drawingHeightFt || args.plot?.depthFt || 49);

  const living = findRoom(rooms, [/living/]);
  const dining = findRoom(rooms, [/dining/]);
  const kitchen = findRoom(rooms, [/kitchen/]);
  const wash = findRoom(rooms, [/wash/, /store/]);
  const bedroom = findRoom(rooms, [/bedroom/, /bed1/]);
  const bathroom = findRoom(rooms, [/bath/, /toilet/]);
  const parking = findRoom(rooms, [/parking/, /car/]);
  const lobby = findRoom(rooms, [/lobby/, /entry/]);
  const passage = findRoom(rooms, [/passage/]);
  const stair = findRoom(rooms, [/stair/]);
  const puja = findRoom(rooms, [/puja/, /pooja/]);

  const mandatoryGroundRooms = [
    ["living", living],
    ["dining", dining],
    ["kitchen", kitchen],
    ["wash/store", wash],
    ["bedroom", bedroom],
    ["bathroom", bathroom],
    ["parking", parking],
    ["entry/lobby", lobby],
    ["staircase", stair],
    ["puja", puja],
  ];

  for (const [label, room] of mandatoryGroundRooms) {
    addCheck(
      checks,
      blockers,
      warnings,
      `mandatory-${label}`,
      `Mandatory ${label}`,
      !isGround || Boolean(room),
      `${label} exists.`,
      `${label} missing. Human planning cannot proceed without it.`,
    );
  }

  const outOfBounds = rooms.filter((room) => {
    const x = n(room.x);
    const y = n(room.y);
    const w = n(room.w);
    const h = n(room.h);
    return x < 0 || y < 0 || x + w > width || y + h > height;
  });

  addCheck(
    checks,
    blockers,
    warnings,
    "all-rooms-inside-plot",
    "All rooms inside drawing plot",
    outOfBounds.length === 0,
    "All rooms fit inside drawing boundary.",
    `Rooms outside plot boundary: ${outOfBounds.map((room) => room.name || room.id).join(", ")}`,
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "entry-to-public-flow",
    "Entry should connect to public zone",
    !isGround || near(lobby, living, 6) || near(lobby, passage, 4) || near(lobby, parking, 4),
    "Entry/lobby connects to public circulation.",
    "Entry/lobby is not properly connected to living/passage/parking.",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "living-dining-flow",
    "Living should flow to dining",
    !isGround || near(living, dining, 5) || near(living, passage, 4),
    "Living has usable connection to dining/circulation.",
    "Living is isolated from dining/circulation. Plan feels like boxes, not a house.",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "dining-kitchen-flow",
    "Dining must be near kitchen",
    !isGround || near(dining, kitchen, 6) || near(dining, passage, 3) && near(passage, kitchen, 6),
    "Dining is functionally close to kitchen.",
    "Dining is too far from kitchen. Human planning requires dining-kitchen adjacency or short service path.",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "kitchen-wash-service-flow",
    "Kitchen should connect to wash/store",
    !isGround || near(kitchen, wash, 4),
    "Kitchen and wash/store have service adjacency.",
    "Kitchen and wash/store are not adjacent. Service flow is weak.",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "bedroom-bathroom-flow",
    "Bedroom should access bathroom",
    !isGround || near(bedroom, bathroom, 5) || near(bedroom, passage, 3) && near(passage, bathroom, 5),
    "Bedroom has practical bathroom access.",
    "Bedroom and bathroom relationship is weak.",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "stair-access-flow",
    "Staircase must be accessible from circulation",
    !isGround || near(stair, lobby, 5) || near(stair, passage, 5) || near(stair, living, 5),
    "Staircase is reachable from circulation.",
    "Staircase is not properly connected to lobby/passage/living.",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "parking-east-access",
    "Parking should sit on East/front side",
    !isGround || Boolean(parking && n(parking.x) + n(parking.w) >= width - 4),
    "Parking is correctly near East/front side.",
    "Parking is not aligned with East/front road access.",
    "review",
  );

  addCheck(
    checks,
    blockers,
    warnings,
    "puja-north-band",
    "Puja should stay in north/east/north-east band where possible",
    !isGround || Boolean(puja && n(puja.y) <= 12),
    "Puja is in north-side band.",
    "Puja is not in a preferred north/east/north-east band.",
    "review",
  );

  const bedrooms = roomsBy(rooms, /bedroom/);
  const bathrooms = roomsBy(rooms, /bath|toilet/);
  const parkingRooms = roomsBy(rooms, /parking|car/);

  addCheck(
    checks,
    blockers,
    warnings,
    "ground-room-count-human-check",
    "Ground floor room count sanity",
    !isGround || (bedrooms.length === 1 && bathrooms.length === 1 && parkingRooms.length === 1),
    "Ground room count is human-planning consistent.",
    `Ground count mismatch: bedrooms=${bedrooms.length}, bathrooms=${bathrooms.length}, parking=${parkingRooms.length}`,
  );

  const roomArea = rooms.reduce((sum, room) => sum + n(room.w) * n(room.h), 0);
  const density = width && height ? roomArea / (width * height) : 0;

  addCheck(
    checks,
    blockers,
    warnings,
    "layout-density-review",
    "Layout density should not be sparse box packing",
    density >= 0.38 && density <= 0.72,
    `Layout density looks usable: ${Math.round(density * 100)}%.`,
    `Layout density ${Math.round(density * 100)}% indicates sparse box-packing or overfilled planning.`,
    "review",
  );

  const hardFail = blockers.length > 0;
  const total = Math.max(0, 100 - blockers.length * 18 - warnings.length * 6);

  return {
    status: hardFail ? "fail" : warnings.length ? "review" : "pass",
    total,
    blockers,
    warnings,
    checks,
  };
}
