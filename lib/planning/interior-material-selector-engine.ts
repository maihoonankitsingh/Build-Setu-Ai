// BUILDSETU_PHASE_M2_INTERIOR_MATERIAL_SELECTOR_ENGINE

type MaterialTaxonomyLike = {
  detectedIntent?: {
    interiorMaterial?: boolean;
    furniture?: boolean;
    finishing?: boolean;
    marketPrice?: boolean;
    webSearch?: boolean;
  };
  detectedCategories?: string[];
  materialItems?: Array<{
    id?: string;
    category?: string;
    label?: string;
    detected?: boolean;
  }>;
  missingInputs?: string[];
};

export type BuildSetuInteriorMaterialSelectorResult = {
  engineVersion: "M2-1";
  scope: "interior_material_selection_only_no_pricing";
  detectedUseAreas: string[];
  detectedQualityTier: "economy" | "standard" | "premium" | "luxury" | "not_confirmed";
  moistureRisk: "dry_area" | "semi_wet_area" | "wet_area" | "mixed_or_unknown";
  recommendedBoardMaterials: Array<{
    useArea: string;
    recommended: string;
    alternatives: string[];
    avoid: string[];
    reason: string;
  }>;
  recommendedFinishMaterials: Array<{
    useArea: string;
    recommended: string;
    alternatives: string[];
    avoid: string[];
    reason: string;
  }>;
  furnitureMaterialGuidance: string[];
  kitchenMaterialGuidance: string[];
  wardrobeMaterialGuidance: string[];
  boqMappingNotes: string[];
  missingInputs: string[];
  marketPriceBoundary: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function pushUnique(list: string[], value: string) {
  const clean = cleanText(value);
  if (clean && !list.includes(clean)) list.push(clean);
}

function detectQualityTier(text: string): BuildSetuInteriorMaterialSelectorResult["detectedQualityTier"] {
  if (has(text, /luxury|ultra premium|high end|high-end/i)) return "luxury";
  if (has(text, /premium|best|top quality|high quality/i)) return "premium";
  if (has(text, /economy|low budget|budget|cheap|affordable/i)) return "economy";
  if (has(text, /standard|normal|mid range|mid-range/i)) return "standard";
  return "not_confirmed";
}

function detectMoistureRisk(text: string): BuildSetuInteriorMaterialSelectorResult["moistureRisk"] {
  if (has(text, /toilet|bathroom|wash area|wet area|under sink|utility|laundry|balcony/i)) return "wet_area";
  if (has(text, /kitchen|sink|dishwasher|chimney|hob|countertop|semi wet|semi-wet/i)) return "semi_wet_area";
  if (has(text, /bedroom|living|study|office|wardrobe|tv unit|dry area/i)) return "dry_area";
  return "mixed_or_unknown";
}

function detectUseAreas(text: string) {
  const areas: string[] = [];

  if (has(text, /kitchen|modular kitchen|hob|chimney|sink|countertop/i)) areas.push("modular_kitchen");
  if (has(text, /wardrobe|closet|loft/i)) areas.push("wardrobe");
  if (has(text, /tv unit|entertainment unit/i)) areas.push("tv_unit");
  if (has(text, /bed|bedroom/i)) areas.push("bedroom_furniture");
  if (has(text, /living|sofa|centre table|center table/i)) areas.push("living_room_furniture");
  if (has(text, /office|workstation|study|desk|reception/i)) areas.push("office_furniture");
  if (has(text, /toilet|bathroom|vanity|wash area/i)) areas.push("bathroom_vanity");
  if (has(text, /false ceiling|ceiling/i)) areas.push("false_ceiling");
  if (has(text, /panel|wall panel|cladding/i)) areas.push("wall_paneling");

  return areas.length ? areas : ["general_interior"];
}

function boardRecommendation(useArea: string, qualityTier: BuildSetuInteriorMaterialSelectorResult["detectedQualityTier"], moistureRisk: BuildSetuInteriorMaterialSelectorResult["moistureRisk"]) {
  if (useArea === "modular_kitchen" || moistureRisk === "semi_wet_area" || moistureRisk === "wet_area") {
    return {
      useArea,
      recommended: qualityTier === "economy" ? "BWR plywood / HDHMR with proper edge sealing" : "BWP plywood or premium HDHMR for carcass and shutters",
      alternatives: ["BWR plywood", "HDHMR", "WPC/PVC only for selected wet-prone utility use"],
      avoid: ["plain particle board near sink", "unsealed MDF in wet zones", "low-grade board below sink"],
      reason: "Kitchen and wet-adjacent areas need moisture resistance, screw holding and sealed edges.",
    };
  }

  if (useArea === "wardrobe") {
    return {
      useArea,
      recommended: qualityTier === "economy" ? "MR plywood / good particle board for dry wardrobe zones" : "BWR plywood or HDHMR for stronger wardrobe carcass",
      alternatives: ["MR plywood", "BWR plywood", "HDHMR", "premium particle board for budget modular systems"],
      avoid: ["unbranded thin board", "wet-area board without edge sealing"],
      reason: "Wardrobes need dimensional stability, hinge strength, shelf load capacity and shutter alignment.",
    };
  }

  if (useArea === "bathroom_vanity") {
    return {
      useArea,
      recommended: "BWP plywood / WPC / waterproof-grade board with sealed edges",
      alternatives: ["WPC", "BWP plywood", "HDHMR with waterproof laminate and edge sealing"],
      avoid: ["MDF", "particle board", "MR plywood in direct wet exposure"],
      reason: "Vanity units face high moisture, cleaning water and leakage risk.",
    };
  }

  if (useArea === "false_ceiling") {
    return {
      useArea,
      recommended: "Moisture-resistant gypsum board / calcium silicate board based on room condition",
      alternatives: ["gypsum board", "calcium silicate board", "PVC panel for selected service/wet areas"],
      avoid: ["heavy unsupported panels", "non-MR gypsum in wet zones"],
      reason: "Ceiling material should coordinate with AC, lights, service access and moisture condition.",
    };
  }

  return {
    useArea,
    recommended: qualityTier === "premium" || qualityTier === "luxury" ? "BWR plywood / HDHMR depending finish requirement" : "MR/BWR plywood based on budget and use",
    alternatives: ["MR plywood", "BWR plywood", "HDHMR", "MDF for decorative low-load panels"],
    avoid: ["low-grade board for heavy shutters", "MDF in moisture areas"],
    reason: "Dry-area furniture can use wider board options, but hardware load and finish quality still matter.",
  };
}

function finishRecommendation(useArea: string, qualityTier: BuildSetuInteriorMaterialSelectorResult["detectedQualityTier"], moistureRisk: BuildSetuInteriorMaterialSelectorResult["moistureRisk"]) {
  if (qualityTier === "luxury") {
    return {
      useArea,
      recommended: "veneer / PU / premium acrylic depending design intent",
      alternatives: ["premium laminate", "PU paint", "natural veneer", "back-painted glass"],
      avoid: ["cheap glossy laminate where scratches are visible"],
      reason: "Luxury finish needs controlled workmanship, edge detail, polish quality and maintenance planning.",
    };
  }

  if (qualityTier === "premium") {
    return {
      useArea,
      recommended: useArea === "modular_kitchen" ? "acrylic / PU / premium laminate shutters" : "premium laminate / veneer / PU as per style",
      alternatives: ["premium laminate", "acrylic", "PU", "veneer"],
      avoid: ["low-grade edge band", "unsealed veneer in wet areas"],
      reason: "Premium interiors need better finish durability, clean edge treatment and hardware coordination.",
    };
  }

  if (moistureRisk === "wet_area" || useArea === "bathroom_vanity") {
    return {
      useArea,
      recommended: "water-resistant laminate / compact laminate / waterproof surface finish",
      alternatives: ["compact laminate", "HPL", "waterproof laminate"],
      avoid: ["veneer in direct wet exposure", "unsealed PU near seepage"],
      reason: "Wet zones require water-resistant finish and sealed joints.",
    };
  }

  return {
    useArea,
    recommended: "standard laminate with matching edge band",
    alternatives: ["matte laminate", "textured laminate", "membrane finish for budget shutters"],
    avoid: ["high-gloss cheap finish in rough-use areas"],
    reason: "Standard laminate is practical, economical, easy to maintain and suitable for most dry interiors.",
  };
}

export function buildInteriorMaterialSelectorEngine(input: {
  inputText: string;
  materialTaxonomyEngine?: MaterialTaxonomyLike;
}): BuildSetuInteriorMaterialSelectorResult {
  const text = cleanText(input.inputText);
  const lower = text.toLowerCase();

  const detectedUseAreas = detectUseAreas(lower);
  const detectedQualityTier = detectQualityTier(text);
  const moistureRisk = detectMoistureRisk(text);

  const recommendedBoardMaterials = detectedUseAreas
    .filter((area) => area !== "living_room_furniture" || has(text, /custom|built in|built-in|unit|panel|storage/i))
    .map((area) => boardRecommendation(area, detectedQualityTier, moistureRisk));

  const recommendedFinishMaterials = detectedUseAreas.map((area) => finishRecommendation(area, detectedQualityTier, moistureRisk));

  const furnitureMaterialGuidance: string[] = [
    "Loose furniture should be separated from custom carpentry in BOQ.",
    "Custom furniture should be measured after wall plaster/tiles where exact fit is required.",
    "Hardware quality affects long-term usability more than only board thickness.",
    "Fabric/leatherette/foam selection should be separated from carpentry board selection.",
  ];

  const kitchenMaterialGuidance: string[] = [];
  if (detectedUseAreas.includes("modular_kitchen") || has(text, /kitchen|modular/i)) {
    kitchenMaterialGuidance.push("Use moisture-resistant carcass near sink and wet walls.");
    kitchenMaterialGuidance.push("Confirm countertop material, backsplash, sink, hob, chimney and appliance sizes before final module split.");
    kitchenMaterialGuidance.push("Use corrosion-resistant hardware and proper edge sealing.");
    kitchenMaterialGuidance.push("Separate carcass, shutter, countertop, hardware, accessories and appliances in BOQ.");
  }

  const wardrobeMaterialGuidance: string[] = [];
  if (detectedUseAreas.includes("wardrobe") || has(text, /wardrobe|closet/i)) {
    wardrobeMaterialGuidance.push("Confirm hinged/sliding shutter, loft, drawer/shelf/hanging split and mirror requirement.");
    wardrobeMaterialGuidance.push("Use stronger board/hardware for tall shutters and sliding systems.");
    wardrobeMaterialGuidance.push("Keep wardrobe depth, shutter swing and nearby switch/socket conflicts checked.");
  }

  const boqMappingNotes: string[] = [
    "Material selection should map to BOQ only after unit, area/length/count and quality tier are confirmed.",
    "Board material, finish material, hardware, labour, transport, GST and installation should remain separate rate layers.",
    "Do not mix current market price with BOQ base rate until M-4/M-5 price source engine is connected.",
  ];

  const missingInputs: string[] = [];
  if (detectedQualityTier === "not_confirmed") missingInputs.push("Quality tier missing: economy / standard / premium / luxury.");
  if (moistureRisk === "mixed_or_unknown") missingInputs.push("Wet/dry area condition missing for board and finish selection.");
  if (!has(text, /city|raipur|delhi|mumbai|pune|bangalore|bengaluru|hyderabad|chennai|kolkata|indore|bhopal|nagpur|lucknow|surat|ahmedabad/i)) {
    missingInputs.push("City/location missing for availability and future price comparison.");
  }
  if (!has(text, /sqft|square feet|running ft|rft|length|width|size|dimension|area/i)) {
    missingInputs.push("Quantity basis missing: sqft, running ft, sheet count or room size.");
  }

  return {
    engineVersion: "M2-1",
    scope: "interior_material_selection_only_no_pricing",
    detectedUseAreas,
    detectedQualityTier,
    moistureRisk,
    recommendedBoardMaterials,
    recommendedFinishMaterials,
    furnitureMaterialGuidance,
    kitchenMaterialGuidance,
    wardrobeMaterialGuidance,
    boqMappingNotes,
    missingInputs,
    marketPriceBoundary: [
      "M2 does not fetch or finalize current market prices.",
      "Use M-4 price source freshness engine and M-5 web-search adapter before showing market rates.",
      "Any future price must show city, date, unit, source, confidence and GST/labour/transport scope.",
    ],
    safetyBoundary: [
      "Interior material recommendation is planning guidance, not final procurement approval.",
      "Fire, electrical, plumbing and structural support conditions must override visual preference.",
      "Final material selection should be approved with sample, warranty and vendor quotation.",
    ],
  };
}

export function buildInteriorMaterialSelectorPromptBlock(result: BuildSetuInteriorMaterialSelectorResult): string {
  const lines: string[] = [];

  lines.push("INTERIOR MATERIAL SELECTOR:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Use areas: ${result.detectedUseAreas.join(", ")}`);
  lines.push(`- Quality tier: ${result.detectedQualityTier}`);
  lines.push(`- Moisture risk: ${result.moistureRisk}`);

  lines.push("- Board recommendations:");
  result.recommendedBoardMaterials.slice(0, 6).forEach((item) => {
    lines.push(`  - ${item.useArea}: ${item.recommended}`);
  });

  lines.push("- Finish recommendations:");
  result.recommendedFinishMaterials.slice(0, 6).forEach((item) => {
    lines.push(`  - ${item.useArea}: ${item.recommended}`);
  });

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Price boundary:");
  result.marketPriceBoundary.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
