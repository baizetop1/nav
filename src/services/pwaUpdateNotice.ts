/** A banner describes an actual waiting UI version, not a stale reload boolean. */
export const APP_UPDATE_EVENT = 'baize:app-update-ready';
export const APP_UPDATE_DISMISSED_KEY = 'baize_app_update_dismissed_v1';
const LEGACY_READY_KEY = 'baize_app_update_ready';
const LEGACY_TARGET = 'legacy-waiting-worker';
const LEGACY_DISMISSED_KEY = 'baize_app_update_legacy_dismissed';
const BUILD_QUERY_TIMEOUT = 800;

export interface AppUpdateSnapshot { ready: boolean; buildId: string | null; appVersion: string | null }
interface WorkerIdentity { buildId: string | null; appVersion: string | null }
let snapshot: AppUpdateSnapshot = { ready: false, buildId: null, appVersion: null };
let targetVersion: string | null = null;
const dismissedInMemory = new Set<string>();

function clearLegacyReadyFlag(): void {
  try { sessionStorage.removeItem(LEGACY_READY_KEY); } catch { /* Optional UI metadata. */ }
}
function storage(kind: 'local' | 'session'): Storage | null {
  try { return kind === 'local' ? localStorage : sessionStorage; } catch { return null; }
}
function validVersion(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(value);
}
function savedDismissals(source: Storage | null): string[] {
  try {
    const raw = source?.getItem(APP_UPDATE_DISMISSED_KEY);
    if (!raw || raw.length > 4096) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.length <= 20 && value.every(validVersion) ? value : [];
  } catch { return []; }
}
function isDismissed(version: string): boolean {
  if (dismissedInMemory.has(version)) return true;
  if (version === LEGACY_TARGET) {
    try { return sessionStorage.getItem(LEGACY_DISMISSED_KEY) === 'true'; } catch { return false; }
  }
  return savedDismissals(storage('local')).includes(version) || savedDismissals(storage('session')).includes(version);
}
function rememberDismissal(version: string): void {
  dismissedInMemory.add(version);
  if (dismissedInMemory.size > 20) dismissedInMemory.delete(dismissedInMemory.values().next().value!);
  // Old workers without the protocol get only a tab-session dismissal, not a
  // permanent script-URL-based suppression of all future builds at /sw.js.
  if (version === LEGACY_TARGET) {
    try { sessionStorage.setItem(LEGACY_DISMISSED_KEY, 'true'); } catch { /* In-memory fallback. */ }
    return;
  }
  const remembered = [...new Set([
    ...savedDismissals(storage('local')), ...savedDismissals(storage('session')), ...dismissedInMemory,
  ])].filter(id => id !== LEGACY_TARGET).slice(-20);
  const value = JSON.stringify(remembered);
  for (const kind of ['local', 'session'] as const) {
    try {
      const source = storage(kind);
      source?.setItem(APP_UPDATE_DISMISSED_KEY, value);
      if (source?.getItem(APP_UPDATE_DISMISSED_KEY) === value) return;
    } catch { /* Try the tab-scoped store, then retain the in-memory preference. */ }
  }
}
function publish(next: AppUpdateSnapshot, version: string | null = null): void {
  targetVersion = version;
  if (snapshot.ready === next.ready && snapshot.buildId === next.buildId && snapshot.appVersion === next.appVersion) return;
  snapshot = next;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(APP_UPDATE_EVENT));
}
export function getAppUpdateSnapshot(): AppUpdateSnapshot { return { ...snapshot }; }
export function dismissAppUpdate(): void {
  if (targetVersion) rememberDismissal(targetVersion);
  clearLegacyReadyFlag();
  publish({ ...snapshot, ready: false }, targetVersion);
}
function workerIdentity(worker: ServiceWorker | null): Promise<WorkerIdentity> {
  const unknown = { buildId: null, appVersion: null };
  if (!worker || typeof MessageChannel === 'undefined') return Promise.resolve(unknown);
  return new Promise(resolve => {
    const channel = new MessageChannel();
    let done = false;
    const finish = (identity: WorkerIdentity) => {
      if (done) return;
      done = true; clearTimeout(timer);
      channel.port1.close(); channel.port2.close(); resolve(identity);
    };
    const timer = setTimeout(() => finish(unknown), BUILD_QUERY_TIMEOUT);
    channel.port1.onmessage = event => {
      const data: unknown = event.data;
      if (!data || typeof data !== 'object') return;
      const response = data as { type?: unknown; buildId?: unknown; appVersion?: unknown };
      if (response.type === 'BUILD_ID' && validVersion(response.buildId)) finish({
        buildId: response.buildId, appVersion: validVersion(response.appVersion) ? response.appVersion : null,
      });
    };
    try { worker.postMessage({ type: 'GET_BUILD_ID' }, [channel.port2]); } catch { finish(unknown); }
  });
}

/** Observes actual worker versions; it never activates a worker or reloads a page. */
export function watchAppUpdates(registration: ServiceWorkerRegistration, container: ServiceWorkerContainer = navigator.serviceWorker): () => void {
  let stopped = false, generation = 0;
  let installing: ServiceWorker | null = null;
  clearLegacyReadyFlag();
  const refresh = async () => {
    const current = ++generation, waiting = registration.waiting;
    clearLegacyReadyFlag();
    if (!waiting) { publish({ ready: false, buildId: null, appVersion: null }); return; }
    const active = container.controller;
    const [candidate, controlled] = await Promise.all([workerIdentity(waiting), workerIdentity(active)]);
    if (stopped || current !== generation || registration.waiting !== waiting || waiting.state === 'redundant' || waiting.state === 'activated') return;
    const dataOnly = Boolean(candidate.appVersion && candidate.appVersion === controlled.appVersion);
    const sameBuild = Boolean(candidate.buildId && candidate.buildId === controlled.buildId);
    const version = candidate.appVersion ?? candidate.buildId ?? LEGACY_TARGET;
    publish({ ready: !dataOnly && !sameBuild && !isDismissed(version), ...candidate }, version);
  };
  const stateChanged = () => {
    if (installing?.state === 'installed' || installing?.state === 'redundant') queueMicrotask(() => { if (!stopped) void refresh(); });
  };
  const updateFound = () => {
    installing?.removeEventListener('statechange', stateChanged);
    installing = registration.installing;
    installing?.addEventListener('statechange', stateChanged);
    if (installing?.state === 'installed') stateChanged();
  };
  const controllerChanged = () => {
    // Activation has already happened; it is not another pending update.
    generation += 1; clearLegacyReadyFlag();
    publish({ ready: false, buildId: null, appVersion: null });
  };
  const storageChanged = (event: StorageEvent) => {
    if ((event.key === APP_UPDATE_DISMISSED_KEY || event.key === null) && targetVersion) void refresh();
  };
  registration.addEventListener('updatefound', updateFound);
  container.addEventListener('controllerchange', controllerChanged);
  if (typeof window !== 'undefined') window.addEventListener('storage', storageChanged);
  updateFound(); void refresh();
  return () => {
    stopped = true; generation += 1;
    installing?.removeEventListener('statechange', stateChanged);
    registration.removeEventListener('updatefound', updateFound);
    container.removeEventListener('controllerchange', controllerChanged);
    if (typeof window !== 'undefined') window.removeEventListener('storage', storageChanged);
  };
}
