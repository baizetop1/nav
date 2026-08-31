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
- GitHub Actions 按日程、代码提交或管理页手动触发检查正式导航链接，并生成 `public/link-health.json`；首页为异常链接显示状态提醒。
- 首页提供可切换的信息流（综合、国内、安全、AI、开发）与 GitHub Trending 热门仓库；国内分类轮询聚合中国新闻网要闻、IT之家与百度热搜（百度失败时回退今日头条），综合分类按国内、安全、AI、开发轮询混排。GitHub Actions 每小时在服务端聚合公开 API/RSS 为 `public/hot-feed.json`，前端只读取同源静态报告，不暴露 Token，并在更新失败时回退已部署的上次有效数据与本机缓存。
- 管理后台提供链接健康汇总和明细；有 Token 时使用 Actions 服务器端检查，无 Token 时提供浏览器可达性检查，并明确标注跨域无法读取 HTTP 状态。
- 站点可安装为 PWA，并提供不缓存外部 API 的离线应用壳。
- 支持日常、工作、学习和休闲四种场景；翻译历史最多保留 100 条，正式网站访问统计保留 90 天并提供本机统计面板。
- 未加入正式导航的临时网址按日记录访问次数，滚动保留 30 天，可从首页再次访问；记录包含在完整备份与加密云备份中。
- 网站卡片可使用本地二维码库生成和下载 PNG，不依赖第三方二维码接口。
- 临时文本支持纯文本二维码和 `#/transfer` 接收链接；接收端先预览再确认覆盖，载荷限制为 1200 个 UTF-8 字节，URL 片段不会发送到 Pages 服务器。
- 多条 Inbox 继续以 `version: 1` 数据保存在 `localStorage.baize_inbox_v1`，支持文本、链接、归档和软删除；原有单份临时文本会复制迁移一次但继续独立保留。`data/inbox.enc.json` 解密后的私有共享数据为 version 2，包含 Inbox items 与 Tech OS 个人学习打卡，同时兼容旧 version 1 密文。新设备可只读恢复并与本机合并；主动同步才重新加密提交。本机只保存不含秘密的逐条同步版本标记。
- 博客公开索引兼容 version 1 和 version 2。version 2 使用 `related`、`wiki` 与 `topic` edges：文章和 Topic 都是公开节点，`topic` 边只能从文章指向正式 Topic，普通 tag 不会自动升级。Nav 校验端点、语义类型、重复和自我关联，并在搜索中分组展示 Topic 与文章；仍不下载文章正文。
- Tech OS 以仓库根目录 `tech-os/` 为规范来源，使用 Markdown + 扁平 Front Matter 表达 Vision、Route、Quest、Question、Knowledge、Lab、Project 和 Tech Map；T2 已提供 Viewer 与独立 Repository Adapter，T3 复用既有 Inbox 完成移动 Capture 接入。

### 2.3 尚未实现

- GitHub OAuth（纯 Pages 环境无法安全保存 client secret）。
- RSS 聚合、AI 辅助分类等高级能力。

### 2.4 当前目录职责

```text
.
├── .github/workflows/       # GitHub Pages 构建、发布与每日链接检查
├── public/                  # Pages 静态文件、链接健康报告与热榜报告
├── scripts/                 # 加密、备份、内容检查及 Tech OS 校验/自检脚本
├── src/
│   ├── components/          # 卡片、侧边栏、Inbox 和 CMS 管理面板
│   ├── data/                # JSON 数据、站点配置和数据入口
│   ├── lib/                 # className、书签解析与备份校验工具
│   ├── services/            # GitHub 发布、文本索引、Inbox、合并同步与加密服务
│   ├── types/               # 导航数据类型
│   ├── App.tsx              # 页面状态、搜索、主题和草稿逻辑
│   ├── index.css            # Tailwind 与全局样式
│   └── main.tsx             # React 入口
├── tech-os/                 # Tech OS Markdown 规范数据、状态、模板和工作流说明
├── config.yml               # 旧版数据源，当前 React 应用不读取
├── modern.css               # 旧版样式，当前 React 入口不引用
├── tags.js                  # 旧版脚本，当前 React 入口不引用
├── vite.config.ts           # Vite 配置，Pages 基路径为 `/nav/`
└── package.json
```

`config.yml`、`modern.css` 和 `tags.js` 属于旧实现遗留文件。删除前应先确认不再用于其他发布流程。

### 2.5 Tech OS T1 边界

T1 是独立的数据层，不改变导航 CMS 的运行时数据源：

- `tech-os/state.yml` 保存 schema 版本和少量当前指针，实体关系一律引用永久 ID，不引用相对路径。
- `tech-os/templates/` 是所有实体的可复制模板；真实对象按状态和领域放入固定目录。
- `scripts/check-tech-os.mjs` 检查目录、Front Matter、关系、状态、证据等级和唯一 Main Route；`scripts/tech-os-selfcheck.mjs` 在临时副本中验证关键失败场景。
- `tech-os/` 不位于 `src/` 或 `public/`，canonical Markdown 不会被整体复制；T2 构建期生成受控前端索引。
- T2 Dashboard/Viewer 与独立 Repository Adapter 已实现；T3 通过标签映射复用既有 Inbox，并把用户明确选择的记录转换为 Tech OS Inbox Item 草稿。

### 2.6 Tech OS T2 只读工作台

`/#/tech-os` 沿用现有 Hash URL，不增加路由依赖。数据流固定为：

```text
tech-os/*.md
    ↓ T1 validator
scripts/build-tech-os-index.mjs
    ↓
src/generated/tech-os-index.json（忽略提交）
    ↓ 按需加载
TechOsWorkspace
```

- `predev` 和 `prebuild` 都会重新生成索引；schema 或关系错误会中止启动/构建。
- 工作台提供 Dashboard、Main Route、Quest Viewer、Knowledge Viewer、Labs、Projects、Tech Map、Route Backlog 和既有 Inbox 入口。
- Markdown 使用受控 React 节点渲染，不执行原始 HTML，也不使用 `dangerouslySetInnerHTML`。
- T2 chunk 与首页分离；访问 `/#/tech-os` 时才加载工作台和索引。
- Dashboard/Viewer 本身不修改数据；独立 Repository 页面只允许编辑受管源文件的内存草稿，并在完整校验和用户确认后提交。
- 前端索引会成为 Pages 构建产物的一部分；不适合公开的 Tech OS 内容不得部署到公开站点，Repository Adapter 不改变这一事实。

### 2.7 Tech OS Repository Adapter

Repository Adapter 与导航发布、加密备份和 Inbox 同步完全分离，只管理 `tech-os/state.yml` 与实体 Markdown。templates、README、导航 JSON 和 `data/*.enc.json` 不在写入范围。

```text
读取 branch head
    ↓
读取 commit/tree 和 tech-os blobs
    ↓
构建版本 ↔ 内存草稿 ↔ 远端基线逐文件比较
    ↓
浏览器端完整草稿校验
    ↓ 用户确认短语 + confirm
重新读取 branch head
    ↓ 未变化
创建 blobs → tree → commit
    ↓
PATCH branch ref（force: false）
```

- Token 与原始 Markdown 草稿只保存在当前 React state，不进入 LocalStorage、备份或日志。
- 每个文件限制 256 KiB，总量限制 2 MiB，最多 500 个文件；目录树截断时停止。
- 单次提交涉及的所有文件进入同一个 Git commit。
- 写前 head 不同或 ref 更新返回 409/422 时视为冲突，停止并要求重新读取。
- 不支持删除文件。远端独有文件可以读取、采用为草稿和继续编辑，但不能被静默删除。
- Repository 页面不自动设置 Main Route、不升级 Knowledge、不声明实验完成；这些不变量由草稿校验继续约束。

### 2.8 Tech OS T3 Capture Adapter

T3 不修改本机 `InboxStore version: 1`，也不建立第二份云端私有数据文件；Tech OS 个人学习打卡与 Inbox 共用解密后 version 2 的共享数据：

```text
Mobile Quick Capture
    ↓ Question / Idea / Note / Link
baize_inbox_v1 + tech-os/* 类型标签
    ↓ AES-256-GCM 共享数据 v2（Inbox + 个人学习打卡）
PC Tech OS Inbox
    ↓ 用户选择“加入 Repository 草稿”
tech-os/inbox/INBOX-….md（React 内存）
    ↓ 远端读取 + diff + 完整校验 + 人工确认
Repository 原子 commit
    ↓ 成功后
来源 Inbox Item → archived
```

- Question / Idea / Note 底层仍是 `type: text`，Link 仍是 `type: link`；内部标签不会进入“复制 Markdown”。
- 旧文本没有类型标签时按 Note 展示，不重写本机数据；旧链接按 Link 展示。
- Tech OS Inbox Item 使用来源 Inbox UUID 派生稳定数字 ID，并同时保存 `origin_id` 与 `source_inbox_id`，重复处理会命中同一路径。
- Adapter 只生成待处理 Inbox Item，不自动创建 Question、Knowledge、Project 或 Route Seed，也不改变 Main Route。
- Repository 提交、远端读取或本机归档任一步失败都不会删除来源记录；删除仍只使用既有 tombstone 语义。
- Inbox 密文是私有数据，但一旦转入 `tech-os/` 就成为仓库明文，并可能进入公开 Pages 投影；UI 在处理前明确显示该边界。
- 个人学习打卡只同步任务完成状态及更新时间，不会自动修改 Quest Markdown、正式完成 Quest、升级 Knowledge 或切换 Main Route。

### 2.9 Tech OS T4.1 Rules-First Learning Engine

Learning Engine 是 `TechOsIndex + InboxItem[] → LearningEngineResult` 的纯函数，不读取网络、不写 LocalStorage、不调用 Repository Adapter：

```text
state.yml mode + Current Quest
显式 entity IDs + Markdown 固定章节
未归档 Inbox Capture
    ↓ 纯规则、确定性排序
Next Action + Alternatives
Open Questions + Quest Suggestions
Knowledge Connections + Route Seed Signals
    ↓ 只读 UI
用户查看来源并自行决定
```

- Explore 优先 Current Quest 的“下一步”；Lab 优先关联当前路线的 planned/running Lab；Keep Alive 过滤掉 focused 动作，只保留 small 动作。
- 每条动作包含 `reason`、`sourceIds`、effort 和确定性 priority；相同输入必须得到相同输出，服务不得修改输入对象。
- Open Questions 只读取 `open` / `deferred` Question。Quest Suggestions 只读取 Main Route 显式关联的 backlog Quest，并按 `order` 排序。
- Knowledge Connections 只解析 `quest_ids`、`question_ids`、`lab_ids`、`project_ids` 与 `related_knowledge_ids`，不进行标题相似度或 AI 臆测。
- Route Seed Collector 只收集显式信号，并跳过已经通过 `route_seed_id`、Seed `origin_id` 或 `related_question_ids` 覆盖的 Question。
- T4.1 不创建文件、不写 Repository、不生成 Candidate、不声明完成、不切换 Main Route。相关信号聚合与 Candidate 草稿属于 T4.2。

### 2.10 Tech OS T4.2 Route Candidate Generator

Candidate Generator 仍是确定性纯函数。它读取构建期 Route Seed 与 T4.1 Signal，只使用显式 tags 建立连接分量：

```text
Saved Route Seeds + Route Seed Signals
                ↓ 共享具体标签（至少 2 条输入）
        RouteCandidateGroup[]
                ↓ 用户编辑 Name / Why / Outcome / Outline
        candidate Markdown 内存草稿
                ↓ 候选专属确认短语
        Repository Adapter
                ↓ 完整校验 + 远端比较 + 提交短语 + 二次确认
        可选原子 commit
```

- `internet`、`system`、`architecture` 等宽泛领域标签不会单独建立聚合关系，避免把同一大领域的无关问题合并。
- 连通分量不足两条输入、没有共同具体标签、没有可验证 Tech OS 来源对象时不生成候选。
- Candidate ID 从已有 `RS-XXX` 最大编号后确定性递增；路径固定为 `tech-os/routes/candidates/RS-XXX.md`，kind 仍为 `route-seed`，status 为 `candidate`。
- 默认来源、理由、路线节点与预期结果都可编辑；Front Matter 字符串使用安全序列化，生成后立即接受完整 schema、关系、路径与 Main Route 校验。
- UI 不写 LocalStorage，不直接调用 GitHub。输入 `STAGE RS-XXX` 只把文件加入 React 内存草稿；Repository 仍执行独立的 `COMMIT TECH-OS` 与浏览器确认。
- 如果聚合输入来自私有 Inbox，编辑器在草稿生成前明确提示：标题进入 Repository 后会成为明文并可能出现在公开 Pages 投影。
- T4.2 本身不执行 Candidate 决策、生成 Review 或排名 Next Route；这些职责由后续 Route Engine 阶段承担，且任何阶段都不自动修改 `state.yml`。

### 2.11 Tech OS T4.3–T4.6 Route Lifecycle

Route Engine 延续纯函数派生与 Repository 最终写入边界：

```text
Candidate ──人工决定──> Candidate 更新草稿（保留同一路径）
Main Route + Quests ──completed 或 ≥80%──> Route Review 草稿
Review Ready + Candidate Groups/Seeds ──确定性排名──> 2–4 条 Backlog Route 建议
Manual Topic/Why/Outcome ──规则模板──> Backlog Route 草稿
                                  ↓
                         Repository Adapter
                                  ↓
                    完整校验 + 远端比较 + 人工提交
```

- T4.3 的 Save for Later 保持 `candidate`；Archive 与 Not Interested 改为 `archived` 并写入决定、理由和日期。Repository 第一版不支持删除，所以始终保留原 Candidate 文件。
- T4.4 只在主路线已完成或显式 Quest 完成率达到 80% 时生成 `route-review`；Review 收集的证据只来自显式关系和真实状态，planned Lab/Project 不算完成证据。
- T4.5 依赖 Review 门槛，输出最多四条带来源解释的建议。当前 Review 未就绪时返回空列表，而不是提前诱导切换路线。
- T4.6 使用主题规则与已有 Tech Map 生成可编辑骨架；规则只能建议节点，不能声明节点已掌握。
- 推荐与手工生成的 Route 均固定为 `status: backlog`、`main: false`，不创建 Active Quest，也不修改 `state.yml`。
- UI 中的 `DECIDE ...` / `STAGE ...` 只把草稿加入 React 内存；Repository 仍独立执行 schema 校验、分支 head 检查、`COMMIT TECH-OS` 与浏览器二次确认。

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

Inbox 与 Tech OS 个人学习打卡共用 `data/inbox.enc.json`，但不改变本机 `InboxStore version: 1` 或 `NavigationBackup v1`。解密后的共享数据为 version 2：`items` 保存 Inbox，`studyProgress` 保存带更新时间的个人学习打卡；解析器同时接受旧 version 1 内容，并把它视为“只有 Inbox、没有学习打卡”的合法旧数据。

界面提供两条明确的数据流：

- “从云端恢复”只执行 GET、解密和本地合并，不 PUT、不创建 commit，适合第一次在新手机或电脑接入；本机独有内容会保留。
- “合并并同步”固定执行“GET → 解密校验 → 合并 → 加密 → 使用已读取 SHA PUT”，把合并结果提交回远端。Inbox 同 ID 使用较新的 `updatedAt`，时间相同优先删除 tombstone；学习打卡也以任务更新时间合并，取消打卡作为可传播的状态保留。

任一步失败都不清空本机数据。并发更新返回 409 时停止，不 force 覆盖。PAT 与加密密码只存在当前页面内存，不写 LocalStorage；公开 `tech-os/**/*.md` 和导航 CMS `src/data/*.json` 仍走各自的 Repository / 发布流程，不属于这份私有共享数据。

Phase H 在 PC Inbox 增加显式的“转为博客草稿”操作。用户先确认 title、slug、category、format、tags 和 related，然后使用仅存于当前页面内存的 PAT 对 `baizetop1/baizetop1.github.io` 执行非 force 原子提交。系统只新建 `_drafts/<slug>.md`，并在写入前检查草稿和已发布文章的 slug 冲突；不覆盖文件、不写 `_posts`、不直接公开发布。远端草稿创建成功后才归档来源 Inbox，归档状态仍需用户下次主动同步进入加密 Inbox。

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
- RSS 聚合、浏览历史（GitHub Trending 热榜已完成基础版本）。
- 网站健康检测和失效链接报告（基础版本已完成：每日检查并在卡片标记异常）。
- 场景模式、翻译历史、二维码与访问统计面板（已完成基础版本）。
- AI 搜索入口与辅助分类。

这些功能不应阻塞 CMS 的数据模型、编辑器和 GitHub 同步主链路。

## 13. 关键决策摘要

- GitHub 仓库中的 JSON 是导航发布数据的唯一事实来源；LocalStorage 保存草稿、场景偏好、翻译历史、90 天正式网站统计和 30 天临时网址统计，这些本机数据可通过加密完整备份跨设备迁移。
- Inbox 与 Tech OS 个人学习打卡组成同一个本地优先私有共享域：Inbox 本机 schema 保持 version 1，`data/inbox.enc.json` 解密后的共享数据使用 version 2；用户可只读恢复或主动合并同步，旧 version 1 密文继续可读。它们不进入公开文本索引或导航覆盖式备份。
- 公开 Tech OS Markdown 与导航 CMS 是独立的 GitHub 发布数据域，不会被私有共享同步自动创建、覆盖或发布。
- 前端构建变量不是秘密，不能用于安全认证或保存 GitHub Token。
- 布局同时支持稳定排序和可选的四列自由桌面坐标，窄屏回落为响应式流式布局。
- 标签先由网站数据聚合，减少重复维护。
- GitHub Pages 环境优先采用 Hash 路由或页内管理，避免 `/admin` 刷新 404。
- 多文件原子发布和纯静态 OAuth 都会显著增加复杂度，应在基础 CMS 稳定后再评估。
