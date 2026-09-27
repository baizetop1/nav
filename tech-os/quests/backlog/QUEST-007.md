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

## 开始前

本课约 30 分钟，需要 Linux 环境和 Python 3。Windows 可使用已经安装的 WSL Ubuntu；没有 WSL 时先阅读 [Microsoft 官方安装说明](https://learn.microsoft.com/zh-cn/windows/wsl/install)，安装可能需要管理员权限和重启，不是本课自动执行的操作。macOS 和 Git Bash 不是 Linux，不能用它们的结果冒充 `/proc` 实验。

## 学习思路

先把“代码文件”与“运行中的进程”分开，再沿着“进程 PID → 监听 socket → 文件描述符 → 内存映射”找证据。只查看自己创建的服务，不修改 `/proc`、系统参数或别人的进程。

## 工具准备

- 以下命令全部在 Linux/WSL 的 Bash 中运行，不是在 Windows PowerShell 中。
- 检查 `python3 --version`、`ps --version`、`ss --version`。`ps` 通常来自 procps，`ss` 来自 iproute2；缺失时按发行版官方软件源安装，不能因为缺命令就关闭安全限制。
- 准备一个空实验目录及两个 Linux 终端。浏览器或 curl 可作为客户端；若使用 WSL，优先让服务端和 curl 都在同一 Linux 环境，减少跨环境网络差异。

## 下一步

在 Linux/WSL Bash 中按 S1 启动本机服务，再用 `ps` 找到与启动参数一致的服务 PID。

## 学习步骤

### S1 · 从监听端口找到自己的服务进程

#### 为什么这样做

磁盘文件不会自己接收请求，运行中的进程要请求内核创建并监听 socket。把端口和 PID 对上，才能知道正在检查哪个程序。

#### 工具与操作

在空实验目录的终端 A 运行只绑定回环地址的服务，并保持打开。

```bash
python3 -m http.server 8766 --bind 127.0.0.1
```

终端 B 执行下面两条；在 `ps` 输出中找完整参数与上面一致的那一行，记下 PID。`ss` 选项分别表示监听、TCP、数字地址、进程信息，详见 [ss 手册](https://man7.org/linux/man-pages/man8/ss.8.html)和 [ps 手册](https://man7.org/linux/man-pages/man1/ps.1.html)。

```bash
ps -eo pid,ppid,comm,args
ss -ltnp 'sport = :8766'
```

再执行 `curl --noproxy 127.0.0.1 --max-time 5 http://127.0.0.1:8766/`，核对终端 A 的日志。只记录自己的服务行，不把其他进程参数公开。

#### 观察与预期

`ss` 应显示 `127.0.0.1:8766` 处于 LISTEN，并在权限允许时显示 python3 的 PID/fd。`ps` 显示进程及父进程；服务空闲时可能是睡眠状态，这不表示它挂掉了。

#### 常见误区

PID 是运行实例编号，不是端口号；再次启动可能得到新 PID。一个进程可以有多个 socket，一个监听 socket 也不是每个请求都重新创建一份。

#### 卡住时怎么办

LISTEN 为空先看终端 A 是否报端口占用、是否在相同 WSL 发行版/容器里执行。看得到端口却看不到 PID，可能是权限限制；先确认是自己的进程，不盲目加 sudo。没有 `ss` 时先完成 `ps`，下一步的 fd 可补充线索，但不要声称已经验证监听状态。

#### 检查理解

为什么服务没收到请求时仍能出现在进程列表？同一个脚本重启后 PID 必须不变吗？

#### 参考答案

进程已经启动并等待内核通知就绪事件，暂时不使用 CPU 不等于不存在。PID 由系统分配，重启后可能变化，也可能在更晚被重用，因此要核对当前命令。

#### 完成标志

记录自己服务的命令、PID、父 PID、监听地址/端口，并用一次请求日志确认查到的确实是这个服务。

### S2 · 查看文件描述符与内存，再观察进程结束

#### 为什么这样做

把“进程占用资源”具体化：文件描述符是进程访问内核对象的编号，虚拟地址空间与实际驻留内存不是同一个数。

#### 工具与操作

把下面第一行的 `12345` 手工替换成 S1 刚确认的 PID。只读这些文件，不向其中写入内容。Linux 内核的 [proc 文件系统文档](https://docs.kernel.org/filesystems/proc.html)说明 status、maps 和 fd。

```bash
server_pid=12345
ps -p "$server_pid" -o pid,ppid,stat,rss,vsz,args
ls -l "/proc/$server_pid/fd"
grep -E '^(Name|Pid|VmSize|VmRSS|Threads):' "/proc/$server_pid/status"
head -n 8 "/proc/$server_pid/maps"
```

记录一个终端描述符和一个 `socket:[...]`，比较 VmSize 与 VmRSS。然后在终端 A 按 Ctrl+C，仅停止自己刚启动的服务；回终端 B 重新运行 `ps -p "$server_pid" -o pid,args` 和 S1 的 `ss` 查询。

#### 观察与预期

通常可见 0/1/2 指向终端，另有 socket 描述符；编号不固定。VmSize 表达虚拟空间，VmRSS 表达驻留内存的近似统计，不要求相等或固定大小。服务退出后自己的监听应消失，原 `/proc/PID` 通常不再存在；PID 被重用时必须重新核对命令。

#### 常见误区

maps 中的地址不是直接可拿来测量的物理内存地址；虚拟空间大不等于实际占用了同样多的 RAM。文件描述符不只代表普通磁盘文件，socket 也通过它访问。

#### 卡住时怎么办

No such file 先确认服务没退出、PID 复制正确。Permission denied 时检查用户/容器限制，保留限制说明，不改系统 ptrace 或 `/proc` 挂载策略。没有 socket 行时确认查的是服务 PID 而非启动它的 shell。

#### 检查理解

为什么 VmSize 大于 VmRSS 并不能直接判定内存泄漏？关闭监听程序后，为什么还可能看到与它通信过的 TCP 状态？

#### 参考答案

虚拟地址包含映射、预留等，不都驻留 RAM；泄漏需要结合时间趋势与使用情境判断。连接关闭后的某些 TCP 状态由内核维护，不等同于原服务仍在监听。

#### 完成标志

保留 PID、一个 socket fd、两类内存指标与停服前后监听差异，写出“代码 → 进程 → 内核资源”的对应关系，不能只贴一张进程列表。

## 完成证据

能把服务端代码中的关键操作映射到进程和内核资源。

以上记录需亲自完成后补入 PROJECT-001；本文没有宣布项目完成。系统调用跟踪、调度、缺页、共享内存和性能分析是下一层，不因查看几份 `/proc` 文件就算已验证。
