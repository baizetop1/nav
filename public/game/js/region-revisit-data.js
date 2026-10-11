export const REGION_REVISITS={
 ruins:{name:'荒祠',hero:'yuehe',home:'bell',trace:'passage',boss:'vault',dungeon:'ruinsvault',route:'bellbreak',title:'断钟取谱',accept:'听乐和说钟声',inspect:'查看夹道钟绳',deliver:'交还曲谱 · 收下谢礼',material:'stone_rubbing',rewards:{stone_rubbing:4,yuehe_token:2,skill_page:1},building:'lodge',work:'乐和 · 誊绘图纸',output:'blueprint',items:{stone_rubbing:4,cloth:2},silver:20,
  intro:'乐和把旧谱摊在石阶上：“少了一页，昨夜又听见他们拿钟声传号。我想去夹道看看。”',traceText:'钟绳换了新的，地上有拖箱子的印子。那页曲谱被带回内室，另有一个人专管摇钟。',fightText:'摇钟人站在最后一位。钟声会削弱全队攻击并减怒气；击倒或眩晕摇钟人，也可打断头目。',winText:'钟声停了，曲谱压在书箱底。带回钟楼给乐和。',thanksText:'乐和补齐了谱页，又照碑上的兵器画了几笔：“回寨备些纸布，这些图样也用得上。”',use:'兵器图纸用于打造装备；每日可誊绘一张，与普通抄图共用每日两次额度。'},
 forest:{name:'古道',hero:'shiqian',home:'post',trace:'watch',boss:'camp',dungeon:'forestcamp',route:'crossfire',title:'夺回路引',accept:'听茶棚掌柜说失货',inspect:'查找弩箭与脚印',deliver:'交还路引 · 收下谢礼',material:'mountain_vine',rewards:{mountain_vine:4,shiqian_token:2,cured_hide:1},building:'lodge',work:'时迁 · 整理皮料',output:'cured_hide',items:{mountain_vine:4,leather:2},silver:20,
  intro:'掌柜把账簿推过来：“货回来了，路引却让人拿走了。”时迁掂了掂柜上的弩箭：“不是上回那拨，先去哨台。”',traceText:'哨台下有两种弩箭，一路往营前，一路往后坡。时迁蹲下看脚印：“两边都有人，不能只盯着头目。”',fightText:'第二位与最末位弩手各追射气血比例最低的同伴。先除去一名便少一轮；眩晕弩手、打断头目或固守都能应对。',winText:'弩手退走，路引从皮囊里找到了。茶棚掌柜还在等它放行车队。',thanksText:'掌柜收好路引，让车队继续上路。时迁把完好的皮料挑出来：“用老藤绷紧晾着，比随便揉两下耐穿。”',use:'鞣制硬革用于衣甲和束带；每日整理一份，与普通鞣革共用每日八次额度。'},
 water:{name:'渡口',hero:'ruanxiaoqi',home:'dock',trace:'stakes',boss:'fort',dungeon:'waterfort',route:'backwash',title:'夺回渡船',accept:'听船老大说夜潮',inspect:'查看断缆与水痕',deliver:'送回渡船 · 收下谢礼',material:'reed_fiber',rewards:{reed_fiber:4,ruanxiaoqi_token:2,woven_linen:1},building:'clinic',work:'阮小七 · 编织包布',output:'woven_linen',items:{reed_fiber:4,cloth:2},silver:15,
  intro:'船老大指着空泊位：“夜里断了一根缆，船没了。”阮小七拉起绳头：“是刀割的。先看看桩边留下什么。”',traceText:'断缆卡在桩脚，水痕两高一低。阮小七朝水寨望去：“他们拿船挡水。头一阵浪过去，后头还有一道，别急着抢攻。”',fightText:'先撞前浪，三秒后再次蓄势，接着撞回头浪。固守使两波各减伤 60%；回头浪未固守还会损失怒气。两波都能分别打断。',winText:'水闸拆开，渡船顺水退了出来。把船带回鱼棚，船户明早还要摆渡。',thanksText:'船老大重新系好缆。阮小七把湿苇丝摊开：“晒干再编，药包和衣甲的衬布都能用。”',use:'密织麻布用于衣甲与药包；每日编一份，与普通织布共用每日八次额度。'}
};
export const REVISIT_FLAGS=['return_met','trace_checked','won_return','return_paid'];
export const revisitSpec=region=>Object.hasOwn(REGION_REVISITS,region)?REGION_REVISITS[region]:null;
export const revisitByRoute=route=>Object.entries(REGION_REVISITS).find(([,r])=>r.route===route);
export const revisitHas=(s,region,flag)=>!!s.exploration?.[region]?.flags.includes(flag);
export const revisitCounter=region=>'revisit_'+region;
export function revisitGoal(s,region){const r=revisitSpec(region),has=k=>revisitHas(s,region,k);if(!r||!has('invited'))return null;
 if(!has('return_met'))return {node:r.home,text:r.intro};
 if(!has('trace_checked'))return {node:r.trace,text:r.inspect+'，找出'+r.title+'的办法。'};
 if(!has('won_return'))return {node:r.boss,text:r.title+'：'+r.fightText};
 if(!has('return_paid'))return {node:r.home,text:r.winText};
 return {node:r.home,text:r.use,label:r.work,command:{type:'ui_section',view:'camp',id:'exploration',region,building:r.building}};
}
export function hasRegionRevisits(s){return Object.keys(REGION_REVISITS).some(region=>s.exploration?.[region]?.flags.some(k=>REVISIT_FLAGS.includes(k)||k==='rubbing_supplies')||(s.daily?.counters[revisitCounter(region)]||0)>0)||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>!!revisitByRoute(c?.route)||c?.id==='ruinsvault'&&(s.specialDungeons?.clears['ruins_'+c.tier]||0)<5)||[1,2,3].some(t=>(s.specialDungeons?.clears['ruinsvault_'+t]||0)>0&&(s.specialDungeons?.clears['ruins_'+t]||0)<5);}
