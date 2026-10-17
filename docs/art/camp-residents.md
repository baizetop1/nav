# 山寨插画与行走人物素材

日期：2026-10-16。背景沿用用户选定的原生成插画，不改构图。人物使用内置 image_gen 新生成透明 PNG，原图只作风格参考。

项目素材：

- public/game/assets/art/camp-painted.png：用户选定原图，源 exec-14867bee-6956-4b74-b843-b748b64efa60.png。
- public/game/assets/art/camp-residents-sheet.png：四行四列透明人物行走表。各行分别为青衣武将、文士、僧人、斗笠工人；各列为四步行走相位。

生成方式：内置 image_gen，transparent_background=true，引用原图作样式参考，没有更改原背景。

最终提示词：

Use case: stylized-concept. Asset: production 2D game walking character sprite sheet, transparent background. The provided image is STYLE REFERENCE ONLY; keep that existing camp image untouched. Create a NEW separate PNG sprite sheet of tiny Song dynasty Chinese camp inhabitants matching its restrained realistic ink-and-watercolor historical illustration, same warm brown, muted teal and ochre tones. EXACT UNIFORM GRID: 4 columns by 4 rows, sixteen equally spaced square cells, no gutters and no borders. Each row is one consistent character, each column is one phase of their walking cycle (left leg forward, passing, right leg forward, passing). All characters full body, isometric 3/4 view looking toward lower right, elevated camera like the reference, same apparent height and feet baseline across every cell, centered in cell. Row 1: compact dark teal robed swordsman with topknot and a sheathed waist sword. Row 2: brown-and-cream travelling scholar, tied hair and small satchel. Row 3: stocky russet monk with shaved head and prayer beads. Row 4: straw-hatted worker in muted olive and brown with short tunic, tied trousers and a small wooden bundle. Adults with natural proportions, about five heads tall, visibly separate arms and walking legs, not cute chibi, not portraits, no surrounding badge. Outer silhouette must be bold enough to read when the full body is 28 to 36 screen pixels tall. Fine brush texture, dark shoes, subtle garment folds, no tiny face details. Each character stays fully within their cell with ample transparent padding and NEVER touches a cell edge. All sixteen cells same scale and alignment so CSS background-position can animate them directly. No floor, no cast shadow, no scenery, no labels, no letters, no grid lines, no UI.
