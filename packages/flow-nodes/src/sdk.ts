import { z } from 'zod';
import type { FlowGraphDTO, FlowNodeBase } from '@mysbc/shared';

export type NodeValidator = (node: FlowNodeBase, graph: FlowGraphDTO) => void;

export interface FlowNodeDefinition {
  type: FlowNodeBase['type'];
  label: string;
  inputSchema?: z.ZodTypeAny;
  validate?: NodeValidator;
}

export interface FlowNodesRegistry {
  get(type: string): FlowNodeDefinition | undefined;
  all(): FlowNodeDefinition[];
}

export class InMemoryFlowNodesRegistry implements FlowNodesRegistry {
  private readonly map = new Map<string, FlowNodeDefinition>();

  register(def: FlowNodeDefinition) {
    this.map.set(def.type, def);
  }

  get(type: string) {
    return this.map.get(type);
  }

  all() {
    return Array.from(this.map.values());
  }
}

export function validateGraphConnectivity(graph: FlowGraphDTO) {
  const start = graph.nodes.find(n => n.type === 'start');
  const endIdSet = new Set(graph.nodes.filter(n => n.type === 'end').map(n => n.id));
  if (!start) throw new Error('Flow must contain a start node');
  if (endIdSet.size === 0) throw new Error('Flow must contain an end node');
  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = adj.get(edge.source) ?? [];
    list.push(edge.target);
    adj.set(edge.source, list);
  }
  const visited = new Set<string>();
  const stack = [start.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const next = adj.get(id) ?? [];
    for (const t of next) stack.push(t);
  }
  // All nodes must be reachable and at least one end reachable
  const unreachable = graph.nodes.filter(n => !visited.has(n.id));
  if (unreachable.length) throw new Error('Graph has unreachable nodes');
  const endReachable = graph.nodes.some(n => n.type === 'end' && visited.has(n.id));
  if (!endReachable) throw new Error('Flow must have a path to an end node');
}

