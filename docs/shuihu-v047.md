# 白泽水浒 0.47.0：纸面界面与手机常用页面

## 参考与范围

依据用户提供的《灵界》截图，采用浅色纸面、玉色操作、金色标题、紧凑状态栏和固定底部入口的布局思路。人物与背景素材沿用本项目资源，没有复制参考游戏的素材。

本轮完成寨子首页、人物档案、行囊查找和整体配色。其他复杂玩法继续使用已有功能分区与分页，并非所有资料页都改成一屏。

## 交付内容

- 默认浅色纸面；右上角“夜间 / 日间”切换原有深色方向，选择仅保存在本设备，不改游戏存档。主题同步浏览器状态栏颜色。
- 手机底部固定寨子、江湖、好汉、行囊、更多五个入口；日志保持独立可收起，减少占用主要操作区。
- 寨子首页以当前可完成目标和主线为中心，常用六入口为营建、募兵医治、山寨出征、招贤、打造、每日历练。其他寨务和待办保留在“全部寨务”。所有目标来自存档实时计算。
- 人物档案保留头像、等级、凡灵仙品质、资质星级和出阵 / 外派状态，分为属性、本领、养成三个页签。属性保留现有计算方式，本领与兵种直接关联，六个培养入口可直接进入。外传与散人身份、人物往事仍可查看。
- 行囊保留五个功能分类，物品支持名称 / 用途搜索、短列表翻页和独立详情窗口。正常窗口每页四种，小手机每页两种；完整描述和用途在详情中查看。
- 物品详情复用原来的使用确认、购买、加工、打造和人物培养命令。打开和关闭详情不扣资源。体力补给用量与领取渠道保留在“体力补给 · 规则与领取”。
- 未改变招募、掉落、战斗、经验、材料价格或云存档规则。

## 验证

- `test:shuihu-folio`：只读渲染、搜索转义、库存分页边界、人物三页签、未入寨与外传标识、物品操作入口。
- `check:shuihu-folio`：320×568、390×844、1440×1000 实际浏览器操作；首页与人物属性在两种手机视口一屏显示；底部导航、主题刷新保留、人物与兵种跳转、搜索、物品翻页、详情购买一次扣费、存档刷新。
- `check:shuihu-screen-pages`：66 场景 × 4 视口；页面与控件无溢出，输入与阵容保留、招贤、日志和实时战斗按钮操作检查。
- `test:game`：游戏回归。
- `build`：生产构建。

浏览器检查默认使用 `http://127.0.0.1:5187/nav/game/index.html`，需先启动开发服务器。测试依赖 Playwright 和 Microsoft Edge，可使用 `SHUIHU_PLAYWRIGHT_PATH` 指向本机已有 Playwright。

本地截图在 `artifacts/folio/`；日志在 `artifacts/folio-browser.log`、`artifacts/folio-pages-final.log`、`artifacts/folio-game-final.log`、`artifacts/folio-build.log`。

## 更新说明

尚未提交、推送或部署。这一轮是前端更新，**无需新增数据库迁移**。如果云端已经发布支持 0.46.0 人物本领的 Worker（`heroRoles: 3`），本轮不必再次部署 Worker；若上一轮还没上线，请先按 0.46.0 说明部署 Worker，再发布前端。

Git Bash 中逐行执行：

```bash
cd /f/nav-main/nav-main
npm run test:game
npm run build
git status
git add public/game package.json
git add scripts/shuihu-folio-selfcheck.mjs scripts/shuihu-folio-browser.mjs docs/shuihu-v047.md
git diff --cached --stat
git diff --cached -- package.json
```

当前工作区还有其他任务改动，以及上一轮未提交的人物本领代码。提交前确认范围；若 0.46.0 尚未提交，还需暂存其 Worker、脚本与说明，见 `docs/shuihu-v046.md`。确认暂存内容后：

```bash
git commit -m "feat: add paper UI and compact mobile game pages"
git pull --rebase --autostash origin main
git push origin main
```

如遇冲突，先处理冲突并继续 rebase；不要使用强制推送。
