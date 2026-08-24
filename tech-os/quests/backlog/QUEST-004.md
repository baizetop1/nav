---
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
