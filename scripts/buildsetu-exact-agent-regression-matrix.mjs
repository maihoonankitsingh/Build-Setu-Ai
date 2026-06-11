// BUILDSETU_EXACT_AGENT_REGRESSION_MATRIX_V1
// Multi-prompt regression smoke for exact-agent final gate.
// Verifies command guard, final professional readiness, and all 47I-47Q required skills.

import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.EXACT_AGENT_BASE_URL || "http://127.0.0.1:3016";
const outDir = process.env.OUT_DIR || `/tmp/buildsetu_exact_agent_regression_${Date.now()}`;

// BUILDSETU_EXACT_AGENT_REGRESSION_CANONICAL_V6_DIRECTIVE_V1
const canonicalGroundPlanDirective = [
  "Return ONLY the exact ground_floor_plan command/asset type.",
  "Use the active V6 shared-edge ground layout.",
  "Connected rooms must be: puja, living, parking, dining, lobby, passage, stair, kitchen, wash/store, bedroom and bathroom.",
  "Keep lobby and passage present.",
  "Keep kitchen adjacent to wash/store.",
  "Keep parking adjacent to lobby.",
  "Keep passage adjacent to bedroom, bathroom and stair.",
  "Do not return door_window_schedule, schedule-only JSON, first-floor output, or generic fallback layout.",
].join(" ");

const requiredSkillIds = [
  "buildsetu.layout-candidate-generator.v1",
  "buildsetu.wall-topology.v1",
  "buildsetu.building-envelope.v1",
  "buildsetu.door-topology.v1",
  "buildsetu.window-ventilation.v1",
  "buildsetu.wet-plumbing.v1",
  "buildsetu.stair-core.v1",
  "buildsetu.parking-entry.v1",
  "buildsetu.professional-output-contract.v1",
  "buildsetu.compactness.v1",
  "buildsetu.polygon-geometry.v1",
  "buildsetu.circulation-graph.v2",
];

const basePayload = {
  command: "ground_floor_plan",
  assetType: "ground_floor_plan",
  plot: {
    width: 57,
    depth: 49,
    unit: "ft",
    facing: "east-north",
  },
  requirements: {
    floors: 1,
    bedrooms: 1,
    bathrooms: 1,
    parking: true,
    puja: true,
    kitchen: true,
    dining: true,
    stair: true,
    washStore: true,
    lobby: true,
    passage: true,
  },
  runtimeGate: true,
  debug: true,
  forceGroundFloorPlan: true,
  expectedCommand: "ground_floor_plan",
};

const cases = [
  {
    id: "normal-ground-floor",
    title: "Normal Ground Floor Plan",
    prompt:
      "Create an exact ground floor residential floor plan for a 49 ft by 57 ft East-North plot with living, dining, kitchen, puja, parking, lobby, passage, stair, bedroom, bathroom and wash/store.",
  },
  {
    id: "exact-49x57-v6-layout",
    title: "Exact 49x57 V6 Layout",
    prompt:
      "Create the active V6 shared-edge exact ground floor layout for 49 ft by 57 ft plot. Keep connected mass, wall topology, door access, ventilation, wet plumbing, stair core, parking entry and professional output contract valid.",
  },
  {
    id: "g-plus-one-ground-core",
    title: "G+1 Ground Core Prompt",
    requirements: {
      floors: 1,
      bedrooms: 1,
      bathrooms: 1,
      parking: true,
      puja: true,
      kitchen: true,
      dining: true,
      stair: true,
      washStore: true,
      lobby: true,
      passage: true,
    },
    prompt:
      "Create a G+1 residential planning response but keep this output as the exact ground floor plan. Validate stair core for G+1, parking, kitchen, wash/store, bedroom, bathroom, living, dining, lobby and passage.",
  },
  {
    id: "parking-puja-kitchen-focus",
    title: "Parking Puja Kitchen Focus",
    prompt:
      "Create an exact ground floor plan where parking has front approach, puja is north-side, kitchen connects with dining and wash/store, and all rooms remain inside the 49 ft by 57 ft plot with professional labels and dimensions.",
  },
  {
    id: "door-window-command-guard",
    title: "Door Window Command Guard",
    prompt:
      "Create an exact ground floor plan with clear door access intent and window ventilation intent. Do not return a door/window schedule; keep command and asset type as ground_floor_plan.",
  },
];

function mergePayload(testCase) {
  const { requirements: caseRequirements, ...casePayload } = testCase;

  return {
    ...basePayload,
    ...casePayload,
    command: "ground_floor_plan",
    assetType: "ground_floor_plan",
    prompt: `${canonicalGroundPlanDirective}\n\n${testCase.prompt}`,
    requirements: {
      ...basePayload.requirements,
      ...(caseRequirements || {}),
      floors: 1,
      bedrooms: 1,
      bathrooms: 1,
      parking: true,
      puja: true,
      kitchen: true,
      dining: true,
      stair: true,
      washStore: true,
      lobby: true,
      passage: true,
    },
    projectId: `phase-47s-${testCase.id}`,
  };
}

function pickScore(data) {
  return (
    data?.scoreReport ||
    data?.asset?.scoreReport ||
    data?.asset?.planningJson?.scoreReport ||
    {}
  );
}

function summarizeCase(testCase, data, httpStatus) {
  const asset = data?.asset || {};
  const score = pickScore(data);
  const hard = score?.hardGeometryReport || {};
  const human = score?.humanPlanningReport || {};
  const planningSkillSummary = score?.planningSkillSummary || {};
  const finalGate = score?.finalExactAgentGate || {};

  const responseCommand = data?.command || asset?.command || null;
  const responseAssetType = data?.assetType || asset?.assetType || null;

  const requiredSkillStatuses = {};
  for (const report of planningSkillSummary?.reports || []) {
    if (!report || typeof report !== "object") continue;
    if (requiredSkillIds.includes(report.skillId)) {
      requiredSkillStatuses[report.skillId] = {
        status: report.status,
        total: report.total,
        blockers: report.blockers || [],
        warnings: report.warnings || [],
      };
    }
  }

  const missingInSummary = requiredSkillIds.filter((skillId) => !requiredSkillStatuses[skillId]);
  const failingInSummary = requiredSkillIds.filter(
    (skillId) => requiredSkillStatuses[skillId]?.status !== "pass"
  );

  const validationFailures = [];
  const validationReport = data?.validationReport || asset?.validationReport || [];
  for (const item of validationReport) {
    if (item && String(item.status).toLowerCase() === "fail") {
      validationFailures.push({
        id: item.id,
        check: item.check,
        note: item.note,
      });
    }
  }

  const isGround =
    responseCommand === "ground_floor_plan" ||
    responseAssetType === "ground_floor_plan";

  const accidentalSchedule =
    responseCommand === "door_window_schedule" ||
    responseAssetType === "door_window_schedule";

  const ok =
    httpStatus === 200 &&
    isGround &&
    !accidentalSchedule &&
    Boolean(score?.status) &&
    score?.exactAgentQualityGateFailed === false &&
    score?.planningSkillGateFailed === false &&
    score?.status === "pass" &&
    hard?.status === "pass" &&
    human?.status === "pass" &&
    finalGate?.status === "pass" &&
    finalGate?.professionalReady === true &&
    finalGate?.requiredSkillCount === requiredSkillIds.length &&
    Array.isArray(finalGate?.missingRequiredSkills) &&
    finalGate.missingRequiredSkills.length === 0 &&
    Array.isArray(finalGate?.failingRequiredSkills) &&
    finalGate.failingRequiredSkills.length === 0 &&
    missingInSummary.length === 0 &&
    failingInSummary.length === 0 &&
    validationFailures.length === 0 &&
    (score?.blockers || []).length === 0;

  return {
    id: testCase.id,
    title: testCase.title,
    ok,
    httpStatus,
    responseCommand,
    responseAssetType,
    responseHasScoreReport: Boolean(score?.status),
    accidentalSchedule,
    exactAgentQualityGateFailed: score?.exactAgentQualityGateFailed,
    planningSkillGateFailed: score?.planningSkillGateFailed,
    scoreReportStatus: score?.status,
    scoreReportTotal: score?.total,
    scoreReportBlockers: score?.blockers || [],
    hardGeometryStatus: hard?.status,
    humanPlanningStatus: human?.status,
    planningSkillSummaryStatus: planningSkillSummary?.status,
    planningSkillSummaryTotal: planningSkillSummary?.total,
    finalExactAgentGateStatus: finalGate?.status,
    finalExactAgentProfessionalReady: finalGate?.professionalReady,
    finalExactAgentRequiredSkillCount: finalGate?.requiredSkillCount,
    finalExactAgentMissingRequiredSkills: finalGate?.missingRequiredSkills || [],
    finalExactAgentFailingRequiredSkills: finalGate?.failingRequiredSkills || [],
    finalExactAgentReviewRequiredSkills: finalGate?.reviewRequiredSkills || [],
    missingInSummary,
    failingInSummary,
    validationFailures,
    requiredSkillStatuses,
  };
}

async function postWithTimeout(url, payload, timeoutMs = 150000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

await fs.mkdir(outDir, { recursive: true });

const results = [];

for (const testCase of cases) {
  const payload = mergePayload(testCase);
  const payloadPath = path.join(outDir, `${testCase.id}.payload.json`);
  const responsePath = path.join(outDir, `${testCase.id}.response.json`);

  await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");

  let httpStatus = 0;
  let data = null;
  let raw = "";

  try {
    const response = await postWithTimeout(`${baseUrl}/api/floor-plan/exact-agent`, payload);
    httpStatus = response.status;
    raw = response.text;
    await fs.writeFile(responsePath, raw, "utf8");

    try {
      data = JSON.parse(raw);
    } catch (error) {
      data = {
        parseError: String(error?.message || error),
        rawHead: raw.slice(0, 500),
      };
    }
  } catch (error) {
    raw = JSON.stringify({ requestError: String(error?.message || error) }, null, 2);
    await fs.writeFile(responsePath, raw, "utf8");
    data = { requestError: String(error?.message || error) };
  }

  const summary = summarizeCase(testCase, data, httpStatus);
  results.push(summary);

  console.log(
    JSON.stringify(
      {
        id: summary.id,
        ok: summary.ok,
        responseCommand: summary.responseCommand,
        responseAssetType: summary.responseAssetType,
        finalExactAgentGateStatus: summary.finalExactAgentGateStatus,
        professionalReady: summary.finalExactAgentProfessionalReady,
        scoreReportStatus: summary.scoreReportStatus,
        missingInSummary: summary.missingInSummary,
        failingInSummary: summary.failingInSummary,
      },
      null,
      2
    )
  );
}

const aggregate = {
  ok: results.every((item) => item.ok),
  caseCount: results.length,
  passedCount: results.filter((item) => item.ok).length,
  failedCases: results.filter((item) => !item.ok).map((item) => item.id),
  requiredSkillCount: requiredSkillIds.length,
  requiredSkillIds,
  results,
};

await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(aggregate, null, 2), "utf8");

console.log(JSON.stringify(aggregate, null, 2));

if (!aggregate.ok) {
  process.exit(1);
}
