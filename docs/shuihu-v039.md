# 白泽水浒 0.39.0：路线珍藏与下一趟目标

本版让路线胜利积累成可选择的装备，并让寨子首页提示下一步。招贤概率、坐骑契掉率维持原规则。

## 玩法与获取

- 江湖游历完整走通五段并点击回寨后，探路 / 险途 / 绝险分别获得本路路契 2 / 3 / 4。三路各自记账，不互换；提前收队、战败不发路契。
- 在「山河 → 路线珍藏」花 6 枚对应路契兑换一件装备。探路从零积累需要三次完整通关；每件都按同样价格，可继续为其他队员兑换。没有随机掉落或付费捷径。
- 青石古道「截令短刃」：攻击 +32、速度 +8；开场敌方首位攻击降低 15%，持续 6 秒。多名队员穿戴不会叠加同一削弱。
- 芦荡渡口「渡潮佩」：谋略 +24、气血 +100；穿戴者开场怒气 +20，受怒气上限限制。
- 断崖粮道「守隘甲」：防御 +25、气血 +180；穿戴者开场获得 15% 护阵，持续 8 秒。与同类护阵取较强效果。
- 装备默认锁定，避免误分解。请到行囊穿戴，可正常强化；强化增加基础属性，不提高开场特效。临时剧情助阵、未出阵队员和远征中已退阵队员不贡献这些装备特效。
- 专属装备不在普通购买、打造或随机装备掉落池中。多余路契可按每 2 枚换草药 3、精铁 2；该操作会消耗对应装备的积累进度。
- 首页根据当前进度提示修伐木场、农田、聚义厅、安排阵容、培养 8 级主力或补给。具备出发条件后显示所追踪装备的余额与预计通关次数，持有全部装备后指向更高难度。
- 珍藏独立分区，手机沿用按钮翻页，不增加纵向长页面。追踪目标保存，返回游历默认展开对应路线；兑换结果弹窗展示，刷新不会再发一次。

## 存档兼容

旧存档可继续使用，既有装备、剧情、游历和战法保留。此前历史通关不追补路契；更新后尚未领取的完整行程可在本次回寨获得路契。已发生的装备开场效果随战局保存，重新载入不会重新触发。

云端需要部署新版 Worker，**不需要修改 D1 表，也不用重跑数据库迁移**。新版能力为 `journeyRewards: 1`。旧 Worker 会被客户端上传预检拦下；新版 Worker 防止旧页面删掉或减少已有路契获取和兑换账目。这仍是可导入的本地存档游戏，不是服务端全程权威防作弊系统。

## 发布顺序（Git Bash，每行单独执行）

先检查、构建，再更新云存档服务，最后发布前端。

```bash
cd /f/nav-main/nav-main
npm ci
npm run test:all
npm run build
npx wrangler deploy --config cloud/shuihu/wrangler.json
curl https://save.baizeone.top/v1/game-version
```

确认云服务返回 `release: "0.39.0"`、`journeyRewards: 1`，再上传 GitHub：

```bash
git status
git add public/game cloud/shuihu package.json scripts docs
git diff --cached --stat
git commit -m "feat: add route equipment rewards and next journey goals"
git pull --rebase origin main
git push origin main
```

如果 rebase 报冲突，先处理冲突再 `git add` 和 `git rebase --continue`，完成后才 push。不要强推。前几版未提交的游戏模块与测试也需一并提交；这些范围的暂存会包含它们，请检查暂存清单。GitHub 推送后的上线取决于仓库已有部署流程，须等部署成功后刷新线上页面。本次开发未执行提交、推送或云端部署。

## 验证入口

- `npm run test:shuihu-journey-rewards`：三路线三档实际通关、精确结算、兑换费用、背包满原子回退、专属产出限制、装备实际伤害及效果到期、助阵和替补隔离、存档恢复、旧服务拦截、早期目标。
- `npm run test:shuihu-journey-rewards-cloud`：真实 Worker 配合内存 SQLite，路契 / 装备 / 战局上传下载，以及旧页面覆盖拦截；不触碰线上数据库。
- `npm run check:shuihu-journey-rewards`：360 像素手机与 1440 像素桌面实际追踪、兑换弹窗、穿戴对比、重载保持；手机检查无纵向滚动。需要开发服务和 Playwright。
- `npm run check:shuihu-journey`：完整五段路线、真实首领、回寨领取与刷新。
- `npm run check:shuihu-screen-pages`：各功能手机分页与现有操作回归。
