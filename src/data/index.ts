import categoriesJson from './categories.json';
import layoutJson from './layout.json';
import sitesJson from './sites.json';
import type { NavigationData } from '../types/navigation';

export { searchEngines, siteConfig } from './config';

export const defaultNavigationData: NavigationData = {
  categories: categoriesJson as NavigationData['categories'],
  sites: sitesJson as NavigationData['sites'],
  layout: layoutJson as NavigationData['layout'],
};
