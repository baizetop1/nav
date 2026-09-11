# 人物素材来源与生成提示词

最终素材位于 `public/game/art/hero-atlas.png` 与 `public/game/art/hero-atlas-extra.png`。用于现有 14 位英雄；未使用的格子不映射到人物。第一张 1254×1254，4×4；第二张 1536×1024，3×2。

## hero-atlas.png

原图由内置 imagegen 工具生成，使用 CSS 图集定位，无二次图像编辑。

```text
Use case: historical-scene
Asset type: square portrait atlas for a Chinese Water Margin historical strategy game; 4 columns x 4 rows, exactly sixteen square bust portrait cells.
Primary request: One single square image with a perfectly regular 4 by 4 grid of separate character portraits, each taking exactly one quarter of the image width and one quarter of the image height. NO borders, NO gutters, NO gaps; cells meet edge to edge. Center each character's head and upper torso inside its own cell with consistent head size. Keep heads and all recognizable features away from cell boundaries. Each cell must read as an independent portrait suitable for CSS background-position cropping.
Subjects, in strict reading order:
Row 1 left to right: Bai Sheng, lean rustic wine seller wearing a white scarf; Wu Song, athletic pilgrim with headband, short hair, fierce expression; Lin Chong, elegant spear officer with narrow moustache and blue scarf; Lu Zhishen, large bald monk with beard and prayer beads.
Row 2 left to right: Wu Yong, scholarly strategist holding a fan and wearing a black hat; Chao Gai, strong mature chieftain with full beard; Gongsun Sheng, Daoist with topknot and wisps of white hair; Liu Tang, rugged red-haired warrior.
Row 3 left to right: Ruan Xiaoer, mature fisherman with red sash; Ruan Xiaowu, younger fisherman with blue headcloth; Ruan Xiaoqi, spirited fisherman in green; Shi Qian, skinny nimble thief with dark cap.
Row 4 left to right: Yang Zhi, warrior with a visible blue facial birthmark; Yang Xiong, stern bearded executioner; a distinct reserve Song dynasty warrior with bronze lamellar armor and tied black hair; another distinct reserve Song dynasty warrior with cloth cap and weathered face.
Style/medium: Original painterly Chinese ink and mineral pigment illustration, premium historical strategy game card art. Vivid expressive faces, strong silhouettes, rich brushwork, historically inspired Song dynasty dress.
Scene/backdrop: Each individual portrait has a dark charcoal jade background.
Lighting/mood: Antique gold side lighting, dramatic but clearly readable faces.
Constraints: exactly 4 equal columns and 4 equal rows, sixteen distinct men, one centered bust per cell, perfectly square overall atlas. No shared scene. No text, no characters or letters, no numbers, no UI, no captions, no watermark, no decorative frames, no grid lines.

```

## hero-atlas-extra.png

原图由内置 imagegen 工具生成，使用 CSS 图集定位，无二次图像编辑。

```text
Use case: historical-scene
Asset type: landscape portrait atlas for a Chinese Water Margin historical strategy game.
Primary request: Create ONE 1536x1024 landscape image, aspect ratio exactly 3:2, containing exactly 3 equal columns by 2 equal rows of square portrait cells. Each portrait occupies exactly one third of image width and one half of image height. Six independent centered bust portraits. No gaps, gutters, frames, grid lines or borders. Portraits meet edge to edge. Keep all faces inside their own square cell, consistent head size, centered comfortably for CSS background-position cropping.
Subjects in strict row-major reading order:
Top left: Song Jiang, mature man with a kind intelligent face, dark Song dynasty official cap, small beard, dark robe.
Top middle: Yan Qing, handsome youthful wandering hero, visible neck tattoo, tied black hair, graceful confident demeanor.
Top right: Hua Rong, elegant archer, silver armor with red tassel, a bow beside his shoulder.
Bottom left: Chai Jin, wealthy aristocrat wearing an ornate black hat and a luxurious historical robe.
Bottom middle: Yang Zhi, rugged warrior with a clearly visible blue facial birthmark, traditional armor.
Bottom right: Bai Sheng, lean rustic wine seller with white scarf and cloth head wrap, weathered cheerful face.
Style/medium: Premium original painterly Chinese ink and mineral pigment illustration for a historical strategy game. Rich realistic expressive faces, strong silhouettes, subtle textured brushwork. Historically inspired Song dynasty costume.
Scene/backdrop: A dark charcoal jade background within every individual square portrait.
Lighting/mood: Antique gold side lighting, dramatic shadows with clearly readable faces.
Constraints: exactly six portraits, one per independent square cell, perfectly regular three columns and two rows. No text, letters, Chinese characters, numerals, captions, UI, logos, watermark, frames, borders or gaps. No shared scene.

```
