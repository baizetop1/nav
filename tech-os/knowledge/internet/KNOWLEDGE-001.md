---
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

`ROUTE-001` 从 URL 进入网络连接前必须先确定目标地址。

## 目前理解到什么程度？

L0：知道浏览器、本机 resolver、递归 DNS 与权威 DNS 参与解析，但还不能完整解释缓存未命中的查询过程。

## 亲手做过什么？

尚未完成实验；计划执行 `LAB-001`。

## 与哪些知识连接？

未来连接 URL、IP、缓存、TTL 与 CDN。

## 还有什么不知道？

- 不同缓存层分别保存什么。
- CNAME、A/AAAA 与递归查询的具体顺序。
- DNSSEC 在查询链中的验证位置。
