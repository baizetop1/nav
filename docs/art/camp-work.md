# 寨中生活动作图集

日期：2026-10-17。使用内置 image_gen，新图生成模式，transparent_background=true；现有两张图片仅作画风和比例参考，未改动。

- 项目资产：public/game/assets/art/camp-work-sheet.png（1254×1254 RGBA）。
- 生成原件：E:/CodexData/generated_images/01a08e7f-f245-7211-8a30-19f0ac6928ea/exec-17bfaafb-bde2-4734-b9c7-8d9d113bb3a0.png。
- 参考：public/game/assets/art/camp-residents-sheet.png、camp-painted.png。
- 六列六行，每行六帧。行序：包扎、锤铁、锄地、搬运、交谈、操练。
- 本轮使用真实诊疗、农田、物料搬运、交谈动作；自动冶铁订单与教习尚未开办，相应帧不代表已经获得自动产出。
- CSS直接定位图集，保留原透明度，不裁改原图。

## 最终生成提示词

```text
Use case: stylized-concept. Asset type: NEW game animation sprite atlas, references are STYLE AND PROPORTION REFERENCES ONLY, do not edit either reference. Create a truly transparent PNG containing EXACTLY 6 columns by 6 rows, 36 uniformly spaced cells in one square atlas. Each row is SIX consecutive animation frames of the SAME person doing a particular action, left to right. All figures are small full-body historical Song dynasty Chinese adults in realistic muted ink-and-watercolor painting like the references, NOT chibi, not cartoon, not pixel art, no glossy 3D. Elevated three-quarter isometric viewpoint matches the camp painting. Keep every character same height and baseline, centered within its cell, feet on same baseline about 85% down the cell, generous clear margins; no object may cross a cell. Stable clothing, body proportions and identity throughout each six-frame row. Frame 1 to 6 must show noticeably different limb poses forming a seamless believable action cycle. ROW 1 physician in pale cream robe and dark green vest, bends slightly forward and uses a white bandage with both hands, reach to medicine pouch, unfold bandage, lean, wrap, tighten, return; one physician only, no patient and no bed. ROW 2 smith in grey work clothes and brown apron standing at a SMALL low anvil, lifts hammer high, swings down, contact, follow through, lift, recover; anvil consistent location. ROW 3 farmer in olive tunic and straw hat using a short hoe, reach, raise hoe, lower, dig, draw back, recover, tiny attached soil only. ROW 4 porter in plain brown work robe carrying a grain sack at shoulder, SIX clear walking steps with varied leg and arm poses and slight sack movement. ROW 5 speaker in grey-blue robe, standing with feet fixed, gestures toward the RIGHT: raise one hand, open palm, nod, lower, second gesture, relaxed; single person per cell so the game can mirror a second real character to make a conversation. ROW 6 military instructor in muted blue work robe practicing with a wooden training staff: ready, raise, thrust, turn, withdraw, ready; staff must fit within each cell. No buildings, no scenery, no floor tiles, no bounding boxes, no panels, no text, no letters, no numbers, no names, no icons, no background fill. All areas surrounding the painted figures, their hand tools and the tiny anvil must be true alpha transparent. Natural ink edges, subdued jade, cream, brown and grey, light from upper left. A clean production sprite sheet for a tiny living Chinese camp, exact six-by-six uniform grid is mandatory.
```
