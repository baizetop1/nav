# 白泽水浒 Android 安装包

0.52.0（versionCode 37）为自行签名的 APK，包名 `top.baizeone.shuihu`，支持 Android 8.0 及以上。游戏资源完整内置，云存档需要联网。首次安装请使用手机系统的文件管理器打开 APK；后续使用同一签名、同一包名、递增 versionCode 的 APK 覆盖安装。

## 安装与存档迁移

1. 将 `artifacts/android/baize-shuihu-0.52.0.apk` 传到手机并安装。
2. 原浏览器中进入“存档 → 导出当前进度”，把 JSON 文件保存到手机。
3. 打开 APK 的“存档 → 切换到“导入文件” → 从其他设备导入存档”，选择 JSON，检查预览并确认导入。
4. 或在 APK 中下载已有云档；更新原云档仍需该档的上传密钥。

浏览器与 APK 的本机存储相互独立。覆盖安装保留 App 数据；卸载会删除 App 本机进度，请先导出或上传云档。APK 不自动同步、覆盖浏览器或云端进度。

## 本机重新构建（PowerShell）

本项目使用 Android 官方 Build-Tools 35.0.0、Platform 35 和 JDK 17，不依赖 Android Studio/Gradle。工具目录中须含 `java.exe`、`javac.exe`、`jar.exe`、`keytool.exe`、`android.jar`、`aapt2.exe`、`zipalign.exe`、`d8.jar`、`apksigner.jar`；脚本会递归查找。

当前这台电脑已经准备好工具：

```powershell
cd 'F:\nav-main\nav-main'
& '.\android\build.ps1' -Toolchain 'F:\Baize Personal Text Network\android-tooling' -SigningDir 'F:\Baize Personal Text Network\android-signing'
```

输出位于 `artifacts/android/`，包括 APK 和 SHA-256 校验文件。脚本会编译 Java/资源、写入 public/game 静态文件、对齐、签名并验证签名。

**请备份 `F:\Baize Personal Text Network\android-signing` 目录中的密钥和密码文件，且不要上传 GitHub。** 更换签名密钥后，旧安装不能直接覆盖升级。工具、签名目录和 APK 产物均不进入源码提交。更新版本时同步 `public/game/data/config.json` 的 release、AndroidManifest.xml 的 versionName，并递增 versionCode。

## 资源与安全边界

使用站点所有者已有的 HTTPS 域名作为本地资源来源，专用路径为 `https://baizeone.top/__android__/game/`。该路径由 WebViewClient 从 APK 读取，**不请求线上站点、不需要创建线上目录**。缺失资源返回 404，不回退到网络页面。只有既有云存档来源允许外部请求，外部网页交给系统浏览器。

JavaScript 原生接口仅用于显式导出存档，保存位置通过系统文件选择器由用户确定。导入也通过系统文件选择器，不申请全盘存储权限。App 使用网站原有 Origin，因此当前仅允许 `https://baizeone.top` 的 Worker CORS 配置可直接兼容；本次十二卷主线需要先将云存档 Worker 更新至 0.52.0，确认 /v1/game-version 返回 chapters: 12；没有新增数据库表，不需要执行 SQL。仅推送 GitHub 不会部署 Worker，也不会更新手机内置的游戏文件。

方案参考 Android 官方 [加载应用内网页](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) 和 [APK 签名工具](https://developer.android.com/tools/apksigner)。

## 已验证与限制

已进行 Windows 本机编译、APK v2/v3 签名校验、包信息核对；浏览器隔离环境验证内置资源路径的离线启动、IndexedDB 重载、导出与导入流程，并验证手机/桌面/横屏布局。没有连接 Android 真机，系统文件选择器、系统返回键及不同厂商 WebView 的实际表现仍需安装后体验。
