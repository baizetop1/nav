export interface Site {
  id: string;
  name: string;
  description: string;
  url: string;
  categoryId: string;
  tags: string[];
  icon?: string;
  favorite?: boolean;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface LayoutItem {
  siteId: string;
  order: number;
  size: 'normal' | 'wide';
  x?: number;
  y?: number;
  width?: 1 | 2;
  height?: 1 | 2;
}

export interface NavigationData {
  sites: Site[];
  categories: Category[];
  layout: LayoutItem[];
}

export interface SearchEngine {
  name: string;
  url: string;
  prefix: string;
  icon: string;
  placeholder: string;
}
