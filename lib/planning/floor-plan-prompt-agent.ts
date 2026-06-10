import { buildSetuPlanningBrainSystemPrompt } from "@/lib/planning/buildsetu-planning-brain";


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
  const planningBrainPrompt = buildSetuPlanningBrainSystemPrompt(raw);

  const plot = parsePlot(raw);
  const facing = parseFacing(raw);
  const bhk = parseBhk(raw);
  const floor = parseFloor(raw);


  const is49x57EastNorth =
    plot.width === 49 &&
    plot.depth === 57 &&
    facing === "east" &&
    /north\s*side|side\s*road.*north|east[-\s]*north|east\s+north|corner\s*plot/.test(raw.toLowerCase());

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
