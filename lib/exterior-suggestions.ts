export type ExteriorSuggestion = {
  id: string;
  label: string;
  category: "presentation" | "detail" | "architectural" | "technical" | "export";
  viewType: string;
  description: string;
  recommended: boolean;
  reason: string;
};

export const EXTERIOR_SUGGESTIONS: ExteriorSuggestion[] = [
  {
    id: "front-left-3-4",
    label: "Front Left 3/4 View",
    category: "presentation",
    viewType: "FRONT_LEFT_3_4",
    description: "Same master facade ka front-left corner perspective.",
    recommended: true,
    reason: "Client presentation ke liye front facade ka depth aur side massing samajh aata hai.",
  },
  {
    id: "front-right-3-4",
    label: "Front Right 3/4 View",
    category: "presentation",
    viewType: "FRONT_RIGHT_3_4",
    description: "Same master facade ka front-right corner perspective.",
    recommended: true,
    reason: "Alternate perspective se gate, balcony aur facade balance clear hota hai.",
  },
  {
    id: "street-wide",
    label: "Street Wide View",
    category: "presentation",
    viewType: "STREET_WIDE",
    description: "Road, boundary wall, gate aur surrounding context ke saath wide view.",
    recommended: true,
    reason: "Client ko final house street se kaisa dikhega ye clear hota hai.",
  },
  {
    id: "evening-hero",
    label: "Evening Hero View",
    category: "presentation",
    viewType: "EVENING_HERO",
    description: "Warm exterior lights ke saath premium evening render.",
    recommended: true,
    reason: "Lighting, facade depth aur premium presentation ke liye useful.",
  },
  {
    id: "daylight-view",
    label: "Daylight Clean View",
    category: "presentation",
    viewType: "DAYLIGHT_VIEW",
    description: "Clean daylight render jisme material aur color clearly dikhe.",
    recommended: true,
    reason: "Material approval aur client clarity ke liye useful.",
  },
  {
    id: "gate-focus",
    label: "Gate Focus View",
    category: "detail",
    viewType: "GATE_FOCUS",
    description: "Gate, boundary wall, entry pillar aur front access ka focused view.",
    recommended: true,
    reason: "Gate/boundary execution aur client approval ke liye important.",
  },
  {
    id: "balcony-focus",
    label: "Balcony Focus View",
    category: "detail",
    viewType: "BALCONY_FOCUS",
    description: "Balcony railing, soffit light, facade frame aur wall treatment ka close view.",
    recommended: true,
    reason: "Balcony detailing aur railing style final karne ke liye useful.",
  },
  {
    id: "entrance-focus",
    label: "Entrance Focus View",
    category: "detail",
    viewType: "ENTRANCE_FOCUS",
    description: "Main door, porch, steps, entry light aur entrance wall detail.",
    recommended: true,
    reason: "Entry design contractor/client dono ke liye clear hota hai.",
  },
  {
    id: "material-closeup",
    label: "Material Close-Up View",
    category: "detail",
    viewType: "MATERIAL_CLOSEUP",
    description: "Wood texture, grey/white finish, railing, lighting aur wall material detail.",
    recommended: false,
    reason: "Material palette approval ke liye useful.",
  },
  {
    id: "front-elevation-draft",
    label: "Front Elevation Draft",
    category: "architectural",
    viewType: "FRONT_ELEVATION_DRAFT",
    description: "Flat front elevation style conceptual draft.",
    recommended: true,
    reason: "Working elevation aur contractor notes ke base ke roop me useful.",
  },
  {
    id: "left-side-elevation",
    label: "Left Side Elevation",
    category: "architectural",
    viewType: "LEFT_SIDE_ELEVATION",
    description: "Left side wall openings, massing aur side facade concept.",
    recommended: false,
    reason: "Side setbacks/openings samajhne ke liye useful.",
  },
  {
    id: "right-side-elevation",
    label: "Right Side Elevation",
    category: "architectural",
    viewType: "RIGHT_SIDE_ELEVATION",
    description: "Right side wall openings, massing aur side facade concept.",
    recommended: false,
    reason: "Side openings aur service wall planning ke liye useful.",
  },
  {
    id: "rear-elevation",
    label: "Rear Elevation",
    category: "architectural",
    viewType: "REAR_ELEVATION",
    description: "Rear side conceptual elevation.",
    recommended: false,
    reason: "Back side elevation package complete karne ke liye useful.",
  },
  {
    id: "working-elevation",
    label: "Working Elevation with Dimensions",
    category: "technical",
    viewType: "WORKING_ELEVATION",
    description: "Contractor reference elevation notes, levels, material callouts and dimension checklist.",
    recommended: true,
    reason: "Mistri/contractor ko facade execution samjhane ke liye important.",
  },
  {
    id: "facade-material-sheet",
    label: "Facade Material Sheet",
    category: "technical",
    viewType: "FACADE_MATERIAL_SHEET",
    description: "Material palette, color notes, lighting notes, railing/gate notes.",
    recommended: true,
    reason: "Client approval aur contractor procurement ke liye useful.",
  },
];

export function getExteriorSuggestions() {
  return EXTERIOR_SUGGESTIONS;
}

export function findSuggestionByText(text: string) {
  const t = String(text || "").toLowerCase();

  return EXTERIOR_SUGGESTIONS.find((s) => {
    const hay = `${s.label} ${s.viewType} ${s.description}`.toLowerCase();
    return hay.includes(t) || t.includes(s.label.toLowerCase()) || t.includes(s.viewType.toLowerCase());
  });
}

export function findSuggestionByViewType(viewType: string) {
  const t = String(viewType || "").toUpperCase();
  return EXTERIOR_SUGGESTIONS.find((s) => s.viewType === t);
}
