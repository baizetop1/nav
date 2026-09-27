---
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

本课约 20 分钟。先会打开开发者工具即可，不需要安装 Node.js，也不需要真实账号或 Token。使用本课的“打开导航实验页”按钮；不要在导航 CMS 的 `#/tech-os` 路由上修改片段，否则会切换工作台页面。

## 学习思路

先把地址拆成字段，再只改变一个字段看浏览器行为。区分“地址字符串变了”“换了一份文档”“真的向服务器发了请求”，这三件事并不等价。浏览器 URL API 以 [WHATWG URL 标准](https://url.spec.whatwg.org/#api)为准。

## 工具准备

- 桌面 Chrome 或 Edge，按 F12 打开 Console 和 Network。手机可以先看实验页自显字段，网络证据留到电脑补做。
- 实验页提供 query 链接、`#section-two` 锚点和 GET 表单。若按钮尚不可用，可以先做 S1 的纯字符串解析；不要把未做的网络观察记为已完成。
- 准备两条记录：原始地址、改动后地址；不填写密码等敏感内容。

## 下一步

打开本课导航实验页，完成 S1 的 URL 字段解析，先记下协议、主机、路径、查询和片段各是什么。

## 学习步骤

### S1 · 拆开一个地址并预测相对链接

#### 为什么这样做

地址不是一串只能整体记住的文字。协议和主机帮助确定访问目标，路径和查询参数表达资源请求，片段通常用于客户端定位。

#### 工具与操作

在实验页 Console 执行下面的只读代码。花括号让重复执行不发生变量重名；`new URL` 只解析字符串，不访问这个站点。

```javascript
{
  const u = new URL('https://EXAMPLE.com:443/docs/start?q=hello%20world#intro');
  console.table({
    href: u.href, protocol: u.protocol, hostname: u.hostname,
    port: u.port, pathname: u.pathname, search: u.search,
    hash: u.hash, q: u.searchParams.get('q')
  });
  console.log(new URL('../next?x=1', u).href);
}
```

再执行 `new URL(location.href).pathname`，和实验页显示的当前路径对照。

#### 观察与预期

主机名变为 `example.com`，HTTPS 默认端口 `443` 被规范化为空字符串；`q` 的值是 `hello world`，而 `search` 保留编码形式。相对地址解析为 `https://example.com/next?x=1`。这些是解析结果，不是服务器返回的结果。

#### 常见误区

`hostname` 不含端口，`host` 可以含端口；空 `port` 不等于没有端口。`%20` 是编码，不是加密。不能仅凭字符串长得像网址就断定它可信。

#### 卡住时怎么办

若出现语法错误，检查是否复制了代码围栏或中文引号。若 Console 阻止粘贴，先读懂代码并逐行手输，不要为未知代码关闭安全保护。没有开发者工具时先手工标出五部分。

#### 检查理解

为什么 `../next` 不接在 `/docs/start/` 后面？`443` 被省略后，访问协议是否变了？

#### 参考答案

基准路径 `/docs/start` 最后一段作为当前资源名，先取所在目录 `/docs/`，再由 `..` 回到根目录。协议仍是 HTTPS，省略的是它的默认端口表示。

#### 完成标志

保留字段输出，并在运行前独立预测另一个相对链接 `./next` 的结果；能解释实际结果与预测是否一致。

### S2 · 对比片段、查询参数和表单提交

#### 为什么这样做

片段在解引用前被分离，不属于发给服务器的 HTTP 请求目标；但页面脚本仍能读取它，它不是保密容器。参见 [RFC 3986 第 3.5 节](https://www.rfc-editor.org/rfc/rfc3986.html#section-3.5)。

#### 工具与操作

1. 在实验页打开 Network，确认录制已开启、没有遗留过滤条件，选 Doc 并清空列表。
2. 点击指向 `#section-two` 的页内链接，记录地址、滚动位置和新增文档请求数。
3. 点击带 `?topic=network&sample=1` 的链接，再点新增文档行的 Headers，查看 Request URL。
4. 在 GET 表单输入 `hello world` 并提交，比较地址中的 `keyword` 与页面解码后的参数。只使用测试文字。

面板具体操作可对照 [Chrome 官方 Network 教程](https://developer.chrome.com/docs/devtools/network/)。

#### 观察与预期

纯锚点跳转通常只更新片段和滚动，不重新加载主文档。查询参数/表单导航会改变请求目标；文档可能来自网络、缓存或服务工作线程，不能保证每次都有真实网络传输。请求目标不含 `#section-two`；表单空格可能显示为 `+`，解码后仍是空格。

#### 常见误区

不要把图片、favicon 请求当成主文档请求，也不要用地址栏里包含 `#` 来证明服务器收到了它。只看到 200 不能证明走了网络，更不必追求出现 302 或 304。

#### 卡住时怎么办

若列表没有记录，先刷新一次验证录制和 Doc 过滤器；检查是否选错标签页。若结果受缓存影响，记录 Size/来源后再做一次对比，不要清空整个浏览器数据。实验页不可用时先保留问题，网络步骤暂不打卡。

#### 检查理解

把查询里的 `keyword=hello` 改成片段 `#keyword=hello`，普通服务器端查询参数解析还能读到它吗？

#### 参考答案

不能直接读到片段。客户端脚本可以主动把片段放进另一次请求，所以“默认不发送”不等于“绝不可能泄露”。

#### 完成标志

记录锚点与查询导航各一次的真实观察，明确哪些是网络证据、哪些只是地址变化；不要求状态码固定。

## 完成证据

能解释 URL 各部分由谁处理，以及 fragment 为什么不会发送给服务器。

以上是待完成标准，不代表已经验证。后续再比较 Node.js URL、服务器日志与特殊协议；本课不覆盖全部 URL 安全和规范化边界。
