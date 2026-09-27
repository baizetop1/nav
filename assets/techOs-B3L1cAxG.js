const d="tech-os-index/v1",c="tech-os/v1",a="2026-08-24",u={visionId:"VISION-001",mainRouteId:"ROUTE-001",currentQuestId:"QUEST-001",mode:"explore"},l=[{id:"KNOWLEDGE-001",kind:"knowledge",title:"DNS 查询链",status:"learning",created:"2026-08-24",tags:["dns","internet"],sourcePath:"tech-os/knowledge/internet/KNOWLEDGE-001.md",fields:{domain:"internet",level:"L0",quest_ids:["QUEST-003"],question_ids:["QUESTION-001"],lab_ids:["LAB-001"],project_ids:[],related_knowledge_ids:[],evidence_ids:[]},body:`## 是什么？

DNS 查询链描述客户端如何从域名获得后续连接需要的记录。

## 为什么遇到？

\`ROUTE-001\` 从 URL 进入网络连接前必须先确定目标地址。

## 目前理解到什么程度？

L0：知道浏览器、本机 resolver、递归 DNS 与权威 DNS 参与解析，但还不能完整解释缓存未命中的查询过程。

## 亲手做过什么？

尚未完成实验；计划执行 \`LAB-001\`。

## 与哪些知识连接？

未来连接 URL、IP、缓存、TTL 与 CDN。

## 还有什么不知道？

- 不同缓存层分别保存什么。
- CNAME、A/AAAA 与递归查询的具体顺序。
- DNSSEC 在查询链中的验证位置。`},{id:"LAB-001",kind:"lab",title:"观察一次 DNS 查询",status:"planned",created:"2026-08-24",tags:["dns","nslookup"],sourcePath:"tech-os/labs/LAB-001.md",fields:{quest_ids:["QUEST-003"],knowledge_ids:["KNOWLEDGE-001"],question_ids:["QUESTION-001"],project_ids:[]},body:`## 目标

观察域名解析结果、记录类型、TTL 和递归服务器，并为 \`KNOWLEDGE-001\` 提供 L2 前的实验材料。

## 环境

- Windows：\`nslookup\` 或 \`Resolve-DnsName\`。
- 可选：\`dig\`、浏览器网络面板、抓包工具。

## 步骤

1. 查询一个同时存在 A/AAAA 或 CNAME 的域名。
2. 记录所使用的 DNS 服务器、返回记录与 TTL。
3. 重复查询并观察缓存行为。
4. 更换递归 DNS 后比较结果。

## 结果

尚未执行。系统不得在没有真实记录时把状态改为 \`completed\`。

## 新问题

执行后写入 \`questions/\`，并回填 \`question_ids\`。`},{id:"PROJECT-001",kind:"project",title:"Tiny HTTP Server",status:"idea",created:"2026-08-24",tags:["http","server","linux"],sourcePath:"tech-os/projects/PROJECT-001.md",fields:{route_ids:["ROUTE-001"],quest_ids:["QUEST-006","QUEST-007"],knowledge_ids:[],lab_ids:[],question_ids:[]},body:`## 预期成果

实现一个最小 HTTP Server，能够监听端口、解析基础请求行和头部，并返回可由浏览器打开的响应。

## 为什么需要

把 HTTP、socket、Linux 进程和内存从“能解释”推进到“亲手实现”。

## 最小范围

- 单进程即可。
- 支持一个或少量路径。
- 不要求生产级并发、TLS、框架或容器。

## 完成证据

- 源码与运行说明。
- \`curl -v\` 请求记录。
- 对关键系统调用和协议字节的解释。

## 新问题

项目执行后再记录，不预先声称完成。`},{id:"QUEST-001",kind:"quest",title:"浏览器如何把一次导航拆成网络请求？",status:"active",created:"2026-08-24",tags:["browser","internet"],sourcePath:"tech-os/quests/active/QUEST-001.md",fields:{route_id:"ROUTE-001",order:1,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 学习目标

用一次真实导航回答：地址栏收到输入后，浏览器在什么位置决定 URL、缓存和 Service Worker，什么时刻才跨过网络边界，以及收到 HTML 后什么时刻进入渲染流程。

预计分 7 次完成，每次 25–45 分钟。页面中的 S1–S7 可以逐项打卡；打卡只保存在当前浏览器，不会自动把 Quest 宣称为完成。

## 总流程

\`\`\`text
地址栏输入
→ 判断搜索词或 URL
→ URL 解析与规范化
→ 同文档/跨文档导航判断
→ 内存缓存、HTTP 缓存与 Service Worker
→ DNS / 连接 / TLS / HTTP 请求
→ Document Response
→ HTML 解析与子资源发现
→ DOM + CSSOM
→ Layout / Paint / Composite
→ First Pixel
\`\`\`

### S1 · 分清地址栏输入和导航入口

**学什么：**地址栏既能接收 URL，也能接收搜索词；点击链接、提交表单、执行 \`location.assign()\`、刷新和前进后退也会触发导航，但入口和历史记录行为不同。

**动手做：**分别输入 \`example.com\`、\`https://example.com\`、一段搜索词；再用链接点击、刷新和前进后退访问同一页面。在 DevTools Network 中打开 Preserve log，记录每次是否出现新的 Document 请求。

**完成标志：**写出至少 5 种导航入口，并能说清哪些一定产生新的 Document 请求、哪些可能只改变当前文档。

### S2 · 拆解 URL 与同文档导航

**学什么：**scheme、host、port、path、query 和 fragment 的职责，以及默认端口、相对地址、百分号编码和 fragment 不发送给服务器的原因。

**动手做：**在控制台用 \`new URL(value, base)\` 解析 8–10 个例子；对同一页面分别改变 query 和 fragment，观察 Network 与地址栏。

**完成标志：**完成一张 URL 字段表，并能预测“改 query”和“改 fragment”分别会不会产生新的 Document 请求。

### S3 · 找到导航提交前的决策

**学什么：**浏览器在真正联网前会处理安全策略、重定向历史、导航取消、同文档判断和已有连接等信息；不要把“输入网址”等同于“立刻发 HTTP”。

**动手做：**在 Network 中比较正常导航、立即按 Esc 取消、页面内锚点和 301/302 重定向。为每种情况标出第一个 Document 条目出现的位置。

**完成标志：**画出一张“输入 → 导航提交”的决策图，至少包含 URL/搜索判断、同文档判断、取消和重定向。

### S4 · 区分内存缓存、HTTP 缓存与重新验证

**学什么：**memory cache、disk cache、fresh/stale、\`Cache-Control\`、\`ETag\`、\`Last-Modified\`、304，以及 DevTools 的 Disable cache 只在 DevTools 打开时生效。

**动手做：**对同一页面执行普通刷新、硬刷新、勾选 Disable cache 后刷新；比较 Size、Status、Age、ETag 和请求时序。不要只看“from cache”，还要查看有没有真正发出请求。

**完成标志：**保存三次对比记录，并能解释“直接复用响应”“带条件请求得到 304”“重新下载 200”三者的差别。

### S5 · 判断 Service Worker 是否接管请求

**学什么：**注册、scope、install、activate、control 与 fetch event 的关系；Service Worker 可以返回自己的缓存，也可以继续发起网络请求。

**动手做：**选择一个带 Service Worker 的测试页面，在 Application → Service Workers 查看是否已控制；分别测试正常、Offline、Bypass for network，并观察 Network 的 Initiator/Size。若页面没有 Service Worker，要明确记录“未命中”，不能假设它存在。

**完成标志：**能回答当前页面是否被控制、请求是否经过 fetch event、响应来自 Cache Storage 还是网络，并保存一张证据截图或文字记录。

### S6 · 划出网络请求的边界

**学什么：**当缓存或 Service Worker 没有直接给出可用响应时，浏览器才需要 DNS、连接复用或新建 TCP/QUIC、TLS、HTTP 请求与响应。Network Timing 中 Queueing、DNS、Initial connection、SSL、Request sent、Waiting 和 Content Download 分别属于哪里。

**动手做：**在 Network 中选择首个 Document 请求，查看 Timing；再用一次全新隐私窗口或不同域名减少连接复用影响。把 Timing 各阶段抄到流程图中。

**完成标志：**能指出“浏览器内部决策 → 网络活动”的边界，并解释为什么有时看不到 DNS、TCP 或 TLS 阶段。

### S7 · 从 Document Response 追到 First Pixel

**学什么：**HTML 字节流触发解析，浏览器建立 DOM、发现 CSS/JS/图片等子资源；CSSOM、脚本阻塞、style calculation、layout、paint、composite 决定何时出现像素。

**动手做：**在 Performance 面板录制一次重新加载，定位 Navigation、Parse HTML、Recalculate Style、Layout、Paint 和首次内容绘制；再临时禁用 CSS 或阻塞一个脚本，比较时间线变化。

**完成标志：**提交一张从 Document Response 到 First Pixel 的时间线，并能说明“收到 HTML”“DOM 可用”“页面可见”“页面可交互”不是同一时刻。

## Quest 正式完成条件

- S1–S7 在页面中全部打卡。
- 保存一张覆盖“地址栏 → First Pixel”的完整流程图。
- 至少保留一份 Network 或 Performance 证据，并能复述一次真实导航。
- 在“当前结论”中用自己的话写出浏览器内部、网络和渲染三条边界。
- 把仍然不会的问题加入 \`questions/\`，不要为了完成而假装已经理解。

## 当前结论

待学习后补充。建议按“浏览器内部决策 / 网络边界 / 渲染边界”三段记录，不复制教程原文。

## 下一步

先完成 S1：打开 DevTools Network，保留日志，比较地址栏输入、点击链接、刷新和前进后退是否产生新的 Document 请求。

## 完成证据

尚未形成。完成后在这里记录流程图、Network/Performance 截图或笔记的位置，以及一次不看资料的口头复述结果。

## Open Questions

在实验过程中新增到 \`questions/\`。`},{id:"QUEST-002",kind:"quest",title:"URL 如何准确描述目标资源？",status:"backlog",created:"2026-08-24",tags:["url","browser"],sourcePath:"tech-os/quests/backlog/QUEST-002.md",fields:{route_id:"ROUTE-001",order:2,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索 URL 的 scheme、authority、path、query、fragment 与规范化行为。

## 下一步

比较浏览器、Node.js \`URL\` 和服务器日志对同一组 URL 的解析结果。

## 完成证据

能解释 URL 各部分由谁处理，以及 fragment 为什么不会发送给服务器。`},{id:"QUEST-003",kind:"quest",title:"DNS 为什么能够找到服务器？",status:"backlog",created:"2026-08-24",tags:["dns","internet"],sourcePath:"tech-os/quests/backlog/QUEST-003.md",fields:{route_id:"ROUTE-001",order:3,question_ids:["QUESTION-001"],knowledge_ids:["KNOWLEDGE-001"],lab_ids:["LAB-001"],project_ids:[]},body:`## 当前理解

DNS 把域名解析为后续网络连接所需的记录，但解析结果来自多层缓存和递归/权威查询链。

## 下一步

完成 \`LAB-001\`，观察本机 resolver、递归服务器与权威结果之间的差异。

## 完成证据

能解释一次缓存未命中的 DNS 查询，并用命令验证关键记录。`},{id:"QUEST-004",kind:"quest",title:"IP 与 TCP 如何把字节可靠送到目标进程？",status:"backlog",created:"2026-08-24",tags:["ip","tcp","network"],sourcePath:"tech-os/quests/backlog/QUEST-004.md",fields:{route_id:"ROUTE-001",order:4,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索路由、端口、连接建立、序号、确认、重传与流量控制之间的职责边界。

## 下一步

用抓包观察一次 TCP 建连和小型 HTTP 请求。

## 完成证据

能根据抓包解释连接建立、数据传输和关闭。`},{id:"QUEST-005",kind:"quest",title:"TLS 如何建立可信的加密连接？",status:"backlog",created:"2026-08-24",tags:["tls","pki","security"],sourcePath:"tech-os/quests/backlog/QUEST-005.md",fields:{route_id:"ROUTE-001",order:5,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索证书验证、密钥协商、会话密钥与握手消息的关系。

## 下一步

使用 \`openssl s_client\` 和浏览器证书面板观察真实站点。

## 完成证据

能解释浏览器为何信任某个证书，以及握手如何得到对称密钥。`},{id:"QUEST-006",kind:"quest",title:"HTTP 与 Server 如何完成一次请求响应？",status:"backlog",created:"2026-08-24",tags:["http","server"],sourcePath:"tech-os/quests/backlog/QUEST-006.md",fields:{route_id:"ROUTE-001",order:6,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:["PROJECT-001"]},body:`## 当前理解

待探索请求方法、状态码、头部、正文、连接复用与服务器处理循环。

## 下一步

使用 \`curl -v\` 观察协议，并推进 \`PROJECT-001\`。

## 完成证据

能够实现一个最小 HTTP Server，并解释真实请求和响应字节。`},{id:"QUEST-007",kind:"quest",title:"Linux 进程与内存如何承载服务器？",status:"backlog",created:"2026-08-24",tags:["linux","process","memory"],sourcePath:"tech-os/quests/backlog/QUEST-007.md",fields:{route_id:"ROUTE-001",order:7,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:["PROJECT-001"]},body:`## 当前理解

待探索进程、文件描述符、socket、虚拟内存和系统调用如何共同承载服务。

## 下一步

运行最小服务器并使用 \`ps\`、\`ss\`、\`lsof\` 或等价工具观察它。

## 完成证据

能把服务端代码中的关键操作映射到进程和内核资源。`},{id:"QUEST-008",kind:"quest",title:"CPU 如何从指令一路落到逻辑门和晶体管？",status:"backlog",created:"2026-08-24",tags:["cpu","instruction","digital-logic"],sourcePath:"tech-os/quests/backlog/QUEST-008.md",fields:{route_id:"ROUTE-001",order:8,question_ids:["QUESTION-002"],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索程序指令、寄存器、执行单元、逻辑门和晶体管之间的抽象层次。

## 下一步

从一条简单指令出发，追踪它需要的数据通路和布尔逻辑。

## 完成证据

能解释一条指令如何由组合逻辑与时序逻辑执行，并形成后续 CPU / IC Route Seed。`},{id:"QUESTION-001",kind:"question",title:"浏览器、操作系统与递归 DNS 各自缓存了什么？",status:"open",created:"2026-08-24",tags:["dns","cache"],sourcePath:"tech-os/questions/QUESTION-001.md",fields:{origin_type:"quest",origin_id:"QUEST-003",route_seed_id:""},body:`## 为什么出现

理解 DNS 查询链时，不能把所有命中都笼统称为“DNS 缓存”。

## 当前假设

浏览器、系统 resolver、递归服务器可能分别保存不同范围和生命周期的结果。

## 如何回答

清理不同层级的缓存并重复 \`LAB-001\`，记录查询行为和 TTL 变化。

## 回答

尚未回答。`},{id:"QUESTION-002",kind:"question",title:"晶体管为什么能够构成数字逻辑？",status:"deferred",created:"2026-08-24",tags:["transistor","digital-logic","ic"],sourcePath:"tech-os/questions/QUESTION-002.md",fields:{origin_type:"quest",origin_id:"QUEST-008",route_seed_id:"RS-001"},body:`## 为什么出现

从 CPU 指令继续向下追踪时，逻辑门不能作为永远不解释的终点。

## 当前假设

MOSFET 的开关特性与 CMOS 互补结构可以实现稳定逻辑电平和基本逻辑门。

## 如何回答

当前 Main Route 只记录边界；未来由 \`RS-001\` 成长出的 Route 系统学习和实验。

## 回答

暂缓，等待未来路线。`},{id:"ROUTE-001",kind:"route",title:"从输入网址到网页显示",status:"active",created:"2026-08-24",tags:["internet","systems","architecture"],sourcePath:"tech-os/routes/active/ROUTE-001.md",fields:{vision_id:"VISION-001",main:!0,source:"manual",origin_id:"VISION-001",reason:"用一条真实请求贯穿互联网、系统、CPU 与数字逻辑，并主动产生后续路线",quest_ids:["QUEST-001","QUEST-002","QUEST-003","QUEST-004","QUEST-005","QUEST-006","QUEST-007","QUEST-008"],route_seed_ids:["RS-001"]},body:`## 路线链

\`\`\`text
Browser
↓
URL
↓
DNS
↓
IP
↓
TCP
↓
TLS
↓
HTTP
↓
Server
↓
Linux
↓
Process
↓
Memory
↓
CPU
↓
Instruction
↓
Logic Gate
↓
Transistor
\`\`\`

## 路线目标

能够从浏览器输入网址开始，解释并实验网页显示涉及的主要层次；遇到暂时不展开的问题时，把它保存为 Question 或 Route Seed，而不是立即切换主路线。

## 完成条件

- 每个 Quest 都形成当前结论和未解决问题。
- 核心网络节点至少有一个可重复 Lab。
- 完成一个最小 HTTP Server Project。
- 生成 Route Review 和 2–4 条可解释的下一路线候选。

## 调整规则

节点可以新增、跳过或重新排序。\`main: true\` 只能由用户设置；进度由 Quest 状态计算，不在 Route 中手工维护百分比。`},{id:"RS-001",kind:"route-seed",title:"晶体管如何构成数字逻辑？",status:"seed",created:"2026-08-24",tags:["electronics","digital-logic","ic"],sourcePath:"tech-os/routes/seeds/RS-001.md",fields:{source:"open_question",origin_id:"QUESTION-002",reason:"当前路线最终到达逻辑门与晶体管，但半导体器件和 CMOS 需要独立路线深入",related_question_ids:["QUESTION-002"]},body:`## 可能的路线

\`\`\`text
MOSFET
↓
CMOS
↓
Logic Gate
↓
Combinational Logic
↓
Sequential Logic
↓
Verilog
↓
RTL / FPGA / ASIC Flow
\`\`\`

## 进入 Candidate 的条件

- \`ROUTE-001\` 完成 Route Review。
- 与 CPU、逻辑门相关的 Open Questions 数量足够。
- 用户仍然对向硬件层深入感兴趣。

## 当前决定

只保存可能性，不切换 Main Route。`},{id:"MAP-001",kind:"tech-map",title:"现代计算机系统 Tech Map",status:"active",created:"2026-08-24",tags:["computing","map"],sourcePath:"tech-os/map/MAP-001.md",fields:{knowledge_ids:["KNOWLEDGE-001"]},body:`## 当前节点

| Domain | Knowledge | Level | 证据状态 |
|---|---|---|---|
| Internet | \`KNOWLEDGE-001\` DNS 查询链 | L0 | \`LAB-001\` 尚未执行 |

## 使用规则

Tech Map 表达“我知道什么”，不表达“下一步必须学什么”。实际等级以 Knowledge 文件 Front Matter 为准，本页只是人工可读索引。

## 待生长领域

- Internet
- Programming
- System
- Architecture
- Electronics
- IC
- AI`},{id:"VISION-001",kind:"vision",title:"理解现代计算机系统",status:"active",created:"2026-08-24",tags:["computing","systems"],sourcePath:"tech-os/vision/VISION-001.md",fields:{},body:`## 长期方向

理解现代计算机系统从互联网、操作系统和 CPU，一直到数字逻辑与集成电路的完整工作方式。

## 判断标准

Vision 不设置完成百分比。它持续产生阶段性的 Route，并允许兴趣和问题改变探索顺序。

## 当前路线

- \`ROUTE-001\` 从输入网址到网页显示。`}],S=[{path:"tech-os/knowledge/internet/KNOWLEDGE-001.md",content:`---
schema: tech-os/v1
kind: knowledge
id: KNOWLEDGE-001
title: DNS 查询链
status: learning
domain: internet
level: L0
created: 2026-08-24
quest_ids:
  - QUEST-003
question_ids:
  - QUESTION-001
lab_ids:
  - LAB-001
project_ids: []
related_knowledge_ids: []
evidence_ids: []
tags:
  - dns
  - internet
---

## 是什么？

DNS 查询链描述客户端如何从域名获得后续连接需要的记录。

## 为什么遇到？

\`ROUTE-001\` 从 URL 进入网络连接前必须先确定目标地址。

## 目前理解到什么程度？

L0：知道浏览器、本机 resolver、递归 DNS 与权威 DNS 参与解析，但还不能完整解释缓存未命中的查询过程。

## 亲手做过什么？

尚未完成实验；计划执行 \`LAB-001\`。

## 与哪些知识连接？

未来连接 URL、IP、缓存、TTL 与 CDN。

## 还有什么不知道？

- 不同缓存层分别保存什么。
- CNAME、A/AAAA 与递归查询的具体顺序。
- DNSSEC 在查询链中的验证位置。
`},{path:"tech-os/labs/LAB-001.md",content:`---
schema: tech-os/v1
kind: lab
id: LAB-001
title: 观察一次 DNS 查询
status: planned
created: 2026-08-24
quest_ids:
  - QUEST-003
knowledge_ids:
  - KNOWLEDGE-001
question_ids:
  - QUESTION-001
project_ids: []
tags:
  - dns
  - nslookup
---

## 目标

观察域名解析结果、记录类型、TTL 和递归服务器，并为 \`KNOWLEDGE-001\` 提供 L2 前的实验材料。

## 环境

- Windows：\`nslookup\` 或 \`Resolve-DnsName\`。
- 可选：\`dig\`、浏览器网络面板、抓包工具。

## 步骤

1. 查询一个同时存在 A/AAAA 或 CNAME 的域名。
2. 记录所使用的 DNS 服务器、返回记录与 TTL。
3. 重复查询并观察缓存行为。
4. 更换递归 DNS 后比较结果。

## 结果

尚未执行。系统不得在没有真实记录时把状态改为 \`completed\`。

## 新问题

执行后写入 \`questions/\`，并回填 \`question_ids\`。
`},{path:"tech-os/map/MAP-001.md",content:`---
schema: tech-os/v1
kind: tech-map
id: MAP-001
title: 现代计算机系统 Tech Map
status: active
created: 2026-08-24
knowledge_ids:
  - KNOWLEDGE-001
tags:
  - computing
  - map
---

## 当前节点

| Domain | Knowledge | Level | 证据状态 |
|---|---|---|---|
| Internet | \`KNOWLEDGE-001\` DNS 查询链 | L0 | \`LAB-001\` 尚未执行 |

## 使用规则

Tech Map 表达“我知道什么”，不表达“下一步必须学什么”。实际等级以 Knowledge 文件 Front Matter 为准，本页只是人工可读索引。

## 待生长领域

- Internet
- Programming
- System
- Architecture
- Electronics
- IC
- AI
`},{path:"tech-os/projects/PROJECT-001.md",content:`---
schema: tech-os/v1
kind: project
id: PROJECT-001
title: Tiny HTTP Server
status: idea
created: 2026-08-24
route_ids:
  - ROUTE-001
quest_ids:
  - QUEST-006
  - QUEST-007
knowledge_ids: []
lab_ids: []
question_ids: []
tags:
  - http
  - server
  - linux
---

## 预期成果

实现一个最小 HTTP Server，能够监听端口、解析基础请求行和头部，并返回可由浏览器打开的响应。

## 为什么需要

把 HTTP、socket、Linux 进程和内存从“能解释”推进到“亲手实现”。

## 最小范围

- 单进程即可。
- 支持一个或少量路径。
- 不要求生产级并发、TLS、框架或容器。

## 完成证据

- 源码与运行说明。
- \`curl -v\` 请求记录。
- 对关键系统调用和协议字节的解释。

## 新问题

项目执行后再记录，不预先声称完成。
`},{path:"tech-os/questions/QUESTION-001.md",content:`---
schema: tech-os/v1
kind: question
id: QUESTION-001
title: 浏览器、操作系统与递归 DNS 各自缓存了什么？
status: open
origin_type: quest
origin_id: QUEST-003
created: 2026-08-24
route_seed_id: ""
tags:
  - dns
  - cache
---

## 为什么出现

理解 DNS 查询链时，不能把所有命中都笼统称为“DNS 缓存”。

## 当前假设

浏览器、系统 resolver、递归服务器可能分别保存不同范围和生命周期的结果。

## 如何回答

清理不同层级的缓存并重复 \`LAB-001\`，记录查询行为和 TTL 变化。

## 回答

尚未回答。
`},{path:"tech-os/questions/QUESTION-002.md",content:`---
schema: tech-os/v1
kind: question
id: QUESTION-002
title: 晶体管为什么能够构成数字逻辑？
status: deferred
origin_type: quest
origin_id: QUEST-008
created: 2026-08-24
route_seed_id: RS-001
tags:
  - transistor
  - digital-logic
  - ic
---

## 为什么出现

从 CPU 指令继续向下追踪时，逻辑门不能作为永远不解释的终点。

## 当前假设

MOSFET 的开关特性与 CMOS 互补结构可以实现稳定逻辑电平和基本逻辑门。

## 如何回答

当前 Main Route 只记录边界；未来由 \`RS-001\` 成长出的 Route 系统学习和实验。

## 回答

暂缓，等待未来路线。
`},{path:"tech-os/quests/active/QUEST-001.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-001
title: 浏览器如何把一次导航拆成网络请求？
route_id: ROUTE-001
status: active
order: 1
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids: []
tags:
  - browser
  - internet
---

## 学习目标

用一次真实导航回答：地址栏收到输入后，浏览器在什么位置决定 URL、缓存和 Service Worker，什么时刻才跨过网络边界，以及收到 HTML 后什么时刻进入渲染流程。

预计分 7 次完成，每次 25–45 分钟。页面中的 S1–S7 可以逐项打卡；打卡只保存在当前浏览器，不会自动把 Quest 宣称为完成。

## 总流程

\`\`\`text
地址栏输入
→ 判断搜索词或 URL
→ URL 解析与规范化
→ 同文档/跨文档导航判断
→ 内存缓存、HTTP 缓存与 Service Worker
→ DNS / 连接 / TLS / HTTP 请求
→ Document Response
→ HTML 解析与子资源发现
→ DOM + CSSOM
→ Layout / Paint / Composite
→ First Pixel
\`\`\`

### S1 · 分清地址栏输入和导航入口

**学什么：**地址栏既能接收 URL，也能接收搜索词；点击链接、提交表单、执行 \`location.assign()\`、刷新和前进后退也会触发导航，但入口和历史记录行为不同。

**动手做：**分别输入 \`example.com\`、\`https://example.com\`、一段搜索词；再用链接点击、刷新和前进后退访问同一页面。在 DevTools Network 中打开 Preserve log，记录每次是否出现新的 Document 请求。

**完成标志：**写出至少 5 种导航入口，并能说清哪些一定产生新的 Document 请求、哪些可能只改变当前文档。

### S2 · 拆解 URL 与同文档导航

**学什么：**scheme、host、port、path、query 和 fragment 的职责，以及默认端口、相对地址、百分号编码和 fragment 不发送给服务器的原因。

**动手做：**在控制台用 \`new URL(value, base)\` 解析 8–10 个例子；对同一页面分别改变 query 和 fragment，观察 Network 与地址栏。

**完成标志：**完成一张 URL 字段表，并能预测“改 query”和“改 fragment”分别会不会产生新的 Document 请求。

### S3 · 找到导航提交前的决策

**学什么：**浏览器在真正联网前会处理安全策略、重定向历史、导航取消、同文档判断和已有连接等信息；不要把“输入网址”等同于“立刻发 HTTP”。

**动手做：**在 Network 中比较正常导航、立即按 Esc 取消、页面内锚点和 301/302 重定向。为每种情况标出第一个 Document 条目出现的位置。

**完成标志：**画出一张“输入 → 导航提交”的决策图，至少包含 URL/搜索判断、同文档判断、取消和重定向。

### S4 · 区分内存缓存、HTTP 缓存与重新验证

**学什么：**memory cache、disk cache、fresh/stale、\`Cache-Control\`、\`ETag\`、\`Last-Modified\`、304，以及 DevTools 的 Disable cache 只在 DevTools 打开时生效。

**动手做：**对同一页面执行普通刷新、硬刷新、勾选 Disable cache 后刷新；比较 Size、Status、Age、ETag 和请求时序。不要只看“from cache”，还要查看有没有真正发出请求。

**完成标志：**保存三次对比记录，并能解释“直接复用响应”“带条件请求得到 304”“重新下载 200”三者的差别。

### S5 · 判断 Service Worker 是否接管请求

**学什么：**注册、scope、install、activate、control 与 fetch event 的关系；Service Worker 可以返回自己的缓存，也可以继续发起网络请求。

**动手做：**选择一个带 Service Worker 的测试页面，在 Application → Service Workers 查看是否已控制；分别测试正常、Offline、Bypass for network，并观察 Network 的 Initiator/Size。若页面没有 Service Worker，要明确记录“未命中”，不能假设它存在。

**完成标志：**能回答当前页面是否被控制、请求是否经过 fetch event、响应来自 Cache Storage 还是网络，并保存一张证据截图或文字记录。

### S6 · 划出网络请求的边界

**学什么：**当缓存或 Service Worker 没有直接给出可用响应时，浏览器才需要 DNS、连接复用或新建 TCP/QUIC、TLS、HTTP 请求与响应。Network Timing 中 Queueing、DNS、Initial connection、SSL、Request sent、Waiting 和 Content Download 分别属于哪里。

**动手做：**在 Network 中选择首个 Document 请求，查看 Timing；再用一次全新隐私窗口或不同域名减少连接复用影响。把 Timing 各阶段抄到流程图中。

**完成标志：**能指出“浏览器内部决策 → 网络活动”的边界，并解释为什么有时看不到 DNS、TCP 或 TLS 阶段。

### S7 · 从 Document Response 追到 First Pixel

**学什么：**HTML 字节流触发解析，浏览器建立 DOM、发现 CSS/JS/图片等子资源；CSSOM、脚本阻塞、style calculation、layout、paint、composite 决定何时出现像素。

**动手做：**在 Performance 面板录制一次重新加载，定位 Navigation、Parse HTML、Recalculate Style、Layout、Paint 和首次内容绘制；再临时禁用 CSS 或阻塞一个脚本，比较时间线变化。

**完成标志：**提交一张从 Document Response 到 First Pixel 的时间线，并能说明“收到 HTML”“DOM 可用”“页面可见”“页面可交互”不是同一时刻。

## Quest 正式完成条件

- S1–S7 在页面中全部打卡。
- 保存一张覆盖“地址栏 → First Pixel”的完整流程图。
- 至少保留一份 Network 或 Performance 证据，并能复述一次真实导航。
- 在“当前结论”中用自己的话写出浏览器内部、网络和渲染三条边界。
- 把仍然不会的问题加入 \`questions/\`，不要为了完成而假装已经理解。

## 当前结论

待学习后补充。建议按“浏览器内部决策 / 网络边界 / 渲染边界”三段记录，不复制教程原文。

## 下一步

先完成 S1：打开 DevTools Network，保留日志，比较地址栏输入、点击链接、刷新和前进后退是否产生新的 Document 请求。

## 完成证据

尚未形成。完成后在这里记录流程图、Network/Performance 截图或笔记的位置，以及一次不看资料的口头复述结果。

## Open Questions

在实验过程中新增到 \`questions/\`。
`},{path:"tech-os/quests/backlog/QUEST-002.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-002
title: URL 如何准确描述目标资源？
route_id: ROUTE-001
status: backlog
order: 2
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids: []
tags:
  - url
  - browser
---

## 当前理解

待探索 URL 的 scheme、authority、path、query、fragment 与规范化行为。

## 下一步

比较浏览器、Node.js \`URL\` 和服务器日志对同一组 URL 的解析结果。

## 完成证据

能解释 URL 各部分由谁处理，以及 fragment 为什么不会发送给服务器。
`},{path:"tech-os/quests/backlog/QUEST-003.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-003
title: DNS 为什么能够找到服务器？
route_id: ROUTE-001
status: backlog
order: 3
created: 2026-08-24
question_ids:
  - QUESTION-001
knowledge_ids:
  - KNOWLEDGE-001
lab_ids:
  - LAB-001
project_ids: []
tags:
  - dns
  - internet
---

## 当前理解

DNS 把域名解析为后续网络连接所需的记录，但解析结果来自多层缓存和递归/权威查询链。

## 下一步

完成 \`LAB-001\`，观察本机 resolver、递归服务器与权威结果之间的差异。

## 完成证据

能解释一次缓存未命中的 DNS 查询，并用命令验证关键记录。
`},{path:"tech-os/quests/backlog/QUEST-004.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-004
title: IP 与 TCP 如何把字节可靠送到目标进程？
route_id: ROUTE-001
status: backlog
order: 4
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids: []
tags:
  - ip
  - tcp
  - network
---

## 当前理解

待探索路由、端口、连接建立、序号、确认、重传与流量控制之间的职责边界。

## 下一步

用抓包观察一次 TCP 建连和小型 HTTP 请求。

## 完成证据

能根据抓包解释连接建立、数据传输和关闭。
`},{path:"tech-os/quests/backlog/QUEST-005.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-005
title: TLS 如何建立可信的加密连接？
route_id: ROUTE-001
status: backlog
order: 5
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids: []
tags:
  - tls
  - pki
  - security
---

## 当前理解

待探索证书验证、密钥协商、会话密钥与握手消息的关系。

## 下一步

使用 \`openssl s_client\` 和浏览器证书面板观察真实站点。

## 完成证据

能解释浏览器为何信任某个证书，以及握手如何得到对称密钥。
`},{path:"tech-os/quests/backlog/QUEST-006.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-006
title: HTTP 与 Server 如何完成一次请求响应？
route_id: ROUTE-001
status: backlog
order: 6
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids:
  - PROJECT-001
tags:
  - http
  - server
---

## 当前理解

待探索请求方法、状态码、头部、正文、连接复用与服务器处理循环。

## 下一步

使用 \`curl -v\` 观察协议，并推进 \`PROJECT-001\`。

## 完成证据

能够实现一个最小 HTTP Server，并解释真实请求和响应字节。
`},{path:"tech-os/quests/backlog/QUEST-007.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-007
title: Linux 进程与内存如何承载服务器？
route_id: ROUTE-001
status: backlog
order: 7
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids:
  - PROJECT-001
tags:
  - linux
  - process
  - memory
---

## 当前理解

待探索进程、文件描述符、socket、虚拟内存和系统调用如何共同承载服务。

## 下一步

运行最小服务器并使用 \`ps\`、\`ss\`、\`lsof\` 或等价工具观察它。

## 完成证据

能把服务端代码中的关键操作映射到进程和内核资源。
`},{path:"tech-os/quests/backlog/QUEST-008.md",content:`---
schema: tech-os/v1
kind: quest
id: QUEST-008
title: CPU 如何从指令一路落到逻辑门和晶体管？
route_id: ROUTE-001
status: backlog
order: 8
created: 2026-08-24
question_ids:
  - QUESTION-002
knowledge_ids: []
lab_ids: []
project_ids: []
tags:
  - cpu
  - instruction
  - digital-logic
---

## 当前理解

待探索程序指令、寄存器、执行单元、逻辑门和晶体管之间的抽象层次。

## 下一步

从一条简单指令出发，追踪它需要的数据通路和布尔逻辑。

## 完成证据

能解释一条指令如何由组合逻辑与时序逻辑执行，并形成后续 CPU / IC Route Seed。
`},{path:"tech-os/routes/active/ROUTE-001.md",content:`---
schema: tech-os/v1
kind: route
id: ROUTE-001
title: 从输入网址到网页显示
vision_id: VISION-001
status: active
main: true
source: manual
origin_id: VISION-001
reason: 用一条真实请求贯穿互联网、系统、CPU 与数字逻辑，并主动产生后续路线
created: 2026-08-24
quest_ids:
  - QUEST-001
  - QUEST-002
  - QUEST-003
  - QUEST-004
  - QUEST-005
  - QUEST-006
  - QUEST-007
  - QUEST-008
route_seed_ids:
  - RS-001
tags:
  - internet
  - systems
  - architecture
---

## 路线链

\`\`\`text
Browser
↓
URL
↓
DNS
↓
IP
↓
TCP
↓
TLS
↓
HTTP
↓
Server
↓
Linux
↓
Process
↓
Memory
↓
CPU
↓
Instruction
↓
Logic Gate
↓
Transistor
\`\`\`

## 路线目标

能够从浏览器输入网址开始，解释并实验网页显示涉及的主要层次；遇到暂时不展开的问题时，把它保存为 Question 或 Route Seed，而不是立即切换主路线。

## 完成条件

- 每个 Quest 都形成当前结论和未解决问题。
- 核心网络节点至少有一个可重复 Lab。
- 完成一个最小 HTTP Server Project。
- 生成 Route Review 和 2–4 条可解释的下一路线候选。

## 调整规则

节点可以新增、跳过或重新排序。\`main: true\` 只能由用户设置；进度由 Quest 状态计算，不在 Route 中手工维护百分比。
`},{path:"tech-os/routes/seeds/RS-001.md",content:`---
schema: tech-os/v1
kind: route-seed
id: RS-001
title: 晶体管如何构成数字逻辑？
status: seed
source: open_question
origin_id: QUESTION-002
reason: 当前路线最终到达逻辑门与晶体管，但半导体器件和 CMOS 需要独立路线深入
created: 2026-08-24
related_question_ids:
  - QUESTION-002
tags:
  - electronics
  - digital-logic
  - ic
---

## 可能的路线

\`\`\`text
MOSFET
↓
CMOS
↓
Logic Gate
↓
Combinational Logic
↓
Sequential Logic
↓
Verilog
↓
RTL / FPGA / ASIC Flow
\`\`\`

## 进入 Candidate 的条件

- \`ROUTE-001\` 完成 Route Review。
- 与 CPU、逻辑门相关的 Open Questions 数量足够。
- 用户仍然对向硬件层深入感兴趣。

## 当前决定

只保存可能性，不切换 Main Route。
`},{path:"tech-os/state.yml",content:`schema: tech-os-state/v1
vision_id: VISION-001
main_route_id: ROUTE-001
current_quest_id: QUEST-001
mode: explore
updated: 2026-08-24
`},{path:"tech-os/vision/VISION-001.md",content:`---
schema: tech-os/v1
kind: vision
id: VISION-001
title: 理解现代计算机系统
status: active
created: 2026-08-24
tags:
  - computing
  - systems
---

## 长期方向

理解现代计算机系统从互联网、操作系统和 CPU，一直到数字逻辑与集成电路的完整工作方式。

## 判断标准

Vision 不设置完成百分比。它持续产生阶段性的 Route，并允许兴趣和问题改变探索顺序。

## 当前路线

- \`ROUTE-001\` 从输入网址到网页显示。
`}],T={schema:d,sourceSchema:c,sourceUpdated:a,state:u,entities:l,files:S};let o=T;const i=new Map(o.entities.map(n=>[n.id,n]));function h(n){o=n,i.clear(),n.entities.forEach(e=>i.set(e.id,e))}function m(n){return n?i.get(n):void 0}function E(n){return o.entities.filter(e=>e.kind===n)}function r(n,e){return n.fields[e]}function U(n,e){const t=r(n,e);return typeof t=="string"?t:""}function _(n,e){const t=r(n,e);return typeof t=="number"?t:void 0}function k(n,e){const t=r(n,e);return Array.isArray(t)?t:typeof t=="string"&&t?[t]:[]}function g(n){return n.map(e=>i.get(e)).filter(e=>!!e)}function p(n){const e=Object.entries(n.fields).flatMap(([t,s])=>!t.endsWith("_id")&&!t.endsWith("_ids")?[]:Array.isArray(s)?s:typeof s=="string"?[s]:[]);return g([...new Set(e.filter(Boolean))])}export{E as getTechOsEntities,m as getTechOsEntity,r as getTechOsField,k as getTechOsIds,_ as getTechOsNumber,p as getTechOsRelations,U as getTechOsString,h as replaceTechOsIndex,g as resolveTechOsIds,o as techOsIndex};
