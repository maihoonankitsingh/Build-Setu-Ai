// BUILDSETU_PHASE_M1_MATERIAL_TAXONOMY_ENGINE

type BuildingTypeLike = {
  category?: string;
  subType?: string;
  planningMode?: string;
  riskLevel?: string;
};

export type BuildSetuMaterialTaxonomyItem = {
  id: string;
  category:
    | "civil_material"
    | "structural_material"
    | "finishing_material"
    | "interior_board_material"
    | "interior_finish_material"
    | "furniture_material"
    | "mep_material"
    | "door_window_material"
    | "exterior_facade_material";
  label: string;
  detected: boolean;
  aliases: string[];
  commonUnits: string[];
  boqMapping: string[];
  qualityGrades: string[];
  selectionChecks: string[];
  riskNotes: string[];
};

export type BuildSetuMaterialTaxonomyResult = {
  engineVersion: "M1-1";
  scope: "material_taxonomy_only_no_pricing";
  detectedIntent: {
    materialSelection: boolean;
    interiorMaterial: boolean;
    furniture: boolean;
    civilMaterial: boolean;
    finishing: boolean;
    mep: boolean;
    boqEstimate: boolean;
    marketPrice: boolean;
    webSearch: boolean;
  };
  detectedCategories: string[];
  materialItems: BuildSetuMaterialTaxonomyItem[];
  recommendedSourceLayers: string[];
  dataIsolationPolicy: string[];
  missingInputs: string[];
  nextActions: string[];
  safetyBoundary: string[];
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function item(args: Omit<BuildSetuMaterialTaxonomyItem, "detected"> & { detected?: boolean }): BuildSetuMaterialTaxonomyItem {
  return {
    detected: Boolean(args.detected),
    ...args,
  };
}

function detectByAliases(text: string, aliases: string[]) {
  return aliases.some((alias) => text.includes(alias.toLowerCase()));
}

const MATERIAL_LIBRARY: Omit<BuildSetuMaterialTaxonomyItem, "detected">[] = [
  {
    id: "cement",
    category: "civil_material",
    label: "Cement",
    aliases: ["cement", "opc", "ppc", "psc"],
    commonUnits: ["bag", "kg", "tonne"],
    boqMapping: ["RCC", "PCC", "masonry mortar", "plaster", "flooring bed"],
    qualityGrades: ["OPC 43", "OPC 53", "PPC", "PSC"],
    selectionChecks: ["brand/grade", "manufacturing date", "batch", "storage dryness", "use case"],
    riskNotes: ["Old or moisture-damaged cement can reduce strength.", "Grade must match engineer/specification requirement."],
  },
  {
    id: "tmt_steel",
    category: "structural_material",
    label: "TMT Steel / Reinforcement",
    aliases: ["steel", "tmt", "rebar", "reinforcement", "sariya", "iron rod"],
    commonUnits: ["kg", "tonne"],
    boqMapping: ["RCC reinforcement", "BBS", "foundation steel", "column/beam/slab steel"],
    qualityGrades: ["Fe 500", "Fe 500D", "Fe 550", "corrosion-resistant where required"],
    selectionChecks: ["grade", "diameter", "test certificate", "weight tolerance", "brand", "bendability"],
    riskNotes: ["Final quantity and bar diameter must follow structural engineer BBS.", "Rust, wrong grade, or underweight bars are high-risk."],
  },
  {
    id: "sand_aggregate",
    category: "civil_material",
    label: "Sand / M-sand / Aggregate",
    aliases: ["sand", "m sand", "m-sand", "aggregate", "gitti", "stone chips", "dust"],
    commonUnits: ["cft", "cum", "tonne"],
    boqMapping: ["concrete", "mortar", "plaster", "PCC", "floor bed"],
    qualityGrades: ["river sand where legal/available", "M-sand", "20mm aggregate", "10mm aggregate"],
    selectionChecks: ["gradation", "silt content", "moisture", "source", "cleanliness"],
    riskNotes: ["High silt or poor grading affects strength/workability.", "Local legal availability and transport cost matter."],
  },
  {
    id: "brick_block",
    category: "civil_material",
    label: "Brick / AAC / Block",
    aliases: ["brick", "bricks", "aac", "aac block", "block", "fly ash brick", "red brick"],
    commonUnits: ["piece", "cum", "sqft wall area"],
    boqMapping: ["masonry", "partition wall", "external wall", "infill wall"],
    qualityGrades: ["red brick", "fly ash brick", "AAC block", "concrete block"],
    selectionChecks: ["strength", "water absorption", "size tolerance", "edge quality", "availability"],
    riskNotes: ["Wall type affects dead load, plaster, fixing, sound and thermal performance."],
  },
  {
    id: "tiles_stone",
    category: "finishing_material",
    label: "Tiles / Marble / Granite / Stone",
    aliases: ["tile", "tiles", "vitrified", "ceramic", "marble", "granite", "stone", "flooring"],
    commonUnits: ["sqft", "sqm", "box"],
    boqMapping: ["flooring", "wall dado", "toilet wall", "kitchen backsplash", "staircase finish"],
    qualityGrades: ["ceramic", "vitrified", "GVT/PGVT", "anti-skid", "granite", "marble"],
    selectionChecks: ["size", "finish", "anti-skid", "water absorption", "shade/batch", "wastage"],
    riskNotes: ["Wet areas need anti-skid and slope coordination.", "Large format tiles need better surface preparation and skilled labour."],
  },
  {
    id: "paint_putty",
    category: "finishing_material",
    label: "Putty / Primer / Paint / Texture",
    aliases: ["paint", "putty", "primer", "texture", "wall finish", "emulsion"],
    commonUnits: ["sqft", "litre", "kg"],
    boqMapping: ["internal paint", "external paint", "wall putty", "primer", "texture finish"],
    qualityGrades: ["economy emulsion", "premium emulsion", "washable paint", "weatherproof exterior"],
    selectionChecks: ["surface preparation", "primer compatibility", "number of coats", "washability", "exterior exposure"],
    riskNotes: ["Poor surface preparation causes peeling/waves.", "Exterior paint must match climate and seepage conditions."],
  },
  {
    id: "plywood_boards",
    category: "interior_board_material",
    label: "Plywood / MDF / HDHMR / Particle Board",
    aliases: ["plywood", "ply", "mdf", "hdhmr", "particle board", "block board", "bwr", "bwp", "mr grade"],
    commonUnits: ["sheet", "sqft", "mm thickness"],
    boqMapping: ["modular kitchen", "wardrobe", "TV unit", "bed", "cabinet carcass", "partition"],
    qualityGrades: ["MR", "BWR", "BWP", "HDHMR", "MDF", "particle board"],
    selectionChecks: ["wet/dry area", "thickness", "brand", "termite treatment", "screw holding", "edge sealing"],
    riskNotes: ["Kitchen/wet zones need moisture-resistant specification.", "Wrong board selection causes swelling, sagging and hardware failure."],
  },
  {
    id: "laminate_veneer_finish",
    category: "interior_finish_material",
    label: "Laminate / Veneer / Acrylic / PU Finish",
    aliases: ["laminate", "mica", "veneer", "acrylic", "pu paint", "duco", "edge band", "profile shutter"],
    commonUnits: ["sheet", "sqft", "running ft"],
    boqMapping: ["shutter finish", "wardrobe finish", "kitchen finish", "wall panel", "TV unit"],
    qualityGrades: ["standard laminate", "premium laminate", "veneer", "acrylic", "PU/duco"],
    selectionChecks: ["scratch resistance", "gloss level", "edge detail", "maintenance", "colour consistency"],
    riskNotes: ["Glossy finishes show scratches/fingerprints.", "Veneer/PU needs skilled finishing and maintenance."],
  },
  {
    id: "hardware_fittings",
    category: "furniture_material",
    label: "Interior Hardware / Fittings",
    aliases: ["hardware", "hinge", "channel", "tandem", "soft close", "handle", "basket", "accessory"],
    commonUnits: ["piece", "set", "running ft"],
    boqMapping: ["kitchen hardware", "wardrobe hardware", "drawer channels", "hinges", "handles"],
    qualityGrades: ["standard", "soft-close", "premium brand", "heavy-duty"],
    selectionChecks: ["load capacity", "corrosion resistance", "warranty", "serviceability", "shutter weight"],
    riskNotes: ["Cheap hardware fails early and affects furniture usability.", "Wet areas need corrosion-resistant hardware."],
  },
  {
    id: "loose_custom_furniture",
    category: "furniture_material",
    label: "Loose / Custom Furniture",
    aliases: ["furniture", "sofa", "bed", "dining", "chair", "table", "workstation", "reception", "custom furniture"],
    commonUnits: ["piece", "set", "running ft", "sqft"],
    boqMapping: ["loose furniture", "custom furniture", "soft furnishing", "office furniture"],
    qualityGrades: ["economy", "standard", "premium", "luxury"],
    selectionChecks: ["size", "ergonomics", "material", "fabric", "warranty", "repairability"],
    riskNotes: ["Furniture size must match room clearance.", "Custom furniture needs site measurement before fabrication."],
  },
  {
    id: "electrical_material",
    category: "mep_material",
    label: "Electrical Wires / Switches / DB / Lights",
    aliases: ["wire", "wires", "electrical", "switch", "socket", "mcb", "rccb", "db", "light", "lighting", "fan"],
    commonUnits: ["meter", "coil", "piece", "set"],
    boqMapping: ["wiring", "switch board", "DB", "lighting", "fan point", "socket point"],
    qualityGrades: ["standard", "FR", "FRLS", "premium modular switch", "LED fixture"],
    selectionChecks: ["load", "wire size", "circuit", "earthing", "brand", "ISI/standard compliance"],
    riskNotes: ["Electrical sizing and safety devices require qualified electrician/MEP review.", "Cheap switches/wires create safety risk."],
  },
  {
    id: "plumbing_sanitary",
    category: "mep_material",
    label: "Plumbing Pipes / Sanitary / CP Fittings",
    aliases: ["cpvc", "upvc", "ppr", "pipe", "plumbing", "sanitary", "wc", "basin", "faucet", "shower", "cp fitting"],
    commonUnits: ["meter", "piece", "set"],
    boqMapping: ["water supply", "drainage", "sanitary fixture", "CP fittings", "toilet/kitchen plumbing"],
    qualityGrades: ["standard", "premium", "concealed", "heavy-duty"],
    selectionChecks: ["pressure rating", "pipe type", "jointing method", "service access", "warranty"],
    riskNotes: ["Concealed plumbing needs pressure test before covering.", "Wrong slope/jointing causes leakage and rework."],
  },
  {
    id: "doors_windows",
    category: "door_window_material",
    label: "Doors / Windows / Glass / Grill",
    aliases: ["door", "window", "upvc", "aluminium window", "glass", "grill", "flush door", "wpc door", "main door"],
    commonUnits: ["sqft", "piece", "running ft"],
    boqMapping: ["door frame/shutter", "window", "glass", "grill", "hardware"],
    qualityGrades: ["flush door", "laminated door", "WPC", "uPVC", "aluminium", "toughened glass"],
    selectionChecks: ["opening size", "frame material", "hardware", "water exposure", "security", "ventilation"],
    riskNotes: ["Wet-area doors need moisture-safe material.", "Window system affects ventilation, heat, dust and sound."],
  },
  {
    id: "facade_cladding",
    category: "exterior_facade_material",
    label: "Exterior Facade / Cladding / Railing / Gate",
    aliases: ["facade", "elevation material", "cladding", "hpl", "wpc", "railing", "gate", "jaali", "stone cladding"],
    commonUnits: ["sqft", "running ft", "piece"],
    boqMapping: ["front elevation", "cladding", "railing", "gate", "compound wall", "facade lighting"],
    qualityGrades: ["paint texture", "stone", "tile cladding", "HPL", "WPC", "MS/SS/glass railing"],
    selectionChecks: ["weather exposure", "fixing method", "maintenance", "waterproofing", "weight", "cleaning access"],
    riskNotes: ["Heavy facade elements need structural anchorage review.", "Exterior materials must handle rain, dust and heat."],
  },
];

export function buildMaterialTaxonomyEngine(input: {
  inputText: string;
  buildingTypeClassification?: BuildingTypeLike;
}): BuildSetuMaterialTaxonomyResult {
  const text = cleanText(input.inputText).toLowerCase();
  const category = cleanText(input.buildingTypeClassification?.category).toLowerCase();
  const planningMode = cleanText(input.buildingTypeClassification?.planningMode).toLowerCase();

  const detectedIntent = {
    materialSelection: hasAny(text, ["material", "materials", "specification", "finish", "finishes", "selection"]),
    interiorMaterial: hasAny(text, ["interior", "kitchen", "wardrobe", "tv unit", "false ceiling", "laminate", "plywood", "mdf", "hdhmr"]),
    furniture: hasAny(text, ["furniture", "sofa", "bed", "dining", "chair", "table", "workstation", "reception"]),
    civilMaterial: hasAny(text, ["cement", "steel", "sand", "aggregate", "brick", "aac", "concrete", "rcc"]),
    finishing: hasAny(text, ["tile", "tiles", "granite", "marble", "paint", "putty", "texture", "flooring"]),
    mep: hasAny(text, ["electrical", "wire", "switch", "socket", "plumbing", "cpvc", "upvc", "sanitary", "light", "mcb"]),
    boqEstimate: hasAny(text, ["boq", "estimate", "quantity", "costing", "rate analysis"]),
    marketPrice: hasAny(text, ["price", "pricing", "rate", "market", "vendor", "quote", "current"]),
    webSearch: hasAny(text, ["web search", "web-search", "online", "latest", "current market", "search"]),
  };

  const materialItems = MATERIAL_LIBRARY.map((base) => {
    const autoDetect =
      detectByAliases(text, base.aliases) ||
      (detectedIntent.interiorMaterial && ["interior_board_material", "interior_finish_material", "furniture_material"].includes(base.category)) ||
      (detectedIntent.civilMaterial && ["civil_material", "structural_material"].includes(base.category)) ||
      (detectedIntent.finishing && base.category === "finishing_material") ||
      (detectedIntent.mep && base.category === "mep_material") ||
      (category.includes("interior") && ["interior_board_material", "interior_finish_material", "furniture_material"].includes(base.category)) ||
      (planningMode.includes("room_interior") && ["interior_board_material", "interior_finish_material", "furniture_material"].includes(base.category));

    return item({ ...base, detected: autoDetect });
  });

  const detectedCategories = Array.from(new Set(materialItems.filter((m) => m.detected).map((m) => m.category)));

  const missingInputs: string[] = [];
  if (detectedIntent.marketPrice && !/raipur|delhi|mumbai|pune|bangalore|bengaluru|hyderabad|chennai|kolkata|lucknow|indore|bhopal|nagpur|surat|ahmedabad/i.test(text)) {
    missingInputs.push("City/location missing for market-rate comparison.");
  }
  if (detectedIntent.marketPrice && !/economy|standard|premium|luxury|budget/i.test(text)) {
    missingInputs.push("Budget/quality grade missing for price comparison.");
  }
  if (detectedIntent.interiorMaterial && !/kitchen|wardrobe|bedroom|living|toilet|office|shop|room/i.test(text)) {
    missingInputs.push("Room/use area missing for interior material selection.");
  }

  return {
    engineVersion: "M1-1",
    scope: "material_taxonomy_only_no_pricing",
    detectedIntent,
    detectedCategories,
    materialItems,
    recommendedSourceLayers: [
      "curated_material_taxonomy",
      "official_SOR_DSR_reference_for_base_rates",
      "local_vendor_quote_for_procurement",
      "public_web_search_for_fresh_market_signal",
      "brand_product_catalog_for_SKU_level_options",
    ],
    dataIsolationPolicy: [
      "Material taxonomy is separate from BOQ pricing.",
      "Market price search is separate from official SOR/DSR base rates.",
      "Vendor quote is separate from online product listing.",
      "No price should be treated as final without source date, city, unit and tax/labour/transport scope.",
    ],
    missingInputs,
    nextActions: [
      "Confirm city/location for material availability and price layer.",
      "Confirm quality grade: economy, standard, premium or luxury.",
      "Confirm room/category: civil, finishing, interior, furniture, MEP or facade.",
      "Use M-4/M-5 pricing/web-search layer before showing current market rates.",
      "Map selected material to BOQ item only after quantity basis is known.",
    ],
    safetyBoundary: [
      "M1 does not generate final market prices.",
      "Material recommendations are planning guidance until client/designer/engineer approval.",
      "Electrical, structural, fire and plumbing safety-critical materials require professional verification.",
    ],
  };
}

export function buildMaterialTaxonomyPromptBlock(result: BuildSetuMaterialTaxonomyResult): string {
  const lines: string[] = [];

  lines.push("MATERIAL TAXONOMY INTELLIGENCE:");
  lines.push(`- Version: ${result.engineVersion}`);
  lines.push(`- Scope: ${result.scope}`);
  lines.push(`- Detected categories: ${result.detectedCategories.length ? result.detectedCategories.join(", ") : "none"}`);
  lines.push(`- Market price requested: ${result.detectedIntent.marketPrice ? "yes" : "no"}`);
  lines.push(`- Web search requested: ${result.detectedIntent.webSearch ? "yes" : "no"}`);

  const detected = result.materialItems.filter((item) => item.detected).slice(0, 12);
  if (detected.length) {
    lines.push("- Detected material items:");
    detected.forEach((item) => {
      lines.push(`  - ${item.label} (${item.category}) | Units: ${item.commonUnits.join(", ")}`);
    });
  }

  if (result.missingInputs.length) {
    lines.push("- Missing inputs:");
    result.missingInputs.forEach((item) => lines.push(`  - ${item}`));
  }

  lines.push("- Data isolation policy:");
  result.dataIsolationPolicy.forEach((item) => lines.push(`  - ${item}`));

  return lines.join("\n");
}
