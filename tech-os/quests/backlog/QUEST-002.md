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

## 下一步

比较浏览器、Node.js `URL` 和服务器日志对同一组 URL 的解析结果。

## 完成证据

能解释 URL 各部分由谁处理，以及 fragment 为什么不会发送给服务器。
