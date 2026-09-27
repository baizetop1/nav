import { getTechOsHeadingStepId, techOsMarkdownPlainText } from './techOsMarkdown.ts';

export interface QuestCoachingSection {
  title: string;
  /** Raw Markdown with normalized newlines and surrounding blank lines removed. */
  body: string;
}

export interface QuestCoachingStep extends QuestCoachingSection {
  id: string;
  /** Text before the first H4; empty when the whole step uses the body fallback. */
  intro: string;
  /** Level-four subsections; body above also preserves the complete step source. */
  sections: QuestCoachingSection[];
}

export interface QuestCoaching {
  preparation: QuestCoachingSection[];
  steps: QuestCoachingStep[];
  available: boolean;
}

export interface QuestCoachingAssessment {
  /** A structural/content-presence gate, not a correctness or safety verdict. */
  status: 'outline' | 'incomplete' | 'ready';
  issues: string[];
}

export const QUEST_COACHING_PREPARATION_TITLES = ['开始前', '学习思路', '工具准备'] as const;
export const QUEST_COACHING_SECTION_TITLES = [
  '为什么这样做', '工具与操作', '观察与预期', '常见误区',
  '卡住时怎么办', '检查理解', '参考答案', '完成标志',
] as const;

interface RawQuestCoaching {
  preparation: QuestCoachingSection[];
  steps: QuestCoachingStep[];
  duplicateStepIds: string[];
}

interface Heading {
  line: number;
  level: number;
  title: string;
  stepId?: string;
  stepTitle?: string;
}

function markdownBody(lines: string[], from: number, to: number): string {
  // Trim blank lines, not indentation: an indented code sample is still Markdown.
  while (from < to && !lines[from].trim()) from += 1;
  while (to > from && !lines[to - 1].trim()) to -= 1;
  return lines.slice(from, to).join('\n');
}

function readHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  let closeFence: RegExp | null = null;
  for (let line = 0; line < lines.length; line += 1) {
    const source = lines[line];
    if (closeFence) {
      if (closeFence.test(source)) closeFence = null;
      continue;
    }
    // Same fence lengths/characters and ATX heading syntax as techOsMarkdown.
    const fence = source.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      closeFence = new RegExp(`^[ \\t]*${fence[1][0]}{${fence[1].length},}[ \\t]*$`);
      continue;
    }
    const match = source.match(/^ {0,3}(#{1,6})[ \t]+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const rawTitle = match[2].replace(/[ \t]+#+[ \t]*$/, '').trim();
    const title = techOsMarkdownPlainText(rawTitle).trim();
    const stepId = getTechOsHeadingStepId(level, rawTitle);
    const stepTitle = stepId ? techOsMarkdownPlainText(rawTitle.replace(/^S\d+\s*[·:：.\-—]\s*/i, '')).trim() : undefined;
    headings.push({ line, level, title, ...(stepId && stepTitle ? { stepId, stepTitle } : {}) });
  }
  return headings;
}

const preparationKind = (title: string): string | undefined => title.match(/^(开始前|学习思路|工具准备|课前工具准备)(?:\s*[:：·—-]|\s*$)/)?.[1];
const sectionName = (title: string): string => title.replace(/[：:]\s*$/, '').trim();

function parseRawQuestCoaching(body: string): RawQuestCoaching {
  if (typeof body !== 'string' || !body.trim()) return { preparation: [], steps: [], duplicateStepIds: [] };
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const headings = readHeadings(lines);
  const firstStepLine = headings.find(heading => heading.stepId)?.line ?? lines.length;
  const preparation: QuestCoachingSection[] = [];
  const steps: QuestCoachingStep[] = [];
  const seenSteps = new Set<string>();
  const duplicateStepIds = new Set<string>();

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (heading.level === 2 && heading.line < firstStepLine && preparationKind(heading.title)) {
      const nextSection = headings.slice(index + 1).find(next => next.level <= 2)?.line ?? lines.length;
      preparation.push({ title: heading.title, body: markdownBody(lines, heading.line + 1, Math.min(nextSection, firstStepLine)) });
    }
    if (!heading.stepId) continue;
    if (seenSteps.has(heading.stepId)) { duplicateStepIds.add(heading.stepId); continue; }
    seenSteps.add(heading.stepId);
    // Every parent/sibling heading closes the step, including end-of-Quest notes.
    const nextSibling = headings.slice(index + 1).find(next => next.level <= 3)?.line ?? lines.length;
    const subsections = headings.slice(index + 1).filter(next => next.line < nextSibling && next.level === 4);
    const sections = subsections.map((section, sectionIndex) => ({
      title: sectionName(section.title),
      body: markdownBody(lines, section.line + 1, subsections[sectionIndex + 1]?.line ?? nextSibling),
    }));
    steps.push({
      id: heading.stepId,
      title: heading.stepTitle!,
      body: markdownBody(lines, heading.line + 1, nextSibling),
      intro: subsections.length ? markdownBody(lines, heading.line + 1, subsections[0].line) : '',
      sections,
    });
  }

  return { preparation, steps, duplicateStepIds: [...duplicateStepIds] };
}

// Only test whole instructional lines, never a substring in a real explanation.
// In particular, a lesson can legitimately discuss TODO comments or ask learners
// to fill an observation table. Those are not unfinished teaching instructions.
function isPlaceholderLine(line: string): boolean {
  return /^(?:(?:尚)?待(?:编写|补充|填写)|占位(?:模板|内容)?)(?:\s*[:：、，。.!！?？…-]|\s*$)/i.test(line)
    || /^(?:TODO|TBD)(?:\s*[:：、，。.!！?？…-]|\s*$|\s+(?:write|fill|add|implement|complete|describe)\b)/i.test(line);
}

function instructionContent(body: string): { empty: boolean; placeholder: boolean } {
  const source = body.replace(/<!--[\s\S]*?-->/g, '');
  const lines = source.split('\n');
  const content: string[] = [];
  let hasEmptyObservationCells = false;
  let closeFence: RegExp | null = null;
  const plain = (line: string) => techOsMarkdownPlainText(line).trim();
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (closeFence) {
      if (closeFence.test(raw)) closeFence = null;
      else if (raw.trim()) content.push(plain(raw));
      continue;
    }
    const fence = raw.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      closeFence = new RegExp(`^[ \\t]*${fence[1][0]}{${fence[1].length},}[ \\t]*$`);
      continue;
    }
    // Table headings/separators do not provide teaching by themselves. Ignore
    // empty learner-response rows while preserving actual example/expected data.
    const tableCells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(plain);
    const separator = (line: string) => line.trim().startsWith('|') && tableCells(line).every(cell => /^:?-{3,}:?$/.test(cell));
    if (raw.trim().startsWith('|')) {
      if (separator(raw) || (index + 1 < lines.length && separator(lines[index + 1]))) continue;
      const cells = tableCells(raw).filter(Boolean);
      const teachingCells = cells.filter(cell => !isPlaceholderLine(cell) && !/^[-—…]+$/.test(cell));
      if (teachingCells.length) content.push(teachingCells.join(' '));
      else if (cells.length) hasEmptyObservationCells = true;
      continue;
    }
    const text = plain(raw.replace(/^\s*(?:>\s*)*(?:(?:[-*+]\s+|\d+[.)]\s+)(?:\[[ xX]\]\s*)?)?/, ''));
    if (text && !/^#{1,6}\s|^[-*_]{3,}$/.test(text)) content.push(text);
  }
  if (!content.length) return { empty: !hasEmptyObservationCells, placeholder: hasEmptyObservationCells };
  // A leading authoring instruction explicitly declares an unfinished section,
  // even when the rest of that instruction explains what the author must write.
  if (isPlaceholderLine(content[0])) return { empty: false, placeholder: true };
  const placeholders = content.filter(isPlaceholderLine);
  const substantial = content.filter(line => !isPlaceholderLine(line));
  const weight = (entries: string[]) => entries.reduce((sum, line) => sum + line.length, 0);
  return {
    empty: false,
    placeholder: placeholders.length >= substantial.length && weight(placeholders) >= weight(substantial),
  };
}

function assessParsedCoaching(body: string, parsed: RawQuestCoaching): QuestCoachingAssessment {
  if (typeof body !== 'string' || !body.trim()) return { status: 'outline', issues: ['教案正文为空，尚未编写学习步骤。'] };
  if (!parsed.steps.length) return { status: 'outline', issues: ['尚无有效的 S 编号学习步骤，当前仅可作为大纲。'] };
  const issues: string[] = parsed.duplicateStepIds.map(id => `步骤编号 ${id} 重复，请使用唯一编号。`);
  const checkContent = (label: string, sections: QuestCoachingSection[]) => {
    if (!sections.length) { issues.push(`缺少${label}。`); return; }
    if (sections.length > 1) issues.push(`${label}重复，请合并为一个明确章节。`);
    const content = instructionContent(sections[0].body);
    if (content.empty) issues.push(`${label}缺少教学内容。`);
    else if (content.placeholder) issues.push(`${label}仍是待编写的占位内容。`);
  };
  for (const name of QUEST_COACHING_PREPARATION_TITLES) {
    checkContent(`课前「${name}」`, parsed.preparation.filter(section => {
      const kind = preparationKind(section.title);
      return kind === name || (name === '工具准备' && kind === '课前工具准备');
    }));
  }
  for (const step of parsed.steps) {
    for (const name of QUEST_COACHING_SECTION_TITLES) {
      checkContent(`步骤 ${step.id} 的「${name}」`, step.sections.filter(section => sectionName(section.title) === name));
    }
  }
  return { status: issues.length ? 'incomplete' : 'ready', issues };
}

/** Check teaching structure and obvious authoring placeholders only. “ready”
 * never certifies factual accuracy, runnable tools or completed learner work. */
export function assessQuestCoaching(body: string): QuestCoachingAssessment {
  return assessParsedCoaching(body, parseRawQuestCoaching(body));
}

/** Extract coaching directly from the Quest Markdown without inventing lessons.
 * Legacy/incomplete lessons remain readable but cannot enable guided coaching. */
export function parseQuestCoaching(body: string): QuestCoaching {
  const parsed = parseRawQuestCoaching(body);
  return { preparation: parsed.preparation, steps: parsed.steps, available: assessParsedCoaching(body, parsed).status === 'ready' };
}
