import { useCallback, useEffect, useRef, useState } from 'react';
import { BLOG_WORKSPACE_EVENT, blogDraftScope, blogDraftStorageKey, loadBlogDraft, saveBlogDraft, type BlogLocalDraft, type BlogRepositoryTarget } from '../../lib/blogWorkspace';

const sameDraft = (left: BlogLocalDraft, right: BlogLocalDraft) => JSON.stringify(left) === JSON.stringify(right);

export function useBlogAutosave(initial: BlogLocalDraft, target: BlogRepositoryTarget, onSaved: () => void, onDirty: (dirty: boolean) => void) {
  // One mounted editor owns one article/repository. Freeze the target so a
  // queued save can never follow a subsequently changed repository prop.
  const [session] = useState(() => ({ id: initial.id, target: { ...target }, scope: blogDraftScope(target), key: blogDraftStorageKey(target, initial.id) }));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(initial.revision === 0), [error, setError] = useState('');
  const [dirty, setDirty] = useState(initial.revision === 0);
  const [conflict, setConflict] = useState<{ current: BlogLocalDraft | null } | null>(null);
  const current = useRef(initial), baseline = useRef(initial);
  const pending = useRef(initial.revision === 0), busy = useRef(false), blocked = useRef(false), generation = useRef(0), mounted = useRef(true);
  const refreshAfterSave = useRef(false), refreshCallback = useRef<() => void>(() => {});
  const savedCallback = useRef(onSaved), dirtyCallback = useRef(onDirty);
  savedCallback.current = onSaved; dirtyCallback.current = onDirty;

  const reportState = useCallback(() => {
    const unsaved = pending.current || busy.current || blocked.current || current.current.revision === 0;
    if (!mounted.current) return;
    setDirty(unsaved);
    setSaving(!blocked.current && (pending.current || busy.current));
    dirtyCallback.current(unsaved);
  }, []);

  const blockWithError = useCallback((message: string) => {
    blocked.current = true;
    if (mounted.current) { setError(message); setConflict(null); }
    reportState();
  }, [reportState]);

  const blockWithConflict = useCallback((latest: BlogLocalDraft | null) => {
    blocked.current = true;
    if (mounted.current) { setConflict({ current: latest }); setError(''); }
    reportState();
  }, [reportState]);

  const adoptPersisted = useCallback((next: BlogLocalDraft) => {
    current.current = next; baseline.current = next;
    pending.current = false; blocked.current = false; generation.current += 1;
    if (mounted.current) { setDraft(next); setConflict(null); setError(''); }
    reportState();
  }, [reportState]);

  const refresh = useCallback(() => {
    if (busy.current) { refreshAfterSave.current = true; return; }
    refreshAfterSave.current = false;
    const loaded = loadBlogDraft(session.target, session.id);
    if (loaded.status === 'error') { blockWithError(loaded.message); return; }
    const latest = loaded.status === 'loaded' ? loaded.draft : null;
    if ((!latest && baseline.current.revision === 0) || (latest && sameDraft(latest, baseline.current))) return;
    if (!blocked.current && !pending.current && latest) adoptPersisted(latest);
    else blockWithConflict(latest);
  }, [session, blockWithError, blockWithConflict, adoptPersisted]);
  refreshCallback.current = refresh;

  const flush = useCallback(async () => {
    if (busy.current || blocked.current || !pending.current) return;
    busy.current = true; reportState();
    try {
      while (pending.current && !blocked.current) {
        pending.current = false;
        const expectedRevision = baseline.current.revision || null;
        // Fresh typing may still carry the old revision from React's render.
        // The queue owns the baseline; text/source always come from the latest
        // in-memory draft, never from the previous successful save response.
        const next = { ...current.current, revision: expectedRevision ?? 0 };
        const version = generation.current;
        const result = await saveBlogDraft(session.target, expectedRevision, next);
        if (result.status !== 'saved') {
          if (result.status === 'conflict') blockWithConflict(result.current);
          else blockWithError(result.message);
          break;
        }
        baseline.current = result.draft;
        const hasNewInput = version !== generation.current;
        current.current = hasNewInput
          ? { ...current.current, revision: result.draft.revision, createdAt: result.draft.createdAt, updatedAt: result.draft.updatedAt }
          : result.draft;
        pending.current = pending.current || hasNewInput;
        if (mounted.current) { setDraft(current.current); setError(''); savedCallback.current(); }
        reportState();
      }
    } finally {
      busy.current = false;
      // A storage event can arrive while awaiting the Web Lock or the promise
      // continuation. Do not drop it, including same-window workspace events.
      if (refreshAfterSave.current && mounted.current) refreshCallback.current();
      reportState();
    }
  }, [session, blockWithConflict, blockWithError, reportState]);

  const change = useCallback((next: BlogLocalDraft) => {
    if (next.id !== session.id) { blockWithError('文章编号与当前编辑器不一致，已停止保存。请导出当前内容后重新打开文章。'); return; }
    current.current = { ...next, revision: baseline.current.revision };
    generation.current += 1; pending.current = true;
    setDraft(current.current); reportState(); void flush();
  }, [session.id, blockWithError, reportState, flush]);

  const adopt = useCallback((next: BlogLocalDraft) => {
    if (busy.current) return;
    const loaded = loadBlogDraft(session.target, session.id);
    if (loaded.status === 'error') { blockWithError(loaded.message); return; }
    if (loaded.status === 'missing') { blockWithConflict(null); return; }
    // The conflict dialog may have been open while another tab edited again.
    // Update its choice instead of accepting a stale version as a new baseline.
    if (next.id !== session.id || !sameDraft(loaded.draft, next)) { blockWithConflict(loaded.draft); return; }
    adoptPersisted(loaded.draft);
  }, [session, blockWithError, blockWithConflict, adoptPersisted]);

  useEffect(() => {
    mounted.current = true;
    const storageChanged = (event: StorageEvent) => { if (event.key === null || event.key === session.key) refresh(); };
    const workspaceChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scope?: string; id?: string }>).detail;
      if (!detail || (detail.scope === session.scope && detail.id === session.id)) refresh();
    };
    window.addEventListener('storage', storageChanged);
    window.addEventListener(BLOG_WORKSPACE_EVENT, workspaceChanged);
    window.addEventListener('focus', refresh);
    // Parent creation may have failed before this editor mounted. Revision 0
    // stays dirty until a real persistence result arrives, including empty text.
    refresh(); reportState(); void flush();
    return () => {
      mounted.current = false;
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener(BLOG_WORKSPACE_EVENT, workspaceChanged);
      window.removeEventListener('focus', refresh);
    };
  }, [session, refresh, reportState, flush]);

  const retry = useCallback(() => {
    blocked.current = false; pending.current = true;
    setError(''); setConflict(null); reportState(); void flush();
  }, [reportState, flush]);

  return { draft, saving, error, conflict, change, adopt, retry, current, dirty };
}
