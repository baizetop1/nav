---
schema: tech-os/v1
kind: quest
id: QUEST-006
title: HTTP 与 Server 如何完成一次请求响应？
route_id: ROUTE-001
status: backlog
order: 6
created: 2026-08-24
question_ids: []
knowledge_ids: []
lab_ids: []
project_ids:
  - PROJECT-001
tags:
  - http
  - server
---

## 当前理解

待探索请求方法、状态码、头部、正文、连接复用与服务器处理循环。

## 开始前

本课约 30 分钟。先知道服务端必须运行着才能接收请求；不需要 Express、数据库或云服务器。下面只监听 `127.0.0.1`，不用密码和真实个人数据。示例是教学服务，不作为生产部署代码。

## 学习思路

先自己写出“请求进来 → 检查方法和路径 → 选择状态码/正文 → 结束响应”，再从客户端观察这些决定。TCP 连上只说明运输通道可用，HTTP 才描述应用怎样处理请求。[RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)是方法和状态码的一手定义。

## 工具准备

- Node.js，终端运行 `node --version` 确认可用；使用仍受支持的正式版。脚本只用内置 `node:http`，无需 `npm install`。
- 一个文本编辑器、两个终端。新建独立实验文件夹，文件命名为 `server.cjs`，不要保存成 `server.cjs.txt`。
- Windows 用 `curl.exe`；macOS/Linux 把下方命令的 `curl.exe` 改成 `curl`。只有浏览器时可以测试 GET，POST 反例留到有 curl 的环境补做。

## 下一步

把 S1 示例保存为独立实验目录中的 `server.cjs`，运行 `node server.cjs`，先访问一次 `/hello?name=Baize`。

## 学习步骤

### S1 · 运行能解释每个分支的最小服务

#### 为什么这样做

先把服务端缩小到一个文件，观察状态码是由代码选择的，而不是浏览器随机生成的。用 `.cjs` 明确采用 CommonJS，避免其他项目配置干扰。

#### 工具与操作

用编辑器把下方保存到实验文件夹的 `server.cjs`。在同一文件夹的终端 A 运行 `node server.cjs`，保持终端打开。[Node HTTP 官方文档](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener)说明 `createServer`、`writeHead` 与 `end` 的用法。

```javascript
const http = require('node:http');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8787');
  console.log(req.method, req.url);
  let status = 200;
  let body;
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (req.method !== 'GET') {
    status = 405;
    headers.Allow = 'GET';
    body = { error: 'Only GET is supported' };
  } else if (url.pathname !== '/hello') {
    status = 404;
    body = { error: 'Not found' };
  } else {
    body = { message: 'Hello ' + (url.searchParams.get('name') || 'visitor') };
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
});
server.on('error', error => console.error(error.message));
server.listen(8787, '127.0.0.1', () => console.log('Open http://127.0.0.1:8787/hello'));
```

浏览器打开 `http://127.0.0.1:8787/hello?name=Baize`；再打开 `/missing`，不要只改片段 `#missing`。

#### 观察与预期

第一个地址返回含 `Hello Baize` 的 JSON，第二个返回 `Not found`，Network 中状态为 404。浏览器可能另请求 favicon，终端多出一行日志并不表示你的代码循环失控。

#### 常见误区

JSON 正文中的文字不是 HTTP 状态码，二者应分别检查；`/hello` 是应用路径，不一定对应硬盘上的同名文件。程序运行后没有回到命令提示符，是因为服务正在等待请求。

#### 卡住时怎么办

找不到模块先确认终端目录和扩展名；端口占用时选择其他空闲端口，同时改代码与访问地址。浏览器拒绝连接先看终端启动错误，别先改状态码。打不开时确认使用 `http` 而不是 `https`。

#### 检查理解

为什么没有 `hello` 文件却能访问 `/hello`？`res.end` 在这里完成什么？

#### 参考答案

路径交给我们写的回调分支处理；回调动态产生 JSON。`res.end` 表示这次响应正文写完，不是结束整个服务器进程。

#### 完成标志

保留成功和不存在路径两次的状态/正文，能按代码指明各自进入哪个分支。

### S2 · 用三种请求核对方法、头部和正文

#### 为什么这样做

让相同连接目标对应不同应用结果，练习区分“连接错误”“HTTP 错误”和“正文内容”。

#### 工具与操作

保持终端 A 运行，在终端 B 逐条执行。`-i` 显示响应头，`-v` 额外显示请求/连接信息，`-X POST` 改方法；本例不提交任何真实数据。参数定义见 [curl 官方手册](https://curl.se/docs/manpage.html)。

```text
curl.exe --noproxy 127.0.0.1 --max-time 5 -v "http://127.0.0.1:8787/hello?name=Baize"
curl.exe --noproxy 127.0.0.1 --max-time 5 -i http://127.0.0.1:8787/missing
curl.exe --noproxy 127.0.0.1 --max-time 5 -i -X POST http://127.0.0.1:8787/hello
```

把方法、路径、状态码、Content-Type、正文各抄一项。最后在终端 A 按 Ctrl+C 关闭服务，再重复一次 GET 作连接失败对照。

#### 观察与预期

服务运行时依次应为 200、404、405；405 应包含 `Allow: GET`。停服后若没有其他程序占用该端口，应连接失败，不会得到本服务的 HTTP 404。头部可能包含运行时自动补充的 Date、连接或分块信息，不要求顺序固定。

#### 常见误区

curl 默认不把所有 HTTP 4xx 当作命令执行失败；不能只用退出码判断业务成功。`-I` 是 HEAD 请求，不是“把 GET 的正文藏起来”，本教学服务会拒绝它。不要把 `-v` 输出的 `>`/`<` 符号误当成线上字节。

#### 卡住时怎么办

PowerShell 提示参数不存在时检查是否误用了 `curl` 别名。状态不是预期时核对终端日志、请求路径和端口；修改了代码要先 Ctrl+C 再重启。若停服后仍有响应，先确认请求确实指向这个回环端口和当前进程。

#### 检查理解

404 与 405 各说明什么？客户端收到 404 时，HTTP 服务是否一定没有运行？

#### 参考答案

本例 404 表示该路径未提供资源，405 表示服务不接受这个方法。能收到此服务的 404 本身说明它处理了请求；它与完全无法建立连接不同。

#### 完成标志

形成三行请求/响应对照和一条停服结果，能按日志对上请求；再把真正写出的代码与观察作为 PROJECT-001 的候选证据。

## 完成证据

能够实现一个最小 HTTP Server，并解释真实请求和响应字节。

此处列的是标准，不宣称 PROJECT-001 已完成。连接复用、请求体解析、并发、HTTP/2/3 与生产安全是后续深入；本课日志和 curl 文本不是完整抓包。
