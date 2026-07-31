export type SceneMode = 'default' | 'work' | 'study' | 'relax';

export const SCENE_MODE_KEY = 'scene_mode';

export function loadSceneMode(storage: Pick<Storage, 'getItem'> = localStorage): SceneMode {
  const saved = storage.getItem(SCENE_MODE_KEY);
  if (saved === 'default' || saved === 'work' || saved === 'study' || saved === 'relax') return saved;
  return storage.getItem('work_mode') === 'true' ? 'work' : 'default';
}
