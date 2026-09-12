import { hasOwn, requireRule, journal, count } from './utils.js?v=0.15.0';

export const QUALITIES=[
  {name:'凡',power:1,speed:1,level:1,hall:1},
  {name:'灵',power:1.2,speed:1.05,level:15,hall:2,cost:{silver:1200,items:{spirit_essence:6,martial_pages:10}}},
  {name:'仙',power:1.5,speed:1.1,level:30,hall:4,cost:{silver:4000,items:{spirit_essence:18,immortal_seal:6,martial_pages:30}}}
];
export const qualityOf=h=>h?.quality??0;
export function promotionQuote(s,id){
  const h=s.heroes[id],current=qualityOf(h),next=QUALITIES[current+1];
  let reason=!h||h.status!=='owned'?'先邀请这位好汉入寨':!next?'已达仙品':h.level<next.level?`人物须达 ${next.level} 级`:(s.camp?.buildings.hall||0)<next.hall?`聚义厅须达 ${next.hall} 级`:'';
  if(!reason&&s.player.silver<next.cost.silver)reason='碎银不足';
  if(!reason&&Object.entries(next.cost.items).some(([k,n])=>(s.inventory[k]||0)<n))reason='升品材料不足';
  if(s.battle||s.scheme||s.event)reason='先结束当前战局或际遇';
  return {current,next,cost:next?.cost,reason};
}
export function promoteHero(s,d,id){
  requireRule(hasOwn(d.by.heroes,id),'没有这位好汉。');
  const q=promotionQuote(s,id);requireRule(!q.reason,q.reason);
  s.player.silver-=q.cost.silver;
  for(const [k,n] of Object.entries(q.cost.items))s.inventory[k]-=n;
  s.heroes[id].quality=q.current+1;count(s,'heroPromote');
  journal(s,`【好汉升品】${d.by.heroes[id].name}：${QUALITIES[q.current].name} → ${q.next.name}。等级、经验、招式、装备与坐骑全部继承。`);
}
export function validateQualities(s,check){
  for(const h of Object.values(s.heroes)){
    const q=h.quality===undefined?0:h.quality;check(Number.isInteger(q)&&q>=0&&q<=2,'好汉品阶');
    if(q>0)check(h.status==='owned'&&h.level>=QUALITIES[q].level&&(s.camp?.buildings.hall||0)>=QUALITIES[q].hall,'升品前置');
  }
}
