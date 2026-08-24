import type { TechOsKind, TechOsMode } from './tech-os';

export type LearningActionKind = 'continue-quest' | 'run-lab' | 'process-inbox' | 'answer-question' | 'review-knowledge' | 'review-route-seed';
export type LearningActionEffort = 'small' | 'focused';

export interface LearningAction {
  id: string;
  kind: LearningActionKind;
  title: string;
  detail: string;
  reason: string;
  sourceIds: string[];
  targetEntityId?: string;
  targetView?: 'inbox' | 'backlog';
  effort: LearningActionEffort;
  priority: number;
}

export interface LearningEntityReference {
  id: string;
  kind: TechOsKind;
  title: string;
  status: string;
}

export interface QuestSuggestion extends LearningEntityReference {
  kind: 'quest';
  order: number;
  reason: string;
}

export interface KnowledgeConnection {
  knowledgeId: string;
  title: string;
  relatedIds: string[];
  reason: string;
}

export type RouteSeedSignalSource = 'open-question' | 'inbox-question' | 'inbox-idea' | 'knowledge-gap' | 'lab-question' | 'project-question' | 'completed-quest';

export interface RouteSeedSignal {
  id: string;
  sourceType: RouteSeedSignalSource;
  title: string;
  reason: string;
  sourceIds: string[];
  tags: string[];
}

export interface LearningEngineResult {
  mode: TechOsMode;
  nextAction: LearningAction | null;
  alternatives: LearningAction[];
  openQuestions: LearningEntityReference[];
  questSuggestions: QuestSuggestion[];
  knowledgeConnections: KnowledgeConnection[];
  routeSeedSignals: RouteSeedSignal[];
  existingRouteSeedCount: number;
}
