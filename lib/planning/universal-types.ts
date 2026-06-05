export type BuildingGroup = "residential" | "commercial" | "institutional" | "mixed" | "unknown";
export type Facing = "north" | "south" | "east" | "west" | "";
export type VastuMode = "strict" | "balanced" | "ignore" | "unknown";

export type WorkingPlanType =
  | "floor_plan"
  | "furniture_plan"
  | "dimension_plan"
  | "door_window_schedule"
  | "elevation"
  | "section"
  | "site_plan"
  | "terrace_plan"
  | "column_layout"
  | "beam_layout"
  | "footing_layout"
  | "slab_layout"
  | "staircase_detail"
  | "electrical_layout"
  | "plumbing_layout"
  | "drainage_layout"
  | "toilet_detail"
  | "presentation_plan"
  | "complete_working_set";

export type NormalizedPlanningRequirement = {
  projectType: BuildingGroup;
  subType: string;
  plotWidthFt?: number;
  plotDepthFt?: number;
  facing: Facing;
  roadSides: Facing[];
  floors: string;
  floorFocus: string;
  vastuMode: VastuMode;
  bhk?: number;
  bedrooms?: number;
  toilets?: number;
  classrooms?: number;
  beds?: number;
  parkingRequired: boolean;
  staircaseRequired: boolean;
  liftRequired: boolean;
  requirements: string[];
  requestedOutputs: WorkingPlanType[];
  originalPrompt: string;
};

export type SpaceProgramItem = {
  name: string;
  category: string;
  preferredSizeFt: string;
  minSizeFt: string;
  zone: string;
  vastuPreference?: string;
  adjacency: string[];
  notes: string;
};

export type VastuCheck = {
  space: string;
  preferredZone: string;
  priority: "high" | "medium" | "low";
  status: "target" | "acceptable" | "optional";
  note: string;
};

export type WorkingDrawingSheet = {
  type: WorkingPlanType;
  title: string;
  purpose: string;
  requiredLayers: string[];
  drawingNotes: string[];
  validationNotes: string[];
};

export type UniversalPlanningResult = {
  ok: boolean;
  source: "universal_planning_agent_v1";
  status: "need_more_details" | "ready_to_plan";
  assistantMessage: string;
  missingQuestions: string[];
  requirement: NormalizedPlanningRequirement;
  buildingRules: string[];
  vastuReport: VastuCheck[];
  spaceProgram: SpaceProgramItem[];
  zoningStrategy: string[];
  workingPlans: WorkingDrawingSheet[];
  safetyNotes: string[];
};

// BUILDSETU_PHASE_47A2_DIMENSION_CONTEXT_TYPES
export type BuildSetuPlanningDimensionContext = {
  promptBlock: string;
  summary: {
    totalPairs: number;
    totalSingles: number;
    hasPlotDimension: boolean;
    hasRoomDimension: boolean;
    primaryPlotAreaSqFt: number | null;
  };
  pairs: Array<{
    raw: string;
    intent: string;
    widthFeet: number | null;
    depthFeet: number | null;
    areaSqFt: number | null;
    confidence: string;
  }>;
  singles: Array<{
    raw: string;
    intent: string;
    feet: number | null;
    mm: number | null;
    confidence: string;
  }>;
  warnings: string[];
};
