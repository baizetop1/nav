import {aptitudeSilver,HERO_APTITUDES} from './hero-aptitude.js?v=0.84.0';
import { promotionCore, PROMOTION_CORE_COSTS } from './promotion-data.js?v=0.84.0';
import { hasOwn, requireRule, journal, count } from './utils.js?v=0.84.0';

export const QUALITIES=[
  {name:'凡',power:1,speed:1,level:1,hall:1},
  {name:'灵',power:1.2,speed:1.05,level:15,hall:2,cost:{silver:1200,items:{spirit_essence:6,martial_pages:10}}},
  {name:'仙',power:1.5,speed:1.1,level:30,hall:4,cost:{silver:4000,items:{spirit_essence:18,immortal_seal:6,martial_pages:30}}}
];
export const qualityOf=h=>h?.quality??0;
export function promotionQuote(s,id){
  const h=s.heroes[id],current=qualityOf(h),next=QUALITIES[current+1],model=promotionCore(id),core=model&&next?{...model,required:PROMOTION_CORE_COSTS[current+1]}:null;
  const originalCost=next&&core?{silver:next.cost.silver,items:{[core.item]:core.required,...next.cost.items}}:next?.cost;
  const cost=originalCost?{...originalCost,silver:aptitudeSilver(id,originalCost.silver)}:originalCost;
  let reason=!h||h.status!=='owned'?'先邀请这位好汉入寨':!next?'已达仙品':h.level<next.level?`人物须达 ${next.level} 级`:(s.camp?.buildings.hall||0)<next.hall?`聚义厅须达 ${next.hall} 级`:'';
  if(!reason&&s.player.silver<cost.silver)reason='碎银不足';
  if(!reason&&core&&(s.inventory[core.item]||0)<core.required)reason=core.name+'不足';
  if(!reason&&Object.entries(cost.items).some(([k,n])=>(s.inventory[k]||0)<n))reason='升品材料不足';
  if(s.battle||s.scheme||s.event)reason='先结束当前战局或际遇';
  return {current,next,cost,core,reason};
}
export function promoteHero(s,d,id){
  requireRule(hasOwn(d.by.heroes,id),'没有这位好汉。');
  const q=promotionQuote(s,id);requireRule(!q.reason,q.reason);
  s.player.silver-=q.cost.silver;
  for(const [k,n] of Object.entries(q.cost.items))s.inventory[k]-=n;
  s.heroes[id].quality=q.current+1;if(HERO_APTITUDES[id])s.progress.flags.hero_aptitude_v1=true;s.progress.flags.promotion_cores_v1=true;count(s,'heroPromote');
  journal(s,`【好汉升品】${d.by.heroes[id].name}：${QUALITIES[q.current].name} → ${q.next.name}。消耗碎银 ${q.cost.silver}；等级、经验、招式、装备与坐骑全部继承。`);
}
export function validateQualities(s,check){
  for(const h of Object.values(s.heroes)){
    const q=h.quality===undefined?0:h.quality;check(Number.isInteger(q)&&q>=0&&q<=2,'好汉品阶');
    if(q>0)check(h.status==='owned'&&h.level>=QUALITIES[q].level&&(s.camp?.buildings.hall||0)>=QUALITIES[q].hall,'升品前置');
  }
}
