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

## 开始前

本课约 30 分钟，只观察自己电脑的回环流量，不抓取他人或登录账号的通信。先区分 IP 地址与端口即可。本机回环实验省去公网路由干扰，因此不能用它证明互联网路由、丢包重传或拥塞控制已经学会。

## 学习思路

先让两个本机程序完成一次通信，再把这段通信在抓包中找出来。IP 负责网络层寻址和投递，TCP 提供连接上的有序字节流；TCP 不替应用决定“一条消息”有多长。协议边界可查 [TCP 标准 RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html)。

## 工具准备

- Python 3：Windows 用 `py --version` 检查；macOS/Linux 用 `python3 --version`。已有可用 `python` 命令时可替换解释器名。
- curl：Windows 下面写 `curl.exe`，避开旧 PowerShell 的同名别名；macOS/Linux 改为 `curl`。
- Wireshark；Windows 回环捕获需要 Npcap。无安装/抓包权限时先做 S1，S2 保留为待做，不需要关闭防火墙。回环适配器说明见 [Npcap 官方指南](https://npcap.com/guide/)。
- 用文件管理器新建一个空实验目录，并在该目录打开两个终端。不要在含密码、项目密钥或个人文件的目录启动文件服务器。

## 下一步

确认 Python 可用，在空实验目录按 S1 启动仅绑定 `127.0.0.1` 的服务，先完成一次本机 curl 请求。

## 学习步骤

### S1 · 建立一个只在本机工作的连接

#### 为什么这样做

连接失败和 HTTP 错误是不同层的问题。我们先制造一个可控服务，知道服务器应监听哪个地址和端口。

#### 工具与操作

终端 A 启动文件服务并保持打开；下面是 Windows 命令，macOS/Linux 将 `py` 改为 `python3`。[Python 官方文档](https://docs.python.org/3/library/http.server.html#command-line-interface)说明端口和绑定地址参数。

```text
py -m http.server 8765 --bind 127.0.0.1
```

终端 B 执行一次请求。只对本机地址绕过代理；`--max-time` 避免一直等待。

```text
curl.exe --noproxy 127.0.0.1 --http1.1 --max-time 5 -v -H "Connection: close" http://127.0.0.1:8765/
```

#### 观察与预期

curl 显示连接到 `127.0.0.1:8765`，随后显示请求、响应和目录页正文；终端 A 出现访问日志。Python 默认响应可能是 HTTP/1.0，即使客户端请求写着 HTTP/1.1，也不代表 TCP 失败。

#### 常见误区

`127.0.0.1` 指当前运行程序所在主机/环境，不是另一台电脑。`Connection: close` 是 HTTP 语义，不是“三次握手”的命令。成功日志不等于已经抓到了握手包。

#### 卡住时怎么办

Connection refused：先看终端 A 是否仍在运行及端口是否一致。Address already in use：不要结束不认识的进程，换成 8769 并同步修改本课命令和过滤器。若提示 Python 不存在，按系统官方安装方式准备后再继续。

#### 检查理解

客户端的源端口必须也是 8765 吗？如果收到 HTTP 404，是否说明 TCP 根本没建立？

#### 参考答案

客户端通常由系统选择临时源端口，服务器使用监听端口 8765。收到正常 HTTP 404 响应说明请求已到达某个 HTTP 服务，资源不存在不等于连接未建立。

#### 完成标志

保留一次客户端输出和对应服务器日志，标明目标 IP、目标端口及应用层结果。

### S2 · 在自己的抓包里找到建立、传输与关闭

#### 为什么这样做

把抽象的连接变成一条可以追踪的 TCP 流，观察序号/确认号与正文之间的关系，而不是背固定包数。

#### 工具与操作

1. Windows 在 Wireshark 选择 “Adapter for loopback capture / NPF_Loopback”；Linux 选 `lo`，macOS 选 `lo0`。
2. 先开始捕获，再在顶部的显示过滤器填写 `tcp.port == 8765`，随后重复 S1 的 curl 请求一次。
3. 停止捕获。依次找 SYN、SYN+ACK、ACK、带数据的报文以及 FIN/ACK；展开 TCP 字段看端口、Seq 和 Ack。
4. 右键该连接任一包，选择 Follow → TCP Stream，核对请求和响应；最后保存只用于本课的捕获文件。完成后在终端 A 按 Ctrl+C 停止服务。

显示过滤器与捕获过滤器不是同一种语法；参见 [Wireshark 过滤器指南](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)及 [Follow Stream 官方说明](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html)。

#### 观察与预期

新连接通常能找到三次握手。Wireshark 常显示相对序号；正文按字节推进序号，SYN/FIN 也占序号空间。关闭过程可能合并 ACK，不必正好四个独立包。回环很可靠，通常不会出现重传；没有重传不等于 TCP 没有重传机制。

#### 常见误区

一次 `write`、一个 TCP 包和一次应用读取不是一一对应。带数据的包也可带 ACK。HTTP/3 走 QUIC，不能用它来要求出现同样的 TCP 握手；本实验特意使用本机明文 HTTP。

#### 卡住时怎么办

零包先确认选的是回环接口、捕获早于请求、端口未改错；不要转而抓取全部公共 Wi-Fi 流量。没有捕获权限时记录限制，先复查 S1。看不到正文时确认选中了这一条流，而不是别的端口或 TLS 流量。

#### 检查理解

为什么接收端不能把“一个 TCP 包”当成“一个完整 HTTP 响应”？

#### 参考答案

TCP 提供字节流，分段、重组与读取缓冲会改变每次看到的边界。HTTP 必须依据自身格式、长度或连接关闭等规则判断消息边界。

#### 完成标志

在自己的捕获中标出连接四元组、建立阶段、正文和关闭阶段，解释一处 Seq/Ack。没捕获到的阶段明确写缺失，不用示意图冒充实测。

## 完成证据

能根据抓包解释连接建立、数据传输和关闭。

这是完成标准，尚需实际记录支撑。公网路由、主动制造丢包、拥塞与流量控制另开实验，不在本课改网卡、路由表或防火墙。
