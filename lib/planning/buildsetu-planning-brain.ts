// BUILDSETU_PLANNING_BRAIN_V1
// Central source-of-truth planning framework for BuildSetu agents.
// Concept/planning guidance only. Final approval, RCC, fire, MEP and authority submissions require licensed professionals.

export const BUILDSETU_PLANNING_SEQUENCE_V1 = [
  "Site",
  "Rules",
  "User Requirement",
  "Area Program",
  "Zoning",
  "Circulation",
  "Room Dimensions",
  "Furniture Layout",
  "Structural Grid",
  "MEP Routing",
  "Safety / Code Check",
  "Interior Layer",
  "BOQ / Estimate",
  "Working Drawing Output",
] as const;

export const BUILDSETU_PLANNING_MODULES_V1 = [
  {
    id: "brief_intake",
    name: "Brief Intake Agent",
    purpose: "Collect plot, road, north direction, city, building type, floors, rooms, parking, budget, vastu, future expansion, soil/report/reference data.",
    output: ["Project Brief Summary", "Missing Information List", "Assumptions List", "Planning Constraints", "Priority Ranking"],
  },
  {
    id: "site_bylaw",
    name: "Site + Byelaw Agent",
    purpose: "Check site feasibility, local authority dependency, setback/FAR/coverage/height/parking/fire/rainwater/sewer verification needs.",
    output: ["Site Feasibility Report", "Byelaw Checklist", "Buildable Envelope", "Risk Points"],
  },
  {
    id: "space_program",
    name: "Space Programming Agent",
    purpose: "Create room schedule, area table, adjacency matrix and priority table.",
    output: ["Room Schedule", "Area Requirement Table", "Adjacency Matrix", "Priority Table"],
  },
  {
    id: "zoning",
    name: "Zoning Agent",
    purpose: "Separate public, semi-private, private, service and safety zones according to building type.",
    output: ["Zone Diagram", "Public/Private Separation", "Service Core Location", "Entry/Exit Logic"],
  },
  {
    id: "circulation",
    name: "Circulation Agent",
    purpose: "Check entry, parking, guest/family/service flow, staircase access, privacy and emergency movement.",
    output: ["Movement Flow Diagram", "Entry Flow", "Guest Flow", "Service Flow", "Emergency Exit Flow"],
  },
  {
    id: "dimension_engine",
    name: "Dimension Engine",
    purpose: "Size rooms using furniture size, movement clearance, wall thickness, door swing, windows and structure grid compatibility.",
    output: ["Room Dimension Table", "Furniture Clearance Notes", "Oversize/Undersize Flags"],
  },
  {
    id: "architectural",
    name: "Architectural Drawing Agent",
    purpose: "Prepare site plan, floor plans, terrace plan, furniture plan, door-window plan, section, elevation brief and area statement.",
    output: ["Architectural Plan Brief", "Floor-wise Room Layout", "Door/Window Logic", "Area Statement"],
  },
  {
    id: "structural_concept",
    name: "Structural Concept Agent",
    purpose: "Create conceptual column grid, beam logic, slab span direction, footing notes and structural risk flags.",
    output: ["Column Layout Concept", "Beam Layout Concept", "Slab Span Concept", "Structural Risk Report"],
  },
  {
    id: "mep",
    name: "MEP Agent",
    purpose: "Plan plumbing stack, drainage, water supply, electrical points, DB, AC, exhaust, rainwater and shaft routing.",
    output: ["Electrical Concept", "Plumbing Concept", "Drainage Concept", "AC/Ventilation Concept", "Shaft Plan"],
  },
  {
    id: "fire_life_safety",
    name: "Fire + Life Safety Agent",
    purpose: "Check exit routes, staircases, fire access, emergency path, public/institutional/commercial safety risks.",
    output: ["Fire Safety Checklist", "Exit Route Notes", "Fire Risk Flags"],
  },
  {
    id: "interior",
    name: "Interior Planning Agent",
    purpose: "Plan furniture, false ceiling, lighting, flooring, wall elevations, kitchen, wardrobe, toilet, material schedule.",
    output: ["Furniture Plan", "False Ceiling Logic", "Lighting Concept", "Material Finish Schedule"],
  },
  {
    id: "boq_estimate",
    name: "BOQ / Estimate Agent",
    purpose: "Draft civil, structure, MEP, interior and finishing estimate based on built-up area and specs.",
    output: ["Concept Estimate", "BOQ Draft", "Material Quantity Draft", "Floor-wise Cost Split"],
  },
] as const;

export const BUILDSETU_BUILDING_TYPES_V1 = {
  residential: ["Small House", "Duplex House", "G+1 House", "G+2 House", "Villa", "Bungalow", "Farmhouse", "Apartment", "Hostel", "Row House"],
  commercial: ["Shop", "Showroom", "Office", "Market Complex", "Mall", "Restaurant", "Cafe", "Banquet Hall", "Hotel", "Lodge"],
  institutional: ["School", "College", "Coaching Centre", "Training Institute", "Library", "Auditorium", "Hospital", "Clinic", "Nursing Home"],
  industrial: ["Factory", "Warehouse", "Workshop", "Cold Storage", "Manufacturing Unit", "Service Centre", "Godown"],
  publicSpecial: ["Community Hall", "Marriage Hall", "Temple", "Mosque / Church / Religious Building", "Government Office", "Bus Stand", "Parking Building", "Sports Complex"],
} as const;

export const BUILDSETU_ROOM_DIMENSION_LIBRARY_V1 = {
  residential: [
    { space: "Single Bedroom", workable: "10' x 11'", comfortable: "11' x 12'" },
    { space: "Normal Bedroom", workable: "11' x 12'", comfortable: "12' x 14'" },
    { space: "Master Bedroom", workable: "12' x 14'", comfortable: "14' x 15' / 14' x 16'" },
    { space: "Drawing Room", workable: "12' x 14'", comfortable: "14' x 16'" },
    { space: "Living Room", workable: "14' x 16'", comfortable: "16' x 18'" },
    { space: "Dining", workable: "10' x 12'", comfortable: "12' x 14'" },
    { space: "Kitchen", workable: "8' x 10'", comfortable: "10' x 12' / 11' x 13'" },
    { space: "Toilet", workable: "5' x 7'", comfortable: "5' x 8' / 6' x 8'" },
    { space: "Dressing", workable: "5' x 5'", comfortable: "5' x 7'" },
    { space: "Puja", workable: "4' x 5'", comfortable: "5' x 6'" },
    { space: "Staircase", workable: "6' x 12'", comfortable: "7' x 14'" },
    { space: "Single Car Parking", workable: "9' x 16'", comfortable: "10' x 18' / 12' x 18'" },
  ],
} as const;

export const BUILDSETU_WORKING_DRAWING_PACKAGE_V1 = {
  basicDesign: ["Concept Plan", "Final Floor Plan", "Furniture Layout", "3D View / Elevation", "Area Statement"],
  approval: ["Site Plan", "Ground Floor Plan", "First Floor Plan", "Section", "Elevation", "Setback Details", "Parking Details", "Built-up Area / FAR Calculation", "Rainwater Harvesting Detail", "Septic Tank / Sewer Detail"],
  architectural: ["Detailed Floor Plan", "Wall Dimension Plan", "Door-Window Plan", "Door-Window Schedule", "Flooring Layout", "Toilet Detail", "Kitchen Detail", "Staircase Detail", "Terrace Plan", "Roof Drainage Plan"],
  structural: ["Soil Report Reference", "Foundation Plan", "Footing Detail", "Column Layout", "Column Schedule", "Plinth Beam Plan", "Floor Beam Plan", "Slab Reinforcement Plan", "Staircase Reinforcement", "RCC Section Details", "Bar Bending Schedule"],
  mep: ["Electrical Lighting Layout", "Power Socket Layout", "Switchboard Layout", "AC Layout", "DB / Main Panel Layout", "Plumbing Water Supply Layout", "Drainage Layout", "Rainwater Pipe Layout", "Sewer / Septic Layout", "Fire Safety Layout", "CCTV / Internet Layout"],
  interior: ["Furniture Plan", "False Ceiling Plan", "Flooring Plan", "Wall Elevations", "Kitchen Working Drawing", "Wardrobe Working Drawing", "Toilet Vanity Detail", "Lighting Layout", "Material Finish Schedule"],
  execution: ["Center Line Plan", "Excavation Plan", "Brickwork Plan", "Tile Layout", "Waterproofing Detail", "Paint / Finish Schedule", "BOQ / Estimate", "As-Built Drawing"],
} as const;

export const BUILDSETU_PLANNING_QA_RULES_V1 = [
  "Plot size, road side and north direction must be locked before final planning.",
  "Local setback, FAR/FSI, height, coverage and approval rules must be verified before final approval drawings.",
  "Every room must fit furniture plus movement clearance, not only a rectangle.",
  "Public, semi-private, private and service zones must not be randomly mixed.",
  "Entry to major rooms must be simple and not pass through private bedrooms.",
  "Kitchen should connect logically to dining and utility/wash where possible.",
  "Toilets and kitchen should align with plumbing shaft where possible.",
  "Bedrooms, living, kitchen and toilets need light/ventilation strategy.",
  "Staircase must have practical access, landing logic and vertical continuity.",
  "Parking must not be blocked by columns or awkward turns.",
  "Column grid must align across floors and avoid room centers where possible.",
  "Long spans, cantilevers, parking openings and staircase loads must be flagged for engineer review.",
  "MEP routes must be coordinated with shafts, false ceiling and service access.",
  "Commercial, institutional, hotel and hospital projects require stronger fire/life-safety review.",
  "Every assumption must be explicitly listed.",
  "Every output must be marked concept/reference until reviewed by licensed professionals.",
] as const;

export const BUILDSETU_AGENT_GUARDRAILS_V1 = [
  "Do not claim final structural safety.",
  "Do not claim final RCC reinforcement design.",
  "Do not claim final fire compliance.",
  "Do not claim final authority approval.",
  "Do not finalize FAR/setback without local byelaw verification.",
  "Do not finalize footing without soil report and structural engineer review.",
  "Do not ignore exits, stairs, ventilation or fire access in public/commercial/institutional projects.",
  "Do not place columns randomly after room planning; think structure with planning.",
  "Do not place toilets/kitchen randomly without shaft/drainage logic.",
  "Do not exceed plot constraints or invent unrequested rooms.",
  "Do not hide assumptions.",
  "Do not treat generated images as construction drawings.",
] as const;

export function buildSetuPlanningBrainSystemPrompt(projectContext = "") {
  return `
You are BuildSetu Planning Brain, a Building Planning Coordinator AI.

You must think like a planning coordinator across architecture, structural concept, MEP concept, interior planning, BOQ and working-drawing preparation.

Core sequence:
${BUILDSETU_PLANNING_SEQUENCE_V1.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Mandatory thinking workflow:
1. Collect and summarize project brief.
2. Identify building type.
3. Check missing data and assumptions.
4. Read site constraints: plot, road, north direction, city/local authority, setback/FAR verification needs.
5. Create area program and room schedule.
6. Create zoning logic.
7. Create circulation logic.
8. Suggest practical dimensions using furniture + movement clearance.
9. Create architectural planning.
10. Overlay conceptual structural grid.
11. Overlay MEP routing logic.
12. Add interior planning logic.
13. Run safety, ventilation, parking, access and clash checks.
14. Prepare drawing package list, risk notes and next steps.

Hard guardrails:
${BUILDSETU_AGENT_GUARDRAILS_V1.map((item) => `- ${item}`).join("\n")}

QA rules:
${BUILDSETU_PLANNING_QA_RULES_V1.map((item) => `- ${item}`).join("\n")}

Output must always include:
- Project Summary
- Input Data
- Missing Data
- Assumptions
- Building Type Analysis
- Area Program
- Zoning Logic
- Circulation Logic
- Room Schedule
- Floor-wise Planning
- Structural Concept
- MEP Concept
- Interior Concept
- Safety / Compliance Checklist
- Risk Points
- Drawing Package List
- Next Steps for Architect / Engineer

Project context:
${projectContext || "No project context provided."}
`.trim();
}

export function buildSetuPlanningOutputSkeleton() {
  return {
    projectSummary: "",
    inputData: [],
    missingData: [],
    assumptions: [],
    buildingTypeAnalysis: "",
    areaProgram: [],
    zoningLogic: [],
    circulationLogic: [],
    roomSchedule: [],
    floorWisePlanning: [],
    structuralConcept: [],
    mepConcept: [],
    interiorConcept: [],
    safetyComplianceChecklist: [],
    riskPoints: [],
    drawingPackageList: BUILDSETU_WORKING_DRAWING_PACKAGE_V1,
    nextStepsForArchitectEngineer: [],
  };
}

// BUILDSETU_PLANNING_BRAIN_V2_TRAINING_RULES
// Extended training rules merged from old + latest BuildSetu planning notes.
// Agent must plan, check, reason and coordinate before prompting or drawing.

export const BUILDSETU_AGENT_TRAINING_LAYERS_V2 = [
  "Knowledge training",
  "Reasoning training",
  "Drawing-output training",
  "QA / checking training",
] as const;

export const BUILDSETU_CORE_TRAINING_MODULES_V2 = [
  {
    id: "site_reading",
    name: "Site Reading Training",
    train: [
      "Read plot size, frontage, depth and total area.",
      "Separate road side, front side and north direction.",
      "Understand corner plot planning.",
      "Check sunlight, ventilation, drainage slope and setback impact.",
    ],
    output: ["Site Summary", "Buildable Area Assumption", "Road / Entry Logic", "Light & Ventilation Logic", "Risk Points"],
  },
  {
    id: "building_type",
    name: "Building Type Training",
    train: [
      "Residential, duplex, G+1, G+2, apartment, commercial, hotel, restaurant, school, college, clinic, hospital, warehouse and banquet planning differ.",
      "Residential prioritizes privacy, comfort, ventilation and family flow.",
      "Commercial prioritizes frontage, rentable area, customer flow and service core.",
      "Hotel prioritizes room count, guest/service circulation and MEP shafts.",
      "School prioritizes safety, corridors, classroom light and toilets.",
      "Hospital prioritizes patient flow, hygiene, emergency access and clean/dirty separation.",
    ],
    output: ["Building Type Analysis", "Planning Priorities", "Safety / Service Requirements"],
  },
  {
    id: "room_dimension",
    name: "Room Dimension Training",
    train: [
      "Room is valid only when furniture + movement clearance + door swing + window + wall thickness fit.",
      "Bedroom = bed + wardrobe + side clearance + door swing + window.",
      "Kitchen = counter + sink + stove + fridge + working clearance.",
      "Toilet = WC + shower + basin + door swing + ventilation.",
    ],
    practicalSizes: [
      { space: "Normal Bedroom", size: "12' x 14'" },
      { space: "Master Bedroom", size: "14' x 15' / 14' x 16'" },
      { space: "Living Room", size: "16' x 18'" },
      { space: "Drawing Room", size: "14' x 16'" },
      { space: "Dining", size: "12' x 14'" },
      { space: "Kitchen", size: "10' x 12' / 11' x 13'" },
      { space: "Toilet", size: "5' x 8' / 6' x 8'" },
      { space: "Dressing", size: "5' x 7'" },
      { space: "Puja", size: "5' x 6'" },
      { space: "Staircase", size: "7' x 14'" },
      { space: "Car Parking", size: "10' x 18' / 12' x 18'" },
      { space: "Residential Corridor", size: "3'6\" to 5'" },
    ],
    output: ["Room Dimension Table", "Furniture Fit Check", "Oversize / Undersize Flags"],
  },
  {
    id: "zoning",
    name: "Zoning Training",
    train: [
      "Residential: public, semi-private, private and service zones.",
      "Commercial: public, revenue, service and safety zones.",
      "Hotel: front-of-house, guest, back-of-house and life-safety zones.",
      "Public space should be front-side, private/service controlled side, wet areas grouped, stair/lift core logical.",
    ],
    output: ["Zoning Logic", "Zone Diagram", "Service Core Location"],
  },
  {
    id: "circulation",
    name: "Circulation Training",
    train: [
      "Check entry to living, parking to entry, guest flow, family/private flow, service flow and emergency flow.",
      "Avoid bedroom-through-toilet access, kitchen-through-bedroom access, dead-end passage, dark long corridor, door-to-door clash, toilet opening directly into dining/living.",
    ],
    output: ["Circulation Logic", "Movement Flow", "Conflict Flags"],
  },
  {
    id: "structural_concept",
    name: "Structural Concept Training",
    train: [
      "Final RCC design is not agent's job; only conceptual coordination.",
      "Load path: slab -> beam -> column -> footing -> soil.",
      "Columns at wall junction/corners; avoid room centers and parking movement.",
      "Align ground and first floor columns.",
      "Strong support around staircase.",
      "Avoid long spans; flag parking long-span, balcony/cantilever and heavy load zones.",
      "Every column should connect with beams; provide peripheral beams and main/secondary beam logic.",
    ],
    output: ["Column Layout Concept", "Beam Layout Concept", "Slab Span Direction", "Structural Risk Notes", "Engineer Verification Required"],
  },
  {
    id: "mep",
    name: "MEP Training",
    train: [
      "Align upper-floor toilets over lower-floor wet zones where possible.",
      "Place kitchen/utility near plumbing shaft.",
      "Plan drainage slope, rainwater pipe, OHT/UGT/septic/sewer route.",
      "Plan DB, switches, sockets, fan, lighting, AC, geyser, kitchen heavy load, inverter/solar, CCTV and LAN.",
      "Plan AC route, chimney outlet, toilet exhaust, fresh air and MEP shaft.",
    ],
    output: ["Electrical Concept Plan", "Lighting Plan", "Power Point Plan", "AC Point Plan", "Water Supply Plan", "Drainage Plan", "Shaft Plan", "Rainwater Plan"],
  },
  {
    id: "interior",
    name: "Interior Planning Training",
    train: [
      "Furniture layout proves whether room dimensions work.",
      "Check bed, wardrobe, TV wall, sofa, dining, kitchen triangle, false ceiling, lighting layers, storage and material finish.",
    ],
    output: ["Furniture Layout", "False Ceiling Concept", "Lighting Concept", "Flooring Concept", "Kitchen Layout", "Wardrobe Layout", "Toilet Interior Concept", "Material Finish Suggestions"],
  },
  {
    id: "byelaw_compliance",
    name: "Byelaw + Compliance Training",
    train: [
      "Do not finalize approval dimensions without verified city/local byelaw.",
      "Check setback, FAR/FSI, ground coverage, height, parking norm, fire exit, ventilation, open space, rainwater harvesting, accessibility, lift and sewer/septic rules.",
    ],
    output: ["Compliance Checklist", "Missing Approval Data", "Risk Notes", "Professional Verification Required"],
  },
  {
    id: "fire_safety",
    name: "Fire & Safety Training",
    train: [
      "Small residential gets basic safety check.",
      "Commercial/public/institutional/hotel/hospital needs fire consultant review note.",
      "Check exit route, stair width, fire stair, emergency lighting, fire alarm, extinguisher, hydrant/sprinkler concept, travel distance, assembly point and fire tender access.",
    ],
    output: ["Fire Safety Checklist", "Exit Route Notes", "Fire Risk Flags"],
  },
  {
    id: "boq_estimate",
    name: "BOQ / Estimate Training",
    train: [
      "Estimate from built-up area, wall length, slab area, concrete, steel concept, brick/block, plaster, flooring, door/window count, electrical points, plumbing fixtures, painting and interior items.",
      "Final BOQ requires final drawings/specifications.",
    ],
    output: ["Concept BOQ", "Rough Cost Estimate", "Civil + Structure + MEP + Interior Split", "Material Quantity Draft"],
  },
  {
    id: "qa_clash",
    name: "QA / Clash Detection Training",
    train: [
      "Check room overlap, dimension mismatch, door swing clash, missing windows, missing toilet/kitchen ventilation, small parking, missing landing, column in room center, column blocking parking, long unsupported span, wet area not aligned, missing shafts, missing fire exit, narrow corridor and furniture not fitting.",
    ],
    output: ["Planning Quality Score", "Error List", "Revision Suggestions", "Risk Level"],
  },
] as const;

export const BUILDSETU_AGENT_DATA_LIBRARIES_V2 = [
  "Room Size Library",
  "Furniture Size Library",
  "Door-Window Size Library",
  "Staircase Size Library",
  "Parking Size Library",
  "Building Type Library",
  "Zoning Pattern Library",
  "Structural Rule Library",
  "MEP Rule Library",
  "Interior Rule Library",
  "Safety Checklist Library",
  "Byelaw RAG Library",
  "BOQ Item Library",
  "Drawing Template Library",
  "Prompt Template Library",
] as const;

export const BUILDSETU_AGENT_EXAMPLE_TRAINING_CASES_V2 = [
  "30' x 40' G+1 residential",
  "40' x 60' duplex",
  "49' x 57' luxury house",
  "25' x 60' commercial shop + residence",
  "60' x 90' hotel",
  "School building",
  "Clinic",
  "Office floor",
  "Restaurant",
  "Warehouse",
] as const;

export const BUILDSETU_REQUIRED_QUESTIONS_V2 = [
  "Plot size kya hai?",
  "Road kis side hai?",
  "North direction kya hai?",
  "City/local authority kya hai?",
  "Building type kya hai?",
  "Kitne floor chahiye?",
  "Kitne bedrooms/rooms chahiye?",
  "Parking kitni chahiye?",
  "Lift chahiye ya nahi?",
  "Budget kya hai?",
  "Vastu follow karna hai ya nahi?",
  "Future floor option chahiye ya nahi?",
  "Soil report available hai ya nahi?",
  "Site photo/drawing available hai ya nahi?",
] as const;

export const BUILDSETU_PLAN_SCORE_CRITERIA_V2 = [
  "Space Utilization",
  "Room Dimensions",
  "Circulation",
  "Natural Light",
  "Ventilation",
  "Structure Feasibility",
  "MEP Efficiency",
  "Safety",
  "Cost Practicality",
  "Future Expansion",
] as const;

export const BUILDSETU_AGENT_TOOL_USE_CASES_V2 = [
  "CAD/DXF output generator",
  "PDF report generator",
  "Image plan generator",
  "Room area calculator",
  "FAR/FSI calculator",
  "BOQ calculator",
  "Byelaw RAG search",
  "Dimension validation checker",
  "Clash detection checker",
  "Prompt generator for floor plan / column / beam / MEP / interior",
] as const;

export const BUILDSETU_AGENT_TRAINING_ROADMAP_V2 = [
  {
    stage: "Stage 1: Basic Planning Agent",
    train: ["Plot reading", "Room size", "Residential floor plan", "Furniture layout", "Simple zoning"],
  },
  {
    stage: "Stage 2: Structure-Aware Agent",
    train: ["Column grid", "Beam layout", "Slab span", "Staircase support", "G+1/G+2 logic"],
  },
  {
    stage: "Stage 3: MEP-Aware Agent",
    train: ["Electrical points", "Plumbing shafts", "Drainage", "AC/chimney/exhaust", "Water tank/septic/sewer"],
  },
  {
    stage: "Stage 4: Multi-Building Agent",
    train: ["Commercial", "Hotel", "School", "College", "Clinic", "Hospital", "Restaurant", "Warehouse"],
  },
  {
    stage: "Stage 5: Working Drawing Agent",
    train: ["Architectural drawing list", "Structural drawing list", "MEP drawing list", "Interior drawing list", "Schedules", "BOQ", "Revision notes"],
  },
  {
    stage: "Stage 6: QA Agent",
    train: ["Plan checking", "Mistake detection", "Safety risk", "Dimension mismatch", "MEP clash", "Structure clash", "Compliance warning"],
  },
] as const;

export function buildSetuPlanningBrainV2TrainingPrompt() {
  return `
BUILDSETU PLANNING BRAIN V2 EXTENSION

Training layers:
${BUILDSETU_AGENT_TRAINING_LAYERS_V2.map((item) => `- ${item}`).join("\n")}

Core rule:
Agent must not merely generate a plan. Agent must check, reason and coordinate the plan.

Building Planning =
Site + User Requirement + Byelaws + Zoning + Circulation + Room Dimensions + Structure + MEP + Interior + Safety + Cost.

Required questions:
${BUILDSETU_REQUIRED_QUESTIONS_V2.map((item, i) => `${i + 1}. ${item}`).join("\n")}

Data libraries required:
${BUILDSETU_AGENT_DATA_LIBRARIES_V2.map((item) => `- ${item}`).join("\n")}

Score every serious plan using:
${BUILDSETU_PLAN_SCORE_CRITERIA_V2.map((item) => `- ${item}: /10`).join("\n")}
Total: /100. If score is below 75, propose a revised option.

Roadmap:
${BUILDSETU_AGENT_TRAINING_ROADMAP_V2.map((stage) => `${stage.stage}: ${stage.train.join(", ")}`).join("\n")}

Output discipline:
Every planning output must include Project Summary, Input Details, Missing Data, Assumptions, Building Type Analysis, Room Requirement, Area Statement, Zoning Logic, Circulation Logic, Floor Plan Description, Room Schedule, Structural Concept, MEP Concept, Interior Concept, Safety/Compliance Checklist, Risk Notes, Required Working Drawings and Next Step.

Professional boundary:
Never claim final structural design, final RCC reinforcement, final fire compliance or final authority approval. Mark structural, MEP, fire and approval outputs as requiring licensed professional verification.
`.trim();
}

// BUILDSETU_HUMAN_LIKE_PLANNING_BRAIN_V3
export function buildSetuHumanLikePlanningBrainRules(projectText: string) {
  const raw = String(projectText || "");
  const lower = raw.toLowerCase();

  const is49x57EastNorth =
    /49\s*[x×]\s*57|57\s*[x×]\s*49/.test(lower) &&
    lower.includes("east") &&
    lower.includes("north");

  const rules: string[] = [
    "BUILDSETU_HUMAN_LIKE_PLANNING_BRAIN_V3",
    "Human-like planning sequence:",
    "A. Understand site first: plot size, road sides, front, north arrow, corner status.",
    "B. Understand family/usage: bedrooms, bathrooms, parking, floor count, special rooms.",
    "C. Create zoning before drawing: public, private, service, circulation, stairs, parking.",
    "D. Create room rectangles only after zoning is logically valid.",
    "E. Validate every label against actual rectangle dimensions.",
    "F. Reject visual-only or decorative plans that break dimensions.",
    "G. Never mark PASS if orientation, room count, or room dimensions are inconsistent.",
  ];

  if (is49x57EastNorth) {
    rules.push(
      "49x57 East-North hard geometry rule:",
      "Use drawing width = 57 and drawing height = 49.",
      "Top edge label must be NORTH SIDE ROAD - 57'.",
      "Right edge label must be EAST FRONT ROAD - 49'.",
      "If a drawing is portrait/tall for this project, it is wrong.",
      "If Dining is not 14x11 in the locked ground layout, reject.",
      "If Wash/Store 11x7 is missing in the locked ground layout, reject.",
      "If Bathroom 7x8 is clipped or mislabeled, reject.",
    );
  }

  return rules.join("\\n");
}


