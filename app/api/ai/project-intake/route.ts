import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function detectPlotSize(text: string) {
  const match = text.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})/i);
  if (!match) return "";
  return `${match[1]} x ${match[2]} ft`;
}

function normalizeDirection(input: string) {
  const lower = String(input || "").trim().toLowerCase();
  if (!lower) return "";
  if (lower.includes("east") || lower.includes("पूर्व")) return "East";
  if (lower.includes("north") || lower.includes("उत्तर")) return "North";
  if (lower.includes("south") || lower.includes("दक्षिण")) return "South";
  if (lower.includes("west") || lower.includes("पश्चिम")) return "West";
  return "";
}

function detectFrontRoadFacing(text: string) {
  const lower = String(text || "").toLowerCase();

  if (/front\s+road\s*(is|:)?\s*(on\s*)?(east|पूर्व)/i.test(text)) return "East";
  if (/(east|पूर्व)\s+(side\s+)?(front\s+)?road/i.test(text)) return "East";
  if (/east\s+front/i.test(lower) || /frontage.*east/i.test(lower)) return "East";

  if (/front\s+road\s*(is|:)?\s*(on\s*)?(north|उत्तर)/i.test(text)) return "North";
  if (/(north|उत्तर)\s+(side\s+)?front\s+road/i.test(text)) return "North";
  if (/north\s+front/i.test(lower) || /frontage.*north/i.test(lower)) return "North";

  if (/front\s+road\s*(is|:)?\s*(on\s*)?(south|दक्षिण)/i.test(text)) return "South";
  if (/(south|दक्षिण)\s+(side\s+)?front\s+road/i.test(text)) return "South";
  if (/south\s+front/i.test(lower) || /frontage.*south/i.test(lower)) return "South";

  if (/front\s+road\s*(is|:)?\s*(on\s*)?(west|पश्चिम)/i.test(text)) return "West";
  if (/(west|पश्चिम)\s+(side\s+)?front\s+road/i.test(text)) return "West";
  if (/west\s+front/i.test(lower) || /frontage.*west/i.test(lower)) return "West";

  return "";
}

function detectSideRoadFacing(text: string) {
  const lower = String(text || "").toLowerCase();

  if (/side\s+road\s*(is|:)?\s*(on\s*)?(north|उत्तर)/i.test(text) || /north\s+side\s+road/i.test(lower)) return "North";
  if (/side\s+road\s*(is|:)?\s*(on\s*)?(east|पूर्व)/i.test(text) || /east\s+side\s+road/i.test(lower)) return "East";
  if (/side\s+road\s*(is|:)?\s*(on\s*)?(south|दक्षिण)/i.test(text) || /south\s+side\s+road/i.test(lower)) return "South";
  if (/side\s+road\s*(is|:)?\s*(on\s*)?(west|पश्चिम)/i.test(text) || /west\s+side\s+road/i.test(lower)) return "West";

  return "";
}

function detectFacing(text: string) {
  const lower = String(text || "").toLowerCase();

  const explicitFront = detectFrontRoadFacing(text);
  if (explicitFront) return explicitFront;

  const corner = lower.match(/\b(east|north|south|west)\s*[-/]\s*(east|north|south|west)\s+corner\b/i);
  if (corner) return normalizeDirection(corner[1]);

  if (lower.includes("east") || lower.includes("पूर्व")) return "East";
  if (lower.includes("north") || lower.includes("उत्तर")) return "North";
  if (lower.includes("south") || lower.includes("दक्षिण")) return "South";
  if (lower.includes("west") || lower.includes("पश्चिम")) return "West";
  return "";
}

function detectFloors(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("g+3") || lower.includes("ground + 3")) return "G+3";
  if (lower.includes("g+2") || lower.includes("ground + 2")) return "G+2";
  if (lower.includes("g+1") || lower.includes("ground + 1")) return "G+1";
  if (lower.includes("duplex")) return "G+1";
  if (lower.includes("first floor") || lower.includes("1st floor")) return "G+1";
  return "";
}

function detectBudget(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|cr|crore)/i);
  if (!match) return "";
  return `${match[1]} ${match[2]}`.replace(/\b(lac|lakhs)\b/i, "Lakh");
}

function detectLocation(text: string) {
  const known = text.match(/\b(raipur|bhilai|bilaspur|durg|delhi|mumbai|pune|bangalore|bengaluru|hyderabad|indore|nagpur|lucknow|varanasi|banaras|jaipur|surat|ahmedabad)\b/i);
  if (!known) return "";
  return known[1].charAt(0).toUpperCase() + known[1].slice(1).toLowerCase();
}

function detectRooms(text: string) {
  const lower = text.toLowerCase();
  const rooms: string[] = [];
  const pairs: Array<[string, string[]]> = [
    ["Parking", ["parking", "car park", "garage"]],
    ["Living Room", ["living", "hall", "drawing"]],
    ["Kitchen", ["kitchen", "modular kitchen"]],
    ["Dining Room", ["dining"]],
    ["Puja Room", ["puja", "pooja", "mandir"]],
    ["Bedroom", ["bedroom", "bed room", "master bedroom"]],
    ["Bathroom", ["bathroom", "toilet", "washroom"]],
    ["Balcony", ["balcony"]],
    ["Family Lounge", ["family lounge", "lounge"]],
    ["Store Room", ["store"]],
    ["Wash Area", ["wash area", "utility"]],
    ["Staircase", ["stair", "staircase", "सीढ़ी"]]
  ];

  for (const [label, keys] of pairs) {
    if (keys.some((key) => lower.includes(key))) rooms.push(label);
  }

  return Array.from(new Set(rooms));
}

function detectOutputs(text: string, selectedOutputs: string[]) {
  const lower = text.toLowerCase();
  const outputs = new Set<string>(selectedOutputs || []);

  if (lower.includes("floor plan") || lower.includes("plan")) outputs.add("Floor Plan");
  if (lower.includes("interior")) outputs.add("Interior Render");
  if (lower.includes("elevation") || lower.includes("front")) outputs.add("Exterior Elevation");
  if (lower.includes("boq") || lower.includes("estimate")) outputs.add("BOQ Estimate");
  if (lower.includes("bbs") || lower.includes("steel")) outputs.add("BBS");
  if (lower.includes("pdf") || lower.includes("presentation")) outputs.add("Client PDF");

  if (outputs.size === 0) {
    outputs.add("Floor Plan");
    outputs.add("Exterior Elevation");
  }

  return Array.from(outputs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawBrief = String(body.rawBrief || body.prompt || "").trim();
    const projectType = String(body.projectType || "Residential House").trim();
    const style = String(body.style || "").trim();
    const plotType = String(body.plotType || "Regular Plot").trim();
    const frontRoadFacing = normalizeDirection(String(body.frontRoadFacing || body.facing || "").trim());
    const sideRoadFacing = normalizeDirection(String(body.sideRoadFacing || "").trim()) || detectSideRoadFacing(rawBrief);
    const spaces = Array.isArray(body.spaces) ? body.spaces.filter(Boolean) : [];
    const selectedOutputs = Array.isArray(body.requiredOutputs) ? body.requiredOutputs.filter(Boolean) : [];
    const assets = Array.isArray(body.assets) ? body.assets : [];

    if (!rawBrief || rawBrief.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please add a detailed client brief before analysis."
        },
        { status: 400 }
      );
    }

    const plotSize = detectPlotSize(rawBrief);
    const facing = frontRoadFacing || detectFrontRoadFacing(rawBrief) || detectFacing(rawBrief);
    const floors = detectFloors(rawBrief);
    const budget = detectBudget(rawBrief);
    const location = detectLocation(rawBrief);
    const detectedRooms = Array.from(new Set([...detectRooms(rawBrief), ...spaces]));
    const requiredOutputs = detectOutputs(rawBrief, selectedOutputs);

    const missingQuestions: string[] = [];
    if (!location) missingQuestions.push("Project city/location kya hai?");
    if (!plotSize) missingQuestions.push("Plot/site size kya hai? Width x depth feet me batao.");
    if (!facing) missingQuestions.push("Plot/road facing kaunsi side hai?");
    if (!floors) missingQuestions.push("Total floors kya chahiye? G, G+1, G+2 ya G+3?");
    if (!budget) missingQuestions.push("Approx budget range kya hai?");
    if (!rawBrief.toLowerCase().includes("vastu")) missingQuestions.push("Vastu follow karna hai ya optional hai?");
    if (!rawBrief.toLowerCase().includes("stair")) missingQuestions.push("Staircase internal chahiye ya external?");
    if (requiredOutputs.length === 0) missingQuestions.push("Pehle output kya chahiye: floor plan, interior, elevation, BOQ, BBS ya client PDF?");

    const orientationTitle =
      plotType === "Corner Plot" && facing && sideRoadFacing
        ? `${facing}-${sideRoadFacing} Corner Plot`
        : facing
          ? `${facing} Facing`
          : "";

    const projectTitleParts = [
      plotSize || "New",
      orientationTitle,
      projectType.includes("House") ? "House" : projectType
    ].filter(Boolean);

    const projectTitle = projectTitleParts.join(" ").trim() || "New BuildSetu Project";

    const briefSummary = [
      `Project Type: ${projectType}`,
      location ? `Location: ${location}` : "",
      plotSize ? `Plot Size: ${plotSize}` : "",
      plotType ? `Plot Type: ${plotType}` : "",
      facing ? `${plotType === "Corner Plot" ? "Front Road Facing" : "Facing"}: ${facing}` : "",
      plotType === "Corner Plot" && sideRoadFacing ? `Side Road Facing: ${sideRoadFacing}` : "",
      floors ? `Floors: ${floors}` : "",
      budget ? `Budget: ${budget}` : "",
      detectedRooms.length ? `Spaces: ${detectedRooms.join(", ")}` : "",
      style ? `Style: ${style}` : "",
      requiredOutputs.length ? `Required Outputs: ${requiredOutputs.join(", ")}` : "",
      assets.length ? `Uploaded Assets: ${assets.map((asset: any) => asset.name || asset.fileName || "asset").join(", ")}` : ""
    ].filter(Boolean).join("\n");

    return NextResponse.json({
      ok: true,
      intake: {
        projectTitle,
        projectType,
        location,
        plotSize,
        facing,
        frontRoadFacing: facing,
        plotType,
        sideRoadFacing: plotType === "Corner Plot" ? sideRoadFacing : "",
        cornerPlot: plotType === "Corner Plot",
        floors,
        budget,
        style,
        detectedRooms,
        requiredOutputs,
        missingQuestions: missingQuestions.slice(0, 7),
        assetCount: assets.length,
        assets,
        briefSummary,
        rawBrief,
        status: missingQuestions.length ? "NEEDS_CLARIFICATION" : "READY_TO_CREATE"
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Project intake failed."
      },
      { status: 500 }
    );
  }
}
