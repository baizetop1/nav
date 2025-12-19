# 重构与故障排查日志 (Refactor & Troubleshooting Log)

本文档记录了将个人导航项目从静态生成器重构为 React + Vite 现代化应用的全过程，以及在 GitHub Pages 部署过程中遇到的问题和解决方案。

## 1. 项目重构 (Refactoring)

### 目标
将原有的静态 HTML 生成项目重构为基于 React 18 + Vite + TypeScript + Tailwind CSS 的现代化单页应用 (SPA)。

### 主要变更
- **技术栈升级**: 引入 React 生态系统，使用 Vite 作为构建工具，Tailwind CSS 处理样式。
- **数据迁移**: 将原 `config.yml` 的配置数据迁移至 `src/data.ts`，利用 TypeScript 类型检查保证数据完整性。
- **UI/UX 改进**:
  - 实现 Glassmorphism (毛玻璃) 视觉风格。
  - 添加深色模式 (Dark Mode) 支持。
  - 增加即时搜索功能 (Real-time Search)。
  - 响应式布局适配移动端。

## 2. 部署配置 (Deployment Setup)

### 自动化流程
- 创建 `.github/workflows/deploy.yml`。
- 配置 GitHub Actions 监听 `main` 分支的推送。
- 自动执行 `npm install` -> `npm run build` -> 将 `dist` 目录推送到 `gh-pages` 分支。

### 分支策略调整
- **源文件**: 切换至 `main` 分支管理源代码。
- **构建产物**: `gh-pages` 分支仅用于存放自动构建后的静态文件。

## 3. 故障排查与修复 (Troubleshooting)

在部署上线过程中，我们遇到并解决了以下关键问题：

### 问题 A: 依赖安装失败
- **现象**: GitHub Actions 报错 `npm ci can only install packages with an existing package-lock.json`。
- **原因**: 仓库中缺少锁定文件。
- **修复**:
  1. 本地运行 `npm install` 生成 `package-lock.json`。
  2. 调整 Workflow 暂时使用 `npm install` 替代严格的 `npm ci`。

### 问题 B: 页面白屏 (404 / Loading Fail)
- **现象**: 部署后访问页面显示空白。
- **原因**:
  1. GitHub Pages 默认使用 Jekyll 处理，忽略了下划线开头的文件 (如 `_assets`)。
  2. 资源路径配置不正确。
- **修复**:
  1. 创建 `public/.nojekyll` 空文件，禁用 Jekyll 处理。
  2. 修改 `vite.config.ts`，将 `base` 路径显式设置为 `/nav/` (适配 GitHub Pages 的子路径结构)。
  3. 在 `index.html` 注入错误捕获脚本，以便在屏幕上直接显示报错信息。

### 问题 C: 语法报错 (Unexpected token ?)
- **现象**: 浏览器控制台报错 `Uncaught SyntaxError: Unexpected token ?`。
- **原因**: 构建目标默认为较新版本的 ES 标准，旧浏览器不支持可选链操作符 (`?.`) 等新语法。
- **修复**:
  - 修改 `vite.config.ts` 中的 `build.target` 为 `'es2015'`，强制进行语法降级兼容。

### 问题 D: 搜索功能失效
- **现象**: 页面可以加载，但搜索输入框无反应或报错。
- **原因**: 搜索逻辑中使用了 `includes()` 和可选链 `?.`，在部分环境中存在兼容性问题。
- **修复**:
  - 重写 `src/App.tsx` 中的搜索逻辑。
  - 使用 `indexOf() !== -1` 替代 `includes()`。
  - 使用 `(site.tags || [])` 替代 `site.tags?.`。
  - 增加空值检查，确保代码健壮性。

## 4. 维护指南

- **更新数据**: 直接修改 `src/data.ts` 文件。
- **本地开发**: 运行 `npm run dev`。
- **发布更新**: 提交代码推送到 `main` 分支即可：
  ```bash
  git add .
  git commit -m "Update content"
  git push origin main
  ```
