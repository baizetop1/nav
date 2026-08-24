import type { RepositoryTarget } from '../services/github';
import type { TechOsSourceFile } from './tech-os';

export type TechOsFileStatus = 'same' | 'modified' | 'local-only' | 'remote-only';

export interface TechOsRemoteFile extends TechOsSourceFile {
  blobSha: string;
}

export interface TechOsRepositorySnapshot {
  target: RepositoryTarget;
  headSha: string;
  treeSha: string;
  files: TechOsRemoteFile[];
}

export interface TechOsFileDiff {
  path: string;
  status: TechOsFileStatus;
  localContent: string | null;
  remoteContent: string | null;
}

export interface TechOsCommitResult {
  sha: string;
  commitUrl: string;
  changedPaths: string[];
}
