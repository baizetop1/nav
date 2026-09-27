# 白泽水浒 0.46.0：全名册人物本领与出征搭配

## 完成范围

当前 172 名可用人物全部有具名、可触发、可保存的人物本领：108 将、4 名外传人物、60 名江湖散人。保留原有 12 人的数值，为另外 160 人接入 29 种共享机制。详细数值见 [全部人物本领](shuihu-hero-abilities.md)。这不是 172 套不同的触发引擎，机制共享有利于后续平衡和维护。

- 普攻条件：自身或目标气血、交战时长、首领、破甲、控制、护阵、水域与山地。
- 开场配合：首位自护、末位保护首位、全队回怒、水战回怒。
- 受击应对：低血非致命伤后护阵、固守或护阵时回怒。
- 有效治疗：追加护阵、回怒或解除一项异常。援护治疗可以触发，药品不能；满血的空治疗不触发。
- 连击收益：每第三次有效普攻可破甲、削弱、自护、回怒或自疗，受冷却限制。
- 实际打断：追加全队护阵、全队回怒或目标破甲；提前施招不算打断。

招募概率、坐骑掉落概率没有调整。

## 如何游玩

1. 从任一正式出征入口打开准备页，切换“搭配”页签。
2. 查看本次出阵人物的本领、地形适用性、站位要求和招式解锁缺口。
3. 展开“从已入寨人物试配”，查看稳守续航、破甲集火、控场衔接、水域互援、截招攻坚方案。只在现有可出阵人物、当前敌情和已解锁能力能组成完整三人队时显示。
4. 试用方案会重新计算体力、粮草和实际带兵数。仍需确认出征才保存阵容并扣费，取消保留原配置。
5. 战斗中可展开人物本领状态，查看触发次数、冷却及退阵情况。战报列出每位出阵人物，包括没有触发的本领。
6. 好汉名册支持按本领名称或效果搜索，例如“青龙破坚”“破甲”“护阵”。

建议按实际战斗条件组合：关胜与破甲来源集火同一敌人；护阵型同伴保护需要护阵才能增伤的人物；水战人物在水域发挥；打断型人物保留招式应对蓄势。推荐方案按当前等级和能力筛选，不保证胜利。

治疗判断排除了只施加护阵的保护招式；自护本领不会被当作能够保护其他人的来源。规则预览和实际战斗使用同一份人物本领定义。手机沿用紧凑分页，江湖本领说明只列当前阵容，避免一次展开 172 人。

## 存档与服务器

- 新开正式战斗使用人物本领规则版本 3。
- 旧规则 1、2 的在途战斗保持原效果，加载时不补发开场效果；剧情助阵不借用正式阵容的本领。
- 冷却、次数、护阵和战报保存并可刷新接续，导入导出保留状态。
- Worker 的能力接口返回 `heroRoles: 3`。客户端上传新版战局前检查能力；旧服务会提示升级，保留本地进度。
- 服务端拒绝以旧规则覆盖已有新版战局、复盘。
- 无新增数据库字段或表，**不需要 D1 SQL 迁移**。

## 验证记录

- 172/172 人物定义与名称检查；新增 160 人逐人在实际战斗触发，并覆盖未满足条件、技能解锁、冷却、有效治疗、旧规则隔离、文件保存和恢复一致性。
- 实际 Worker 在隔离内存 SQLite 中完成 320 次战局 / 战报往返，以及旧服务阻断、版本降级拒绝；未写入生产存档。
- 320×568、360×640、390×844、1440×1000 浏览器操作：试配、配置同步、取消不扣费、确认出征、实际结算、刷新、按本领搜索、无纵向溢出。
- 手机分页覆盖 66 个场景 × 4 种视口；翻页、输入保留、战斗按钮与日志阅读检查通过。
- 全仓回归中的游戏测试通过。全仓测试并非全部通过：当次并行改动中的 GitHub 服务 TypeScript 语法使 4 项应用测试失败，部署状态测试另有失败；详情见本地 `artifacts/full-roles-all-final.log`。未改动这些其他模块。
- 生产构建通过。可用下面命令独立复验本次游戏内容。

```bash
npm run test:shuihu-full-roles
npm run test:shuihu-full-roles-cloud
npm run check:shuihu-full-roles
npm run check:shuihu-screen-pages
npm run build
```

浏览器检查需安装 Playwright 并有 Microsoft Edge；可通过 `SHUIHU_PLAYWRIGHT_PATH` 指定已有 Playwright。默认测试地址为本机 5187 端口，可通过 `SHUIHU_GAME_URL` 覆盖。

## 发布顺序

本轮仅修改本地项目，尚未提交、推送或部署。Git Bash 中逐条执行，遇到错误先停下。

先验证并部署 Worker：

```bash
cd /f/nav-main/nav-main
npm run test:game
npm run build
npx wrangler deploy --config cloud/shuihu/wrangler.json
curl https://save.baizeone.top/v1/game-version
```

确认接口 `release` 为 `0.46.0`、`heroRoles` 为 `3`，再发布前端。不要重新执行已有数据库迁移。

```bash
git status
git add public/game public/sw.js cloud/shuihu/worker.js package.json
git add scripts/shuihu-lineup-selfcheck.mjs scripts/shuihu-lineup-cloud-selfcheck.mjs scripts/shuihu-lineup-browser.mjs
git add scripts/shuihu-full-roles-selfcheck.mjs scripts/shuihu-full-roles-cloud-selfcheck.mjs scripts/shuihu-full-roles-browser.mjs
git add scripts/shuihu-hero-roles-selfcheck.mjs scripts/shuihu-wanderers-selfcheck.mjs scripts/shuihu-dialog-pages-selfcheck.mjs
git add docs/shuihu-v045.md docs/shuihu-v046.md docs/shuihu-hero-abilities.md
git diff --cached --stat
git diff --cached -- package.json
git commit -m "feat: complete roster abilities and sortie composition"
git pull --rebase --autostash origin main
git push origin main
```

当前项目还有其他模块的并行修改，尤其 package.json 可能包含其他任务增加的脚本；提交前检查暂存内容并按需要拆分。上述命令不暂存 android/、工作流和其他应用源码。不要强制推送；同步出现冲突需先解决，再继续。远程部署成功后刷新页面并检查版本、出征和云存档上传。
