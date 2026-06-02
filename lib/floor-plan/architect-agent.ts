export type ArchitectAgentResult = {
  ok: boolean;
  status: "need_more_details" | "ready_to_plan" | "fallback_ready";
  assistantMessage: string;
  missingQuestions: string[];
  confidence: number;
  requirement: {
    plot: {
      widthFt?: number;
      depthFt?: number;
      facing?: "north" | "south" | "east" | "west" | "";
      roadSide?: string;
    };
    floor: "ground" | "first" | "second" | "g_plus_1" | "unknown";
    houseType: "1bhk" | "2bhk" | "3bhk" | "4bhk" | "duplex" | "rental" | "shop_house" | "unknown";
    rooms: {
      bedrooms?: number;
      toilets?: number;
      attachedToilets?: number;
      living?: boolean;
      drawing?: boolean;
      dining?: boolean;
      kitchen?: boolean;
      utility?: boolean;
      puja?: boolean;
      store?: boolean;
      office?: boolean;
      shop?: boolean;
    };
    parking: {
      required?: boolean;
      cars?: number;
      bikes?: number;
    };
    staircase: {
      required?: boolean;
      position?: "inside" | "outside" | "front" | "rear" | "side" | "unknown";
      rentalAccess?: boolean;
    };
    planningPreferences: {
      vastu?: "strict" | "normal" | "ignore" | "unknown";
      priority?: string[];
      style?: string;
      notes?: string[];
    };
  };
  planningRules: string[];
  roomSchedule: Array<{
    name: string;
    preferredSizeFt: string;
    zone: string;
    notes: string;
  }>;
  exactPlannerPrompt: string;
  sourcesUsed: string[];
  raw?: unknown;
};

function safe(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function extractJson(text: string): any | null {
  const raw = safe(text);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {}
  }

  return null;
}



// BUILDSETU_ARCHITECT_AGENT_TRAINING_PACK_V8
function buildArchitectAntiBasicRulesV8() {
  return [
    "Never produce a basic block diagram when user asks for professional planning.",
    "Every room must have a reason: public zone, private zone, wet/service zone, vertical circulation, parking, or utility.",
    "Do not place rooms only as equal rectangles. Use zoning, adjacency, entry sequence and privacy hierarchy.",
    "Do not waste central space with oversized passage. Lobby must improve circulation.",
    "Do not place toilet doors directly facing dining/living where avoidable.",
    "Do not place kitchen isolated from dining/service/wet wall.",
    "Do not place bedrooms without external wall/window opportunity where possible.",
    "Do not place staircase randomly; it should support future floor access and not cut prime living space.",
    "Do not ignore selected project title/context. Project brief is source of truth unless user explicitly changes it.",
    "If OpenAI render is unavailable, fallback SVG must still look like a clean professional architectural sheet.",
  ];
}

function buildArchitectSelfReviewChecklistV8() {
  return [
    "Plot size locked and shown.",
    "Facing/road side interpreted from selected project context.",
    "Entry sequence clear: gate/parking/porch -> living/drawing -> lobby/dining.",
    "Public, private and service zones separated.",
    "Wet areas grouped logically for plumbing.",
    "Each bedroom has usable bed and wardrobe wall.",
    "Kitchen has counter direction, sink/wet wall and ventilation/window.",
    "Staircase has UP arrow, landing and practical position.",
    "Doors have swing clearance and do not clash.",
    "Windows/ventilation/shaft tags included.",
    "Room labels and dimensions are readable.",
    "Furniture symbols are scale-aware and not decorative clutter.",
    "Final output suitable as concept plan, not approval/construction drawing.",
  ];
}

function buildArchitectFewShotTrainingExamplesV8() {
  return [
    {
      caseName: "41x51 north facing 3BHK with parking and staircase",
      planning: [
        "North road/front side: parking/porch and main entry near front.",
        "Living/drawing near entry for guests.",
        "Dining/family lobby in central zone connected to kitchen and bedrooms.",
        "Kitchen and toilets grouped on service side with shaft/window.",
        "Master bedroom in private zone with attached toilet where possible.",
        "Two bedrooms in quieter private/rear/side zones.",
        "Staircase at side/front-service zone with independent future access where possible.",
      ],
    },
    {
      caseName: "30x40 compact 2BHK with parking",
      planning: [
        "Parking should be compact and not consume the whole front.",
        "Living near main door; kitchen/dining central or side-connected.",
        "Two bedrooms should be placed with privacy and windows.",
        "Common toilet and one attached toilet if space permits.",
        "Avoid long corridors; use compact lobby.",
      ],
    },
    {
      caseName: "Modern Indian family house with puja and ventilation",
      planning: [
        "Puja should be a compact clean niche/room near quiet zone, preferably north-east if feasible.",
        "Kitchen should have window/utility/wash connection.",
        "Toilets require external wall or shaft ventilation.",
        "Furniture should verify room usability before final layout.",
      ],
    },
  ];
}

function buildArchitectTrainingBlockV8() {
  const examples = buildArchitectFewShotTrainingExamplesV8();

  return [
    "V8 professional architect training active.",
    "Use selected project brief/title/context as primary source of truth.",
    "Use user message as modification/instruction, not as replacement unless clearly requested.",
    "Think in sequence: site constraints -> zoning -> circulation -> room sizing -> openings -> furniture -> self-review.",
    "First lock plot, facing, road side, floor, BHK, parking, staircase and wet area.",
    "Then create a room program with dimensions and zone notes.",
    "Then verify that the plan can be drawn as a clean 2D architectural sheet.",
    "",
    "Anti-basic rules:",
    ...buildArchitectAntiBasicRulesV8().map((x) => `- ${x}`),
    "",
    "Self-review checklist:",
    ...buildArchitectSelfReviewChecklistV8().map((x) => `- ${x}`),
    "",
    "Few-shot planning examples:",
    ...examples.flatMap((ex) => [
      `- Example: ${ex.caseName}`,
      ...ex.planning.map((line) => `  • ${line}`),
    ]),
  ];
}


// BUILDSETU_ARCHITECT_PLANNING_TRAINING_V6B
function buildProfessionalArchitectTrainingRulesV6B() {
  return [
    "Act like a senior Indian residential architect, not a block diagram generator.",
    "Selected project title/context and saved brief are primary source of truth. Direct user message is instruction/modification.",
    "If selected project context has plot size/facing/BHK, prefer it unless user explicitly says to change it.",
    "Create practical human-style naksha planning with public/private/service zoning.",
    "Use realistic room dimensions, room adjacency, privacy, circulation, wet-area grouping, structure/MEP logic, door/window placement and furniture scale.",
    "Do not create random rectangles. Every room must have usable proportion, access, ventilation and relationship to adjacent spaces.",
    "Parking/porch should be near road/front side with main entry connection.",
    "Living/drawing should be near entry; dining/lobby should connect living, kitchen and bedroom zone.",
    "Bedrooms should be in private zone with wardrobe wall and external window where possible.",
    "Kitchen/toilets/utility should be grouped as wet/service zone with ventilation shaft/window.",
    "Staircase should sit in side/front/service zone with UP arrow and landing; avoid cutting main living space.",
    "Doors must have swing clearance. Avoid toilet door directly facing dining/living where practical.",
    "Floor plan output must support professional drafting: walls, doors, windows, labels, dimensions, furniture symbols, north arrow, front/road side and title block.",
  ];
}

function buildProfessionalRoomScheduleV6B(widthFt?: number, depthFt?: number, bedrooms?: number, toilets?: number, parking = true, staircase = true, puja = false) {
  const area = Number(widthFt || 0) * Number(depthFt || 0);
  const smallPlot = area > 0 && area <= 1400;
  const bedCount = bedrooms || 2;
  const toiletCount = toilets || Math.max(1, Math.min(3, bedCount));

  const rows: Array<{ name: string; preferredSizeFt: string; zone: string; notes: string }> = [];

  if (parking) {
    rows.push({
      name: "Parking / Porch",
      preferredSizeFt: smallPlot ? "9x15 to 10x16" : "10x16 to 12x18",
      zone: "front / road side",
      notes: "gate access, car clearance, direct connection to entrance lobby",
    });
  }

  rows.push({
    name: "Drawing / Living",
    preferredSizeFt: smallPlot ? "11x13 to 12x15" : "12x15 to 14x18",
    zone: "front / public zone",
    notes: "guest access near main door, sofa/TV wall, front or side window",
  });

  rows.push({
    name: "Dining / Family Lobby",
    preferredSizeFt: smallPlot ? "8x10 to 10x12" : "10x12 to 13x14",
    zone: "central transition zone",
    notes: "connects living, kitchen and bedroom lobby with clean circulation",
  });

  rows.push({
    name: "Kitchen",
    preferredSizeFt: smallPlot ? "8x9 to 9x11" : "9x11 to 11x13",
    zone: "service / wet zone",
    notes: "L/U counter, sink on plumbing wall, window/ventilation, utility if possible",
  });

  if (puja) {
    rows.push({
      name: "Puja / Mandir",
      preferredSizeFt: smallPlot ? "3x4 to 4x5" : "4x4 to 5x6",
      zone: "clean quiet zone",
      notes: "prefer north-east if practical; do not block circulation",
    });
  }

  for (let i = 1; i <= bedCount; i++) {
    rows.push({
      name: i === 1 ? "Master Bedroom" : `Bedroom ${i}`,
      preferredSizeFt: i === 1 ? (smallPlot ? "11x12 to 12x14" : "12x14 to 14x16") : (smallPlot ? "10x11 to 11x12" : "11x12 to 13x14"),
      zone: "private zone",
      notes: "bed placement, wardrobe wall, external window, privacy from main entry",
    });
  }

  for (let i = 1; i <= toiletCount; i++) {
    rows.push({
      name: i === 1 ? "Common Toilet" : i === 2 ? "Attached Toilet" : `Toilet ${i}`,
      preferredSizeFt: smallPlot ? "4x7 to 5x8" : "5x7 to 6x8",
      zone: "wet zone / shaft side",
      notes: "group with kitchen/utility where possible; exhaust/window/shaft required",
    });
  }

  if (staircase) {
    rows.push({
      name: "Staircase",
      preferredSizeFt: smallPlot ? "6x10 to 7x12" : "7x12 to 9x14",
      zone: "side/front service zone",
      notes: "UP arrow, landing, future floor access; avoid blocking living/dining",
    });
  }

  rows.push({
    name: "Passage / Lobby",
    preferredSizeFt: "3.5 ft to 5.5 ft clear width",
    zone: "central circulation",
    notes: "short, clear, no dead corridor; avoid door clashes",
  });

  return rows;
}

function buildProfessionalExactPlannerPromptV6B(args: {
  prompt: string;
  projectTitle: string;
  widthFt?: number;
  depthFt?: number;
  facing?: string;
  bedrooms?: number;
  toilets?: number;
  parking?: boolean;
  staircase?: boolean;
  puja?: boolean;
  floor?: string;
}) {
  const schedule = buildProfessionalRoomScheduleV6B(
    args.widthFt,
    args.depthFt,
    args.bedrooms,
    args.toilets,
    args.parking !== false,
    args.staircase !== false,
    Boolean(args.puja)
  );

  return [
    "PROFESSIONAL HUMAN-ARCHITECT FLOOR PLAN BRIEF",
    "",
    `Project/context: ${args.projectTitle || "Selected BuildSetu project"}`,
    args.prompt ? `Client instruction: ${args.prompt}` : "",
    args.widthFt && args.depthFt ? `Locked plot size: ${args.widthFt} x ${args.depthFt} ft.` : "Plot size: use selected project context if available; otherwise ask.",
    args.facing ? `Facing / road side: ${args.facing}.` : "Facing: use selected project context if available; otherwise assume front road entry and mark north arrow.",
    args.floor ? `Floor: ${args.floor}.` : "Floor: ground floor unless project context says otherwise.",
    args.bedrooms ? `Bedrooms/BHK: ${args.bedrooms}.` : "Bedrooms: infer from project context or client request.",
    args.toilets ? `Toilets: ${args.toilets}.` : "Toilets: provide practical common/attached split based on BHK.",
    args.parking !== false ? "Parking/porch: required." : "",
    args.staircase !== false ? "Staircase: required with UP arrow and landing." : "",
    args.puja ? "Puja/mandir: required if space permits." : "",
    "",
    "Planning standard:",
    ...buildProfessionalArchitectTrainingRulesV6B().map((x) => `- ${x}`),
    "",
    "BuildSetu V8 training pack:",
    ...buildArchitectTrainingBlockV8().map((x) => x ? `- ${x}` : ""),
    "",
    "Room schedule:",
    ...schedule.map((r) => `- ${r.name}: ${r.preferredSizeFt}; zone: ${r.zone}; notes: ${r.notes}`),
    "",
    "Drafting requirements:",
    "- Top-down 2D architectural floor plan only.",
    "- Thick outer walls, inner partitions, clear door/window openings.",
    "- Door swing arcs, windows, ventilation/shaft tags, furniture symbols and readable dimensions.",
    "- Title, plot size, north arrow, road/front side, room labels and furniture layout.",
    "- Avoid random block plan, 3D view, facade, elevation, unreadable labels and mismatched plot size.",
  ].filter(Boolean).join(String.fromCharCode(10));
}


function fallbackArchitectPlanner(input: {
  projectTitle?: string;
  prompt?: string;
  projectContext?: unknown;
}): ArchitectAgentResult {
  const prompt = safe(input.prompt);
  const projectTitle = safe(input.projectTitle, "Selected Project");
  const contextText = (() => {
    try {
      return JSON.stringify(input.projectContext || {});
    } catch {
      return "";
    }
  })();
  const combined = `${projectTitle} ${prompt} ${contextText}`.toLowerCase();

  const size = combined.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})/);
  const widthFt = size ? Number(size[1]) : undefined;
  const depthFt = size ? Number(size[2]) : undefined;

  const facing =
    combined.includes("south") ? "south" :
    combined.includes("east") ? "east" :
    combined.includes("west") ? "west" :
    combined.includes("north") ? "north" : "";

  const bedroomsMatch = combined.match(/(\d)\s*bhk|(\d)\s*bed/);
  const bedrooms = bedroomsMatch ? Number(bedroomsMatch[1] || bedroomsMatch[2]) : undefined;

  const toiletsMatch = combined.match(/(\d)\s*(toilet|bath|washroom)/);
  const toilets = toiletsMatch ? Number(toiletsMatch[1]) : undefined;

  const parkingRequired =
    combined.includes("parking") ||
    combined.includes("porch") ||
    combined.includes("garage") ||
    combined.includes("car") ||
    true;

  const staircaseRequired =
    combined.includes("stair") ||
    combined.includes("staircase") ||
    combined.includes("seedhi") ||
    combined.includes("सीढ़") ||
    combined.includes("g+1") ||
    true;

  const pujaRequired =
    combined.includes("puja") ||
    combined.includes("pooja") ||
    combined.includes("mandir") ||
    combined.includes("temple");

  const missingQuestions: string[] = [];
  if (!widthFt || !depthFt) missingQuestions.push("Plot size kya hai? Example: 30x40, 41x51.");
  if (!facing) missingQuestions.push("Plot facing kya hai? North, South, East ya West?");
  if (!bedrooms) missingQuestions.push("Kitne BHK/bedrooms chahiye?");
  if (!toilets && !bedrooms) missingQuestions.push("Kitne toilets chahiye? Attached/common?");
  if (!combined.includes("parking") && !combined.includes("porch")) missingQuestions.push("Parking/porch chahiye? Car/bike count?");
  if (!combined.includes("stair")) missingQuestions.push("Staircase inside chahiye ya outside/rental access ke liye?");

  const ready = missingQuestions.length <= 2 && Boolean(widthFt && depthFt && facing && bedrooms);

  const exactPlannerPrompt = buildProfessionalExactPlannerPromptV6B({
    prompt,
    projectTitle,
    widthFt,
    depthFt,
    facing,
    bedrooms,
    toilets,
    parking: parkingRequired,
    staircase: staircaseRequired,
    puja: pujaRequired,
    floor: combined.includes("first") || combined.includes("1st") ? "first" : combined.includes("g+1") ? "g_plus_1" : "ground",
  });

  return {
    ok: true,
    status: ready ? "fallback_ready" : "need_more_details",
    assistantMessage: ready
      ? "Professional V8 planning brief ready hai. Main selected project context ke basis par clean human-architect style 2D naksha bana sakta hoon."
      : "Planning start karne se pehle kuch missing details chahiye.",
    missingQuestions,
    confidence: ready ? 0.72 : 0.48,
    requirement: {
      plot: { widthFt, depthFt, facing: facing as any, roadSide: facing || "" },
      floor: combined.includes("first") || combined.includes("1st") ? "first" : combined.includes("g+1") ? "g_plus_1" : "ground",
      houseType: bedrooms ? `${bedrooms}bhk` as any : "unknown",
      rooms: {
        bedrooms,
        toilets,
        living: true,
        drawing: combined.includes("drawing"),
        dining: combined.includes("dining") || true,
        kitchen: true,
        utility: combined.includes("utility") || combined.includes("wash"),
        puja: combined.includes("puja") || combined.includes("pooja") || combined.includes("mandir"),
        store: combined.includes("store"),
        office: combined.includes("office"),
        shop: combined.includes("shop"),
      },
      parking: {
        required: combined.includes("parking") || combined.includes("porch") || true,
        cars: combined.includes("2 car") ? 2 : 1,
        bikes: combined.includes("bike") ? 2 : 0,
      },
      staircase: {
        required: combined.includes("stair") || true,
        position: combined.includes("outside") ? "outside" : combined.includes("inside") ? "inside" : "unknown",
        rentalAccess: combined.includes("rental") || combined.includes("rent"),
      },
      planningPreferences: {
        vastu: combined.includes("vastu") ? "normal" : "unknown",
        priority: [],
        style: "Indian residential practical planning",
        notes: [prompt],
      },
    },
    planningRules: buildProfessionalArchitectTrainingRulesV6B(),
    roomSchedule: buildProfessionalRoomScheduleV6B(widthFt, depthFt, bedrooms, toilets, parkingRequired, staircaseRequired, pujaRequired),
    exactPlannerPrompt,
    sourcesUsed: ["buildsetu_professional_architect_planning_training_v6b", "buildsetu_architect_agent_training_pack_v8"],
  };
}

export async function runArchitectPlanningAgent(input: {
  projectTitle?: string;
  prompt?: string;
  projectContext?: unknown;
  useWeb?: boolean;
}): Promise<ArchitectAgentResult> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
  const prompt = safe(input.prompt);
  const projectTitle = safe(input.projectTitle, "Selected Project");

  if (!apiKey) {
    return fallbackArchitectPlanner(input);
  }

  const useWeb =
    input.useWeb === true ||
    process.env.BUILDSETU_ARCHITECT_AGENT_WEB === "1" ||
    process.env.BUILDSETU_ARCHITECT_AGENT_WEB === "true";

  const systemPrompt = `
You are BuildSetu Planning & Architecture Agent for Indian residential projects.

You must behave like a senior human residential architect. Selected project title/context and saved brief are primary source of truth; user message is instruction/modification. Produce professional planning data suitable for a clean 2D architectural floor plan, not a basic block diagram.

Planning quality rules:
- Resolve plot size, facing, floor, BHK, toilets, parking, staircase, puja, utility and style from selected project context plus user message.
- Prefer selected project context when user message conflicts, unless user explicitly says to change it.
- Apply public/private/service zoning, clean circulation, wet-area grouping, privacy, natural light/ventilation, door/window placement, furniture scale, staircase logic and parking access.
- Every room must have practical proportions, access, ventilation and relationship to adjacent spaces.
- RoomSchedule must include realistic dimensions and zone notes.
- exactPlannerPrompt must be detailed enough for deterministic exact planner and professional fallback SVG renderer.
- Apply BuildSetu V8 training: few-shot style planning, anti-basic-plan rules, self-review checklist, zoning sequence, furniture-scale verification and final drafting clarity.
- Never output a basic block diagram when the user asks for professional floor planning.

Your job:
1. Understand client requirements from Hindi/English/Hinglish.
2. Ask missing questions only when required.
3. Apply practical Indian residential planning logic.
4. Produce structured planning data, not image prompts.
5. Do not hallucinate legal approval. Mention professional validation where needed.
6. Use web search only for general planning references or current local rule context, but do not claim final legal compliance unless exact municipality/bylaw is provided.

Return ONLY valid JSON with this shape:
{
  "ok": true,
  "status": "need_more_details" | "ready_to_plan",
  "assistantMessage": "short Hinglish answer",
  "missingQuestions": ["..."],
  "confidence": 0.0,
  "requirement": {
    "plot": { "widthFt": 0, "depthFt": 0, "facing": "north|south|east|west|", "roadSide": "" },
    "floor": "ground|first|second|g_plus_1|unknown",
    "houseType": "1bhk|2bhk|3bhk|4bhk|duplex|rental|shop_house|unknown",
    "rooms": {
      "bedrooms": 0,
      "toilets": 0,
      "attachedToilets": 0,
      "living": true,
      "drawing": true,
      "dining": true,
      "kitchen": true,
      "utility": false,
      "puja": false,
      "store": false,
      "office": false,
      "shop": false
    },
    "parking": { "required": true, "cars": 1, "bikes": 0 },
    "staircase": { "required": true, "position": "inside|outside|front|rear|side|unknown", "rentalAccess": false },
    "planningPreferences": {
      "vastu": "strict|normal|ignore|unknown",
      "priority": ["..."],
      "style": "",
      "notes": ["..."]
    }
  },
  "planningRules": ["..."],
  "roomSchedule": [
    { "name": "", "preferredSizeFt": "", "zone": "", "notes": "" }
  ],
  "exactPlannerPrompt": "clean prompt for deterministic exact planner",
  "sourcesUsed": ["..."]
}
`;

  const userInput = `
Project title: ${projectTitle}

Client requirement:
${prompt}

Existing project context:
${JSON.stringify(input.projectContext || {}, null, 2)}

Create Indian residential planning brief. If critical information is missing, ask questions instead of forcing a wrong plan.
`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.BUILDSETU_ARCHITECT_AGENT_MODEL || "gpt-5.5",
        tools: useWeb ? [{ type: "web_search" }] : [],
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ...fallbackArchitectPlanner(input),
        sourcesUsed: ["fallback_after_openai_error"],
        raw: json,
      };
    }

    const outputText =
      json?.output_text ||
      json?.output?.flatMap?.((item: any) => item?.content || [])
        ?.map?.((content: any) => content?.text || "")
        ?.join?.("\n") ||
      "";

    const parsed = extractJson(outputText);

    if (!parsed) {
      return {
        ...fallbackArchitectPlanner(input),
        sourcesUsed: ["fallback_after_json_parse_failed"],
        raw: json,
      };
    }

    return {
      ok: Boolean(parsed.ok ?? true),
      status: parsed.status === "need_more_details" ? "need_more_details" : "ready_to_plan",
      assistantMessage: safe(parsed.assistantMessage, "Planning brief ready hai."),
      missingQuestions: Array.isArray(parsed.missingQuestions) ? parsed.missingQuestions : [],
      confidence: Number(parsed.confidence || 0.75),
      requirement: parsed.requirement,
      planningRules: Array.isArray(parsed.planningRules) ? parsed.planningRules : [],
      roomSchedule: Array.isArray(parsed.roomSchedule) ? parsed.roomSchedule : [],
      exactPlannerPrompt: safe(parsed.exactPlannerPrompt, prompt),
      sourcesUsed: Array.isArray(parsed.sourcesUsed) ? parsed.sourcesUsed : [useWeb ? "openai_web_search_enabled" : "openai_no_web"],
      raw: parsed,
    };
  } catch (error: any) {
    return {
      ...fallbackArchitectPlanner(input),
      sourcesUsed: ["fallback_after_exception"],
      raw: { error: error?.message || String(error) },
    };
  }
}
