---
schema: tech-os/v1
kind: question
id: QUESTION-001
title: 浏览器、操作系统与递归 DNS 各自缓存了什么？
status: open
origin_type: quest
origin_id: QUEST-003
created: 2026-08-24
route_seed_id: ""
tags:
  - dns
  - cache
---

## 为什么出现

理解 DNS 查询链时，不能把所有命中都笼统称为“DNS 缓存”。

## 当前假设

浏览器、系统 resolver、递归服务器可能分别保存不同范围和生命周期的结果。

## 如何回答

清理不同层级的缓存并重复 `LAB-001`，记录查询行为和 TTL 变化。

## 回答

尚未回答。
