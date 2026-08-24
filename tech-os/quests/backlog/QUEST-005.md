---
schema: tech-os/v1
kind: quest
id: QUEST-005
title: TLS 如何建立可信的加密连接？
route_id: ROUTE-001
status: backlog
order: 5
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids: []
tags:
  - tls
  - pki
  - security
---

## 当前理解

待探索证书验证、密钥协商、会话密钥与握手消息的关系。

## 下一步

使用 `openssl s_client` 和浏览器证书面板观察真实站点。

## 完成证据

能解释浏览器为何信任某个证书，以及握手如何得到对称密钥。
