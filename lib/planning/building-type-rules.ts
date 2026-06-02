import type { NormalizedPlanningRequirement, SpaceProgramItem } from "./universal-types";

function bhkSpaces(req: NormalizedPlanningRequirement): SpaceProgramItem[] {
  const bedrooms = req.bedrooms || req.bhk || 2;
  const toilets = req.toilets || Math.max(1, Math.min(3, bedrooms - 1));

  const spaces: SpaceProgramItem[] = [
    { name: "Entrance / Foyer", category: "architectural", preferredSizeFt: "4x6 to 6x8", minSizeFt: "4x5", zone: "front", adjacency: ["living"], notes: "Road-side entry with privacy buffer." },
    { name: "Living / Drawing", category: "architectural", preferredSizeFt: "11x14 to 14x18", minSizeFt: "10x12", zone: "front/north-east", vastuPreference: "north/east", adjacency: ["foyer", "dining"], notes: "Guest access and family sitting." },
    { name: "Dining", category: "architectural", preferredSizeFt: "9x10 to 13x14", minSizeFt: "8x9", zone: "central", adjacency: ["living", "kitchen"], notes: "Central family circulation node." },
    { name: "Kitchen", category: "service", preferredSizeFt: "8x10 to 11x12", minSizeFt: "7x9", zone: "south-east/service", vastuPreference: "south-east", adjacency: ["dining", "utility"], notes: "Kitchen near dining and utility/wash." },
  ];

  for (let i = 1; i <= bedrooms; i++) {
    spaces.push({
      name: i === 1 ? "Master Bedroom" : `Bedroom ${i}`,
      category: "private",
      preferredSizeFt: i === 1 ? "11x13 to 13x15" : "10x11 to 12x13",
      minSizeFt: "9x10",
      zone: i === 1 ? "south-west/private" : "west/south/private",
      vastuPreference: i === 1 ? "south-west" : "south/west",
      adjacency: ["toilet", "passage"],
      notes: "Privacy, wardrobe wall and ventilation required.",
    });
  }

  for (let i = 1; i <= toilets; i++) {
    spaces.push({
      name: i === 1 ? "Common Toilet" : `Toilet ${i}`,
      category: "service",
      preferredSizeFt: "5x7 to 8x5",
      minSizeFt: "4x7",
      zone: "west/north-west/service",
      vastuPreference: "west/north-west",
      adjacency: ["bedroom", "passage"],
      notes: "Wet wall grouping with plumbing shaft preferred.",
    });
  }

  spaces.push(
    { name: "Puja / Mandir", category: "spiritual", preferredSizeFt: "4x4 to 6x6", minSizeFt: "3x4", zone: "north-east", vastuPreference: "north-east", adjacency: ["living", "dining"], notes: "NE preferred when possible." },
    { name: "Staircase", category: "circulation", preferredSizeFt: "6x10 to 10x12", minSizeFt: "6x9", zone: "south/west/side", vastuPreference: "south/west", adjacency: ["entry", "passage"], notes: "Future floor/rental access consideration." }
  );

  if (req.parkingRequired) {
    spaces.unshift({ name: "Parking / Porch", category: "site", preferredSizeFt: "10x15 to 12x18", minSizeFt: "9x14", zone: "front/road-side", adjacency: ["gate", "entry"], notes: "Car approach and gate access." });
  }

  return spaces;
}

function commercialSpaces(req: NormalizedPlanningRequirement): SpaceProgramItem[] {
  const common: SpaceProgramItem[] = [
    { name: "Frontage / Entry", category: "commercial", preferredSizeFt: "full road width where possible", minSizeFt: "6 ft clear", zone: "front/road-side", adjacency: ["customer area"], notes: "Maximum visibility and customer approach." },
    { name: "Customer / Sales Area", category: "commercial", preferredSizeFt: "40% to 60% of usable area", minSizeFt: "as per business", zone: "front/central", adjacency: ["entry", "cash/reception"], notes: "Open, flexible, visible area." },
    { name: "Reception / Cash Counter", category: "commercial", preferredSizeFt: "5x6 to 8x10", minSizeFt: "4x5", zone: "front/central", adjacency: ["entry", "sales area"], notes: "Control point near entry." },
    { name: "Storage / Back Office", category: "service", preferredSizeFt: "8x8 to 12x12", minSizeFt: "6x8", zone: "rear/service", adjacency: ["sales area"], notes: "Service access preferred." },
    { name: "Toilet", category: "service", preferredSizeFt: "5x7", minSizeFt: "4x7", zone: "rear/west", adjacency: ["service corridor"], notes: "Accessible but away from main frontage." },
  ];

  if (req.liftRequired) common.push({ name: "Lift Lobby", category: "vertical circulation", preferredSizeFt: "6x8 to 8x10", minSizeFt: "5x6", zone: "core", adjacency: ["staircase"], notes: "For multi-floor commercial access." });
  if (req.staircaseRequired) common.push({ name: "Staircase", category: "vertical circulation", preferredSizeFt: "7x12 to 10x16", minSizeFt: "6x10", zone: "side/rear", adjacency: ["entry", "lift"], notes: "Clear fire/safety movement." });

  return common;
}

function schoolSpaces(req: NormalizedPlanningRequirement): SpaceProgramItem[] {
  const classrooms = req.classrooms || 6;
  const spaces: SpaceProgramItem[] = [
    { name: "Reception / Admin", category: "institutional", preferredSizeFt: "10x12 to 14x16", minSizeFt: "8x10", zone: "front", adjacency: ["entry", "principal"], notes: "Visitor control and administration." },
    { name: "Principal Room", category: "institutional", preferredSizeFt: "10x12 to 12x14", minSizeFt: "9x10", zone: "front/admin", adjacency: ["admin", "staff room"], notes: "Near admin and entry." },
    { name: "Staff Room", category: "institutional", preferredSizeFt: "12x16 to 18x24", minSizeFt: "10x12", zone: "admin/central", adjacency: ["principal", "classrooms"], notes: "Staff access to classroom corridor." },
    { name: "Corridor", category: "circulation", preferredSizeFt: "6 ft to 8 ft wide", minSizeFt: "5 ft clear", zone: "linear/central", adjacency: ["classrooms"], notes: "Clear student movement." },
  ];

  for (let i = 1; i <= classrooms; i++) {
    spaces.push({
      name: `Classroom ${i}`,
      category: "institutional",
      preferredSizeFt: "20x24 to 24x30",
      minSizeFt: "18x20",
      zone: "classroom wing",
      adjacency: ["corridor"],
      notes: "Natural light, ventilation, board wall and seating grid.",
    });
  }

  spaces.push(
    { name: "Boys Toilet", category: "service", preferredSizeFt: "as per occupancy", minSizeFt: "8x12", zone: "service side", adjacency: ["corridor"], notes: "Separate toilet zoning." },
    { name: "Girls Toilet", category: "service", preferredSizeFt: "as per occupancy", minSizeFt: "8x12", zone: "service side", adjacency: ["corridor"], notes: "Separate toilet zoning." },
    { name: "Assembly / Open Area", category: "site", preferredSizeFt: "as per site", minSizeFt: "open court", zone: "front/central open", adjacency: ["entry"], notes: "Open gathering/play space." },
    { name: "Staircase", category: "circulation", preferredSizeFt: "8x16 to 12x20", minSizeFt: "7x14", zone: "core", adjacency: ["corridor"], notes: "Multi-floor institutional movement." }
  );

  return spaces;
}

function hospitalSpaces(req: NormalizedPlanningRequirement): SpaceProgramItem[] {
  const beds = req.beds || 10;

  return [
    { name: "Emergency / Entry", category: "healthcare", preferredSizeFt: "12x16 to 16x24", minSizeFt: "10x12", zone: "front/road-side", adjacency: ["reception", "triage"], notes: "Fast emergency access." },
    { name: "Reception / Registration", category: "healthcare", preferredSizeFt: "10x14 to 16x20", minSizeFt: "8x10", zone: "front", adjacency: ["waiting", "opd"], notes: "Patient registration and control." },
    { name: "Waiting Area", category: "healthcare", preferredSizeFt: "as per patient load", minSizeFt: "12x16", zone: "front/central", adjacency: ["reception", "opd"], notes: "Clear patient seating and circulation." },
    { name: "OPD / Consultation Rooms", category: "healthcare", preferredSizeFt: "10x12 each", minSizeFt: "8x10", zone: "clinical zone", adjacency: ["waiting"], notes: "Doctor consultation rooms." },
    { name: `${beds} Bed Ward`, category: "healthcare", preferredSizeFt: "80 to 120 sq.ft per bed concept", minSizeFt: "as per norms", zone: "quiet/private", adjacency: ["nursing station", "toilets"], notes: "Bed spacing and nurse visibility required." },
    { name: "Nursing Station", category: "healthcare", preferredSizeFt: "8x10 to 12x12", minSizeFt: "6x8", zone: "central clinical", adjacency: ["ward"], notes: "Ward monitoring point." },
    { name: "Procedure / Treatment Room", category: "healthcare", preferredSizeFt: "12x14 to 14x16", minSizeFt: "10x12", zone: "clinical", adjacency: ["opd", "ward"], notes: "Clean clinical movement." },
    { name: "Pharmacy / Store", category: "healthcare", preferredSizeFt: "8x10 to 12x14", minSizeFt: "6x8", zone: "front/service", adjacency: ["reception"], notes: "Controlled medicine storage." },
    { name: "Patient Toilets", category: "service", preferredSizeFt: "as per occupancy", minSizeFt: "5x7 each", zone: "service", adjacency: ["ward", "waiting"], notes: "Accessible toilet provision." },
    { name: "Staircase / Lift Core", category: "circulation", preferredSizeFt: "as per floors", minSizeFt: "core clear", zone: "side/central", adjacency: ["corridor"], notes: "Vertical movement and emergency access." },
  ];
}

export function getBuildingRules(req: NormalizedPlanningRequirement): string[] {
  const common = [
    "Road-side access, entry visibility, circulation and services must be planned first.",
    "Natural light and ventilation must be provided to habitable spaces.",
    "Wet areas should be grouped for plumbing efficiency.",
    "Stair/lift core must not block main functional movement.",
    "Final local bylaws, setbacks, FAR/FSI, fire norms and structural design require licensed professional validation.",
  ];

  if (req.projectType === "residential") {
    return [
      ...common,
      "Residential planning must separate public, semi-private and private zones.",
      "Kitchen-dining adjacency and bedroom privacy are priority.",
      "Parking and staircase should support future floor use where required.",
    ];
  }

  if (req.projectType === "commercial") {
    return [
      ...common,
      "Commercial planning must prioritize frontage, customer movement and service/back-office zoning.",
      "Toilets and services should be accessible but away from primary display/sales frontage.",
      "Stair/lift/fire movement must be clearly reserved.",
    ];
  }

  if (req.projectType === "institutional") {
    return [
      ...common,
      "Institutional planning must prioritize safe circulation, occupancy load and functional zoning.",
      "Toilets, stairs, corridors and emergency movement require code validation.",
      "Public, admin, teaching/clinical and service zones should be separated.",
    ];
  }

  return common;
}

export function getSpaceProgram(req: NormalizedPlanningRequirement): SpaceProgramItem[] {
  if (req.subType === "school" || req.subType === "college" || req.subType === "hostel") return schoolSpaces(req);
  if (req.subType === "hospital") return hospitalSpaces(req);
  if (req.projectType === "commercial" || req.projectType === "mixed") return commercialSpaces(req);
  return bhkSpaces(req);
}
