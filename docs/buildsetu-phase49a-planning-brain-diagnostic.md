# BuildSetu Phase 49A Planning Brain Diagnostic

Generated: `2026-06-11T07:28:54.214171+00:00`

## Repo state

- Branch: `main`
- HEAD: `15cbde4 Record manual browser click test`

## Finding

The current workflow and customer actions are working, but the planning brain still needs upgrade.

Main issue:

`Agent validates generated layouts but does not yet behave like a true planning brain with multi-candidate generation, iterative correction and visual label-fit validation.`

## Runtime sample

| Check | Result |
|---|---:|
| OK | `True` |
| Command | `ground_floor_plan` |
| Room count | `11` |
| Score status | `pass` |
| Score total | `77` |
| Hard geometry | `pass` |
| Planning skill summary | `review` |
| Final exact-agent gate | `pass` |
| Professional ready | `True` |

## Required Phase 49B planner stages

- Normalize plot orientation and drawing convention.
- Extract room program from user prompt and project data.
- Generate at least 3 candidate layouts instead of one fixed layout.
- Score each candidate using hard geometry, room adjacency, circulation, compactness, parking entry, stair core, wet plumbing, ventilation and professional output checks.
- Reject candidates with overlap, boundary errors, disconnected circulation or unreadable room labels.
- Auto-revise best candidate until score threshold is met.
- Render only after best candidate passes planning gate.
- Add SVG label-fit rules so labels never overlap or clip.

## Minimum acceptance for 49B

- Candidate layouts: `>=3`
- Final score: `>=85`
- Hard geometry: `pass`
- Final exact-agent gate: `pass`
- Visual label overlap: `0`
- Room overlap: `0`
- All rooms inside plot: `true`

## Implementation targets

- `app/api/floor-plan/exact-agent/route.ts`
- `lib/planning/skills/buildsetu-layout-candidate-generator-skill.ts`
- `lib/planning/skills/buildsetu-circulation-graph-skill.ts`
- `lib/planning/skills/buildsetu-professional-output-contract-skill.ts`
