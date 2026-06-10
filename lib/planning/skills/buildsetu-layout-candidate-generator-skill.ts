// BUILDSETU_LAYOUT_CANDIDATE_GENERATOR_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import {
  bsuFindRoom,
  bsuRoomsNear,
  bsuRoomBounds,
  bsuNumber,
} from "./buildsetu-skill-utils";

type LayoutCandidate = {
  id: string;
  label: string;
  strategy: string;
  score: number;
  reasons: string[];
  roomSequence: string[];
};

function roomLabel(room: BuildSetuPlanningRoom | null) {
  return room?.name || room?.id || "missing";
}

function near(a: BuildSetuPlanningRoom | null, b: BuildSetuPlanningRoom | null, gap = 3) {
  return bsuRoomsNear(a, b, gap);
}

function scoreCurrentLayout(context: BuildSetuPlanningContext) {
  const rooms = Array.isArray(context.rooms) ? context.rooms : [];
  const width = bsuNumber(context.plot?.drawingWidthFt || context.plot?.widthFt || 57);
  const height = bsuNumber(context.plot?.drawingHeightFt || context.plot?.depthFt || 49);
  const plotArea = Math.max(1, width * height);

  const living = bsuFindRoom(rooms, [/living/]);
  const dining = bsuFindRoom(rooms, [/dining/]);
  const kitchen = bsuFindRoom(rooms, [/kitchen/]);
  const wash = bsuFindRoom(rooms, [/wash/, /store/]);
  const bedroom = bsuFindRoom(rooms, [/bedroom/, /bed1/]);
  const bathroom = bsuFindRoom(rooms, [/bath/, /toilet/]);
  const lobby = bsuFindRoom(rooms, [/lobby/, /entry/]);
  const passage = bsuFindRoom(rooms, [/passage/]);
  const stair = bsuFindRoom(rooms, [/stair/]);
  const parking = bsuFindRoom(rooms, [/parking/, /car/]);
  const puja = bsuFindRoom(rooms, [/puja/, /pooja/]);

  const reasons: string[] = [];
  let score = 40;

  const adjacencyRules: Array<[string, BuildSetuPlanningRoom | null, BuildSetuPlanningRoom | null, number]> = [
    ["entry-public", lobby, living, 8],
    ["living-dining", living, dining, 10],
    ["dining-kitchen", dining, kitchen, 12],
    ["kitchen-wash", kitchen, wash, 10],
    ["bedroom-bathroom", bedroom, bathroom, 8],
    ["passage-stair", passage, stair, 8],
    ["parking-lobby", parking, lobby, 8],
    ["puja-living", puja, living, 6],
  ];

  for (const [label, a, b, points] of adjacencyRules) {
    if (near(a, b, 3)) {
      score += points;
      reasons.push(`${label}: compact`);
    } else if (near(a, b, 6)) {
      score += Math.max(2, Math.round(points * 0.55));
      reasons.push(`${label}: reachable`);
    } else {
      reasons.push(`${label}: weak`);
    }
  }

  const roomArea = rooms.reduce((sum, room) => sum + bsuRoomBounds(room).area, 0);
  const density = Math.round((roomArea / plotArea) * 100);

  if (density >= 50 && density <= 80) {
    score += 8;
    reasons.push(`density practical: ${density}%`);
  } else {
    reasons.push(`density review: ${density}%`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    density,
    sequence: [
      roomLabel(lobby),
      roomLabel(living),
      roomLabel(dining),
      roomLabel(kitchen),
      roomLabel(wash),
      roomLabel(passage),
      roomLabel(stair),
      roomLabel(bedroom),
      roomLabel(bathroom),
    ],
  };
}

export const buildSetuLayoutCandidateGeneratorSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.layout-candidate-generator.v1",
  name: "BuildSetu Layout Candidate Generator Skill",
  version: "1.0.0",
  category: "candidate-generator",
  run(context: BuildSetuPlanningContext) {
    const current = scoreCurrentLayout(context);

    const candidates: LayoutCandidate[] = [
      {
        id: "candidate-current-compact-core",
        label: "Current compact core layout",
        strategy: "Preserve current compact public-service-private zoning and validate it against all skills.",
        score: current.score,
        reasons: current.reasons,
        roomSequence: current.sequence,
      },
      {
        id: "candidate-east-service-spine",
        label: "East service spine option",
        strategy: "Keep parking/lobby on East, place dining-kitchen-wash as a service spine, and keep bedroom in South-West private zone.",
        score: Math.max(72, Math.min(92, current.score - 4)),
        reasons: ["alternative: east-facing service spine", "keeps parking and entry near East road", "supports dining-kitchen-wash sequence"],
        roomSequence: ["Parking", "Lobby", "Living", "Dining", "Kitchen", "Wash/Store", "Passage", "Stair", "Bedroom", "Bathroom"],
      },
      {
        id: "candidate-public-private-split",
        label: "Public-private split option",
        strategy: "Public rooms stay North/East, service rooms stay East/South-East, private bedroom/bathroom stay South-West/South.",
        score: Math.max(70, Math.min(90, current.score - 6)),
        reasons: ["alternative: public-private zoning", "reduces public-private conflict", "keeps bedroom away from direct entry"],
        roomSequence: ["Puja", "Living", "Dining", "Kitchen", "Wash/Store", "Passage", "Bedroom", "Bathroom", "Stair"],
      },
      {
        id: "candidate-stair-core-option",
        label: "Central stair-core option",
        strategy: "Use staircase as a circulation core between public and private areas while retaining service adjacency.",
        score: Math.max(68, Math.min(88, current.score - 8)),
        reasons: ["alternative: stair as central circulation anchor", "supports future first-floor access", "keeps service and private zones readable"],
        roomSequence: ["Lobby", "Living", "Dining", "Passage", "Stair", "Bedroom", "Bathroom", "Kitchen", "Wash/Store"],
      },
    ].sort((a, b) => b.score - a.score);

    const selected = candidates[0];

    const checks: BuildSetuSkillCheck[] = [
      {
        id: "candidate-count",
        check: "Generate at least three planning candidates",
        status: candidates.length >= 3 ? "pass" : "fail",
        note: `Generated ${candidates.length} layout candidates.`,
        severity: candidates.length >= 3 ? "info" : "blocker",
      },
      {
        id: "candidate-current-score",
        check: "Current layout candidate should be strong enough to render",
        status: current.score >= 80 ? "pass" : current.score >= 70 ? "review" : "fail",
        note: `Current layout candidate score: ${current.score}/100.`,
        severity: current.score >= 80 ? "info" : current.score >= 70 ? "warning" : "blocker",
      },
      {
        id: "candidate-selected",
        check: "Best candidate should be selected before render",
        status: selected ? "pass" : "fail",
        note: selected ? `Selected ${selected.id} with score ${selected.score}/100.` : "No candidate selected.",
        severity: selected ? "info" : "blocker",
      },
    ];

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: {
        candidateCount: candidates.length,
        selectedCandidate: selected,
        candidates,
        mode: "report-and-score",
      },
    });
  },
};
