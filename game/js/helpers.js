import { requireRule, journal } from './utils.js?v=0.15.0';

// Original village characters live outside the 108-star hero dictionary.
export const HELPERS=[
  {id:'zhou_aqiao',name:'周阿樵',role:'樵夫',price:80,hall:1,building:'lumber',buildingName:'伐木场',bonus:{wood:6},effect:'每次经营额外木材 +6',story:'认得山中老路，斧头虽旧，劈柴从不误事。'},
  {id:'tian_ersao',name:'田二嫂',role:'农户',price:90,hall:1,building:'farm',buildingName:'农田',bonus:{food:6},effect:'每次经营额外粮草 +6',story:'带着一袋种子投寨，最会侍弄薄田。'},
  {id:'liu_xiaoyu',name:'柳小鱼',role:'渔娘',price:120,hall:1,bonus:{food:4},effect:'每次经营额外粮草 +4',story:'摇一叶小舟讨生活，愿把每日渔获分给寨中。'},
  {id:'qian_xiaoman',name:'钱小满',role:'货郎',price:140,hall:1,building:'market',buildingName:'集市',bonus:{silver:10},effect:'每次经营额外碎银 +10',story:'走村串巷卖针线，熟悉附近几个集市的行情。'},
  {id:'luo_musheng',name:'罗木生',role:'木匠',price:160,hall:2,building:'lumber',buildingName:'伐木场',bonus:{wood:4},effect:'每次经营额外木材 +4',story:'会修门窗、整木料，边角余材也舍不得丢。'},
  {id:'chen_xiaoyao',name:'陈小药',role:'药童',price:180,hall:1,building:'clinic',buildingName:'医馆',bonus:{heal:3},effect:'每次治疗伤兵人数上限 +3',story:'曾在乡间药铺帮工，识得草药，也肯耐心照顾伤员。'},
];
const prefix='camp_helper_';
export const hasHelper=(s,id)=>s.progress.flags[prefix+id]===true;
export const helperActive=(s,h)=>hasHelper(s,h.id)&&!!s.camp&&(!h.building||s.camp.buildings[h.building]>0);
export const hiredHelpers=s=>HELPERS.filter(h=>hasHelper(s,h.id));
export function helperBonus(s){
  const total={wood:0,food:0,silver:0,heal:0};
  for(const h of HELPERS)if(helperActive(s,h))for(const [k,n] of Object.entries(h.bonus))total[k]+=n;
  return total;
}
export function helperQuote(s,h){
  return hasHelper(s,h.id)?'已入寨':!s.camp?'先建立寨子':s.camp.buildings.hall<h.hall?`需要聚义厅 ${h.hall} 级`:s.player.silver<h.price?'碎银不足':'';
}
export function hireHelper(s,id){
  const h=HELPERS.find(h=>h.id===id);requireRule(h,'没有这位乡里帮手。');requireRule(!helperQuote(s,h),helperQuote(s,h));
  s.player.silver-=h.price;s.progress.flags[prefix+id]=true;
  journal(s,`【乡里来投】${h.role}${h.name}入寨。${h.effect}；${h.building?'建成'+h.buildingName+'后上工。':'现已上工。'}`);
}
export function validateHelpers(s,check){
  for(const [key,value] of Object.entries(s.progress.flags))if(key.startsWith(prefix)){
    const h=HELPERS.find(h=>key===prefix+h.id);
    check(!!h,'乡里帮手');if(value)check(!!s.camp&&s.camp.buildings?.hall>=h.hall,'乡里帮手入寨条件');
  }
}
