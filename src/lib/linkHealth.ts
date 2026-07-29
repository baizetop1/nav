export interface LinkHealthEntry {
  siteId: string;
  url: string;
  status: number | null;
  ok: boolean;
  checkedAt: string;
  error: string | null;
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

  return { siteId, url, status, ok: value.ok, checkedAt, error };
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
