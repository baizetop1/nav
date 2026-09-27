# 0.54.0 士兵伤亡修正

原公式将每一场阵亡人数单独向下取整。伤亡2人、阵亡比例20%时，0.4人每场都被舍弃，连战也总是零阵亡。旧规则还主要依据战后剩余气血，治疗会把兵损过度压低。

本次修改：

- 新出发的带兵战斗保留阵亡计算的小数余量，跨战斗、医治、募兵和存档保存，避免小规模连战长期清零。
- 兵损采用累计有效承伤与最终气血损失中的较大值，并继续考虑战斗时长、胜负、军令和救护。治疗恢复好汉气血，不抹掉已承受的战损。
- 医者、军令及医疗设施仍会影响伤亡；没有带兵则没有士兵伤亡，也不改变累计值。
- 伤兵可治，阵亡不可治疗复活，补招仍按实际人数扣银两和粮草。未携带招募折扣时每人碎银3、粮草2。
- 旧存档正在进行的战斗保持旧规则，下次出征采用新规则。战前预览不扣资源；撤退、战报和扫荡共用实际结算公式。

实战回归中，同样的队伍连续10次轻松胜利，旧公式阵亡0人，新规则累计3人。这是测试场景结果，不是所有副本固定每10场死3人。

## 发布

先部署 Worker，再发布前端；数据库结构未改，无须运行SQL。/v1/game-version 应返回 release: 0.54.0、casualtyRules: 1。旧 Worker 上传门禁和新 Worker 旧快照覆盖保护均已加入；需要退回旧进度时使用明确的历史回滚操作。

Git Bash逐行执行：

```bash
npm ci
npm run test:game
npm run build
npx wrangler deploy --config cloud/shuihu/wrangler.json
git status
git add .
git commit -m "修复士兵阵亡累计与战损结算"
git pull --rebase origin main
git push origin main
```

包含此前0.53资源副本。GitHub提交不会更新Worker或手机内置APK；APK须另行覆盖安装。

验证入口：test:shuihu-casualties、check:shuihu-casualties。覆盖连续实战、受伤后治疗、精确补招费用、存档往返、旧战局、救护与撤退、零兵力、扫荡、SQLite Worker、无效快照及授权回滚。
