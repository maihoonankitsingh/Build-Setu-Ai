import {
  buildKnowledgeContextForAgent,
  type BuildSetuKnowledgeDomain,
} from "@/lib/agent-knowledge/knowledge-store";
import {
  buildFeedbackContextForAgent,
  type BuildSetuFeedbackDomain,
} from "@/lib/agent-feedback/feedback-store";

export type BuildSetuAgentDomain =
  | "floor_plan"
  | "interior"
  | "exterior"
  | "structure"
  | "mep"
  | "boq"
  | "general";

function clean(value: unknown) {
  return String(value || "").trim();
}

function domainQualityRules(domain: BuildSetuAgentDomain) {
  const common = [
    "Use selected project brief/title/context as source of truth.",
    "Use saved project/global knowledge as memory, not as random text.",
    "If user instruction conflicts with selected project data, prefer selected project data unless user explicitly says change.",
    "Never hallucinate exact codes, costs, structural sizes or legal approval claims.",
    "When required details are missing, either infer safely from project context or ask a precise question.",
    "Output should be client-ready, clean, practical and internally consistent.",
    "Before final output, verify dimensions, adjacency, function, safety, style and readability.",
  ];

  const floorPlan = [
    "Lock plot size, facing, road side, floor, BHK, parking, staircase and wet areas.",
    "Apply human architect zoning: public zone, private zone, service/wet zone and vertical circulation.",
    "Avoid basic block diagram. Every room must have usable proportion, access, door/window and furniture logic.",
    "Kitchen/toilets/utility should be grouped logically for plumbing and ventilation.",
    "Parking should connect to entry without blocking main circulation.",
    "Staircase must have practical position, UP arrow, landing and future-floor logic.",
    "Avoid wasted passage; lobby should improve circulation.",
    "Final plan must show labels, dimensions, doors, windows, furniture, north arrow and road/front side.",
  ];

  const interior = [
    "Understand room function, users, style, furniture scale, lighting, storage and material palette.",
    "Do not make only decorative output; check usability, clearances, circulation and maintenance.",
    "Use reference images as style direction, not exact copy unless user owns/requests same design.",
    "Output should include style, layout, materials, lighting, furniture, colors and practical execution notes.",
  ];

  const exterior = [
    "Understand plot, front width, floors, openings, balcony, parking, gate, climate and style reference.",
    "Facade must match structure/openings and not be impossible to construct.",
    "Respect floor levels, window alignment, material practicality, drainage and maintenance.",
    "Output should include elevation composition, materials, lighting, gate/boundary and day/night view notes.",
  ];

  const structure = [
    "Treat structural output as preliminary only, requiring licensed structural engineer validation.",
    "Do not claim final safety, final member sizes or approval-ready drawings without calculations/site data.",
    "Check spans, column grid, load path, staircase opening, soil/foundation assumptions and seismic/wind context.",
    "Output should separate assumptions, preliminary guidance, missing data and engineer verification requirements.",
  ];

  const boq = [
    "Use project scope, quantities, specs, local rates and wastage assumptions clearly.",
    "Do not invent exact market rates without source/date/city. Mark estimates as approximate.",
    "Separate material, labour, transport, overhead and contingency where possible.",
  ];

  if (domain === "floor_plan") return [...common, ...floorPlan];
  if (domain === "interior") return [...common, ...interior];
  if (domain === "exterior") return [...common, ...exterior];
  if (domain === "structure") return [...common, ...structure];
  if (domain === "boq") return [...common, ...boq];
  return common;
}

function selfReviewChecklist(domain: BuildSetuAgentDomain) {
  const common = [
    "Project context used",
    "Saved knowledge checked",
    "Conflicts handled",
    "Missing critical details handled",
    "Output is practical",
    "Output is readable",
  ];

  const domainMap: Record<string, string[]> = {
    floor_plan: [
      "Plot/facing/floor locked",
      "Room zoning correct",
      "Wet area grouping checked",
      "Door/window/furniture logic checked",
      "Dimensions readable",
      "No wasted corridor",
    ],
    interior: [
      "Furniture scale checked",
      "Lighting layers checked",
      "Material palette consistent",
      "Storage/use-case checked",
      "Reference style followed",
    ],
    exterior: [
      "Facade aligns with openings",
      "Materials practical",
      "Levels/balconies/gate checked",
      "Day/night presentation possible",
      "Reference style followed",
    ],
    structure: [
      "Assumptions stated",
      "Load path considered",
      "Missing data listed",
      "Engineer verification required",
      "No final safety claim",
    ],
    boq: [
      "Scope clear",
      "Quantity/rate assumptions clear",
      "Wastage/contingency included",
      "City/date/source caveat included",
    ],
  };

  return [...common, ...(domainMap[domain] || [])];
}

export function buildUniversalQualityBrainContext(input: {
  projectId?: string;
  domain?: BuildSetuAgentDomain;
  projectTitle?: string;
  projectContext?: unknown;
  userPrompt?: string;
  limit?: number;
}) {
  const domain = input.domain || "general";
  const projectId =
    clean(input.projectId) ||
    clean((input.projectContext as any)?.projectId) ||
    "global";

  const projectKnowledge = buildKnowledgeContextForAgent({
    projectId,
    domain: domain as BuildSetuKnowledgeDomain,
    limit: input.limit || 12,
  });

  const globalKnowledge =
    projectId === "global"
      ? ""
      : buildKnowledgeContextForAgent({
          projectId: "global",
          domain: domain as BuildSetuKnowledgeDomain,
          limit: 8,
        });

  const allDomainKnowledge =
    domain === "general"
      ? ""
      : buildKnowledgeContextForAgent({
          projectId,
          domain: "all",
          limit: 6,
        });

  const knowledge = [projectKnowledge, globalKnowledge, allDomainKnowledge]
    .filter(Boolean)
    .join("\n\n");

  const feedbackContext = buildFeedbackContextForAgent({
    projectId,
    domain: domain as BuildSetuFeedbackDomain,
    limit: 10,
  });

  return [
    "BUILDSETU UNIVERSAL QUALITY BRAIN V4:",
    `Domain: ${domain}`,
    input.projectTitle ? `Project title/context: ${input.projectTitle}` : "",
    "Operating rule: behave like a senior human expert for this domain.",
    "Data priority:",
    "1. Selected project brief/title/context",
    "2. User's latest instruction",
    "3. Saved project knowledge from manual/file/pdf/image/url inputs",
    "4. Global BuildSetu knowledge",
    "5. Safe professional assumptions",
    "",
    "Domain quality rules:",
    ...domainQualityRules(domain).map((x) => `- ${x}`),
    "",
    "Self-review checklist before final output:",
    ...selfReviewChecklist(domain).map((x) => `- ${x}`),
    "",
    knowledge ? "Saved knowledge context:" : "",
    knowledge || "",
    feedbackContext ? "Saved feedback learning context:" : "",
    feedbackContext || "",
    "",
    "Feedback learning rule: user corrections, avoid-rules and approved patterns must override generic style when safe and relevant.",
    "Final answer/generation rule: apply the knowledge, feedback and checklist silently; do not expose internal chain-of-thought. Show only clear plan/output, assumptions, and required cautions.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function attachUniversalQualityBrainToPrompt(input: {
  basePrompt: string;
  projectId?: string;
  domain?: BuildSetuAgentDomain;
  projectTitle?: string;
  projectContext?: unknown;
}) {
  const brain = buildUniversalQualityBrainContext({
    projectId: input.projectId,
    domain: input.domain || "general",
    projectTitle: input.projectTitle,
    projectContext: input.projectContext,
    userPrompt: input.basePrompt,
  });

  return [
    input.basePrompt,
    brain,
    "Quality execution rule: if output cannot satisfy the checklist, ask for missing information or produce a clearly marked concept draft with assumptions.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
