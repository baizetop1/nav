# Tech OS

Tech OS 是白泽导航中的 Markdown-first 个人技术学习系统。它管理 Vision、Route、Quest、Question、Knowledge、Lab、Project、Tech Map 和 Route Seed；导航仍是统一入口，Blog 仍只接收成熟公开内容。

当前阶段：**T1 Data Foundation + T2 Desktop Workstation + T3 Mobile Capture + T4.1–T4.6 Route Lifecycle**。本目录仍可完全通过文本编辑器和 Git 使用；导航的 `/#/tech-os` 提供 Viewer、Repository、Capture、Learning Engine、Candidate 与 Route Engine 可编辑草稿。

## 当前状态

- Vision：`VISION-001` 理解现代计算机系统。
- Main Route：`ROUTE-001` 从输入网址到网页显示。
- Current Quest：`QUEST-001` 浏览器如何把一次导航拆成网络请求？
- 当前模式：Explore。

全局指针保存在 [`state.yml`](state.yml)。Main Route 只能由用户修改，校验器不会自动选择路线。

## 对象与职责

| Kind | ID 示例 | 说明 |
|---|---|---|
| Vision | `VISION-001` | 长期探索方向，不设置完成百分比 |
| Route | `ROUTE-001` | 一个阶段性的学习路线 |
| Route Seed | `RS-001` | 未来可能成长为 Route 的问题 |
| Route Review | `REVIEW-001` | 路线达到完成门槛后的复盘草稿 |
| Quest | `QUEST-001` | Route 中需要回答的核心问题 |
| Question | `QUESTION-001` | 学习过程中产生的具体开放问题 |
| Knowledge | `KNOWLEDGE-001` | 当前理解、证据、连接与未知 |
| Lab | `LAB-001` | 亲手实验及其证据 |
| Project | `PROJECT-001` | 多个知识和实验的综合成果 |
| Tech Map | `MAP-001` | “我知道什么”的索引，不是学习路线 |
| Inbox Item | `INBOX-…` | 从 Phase C/D Capture 显式转入、等待人工归类的条目 |

## 目录

```text
tech-os/
├── state.yml
├── inbox/
├── vision/
├── routes/{active,backlog,completed,archived,seeds,candidates}/
├── reviews/
├── quests/{active,backlog,completed}/
├── questions/
├── knowledge/{internet,programming,system,architecture,electronics,ic,ai}/
├── labs/
├── projects/
├── map/
├── graveyard/
├── logs/
└── templates/
```

## 手工工作流

### 1. Capture

手机继续使用 Phase C/D Inbox。Question、Idea、Note、Link 只通过 `tech-os/question`、`tech-os/idea`、`tech-os/note`、`tech-os/link` 标签表达，因此 `baize_inbox_v1` 和密文同步格式保持不变。

PC 在 Tech OS Inbox 中选择“加入 Repository 草稿”后生成 `tech-os/inbox/INBOX-….md`，保留 `source_inbox_id`。草稿先停留在当前工作台内存；完成远端读取、差异检查、schema 校验和人工确认后才提交。提交成功才归档来源记录，失败或冲突时来源仍留在 Inbox。

### 2. 推进 Quest

1. 打开 `state.yml` 指向的 `current_quest_id`。
2. 在 Quest 中记录当前结论和下一步。
3. 新问题写入 `questions/`，不要塞进一篇无限增长的笔记。
4. 形成稳定理解时创建 Knowledge。
5. 需要验证时创建 Lab；多个节点汇合时创建 Project。

### 3. 更新 Knowledge 等级

- L0：知道名字。
- L1：能解释。
- L2：做过实验。
- L3：能实现、深入分析或解决真实问题。

L2/L3 必须填写 `evidence_ids`，并由用户确认。系统不能因为阅读了文章就自动升级等级。

### 4. 完成或切换 Route

1. 完成 Route Review。
2. 收集 Open Questions、Knowledge Gap、Lab 和 Project Need。
3. 把值得继续的问题保存为 Route Seed。
4. 用户从候选中选择下一条 Main Route。
5. 修改 `state.yml`；不得由脚本自动切换 Main Route。

暂停但仍有价值的路线移动到 `graveyard/`，保留已经探索的内容和恢复条件。

### 5. 使用 Learning Engine

T4.1 只读取当前 Markdown 投影与既有 Inbox：

- Explore 优先 Current Quest 的显式“下一步”。
- Lab 优先当前路线已关联且状态为 planned/running 的 Lab。
- Keep Alive 只选择处理一个 Inbox、回答一个 Question、补充一个 Knowledge 或整理一个已有 Seed 等 small 动作。
- Route Seed Collector 读取未绑定 Seed 的 Question、Question/Idea Capture、Knowledge 的“还有什么不知道？”以及 Lab/Project/Completed Quest 中显式列出的新问题。
- Quest Suggestions 只来自 Main Route 的 backlog `quest_ids`；Knowledge Connections 只来自 Front Matter 中已有 ID。

所有建议都显示原因与来源。T4.1 不修改对象、不保存 Seed、不生成 Candidate；用户仍通过 Markdown 或后续明确确认流程作决定。

### 6. 生成 Route Candidate 草稿

T4.2 读取 Route Seed 与 T4.1 未保存信号：

1. 只按共同的具体 tag 建立关系，至少两条输入才形成 Candidate Group。
2. 领域级 tag（如 `internet`、`system`、`architecture`）不会单独触发聚合。
3. 用户编辑 Route Name、Why、Expected Outcome 与至少两个 Outline 步骤。
4. 输入 `STAGE RS-XXX` 后，Candidate 才进入当前页面的 Repository 内存草稿。
5. Repository 再执行完整 Tech OS 校验、远端比较、`COMMIT TECH-OS` 与浏览器二次确认。

如果候选包含私有 Inbox 输入，编辑器会提示其标题在进入 Repository 后将成为明文，并可能出现在公开 Pages 投影；保存前必须先检查或移除敏感内容。

生成文件放在 `routes/candidates/`，沿用 `kind: route-seed` 并使用 `status: candidate`。这一阶段不修改 `state.yml`，不自动选择路线。

### 7. Route Lifecycle 决策、Review 与下一路线

Route Engine 实现 T4.3–T4.6，并保持逐阶段人工确认：

1. Candidate Decision 在原路径记录 Save for Later、Archive 或 Not Interested 及理由；Archive/Not Interested 使用 `status: archived`，不删除来源。
2. Route Completion Review 仅在主路线 `status: completed` 或 Quest 完成率达到 80% 时开放，并把 Knowledge、已完成 Lab/Project、Open Questions、Route Seeds 与未完成节点写入 `reviews/REVIEW-XXX.md` 草稿。
3. Next Route Engine 仅在 Review 门槛满足后生成 2–4 条确定性建议，每条都显示 Why、Source、Related Questions、Existing Knowledge、Expected Outcome 与 Outline。
4. Manual Route Generator 可根据“主题 / 为什么 / 希望达到什么程度”生成并编辑路线骨架，例如“集成电路”会展开 MOSFET、CMOS、Logic Gate、RTL 与验证步骤。
5. 推荐与手工路线固定写入 `routes/backlog/`，使用 `status: backlog` 和 `main: false`。加入草稿仍需 `STAGE ...`，真正提交仍需 Repository 全量校验、远端比较、`COMMIT TECH-OS` 与浏览器确认。

这些阶段不会修改 `state.yml`、自动切换 Main Route、创建 Active Quest、升级 Knowledge 或宣称实验完成。当前示例路线进度为 0%，因此 Review 与 Next Route 推荐会按规则锁定；Manual Route 仍可使用。

## 校验

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

校验器会检查：

- schema version、kind、ID、日期和状态。
- 重复 ID 和悬空关系。
- Route / Quest 文件夹与状态是否一致。
- 是否恰好只有一条 Active Main Route。
- `state.yml` 是否指向 Main Route 和它的 Active Quest。
- Quest 标题是否是问题。
- Knowledge L2/L3 是否具有证据。
- 必需模板和目录是否存在。

## 边界

- 不修改 Phase A–D 数据格式。
- 不进入 `text-index.json`。
- 不进入 `NavigationBackup v1`。
- 不自动发布 Blog。
- 不自动选择 Main Route。
- 不自动宣称实验完成或升级 Knowledge。
- T2 Dashboard 读取由本目录生成的前端投影；Repository 页面可以在用户确认后原子提交受管 Markdown 草稿。
- Repository Adapter 不删除文件、不 force push、不管理 templates/README，也不保存 Token 或草稿。
- T3 Capture Adapter 不改变 Inbox v1、不自动创建 Route Seed，并只在 Repository 提交成功后归档来源记录。
- T4.1 Learning Engine 只读派生 Next Action 与 Route Seed Signals，不保存、聚合或自动选择路线。
- T4.2 只处理显式相关信号聚合、可编辑 Candidate 和多阶段确认，不自动保存或选择路线。
- T4.3 Candidate Decision 只更新候选草稿并保留理由，不删除文件。
- T4.4 Review 有严格的 completed/80% 门槛；T4.5 推荐依赖该门槛。
- T4.5/T4.6 生成的路线始终为 Backlog 且 `main: false`。
- 前端投影会进入 Pages 产物；部署前必须确认内容可以公开。
