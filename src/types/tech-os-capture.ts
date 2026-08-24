import type { TechOsSourceFile } from './tech-os';

export type TechOsCaptureKind = 'question' | 'idea' | 'note' | 'link';

export interface TechOsCaptureDraft {
  captureKind: TechOsCaptureKind;
  inboxItemId: string;
  techOsId: string;
  file: TechOsSourceFile;
}
