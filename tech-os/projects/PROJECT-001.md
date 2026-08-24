---
schema: tech-os/v1
kind: project
id: PROJECT-001
title: Tiny HTTP Server
status: idea
created: 2026-08-24
route_ids:
  - ROUTE-001
quest_ids:
  - QUEST-006
  - QUEST-007
knowledge_ids: []
lab_ids: []
question_ids: []
tags:
  - http
  - server
  - linux
---

## 预期成果

实现一个最小 HTTP Server，能够监听端口、解析基础请求行和头部，并返回可由浏览器打开的响应。

## 为什么需要

把 HTTP、socket、Linux 进程和内存从“能解释”推进到“亲手实现”。

## 最小范围

- 单进程即可。
- 支持一个或少量路径。
- 不要求生产级并发、TLS、框架或容器。

## 完成证据

- 源码与运行说明。
- `curl -v` 请求记录。
- 对关键系统调用和协议字节的解释。

## 新问题

项目执行后再记录，不预先声称完成。
