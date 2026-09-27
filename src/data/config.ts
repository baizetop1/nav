import type { SearchEngine } from '../types/navigation';

export const TEXT_INDEX_URL = import.meta.env?.VITE_TEXT_INDEX_URL?.trim() || 'https://baizeone.top/text-index.json';

export const searchEngines: SearchEngine[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', prefix: 'g', placeholder: 'Google 搜索' },
  { id: 'baidu', name: 'Baidu', url: 'https://www.baidu.com/s?wd=', prefix: 'bd', placeholder: '百度搜索' },
  { id: 'bing', name: 'Bing', url: 'https://cn.bing.com/search?q=', prefix: 'bi', placeholder: '必应搜索' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=', prefix: 'gh', placeholder: 'GitHub 搜索' },
  { id: 'bilibili', name: 'Bilibili', url: 'https://search.bilibili.com/all?keyword=', prefix: 'bl', placeholder: 'B站搜索' },
];

export const siteConfig = {
  title: '白泽',
  description: "baizetop1's navigation site",
  github: 'https://github.com/baizetop1',
  footer: '© 2021-2026 @baizetop1',
  repository: {
    owner: 'baizetop1',
    repo: 'nav',
    branch: 'main',
  },
  blogRepository: {
    owner: 'baizetop1',
    repo: 'baizetop1.github.io',
    branch: 'master',
  },
};
