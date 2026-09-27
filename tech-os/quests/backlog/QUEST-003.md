---
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

- Windows 打开 PowerShell，使用系统 `nslookup`；macOS/Linux 可用 `nslookup`，已装 BIND 工具时也可用 `dig`。
- 命令找不到时先查系统的官方软件源，不运行来路不明的一键安装脚本。没有命令行权限时先阅读本课并记录待做项。
- 示例使用 `example.com`，只记实际输出。关联的 LAB-001 是后续完整记录位置，本文不会把它自动标记完成。

## 下一步

执行一次 `nslookup -type=A example.com`，先在输出中分别标出解析服务器和目标答案，再继续 S1。

## 学习步骤

### S1 · 区分解析服务器和解析答案

#### 为什么这样做

初学时最容易把输出顶部 DNS 服务器的地址误认为网站地址。先读懂一次查询，再讨论多层缓存。

#### 工具与操作

在同一个终端逐条执行，记录 Server/Address 和回答区的 Name/Addresses；命令来自 [Microsoft nslookup 文档](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup)。

```text
nslookup -type=A example.com
nslookup -type=AAAA example.com
nslookup -type=NS example.com
```

已有 `dig` 时，等价起点是 `dig example.com A`、`dig example.com AAAA` 和 `dig example.com NS`。

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

先执行两次下面的命令，中间等十余秒，找到回答中的 TTL（生存时间）；若输出太长，用终端查找 `ttl`。

```text
nslookup -debug -type=A example.com
```

再从 S1 的 NS 回答中选一个完整名称，手工替换下面的 `AUTH_SERVER` 后执行；不要原样输入占位词。第二个位置指定本次直接询问的 DNS 服务器，不修改系统设置。

```text
nslookup -debug -type=A example.com AUTH_SERVER
```

已有 `dig` 且网络允许直接 DNS 查询时，可额外运行 `dig +trace example.com A`。它是工具自己从根开始做迭代查询，不是旁观系统递归服务器内部；参见 [BIND dig 手册](https://bind9.readthedocs.io/en/v9.20.11/manpages.html#dig-dns-lookup-utility)。

#### 观察与预期

缓存回答 TTL 可能下降，也可能因负载均衡、刷新或不同缓存节点而不降。直接查询成功时可检查是否有 authoritative/AA 标志；`+trace` 通常显示多级转介，但受防火墙限制时可能中止。

#### 常见误区

`nslookup`/`dig` 的查询不能直接代表浏览器的缓存或 DoH 行为。第二次更快不等于“浏览器缓存命中”；TTL 没下降也不能单独证明没有缓存。

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
