import type {
  BuildingGroup,
  Facing,
  NormalizedPlanningRequirement,
  VastuMode,
  WorkingPlanType,
} from "./universal-types";

function textOf(value: unknown) {
  return String(value || "").trim();
}

function lower(value: unknown) {
  return textOf(value).toLowerCase();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function parsePlotSize(text: string) {
  const match = text.match(/\b(\d{2,4})\s*(?:x|×|\*)\s*(\d{2,4})\b/i);
  if (!match) return {};
  return {
    plotWidthFt: Number(match[1]),
    plotDepthFt: Number(match[2]),
  };
}

function parseFacing(text: string): Facing {
  if (/\bnorth\b|north[-\s]*facing|facing\s*north/i.test(text)) return "north";
  if (/\bsouth\b|south[-\s]*facing|facing\s*south/i.test(text)) return "south";
  if (/\beast\b|east[-\s]*facing|facing\s*east/i.test(text)) return "east";
  if (/\bwest\b|west[-\s]*facing|facing\s*west/i.test(text)) return "west";
  return "";
}

function parseVastuMode(text: string): VastuMode {
  if (/ignore\s*vastu|without\s*vastu|no\s*vastu|vastu\s*ignore/i.test(text)) return "ignore";
  if (/strict\s*vastu|pure\s*vastu|proper\s*vastu|vastu\s*shastra/i.test(text)) return "strict";
  if (/vastu/i.test(text)) return "balanced";
  return "unknown";
}

function detectProjectType(text: string): { projectType: BuildingGroup; subType: string } {
  const t = lower(text);

  if (/hospital|nursing\s*home|clinic|opd|ward|patient|emergency/.test(t)) {
    return { projectType: t.includes("clinic") ? "commercial" : "institutional", subType: t.includes("clinic") ? "clinic" : "hospital" };
  }

  if (/school|classroom|principal|staff\s*room|assembly|student/.test(t)) {
    return { projectType: "institutional", subType: "school" };
  }

  if (/college|campus|lecture|lab|library/.test(t)) {
    return { projectType: "institutional", subType: "college" };
  }

  if (/hostel|dormitory/.test(t)) {
    return { projectType: "institutional", subType: "hostel" };
  }

  if (/shop|showroom|office|restaurant|cafe|commercial|retail|mall/.test(t)) {
    if (/house|residential|flat|bhk|bedroom/.test(t)) return { projectType: "mixed", subType: "mixed-use" };
    if (/showroom/.test(t)) return { projectType: "commercial", subType: "showroom" };
    if (/office/.test(t)) return { projectType: "commercial", subType: "office" };
    if (/restaurant|cafe/.test(t)) return { projectType: "commercial", subType: "restaurant" };
    return { projectType: "commercial", subType: "shop" };
  }

  if (/duplex/.test(t)) return { projectType: "residential", subType: "duplex" };
  if (/villa/.test(t)) return { projectType: "residential", subType: "villa" };
  if (/apartment|flat/.test(t)) return { projectType: "residential", subType: "apartment" };
  if (/rent|rental/.test(t)) return { projectType: "residential", subType: "rental" };

  const bhk = t.match(/\b([1-9])\s*bhk\b/);
  if (bhk) return { projectType: "residential", subType: `${bhk[1]}BHK house` };

  if (/house|ghar|home|residential|bedroom|bungalow/.test(t)) {
    return { projectType: "residential", subType: "house" };
  }

  return { projectType: "unknown", subType: "unknown" };
}

function parseWorkingOutputs(text: string): WorkingPlanType[] {
  const t = lower(text);
  const outputs: WorkingPlanType[] = [];

  if (/complete\s*working|all\s*working|sabhi.*working|full\s*drawing|working\s*set/.test(t)) outputs.push("complete_working_set");
  if (/floor\s*plan|naksha|layout|planning|plan\b/.test(t)) outputs.push("floor_plan");
  if (/furniture/.test(t)) outputs.push("furniture_plan");
  if (/dimension|measurement|dimmension/.test(t)) outputs.push("dimension_plan");
  if (/door|window|ventilator|schedule/.test(t)) outputs.push("door_window_schedule");
  if (/elevation|front/.test(t)) outputs.push("elevation");
  if (/section|cut\s*section/.test(t)) outputs.push("section");
  if (/site|setback|plot/.test(t)) outputs.push("site_plan");
  if (/terrace|roof/.test(t)) outputs.push("terrace_plan");
  if (/column|colom|pillar/.test(t)) outputs.push("column_layout");
  if (/beam/.test(t)) outputs.push("beam_layout");
  if (/footing|foundation/.test(t)) outputs.push("footing_layout");
  if (/slab/.test(t)) outputs.push("slab_layout");
  if (/stair|staircase/.test(t)) outputs.push("staircase_detail");
  if (/electric|electrical|light|switch|socket/.test(t)) outputs.push("electrical_layout");
  if (/plumbing|water\s*line|pipe/.test(t)) outputs.push("plumbing_layout");
  if (/drain|drainage|sewer|septic/.test(t)) outputs.push("drainage_layout");
  if (/toilet\s*detail|bathroom\s*detail/.test(t)) outputs.push("toilet_detail");
  if (/presentation|client\s*view|render|image/.test(t)) outputs.push("presentation_plan");

  if (outputs.length === 0) {
    outputs.push("floor_plan", "dimension_plan", "presentation_plan");
  }

  if (outputs.includes("complete_working_set")) {
    return [
      "complete_working_set",
      "floor_plan",
      "furniture_plan",
      "dimension_plan",
      "door_window_schedule",
      "elevation",
      "section",
      "site_plan",
      "terrace_plan",
      "column_layout",
      "beam_layout",
      "footing_layout",
      "slab_layout",
      "staircase_detail",
      "electrical_layout",
      "plumbing_layout",
      "drainage_layout",
      "toilet_detail",
      "presentation_plan",
    ];
  }

  return unique(outputs);
}

export function parseUniversalRequirement(input: {
  prompt?: string;
  projectTitle?: string;
  project?: any;
}): { requirement: NormalizedPlanningRequirement; missingQuestions: string[] } {
  const prompt = textOf(input.prompt);
  const projectTitle = textOf(input.projectTitle);
  const project = input.project || {};
  const combined = `${projectTitle} ${prompt} ${JSON.stringify(project)}`;

  const type = detectProjectType(combined);
  const size = parsePlotSize(combined);
  const facing = parseFacing(combined);
  const vastuMode = parseVastuMode(combined);

  const bhkMatch = lower(combined).match(/\b([1-9])\s*bhk\b/);
  const bedroomMatch = lower(combined).match(/\b([1-9])\s*bed(?:room)?s?\b/);
  const toiletMatch = lower(combined).match(/\b([1-9])\s*(?:toilet|bath|washroom)s?\b/);
  const classroomMatch = lower(combined).match(/\b(\d{1,3})\s*(?:classroom|class\s*rooms?)\b/);
  const bedsMatch = lower(combined).match(/\b(\d{1,3})\s*(?:bed|beds)\b/);

  const floorText = lower(combined);

  const floorFocus =
    /\b(?:first|1st|ff)\s*(?:floor)?\b/.test(floorText) ? "first floor" :
    /\b(?:second|2nd)\s*(?:floor)?\b/.test(floorText) ? "second floor" :
    /\bg\s*\+\s*1\b/.test(floorText) ? "G+1" :
    /\bg\s*\+\s*2\b/.test(floorText) ? "G+2" :
    /\b(?:ground|gf)\s*(?:floor)?\b/.test(floorText) ? "ground floor" :
    "not specified";

  const floors =
    /\bg\s*\+\s*2\b/.test(floorText) ? "G+2" :
    /\bg\s*\+\s*1\b/.test(floorText) ? "G+1" :
    /\b(?:ground|gf)\s*(?:floor)?\b/.test(floorText) ? "ground floor" :
    /\b(?:first|1st|ff)\s*(?:floor)?\b/.test(floorText) ? "first floor" :
    "not specified";

  const requirement: NormalizedPlanningRequirement = {
    projectType: type.projectType,
    subType: type.subType,
    plotWidthFt: size.plotWidthFt,
    plotDepthFt: size.plotDepthFt,
    facing,
    roadSides: facing ? [facing] : [],
    floors,
    floorFocus,
    vastuMode,
    bhk: bhkMatch ? Number(bhkMatch[1]) : undefined,
    bedrooms: bedroomMatch ? Number(bedroomMatch[1]) : bhkMatch ? Number(bhkMatch[1]) : undefined,
    toilets: toiletMatch ? Number(toiletMatch[1]) : undefined,
    classrooms: classroomMatch ? Number(classroomMatch[1]) : undefined,
    beds: bedsMatch && /hospital|ward|patient/.test(lower(combined)) ? Number(bedsMatch[1]) : undefined,
    parkingRequired: /parking|porch|garage|car/.test(lower(combined)),
    staircaseRequired: /stair|staircase|g\+1|g\+2|floor/.test(lower(combined)),
    liftRequired: /lift|elevator/.test(lower(combined)),
    requirements: prompt ? [prompt] : [],
    requestedOutputs: parseWorkingOutputs(combined),
    originalPrompt: prompt,
  };

  const missingQuestions: string[] = [];
  if (!requirement.plotWidthFt || !requirement.plotDepthFt) missingQuestions.push("Plot size kya hai? Example: 30x40, 41x51.");
  if (!requirement.facing) missingQuestions.push("Facing / road side kya hai? North, South, East ya West?");
  if (requirement.projectType === "unknown") missingQuestions.push("Building type kya hai? House, shop, office, school, hospital, college, etc.");
  if (requirement.floors === "not specified") missingQuestions.push("Kaunsa floor ya total floors? Ground, first, G+1, G+2?");
  if (requirement.projectType === "residential" && !requirement.bhk && !requirement.bedrooms) missingQuestions.push("Residential plan me kitne BHK/bedrooms chahiye?");
  if (requirement.projectType === "institutional" && requirement.subType === "school" && !requirement.classrooms) missingQuestions.push("School ke liye classrooms kitne chahiye?");
  if (requirement.subType === "hospital" && !requirement.beds) missingQuestions.push("Hospital ke liye beds/OPD/ward requirement kya hai?");

  return { requirement, missingQuestions };
}
