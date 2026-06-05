// BUILDSETU_PHASE_47Q1_PLANNING_UI_CONSUMPTION_ADAPTER

type HumanPlanningResponseLike = {
  title?: string;
  markdown?: string;
  sections?: Record<string, string[]>;
};

type PlanningOutputRoutingEngineLike = {
  requestedOutputs?: string[];
  routePlan?: Array<{
    route?: string;
    priority?: string;
    reason?: string;
    prerequisites?: string[];
    targetApiOrWorkflow?: string;
  }>;
  blockedOutputs?: Array<{
    route?: string;
    priority?: string;
    reason?: string;
    prerequisites?: string[];
    targetApiOrWorkflow?: string;
  }>;
  nextActionOrder?: string[];
};

type PlanningProjectMemoryEngineLike = {
  projectId?: string | null;
  hasProjectContext?: boolean;
  memoryLockCandidates?: Array<{
    key?: string;
    label?: string;
    value?: string;
    lockStatus?: string;
    reason?: string;
  }>;
  nextActions?: string[];
};

type PlanningRegressionQaEngineLike = {
  overallStatus?: string;
  summary?: {
    pass?: number;
    warn?: number;
    fail?: number;
  };
};

type PlanningReferenceIntelligenceLike = {
  hasReferenceIntent?: boolean;
  referenceUseMode?: string;
  detectedReferenceTypes?: string[];
};

export type BuildSetuPlanningUiCard = {
  id: string;
  cardType: "action" | "decision" | "blocked" | "info";
  title: string;
  description: string;
  priority: "primary" | "secondary" | "blocked" | "info";
  status: "ready" | "needs_confirmation" | "blocked";
  targetWorkflow: string;
  source: string;
  metadata: Record<string, unknown>;
};

export type BuildSetuPlanningUiSectionTab = {
  id: string;
  title: string;
  itemCount: number;
  preview: string[];
};

export type BuildSetuPlanningUiConsumptionAdapterResult = {
  engineVersion: "47Q-1";
  title: string;
  projectId: string | null;
  hasProjectContext: boolean;
  qaBadge: {
    status: string;
    pass: number;
    warn: number;
    fail: number;
  };
  actionCards: BuildSetuPlanningUiCard[];
  decisionCards: BuildSetuPlanningUiCard[];
  blockedCards: BuildSetuPlanningUiCard[];
  sectionTabs: BuildSetuPlanningUiSectionTab[];
  primaryCta: string;
  secondaryCtas: string[];
  apiContractNotes: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slug(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function pushUnique<T>(list: T[], value: T, keyFn: (item: T) => string) {
  const key = keyFn(value).toLowerCase();
  if (!list.some((item) => keyFn(item).toLowerCase() === key)) {
    list.push(value);
  }
}

function routeTitle(route: string): string {
  const map: Record<string, string> = {
    concept_floor_plan: "Generate concept floor plan",
    interior_layout: "Generate interior layout",
    working_drawing: "Prepare working drawing checklist",
    elevation_design: "Generate elevation direction",
    three_d_render_prompt: "Generate 3D render prompt",
    boq_estimate: "Generate BOQ / estimate",
    mep_concept: "Generate MEP concept notes",
    structure_concept: "Generate structure concept notes",
    reference_extraction: "Extract uploaded reference",
    professional_review: "Prepare professional review checklist",
  };

  return map[route] || `Run ${route}`;
}

function statusFromPriority(priority: string): BuildSetuPlanningUiCard["status"] {
  if (priority === "blocked") return "blocked";
  if (priority === "primary") return "ready";
  return "needs_confirmation";
}

function buildSectionTabs(sections?: Record<string, string[]>): BuildSetuPlanningUiSectionTab[] {
  const tabs: BuildSetuPlanningUiSectionTab[] = [];
  const preferredOrder = [
    "understanding",
    "planningRecommendation",
    "layoutPatternSuggestions",
    "conceptPlanningActions",
    "roomFurnitureFitChecks",
    "roomSpaceStandards",
    "bylawPlanningGuard",
    "mepStructureCoordination",
    "referenceUnderstanding",
    "projectMemoryVersioning",
    "outputTaskRouting",
    "qaRegressionMatrix",
    "riskAndVerification",
    "nextBestActions",
  ];

  const source = sections || {};
  const keys = [
    ...preferredOrder.filter((key) => Array.isArray(source[key]) && source[key].length > 0),
    ...Object.keys(source).filter((key) => !preferredOrder.includes(key) && Array.isArray(source[key]) && source[key].length > 0),
  ];

  for (const key of keys) {
    const items = source[key] || [];
    tabs.push({
      id: slug(key),
      title: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
      itemCount: items.length,
      preview: items.slice(0, 3),
    });
  }

  return tabs;
}

export function buildPlanningUiConsumptionAdapter(input: {
  humanPlanningResponse?: HumanPlanningResponseLike;
  planningOutputRoutingEngine?: PlanningOutputRoutingEngineLike;
  planningProjectMemoryEngine?: PlanningProjectMemoryEngineLike;
  planningRegressionQaEngine?: PlanningRegressionQaEngineLike;
  planningReferenceIntelligence?: PlanningReferenceIntelligenceLike;
}): BuildSetuPlanningUiConsumptionAdapterResult {
  const human = input.humanPlanningResponse;
  const routing = input.planningOutputRoutingEngine;
  const memory = input.planningProjectMemoryEngine;
  const qa = input.planningRegressionQaEngine;
  const reference = input.planningReferenceIntelligence;

  const actionCards: BuildSetuPlanningUiCard[] = [];
  const decisionCards: BuildSetuPlanningUiCard[] = [];
  const blockedCards: BuildSetuPlanningUiCard[] = [];
  const secondaryCtas: string[] = [];
  const apiContractNotes: string[] = [];

  for (const route of routing?.routePlan || []) {
    const routeName = cleanText(route.route || "unknown_route");
    const priority = cleanText(route.priority || "secondary") as BuildSetuPlanningUiCard["priority"];

    pushUnique(
      actionCards,
      {
        id: `action-${slug(routeName)}`,
        cardType: "action",
        title: routeTitle(routeName),
        description: cleanText(route.reason || "Route is available."),
        priority: priority === "blocked" ? "blocked" : priority === "primary" ? "primary" : "secondary",
        status: statusFromPriority(priority),
        targetWorkflow: cleanText(route.targetApiOrWorkflow || routeName),
        source: "planningOutputRoutingEngine.routePlan",
        metadata: {
          route: routeName,
          prerequisites: route.prerequisites || [],
        },
      },
      (item) => item.id
    );
  }

  for (const route of routing?.blockedOutputs || []) {
    const routeName = cleanText(route.route || "blocked_route");

    pushUnique(
      blockedCards,
      {
        id: `blocked-${slug(routeName)}`,
        cardType: "blocked",
        title: `Blocked: ${routeTitle(routeName)}`,
        description: cleanText(route.reason || "This output is blocked until prerequisites are complete."),
        priority: "blocked",
        status: "blocked",
        targetWorkflow: cleanText(route.targetApiOrWorkflow || routeName),
        source: "planningOutputRoutingEngine.blockedOutputs",
        metadata: {
          route: routeName,
          prerequisites: route.prerequisites || [],
        },
      },
      (item) => item.id
    );
  }

  for (const item of memory?.memoryLockCandidates || []) {
    const status = cleanText(item.lockStatus || "needs_confirmation");

    pushUnique(
      decisionCards,
      {
        id: `decision-${slug(item.key || item.label)}`,
        cardType: "decision",
        title: `Lock: ${cleanText(item.label || item.key || "Project decision")}`,
        description: `${cleanText(item.value)} — ${cleanText(item.reason)}`,
        priority: status === "lock_candidate" ? "primary" : status === "do_not_lock" ? "blocked" : "secondary",
        status: status === "lock_candidate" ? "ready" : status === "do_not_lock" ? "blocked" : "needs_confirmation",
        targetWorkflow: "project-memory-lock",
        source: "planningProjectMemoryEngine.memoryLockCandidates",
        metadata: {
          key: item.key,
          value: item.value,
          lockStatus: item.lockStatus,
        },
      },
      (card) => card.id
    );
  }

  if (reference?.hasReferenceIntent) {
    secondaryCtas.push("Extract reference before final planning");
  }

  if (decisionCards.length) {
    secondaryCtas.push("Review and lock project decisions");
  }

  if (blockedCards.length) {
    secondaryCtas.push("Resolve blocked outputs");
  }

  const primaryReadyAction = actionCards.find((card) => card.priority === "primary" && card.status === "ready");
  const primaryCta = primaryReadyAction?.title || "Continue concept planning";

  apiContractNotes.push("UI should render actionCards as workflow buttons.");
  apiContractNotes.push("UI should render decisionCards as lock/confirm decision cards.");
  apiContractNotes.push("UI should render blockedCards separately with prerequisites.");
  apiContractNotes.push("UI should render sectionTabs as collapsible planning response sections.");
  apiContractNotes.push("No persistent memory write should happen until a user/admin confirms a decision card.");

  return {
    engineVersion: "47Q-1",
    title: cleanText(human?.title || "BuildSetu Planning Response"),
    projectId: cleanText(memory?.projectId || "") || null,
    hasProjectContext: Boolean(memory?.hasProjectContext),
    qaBadge: {
      status: cleanText(qa?.overallStatus || "unknown"),
      pass: Number(qa?.summary?.pass || 0),
      warn: Number(qa?.summary?.warn || 0),
      fail: Number(qa?.summary?.fail || 0),
    },
    actionCards,
    decisionCards,
    blockedCards,
    sectionTabs: buildSectionTabs(human?.sections),
    primaryCta,
    secondaryCtas,
    apiContractNotes,
  };
}

export function buildPlanningUiConsumptionPromptBlock(result: BuildSetuPlanningUiConsumptionAdapterResult): string {
  const lines: string[] = [];

  lines.push("PLANNING UI CONSUMPTION ADAPTER:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Title: ${result.title}`);
  lines.push(`- Project ID: ${result.projectId || "not provided"}`);
  lines.push(`- QA: ${result.qaBadge.status} / pass ${result.qaBadge.pass}, warn ${result.qaBadge.warn}, fail ${result.qaBadge.fail}`);
  lines.push(`- Primary CTA: ${result.primaryCta}`);
  lines.push(`- Action cards: ${result.actionCards.length}`);
  lines.push(`- Decision cards: ${result.decisionCards.length}`);
  lines.push(`- Blocked cards: ${result.blockedCards.length}`);
  lines.push(`- Section tabs: ${result.sectionTabs.length}`);

  result.actionCards.slice(0, 6).forEach((card, index) => {
    lines.push(`${index + 1}. ${card.title} [${card.priority}/${card.status}] — ${card.description}`);
  });

  return lines.join("\n");
}
