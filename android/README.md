# 白泽水浒 Android 安装包

源码目标版本为 **0.69.0（versionCode 41）**，尚未生成这一版 APK。上次已验证的安装包为 0.68.0（versionCode 40），不含本轮两片固定探索地图与挂机营建内容。安装包采用自行签名，包名 `top.baizeone.shuihu`，支持 Android 8.0 及以上。游戏资源完整内置，云存档需要联网。首次安装请使用手机系统的文件管理器打开 APK；后续使用同一签名、同一包名、递增 versionCode 的 APK 覆盖安装。

## 安装与存档迁移

1. 按下方命令构建 0.69.0 后，将 `artifacts/android/baize-shuihu-0.69.0.apk` 传到手机并安装；本轮仅发布网页与 Worker，未生成此安装包。
2. 原浏览器中进入“存档 → 导出当前进度”，把 JSON 文件保存到手机。
3. 打开 APK 的“存档 → 导入文件 → 从其他设备导入存档”，选择 JSON，检查预览并确认导入。
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

JavaScript 原生接口仅用于显式导出存档，保存位置通过系统文件选择器由用户确定。导入也通过系统文件选择器，不申请全盘存储权限。App 使用网站原有 Origin，因此当前仅允许 `https://baizeone.top` 的 Worker CORS 配置可直接兼容；0.69.0 的完整新进度要求 Worker 返回 release: 0.69.0，以及 grainRoad、idleDispatch、regionalGathering、regionExploration、marshExploration 均为 1；没有新增数据库表，不需要执行 SQL。仅推送 GitHub 不会部署 Worker，也不会更新手机内置的游戏文件。

方案参考 Android 官方 [加载应用内网页](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) 和 [APK 签名工具](https://developer.android.com/tools/apksigner)。

## 上一版安装包的验证与限制

已进行 Windows 本机编译、APK v2/v3 签名校验、包信息核对；浏览器隔离环境验证内置资源路径的离线启动、IndexedDB 重载、导出与导入流程，并验证手机/桌面/横屏布局。没有连接 Android 真机，系统文件选择器、系统返回键及不同厂商 WebView 的实际表现仍需安装后体验。

## 0.68.0 图标与安装包核对

图标改为青玉底、白泽兽与水纹，提供各密度备用图、Android 8 起的自适应图标，以及 Android 13 起的单色主题图标。按 [Android 官方图标规范](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive) 分离前景和背景，主要轮廓保留在中央安全范围。系统栏、启动背景及原生确认框采用游戏默认的浅青配色。

透明前景：`android/res/drawable-nodpi/app_icon_art.png`。生成原稿和完整提示词见 `android/art/README.md`。Android 切到后台会取消后续连续挑战并保存、暂停当前战局；回到前台仍需手动继续。

本轮核对：APK v2/v3 签名通过，与 0.54.0 的签名证书一致，包名相同，versionCode 从 39 升至 40；316 个内置文件逐一与当前游戏源文件比对一致。直接从新旧 APK 提取游戏资源，在隔离浏览器中验证 360 / 390 像素手机和 844 像素横屏的离线启动、0.54.0 升级后保留人物 / 阵容 / 行囊、原生导出桥接、文件导入与重载；另验证原生后台事件停止连续挑战、暂停当前战斗，恢复事件不自动开战。

安装包及校验值：`artifacts/android/baize-shuihu-0.68.0.apk` 与同名 `.apk.sha256`；图标预览：`artifacts/android/apk068-icon-preview.png`。校验记录在 `artifacts/android/apk068-verification.json`，浏览器日志在同目录 `apk068-bundled-browser.log`、`apk068-native-browser.log`。未连接 Android 真机，系统安装和厂商桌面的最终显示仍需在手机体验。
