# 白泽个人导航 CMS

一个基于 React、Vite 和 GitHub Pages 的个人导航站。网站内容可以在浏览器中编辑为本地草稿，并通过 GitHub API 提交回仓库，由 GitHub Actions 自动重新部署。

## 功能

- 分类展示、响应式布局、明暗主题和时间渐变背景。
- 支持可持久化的工作模式：关闭装饰背景、隐藏描述与标签并压缩布局。
- 使用 Fuse.js 按名称、标签、分类和描述进行模糊搜索。
- 支持 Google、百度、必应、GitHub、Bilibili 搜索前缀。
- 通过 `/#/admin` 进入内容管理。
- 新增、编辑、删除网站，新增、重命名和删除空分类。
- 使用 dnd-kit 拖拽分类、调整网站顺序并跨分类移动网站。
- 支持桌面四列自由网格坐标，以及 1×1、2×1、1×2、2×2 卡片尺寸。
- 修改自动保存到浏览器本地草稿。
- 使用运行时输入的 GitHub fine-grained PAT 创建数据提交。
- 支持读取远端 JSON、合并或覆盖本地草稿，并轮询 GitHub Actions 部署状态。
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

浏览器中的未发布修改保存在 `localStorage.nav_cms_draft`。LocalStorage 只是草稿存储，仓库中的 JSON 文件仍是正式发布数据源。

## 在线管理与发布

1. 打开导航页面，在地址后添加 `#/admin`。
2. 编辑网站、分类或拖拽调整顺序。
3. 在“发布到 GitHub”区域输入仓库信息和 fine-grained Personal Access Token。
4. 点击“提交并部署”。成功后页面会显示 commit 链接，GitHub Actions 随后重新部署页面。

发布前可以点击“读取远端内容并比较”。“合并，本地优先”会保留本地同 ID 内容并加入远端独有内容；“使用远端覆盖”会完全替换当前草稿。

Token 应只授予目标仓库的 Contents 读写权限。Token 仅保存在当前管理页面的内存中，不要把它写入 `.env`、源码、GitHub Actions 前端构建变量或 LocalStorage。

纯 GitHub Pages 无法安全保存 OAuth client secret。GitHub OAuth 网页授权的 token 交换还不支持浏览器 CORS 预检，因此当前个人版继续使用运行时 PAT。若增加可信 Serverless OAuth Broker，可再切换为 GitHub OAuth。

## 部署

`.github/workflows/deploy.yml` 监听 `main`、`master` 和手动触发，使用 Node.js 20 执行：

```text
npm ci → npm run build → 发布 dist 到 gh-pages
```

GitHub 仓库需要允许 Actions 写入内容，并将 Pages 发布源配置为 `gh-pages` 分支。

## 文档

完整架构、数据模型和后续规划见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## License

MIT License
