export type TechOsKind = 'vision' | 'route' | 'route-seed' | 'route-review' | 'quest' | 'question' | 'knowledge' | 'lab' | 'project' | 'tech-map' | 'inbox-item';
export type TechOsMode = 'explore' | 'lab' | 'keep-alive';
export type TechOsFieldValue = string | number | boolean | string[];

export interface TechOsEntity {
  id: string;
  kind: TechOsKind;
  title: string;
  status: string;
  created: string;
  tags: string[];
  sourcePath: string;
  fields: Record<string, TechOsFieldValue>;
  body: string;
}

export interface TechOsSourceFile {
  path: string;
  content: string;
}

export interface TechOsIndex {
  schema: 'tech-os-index/v1';
  sourceSchema: 'tech-os/v1';
  sourceUpdated: string;
  state: {
    visionId: string;
    mainRouteId: string;
    currentQuestId: string;
    mode: TechOsMode;
  };
  entities: TechOsEntity[];
  files: TechOsSourceFile[];
}
