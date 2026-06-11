# BuildSetu Phase 47Y Authenticated Tool-Runner Workflow Smoke

Generated: `2026-06-11T05:54:48.527064+00:00`

## Repo state

- Branch: `main`
- HEAD: `bc2fddc Record phase 47 production handover`

## Result

| Check | Result |
|---|---:|
| Direct exact-agent baseline | `True` |
| Authenticated `/api/tool-chat/run` | `True` |
| Project assets endpoint | `True` |
| Tool-runner needs patch | `False` |
| Functional patch required | `False` |

## Direct exact-agent baseline

| Field | Value |
|---|---|
| Command | `ground_floor_plan` |
| Asset type | `ground_floor_plan` |
| Score report | `pass` |
| Final exact-agent gate | `pass` |
| Professional ready | `True` |
| Room count | `11` |
| Image URL | `/api/ai/generated-image?file=generated%2Fai-images%2Fphase-47y-auth-tool-runner-verify%2Fexact-floor-plan-agent%2F1781156979791-ground-floor-plan.svg` |
| Plan JSON URL | `/api/ai/generated-image?file=generated%2Fai-images%2Fphase-47y-auth-tool-runner-verify%2Fexact-floor-plan-agent%2F1781156979791-ground-floor-plan.json` |

## Authenticated tool-runner response

| Field | Value |
|---|---|
| Top-level ok | `True` |
| Top-level success | `True` |
| Source | `hard_exact_plan_plus_openai_render_v2` |
| Generation mode | `openai-final-floor-plan` |
| Tool slug | `floor-plan-ai` |
| Project ID | `phase-47y-auth-tool-runner-verify` |
| Response command | `ground_floor_plan` |
| Response asset type | `ground_floor_plan` |
| Plan source | `exact_floor_plan_agent_v1` |
| Plan command | `ground_floor_plan` |
| Plan room count | `11` |
| Image URL | `/api/ai/generated-image?file=generated%2Fai-images%2Fphase-47y-auth-tool-runner-verify%2Ffloor-plan-fallback%2F1781156983063-ground-floor-plan-ground-floor-plan-fallback.svg` |
| Strict final gate exposed | `False` |

## Project assets/history

| Field | Value |
|---|---:|
| Item count | `3` |
| Tool image found | `True` |
| Exact-agent asset found | `True` |
| Ground-floor asset found | `True` |

## Decision

Authenticated user-facing workflow is functional.

No required code patch is needed because:

- Direct exact-agent baseline returns `ground_floor_plan`, `scoreReportStatus=pass`, `finalExactAgentGateStatus=pass`, and 11 rooms.
- Authenticated `/api/tool-chat/run` returns a successful floor-plan-ai response.
- Tool-runner plan source is `exact_floor_plan_agent_v1`.
- Tool-runner plan command is `ground_floor_plan`.
- Tool-runner plan room count is 11.
- Generated image is fetchable.
- Project assets endpoint contains the generated ground-floor output.

Optional future improvement: expose `scoreReport.finalExactAgentGate` in the top-level tool-chat response shape so future smoke tests can read the final gate directly from `/api/tool-chat/run`.

## Report directories

- 47Y-2 robust parser report: `/tmp/buildsetu_phase47y2_robust_tool_runner_parser_resume_20260611_112131`
- 47Z-A snapshot report: `/tmp/buildsetu_phase47za_record_auth_tool_runner_snapshot_20260611_112447`
