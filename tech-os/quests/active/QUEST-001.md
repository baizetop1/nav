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

## 当前理解

待探索：从地址栏输入、URL 解析、缓存与 Service Worker 判断，到发起网络请求和渲染页面的边界。

## 下一步

使用浏览器开发者工具记录一次全新导航的请求序列，区分页面导航、重定向和子资源请求。

## 完成证据

- 能画出浏览器侧的请求流程。
- 能说明哪些步骤发生在网络请求之前。

## Open Questions

在实验过程中新增到 `questions/`。
