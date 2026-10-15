# 白泽水浒 Android 安装包

源码与最新安装包为 **0.88.0（versionCode 62）**。普通界面“江湖日志”及占位已移除，单条操作提示和梁山志保留；独立战场继续慢速逐条显示日志，最后一条读完才显示胜负。包含张顺、金大坚、朱贵的人物篇章，完整记录见 [0.88.0](../docs/shuihu-v088.md) 和 [逐条战斗日志](../docs/shuihu-v087.md)。

安装包沿用原包名 `top.baizeone.shuihu` 和签名，支持 Android 8.0 及以上，可直接覆盖旧包并保留 App 数据。游戏资源完整内置，云存档需要联网；网页随 GitHub main 提交自动部署；Worker 需单独部署，目前仍为 0.84.0，新增进度的云端兼容性由服务能力检查保护。

## 安装与存档迁移

1. 将 `artifacts/android/baize-shuihu-0.88.0.apk` 传到手机，直接覆盖安装，无须卸载原 App。
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

JavaScript 原生接口仅用于显式导出存档，保存位置通过系统文件选择器由用户确定。导入也通过系统文件选择器，不申请全盘存储权限。App 使用网站原有 Origin，因此当前仅允许 `https://baizeone.top` 的 Worker CORS 配置可直接兼容；0.82.0 的完整新进度要求 Worker 返回 release: 0.82.0，以及 grainRoad、idleDispatch、regionalGathering、regionExploration、marshExploration、ruinsExploration、forestExploration、waterExploration、mountainExploration、explorationGoals、mineRevisit、marshRevisit、regionRevisits、mineCompanion、crossRegionEvents、sourceTracking、campLife 均为 1；没有新增数据库表，不需要执行 SQL。仅推送 GitHub 不会部署 Worker，也不会更新手机内置的游戏文件。

方案参考 Android 官方 [加载应用内网页](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) 和 [APK 签名工具](https://developer.android.com/tools/apksigner)。

## 0.88.0 安装包验证

原签名、v2/v3 签名、包名和 versionCode 62 核对通过，414 个游戏文件与源码逐字节一致。离线升级和无日志布局记录见 artifacts/android/apk088-verification.json 及 apk088-no-global-log-browser/report.json。未连接 Android 真机，覆盖安装、系统字号、返回键和实际文件选择器仍需手机验收。

大小 67,380,425 字节；SHA-256：`1d1668f9fb0639948b67d1c580451a1323153d905b2fdd6e5270c02e395078c0`。

## 0.84.0 安装包验证

401 个内置文件逐字节匹配源码；原包名和原签名保留，versionCode 从 57 升至 58。公开签名证书 SHA-256 与旧包一致。

直接使用 APK 提取页面，四种手机尺寸验证固定资质、八人名册与获得状态、活动本领预览、日历、真实单抽和十连；手机与桌面验证首战实际阵亡、伤兵治疗、付费补缺和重载保留。原名册、升品、九处剧情副本与每日差事在五种尺寸共 90 个状态通过。360／390 竖屏与 844 横屏离线验证 0.83.0 旧档升级、原生导出桥接、文件导入与重启。

没有连接 Android 真机；覆盖安装、系统字号、返回键、实际文件选择器及厂商 WebView 仍需手机验收。

大小 66,924,689 字节；SHA-256：`110e0fa09fc57c3f736eb6255787d8efa70b54cfe4c4220c6e48a05b7340ab76`。文件：`artifacts/android/baize-shuihu-0.84.0.apk`，校验记录：`artifacts/android/apk084-verification.json`。

## 0.83.0 安装包验证

399 个内置文件逐字节匹配源码；包名不变，versionCode 从 56 升至 57。v2/v3 签名通过，证书 SHA-256 与旧包一致。

直接用 APK 提取资源，五种尺寸共 90 个页面状态验证活动招募、八人名册、体系区分、升品核心、九处剧情副本、每日差事入口与取消出征；360／390 竖屏和 844 横屏离线验证 0.82.2 旧档升级、人物／库存保留、原生导出桥接、文件导入及重启。另验证菜单触摸滚动。没有连接 Android 真机，系统返回键、系统字体与实际文件选择器仍需覆盖安装后检查。

大小 66,920,437 字节；SHA-256：`2339fa8182fc350b33ea5e175fb84a652cdd18a51cf6a59928d846023e8fea2d`。文件：`artifacts/android/baize-shuihu-0.83.0.apk`，校验记录：`artifacts/android/apk083-verification.json`。

## 0.82.2 安装包验证

383 个内置文件与源码一致，桌面图标未变；v2/v3 签名及原证书核对通过，versionCode 从 55 升至 56。直接使用 APK 提取页面验证溢出时手指滑动、末行入口、固定关闭按钮和分类切换；另验证 0.82.1 旧存档离线升级、导入导出和重启。没有连接 Android 真机。

大小 66,882,317 字节；SHA-256：`b80443a548ae2b2c04a091b308e7f5c512a4df117203f7e036486da05422a866`。文件：`artifacts/android/baize-shuihu-0.82.2.apk`，校验记录：`artifacts/android/apk0822-verification.json`。

## 0.82.0 安装包验证与限制

Windows 本机编译和 APK v2/v3 签名校验通过；证书与 0.68.0 一致，包名相同，versionCode 从 40 升至 54。383 个内置文件逐一与游戏源码比对一致，图标资源沿用上一版白泽兽与水纹。直接使用 APK 提取资源，在隔离浏览器中验证 360 / 390 像素手机与 844 像素横屏离线启动、0.68.0 旧存档升级、原生导出桥接、文件导入及刷新读档。没有连接 Android 真机，系统文件选择器、系统返回键及不同厂商 WebView 的实际表现仍需安装后体验。

安装包大小 66,882,317 字节（约 63.8 MiB）；SHA-256：`d984ab8302cef543a407dbce4579b6615a1629712ca8f24b1acaf89fb6535512`。验证记录位于 `artifacts/android/apk082-verification.json`，同目录保留编译、签名与浏览器日志。

## 0.68.0 图标与安装包核对（历史）

图标改为青玉底、白泽兽与水纹，提供各密度备用图、Android 8 起的自适应图标，以及 Android 13 起的单色主题图标。按 [Android 官方图标规范](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive) 分离前景和背景，主要轮廓保留在中央安全范围。系统栏、启动背景及原生确认框采用游戏默认的浅青配色。

透明前景：`android/res/drawable-nodpi/app_icon_art.png`。生成原稿和完整提示词见 `android/art/README.md`。Android 切到后台会取消后续连续挑战并保存、暂停当前战局；回到前台仍需手动继续。

本轮核对：APK v2/v3 签名通过，与 0.54.0 的签名证书一致，包名相同，versionCode 从 39 升至 40；316 个内置文件逐一与当前游戏源文件比对一致。直接从新旧 APK 提取游戏资源，在隔离浏览器中验证 360 / 390 像素手机和 844 像素横屏的离线启动、0.54.0 升级后保留人物 / 阵容 / 行囊、原生导出桥接、文件导入与重载；另验证原生后台事件停止连续挑战、暂停当前战斗，恢复事件不自动开战。

安装包及校验值：`artifacts/android/baize-shuihu-0.68.0.apk` 与同名 `.apk.sha256`；图标预览：`artifacts/android/apk068-icon-preview.png`。校验记录在 `artifacts/android/apk068-verification.json`，浏览器日志在同目录 `apk068-bundled-browser.log`、`apk068-native-browser.log`。未连接 Android 真机，系统安装和厂商桌面的最终显示仍需在手机体验。
