---
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

## 下一步

运行最小服务器并使用 `ps`、`ss`、`lsof` 或等价工具观察它。

## 完成证据

能把服务端代码中的关键操作映射到进程和内核资源。
