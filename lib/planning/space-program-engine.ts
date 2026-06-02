import type { NormalizedPlanningRequirement, SpaceProgramItem } from "./universal-types";

export function buildZoningStrategy(req: NormalizedPlanningRequirement, spaces: SpaceProgramItem[]) {
  const width = req.plotWidthFt || 0;
  const depth = req.plotDepthFt || 0;
  const area = width && depth ? width * depth : 0;

  const strategy: string[] = [];

  if (area) {
    strategy.push(`Plot area approximately ${area} sq.ft before setbacks/bylaws.`);
  }

  if (req.facing) {
    strategy.push(`${req.facing.toUpperCase()} facing road/entry side ko primary access maana gaya.`);
  }

  if (req.projectType === "residential") {
    strategy.push("Front zone: parking/porch + living/drawing.");
    strategy.push("Central zone: dining/lobby/passage for distribution.");
    strategy.push("Rear/private zone: bedrooms and service spaces.");
    strategy.push("Wet zone: kitchen/toilets/utility close grouping for plumbing.");
  }

  if (req.projectType === "commercial" || req.projectType === "mixed") {
    strategy.push("Frontage zone: entry, display/sales/customer area.");
    strategy.push("Middle zone: primary commercial operation.");
    strategy.push("Rear/service zone: storage, toilet, staff/service spaces.");
    strategy.push("Vertical core: side/rear for stair/lift where required.");
  }

  if (req.subType === "school" || req.subType === "college") {
    strategy.push("Admin near entry for control.");
    strategy.push("Classrooms along corridor with light/ventilation.");
    strategy.push("Toilets in service side and separated by user group.");
    strategy.push("Assembly/open area reserved as per site possibility.");
  }

  if (req.subType === "hospital") {
    strategy.push("Emergency/reception/waiting at front for quick patient access.");
    strategy.push("OPD and consultation rooms near waiting.");
    strategy.push("Ward and nursing station in quieter clinical zone.");
    strategy.push("Clean/service circulation must be separated where possible.");
  }

  if (req.vastuMode !== "ignore") {
    strategy.push(`Vastu mode: ${req.vastuMode}. Vastu preferences will be treated as ${req.vastuMode === "strict" ? "high priority" : "balanced priority"}.`);
  }

  if (req.liftRequired) strategy.push("Lift core reserved with stair/lobby adjacency.");
  if (req.staircaseRequired) strategy.push("Staircase core reserved for vertical circulation and future expansion.");

  if (!spaces.length) strategy.push("Space program needs more requirements before layout generation.");

  return strategy;
}
