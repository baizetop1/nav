# 白泽 - 个人导航 (Next Gen)

这是一个基于 React + Vite + Tailwind CSS 的现代化个人导航主页。

## 特性

- ⚡️ **极速加载**: 基于 Vite 构建
- 🎨 **现代设计**: Glassmorphism 风格 + 平滑动画
- 🔍 **即时搜索**: 支持 Cmd+K 快捷键唤起
- 🌓 **暗黑模式**: 自动跟随系统或手动切换
- 📱 **响应式**: 完美适配移动端

## 开发

1. 安装依赖:
   ```bash
   npm install
   ```

2. 启动开发服务器:
   ```bash
   npm run dev
   ```

3. 构建:
   ```bash
   npm run build
   ```

## 数据管理

所有网站数据都存储在 `src/data.ts` 中。修改该文件即可更新导航内容。

## 部署

本项目配置了 GitHub Actions 自动部署。
只需将代码推送到 `main` 分支，GitHub Actions 会自动构建并发布到 `gh-pages` 分支。
