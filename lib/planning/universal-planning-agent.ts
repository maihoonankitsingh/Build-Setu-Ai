import type { UniversalPlanningResult } from "./universal-types";
import { parseUniversalRequirement } from "./requirement-parser";
import { getBuildingRules, getSpaceProgram } from "./building-type-rules";
import { buildZoningStrategy } from "./space-program-engine";
import { runVastuEngine } from "./vastu-engine";
import { buildWorkingDrawings } from "./working-drawing-engine";

export async function runUniversalPlanningAgent(input: {
  prompt?: string;
  projectTitle?: string;
  project?: any;
}): Promise<UniversalPlanningResult> {
  const { requirement, missingQuestions } = parseUniversalRequirement(input);
  const spaceProgram = getSpaceProgram(requirement);
  const vastuReport = runVastuEngine(requirement, spaceProgram);
  const buildingRules = getBuildingRules(requirement);
  const zoningStrategy = buildZoningStrategy(requirement, spaceProgram);
  const workingPlans = buildWorkingDrawings(requirement);

  const status = missingQuestions.length > 0 ? "need_more_details" : "ready_to_plan";

  const assistantMessage =
    status === "need_more_details"
      ? "Planning package banane ke liye kuch required details missing hain."
      : `${requirement.projectType} / ${requirement.subType} ke liye universal planning package ready hai. Vastu, zoning, space program aur requested working plans prepare ho gaye.`;

  return {
    ok: true,
    source: "universal_planning_agent_v1",
    status,
    assistantMessage,
    missingQuestions,
    requirement,
    buildingRules,
    vastuReport,
    spaceProgram,
    zoningStrategy,
    workingPlans,
    safetyNotes: [
      "Ye planning/concept/working-drawing package automation output hai.",
      "Final architectural approval, local bylaws, setbacks, FAR/FSI, fire norms and accessibility norms licensed architect se verify karne honge.",
      "Column, beam, slab, footing and structural sizes final nahi hain; licensed structural engineer load calculation ke baad final kare.",
      "Electrical, plumbing and drainage layouts concept level hain; final MEP sizing and execution site conditions ke hisaab se verify hoga.",
    ],
  };
}
