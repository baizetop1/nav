import type { TechOsEntity, TechOsIndex } from '../types/tech-os';
import type { GeneratedRouteDraft, ManualRouteInput, ManualRouteSuggestion, RouteDraftValues } from '../types/tech-os-route-engine';
import { createBacklogRouteDraft } from './techOsBacklogRouteDraft.ts';

const TOPIC_TEMPLATES: Array<{ pattern: RegExp; tag: string; outline: string[] }> = [
  { pattern: /集成电路|芯片|ic|asic|cmos/i, tag: 'ic', outline: ['MOSFET', 'CMOS', 'Logic Gate', 'Combinational Logic', 'Sequential Logic', 'Verilog / RTL', 'FPGA / Synthesis', 'Timing / ASIC Flow'] },
  { pattern: /cpu|处理器|指令|risc-v/i, tag: 'cpu', outline: ['Instruction Set', 'Register', 'Datapath', 'ALU', 'Control Unit', 'Pipeline', 'Cache', 'RISC-V Lab'] },
  { pattern: /网络|network|tcp|routing|bgp/i, tag: 'networking', outline: ['Packet & Address', 'Ethernet / ARP', 'IP Routing', 'TCP', 'DNS', 'BGP', 'CDN', 'Network Lab'] },
  { pattern: /linux|操作系统|内核|进程/i, tag: 'system', outline: ['Process', 'Virtual Memory', 'File System', 'System Call', 'Scheduling', 'Networking', 'Container', 'Kernel Lab'] },
  { pattern: /安全|security|tls|pki|认证/i, tag: 'security', outline: ['Threat Model', 'TLS / PKI', 'Cookie / Session', 'Authentication', 'Authorization', 'Web Vulnerability', 'Hardening Lab'] },
  { pattern: /编译器|compiler|语言实现/i, tag: 'compiler', outline: ['Lexer', 'Parser', 'AST', 'Type System', 'IR', 'Optimization', 'Code Generation', 'Compiler Project'] },
  { pattern: /ai|人工智能|模型|llm/i, tag: 'ai', outline: ['Linear Algebra', 'Optimization', 'Neural Network', 'Transformer', 'Training', 'Inference', 'Evaluation', 'AI Systems Project'] },
];

export function buildManualRouteSuggestion(index: TechOsIndex, input: ManualRouteInput, reservedRouteIds: string[] = []): ManualRouteSuggestion {
  const topic = singleLine(input.topic);
  const reason = singleLine(input.reason);
  const expectedOutcome = input.expectedOutcome.trim();
  if (!topic || !reason || !expectedOutcome) throw new Error('Manual Route requires topic, reason and expected outcome.');
  const template = TOPIC_TEMPLATES.find(item => item.pattern.test(topic));
  const outline = template?.outline || [`${topic} 基础概念`, '关键机制与系统边界', '最小可验证实验', '综合 Project 与复盘'];
  const tags = template ? [template.tag] : [slugTag(topic)];
  const matchedKnowledgeIds = index.entities.filter(entity => entity.kind === 'knowledge' && matchesTopic(entity, topic, tags)).map(entity => entity.id);
  const routeId = nextRouteId(index.entities, new Set(reservedRouteIds));
  return {
    id: `manual:${routeId}`,
    routeId,
    filePath: `tech-os/routes/backlog/${routeId}.md`,
    visionId: index.state.visionId,
    title: `${topic} 学习路线`,
    reason,
    expectedOutcome,
    outline,
    tags,
    matchedKnowledgeIds,
  };
}

export function getDefaultManualRouteValues(suggestion: ManualRouteSuggestion): RouteDraftValues {
  return { title: suggestion.title, reason: suggestion.reason, expectedOutcome: suggestion.expectedOutcome, outline: [...suggestion.outline] };
}

export function createManualRouteDraft(suggestion: ManualRouteSuggestion, values: RouteDraftValues, created: string): GeneratedRouteDraft {
  return createBacklogRouteDraft({
    key: suggestion.id,
    routeId: suggestion.routeId,
    filePath: suggestion.filePath,
    visionId: suggestion.visionId,
    source: 'manual',
    originId: suggestion.visionId,
    routeSeedIds: [],
    tags: suggestion.tags,
    existingKnowledgeIds: suggestion.matchedKnowledgeIds,
  }, values, created);
}

function nextRouteId(entities: TechOsEntity[], reserved: Set<string>): string {
  let number = entities.filter(entity => entity.kind === 'route').reduce((max, entity) => {
    const match = entity.id.match(/^ROUTE-(\d+)$/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
  while (reserved.has(`ROUTE-${String(number).padStart(3, '0')}`)) number += 1;
  return `ROUTE-${String(number).padStart(3, '0')}`;
}

function matchesTopic(entity: TechOsEntity, topic: string, tags: string[]): boolean {
  const haystack = `${entity.title} ${entity.tags.join(' ')}`.toLocaleLowerCase('zh-CN');
  return topic.toLocaleLowerCase('zh-CN').split(/\s+/).some(token => token.length > 1 && haystack.includes(token)) || tags.some(tag => entity.tags.includes(tag));
}

function slugTag(value: string): string {
  return value.toLocaleLowerCase('zh-CN').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 40) || 'manual-route';
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
