export interface Site {
  name: string;
  description: string;
  url: string;
  tags?: string[];
  icon?: string;
}

export interface Category {
  name: string;
  sites: Site[];
}

export interface SearchEngine {
  name: string;
  url: string;
  prefix: string;
  icon: string;
  placeholder: string;
}

export const searchEngines: SearchEngine[] = [
  { name: "Google", url: "https://www.google.com/search?q=", prefix: "g", icon: "G", placeholder: "Google 搜索" },
  { name: "Baidu", url: "https://www.baidu.com/s?wd=", prefix: "bd", icon: "度", placeholder: "百度搜索" },
  { name: "Bing", url: "https://cn.bing.com/search?q=", prefix: "bi", icon: "必", placeholder: "必应搜索" },
  { name: "GitHub", url: "https://github.com/search?q=", prefix: "gh", icon: "🐱", placeholder: "GitHub 搜索" },
  { name: "Bilibili", url: "https://search.bilibili.com/all?keyword=", prefix: "bl", icon: "📺", placeholder: "B站搜索" },
];

export const siteConfig = {
  title: "白泽",
  description: "baizetop1's navigation site",
  github: "https://github.com/baizetop1",
  footer: "© 2021-2025 @baizetop1",
};

export const categories: Category[] = [
  {
    name: "常用网站",
    sites: [
      { name: "安全树洞", description: "个人博客", url: "https://baizeone.top/", tags: ["博客", "安全"] },
      { name: "玄机", description: "玄机平台", url: "https://xj.edisec.net/", tags: ["平台", "安全"] },
      { name: "nss", description: "nssctf", url: "https://www.nssctf.cn/index", tags: ["CTF", "安全"] },
      { name: "教育漏洞平台", description: "教育漏洞平台", url: "https://src.sjtu.edu.cn/", tags: ["漏洞", "教育"] },
      { name: "CSDN", description: "CSDN", url: "https://www.csdn.net/?spm=1001.2101.3001.4476", tags: ["博客", "编程"] },
      { name: "国家信息安全漏洞平台", description: "漏洞", url: "https://www.cnnvd.org.cn/home/childHome", tags: ["漏洞", "安全"] },
      { name: "oj网站", description: "学习网站", url: "http://oj.lgwenda.com/", tags: ["算法", "练习"] },
      { name: "蓝桥杯", description: "学习网站", url: "https://www.lanqiao.cn/courses/10532", tags: ["比赛", "练习"] },
    ]
  },
  {
    name: "编程学习",
    sites: [
      { name: "MDN", description: "Web开发技术社区", url: "https://developer.mozilla.org/zh-CN/", tags: ["Web", "文档"] },
      { name: "菜鸟教程", description: "编程学习网站", url: "https://www.runoob.com/", tags: ["教程", "入门"] },
      { name: "w3school", description: "编程学习网站", url: "https://www.w3school.com.cn/", tags: ["教程", "Web"] },
      { name: "棉花糖web", description: "棉花糖", url: "https://vip.bdziyi.com/", tags: ["资源", "学习"] },
      { name: "编程网站", description: "余胜军", url: "http://www.mayikt.com/", tags: ["教程", "Java"] },
    ]
  },
  {
    name: "实用网站",
    sites: [
      { name: "阿水", description: "人工智能对话助手", url: "https://ai.ashuiai.com/home", tags: ["AI", "工具"] },
      { name: "虫部落", description: "高效搜索", url: "https://search.chongbuluo.com/", tags: ["搜索", "工具"] },
      { name: "抠图", description: "抠图", url: "https://www.yijiankoutu.com/", tags: ["图片", "工具"] },
      { name: "iizhi资源", description: "资源搜索", url: "https://www.iizhi.cn/", tags: ["资源", "搜索"] },
      { name: "Doyoudo", description: "视频剪辑合集", url: "https://premium.doyoudo.com/", tags: ["视频", "剪辑"] },
      { name: "PDF24 Tools", description: "PDF线上工具", url: "https://tools.pdf24.org/zh/", tags: ["PDF", "工具"] },
    ]
  },
  {
    name: "技术资讯",
    sites: [
      { name: "吾爱破解", description: "一个专注破解的网站", url: "https://www.52pojie.cn/forum.php", tags: ["论坛", "安全"] },
      { name: "博客园", description: "开发者的网上家园", url: "https://www.cnblogs.com/", tags: ["博客", "技术"] },
      { name: "稀土掘金", description: "面向全球中文开发者的技术内容分享与交流平台", url: "https://juejin.cn/", tags: ["社区", "技术"] },
      { name: "ib.sb", description: "IP", url: "https://ip.sb/ib.sb", tags: ["网络", "工具"] },
      { name: "JSON online", description: "JSON online对比工具", url: "https://jsoneditoronline.org/", tags: ["JSON", "工具"] },
      { name: "lobste", description: "技术论坛", url: "https://lobste.rs/", tags: ["论坛", "技术"] },
      { name: "ping", description: "多地ping", url: "https://ping.sx/ping", tags: ["网络", "工具"] },
    ]
  },
  {
    name: "新奇",
    sites: [
      { name: "需要我帮你百度一下", description: "需要我帮你百度一下", url: "https://when.run/lmbdfy.html", tags: ["趣味"] },
      { name: "小众软件", description: "在这里发现更多有趣的应用", url: "https://faxian.appinn.com/", tags: ["软件", "趣味"] },
      { name: "Collect UI", description: "界面UI.", url: "http://collectui.com/", tags: ["设计", "UI"] },
      { name: "Excalidraw", description: "流程图工具", url: "https://excalidraw.com/", tags: ["流程图", "工具"] },
    ]
  },
  {
    name: "网页灵感",
    sites: [
      { name: "Site Inspire", description: "简洁web", url: "https://www.siteinspire.com/", tags: ["设计", "灵感"] },
      { name: "navnav", description: "前端小组件", url: "http://navnav.co/", tags: ["前端", "组件"] },
    ]
  }
];
