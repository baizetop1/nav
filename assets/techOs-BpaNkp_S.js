const c="tech-os-index/v1",a="tech-os/v1",l="2026-08-24",d={visionId:"VISION-001",mainRouteId:"ROUTE-001",currentQuestId:"QUEST-001",mode:"explore"},p=[{id:"KNOWLEDGE-001",kind:"knowledge",title:"DNS 查询链",status:"learning",created:"2026-08-24",tags:["dns","internet"],sourcePath:"tech-os/knowledge/internet/KNOWLEDGE-001.md",fields:{domain:"internet",level:"L0",quest_ids:["QUEST-003"],question_ids:["QUESTION-001"],lab_ids:["LAB-001"],project_ids:[],related_knowledge_ids:[],evidence_ids:[]},body:`## 是什么？

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

项目执行后再记录，不预先声称完成。`},{id:"QUEST-001",kind:"quest",title:"浏览器如何把一次导航拆成网络请求？",status:"active",created:"2026-08-24",tags:["browser","internet"],sourcePath:"tech-os/quests/active/QUEST-001.md",fields:{route_id:"ROUTE-001",order:1,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 开始前

这不是背诵一串名词的任务。你要学会回答：“我刚才做了什么，浏览器实际做了什么，哪条记录支持我的判断？”不需要先会写 JavaScript，也不用安装抓包软件。

手机可以预习、答题和记录疑问；本课完整的 Network、Application、Performance 实验需要桌面版 Chrome 或 Edge。手机里的“桌面版网站”不等于桌面 DevTools。先做 S1，一次只推进一个步骤，通常安排 25–45 分钟；卡住就留下问题，不必当天做完七步。

本课导航实验页由上方按钮打开。它提供同源链接、GET 表单、查询参数和页内锚点，不注册 Service Worker，不调用外部 API。它与 \`example.com\` 都不承诺出现 301/302、304、某种缓存命中或离线可用。实验页可能受到所在站点已有 Service Worker 的控制，需要到 S5 实测，不能仅凭“本页未注册”排除。

本文中的记录表是空白作业，参考答案只是自测提示，不是你已经完成的证据。打卡、保存笔记和正式提交完成是不同操作。

## 学习目标

做完后，你能用一份自己的记录解释：导航入口怎样形成 URL；哪里可能复用现有文档或响应；哪里真的需要网络；HTML 怎样变成可见内容。

先认识四个词：URL 是资源地址；请求是浏览器索取资源的消息；响应是对方返回的状态、头部和内容；Document 是页面文档这一资源类型，不是“所有请求”的别名。

## 学习思路

每一步都按“先预测 → 只改一个条件 → 看记录 → 解释差异 → 不看答案自测”进行。把“我看见的事实”和“我的解释”分开写；没有观察到的现象填“未观察到”，不填推测数值。

这张图是阅读地图，不是每次导航都会完整经历的固定流水线：

\`\`\`text
入口与 URL
├─ 同文档变化 / 历史恢复：可能直接继续使用文档
└─ 需要取得文档响应
   ├─ Service Worker / HTTP 缓存等可能提供响应
   └─ 需要网络：名称解析、连接、发送、接收
      └─ 若收到 HTTP 重定向，再处理新地址
→ HTML 解析与资源发现（可能与下载交错）
→ 样式、布局、绘制、合成 → 可见内容
\`\`\`

## 工具准备

1. 用桌面 Chrome 或 Edge 打开本课程，再通过上方按钮打开“导航实验页”。把课程留在一个标签页，实验放在另一个；不要在登录着邮箱、网银或 GitHub 管理后台的页面做实验。
2. 准备本地记事本，写下日期、浏览器名称/版本、实验页完整地址。证据优先使用文字或只含实验页的局部截图，不导出或上传含 Cookie、Token、个人 URL 的 HAR/完整性能日志。
3. 实验页内右键空白处 → 检查（Inspect），打开开发者工具。找到 Network（网络）；标签被折叠时从 \`>>\` 或“更多工具”中选择。Edge/Chrome 的图标位置和中文译名可能略有不同。
4. 本课不要求清除浏览器全部数据、不安装扩展、不绕过证书警告。控制台只用文中解释过的短小只读表达式；不粘贴网上来历不明的脚本，也不输入允许粘贴的口令来绕过安全提示。不想用控制台可以完成对应的手工拆解。

工具说明：[Chrome Network 入门](https://developer.chrome.com/docs/devtools/network/)、[Edge Network 入门](https://learn.microsoft.com/en-us/microsoft-edge/devtools/network/)。控制台风险说明：[Chrome Self-XSS 防护](https://developer.chrome.com/blog/self-xss)。

### S1 · 分清地址栏输入和导航入口

#### 为什么这样做

同样是“页面变了”，有的动作取得新文档，有的只滚动到当前页面某处。先识别入口，再谈网络，否则容易把每次点击都当成重新下载网页。

#### 工具与操作

1. 在实验页复制地址，去掉末尾 \`?\` 之后的查询串和 \`#\` 之后的片段，记为“基准地址”。保留协议、域名、端口和完整路径，不要把它改成教程中的示例域名。
2. 打开 Network，确认左上角录制圆点处于录制状态（通常为红色）。点击旁边的清空日志按钮（Clear，通常为斜杠圆圈）。这只清当前面板的请求列表，不是清浏览器数据。
3. 勾选 Preserve log（保留日志）；暂不勾选 Disable cache（停用缓存）；限速选 No throttling（不限速）。清空 Filter 文本框，点击 Doc/Document 类型。找不到类型按钮时点漏斗显示筛选栏，或在 Filter 输入 \`resource-type:document\`。
4. 按 Ctrl+R 刷新实验页。点击新增的文档行，在 Headers → General 读 Request URL、Request Method、Status Code；核对 Type 是 document。把地址与状态抄到表中。出现文档行并不自动证明通过互联网下载，缓存来源将在 S4 判断。
5. 点击实验页的普通同源链接，目标含 \`?visit=link\`。先看地址栏，再看新文档行。完成记录后，回到基准地址；等加载结束，清日志，再开始下一个动作。
6. 在实验页的 GET 表单输入 \`network\` 并提交，找 URL 中的 \`keyword=network\`。只用这个无敏感内容的示例词；GET 表单数据会出现在地址中。记录文档行和方法，不把表单当作必然的后台 API 请求。
7. 回到基准地址并清日志，点击通向 \`#section-two\` 的页内锚点。看是否滚动、URL 是否多出片段、新文档行是否增加。随后分别后退、前进各一次，记录具体动作，别只写“点了返回”。
8. 最后另开一个只做公开访问的标签页，依次在地址栏输入 \`example.com\`、\`https://example.com/\`、\`浏览器导航原理\`。记录最后落到的域名：前两个通常访问网站，第三个通常交给默认搜索引擎；自动补全、默认引擎与安全策略会影响结果。不必登录搜索网站，也不必点击搜索结果。

每个独立动作前清日志；Preserve log 负责保留这个动作内部可能发生的多次导航。按自己的结果填写：

| 动作 | 最终 URL 的变化 | 新 Document 行数 | 状态/来源原文 | 我的解释 |
| --- | --- | --- | --- | --- |
| 刷新基准地址 | 待填写 | 待填写 | 待填写 | 待填写 |
| 点击普通链接 | 待填写 | 待填写 | 待填写 | 待填写 |
| 提交 GET 表单 | 待填写 | 待填写 | 待填写 | 待填写 |
| 点击页内锚点 | 待填写 | 待填写 | 待填写 | 待填写 |
| 锚点后后退/前进 | 待填写 | 待填写 | 待填写 | 待填写 |
| 地址栏输入搜索词 | 待填写 | 不强求抓全 | 待填写 | 待填写 |

#### 观察与预期

实验页的普通链接/GET 表单采用常规文档导航；片段变化通常不需要取得新文档。后退前进也可能恢复历史页面或命中 bfcache，所以不能要求它们每次都出现新文档行。搜索框建议请求、图片请求不算 Document。

#### 常见误区

“页面没变样”等于“没导航”；“有一行 document”等于“走了外网”；“Back 一次”一定等于“重新请求上一个网站”。这三句话都不成立。

#### 卡住时怎么办

列表为空：先点 All、清空 Filter、确认录制开启，再刷新。出现很多旧行：先清日志再做一个动作。新标签没记录：DevTools 只观察它附着的标签页，去实际打开页面的那个标签重新开工具。访问失败就记录错误文字，不关闭安全防护来强行继续。

#### 检查理解

1. 为什么清日志后，点击 \`#section-two\` 可以看到地址变化却看不到新 Document？
2. “点击链接”和“提交表单”是否永远是两种不同的网络请求类型？

#### 参考答案

1. 片段指向当前文档内部的位置，浏览器可以继续使用已有文档。这里的结论来自这个受控锚点，不代表所有网站的点击都如此。
2. 不是。本课两者都可形成文档导航，表单另有方法和字段；真实网站也可能用 JavaScript 拦截动作再发送其他请求。先看实际记录。

#### 完成标志

留下至少五种入口的实测记录，能独立找到一行 document 的 URL/方法/状态，并用自己的话区分“动作”“文档导航”“真实网络传输”。没有运行过的格子保持空白。

参考：[MDN 发送表单数据](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data)、[Chrome 团队：前进后退缓存](https://web.dev/articles/bfcache)。

### S2 · 拆解 URL 与同文档导航

#### 为什么这样做

URL 不是一整块不可拆的字符串。只有分清“访问谁”“请求哪条路径”“附带什么参数”“定位文档哪里”，才能预测一次修改可能影响哪一层。

#### 工具与操作

1. 回到实验页基准地址，Network 按 S1 设置并清日志。点击查询参数示例，或在基准地址后输入 \`?topic=network&sample=1\` 回车。对照实验页的 URL 字段显示，记录 protocol、hostname、port、pathname、search、hash。
2. 再清日志，只在当前地址末尾加 \`#section-two\` 回车，不改其他字符。观察字段变化与 Document 行数。片段在 HTTP 请求目标中不会被发送；对照上一条真实请求的 Request URL，而不是把地址栏当请求报文。
3. 再清日志，把 \`sample=1\` 改成 \`sample=2\` 回车，保持路径不变。记录是否发起文档导航。这是地址栏导航实验，不是用 \`history.pushState()\` 修改地址的实验。
4. 在笔记中手工拆解下面这条“仅用于解析”的地址；不要实际访问它的 8443 端口。先填写字段表，再看参考答案。

\`\`\`text
https://example.com:8443/learn/page.html?q=hello%20world&lang=zh#section-two
\`\`\`

| 字段 | 你填写的值 | 你认为它负责什么 |
| --- | --- | --- |
| protocol | 待填写 | 待填写 |
| hostname | 待填写 | 待填写 |
| port | 待填写 | 待填写 |
| pathname | 待填写 | 待填写 |
| search | 待填写 | 待填写 |
| hash | 待填写 | 待填写 |

5. 可选验证：在实验页 DevTools 选择 Console（控制台），读懂后手动输入下面第一行并回车，展开得到的 URL 对象查看属性。它只解析字符串，不发起请求、不读取账户或修改存储。第二行只读取解析后的参数；若出现粘贴安全警告，不绕过它，可继续做手工练习。

\`\`\`js
new URL("https://example.com:8443/learn/page.html?q=hello%20world&lang=zh#section-two")
new URL("https://example.com/?q=hello%20world").searchParams.get("q")
\`\`\`

6. 再预测下表八个输入；可逐条手动输入 \`new URL("输入", "基准")\` 检查，完整绝对地址可省略第二参数。只比较 \`href\`、\`port\`、\`pathname\`、\`search\`、\`hash\`，不执行任何导航代码。

| 输入 | 相对地址所用基准 | 重点观察 |
| --- | --- | --- |
| \`https://EXAMPLE.com:443/\` | 不需要 | 主机名和默认端口怎样规范化 |
| \`https://example.com:8443/a\` | 不需要 | 非默认端口是否保留 |
| \`../notes\` | \`https://example.com/learn/page.html\` | 相对路径怎样合并 |
| \`/notes\` | 同上 | 以 \`/\` 开头从哪里算 |
| \`?q=two\` | 同上 | 路径会不会保留 |
| \`#section-two\` | 同上 | 哪个字段改变 |
| \`https://example.com/?q=hello%20world\` | 不需要 | search 原文与解码后的 q 值 |
| \`https://example.com/学习\` | 不需要 | href 中的百分号编码 |

#### 观察与预期

默认 HTTPS 端口 443 会规范化为 \`port\` 空字符串，不是“没有端口”；\`host\` 会含非默认端口，\`hostname\` 不含。\`search\` 带 \`?\`，\`hash\` 带 \`#\`。实验页改 query 的普通导航与只改 fragment 的同文档变化应分开记录。

#### 常见误区

把 \`?\` 后所有内容都当路径；认为 \`%20\` 是加密；把 \`new URL()\` 当作下载命令；以为 fragment 天生保密。片段虽不随该 HTTP 请求发送，页面脚本仍能读到它，不能用来隐藏密码。

#### 卡住时怎么办

\`Invalid URL\`：检查英文引号、协议和相对地址是否给了绝对基准。默认端口栏空白不用“修复”。只改片段却多出文档行：确认之前加载已完成、路径/query 未一起改、日志已清空；无法排除时记“待复查”，不要删掉反例。

#### 检查理解

1. 上面长 URL 的六个字段分别是什么？哪部分不会作为 HTTP 请求目标发送？
2. \`../notes\` 的最终路径是什么？\`searchParams.get("q")\` 读到的是 \`%20\` 还是空格？

#### 参考答案

1. 依次是 \`https:\`、\`example.com\`、\`8443\`、\`/learn/page.html\`、\`?q=hello%20world&lang=zh\`、\`#section-two\`；最后的 fragment 不随该请求发送。
2. 路径为 \`/notes\`；q 的解码值是 \`hello world\`。这些是解析规则的答案，不是你设备上的网络实验结果。

#### 完成标志

完成六字段表、八个解析预测和 query/fragment 的两组对照；能解释“URL 字符串变化”为什么不等于“必定新建文档或外网传输”。

参考：[MDN URL 属性](https://developer.mozilla.org/en-US/docs/Web/API/URL)、[URL 构造与相对地址](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)、[fragment 的边界](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)。

### S3 · 找到导航提交前的决策

#### 为什么这样做

“准备导航”“取得响应”“用新文档替换当前文档”不是同一个时刻。取消可以发生在不同阶段；HTTP 301/302 则是响应到达后的决定，不应画成所有请求之前必做的检查。

#### 工具与操作

1. 在实验页清日志，点击锚点做一次同文档变化，再清日志点击普通链接。分别记录新 URL 与是否出现 document。
2. 为观察取消，Network 限速选 3G 或 Slow 4G，暂时勾选 Disable cache；加载基准地址后立即按 Esc，或点地址栏旁的停止加载按钮。记录实际结果：取消、已完成或未捕捉到。结束后恢复 No throttling 并取消 Disable cache。
3. 读取下方 MDN 重定向说明，手画教学例子：\`请求 A → 响应 302 + Location: B → 请求 B → 响应 200\`。给它标注“文档示例，非本机抓包”。本课静态页没有承诺提供 302；不要把点击链接后的 200 伪称为重定向。
4. 若你在公开测试访问中恰好看到 301/302，可选中该行核对 Headers 的 Location 与下一行 URL；没有就写“真实重定向证据待补”。浏览器内部 HTTPS 升级也不能直接当成服务器返回的 301/302。

#### 观察与预期

取消可能来不及，或者请求已发送但响应未完整收到；Network 没显示完整页面不代表服务器没收到请求。同文档锚点是本课稳定对照，取消耗时和重定向不是。

#### 常见误区

把 \`(canceled)\` 当成 HTTP 状态码；把 HTTP 重定向、点击新链接、脚本改地址混为一谈；只凭 DevTools 一行记录推断浏览器全部内部事件。

#### 卡住时怎么办

页面太快就记录“未捕捉到取消”，不反复轰炸网站。误留限速导致后面都变慢，先恢复 No throttling。只有 200 而没有 Location，不要凭最终地址猜中间一定有 302。

#### 检查理解

1. 按 Esc 后能否断言服务器没有收到请求？
2. 301/302 在第一次 HTTP 请求之前还是之后才能由服务器告知？

#### 参考答案

1. 不能，取消时点不同，已发送的数据无法因点击停止而撤回。
2. 在相应请求获得响应时才能看到服务器的重定向状态和 Location；随后可能继续访问新地址。

#### 完成标志

画出含“同文档 / 需要响应 / 可取消 / 重定向再导航”的分支图，并区分实测结果与教学示例。没有 302 实测必须明确保留“待补”。

参考：[MDN HTTP 重定向](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections)。

### S4 · 区分内存缓存、HTTP 缓存与重新验证

#### 为什么这样做

“快”不能证明命中缓存，“200”也不必然代表重新传输全部内容。需要把状态码、传输来源和条件请求放在一起看；memory/disk 是浏览器缓存的实现位置，不是两种不同的 HTTP 协议。

#### 工具与操作

1. 选择实验页或公开的 \`https://example.com/\`，固定同一个 URL，不添加随机参数。回到 Network → Document，No throttling，取消 Disable cache，加载一次作为基线。
2. 清日志，普通刷新；选择 document，在 Headers 记录响应的 Cache-Control、ETag、Last-Modified、Age，缺失写“无”。再看请求是否带 If-None-Match 或 If-Modified-Since。
3. 清日志，执行一次“硬重新加载”（Windows 通常 Ctrl+Shift+R）。不要选择“清空缓存并硬重新加载”，不清浏览器全部数据。记录同一组字段。
4. 勾选 Disable cache，保持 DevTools 打开，再清日志并普通刷新；记录第三组。结束后取消该选项。这个开关针对浏览器缓存，不是删除文件，也不等于清空 Service Worker 的 Cache Storage。

| 条件 | Status / Size 来源原文 | Cache-Control / 验证器 | 条件请求头 | 本次能支持的结论 |
| --- | --- | --- | --- | --- |
| 普通刷新 | 待填写 | 待填写 | 待填写 | 待填写 |
| 硬重新加载 | 待填写 | 待填写 | 待填写 | 待填写 |
| Disable cache 后刷新 | 待填写 | 待填写 | 待填写 | 待填写 |

#### 观察与预期

可能三次都是 200，也可能显示缓存来源或 304；由资源策略、验证器、浏览器与托管环境决定。\`no-cache\` 允许保存但复用前要验证；\`no-store\` 要求不要保存。304 表示验证后可复用已有内容，不携带被请求资源的完整表示正文。

#### 常见误区

把 \`no-cache\` 理解为“绝不存储”；为了看到 304 给 URL 乱加参数（这会改变缓存键）；把缓存里的 200 当成刚收到的 200；把 Cache Storage 当作 HTTP 缓存。

#### 卡住时怎么办

没有 304：先看是否存在验证器与条件请求，仍没有就保留三条真实记录。不要为凑结果反复清数据。出现 ServiceWorker 来源，先标“存在干预，需 S5 分析”，不强行归为 HTTP 缓存。

#### 检查理解

1. 直接复用、304 验证、重新下载 200，哪种需要先与服务器验证？
2. 如果三次都是 200，是否能据此宣布浏览器没有缓存功能？

#### 参考答案

1. 304 属于有条件请求的验证结果；直接复用不需要这次验证；重新下载 200 通常携带内容，但也要结合来源确认它是不是缓存中的旧响应。
2. 不能，这只说明所测资源在这些条件下的结果。需要检查策略和实际传输，而不是推翻缓存机制。

#### 完成标志

保留三组实测记录，能正确解释三条缓存路径；把未出现的路径标为“已理解规则、尚无实测证据”。

参考：[MDN HTTP 缓存](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)、[Cache-Control 指令](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)、[304 响应](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304)。

### S5 · 判断 Service Worker 是否接管请求

#### 为什么这样做

Service Worker 可以在页面之外处理 fetch 并提供响应。注册存在、已经激活、当前页面受它控制、某个请求被它响应，是四个不同的问题；仅凭“离线还能看见页面”不能全部回答。

#### 工具与操作

1. 先在实验页打开 Application（应用）→ Service Workers。记录页面来源、是否有注册、scope 范围与状态。不点击 Unregister、Clear storage，也不操作导航站已有的 Worker。
2. 如愿使用控制台，可手动输入下方只读表达式，记录当前文档的控制者脚本地址或“未被控制”；它不注册或删除任何 Worker。若不使用控制台，就依据面板记录，并把无法确认的“当前控制者”标为待确认。

\`\`\`js
navigator.serviceWorker?.controller?.scriptURL ?? "未被控制"
\`\`\`

3. 想做正对照时，从下方 MDN 文档的 Demo 区域打开它提供的在线演示，仅在演示标签操作。先在线完整加载、等待安装/激活，再普通刷新一次，重新查控制者。外部演示访问失败或不受控制时就暂停，不寻找来历不明的替代脚本。
4. 仅当演示页确认受控，去 Application → Cache Storage 查是否有与页面资源 URL 对应的条目；再回 Network 清日志刷新，观察 Size/来源及 Timing 的 ServiceWorker 信息。没有这些证据时不要声称“响应一定来自 Cache Storage”。
5. 可选三组对照：在演示标签保持 Disable cache 开启，先在线刷新；再选 Offline 刷新；最后保持 Offline 并勾选 Bypass for network 再刷新。只记录实测能否加载与来源。完成后立刻取消 Offline、Bypass for network、Disable cache，恢复 No throttling。不需要卸载 Worker 或清空任何站点存储。

#### 观察与预期

首次注册不一定立即控制当前页面。受控演示若已有匹配缓存，可能在 Offline 时仍能响应；Bypass for network 绕过 Worker，配合禁用 HTTP 缓存和 Offline 后通常无法重新取得页面。此结论以该演示缓存策略和请求确实被拦截为前提，不适用于所有网站。

#### 常见误区

把“注册了”当成“当前页面被控制”；看到 Cache Storage 中有文件就认定这次用了它；把离线失败当成 SW 一定没安装；在自己的导航站随手清存储，连笔记和进度也一起清掉。

#### 卡住时怎么办

面板为空并不异常。记录“此环境没有可见注册/控制者”，先完成负对照。演示激活但 controller 为空，可确认 scope 和 URL 后普通刷新；仍为空则记录浏览器限制/状态。别在 HTTP 公网站点或 \`file:\` 页面上强行注册；也不关闭安全策略。

#### 检查理解

1. 有一个 active Worker，就能证明当前页面的所有响应来自它的缓存吗？
2. 为什么需同时看控制者、请求来源与缓存条目？

#### 参考答案

1. 不能，页面可能不在 scope 内或尚未被控制；Worker 也可继续访问网络。
2. 它们分别说明页面控制关系、这次响应经过的路径、可用的缓存内容，不能互相替代；证据不足时应保留“不确定”。

#### 完成标志

记录自己实际测过的页面及控制状态，能区分“注册 / 控制 / 拦截 / 缓存响应”。未完成在线演示的正对照时写清待补事项，不能把参考现象当截图结论。

参考：[MDN 使用 Service Worker 与官方演示入口](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)、[controller 的含义](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controller)、[Chrome SW 调试工具](https://developer.chrome.com/docs/devtools/progressive-web-apps/)。

### S6 · 划出网络请求的边界

#### 为什么这样做

需要网络时，浏览器仍可能复用已有地址信息和连接。Timing 是“这次请求记录了什么”，不是每次都完整重演 DNS、连接和加密协商的教科书图。

#### 工具与操作

1. 本地 \`127.0.0.1\` 实验页不适合观察公网 DNS/TLS。另开公开 \`https://example.com/\`，打开 Network、Doc 筛选、No throttling，勾选 Disable cache 后刷新。
2. 选 document → Timing，逐项抄下实际显示的 Queueing/Stalled、DNS Lookup、Initial connection/SSL、Request sent、Waiting (TTFB)、Content Download 及耗时；不存在的项写“本次未显示”，不要填 0。
3. 再普通刷新一次，比较哪些阶段消失或变短。可在请求表头右键显示 Protocol，记录 h2/h3 等实际值；不要把所有现代请求都画成新的 TCP 连接。
4. 在纸上分三栏标记“浏览器排队/准备”“网络连接与发送/等待”“接收内容”。SSL 常包含在连接阶段，不把重叠的耗时再相加。取消 Disable cache 结束实验。

#### 观察与预期

连接复用、DNS 缓存、代理或协议差异都可能让某些阶段不可见。TTFB 不只是服务器业务处理时间，还包含网络往返等等待；Content Download 也不等于后续页面绘制时间。

#### 常见误区

认为缺少 DNS 就没有访问服务器；以为开隐私窗口能清空操作系统所有 DNS 缓存；把 Waiting 全算作后端慢；把一个 document 的耗时当整页所有资源的总和。

#### 卡住时怎么办

若显示缓存或 ServiceWorker 来源，先记录干预并换一个无需登录的公开页面对照；不必清理全局缓存或刷新系统 DNS。公网不可达时可用本地页学会读 Timing，但在记录中注明“未验证公网连接阶段”。

#### 检查理解

1. 第二次没有 DNS/SSL 阶段，能否说 HTTPS 失效？
2. 文档的 TTFB 高，能否直接断言数据库慢？

#### 参考答案

1. 不能，可能复用了连接或已有解析结果，还应结合协议及上下文判断。
2. 不能，需要继续区分网络、排队、服务端等因素；单个 Timing 阶段不能定位数据库。

#### 完成标志

留下两次 Timing 对照，并解释至少一个未显示阶段；能够指出哪些是观察、哪些只是可能原因。

参考：[Chrome Network Timing 阶段说明](https://developer.chrome.com/docs/devtools/network/reference#timing-explanation)。

### S7 · 从 Document Response 追到 First Pixel

#### 为什么这样做

拿到 HTML 字节还不等于看到页面。浏览器需要解析内容、计算样式与几何位置、绘制并合成；这些工作可能与后续下载交错，不是所有文件下载完才开始。

#### 工具与操作

1. 回到本课实验页，恢复不限速和在线状态。打开 Performance（性能）面板，在录制设置中开启 Screenshots（截图）；只录不含个人信息的实验页。
2. 点击 Record and reload（录制并重新加载，循环箭头图标）。等待自动结束；若版本要求手动停止，页面稳定后点 Stop。不要只录一个已经加载完的静止页面。
3. 在时间线选中加载区间，展开 Main（主线程）或对应的渲染轨道，寻找 Parse HTML、样式计算、Layout、Paint；用顶部搜索或 Ctrl+F 查事件名称，选中事件查看详情。不同版本标签可能不同，没找到就写“未定位”，不要伪造时间。
4. 查看 Timings 里的 FCP（若可见）和截图序列中第一次出现文字的画面，再找 DOMContentLoaded（DCL）标记。把实际顺序、时间与图上位置记下；不能把两张粗粒度截图之间的变化精确到某一毫秒。
5. 切回 Network 看该文档 Response，再看 Elements（元素）的 DOM 树，写出二者的差别。实验页的样式内联、脚本为同源文件；没有独立 CSS 请求不代表没有样式。想看脚本行要把 Doc 筛选切回 All。入门阶段不必阻塞资源或修改站点代码。

#### 观察与预期

FCP 指首次绘制文本、图像等内容，不保证整页完成或按钮都能响应；本标题的 First Pixel 是学习用语，不是与 FCP 完全相同的标准指标。DCL 也不等待所有图片完成，不能当成“已全部加载”。

#### 常见误区

把 Response 当成实时 DOM；把 FCP、DCL、load 和“流畅可交互”画成同一个点；要求每条时间线都按完全相同顺序出现所有事件；拿一次录制的小差值判断优化成功。

#### 卡住时怎么办

时间线空白就用“录制并重新加载”重试；太密就放大加载区段，先找一个 Paint 和一张有文字的截图。未找到某个指标时保留原始观察并提出问题，不拿参考资料的数值补格。结束后关闭录制工具即可，不必导出整份 trace。

#### 检查理解

1. HTML Response 已收到，为什么仍可能没看到内容？
2. 首屏有字但图片还没加载完，是否与 DCL/FCP 的定义冲突？

#### 参考答案

1. 解析、样式、布局、绘制或主线程工作尚未推进到产生可见内容；网络完成不是渲染完成。
2. 不冲突。FCP 只描述首次内容绘制，DCL 描述文档解析及相关延迟脚本完成；它们都不是所有图片已加载或所有交互已准备好的保证。

#### 完成标志

画出一条带实际观察标记的“响应 → 解析/样式 → 布局/绘制 → 可见内容”时间线；能说出至少两件自己尚不能从这份记录证明的事。

参考：[Chrome 性能录制](https://developer.chrome.com/docs/devtools/performance/reference/)、[MDN 浏览器解析与渲染](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)、[DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)、[FCP](https://developer.mozilla.org/en-US/docs/Glossary/First_contentful_paint)。

## Quest 正式完成条件

- S1–S7 均按各自完成标志留下真实记录后，再逐项打卡；阅读和看答案不会替代实验。
- 保存一张“地址栏 → 可见内容”的分支流程图，说明浏览器内部决策、网络和渲染的边界。
- 至少保留一份本人的 Network 或 Performance 文字记录/脱敏截图，并能不用参考答案复述。
- 缓存 304、真实重定向、SW 正对照等未观察到的现象单列待补；不把“未出现”写成“功能不存在”。
- 在下方写自己的结论与证据，再使用正式完成操作；剩余疑问可以进入 \`questions/\`。

## 当前结论

尚未填写。请用自己的话补充：我已能解释什么；哪条实测支持它；哪些还只是猜测。不要把上面的参考答案直接当作个人结论提交。

## 下一步

先打开上方“导航实验页”，按 S1 设置浏览器开发者工具的 Network 面板，完成第一条刷新记录。今天做到能独立找到 Document 行即可，不急着阅读七步所有答案。

## 完成证据

尚未形成。学习后填写日期、浏览器版本、实验 URL、操作、实际观察、证据位置与未验证项。公开提交前检查截图和地址不含个人信息；不要上传敏感 HAR、Cookie、Token 或账户页截图。

## Open Questions

尚未填写。遇到卡点时记录“我停在 S几的第几项、期望看到什么、实际看到什么、已经试过什么”，再按需新增到 \`questions/\`。`},{id:"QUEST-002",kind:"quest",title:"URL 如何准确描述目标资源？",status:"backlog",created:"2026-08-24",tags:["url","browser"],sourcePath:"tech-os/quests/backlog/QUEST-002.md",fields:{route_id:"ROUTE-001",order:2,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索 URL 的 scheme、authority、path、query、fragment 与规范化行为。

## 开始前

本课约 20 分钟。先会打开开发者工具即可，不需要安装 Node.js，也不需要真实账号或 Token。使用本课的“打开导航实验页”按钮；不要在导航 CMS 的 \`#/tech-os\` 路由上修改片段，否则会切换工作台页面。

## 学习思路

先把地址拆成字段，再只改变一个字段看浏览器行为。区分“地址字符串变了”“换了一份文档”“真的向服务器发了请求”，这三件事并不等价。浏览器 URL API 以 [WHATWG URL 标准](https://url.spec.whatwg.org/#api)为准。

## 工具准备

- 桌面 Chrome 或 Edge，按 F12 打开 Console 和 Network。手机可以先看实验页自显字段，网络证据留到电脑补做。
- 实验页提供 query 链接、\`#section-two\` 锚点和 GET 表单。若按钮尚不可用，可以先做 S1 的纯字符串解析；不要把未做的网络观察记为已完成。
- 准备两条记录：原始地址、改动后地址；不填写密码等敏感内容。

## 下一步

打开本课导航实验页，完成 S1 的 URL 字段解析，先记下协议、主机、路径、查询和片段各是什么。

## 学习步骤

### S1 · 拆开一个地址并预测相对链接

#### 为什么这样做

地址不是一串只能整体记住的文字。协议和主机帮助确定访问目标，路径和查询参数表达资源请求，片段通常用于客户端定位。

#### 工具与操作

在实验页 Console 执行下面的只读代码。花括号让重复执行不发生变量重名；\`new URL\` 只解析字符串，不访问这个站点。

\`\`\`javascript
{
  const u = new URL('https://EXAMPLE.com:443/docs/start?q=hello%20world#intro');
  console.table({
    href: u.href, protocol: u.protocol, hostname: u.hostname,
    port: u.port, pathname: u.pathname, search: u.search,
    hash: u.hash, q: u.searchParams.get('q')
  });
  console.log(new URL('../next?x=1', u).href);
}
\`\`\`

再执行 \`new URL(location.href).pathname\`，和实验页显示的当前路径对照。

#### 观察与预期

主机名变为 \`example.com\`，HTTPS 默认端口 \`443\` 被规范化为空字符串；\`q\` 的值是 \`hello world\`，而 \`search\` 保留编码形式。相对地址解析为 \`https://example.com/next?x=1\`。这些是解析结果，不是服务器返回的结果。

#### 常见误区

\`hostname\` 不含端口，\`host\` 可以含端口；空 \`port\` 不等于没有端口。\`%20\` 是编码，不是加密。不能仅凭字符串长得像网址就断定它可信。

#### 卡住时怎么办

若出现语法错误，检查是否复制了代码围栏或中文引号。若 Console 阻止粘贴，先读懂代码并逐行手输，不要为未知代码关闭安全保护。没有开发者工具时先手工标出五部分。

#### 检查理解

为什么 \`../next\` 不接在 \`/docs/start/\` 后面？\`443\` 被省略后，访问协议是否变了？

#### 参考答案

基准路径 \`/docs/start\` 最后一段作为当前资源名，先取所在目录 \`/docs/\`，再由 \`..\` 回到根目录。协议仍是 HTTPS，省略的是它的默认端口表示。

#### 完成标志

保留字段输出，并在运行前独立预测另一个相对链接 \`./next\` 的结果；能解释实际结果与预测是否一致。

### S2 · 对比片段、查询参数和表单提交

#### 为什么这样做

片段在解引用前被分离，不属于发给服务器的 HTTP 请求目标；但页面脚本仍能读取它，它不是保密容器。参见 [RFC 3986 第 3.5 节](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.5)。

#### 工具与操作

1. 在实验页打开 Network，确认录制已开启、没有遗留过滤条件，选 Doc 并清空列表。
2. 点击指向 \`#section-two\` 的页内链接，记录地址、滚动位置和新增文档请求数。
3. 点击带 \`?topic=network&sample=1\` 的链接，再点新增文档行的 Headers，查看 Request URL。
4. 在 GET 表单输入 \`hello world\` 并提交，比较地址中的 \`keyword\` 与页面解码后的参数。只使用测试文字。

面板具体操作可对照 [Chrome 官方 Network 教程](https://developer.chrome.com/docs/devtools/network/)。

#### 观察与预期

纯锚点跳转通常只更新片段和滚动，不重新加载主文档。查询参数/表单导航会改变请求目标；文档可能来自网络、缓存或服务工作线程，不能保证每次都有真实网络传输。请求目标不含 \`#section-two\`；表单空格可能显示为 \`+\`，解码后仍是空格。

#### 常见误区

不要把图片、favicon 请求当成主文档请求，也不要用地址栏里包含 \`#\` 来证明服务器收到了它。只看到 200 不能证明走了网络，更不必追求出现 302 或 304。

#### 卡住时怎么办

若列表没有记录，先刷新一次验证录制和 Doc 过滤器；检查是否选错标签页。若结果受缓存影响，记录 Size/来源后再做一次对比，不要清空整个浏览器数据。实验页不可用时先保留问题，网络步骤暂不打卡。

#### 检查理解

把查询里的 \`keyword=hello\` 改成片段 \`#keyword=hello\`，普通服务器端查询参数解析还能读到它吗？

#### 参考答案

不能直接读到片段。客户端脚本可以主动把片段放进另一次请求，所以“默认不发送”不等于“绝不可能泄露”。

#### 完成标志

记录锚点与查询导航各一次的真实观察，明确哪些是网络证据、哪些只是地址变化；不要求状态码固定。

## 完成证据

能解释 URL 各部分由谁处理，以及 fragment 为什么不会发送给服务器。

以上是待完成标准，不代表已经验证。后续再比较 Node.js URL、服务器日志与特殊协议；本课不覆盖全部 URL 安全和规范化边界。`},{id:"QUEST-003",kind:"quest",title:"DNS 为什么能够找到服务器？",status:"backlog",created:"2026-08-24",tags:["dns","internet"],sourcePath:"tech-os/quests/backlog/QUEST-003.md",fields:{route_id:"ROUTE-001",order:3,question_ids:["QUESTION-001"],knowledge_ids:["KNOWLEDGE-001"],lab_ids:["LAB-001"],project_ids:[]},body:`## 当前理解

DNS 把域名解析为后续网络连接所需的记录，但解析结果来自多层缓存和递归/权威查询链。

## 开始前

本课约 25 分钟，需要可联网的电脑；只做少量公开域名查询，不更改系统 DNS、不清空缓存。先知道域名和 IP 不是一回事。查询结果受网络、时间和解析器策略影响，IP 地址不需要与他人的截图一致。

## 学习思路

每次查询先问三个问题：我问了谁、问了哪种记录、回答来自权威还是缓存/递归服务。递归服务替客户端寻找答案，权威服务负责自己管理的区域；一次普通查询输出不是完整查询链的录像。[RFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html)解释这两类职责。

## 工具准备

- Windows 打开 PowerShell，使用系统 \`nslookup\`；macOS/Linux 可用 \`nslookup\`，已装 BIND 工具时也可用 \`dig\`。
- 命令找不到时先查系统的官方软件源，不运行来路不明的一键安装脚本。没有命令行权限时先阅读本课并记录待做项。
- 示例使用 \`example.com\`，只记实际输出。关联的 LAB-001 是后续完整记录位置，本文不会把它自动标记完成。

## 下一步

执行一次 \`nslookup -type=A example.com\`，先在输出中分别标出解析服务器和目标答案，再继续 S1。

## 学习步骤

### S1 · 区分解析服务器和解析答案

#### 为什么这样做

初学时最容易把输出顶部 DNS 服务器的地址误认为网站地址。先读懂一次查询，再讨论多层缓存。

#### 工具与操作

在同一个终端逐条执行，记录 Server/Address 和回答区的 Name/Addresses；命令来自 [Microsoft nslookup 文档](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup)。

\`\`\`text
nslookup -type=A example.com
nslookup -type=AAAA example.com
nslookup -type=NS example.com
\`\`\`

已有 \`dig\` 时，等价起点是 \`dig example.com A\`、\`dig example.com AAAA\` 和 \`dig example.com NS\`。

#### 观察与预期

A 查询请求 IPv4 记录，AAAA 请求 IPv6 记录，NS 请求负责该域的名称服务器。可能返回多个地址、CNAME 或无该类型记录；没有 AAAA 不等于整个域名不存在。顶部服务器是本次接收查询的解析器。

#### 常见误区

“Non-authoritative answer”不是“不可信”或“解析失败”；它表示当前回答不是以该区域权威身份给出的。DNS 返回地址也不证明对应网站的 TCP/TLS/HTTP 都可用。

#### 卡住时怎么办

超时先检查网络及错误中的服务器地址，不要立刻换全局 DNS。公司/校园网络可能限制外部 DNS；保留失败输出并询问网络管理者。若 Server 显示 Unknown 但回答区正常，可能只是该解析器地址没有反向名称。

#### 检查理解

输出中两个 Address 分别可能指谁？A 查询成功能证明网页正常打开吗？

#### 参考答案

顶部可能是 DNS 解析服务器，回答区可能是目标记录地址；应结合字段位置判断。DNS 成功只是后续连接的前提之一，不代表网站端口、证书或响应一定正常。

#### 完成标志

为三个查询各写一句“向谁询问什么、实际得到什么”，能指出答案区而不是只抄一个 IP。

### S2 · 观察 TTL，再区分递归与权威查询

#### 为什么这样做

缓存减少重复工作，但仅凭查询快慢不能证明命中了哪一层。需要记录 TTL 和服务器身份，并明确工具没有观察到什么。

#### 工具与操作

先执行两次下面的命令，中间等十余秒，找到回答中的 TTL（生存时间）；若输出太长，用终端查找 \`ttl\`。

\`\`\`text
nslookup -debug -type=A example.com
\`\`\`

再从 S1 的 NS 回答中选一个完整名称，手工替换下面的 \`AUTH_SERVER\` 后执行；不要原样输入占位词。第二个位置指定本次直接询问的 DNS 服务器，不修改系统设置。

\`\`\`text
nslookup -debug -type=A example.com AUTH_SERVER
\`\`\`

已有 \`dig\` 且网络允许直接 DNS 查询时，可额外运行 \`dig +trace example.com A\`。它是工具自己从根开始做迭代查询，不是旁观系统递归服务器内部；参见 [BIND dig 手册](https://bind9.readthedocs.io/en/v9.20.11/manpages.html#dig-dns-lookup-utility)。

#### 观察与预期

缓存回答 TTL 可能下降，也可能因负载均衡、刷新或不同缓存节点而不降。直接查询成功时可检查是否有 authoritative/AA 标志；\`+trace\` 通常显示多级转介，但受防火墙限制时可能中止。

#### 常见误区

\`nslookup\`/\`dig\` 的查询不能直接代表浏览器的缓存或 DoH 行为。第二次更快不等于“浏览器缓存命中”；TTL 没下降也不能单独证明没有缓存。

#### 卡住时怎么办

权威查询或 trace 超时而默认查询成功时，记录“直连路径受限，递归查询可用”；先停止深入，不关闭防火墙。TTL 看不懂时先保留两份输出并圈出 Answer 区，别把 NS 附加记录的 TTL 混进比较。

#### 检查理解

为什么一次默认查询能拿到答案，却不能说“我的电脑亲自问遍了根、顶级域和权威服务器”？

#### 参考答案

它通常把请求交给配置的解析器；解析器可能已缓存答案，也可能继续转发或递归查询。客户端输出没有展示其内部全过程。

#### 完成标志

保留两次 TTL 记录与一次权威查询结果或明确失败原因，画出“客户端 → 配置解析器 → 可能的权威查询”并标注哪些箭头实际观察到。

## 完成证据

能解释一次缓存未命中的 DNS 查询，并用命令验证关键记录。

这是待验证的标准。将实际记录补入 LAB-001 后再决定是否完成；浏览器/操作系统缓存、DoH、DNSSEC 和缓存投毒防护属于后续深入，不由本课两次查询证明。`},{id:"QUEST-004",kind:"quest",title:"IP 与 TCP 如何把字节可靠送到目标进程？",status:"backlog",created:"2026-08-24",tags:["ip","tcp","network"],sourcePath:"tech-os/quests/backlog/QUEST-004.md",fields:{route_id:"ROUTE-001",order:4,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索路由、端口、连接建立、序号、确认、重传与流量控制之间的职责边界。

## 开始前

本课约 30 分钟，只观察自己电脑的回环流量，不抓取他人或登录账号的通信。先区分 IP 地址与端口即可。本机回环实验省去公网路由干扰，因此不能用它证明互联网路由、丢包重传或拥塞控制已经学会。

## 学习思路

先让两个本机程序完成一次通信，再把这段通信在抓包中找出来。IP 负责网络层寻址和投递，TCP 提供连接上的有序字节流；TCP 不替应用决定“一条消息”有多长。协议边界可查 [TCP 标准 RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html)。

## 工具准备

- Python 3：Windows 用 \`py --version\` 检查；macOS/Linux 用 \`python3 --version\`。已有可用 \`python\` 命令时可替换解释器名。
- curl：Windows 下面写 \`curl.exe\`，避开旧 PowerShell 的同名别名；macOS/Linux 改为 \`curl\`。
- Wireshark；Windows 回环捕获需要 Npcap。无安装/抓包权限时先做 S1，S2 保留为待做，不需要关闭防火墙。回环适配器说明见 [Npcap 官方指南](https://npcap.com/guide/)。
- 用文件管理器新建一个空实验目录，并在该目录打开两个终端。不要在含密码、项目密钥或个人文件的目录启动文件服务器。

## 下一步

确认 Python 可用，在空实验目录按 S1 启动仅绑定 \`127.0.0.1\` 的服务，先完成一次本机 curl 请求。

## 学习步骤

### S1 · 建立一个只在本机工作的连接

#### 为什么这样做

连接失败和 HTTP 错误是不同层的问题。我们先制造一个可控服务，知道服务器应监听哪个地址和端口。

#### 工具与操作

终端 A 启动文件服务并保持打开；下面是 Windows 命令，macOS/Linux 将 \`py\` 改为 \`python3\`。[Python 官方文档](https://docs.python.org/3/library/http.server.html#command-line-interface)说明端口和绑定地址参数。

\`\`\`text
py -m http.server 8765 --bind 127.0.0.1
\`\`\`

终端 B 执行一次请求。只对本机地址绕过代理；\`--max-time\` 避免一直等待。

\`\`\`text
curl.exe --noproxy 127.0.0.1 --http1.1 --max-time 5 -v -H "Connection: close" http://127.0.0.1:8765/
\`\`\`

#### 观察与预期

curl 显示连接到 \`127.0.0.1:8765\`，随后显示请求、响应和目录页正文；终端 A 出现访问日志。Python 默认响应可能是 HTTP/1.0，即使客户端请求写着 HTTP/1.1，也不代表 TCP 失败。

#### 常见误区

\`127.0.0.1\` 指当前运行程序所在主机/环境，不是另一台电脑。\`Connection: close\` 是 HTTP 语义，不是“三次握手”的命令。成功日志不等于已经抓到了握手包。

#### 卡住时怎么办

Connection refused：先看终端 A 是否仍在运行及端口是否一致。Address already in use：不要结束不认识的进程，换成 8769 并同步修改本课命令和过滤器。若提示 Python 不存在，按系统官方安装方式准备后再继续。

#### 检查理解

客户端的源端口必须也是 8765 吗？如果收到 HTTP 404，是否说明 TCP 根本没建立？

#### 参考答案

客户端通常由系统选择临时源端口，服务器使用监听端口 8765。收到正常 HTTP 404 响应说明请求已到达某个 HTTP 服务，资源不存在不等于连接未建立。

#### 完成标志

保留一次客户端输出和对应服务器日志，标明目标 IP、目标端口及应用层结果。

### S2 · 在自己的抓包里找到建立、传输与关闭

#### 为什么这样做

把抽象的连接变成一条可以追踪的 TCP 流，观察序号/确认号与正文之间的关系，而不是背固定包数。

#### 工具与操作

1. Windows 在 Wireshark 选择 “Adapter for loopback capture / NPF_Loopback”；Linux 选 \`lo\`，macOS 选 \`lo0\`。
2. 先开始捕获，再在顶部的显示过滤器填写 \`tcp.port == 8765\`，随后重复 S1 的 curl 请求一次。
3. 停止捕获。依次找 SYN、SYN+ACK、ACK、带数据的报文以及 FIN/ACK；展开 TCP 字段看端口、Seq 和 Ack。
4. 右键该连接任一包，选择 Follow → TCP Stream，核对请求和响应；最后保存只用于本课的捕获文件。完成后在终端 A 按 Ctrl+C 停止服务。

显示过滤器与捕获过滤器不是同一种语法；参见 [Wireshark 过滤器指南](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)及 [Follow Stream 官方说明](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html)。

#### 观察与预期

新连接通常能找到三次握手。Wireshark 常显示相对序号；正文按字节推进序号，SYN/FIN 也占序号空间。关闭过程可能合并 ACK，不必正好四个独立包。回环很可靠，通常不会出现重传；没有重传不等于 TCP 没有重传机制。

#### 常见误区

一次 \`write\`、一个 TCP 包和一次应用读取不是一一对应。带数据的包也可带 ACK。HTTP/3 走 QUIC，不能用它来要求出现同样的 TCP 握手；本实验特意使用本机明文 HTTP。

#### 卡住时怎么办

零包先确认选的是回环接口、捕获早于请求、端口未改错；不要转而抓取全部公共 Wi-Fi 流量。没有捕获权限时记录限制，先复查 S1。看不到正文时确认选中了这一条流，而不是别的端口或 TLS 流量。

#### 检查理解

为什么接收端不能把“一个 TCP 包”当成“一个完整 HTTP 响应”？

#### 参考答案

TCP 提供字节流，分段、重组与读取缓冲会改变每次看到的边界。HTTP 必须依据自身格式、长度或连接关闭等规则判断消息边界。

#### 完成标志

在自己的捕获中标出连接四元组、建立阶段、正文和关闭阶段，解释一处 Seq/Ack。没捕获到的阶段明确写缺失，不用示意图冒充实测。

## 完成证据

能根据抓包解释连接建立、数据传输和关闭。

这是完成标准，尚需实际记录支撑。公网路由、主动制造丢包、拥塞与流量控制另开实验，不在本课改网卡、路由表或防火墙。`},{id:"QUEST-005",kind:"quest",title:"TLS 如何建立可信的加密连接？",status:"backlog",created:"2026-08-24",tags:["tls","pki","security"],sourcePath:"tech-os/quests/backlog/QUEST-005.md",fields:{route_id:"ROUTE-001",order:5,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索证书验证、密钥协商、会话密钥与握手消息的关系。

## 开始前

本课约 25 分钟。先知道 HTTPS 在 HTTP 之外增加 TLS 保护；准备一个能够正常访问的公开 HTTPS 站点，示例为 \`example.com\`。不输入账号密码，不导入陌生根证书，不使用 \`-k\`/关闭验证来“解决”报错。

## 学习思路

分开看三件事：证书与域名匹配、证书链是否被当前客户端信任、双方协商了什么连接参数。加密连接不保证网页内容可靠，也不保证域名/IP 等全部元数据不可见。TLS 1.3 的完整握手涉及身份认证和密钥派生，参见 [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html)。

## 工具准备

- 桌面 Chrome/Edge 的安全与证书查看界面，S1 不需要额外安装。
- S2 使用发行版仍支持的 OpenSSL 3.x，先执行 \`openssl version\`。命令不存在时使用已有 WSL/Linux 环境或可信系统软件源；不要下载陌生“证书修复器”。
- 没有 OpenSSL 时可完成 S1，并把命令行验证列为待做；浏览器截图不能伪装成 OpenSSL 验证记录。

## 下一步

打开示例 HTTPS 站点，在浏览器证书面板记录匹配的域名和有效期；遇到证书警告先停止并记录原因。

## 学习步骤

### S1 · 找到浏览器信任了哪个身份

#### 为什么这样做

先让“证书”从抽象名词变成可读字段：它声明了什么域名、由谁签发、何时有效，以及客户端显示的验证结果。

#### 工具与操作

1. 打开 \`https://example.com/\`，确认没有越过任何证书警告。
2. 在开发者工具 More tools 中打开 Security / Privacy and security（不同版本名称略有差异），刷新页面后选择主站点。
3. 查看连接协议/密码套件，再点击 View certificate，记录 Subject Alternative Name 中匹配的域名、签发者和有效期。
4. 查看证书路径/链，区分站点叶子证书、中间证书与信任根。步骤见 [Chrome 官方安全面板文档](https://developer.chrome.com/docs/devtools/security)。

#### 观察与预期

能看到客户端报告的 TLS 版本、连接参数和证书信息；字段值会随站点更新而变化，不要求某个固定签发机构或算法名称。浏览器认可的是一组验证条件，不只是“这个证书有个名字”。

#### 常见误区

有 HTTPS 不等于网站诚实；证书公钥也不是浏览器直接拿来加密全部网页的“同一把会话密钥”。企业代理可能使用管理员配置的信任根，不要忽略它与公网证书的区别。

#### 卡住时怎么办

面板空白先在打开面板后刷新；找不到入口时从地址栏站点信息里的“连接安全/证书”进入。出现时间或证书警告，先核对系统时间与网络环境，记录原因并停止，不点击继续访问。

#### 检查理解

证书没过期，但只适用于另一个域名，这个连接应该直接被信任吗？

#### 参考答案

不应该。有效期只是条件之一，还需要域名匹配、合适的用途和可信验证链等；单个条件通过不能替代完整验证。

#### 完成标志

用自己的截图或文字列出站点域名、匹配依据、有效期、验证链和连接参数，说明没有观察到的字段。

### S2 · 让命令行严格检查域名，再做一次反例

#### 为什么这样做

看到“握手连接上了”不等于严格验证通过。OpenSSL 的调试客户端必须明确设置验证要求，才能用失败反例检查理解。

#### 工具与操作

先在终端运行正常域名验证；显示摘要后若仍等输入，按 Ctrl+C 结束，等待不代表握手失败。

\`\`\`text
openssl s_client -connect example.com:443 -servername example.com -verify_hostname example.com -verify_return_error -brief
\`\`\`

再运行下面的反例：仍连接同一站点、发送同一 SNI，但故意要求证书匹配另一个域名。

\`\`\`text
openssl s_client -connect example.com:443 -servername example.com -verify_hostname wrong.invalid -verify_return_error -brief
\`\`\`

\`-servername\` 指定 SNI；\`-verify_hostname\` 指定验证身份；\`-verify_return_error\` 在证书验证出错时终止。它们的职责不同，见 [OpenSSL s_client 官方手册](https://docs.openssl.org/3.0/man1/openssl-s_client/)。

#### 观察与预期

网络和本机 CA 配置正常时，第一条应报告验证成功及协议/套件；第二条应出现 hostname mismatch 等验证错误并失败。若第一条已因网络或未知 CA 失败，不能把第二条失败归因于域名反例。

#### 常见误区

OpenSSL 与浏览器可能使用不同信任库；浏览器成功、OpenSSL 报 unknown issuer，并不自动证明站点证书有问题。SNI 告诉服务器要哪个站点，不自动完成对域名的验证。

#### 卡住时怎么办

连接超时先确认站点可达、代理/企业网络限制。unknown issuer 时记录 OpenSSL 版本和信任库来源，按发行版官方文档维护 CA，或先回 S1；不要加跳过验证选项或随意信任下载的证书。输出含私有域名时先脱敏再分享。

#### 检查理解

在常见的证书认证 TLS 1.3 完整握手中，证书身份、密钥协商和后续数据加密分别承担什么职责？

#### 参考答案

证书及签名用于认证身份，常见的临时密钥交换配合密钥派生得到流量密钥，后续用对称认证加密保护数据。会话恢复/PSK 有不同路径；本次摘要不能直接展示密钥计算全过程。

#### 完成标志

保存成功与域名不匹配两份实际输出，解释为何反例失败；若正常验证前提未满足，明确写“待排查”，不勾成完成。

## 完成证据

能解释浏览器为何信任某个证书，以及握手如何得到对称密钥。

本课提供观察入口，不代表已完成验证。下一步再学习 TLS 1.3 握手消息、证书撤销、恢复会话和密钥派生；不在公开仓库保存私钥、会话密钥日志或账号流量。`},{id:"QUEST-006",kind:"quest",title:"HTTP 与 Server 如何完成一次请求响应？",status:"backlog",created:"2026-08-24",tags:["http","server"],sourcePath:"tech-os/quests/backlog/QUEST-006.md",fields:{route_id:"ROUTE-001",order:6,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:["PROJECT-001"]},body:`## 当前理解

待探索请求方法、状态码、头部、正文、连接复用与服务器处理循环。

## 开始前

本课约 30 分钟。先知道服务端必须运行着才能接收请求；不需要 Express、数据库或云服务器。下面只监听 \`127.0.0.1\`，不用密码和真实个人数据。示例是教学服务，不作为生产部署代码。

## 学习思路

先自己写出“请求进来 → 检查方法和路径 → 选择状态码/正文 → 结束响应”，再从客户端观察这些决定。TCP 连上只说明运输通道可用，HTTP 才描述应用怎样处理请求。[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)是方法和状态码的一手定义。

## 工具准备

- Node.js，终端运行 \`node --version\` 确认可用；使用仍受支持的正式版。脚本只用内置 \`node:http\`，无需 \`npm install\`。
- 一个文本编辑器、两个终端。新建独立实验文件夹，文件命名为 \`server.cjs\`，不要保存成 \`server.cjs.txt\`。
- Windows 用 \`curl.exe\`；macOS/Linux 把下方命令的 \`curl.exe\` 改成 \`curl\`。只有浏览器时可以测试 GET，POST 反例留到有 curl 的环境补做。

## 下一步

把 S1 示例保存为独立实验目录中的 \`server.cjs\`，运行 \`node server.cjs\`，先访问一次 \`/hello?name=Baize\`。

## 学习步骤

### S1 · 运行能解释每个分支的最小服务

#### 为什么这样做

先把服务端缩小到一个文件，观察状态码是由代码选择的，而不是浏览器随机生成的。用 \`.cjs\` 明确采用 CommonJS，避免其他项目配置干扰。

#### 工具与操作

用编辑器把下方保存到实验文件夹的 \`server.cjs\`。在同一文件夹的终端 A 运行 \`node server.cjs\`，保持终端打开。[Node HTTP 官方文档](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener)说明 \`createServer\`、\`writeHead\` 与 \`end\` 的用法。

\`\`\`javascript
const http = require('node:http');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787');
  console.log(req.method, req.url);
  let status = 200;
  let body;
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (req.method !== 'GET') {
    status = 405;
    headers.Allow = 'GET';
    body = { error: 'Only GET is supported' };
  } else if (url.pathname !== '/hello') {
    status = 404;
    body = { error: 'Not found' };
  } else {
    body = { message: 'Hello ' + (url.searchParams.get('name') || 'visitor') };
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
});
server.on('error', error => console.error(error.message));
server.listen(8787, '127.0.0.1', () => console.log('Open http://127.0.0.1:8787/hello'));
\`\`\`

浏览器打开 \`http://127.0.0.1:8787/hello?name=Baize\`；再打开 \`/missing\`，不要只改片段 \`#missing\`。

#### 观察与预期

第一个地址返回含 \`Hello Baize\` 的 JSON，第二个返回 \`Not found\`，Network 中状态为 404。浏览器可能另请求 favicon，终端多出一行日志并不表示你的代码循环失控。

#### 常见误区

JSON 正文中的文字不是 HTTP 状态码，二者应分别检查；\`/hello\` 是应用路径，不一定对应硬盘上的同名文件。程序运行后没有回到命令提示符，是因为服务正在等待请求。

#### 卡住时怎么办

找不到模块先确认终端目录和扩展名；端口占用时选择其他空闲端口，同时改代码与访问地址。浏览器拒绝连接先看终端启动错误，别先改状态码。打不开时确认使用 \`http\` 而不是 \`https\`。

#### 检查理解

为什么没有 \`hello\` 文件却能访问 \`/hello\`？\`res.end\` 在这里完成什么？

#### 参考答案

路径交给我们写的回调分支处理；回调动态产生 JSON。\`res.end\` 表示这次响应正文写完，不是结束整个服务器进程。

#### 完成标志

保留成功和不存在路径两次的状态/正文，能按代码指明各自进入哪个分支。

### S2 · 用三种请求核对方法、头部和正文

#### 为什么这样做

让相同连接目标对应不同应用结果，练习区分“连接错误”“HTTP 错误”和“正文内容”。

#### 工具与操作

保持终端 A 运行，在终端 B 逐条执行。\`-i\` 显示响应头，\`-v\` 额外显示请求/连接信息，\`-X POST\` 改方法；本例不提交任何真实数据。参数定义见 [curl 官方手册](https://curl.se/docs/manpage.html)。

\`\`\`text
curl.exe --noproxy 127.0.0.1 --max-time 5 -v "http://127.0.0.1:8787/hello?name=Baize"
curl.exe --noproxy 127.0.0.1 --max-time 5 -i http://127.0.0.1:8787/missing
curl.exe --noproxy 127.0.0.1 --max-time 5 -i -X POST http://127.0.0.1:8787/hello
\`\`\`

把方法、路径、状态码、Content-Type、正文各抄一项。最后在终端 A 按 Ctrl+C 关闭服务，再重复一次 GET 作连接失败对照。

#### 观察与预期

服务运行时依次应为 200、404、405；405 应包含 \`Allow: GET\`。停服后若没有其他程序占用该端口，应连接失败，不会得到本服务的 HTTP 404。头部可能包含运行时自动补充的 Date、连接或分块信息，不要求顺序固定。

#### 常见误区

curl 默认不把所有 HTTP 4xx 当作命令执行失败；不能只用退出码判断业务成功。\`-I\` 是 HEAD 请求，不是“把 GET 的正文藏起来”，本教学服务会拒绝它。不要把 \`-v\` 输出的 \`>\`/\`<\` 符号误当成线上字节。

#### 卡住时怎么办

PowerShell 提示参数不存在时检查是否误用了 \`curl\` 别名。状态不是预期时核对终端日志、请求路径和端口；修改了代码要先 Ctrl+C 再重启。若停服后仍有响应，先确认请求确实指向这个回环端口和当前进程。

#### 检查理解

404 与 405 各说明什么？客户端收到 404 时，HTTP 服务是否一定没有运行？

#### 参考答案

本例 404 表示该路径未提供资源，405 表示服务不接受这个方法。能收到此服务的 404 本身说明它处理了请求；它与完全无法建立连接不同。

#### 完成标志

形成三行请求/响应对照和一条停服结果，能按日志对上请求；再把真正写出的代码与观察作为 PROJECT-001 的候选证据。

## 完成证据

能够实现一个最小 HTTP Server，并解释真实请求和响应字节。

此处列的是标准，不宣称 PROJECT-001 已完成。连接复用、请求体解析、并发、HTTP/2/3 与生产安全是后续深入；本课日志和 curl 文本不是完整抓包。`},{id:"QUEST-007",kind:"quest",title:"Linux 进程与内存如何承载服务器？",status:"backlog",created:"2026-08-24",tags:["linux","process","memory"],sourcePath:"tech-os/quests/backlog/QUEST-007.md",fields:{route_id:"ROUTE-001",order:7,question_ids:[],knowledge_ids:[],lab_ids:[],project_ids:["PROJECT-001"]},body:`## 当前理解

待探索进程、文件描述符、socket、虚拟内存和系统调用如何共同承载服务。

## 开始前

本课约 30 分钟，需要 Linux 环境和 Python 3。Windows 可使用已经安装的 WSL Ubuntu；没有 WSL 时先阅读 [Microsoft 官方安装说明](https://learn.microsoft.com/zh-cn/windows/wsl/install)，安装可能需要管理员权限和重启，不是本课自动执行的操作。macOS 和 Git Bash 不是 Linux，不能用它们的结果冒充 \`/proc\` 实验。

## 学习思路

先把“代码文件”与“运行中的进程”分开，再沿着“进程 PID → 监听 socket → 文件描述符 → 内存映射”找证据。只查看自己创建的服务，不修改 \`/proc\`、系统参数或别人的进程。

## 工具准备

- 以下命令全部在 Linux/WSL 的 Bash 中运行，不是在 Windows PowerShell 中。
- 检查 \`python3 --version\`、\`ps --version\`、\`ss --version\`。\`ps\` 通常来自 procps，\`ss\` 来自 iproute2；缺失时按发行版官方软件源安装，不能因为缺命令就关闭安全限制。
- 准备一个空实验目录及两个 Linux 终端。浏览器或 curl 可作为客户端；若使用 WSL，优先让服务端和 curl 都在同一 Linux 环境，减少跨环境网络差异。

## 下一步

在 Linux/WSL Bash 中按 S1 启动本机服务，再用 \`ps\` 找到与启动参数一致的服务 PID。

## 学习步骤

### S1 · 从监听端口找到自己的服务进程

#### 为什么这样做

磁盘文件不会自己接收请求，运行中的进程要请求内核创建并监听 socket。把端口和 PID 对上，才能知道正在检查哪个程序。

#### 工具与操作

在空实验目录的终端 A 运行只绑定回环地址的服务，并保持打开。

\`\`\`bash
python3 -m http.server 8766 --bind 127.0.0.1
\`\`\`

终端 B 执行下面两条；在 \`ps\` 输出中找完整参数与上面一致的那一行，记下 PID。\`ss\` 选项分别表示监听、TCP、数字地址、进程信息，详见 [ss 手册](https://man7.org/linux/man-pages/man8/ss.8.html)和 [ps 手册](https://man7.org/linux/man-pages/man1/ps.1.html)。

\`\`\`bash
ps -eo pid,ppid,comm,args
ss -ltnp 'sport = :8766'
\`\`\`

再执行 \`curl --noproxy 127.0.0.1 --max-time 5 http://127.0.0.1:8766/\`，核对终端 A 的日志。只记录自己的服务行，不把其他进程参数公开。

#### 观察与预期

\`ss\` 应显示 \`127.0.0.1:8766\` 处于 LISTEN，并在权限允许时显示 python3 的 PID/fd。\`ps\` 显示进程及父进程；服务空闲时可能是睡眠状态，这不表示它挂掉了。

#### 常见误区

PID 是运行实例编号，不是端口号；再次启动可能得到新 PID。一个进程可以有多个 socket，一个监听 socket 也不是每个请求都重新创建一份。

#### 卡住时怎么办

LISTEN 为空先看终端 A 是否报端口占用、是否在相同 WSL 发行版/容器里执行。看得到端口却看不到 PID，可能是权限限制；先确认是自己的进程，不盲目加 sudo。没有 \`ss\` 时先完成 \`ps\`，下一步的 fd 可补充线索，但不要声称已经验证监听状态。

#### 检查理解

为什么服务没收到请求时仍能出现在进程列表？同一个脚本重启后 PID 必须不变吗？

#### 参考答案

进程已经启动并等待内核通知就绪事件，暂时不使用 CPU 不等于不存在。PID 由系统分配，重启后可能变化，也可能在更晚被重用，因此要核对当前命令。

#### 完成标志

记录自己服务的命令、PID、父 PID、监听地址/端口，并用一次请求日志确认查到的确实是这个服务。

### S2 · 查看文件描述符与内存，再观察进程结束

#### 为什么这样做

把“进程占用资源”具体化：文件描述符是进程访问内核对象的编号，虚拟地址空间与实际驻留内存不是同一个数。

#### 工具与操作

把下面第一行的 \`12345\` 手工替换成 S1 刚确认的 PID。只读这些文件，不向其中写入内容。Linux 内核的 [proc 文件系统文档](https://docs.kernel.org/filesystems/proc.html)说明 status、maps 和 fd。

\`\`\`bash
server_pid=12345
ps -p "$server_pid" -o pid,ppid,stat,rss,vsz,args
ls -l "/proc/$server_pid/fd"
grep -E '^(Name|Pid|VmSize|VmRSS|Threads):' "/proc/$server_pid/status"
head -n 8 "/proc/$server_pid/maps"
\`\`\`

记录一个终端描述符和一个 \`socket:[...]\`，比较 VmSize 与 VmRSS。然后在终端 A 按 Ctrl+C，仅停止自己刚启动的服务；回终端 B 重新运行 \`ps -p "$server_pid" -o pid,args\` 和 S1 的 \`ss\` 查询。

#### 观察与预期

通常可见 0/1/2 指向终端，另有 socket 描述符；编号不固定。VmSize 表达虚拟空间，VmRSS 表达驻留内存的近似统计，不要求相等或固定大小。服务退出后自己的监听应消失，原 \`/proc/PID\` 通常不再存在；PID 被重用时必须重新核对命令。

#### 常见误区

maps 中的地址不是直接可拿来测量的物理内存地址；虚拟空间大不等于实际占用了同样多的 RAM。文件描述符不只代表普通磁盘文件，socket 也通过它访问。

#### 卡住时怎么办

No such file 先确认服务没退出、PID 复制正确。Permission denied 时检查用户/容器限制，保留限制说明，不改系统 ptrace 或 \`/proc\` 挂载策略。没有 socket 行时确认查的是服务 PID 而非启动它的 shell。

#### 检查理解

为什么 VmSize 大于 VmRSS 并不能直接判定内存泄漏？关闭监听程序后，为什么还可能看到与它通信过的 TCP 状态？

#### 参考答案

虚拟地址包含映射、预留等，不都驻留 RAM；泄漏需要结合时间趋势与使用情境判断。连接关闭后的某些 TCP 状态由内核维护，不等同于原服务仍在监听。

#### 完成标志

保留 PID、一个 socket fd、两类内存指标与停服前后监听差异，写出“代码 → 进程 → 内核资源”的对应关系，不能只贴一张进程列表。

## 完成证据

能把服务端代码中的关键操作映射到进程和内核资源。

以上记录需亲自完成后补入 PROJECT-001；本文没有宣布项目完成。系统调用跟踪、调度、缺页、共享内存和性能分析是下一层，不因查看几份 \`/proc\` 文件就算已验证。`},{id:"QUEST-008",kind:"quest",title:"CPU 如何从指令一路落到逻辑门和晶体管？",status:"backlog",created:"2026-08-24",tags:["cpu","instruction","digital-logic"],sourcePath:"tech-os/quests/backlog/QUEST-008.md",fields:{route_id:"ROUTE-001",order:8,question_ids:["QUESTION-002"],knowledge_ids:[],lab_ids:[],project_ids:[]},body:`## 当前理解

待探索程序指令、寄存器、执行单元、逻辑门和晶体管之间的抽象层次。

## 开始前

本课约 40 分钟，分三次做也可以。只需理解二进制 0/1 和 \`1 + 1 = 二进制 10\`，不用购买电子元件。本课观察的是编译结果、布尔模型和纸上电路；不会证明你已经测量了真实 CPU 内部晶体管。

## 学习思路

沿“C 加法 → 目标指令 → 加法逻辑 → 晶体管开关模型”逐层缩小问题，再用寄存器/时钟把组合逻辑与状态连接起来。不同层有不同证据，不把一个层次的截图当成所有层次都理解了。

## 工具准备

- S1 可用 [Compiler Explorer 官方站点](https://godbolt.org/)查看公开的小段 C 代码。不要上传工作源码、密钥或私人文件。
- 离线替代：已有 GCC 时运行 \`gcc --version\`，用编辑器创建 \`add.c\`；没有编译器也不想安装时先做 S2，S1 留待补做。
- S2 使用浏览器 Console 或 Node.js；S3 使用纸笔与 [MIT Computation Structures 的 CMOS 教材](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c3/c3s1/)。
- 控制台练习放在空白页或本课实验页，不在已登录账号的页面执行。先读懂下面的纯计算代码；若浏览器拦截粘贴，不输入解除保护的口令，可手工列真值表或用本机 Node.js 验证。

## 下一步

在 Compiler Explorer 或本机 GCC 中编译 S1 的 \`add\` 函数，先找到函数标签和返回前计算结果的位置。

## 学习步骤

### S1 · 看一行加法怎样变成目标指令

#### 为什么这样做

先区分“高级语言表达的意图”与“编译器选出的机器操作”，避免把每一行 C 当成固定的一条指令。

#### 工具与操作

在 Compiler Explorer 选择 C 和一个 x86-64 GCC 编译器，输入下面的代码；先用编译选项 \`-O0\`，再改为 \`-O2\`，记录编译器版本和架构。

\`\`\`c
unsigned add(unsigned a, unsigned b) {
    return a + b;
}
\`\`\`

离线时将同样内容保存为 \`add.c\`，在该文件夹运行下面两条，再用编辑器打开 \`.s\` 文件。\`-S\` 只生成汇编，不链接可执行程序，所以这里不需要 \`main\`。选项参见 [GCC 总体选项](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)及 [优化选项](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)。

\`\`\`text
gcc -O0 -S -o add-O0.s add.c
gcc -O2 -S -o add-O2.s add.c
\`\`\`

#### 观察与预期

找到 \`add\` 函数标签及返回前计算结果的指令。优化版可能更短，也可能用 \`lea\` 而不是名字里含 \`add\` 的指令；架构、编译器和 ABI 不同会改变输出。这里得到的是编译产物，没有执行程序或计时。

#### 常见误区

汇编中的寄存器名不是 C 变量名；某些指令可以完成多种算术用途。更多汇编行不必然更慢，\`-O2\` 也不等于所有程序都刚好快两倍。

#### 卡住时怎么办

看到 “undefined reference to main” 时确认加了 \`-S\`，没有进入链接阶段。输出完全不同先检查是否选择了 C、目标架构和同样选项。不要先强行背所有寄存器，只圈出数据进入、计算与返回的位置。

#### 检查理解

为什么不能从 \`return a + b\` 直接断言“CPU 一定执行一条 ADD，并用一个时钟周期完成”？

#### 参考答案

编译器可选择不同指令序列，具体执行还受架构、微架构和数据依赖等影响。源码、汇编和真实时序是不同层次，必须各自观察。

#### 完成标志

保存同一函数两组选项下的汇编，标出一处实际差异或说明没有差异；明确这不是性能测试结果。

### S2 · 用八组输入验证一位全加器

#### 为什么这样做

先只处理一位加法：输入两个数据位和一个进位，输出和位与新进位。多个位可以组合成更宽的加法器，这是理解 ALU 的小入口，不是完整 CPU。

#### 工具与操作

先在纸上预测 \`(a,b,cin) = (1,1,1)\` 的结果，再在 Console 运行下面的纯计算代码。\`^\` 是按位异或，\`&\` 是与，\`|\` 是或；不要换成 \`&&\` 或把 \`^\` 当乘方。

\`\`\`javascript
{
  const rows = [];
  for (const a of [0, 1]) for (const b of [0, 1]) for (const cin of [0, 1]) {
    const sum = a ^ b ^ cin;
    const carry = (a & b) | (cin & (a ^ b));
    rows.push({ a, b, cin, sum, carry });
    console.assert(sum + 2 * carry === a + b + cin, 'Mismatch', a, b, cin);
  }
  console.table(rows);
}
\`\`\`

把公式画成两个 XOR、两个 AND 和一个 OR 组成的逻辑框图。想用真正的逻辑模拟器时，再做 [Nand2Tetris 官方 Project 2 的 FullAdder](https://www.nand2tetris.org/project02)，使用它提供的测试而不是自行宣称通过。

#### 观察与预期

应得到八行且没有断言失败。\`1+1+1\` 的十进制结果是 3，因此 \`sum=1, carry=1\`；\`1+1+0\` 对应 \`sum=0, carry=1\`。输出总值按 \`sum + 2 × carry\` 解释。

#### 常见误区

这段 JavaScript 在现有计算机上验证布尔关系，不是在创建实体逻辑门。真值表正确也不能证明电路延迟、功耗或时序满足要求。

#### 卡住时怎么办

先只代入一组输入手算，核对括号和运算符；出现语法错误时检查是否混入代码围栏。不能用 Console 时手工列出八组输入也可，但要写清“手工验算”，不要写成模拟器实测。

#### 检查理解

为什么必须有 \`carry\`？把两个一位加法器接成两位加法器时，应连接什么？

#### 参考答案

一位 \`sum\` 只能表示 0/1，超过一位的部分由 \`carry\` 表达。低位的 \`carry\` 接高位的 \`cin\`；多位的进位传播还会带来延迟问题。

#### 完成标志

独立解释八行中的至少两行，并画出两位连接图；保存的是逻辑验证证据，不是硅片测试证据。

### S3 · 用 CMOS 反相器连接逻辑与物理

#### 为什么这样做

逻辑 0/1 由约定的电压范围表示。先理解一个反相器怎样把输入变成相反输出，再讨论更复杂逻辑，不需要从半导体方程开始。

#### 工具与操作

打开工具准备中的 MIT 教材，找到 “CMOS Inverter VTC” 图。纸上画电源 VDD、地 GND、输出节点，以及连接上拉的 PFET 和连接下拉的 NFET；两者栅极都接输入。仅做纸上推演，不接市电或未知硬件。

在理想稳态开关模型中分别填写两行：输入为低电平/高电平时，哪只管导通，输出接向电源还是地？然后在 S2 的加法逻辑前后各画一个“寄存器”方框，标出数据输入、组合计算和时钟采样的方向。

#### 观察与预期

理想模型下，低输入使 PFET 导通、NFET 关闭，输出被上拉；高输入相反，输出被下拉。这是对教材电路的推导，不是本机测到的波形。加法器本身不负责保存上一次结果，寄存器提供状态；实际采样必须满足时序约束。

#### 常见误区

“晶体管像开关”是便于入门的近似：切换并非瞬间，真实电路存在电容、延迟和功耗。CPU 也不是简单地让每条指令依次通过同一条没有控制信号的门链。

#### 卡住时怎么办

不懂器件细节时先只记“谁把输出接向哪一边”，能完成两行表即可。不要强行把高电平固定为 5V；电源和逻辑电平取决于工艺。时钟难理解时先区分“当前输入算出结果”与“把结果存到下一时刻”。

#### 检查理解

为什么仅有组合加法逻辑不能保存计算历史？本课哪项证据能证明真实 CPU 的晶体管延迟？

#### 参考答案

组合逻辑输出由当前输入决定，保存状态需要存储元件及相应控制。这里没有晶体管时序实测，汇编和真值表都不能替代它。

#### 完成标志

画出反相器两种稳态及“寄存器 → 组合逻辑 → 寄存器”，分别注明已观察的编译输出、已验证的布尔关系和仅作推导的电路模型。

## 完成证据

能解释一条指令如何由组合逻辑与时序逻辑执行，并形成后续 CPU / IC Route Seed。

这是待完成标准，并不自动创建 Route Seed 或认定已掌握 CPU。完成入门后可选取指/译码、ALU、寄存器时序或 CMOS 模拟中的一个方向继续；流水线、乱序执行、器件物理和芯片设计仍在本课边界之外。`},{id:"QUESTION-001",kind:"question",title:"浏览器、操作系统与递归 DNS 各自缓存了什么？",status:"open",created:"2026-08-24",tags:["dns","cache"],sourcePath:"tech-os/questions/QUESTION-001.md",fields:{origin_type:"quest",origin_id:"QUEST-003",route_seed_id:""},body:`## 为什么出现

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

- \`ROUTE-001\` 从输入网址到网页显示。`}],h=[{path:"tech-os/knowledge/internet/KNOWLEDGE-001.md",content:`---
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

## 开始前

这不是背诵一串名词的任务。你要学会回答：“我刚才做了什么，浏览器实际做了什么，哪条记录支持我的判断？”不需要先会写 JavaScript，也不用安装抓包软件。

手机可以预习、答题和记录疑问；本课完整的 Network、Application、Performance 实验需要桌面版 Chrome 或 Edge。手机里的“桌面版网站”不等于桌面 DevTools。先做 S1，一次只推进一个步骤，通常安排 25–45 分钟；卡住就留下问题，不必当天做完七步。

本课导航实验页由上方按钮打开。它提供同源链接、GET 表单、查询参数和页内锚点，不注册 Service Worker，不调用外部 API。它与 \`example.com\` 都不承诺出现 301/302、304、某种缓存命中或离线可用。实验页可能受到所在站点已有 Service Worker 的控制，需要到 S5 实测，不能仅凭“本页未注册”排除。

本文中的记录表是空白作业，参考答案只是自测提示，不是你已经完成的证据。打卡、保存笔记和正式提交完成是不同操作。

## 学习目标

做完后，你能用一份自己的记录解释：导航入口怎样形成 URL；哪里可能复用现有文档或响应；哪里真的需要网络；HTML 怎样变成可见内容。

先认识四个词：URL 是资源地址；请求是浏览器索取资源的消息；响应是对方返回的状态、头部和内容；Document 是页面文档这一资源类型，不是“所有请求”的别名。

## 学习思路

每一步都按“先预测 → 只改一个条件 → 看记录 → 解释差异 → 不看答案自测”进行。把“我看见的事实”和“我的解释”分开写；没有观察到的现象填“未观察到”，不填推测数值。

这张图是阅读地图，不是每次导航都会完整经历的固定流水线：

\`\`\`text
入口与 URL
├─ 同文档变化 / 历史恢复：可能直接继续使用文档
└─ 需要取得文档响应
   ├─ Service Worker / HTTP 缓存等可能提供响应
   └─ 需要网络：名称解析、连接、发送、接收
      └─ 若收到 HTTP 重定向，再处理新地址
→ HTML 解析与资源发现（可能与下载交错）
→ 样式、布局、绘制、合成 → 可见内容
\`\`\`

## 工具准备

1. 用桌面 Chrome 或 Edge 打开本课程，再通过上方按钮打开“导航实验页”。把课程留在一个标签页，实验放在另一个；不要在登录着邮箱、网银或 GitHub 管理后台的页面做实验。
2. 准备本地记事本，写下日期、浏览器名称/版本、实验页完整地址。证据优先使用文字或只含实验页的局部截图，不导出或上传含 Cookie、Token、个人 URL 的 HAR/完整性能日志。
3. 实验页内右键空白处 → 检查（Inspect），打开开发者工具。找到 Network（网络）；标签被折叠时从 \`>>\` 或“更多工具”中选择。Edge/Chrome 的图标位置和中文译名可能略有不同。
4. 本课不要求清除浏览器全部数据、不安装扩展、不绕过证书警告。控制台只用文中解释过的短小只读表达式；不粘贴网上来历不明的脚本，也不输入允许粘贴的口令来绕过安全提示。不想用控制台可以完成对应的手工拆解。

工具说明：[Chrome Network 入门](https://developer.chrome.com/docs/devtools/network/)、[Edge Network 入门](https://learn.microsoft.com/en-us/microsoft-edge/devtools/network/)。控制台风险说明：[Chrome Self-XSS 防护](https://developer.chrome.com/blog/self-xss)。

### S1 · 分清地址栏输入和导航入口

#### 为什么这样做

同样是“页面变了”，有的动作取得新文档，有的只滚动到当前页面某处。先识别入口，再谈网络，否则容易把每次点击都当成重新下载网页。

#### 工具与操作

1. 在实验页复制地址，去掉末尾 \`?\` 之后的查询串和 \`#\` 之后的片段，记为“基准地址”。保留协议、域名、端口和完整路径，不要把它改成教程中的示例域名。
2. 打开 Network，确认左上角录制圆点处于录制状态（通常为红色）。点击旁边的清空日志按钮（Clear，通常为斜杠圆圈）。这只清当前面板的请求列表，不是清浏览器数据。
3. 勾选 Preserve log（保留日志）；暂不勾选 Disable cache（停用缓存）；限速选 No throttling（不限速）。清空 Filter 文本框，点击 Doc/Document 类型。找不到类型按钮时点漏斗显示筛选栏，或在 Filter 输入 \`resource-type:document\`。
4. 按 Ctrl+R 刷新实验页。点击新增的文档行，在 Headers → General 读 Request URL、Request Method、Status Code；核对 Type 是 document。把地址与状态抄到表中。出现文档行并不自动证明通过互联网下载，缓存来源将在 S4 判断。
5. 点击实验页的普通同源链接，目标含 \`?visit=link\`。先看地址栏，再看新文档行。完成记录后，回到基准地址；等加载结束，清日志，再开始下一个动作。
6. 在实验页的 GET 表单输入 \`network\` 并提交，找 URL 中的 \`keyword=network\`。只用这个无敏感内容的示例词；GET 表单数据会出现在地址中。记录文档行和方法，不把表单当作必然的后台 API 请求。
7. 回到基准地址并清日志，点击通向 \`#section-two\` 的页内锚点。看是否滚动、URL 是否多出片段、新文档行是否增加。随后分别后退、前进各一次，记录具体动作，别只写“点了返回”。
8. 最后另开一个只做公开访问的标签页，依次在地址栏输入 \`example.com\`、\`https://example.com/\`、\`浏览器导航原理\`。记录最后落到的域名：前两个通常访问网站，第三个通常交给默认搜索引擎；自动补全、默认引擎与安全策略会影响结果。不必登录搜索网站，也不必点击搜索结果。

每个独立动作前清日志；Preserve log 负责保留这个动作内部可能发生的多次导航。按自己的结果填写：

| 动作 | 最终 URL 的变化 | 新 Document 行数 | 状态/来源原文 | 我的解释 |
| --- | --- | --- | --- | --- |
| 刷新基准地址 | 待填写 | 待填写 | 待填写 | 待填写 |
| 点击普通链接 | 待填写 | 待填写 | 待填写 | 待填写 |
| 提交 GET 表单 | 待填写 | 待填写 | 待填写 | 待填写 |
| 点击页内锚点 | 待填写 | 待填写 | 待填写 | 待填写 |
| 锚点后后退/前进 | 待填写 | 待填写 | 待填写 | 待填写 |
| 地址栏输入搜索词 | 待填写 | 不强求抓全 | 待填写 | 待填写 |

#### 观察与预期

实验页的普通链接/GET 表单采用常规文档导航；片段变化通常不需要取得新文档。后退前进也可能恢复历史页面或命中 bfcache，所以不能要求它们每次都出现新文档行。搜索框建议请求、图片请求不算 Document。

#### 常见误区

“页面没变样”等于“没导航”；“有一行 document”等于“走了外网”；“Back 一次”一定等于“重新请求上一个网站”。这三句话都不成立。

#### 卡住时怎么办

列表为空：先点 All、清空 Filter、确认录制开启，再刷新。出现很多旧行：先清日志再做一个动作。新标签没记录：DevTools 只观察它附着的标签页，去实际打开页面的那个标签重新开工具。访问失败就记录错误文字，不关闭安全防护来强行继续。

#### 检查理解

1. 为什么清日志后，点击 \`#section-two\` 可以看到地址变化却看不到新 Document？
2. “点击链接”和“提交表单”是否永远是两种不同的网络请求类型？

#### 参考答案

1. 片段指向当前文档内部的位置，浏览器可以继续使用已有文档。这里的结论来自这个受控锚点，不代表所有网站的点击都如此。
2. 不是。本课两者都可形成文档导航，表单另有方法和字段；真实网站也可能用 JavaScript 拦截动作再发送其他请求。先看实际记录。

#### 完成标志

留下至少五种入口的实测记录，能独立找到一行 document 的 URL/方法/状态，并用自己的话区分“动作”“文档导航”“真实网络传输”。没有运行过的格子保持空白。

参考：[MDN 发送表单数据](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data)、[Chrome 团队：前进后退缓存](https://web.dev/articles/bfcache)。

### S2 · 拆解 URL 与同文档导航

#### 为什么这样做

URL 不是一整块不可拆的字符串。只有分清“访问谁”“请求哪条路径”“附带什么参数”“定位文档哪里”，才能预测一次修改可能影响哪一层。

#### 工具与操作

1. 回到实验页基准地址，Network 按 S1 设置并清日志。点击查询参数示例，或在基准地址后输入 \`?topic=network&sample=1\` 回车。对照实验页的 URL 字段显示，记录 protocol、hostname、port、pathname、search、hash。
2. 再清日志，只在当前地址末尾加 \`#section-two\` 回车，不改其他字符。观察字段变化与 Document 行数。片段在 HTTP 请求目标中不会被发送；对照上一条真实请求的 Request URL，而不是把地址栏当请求报文。
3. 再清日志，把 \`sample=1\` 改成 \`sample=2\` 回车，保持路径不变。记录是否发起文档导航。这是地址栏导航实验，不是用 \`history.pushState()\` 修改地址的实验。
4. 在笔记中手工拆解下面这条“仅用于解析”的地址；不要实际访问它的 8443 端口。先填写字段表，再看参考答案。

\`\`\`text
https://example.com:8443/learn/page.html?q=hello%20world&lang=zh#section-two
\`\`\`

| 字段 | 你填写的值 | 你认为它负责什么 |
| --- | --- | --- |
| protocol | 待填写 | 待填写 |
| hostname | 待填写 | 待填写 |
| port | 待填写 | 待填写 |
| pathname | 待填写 | 待填写 |
| search | 待填写 | 待填写 |
| hash | 待填写 | 待填写 |

5. 可选验证：在实验页 DevTools 选择 Console（控制台），读懂后手动输入下面第一行并回车，展开得到的 URL 对象查看属性。它只解析字符串，不发起请求、不读取账户或修改存储。第二行只读取解析后的参数；若出现粘贴安全警告，不绕过它，可继续做手工练习。

\`\`\`js
new URL("https://example.com:8443/learn/page.html?q=hello%20world&lang=zh#section-two")
new URL("https://example.com/?q=hello%20world").searchParams.get("q")
\`\`\`

6. 再预测下表八个输入；可逐条手动输入 \`new URL("输入", "基准")\` 检查，完整绝对地址可省略第二参数。只比较 \`href\`、\`port\`、\`pathname\`、\`search\`、\`hash\`，不执行任何导航代码。

| 输入 | 相对地址所用基准 | 重点观察 |
| --- | --- | --- |
| \`https://EXAMPLE.com:443/\` | 不需要 | 主机名和默认端口怎样规范化 |
| \`https://example.com:8443/a\` | 不需要 | 非默认端口是否保留 |
| \`../notes\` | \`https://example.com/learn/page.html\` | 相对路径怎样合并 |
| \`/notes\` | 同上 | 以 \`/\` 开头从哪里算 |
| \`?q=two\` | 同上 | 路径会不会保留 |
| \`#section-two\` | 同上 | 哪个字段改变 |
| \`https://example.com/?q=hello%20world\` | 不需要 | search 原文与解码后的 q 值 |
| \`https://example.com/学习\` | 不需要 | href 中的百分号编码 |

#### 观察与预期

默认 HTTPS 端口 443 会规范化为 \`port\` 空字符串，不是“没有端口”；\`host\` 会含非默认端口，\`hostname\` 不含。\`search\` 带 \`?\`，\`hash\` 带 \`#\`。实验页改 query 的普通导航与只改 fragment 的同文档变化应分开记录。

#### 常见误区

把 \`?\` 后所有内容都当路径；认为 \`%20\` 是加密；把 \`new URL()\` 当作下载命令；以为 fragment 天生保密。片段虽不随该 HTTP 请求发送，页面脚本仍能读到它，不能用来隐藏密码。

#### 卡住时怎么办

\`Invalid URL\`：检查英文引号、协议和相对地址是否给了绝对基准。默认端口栏空白不用“修复”。只改片段却多出文档行：确认之前加载已完成、路径/query 未一起改、日志已清空；无法排除时记“待复查”，不要删掉反例。

#### 检查理解

1. 上面长 URL 的六个字段分别是什么？哪部分不会作为 HTTP 请求目标发送？
2. \`../notes\` 的最终路径是什么？\`searchParams.get("q")\` 读到的是 \`%20\` 还是空格？

#### 参考答案

1. 依次是 \`https:\`、\`example.com\`、\`8443\`、\`/learn/page.html\`、\`?q=hello%20world&lang=zh\`、\`#section-two\`；最后的 fragment 不随该请求发送。
2. 路径为 \`/notes\`；q 的解码值是 \`hello world\`。这些是解析规则的答案，不是你设备上的网络实验结果。

#### 完成标志

完成六字段表、八个解析预测和 query/fragment 的两组对照；能解释“URL 字符串变化”为什么不等于“必定新建文档或外网传输”。

参考：[MDN URL 属性](https://developer.mozilla.org/en-US/docs/Web/API/URL)、[URL 构造与相对地址](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)、[fragment 的边界](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)。

### S3 · 找到导航提交前的决策

#### 为什么这样做

“准备导航”“取得响应”“用新文档替换当前文档”不是同一个时刻。取消可以发生在不同阶段；HTTP 301/302 则是响应到达后的决定，不应画成所有请求之前必做的检查。

#### 工具与操作

1. 在实验页清日志，点击锚点做一次同文档变化，再清日志点击普通链接。分别记录新 URL 与是否出现 document。
2. 为观察取消，Network 限速选 3G 或 Slow 4G，暂时勾选 Disable cache；加载基准地址后立即按 Esc，或点地址栏旁的停止加载按钮。记录实际结果：取消、已完成或未捕捉到。结束后恢复 No throttling 并取消 Disable cache。
3. 读取下方 MDN 重定向说明，手画教学例子：\`请求 A → 响应 302 + Location: B → 请求 B → 响应 200\`。给它标注“文档示例，非本机抓包”。本课静态页没有承诺提供 302；不要把点击链接后的 200 伪称为重定向。
4. 若你在公开测试访问中恰好看到 301/302，可选中该行核对 Headers 的 Location 与下一行 URL；没有就写“真实重定向证据待补”。浏览器内部 HTTPS 升级也不能直接当成服务器返回的 301/302。

#### 观察与预期

取消可能来不及，或者请求已发送但响应未完整收到；Network 没显示完整页面不代表服务器没收到请求。同文档锚点是本课稳定对照，取消耗时和重定向不是。

#### 常见误区

把 \`(canceled)\` 当成 HTTP 状态码；把 HTTP 重定向、点击新链接、脚本改地址混为一谈；只凭 DevTools 一行记录推断浏览器全部内部事件。

#### 卡住时怎么办

页面太快就记录“未捕捉到取消”，不反复轰炸网站。误留限速导致后面都变慢，先恢复 No throttling。只有 200 而没有 Location，不要凭最终地址猜中间一定有 302。

#### 检查理解

1. 按 Esc 后能否断言服务器没有收到请求？
2. 301/302 在第一次 HTTP 请求之前还是之后才能由服务器告知？

#### 参考答案

1. 不能，取消时点不同，已发送的数据无法因点击停止而撤回。
2. 在相应请求获得响应时才能看到服务器的重定向状态和 Location；随后可能继续访问新地址。

#### 完成标志

画出含“同文档 / 需要响应 / 可取消 / 重定向再导航”的分支图，并区分实测结果与教学示例。没有 302 实测必须明确保留“待补”。

参考：[MDN HTTP 重定向](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections)。

### S4 · 区分内存缓存、HTTP 缓存与重新验证

#### 为什么这样做

“快”不能证明命中缓存，“200”也不必然代表重新传输全部内容。需要把状态码、传输来源和条件请求放在一起看；memory/disk 是浏览器缓存的实现位置，不是两种不同的 HTTP 协议。

#### 工具与操作

1. 选择实验页或公开的 \`https://example.com/\`，固定同一个 URL，不添加随机参数。回到 Network → Document，No throttling，取消 Disable cache，加载一次作为基线。
2. 清日志，普通刷新；选择 document，在 Headers 记录响应的 Cache-Control、ETag、Last-Modified、Age，缺失写“无”。再看请求是否带 If-None-Match 或 If-Modified-Since。
3. 清日志，执行一次“硬重新加载”（Windows 通常 Ctrl+Shift+R）。不要选择“清空缓存并硬重新加载”，不清浏览器全部数据。记录同一组字段。
4. 勾选 Disable cache，保持 DevTools 打开，再清日志并普通刷新；记录第三组。结束后取消该选项。这个开关针对浏览器缓存，不是删除文件，也不等于清空 Service Worker 的 Cache Storage。

| 条件 | Status / Size 来源原文 | Cache-Control / 验证器 | 条件请求头 | 本次能支持的结论 |
| --- | --- | --- | --- | --- |
| 普通刷新 | 待填写 | 待填写 | 待填写 | 待填写 |
| 硬重新加载 | 待填写 | 待填写 | 待填写 | 待填写 |
| Disable cache 后刷新 | 待填写 | 待填写 | 待填写 | 待填写 |

#### 观察与预期

可能三次都是 200，也可能显示缓存来源或 304；由资源策略、验证器、浏览器与托管环境决定。\`no-cache\` 允许保存但复用前要验证；\`no-store\` 要求不要保存。304 表示验证后可复用已有内容，不携带被请求资源的完整表示正文。

#### 常见误区

把 \`no-cache\` 理解为“绝不存储”；为了看到 304 给 URL 乱加参数（这会改变缓存键）；把缓存里的 200 当成刚收到的 200；把 Cache Storage 当作 HTTP 缓存。

#### 卡住时怎么办

没有 304：先看是否存在验证器与条件请求，仍没有就保留三条真实记录。不要为凑结果反复清数据。出现 ServiceWorker 来源，先标“存在干预，需 S5 分析”，不强行归为 HTTP 缓存。

#### 检查理解

1. 直接复用、304 验证、重新下载 200，哪种需要先与服务器验证？
2. 如果三次都是 200，是否能据此宣布浏览器没有缓存功能？

#### 参考答案

1. 304 属于有条件请求的验证结果；直接复用不需要这次验证；重新下载 200 通常携带内容，但也要结合来源确认它是不是缓存中的旧响应。
2. 不能，这只说明所测资源在这些条件下的结果。需要检查策略和实际传输，而不是推翻缓存机制。

#### 完成标志

保留三组实测记录，能正确解释三条缓存路径；把未出现的路径标为“已理解规则、尚无实测证据”。

参考：[MDN HTTP 缓存](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)、[Cache-Control 指令](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)、[304 响应](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304)。

### S5 · 判断 Service Worker 是否接管请求

#### 为什么这样做

Service Worker 可以在页面之外处理 fetch 并提供响应。注册存在、已经激活、当前页面受它控制、某个请求被它响应，是四个不同的问题；仅凭“离线还能看见页面”不能全部回答。

#### 工具与操作

1. 先在实验页打开 Application（应用）→ Service Workers。记录页面来源、是否有注册、scope 范围与状态。不点击 Unregister、Clear storage，也不操作导航站已有的 Worker。
2. 如愿使用控制台，可手动输入下方只读表达式，记录当前文档的控制者脚本地址或“未被控制”；它不注册或删除任何 Worker。若不使用控制台，就依据面板记录，并把无法确认的“当前控制者”标为待确认。

\`\`\`js
navigator.serviceWorker?.controller?.scriptURL ?? "未被控制"
\`\`\`

3. 想做正对照时，从下方 MDN 文档的 Demo 区域打开它提供的在线演示，仅在演示标签操作。先在线完整加载、等待安装/激活，再普通刷新一次，重新查控制者。外部演示访问失败或不受控制时就暂停，不寻找来历不明的替代脚本。
4. 仅当演示页确认受控，去 Application → Cache Storage 查是否有与页面资源 URL 对应的条目；再回 Network 清日志刷新，观察 Size/来源及 Timing 的 ServiceWorker 信息。没有这些证据时不要声称“响应一定来自 Cache Storage”。
5. 可选三组对照：在演示标签保持 Disable cache 开启，先在线刷新；再选 Offline 刷新；最后保持 Offline 并勾选 Bypass for network 再刷新。只记录实测能否加载与来源。完成后立刻取消 Offline、Bypass for network、Disable cache，恢复 No throttling。不需要卸载 Worker 或清空任何站点存储。

#### 观察与预期

首次注册不一定立即控制当前页面。受控演示若已有匹配缓存，可能在 Offline 时仍能响应；Bypass for network 绕过 Worker，配合禁用 HTTP 缓存和 Offline 后通常无法重新取得页面。此结论以该演示缓存策略和请求确实被拦截为前提，不适用于所有网站。

#### 常见误区

把“注册了”当成“当前页面被控制”；看到 Cache Storage 中有文件就认定这次用了它；把离线失败当成 SW 一定没安装；在自己的导航站随手清存储，连笔记和进度也一起清掉。

#### 卡住时怎么办

面板为空并不异常。记录“此环境没有可见注册/控制者”，先完成负对照。演示激活但 controller 为空，可确认 scope 和 URL 后普通刷新；仍为空则记录浏览器限制/状态。别在 HTTP 公网站点或 \`file:\` 页面上强行注册；也不关闭安全策略。

#### 检查理解

1. 有一个 active Worker，就能证明当前页面的所有响应来自它的缓存吗？
2. 为什么需同时看控制者、请求来源与缓存条目？

#### 参考答案

1. 不能，页面可能不在 scope 内或尚未被控制；Worker 也可继续访问网络。
2. 它们分别说明页面控制关系、这次响应经过的路径、可用的缓存内容，不能互相替代；证据不足时应保留“不确定”。

#### 完成标志

记录自己实际测过的页面及控制状态，能区分“注册 / 控制 / 拦截 / 缓存响应”。未完成在线演示的正对照时写清待补事项，不能把参考现象当截图结论。

参考：[MDN 使用 Service Worker 与官方演示入口](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)、[controller 的含义](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controller)、[Chrome SW 调试工具](https://developer.chrome.com/docs/devtools/progressive-web-apps/)。

### S6 · 划出网络请求的边界

#### 为什么这样做

需要网络时，浏览器仍可能复用已有地址信息和连接。Timing 是“这次请求记录了什么”，不是每次都完整重演 DNS、连接和加密协商的教科书图。

#### 工具与操作

1. 本地 \`127.0.0.1\` 实验页不适合观察公网 DNS/TLS。另开公开 \`https://example.com/\`，打开 Network、Doc 筛选、No throttling，勾选 Disable cache 后刷新。
2. 选 document → Timing，逐项抄下实际显示的 Queueing/Stalled、DNS Lookup、Initial connection/SSL、Request sent、Waiting (TTFB)、Content Download 及耗时；不存在的项写“本次未显示”，不要填 0。
3. 再普通刷新一次，比较哪些阶段消失或变短。可在请求表头右键显示 Protocol，记录 h2/h3 等实际值；不要把所有现代请求都画成新的 TCP 连接。
4. 在纸上分三栏标记“浏览器排队/准备”“网络连接与发送/等待”“接收内容”。SSL 常包含在连接阶段，不把重叠的耗时再相加。取消 Disable cache 结束实验。

#### 观察与预期

连接复用、DNS 缓存、代理或协议差异都可能让某些阶段不可见。TTFB 不只是服务器业务处理时间，还包含网络往返等等待；Content Download 也不等于后续页面绘制时间。

#### 常见误区

认为缺少 DNS 就没有访问服务器；以为开隐私窗口能清空操作系统所有 DNS 缓存；把 Waiting 全算作后端慢；把一个 document 的耗时当整页所有资源的总和。

#### 卡住时怎么办

若显示缓存或 ServiceWorker 来源，先记录干预并换一个无需登录的公开页面对照；不必清理全局缓存或刷新系统 DNS。公网不可达时可用本地页学会读 Timing，但在记录中注明“未验证公网连接阶段”。

#### 检查理解

1. 第二次没有 DNS/SSL 阶段，能否说 HTTPS 失效？
2. 文档的 TTFB 高，能否直接断言数据库慢？

#### 参考答案

1. 不能，可能复用了连接或已有解析结果，还应结合协议及上下文判断。
2. 不能，需要继续区分网络、排队、服务端等因素；单个 Timing 阶段不能定位数据库。

#### 完成标志

留下两次 Timing 对照，并解释至少一个未显示阶段；能够指出哪些是观察、哪些只是可能原因。

参考：[Chrome Network Timing 阶段说明](https://developer.chrome.com/docs/devtools/network/reference#timing-explanation)。

### S7 · 从 Document Response 追到 First Pixel

#### 为什么这样做

拿到 HTML 字节还不等于看到页面。浏览器需要解析内容、计算样式与几何位置、绘制并合成；这些工作可能与后续下载交错，不是所有文件下载完才开始。

#### 工具与操作

1. 回到本课实验页，恢复不限速和在线状态。打开 Performance（性能）面板，在录制设置中开启 Screenshots（截图）；只录不含个人信息的实验页。
2. 点击 Record and reload（录制并重新加载，循环箭头图标）。等待自动结束；若版本要求手动停止，页面稳定后点 Stop。不要只录一个已经加载完的静止页面。
3. 在时间线选中加载区间，展开 Main（主线程）或对应的渲染轨道，寻找 Parse HTML、样式计算、Layout、Paint；用顶部搜索或 Ctrl+F 查事件名称，选中事件查看详情。不同版本标签可能不同，没找到就写“未定位”，不要伪造时间。
4. 查看 Timings 里的 FCP（若可见）和截图序列中第一次出现文字的画面，再找 DOMContentLoaded（DCL）标记。把实际顺序、时间与图上位置记下；不能把两张粗粒度截图之间的变化精确到某一毫秒。
5. 切回 Network 看该文档 Response，再看 Elements（元素）的 DOM 树，写出二者的差别。实验页的样式内联、脚本为同源文件；没有独立 CSS 请求不代表没有样式。想看脚本行要把 Doc 筛选切回 All。入门阶段不必阻塞资源或修改站点代码。

#### 观察与预期

FCP 指首次绘制文本、图像等内容，不保证整页完成或按钮都能响应；本标题的 First Pixel 是学习用语，不是与 FCP 完全相同的标准指标。DCL 也不等待所有图片完成，不能当成“已全部加载”。

#### 常见误区

把 Response 当成实时 DOM；把 FCP、DCL、load 和“流畅可交互”画成同一个点；要求每条时间线都按完全相同顺序出现所有事件；拿一次录制的小差值判断优化成功。

#### 卡住时怎么办

时间线空白就用“录制并重新加载”重试；太密就放大加载区段，先找一个 Paint 和一张有文字的截图。未找到某个指标时保留原始观察并提出问题，不拿参考资料的数值补格。结束后关闭录制工具即可，不必导出整份 trace。

#### 检查理解

1. HTML Response 已收到，为什么仍可能没看到内容？
2. 首屏有字但图片还没加载完，是否与 DCL/FCP 的定义冲突？

#### 参考答案

1. 解析、样式、布局、绘制或主线程工作尚未推进到产生可见内容；网络完成不是渲染完成。
2. 不冲突。FCP 只描述首次内容绘制，DCL 描述文档解析及相关延迟脚本完成；它们都不是所有图片已加载或所有交互已准备好的保证。

#### 完成标志

画出一条带实际观察标记的“响应 → 解析/样式 → 布局/绘制 → 可见内容”时间线；能说出至少两件自己尚不能从这份记录证明的事。

参考：[Chrome 性能录制](https://developer.chrome.com/docs/devtools/performance/reference/)、[MDN 浏览器解析与渲染](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)、[DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)、[FCP](https://developer.mozilla.org/en-US/docs/Glossary/First_contentful_paint)。

## Quest 正式完成条件

- S1–S7 均按各自完成标志留下真实记录后，再逐项打卡；阅读和看答案不会替代实验。
- 保存一张“地址栏 → 可见内容”的分支流程图，说明浏览器内部决策、网络和渲染的边界。
- 至少保留一份本人的 Network 或 Performance 文字记录/脱敏截图，并能不用参考答案复述。
- 缓存 304、真实重定向、SW 正对照等未观察到的现象单列待补；不把“未出现”写成“功能不存在”。
- 在下方写自己的结论与证据，再使用正式完成操作；剩余疑问可以进入 \`questions/\`。

## 当前结论

尚未填写。请用自己的话补充：我已能解释什么；哪条实测支持它；哪些还只是猜测。不要把上面的参考答案直接当作个人结论提交。

## 下一步

先打开上方“导航实验页”，按 S1 设置浏览器开发者工具的 Network 面板，完成第一条刷新记录。今天做到能独立找到 Document 行即可，不急着阅读七步所有答案。

## 完成证据

尚未形成。学习后填写日期、浏览器版本、实验 URL、操作、实际观察、证据位置与未验证项。公开提交前检查截图和地址不含个人信息；不要上传敏感 HAR、Cookie、Token 或账户页截图。

## Open Questions

尚未填写。遇到卡点时记录“我停在 S几的第几项、期望看到什么、实际看到什么、已经试过什么”，再按需新增到 \`questions/\`。
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

## 开始前

本课约 20 分钟。先会打开开发者工具即可，不需要安装 Node.js，也不需要真实账号或 Token。使用本课的“打开导航实验页”按钮；不要在导航 CMS 的 \`#/tech-os\` 路由上修改片段，否则会切换工作台页面。

## 学习思路

先把地址拆成字段，再只改变一个字段看浏览器行为。区分“地址字符串变了”“换了一份文档”“真的向服务器发了请求”，这三件事并不等价。浏览器 URL API 以 [WHATWG URL 标准](https://url.spec.whatwg.org/#api)为准。

## 工具准备

- 桌面 Chrome 或 Edge，按 F12 打开 Console 和 Network。手机可以先看实验页自显字段，网络证据留到电脑补做。
- 实验页提供 query 链接、\`#section-two\` 锚点和 GET 表单。若按钮尚不可用，可以先做 S1 的纯字符串解析；不要把未做的网络观察记为已完成。
- 准备两条记录：原始地址、改动后地址；不填写密码等敏感内容。

## 下一步

打开本课导航实验页，完成 S1 的 URL 字段解析，先记下协议、主机、路径、查询和片段各是什么。

## 学习步骤

### S1 · 拆开一个地址并预测相对链接

#### 为什么这样做

地址不是一串只能整体记住的文字。协议和主机帮助确定访问目标，路径和查询参数表达资源请求，片段通常用于客户端定位。

#### 工具与操作

在实验页 Console 执行下面的只读代码。花括号让重复执行不发生变量重名；\`new URL\` 只解析字符串，不访问这个站点。

\`\`\`javascript
{
  const u = new URL('https://EXAMPLE.com:443/docs/start?q=hello%20world#intro');
  console.table({
    href: u.href, protocol: u.protocol, hostname: u.hostname,
    port: u.port, pathname: u.pathname, search: u.search,
    hash: u.hash, q: u.searchParams.get('q')
  });
  console.log(new URL('../next?x=1', u).href);
}
\`\`\`

再执行 \`new URL(location.href).pathname\`，和实验页显示的当前路径对照。

#### 观察与预期

主机名变为 \`example.com\`，HTTPS 默认端口 \`443\` 被规范化为空字符串；\`q\` 的值是 \`hello world\`，而 \`search\` 保留编码形式。相对地址解析为 \`https://example.com/next?x=1\`。这些是解析结果，不是服务器返回的结果。

#### 常见误区

\`hostname\` 不含端口，\`host\` 可以含端口；空 \`port\` 不等于没有端口。\`%20\` 是编码，不是加密。不能仅凭字符串长得像网址就断定它可信。

#### 卡住时怎么办

若出现语法错误，检查是否复制了代码围栏或中文引号。若 Console 阻止粘贴，先读懂代码并逐行手输，不要为未知代码关闭安全保护。没有开发者工具时先手工标出五部分。

#### 检查理解

为什么 \`../next\` 不接在 \`/docs/start/\` 后面？\`443\` 被省略后，访问协议是否变了？

#### 参考答案

基准路径 \`/docs/start\` 最后一段作为当前资源名，先取所在目录 \`/docs/\`，再由 \`..\` 回到根目录。协议仍是 HTTPS，省略的是它的默认端口表示。

#### 完成标志

保留字段输出，并在运行前独立预测另一个相对链接 \`./next\` 的结果；能解释实际结果与预测是否一致。

### S2 · 对比片段、查询参数和表单提交

#### 为什么这样做

片段在解引用前被分离，不属于发给服务器的 HTTP 请求目标；但页面脚本仍能读取它，它不是保密容器。参见 [RFC 3986 第 3.5 节](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.5)。

#### 工具与操作

1. 在实验页打开 Network，确认录制已开启、没有遗留过滤条件，选 Doc 并清空列表。
2. 点击指向 \`#section-two\` 的页内链接，记录地址、滚动位置和新增文档请求数。
3. 点击带 \`?topic=network&sample=1\` 的链接，再点新增文档行的 Headers，查看 Request URL。
4. 在 GET 表单输入 \`hello world\` 并提交，比较地址中的 \`keyword\` 与页面解码后的参数。只使用测试文字。

面板具体操作可对照 [Chrome 官方 Network 教程](https://developer.chrome.com/docs/devtools/network/)。

#### 观察与预期

纯锚点跳转通常只更新片段和滚动，不重新加载主文档。查询参数/表单导航会改变请求目标；文档可能来自网络、缓存或服务工作线程，不能保证每次都有真实网络传输。请求目标不含 \`#section-two\`；表单空格可能显示为 \`+\`，解码后仍是空格。

#### 常见误区

不要把图片、favicon 请求当成主文档请求，也不要用地址栏里包含 \`#\` 来证明服务器收到了它。只看到 200 不能证明走了网络，更不必追求出现 302 或 304。

#### 卡住时怎么办

若列表没有记录，先刷新一次验证录制和 Doc 过滤器；检查是否选错标签页。若结果受缓存影响，记录 Size/来源后再做一次对比，不要清空整个浏览器数据。实验页不可用时先保留问题，网络步骤暂不打卡。

#### 检查理解

把查询里的 \`keyword=hello\` 改成片段 \`#keyword=hello\`，普通服务器端查询参数解析还能读到它吗？

#### 参考答案

不能直接读到片段。客户端脚本可以主动把片段放进另一次请求，所以“默认不发送”不等于“绝不可能泄露”。

#### 完成标志

记录锚点与查询导航各一次的真实观察，明确哪些是网络证据、哪些只是地址变化；不要求状态码固定。

## 完成证据

能解释 URL 各部分由谁处理，以及 fragment 为什么不会发送给服务器。

以上是待完成标准，不代表已经验证。后续再比较 Node.js URL、服务器日志与特殊协议；本课不覆盖全部 URL 安全和规范化边界。
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

## 开始前

本课约 25 分钟，需要可联网的电脑；只做少量公开域名查询，不更改系统 DNS、不清空缓存。先知道域名和 IP 不是一回事。查询结果受网络、时间和解析器策略影响，IP 地址不需要与他人的截图一致。

## 学习思路

每次查询先问三个问题：我问了谁、问了哪种记录、回答来自权威还是缓存/递归服务。递归服务替客户端寻找答案，权威服务负责自己管理的区域；一次普通查询输出不是完整查询链的录像。[RFC 1034](https://www.rfc-editor.org/rfc/rfc1034.html)解释这两类职责。

## 工具准备

- Windows 打开 PowerShell，使用系统 \`nslookup\`；macOS/Linux 可用 \`nslookup\`，已装 BIND 工具时也可用 \`dig\`。
- 命令找不到时先查系统的官方软件源，不运行来路不明的一键安装脚本。没有命令行权限时先阅读本课并记录待做项。
- 示例使用 \`example.com\`，只记实际输出。关联的 LAB-001 是后续完整记录位置，本文不会把它自动标记完成。

## 下一步

执行一次 \`nslookup -type=A example.com\`，先在输出中分别标出解析服务器和目标答案，再继续 S1。

## 学习步骤

### S1 · 区分解析服务器和解析答案

#### 为什么这样做

初学时最容易把输出顶部 DNS 服务器的地址误认为网站地址。先读懂一次查询，再讨论多层缓存。

#### 工具与操作

在同一个终端逐条执行，记录 Server/Address 和回答区的 Name/Addresses；命令来自 [Microsoft nslookup 文档](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup)。

\`\`\`text
nslookup -type=A example.com
nslookup -type=AAAA example.com
nslookup -type=NS example.com
\`\`\`

已有 \`dig\` 时，等价起点是 \`dig example.com A\`、\`dig example.com AAAA\` 和 \`dig example.com NS\`。

#### 观察与预期

A 查询请求 IPv4 记录，AAAA 请求 IPv6 记录，NS 请求负责该域的名称服务器。可能返回多个地址、CNAME 或无该类型记录；没有 AAAA 不等于整个域名不存在。顶部服务器是本次接收查询的解析器。

#### 常见误区

“Non-authoritative answer”不是“不可信”或“解析失败”；它表示当前回答不是以该区域权威身份给出的。DNS 返回地址也不证明对应网站的 TCP/TLS/HTTP 都可用。

#### 卡住时怎么办

超时先检查网络及错误中的服务器地址，不要立刻换全局 DNS。公司/校园网络可能限制外部 DNS；保留失败输出并询问网络管理者。若 Server 显示 Unknown 但回答区正常，可能只是该解析器地址没有反向名称。

#### 检查理解

输出中两个 Address 分别可能指谁？A 查询成功能证明网页正常打开吗？

#### 参考答案

顶部可能是 DNS 解析服务器，回答区可能是目标记录地址；应结合字段位置判断。DNS 成功只是后续连接的前提之一，不代表网站端口、证书或响应一定正常。

#### 完成标志

为三个查询各写一句“向谁询问什么、实际得到什么”，能指出答案区而不是只抄一个 IP。

### S2 · 观察 TTL，再区分递归与权威查询

#### 为什么这样做

缓存减少重复工作，但仅凭查询快慢不能证明命中了哪一层。需要记录 TTL 和服务器身份，并明确工具没有观察到什么。

#### 工具与操作

先执行两次下面的命令，中间等十余秒，找到回答中的 TTL（生存时间）；若输出太长，用终端查找 \`ttl\`。

\`\`\`text
nslookup -debug -type=A example.com
\`\`\`

再从 S1 的 NS 回答中选一个完整名称，手工替换下面的 \`AUTH_SERVER\` 后执行；不要原样输入占位词。第二个位置指定本次直接询问的 DNS 服务器，不修改系统设置。

\`\`\`text
nslookup -debug -type=A example.com AUTH_SERVER
\`\`\`

已有 \`dig\` 且网络允许直接 DNS 查询时，可额外运行 \`dig +trace example.com A\`。它是工具自己从根开始做迭代查询，不是旁观系统递归服务器内部；参见 [BIND dig 手册](https://bind9.readthedocs.io/en/v9.20.11/manpages.html#dig-dns-lookup-utility)。

#### 观察与预期

缓存回答 TTL 可能下降，也可能因负载均衡、刷新或不同缓存节点而不降。直接查询成功时可检查是否有 authoritative/AA 标志；\`+trace\` 通常显示多级转介，但受防火墙限制时可能中止。

#### 常见误区

\`nslookup\`/\`dig\` 的查询不能直接代表浏览器的缓存或 DoH 行为。第二次更快不等于“浏览器缓存命中”；TTL 没下降也不能单独证明没有缓存。

#### 卡住时怎么办

权威查询或 trace 超时而默认查询成功时，记录“直连路径受限，递归查询可用”；先停止深入，不关闭防火墙。TTL 看不懂时先保留两份输出并圈出 Answer 区，别把 NS 附加记录的 TTL 混进比较。

#### 检查理解

为什么一次默认查询能拿到答案，却不能说“我的电脑亲自问遍了根、顶级域和权威服务器”？

#### 参考答案

它通常把请求交给配置的解析器；解析器可能已缓存答案，也可能继续转发或递归查询。客户端输出没有展示其内部全过程。

#### 完成标志

保留两次 TTL 记录与一次权威查询结果或明确失败原因，画出“客户端 → 配置解析器 → 可能的权威查询”并标注哪些箭头实际观察到。

## 完成证据

能解释一次缓存未命中的 DNS 查询，并用命令验证关键记录。

这是待验证的标准。将实际记录补入 LAB-001 后再决定是否完成；浏览器/操作系统缓存、DoH、DNSSEC 和缓存投毒防护属于后续深入，不由本课两次查询证明。
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

## 开始前

本课约 30 分钟，只观察自己电脑的回环流量，不抓取他人或登录账号的通信。先区分 IP 地址与端口即可。本机回环实验省去公网路由干扰，因此不能用它证明互联网路由、丢包重传或拥塞控制已经学会。

## 学习思路

先让两个本机程序完成一次通信，再把这段通信在抓包中找出来。IP 负责网络层寻址和投递，TCP 提供连接上的有序字节流；TCP 不替应用决定“一条消息”有多长。协议边界可查 [TCP 标准 RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html)。

## 工具准备

- Python 3：Windows 用 \`py --version\` 检查；macOS/Linux 用 \`python3 --version\`。已有可用 \`python\` 命令时可替换解释器名。
- curl：Windows 下面写 \`curl.exe\`，避开旧 PowerShell 的同名别名；macOS/Linux 改为 \`curl\`。
- Wireshark；Windows 回环捕获需要 Npcap。无安装/抓包权限时先做 S1，S2 保留为待做，不需要关闭防火墙。回环适配器说明见 [Npcap 官方指南](https://npcap.com/guide/)。
- 用文件管理器新建一个空实验目录，并在该目录打开两个终端。不要在含密码、项目密钥或个人文件的目录启动文件服务器。

## 下一步

确认 Python 可用，在空实验目录按 S1 启动仅绑定 \`127.0.0.1\` 的服务，先完成一次本机 curl 请求。

## 学习步骤

### S1 · 建立一个只在本机工作的连接

#### 为什么这样做

连接失败和 HTTP 错误是不同层的问题。我们先制造一个可控服务，知道服务器应监听哪个地址和端口。

#### 工具与操作

终端 A 启动文件服务并保持打开；下面是 Windows 命令，macOS/Linux 将 \`py\` 改为 \`python3\`。[Python 官方文档](https://docs.python.org/3/library/http.server.html#command-line-interface)说明端口和绑定地址参数。

\`\`\`text
py -m http.server 8765 --bind 127.0.0.1
\`\`\`

终端 B 执行一次请求。只对本机地址绕过代理；\`--max-time\` 避免一直等待。

\`\`\`text
curl.exe --noproxy 127.0.0.1 --http1.1 --max-time 5 -v -H "Connection: close" http://127.0.0.1:8765/
\`\`\`

#### 观察与预期

curl 显示连接到 \`127.0.0.1:8765\`，随后显示请求、响应和目录页正文；终端 A 出现访问日志。Python 默认响应可能是 HTTP/1.0，即使客户端请求写着 HTTP/1.1，也不代表 TCP 失败。

#### 常见误区

\`127.0.0.1\` 指当前运行程序所在主机/环境，不是另一台电脑。\`Connection: close\` 是 HTTP 语义，不是“三次握手”的命令。成功日志不等于已经抓到了握手包。

#### 卡住时怎么办

Connection refused：先看终端 A 是否仍在运行及端口是否一致。Address already in use：不要结束不认识的进程，换成 8769 并同步修改本课命令和过滤器。若提示 Python 不存在，按系统官方安装方式准备后再继续。

#### 检查理解

客户端的源端口必须也是 8765 吗？如果收到 HTTP 404，是否说明 TCP 根本没建立？

#### 参考答案

客户端通常由系统选择临时源端口，服务器使用监听端口 8765。收到正常 HTTP 404 响应说明请求已到达某个 HTTP 服务，资源不存在不等于连接未建立。

#### 完成标志

保留一次客户端输出和对应服务器日志，标明目标 IP、目标端口及应用层结果。

### S2 · 在自己的抓包里找到建立、传输与关闭

#### 为什么这样做

把抽象的连接变成一条可以追踪的 TCP 流，观察序号/确认号与正文之间的关系，而不是背固定包数。

#### 工具与操作

1. Windows 在 Wireshark 选择 “Adapter for loopback capture / NPF_Loopback”；Linux 选 \`lo\`，macOS 选 \`lo0\`。
2. 先开始捕获，再在顶部的显示过滤器填写 \`tcp.port == 8765\`，随后重复 S1 的 curl 请求一次。
3. 停止捕获。依次找 SYN、SYN+ACK、ACK、带数据的报文以及 FIN/ACK；展开 TCP 字段看端口、Seq 和 Ack。
4. 右键该连接任一包，选择 Follow → TCP Stream，核对请求和响应；最后保存只用于本课的捕获文件。完成后在终端 A 按 Ctrl+C 停止服务。

显示过滤器与捕获过滤器不是同一种语法；参见 [Wireshark 过滤器指南](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)及 [Follow Stream 官方说明](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html)。

#### 观察与预期

新连接通常能找到三次握手。Wireshark 常显示相对序号；正文按字节推进序号，SYN/FIN 也占序号空间。关闭过程可能合并 ACK，不必正好四个独立包。回环很可靠，通常不会出现重传；没有重传不等于 TCP 没有重传机制。

#### 常见误区

一次 \`write\`、一个 TCP 包和一次应用读取不是一一对应。带数据的包也可带 ACK。HTTP/3 走 QUIC，不能用它来要求出现同样的 TCP 握手；本实验特意使用本机明文 HTTP。

#### 卡住时怎么办

零包先确认选的是回环接口、捕获早于请求、端口未改错；不要转而抓取全部公共 Wi-Fi 流量。没有捕获权限时记录限制，先复查 S1。看不到正文时确认选中了这一条流，而不是别的端口或 TLS 流量。

#### 检查理解

为什么接收端不能把“一个 TCP 包”当成“一个完整 HTTP 响应”？

#### 参考答案

TCP 提供字节流，分段、重组与读取缓冲会改变每次看到的边界。HTTP 必须依据自身格式、长度或连接关闭等规则判断消息边界。

#### 完成标志

在自己的捕获中标出连接四元组、建立阶段、正文和关闭阶段，解释一处 Seq/Ack。没捕获到的阶段明确写缺失，不用示意图冒充实测。

## 完成证据

能根据抓包解释连接建立、数据传输和关闭。

这是完成标准，尚需实际记录支撑。公网路由、主动制造丢包、拥塞与流量控制另开实验，不在本课改网卡、路由表或防火墙。
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

## 开始前

本课约 25 分钟。先知道 HTTPS 在 HTTP 之外增加 TLS 保护；准备一个能够正常访问的公开 HTTPS 站点，示例为 \`example.com\`。不输入账号密码，不导入陌生根证书，不使用 \`-k\`/关闭验证来“解决”报错。

## 学习思路

分开看三件事：证书与域名匹配、证书链是否被当前客户端信任、双方协商了什么连接参数。加密连接不保证网页内容可靠，也不保证域名/IP 等全部元数据不可见。TLS 1.3 的完整握手涉及身份认证和密钥派生，参见 [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446.html)。

## 工具准备

- 桌面 Chrome/Edge 的安全与证书查看界面，S1 不需要额外安装。
- S2 使用发行版仍支持的 OpenSSL 3.x，先执行 \`openssl version\`。命令不存在时使用已有 WSL/Linux 环境或可信系统软件源；不要下载陌生“证书修复器”。
- 没有 OpenSSL 时可完成 S1，并把命令行验证列为待做；浏览器截图不能伪装成 OpenSSL 验证记录。

## 下一步

打开示例 HTTPS 站点，在浏览器证书面板记录匹配的域名和有效期；遇到证书警告先停止并记录原因。

## 学习步骤

### S1 · 找到浏览器信任了哪个身份

#### 为什么这样做

先让“证书”从抽象名词变成可读字段：它声明了什么域名、由谁签发、何时有效，以及客户端显示的验证结果。

#### 工具与操作

1. 打开 \`https://example.com/\`，确认没有越过任何证书警告。
2. 在开发者工具 More tools 中打开 Security / Privacy and security（不同版本名称略有差异），刷新页面后选择主站点。
3. 查看连接协议/密码套件，再点击 View certificate，记录 Subject Alternative Name 中匹配的域名、签发者和有效期。
4. 查看证书路径/链，区分站点叶子证书、中间证书与信任根。步骤见 [Chrome 官方安全面板文档](https://developer.chrome.com/docs/devtools/security)。

#### 观察与预期

能看到客户端报告的 TLS 版本、连接参数和证书信息；字段值会随站点更新而变化，不要求某个固定签发机构或算法名称。浏览器认可的是一组验证条件，不只是“这个证书有个名字”。

#### 常见误区

有 HTTPS 不等于网站诚实；证书公钥也不是浏览器直接拿来加密全部网页的“同一把会话密钥”。企业代理可能使用管理员配置的信任根，不要忽略它与公网证书的区别。

#### 卡住时怎么办

面板空白先在打开面板后刷新；找不到入口时从地址栏站点信息里的“连接安全/证书”进入。出现时间或证书警告，先核对系统时间与网络环境，记录原因并停止，不点击继续访问。

#### 检查理解

证书没过期，但只适用于另一个域名，这个连接应该直接被信任吗？

#### 参考答案

不应该。有效期只是条件之一，还需要域名匹配、合适的用途和可信验证链等；单个条件通过不能替代完整验证。

#### 完成标志

用自己的截图或文字列出站点域名、匹配依据、有效期、验证链和连接参数，说明没有观察到的字段。

### S2 · 让命令行严格检查域名，再做一次反例

#### 为什么这样做

看到“握手连接上了”不等于严格验证通过。OpenSSL 的调试客户端必须明确设置验证要求，才能用失败反例检查理解。

#### 工具与操作

先在终端运行正常域名验证；显示摘要后若仍等输入，按 Ctrl+C 结束，等待不代表握手失败。

\`\`\`text
openssl s_client -connect example.com:443 -servername example.com -verify_hostname example.com -verify_return_error -brief
\`\`\`

再运行下面的反例：仍连接同一站点、发送同一 SNI，但故意要求证书匹配另一个域名。

\`\`\`text
openssl s_client -connect example.com:443 -servername example.com -verify_hostname wrong.invalid -verify_return_error -brief
\`\`\`

\`-servername\` 指定 SNI；\`-verify_hostname\` 指定验证身份；\`-verify_return_error\` 在证书验证出错时终止。它们的职责不同，见 [OpenSSL s_client 官方手册](https://docs.openssl.org/3.0/man1/openssl-s_client/)。

#### 观察与预期

网络和本机 CA 配置正常时，第一条应报告验证成功及协议/套件；第二条应出现 hostname mismatch 等验证错误并失败。若第一条已因网络或未知 CA 失败，不能把第二条失败归因于域名反例。

#### 常见误区

OpenSSL 与浏览器可能使用不同信任库；浏览器成功、OpenSSL 报 unknown issuer，并不自动证明站点证书有问题。SNI 告诉服务器要哪个站点，不自动完成对域名的验证。

#### 卡住时怎么办

连接超时先确认站点可达、代理/企业网络限制。unknown issuer 时记录 OpenSSL 版本和信任库来源，按发行版官方文档维护 CA，或先回 S1；不要加跳过验证选项或随意信任下载的证书。输出含私有域名时先脱敏再分享。

#### 检查理解

在常见的证书认证 TLS 1.3 完整握手中，证书身份、密钥协商和后续数据加密分别承担什么职责？

#### 参考答案

证书及签名用于认证身份，常见的临时密钥交换配合密钥派生得到流量密钥，后续用对称认证加密保护数据。会话恢复/PSK 有不同路径；本次摘要不能直接展示密钥计算全过程。

#### 完成标志

保存成功与域名不匹配两份实际输出，解释为何反例失败；若正常验证前提未满足，明确写“待排查”，不勾成完成。

## 完成证据

能解释浏览器为何信任某个证书，以及握手如何得到对称密钥。

本课提供观察入口，不代表已完成验证。下一步再学习 TLS 1.3 握手消息、证书撤销、恢复会话和密钥派生；不在公开仓库保存私钥、会话密钥日志或账号流量。
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

## 开始前

本课约 30 分钟。先知道服务端必须运行着才能接收请求；不需要 Express、数据库或云服务器。下面只监听 \`127.0.0.1\`，不用密码和真实个人数据。示例是教学服务，不作为生产部署代码。

## 学习思路

先自己写出“请求进来 → 检查方法和路径 → 选择状态码/正文 → 结束响应”，再从客户端观察这些决定。TCP 连上只说明运输通道可用，HTTP 才描述应用怎样处理请求。[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)是方法和状态码的一手定义。

## 工具准备

- Node.js，终端运行 \`node --version\` 确认可用；使用仍受支持的正式版。脚本只用内置 \`node:http\`，无需 \`npm install\`。
- 一个文本编辑器、两个终端。新建独立实验文件夹，文件命名为 \`server.cjs\`，不要保存成 \`server.cjs.txt\`。
- Windows 用 \`curl.exe\`；macOS/Linux 把下方命令的 \`curl.exe\` 改成 \`curl\`。只有浏览器时可以测试 GET，POST 反例留到有 curl 的环境补做。

## 下一步

把 S1 示例保存为独立实验目录中的 \`server.cjs\`，运行 \`node server.cjs\`，先访问一次 \`/hello?name=Baize\`。

## 学习步骤

### S1 · 运行能解释每个分支的最小服务

#### 为什么这样做

先把服务端缩小到一个文件，观察状态码是由代码选择的，而不是浏览器随机生成的。用 \`.cjs\` 明确采用 CommonJS，避免其他项目配置干扰。

#### 工具与操作

用编辑器把下方保存到实验文件夹的 \`server.cjs\`。在同一文件夹的终端 A 运行 \`node server.cjs\`，保持终端打开。[Node HTTP 官方文档](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener)说明 \`createServer\`、\`writeHead\` 与 \`end\` 的用法。

\`\`\`javascript
const http = require('node:http');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787');
  console.log(req.method, req.url);
  let status = 200;
  let body;
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (req.method !== 'GET') {
    status = 405;
    headers.Allow = 'GET';
    body = { error: 'Only GET is supported' };
  } else if (url.pathname !== '/hello') {
    status = 404;
    body = { error: 'Not found' };
  } else {
    body = { message: 'Hello ' + (url.searchParams.get('name') || 'visitor') };
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
});
server.on('error', error => console.error(error.message));
server.listen(8787, '127.0.0.1', () => console.log('Open http://127.0.0.1:8787/hello'));
\`\`\`

浏览器打开 \`http://127.0.0.1:8787/hello?name=Baize\`；再打开 \`/missing\`，不要只改片段 \`#missing\`。

#### 观察与预期

第一个地址返回含 \`Hello Baize\` 的 JSON，第二个返回 \`Not found\`，Network 中状态为 404。浏览器可能另请求 favicon，终端多出一行日志并不表示你的代码循环失控。

#### 常见误区

JSON 正文中的文字不是 HTTP 状态码，二者应分别检查；\`/hello\` 是应用路径，不一定对应硬盘上的同名文件。程序运行后没有回到命令提示符，是因为服务正在等待请求。

#### 卡住时怎么办

找不到模块先确认终端目录和扩展名；端口占用时选择其他空闲端口，同时改代码与访问地址。浏览器拒绝连接先看终端启动错误，别先改状态码。打不开时确认使用 \`http\` 而不是 \`https\`。

#### 检查理解

为什么没有 \`hello\` 文件却能访问 \`/hello\`？\`res.end\` 在这里完成什么？

#### 参考答案

路径交给我们写的回调分支处理；回调动态产生 JSON。\`res.end\` 表示这次响应正文写完，不是结束整个服务器进程。

#### 完成标志

保留成功和不存在路径两次的状态/正文，能按代码指明各自进入哪个分支。

### S2 · 用三种请求核对方法、头部和正文

#### 为什么这样做

让相同连接目标对应不同应用结果，练习区分“连接错误”“HTTP 错误”和“正文内容”。

#### 工具与操作

保持终端 A 运行，在终端 B 逐条执行。\`-i\` 显示响应头，\`-v\` 额外显示请求/连接信息，\`-X POST\` 改方法；本例不提交任何真实数据。参数定义见 [curl 官方手册](https://curl.se/docs/manpage.html)。

\`\`\`text
curl.exe --noproxy 127.0.0.1 --max-time 5 -v "http://127.0.0.1:8787/hello?name=Baize"
curl.exe --noproxy 127.0.0.1 --max-time 5 -i http://127.0.0.1:8787/missing
curl.exe --noproxy 127.0.0.1 --max-time 5 -i -X POST http://127.0.0.1:8787/hello
\`\`\`

把方法、路径、状态码、Content-Type、正文各抄一项。最后在终端 A 按 Ctrl+C 关闭服务，再重复一次 GET 作连接失败对照。

#### 观察与预期

服务运行时依次应为 200、404、405；405 应包含 \`Allow: GET\`。停服后若没有其他程序占用该端口，应连接失败，不会得到本服务的 HTTP 404。头部可能包含运行时自动补充的 Date、连接或分块信息，不要求顺序固定。

#### 常见误区

curl 默认不把所有 HTTP 4xx 当作命令执行失败；不能只用退出码判断业务成功。\`-I\` 是 HEAD 请求，不是“把 GET 的正文藏起来”，本教学服务会拒绝它。不要把 \`-v\` 输出的 \`>\`/\`<\` 符号误当成线上字节。

#### 卡住时怎么办

PowerShell 提示参数不存在时检查是否误用了 \`curl\` 别名。状态不是预期时核对终端日志、请求路径和端口；修改了代码要先 Ctrl+C 再重启。若停服后仍有响应，先确认请求确实指向这个回环端口和当前进程。

#### 检查理解

404 与 405 各说明什么？客户端收到 404 时，HTTP 服务是否一定没有运行？

#### 参考答案

本例 404 表示该路径未提供资源，405 表示服务不接受这个方法。能收到此服务的 404 本身说明它处理了请求；它与完全无法建立连接不同。

#### 完成标志

形成三行请求/响应对照和一条停服结果，能按日志对上请求；再把真正写出的代码与观察作为 PROJECT-001 的候选证据。

## 完成证据

能够实现一个最小 HTTP Server，并解释真实请求和响应字节。

此处列的是标准，不宣称 PROJECT-001 已完成。连接复用、请求体解析、并发、HTTP/2/3 与生产安全是后续深入；本课日志和 curl 文本不是完整抓包。
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

## 开始前

本课约 30 分钟，需要 Linux 环境和 Python 3。Windows 可使用已经安装的 WSL Ubuntu；没有 WSL 时先阅读 [Microsoft 官方安装说明](https://learn.microsoft.com/zh-cn/windows/wsl/install)，安装可能需要管理员权限和重启，不是本课自动执行的操作。macOS 和 Git Bash 不是 Linux，不能用它们的结果冒充 \`/proc\` 实验。

## 学习思路

先把“代码文件”与“运行中的进程”分开，再沿着“进程 PID → 监听 socket → 文件描述符 → 内存映射”找证据。只查看自己创建的服务，不修改 \`/proc\`、系统参数或别人的进程。

## 工具准备

- 以下命令全部在 Linux/WSL 的 Bash 中运行，不是在 Windows PowerShell 中。
- 检查 \`python3 --version\`、\`ps --version\`、\`ss --version\`。\`ps\` 通常来自 procps，\`ss\` 来自 iproute2；缺失时按发行版官方软件源安装，不能因为缺命令就关闭安全限制。
- 准备一个空实验目录及两个 Linux 终端。浏览器或 curl 可作为客户端；若使用 WSL，优先让服务端和 curl 都在同一 Linux 环境，减少跨环境网络差异。

## 下一步

在 Linux/WSL Bash 中按 S1 启动本机服务，再用 \`ps\` 找到与启动参数一致的服务 PID。

## 学习步骤

### S1 · 从监听端口找到自己的服务进程

#### 为什么这样做

磁盘文件不会自己接收请求，运行中的进程要请求内核创建并监听 socket。把端口和 PID 对上，才能知道正在检查哪个程序。

#### 工具与操作

在空实验目录的终端 A 运行只绑定回环地址的服务，并保持打开。

\`\`\`bash
python3 -m http.server 8766 --bind 127.0.0.1
\`\`\`

终端 B 执行下面两条；在 \`ps\` 输出中找完整参数与上面一致的那一行，记下 PID。\`ss\` 选项分别表示监听、TCP、数字地址、进程信息，详见 [ss 手册](https://man7.org/linux/man-pages/man8/ss.8.html)和 [ps 手册](https://man7.org/linux/man-pages/man1/ps.1.html)。

\`\`\`bash
ps -eo pid,ppid,comm,args
ss -ltnp 'sport = :8766'
\`\`\`

再执行 \`curl --noproxy 127.0.0.1 --max-time 5 http://127.0.0.1:8766/\`，核对终端 A 的日志。只记录自己的服务行，不把其他进程参数公开。

#### 观察与预期

\`ss\` 应显示 \`127.0.0.1:8766\` 处于 LISTEN，并在权限允许时显示 python3 的 PID/fd。\`ps\` 显示进程及父进程；服务空闲时可能是睡眠状态，这不表示它挂掉了。

#### 常见误区

PID 是运行实例编号，不是端口号；再次启动可能得到新 PID。一个进程可以有多个 socket，一个监听 socket 也不是每个请求都重新创建一份。

#### 卡住时怎么办

LISTEN 为空先看终端 A 是否报端口占用、是否在相同 WSL 发行版/容器里执行。看得到端口却看不到 PID，可能是权限限制；先确认是自己的进程，不盲目加 sudo。没有 \`ss\` 时先完成 \`ps\`，下一步的 fd 可补充线索，但不要声称已经验证监听状态。

#### 检查理解

为什么服务没收到请求时仍能出现在进程列表？同一个脚本重启后 PID 必须不变吗？

#### 参考答案

进程已经启动并等待内核通知就绪事件，暂时不使用 CPU 不等于不存在。PID 由系统分配，重启后可能变化，也可能在更晚被重用，因此要核对当前命令。

#### 完成标志

记录自己服务的命令、PID、父 PID、监听地址/端口，并用一次请求日志确认查到的确实是这个服务。

### S2 · 查看文件描述符与内存，再观察进程结束

#### 为什么这样做

把“进程占用资源”具体化：文件描述符是进程访问内核对象的编号，虚拟地址空间与实际驻留内存不是同一个数。

#### 工具与操作

把下面第一行的 \`12345\` 手工替换成 S1 刚确认的 PID。只读这些文件，不向其中写入内容。Linux 内核的 [proc 文件系统文档](https://docs.kernel.org/filesystems/proc.html)说明 status、maps 和 fd。

\`\`\`bash
server_pid=12345
ps -p "$server_pid" -o pid,ppid,stat,rss,vsz,args
ls -l "/proc/$server_pid/fd"
grep -E '^(Name|Pid|VmSize|VmRSS|Threads):' "/proc/$server_pid/status"
head -n 8 "/proc/$server_pid/maps"
\`\`\`

记录一个终端描述符和一个 \`socket:[...]\`，比较 VmSize 与 VmRSS。然后在终端 A 按 Ctrl+C，仅停止自己刚启动的服务；回终端 B 重新运行 \`ps -p "$server_pid" -o pid,args\` 和 S1 的 \`ss\` 查询。

#### 观察与预期

通常可见 0/1/2 指向终端，另有 socket 描述符；编号不固定。VmSize 表达虚拟空间，VmRSS 表达驻留内存的近似统计，不要求相等或固定大小。服务退出后自己的监听应消失，原 \`/proc/PID\` 通常不再存在；PID 被重用时必须重新核对命令。

#### 常见误区

maps 中的地址不是直接可拿来测量的物理内存地址；虚拟空间大不等于实际占用了同样多的 RAM。文件描述符不只代表普通磁盘文件，socket 也通过它访问。

#### 卡住时怎么办

No such file 先确认服务没退出、PID 复制正确。Permission denied 时检查用户/容器限制，保留限制说明，不改系统 ptrace 或 \`/proc\` 挂载策略。没有 socket 行时确认查的是服务 PID 而非启动它的 shell。

#### 检查理解

为什么 VmSize 大于 VmRSS 并不能直接判定内存泄漏？关闭监听程序后，为什么还可能看到与它通信过的 TCP 状态？

#### 参考答案

虚拟地址包含映射、预留等，不都驻留 RAM；泄漏需要结合时间趋势与使用情境判断。连接关闭后的某些 TCP 状态由内核维护，不等同于原服务仍在监听。

#### 完成标志

保留 PID、一个 socket fd、两类内存指标与停服前后监听差异，写出“代码 → 进程 → 内核资源”的对应关系，不能只贴一张进程列表。

## 完成证据

能把服务端代码中的关键操作映射到进程和内核资源。

以上记录需亲自完成后补入 PROJECT-001；本文没有宣布项目完成。系统调用跟踪、调度、缺页、共享内存和性能分析是下一层，不因查看几份 \`/proc\` 文件就算已验证。
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

## 开始前

本课约 40 分钟，分三次做也可以。只需理解二进制 0/1 和 \`1 + 1 = 二进制 10\`，不用购买电子元件。本课观察的是编译结果、布尔模型和纸上电路；不会证明你已经测量了真实 CPU 内部晶体管。

## 学习思路

沿“C 加法 → 目标指令 → 加法逻辑 → 晶体管开关模型”逐层缩小问题，再用寄存器/时钟把组合逻辑与状态连接起来。不同层有不同证据，不把一个层次的截图当成所有层次都理解了。

## 工具准备

- S1 可用 [Compiler Explorer 官方站点](https://godbolt.org/)查看公开的小段 C 代码。不要上传工作源码、密钥或私人文件。
- 离线替代：已有 GCC 时运行 \`gcc --version\`，用编辑器创建 \`add.c\`；没有编译器也不想安装时先做 S2，S1 留待补做。
- S2 使用浏览器 Console 或 Node.js；S3 使用纸笔与 [MIT Computation Structures 的 CMOS 教材](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c3/c3s1/)。
- 控制台练习放在空白页或本课实验页，不在已登录账号的页面执行。先读懂下面的纯计算代码；若浏览器拦截粘贴，不输入解除保护的口令，可手工列真值表或用本机 Node.js 验证。

## 下一步

在 Compiler Explorer 或本机 GCC 中编译 S1 的 \`add\` 函数，先找到函数标签和返回前计算结果的位置。

## 学习步骤

### S1 · 看一行加法怎样变成目标指令

#### 为什么这样做

先区分“高级语言表达的意图”与“编译器选出的机器操作”，避免把每一行 C 当成固定的一条指令。

#### 工具与操作

在 Compiler Explorer 选择 C 和一个 x86-64 GCC 编译器，输入下面的代码；先用编译选项 \`-O0\`，再改为 \`-O2\`，记录编译器版本和架构。

\`\`\`c
unsigned add(unsigned a, unsigned b) {
    return a + b;
}
\`\`\`

离线时将同样内容保存为 \`add.c\`，在该文件夹运行下面两条，再用编辑器打开 \`.s\` 文件。\`-S\` 只生成汇编，不链接可执行程序，所以这里不需要 \`main\`。选项参见 [GCC 总体选项](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)及 [优化选项](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)。

\`\`\`text
gcc -O0 -S -o add-O0.s add.c
gcc -O2 -S -o add-O2.s add.c
\`\`\`

#### 观察与预期

找到 \`add\` 函数标签及返回前计算结果的指令。优化版可能更短，也可能用 \`lea\` 而不是名字里含 \`add\` 的指令；架构、编译器和 ABI 不同会改变输出。这里得到的是编译产物，没有执行程序或计时。

#### 常见误区

汇编中的寄存器名不是 C 变量名；某些指令可以完成多种算术用途。更多汇编行不必然更慢，\`-O2\` 也不等于所有程序都刚好快两倍。

#### 卡住时怎么办

看到 “undefined reference to main” 时确认加了 \`-S\`，没有进入链接阶段。输出完全不同先检查是否选择了 C、目标架构和同样选项。不要先强行背所有寄存器，只圈出数据进入、计算与返回的位置。

#### 检查理解

为什么不能从 \`return a + b\` 直接断言“CPU 一定执行一条 ADD，并用一个时钟周期完成”？

#### 参考答案

编译器可选择不同指令序列，具体执行还受架构、微架构和数据依赖等影响。源码、汇编和真实时序是不同层次，必须各自观察。

#### 完成标志

保存同一函数两组选项下的汇编，标出一处实际差异或说明没有差异；明确这不是性能测试结果。

### S2 · 用八组输入验证一位全加器

#### 为什么这样做

先只处理一位加法：输入两个数据位和一个进位，输出和位与新进位。多个位可以组合成更宽的加法器，这是理解 ALU 的小入口，不是完整 CPU。

#### 工具与操作

先在纸上预测 \`(a,b,cin) = (1,1,1)\` 的结果，再在 Console 运行下面的纯计算代码。\`^\` 是按位异或，\`&\` 是与，\`|\` 是或；不要换成 \`&&\` 或把 \`^\` 当乘方。

\`\`\`javascript
{
  const rows = [];
  for (const a of [0, 1]) for (const b of [0, 1]) for (const cin of [0, 1]) {
    const sum = a ^ b ^ cin;
    const carry = (a & b) | (cin & (a ^ b));
    rows.push({ a, b, cin, sum, carry });
    console.assert(sum + 2 * carry === a + b + cin, 'Mismatch', a, b, cin);
  }
  console.table(rows);
}
\`\`\`

把公式画成两个 XOR、两个 AND 和一个 OR 组成的逻辑框图。想用真正的逻辑模拟器时，再做 [Nand2Tetris 官方 Project 2 的 FullAdder](https://www.nand2tetris.org/project02)，使用它提供的测试而不是自行宣称通过。

#### 观察与预期

应得到八行且没有断言失败。\`1+1+1\` 的十进制结果是 3，因此 \`sum=1, carry=1\`；\`1+1+0\` 对应 \`sum=0, carry=1\`。输出总值按 \`sum + 2 × carry\` 解释。

#### 常见误区

这段 JavaScript 在现有计算机上验证布尔关系，不是在创建实体逻辑门。真值表正确也不能证明电路延迟、功耗或时序满足要求。

#### 卡住时怎么办

先只代入一组输入手算，核对括号和运算符；出现语法错误时检查是否混入代码围栏。不能用 Console 时手工列出八组输入也可，但要写清“手工验算”，不要写成模拟器实测。

#### 检查理解

为什么必须有 \`carry\`？把两个一位加法器接成两位加法器时，应连接什么？

#### 参考答案

一位 \`sum\` 只能表示 0/1，超过一位的部分由 \`carry\` 表达。低位的 \`carry\` 接高位的 \`cin\`；多位的进位传播还会带来延迟问题。

#### 完成标志

独立解释八行中的至少两行，并画出两位连接图；保存的是逻辑验证证据，不是硅片测试证据。

### S3 · 用 CMOS 反相器连接逻辑与物理

#### 为什么这样做

逻辑 0/1 由约定的电压范围表示。先理解一个反相器怎样把输入变成相反输出，再讨论更复杂逻辑，不需要从半导体方程开始。

#### 工具与操作

打开工具准备中的 MIT 教材，找到 “CMOS Inverter VTC” 图。纸上画电源 VDD、地 GND、输出节点，以及连接上拉的 PFET 和连接下拉的 NFET；两者栅极都接输入。仅做纸上推演，不接市电或未知硬件。

在理想稳态开关模型中分别填写两行：输入为低电平/高电平时，哪只管导通，输出接向电源还是地？然后在 S2 的加法逻辑前后各画一个“寄存器”方框，标出数据输入、组合计算和时钟采样的方向。

#### 观察与预期

理想模型下，低输入使 PFET 导通、NFET 关闭，输出被上拉；高输入相反，输出被下拉。这是对教材电路的推导，不是本机测到的波形。加法器本身不负责保存上一次结果，寄存器提供状态；实际采样必须满足时序约束。

#### 常见误区

“晶体管像开关”是便于入门的近似：切换并非瞬间，真实电路存在电容、延迟和功耗。CPU 也不是简单地让每条指令依次通过同一条没有控制信号的门链。

#### 卡住时怎么办

不懂器件细节时先只记“谁把输出接向哪一边”，能完成两行表即可。不要强行把高电平固定为 5V；电源和逻辑电平取决于工艺。时钟难理解时先区分“当前输入算出结果”与“把结果存到下一时刻”。

#### 检查理解

为什么仅有组合加法逻辑不能保存计算历史？本课哪项证据能证明真实 CPU 的晶体管延迟？

#### 参考答案

组合逻辑输出由当前输入决定，保存状态需要存储元件及相应控制。这里没有晶体管时序实测，汇编和真值表都不能替代它。

#### 完成标志

画出反相器两种稳态及“寄存器 → 组合逻辑 → 寄存器”，分别注明已观察的编译输出、已验证的布尔关系和仅作推导的电路模型。

## 完成证据

能解释一条指令如何由组合逻辑与时序逻辑执行，并形成后续 CPU / IC Route Seed。

这是待完成标准，并不自动创建 Route Seed 或认定已掌握 CPU。完成入门后可选取指/译码、ALU、寄存器时序或 CMOS 模拟中的一个方向继续；流水线、乱序执行、器件物理和芯片设计仍在本课边界之外。
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
`}],m={schema:c,sourceSchema:a,sourceUpdated:l,state:d,entities:p,files:h};let r=m;const s=new Map(r.entities.map(n=>[n.id,n]));function u(n){r=n,s.clear(),n.entities.forEach(e=>s.set(e.id,e))}function T(n){return n?s.get(n):void 0}function g(n){return r.entities.filter(e=>e.kind===n)}function i(n,e){return n.fields[e]}function P(n,e){const t=i(n,e);return typeof t=="string"?t:""}function C(n,e){const t=i(n,e);return typeof t=="number"?t:void 0}function w(n,e){const t=i(n,e);return Array.isArray(t)?t:typeof t=="string"&&t?[t]:[]}function S(n){return n.map(e=>s.get(e)).filter(e=>!!e)}function L(n){const e=Object.entries(n.fields).flatMap(([t,o])=>!t.endsWith("_id")&&!t.endsWith("_ids")?[]:Array.isArray(o)?o:typeof o=="string"?[o]:[]);return S([...new Set(e.filter(Boolean))])}export{g as getTechOsEntities,T as getTechOsEntity,i as getTechOsField,w as getTechOsIds,C as getTechOsNumber,L as getTechOsRelations,P as getTechOsString,u as replaceTechOsIndex,S as resolveTechOsIds,r as techOsIndex};
