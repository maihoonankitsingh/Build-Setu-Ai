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
