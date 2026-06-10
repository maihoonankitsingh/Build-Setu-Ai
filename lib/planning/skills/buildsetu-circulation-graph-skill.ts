// BUILDSETU_CIRCULATION_GRAPH_SKILL_V2
// External OSS skill dependency: graphology

import Graph from "graphology";
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

function hasGraphPath(graph: Graph, start: string, end: string) {
  if (!graph.hasNode(start) || !graph.hasNode(end)) return false;
  if (start === end) return true;

  const visited = new Set<string>();
  const queue: string[] = [start];

  while (queue.length) {
    const node = queue.shift();
    if (!node || visited.has(node)) continue;
    if (node === end) return true;

    visited.add(node);

    for (const next of graph.neighbors(node)) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return false;
}

export const buildSetuCirculationGraphSkill: BuildSetuPlanningSkill = {
  id: "buildsetu.circulation-graph.v2",
  name: "BuildSetu Circulation Graph Skill",
  version: "2.0.0",
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

    const graph = new Graph({ type: "undirected", allowSelfLoops: false });

    for (const [id, room] of named) {
      graph.mergeNode(id, {
        label: roomLabel(room),
        exists: Boolean(room),
      });
    }

    for (let i = 0; i < named.length; i += 1) {
      for (let j = i + 1; j < named.length; j += 1) {
        const [aId, a] = named[i];
        const [bId, b] = named[j];

        if (bsuRoomsNear(a, b, 5)) {
          graph.mergeEdge(aId, bId, {
            relation: "near-or-adjacent",
          });
        }
      }
    }

    const checks: BuildSetuSkillCheck[] = [];

    if (isGround) {
      const flowChecks: Array<[string, string, boolean, string]> = [
        ["entry-to-living-path", "Entry/lobby must reach living", hasGraphPath(graph, "lobby", "living"), `${roomLabel(lobby)} to ${roomLabel(living)}`],
        ["living-to-dining-path", "Living must reach dining", hasGraphPath(graph, "living", "dining"), `${roomLabel(living)} to ${roomLabel(dining)}`],
        ["dining-to-kitchen-path", "Dining must reach kitchen", hasGraphPath(graph, "dining", "kitchen"), `${roomLabel(dining)} to ${roomLabel(kitchen)}`],
        ["kitchen-to-wash-path", "Kitchen must reach wash/store", hasGraphPath(graph, "kitchen", "wash"), `${roomLabel(kitchen)} to ${roomLabel(wash)}`],
        ["bedroom-to-bathroom-path", "Bedroom must reach bathroom", hasGraphPath(graph, "bedroom", "bathroom"), `${roomLabel(bedroom)} to ${roomLabel(bathroom)}`],
        ["stair-to-circulation-path", "Stair must reach circulation", hasGraphPath(graph, "stair", "passage") || hasGraphPath(graph, "stair", "lobby") || hasGraphPath(graph, "stair", "living"), `${roomLabel(stair)} to circulation`],
      ];

      for (const [id, check, ok, note] of flowChecks) {
        checks.push({
          id,
          check,
          status: ok ? "pass" : "fail",
          note: ok ? `Connected by Graphology path: ${note}.` : `Disconnected Graphology path: ${note}.`,
          severity: ok ? "info" : "blocker",
        });
      }
    }

    const graphEdges = graph.edges().map((edge) => ({
      source: graph.source(edge),
      target: graph.target(edge),
      relation: graph.getEdgeAttribute(edge, "relation"),
    }));

    return createBuildSetuSkillReport({
      skillId: this.id,
      skillName: this.name,
      version: this.version,
      checks,
      metadata: {
        externalLibrary: "graphology",
        graphNodeCount: graph.order,
        graphEdgeCount: graph.size,
        graphEdges,
      },
    });
  },
};
