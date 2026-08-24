export interface InboxSyncMeta {
  version: 1;
  lastSyncedAt: string;
  itemVersions: Record<string, string>;
}

export interface InboxSyncUiState {
  phase: 'idle' | 'syncing' | 'synced' | 'error';
  message?: string;
  commitUrl?: string;
}
