// BUILDSETU_SKILL_LIBRARY_UTILS_V1

import type { BuildSetuPlanningRoom } from "./buildsetu-skill-types";

export function bsuNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function bsuRoomText(room: BuildSetuPlanningRoom) {
  return `${room.id || ""} ${room.name || ""} ${room.kind || ""}`.toLowerCase();
}

export function bsuFindRoom(rooms: BuildSetuPlanningRoom[], patterns: RegExp[]) {
  return rooms.find((room) => patterns.some((pattern) => pattern.test(bsuRoomText(room)))) || null;
}

export function bsuRoomsBy(rooms: BuildSetuPlanningRoom[], pattern: RegExp) {
  return rooms.filter((room) => pattern.test(bsuRoomText(room)));
}

export function bsuOverlap1d(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

export function bsuGap1d(a1: number, a2: number, b1: number, b2: number) {
  if (a2 < b1) return b1 - a2;
  if (b2 < a1) return a1 - b2;
  return 0;
}

export function bsuRoomBounds(room: BuildSetuPlanningRoom) {
  const x = bsuNumber(room.x);
  const y = bsuNumber(room.y);
  const w = bsuNumber(room.w);
  const h = bsuNumber(room.h);

  return {
    x,
    y,
    w,
    h,
    right: x + w,
    bottom: y + h,
    area: Math.max(0, w) * Math.max(0, h),
  };
}

export function bsuRoomsNear(a: BuildSetuPlanningRoom | null, b: BuildSetuPlanningRoom | null, maxGap = 4) {
  if (!a || !b) return false;

  const ab = bsuRoomBounds(a);
  const bb = bsuRoomBounds(b);

  const xGap = bsuGap1d(ab.x, ab.right, bb.x, bb.right);
  const yGap = bsuGap1d(ab.y, ab.bottom, bb.y, bb.bottom);
  const xOverlap = bsuOverlap1d(ab.x, ab.right, bb.x, bb.right);
  const yOverlap = bsuOverlap1d(ab.y, ab.bottom, bb.y, bb.bottom);

  const verticalNear = xGap <= maxGap && yOverlap >= 3;
  const horizontalNear = yGap <= maxGap && xOverlap >= 3;

  return verticalNear || horizontalNear;
}

export function bsuRoomOverlapArea(a: BuildSetuPlanningRoom, b: BuildSetuPlanningRoom) {
  const ab = bsuRoomBounds(a);
  const bb = bsuRoomBounds(b);
  const overlapW = bsuOverlap1d(ab.x, ab.right, bb.x, bb.right);
  const overlapH = bsuOverlap1d(ab.y, ab.bottom, bb.y, bb.bottom);
  return overlapW * overlapH;
}
