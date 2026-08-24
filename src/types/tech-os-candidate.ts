import type { TechOsSourceFile } from './tech-os';
import type { RouteSeedSignalSource } from './tech-os-learning';

export type RouteCandidateSource = 'open_question' | 'knowledge_gap' | 'project_need' | 'inbox' | 'previous_route' | 'system_suggestion';

export interface RouteCandidateInput {
  id: string;
  kind: 'signal' | 'saved-seed';
  title: string;
  sourceType: RouteSeedSignalSource | 'saved-seed';
  sourceIds: string[];
  tags: string[];
}

export interface RouteCandidateGroup {
  id: string;
  candidateId: string;
  filePath: string;
  suggestedTitle: string;
  source: RouteCandidateSource;
  originId: string;
  relatedQuestionIds: string[];
  knowledgeIds: string[];
  sourceEntityIds: string[];
  sharedTags: string[];
  inputs: RouteCandidateInput[];
  defaultReason: string;
  defaultOutcome: string;
  defaultOutline: string[];
}

export interface RouteCandidateDraftValues {
  title: string;
  reason: string;
  expectedOutcome: string;
  outline: string[];
}

export interface RouteCandidateDraft {
  groupId: string;
  candidateId: string;
  file: TechOsSourceFile;
  sourceInputIds: string[];
}
