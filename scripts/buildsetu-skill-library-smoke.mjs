// BUILDSETU_SKILL_LIBRARY_SMOKE_V6
import fs from "node:fs";
import path from "node:path";

const required = [
  "lib/planning/skills/buildsetu-skill-types.ts",
  "lib/planning/skills/buildsetu-skill-utils.ts",
  "lib/planning/skills/buildsetu-geometry-skill.ts",
  "lib/planning/skills/buildsetu-polygon-geometry-skill.ts",
  "lib/planning/skills/buildsetu-wall-topology-skill.ts",
  "lib/planning/skills/buildsetu-building-envelope-skill.ts",
  "lib/planning/skills/buildsetu-human-flow-skill.ts",
  "lib/planning/skills/buildsetu-compactness-skill.ts",
  "lib/planning/skills/buildsetu-room-program-skill.ts",
  "lib/planning/skills/buildsetu-layout-candidate-generator-skill.ts",
  "lib/planning/skills/buildsetu-circulation-graph-skill.ts",
  "lib/planning/skills/buildsetu-vastu-preference-skill.ts",
  "lib/planning/skills/buildsetu-ventilation-skill.ts",
  "lib/planning/skills/buildsetu-planning-rag-skill.ts",
  "lib/planning/skills/buildsetu-skill-registry.ts",
  "lib/planning/skills/index.ts",
];

const missing = required.filter((file) => !fs.existsSync(path.join(process.cwd(), file)));

console.log(JSON.stringify({
  ok: missing.length === 0,
  requiredCount: required.length,
  missing,
}, null, 2));

if (missing.length) process.exit(1);
