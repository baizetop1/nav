import rawTechOsIndex from '../generated/tech-os-index.json';
import type { TechOsEntity, TechOsFieldValue, TechOsIndex, TechOsKind } from '../types/tech-os';

export const techOsIndex = rawTechOsIndex as TechOsIndex;

const entitiesById = new Map(techOsIndex.entities.map(entity => [entity.id, entity]));

export function getTechOsEntity(id: string | undefined): TechOsEntity | undefined {
  return id ? entitiesById.get(id) : undefined;
}

export function getTechOsEntities(kind: TechOsKind): TechOsEntity[] {
  return techOsIndex.entities.filter(entity => entity.kind === kind);
}

export function getTechOsField(entity: TechOsEntity, field: string): TechOsFieldValue | undefined {
  return entity.fields[field];
}

export function getTechOsString(entity: TechOsEntity, field: string): string {
  const value = getTechOsField(entity, field);
  return typeof value === 'string' ? value : '';
}

export function getTechOsNumber(entity: TechOsEntity, field: string): number | undefined {
  const value = getTechOsField(entity, field);
  return typeof value === 'number' ? value : undefined;
}

export function getTechOsIds(entity: TechOsEntity, field: string): string[] {
  const value = getTechOsField(entity, field);
  if (Array.isArray(value)) return value;
  return typeof value === 'string' && value ? [value] : [];
}

export function resolveTechOsIds(ids: string[]): TechOsEntity[] {
  return ids.map(id => entitiesById.get(id)).filter((entity): entity is TechOsEntity => Boolean(entity));
}

export function getTechOsRelations(entity: TechOsEntity): TechOsEntity[] {
  const ids = Object.entries(entity.fields).flatMap(([field, value]) => {
    if (!field.endsWith('_id') && !field.endsWith('_ids')) return [];
    return Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  });
  return resolveTechOsIds([...new Set(ids.filter(Boolean))]);
}
