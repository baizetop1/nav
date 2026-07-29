import { BACKUP_STORAGE_KEYS, createBackup, parseBackup, restoreBackup } from '../src/lib/backup.ts';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const navigation = {
  sites: [{ id: 'site', name: 'Site', description: '', url: 'https://example.com', categoryId: 'tools', tags: [] }],
  categories: [{ id: 'tools', name: 'Tools', order: 1 }],
  layout: [{ siteId: 'site', order: 1, size: 'normal' }],
};
const source = new MemoryStorage();
source.setItem('theme', 'dark');
const backup = createBackup(navigation, source);
if (BACKUP_STORAGE_KEYS.some(key => !(key in backup.storage))) throw new Error('Backup omitted a storage key');
const target = new MemoryStorage();
target.setItem('unrelated', 'keep');
const restored = restoreBackup(JSON.stringify(backup), target);
if (restored.sites[0]?.id !== 'site' || target.getItem('theme') !== 'dark' || target.getItem('unrelated') !== 'keep') throw new Error('Restore failed');

const invalid = structuredClone(backup);
invalid.version = 2;
try {
  parseBackup(invalid);
  throw new Error('Unknown backup version was accepted');
} catch (error) {
  if (error.message === 'Unknown backup version was accepted') throw error;
}

console.log('backup self-check passed');
