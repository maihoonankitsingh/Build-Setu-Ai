// BUILDSETU_FLOOR_PLAN_GEOMETRY_VALIDATOR_V1

export type BuildSetuGeometryRoom = {
  id?: string;
  name?: string;
  kind?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  width?: number;
  depth?: number;
};

export type BuildSetuGeometryValidationResult = {
  status: "pass" | "fail";
  total: number;
  blockers: string[];
  warnings: string[];
  checks: Array<{
    id: string;
    status: "pass" | "fail" | "review";
    note: string;
  }>;
};

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function norm(value: unknown) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function roomW(room: BuildSetuGeometryRoom) {
  return n(room.w ?? room.width);
}

function roomH(room: BuildSetuGeometryRoom) {
  return n(room.h ?? room.depth);
}

function roomText(room: BuildSetuGeometryRoom) {
  return norm(`${room.id || ""} ${room.name || ""} ${room.kind || ""}`);
}

function findRoom(rooms: BuildSetuGeometryRoom[], patterns: RegExp[]) {
  return rooms.find((room) => patterns.some((pattern) => pattern.test(roomText(room)))) || null;
}

function nearly(actual: number, expected: number, tolerance = 0.01) {
  return Math.abs(actual - expected) <= tolerance;
}

function addCheck(
  checks: BuildSetuGeometryValidationResult["checks"],
  blockers: string[],
  id: string,
  ok: boolean,
  passNote: string,
  failNote: string,
) {
  if (ok) {
    checks.push({ id, status: "pass", note: passNote });
  } else {
    checks.push({ id, status: "fail", note: failNote });
    blockers.push(failNote);
  }
}

export function validateBuildSetu49x57EastNorthGroundGeometry(args: {
  plot?: { width?: number; depth?: number; drawingWidth?: number; drawingHeight?: number };
  rooms: BuildSetuGeometryRoom[];
  drawingConvention?: any;
}): BuildSetuGeometryValidationResult {
  const rooms = Array.isArray(args.rooms) ? args.rooms : [];
  const checks: BuildSetuGeometryValidationResult["checks"] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  const drawingWidth = n(args.plot?.drawingWidth ?? args.plot?.width);
  const drawingHeight = n(args.plot?.drawingHeight ?? args.plot?.depth);

  addCheck(
    checks,
    blockers,
    "plot-width-57",
    nearly(drawingWidth, 57),
    "Drawing width is 57 ft for North/top side.",
    `Invalid drawing width ${drawingWidth || "missing"} ft. 49x57 East-North must draw width = 57 ft.`,
  );

  addCheck(
    checks,
    blockers,
    "plot-height-49",
    nearly(drawingHeight, 49),
    "Drawing height is 49 ft for East/right side.",
    `Invalid drawing height ${drawingHeight || "missing"} ft. 49x57 East-North must draw height = 49 ft.`,
  );

  // BUILDSETU_GEOMETRY_ROOM_BOUNDS_CHECK_V1
  const outOfBoundsRooms = rooms.filter((room) => {
    const x = n(room.x);
    const y = n(room.y);
    const w = roomW(room);
    const h = roomH(room);
    return x < 0 || y < 0 || x + w > drawingWidth || y + h > drawingHeight;
  });

  addCheck(
    checks,
    blockers,
    "room-bounds-57x49",
    outOfBoundsRooms.length === 0,
    "All rooms fit inside 57 x 49 drawing boundary.",
    `Rooms outside 57 x 49 boundary: ${outOfBoundsRooms.map((room) => `${room.name || room.id} at x=${n(room.x)}, y=${n(room.y)}, w=${roomW(room)}, h=${roomH(room)}`).join("; ")}`,
  );

  const topEdge = String(args.drawingConvention?.topEdge || "");
  const rightEdge = String(args.drawingConvention?.rightEdge || "");

  addCheck(
    checks,
    blockers,
    "top-edge-north-57",
    /north/i.test(topEdge) && /57/.test(topEdge),
    "Top edge is NORTH SIDE ROAD - 57'.",
    `Top edge label invalid: "${topEdge || "missing"}". Expected NORTH SIDE ROAD - 57'.`,
  );

  addCheck(
    checks,
    blockers,
    "right-edge-east-49",
    /east/i.test(rightEdge) && /49/.test(rightEdge),
    "Right edge is EAST FRONT ROAD - 49'.",
    `Right edge label invalid: "${rightEdge || "missing"}". Expected EAST FRONT ROAD - 49'.`,
  );

  const dining = findRoom(rooms, [/dining/]);
  const wash = findRoom(rooms, [/wash/, /store/]);
  const bathroom = findRoom(rooms, [/bath/, /toilet/]);
  const bedroom = findRoom(rooms, [/bedroom/, /bed1/]);
  const parking = findRoom(rooms, [/parking/, /car/]);
  const kitchen = findRoom(rooms, [/kitchen/]);

  addCheck(
    checks,
    blockers,
    "dining-14x11",
    Boolean(dining && nearly(roomW(dining), 14) && nearly(roomH(dining), 11)),
    "Dining room is locked at 14 x 11.",
    `Dining dimension invalid. Expected 14 x 11, got ${dining ? `${roomW(dining)} x ${roomH(dining)}` : "missing"}.`,
  );

  addCheck(
    checks,
    blockers,
    "wash-store-11x7",
    Boolean(wash && nearly(roomW(wash), 11) && nearly(roomH(wash), 7)),
    "Wash/Store is locked at 11 x 7.",
    `Wash/Store dimension invalid. Expected 11 x 7, got ${wash ? `${roomW(wash)} x ${roomH(wash)}` : "missing"}.`,
  );

  addCheck(
    checks,
    blockers,
    "bathroom-7x8",
    Boolean(bathroom && nearly(roomW(bathroom), 7) && nearly(roomH(bathroom), 8)),
    "Bathroom is locked at 7 x 8.",
    `Bathroom dimension invalid. Expected 7 x 8, got ${bathroom ? `${roomW(bathroom)} x ${roomH(bathroom)}` : "missing"}.`,
  );

  addCheck(
    checks,
    blockers,
    "bedroom-12x13",
    Boolean(bedroom && nearly(roomW(bedroom), 12) && nearly(roomH(bedroom), 13)),
    "Ground bedroom is locked at 12 x 13.",
    `Ground bedroom dimension invalid. Expected 12 x 13, got ${bedroom ? `${roomW(bedroom)} x ${roomH(bedroom)}` : "missing"}.`,
  );

  addCheck(
    checks,
    blockers,
    "parking-15x18",
    Boolean(parking && nearly(roomW(parking), 15) && nearly(roomH(parking), 18)),
    "Parking is locked at 15 x 18.",
    `Parking dimension invalid. Expected 15 x 18, got ${parking ? `${roomW(parking)} x ${roomH(parking)}` : "missing"}.`,
  );

  addCheck(
    checks,
    blockers,
    "kitchen-11x10",
    Boolean(kitchen && nearly(roomW(kitchen), 11) && nearly(roomH(kitchen), 10)),
    "Kitchen is locked at 11 x 10.",
    `Kitchen dimension invalid. Expected 11 x 10, got ${kitchen ? `${roomW(kitchen)} x ${roomH(kitchen)}` : "missing"}.`,
  );

  const bedrooms = rooms.filter((room) => /bedroom/.test(roomText(room)));
  const bathrooms = rooms.filter((room) => /bath|toilet/.test(roomText(room)));
  const parkingRooms = rooms.filter((room) => /parking|car/.test(roomText(room)));

  addCheck(
    checks,
    blockers,
    "ground-room-counts",
    bedrooms.length === 1 && bathrooms.length === 1 && parkingRooms.length === 1,
    "Ground floor room counts are exact: 1 bedroom, 1 bathroom, 1 parking.",
    `Ground room counts invalid. bedrooms=${bedrooms.length}, bathrooms=${bathrooms.length}, parking=${parkingRooms.length}.`,
  );

  const total = blockers.length ? 0 : 100;

  return {
    status: blockers.length ? "fail" : "pass",
    total,
    blockers,
    warnings,
    checks,
  };
}
