import {GEAR_TRAITS,BUILD_GUIDES,PERSONAL_TRAITS} from './tactics-data.js?v=0.68.0';
export const hasTactics=s=>!!s.battle?.tactics||!!s.lastBattle?.tacticsReport||s.equipment.some(e=>e.refine>0)||Object.keys(s.expansion?.personal||{}).some(id=>Object.hasOwn(PERSONAL_TRAITS,id))||['build','gear','personal'].includes(s.development?.goal?.kind);
export function tacticsPreserved(a,b){return a.equipment.every(e=>!(e.refine>0)||!b.equipment.some(x=>x.uid===e.uid)||b.equipment.find(x=>x.uid===e.uid).refine>=e.refine);}
export function validateTactics(s,d,check){
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),num=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 for(const e of s.equipment)if(e.refine!==undefined)check(Object.hasOwn(GEAR_TRAITS,e.item)&&num(e.refine,3),'装备精修');
 const t=s.battle?.tactics,b=s.battle;
 if(t!==undefined){
  check(obj(t)&&t.version===1&&!b.guest&&b.rules===2&&obj(t.gear)&&obj(t.cooldowns)&&obj(t.counts),'战法快照');
  check(Object.keys(t.gear).length===b.team.length&&b.team.every(u=>Array.isArray(t.gear[u.id])),'战法人物');
  const keys=new Set();
  for(const u of b.team){const rows=t.gear[u.id],actual=s.equipment.filter(e=>e.hero===u.id&&Object.hasOwn(GEAR_TRAITS,e.item)).map(e=>({item:e.item,rank:e.refine||0}));
   check(rows.length<=6&&JSON.stringify(rows)===JSON.stringify(actual),'战法装备来源');
   for(const e of rows){check(obj(e)&&Object.hasOwn(GEAR_TRAITS,e.item)&&num(e.rank,3),'战法装备');keys.add(u.id+'_'+e.item);}
   if(s.expansion?.personal[u.id]&&Object.hasOwn(PERSONAL_TRAITS,u.id))keys.add(u.id+'_personal');
  }
  for(const [key,n]of Object.entries(t.cooldowns))check(keys.has(key)&&num(n,190000),'战法触发时钟');
  for(const [key,n]of Object.entries(t.counts))check(keys.has(key)&&num(n,100000),'战法触发次数');
 }
 const r=s.lastBattle?.tacticsReport;if(r!==undefined){check(obj(r)&&r.version===1&&obj(r.counts),'战法复盘');for(const [key,n]of Object.entries(r.counts))check(s.lastBattle.team.some(u=>key===u.id+'_personal'&&Object.hasOwn(PERSONAL_TRAITS,u.id)||Object.keys(GEAR_TRAITS).some(id=>key===u.id+'_'+id))&&num(n,100000),'战法复盘次数');}
}

