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

## 学习目标

用一次真实导航回答：地址栏收到输入后，浏览器在什么位置决定 URL、缓存和 Service Worker，什么时刻才跨过网络边界，以及收到 HTML 后什么时刻进入渲染流程。

预计分 7 次完成，每次 25–45 分钟。页面中的 S1–S7 可以逐项打卡；打卡只保存在当前浏览器，不会自动把 Quest 宣称为完成。

## 总流程

```text
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
```

### S1 · 分清地址栏输入和导航入口

**学什么：**地址栏既能接收 URL，也能接收搜索词；点击链接、提交表单、执行 `location.assign()`、刷新和前进后退也会触发导航，但入口和历史记录行为不同。

**动手做：**分别输入 `example.com`、`https://example.com`、一段搜索词；再用链接点击、刷新和前进后退访问同一页面。在 DevTools Network 中打开 Preserve log，记录每次是否出现新的 Document 请求。

**完成标志：**写出至少 5 种导航入口，并能说清哪些一定产生新的 Document 请求、哪些可能只改变当前文档。

### S2 · 拆解 URL 与同文档导航

**学什么：**scheme、host、port、path、query 和 fragment 的职责，以及默认端口、相对地址、百分号编码和 fragment 不发送给服务器的原因。

**动手做：**在控制台用 `new URL(value, base)` 解析 8–10 个例子；对同一页面分别改变 query 和 fragment，观察 Network 与地址栏。

**完成标志：**完成一张 URL 字段表，并能预测“改 query”和“改 fragment”分别会不会产生新的 Document 请求。

### S3 · 找到导航提交前的决策

**学什么：**浏览器在真正联网前会处理安全策略、重定向历史、导航取消、同文档判断和已有连接等信息；不要把“输入网址”等同于“立刻发 HTTP”。

**动手做：**在 Network 中比较正常导航、立即按 Esc 取消、页面内锚点和 301/302 重定向。为每种情况标出第一个 Document 条目出现的位置。

**完成标志：**画出一张“输入 → 导航提交”的决策图，至少包含 URL/搜索判断、同文档判断、取消和重定向。

### S4 · 区分内存缓存、HTTP 缓存与重新验证

**学什么：**memory cache、disk cache、fresh/stale、`Cache-Control`、`ETag`、`Last-Modified`、304，以及 DevTools 的 Disable cache 只在 DevTools 打开时生效。

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
- 把仍然不会的问题加入 `questions/`，不要为了完成而假装已经理解。

## 当前结论

待学习后补充。建议按“浏览器内部决策 / 网络边界 / 渲染边界”三段记录，不复制教程原文。

## 下一步

先完成 S1：打开 DevTools Network，保留日志，比较地址栏输入、点击链接、刷新和前进后退是否产生新的 Document 请求。

## 完成证据

尚未形成。完成后在这里记录流程图、Network/Performance 截图或笔记的位置，以及一次不看资料的口头复述结果。

## Open Questions

在实验过程中新增到 `questions/`。
