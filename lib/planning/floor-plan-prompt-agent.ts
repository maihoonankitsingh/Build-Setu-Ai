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
  if (t.includes("south")) return "south";
  if (t.includes("east")) return "east";
  if (t.includes("west")) return "west";
  if (t.includes("north")) return "north";
  return "north";
}

function parseBhk(text: string) {
  const m = text.toLowerCase().match(/\b([1-9])\s*bhk\b/);
  return m ? `${m[1]}BHK` : "3BHK";
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
Create a premium professional furnished 2D architectural ground floor plan for a 49' x 57' East-North corner plot.

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
- Show 49' dimension and 57' dimension correctly.
- Clearly label East Road/front side and North Road/side road.
- Use professional walls, doors, windows, furniture, room labels and dimensions.
- Keep room sizes realistic and proportional.
- Output title: Ground Floor Plan - 49' x 57' East Front + North Side Corner Plot.
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
