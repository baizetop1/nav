# 白泽水浒 0.90.5 · 全部寨务布局

日期：2026-10-17。

原“全部寨务”把准备建议、来报与22个入口排在同一面板；入口移入弹窗后缺少原网格间距，按钮挤成多列。改成“待办、寨中、营建、出行、军务”五组，每次显示一组，功能入口两列、每组最多六项；横屏使用三列。待办独立成行，完整展示全部来报，不再只取前三项。可选出行建议移到出行组。

该弹窗使用专用布局，不再套通用分栏分页，不显示无用的1/1翻页条。内容较少时弹窗按内容高度显示；极小视窗保留内部滚动兜底。保留22个原命令、正常返回/关闭/Escape和键盘分类切换，不改变奖励、资源、随机数或游戏时钟。摘要入口加稳定id，修复横屏关闭重排后丢失返回焦点。

新增：public/game/js/camp-affairs-ui.js、public/game/css/camp-affairs.css；接入folio-ui.js和screen-layout.js。

浏览器验收：390×844、320×568、428×926在焦点补修前已通过全部22入口、4条待办、分类、间距和真实跳转检查；844×390在补修后定向复查通过。四种尺寸截图位于artifacts/camp-affairs-layout/；最后一次横屏定向报告为report.json。检查包含键盘Arrow/Home/End、关闭/返回/Escape还焦点、营建设施/采集/医治跳转及资源/RNG保持不变。

源码0.90.5；Android versionCode69。GitHub与Worker最近发布仍为0.88.0。本轮用于本地与手机审查。

网页最终构建通过。原签名APK为artifacts/android/baize-shuihu-0.90.5.apk，versionCode69，74,824,304字节；432项游戏文件与APK内资源逐字节一致，v2/v3签名有效。SHA-256：9d70e6565ea5646287464ff7613296cdebfeab59ce5c49bf12bb6ffeac045204。报告：artifacts/android/apk0905-verification.json。Android真机安装与手指操作待用户审查。
