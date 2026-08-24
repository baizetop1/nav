export type TextNodeType = 'post' | 'note' | 'topic' | 'project' | 'site';

export interface TextNode {
  id: string;
  type: TextNodeType;
  title: string;
  slug?: string;
  url: string;
  summary?: string;
  category?: string;
  format?: string;
  tags: string[];
  related: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TextEdge {
  from: string;
  to: string;
  type: 'related' | 'wiki';
}

export interface TextIndex {
  version: 1 | 2;
  generatedAt: string;
  nodes: TextNode[];
  edges?: TextEdge[];
}
