import type { NormalizedPlanningRequirement, WorkingDrawingSheet, WorkingPlanType } from "./universal-types";

const sheetInfo: Record<WorkingPlanType, Omit<WorkingDrawingSheet, "type">> = {
  complete_working_set: {
    title: "Complete Working Drawing Set",
    purpose: "Full coordinated drawing package for architectural, structural concept and MEP concept outputs.",
    requiredLayers: ["all architectural layers", "structural concept layers", "MEP concept layers", "annotation", "dimensions"],
    drawingNotes: ["Generate all requested sheets in coordinated order.", "Keep one source planning JSON for all sheets."],
    validationNotes: ["Final construction set must be reviewed by licensed architect/engineer."],
  },
  floor_plan: {
    title: "Architectural Floor Plan",
    purpose: "Main room layout with walls, openings, circulation and labels.",
    requiredLayers: ["walls", "doors", "windows", "room labels", "furniture reference", "north arrow"],
    drawingNotes: ["Use project plot size, facing and zoning strategy.", "Show all rooms with clear labels."],
    validationNotes: ["Check local setbacks, FAR/FSI and approval rules."],
  },
  furniture_plan: {
    title: "Furniture Layout",
    purpose: "Furniture placement for usability and circulation.",
    requiredLayers: ["furniture", "clearances", "room labels", "movement paths"],
    drawingNotes: ["Beds, wardrobes, sofa, dining, counters and fixtures should fit room scale."],
    validationNotes: ["Client lifestyle and furniture dimensions must be verified."],
  },
  dimension_plan: {
    title: "Dimension Plan",
    purpose: "Room dimensions, wall-to-wall dimensions and opening positions.",
    requiredLayers: ["dimension strings", "grid references", "room sizes", "overall plot dimension"],
    drawingNotes: ["Show overall plot, built-up edges and room internal sizes."],
    validationNotes: ["Final dimensions must be verified on site before execution."],
  },
  door_window_schedule: {
    title: "Door Window Schedule",
    purpose: "Door/window/ventilator tags, sizes and counts.",
    requiredLayers: ["door tags", "window tags", "schedule table", "opening swings"],
    drawingNotes: ["Assign D1/D2/W1/W2 tags and map to plan openings."],
    validationNotes: ["Final sizes depend on manufacturer and ventilation rules."],
  },
  elevation: {
    title: "Elevation Concept",
    purpose: "Front/side elevation massing concept from plan.",
    requiredLayers: ["level lines", "openings", "facade elements", "materials"],
    drawingNotes: ["Use floor plan openings and facing for elevation concept."],
    validationNotes: ["Structural and facade details require professional detailing."],
  },
  section: {
    title: "Building Section",
    purpose: "Vertical cut showing levels, stair, slab, height and openings.",
    requiredLayers: ["cut walls", "levels", "stair profile", "slab lines", "height dimensions"],
    drawingNotes: ["Section should pass through stair or important room zone."],
    validationNotes: ["Final heights must follow bylaws and structural design."],
  },
  site_plan: {
    title: "Site / Setback Plan",
    purpose: "Plot boundary, road, setbacks, entry, parking and open spaces.",
    requiredLayers: ["plot boundary", "road", "setbacks", "gate", "parking", "north arrow"],
    drawingNotes: ["Show road side and approximate open spaces."],
    validationNotes: ["Local municipality setbacks/bylaws must be verified."],
  },
  terrace_plan: {
    title: "Roof / Terrace Plan",
    purpose: "Terrace access, water tank, drainage slope and service placements.",
    requiredLayers: ["terrace boundary", "stair headroom", "water tank", "drain points", "parapet"],
    drawingNotes: ["Keep service shafts aligned with wet zones."],
    validationNotes: ["Waterproofing and structural load require engineer review."],
  },
  column_layout: {
    title: "Column Layout Concept",
    purpose: "Conceptual structural grid and column placement aligned with walls.",
    requiredLayers: ["column grid", "column marks", "grid dimensions", "load path notes"],
    drawingNotes: ["Place columns at corners, junctions and long-span control points.", "Avoid random columns in room centers where possible."],
    validationNotes: ["Not final RCC design. Licensed structural engineer must design sizes, reinforcement and load calculations."],
  },
  beam_layout: {
    title: "Beam Layout Concept",
    purpose: "Conceptual beam directions connecting column grid and supporting slab.",
    requiredLayers: ["beam lines", "beam tags", "column references", "span notes"],
    drawingNotes: ["Beams should follow walls/grid and control major spans."],
    validationNotes: ["Beam sizes/reinforcement require structural design."],
  },
  footing_layout: {
    title: "Footing / Foundation Concept",
    purpose: "Conceptual footing positions below columns/load-bearing points.",
    requiredLayers: ["footing marks", "column references", "foundation notes", "soil note"],
    drawingNotes: ["Footings align with column grid and load path."],
    validationNotes: ["Soil test and structural engineer design mandatory."],
  },
  slab_layout: {
    title: "Slab Layout Concept",
    purpose: "Slab paneling and support direction concept.",
    requiredLayers: ["slab panels", "beam support", "span direction", "opening notes"],
    drawingNotes: ["Slab panels should follow beam grid and wet shafts."],
    validationNotes: ["Final slab thickness/reinforcement requires engineer design."],
  },
  staircase_detail: {
    title: "Staircase Detail",
    purpose: "Stair location, flight direction, riser/tread concept and landing.",
    requiredLayers: ["stair flights", "UP/DN arrows", "landing", "riser/tread notes"],
    drawingNotes: ["Ensure clear headroom and practical flight width."],
    validationNotes: ["Final stair detail must follow local code and structural design."],
  },
  electrical_layout: {
    title: "Electrical Layout Concept",
    purpose: "Light, switch, socket and DB concept positions.",
    requiredLayers: ["light points", "switch boards", "sockets", "DB", "circuit notes"],
    drawingNotes: ["Switch boards near doors; sockets near furniture/appliances."],
    validationNotes: ["Final electrical load/circuit design by licensed electrician/engineer."],
  },
  plumbing_layout: {
    title: "Plumbing Layout Concept",
    purpose: "Water supply line, waste line and shaft concept.",
    requiredLayers: ["water lines", "waste lines", "soil pipe", "shaft", "fixtures"],
    drawingNotes: ["Group kitchen/toilet shafts and minimize pipe runs."],
    validationNotes: ["Final plumbing sizes/slope require plumber/MEP verification."],
  },
  drainage_layout: {
    title: "Drainage Layout Concept",
    purpose: "Wastewater, rainwater and septic/municipal connection concept.",
    requiredLayers: ["drain lines", "inspection chambers", "slope arrows", "septic/municipal outfall"],
    drawingNotes: ["Drainage should follow slope and service access."],
    validationNotes: ["Final drainage design depends on local site levels and municipal connection."],
  },
  toilet_detail: {
    title: "Toilet Working Detail",
    purpose: "Toilet fixture layout, wet wall, plumbing and tile concept.",
    requiredLayers: ["fixtures", "floor trap", "wall tiles", "plumbing points", "door swing"],
    drawingNotes: ["Avoid fixture clash and maintain clearances."],
    validationNotes: ["Final waterproofing and plumbing execution detail required."],
  },
  presentation_plan: {
    title: "Presentation Plan",
    purpose: "Client-ready polished visual plan generated from exact planning.",
    requiredLayers: ["clean walls", "furniture", "labels", "title block", "north arrow"],
    drawingNotes: ["Use exact planning as source; presentation image must not invent a different layout."],
    validationNotes: ["Presentation image is not the construction source of truth."],
  },
};

export function buildWorkingDrawings(req: NormalizedPlanningRequirement): WorkingDrawingSheet[] {
  return req.requestedOutputs.map((type) => ({
    type,
    ...sheetInfo[type],
  }));
}
