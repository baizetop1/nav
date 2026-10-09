# 白泽水浒桌面图标 v2

由内置 image_gen 工具生成并移除背景，原始生成文件已复制进本项目。图片缩放用于 Android 密度资源，前景保留原透明通道；安全边距在原生 XML 中设置。

- 初稿：`android/art/app-icon-source-v2.png`
- 发布前景：`android/res/drawable-nodpi/app_icon_art.png`
- 自适应图标：`android/res/mipmap-anydpi-v26/ic_launcher.xml`
- 主题图标：`android/res/mipmap-anydpi-v33/ic_launcher.xml`

## 生成提示词

Use case: logo-brand. Asset type: final square Android launcher icon artwork for the Chinese game 白泽水浒, not a mockup. Create a beautiful restrained original Baize mythical-beast emblem: a noble ivory-white lionlike guardian's head and flowing mane, in a clear three-quarter silhouette, two elegant short curved jade horns, a calm wise face, a tiny warm antique-gold forehead accent. Subtle carved-jade relief with clean bold edges, restrained fine detail, warm porcelain highlights. Pale celadon jade background filling the entire square edge to edge, very gentle subtle tonal variation, comfortable soft palette matching a Chinese literary RPG. A few broad flowing water curves merge into the base of the mane, evoke Liangshan waters. All essential animal silhouette and water motif contained within the central 60% of the image in both dimensions so Android circle/squircle cropping does not clip horns. Strong recognisable silhouette legible at 48px, refined Chinese art sensibility, balanced empty space. One coherent emblem, centered, no text at all, no 王 character, no Chinese letters, no border, no frame, no rounded square drawn inside the square, no app screenshot, no phone mockup, no watermarks, no glossy gradients, no anime character, no fierce open mouth, no photoreal fur. Deliver one square image suitable for shipping.

## 透明前景提示词

Use case: background-extraction. Edit target: the attached original Baize beast icon. Create the production Android adaptive FOREGROUND layer only. Preserve the same ivory white horned Baize guardian, jade horns, tiny gold forehead accent, flowing mane, celadon water swirls, original carved jade illustration style, gentle face, clean high quality silhouette. REMOVE ONLY the pale celadon square background so everything outside the beast and flowing water motif is genuinely transparent, with crisp clean alpha edges and no halo. Fit the ENTIRE beast+horns+water emblem inside the central 60% by width and 60% by height of a square canvas: at least 20% transparent margin on all four sides, center it visually. Do not add background, frame, border, shadow around icon, text, letters, symbols or any new props. Square transparent PNG, one centered emblem. It must remain recognizable in Android round and squircle masks. Maintain creature colors and details.

生成输出的主体大于提示词要求的范围，发布时通过 drawable 的 14dp 内边距将明显轮廓放回中央安全区；同时预览圆形、圆角和 48px 小图标。单色图标复用前景透明轮廓，由 Android 着色。
