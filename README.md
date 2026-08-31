# 白泽个人导航 CMS

一个基于 React、Vite 和 GitHub Pages 的个人导航站。网站内容可以在浏览器中编辑为本地草稿，并通过 GitHub API 提交回仓库，由 GitHub Actions 自动重新部署。

## 功能

- 分类展示、响应式布局、明暗主题和时间渐变背景。
- 支持可持久化的日常、工作、学习和休闲场景；工作场景关闭装饰背景、隐藏描述与标签并压缩布局。
- “常用网站”按本机当天点击次数自动选取并排序前 8 个；访问统计保留 90 天，并在管理后台展示趋势、网站排行和分类分布。
- 首页支持直接输入临时网址访问；未加入正式导航的地址会按最近 30 天累计访问次数，并可从“临时访问”面板再次打开、删除或清空。
- 首页提供“技术情报”区域：左侧按“综合 / 国内 / 安全 / AI / 开发”聚合国内消息、官方情报与开发者来源，并记住本机选择；“综合”按国内、安全、AI、开发轮流展示，避免单一类别占满列表。右侧保留 GitHub 今日热门仓库及语言、总 Star、今日新增 Star。支持收起、手动刷新、过期提醒和本机缓存，工作模式会自动压缩为每栏 5 条。
- 提供单份临时文本便笺；可使用 AES-256-GCM 在浏览器中加密后，将密文提交到 GitHub，并在其他设备读取解密；也可生成“打开白泽接收”或纯文本二维码进行临时传输。
- 提供本地优先的多条 Inbox：支持文本和链接快速记录、编辑、复制 Markdown、归档及软删除；升级时会把原有临时文本复制迁移一次，同时保留旧便笺和二维码功能。用户可主动把本机 Inbox 与 Tech OS 个人学习打卡合并进同一份 GitHub 私有密文，也可在 PC 处理时把单条记录转为博客仓库的 Markdown 草稿。
- 首页通过 MyMemory 免费接口原地显示翻译结果，并保留 Google 翻译作为失败回退；成功结果自动写入可搜索、复用和删除的本机翻译历史。
- 使用 Fuse.js 按名称、标签、分类和描述进行模糊搜索。
- 启动后异步读取博客的公开 `text-index.json`，将文章与手工维护的 Topic 按标题、别名、分类和摘要加入 Fuse.js 搜索；结果按“知识节点”和“文章”分组，远端失败时使用本机缓存，不阻塞导航首页。
- 支持 `Ctrl/Cmd + K` 打开全局命令面板，可搜索网站、切换场景和主题、打开翻译、临时文本、统计及管理功能；按 `/` 聚焦站内搜索。
- 支持 Google、百度、必应、GitHub、Bilibili 搜索前缀。
- 通过 `/#/admin` 进入内容管理。
- 管理页按“内容编辑、布局排序、统计与健康”分区懒加载；布局分类默认折叠，进入管理页时暂停底层主页绘制并关闭高成本背景模糊。
- 新增、编辑、删除网站，新增、重命名和删除空分类。
- 使用 dnd-kit 拖拽分类、调整网站顺序并跨分类移动网站。
- 支持桌面四列自由网格坐标，以及 1×1、2×1、1×2、2×2 卡片尺寸。
- 修改自动保存到浏览器本地草稿。
- 使用运行时输入的 GitHub fine-grained PAT 创建数据提交。
- 支持读取远端 JSON、合并或覆盖本地草稿，并轮询 GitHub Actions 部署状态。
- 管理后台可自动识别 HTML：Chrome、Edge 书签导出文件会批量导入并保留文件夹分类；普通保存网页只导入 canonical/og:url 指向的页面自身，不扫描页面内链接。
- 支持带版本校验的完整备份与恢复，覆盖导航草稿、点击统计、30 天临时网址、翻译历史、临时文本和场景偏好，不导出 Token 或密码；临时网址、翻译历史与临时文本在本地备份文件中为明文。
- 可将完整备份使用 AES-256-GCM 在浏览器中加密后保存到 GitHub，并在其他设备读取、解密和恢复；仓库中只保存密文。
- GitHub Actions 每日检查正式导航中的链接；检测到异常时，首页卡片显示状态提醒。
- GitHub Actions 每小时生成 `public/hot-feed.json` 并重新部署；国内消息由中国新闻网要闻、IT之家和百度热搜轮询混排，百度不可用时改用今日头条热榜。安全情报来自 CISA KEV 与 GitHub Security Advisories，AI 动态来自 OpenAI、Google DeepMind 与 Hugging Face，开发动态来自 Hacker News 与 V2EX，右栏继续读取 GitHub Trending。来源失败时会回退到已部署的上一份有效静态数据。
- 管理后台提供链接健康面板，可查看正常、异常、未检查数量、错误原因和最后检查时间；点击“立即检测”后会通过 GitHub Actions 在服务器端检查全部链接并自动刷新报告。
- 每张网站卡片都可在本机生成二维码，支持复制链接、打开网站和下载 PNG，不向第三方二维码服务发送网址。
- 支持安装为 PWA；访问过一次后可离线打开导航壳和已缓存的本站资源，GitHub 与翻译 API 不会进入离线缓存。
- 推送后由 GitHub Actions 构建并发布到 `gh-pages`。

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

Vite 的部署基路径当前为 `/nav/`。如果仓库名发生变化，请同步修改 `vite.config.ts`。

## 数据文件

发布数据位于：

```text
src/data/sites.json
src/data/categories.json
src/data/layout.json
```

站点信息和搜索引擎配置位于 `src/data/config.ts`。TypeScript 类型位于 `src/types/navigation.ts`。

博客索引地址集中配置在 `src/data/config.ts` 的 `TEXT_INDEX_URL`，本地联调时可以使用临时的 `VITE_TEXT_INDEX_URL` 覆盖。远端索引通过 `src/services/textNetwork.ts` 做基础 schema 校验，并缓存到 `localStorage.baize_text_index_v1`；缓存只包含博客公开 metadata，不包含文章正文。解析器兼容 Phase A 的 version 1 与 Phase E–G 的 version 2，version 2 会校验 `related` / `wiki` / `topic` edges、悬空关系、自我关联和边的节点类型；Topic 只来自博客显式节点，不会由普通 tag 自动生成。可以单独验证索引解析与离线回退：

```bash
npm run test:text-network
```

Inbox 本机存储继续使用 `localStorage.baize_inbox_v1` 和 `InboxStore version: 1`，删除操作写入 `deletedAt` 而不是物理移除。`data/inbox.enc.json` 解密后的私有共享数据升级为 version 2，包含 Inbox items 和 Tech OS 个人学习打卡；读取时兼容旧 version 1 数据，旧密文不需要手工迁移。同步标记保存在 `localStorage.baize_inbox_sync_meta_v1`，不包含 Token、密码或正文。Inbox 与学习打卡都不进入现有覆盖式导航完整备份。可以运行：

```bash
npm run test:inbox
npm run test:inbox-sync
```

GitHub Token 和至少 12 字符的加密密码只在当前页面内存中使用，不写入 LocalStorage、仓库或前端构建变量。新设备可以使用“从云端恢复”：只读取、解密并与本机内容合并，不会创建 commit；日常使用“合并并同步”时才执行“GET → 解密 → 合并 → 加密 → PUT”。仓库中只有 AES-256-GCM 密文；读取、解密、合并或提交失败不会清空本机 Inbox 或学习打卡。首次同步会创建远端文件，之后每次同步都携带远端 SHA，遇到并发修改时停止并提示重试。

这份私有共享数据只负责 Inbox 和 Tech OS 个人学习打卡。公开 `tech-os/**/*.md` 仍通过 Repository Adapter / Git 提交，导航 CMS 的 `src/data/*.json` 仍通过管理页发布；两者都不会被“从云端恢复”或 Inbox 同步隐式修改。

Inbox 的“转为博客草稿”会用博客仓库的 GitHub Contents 读写 Token，生成与博客现有脚本兼容的 `_drafts/<slug>.md`。写入前会检查 `_drafts` 和 `_posts` 的 slug 冲突，不会覆盖远端文件；成功后归档来源 Inbox 记录，但不会直接公开发布。Token 仅保留在当前页面内存。可以运行：

```bash
npm run test:blog-draft
```

浏览器中的未发布修改保存在 `localStorage.nav_cms_draft`。场景偏好、翻译历史、最近 90 天正式网站统计和最近 30 天临时网址统计也保存在本机，并包含在完整备份及加密云备份中；仓库中的导航 JSON 文件仍是正式发布数据源。

### Tech OS T1–T4.6 数据、工作台与 Route Lifecycle

Tech OS 的规范数据位于仓库根目录 `tech-os/`，使用 Markdown + 扁平 Front Matter 保存 Vision、Route、Quest、Question、Knowledge、Lab、Project 与 Tech Map。`tech-os/state.yml` 只保存当前 Vision、唯一 Main Route、当前 Active Quest 和工作模式指针。

T2 桌面工作台位于 `/#/tech-os`，包含 Dashboard、Main Route、Quest、Inbox 接入说明、Knowledge、Labs、Projects、Tech Map、Route Backlog 和独立 Repository Adapter。开发与构建前会先验证 Markdown，再生成忽略提交的 `src/generated/tech-os-index.json`；工作台按需加载，不把 T2 代码加入首页首屏 chunk。该索引会进入最终 Pages 产物，因此部署前必须确认 Tech OS 内容的公开范围。

T3 继续复用 Phase C/D 的 `baize_inbox_v1` 与加密合并同步，不增加第二套 Capture Store，也不升级本机 Inbox schema。快速记录现在提供 Question、Idea、Note、Link 四种入口，内部只使用 `tech-os/*` 标签表达类型。Tech OS Inbox 可以把一条仍在收件箱中的记录转换为带稳定 ID 和 `source_inbox_id` 的 `tech-os/inbox/*.md` 内存草稿；只有通过 Repository 差异、完整校验和人工确认后才提交，成功后归档来源记录而不删除。个人学习打卡会与 Inbox 一起进入解密后 version 2 的私有共享数据，但不会修改这些公开 Markdown。

T4.1 新增只读 Learning Engine。它根据 `state.yml` mode、Current Quest 的“下一步”、显式关系、未回答 Question、Knowledge Gap、Lab、Project、已有 Route Seed 和未归档 Inbox 计算 Next Action、最多四条备选动作、Quest Suggestions、Knowledge Connections 与 Route Seed Signals。每条建议必须显示来源和原因；Keep Alive 只选择 small 动作。T4.1 不生成或提交 Markdown，不聚合 Candidate，不自动切换 Main Route。

T4.2 在 Learning Engine 下方新增 Route Candidate Generator。它只把至少两条共享具体标签的 Seed/Signal 聚合为候选组，宽泛领域标签不会单独触发聚合。用户可以编辑 Route Name、Why、Expected Outcome 与 Route Outline；输入候选专属确认短语后，系统才生成 `tech-os/routes/candidates/RS-XXX.md` 内存草稿。真正保存仍必须进入 Repository 完整比较和原子提交确认；T4.2 不自动选择 Main Route，也不提供 Save for Later、Archive 或 Not Interested。

T4.3–T4.6 新增独立 Route Engine：Candidate 可选择 Save for Later、Archive 或 Not Interested 并保留理由；当前路线完成或进度达到 80% 后才开放 Route Review；Review 就绪后才给出 2–4 条带来源解释的 Next Route 建议；Manual Route Generator 可随时从主题、原因与目标生成可编辑路线骨架。Review 与 Route 均只进入内存草稿，路线固定为 `status: backlog`、`main: false`，不会修改 `state.yml`、切换 Main Route 或创建 Active Quest。

Repository 页面使用运行时 GitHub fine-grained PAT 读取远端 `tech-os/`，逐文件比较构建版本、内存草稿与远端基线。Token 和草稿不写 LocalStorage；提交前必须通过浏览器端完整 schema 校验、输入确认短语并再次确认。多文件通过 Git Data API 生成单个 commit，写入前重新检查 branch head，最终更新 `force: false`；冲突即停止，不覆盖远端新版本。第一版不支持删除文件或修改 templates/README。

当前示例主线是“从输入网址到网页显示”，从 Browser 依次连接 URL、DNS、IP/TCP、TLS、HTTP/Server、Linux、CPU/Instruction/Logic/Transistor。开始编辑前先阅读 [`tech-os/README.md`](tech-os/README.md)，修改后运行：

```bash
npm run check:tech-os
npm run test:tech-os
npm run test:tech-os-ui
npm run test:tech-os-repository
npm run test:tech-os-capture
npm run test:tech-os-learning
npm run test:tech-os-candidate
npm run test:tech-os-route-engine
```

校验器会拒绝未知 schema、重复 ID、悬空关系、非法状态、路径与状态不一致、多个 Main Route、非问句 Quest、无效 Capture 类型，以及缺少证据却被标为 L2/L3 的 Knowledge。等级提升、实验完成和 Main Route 切换仍必须由用户确认。Learning Engine 只解释和排序已存在的证据；Candidate、Review 和 Route Generator 只形成可编辑内存草稿；Capture Adapter 不自动生成 Route Seed，Repository Adapter 只提交用户明确确认的原始 Markdown 草稿。

## 在线管理与发布

1. 打开导航页面，在地址后添加 `#/admin`。
2. 编辑网站、分类或拖拽调整顺序。
3. 在“发布到 GitHub”区域输入仓库信息和 fine-grained Personal Access Token。
4. 点击“提交并部署”。成功后页面会显示 commit 链接，GitHub Actions 随后重新部署页面。

发布前可以点击“读取远端内容并比较”。“合并，本地优先”会保留本地同 ID 内容并加入远端独有内容；“使用远端覆盖”会完全替换当前草稿。

Token 应只授予目标仓库的 Contents 读写权限。Token 仅保存在当前管理页面的内存中，不要把它写入 `.env`、源码、GitHub Actions 前端构建变量或 LocalStorage。

如果提示 `Bad credentials`，说明 Token 本身不完整、已过期或已撤销，并非仓库名称错误。GitHub 只在创建时展示一次完整 Token；请重新生成并直接粘贴真实的 `github_pat_…` 或 `ghp_…` 值，不要粘贴页面上的圆点掩码。管理页提供独立的“先验证 Token”按钮。

纯 GitHub Pages 无法安全保存 OAuth client secret。GitHub OAuth 网页授权的 token 交换还不支持浏览器 CORS 预检，因此当前个人版继续使用运行时 PAT。若增加可信 Serverless OAuth Broker，可再切换为 GitHub OAuth。

## 部署

`.github/workflows/deploy.yml` 监听 `main`、`master` 和手动触发，使用 Node.js 20 执行：

```text
npm ci → npm run build → 发布 dist 到 gh-pages
```

GitHub 仓库需要允许 Actions 写入内容，并将 Pages 发布源配置为 `gh-pages` 分支。

`.github/workflows/link-health.yml` 每天自动执行链接检查，将报告写入 `public/link-health.json`，报告更新后重新构建并部署页面。管理页的“立即检测”也会触发同一个工作流；该按钮需要 fine-grained Token 的 Actions 读写权限。也可以在 Actions 页面手动运行，或在本地执行：

```bash
npm run check:links
```

本地执行会访问所有正式导航地址并更新报告文件。

PWA 的 `start_url` 和作用域当前固定为 `/nav/`，与 `vite.config.ts` 的 Pages 基路径一致。仓库名称变化时，需要同时修改 Vite、`public/manifest.webmanifest` 和 `public/sw.js` 中的路径。

临时文本二维码最多承载 1200 个 UTF-8 字节。“打开白泽接收”模式把内容放在 URL 的 `#` 片段中，因此不会发送给 GitHub Pages 服务器；但二维码本身没有加密，敏感或更长内容应使用 GitHub 加密同步。

## 文档

完整架构、数据模型和后续规划见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## License

MIT License
