export interface InboxSyncMeta {
  version: 2;
  lastSyncedAt: string;
  itemVersions: Record<string, string>;
  studyVersions: Record<string, string>;
}

export interface InboxSyncUiState {
  phase: 'idle' | 'restoring' | 'syncing' | 'synced' | 'error';
  message?: string;
  commitUrl?: string;
}
