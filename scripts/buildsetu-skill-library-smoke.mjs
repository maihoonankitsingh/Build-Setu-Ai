// BUILDSETU_SKILL_LIBRARY_SMOKE_V1
import fs from "node:fs";
import path from "node:path";

const required = [
  "lib/planning/skills/buildsetu-skill-types.ts",
  "lib/planning/skills/buildsetu-skill-utils.ts",
  "lib/planning/skills/buildsetu-geometry-skill.ts",
  "lib/planning/skills/buildsetu-human-flow-skill.ts",
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
