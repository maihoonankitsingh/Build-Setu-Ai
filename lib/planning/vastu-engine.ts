import type { NormalizedPlanningRequirement, SpaceProgramItem, VastuCheck } from "./universal-types";

const vastuZones: Record<string, { zone: string; priority: "high" | "medium" | "low"; note: string }> = {
  puja: { zone: "north-east", priority: "high", note: "Puja/mandir ke liye North-East preferred hota hai." },
  kitchen: { zone: "south-east", priority: "high", note: "Kitchen ke liye South-East preferred hota hai; alternate North-West." },
  "master bedroom": { zone: "south-west", priority: "high", note: "Master bedroom ke liye South-West preferred hota hai." },
  bedroom: { zone: "south/west", priority: "medium", note: "Bedroom private zone me South/West side preferred." },
  toilet: { zone: "west/north-west", priority: "medium", note: "Toilet ke liye West/North-West service zone preferred." },
  staircase: { zone: "south/west/south-west", priority: "medium", note: "Staircase South/West side me better maana jata hai." },
  living: { zone: "north/east", priority: "medium", note: "Living/drawing North/East light zone me suitable." },
  parking: { zone: "road side/front", priority: "low", note: "Parking functional road-side access ke hisaab se place hoti hai." },
  entrance: { zone: "facing-dependent", priority: "high", note: "Entrance facing aur road side ke hisaab se decide hota hai." },
};

export function runVastuEngine(requirement: NormalizedPlanningRequirement, spaces: SpaceProgramItem[]): VastuCheck[] {
  if (requirement.vastuMode === "ignore") {
    return [
      {
        space: "All spaces",
        preferredZone: "not applied",
        priority: "low",
        status: "optional",
        note: "User ne vastu ignore/without vastu mode indicate kiya hai.",
      },
    ];
  }

  const checks: VastuCheck[] = [];

  for (const space of spaces) {
    const key = space.name.toLowerCase();
    const matched =
      Object.entries(vastuZones).find(([name]) => key.includes(name)) ||
      (key.includes("bath") ? (["toilet", vastuZones.toilet] as any) : null);

    if (!matched) continue;

    const rule = matched[1];

    checks.push({
      space: space.name,
      preferredZone: rule.zone,
      priority: rule.priority,
      status: requirement.vastuMode === "strict" ? "target" : "acceptable",
      note: rule.note,
    });
  }

  if (!checks.length) {
    checks.push({
      space: "General zoning",
      preferredZone: "balanced",
      priority: "low",
      status: "optional",
      note: "Vastu mode detected, but specific vastu-sensitive spaces are not enough. Planning engine will keep balanced zones.",
    });
  }

  return checks;
}
