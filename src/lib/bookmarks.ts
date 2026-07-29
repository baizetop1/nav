export interface BookmarkImportRecord {
  name: string;
  url: string;
  category?: string;
  description?: string;
}

export interface HtmlImportResult {
  mode: 'bookmark-export' | 'saved-page';
  records: BookmarkImportRecord[];
}

export function normalizeBookmarkUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function isBrowserBookmarkExport(html: string): boolean {
  if (/NETSCAPE-Bookmark-file-1/i.test(html)) return true;
  const document = new DOMParser().parseFromString(html, 'text/html');
  return Boolean(document.querySelector('dl a[href][add_date], dl h3[add_date]'));
}

export function parseBookmarks(html: string): BookmarkImportRecord[] {
  if (!isBrowserBookmarkExport(html)) return [];
  const document = new DOMParser().parseFromString(html, 'text/html');
  const records: BookmarkImportRecord[] = [];
  const seen = new Set<string>();
  const text = (element: Element) => element.textContent?.replace(/\s+/g, ' ').trim() || '';

  const add = (anchor: Element, category?: string) => {
    const url = normalizeBookmarkUrl(anchor.getAttribute('href') || '');
    if (!url || seen.has(url)) return;
    seen.add(url);
    records.push({
      name: text(anchor) || new URL(url).hostname,
      url,
      ...(category ? { category } : {}),
    });
  };

  const visit = (list: Element, category?: string) => {
    let pendingFolder: string | undefined;

    for (const child of Array.from(list.children)) {
      if (child.tagName === 'DT') {
        const children = Array.from(child.children);
        const folder = children.find((element) => element.tagName === 'H3');
        const anchor = children.find((element) => element.tagName === 'A');
        const nestedLists = children.filter((element) => element.tagName === 'DL');

        if (anchor) add(anchor, category);
        if (folder) pendingFolder = text(folder) || undefined;
        for (const nested of nestedLists) visit(nested, pendingFolder || category);
        if (nestedLists.length) pendingFolder = undefined;
      } else if (child.tagName === 'DL') {
        visit(child, pendingFolder || category);
        pendingFolder = undefined;
      }
    }
  };

  const lists = Array.from(document.querySelectorAll('dl'));
  const roots = lists.filter((list) => !list.parentElement?.closest('dl'));
  roots.forEach((root) => visit(root));

  return records;
}

export function parseSavedHtmlPage(html: string): BookmarkImportRecord | null {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const readMeta = (attribute: 'name' | 'property', value: string) => Array.from(document.querySelectorAll('meta'))
    .find(meta => meta.getAttribute(attribute)?.trim().toLowerCase() === value)?.getAttribute('content')?.trim() || '';
  const base = normalizeBookmarkUrl(document.querySelector('base[href]')?.getAttribute('href') || '');
  const resolveUrl = (value: string) => {
    try {
      return normalizeBookmarkUrl(new URL(value, base || undefined).href);
    } catch {
      return null;
    }
  };

  const canonical = document.querySelector('link[rel~="canonical"][href]')?.getAttribute('href')?.trim() || '';
  const savedFromUrl = html.match(/saved from url=\(\d+\)\s*(https?:\/\/.*?)\s*-->/is)?.[1]?.trim() || '';
  const pageUrl = resolveUrl(canonical)
    || resolveUrl(readMeta('property', 'og:url'))
    || resolveUrl(readMeta('name', 'twitter:url'))
    || resolveUrl(readMeta('name', 'savepage-url'))
    || resolveUrl(readMeta('name', 'original-url'))
    || resolveUrl(readMeta('name', 'source-url'))
    || resolveUrl(savedFromUrl)
    || base;
  if (!pageUrl) return null;

  const name = readMeta('property', 'og:title')
    || document.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim()
    || new URL(pageUrl).hostname;
  const description = (readMeta('name', 'description') || readMeta('property', 'og:description'))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  return {
    name,
    url: pageUrl,
    category: '导入网页',
    ...(description ? { description } : {}),
  };
}

export function parseHtmlImport(html: string): HtmlImportResult {
  if (isBrowserBookmarkExport(html)) {
    return { mode: 'bookmark-export', records: parseBookmarks(html) };
  }
  const page = parseSavedHtmlPage(html);
  return { mode: 'saved-page', records: page ? [page] : [] };
}
