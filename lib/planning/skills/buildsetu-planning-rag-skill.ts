// BUILDSETU_PLANNING_RAG_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
} from "./buildsetu-skill-types";

type RagRule = {
  id: string;
  topic: string;
  priority: "hard" | "soft";
  text: string;
  keywords: string[];
};

const BUILDSETU_INTERNAL_PLANNING_RULES: RagRule[] = [
  {
    id: "rule-public-to-service-flow",
    topic: "human-flow",
    priority: "hard",
    text: "A practical home plan should move from entry/lobby to living, living to dining, dining to kitchen, and kitchen to wash/store without isolated room boxes.",
    keywords: ["entry", "lobby", "living", "dining", "kitchen", "wash", "store", "flow"],
  },
  {
    id: "rule-private-zone",
    topic: "privacy",
    priority: "hard",
    text: "Bedroom and bathroom should be reachable from circulation but visually/private-zone separated from public entry.",
    keywords: ["bedroom", "bathroom", "toilet", "passage", "privacy"],
  },
  {
    id: "rule-east-north-corner",
    topic: "orientation",
    priority: "hard",
    text: "For this drawing convention, top/North road is 57 ft and right/East front road is 49 ft; labels and coordinates must follow drawing orientation.",
    keywords: ["north", "east", "corner", "57", "49", "road", "front"],
  },
  {
    id: "rule-no-overlap",
    topic: "geometry",
    priority: "hard",
    text: "Rooms must stay inside plot boundary and must not overlap; adjacency should be achieved by contact or short circulation, not collision.",
    keywords: ["overlap", "boundary", "inside", "geometry", "rooms"],
  },
  {
    id: "rule-room-program-ground",
    topic: "room-program",
    priority: "hard",
    text: "Ground floor for this project requires exactly one bedroom, one bathroom, one parking, living, dining, kitchen, puja, staircase, and wash/store.",
    keywords: ["ground", "bedroom", "bathroom", "parking", "living", "dining", "kitchen", "puja", "staircase"],
  },
  {
    id: "rule-vastu-preference",
    topic: "vastu",
    priority: "soft",
    text: "Vastu preferences are treated as planning preferences: puja in north/east/north-east, bedroom in private south-west band, kitchen in south/east service band where feasible.",
    keywords: ["vastu", "puja", "pooja", "bedroom", "kitchen", "north", "east", "south"],
  },
  {
    id: "rule-ventilation",
    topic: "ventilation",
    priority: "soft",
    text: "Habitable rooms and wet areas should have exterior-wall, shaft, duct, or window planning for ventilation.",
    keywords: ["ventilation", "window", "duct", "shaft", "bathroom", "kitchen", "bedroom"],
  },
];

function collectQuery(context: BuildSetuPlanningContext) {
  return [
    context.command || "",
    context.projectTitle || "",
    context.plot?.facing || "",
    JSON.stringify(context.requirements || {}),
    (context.rooms || []).map((room) => `${room.name || ""} ${room.kind || ""} ${room.note || ""}`).join(" "),
  ].join(" ").toLowerCase();
}

function retrieveRules(context: BuildSetuPlanningContext) {
  const query = collectQuery(context);

  return BUILDSETU_INTERNAL_PLANNING_RULES
    .map((rule) => ({
      rule,
      score: rule.keywords.reduce((sum, keyword) => sum + (query.includes(keyword.toLowerCase()) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0 || item.rule.priority === "hard")
    .sort((a, b) => b.score - a.score || (a.rule.priority === "hard" ? -1 : 1))
    .slice(0, 8)
    .map((item) => item.rule);
}

export const buildSetuPlanningRagSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.planning-rag.v1",
  name: "BuildSetu Planning RAG Skill",
  version: "1.0.0",
  category: "rag",
  run(context: BuildSetuPlanningContext) {
    const rules = retrieveRules(context);

    const hardRules = rules.filter((rule) => rule.priority === "hard");
    const softRules = rules.filter((rule) => rule.priority === "soft");

    const checks: BuildSetuSkillCheck[] = [
      {
        id: "rag-rules-retrieved",
        check: "Planning RAG should retrieve relevant rules",
        status: rules.length ? "pass" : "review",
        note: rules.length ? `Retrieved ${rules.length} planning rules.` : "No planning rules retrieved.",
        severity: rules.length ? "info" : "warning",
      },
      {
        id: "rag-hard-rules-present",
        check: "Hard planning rules should be present",
        status: hardRules.length >= 3 ? "pass" : "review",
        note: hardRules.length >= 3 ? `Hard rules available: ${hardRules.length}.` : `Only ${hardRules.length} hard rules available.`,
        severity: hardRules.length >= 3 ? "info" : "warning",
      },
      {
        id: "rag-soft-rules-present",
        check: "Soft preference rules should be available",
        status: softRules.length ? "pass" : "review",
        note: softRules.length ? `Soft preference rules available: ${softRules.length}.` : "No soft preference rules retrieved.",
        severity: softRules.length ? "info" : "warning",
      },
    ];

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: {
        retrievedRules: rules,
        ruleCount: rules.length,
        hardRuleCount: hardRules.length,
        softRuleCount: softRules.length,
      },
    });
  },
};
