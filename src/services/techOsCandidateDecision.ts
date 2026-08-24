import type { TechOsEntity } from '../types/tech-os';
import type { CandidateDecision, CandidateDecisionDraft } from '../types/tech-os-route-engine';

const DECISION_LABELS: Record<CandidateDecision, string> = {
  save_for_later: 'Save for Later',
  archive: 'Archive',
  not_interested: 'Not Interested',
};

export function createCandidateDecisionDraft(
  candidate: TechOsEntity,
  sourceContent: string,
  decision: CandidateDecision,
  reason: string,
  decided: string,
): CandidateDecisionDraft {
  if (candidate.kind !== 'route-seed' || candidate.status !== 'candidate') throw new Error('Only saved Candidate entities can receive a T4.3 decision.');
  const cleanReason = singleLine(reason);
  if (!cleanReason) throw new Error('Candidate decision reason is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(decided)) throw new Error('Candidate decision date must use YYYY-MM-DD.');
  const status = decision === 'save_for_later' ? 'candidate' : 'archived';
  const updated = updateFrontMatter(sourceContent, {
    status,
    decision,
    decision_reason: JSON.stringify(cleanReason),
    decided,
  });
  const content = replaceSection(updated, '当前决定', `${DECISION_LABELS[decision]}：${cleanReason}\n\n此决定不会切换 Main Route，也不会删除来源 Seed/Signal。`);
  return {
    key: `candidate-decision:${candidate.id}`,
    candidateId: candidate.id,
    decision,
    file: { path: candidate.sourcePath, content },
  };
}

function updateFrontMatter(source: string, updates: Record<string, string>): string {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) throw new Error('Candidate source is missing Front Matter.');
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('Candidate source has invalid Front Matter.');
  const lines = normalized.slice(4, end).split('\n');
  const pending = new Map(Object.entries(updates));
  const nextLines = lines.map(line => {
    const match = line.match(/^([a-z][a-z0-9_-]*):/i);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]) as string;
    pending.delete(match[1]);
    return `${match[1]}: ${value}`;
  });
  pending.forEach((value, key) => nextLines.push(`${key}: ${value}`));
  return `---\n${nextLines.join('\n')}\n---\n${normalized.slice(end + 5)}`;
}

function replaceSection(source: string, heading: string, content: string): string {
  const marker = `## ${heading}`;
  const start = source.indexOf(marker);
  if (start < 0) return `${source.trimEnd()}\n\n${marker}\n\n${content}\n`;
  const bodyStart = source.indexOf('\n', start + marker.length);
  const nextHeading = source.indexOf('\n## ', bodyStart + 1);
  const end = nextHeading < 0 ? source.length : nextHeading + 1;
  return `${source.slice(0, bodyStart + 1)}\n${content}\n\n${source.slice(end)}`.trimEnd() + '\n';
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
