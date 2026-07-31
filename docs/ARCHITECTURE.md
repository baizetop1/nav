# 白泽个人导航 CMS 系统设计文档

> 本文档依据当前仓库源码整理，用于记录现状、目标架构和后续重构顺序。核心 CMS 改造已于 2026-07-21 落地，并于 2026-07-29 补充书签导入、完整备份恢复和每日链接健康检测。

## 1. 项目定位

白泽是一个部署在 GitHub Pages 上的个人导航站。当前版本已经完成导航展示、分类、站内筛选、多搜索引擎跳转、主题切换和基础本地管理；后续计划将其升级为由 GitHub 仓库驱动、可在线维护的个人导航 CMS。

最终目标：

> 一个无需自建服务器、数据可版本化、修改后可自动发布的个人数字入口系统。

## 2. 当前项目基线

### 2.1 已使用的技术

| 模块 | 当前实现 |
| --- | --- |
| UI 框架 | React 18 |
| 开发语言 | TypeScript 5 |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3、少量全局 CSS |
| 动画 | Framer Motion 10 |
| 图标 | Lucide React |
| 部署 | GitHub Actions + `gh-pages` 分支 |
| 拖拽 | dnd-kit |
| 搜索 | Fuse.js |
| 数据源 | `src/data/*.json` |
| 本地持久化 | LocalStorage 草稿 |

项目未引入路由库和 GitHub API SDK；Hash 管理入口和 GitHub API 调用均使用浏览器原生能力实现。

### 2.2 已实现功能

- 按分类展示网站卡片，并通过侧边栏滚动定位。
- 使用 Fuse.js 按名称、标签、分类和描述进行本地模糊匹配。
- 使用 `g`、`bd`、`bi`、`gh`、`bl` 前缀切换外部搜索引擎。
- 支持 `Ctrl/Cmd + K` 打开全局命令面板，通过键盘搜索网站和执行常用操作；按 `/` 聚焦站内搜索框。
- 支持明暗主题、按时间变化的渐变背景和响应式侧边栏。
- 通过 `/#/admin` 管理网站和分类，支持网站新增、编辑、删除以及空分类增删改。
- 管理页将内容、拖拽布局、统计健康拆为按需挂载的分区；进入管理模式后暂停底层主页绘制，管理区禁用大面积 backdrop blur，布局分类默认只展开第一项。
- 使用 dnd-kit 拖拽调整网站顺序，支持指针和键盘操作。
- 支持分类排序、跨分类拖动网站、四列自由网格坐标和四种卡片尺寸。
- 未发布修改写入 `localStorage.nav_cms_draft`；HTML 导入会区分浏览器书签导出与普通保存网页，后者只读取页面自身 canonical/og:url；同时支持带版本校验的完整备份恢复。
- 完整备份可在浏览器中使用 AES-256-GCM 加密，并以单份密文文件同步到 GitHub；密码不落盘也不上传。
- 运行时输入 fine-grained PAT，通过 Git Data API 原子提交三个 JSON 数据文件。
- 推送到 `main` 或 `master` 后，由 GitHub Actions 构建并发布 `dist` 到 `gh-pages`。
- GitHub Actions 每日检查正式导航链接并生成 `public/link-health.json`，首页为异常链接显示状态提醒。
- 管理后台提供链接健康汇总和异常明细；站点可安装为 PWA，并提供不缓存外部 API 的离线应用壳。
- 支持日常、工作、学习和休闲四种场景；翻译历史最多保留 100 条，访问统计保留 90 天并提供本机统计面板。
- 网站卡片可使用本地二维码库生成和下载 PNG，不依赖第三方二维码接口。
- 临时文本支持纯文本二维码和 `#/transfer` 接收链接；接收端先预览再确认覆盖，载荷限制为 1200 个 UTF-8 字节，URL 片段不会发送到 Pages 服务器。

### 2.3 尚未实现

- GitHub OAuth（纯 Pages 环境无法安全保存 client secret）。
- RSS 聚合、AI 辅助分类等高级能力。

### 2.4 当前目录职责

```text
.
├── .github/workflows/       # GitHub Pages 构建、发布与每日链接检查
├── public/                  # Pages 静态文件与链接健康报告
├── scripts/                 # 加密、备份、书签解析和链接检查自检脚本
├── src/
│   ├── components/          # 卡片、侧边栏和 CMS 管理面板
│   ├── data/                # JSON 数据、站点配置和数据入口
│   ├── lib/                 # className、书签解析与备份校验工具
│   ├── services/            # GitHub 发布、临时文本与完整备份加密
│   ├── types/               # 导航数据类型
│   ├── App.tsx              # 页面状态、搜索、主题和草稿逻辑
│   ├── index.css            # Tailwind 与全局样式
│   └── main.tsx             # React 入口
├── config.yml               # 旧版数据源，当前 React 应用不读取
├── modern.css               # 旧版样式，当前 React 入口不引用
├── tags.js                  # 旧版脚本，当前 React 入口不引用
├── vite.config.ts           # Vite 配置，Pages 基路径为 `/nav/`
└── package.json
```

`config.yml`、`modern.css` 和 `tags.js` 属于旧实现遗留文件。删除前应先确认不再用于其他发布流程。

## 3. 目标架构

```text
访客浏览器
    ↓
GitHub Pages 静态站点
    ↓
React 导航展示层 ← 构建时导入 JSON 数据

管理员浏览器
    ↓
编辑器（表单、排序、预览）
    ↓
运行时提供的 GitHub 凭证
    ↓
GitHub Contents API
    ↓
仓库 main 分支中的 JSON 文件
    ↓
GitHub Actions 构建并发布 gh-pages
```

普通访客只读取构建后的静态资源，不需要 GitHub 权限。管理员的修改先保存在页面草稿状态，点击“发布”后才提交仓库。

## 4. 目标目录设计

```text
src/
├── components/
│   ├── navigation/          # 导航展示组件
│   └── admin/               # 表单、列表、排序与发布组件
├── data/
│   ├── sites.json
│   ├── categories.json
│   └── layout.json
├── hooks/                   # 草稿、认证与同步状态
├── pages/
│   ├── HomePage.tsx
│   └── AdminPage.tsx
├── services/
│   └── github.ts
├── types/
│   └── navigation.ts
└── App.tsx
```

标签可直接从 `sites.json` 聚合生成，第一版不单独维护 `tags.json`，避免重复数据产生不一致。只有当标签需要别名、颜色或排序等元数据时，再增加该文件。

## 5. 数据设计

### 5.1 `sites.json`

```json
[
  {
    "id": "github",
    "name": "GitHub",
    "url": "https://github.com",
    "icon": "github",
    "categoryId": "development",
    "tags": ["代码", "开源"],
    "description": "代码托管平台",
    "favorite": true
  }
]
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 稳定且唯一的标识，布局数据通过它关联网站 |
| `name` | `string` | 网站名称 |
| `url` | `string` | 完整的 `http` 或 `https` 地址 |
| `icon` | `string?` | 图标名称或图标 URL；缺省时显示名称首字 |
| `categoryId` | `string` | 所属分类 ID，不使用可变的分类名称作为外键 |
| `tags` | `string[]` | 搜索和筛选标签 |
| `description` | `string` | 网站简介 |
| `favorite` | `boolean` | 是否加入常用区域 |

ID 建议由名称生成 slug，并在冲突时追加短随机串。修改名称时不应自动修改已有 ID。

### 5.2 `categories.json`

```json
[
  {
    "id": "development",
    "name": "开发工具",
    "icon": "wrench",
    "order": 1
  }
]
```

分类顺序由 `order` 明确控制。删除仍被网站引用的分类时，管理界面必须要求先迁移网站或同时确认删除。

### 5.3 `layout.json`

当前布局同时保存排序、自由网格坐标和卡片尺寸：

```json
[
  {
    "siteId": "github",
    "order": 1,
    "size": "wide",
    "x": 0,
    "y": 0,
    "width": 2,
    "height": 1
  }
]
```

`x`、`y`、`width`、`height` 用于桌面四列网格；未设置坐标时按 `order` 自动排列，窄屏继续回落为响应式流式布局。

## 6. 页面与编辑模式

### 普通模式

- 展示分类和网站卡片。
- 站内搜索与搜索引擎跳转。
- 收藏优先展示、主题切换和响应式布局。
- 不加载管理凭证，不显示可写操作。

### 编辑模式

编辑器负责：

- 新增、修改、删除网站。
- 新增、重命名、排序和删除分类。
- 拖拽网站排序，并提供未发布修改提示。
- 在发布前执行 URL、必填字段、ID 唯一性和关联完整性校验。
- 展示保存进度、提交结果、冲突和权限错误。

当前项目没有路由依赖。GitHub Pages 对 SPA 深层路径刷新不会自动回退到 `index.html`，因此第一版建议使用 `/#/admin`，或继续使用首页内的管理面板。若必须使用 `/admin`，需要补充 404 回退方案。

## 7. GitHub 同步设计

### 7.1 服务接口

`src/services/github.ts` 建议提供：

```ts
type RepositoryTarget = {
  owner: string;
  repo: string;
  branch: string;
};

getFile(target, path, token)
updateFile(target, path, content, sha, message, token)
```

GitHub Contents API 的更新接口本身会创建 commit，因此单文件更新不需要额外的 `createCommit()`。如果一次发布要原子更新多个 JSON 文件，应改用 Git Data API 创建 blob、tree 和 commit；另一种更简单的方案是将 CMS 内容合并成单个 `navigation.json`。

### 7.2 发布流程

```text
读取远端文件和 SHA
    ↓
合并或载入为编辑草稿
    ↓
管理员修改并本地校验
    ↓
提交文件内容、原 SHA 和提交说明
    ↓
GitHub 返回新 commit
    ↓
Actions 构建
    ↓
gh-pages 发布
```

如果远端 SHA 已变化，系统不得静默覆盖，应提示管理员重新加载并处理冲突。发布成功只代表 commit 已创建；界面还应明确提示 Pages 部署存在等待时间。

## 8. 权限与安全

旧版 `VITE_AUTH_TOKEN` 方案已移除。所有 `VITE_*` 环境变量都会进入浏览器构建产物，Base64 也不是加密，因此它不能作为安全鉴权或保护仓库写权限。

同样，GitHub Personal Access Token 绝不能写入 `.env`、仓库文件或 GitHub Actions 的前端构建变量。

个人使用场景的第一版建议：

- 管理员在运行时手动输入 fine-grained PAT。
- Token 仅授予目标仓库 Contents 的最小写权限。
- 默认只保存在内存；如需刷新保留，最多使用 `sessionStorage` 并提供明确的清除按钮。
- 发布前调用 GitHub 用户接口确认当前账号，并显示目标仓库和分支。

完整云备份沿用运行时 PAT，但在浏览器中完成 AES-256-GCM 加密后才写入 `data/navigation-backup.enc.json`。加密密码只存在于当前页面内存，GitHub Token、密码和明文备份都不会进入仓库。密码遗失后无法恢复密文内容。

临时文本二维码是短距传输而不是安全存储。其 Base64URL 编码不属于加密，任何获得二维码或传输链接的人都可以读取内容，因此敏感文本仍应使用密码加密同步。

标准 GitHub OAuth Web Flow 需要安全保存 client secret 并处理回调，纯 GitHub Pages 无法安全完成。若以后采用 OAuth，需要额外的可信后端或 Serverless Function，此时系统将不再是严格意义上的“仅 GitHub Pages、零后端”架构。

## 9. 搜索设计

当前已使用 Fuse.js 对网站名称、标签、分类名称和描述进行模糊匹配，权重为：

```text
name > tags > category > description
```

外部搜索引擎前缀能力继续保留，并与站内搜索结果明确区分。

## 10. 拖拽设计

使用 `@dnd-kit/core` 和 `@dnd-kit/sortable` 实现分类排序、分类内排序和跨分类移动，流程为：

```text
拖动卡片 → 更新草稿顺序 → 标记未发布 → 点击发布 → 写入 GitHub
```

拖拽后只更新本地草稿，不会在每次移动时调用 GitHub API。桌面端还可编辑自由网格坐标和卡片宽高。

## 11. 构建与部署

当前 `.github/workflows/deploy.yml`：

- 监听 `main`、`master` 和手动触发。
- 使用 Node.js 20。
- 执行 `npm ci`、`npm run build`。
- 将 `dist` 发布到 `gh-pages` 分支。

`npm run build` 已包含 `tsc` 类型检查。仓库已有 `package-lock.json`，后续可将 Actions 改为 `npm ci` 以获得可复现安装。Vite 的 `base` 当前固定为 `/nav/`，如果仓库名或自定义域名变化，必须同步调整。

## 12. 分阶段实施计划

### 阶段 0：修正安全说明与建立基线（已完成）

- 移除“环境变量口令不会泄露”的错误描述。
- 确认并清理旧版 `config.yml`、`modern.css`、`tags.js` 的用途。
- 为现有数据和核心交互建立最低限度测试或校验脚本。

验收标准：现有页面功能和生产构建保持正常，文档不再把前端口令描述为安全鉴权。

### 阶段 1：数据重构（已完成）

- 提取公共 TypeScript 类型。
- 创建 `sites.json`、`categories.json`、`layout.json`。
- 为现有网站生成稳定 ID，并从旧 `src/data.ts` 迁移数据。
- 保留搜索引擎和站点元配置为 TypeScript 配置，避免无必要地全部 JSON 化。
- 修改展示组件读取规范化数据。

验收标准：页面内容、分类顺序和搜索结果与迁移前一致，刷新后无数据丢失。

### 阶段 2：完整本地编辑器（核心功能已完成）

- 增加管理页面或管理面板。
- 实现网站和分类的增删改、校验、草稿和预览。
- 将 LocalStorage 从正式数据源降级为未发布草稿与恢复机制。
- 增加浏览器书签 HTML 导入、完整备份和恢复，作为 GitHub 同步前的回退手段。

验收标准：不连接 GitHub 也能完成一次完整编辑并导出合法数据。

### 阶段 3：GitHub 持久化（核心功能已完成）

- 实现运行时 PAT 输入、账号确认和最小权限说明。
- 接入 Git Data API，以单个 commit 原子更新三份 JSON 数据。
- 支持读取远端三份 JSON，并提供本地优先合并或远端覆盖。
- 发布后按 commit SHA 轮询 GitHub Actions，展示排队、运行和最终结果。
- 显示 commit 链接以及构建、部署状态提示。
- 移除当前前端口令对“安全”的依赖。

验收标准：在线编辑可产生可追踪 commit，失败不会覆盖远端新版本或丢失本地草稿。

### 阶段 4：拖拽与搜索增强（已完成）

- 已引入 dnd-kit 支持分类排序、网站排序与跨分类拖动。
- 已支持桌面四列自由网格坐标和四种卡片尺寸；移动端自动回落为响应式布局。
- 已引入 Fuse.js，并按名称、标签、分类、描述设置搜索权重。
- 增加收藏排序、键盘操作和移动端拖拽测试。

验收标准：拖拽结果可持久化并在重新部署后稳定复现。

### 阶段 5：可选高级能力

- PWA 与只读离线访问（基础版本已完成：可安装、离线壳和同源静态资源缓存）。
- RSS 聚合、GitHub 动态、浏览历史。
- 网站健康检测和失效链接报告（基础版本已完成：每日检查并在卡片标记异常）。
- 场景模式、翻译历史、二维码与访问统计面板（已完成基础版本）。
- AI 搜索入口与辅助分类。

这些功能不应阻塞 CMS 的数据模型、编辑器和 GitHub 同步主链路。

## 13. 关键决策摘要

- GitHub 仓库中的 JSON 是导航发布数据的唯一事实来源；LocalStorage 保存草稿、场景偏好、翻译历史和 90 天点击统计，这些本机数据可通过加密完整备份跨设备迁移。
- 前端构建变量不是秘密，不能用于安全认证或保存 GitHub Token。
- 布局同时支持稳定排序和可选的四列自由桌面坐标，窄屏回落为响应式流式布局。
- 标签先由网站数据聚合，减少重复维护。
- GitHub Pages 环境优先采用 Hash 路由或页内管理，避免 `/admin` 刷新 404。
- 多文件原子发布和纯静态 OAuth 都会显著增加复杂度，应在基础 CMS 稳定后再评估。
