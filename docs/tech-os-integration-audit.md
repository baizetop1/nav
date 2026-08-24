# Tech OS — T0 Integration Audit

> 审计日期：2026-08-24
>
> 范围：`baizetop1/nav`、`baizetop1/baizetop1.github.io`、本地 Phase A / B / C 增量
>
> 本文档的 T0 主体只给出集成结论与后续边界；文末追加后续阶段的实际实施记录。

> 后续状态：本审计完成后，Personal Text Network Phase D 已继续实现。文中“Phase C 尚无 GitHub 同步”描述的是 T0 审计时点；当前 Inbox 已具备独立加密合并同步，这项能力可作为未来 Tech OS T3 Adapter 的前置基础。

## 1. 结论摘要

Tech OS 可以在现有系统上增量建设，不需要重构 Phase A–C。推荐采用以下归属：

| 系统 | 保持的职责 | Tech OS 接入方式 |
|---|---|---|
| `nav` | 统一入口、PC 工作台、移动 Capture、本机状态、GitHub 适配 | Tech OS 的宿主仓库与 UI 宿主；T1 数据默认放在仓库根目录 `tech-os/` |
| Phase C Inbox | 本机多条信息捕获 | 通过 Adapter 把 Question / Idea / Note / Link 映射到既有 Inbox，不另建第二套移动收件箱 |
| GitHub | 数据、代码与版本历史 | T1 先使用 Markdown + Front Matter；后续增加独立 Tech OS Repository Adapter，不复用覆盖式导航备份写入逻辑 |
| Blog | 成熟公开内容 | 只接收用户主动发布的成熟成果，继续走 `_drafts` → `_posts` 流程 |

默认数据落点为：

```text
baizetop1/nav
└── tech-os/
```

选择 `nav` 而不是 Blog 的原因：

1. `nav` 已经是统一入口，并已经具备浏览器端 GitHub PAT、GitHub API、Hash 状态入口和 PWA 外壳。
2. 根目录 `tech-os/` 不在 Vite 的 `public/` 或 `src/` 中，只要不主动导入，就不会进入 GitHub Pages 的 `dist`。
3. Blog 是公开输出端。Jekyll 默认可能复制未排除的根目录内容，把学习中的问题、路线和实验放入 Blog 会模糊边界，并带来误公开风险。
4. Tech OS 数据与导航正式数据可以在同一仓库版本化，但必须使用不同目录、不同 schema、不同 GitHub 写入 Adapter。

注意：本地无法证明 `nav` 仓库在 GitHub 上的可见性。`tech-os/` 不进入 Pages 构建，不代表 GitHub 源码不可见；若 Tech OS 内容必须私密，应在 T1 开始前改用独立私有仓库，不能等写入大量数据后再迁移。

## 2. 当前基线状态

### 2.1 仓库与分支

| 仓库 | 本地目录 | 技术栈 | 当前分支 | 远端 |
|---|---|---|---|---|
| Navigation | `F:\nav-main\nav-main` | React 18、TypeScript、Vite、Tailwind、GitHub Pages | `main` | `https://github.com/baizetop1/nav` |
| Blog | `F:\baizetop1-master\baizetop1.github.io-push` | Jekyll、Markdown、Node.js 辅助脚本、GitHub Pages | `master` | `https://github.com/baizetop1/baizetop1.github.io.git` |

两个仓库均未发现 `AGENTS.md`。

### 2.2 必须先处理的基线风险

审计时 Phase A–C 已存在于本地工作树，但尚未形成 Git commit：

- Blog：`pages.yml`、`README.md`、`package.json` 已修改；文本索引生成器、测试和 `text-index.json` 尚未跟踪。
- Nav：`README.md`、`docs/ARCHITECTURE.md`、`package.json`、`App.tsx`、`CommandPalette.tsx`、`config.ts` 已修改；Phase B/C 的服务、类型、组件和自检尚未跟踪。

因此必须区分：

```text
本地已实现
≠
远端已提交
≠
GitHub Pages 已部署
```

T1 开始条件：先把 Phase A、Phase B、Phase C 分别检查、提交并部署，记录基线 commit SHA。Tech OS 不应与这批未提交改动混在同一提交中。

## 3. Existing System Audit

### 3.1 当前仓库结构

Navigation 的正式站点数据位于：

```text
src/data/sites.json
src/data/categories.json
src/data/layout.json
```

应用代码集中在 `src/components`、`src/lib`、`src/services`、`src/types`。静态 Pages 文件放在 `public/`，产物写入被忽略的 `dist/`。

Blog 的写作数据位于：

```text
_drafts/                       # 未发布草稿
_posts/                        # 已发布 Markdown
templates/post.md              # 文章模板
scripts/                       # 创建、发布、校验、索引脚本
```

### 3.2 Phase A：公开文本索引

本地工作树已实现：

- 从 Blog `_posts/` 生成 schema version 1 的根级 `text-index.json`。
- 不扫描 `_drafts/`，不输出 Markdown 正文。
- 输出标题、URL、摘要、分类、形式、标签、关联关系和日期。
- 新文章优先使用稳定 `/p/<slug>/`；旧文章继续使用历史日期 URL。
- Blog Pages workflow 在 Jekyll 构建前生成索引。

验证结果：`test:text-index` 3/3 通过，`check:text-index` 检查通过，当前可生成 16 篇公开文章。

### 3.3 Phase B：Nav 发现 Blog 内容

本地工作树已实现：

- Nav 从 `https://baizeone.top/text-index.json` 异步读取公开索引。
- `VITE_TEXT_INDEX_URL` 可用于本地覆盖。
- 进行 version、字段、URL、重复 ID 的基础校验。
- 成功后缓存到 `localStorage.baize_text_index_v1`；远端失败时回退缓存。
- 文章加入首页 Fuse.js 搜索和全局命令面板。
- 关系是 Blog → Nav 的公开只读 Adapter，不会反向修改 Blog。

验证结果：`test:text-network` 通过。

### 3.4 Phase C：本机多条 Inbox

本地工作树已实现：

- 数据键：`localStorage.baize_inbox_v1`。
- schema version：`1`。
- 类型：`text | link`。
- 状态：`inbox | archived`。
- 字段：`id`、标题、正文、URL、标签、创建/更新时间、状态和可选 `deletedAt`。
- 删除采用 tombstone 软删除，不立即物理移除。
- `nav_temp_text` 会一次性复制为“旧临时文本”，但旧便笺继续保留。
- 快速新增、编辑、复制 Markdown、归档、恢复和删除已经具备。
- 当前不进入导航完整备份，也不进行 GitHub 同步。

验证结果：`test:inbox` 通过。

### 3.5 手机端入口

Nav 已是可安装 PWA，scope 与 start URL 均为 `/nav/`。Phase C 在小屏幕提供：

- 固定底部“快速记录 / Inbox”入口。
- 全宽 Inbox 侧栏。
- 文本和链接 Capture。
- 本机自动保存。

旧临时文本仍支持二维码和 `#/transfer` 接收流程。该流程属于临时传输能力，不应被 Tech OS 重写。

### 3.6 PC 端入口

PC 端已有：

- 首页统一搜索。
- `Ctrl/Cmd + K` 全局命令面板。
- Inbox 面板。
- `/#/admin` 页面内管理入口。
- 导航内容编辑、布局、备份、GitHub 发布和 Actions 状态轮询。

项目没有路由库。Tech OS 第一版应沿用 Hash 入口：

```text
https://baizetop1.github.io/nav/#/tech-os
```

不得直接增加需要服务器回退的 `/tech-os` 深层路径。

### 3.7 数据存储方式

| 数据 | 当前事实来源 | 特性 |
|---|---|---|
| 正式导航 | `src/data/*.json` | GitHub 仓库中的正式发布数据 |
| 导航未发布草稿 | `localStorage.nav_cms_draft` | 浏览器本机 |
| Phase C Inbox | `localStorage.baize_inbox_v1` | 版本化、本机、软删除、未同步 |
| 单份临时文本 | `localStorage.nav_temp_text` | 明文保存在本机，可单独加密上传 |
| Blog 公开索引缓存 | `localStorage.baize_text_index_v1` | 只含公开 metadata |
| 场景、统计、翻译、临时网址 | 多个既有 LocalStorage key | 部分进入导航完整备份 |
| 导航加密云备份 | `data/navigation-backup.enc.json` | 单份 AES-256-GCM 密文 |
| 临时文本云文件 | `data/temp-note.enc.json` | 单份 AES-256-GCM 密文 |

Tech OS 不得加入现有 `NavigationBackup v1`。该格式是固定 key 列表和整体恢复语义，直接加入会改变稳定格式，也不能解决多设备逐对象合并。

### 3.8 GitHub 同步机制

当前存在三条不同写入链：

1. 正式导航发布：使用 Git Data API 创建 tree/commit，并以非 force 方式更新分支 ref，一次原子更新三个导航 JSON。
2. 加密导航备份：使用 Contents API 覆盖单个密文文件。
3. 加密临时文本：使用 Contents API 覆盖单个密文文件。

Phase C Inbox 没有 GitHub 同步、拉取合并、冲突解决或设备游标。

Tech OS 后续需要独立的 `TechOsRepositoryAdapter`：

- 读取和写入 `tech-os/` 下的 Markdown。
- 写入前读取 SHA 或最新 branch head。
- 冲突时停止并提示，不 force push。
- 一次操作涉及多文件时使用 Git Data API 原子提交。
- 不调用 `publishNavigationData()`，也不覆盖现有两个加密文件。

### 3.9 Markdown 处理机制

Blog 使用 Jekyll + kramdown，文章由 YAML Front Matter 与 Markdown 正文组成。Node 辅助脚本拥有一个满足当前文章字段的轻量 Front Matter parser，并提供：

- 新建草稿。
- `_drafts` 转 `_posts`。
- 内容检查。
- 公开索引生成。

这个 parser 只支持当前文章所需的标量和简单列表，不是完整 YAML 实现。Tech OS 的嵌套关系、证据、来源和路线节点不能偷偷扩展后直接复用它；T1 应建立独立、版本化且可验证的 Tech OS schema，首版字段保持扁平。

Nav 当前没有 Markdown 渲染器。T2 如果渲染正文，必须使用经过清洗的 Markdown renderer，禁止把不可信 HTML 直接写入 DOM。

### 3.10 部署机制

Navigation：

- `main` / `master` push 或手动触发。
- Node 20、`npm ci`、Vite build。
- `dist` 部署到 `gh-pages` 分支。
- 另有链接健康检查和每小时热榜刷新工作流。

Blog：

- `master` / `main` push 或手动触发。
- 先执行内容与文本索引检查，再由 Jekyll 构建。
- 使用官方 GitHub Pages artifact/deploy 流程。
- 另有 PR 内容检查和每周内容健康审计。

`nav/tech-os/` 根目录不会自动进入 Vite `dist`。未来若要让 T2 UI 读取它，必须在构建期生成明确的、最小化的索引或在运行时通过经过认证的 GitHub Adapter 读取，不能把整个目录复制进 `public/`。

### 3.11 Nav / Blog 关系

现有关系是单向公开发现：

```text
Blog _posts
  ↓ build
/text-index.json
  ↓ HTTPS GET
Nav 搜索与命令面板
```

Tech OS 与 Blog 的正确关系也应是单向、显式发布：

```text
Tech OS 成熟 Knowledge / Lab / Project
  ↓ 用户选择“准备公开”
生成 Blog draft
  ↓ 继续沿用 Blog 校验与发布流程
Blog _posts
```

T0–T4 均不得自动发布 Blog。

### 3.12 URL 结构

| 资源 | 当前 URL 约束 |
|---|---|
| Nav | `/nav/`，Vite base 固定为 `/nav/` |
| Nav 管理 | `/nav/#/admin` |
| Nav 临时传输 | `/nav/#/transfer...` |
| Tech OS 建议入口 | `/nav/#/tech-os` |
| Blog | `https://baizeone.top/`，`baseurl` 为空 |
| Blog 新文章 | `/p/<slug>/` |
| Blog 历史文章 | 保持已有日期型 URL |
| Blog 公开索引 | `/text-index.json` |

Tech OS 不改变以上任何 URL。

### 3.13 GitHub Actions

Navigation 当前工作流：

- `deploy.yml`：构建并发布导航。
- `link-health.yml`：检查链接、写回报告并部署。
- `hot-feed.yml`：定时刷新热榜并部署。

Blog 当前工作流：

- `pages.yml`：校验、生成文本索引、Jekyll build、Pages deploy。
- `content-check.yml`：PR / 手动内容校验。
- `content-audit.yml`：每周生成内容健康报告。

T1 只允许新增独立 Tech OS 校验脚本；是否接入 Actions 应在 T1 schema 稳定后再做。不得把 Tech OS 校验塞进 Blog 内容检查，也不得让已有定时工作流写入 Tech OS 数据。

### 3.14 认证方式

当前为纯静态站点，无后端：

- 用户运行时输入 GitHub fine-grained PAT。
- Token 只存在 React state 内存，不写 `.env`、LocalStorage 或仓库。
- GitHub API 使用 `Authorization: Bearer`。
- 导航发布需要 Contents 写权限；Actions 查询或触发还需要对应 Actions 权限。
- 加密密码不保存，AES-256-GCM + PBKDF2-SHA-256 在浏览器完成。
- 纯 Pages 环境没有 OAuth client secret，现阶段不采用 GitHub OAuth。

Tech OS 必须继续沿用“运行时凭证、最小权限、不落盘”。如果 `tech-os/` 位于同一个 `nav` 仓库，可以使用同一个只授权该仓库的 fine-grained PAT；但 Tech OS Adapter 必须与导航发布按钮分离，并在提交前显示目标目录和变更摘要。

## 4. 集成边界

### A. 可直接复用能力

1. `RepositoryTarget` 的 owner / repo / branch 表达。
2. GitHub Token 规范化、运行时内存保存和权限错误提示。
3. Git Data API 的原子提交思路和 Actions 状态轮询模式。
4. Phase C Inbox 的版本化 LocalStorage、稳定 ID、时间戳、归档和 tombstone。
5. Inbox 固定底部入口、移动侧栏与全局命令面板。
6. Hash 状态入口与 GitHub Pages `/nav/` 基础路径。
7. Blog 的 Markdown 写作、草稿、检查、发布与稳定 URL 流程。
8. Phase A/B 的公开只读 Text Node / related 关系模式。
9. 现有自检脚本风格：纯 Node、无额外测试框架、schema 失败即退出非零。

### B. 可接入但禁止修改的能力

1. `src/data/sites.json`、`categories.json`、`layout.json` 及其发布 commit 语义。
2. `NavigationBackup v1`、`navigation-backup.enc.json` 和整体恢复逻辑。
3. `temp-note.enc.json`、`nav_temp_text`、二维码与 `#/transfer`。
4. `baize_inbox_v1` 的现有字段、迁移标记和软删除语义。
5. Blog `_drafts` / `_posts`、文章 Front Matter、`/p/<slug>/` 与历史 URL。
6. `text-index.json` version 1 的公开文章语义。
7. 两站现有 Pages workflow、PWA scope 和 service worker 缓存边界。

这里的“禁止修改”表示 T1–T3 优先通过新文件和 Adapter 接入；如未来确实需要 schema 升级，必须建立显式新版本、迁移、自检和回滚方案，不能原地改变含义。

### C. 必须独立实现的能力

1. Tech OS entity schema 与 ID 规则。
2. `tech-os/` Markdown 目录、模板和示例数据。
3. Tech OS validator、索引器和“一条 Main Route”不变量检查。
4. Tech OS Repository Adapter 与冲突处理。
5. Desktop Dashboard、Route、Quest、Knowledge、Lab、Project、Map Viewer。
6. Phase C → Tech OS 的 Capture / Process Adapter。
7. Route Seed、Candidate、Review 和 Route Engine 规则。
8. Markdown 安全渲染与 Tech OS 专用本机缓存。

## 5. T1 数据基础建议

### 5.1 目录

T1 建议在 `nav` 根目录建立：

```text
tech-os/
├── README.md
├── state.yml
├── inbox/
├── vision/
├── routes/
│   ├── active/
│   ├── backlog/
│   ├── completed/
│   ├── archived/
│   ├── seeds/
│   └── candidates/
├── quests/
│   ├── active/
│   ├── backlog/
│   └── completed/
├── questions/
├── knowledge/
│   ├── internet/
│   ├── programming/
│   ├── system/
│   ├── architecture/
│   ├── electronics/
│   ├── ic/
│   └── ai/
├── labs/
├── projects/
├── map/
├── graveyard/
├── logs/
└── templates/
```

`state.yml` 只保存 schema version、`main_route_id`、`current_quest_id` 等少量全局指针。实体正文继续是可独立阅读的 Markdown。

### 5.2 首版 schema 原则

- 每个对象有永久唯一 ID，文件移动不改变 ID。
- Front Matter 首版只用字符串、布尔、数字和字符串数组，避免依赖复杂 YAML。
- 所有关系只保存 ID，不保存相对文件路径。
- `source`、`origin`、`reason` 和创建时间必须保留。
- Knowledge 等级只能由用户确认；Lab 证据不能由系统臆造。
- 删除默认进入 archived / graveyard；不可静默物理删除。
- schema 从 version 1 开始，validator 拒绝未知 version、重复 ID 和悬空关系。
- `routes/active/` 最多只能有一个 `main: true`，系统不能自动替用户设为 Main Route。

### 5.3 Phase C Capture Adapter

T3 不扩展第二套本地 Store。第一版映射建议：

| 移动 Capture | Phase C 表达 | Process 后目标 |
|---|---|---|
| Question | `type: text` + 标签 `tech-os/question` | Question，必要时创建 Route Seed |
| Idea | `type: text` + 标签 `tech-os/idea` | Inbox / Route Seed / Project idea |
| Note | `type: text` + 标签 `tech-os/note` | Knowledge 草稿或普通 Inbox |
| Link | `type: link` + 标签 `tech-os/link` | 关联 Question / Knowledge / Route |

处理完成后只归档原 Inbox item，并在 Tech OS 对象中记录 `source_inbox_id`；不要删除原记录。该方案不改变 `baize_inbox_v1` schema。

## 6. 后续开发顺序

本轮只完成 T0。后续推荐严格按以下顺序推进：

1. **Baseline Gate**：提交、部署并记录 Phase A–C SHA；确认 `nav` 仓库可见性符合 Tech OS 数据要求。
2. **T1.1 Schema**：定义 entity Front Matter、ID、关系、状态和 `state.yml`。
3. **T1.2 Templates**：建立全部模板和 VISION-001 / ROUTE-001 示例。
4. **T1.3 Validator**：检查重复 ID、悬空关系、合法状态和唯一 Main Route。
5. **T1.4 CLI**：提供只读 list/check 与安全 create/move 命令；仍无需 UI。
6. **T2 Read-only First**：先做 Dashboard / Viewer / Tech Map 索引读取，再加入编辑提交。
7. **T2 Repository Adapter**：独立 GitHub 读写、diff 预览、冲突检测和原子 commit。
8. **T3 Capture Adapter**：把现有 Inbox 的 Question / Idea / Note / Link 转入 Tech OS。
9. **T4 Rules First**：先实现可解释规则，再做 Route Seed 聚合、候选生成和人工选择。

不应提前做 Route Engine、自动 Blog 发布、复杂图谱动画、独立后端或新移动 App。

## 7. 风险与控制

| 风险 | 控制措施 |
|---|---|
| Phase A–C 尚未提交，T1 与基线混杂 | T1 前独立提交并部署 A–C，记录 SHA |
| Tech OS 数据随 GitHub 源码可见 | T1 前确认仓库 visibility；需要私密时立即选择独立私有 repo |
| 把 Tech OS 放入 Blog 导致误发布 | 不放 Blog；成熟内容只生成 draft 并由用户发布 |
| 复用覆盖式备份导致多设备丢数据 | Tech OS 独立逐文件/原子 commit Adapter，冲突即停止 |
| 两设备同时更新 branch ref | 写前拉取 head/SHA，禁止 force，显示冲突 |
| Front Matter 变复杂后轻量 parser 误读 | T1 schema 保持扁平并新增专用 validator |
| Markdown HTML 注入 | T2 使用安全 renderer 和 sanitizer，不直接注入 HTML |
| 多条 Active Main Route | validator + UI 双重约束，最终切换必须由用户确认 |
| AI 擅自升级知识或宣称实验完成 | schema 记录证据，等级与完成状态只接受用户操作 |
| PWA 离线时无法读取 GitHub | 本机缓存只作工作副本；界面明确显示未同步/冲突状态 |
| Tech OS 进入导航 `public/` 后被公开 | canonical 数据保持在根 `tech-os/`，只生成最小 UI 索引 |

## 8. T0 验收结论

- 已检查两仓库结构、分支、工作树与远端配置。
- 已核对 Phase A、B、C 的实际实现和未提交状态。
- 已核对手机入口、PC 入口、数据存储、GitHub 同步、Markdown、部署、URL、Actions 与认证。
- 已明确 A 可复用、B 禁止修改、C 独立实现三类边界。
- 已决定默认数据落点：`baizetop1/nav/tech-os/`。
- 已决定 Tech OS UI 入口：`/nav/#/tech-os`。
- 已决定 T3 复用 Phase C Inbox，不重复开发 Capture Store。
- 已明确 Blog 只负责成熟内容公开输出。
- 已给出 T1–T4 的依赖顺序与风险门槛。

T0 完成。当前不应继续实现 T1，直到 Phase A–C 基线已提交部署、并确认 Tech OS 数据的 GitHub 可见性要求。

## 9. T1 实施记录（2026-08-24）

用户在 T0 与 Phase D 完成后明确要求继续，因此在不修改现有业务代码的前提下实施 T1 Data Foundation。为控制尚未提交基线带来的混杂风险，本阶段只新增根目录 `tech-os/`、两个独立校验脚本和 npm 命令，并把说明追加到现有文档；未实现 T2–T4。

已完成：

- 建立完整目录、扁平 Front Matter schema、模板和 `state.yml` 指针。
- 建立 VISION-001、“从输入网址到网页显示”主路线、8 个 Quest、2 个 Question、1 个 Route Seed、1 个 Knowledge、1 个 Lab、1 个 Project 和 1 个 Tech Map。
- 初始 Knowledge 保持 L0，Lab 保持 planned，不臆造证据或实验结果。
- 提供 `npm run check:tech-os`，验证目录、schema、ID、关系、状态、路径、唯一 Main Route、问句 Quest 和知识证据等级。
- 提供 `npm run test:tech-os`，覆盖重复 ID、双 Main Route、悬空引用、L2 缺证据、非问句 Quest 和无效当前 Quest 等故障。

仍保留的门槛：在把 T1 推送到远端前，必须确认仓库可见性符合个人学习数据的隐私要求，并先整理、提交和部署当前 Personal Text Network 基线。T1 数据不会进入现有 Vite `dist`；后续 T2/T3 的 UI 与 GitHub Adapter 仍需单独设计、校验和授权。

## 10. T2 Read-only Workstation 实施记录（2026-08-24）

用户明确要求继续后，先实施 T2 的只读部分，未提前进入 Repository Adapter、T3 或 T4：

- 新增稳定入口 `/#/tech-os`，不引入路由库、不改变既有 URL。
- 新增 Dashboard、Main Route、Quest、Inbox 边界页、Knowledge、Labs、Projects、Tech Map 和 Route Backlog 九个视图。
- 构建期先执行 T1 validator，再由 `scripts/build-tech-os-index.mjs` 生成单向前端投影；索引文件忽略提交，Markdown 仍是唯一事实源。
- 使用永久 ID 解析对象关系；Viewer 不保存另一份业务状态。
- Markdown 只渲染为受控 React 元素，不执行原始 HTML。
- 工作台与索引使用动态 import，避免增加导航首页首屏 chunk。
- Inbox 页面只打开现有 Phase C/D Inbox，不转换记录、不修改其 schema；转换职责仍留给 T3。
- 增加 `npm run test:tech-os-ui`，检查投影 schema、全局指针、对象数量、路线顺序和相对源路径。

隐私边界随 T2 发生变化：canonical `tech-os/` 仍不会被整体复制到 `public/`，但 Viewer 所需的前端投影会进入 `dist`，部署到公开 Pages 后即可被访问。因此本地实现完成不等于允许部署；推送或发布前仍需用户确认内容公开范围。Repository Adapter 的后续实施记录见下一节。

## 11. T2 Repository Adapter 实施记录（2026-08-24）

在只读 Viewer 稳定后，继续实现独立 Tech OS Repository Adapter：

- 读取 branch ref、commit、recursive tree 与受管 Tech OS blobs，保存读取时的 head SHA。
- 受管范围固定为 `tech-os/state.yml` 与实体 Markdown；排除 templates、README、导航数据和所有加密文件。
- 构建索引增加 18 个 canonical 源文件快照，Repository 页面以此初始化仅内存草稿。
- 显示相同、已修改、仅草稿和仅远端四类逐文件差异，并提供草稿/远端并排预览。
- 浏览器端重新解析完整 Front Matter，检查 schema、ID、关系、Quest 问句、Knowledge 证据、state 指针和唯一 Main Route；失败时禁止提交。
- 提交前要求确认短语与原生 confirm，并再次读取 branch head；变化时零写入退出。
- 使用 Git Data API 创建 blobs、tree 和单个 commit，最终以 `force: false` 更新 branch ref。
- Token 和草稿不持久化；不支持删除、force push、自动路线选择或自动 Knowledge 升级。
- `npm run test:tech-os-repository` 使用模拟 GitHub API 验证路径隔离、读取范围、差异分类、原子提交和冲突零写入。

本阶段没有使用真实 Token 或执行真实 GitHub 写入。发布隐私门槛不变：Pages 中的前端投影是可读内容；Repository Adapter 不能把公开前端变成私密应用。

## 12. T3 Capture Adapter 实施记录（2026-08-24）

T3 按 T0 确定的 Adapter 优先边界接入，没有修改 Phase C/D 的 Store schema 或加密同步格式：

- 快速记录提供 Question、Idea、Note、Link 四种语义入口；底层仍使用 `text` / `link` 与 `tech-os/*` 标签。
- 旧的无标签文本按 Note 展示，旧链接按 Link 展示，不执行破坏性迁移。
- Tech OS Inbox 显示现有未归档记录；用户明确选择后，生成稳定路径的 `inbox-item` 内存草稿。
- 草稿保留原 UUID 的 `origin_id` 与 `source_inbox_id`，并记录 `capture_type`；浏览器端与 Node 校验器都拒绝未知类型。
- 草稿通过现有 Repository Adapter 读取、diff、完整校验与原子提交，不增加新的 GitHub 写入链。
- 只有 Repository 提交成功后才归档来源 Inbox item；失败、冲突或本机存储失败时不删除来源内容。
- 不自动创建 Route Seed、不切换 Main Route、不升级 Knowledge，也不发布 Blog。
- `npm run test:tech-os-capture` 覆盖四类映射、Inbox v1 兼容、稳定 ID、来源追踪、完整草稿校验、旧数据回退和归档/删除输入拒绝。

隐私边界：Phase C/D Inbox 在仓库中仍只有密文；用户把记录加入 Tech OS Repository 后，内容会成为 `tech-os/` 明文并可能进入公开 Pages 投影。T3 UI 在处理页明确警告这一变化。

## 13. T4.1 Rules-First Learning Engine 实施记录（2026-08-24）

T4.1 先实现确定性、可解释、只读规则，没有提前进入 Candidate Generator：

- 新增纯函数 Learning Engine，输入仅为构建期 Tech OS 投影和当前浏览器中的 Inbox items。
- Explore、Lab、Keep Alive 分别采用不同优先级；Keep Alive 强制过滤 focused 动作。
- Next Action 与备选动作覆盖 Current Quest、关联 Lab、未归档 Inbox、Open Question、低等级 Knowledge 和已有 Route Seed。
- Open Question、Quest Suggestion、Knowledge Connection 全部来自显式状态与 ID，不使用模糊匹配或未说明的 AI 推断。
- Route Seed Collector 从未覆盖 Question、Question/Idea Capture、Knowledge Gap 及明确写入 Lab、Project、Completed Quest 章节的项目收集信号，并进行确定性精确去重。
- Learning Engine UI 显示每条建议的原因、来源、模式和 read-only 边界；点击只导航到来源。
- 不生成 Route Seed 文件、不写 Repository、不切换 Current Quest 或 Main Route、不升级 Knowledge、不声明 Lab 完成。
- `npm run test:tech-os-learning` 覆盖三种模式、Keep Alive 小动作约束、已有 Seed 排除、知识缺口与 Inbox 信号、显式连接、确定性和输入不变性。

T4.2 才可以把多个相关信号聚合成 Candidate 草稿；在用户确认之前仍不得保存、排名为 Main Route 或修改 `state.yml`。

## 14. T4.2 Route Candidate Generator 实施记录（2026-08-24）

T4.2 只实现聚合与可编辑草稿，没有提前实现 Route Backlog 决策或 Next Route Engine：

- 新增纯函数 Candidate Generator，将 T4.1 Signals 与已保存 Seed 转换为只依赖显式 tags 的连接分量。
- 只有至少两条输入共享具体标签时才生成候选；宽泛领域标签和孤立 Seed 不触发推荐。
- Candidate ID、排序、来源类型、来源对象、Related Questions 与默认路线节点均确定性生成，相同输入得到相同结果且不修改输入。
- 编辑器允许调整 Route Name、Why、Expected Outcome 与 Outline，同时显示所有聚合依据和源对象。
- 生成文件沿用 `route-seed` schema，使用 `status: candidate` 与 `routes/candidates/` 路径，并在加入 Repository 前完成全量草稿校验。
- 用户必须输入候选专属短语才能加入 React 内存草稿；实际 GitHub 保存仍需要 Repository Token、远端比较、`COMMIT TECH-OS` 和二次确认。
- 聚合包含私有 Inbox 输入时，UI 会在草稿确认区再次提示明文仓库与公开 Pages 边界。
- 不写 LocalStorage、不自动创建 commit、不切换 Main Route、不修改 `state.yml`，也不归档或删除 Seed/Signal。
- `npm run test:tech-os-candidate` 覆盖聚合精度、孤立 Seed 排除、稳定 ID、可编辑内容、完整校验、最小路线节点、确定性和输入不变性。

T4.2 不直接执行 Candidate 决策；T4.3–T4.6 的实现记录如下。

## 15. T4.3–T4.6 Route Lifecycle 实施记录（2026-08-24）

- T4.3 新增 Candidate Decision 纯函数与编辑器。Save for Later 保持 `candidate`；Archive/Not Interested 写为 `archived`，三种决定都保留 reason/date 并更新同一路径，不删除文件。
- T4.4 新增 Route Completion Review 模型。仅当 Route 已完成或 Quest 进度达到 80% 才开放；Review 只汇总显式关联的 Knowledge、已完成 Lab/Project、Open Questions、Route Seeds 与未完成 Quest。
- 新增 `route-review` schema、`tech-os/reviews/` 目录和模板；构建期与浏览器端校验规则保持一致。
- T4.5 在 Review 就绪后确定性生成 2–4 条 Next Route 建议，展示 Why、Source、Related Questions、Existing Knowledge、Expected Outcome 与可编辑 Outline；证据不足时不凑数。
- T4.6 Manual Route Generator 接受主题、原因与目标，按规则生成可编辑路线骨架；“集成电路”规则覆盖 MOSFET、CMOS、Logic Gate、RTL 与验证。
- 所有新 Route 固定为 `routes/backlog/`、`status: backlog`、`main: false`。任何服务或界面都不修改 `state.yml`、创建 Active Quest、升级 Knowledge 或宣布 Lab 完成。
- 每个决定/草稿都需要对象专属确认短语；实际保存仍统一交给 Repository 的完整校验、PAT、远端比较、`COMMIT TECH-OS` 与二次确认。
- `npm run test:tech-os-route-engine` 覆盖三种 Candidate 决定、Review 锁定与 80% 门槛、Review schema、2–4 条推荐、手工“集成电路”路线、Backlog/Main 边界、确定性和输入不变性。
