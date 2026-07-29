export interface BookmarkImportRecord {
  name: string;
  url: string;
  category?: string;
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

export function parseBookmarks(html: string): BookmarkImportRecord[] {
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
  if (roots.length) roots.forEach((root) => visit(root));
  else document.querySelectorAll('a[href]').forEach((anchor) => add(anchor));

  return records;
}
