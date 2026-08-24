export type InboxItemType = 'text' | 'link';
export type InboxItemStatus = 'inbox' | 'archived';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  title?: string;
  content?: string;
  url?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  status: InboxItemStatus;
  deletedAt?: string;
}

export interface InboxStore {
  version: 1;
  updatedAt: string;
  items: InboxItem[];
}

export interface InboxDraft {
  type: InboxItemType;
  title?: string;
  content?: string;
  url?: string;
  tags?: string[];
}
