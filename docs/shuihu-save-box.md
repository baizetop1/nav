# 梁山存档匣 · 0.3.0

## 先分清：代码完成不等于云端已开通

本次增加 20 个本机编号、文件流转，以及可单独部署的 Cloudflare Worker + D1 存档接口。默认 `public/game/cloud-config.json` 的地址为空，页面会明确显示“云端服务尚未配置”。尚未创建真实云端数据库、配置账号或推送 GitHub。

本机功能推送导航仓库即可使用；多设备直接接续必须完成下方独立部署。此迭代不改剧情、战斗、招募或奖励规则。先前明确暂缓的旧手机 `structuredClone` 兼容问题仍见 `shuihu-known-issues.md`；在那台旧浏览器上需要先解决兼容性才能正常游玩。

## 玩家怎么用

入口：白泽水浒 → 存档（或页脚“存档管理”）→ 梁山存档匣。

- **本机位置**：展开“切换 / 命名本机存档”，选择 01—20 号，确认切换。空位打开新卷。命名只影响当前本机位置。
- **文件备份**：“导出当前进度”下载 JSON。导入支持旧版单存档和新版存档匣文件；先检查，预览后选择本机目标编号，再确认替换。
- **跨设备接续**：电脑在“云端接续与朋友分享”选择站长分配的云端编号、输入该档密钥，点击“手动上传本机进度”。手机选择同一个云端编号，输入密钥，点击“查看云端进度 / 下载副本”，预览后选择本机位置确认。
- **不要把本机编号和云端编号混淆**：可以把云端 07 号接到本机 02 号；上传确认会同时列出两个编号。默认选择不意味着自动关联。
- **分享试玩**：持钥者主动“开启公开副本”，朋友免密下载后在本机试玩；没有上传密钥仍然不能更新原云端位置。公开列表可在游戏内读取；无需账号或好友系统。
- **接力**：仅将某一个编号的上传密钥交给信任的人，不要把站长密钥给朋友。拿到上传密钥就可以更新此档、切换分享和回滚。
- **遇到版本冲突**：先导出自己的分支，再查看云端进度，选择接续到当前或其他本机位置。不合并银两、抽卡、背包、RNG 或剧情，不提供强制跳过版本检查的上传。
- **回滚**：展开“公开设置与历史回滚”，读取最近十份历史，确认回滚。服务生成更大的新版本号，本机不会自动被替换，需再次查看并接续。

当前档未保存、存档损坏或另一个标签页发生冲突时，不应切换丢弃进度，先导出。文件里的云端版本是文件说明，不可用它伪造接续关系；导入文件不会自动取得任何上传权限。无来源关联的本机档只能上传到持钥空位，要更新已有云端档须先备份本机并接续该云端版本。

## 本机存储和迁移

数据库 `baize-shuihu-box`，对象仓库 `slots`，20 个按编号隔离的位置。每个位置包含当前快照、**至多一份有效备份**、名称、本机事务版本及云端关联信息。单快照最多 2,000,000 UTF-8 字节；上限约为 20 × 2 份快照，不无限保存历史。IndexedDB 配额和浏览器回收策略仍可能导致失败，页面会保留内存进度、显示未保存并允许导出，不虚报成功。[IndexedDB 说明](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

第一次检测到旧键 `baize_shuihu_save` / `baize_shuihu_save_backup`，在一个事务中迁入空的 01 号。**旧键不删除、不持续回写**；以后以 IndexedDB 为准。不要回到旧版页面继续写旧键，否则那部分进度不会自动合并。若 01 号已经存在绝不重复迁移覆盖。坏档原文和有效备份也保留用于恢复。数据库不可用时仅可临时游玩 / 读取旧档，不伪称多槽已保存。

同编号写入基于 IndexedDB 事务内的 serial 比较；确认导入也检查预览之后目标有无变化。BroadcastChannel 加定时校验提供冲突提示；最终是否允许写入由事务决定，不依赖提示先到达。每个标签页自己选择当前编号，互不强制切换。

实时战斗每约一秒写本机；离开战斗页或切后台暂停并尝试保存。关闭页时异步写入不能保证完成；有未保存进度会提示，不应依赖强制关闭前的最后一次写入。接续、刷新不会补算离线战斗。

## 站长首次部署（Git Bash，从导航项目根目录执行）

需要 Node.js 22 或更新版本、Cloudflare 账号及该账号的 Workers / D1 使用权限。命令会创建真实云端资源，请自行确认账号和配额。不会迁移阿里云 DNS，也无需更换 GitHub Pages 的托管。

```bash
cd /f/nav-main/nav-main
npx wrangler login
npx wrangler d1 create baize-shuihu-saves --config cloud/shuihu/wrangler.json
```

把输出的数据库 UUID 填入 `cloud/shuihu/wrangler.json` 的 `database_id`，替换 `REPLACE_WITH_YOUR_D1_DATABASE_ID`。`ALLOWED_ORIGINS` 默认仅为 `https://baizeone.top`，如实际使用其他来源，可添加逗号分隔的准确来源；不写 `/nav/` 路径，不写通配符。

```bash
npx wrangler d1 execute baize-shuihu-saves --remote --file cloud/shuihu/schema.sql --config cloud/shuihu/wrangler.json
```

SQL 只创建表、触发器和未分配的 20 个位置，不包含真实密钥；重复运行不会覆盖已有档。数据库名称与绑定 `DB` 保持对应。[D1 命令说明](https://developers.cloudflare.com/d1/wrangler-commands/)

分别生成两份随机 64 位十六进制字符串（运行下面命令两次），在密码管理器中分别记为站长密钥与 KEY_PEPPER。**不要发截图，不要贴在公开文件或聊天里。**

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

在下面两条命令的私密输入提示中分别粘贴相应值：

```bash
npx wrangler secret put ADMIN_KEY --config cloud/shuihu/wrangler.json
npx wrangler secret put KEY_PEPPER --config cloud/shuihu/wrangler.json
npx wrangler deploy --config cloud/shuihu/wrangler.json
```

`ADMIN_KEY` 仅站长保管，进入游戏的“站长管理”时临时输入。`KEY_PEPPER` 仅服务端使用，不应输入网页，也不能丢失或随意更换；更换会使已有编号密钥全部失效，需逐个重新生成。生产秘密用 Workers Secrets，不写入配置、源码或 Git。[Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

部署成功后，取得 Worker 的 HTTPS 地址。可以先用 `workers.dev` 地址；若玩家网络无法访问该地址，需要站长配置玩家能访问的自定义 API 域名，再测试。**下面示例的地址必须换成部署输出的真实地址。**

```bash
node scripts/configure-shuihu-cloud.mjs https://你的实际服务域名
npm run verify
```

此脚本只更新游戏的公开服务地址与 CSP 的精准 `connect-src` 来源，不写密钥。默认配置仍保持仅 `'self'`，没有放开所有 HTTPS 域名。确认修改后按既有 Git 流程提交、整合远端并推送导航仓库；不要强推。部署步骤本身不会替你提交或推送 Git。

## 分配 20 个编号

打开已更新的游戏 → 存档 → 云端 → 选择编号 → 站长管理 → 输入站长密钥 → “生成 / 重置此档密钥”。弹窗只显示一次新生成的随机密钥，选中复制后保存在密码管理器；按需要分配 01—20 号即可，不必一次全分配。

没有站长分配密钥的空位无法由访客抢占。重置某号密钥立即撤销旧码，但不删除进度。删除当前云端进度必须使用站长密钥和当前版本号，旧快照仍在受保护历史中可恢复；不是永久擦除服务端所有痕迹。历史最多十份，超过保留范围无法通过游戏回滚，应另做站长数据库备份。

## 接口与权限

| 接口 | 权限 / 条件 |
| --- | --- |
| `GET /v1/slots` | 无需密钥；仅编号、名称、公开状态 |
| `GET /v1/slots/:id` | 公开免密；私有验证该档密钥；返回完整副本与服务端版本 |
| `PUT /v1/slots/:id` | 该档密钥 + `If-Match: "版本"` + 游戏快照 |
| `POST /v1/slots/:id/sharing` | 该档密钥 + 版本条件 |
| `GET /v1/slots/:id/history` | 该档密钥；只列出历史版本，不匿名公开 |
| `POST /v1/slots/:id/rollback` | 该档密钥 + 当前版本条件，指定历史版本 |
| `GET /v1/admin/slots/:id` | 站长密钥；删除前读取名称与版本 |
| `POST /v1/admin/slots/:id/key` | 站长密钥；生成或重置，旧钥作废 |
| `POST /v1/admin/slots/:id/delete` | 站长密钥 + 当前版本条件 |

每个编号使用 128 位密码学随机密钥，服务端保存带编号的 HMAC-SHA-256 校验值。高熵随机钥不是用户弱口令；若未来允许自设口令，应换用密码哈希策略。密钥只通过 HTTPS Authorization 请求头发送，前端仅放在内存中，刷新页或“清除本页授权”后消失。服务端不写请求日志，响应 `Cache-Control: no-store`，请求不携带 Cookie，不跟随重定向，用户输入不成为接口地址。

每次受保护请求逐档验证；CORS 只是补充约束，不当作鉴权。按 IP 和编号限制每分钟 12 次授权尝试（包括成功），所有请求每 IP 每分钟 120 次；过量返回 429。共享出口可能共同受限，等一分钟再试。数据库只保存 IP 的带密钥摘要用于短期限速，过期窗口删除。不是面向大规模恶意流量的完整防护，公开推广前应评估 Cloudflare 边缘规则与配额。[授权原则](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

写入在同一 SQL 语句中比较服务端 revision 与 key_hash；历史由同一事务内的触发器保留。客户端不能自行指定新 revision。旧版更新返回 412，新生成版本单调增长，包括分享修改、回滚和密钥重置。不会自动拼接两个分支，下载只给副本。[If-Match 条件请求](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-Match)

超时后可能服务器已提交而响应未收到，页面会明确提示先读取云端确认，不自动重试强制覆盖。即便已确认上传，但本机版本关联写入失败，也提示先导出再接续。

服务端复用完整游戏结构校验，并用游戏字段白名单生成快照；保留随机状态、保底、每日次数、未完成战局。**不承诺防作弊**：玩家可编辑合法 JSON。私有意味着访问受控，不是端到端加密，站长/服务运维人员仍可读取数据库。存档名称即使私有也在列表显示，请不要填个人敏感信息。

## 测试与上线验收

```bash
npm run test:shuihu-save-box
npm run test:shuihu-cloud
npm run verify
```

云端自检在本机将实际 Worker 打包，并用 SQLite 执行与 D1 相同的语句及触发器，不访问线上资源。另有本轮浏览器回归：真实 IndexedDB、桌面/手机两个隔离上下文、旧档迁移、多槽隔离、文件预览目标变化、上传下载、无钥回写拒绝及陈旧云端版本拒绝。**这些测试不能代替真实部署后的网络与权限验收。**

部署后至少实测：电脑上传 → 手机私有接续；同时从一个版本游玩，第二次上传应冲突；公开免密下载但无钥上传失败；关闭公开后新访客下载失败；重置密钥后旧钥失败；坏文件、断网与存储容量不足不清空原进度。
