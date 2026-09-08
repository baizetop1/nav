import type { TextEdge, TextIndex, TextNode } from '../types/text-network';
export interface GraphFilter { topicId?: string; focusId?: string; oneHop?: boolean; type?: string; recentDays?: number }
export function selectTextGraph(index: TextIndex, filter: GraphFilter = {}, now = new Date()): { nodes: TextNode[]; edges: TextEdge[]; total: number } {
  const byId = new Map(index.nodes.filter(node => /^https?:\/\//.test(node.url)).map(node => [node.id, node]));
  const edges = (index.edges || []).filter(edge => byId.has(edge.from) && byId.has(edge.to));
  const neighbours = (id: string) => new Set([id, ...edges.flatMap(edge => edge.from === id ? [edge.to] : edge.to === id ? [edge.from] : [])]);
  const topic = filter.topicId ? neighbours(filter.topicId) : null;
  const hop = filter.oneHop && filter.focusId ? neighbours(filter.focusId) : null;
  const matching = [...byId.values()].filter(node => (!topic || topic.has(node.id)) && (!hop || hop.has(node.id)) && (!filter.type || node.type === filter.type) && (!filter.recentDays || Date.parse(node.updatedAt || node.createdAt || '') >= now.getTime() - filter.recentDays * 86400000)).sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title, 'zh-CN'));
  const nodes = matching.slice(0, 300), visible = new Set(nodes.map(node => node.id));
  return { nodes, edges: edges.filter(edge => visible.has(edge.from) && visible.has(edge.to)), total: matching.length };
}
