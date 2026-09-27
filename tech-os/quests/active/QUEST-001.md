---
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

本课导航实验页由上方按钮打开。它提供同源链接、GET 表单、查询参数和页内锚点，不注册 Service Worker，不调用外部 API。它与 `example.com` 都不承诺出现 301/302、304、某种缓存命中或离线可用。实验页可能受到所在站点已有 Service Worker 的控制，需要到 S5 实测，不能仅凭“本页未注册”排除。

本文中的记录表是空白作业，参考答案只是自测提示，不是你已经完成的证据。打卡、保存笔记和正式提交完成是不同操作。

## 学习目标

做完后，你能用一份自己的记录解释：导航入口怎样形成 URL；哪里可能复用现有文档或响应；哪里真的需要网络；HTML 怎样变成可见内容。

先认识四个词：URL 是资源地址；请求是浏览器索取资源的消息；响应是对方返回的状态、头部和内容；Document 是页面文档这一资源类型，不是“所有请求”的别名。

## 学习思路

每一步都按“先预测 → 只改一个条件 → 看记录 → 解释差异 → 不看答案自测”进行。把“我看见的事实”和“我的解释”分开写；没有观察到的现象填“未观察到”，不填推测数值。

这张图是阅读地图，不是每次导航都会完整经历的固定流水线：

```text
入口与 URL
├─ 同文档变化 / 历史恢复：可能直接继续使用文档
└─ 需要取得文档响应
   ├─ Service Worker / HTTP 缓存等可能提供响应
   └─ 需要网络：名称解析、连接、发送、接收
      └─ 若收到 HTTP 重定向，再处理新地址
→ HTML 解析与资源发现（可能与下载交错）
→ 样式、布局、绘制、合成 → 可见内容
```

## 工具准备

1. 用桌面 Chrome 或 Edge 打开本课程，再通过上方按钮打开“导航实验页”。把课程留在一个标签页，实验放在另一个；不要在登录着邮箱、网银或 GitHub 管理后台的页面做实验。
2. 准备本地记事本，写下日期、浏览器名称/版本、实验页完整地址。证据优先使用文字或只含实验页的局部截图，不导出或上传含 Cookie、Token、个人 URL 的 HAR/完整性能日志。
3. 实验页内右键空白处 → 检查（Inspect），打开开发者工具。找到 Network（网络）；标签被折叠时从 `>>` 或“更多工具”中选择。Edge/Chrome 的图标位置和中文译名可能略有不同。
4. 本课不要求清除浏览器全部数据、不安装扩展、不绕过证书警告。控制台只用文中解释过的短小只读表达式；不粘贴网上来历不明的脚本，也不输入允许粘贴的口令来绕过安全提示。不想用控制台可以完成对应的手工拆解。

工具说明：[Chrome Network 入门](https://developer.chrome.com/docs/devtools/network/)、[Edge Network 入门](https://learn.microsoft.com/en-us/microsoft-edge/devtools/network/)。控制台风险说明：[Chrome Self-XSS 防护](https://developer.chrome.com/blog/self-xss)。

### S1 · 分清地址栏输入和导航入口

#### 为什么这样做

同样是“页面变了”，有的动作取得新文档，有的只滚动到当前页面某处。先识别入口，再谈网络，否则容易把每次点击都当成重新下载网页。

#### 工具与操作

1. 在实验页复制地址，去掉末尾 `?` 之后的查询串和 `#` 之后的片段，记为“基准地址”。保留协议、域名、端口和完整路径，不要把它改成教程中的示例域名。
2. 打开 Network，确认左上角录制圆点处于录制状态（通常为红色）。点击旁边的清空日志按钮（Clear，通常为斜杠圆圈）。这只清当前面板的请求列表，不是清浏览器数据。
3. 勾选 Preserve log（保留日志）；暂不勾选 Disable cache（停用缓存）；限速选 No throttling（不限速）。清空 Filter 文本框，点击 Doc/Document 类型。找不到类型按钮时点漏斗显示筛选栏，或在 Filter 输入 `resource-type:document`。
4. 按 Ctrl+R 刷新实验页。点击新增的文档行，在 Headers → General 读 Request URL、Request Method、Status Code；核对 Type 是 document。把地址与状态抄到表中。出现文档行并不自动证明通过互联网下载，缓存来源将在 S4 判断。
5. 点击实验页的普通同源链接，目标含 `?visit=link`。先看地址栏，再看新文档行。完成记录后，回到基准地址；等加载结束，清日志，再开始下一个动作。
6. 在实验页的 GET 表单输入 `network` 并提交，找 URL 中的 `keyword=network`。只用这个无敏感内容的示例词；GET 表单数据会出现在地址中。记录文档行和方法，不把表单当作必然的后台 API 请求。
7. 回到基准地址并清日志，点击通向 `#section-two` 的页内锚点。看是否滚动、URL 是否多出片段、新文档行是否增加。随后分别后退、前进各一次，记录具体动作，别只写“点了返回”。
8. 最后另开一个只做公开访问的标签页，依次在地址栏输入 `example.com`、`https://example.com/`、`浏览器导航原理`。记录最后落到的域名：前两个通常访问网站，第三个通常交给默认搜索引擎；自动补全、默认引擎与安全策略会影响结果。不必登录搜索网站，也不必点击搜索结果。

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

1. 为什么清日志后，点击 `#section-two` 可以看到地址变化却看不到新 Document？
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

1. 回到实验页基准地址，Network 按 S1 设置并清日志。点击查询参数示例，或在基准地址后输入 `?topic=network&sample=1` 回车。对照实验页的 URL 字段显示，记录 protocol、hostname、port、pathname、search、hash。
2. 再清日志，只在当前地址末尾加 `#section-two` 回车，不改其他字符。观察字段变化与 Document 行数。片段在 HTTP 请求目标中不会被发送；对照上一条真实请求的 Request URL，而不是把地址栏当请求报文。
3. 再清日志，把 `sample=1` 改成 `sample=2` 回车，保持路径不变。记录是否发起文档导航。这是地址栏导航实验，不是用 `history.pushState()` 修改地址的实验。
4. 在笔记中手工拆解下面这条“仅用于解析”的地址；不要实际访问它的 8443 端口。先填写字段表，再看参考答案。

```text
https://example.com:8443/learn/page.html?q=hello%20world&lang=zh#section-two
```

| 字段 | 你填写的值 | 你认为它负责什么 |
| --- | --- | --- |
| protocol | 待填写 | 待填写 |
| hostname | 待填写 | 待填写 |
| port | 待填写 | 待填写 |
| pathname | 待填写 | 待填写 |
| search | 待填写 | 待填写 |
| hash | 待填写 | 待填写 |

5. 可选验证：在实验页 DevTools 选择 Console（控制台），读懂后手动输入下面第一行并回车，展开得到的 URL 对象查看属性。它只解析字符串，不发起请求、不读取账户或修改存储。第二行只读取解析后的参数；若出现粘贴安全警告，不绕过它，可继续做手工练习。

```js
new URL("https://example.com:8443/learn/page.html?q=hello%20world&lang=zh#section-two")
new URL("https://example.com/?q=hello%20world").searchParams.get("q")
```

6. 再预测下表八个输入；可逐条手动输入 `new URL("输入", "基准")` 检查，完整绝对地址可省略第二参数。只比较 `href`、`port`、`pathname`、`search`、`hash`，不执行任何导航代码。

| 输入 | 相对地址所用基准 | 重点观察 |
| --- | --- | --- |
| `https://EXAMPLE.com:443/` | 不需要 | 主机名和默认端口怎样规范化 |
| `https://example.com:8443/a` | 不需要 | 非默认端口是否保留 |
| `../notes` | `https://example.com/learn/page.html` | 相对路径怎样合并 |
| `/notes` | 同上 | 以 `/` 开头从哪里算 |
| `?q=two` | 同上 | 路径会不会保留 |
| `#section-two` | 同上 | 哪个字段改变 |
| `https://example.com/?q=hello%20world` | 不需要 | search 原文与解码后的 q 值 |
| `https://example.com/学习` | 不需要 | href 中的百分号编码 |

#### 观察与预期

默认 HTTPS 端口 443 会规范化为 `port` 空字符串，不是“没有端口”；`host` 会含非默认端口，`hostname` 不含。`search` 带 `?`，`hash` 带 `#`。实验页改 query 的普通导航与只改 fragment 的同文档变化应分开记录。

#### 常见误区

把 `?` 后所有内容都当路径；认为 `%20` 是加密；把 `new URL()` 当作下载命令；以为 fragment 天生保密。片段虽不随该 HTTP 请求发送，页面脚本仍能读到它，不能用来隐藏密码。

#### 卡住时怎么办

`Invalid URL`：检查英文引号、协议和相对地址是否给了绝对基准。默认端口栏空白不用“修复”。只改片段却多出文档行：确认之前加载已完成、路径/query 未一起改、日志已清空；无法排除时记“待复查”，不要删掉反例。

#### 检查理解

1. 上面长 URL 的六个字段分别是什么？哪部分不会作为 HTTP 请求目标发送？
2. `../notes` 的最终路径是什么？`searchParams.get("q")` 读到的是 `%20` 还是空格？

#### 参考答案

1. 依次是 `https:`、`example.com`、`8443`、`/learn/page.html`、`?q=hello%20world&lang=zh`、`#section-two`；最后的 fragment 不随该请求发送。
2. 路径为 `/notes`；q 的解码值是 `hello world`。这些是解析规则的答案，不是你设备上的网络实验结果。

#### 完成标志

完成六字段表、八个解析预测和 query/fragment 的两组对照；能解释“URL 字符串变化”为什么不等于“必定新建文档或外网传输”。

参考：[MDN URL 属性](https://developer.mozilla.org/en-US/docs/Web/API/URL)、[URL 构造与相对地址](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)、[fragment 的边界](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)。

### S3 · 找到导航提交前的决策

#### 为什么这样做

“准备导航”“取得响应”“用新文档替换当前文档”不是同一个时刻。取消可以发生在不同阶段；HTTP 301/302 则是响应到达后的决定，不应画成所有请求之前必做的检查。

#### 工具与操作

1. 在实验页清日志，点击锚点做一次同文档变化，再清日志点击普通链接。分别记录新 URL 与是否出现 document。
2. 为观察取消，Network 限速选 3G 或 Slow 4G，暂时勾选 Disable cache；加载基准地址后立即按 Esc，或点地址栏旁的停止加载按钮。记录实际结果：取消、已完成或未捕捉到。结束后恢复 No throttling 并取消 Disable cache。
3. 读取下方 MDN 重定向说明，手画教学例子：`请求 A → 响应 302 + Location: B → 请求 B → 响应 200`。给它标注“文档示例，非本机抓包”。本课静态页没有承诺提供 302；不要把点击链接后的 200 伪称为重定向。
4. 若你在公开测试访问中恰好看到 301/302，可选中该行核对 Headers 的 Location 与下一行 URL；没有就写“真实重定向证据待补”。浏览器内部 HTTPS 升级也不能直接当成服务器返回的 301/302。

#### 观察与预期

取消可能来不及，或者请求已发送但响应未完整收到；Network 没显示完整页面不代表服务器没收到请求。同文档锚点是本课稳定对照，取消耗时和重定向不是。

#### 常见误区

把 `(canceled)` 当成 HTTP 状态码；把 HTTP 重定向、点击新链接、脚本改地址混为一谈；只凭 DevTools 一行记录推断浏览器全部内部事件。

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

1. 选择实验页或公开的 `https://example.com/`，固定同一个 URL，不添加随机参数。回到 Network → Document，No throttling，取消 Disable cache，加载一次作为基线。
2. 清日志，普通刷新；选择 document，在 Headers 记录响应的 Cache-Control、ETag、Last-Modified、Age，缺失写“无”。再看请求是否带 If-None-Match 或 If-Modified-Since。
3. 清日志，执行一次“硬重新加载”（Windows 通常 Ctrl+Shift+R）。不要选择“清空缓存并硬重新加载”，不清浏览器全部数据。记录同一组字段。
4. 勾选 Disable cache，保持 DevTools 打开，再清日志并普通刷新；记录第三组。结束后取消该选项。这个开关针对浏览器缓存，不是删除文件，也不等于清空 Service Worker 的 Cache Storage。

| 条件 | Status / Size 来源原文 | Cache-Control / 验证器 | 条件请求头 | 本次能支持的结论 |
| --- | --- | --- | --- | --- |
| 普通刷新 | 待填写 | 待填写 | 待填写 | 待填写 |
| 硬重新加载 | 待填写 | 待填写 | 待填写 | 待填写 |
| Disable cache 后刷新 | 待填写 | 待填写 | 待填写 | 待填写 |

#### 观察与预期

可能三次都是 200，也可能显示缓存来源或 304；由资源策略、验证器、浏览器与托管环境决定。`no-cache` 允许保存但复用前要验证；`no-store` 要求不要保存。304 表示验证后可复用已有内容，不携带被请求资源的完整表示正文。

#### 常见误区

把 `no-cache` 理解为“绝不存储”；为了看到 304 给 URL 乱加参数（这会改变缓存键）；把缓存里的 200 当成刚收到的 200；把 Cache Storage 当作 HTTP 缓存。

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

```js
navigator.serviceWorker?.controller?.scriptURL ?? "未被控制"
```

3. 想做正对照时，从下方 MDN 文档的 Demo 区域打开它提供的在线演示，仅在演示标签操作。先在线完整加载、等待安装/激活，再普通刷新一次，重新查控制者。外部演示访问失败或不受控制时就暂停，不寻找来历不明的替代脚本。
4. 仅当演示页确认受控，去 Application → Cache Storage 查是否有与页面资源 URL 对应的条目；再回 Network 清日志刷新，观察 Size/来源及 Timing 的 ServiceWorker 信息。没有这些证据时不要声称“响应一定来自 Cache Storage”。
5. 可选三组对照：在演示标签保持 Disable cache 开启，先在线刷新；再选 Offline 刷新；最后保持 Offline 并勾选 Bypass for network 再刷新。只记录实测能否加载与来源。完成后立刻取消 Offline、Bypass for network、Disable cache，恢复 No throttling。不需要卸载 Worker 或清空任何站点存储。

#### 观察与预期

首次注册不一定立即控制当前页面。受控演示若已有匹配缓存，可能在 Offline 时仍能响应；Bypass for network 绕过 Worker，配合禁用 HTTP 缓存和 Offline 后通常无法重新取得页面。此结论以该演示缓存策略和请求确实被拦截为前提，不适用于所有网站。

#### 常见误区

把“注册了”当成“当前页面被控制”；看到 Cache Storage 中有文件就认定这次用了它；把离线失败当成 SW 一定没安装；在自己的导航站随手清存储，连笔记和进度也一起清掉。

#### 卡住时怎么办

面板为空并不异常。记录“此环境没有可见注册/控制者”，先完成负对照。演示激活但 controller 为空，可确认 scope 和 URL 后普通刷新；仍为空则记录浏览器限制/状态。别在 HTTP 公网站点或 `file:` 页面上强行注册；也不关闭安全策略。

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

1. 本地 `127.0.0.1` 实验页不适合观察公网 DNS/TLS。另开公开 `https://example.com/`，打开 Network、Doc 筛选、No throttling，勾选 Disable cache 后刷新。
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
- 在下方写自己的结论与证据，再使用正式完成操作；剩余疑问可以进入 `questions/`。

## 当前结论

尚未填写。请用自己的话补充：我已能解释什么；哪条实测支持它；哪些还只是猜测。不要把上面的参考答案直接当作个人结论提交。

## 下一步

先打开上方“导航实验页”，按 S1 设置浏览器开发者工具的 Network 面板，完成第一条刷新记录。今天做到能独立找到 Document 行即可，不急着阅读七步所有答案。

## 完成证据

尚未形成。学习后填写日期、浏览器版本、实验 URL、操作、实际观察、证据位置与未验证项。公开提交前检查截图和地址不含个人信息；不要上传敏感 HAR、Cookie、Token 或账户页截图。

## Open Questions

尚未填写。遇到卡点时记录“我停在 S几的第几项、期望看到什么、实际看到什么、已经试过什么”，再按需新增到 `questions/`。
