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

## 下一步

完成 `LAB-001`，观察本机 resolver、递归服务器与权威结果之间的差异。

## 完成证据

能解释一次缓存未命中的 DNS 查询，并用命令验证关键记录。
