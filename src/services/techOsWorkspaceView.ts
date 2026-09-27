import type { TechOsEntity } from '../types/tech-os.ts';

export const TECH_OS_READ_STEP_EVENT = 'baize-tech-os-read-step';

export function filterTechOsEntities(entities: TechOsEntity[], query: string, status = 'all'): TechOsEntity[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entities.filter(entity => {
    if (status !== 'all' && entity.status !== status) return false;
    const searchable = [entity.id, entity.title, entity.kind, entity.status, ...entity.tags, entity.body].join('\n').toLocaleLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}

/** A stale selection from another collection must never leak into its viewer. */
export function selectTechOsCollectionEntity(entities: TechOsEntity[], focusedId: string): TechOsEntity | undefined {
  return entities.find(entity => entity.id === focusedId) || entities[0];
}

export function focusTechOsStudyStep(questId: string, stepId: string): boolean {
  // Guided readers may need to mount a different step before focusing it.
  if (!window.dispatchEvent(new CustomEvent(TECH_OS_READ_STEP_EVENT, { detail: { questId, stepId }, cancelable: true }))) return true;
  const heading = document.getElementById(`${questId}-step-${stepId}`);
  if (!heading) return false;
  heading.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  heading.focus({ preventScroll: true });
  return true;
}
