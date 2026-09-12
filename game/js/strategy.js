import { HERO_SPECIALTIES, DRILLS, STYLES, TERRAIN_NAMES, MECHANICS, activeBonds, battleTerrain } from './strategy-data.js?v=0.15.0';
import { hasOwn, requireRule, journal } from './utils.js?v=0.15.0';

export function drillQuote(s,id){return {cost:{silver:200,items:{martial_pages:3,iron:3}},reason:!s.camp?'先建立寨子':s.heroes[id]?.status!=='owned'?'先迎入这位好汉':s.camp.buildings.barracks<2?'兵营需要 2 级':s.heroes[id].level<10?'英雄需要 10 级':s.player.silver<200?'碎银不足':(s.inventory.martial_pages||0)<3?'武学残页不足':(s.inventory.iron||0)<3?'精铁不足':''};}
export function trainDrill(s,a){
 requireRule(a.choice===null||hasOwn(DRILLS,a.choice),'无效的专精方向。');requireRule(s.heroes[a.id]?.status==='owned','先迎入这位好汉。');
 requireRule((s.strategy?.drills[a.id]||null)!==a.choice,'已采用此训练方向。');
 if(a.choice!==null){const q=drillQuote(s,a.id);requireRule(!q.reason,q.reason);s.player.silver-=200;s.inventory.martial_pages-=3;s.inventory.iron-=3;}
 s.strategy??={version:1,drills:{}};if(a.choice===null)delete s.strategy.drills[a.id];else s.strategy.drills[a.id]=a.choice;
 journal(s,a.choice?'【部队专精】训练完成：'+DRILLS[a.choice].name+'。仅实际带兵的好汉生效。':'【部队专精】已恢复常规训练，不返还材料。');
}
export function initializeStrategy(s,b){
 if(b.martial!==2||b.depth)return;
 s.strategy??={version:1,drills:{}};
 const terrain=battleTerrain(b),m=b.context.type==='rotation'?MECHANICS[b.context.id]:null;
 b.depth={version:1,terrain,drills:Object.fromEntries(b.team.filter(u=>s.strategy.drills[u.id]).map(u=>[u.id,s.strategy.drills[u.id]])),objective:{kind:m?b.context.id:'none',nextAt:m?.interval||0,integrity:100,waves:0}};
 for(const u of b.team){const p=HERO_SPECIALTIES[u.id],drill=DRILLS[b.depth.drills[u.id]];
  if(drill&&u.corps?.troops){u.attack=Math.round(u.attack*drill.attack);u.defense=Math.round(u.defense*drill.defense);b.log.push(`【部队专精】${u.name} · ${drill.name}。`);}
  b.log.push(`【英雄专长】${u.name} · ${TERRAIN_NAMES[p.terrain]}${p.terrain===terrain?'得地利，伤害 +12%':''} · ${STYLES[p.style].name}。`);
 }
 for(const g of activeBonds(b.team.map(u=>u.id),terrain)){
  for(const u of b.team){if(g.stat==='rage')u.rage=Math.min(100,u.rage+g.rate);else if(g.stat==='hp')u.hp=u.maxHp=Math.round(u.maxHp*(1+g.rate));else u[g.stat]=Math.round(u[g.stat]*(1+g.rate));}
  b.log.push(`【阵容羁绊】${g.name}已生效。`);
 }
 if(m)b.log.push(`【副本规则】${m.name}：${m.text}`);
}
export function strategyFactor(b,u,target,normal){
 if(!b.depth)return 1;let n=1;
 if(u.side==='team'){
  const p=HERO_SPECIALTIES[u.id];if(p.terrain===b.depth.terrain)n*=1.12;
  if(p.style==='assault'&&target.hp>target.maxHp/2)n*=1.10;
  if(normal&&b.depth.objective.kind==='ore'&&b.enemy.some(e=>e.model==='guard'&&e.hp>0))n*=.75;
  if(normal&&b.depth.objective.kind==='siege'&&b.elapsed<15000)n*=.65;
 }
 if(target.side==='team'&&HERO_SPECIALTIES[target.id].style==='shield'&&target.hp<target.maxHp/2)n*=.88;
 return n;
}
export function strategyFollowup(b,u,target,api){
 if(!b.depth||u.side!=='team'||(u.attacks+1)%3!==0)return;
 const p=HERO_SPECIALTIES[u.id],party=b.team.filter(a=>a.hp>0),low=[...party].sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
 if(p.style==='archer'&&target?.hp>0){api.addStatus(target,{id:'armor_break',value:1,turns:2},b.elapsed);api.log(b,`【追射】${u.name}射破${target.name}护甲，持续 4 秒。`);}
 if(p.style==='scout'&&target?.hp>0){const n=Math.min(target.rage,8);target.rage-=n;api.log(b,`【扰阵】${u.name}使${target.name}怒气 −${n}。`);}
 if(p.style==='medic'&&low){const n=Math.min(low.maxHp-low.hp,Math.round(low.maxHp*.03));low.hp+=n;if(n)api.log(b,`【援护】${u.name}为${low.name}回复 ${n} 气血。`);}
 if(p.style==='naval'&&b.depth.terrain==='water'&&low){api.addStatus(low,{id:'guard',value:.1,turns:2},b.elapsed);api.log(b,`【搏浪】${u.name}护住${low.name}，护阵 4 秒。`);}
}
export function objectiveTimes(b){const o=b.depth?.objective,m=MECHANICS[o?.kind];return [...(o?.nextAt?[o.nextAt]:[]),...(m?.deadline&&b.elapsed<m.deadline?[m.deadline]:[])];}
export function objectiveFailed(b){const o=b.depth?.objective;return !!o&&((['convoy','stable'].includes(o.kind)&&o.integrity===0)||(MECHANICS[o.kind]?.deadline&&b.elapsed>=MECHANICS[o.kind].deadline));}
export function advanceObjective(b,log){
 const o=b.depth?.objective,m=MECHANICS[o?.kind];if(!m||!o.nextAt||o.nextAt!==b.elapsed)return;
 o.waves++;o.nextAt+=m.interval;
 if(['stable','convoy'].includes(o.kind)){
  const guarded=b.orders?.stance==='guard'||b.expedition?.tactic==='guard',loss=Math.ceil(b.enemy.filter(u=>u.hp>0).length*(o.kind==='stable'?12:15)*(guarded?.5:1));
  o.integrity=Math.max(0,o.integrity-loss);log(b,`【护运】${guarded?'固守护车，':''}耐久 −${loss}，剩余 ${o.integrity}/100。`);
 }
 if(o.kind==='tide')for(const u of b.team.filter(u=>u.hp>0)){const safe=HERO_SPECIALTIES[u.id].terrain==='water'||b.orders?.stance==='guard',loss=Math.max(1,Math.round(u.maxHp*(safe?.025:.05)));u.hp=Math.max(0,u.hp-loss);log(b,`【潮汐】${u.name}${safe?'稳住脚步，':''}损失 ${loss} 气血。`);}
 if(o.kind==='fortress'){
  for(const u of b.enemy.filter(u=>u.hp>0))u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.08));
  log(b,`【敌军补给】第 ${o.waves}/3 次，存活敌军回复 8% 最大气血。`);if(o.waves>=3)o.nextAt=0;
 }
}
export function validateStrategy(s,check){
 const p=s.strategy,b=s.battle,obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 if(p!==undefined){check(obj(p)&&p.version===1&&obj(p.drills),'策略进度');for(const [id,v] of Object.entries(p.drills))check(s.heroes[id]?.status==='owned'&&hasOwn(DRILLS,v),'专精方向');}
 if(b?.depth!==undefined){const z=b.depth,o=z?.objective;check(p&&obj(z)&&z.version===1&&b.martial===2&&!b.guest&&z.terrain===battleTerrain(b)&&obj(z.drills),'战场策略');
  for(const [id,v] of Object.entries(z.drills))check(b.team.some(u=>u.id===id)&&hasOwn(DRILLS,v),'专精快照');
  check(obj(o)&&o.kind===(b.context.type==='rotation'?b.context.id:'none')&&int(o.integrity,0,100)&&int(o.waves,0,30)&&int(o.nextAt,0,192000),'副本目标');
  const m=MECHANICS[o.kind];check(m?.interval?(o.nextAt===0?o.kind==='fortress'&&o.waves===3:o.nextAt===(o.waves+1)*m.interval&&o.nextAt>b.elapsed):o.nextAt===0&&o.waves===0,'副本事件时钟');
  check(['convoy','stable'].includes(o.kind)||o.integrity===100,'护运耐久');
 }
}
