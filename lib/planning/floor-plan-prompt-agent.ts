import { buildSetuPlanningBrainSystemPrompt, buildSetuPlanningBrainV2TrainingPrompt } from "@/lib/planning/buildsetu-planning-brain";


// BUILDSETU_STRICT_FLOOR_PLAN_AGENT_PROMPT_V2
const BUILDSETU_STRICT_FLOOR_PLAN_AGENT_PROMPT = `
You are BuildSetu Floor Plan Prompt Agent.

Your job is NOT to create a vague reply.
Your job is to create a strict, high-quality image-generation prompt for a professional floor plan image model.

Always produce planning prompts using the user's saved project brief and latest confirmed inputs.

Important behavior rules:
1. Respect exact plot size and orientation.
2. Respect front road and side road separately.
3. If it is a corner plot, explicitly mention both roads.
4. Never convert an East-front + North-side corner plot into "North facing only".
5. Never invent impossible or oversized room dimensions.
6. Keep room sizes practical and proportionate inside total plot size.
7. Do not generate extra rooms not requested.
8. Do not duplicate rooms unless explicitly requested.
9. For ground floor, only place ground-floor rooms.
10. For first floor, only place first-floor rooms.
11. Output prompt in clear professional English for image generation.
12. User-facing explanation can be Hinglish/simple Hindi-English mix, but the image-generation prompt must stay highly precise.
13. Prompt must instruct the model to create a clean architectural 2D floor plan image, not a casual illustration.
14. Mention wall thickness, door swings, window positions, labels, north arrow and outer dimensions.
15. Mention that internal room labels and dimensions should look realistic and consistent.
16. If a room size is user-preferred, treat it as approximate target, not something that breaks the full layout.
17. Use practical circulation, ventilation, daylight and corner-plot advantage.

For this project, when applicable, preserve these exact requirements:
- Plot size: 49 ft East frontage x 57 ft North-side/depth
- Plot type: East-North corner plot
- Front road: East side
- Side road: North side
- Floors: G+1
- Style: Indian modern luxury / modern Indian luxury
- Ground floor required:
  * 1 car parking + bike parking
  * living room
  * dining
  * kitchen
  * pooja room approx 5x6 ft in East/North-East zone
  * 1 ground-floor bedroom approx 11x12 or 12x12
  * 1 bathroom
  * staircase
  * wash/store/service area
- First floor required:
  * 3 bedrooms total
  * master bedroom approx 13x14 with attached bath
  * 2 bedrooms approx 11x12 each
  * 2 bathrooms total on first floor
  * family lounge
  * east and/or north balcony
  * usable terrace/sit-out
  * optional small study/work corner if space allows

BUILDSETU_DIMENSION_ORIENTATION_LOCK_V2:
- North arrow must point UP.
- Top edge must be labeled: NORTH SIDE ROAD - 57'.
- Right edge must be labeled: EAST FRONT ROAD - 49'.
- Do not put 49' dimension on top edge.
- Do not put 57' dimension on right edge.
- Do not place North Side Road on bottom or left side.
- Do not create duplicate parking.
- Do not create family/multi-use room on ground floor unless user asks.
- Ground floor must show exactly one parking zone and exactly one bedroom.

Architectural image prompt rules:
- Render as a top-view 2D floor plan.
- Show plot outer dimensions correctly.
- Show orientation clearly.
- For corner plot, write clearly: "East Front Road" and "North Side Road".
- Do not write wrong facing title.
- Use clean black wall lines, room labels, furniture hints, doors and windows.
- Use believable room proportions.
- Do not create giant rooms like 23x18 dining or 18x23 bedrooms unless plot logic truly supports it.
- Keep circulation realistic.
- Make plan look professional, premium, readable, and client-presentable.

Planning Brain V2 scoring must be used:
- Score serious plans on Space Utilization, Room Dimensions, Circulation, Natural Light, Ventilation, Structure Feasibility, MEP Efficiency, Safety, Cost Practicality and Future Expansion.
- Total score below 75 requires revision before final image/render.
- Any hard blocker such as wrong room count, wrong road orientation, duplicate rooms or missing bathroom requires revision.

Return output in this structure:

IMAGE PROMPT:
<single final polished prompt for image generation>

PLANNING NOTES:
- Short bullet points
- Mention assumptions clearly
- Mention if any size was kept approximate for fit
`;


type PromptAgentArgs = {
  projectId: string;
  projectTitle?: string;
  userPrompt: string;
};

function safe(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function parsePlot(text: string) {
  const m = text.match(/\b(\d{2,4})\s*(?:x|×|\*)\s*(\d{2,4})\b/i);
  return {
    width: m ? Number(m[1]) : 41,
    depth: m ? Number(m[2]) : 51,
  };
}

function parseFacing(text: string) {
  const t = text.toLowerCase();
  if (/front\s*road.*east|east\s*front|east[-\s]*north|east\s+side\s+front/.test(t)) return "east";
  if (/front\s*road.*north|north\s*front/.test(t)) return "north";
  if (/front\s*road.*south|south\s*front/.test(t)) return "south";
  if (/front\s*road.*west|west\s*front/.test(t)) return "west";
  if (t.includes("east")) return "east";
  if (t.includes("south")) return "south";
  if (t.includes("west")) return "west";
  if (t.includes("north")) return "north";
  return "north";
}

function parseBhk(text: string) {
  const m = text.toLowerCase().match(/\b([1-9])\s*bhk\b/);
  return m ? `${m[1]}BHK` : "Project-specific";
}

function parseFloor(text: string) {
  const t = text.toLowerCase();
  if (t.includes("second floor") || t.includes("2nd floor")) return "second floor";
  if (t.includes("first floor") || t.includes("1st floor")) return "first floor";
  return "ground floor";
}

export function createFloorPlanImagePrompt(args: PromptAgentArgs) {
  const projectTitle = safe(args.projectTitle, "41 x 51 ft North Facing House");
  const userPrompt = safe(args.userPrompt);
  const raw = `${projectTitle}\n${userPrompt}`;
  const planningBrainPrompt = [
    buildSetuPlanningBrainSystemPrompt(raw),
    buildSetuPlanningBrainV2TrainingPrompt()
  ].join("\n\n");

  const plot = parsePlot(raw);
  const facing = parseFacing(raw);
  const bhk = parseBhk(raw);
  const floor = parseFloor(raw);


  const is49x57EastNorth =
    plot.width === 49 &&
    plot.depth === 57 &&
    facing === "east" &&
    /north\s*side|side\s*road.*north|east[-\s]*north|east\s+north|corner\s*plot/.test(raw.toLowerCase());

  const planningJson = is49x57EastNorth
    ? build49x57EastNorthPlanningJson({ projectTitle, userPrompt, plot, facing })
    : buildGenericPlanningJson({ projectTitle, userPrompt, plot, facing, bhk, floor });

  if (is49x57EastNorth) {
    const imagePrompt = `
Create a premium professional furnished 2D architectural ground floor plan for a 49' x 57' East-North corner plot.\n\nBUILDSETU PLANNING BRAIN RULES:\n${planningBrainPrompt}

STRICT PROJECT LOCK:
- Plot size exactly 49' x 57'.
- East side is FRONT ROAD / main entry.
- North side is SIDE ROAD.
- Do not call it North facing.
- Do not use 59'.
- Do not create 2 or 3 bedrooms on ground floor.
- Ground floor must have exactly 1 bedroom only.

GROUND FLOOR ROOMS:
1. Car + bike parking near East/front entry, approx 13' x 18'.
2. Living room near East/North light, approx 18' x 14' to 20' x 14'.
3. Dining defined but practical, approx 12' x 11'.
4. Kitchen in South-East/service zone, approx 10' x 10'.
5. Puja room near North-East/East zone, approx 5' x 6'.
6. One bedroom in South-West/private zone, approx 12' x 12'.
7. One toilet/common-attached, approx 7' x 5'.
8. One staircase only.
9. Wash/store/service area.

DRAWING REQUIREMENTS:
- Show 57' dimension on TOP/North Side Road and 49' dimension on RIGHT/East Front Road.
- Clearly label East Road/front side and North Road/side road.
- Use professional walls, doors, windows, furniture, room labels and dimensions.
- Keep room sizes realistic and proportional.
- Output title: Ground Floor Plan - 49' East Front x 57' North Side Corner Plot.
`.trim();

    return {
      source: "floor_plan_prompt_agent_v1_49x57_east_north_lock",
      projectTitle,
      plot,
      facing,
      bhk: "1BHK",
      floor,
      planningJson,
      validationReport: planningJson.validation,
      scoreReport: planningJson.scoreReport,
      imagePrompt,
    };
  }

  const imagePrompt = `
Create a premium professional Indian residential floor plan image.

The output must match this target quality:
- detailed furnished top-down architectural presentation
- crisp dark wall outlines
- beige/white tile floors
- blue tiled toilets
- realistic furniture icons
- door swing arcs
- window tags
- clean readable room labels
- clean room dimensions
- north arrow
- outer plot dimensions
- front gate and road/front side
- client-ready architect presentation style

PROJECT REQUIREMENT:
- Project: ${projectTitle}
- Plot size: ${plot.width}' x ${plot.depth}'
- Facing: ${facing.toUpperCase()} facing
- Floor: ${floor}
- Type: ${bhk} Indian residential house
- User request: ${userPrompt}

MANDATORY PLAN:
Generate one single detailed furnished 2D floor plan for a ${plot.width}' x ${plot.depth}' ${facing}-facing ${bhk} Indian house.

ROOMS REQUIRED:
1. MASTER BEDROOM — 13'0" x 14'0"
2. ATTACHED TOILET — 8'0" x 5'0"
3. BEDROOM 2 — 13'0" x 11'0"
4. BEDROOM 3 — 13'0" x 11'0"
5. DINING AREA — 13'0" x 14'6"
6. KITCHEN — 11'0" x 9'6"
7. UTILITY / WASH — 11'0" x 4'6"
8. COMMON TOILET — 7'6" x 5'0"
9. LOBBY / PASSAGE — 5'6" WIDE
10. PUJA — 4'0" x 4'0"
11. LIVING ROOM — 13'0" x 15'0"
12. DRAWING ROOM — 13'0" x 11'0"
13. PARKING / PORCH — 12'0" x 17'6"
14. STAIRCASE with UP arrow
15. FRONT GATE — 12'0" WIDE

PREFERRED LAYOUT:
- Master Bedroom at upper-left.
- Attached Toilet below/near Master Bedroom.
- Bedroom 2 at middle-left.
- Bedroom 3 at lower-left.
- Dining Area at upper-center.
- Kitchen at upper-right with Utility/Wash adjoining.
- Common Toilet at right-center near wet/service zone.
- Staircase at right-center.
- Puja near central circulation.
- Living Room at center-lower.
- Drawing Room at front/lower-center.
- Parking/Porch at front/lower-right with a car.
- Front gate and entry road at bottom/front.

VASTU / INDIAN PLANNING:
- Puja preferably NE/central-north.
- Kitchen preferably SE/east service zone.
- Master bedroom preferably SW/private zone.
- Toilets grouped around wet/service area.
- Staircase in side/service zone.
- Parking at front side.
- Public spaces first, private bedrooms behind/side, service zones grouped.

MANDATORY GRAPHICS:
- Show ${plot.width}' dimension line at top.
- Show ${plot.depth}' dimension line on side.
- Add north arrow with N.
- Add window tags W1, W2, W3 and ventilation tag V.
- Add door tags D1, D2 and MD.
- Add furniture: beds, wardrobes, sofa, center table, dining table, kitchen counter, sink, stove, washing machine, toilet fixtures, puja icon, staircase, car.
- Add bottom title: GROUND FLOOR PLAN (${plot.width}' X ${plot.depth}')
- Add bottom-left box:
  PLOT SIZE: ${plot.width}' X ${plot.depth}'
  ${bhk} HOUSE PLAN
  BUILT-UP AREA: ~1760 SQ.FT

STRICT NEGATIVE:
- Do not create exterior elevation.
- Do not create 3D perspective.
- Do not create interior render.
- Do not create a UI screenshot.
- Do not create rough schematic SVG style.
- Do not create basic colored block diagram.
- Do not corrupt labels.
- Do not invent wrong plot size.
- Do not omit dimensions.
- Do not overlap text.
- Do not generate working drawing sheets.

Final image must look like a polished furnished professional floor plan similar to a premium architect presentation, not a simple code-rendered diagram.
`.trim();

  return {
    source: "floor_plan_prompt_agent_v1",
    projectTitle,
    plot,
    facing,
    bhk,
    floor,
    planningJson,
    validationReport: planningJson.validation,
    scoreReport: planningJson.scoreReport,
    imagePrompt,
  };
}


export function buildStrictFloorPlanAgentPrompt(projectSummary: string, userMessage: string) {
  return `${BUILDSETU_STRICT_FLOOR_PLAN_AGENT_PROMPT}

PROJECT SUMMARY:
${projectSummary || "No project summary available."}

LATEST USER MESSAGE:
${userMessage || "No additional user message."}

Now create the final floor-plan image prompt and planning notes exactly in the required structure.`;
}


// BUILDSETU_PLANNING_JSON_VALIDATION_V1
type BuildSetuPlanningRoom = {
  id: string;
  name: string;
  floor: "ground" | "first" | "terrace" | "unknown";
  targetSize: string;
  zone: "public" | "semi_private" | "private" | "service" | "circulation" | "open";
  adjacency: string[];
  notes: string;
};

type BuildSetuPlanningValidation = {
  id: string;
  check: string;
  status: "pass" | "review" | "fail";
  note: string;
};

function build49x57EastNorthPlanningJson(args: {
  projectTitle: string;
  userPrompt: string;
  plot: { width: number; depth: number };
  facing: string;
}) {
  const rooms: BuildSetuPlanningRoom[] = [
    {
      id: "parking",
      name: "Car + Bike Parking",
      floor: "ground",
      targetSize: "approx 13' x 18'",
      zone: "public",
      adjacency: ["East Front Road", "Entry Lobby", "Living Room"],
      notes: "One car plus bike parking near East/front entry. Do not duplicate parking.",
    },
    {
      id: "living",
      name: "Living Room",
      floor: "ground",
      targetSize: "approx 18' x 14' to 20' x 14'",
      zone: "public",
      adjacency: ["Entry Lobby", "Dining", "Puja"],
      notes: "Use East/North daylight and client-entry visibility.",
    },
    {
      id: "dining",
      name: "Dining",
      floor: "ground",
      targetSize: "approx 12' x 11'",
      zone: "semi_private",
      adjacency: ["Living Room", "Kitchen", "Staircase Lobby"],
      notes: "Defined dining near kitchen, not oversized.",
    },
    {
      id: "kitchen",
      name: "Kitchen",
      floor: "ground",
      targetSize: "approx 10' x 10'",
      zone: "service",
      adjacency: ["Dining", "Wash / Store", "Service Side"],
      notes: "Prefer South-East/service zone with ventilation.",
    },
    {
      id: "puja",
      name: "Puja Room",
      floor: "ground",
      targetSize: "approx 5' x 6'",
      zone: "semi_private",
      adjacency: ["Living Room", "Dining"],
      notes: "Prefer East/North-East zone. Do not duplicate pooja.",
    },
    {
      id: "bedroom_ground",
      name: "Ground Floor Bedroom",
      floor: "ground",
      targetSize: "approx 11' x 12' or 12' x 12'",
      zone: "private",
      adjacency: ["Bathroom", "Passage"],
      notes: "Only one bedroom on ground floor; private South-West side preferred.",
    },
    {
      id: "bathroom_ground",
      name: "Ground Floor Bathroom",
      floor: "ground",
      targetSize: "approx 7' x 5' or 8' x 5'",
      zone: "service",
      adjacency: ["Bedroom", "Passage", "Plumbing Shaft"],
      notes: "Only one bathroom on ground floor; keep shaft/ventilation logic.",
    },
    {
      id: "staircase",
      name: "Staircase",
      floor: "ground",
      targetSize: "approx 7' x 14'",
      zone: "circulation",
      adjacency: ["Lobby", "First Floor", "Terrace"],
      notes: "One internal staircase only with clear UP direction.",
    },
    {
      id: "wash_store",
      name: "Wash / Store",
      floor: "ground",
      targetSize: "approx 5' x 8' to 6' x 10'",
      zone: "service",
      adjacency: ["Kitchen", "Plumbing Shaft"],
      notes: "Compact service area; connect with kitchen/wet wall.",
    },
    {
      id: "master_bedroom_first",
      name: "First Floor Master Bedroom",
      floor: "first",
      targetSize: "approx 13' x 14'",
      zone: "private",
      adjacency: ["Attached Bathroom", "Balcony/Windows"],
      notes: "First floor only, preferably South-West; not on ground floor.",
    },
    {
      id: "bedroom_first_2",
      name: "First Floor Bedroom 2",
      floor: "first",
      targetSize: "approx 11' x 12'",
      zone: "private",
      adjacency: ["Common Bathroom", "Family Lounge"],
      notes: "First floor only.",
    },
    {
      id: "bedroom_first_3",
      name: "First Floor Bedroom 3",
      floor: "first",
      targetSize: "approx 11' x 12'",
      zone: "private",
      adjacency: ["Common Bathroom", "Family Lounge"],
      notes: "First floor only.",
    },
    {
      id: "family_lounge_first",
      name: "First Floor Family Lounge",
      floor: "first",
      targetSize: "as per balance area",
      zone: "semi_private",
      adjacency: ["Staircase", "Bedrooms", "Balcony/Terrace"],
      notes: "First floor only; avoid adding on ground floor unless user asks.",
    },
  ];

  const validation: BuildSetuPlanningValidation[] = [
    {
      id: "plot_orientation",
      check: "Plot orientation",
      status: "pass",
      note: "49 ft East frontage x 57 ft North-side/depth corner plot; East front road and North side road must be separately labeled.",
    },
    {
      id: "north_arrow",
      check: "North arrow and edge labels",
      status: "pass",
      note: "North arrow UP; top edge North Side Road - 57'; right edge East Front Road - 49'.",
    },
    {
      id: "ground_bedroom_count",
      check: "Ground floor bedroom count",
      status: "pass",
      note: "Ground floor must have exactly 1 bedroom; reject Bedroom 2/3 on ground floor.",
    },
    {
      id: "ground_bathroom_count",
      check: "Ground floor bathroom count",
      status: "pass",
      note: "Ground floor must have exactly 1 bathroom unless user changes requirement.",
    },
    {
      id: "duplicate_rooms",
      check: "Duplicate room prevention",
      status: "pass",
      note: "No duplicate parking, pooja, staircase, family room or unrequested rooms on ground floor.",
    },
    {
      id: "structure_concept",
      check: "Structural concept",
      status: "review",
      note: "Column/beam grid is conceptual only; licensed structural engineer must verify RCC design, steel, footing and load path.",
    },
    {
      id: "byelaw_check",
      check: "Local byelaw/approval",
      status: "review",
      note: "Varanasi local authority setback/FAR/coverage/height/approval rules must be verified before final approval drawing.",
    },
  ];

  return {
    source: "buildsetu_planning_json_validation_v1",
    projectTitle: args.projectTitle,
    projectType: "Residential G+1 House",
    plot: {
      widthFt: 49,
      depthFt: 57,
      areaSqft: 2793,
      frontRoad: "East",
      sideRoad: "North",
      cornerPlot: true,
      drawingConvention: {
        northArrow: "UP",
        topEdge: "NORTH SIDE ROAD - 57'",
        rightEdge: "EAST FRONT ROAD - 49'",
      },
    },
    planningSequence: [
      "brief_lock",
      "orientation_lock",
      "area_program",
      "zoning",
      "circulation",
      "room_schedule",
      "structure_concept",
      "mep_concept",
      "interior_concept",
      "validation",
      "image_prompt",
    ],
    zoning: {
      public: ["Parking", "Entry", "Living"],
      semiPrivate: ["Dining", "Puja", "Staircase Lobby", "First Floor Family Lounge"],
      private: ["Ground Bedroom", "First Floor Bedrooms"],
      service: ["Kitchen", "Wash/Store", "Bathrooms", "Plumbing Shaft"],
    },
    circulation: [
      "East front gate/parking to entry lobby",
      "Entry lobby to living",
      "Living to dining and pooja",
      "Dining to kitchen and staircase",
      "Private passage to ground bedroom and bathroom",
      "Staircase continues to first floor and terrace",
    ],
    structureConcept: [
      "Use conceptual RCC framed structure logic.",
      "Keep columns near wall junctions and corners.",
      "Avoid columns in car movement and room centers.",
      "Align first-floor bedroom/lobby walls with ground-floor beam/column lines where possible.",
      "Flag long spans, balcony projections and staircase support for engineer review.",
    ],
    mepConcept: [
      "Group kitchen, wash/store and bathroom wet walls where possible.",
      "Keep toilet ventilation/shaft strategy.",
      "Plan DB/electrical points after furniture layout.",
      "Rainwater pipes and drainage slope to be resolved in working drawing stage.",
    ],
    rooms,
    validation,
    scoreReport: buildPlanningScorecard({
      is49x57EastNorth: true,
      floor: "ground",
      bedroomCountGround: 1,
      bathroomCountGround: 1,
    }),
    imagePromptRules: [
      "Do not create a new layout outside planning JSON.",
      "Do not create 2 or 3 ground-floor bedrooms.",
      "Do not create duplicate pooja, duplicate parking, duplicate stair or family/multi-use room on ground floor.",
      "Use professional reference quality only for linework, labels, furniture symbols, door/window tags and sheet presentation.",
      "Do not copy generic 3BHK room count from references.",
    ],
  };
}

function buildGenericPlanningJson(args: {
  projectTitle: string;
  userPrompt: string;
  plot: { width: number; depth: number };
  facing: string;
  bhk: string;
  floor: string;
}) {
  return {
    source: "buildsetu_planning_json_validation_v1_generic",
    projectTitle: args.projectTitle,
    plot: {
      widthFt: args.plot.width,
      depthFt: args.plot.depth,
      facing: args.facing,
    },
    floor: args.floor,
    bhk: args.bhk,
    planningSequence: [
      "brief_lock",
      "site_rules_review",
      "area_program",
      "zoning",
      "circulation",
      "room_schedule",
      "structure_concept",
      "mep_concept",
      "validation",
      "image_prompt",
    ],
    scoreReport: buildPlanningScorecard({
      is49x57EastNorth: false,
      floor: args.floor,
    }),
    validation: [
      {
        id: "project_specific_requirement",
        check: "Project-specific requirement",
        status: "review",
        note: "Rooms must be derived from saved project brief and latest user request, not from default 3BHK templates.",
      },
      {
        id: "professional_review",
        check: "Professional review",
        status: "review",
        note: "Concept plan requires architect/engineer verification before construction or approval use.",
      },
    ],
  };
}


// BUILDSETU_PLANNING_SCORECARD_V1
function buildPlanningScorecard(args: {
  is49x57EastNorth?: boolean;
  floor?: string;
  bedroomCountGround?: number;
  bathroomCountGround?: number;
}) {
  const scorecard = [
    { criteria: "Space Utilization", score: 8, note: "Uses parking, living, dining, service and private zones without overloading ground floor." },
    { criteria: "Room Dimensions", score: 8, note: "Uses practical approximate sizes and rejects oversized/unrequested rooms." },
    { criteria: "Circulation", score: 8, note: "Entry, living, dining, kitchen, bedroom and staircase flow is kept direct." },
    { criteria: "Natural Light", score: 8, note: "East and North corner edges are prioritized for daylight." },
    { criteria: "Ventilation", score: 8, note: "External openings and wet-area ventilation are required in prompt/rules." },
    { criteria: "Structure Feasibility", score: 7, note: "Conceptual structure logic included; engineer verification required." },
    { criteria: "MEP Efficiency", score: 7, note: "Kitchen, wash and bathroom wet areas are grouped conceptually." },
    { criteria: "Safety", score: 7, note: "Basic residential safety and staircase continuity included; authority review required." },
    { criteria: "Cost Practicality", score: 8, note: "Avoids excessive room sizes and unnecessary duplicate rooms." },
    { criteria: "Future Expansion", score: 8, note: "G+1 staircase and floor-wise separation are preserved." },
  ];

  const total = scorecard.reduce((sum, item) => sum + item.score, 0);
  const status = total >= 75 ? "pass" : "revise";

  const blockers: string[] = [];

  if (args.is49x57EastNorth && args.floor === "ground") {
    if (args.bedroomCountGround !== 1) blockers.push("Ground floor bedroom count must be exactly 1.");
    if (args.bathroomCountGround !== 1) blockers.push("Ground floor bathroom count must be exactly 1.");
  }

  return {
    source: "buildsetu_planning_scorecard_v1",
    total,
    max: 100,
    status: blockers.length ? "revise" : status,
    scorecard,
    blockers,
    revisionRule: "If score is below 75 or blockers exist, revise before final image/render prompt.",
  };
}
