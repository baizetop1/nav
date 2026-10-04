// Raw resources become useful intermediates through the existing, daily-limited provision workshop.
export const CRAFT_MATERIALS=['tempered_steel','woven_linen','cured_hide','medicinal_extract'];
export const EXTRA_BATTLE_ITEMS=['jinchuang_gao','xing_shen_san','zhuanggu_tang'];
export const EXTRA_EQUIPMENT=['guard_pike','guard_helmet','scout_coat','sturdy_belt','river_boots','medic_pouch'];
export const RAW_WORKSHOP_ITEMS=['scrap_iron','iron','cloth','leather','tiger_skin','herb','tiger_bone','wood','grain','dark_iron','blueprint','skill_page'];
export const WORKSHOP_RECIPES={
 dark_iron:{name:'精炼玄铁',building:'market',silver:20,items:{tempered_steel:1,iron:1},limit:4},
 blueprint:{name:'抄制兵器图纸',building:'market',silver:30,items:{cloth:2,wood:1,iron:1},limit:2},
 martial_pages:{name:'整理武学残页',building:'market',silver:20,items:{skill_page:3},limit:4},
 tempered_steel:{name:'淬钢 · 淬炼钢',building:'market',silver:35,items:{scrap_iron:4,iron:2},limit:8},
 woven_linen:{name:'织布 · 密织麻布',building:'market',silver:20,items:{cloth:4},limit:8},
 cured_hide:{name:'鞣革 · 鞣制硬革',building:'market',silver:25,items:{leather:3,tiger_skin:1},limit:8},
 medicinal_extract:{name:'煎药 · 浓制药引',building:'clinic',silver:25,items:{herb:5,tiger_bone:1},limit:8},
 jinchuang_gao:{name:'调制金疮膏',building:'clinic',silver:45,items:{medicinal_extract:2,cloth:2,herb:4},limit:3},
 xing_shen_san:{name:'调制醒神散',building:'clinic',silver:35,items:{medicinal_extract:1,herb:3},limit:3},
 zhuanggu_tang:{name:'煎煮壮骨汤',building:'clinic',silver:40,items:{medicinal_extract:1,grain:2,herb:2},limit:3}
};
