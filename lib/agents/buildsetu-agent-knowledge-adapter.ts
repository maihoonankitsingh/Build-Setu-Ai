import { getBuildSetuTrainingBlock } from "@/lib/agents/buildsetu-agent-training";
type KnowledgeAdapterInput = {
  message: string;
  action?: string;
  outputMode?: string;
  readyToGenerate?: boolean;
  baseImagePrompt?: string;
  baseResponseText?: string;
};

type Intent =
  | "floor_plan"
  | "interior"
  | "exterior"
  | "electrical"
  | "plumbing"
  | "structure"
  | "vastu"
  | "boq"
  | "bbs"
  | "full_project"
  | "mixed";

function hasAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

function detectIntent(message: string): Intent {
  const t = message.toLowerCase();

  const asksFull =
    hasAny(t, ["full planning", "pura planning", "complete planning", "ghar banane ke sabhi task", "all work", "sabhi work", "end to end", "turnkey"]) ||
    (hasAny(t, ["architecture", "structure"]) && hasAny(t, ["electrical", "plumbing"]) && hasAny(t, ["boq", "execution", "vastu"]));

  if (asksFull) return "full_project";

  // Discipline-specific intents first. Generic plan/planning word should not hijack these.
  if (hasAny(t, ["electrical", "wiring", "switch", "db", "mcb", "lighting point", "power point", "socket", "earthing"])) return "electrical";
  if (hasAny(t, ["plumbing", "pipe", "water line", "drainage", "sewer", "toilet line", "shaft", "tank", "pump"])) return "plumbing";
  if (hasAny(t, ["structure", "rcc", "column", "beam", "slab", "footing", "foundation", "is code", "ies code"])) return "structure";
  if (hasAny(t, ["boq", "estimate", "costing", "material quantity", "rate analysis"])) return "boq";
  if (hasAny(t, ["bbs", "bar bending", "steel quantity", "rebar"])) return "bbs";
  if (hasAny(t, ["vastu", "vaastu"])) return "vastu";

  if (hasAny(t, ["interior", "room design", "bedroom design", "living design", "kitchen interior", "false ceiling", "wardrobe"])) return "interior";
  if (hasAny(t, ["exterior", "elevation", "facade", "front design", "front elevation"])) return "exterior";

  // Floor plan only for real floor-plan/naksha/layout phrases.
  if (hasAny(t, ["naksha", "floor plan", "floorplan", "house layout", "home layout", "ghar ka plan", "villa plan", "building layout"])) return "floor_plan";

  return "mixed";
}

function detectCountry(message: string) {
  const t = message.toLowerCase();

  const checks: Array<{ country: string; words: string[]; unit: string; note: string }> = [
    { country: "India", words: ["india", "bharat", "indian", "delhi", "mumbai", "lucknow", "raipur", "up ", "uttar pradesh"], unit: "feet for client planning, mm/m for drawings", note: "Use NBC/BIS/local municipal bylaw context only as concept reference; city/state approval rules vary." },
    { country: "USA", words: ["usa", "united states", "america", "california", "texas", "florida", "new york"], unit: "feet/inches", note: "Use ICC I-Codes/IBC/IRC/NFPA/ADA as jurisdiction-dependent references; state/city amendments matter." },
    { country: "UK", words: ["uk", "united kingdom", "england", "london", "scotland", "wales"], unit: "metric", note: "Use UK Building Regulations/Approved Documents/local planning authority context." },
    { country: "European Union", words: ["europe", "eu", "germany", "france", "italy", "spain", "netherlands", "sweden", "poland"], unit: "metric", note: "Use Eurocodes for structural context plus national annex/local rules." },
    { country: "UAE", words: ["uae", "dubai", "abu dhabi", "sharjah"], unit: "metric", note: "Use emirate municipality/civil defence/authority approval context." },
    { country: "Saudi Arabia", words: ["saudi", "ksa", "riyadh", "jeddah"], unit: "metric", note: "Use Saudi/local municipality/civil defence context." },
    { country: "Singapore", words: ["singapore", "sg"], unit: "metric", note: "Use BCA/SCDF/URA/PUB authority context as applicable." },
    { country: "Australia", words: ["australia", "sydney", "melbourne", "queensland", "victoria", "nsw"], unit: "metric", note: "Use NCC/BCA/state/local council context." },
    { country: "Canada", words: ["canada", "toronto", "vancouver", "ontario", "alberta"], unit: "metric, with imperial often used by clients", note: "Use province/municipal code context." },
    { country: "Qatar", words: ["qatar", "doha"], unit: "metric", note: "Use municipality/civil defence/Kahramaa utility coordination context." },
    { country: "Oman", words: ["oman", "muscat"], unit: "metric", note: "Use municipality/civil defence/utility authority context." },
    { country: "Kuwait", words: ["kuwait"], unit: "metric", note: "Use municipality/fire/utility authority context." },
    { country: "Bahrain", words: ["bahrain", "manama"], unit: "metric", note: "Use municipality/civil defence/utility authority context." },
    { country: "Nepal", words: ["nepal", "kathmandu"], unit: "feet and metric mixed", note: "Use local municipality and seismic safety review context." },
    { country: "Bangladesh", words: ["bangladesh", "dhaka", "chittagong"], unit: "feet and metric mixed", note: "Use BNBC/local authority/fire service context." },
    { country: "South Africa", words: ["south africa", "johannesburg", "cape town", "durban"], unit: "metric", note: "Use National Building Regulations/SANS/local municipality context." }
  ];

  for (const item of checks) {
    if (hasAny(t, item.words)) return item;
  }

  return {
    country: "Unknown / Worldwide",
    unit: "ask country/city for code-sensitive work",
    note: "Use concept-level global best practice only. Ask country, city/local authority before code/legal compliance claims."
  };
}


function detectStateJurisdiction(message: string) {
  const t = String(message || "").toLowerCase();

  const groups: Array<{
    level: string;
    name: string;
    words: string[];
    note: string;
  }> = [
    { level: "state", name: "Uttar Pradesh", words: ["uttar pradesh", " up ", "lucknow", "noida", "ghaziabad", "kanpur", "varanasi", "prayagraj"], note: "Check local development authority/municipal bylaws for setbacks, FAR/FSI, height, parking and approvals." },
    { level: "state/capital territory", name: "Delhi NCR", words: ["delhi", "new delhi", "ncr"], note: "Exact authority/location matters; fire, parking, height and use rules must be checked locally." },
    { level: "state", name: "Maharashtra", words: ["maharashtra", "mumbai", "pune", "nagpur", "thane", "nashik"], note: "Municipal/development control rules vary by city; check exact local authority." },
    { level: "state", name: "Chhattisgarh", words: ["chhattisgarh", "raipur", "bhilai", "bilaspur"], note: "Check local municipal/development authority rules." },
    { level: "state", name: "Madhya Pradesh", words: ["madhya pradesh", " mp ", "bhopal", "indore", "jabalpur", "gwalior"], note: "Check local municipal/development authority rules." },
    { level: "state", name: "Karnataka", words: ["karnataka", "bengaluru", "bangalore", "mysore", "mangaluru"], note: "City authority and layout approval context matter." },
    { level: "state", name: "Tamil Nadu", words: ["tamil nadu", "chennai", "coimbatore", "madurai"], note: "State/city planning permissions and local body rules must be checked." },
    { level: "state", name: "Telangana", words: ["telangana", "hyderabad"], note: "City/local authority and layout context matter." },
    { level: "state", name: "Gujarat", words: ["gujarat", "ahmedabad", "surat", "vadodara", "rajkot"], note: "City development authority/local GDCR context should be checked." },
    { level: "state", name: "Rajasthan", words: ["rajasthan", "jaipur", "jodhpur", "udaipur", "kota"], note: "Local urban development/municipality rules vary by city." },
    { level: "state", name: "West Bengal", words: ["west bengal", "kolkata", "howrah"], note: "Municipal building rules and fire requirements vary by use/height." },
    { level: "state", name: "Kerala", words: ["kerala", "kochi", "ernakulam", "trivandrum", "thiruvananthapuram", "kozhikode"], note: "Local panchayat/municipal/corporation rules and rain/drainage context matter." },

    { level: "emirate", name: "Dubai", words: ["dubai"], note: "Dubai Municipality/free-zone/master developer and Civil Defence context may apply." },
    { level: "emirate", name: "Abu Dhabi", words: ["abu dhabi"], note: "Municipality/authority and Civil Defence requirements must be checked." },
    { level: "emirate", name: "Sharjah", words: ["sharjah"], note: "Municipality and Civil Defence requirements must be checked." },
    { level: "emirate", name: "Ajman", words: ["ajman"], note: "Municipality and Civil Defence requirements must be checked." },

    { level: "state", name: "California", words: ["california", " ca ", "los angeles", "san francisco", "san diego", "sacramento"], note: "State/city amendments, seismic, wildfire, energy and accessibility rules may matter." },
    { level: "state", name: "Texas", words: ["texas", " tx ", "houston", "dallas", "austin", "san antonio"], note: "City/county adopted code and amendments matter." },
    { level: "state", name: "Florida", words: ["florida", " fl ", "miami", "orlando", "tampa"], note: "Wind, flood, hurricane and local permit rules may matter." },
    { level: "state", name: "New York", words: ["new york", " ny ", "nyc", "brooklyn", "manhattan"], note: "City-specific rules can be strict; fire/egress/accessibility checks matter." },

    { level: "province", name: "Ontario", words: ["ontario", "toronto", "ottawa"], note: "Provincial code and municipal permit office matter." },
    { level: "province", name: "British Columbia", words: ["british columbia", " bc ", "vancouver", "victoria"], note: "Province, city, seismic, energy and local permit context may matter." },
    { level: "province", name: "Alberta", words: ["alberta", "calgary", "edmonton"], note: "Province and municipality requirements must be checked." },

    { level: "state", name: "New South Wales", words: ["new south wales", " nsw ", "sydney"], note: "State planning/council rules and NCC context matter." },
    { level: "state", name: "Victoria", words: ["victoria", " vic ", "melbourne"], note: "State planning/council rules and NCC context matter." },
    { level: "state", name: "Queensland", words: ["queensland", " qld ", "brisbane", "gold coast"], note: "Cyclone/flood/climate zones may matter by location." }
  ];

  const padded = ` ${t} `;
  for (const item of groups) {
    if (item.words.some((w) => padded.includes(String(w).toLowerCase()))) {
      return item;
    }
  }

  return {
    level: "state/province/emirate/city",
    name: "Not specified",
    words: [],
    note: "Ask state/province/emirate/city/local authority before code-sensitive approval, structure, MEP, fire, FAR/FSI, setback, height or parking claims."
  };
}


function extractKnownDimensions(message: string) {
  const matches = message.match(/\b\d{1,3}\s*(?:x|×|\*)\s*\d{1,3}\b/gi) || [];
  return matches.map((m) => m.replace(/\s+/g, ""));
}


function detectCodeReferenceFamily(message: string) {
  const t = String(message || "").toLowerCase();
  const country = detectCountry(message);
  const state = detectStateJurisdiction(message);

  const isCodeSensitive =
    /(code|is code|ies code|i\.s\.|ibc|irc|eurocode|nbc|nfpa|nec|approval|permit|sanction|setback|far|fsi|height|fire|structure|electrical|plumbing|mep|accessibility|compliance)/i.test(t);

  const base = [
    "Code-reference mode: reference only, not certified compliance.",
    "Do not copy full code text or claim approval-ready compliance.",
    "Use latest official authority/code source and licensed professional verification before execution."
  ];

  if (country.country === "India") {
    return [
      ...base,
      `India code family: BIS Indian Standards / IS codes, NBC context, state/city municipal or development-authority bylaws.`,
      `State/local layer: ${state.name} (${state.level}). ${state.note}`,
      "Common India references to verify by scope: IS 456 RCC, IS 875 loads, IS 1893 seismic, IS 13920 ductile detailing, IS 800 steel, IS 1905 masonry, IS 1786 reinforcement steel, IS 732 electrical wiring, National Electrical Code/SP 30, NBC fire/life-safety, local fire NOC, local water/sewer authority.",
      "For FAR/FSI, setback, height, parking and approval: exact city/local authority is mandatory."
    ];
  }

  if (country.country === "USA") {
    return [
      ...base,
      `USA code family: ICC I-Codes where adopted, IBC/IRC/IEBC/IPC/IMC/IFC/IECC, NFPA 70/NEC, NFPA fire references, ASCE 7, ACI/AISC/wood/masonry standards as applicable.`,
      `State/local layer: ${state.name} (${state.level}). ${state.note}`,
      "Adopted edition and local amendments vary by state/county/city."
    ];
  }

  if (country.country === "UK") {
    return [
      ...base,
      "UK code family: Building Regulations, Approved Documents, British Standards/BS EN, Eurocodes where applicable, local planning authority and building control.",
      `Local layer: ${state.name} (${state.level}). ${state.note}`
    ];
  }

  if (country.country === "European Union") {
    return [
      ...base,
      "EU code family: Eurocodes EN 1990-1999 for structural/geotechnical context, national annexes, country/local building regulations, fire/accessibility/energy rules.",
      "Exact country and city/local authority are mandatory for compliance-sensitive claims."
    ];
  }

  if (country.country === "UAE") {
    return [
      ...base,
      "UAE code family: emirate municipality/building regulation context, Civil Defence/fire safety, utility authority, free-zone/master developer rules where applicable.",
      `Emirate/local layer: ${state.name} (${state.level}). ${state.note}`
    ];
  }

  if (country.country === "Canada") {
    return [
      ...base,
      "Canada code family: National Building Code model context, provincial/territorial building codes, municipal permits, fire/accessibility/energy rules.",
      `Province/local layer: ${state.name} (${state.level}). ${state.note}`
    ];
  }

  if (country.country === "Australia") {
    return [
      ...base,
      "Australia code family: NCC/BCA context, Australian Standards, state/territory planning, local council, hazard overlays.",
      `State/council layer: ${state.name} (${state.level}). ${state.note}`
    ];
  }

  if (country.country === "Saudi Arabia") {
    return [
      ...base,
      "Saudi Arabia code family: Saudi Building Code context, municipality requirements, Civil Defence/fire safety, utility approvals."
    ];
  }

  if (country.country === "Singapore") {
    return [
      ...base,
      "Singapore code family: BCA/building control, SCDF fire safety, URA planning, PUB drainage/utility context as applicable."
    ];
  }

  if (isCodeSensitive) {
    return [
      ...base,
      "Location missing or not fully detected: ask country, state/province/emirate, city/local authority, occupancy/use, height/floors and project stage before code-sensitive output."
    ];
  }

  return [];
}


function scopeGuard(intent: Intent) {
  const map: Record<Intent, string[]> = {
    floor_plan: [
      "Scope lock: answer floor plan/naksha only.",
      "Include plot, rooms, dimensions, zoning, circulation, doors/windows, parking/stair, ventilation, vastu only if asked.",
      "Do not include detailed BOQ, BBS, final structural design, final electrical load calculation, or final plumbing sizing unless user asks."
    ],
    interior: [
      "Scope lock: answer interior only.",
      "Include room size, furniture, storage, lighting, ceiling, materials, colors and render camera angle.",
      "Do not switch to exterior/floor-plan/BOQ unless user asks."
    ],
    exterior: [
      "Scope lock: answer exterior/elevation only.",
      "Include facade, floor count, openings, balcony, gate, material, lighting and structural feasibility warnings.",
      "Do not switch to interior/BOQ unless user asks."
    ],
    electrical: [
      "Scope lock: answer electrical concept only.",
      "Include DB, switch/power/light points, AC/geyser/kitchen points, earthing, backup and ELV if asked.",
      "Do not provide final cable/MCB/load certification."
    ],
    plumbing: [
      "Scope lock: answer plumbing concept only.",
      "Include wet walls, shafts, water supply, soil/waste, vent, rainwater, tank/pump logic.",
      "Do not provide final pipe sizing/hydraulic certification."
    ],
    structure: [
      "Scope lock: answer structural coordination only.",
      "Include structural system concept, column grid logic, spans, soil/foundation warning and engineer review.",
      "Do not invent final RCC member sizes, reinforcement, or certified calculations."
    ],
    vastu: [
      "Scope lock: answer vastu planning only.",
      "Include zones, conflicts and practical compromises.",
      "Do not break functionality/safety/ventilation/structure to force vastu."
    ],
    boq: [
      "Scope lock: answer BOQ/estimate only.",
      "Include scope, assumptions, trade grouping, missing drawings and rate basis.",
      "Do not present final tender quantity without complete drawings."
    ],
    bbs: [
      "Scope lock: answer BBS only.",
      "Ask for structural drawings, member sizes, bar marks, dia, spacing, hooks/laps/cut lengths.",
      "Do not invent reinforcement details."
    ],
    full_project: [
      "Scope lock: full project planning requested.",
      "Include brief, site, architecture, structure, MEP, vastu, approval checklist, BOQ/BBS, execution, handover.",
      "Keep final compliance and construction-critical outputs marked for professional verification."
    ],
    mixed: [
      "Scope lock: infer the nearest requested task.",
      "If unclear, ask one targeted clarification instead of dumping all disciplines.",
      "Keep answer limited to what user asked."
    ]
  };

  return map[intent];
}

function buildDisciplineBlock(intent: Intent, message: string) {
  const dims = extractKnownDimensions(message);
  const country = detectCountry(message);
  const stateJurisdiction = detectStateJurisdiction(message);
  const dimensionLine = dims.length
    ? `Known dimension input: ${dims.join(", ")}. Use region-appropriate units.`
    : "If exact dimensions are missing, create clear assumptions and mark them.";

  const common = [
    "BuildSetu AEC knowledge requirements:",
    `Country/Jurisdiction: ${country.country}.`,
    `State/Province/Emirate/City Jurisdiction: ${stateJurisdiction.name} (${stateJurisdiction.level}).`,
    `Local authority policy: ${stateJurisdiction.note}`,
    `Unit policy: ${country.unit}.`,
    `Code policy: ${country.note}`,
    dimensionLine,
    ...scopeGuard(intent),
    "Classify building type before planning.",
    "Create planning first, then image/render prompt.",
    ...detectCodeReferenceFamily(message),
    "Do not certify final structural design, MEP sizing, fire compliance, accessibility compliance, or statutory approval."
  ];

  if (intent === "floor_plan") {
    return [
      ...common,
      "Output type: top-view 2D architectural floor plan only.",
      "Must include: walls, doors, windows, readable room labels, dimensions, north arrow, main entry, parking if requested, staircase/lift if requested, toilets, kitchen, shafts/wet walls where possible.",
      "Planning checks: public/private/service zoning, compact circulation, room adjacency, daylight/ventilation, toilet-kitchen plumbing grouping, vastu conflict handling.",
      "Dimension awareness: living 10x12 to 14x18 ft, bedroom 10x10 to 12x14 ft, master bedroom 10x12 to 14x16 ft, kitchen 7x8 to 10x12 ft, toilet 4x7 to 6x9 ft, car parking 8x14 to 10x18 ft, staircase 6x10 to 8x14 ft concept range.",
      "Avoid: 3D view, perspective render, fantasy plan, unreadable labels, missing requested rooms, distorted walls, random furniture showroom."
    ];
  }

  if (intent === "interior") {
    return [
      ...common,
      "Interior planning must include: room size, furniture layout, storage, lighting, false ceiling if relevant, material palette, color palette, electrical points, AC/ventilation, camera angle.",
      "Avoid impossible furniture scale, blocked windows, blocked doors, and over-clutter."
    ];
  }

  if (intent === "exterior") {
    return [
      ...common,
      "Exterior/elevation planning must include: front width, number of floors, facade style, balcony/window rhythm, gate/compound wall, parking entry, material palette, lighting.",
      "Coordinate facade with structure, openings, rainwater drainage, AC outdoor units, and privacy.",
      "Avoid impossible cantilevers and random window placement."
    ];
  }

  if (intent === "electrical") {
    return [
      ...common,
      "Electrical concept must include: DB location, switchboard zones, lighting points, fan points, AC/geyser/fridge/washing machine points, kitchen load points, inverter/UPS, earthing, CCTV/data if needed.",
      "Keep electrical panel away from wet areas.",
      "Final load calculation, wire size, MCB rating, and earthing design require electrician/electrical engineer verification."
    ];
  }

  if (intent === "plumbing") {
    return [
      ...common,
      "Plumbing concept must include: toilet/kitchen wet-wall grouping, shaft, water supply, hot water if needed, soil/waste line, vent pipe, rainwater drainage, tank/pump logic.",
      "Closed toilets need shaft/exhaust route.",
      "Final pipe sizing, slopes, pressure, STP/septic and waterproofing details need professional verification."
    ];
  }

  if (intent === "structure") {
    return [
      ...common,
      "Structure concept must include: likely RCC/steel/load-bearing system, column grid logic, stair/lift core coordination, span warnings, foundation/soil-test requirement.",
      "Do not invent final beam/column/rebar/foundation sizes.",
      "All structural output is concept only and must be verified by licensed structural engineer."
    ];
  }

  if (intent === "vastu") {
    return [
      ...common,
      "Vastu preference: northeast for pooja/open/light zone, southeast for kitchen, southwest for master bedroom, northwest/west/southeast for toilets where practical, south/west/southwest for stair where practical.",
      "Functionality, safety, light, ventilation, structure, and plumbing have higher priority than forced vastu.",
      "Strict vastu needs north direction, road side, and plot dimensions."
    ];
  }

  if (intent === "boq") {
    return [
      ...common,
      "BOQ concept must include: scope, assumptions, area basis, material grade/specification, trade-wise grouping, missing drawing warnings.",
      "Do not present final tender quantity without complete drawings."
    ];
  }

  if (intent === "bbs") {
    return [
      ...common,
      "BBS requires structural drawings, member sizes, bar marks, dia, spacing, hooks, laps, cut lengths.",
      "Do not invent reinforcement details without structural drawings."
    ];
  }

  if (intent === "full_project") {
    return [
      ...common,
      "Full project workflow: client brief, site study, architecture/naksha, structure coordination, MEP coordination, vastu, approval checklist, BOQ/BBS, execution sequence, finishing, testing, handover.",
      "Keep each discipline separated and do not mix final engineering/design certification into concept output."
    ];
  }

  return [
    ...common,
    "If unclear, ask one targeted clarification. Do not answer unrelated disciplines."
  ];
}












function buildModelStyleTrainingControllerBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const t = clean.toLowerCase();

  const asksModelStyle =
    /(chatgpt model|model style|reasoning model|thinking model|agent brain|agent ko train|data se train|trained data|training data|fine tune|finetune|rag|knowledge base|orchestrator|planner|executor|verifier|tool router|quality evaluator|feedback loop|model runtime|agent architecture)/i.test(t);

  if (!asksModelStyle) return "";

  return [
    "BuildSetu ChatGPT-style Model Runtime + Data Training Controller:",
    "This agent should behave like a structured expert model, not a random chatbot. It uses curated knowledge, training cases, reasoning controller, tool routing, quality evaluator, trusted source policy and feedback loop.",
    "Runtime flow: user request -> intent classifier -> planner -> scope lock -> jurisdiction/stage detection -> knowledge retriever -> tool router -> domain expert module -> quality evaluator -> final answer/action.",
    "Core modules: architecture/floor plan, interior, exterior, structure, electrical, plumbing, HVAC/fire, BOQ, BBS, construction sequence, materials, rules, working drawings and research update.",
    "Data training sources: knowledge JSON, training cases, mustInclude/mustAvoid checks, project examples, research drafts, approved source summaries, user feedback and future JSONL fine-tune examples.",
    "Training pipeline: collect data -> classify by module/risk -> normalize to knowledge JSON -> create training cases -> add evaluator checks -> run smoke tests -> patch failures -> version -> deploy -> collect feedback.",
    "RAG-style behavior: for every request, retrieve only relevant knowledge blocks and training cases instead of dumping all knowledge.",
    "Planner/Executor/Verifier pattern: Planner decides task path; Executor produces answer/prompt/document/draft; Verifier checks scope, safety, module, output mode and missing info.",
    "High-risk policy: approvals, bylaws, structure, MEP, fire, legal/code and cost updates require trusted sources, review and professional/local authority boundary.",
    "Future fine-tune path: export reviewed safe examples to JSONL with system/user/assistant/metadata/module/riskLevel/checks. Do not fine-tune on unreviewed or unsafe data.",
    "Feedback loop: every bad answer, route failure, missing knowledge or failed smoke test becomes a new training case or evaluator rule."
  ].join("\\n");
}


function buildTrustedSourceResearchPipelineBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const t = clean.toLowerCase();

  const asksTrustedSourcePipeline =
    /(trusted source|source registry|official source|research draft|draft update|knowledge update|permanent knowledge|merge knowledge|review required|source metadata|internet se data|online data|latest data|current data|self update|auto update|update pipeline)/i.test(t);

  const asksInternetHighRisk =
    /(latest|current|official|internet|online|source).*(approval|bylaw|rule|far|fsi|setback|code|standard|fire|civil defence|material rate|cost|datasheet|climate|hazard|seismic|flood|cyclone)/i.test(t);

  if (!asksTrustedSourcePipeline && !asksInternetHighRisk) return "";

  return [
    "BuildSetu Trusted Source Registry + Research Draft Pipeline:",
    "Before fetching internet data, classify the request category, jurisdiction, freshness need, source type and risk level.",
    "Trusted source priority: official government/municipal/development authority/civil defence/standards body/utility authority for rules and compliance; manufacturer datasheet for product specs; vendor/market sources only for price context; design portfolios/catalogs only for inspiration.",
    "Rejected or low-confidence sources: random blogs, social media, forums, SEO listicles, unverified PDFs and copied notes for compliance-sensitive answers.",
    "High-risk data includes approval/bylaws, codes/standards, fire, structure, MEP, legal compliance, climate/hazard and cost rates. These must become pending-review drafts before permanent knowledge updates.",
    "Research draft must store: source title, URL, source type, publisher/authority, country, state/province/emirate, city/local authority, date accessed, effective date/version if available, extracted checklist, cautions, risk level, confidence and blocked claims.",
    "Allowed extraction: summary, checklist, required drawings/documents, process steps, cautions and professional verification boundary.",
    "Blocked extraction: full copyrighted code text, final legal compliance, final structural/MEP design, guaranteed cost, guaranteed waterproofing or authority approval claim.",
    "Permanent knowledge merge rule: only approved drafts can update data/buildsetu-knowledge JSON; update must include backup, version bump, source metadata and smoke tests.",
    "Execution rule: for live/current data, answer with source-based summary or create draft; do not silently self-update high-risk knowledge."
  ].join("\\n");
}


function buildInternetKnowledgeUpdateRouterBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const t = clean.toLowerCase();

  const asksLiveOrInternet =
    /(internet|online|latest|current|recent|update|updated|new rule|notification|gazette|source|official source|verify online|search|web|rate today|market rate|current price|latest bylaw|latest code|2026|2027)/i.test(t);

  const asksSourceSensitive =
    /(approval|sanction|permit|far|fsi|setback|municipality|authority|civil defence|fire noc|building code|is code|nbc|ibc|irc|nfpa|nec|eurocode|ncc|material rate|construction cost|product datasheet|climate|seismic|flood|cyclone|coastal)/i.test(t);

  if (!asksLiveOrInternet && !asksSourceSensitive) return "";

  const category =
    /(approval|sanction|permit|far|fsi|setback|municipality|development authority|civil defence|fire noc|occupancy certificate)/i.test(t) ? "authorityApprovalBylaws" :
    /(building code|is code|nbc|ibc|irc|nfpa|nec|eurocode|ncc|bca|structural code|electrical code|plumbing code)/i.test(t) ? "codeStandardsReference" :
    /(rate|price|cost|cement price|steel rate|labour rate|boq rate|market rate)/i.test(t) ? "materialRatesCost" :
    /(datasheet|product spec|manufacturer|waterproofing material|paint spec|pipe spec|wire spec|board spec)/i.test(t) ? "productMaterialSpecs" :
    /(climate|flood|seismic|earthquake|cyclone|wind|coastal|rainfall|snow load)/i.test(t) ? "climateHazardSiteContext" :
    /(method statement|construction process|qa\/qc|curing|plaster method|tile laying|false ceiling method)/i.test(t) ? "constructionMethodsBestPractice" :
    /(interior design|facade trend|design inspiration|reference image|catalog style)/i.test(t) ? "designReferenceTrend" :
    /(latest|recent|notification|gazette|new bylaw|new rule)/i.test(t) ? "regulatoryNewsUpdates" :
    "generalAecResearch";

  return [
    "BuildSetu Internet Knowledge Update Router:",
    `Detected internet/update data category: ${category}.`,
    "Internet use rule: do not browse randomly. Fetch only data matching the detected category and jurisdiction.",
    "Required metadata for any fetched source: source title, URL, source type, country/state/city/authority, date accessed, effective date if available, risk level, confidence and allowed use.",
    "Trusted-source priority: official government/municipal/development authority/civil defence/standards body/manufacturer datasheet first; vendor/market sources only for price/spec context; blogs/social media are low-confidence or rejected for compliance.",
    "High-risk categories: authority approvals, bylaws, codes/standards, structure, MEP, fire, legal compliance, climate/hazard and cost rates. These require review before permanent knowledge update.",
    "Allowed extraction: checklist, source summary, version/date, authority name, required drawings, cautions, assumptions and verification boundary.",
    "Blocked extraction: full copyrighted code text, final legal compliance, final structural/MEP design, guaranteed cost or approval claim.",
    "Execution rule: use fetched data for answer/reference/draft update only. Permanent knowledge merge must pass review and smoke tests."
  ].join("\\n");
}


function buildConstructionMaterialMethodsKnowledgeBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const t = clean.toLowerCase();

  const asksConstructionMaterial =
    /(construction method|construction sequence|rcc|load bearing|load-bearing|steel structure|prefab|modular|masonry|brickwork|blockwork|aac|cement|sand|aggregate|tmt|steel|concrete|waterproofing|plaster|flooring|tiles|marble|granite|paint|false ceiling|gypsum|plywood|mdf|hdhmr|laminate|veneer|hpl|facade material|mep material|electrical material|plumbing material|material selection|kaunsa material|best material|quality check|qa\/qc|curing|shuttering|formwork)/i.test(t);

  if (!asksConstructionMaterial) return "";

  return [
    "BuildSetu Construction Methods + Materials Intelligence:",
    "Construction guidance must separate method, materials, quality checks, common risks and professional verification boundary.",
    "RCC frame method: setting out, excavation, PCC, footing reinforcement/formwork/concrete, columns, plinth beam, slab/beam shuttering, reinforcement, concreting, vibration, curing and de-shuttering.",
    "RCC materials: cement, sand, aggregate, water, admixture where required, TMT steel, binding wire, cover blocks and shuttering/formwork. Final concrete grade/rebar/member size requires structural design.",
    "Masonry/blockwork: red brick, fly ash brick, AAC block, concrete block, mortar/adhesive, lintels and bands. Check alignment, bonding, plumb, joint thickness and MEP chasing limits.",
    "Waterproofing: surface preparation, slope correction, corner/pipe penetration treatment, primer/coating/membrane, protection screed and pond/leak test. Materials can include cementitious/polymer coating, PU coating, APP/SBS membrane, liquid membrane, crystalline systems and sealants.",
    "Flooring: vitrified/ceramic/anti-skid tiles, marble, granite, wooden laminate, vinyl and epoxy depending area, traffic, water exposure, maintenance and budget. Check level, slope, hollow sound, joints and grout.",
    "Paint/wall finish: putty, primer, interior emulsion, exterior weatherproof paint, texture, wallpaper, veneer/fluted/stone panels. Moisture treatment and surface dryness are critical.",
    "False ceiling: gypsum/POP/calcium silicate board with metal frame; coordinate ceiling height, hanger spacing, lights, AC, sprinklers, access panels and moisture zones.",
    "Interior materials: plywood, BWP/BWR plywood, MDF, HDHMR, particle board, blockboard, laminate, veneer, PU, acrylic, HPL, glass and hardware. Wet/kitchen areas need moisture-suitable boards and good edge banding.",
    "Exterior/facade materials: exterior paint, texture, stone cladding, tile, exterior HPL, metal fins, glass/MS/SS railing and aluminium windows. Heavy cladding, balcony and facade projections need fixing/structural verification.",
    "Electrical materials: FR/FRLS wires, conduits, DB, MCB/RCCB/RCBO, switches, earthing materials and trays where applicable. Final wire size/load/MCB requires electrical professional verification.",
    "Plumbing materials: CPVC/UPVC/PPR/PEX as locally suitable, SWR/PVC, HDPE where applicable, valves, traps, drains, tanks and pumps. Check pressure rating, slope, venting, leak/pressure testing and shaft access.",
    "Climate logic: hot-dry needs shading/light colors; hot-humid needs ventilation/anti-fungal/moisture-resistant materials; heavy-rain needs waterproofing/slope/drip details; coastal needs corrosion-resistant hardware/coatings; cold needs insulation/condensation control.",
    "Selection logic: choose material by use area, budget, durability, climate, maintenance, availability, execution skill and lifecycle cost.",
    "Verification boundary: final structural, MEP, waterproofing, fire and legal/code-sensitive specifications require licensed professionals, manufacturer details and local authority/standard verification."
  ].join("\\n");
}


function buildFullBuildingLifecycleKnowledgeBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const t = clean.toLowerCase();

  const asksLifecycle =
    /(complete building|building banane|ghar banane|construction process|construction sequence|site execution|execution process|project lifecycle|full project|turnkey|architecture structure mep interior exterior|sabhi task|all work|end to end|handover|as-built|maintenance|procurement|quality check|qa\/qc|contractor|site supervision)/i.test(t);

  const asksDisciplineIntegration =
    /(architecture|structure|mep|electrical|plumbing|hvac|fire|interior|exterior|boq|bbs).*(architecture|structure|mep|electrical|plumbing|hvac|fire|interior|exterior|boq|bbs)/i.test(t);

  if (!asksLifecycle && !asksDisciplineIntegration) return "";

  return [
    "BuildSetu Full Building Lifecycle Knowledge:",
    "A building is not only a floor plan. Complete lifecycle includes: client brief, site study, soil/survey, concept architecture, structure concept, MEP concept, approval/sanction, working drawings/GFC, BOQ/estimate/procurement, construction execution, interior fitout, exterior/facade, testing/commissioning, handover, as-built and maintenance.",
    "Stage 1 Client brief: building type, plot/location, budget, family/user needs, room count, style, timeline and authority constraints.",
    "Stage 2 Site study: dimensions, road width, north/facing, levels, surroundings, services, access, climate and hazards.",
    "Stage 3 Soil/survey: soil test, topographic survey, utilities, water table, seismic/wind/flood context. Foundation needs geotechnical/structural verification.",
    "Stage 4 Architecture: zoning, floor plans, room sizes, circulation, parking, staircase/lift logic, light/ventilation and vastu if asked.",
    "Stage 5 Structure: RCC/steel/load-bearing concept, column grid, span warnings, foundation review, slab/beam/stair coordination. No final member/rebar sizes without structural engineer.",
    "Stage 6 MEP: electrical, plumbing, HVAC, fire/life safety, ELV/data/CCTV, solar/rainwater where applicable. Coordinate shafts, wet walls, DB, AC outdoor units and utility routes.",
    "Stage 7 Approval/sanction: site plan, floor plans, sections, elevations, area statement, FAR/FSI, setbacks, coverage, height, parking, fire/accessibility notes where applicable.",
    "Stage 8 Working drawings/GFC: coordinated architecture, structure, MEP, interior and facade drawings with revisions and professional sign-off.",
    "Stage 9 BOQ/procurement: trade-wise quantities, specs, rate assumptions, labour scope, procurement schedule and cost risk notes.",
    "Stage 10 Construction execution: site setup, setting out, excavation, PCC, foundation, plinth, RCC frame, masonry, MEP rough-in, plaster, waterproofing, flooring, doors/windows, false ceiling, painting, fixtures and finishing.",
    "Stage 11 Interior: furniture/carpentry, modular kitchen, false ceiling, lighting, wall finishes, flooring, fixtures, loose furniture and material schedule.",
    "Stage 12 Exterior/facade: elevation, cladding/paint, windows/railings, gate/compound, facade lighting, driveway/landscape and waterproofing/weather checks.",
    "Stage 13 Testing/commissioning: electrical testing, earthing, plumbing leak/pressure test, drainage flow, pump/tank, AC/exhaust, fire system where applicable and snag list.",
    "Stage 14 Handover/as-built: as-built drawings, warranties, manuals, material list, maintenance schedule, completion/occupancy where applicable.",
    "Coordination rule: architecture, structure, MEP, interior, exterior, BOQ and site execution must be coordinated. Design changes affect cost, structure, MEP and approval.",
    "Verification boundary: final approval, structure, MEP, fire, legal/code compliance, GFC and site execution require licensed professionals and local authority verification."
  ].join("\\n");
}


function buildBuildingRoomDimensionKnowledgeBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const t = clean.toLowerCase();
  const intent = detectIntent(clean);

  const asksBuildingRoom =
    /(room size|room sizes|dimension|dimensions|standard size|standard dimension|building type|room type|adjacency|circulation|parking|staircase|kitchen|bedroom|living|toilet|bathroom|pooja|dining|balcony|villa|house|flat|apartment|office|shop|school|clinic|hospital|hotel|warehouse|layout|naksha|floor plan|interior|exterior)/i.test(t);

  if (!asksBuildingRoom) return "";

  const buildingType =
    /(villa|bungalow|duplex)/i.test(t) ? "villa" :
    /(flat|apartment)/i.test(t) ? "apartment/flat" :
    /(office|workspace)/i.test(t) ? "office" :
    /(shop|showroom|retail)/i.test(t) ? "commercial shop/showroom" :
    /(school|classroom|coaching|institute)/i.test(t) ? "school/institute" :
    /(clinic|hospital|medical|nursing)/i.test(t) ? "clinic/hospital" :
    /(hotel|guest house|resort|lodge)/i.test(t) ? "hotel/guest house" :
    /(warehouse|godown|factory|industrial)/i.test(t) ? "warehouse/industrial" :
    /(house|ghar|home|residential|bhk|floor plan|naksha)/i.test(t) ? "small residential house" :
    "not specified";

  return [
    "BuildSetu Building Type / Room Dimension Intelligence:",
    `Detected/assumed building type: ${buildingType}.`,
    `Detected planning intent: ${intent}.`,
    "Before planning, infer required room program from building type, plot size, floor count, BHK/occupancy, budget, road side/facing and jurisdiction.",
    "Typical residential room-size ranges in feet: living compact 10x12–12x14, standard 12x15–14x18; bedroom compact 10x10–10x12, standard 11x12–12x14; master bedroom standard 12x15–14x16; kitchen compact 7x8–8x10, standard 8x10–10x12; toilet compact 4x7–5x7, standard 5x8–6x8; staircase commonly 6x10 to 10x14 depending type; car parking standard around 9x16 to 10x18.",
    "Adjacency rules: entry -> living/foyer; dining near kitchen; toilets/wet areas grouped with shaft; bedrooms more private; guest toilet near living where possible; staircase near entry/side depending plot; pooja in quiet clean zone.",
    "Circulation rules: avoid wasted passage, avoid doors hitting furniture, keep clear movement between entry/living/dining/kitchen/bedrooms, avoid toilet door directly facing dining/living where possible.",
    "Light/ventilation rules: rooms need external window where possible, kitchen needs ventilation/chimney, toilets need shaft/window/exhaust, narrow plots need shaft/courtyard/lightwell.",
    "Structure/MEP coordination: align walls/columns floor-to-floor, avoid random offsets, stack toilets/kitchen where possible, keep plumbing shafts serviceable, keep DB accessible/dry, check AC outdoor unit service access.",
    "Plot heuristic: small plot prioritizes parking + staircase + compact rooms + stacked wet areas; medium plot allows better zoning; large plot allows public/private/service separation; narrow plot needs linear planning and lightwell.",
    "Dimension warning: these are planning ranges, not final approval/execution dimensions; verify with local bylaws, client requirements, site measurements and licensed professionals."
  ].join("\\n");
}


function buildBuildSetuOutputQualityEvaluatorBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const intent = detectIntent(clean);
  const country = detectCountry(clean);
  const stateJurisdiction = detectStateJurisdiction(clean);
  const t = clean.toLowerCase();

  const expectedOutput =
    intent === "structure" || intent === "electrical" || intent === "plumbing" || intent === "boq" || intent === "bbs"
      ? "text/document/checklist"
      : "image prompt / visual design output";

  const visualGuard =
    intent === "floor_plan"
      ? "Visual guard: floor plan must be top-view 2D architectural plan only; avoid 3D exterior, facade, interior render and random perspective."
      : intent === "interior"
        ? "Visual guard: interior must show room interior design; avoid exterior facade, full floor plan and structural drawings."
        : intent === "exterior"
          ? "Visual guard: exterior/elevation must show facade/elevation; avoid interior furniture focus and full floor plan."
          : "Visual guard: for text/document modules, imagePrompt should remain empty unless user explicitly asks visual output.";

  const rulesSensitive =
    /(rule|rules|approval|sanction|permit|far|fsi|setback|code|fire|structure|electrical|plumbing|mep|bbs|gfc|execution|working drawing|municipal|authority)/i.test(t);

  return [
    "BuildSetu Output Quality Evaluator:",
    `Quality check target intent: ${intent}.`,
    `Expected output type: ${expectedOutput}.`,
    `Jurisdiction context for check: ${country.country}; ${stateJurisdiction.name} (${stateJurisdiction.level}).`,
    "Check 1: Scope must match user request. Do not add unrelated architecture/MEP/structure/interior/exterior details.",
    "Check 2: Module must match task. Floor plan -> architecture image; interior -> interior image; exterior -> exterior image; structure/electrical/plumbing/BOQ/BBS -> text/document.",
    "Check 3: Remove old empty project brief conflicts such as unknown plot/bedrooms when current user message is source of truth.",
    "Check 4: Missing info should be asked only when critical for approval/execution/certified output; concept output can proceed with assumptions.",
    visualGuard,
    rulesSensitive
      ? "Check 6: Certification/local authority boundary is mandatory before approval, execution, structural, MEP, fire, legal or code-sensitive use."
      : "Check 6: Add professional/site verification boundary when construction-sensitive assumptions are present.",
    "Check 7: Final output must be useful, scoped, non-random and directly answer the user request."
  ].join("\n");
}


function buildBuildSetuReasoningControllerBlock(message: string): string {
  const clean = String(message || "").trim();
  if (!clean) return "";

  const intent = detectIntent(clean);
  const country = detectCountry(clean);
  const stateJurisdiction = detectStateJurisdiction(clean);

  const t = clean.toLowerCase();

  const stage =
    /(gfc|good for construction)/i.test(t) ? "GFC / Good For Construction" :
    /(working drawing|working drawings|working plan|execution drawing|construction drawing)/i.test(t) ? "Working drawing / execution planning" :
    /(approval|sanction|permission|permit|municipal|municipality|authority|far|fsi|setback|rules)/i.test(t) ? "Approval/rules/checklist" :
    /(as built|as-built)/i.test(t) ? "As-built / record drawing" :
    /(render|image|design|interior|exterior|elevation)/i.test(t) ? "Concept/presentation design" :
    "Concept planning";

  const likelyOutput =
    intent === "structure" || intent === "electrical" || intent === "plumbing" || intent === "boq" || intent === "bbs"
      ? "text/document/checklist"
      : "image prompt + structured planning";

  const rulesSensitive = /(rule|rules|approval|sanction|permit|far|fsi|setback|code|fire|structure|electrical|plumbing|mep|bbs|gfc|execution)/i.test(t);

  return [
    "BuildSetu Reasoning Controller:",
    "Use this as the internal decision workflow before responding. Do not expose long hidden reasoning; show only concise decision summary if useful.",
    `1. Intent classified as: ${intent}.`,
    `2. Project stage classified as: ${stage}.`,
    `3. Jurisdiction detected: ${country.country}; ${stateJurisdiction.name} (${stateJurisdiction.level}).`,
    `4. Likely output mode: ${likelyOutput}.`,
    "5. Scope lock: answer only the requested scope; do not dump unrelated architecture/MEP/structure/interior/exterior unless user asks full project.",
    "6. Knowledge selection: use only relevant BuildSetu knowledge blocks, training cases, country/state rules, working drawing package and discipline rules.",
    "7. Missing information rule: for concept output, proceed with clear assumptions; for approval/execution/certified output, ask exact missing legal/site/design data.",
    rulesSensitive
      ? "8. Verification boundary required: licensed architect/engineer/MEP/fire consultant/local authority verification is mandatory before execution or approval."
      : "8. Verification boundary: include professional/site verification note when construction-sensitive details are involved.",
    "9. Quality check before final: module, scope, country/state, project stage, output mode and certification boundary must match the user request."
  ].join("\\n");
}


function buildCountryStateRulesRouterBlock(message: string): string {
  const t = String(message || "").toLowerCase();

  const asksRules =
    /(rule|rules|bylaw|bye-law|building code|code|approval|sanction|permission|far|fsi|setback|set back|coverage|height|parking|fire noc|civil defence|municipal|municipality|authority|local body|development authority|zoning|land use|occupancy certificate|completion certificate)/i.test(t);

  if (!asksRules) return "";

  const country = detectCountry(message);
  const stateJurisdiction = detectStateJurisdiction(message);

  const common = [
    "BuildSetu Country/State Rules Router:",
    `Detected jurisdiction: ${country.country}; state/province/emirate/city: ${stateJurisdiction.name} (${stateJurisdiction.level}).`,
    "Rules mode: checklist/reference only, not final legal/code compliance.",
    "Exact enforceable rules depend on country, state/province/emirate, city/local authority, zoning/land use, road width, plot size, building use, height/floors and project stage.",
    "Core rule categories to check: land use/zoning, road width, setbacks, FAR/FSI, ground coverage, height, parking, fire/life safety, accessibility, structure/seismic/wind/flood, electrical, plumbing/drainage, rainwater/sustainability, approval drawings, completion/occupancy process.",
    "Approval/sanction package may require: site plan, floor plans, sections, elevations, area statement, setback statement, FAR/FSI statement, parking statement, service/fire/accessibility notes where applicable.",
    "Working/GFC execution requires coordinated architecture, structure and MEP drawings with revision and professional sign-off where applicable.",
    "Final approval/execution validity requires licensed architect/engineer/MEP/fire consultant/local authority verification."
  ];

  if (country.country === "India") {
    return [
      ...common,
      "India rule family: BIS/IS/NBC reference context + state development control rules + city municipal/development authority bylaws + fire authority/NOC + utility authority requirements.",
      `India state/local note: ${stateJurisdiction.note}`,
      "For India, exact city/local authority is mandatory for FAR/FSI, setbacks, coverage, height, parking, fire, approval drawings and completion/occupancy rules.",
      "If city/local authority is missing, ask for state + city + road width + plot size + building use + floor count before claiming rule-specific guidance."
    ].join("\\n");
  }

  if (country.country === "USA") {
    return [
      ...common,
      "USA rule family: ICC I-Codes where adopted + state/city adopted edition + local amendments + zoning ordinance + fire/accessibility/energy requirements.",
      "Exact state/county/city and adopted code edition are mandatory for compliance-sensitive guidance."
    ].join("\\n");
  }

  if (country.country === "UAE") {
    return [
      ...common,
      "UAE rule family: emirate municipality/building regulation + Civil Defence/fire safety + utility authority + free-zone/master developer rules where applicable.",
      "Exact emirate, municipality/free-zone/master developer and plot/community rules are mandatory."
    ].join("\\n");
  }

  if (country.country === "UK") {
    return [
      ...common,
      "UK rule family: Building Regulations + Approved Documents + local planning authority + building control + British Standards/Eurocode context where applicable.",
      "Planning permission and building regulations are separate checks."
    ].join("\\n");
  }

  if (country.country === "Canada") {
    return [
      ...common,
      "Canada rule family: National Building Code model context + provincial/territorial building code + municipal permit office + fire/accessibility/energy rules.",
      "Exact province and municipality are mandatory."
    ].join("\\n");
  }

  if (country.country === "Australia") {
    return [
      ...common,
      "Australia rule family: NCC/BCA context + Australian Standards + state/territory planning + local council + hazard overlays where applicable.",
      "Exact state/territory, council/suburb and hazard overlays are mandatory."
    ].join("\\n");
  }

  return [
    ...common,
    "Location not fully detected. Ask for country + state/province/emirate + city/local authority before giving rule-specific guidance."
  ].join("\\n");
}


function buildWorkingDrawingKnowledgeBlock(message: string): string {
  const t = String(message || "").toLowerCase();

  const asksWorkingDrawing =
    /(working drawing|working drawings|working plan|working plans|execution drawing|construction drawing|gfc|good for construction|approval drawing|sanction drawing|as built|as-built|drawing set|drawing package|kitne drawing|kitne plan|kitna drawing|detail drawing)/i.test(t);

  if (!asksWorkingDrawing) return "";

  return [
    "BuildSetu Working Plan / Working Drawing Knowledge:",
    "Drawing stages are separate: concept plan, presentation plan, approval/sanction drawing, working drawing, GFC drawing and as-built drawing.",
    "There is no universal fixed number of drawings. Count depends on plot, floors, building type, services, authority requirements and detail level.",
    "Architecture working drawing package can include: site plan, setting-out, centerline, dimensioned floor plans, wall/masonry layout, door-window schedule, furniture layout, flooring plan, reflected ceiling plan, toilet/kitchen details, staircase details, sections, elevations, terrace/rainwater/waterproofing notes and material specifications.",
    "Structural drawing package can include: foundation layout, footing schedule, column layout/schedule, plinth beam, beam layout, slab layout, staircase structural detail, reinforcement details, BBS and structural notes.",
    "MEP drawing package can include: electrical lighting/power/switchboard/DB layouts, plumbing water supply/soil/waste/vent/rainwater layouts, HVAC/AC/exhaust layout and fire-safety drawings where applicable.",
    "Interior working drawing package can include: furniture layout, civil modification plan, flooring plan, false ceiling/RCP, lighting layout, switch/socket layout, AC points, wall elevations, carpentry drawings, modular kitchen details, wardrobe/TV/bed unit details, material schedule, hardware schedule and BOQ.",
    "Exterior/elevation working drawing package can include: elevation drawings, facade material layout, cladding/fixing concept, balcony railing detail, gate/compound wall detail, chajja/canopy/pergola details, facade lighting and landscape/driveway details.",
    "Typical small residential architecture package can be 10 to 25+ drawings; structure 8 to 20+; MEP 8 to 25+; full home interior 25 to 80+; exact count depends on scope.",
    "GFC / Good For Construction drawings require professional coordination and approval before site execution.",
    "Final execution/approval drawings require licensed architect, structural engineer, MEP engineer/fire consultant/local authority verification as applicable."
  ].join("\\n");
}


function buildInteriorExteriorDesignKnowledgeBlock(message: string): string {
  const t = String(message || "").toLowerCase();
  const intent = detectIntent(message);

  if (intent === "interior") {
    return [
      "BuildSetu Interior Design Knowledge:",
      "Interior scope: answer interior design only. Do not switch to full floor plan or exterior unless asked.",
      "Required interior planning inputs: room type, room size, style, furniture requirement, storage, lighting mood, budget level, AC/ventilation, existing constraints.",
      "Room planning: furniture layout, practical circulation, door/window clearance, storage usability, false ceiling if relevant, wall treatment, material palette and camera/render angle.",
      "Bedroom: bed position, wardrobe, side tables, dresser/study if needed, curtains, warm lighting and bed/wardrobe clearance.",
      "Living room: sofa layout, TV wall, accent wall, center table, curtains, cove/profile/spot lighting and circulation.",
      "Kitchen: counter layout, hob/chimney, sink, fridge, storage, backsplash, working triangle, task lighting and ventilation.",
      "Bathroom: dry/wet separation, vanity, WC, shower, anti-skid floor, mirror lighting, exhaust and waterproofing warning.",
      "Lighting: ambient + task + accent lighting; bedroom warm lighting; kitchen counter task lighting; bathroom vanity/exhaust planning.",
      "Materials: paint/texture/wallpaper/veneer/fluted panel/stone; flooring based on use; false ceiling by available height and services.",
      "Render prompt must include realistic scale, furniture, materials, lighting mood, camera angle and practical circulation.",
      "Avoid impossible furniture scale, blocked doors/windows, over-clutter, exterior facade focus and final execution claims."
    ].join("\n");
  }

  if (intent === "exterior") {
    return [
      "BuildSetu Exterior / Elevation Design Knowledge:",
      "Exterior scope: answer exterior/elevation/facade only. Do not switch to interior or full floor plan unless asked.",
      "Required exterior inputs: front width, floor count, style, road side, balcony/window positions, parking/gate, material preference, climate and budget.",
      "Facade planning: massing, vertical/horizontal balance, opening rhythm, entry feature, balcony, gate/compound wall, lighting, landscape and service elements.",
      "Elevation elements: box forms, chajja/overhang, vertical fins, jaali/screens, balcony railing, texture wall, stone/HPL/metal accents, large glazing where suitable.",
      "Climate checks: heat gain, west-side glazing, shading, rain protection, waterproofing, drainage and corrosion resistance where relevant.",
      "Material choices: weatherproof paint, texture, stone cladding, wood-finish HPL, metal fins, glass/MS railing, compound wall and gate materials.",
      "Structural warnings: balcony/cantilever, heavy cladding, large glazing and projections require structural/professional verification.",
      "Render prompt must include front elevation or 3/4 street view, style, floor count, materials, windows, balcony, gate, lighting and landscape.",
      "Avoid impossible cantilevers, unsupported projections, random window placement, interior furniture focus and final approval claims."
    ].join("\n");
  }

  return "";
}


export function buildBuildSetuAgentKnowledgeBlock(message: string): string {
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) return "";

  const intent = detectIntent(cleanMessage);
  const block = buildDisciplineBlock(intent, cleanMessage).join("\n");
  const trainingBlock = getBuildSetuTrainingBlock(cleanMessage);

  const interiorExteriorBlock = buildInteriorExteriorDesignKnowledgeBlock(cleanMessage);
  const workingDrawingBlock = buildWorkingDrawingKnowledgeBlock(cleanMessage);
  const countryStateRulesBlock = buildCountryStateRulesRouterBlock(cleanMessage);
  const reasoningControllerBlock = buildBuildSetuReasoningControllerBlock(cleanMessage);
  const qualityEvaluatorBlock = buildBuildSetuOutputQualityEvaluatorBlock(cleanMessage);
  const buildingRoomDimensionBlock = buildBuildingRoomDimensionKnowledgeBlock(cleanMessage);
  const fullBuildingLifecycleBlock = buildFullBuildingLifecycleKnowledgeBlock(cleanMessage);
  const constructionMaterialMethodsBlock = buildConstructionMaterialMethodsKnowledgeBlock(cleanMessage);
  const internetKnowledgeUpdateBlock = buildInternetKnowledgeUpdateRouterBlock(cleanMessage);
  const trustedSourceResearchPipelineBlock = buildTrustedSourceResearchPipelineBlock(cleanMessage);
  const modelStyleTrainingControllerBlock = buildModelStyleTrainingControllerBlock(cleanMessage);

  return [reasoningControllerBlock, qualityEvaluatorBlock, modelStyleTrainingControllerBlock, internetKnowledgeUpdateBlock, trustedSourceResearchPipelineBlock, fullBuildingLifecycleBlock, constructionMaterialMethodsBlock, buildingRoomDimensionBlock, block, interiorExteriorBlock, workingDrawingBlock, countryStateRulesBlock, trainingBlock].filter(Boolean).join("\n\n");
}

export function enhanceBuildSetuAgentImagePrompt(input: KnowledgeAdapterInput): string {
  const base = String(input.baseImagePrompt || "").trim();
  const message = String(input.message || "").trim();
  const mergedBlock = buildBuildSetuAgentKnowledgeBlock(message);

  if (!base && !message) return "";
  if (!base) return mergedBlock;

  return `${base}\n\n${mergedBlock}`;
}

export function enhanceBuildSetuAgentResponseText(input: KnowledgeAdapterInput): string {
  const base = String(input.baseResponseText || "").trim();
  const message = String(input.message || "").trim();
  const intent = detectIntent(message);
  const country = detectCountry(message);
  const stateJurisdiction = detectStateJurisdiction(message);

  const labelMap: Record<string, string> = {
    floor_plan: "Floor Plan AI",
    interior: "Interior AI",
    exterior: "Exterior/Elevation AI",
    electrical: "Electrical AI",
    plumbing: "Plumbing AI",
    structure: "Structure AI",
    vastu: "Vastu AI",
    boq: "BOQ/Estimate AI",
    bbs: "BBS AI",
    full_project: "BuildSetu Full Project Agent",
    mixed: "BuildSetu Agent"
  };

  const agentLabel = labelMap[intent] || "BuildSetu Agent";

  const add = [
    `Scope mode: ${intent}.`,
    `Country/Jurisdiction: ${country.country}.`,
    `State/Province/Emirate/City Jurisdiction: ${stateJurisdiction.name} (${stateJurisdiction.level}).`,
    "Agent can create planning, concept design, coordination notes, image/render prompts, BOQ/BBS drafts and execution checklists, but output is not valid for site execution or approval until reviewed and certified by licensed architect/structural engineer/MEP engineer/fire consultant/local authority as applicable."
  ].join(" ");

  const fixedBase = base
    .replace(/^Floor Plan AI ready hai\./, `${agentLabel} ready hai.`)
    .replace("current project brief ke basis par", "current request ke basis par");

  if (!fixedBase) return `${agentLabel} ready hai. ${add}`;
  if (fixedBase.includes("Scope mode:")) return fixedBase;
  return `${fixedBase}\n\n${add}`;
}

// BUILDSETU_DIRECT_MESSAGE_BRIEF_V1
export function hasBuildSetuDirectBriefFromMessage(message: string): boolean {
  const t = String(message || "").toLowerCase();

  const hasDimension = /\b\d{1,3}\s*(?:x|×|\*)\s*\d{1,3}\b/i.test(t);
  const hasBedroom = /\b[1-9]\s*(?:bhk|bedroom|bedrooms|bed)\b/i.test(t);
  const hasToilet = /\b[1-9]\s*(?:toilet|toilets|bathroom|bathrooms|bath)\b/i.test(t);
  const hasUseType = /(ghar|house|home|villa|flat|apartment|residential|bungalow|duplex|shop|office|clinic|restaurant|warehouse)/i.test(t);
  const hasIntent = /(naksha|floor plan|floorplan|layout|plan|interior|exterior|elevation|electrical|plumbing|structure)/i.test(t);

  return hasDimension && hasIntent && (hasBedroom || hasUseType || hasToilet);
}

export function buildBuildSetuDirectBriefOverride(message: string): string {
  const raw = String(message || "").trim();
  const t = raw.toLowerCase();

  if (!hasBuildSetuDirectBriefFromMessage(raw)) return "";

  const dim = raw.match(/\b(\d{1,3})\s*(?:x|×|\*)\s*(\d{1,3})\b/i);
  const bhk = raw.match(/\b([1-9])\s*bhk\b/i);
  const bedrooms = raw.match(/\b([1-9])\s*(?:bedroom|bedrooms|bed)\b/i);
  const toilets = raw.match(/\b([1-9])\s*(?:toilet|toilets|bathroom|bathrooms|bath)\b/i);

  const facingMatch =
    raw.match(/\b(north|south|east|west|north-east|northeast|north-west|northwest|south-east|southeast|south-west|southwest)\s*(?:facing)?\b/i);

  const country =
    /dubai|abu dhabi|sharjah|uae|emirates/i.test(raw) ? "UAE" :
    /india|bharat|delhi|mumbai|lucknow|raipur/i.test(raw) ? "India" :
    /usa|united states|america/i.test(raw) ? "USA" :
    /uk|united kingdom|england|london/i.test(raw) ? "UK" :
    /canada/i.test(raw) ? "Canada" :
    /australia|sydney|melbourne/i.test(raw) ? "Australia" :
    "Not explicitly specified";

  const city =
    /dubai/i.test(raw) ? "Dubai" :
    /abu dhabi/i.test(raw) ? "Abu Dhabi" :
    /sharjah/i.test(raw) ? "Sharjah" :
    /delhi/i.test(raw) ? "Delhi" :
    /mumbai/i.test(raw) ? "Mumbai" :
    /lucknow/i.test(raw) ? "Lucknow" :
    /raipur/i.test(raw) ? "Raipur" :
    "Not explicitly specified";

  const buildingType =
    /villa/i.test(raw) ? "villa" :
    /duplex/i.test(raw) ? "duplex residential" :
    /shop/i.test(raw) ? "commercial shop" :
    /office/i.test(raw) ? "office" :
    /clinic/i.test(raw) ? "clinic" :
    /restaurant|cafe/i.test(raw) ? "restaurant/cafe" :
    /warehouse|factory/i.test(raw) ? "industrial/warehouse" :
    "residential";

  const lines = [
    "Temporary brief extracted from current user message:",
    `- Original user request: ${raw}`,
    `- Country: ${country}`,
    `- City/Authority context: ${city}`,
    `- Building type: ${buildingType}`,
    dim ? `- Plot size: ${dim[1]} x ${dim[2]} ft/user-provided unit` : "- Plot size: not explicit",
    facingMatch ? `- Facing / direction: ${facingMatch[1]}` : "- Facing / direction: not explicit",
    bhk ? `- BHK: ${bhk[1]}BHK` : bedrooms ? `- Bedrooms: ${bedrooms[1]}` : "- Bedrooms: not explicit",
    toilets ? `- Toilets/Bathrooms: ${toilets[1]}` : "- Toilets/Bathrooms: not explicit",
    /parking/i.test(t) ? "- Parking: required" : "- Parking: not explicit",
    /stair|staircase|stairs/i.test(t) ? "- Staircase: required" : "- Staircase: not explicit",
    /vastu|vaastu/i.test(t) ? "- Vastu: requested" : "- Vastu: not explicitly requested",
    /electrical/i.test(t) ? "- Electrical planning: requested" : "- Electrical planning: not explicitly requested",
    /plumbing/i.test(t) ? "- Plumbing planning: requested" : "- Plumbing planning: not explicitly requested",
    /structure|column|beam|slab|footing|foundation/i.test(t) ? "- Structure coordination: requested" : "- Structure coordination: concept warning only if relevant",
    "- Certification boundary: AI output is concept/draft only. Final site execution or approval requires licensed architect/structural engineer/MEP engineer/fire consultant/local authority verification as applicable."
  ];

  return lines.join("\n");
}
