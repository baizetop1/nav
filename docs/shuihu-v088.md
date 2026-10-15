# 白泽水浒 0.88.0 · 移除普通界面日志与 APK

更新时间：2026-10-16。

普通页面不再显示“江湖日志”、展开按钮、冻结阅读和回到最新。手机原来的日志行、桌面右侧的日志列一并移除，正文使用腾出的空间。旧的日志展开偏好不再影响页面布局，普通日志的刷新和分页事件也不再运行。

保存阵容、物品不足等操作反馈以当前页面的一条提示保留，不积累成记录面板。梁山志与存档中的记事保留。战斗独立窗口里的慢速逐条日志、技能显示、暂停与终局阅读沿用 0.87.0。

## 安装包

生成 artifacts/android/baize-shuihu-0.88.0.apk，versionCode 62，包名 top.baizeone.shuihu，沿用原签名，可在原版上覆盖安装。包含 0.85.0 人物篇章、0.86.0 战斗窗口和 0.87.0 可读日志的全部内容。本次 GitHub main 更新包含 0.85—0.88 的完整源码，网页由仓库的 GitHub Actions 自动发布；Worker 已部署至 0.88.0，regionCompanions=1，线上版本、CORS 与存档列表读取正常；未执行数据库迁移。

414 个内置游戏文件与源码逐字节一致；APK v2/v3 签名、原证书、包名、版本与 SHA-256 校验通过。实际 APK 解包后的离线升级、导入导出与重启记录见 artifacts/android/apk088-verification.json。未连接 Android 真机，系统安装、返回键与厂商 WebView 仍待手机审查。

APK SHA-256：1d1668f9fb0639948b67d1c580451a1323153d905b2fdd6e5270c02e395078c0。

## 验证与后续

全量游戏自检首轮 153 套通过；焦点页面自检发现移除日志后成功反馈丢失，已补回单条提示，焦点页面、营寨和普通界面三套最终专项通过。原回归结果与修复后的专项分别保存在 artifacts/v088-regression/game-tests.log 和 final-focused.log。

普通界面专项检查原来的展开偏好、不留空白行列、固定导航、分页和战斗日志保留，记录见 artifacts/no-global-log-browser/report.json；最终 APK 内置资源的同项检查见 artifacts/android/apk088-no-global-log-browser/report.json。网页构建记录见 artifacts/v088-regression/build.log。

后续待办：手机实际覆盖安装与系统返回键审查。本轮未改数据库结构或存档字段。
