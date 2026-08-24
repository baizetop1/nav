import type { TechOsSourceFile } from './tech-os';

export type CandidateDecision = 'save_for_later' | 'archive' | 'not_interested';

export interface CandidateDecisionDraft {
  key: string;
  candidateId: string;
  decision: CandidateDecision;
  file: TechOsSourceFile;
}

export interface RouteCompletionReviewModel {
  reviewId: string;
  filePath: string;
  routeId: string;
  routeTitle: string;
  progress: number;
  eligible: boolean;
  eligibilityReason: string;
  completedQuestIds: string[];
  unfinishedQuestIds: string[];
  knowledgeIds: string[];
  labIds: string[];
  projectIds: string[];
  questionIds: string[];
  routeSeedIds: string[];
  tags: string[];
  suggestedLearnedSummary: string;
}

export interface RouteReviewDraftValues {
  learnedSummary: string;
  continueQuestionIds: string[];
  routeSeedIds: string[];
  notInterested: string;
}

export interface RouteReviewDraft {
  key: string;
  reviewId: string;
  file: TechOsSourceFile;
}

export interface NextRouteRecommendation {
  id: string;
  routeId: string;
  filePath: string;
  title: string;
  why: string;
  sourceLabel: string;
  originId: string;
  sourceIds: string[];
  relatedQuestionIds: string[];
  knowledgeIds: string[];
  routeSeedIds: string[];
  tags: string[];
  expectedOutcome: string;
  outline: string[];
  score: number;
}

export interface RouteDraftValues {
  title: string;
  reason: string;
  expectedOutcome: string;
  outline: string[];
}

export interface GeneratedRouteDraft {
  key: string;
  routeId: string;
  file: TechOsSourceFile;
}

export interface ManualRouteInput {
  topic: string;
  reason: string;
  expectedOutcome: string;
}

export interface ManualRouteSuggestion {
  id: string;
  routeId: string;
  filePath: string;
  visionId: string;
  title: string;
  reason: string;
  expectedOutcome: string;
  outline: string[];
  tags: string[];
  matchedKnowledgeIds: string[];
}
