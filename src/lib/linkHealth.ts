export interface LinkHealthEntry {
  siteId: string;
  url: string;
  status: number | null;
  ok: boolean;
  reachable?: boolean;
  restricted?: boolean;
  checkedAt: string;
  error: string | null;
  source?: 'github-actions' | 'browser';
  consecutiveFailures?: number;
  confirmedFailure?: boolean;
  lastSuccessfulAt?: string | null;
  failureKind?: 'http' | 'not-found' | 'server' | 'timeout' | 'dns' | 'tls' | 'network' | null;
}

export type LinkHealthState = 'healthy' | 'warning' | 'unhealthy' | 'unchecked';

export function getLinkHealthState(entry?: LinkHealthEntry): LinkHealthState {
  if (!entry) return 'unchecked';
  if (entry.ok || entry.restricted) return 'healthy';
  if (entry.source === 'browser') return 'warning';
  return entry.confirmedFailure || (entry.consecutiveFailures ?? 1) >= 2 ? 'unhealthy' : 'warning';
}

export interface BrowserLinkCheckOptions {
  timeoutMs?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

export interface LoadLinkHealthOptions {
  signal?: AbortSignal;
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const MAX_REPORT_ENTRIES = 10_000;
const MAX_ERROR_LENGTH = 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text || null;
}

function readHttpUrl(value: unknown): string | null {
  const text = readRequiredText(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : null;
  } catch {
    return null;
  }
}

function readStatus(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : undefined;
}

function isCountedHttpFailure(status: number): boolean {
  return status === 404 || status === 410 || status >= 500;
}

function isRestrictedHttpStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 404 && status !== 410;
}

function parseEntry(value: unknown): LinkHealthEntry | null {
  if (!isRecord(value)) return null;

  const siteId = readRequiredText(value.siteId);
  const url = readHttpUrl(value.url);
  const status = readStatus(value.status);
  const checkedAt = readRequiredText(value.checkedAt);
  const checkedAtTime = checkedAt ? Date.parse(checkedAt) : Number.NaN;

  if (
    !siteId
    || !url
    || status === undefined
    || typeof value.ok !== 'boolean'
    || !checkedAt
    || !Number.isFinite(checkedAtTime)
    || (value.error !== null && typeof value.error !== 'string')
  ) return null;

  const error = typeof value.error === 'string'
    ? value.error.trim().slice(0, MAX_ERROR_LENGTH) || null
    : null;

  const source = value.source === 'browser' || value.source === 'github-actions' ? value.source : undefined;
  // Old reports stored every non-2xx response as `ok: false`. Normalize HTTP
  // responses that prove reachability (401/403/405/429, etc.) while parsing so
  // existing Pages deployments stop showing false failures immediately.
  const restricted = status !== null && isRestrictedHttpStatus(status);
  const normalizedOk = value.ok || (status !== null && !isCountedHttpFailure(status));
  const reachable = normalizedOk || status !== null
    ? true
    : typeof value.reachable === 'boolean' ? value.reachable : false;
  const consecutiveFailures = typeof value.consecutiveFailures === 'number' && Number.isInteger(value.consecutiveFailures) && value.consecutiveFailures >= 0
    ? normalizedOk ? 0 : Math.min(value.consecutiveFailures, 99)
    : normalizedOk ? 0 : 1;
  const lastSuccessfulAt = value.lastSuccessfulAt === null
    ? null
    : typeof value.lastSuccessfulAt === 'string' && Number.isFinite(Date.parse(value.lastSuccessfulAt))
      ? value.lastSuccessfulAt
      : undefined;
  const declaredFailureKind = ['http', 'not-found', 'server', 'timeout', 'dns', 'tls', 'network'].includes(String(value.failureKind))
    ? value.failureKind as LinkHealthEntry['failureKind']
    : value.failureKind === null ? null : undefined;
  const failureKind = normalizedOk
    ? null
    : status === 404 || status === 410
      ? 'not-found'
      : status !== null && status >= 500
        ? 'server'
        : declaredFailureKind;
  return {
    siteId,
    url,
    status,
    ok: normalizedOk,
    reachable,
    restricted,
    checkedAt,
    error,
    ...(source ? { source } : {}),
    consecutiveFailures,
    confirmedFailure: !normalizedOk && (value.confirmedFailure === true || consecutiveFailures >= 2),
    ...(normalizedOk ? { lastSuccessfulAt: lastSuccessfulAt ?? checkedAt } : lastSuccessfulAt !== undefined ? { lastSuccessfulAt } : {}),
    ...(failureKind !== undefined ? { failureKind } : {}),
  };
}

/**
 * Performs a best-effort browser reachability check. Cross-origin responses
 * are intentionally opaque, so a successful request means "reachable" but
 * cannot expose an HTTP status. This is a useful fallback when no PAT is set;
 * the GitHub Actions check remains the authoritative status check.
 */
export async function checkLinksFromBrowser(
  sites: Array<{ id: string; url: string }>,
  options: BrowserLinkCheckOptions = {},
): Promise<LinkHealthEntry[]> {
  const timeoutMs = Math.max(2_000, Math.min(options.timeoutMs ?? 8_000, 30_000));
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 12));
  const checkedAt = new Date().toISOString();
  const report = new Array<LinkHealthEntry>(sites.length);
  let next = 0;

  const check = async (site: { id: string; url: string }): Promise<LinkHealthEntry> => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });
    try {
      const response = await fetch(site.url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });
      await response.body?.cancel();
      const opaque = response.type === 'opaque' || response.status === 0;
      const restricted = !opaque && isRestrictedHttpStatus(response.status);
      const ok = opaque || !isCountedHttpFailure(response.status);
      const failureKind = ok ? null : response.status === 404 || response.status === 410 ? 'not-found' : 'server';
      return {
        siteId: site.id,
        url: site.url,
        status: opaque ? null : response.status,
        ok,
        reachable: true,
        restricted,
        checkedAt,
        error: opaque ? '可连接（跨域，无法读取 HTTP 状态）' : ok ? null : `HTTP ${response.status}`,
        source: 'browser',
        consecutiveFailures: ok ? 0 : 1,
        confirmedFailure: false,
        lastSuccessfulAt: ok ? checkedAt : null,
        failureKind,
      };
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? `超时（${Math.round(timeoutMs / 1000)} 秒）`
        : '浏览器无法连接，可能是网络、混合内容或站点拦截';
      return { siteId: site.id, url: site.url, status: null, ok: false, reachable: false, restricted: false, checkedAt, error: message, source: 'browser', consecutiveFailures: 1, confirmedFailure: false, lastSuccessfulAt: null, failureKind: message.startsWith('超时') ? 'timeout' : 'network' };
    } finally {
      window.clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
  };

  async function worker() {
    while (next < sites.length) {
      const index = next++;
      report[index] = await check(sites[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, sites.length) }, worker));
  return report;
}

/**
 * Converts an untrusted JSON value into a safe report. Invalid rows are ignored,
 * and duplicate site IDs resolve to the newest valid check.
 */
export function parseLinkHealthReport(value: unknown): LinkHealthEntry[] {
  if (!Array.isArray(value)) return [];

  const entries = new Map<string, LinkHealthEntry>();
  for (const item of value.slice(0, MAX_REPORT_ENTRIES)) {
    const entry = parseEntry(item);
    if (!entry) continue;

    const previous = entries.get(entry.siteId);
    if (!previous || Date.parse(entry.checkedAt) >= Date.parse(previous.checkedAt)) {
      entries.set(entry.siteId, entry);
    }
  }

  return [...entries.values()];
}

/**
 * Reads a generated JSON report only. Network, HTTP and JSON errors intentionally
 * resolve to an empty report so a stale or missing artifact cannot break the CMS.
 */
export async function loadLinkHealthReport(
  reportUrl: string | URL,
  options: LoadLinkHealthOptions = {},
): Promise<LinkHealthEntry[]> {
  try {
    const response = await (options.fetcher ?? fetch)(reportUrl, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
    if (!response.ok) return [];
    return parseLinkHealthReport(await response.json() as unknown);
  } catch {
    return [];
  }
}
