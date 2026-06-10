// BUILDSETU_CIRCULATION_GRAPH_SKILL_V1

import {
  createBuildSetuSkillReport,
  type BuildSetuPlanningContext,
  type BuildSetuPlanningSkill,
  type BuildSetuSkillCheck,
  type BuildSetuPlanningRoom,
} from "./buildsetu-skill-types";
import { bsuFindRoom, bsuRoomsNear } from "./buildsetu-skill-utils";

function roomLabel(room: BuildSetuPlanningRoom | null) {
  return room?.name || room?.id || "missing";
}

function hasPath(graph: Map<string, Set<string>>, start: string, end: string, visited = new Set<string>()): boolean {
  if (start === end) return true;
  if (visited.has(start)) return false;
  visited.add(start);

  for (const next of graph.get(start) || []) {
    if (hasPath(graph, next, end, visited)) return true;
  }

  return false;
}

export const buildSetuCirculationGraphSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.circulation-graph.v1",
  name: "BuildSetu Circulation Graph Skill",
  version: "1.0.0",
  category: "human-flow",
  run(context: BuildSetuPlanningContext) {
    const rooms = Array.isArray(context.rooms) ? context.rooms : [];
    const command = String(context.command || "").toLowerCase();
    const isGround = command.includes("ground");

    const living = bsuFindRoom(rooms, [/living/]);
    const dining = bsuFindRoom(rooms, [/dining/]);
    const kitchen = bsuFindRoom(rooms, [/kitchen/]);
    const wash = bsuFindRoom(rooms, [/wash/, /store/]);
    const bedroom = bsuFindRoom(rooms, [/bedroom/, /bed1/]);
    const bathroom = bsuFindRoom(rooms, [/bath/, /toilet/]);
    const lobby = bsuFindRoom(rooms, [/lobby/, /entry/]);
    const passage = bsuFindRoom(rooms, [/passage/]);
    const stair = bsuFindRoom(rooms, [/stair/]);

    const named: Array<[string, BuildSetuPlanningRoom | null]> = [
      ["lobby", lobby],
      ["living", living],
      ["passage", passage],
      ["dining", dining],
      ["kitchen", kitchen],
      ["wash", wash],
      ["bedroom", bedroom],
      ["bathroom", bathroom],
      ["stair", stair],
    ];

    const graph = new Map<string, Set<string>>();
    for (const [id] of named) graph.set(id, new Set<string>());

    for (let i = 0; i < named.length; i += 1) {
      for (let j = i + 1; j < named.length; j += 1) {
        const [aId, a] = named[i];
        const [bId, b] = named[j];
        if (bsuRoomsNear(a, b, 5)) {
          graph.get(aId)?.add(bId);
          graph.get(bId)?.add(aId);
        }
      }
    }

    const checks: BuildSetuSkillCheck[] = [];

    if (isGround) {
      const flowChecks: Array<[string, string, boolean, string]> = [
        ["entry-to-living-path", "Entry/lobby must reach living", hasPath(graph, "lobby", "living"), `${roomLabel(lobby)} to ${roomLabel(living)}`],
        ["living-to-dining-path", "Living must reach dining", hasPath(graph, "living", "dining"), `${roomLabel(living)} to ${roomLabel(dining)}`],
        ["dining-to-kitchen-path", "Dining must reach kitchen", hasPath(graph, "dining", "kitchen"), `${roomLabel(dining)} to ${roomLabel(kitchen)}`],
        ["kitchen-to-wash-path", "Kitchen must reach wash/store", hasPath(graph, "kitchen", "wash"), `${roomLabel(kitchen)} to ${roomLabel(wash)}`],
        ["bedroom-to-bathroom-path", "Bedroom must reach bathroom", hasPath(graph, "bedroom", "bathroom"), `${roomLabel(bedroom)} to ${roomLabel(bathroom)}`],
        ["stair-to-circulation-path", "Stair must reach circulation", hasPath(graph, "stair", "passage") || hasPath(graph, "stair", "lobby") || hasPath(graph, "stair", "living"), `${roomLabel(stair)} to circulation`],
      ];

      for (const [id, check, ok, note] of flowChecks) {
        checks.push({
          id,
          check,
          status: ok ? "pass" : "fail",
          note: ok ? `Connected: ${note}.` : `Disconnected path: ${note}.`,
          severity: ok ? "info" : "blocker",
        });
      }
    }

    const graphEdges = Array.from(graph.entries()).map(([from, tos]) => [from, Array.from(tos)]);

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: { graphEdges },
    });
  },
};
