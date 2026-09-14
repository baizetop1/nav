# 白泽水浒 0.24.0：外传人物与可扩展名册

## 本轮内容

梁山正册保持天罡 36 将、地煞 72 将，合计 108 将。新增外传分类和第一位可培养人物：托塔天王·晁盖。名册分别显示正册与外传入寨人数，支持按分类筛选；外传人物不设置梁山座次。招贤中的普通小角色仍使用原来的帮手系统。

晁盖具有独立立绘、属性和成长、四个专属招式、东溪护义营、坐骑青骢护寨。可按已有规则升级、练招、升为灵品或仙品、装备与带兵出战。凡／灵／仙是培养品阶，招贤星级是另一项资质。

## 怎么获得晁盖

1. 完成七星聚义，或已有第一卷卷终进度后，去江湖地图的东溪村，打开“外传·东溪旧约”。
2. 相识并答应安顿乡人，领取 4 枚晁盖信物。
3. 聚义厅达到 2 级，农田、伐木场、医馆各达到 1 级，返回确认安置，领取另外 6 枚信物。已有建筑直接计入，不重复扣建设材料。
4. 聚义厅达到 3 级，在“好汉 → 星部：外传人物 → 晁盖”使用 10 枚信物和 600 碎银邀请。

邀请只能完成一次，不计入普通招贤保底，不进入普通或定向随机招贤池。信物直接用于邀请，无须打造招贤令；失败条件不会扣料。相识和完成委托均不自动获得英雄。

晁盖坐骑契来自野猪林传闻历练，采用现有独立 20% 概率，不保证每次通关获得。契约入手后，已招募晁盖可领养。基础招式“托塔震阵”兼具攻击与护阵；10 级开启“义守东溪”。15 级、坐骑达到 3 阶、亲密度 80 并出骑后，羁绊“青骢护众”可按每三次普攻触发，为气血比例最低的存活友军提供基础 15% 护阵、持续 4 秒，练招可增强效果。

## 下次增加角色

完整可复制范例见 [外传人物配置模板](templates/shuihu-external-hero.json)。它是一份维护用配置包，需拆分到下面的现有文件；游戏不会自动加载 docs 下的模板。

| 内容 | 写入位置 | 必须保持的约定 |
| --- | --- | --- |
| 人物本体 | `public/game/data/heroes.json` | 新的唯一 `id`；`group: external`、`seat: null`、`starSign: 外传人物` |
| 引入版本 | `public/game/data/config.json` 与人物的 `introducedIn` | 下次名册版本从 4 增至 5，新人物 `introducedIn: 5`；保留老人物的引入版本 |
| 技能 | `public/game/data/skills.json` | 四个唯一技能 ID，`training.hero` 指向新人；两个 base、一个 advanced、一个 bond |
| 道具 | `public/game/data/items.json` | 邀请信物、`人物ID_manual`、`人物ID_mount_contract`，正确关联 hero |
| 专属兵种 | `public/game/js/corps-data.js` | `CORPS[人物ID]`：名称、兵种 arm、定位 profile |
| 招募剧情 | `public/game/data/stories.json` | 新剧情 ID、新条件标记，发放足够信物，并设置相识与完成条件 |
| 地图入口 | `public/game/data/maps.json` | 在地图 stories 列表登记新剧情 ID，保证玩家实际可到达 |
| 立绘 | `public/game/art/` | 每位新人补独立图片；portrait 使用 `art/xxx.png`、`.webp` 或 `.jpg`，文件名小写英文、数字、下划线或连字符 |

替换模板中的所有人物 ID、技能 ID、道具 ID、故事 ID 和专属剧情 flag；不要给新人沿用晁盖的完成标记。多个角色同一版加入时可使用相同 introducedIn。不能更名、删除已有存档用过的 ID，也不能用第 109 席等方式扩充正册。

邀请的 `obtain` 使用 `type: external`，配置 token、count、silver、hall 和 condition；`meetCondition` 应与委托完成条件一致，避免在地图相遇入口提前跳过外传。坐骑 dungeon 必须指向可通关的现有历练 ID；契约是 special 道具且 price 为 0，不能放进商店当保证购买。武学书遵循已有武学残页合成规则。

技能可选 `training.profile` 列表见 `public/game/js/growth.js` 的 GROWTH_PROFILES。外传羁绊必须填写 `bondEffect`：guard（护阵）、heal（治疗）、rage（怒气）或 strike（追击），使用已有每三次普攻触发逻辑。guard/heal 的基础 rate 不超过 0.3；strike 不超过 1；rage 不超过 20；guard 的 duration 为 1000—6000 毫秒。新效果若超出这些现有机制，仍需实现战斗代码并补实战检查，不能只改技能描述。

添加新人物后，通用名册迁移会按 introducedIn 向合格旧档补入“未获得、1 级、0 经验”的记录，保留老人物培养、装备、阵容和剧情。已经缺失原有英雄、有陌生 ID 或来自未来名册版本的存档会被拒绝，不会擅自修补或清空。

## 内容验证和发布

同步提升 config.release、前端模块版本标记及云端升级提示。若新增字段改变结构，更新结构描述，再验证跨文件引用和功能：

```bash
node scripts/shuihu-schema.mjs > public/game/data/schema.json
npm run test:all
npm run build
```

新增人物时应同步更新数量及人物集合预期。已有 `test:shuihu-external` 演示下一版再添加第二位外传人物的迁移检查，并覆盖原有培养数据保留、邀请消耗、旧页面云端覆盖防护。

**这次需要更新云存档 Worker，无需执行新的数据库迁移 SQL。** 外层存档格式仍为 version 2，名册版本升级到 rosterVersion 4。Worker 的游戏数据字典也要包含新人物，否则本机上传会提示先更新服务并保留本机进度。

发布时先部署 Worker，再推送前端。项目根目录执行：

```bash
npx wrangler deploy --config cloud/shuihu/wrangler.json
```

部署后 `/v1/game-version` 应返回 `rosterVersion: 4`、`heroes: 109`。未来新增角色以当版实际数量为准。新的 Worker 可接收合格旧 108 将存档并自动升级；升级后的云档拒绝较老名册版本直接覆盖，要求刷新游戏。明确的历史回滚仍走现有回滚流程。

本轮仅完成本地开发与验证，未推送 GitHub、部署线上服务或写入真实云存档。

## 本轮验证结果

- 全部已注册 self-check 测试通过，正式构建通过；构建保留已有主包体积提示。
- 存档迁移保留已有武松等级、经验、品质、装备和坐骑；损坏、未来版本字典被拒绝。模拟继续加入第 2 位外传角色时，无须重写迁移逻辑。
- 信物精确领取、营建条件、600 碎银邀请、重复操作拒绝、原招贤保底保留；晁盖升级、升品、练兵、练招、坐骑和实战羁绊通过。
- 隔离 Edge 模拟 390×844 手机：从旧 108 将档启动，实际完成外传、邀请、调整阵容、晁盖带兵出战、战中刷新、结算及文件导出；在禁用 structuredClone、Object.hasOwn、Array.at 的环境中通过。
- 检查手机与 1440×1000 桌面截图，人物立绘正常加载，主内容区域无横向溢出。浏览器尺寸模拟不代表所有实体手机型号验证。
- 真实 Worker 代码配合隔离内存 SQLite，验证旧档上传自动升级、人物及战中存档往返、旧页面覆盖返回 409 且云档不变；浏览器产生的真实战中和战后存档也往返一致。未连接生产 D1。

## 立绘来源

晁盖人物像使用本次内置 imagegen 工具生成（built-in 模式），保存为 [chaogai-v1.png](../public/game/art/chaogai-v1.png)。当前为独立竖版人物图；界面小卡片按比例裁切展示。生成提示词如下：

> Use case: stylized-concept. Create one production game portrait for 晁盖 (Chao Gai), the fictional Water Margin hero 托塔天王. Original painterly Chinese historical wuxia character art for a dark forest-green and antique-gold browser RPG. Single middle-aged Chinese man, broad shoulders, weathered confident face, thick short black beard, tied black hair under a modest dark head wrap, practical Song-inspired dark teal robe with bronze lamellar chest armor, muted rust sash. Dignified village leader and frontline protector, looking slightly toward the viewer, calm and resolute. Waist-up portrait, face and shoulders large and readable in a small character card; centered composition, enough headroom; subtle foggy reed-bank landscape fading into deep green background, warm soft rim light. Rich brush texture, restrained natural proportions and subdued colors. No text, letters, logo, frame, watermark, UI, extra people, or modern objects. Vertical 2:3 portrait, finished game art, no transparent background.
