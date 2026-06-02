type BuildSetuToolEngineInput = {
  toolSlug?: string;
  toolName?: string;
  projectTitle?: string;
  projectMemory?: string;
  userText?: string;
  action?: string;
};

type SectionInput = {
  section: string;
  title: string;
  prompt: string;
};

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function compact(value: unknown) {
  return clean(value).toLowerCase();
}

function inferToolKind(toolSlug = "", toolName = "") {
  const t = `${toolSlug} ${toolName}`.toLowerCase();

  if (t.includes("exterior") || t.includes("elevation") || t.includes("facade")) return "exterior";
  if (t.includes("interior") || t.includes("bedroom") || t.includes("living") || t.includes("kitchen") || t.includes("false-ceiling") || t.includes("mood") || t.includes("material")) return "interior";
  if (t.includes("floor") || t.includes("sketch") || t.includes("naksha") || t.includes("vastu")) return "floor-plan";
  if (t.includes("working") || t.includes("drawing")) return "working-drawing";
  if (t.includes("boq") || t.includes("estimate") || t.includes("cost") || t.includes("material-list")) return "boq";
  if (t.includes("bbs")) return "bbs";
  if (t.includes("column") || t.includes("beam") || t.includes("rcc") || t.includes("structure")) return "structure";
  if (t.includes("electrical")) return "electrical";
  if (t.includes("plumbing")) return "plumbing";
  if (t.includes("agreement")) return "agreement";
  if (t.includes("pdf") || t.includes("report") || t.includes("contractor") || t.includes("document")) return "document";
  return "brief";
}

function projectContextLines(projectTitle: string, combined: string) {
  return [
    `Project: ${projectTitle || "Selected Project"}`,
    "Source of truth: Master project brief + saved project chat + current tool input.",
    `Context used: ${combined.slice(-900) || "No extra context found. Use selected project title and current input."}`,
    "Rule: Do not create random unrelated design. Keep project identity consistent across all outputs.",
  ];
}

function exteriorSections(projectTitle: string, combined: string) {
  return [
    "Master Exterior Concept: Generate one selected facade identity first: massing, balcony language, window rhythm, gate, boundary wall, roofline, color palette, material palette and lighting direction.",
    "Consistent 4-View Set: 1) Front elevation view, 2) Front-left 3/4 view, 3) Front-right 3/4 view, 4) Street/wide contextual view. All views must keep the same facade design; only camera angle changes.",
    "Working Elevation Plan: Prepare front elevation dimensions, sill/lintel levels, balcony projection notes, parapet height notes, gate/boundary dimensions, material callouts, light point notes and print-sheet checklist.",
    "Print Quality: Generate preview image for screen and print image/PDF sheet for client/contractor package. Avoid text artifacts, watermark, distorted geometry and four different facade designs.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function interiorSections(projectTitle: string, combined: string) {
  return [
    "Master Interior Concept: Generate one locked room design first: furniture layout, wall treatment, false ceiling, lighting, material palette, color palette, storage and execution direction.",
    "Consistent Room View Set: Bedroom/Living/Kitchen standard set should include 4 same-design views. Bedroom: entry view, bed-back wall, TV/opposite wall, wardrobe/window side. Living: entry/overall, TV wall, sofa wall, feature/window wall. Kitchen: overall, hob side, sink side, tall-unit/utility side.",
    "Interior Working Plan: Generate room layout with dimensions, furniture plan, false ceiling plan, lighting layout, switchboard/electrical points, wall elevations, joinery details, flooring/tile layout and material specification.",
    "Execution Notes: Mistri/carpenter/electrician/POP/painter ke liye dimensioned notes, material legend, fixing notes, height notes and print-ready sheet list generate karo.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function floorPlanSections(projectTitle: string, combined: string) {
  return [
    "Floor Plan Concept: Use master brief to create floor-wise planning with room placement, circulation, parking, staircase, toilet/kitchen service logic, ventilation and vastu direction.",
    "Dimension Output: Generate room dimensions, wall-to-wall planning notes, door/window positions, staircase location, balcony/terrace notes and area statement.",
    "Derived Drawings: From locked floor plan generate furniture layout, vastu overlay, working plan, structure grid, electrical, plumbing, BOQ and BBS basis.",
    "Consistency Rule: Once user locks a floor plan, every later tool must use that same plan as source of truth.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function workingDrawingSections(projectTitle: string, combined: string) {
  return [
    "Drawing Index: Architectural plan, dimension plan, furniture layout, elevation, section, door-window schedule, staircase detail, toilet/kitchen detail, false ceiling, electrical, plumbing and contractor sheets.",
    "Dimension System: Every sheet should include clear dimensions, levels, labels, material callouts, notes, scale/title block/revision fields and print-ready formatting.",
    "Trade Execution Sheets: Mason, carpenter, electrician, plumber, POP worker and painter should understand what to execute from the package.",
    "Dependency Rule: Use locked master brief, locked floor plan, locked exterior concept and locked interior concept. Do not invent a new design identity.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function boqSections(projectTitle: string, combined: string) {
  return [
    "AI BOQ Final Draft: Generate complete item-wise BOQ using locked plan, working drawing assumptions, material palette, city/rate assumptions and current tool input.",
    "BOQ Heads: Earthwork, PCC, RCC, steel, masonry, plaster, flooring, doors/windows, waterproofing, painting, false ceiling, electrical, plumbing, sanitary, modular kitchen, wardrobe, railing, boundary, labour and contingency.",
    "Editable Estimate: Quantity, unit, rate, amount, drawing reference, status and remarks should remain editable before QS/engineer verification.",
    "Review Gate: AI generates the BOQ. QS/engineer/client verifies quantities, rates, scope and final export.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function bbsSections(projectTitle: string, combined: string) {
  return [
    "AI BBS Final Draft: Generate complete footing, column, beam, slab, staircase, lintel/chajja BBS using AI structural assumptions and project scale.",
    "BBS Tables: Member type, member ID, bar mark, diameter, number of bars, shape code, cutting length, total length, unit weight, total weight, drawing reference and status.",
    "Steel Summary: Dia-wise steel summary, floor-wise/member-wise summary, cutting list, duplicate bar mark alert and wastage allowance.",
    "Engineer Gate: AI generates BBS with assumptions. Structural engineer verifies bar dia, spacing, lap length, development length, bend deduction, cutting length and site execution before approval.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function structureSections(projectTitle: string, combined: string) {
  return [
    "AI Structural Final Draft: Generate column grid, beam layout, slab panel notes, footing layout direction, staircase structural notes and load-path assumptions.",
    "Structure Package: Column schedule, beam schedule, slab panel schedule, footing schedule, structural warning list and BBS handoff data.",
    "Coordination: Structure should follow locked architectural plan and avoid clashes with staircase, toilets, parking, openings and major walls.",
    "Engineer Gate: AI creates structure draft; qualified structural engineer verifies and approves before construction execution.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function electricalSections(projectTitle: string, combined: string) {
  return [
    "AI Electrical Plan: Generate light points, fan points, switchboards, sockets, AC points, DB location, appliance points and fixture schedule from locked plan/interior concept.",
    "Interior Coordination: Lighting should match false ceiling, furniture layout and room views.",
    "Execution Sheet: Provide point legend, switchboard height notes, room-wise schedule and electrician notes.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function plumbingSections(projectTitle: string, combined: string) {
  return [
    "AI Plumbing Plan: Generate toilet, kitchen, drainage, water supply, shaft, rainwater pipe and tank location notes from locked plan.",
    "Execution Sheet: Provide fixture point notes, pipe route assumptions, slope notes, waterproofing notes and plumber checklist.",
    "Coordination: Plumbing should align with kitchen/toilet layout, slab/sunken area and structural restrictions.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function documentSections(projectTitle: string, combined: string) {
  return [
    "Project Package: Generate client PDF / contractor package using master brief, selected concepts, views, working drawings, BOQ, BBS, material specs and review status.",
    "Client Version: Summary, renders, plan concept, material palette, estimate summary, timeline and next steps.",
    "Contractor Version: Drawing index, dimensions, BOQ, BBS summary, material list, work sequence, site checklist and revision log.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function briefSections(projectTitle: string, combined: string) {
  return [
    "Master Brief: Extract project facts, confirmed requirements, missing details, required outputs, style direction, vastu preference, budget and constraints.",
    "Lock Rule: Once user confirms, save this as master project understanding and use it across all tools.",
    "Tool Routing: Recommend floor plan, exterior, interior, working drawings, BOQ, BBS, structure, electrical, plumbing and export package based on selected outputs.",
    `Project Basis: ${projectTitle}. ${combined.slice(-500)}`,
  ];
}

function sectionsForKind(kind: string, projectTitle: string, combined: string) {
  if (kind === "exterior") return exteriorSections(projectTitle, combined);
  if (kind === "interior") return interiorSections(projectTitle, combined);
  if (kind === "floor-plan") return floorPlanSections(projectTitle, combined);
  if (kind === "working-drawing") return workingDrawingSections(projectTitle, combined);
  if (kind === "boq") return boqSections(projectTitle, combined);
  if (kind === "bbs") return bbsSections(projectTitle, combined);
  if (kind === "structure") return structureSections(projectTitle, combined);
  if (kind === "electrical") return electricalSections(projectTitle, combined);
  if (kind === "plumbing") return plumbingSections(projectTitle, combined);
  if (kind === "document" || kind === "agreement") return documentSections(projectTitle, combined);
  return briefSections(projectTitle, combined);
}

function promptsForKind(kind: string, projectTitle: string, combined: string) {
  if (kind === "exterior") {
    return [
      {
        label: "Front Elevation View",
        prompt: `Use the same locked exterior concept for ${projectTitle}. Generate front elevation view only. Keep facade, materials, balcony, window style, gate, roofline and colors identical. Context: ${combined}`,
      },
      {
        label: "Front Left 3/4 View",
        prompt: `Use the same locked exterior concept for ${projectTitle}. Generate front-left 3/4 perspective only. Same facade identity, only camera angle changes. Context: ${combined}`,
      },
      {
        label: "Front Right 3/4 View",
        prompt: `Use the same locked exterior concept for ${projectTitle}. Generate front-right 3/4 perspective only. Same facade identity, only camera angle changes. Context: ${combined}`,
      },
      {
        label: "Street Wide View",
        prompt: `Use the same locked exterior concept for ${projectTitle}. Generate street/wide contextual view. Same facade identity, only camera framing changes. Context: ${combined}`,
      },
    ];
  }

  if (kind === "interior") {
    return [
      {
        label: "Entry / Overall View",
        prompt: `Use the same locked interior concept for ${projectTitle}. Generate entry/overall room view. Keep furniture, ceiling, lighting, wall treatment, layout, materials and colors same. Context: ${combined}`,
      },
      {
        label: "Main Wall View",
        prompt: `Use the same locked interior concept for ${projectTitle}. Generate main wall view. Same layout and material identity, only camera angle changes. Context: ${combined}`,
      },
      {
        label: "Opposite Wall View",
        prompt: `Use the same locked interior concept for ${projectTitle}. Generate opposite wall view. Same layout and material identity, only camera angle changes. Context: ${combined}`,
      },
      {
        label: "Side / Detail View",
        prompt: `Use the same locked interior concept for ${projectTitle}. Generate side/detail view. Same layout and material identity, only camera angle changes. Context: ${combined}`,
      },
    ];
  }

  return [];
}

export function buildBuildSetuToolOutput(input: BuildSetuToolEngineInput) {
  const toolSlug = clean(input.toolSlug);
  const toolName = clean(input.toolName, "BuildSetu AI Tool");
  const projectTitle = clean(input.projectTitle, "Selected Project");
  const combined = `${clean(input.projectMemory)}\n${clean(input.userText)}`.trim();
  const kind = inferToolKind(toolSlug, toolName);
  const sections = sectionsForKind(kind, projectTitle, combined);
  const prompts = promptsForKind(kind, projectTitle, combined);

  const output = {
    title: `${toolName} — AI Final Draft`,
    summary: `${projectTitle} ke master brief/project memory ke basis par ${toolName} ka AI final draft ready hai.`,
    status: kind === "bbs" || kind === "structure" ? "AI Final Draft - Engineer Review Required" : "AI Final Draft - Review Required",
    sourceOfTruth: projectContextLines(projectTitle, combined),
    sections,
    prompts,
    nextActions: [
      "Save output under selected project",
      "Review/edit generated draft",
      "Generate linked working drawings / views / BOQ / BBS as needed",
      "Send to professional review if construction-critical",
      "Export PDF / package",
    ],
  };

  return {
    text:
      kind === "exterior"
        ? "Exterior ka master concept + same-design 4 view workflow ready hai. Output Preview me view-set prompts aur working elevation plan dikhega."
        : kind === "interior"
          ? "Interior ka master room concept + same-design 4 view workflow + working plan ready hai. Output Preview me full package dikhega."
          : `${toolName} ka AI final draft ready hai. Ye selected project memory ke hisaab se generate hua hai.`,
    output,
    imagePrompt: prompts[0]?.prompt || "",
  };
}

export function buildBuildSetuToolChat(input: BuildSetuToolEngineInput) {
  const generated = buildBuildSetuToolOutput({ ...input, action: "chat" });
  const kind = inferToolKind(input.toolSlug || "", input.toolName || "");

  const text =
    kind === "exterior"
      ? "Samjha. Exterior me pehle ek master facade concept lock hoga, phir usi design ke 4 consistent views generate honge. Alag-alag random design nahi banega."
      : kind === "interior"
        ? "Samjha. Interior me pehle ek room concept lock hoga, phir same room design ke 4 views aur working plan/dimensions generate honge."
        : kind === "boq"
          ? "Samjha. BOQ AI complete item-wise draft generate karega. Quantity/rate editable rahenge aur QS/engineer verify karega."
          : kind === "bbs"
            ? "Samjha. BBS AI complete member-wise draft generate karega. Engineer verify/edit/approve karega."
            : "Samjha. Ye tool selected project memory se chalega aur blank/random output nahi banayega.";

  return {
    text,
    output: null,
    imagePrompt: generated.imagePrompt,
  };
}

export function buildToolSectionItems(input: SectionInput) {
  const title = clean(input.title, "BuildSetu Tool");
  const section = clean(input.section, "Output");
  const prompt = clean(input.prompt, "Selected project memory");
  const kind = inferToolKind(title, title);
  const allSections = sectionsForKind(kind, title, prompt);
  const lower = section.toLowerCase();

  if (lower.includes("prompt") || lower.includes("render") || lower.includes("elevation")) {
    const prompts = promptsForKind(kind, title, prompt);
    if (prompts.length) return prompts.map((item) => `${item.label}: ${item.prompt}`);
  }

  if (lower.includes("checklist") || lower.includes("review") || lower.includes("warning") || lower.includes("caution")) {
    return [
      "AI generated final draft ready.",
      "User/team editable before review.",
      "Engineer/architect/QS verification required for construction-critical output.",
      "After approval, mark as Engineer Verified / Approved for Construction Reference.",
    ];
  }

  return allSections.slice(0, 4);
}
