import assert from 'node:assert/strict';
import {
  SHARED_SYNC_ENTRY_MAX_BYTES,
  classifyStorageError,
  getStoragePersistenceSnapshot,
  retryPendingLocalStorageWrites,
  safeSetLocalStorageItem,
  utf8ByteLength,
  writeStorageItem,
} from '../src/lib/safeStorage.ts';

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.failureName = '';
    this.writeCount = 0;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.writeCount += 1;
    if (this.failureName) {
      const error = new Error(this.failureName);
      Object.defineProperty(error, 'name', { value: this.failureName });
      throw error;
    }
    this.values.set(key, String(value));
  }

  removeItem(key) {
    if (this.failureName) {
      const error = new Error(this.failureName);
      Object.defineProperty(error, 'name', { value: this.failureName });
      throw error;
    }
    this.values.delete(key);
  }
}

assert.equal(utf8ByteLength('abc'), 3);
assert.equal(utf8ByteLength('白泽'), 6);
assert.equal(classifyStorageError({ name: 'QuotaExceededError' }), 'quota');
assert.equal(classifyStorageError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }), 'quota');
assert.equal(classifyStorageError({ name: 'SecurityError' }), 'permission');

const exact = '白'.repeat(Math.floor(SHARED_SYNC_ENTRY_MAX_BYTES / 3));
const over = exact + '白';
assert.ok(utf8ByteLength(exact) <= SHARED_SYNC_ENTRY_MAX_BYTES);
assert.ok(utf8ByteLength(over) > SHARED_SYNC_ENTRY_MAX_BYTES);

const preflightStorage = new MemoryStorage();
const oversize = writeStorageItem(preflightStorage, 'shared', over, {
  label: '共享数据',
  maxBytes: SHARED_SYNC_ENTRY_MAX_BYTES,
});
assert.equal(oversize.ok, false);
assert.equal(oversize.issue.kind, 'size-limit');
assert.equal(preflightStorage.writeCount, 0, 'oversize values must be rejected before storage.setItem');

const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const browserStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: browserStorage });

try {
  browserStorage.failureName = 'QuotaExceededError';
  const quota = safeSetLocalStorageItem('retry-key', 'pending', { label: '重试数据' });
  assert.equal(quota.ok, false);
  assert.equal(quota.issue.kind, 'quota');
  assert.ok(getStoragePersistenceSnapshot().issues.some(issue => issue.key === 'retry-key'));

  browserStorage.failureName = '';
  retryPendingLocalStorageWrites();
  assert.equal(browserStorage.getItem('retry-key'), 'pending');
  assert.ok(!getStoragePersistenceSnapshot().issues.some(issue => issue.key === 'retry-key'), 'successful retry must clear its issue');

  browserStorage.failureName = 'SecurityError';
  const denied = safeSetLocalStorageItem('permission-key', 'value', { label: '权限测试' });
  assert.equal(denied.ok, false);
  assert.equal(denied.issue.kind, 'permission');

  browserStorage.failureName = '';
  safeSetLocalStorageItem('permission-key', 'value', { label: '权限测试' });
  assert.ok(!getStoragePersistenceSnapshot().issues.some(issue => issue.key === 'permission-key'));

  const sharedLimit = safeSetLocalStorageItem('shared-limit-key', over, {
    label: '共享同步测试',
    maxBytes: SHARED_SYNC_ENTRY_MAX_BYTES,
  });
  assert.equal(sharedLimit.ok, false);
  assert.match(sharedLimit.issue.message, /512 KB/);
  safeSetLocalStorageItem('shared-limit-key', 'small', {
    label: '共享同步测试',
    maxBytes: SHARED_SYNC_ENTRY_MAX_BYTES,
  });
  assert.ok(!getStoragePersistenceSnapshot().issues.some(issue => issue.key === 'shared-limit-key'));
} finally {
  if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
  else delete globalThis.localStorage;
}

console.log('PASS safe storage: quota/security errors, UTF-8 512 KB preflight, pending retry, and issue recovery.');
