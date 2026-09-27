import type { TechOsSourceFile } from './tech-os';

export interface CourseProfile {
  topic: string;
  background: string;
  goal: string;
  timeBudget: string;
  environment: string;
}

/** Content only: packages never control repository IDs, paths, state or credentials. */
export interface CoursePackage {
  version: 1;
  title: string;
  summary: string;
  lessons: Array<{ title: string; body: string }>;
}

export type CourseReadiness = 'outline' | 'incomplete' | 'ready';
export interface CourseAssessment {
  status: CourseReadiness;
  issues: string[];
  lessons: Array<{ status: CourseReadiness; issues: string[] }>;
}

export interface CoursePackageDraft {
  key: string;
  routeId: string;
  questIds: string[];
  files: TechOsSourceFile[];
}

export interface CourseAiConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  tokenParameter: 'max_tokens' | 'max_completion_tokens';
}

export interface CourseAiUsage { promptTokens?: number; completionTokens?: number; totalTokens?: number }
export interface CourseAiResult { content: string; usage?: CourseAiUsage }
