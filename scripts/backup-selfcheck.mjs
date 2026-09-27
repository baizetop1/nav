import assert from 'node:assert/strict';
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

const legacyBackup = structuredClone(backup);
delete legacyBackup.storage.nav_click_stats_v2;
delete legacyBackup.storage.nav_translation_history;
delete legacyBackup.storage.scene_mode;
const parsedLegacy = parseBackup(legacyBackup);
if (parsedLegacy.storage.nav_click_stats_v2 !== null || parsedLegacy.storage.scene_mode !== null) throw new Error('Legacy backup compatibility failed');
const oversizedBackup = structuredClone(backup);
oversizedBackup.storage.nav_temp_text = '中'.repeat(200_000);
const atomicTarget = new MemoryStorage();
atomicTarget.setItem('theme', 'light');
assert.throws(() => restoreBackup(oversizedBackup, atomicTarget), /shared-sync limit/);
assert.equal(atomicTarget.getItem('theme'), 'light', 'oversized backup must fail before changing existing values');
assert.equal(atomicTarget.getItem('nav_temp_text'), null, 'oversized backup must not partially restore');


const invalid = structuredClone(backup);
invalid.version = 2;
try {
  parseBackup(invalid);
  throw new Error('Unknown backup version was accepted');
} catch (error) {
  if (error.message === 'Unknown backup version was accepted') throw error;
}

console.log('backup self-check passed');
