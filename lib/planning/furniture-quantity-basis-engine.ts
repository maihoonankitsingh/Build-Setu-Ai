// BUILDSETU_PHASE_M3_FURNITURE_QUANTITY_BASIS_ENGINE

type InteriorMaterialSelectorLike = {
  detectedUseAreas?: string[];
  detectedQualityTier?: string;
  moistureRisk?: string;
  recommendedBoardMaterials?: Array<{
    useArea?: string;
    recommended?: string;
  }>;
  recommendedFinishMaterials?: Array<{
    useArea?: string;
    recommended?: string;
  }>;
  missingInputs?: string[];
};

type MaterialTaxonomyLike = {
  detectedIntent?: {
    furniture?: boolean;
    interiorMaterial?: boolean;
    boqEstimate?: boolean;
    marketPrice?: boolean;
    webSearch?: boolean;
  };
};

export type BuildSetuFurnitureQuantityItem = {
  id: string;
  label: string;
  furnitureType: "custom_carpentry" | "modular_unit" | "loose_furniture" | "service_or_accessory";
  useArea: string;
  quantityBasis: "sqft" | "running_ft" | "piece" | "set" | "nos" | "room_count" | "not_confirmed";
  measurementRules: string[];
  boqBreakup: string[];
  dependencyChecks: string[];
  riskNotes: string[];
};

export type BuildSetuFurnitureQuantityBasisResult = {
  engineVersion: "M3-1";
  scope: "furniture_quantity_basis_only_no_pricing";
  detectedFurnitureIntent: boolean;
  detectedUseAreas: string[];
  primaryQuantityBasis: string[];
  furnitureItems: BuildSetuFurnitureQuantityItem[];
  measurementChecklist: string[];
  boqSplitPolicy: string[];
  missingInputs: string[];
  priceBoundary: string[];
  nextActions: string[];
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

function detectUseAreas(text: string, selector?: InteriorMaterialSelectorLike): string[] {
  const detected = Array.isArray(selector?.detectedUseAreas) ? selector?.detectedUseAreas || [] : [];
  const areas: string[] = [];

  detected.forEach((area) => pushUnique(areas, area));

  if (has(text, /kitchen|modular kitchen|hob|chimney|sink|countertop/i)) pushUnique(areas, "modular_kitchen");
  if (has(text, /wardrobe|closet|loft/i)) pushUnique(areas, "wardrobe");
  if (has(text, /tv unit|entertainment unit/i)) pushUnique(areas, "tv_unit");
  if (has(text, /bed|bedroom/i)) pushUnique(areas, "bedroom_furniture");
  if (has(text, /sofa|living|coffee table|centre table|center table/i)) pushUnique(areas, "living_room_furniture");
  if (has(text, /office|workstation|study|desk|reception|cabin/i)) pushUnique(areas, "office_furniture");
  if (has(text, /vanity|bathroom vanity|toilet cabinet/i)) pushUnique(areas, "bathroom_vanity");
  if (has(text, /shoe rack|pooja|mandir|partition|storage/i)) pushUnique(areas, "custom_storage");

  return areas.length ? areas : ["general_furniture"];
}

function itemForArea(area: string): BuildSetuFurnitureQuantityItem {
  if (area === "modular_kitchen") {
    return {
      id: "modular_kitchen_quantity",
      label: "Modular Kitchen",
      furnitureType: "modular_unit",
      useArea: area,
      quantityBasis: "running_ft",
      measurementRules: [
        "Measure lower cabinet running feet and upper cabinet running feet separately.",
        "Separate tall unit, loft, island, breakfast counter and appliance tower if present.",
        "Countertop, backsplash, sink, hob, chimney, accessories and hardware should be separate BOQ lines.",
        "Confirm wall-to-wall length after plaster/tiles and verify corner/dead-space condition.",
      ],
      boqBreakup: [
        "carcass board",
        "shutter material",
        "finish material",
        "countertop",
        "backsplash",
        "hardware/accessories",
        "appliances",
        "installation labour",
      ],
      dependencyChecks: [
        "sink position",
        "hob/chimney position",
        "electrical points",
        "plumbing points",
        "window/opening",
        "refrigerator and appliance sizes",
      ],
      riskNotes: [
        "Do not price kitchen as one lump sum without module split.",
        "Wet sink zone needs moisture-safe board and edge sealing.",
      ],
    };
  }

  if (area === "wardrobe") {
    return {
      id: "wardrobe_quantity",
      label: "Wardrobe",
      furnitureType: "custom_carpentry",
      useArea: area,
      quantityBasis: "sqft",
      measurementRules: [
        "Measure wardrobe front elevation width x height in sqft.",
        "Separate loft, drawers, mirror, sliding shutter, profile shutter and internal accessories.",
        "Confirm depth, shutter opening type and ceiling height.",
        "Deduct/adjust only if vendor BOQ rule supports deduction; otherwise keep front elevation method consistent.",
      ],
      boqBreakup: [
        "carcass",
        "shutter",
        "laminate/finish",
        "loft",
        "drawers",
        "hardware",
        "mirror/accessories",
        "installation labour",
      ],
      dependencyChecks: [
        "room clear width",
        "door swing",
        "switch/socket conflict",
        "AC/window conflict",
        "floor skirting",
      ],
      riskNotes: [
        "Sliding wardrobe needs track/hardware quality check.",
        "Tall shutters need stronger hardware and board stability.",
      ],
    };
  }

  if (area === "tv_unit") {
    return {
      id: "tv_unit_quantity",
      label: "TV Unit / Media Wall",
      furnitureType: "custom_carpentry",
      useArea: area,
      quantityBasis: "sqft",
      measurementRules: [
        "Measure panel/backdrop area in sqft and storage unit separately.",
        "Separate drawers, open shelves, fluted panel, stone/acrylic/glass and lighting.",
        "Confirm TV size, bracket, wire concealment and socket location.",
      ],
      boqBreakup: [
        "back panel",
        "base storage",
        "open shelves",
        "finish material",
        "hardware",
        "profile/LED lighting",
        "installation labour",
      ],
      dependencyChecks: [
        "TV size",
        "set-top box/router location",
        "electrical points",
        "wall strength",
        "viewing distance",
      ],
      riskNotes: [
        "Electrical/low-voltage conduits must be planned before panel installation.",
        "Heavy stone/glass panels need fixing review.",
      ],
    };
  }

  if (area === "office_furniture") {
    return {
      id: "office_furniture_quantity",
      label: "Office Workstation / Study / Reception",
      furnitureType: "custom_carpentry",
      useArea: area,
      quantityBasis: "piece",
      measurementRules: [
        "Count workstation/desk/reception units by piece and specify size.",
        "Separate storage, overhead cabinet, cable manager, modesty panel and partitions.",
        "Confirm ergonomic clearance, chair movement and electrical/data points.",
      ],
      boqBreakup: [
        "desk/worktop",
        "storage",
        "partition",
        "hardware",
        "wire manager",
        "loose chair",
        "installation labour",
      ],
      dependencyChecks: [
        "user count",
        "chair clearance",
        "LAN/electrical points",
        "lighting",
        "AC airflow",
      ],
      riskNotes: [
        "Office furniture should not block circulation or service access.",
        "Loose chairs and custom tables should be separate BOQ heads.",
      ],
    };
  }

  if (area === "living_room_furniture" || area === "bedroom_furniture") {
    return {
      id: `${area}_quantity`,
      label: area === "living_room_furniture" ? "Living Room Furniture" : "Bedroom Furniture",
      furnitureType: "loose_furniture",
      useArea: area,
      quantityBasis: "piece",
      measurementRules: [
        "Count loose furniture by piece/set with size, material and finish.",
        "Separate custom built-in storage from loose furniture.",
        "Confirm movement clearance around bed/sofa/table.",
      ],
      boqBreakup: [
        "loose furniture item",
        "fabric/leatherette/finish",
        "hardware if any",
        "delivery",
        "installation if any",
      ],
      dependencyChecks: [
        "room size",
        "door entry size",
        "circulation clearance",
        "electrical points",
      ],
      riskNotes: [
        "Oversized loose furniture can make circulation unusable.",
        "Warranty and repairability should be checked before procurement.",
      ],
    };
  }

  return {
    id: `${area}_quantity`,
    label: "Custom Furniture / Storage",
    furnitureType: "custom_carpentry",
    useArea: area,
    quantityBasis: "sqft",
    measurementRules: [
      "Measure front elevation width x height where carpentry is elevation-based.",
      "Use running feet only where module length is the accepted vendor basis.",
      "Count loose/service accessories by piece or set.",
    ],
    boqBreakup: [
      "carcass",
      "shutter/panel",
      "finish",
      "hardware",
      "accessory",
      "installation labour",
    ],
    dependencyChecks: [
      "site measurement",
      "wall level",
      "opening position",
      "electrical/plumbing conflict",
    ],
    riskNotes: [
      "Do not mix sqft, running ft and piece basis in one BOQ line.",
      "Final vendor quote must define measurement method clearly.",
    ],
  };
}

export function buildFurnitureQuantityBasisEngine(input: {
  inputText: string;
  materialTaxonomyEngine?: MaterialTaxonomyLike;
  interiorMaterialSelectorEngine?: InteriorMaterialSelectorLike;
}): BuildSetuFurnitureQuantityBasisResult {
  const text = cleanText(input.inputText);
  const areas = detectUseAreas(text, input.interiorMaterialSelectorEngine);

  const detectedFurnitureIntent =
    Boolean(input.materialTaxonomyEngine?.detectedIntent?.furniture) ||
    Boolean(input.materialTaxonomyEngine?.detectedIntent?.interiorMaterial) ||
    has(text, /furniture|modular|kitchen|wardrobe|tv unit|workstation|carpentry|cabinet|storage|sofa|bed/i);

  const furnitureItems = areas.map(itemForArea);

  const primaryQuantityBasis = Array.from(
    new Set(furnitureItems.map((item) => item.quantityBasis).filter((basis) => basis !== "not_confirmed"))
  );

  const measurementChecklist: string[] = [
    "Confirm site measurement after plaster/tiles/false ceiling where exact-fit furniture is required.",
    "Define each item basis clearly: sqft, running ft, piece, set or room count.",
    "Separate lower/upper kitchen, wardrobe shutter/carcass, loose furniture and accessories.",
    "Confirm thickness, board grade, finish, hardware grade and edge banding before BOQ.",
    "Confirm GST, labour, transport, delivery, installation and warranty separately in pricing phase.",
  ];

  const boqSplitPolicy: string[] = [
    "Do not mix material selection and market price in M3.",
    "Do not mix custom carpentry and loose furniture in one BOQ item.",
    "Do not mix board, finish, hardware, accessory and appliance in one BOQ line if detailed estimate is required.",
    "Keep measurement basis consistent per item category.",
    "Final BOQ rates should be filled only after M-4/M-5 price source and vendor quote layer.",
  ];

  const missingInputs: string[] = [];
  if (!has(text, /sqft|square feet|running ft|rft|feet|ft|mm|meter|size|dimension|length|width|height|area/i)) {
    missingInputs.push("Exact quantity basis missing: sqft/running ft/piece/set and item size required.");
  }
  if (!has(text, /hinged|sliding|drawer|shelf|loft|lower|upper|island|counter|shutter|accessory/i)) {
    missingInputs.push("Internal split/module details missing for detailed furniture BOQ.");
  }
  if (!has(text, /laminate|acrylic|pu|veneer|paint|finish|hardware|hinge|channel|soft close/i)) {
    missingInputs.push("Finish/hardware specification missing.");
  }

  return {
    engineVersion: "M3-1",
    scope: "furniture_quantity_basis_only_no_pricing",
    detectedFurnitureIntent,
    detectedUseAreas: areas,
    primaryQuantityBasis,
    furnitureItems,
    measurementChecklist,
    boqSplitPolicy,
    missingInputs,
    priceBoundary: [
      "M3 does not generate market prices or vendor rates.",
      "Use M-4 source freshness and M-5 web-search adapter before showing any current market rate.",
      "Every future price must include city, date, unit, source, confidence, GST/labour/transport inclusion.",
    ],
    nextActions: [
      "Confirm city and site measurement.",
      "Confirm item-wise sizes and unit basis.",
      "Confirm quality grade and finish.",
      "Confirm hardware/accessory/appliance split.",
      "Then map items to BOQ in M-6.",
    ],
    safetyBoundary: [
      "Furniture quantity basis is estimation guidance, not final vendor measurement.",
      "Final measurement method must be agreed with carpenter/vendor/client before order.",
      "Electrical, plumbing and wall support conflicts must be checked before fabrication.",
    ],
  };
}

export function buildFurnitureQuantityBasisPromptBlock(result: BuildSetuFurnitureQuantityBasisResult): string {
  const lines: string[] = [];

  lines.push("FURNITURE QUANTITY BASIS INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Furniture intent: ${result.detectedFurnitureIntent ? "yes" : "no"}`);
  lines.push(`- Use areas: ${result.detectedUseAreas.join(", ")}`);
  lines.push(`- Primary quantity basis: ${result.primaryQuantityBasis.join(", ") || "not confirmed"}`);

  lines.push("- Furniture BOQ basis:");
  result.furnitureItems.slice(0, 8).forEach((item) => {
    lines.push(`  - ${item.label}: ${item.quantityBasis} | ${item.furnitureType}`);
  });

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- BOQ split policy:");
  result.boqSplitPolicy.slice(0, 5).forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
