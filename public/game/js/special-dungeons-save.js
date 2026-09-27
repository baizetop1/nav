import {SPECIAL_DUNGEONS,specialDropTable,validSpecialContext} from './special-dungeons-data.js?v=0.54.0';
const object=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const exact=(o,keys)=>object(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const integer=(n,min=0,max=10000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const clearKeys=()=>Object.keys(SPECIAL_DUNGEONS).flatMap(id=>[1,2,3].map(tier=>id+'_'+tier));
export const hasSpecialDungeons=s=>s.specialDungeons!==undefined||s.battle?.context?.type==='special'||s.lastBattle?.context?.type==='special';
export function validateSpecialDungeons(s,check){
 const x=s.specialDungeons,b=s.battle,r=s.lastBattle;
 if(x===undefined){check(b?.context?.type!=='special'&&r?.context?.type!=='special','特殊副本缺少记录');return;}
 check(exact(x,['version','clears','last'])&&x.version===1&&object(x.clears),'特殊副本记录');
 const keys=clearKeys();for(const [id,n] of Object.entries(x.clears))check(keys.includes(id)&&integer(n,1),'特殊副本通关次数');
 const unlocked=(id,tier)=>(s.camp?.buildings.hall||0)>=tier&&(tier===1||(x.clears[id+'_'+(tier-1)]||0)>0);
 for(const key of Object.keys(x.clears)){const [id,tier]=key.split('_');check(unlocked(id,Number(tier)),'特殊副本通关前置');}
 const last=x.last;
 check(last===null||exact(last,['id','tier','outcome','at','drops']),'特殊副本最近战果');
 if(last===null)check(Object.keys(x.clears).length===0,'特殊副本缺少最近战果');
 else{
  const dungeon=Object.hasOwn(SPECIAL_DUNGEONS,last.id)?SPECIAL_DUNGEONS[last.id]:null;
  check(!!dungeon&&integer(last.tier,1,3)&&['victory','defeat','retreat'].includes(last.outcome)&&integer(last.at,0,s.clock)&&Array.isArray(last.drops),'特殊副本战果来源');
  check(unlocked(last.id,last.tier),'特殊副本战果前置');
  const table=specialDropTable(last.id,last.tier);
  check(last.drops.length<=table.length&&new Set(last.drops.map(v=>v?.kind+':'+v?.id)).size===last.drops.length,'特殊副本掉落条目');
  check(last.outcome==='victory'?(x.clears[last.id+'_'+last.tier]||0)>=1:last.drops.length===0,'特殊副本胜负与掉落');
  for(const drop of last.drops){
   check(exact(drop,['kind','id','count','stored']),'特殊副本掉落格式');
   const entry=table.find(e=>e.kind===drop.kind&&e.id===drop.id);
   check(!!entry&&integer(drop.count,entry.min,entry.max)&&integer(drop.stored,0,drop.count),'特殊副本掉落物与数量');
  }
 }
 if(b?.context?.type==='special'){
  check(validSpecialContext(b.context)&&unlocked(b.context.id,b.context.tier)&&!!s.camp&&!b.guest&&b.martial===2&&b.expedition?.troops===0&&b.team.every(u=>u.corps?.troops===0),'特殊副本出战队伍');
  check(!s.realm?.trek&&!s.expansion?.run&&!b.journey&&!b.lesson&&b.expansion?.smoke!==true,'特殊副本战局绑定');
 }
 if(r?.context?.type==='special'){
  check(validSpecialContext(r.context)&&r.troops===0&&r.wounded===0&&!(r.fallen||0),'特殊副本复盘兵力');
  check(last!==null&&r.at===last.at&&r.context.id===last.id&&r.context.tier===last.tier&&r.outcome===last.outcome,'特殊副本复盘与战果');
 }
}
// Finishing another run may replace the receipt. Earned clears cannot disappear on a normal upload.
export function specialDungeonsPreserved(oldState,nextState){
 const before=oldState.specialDungeons,after=nextState?.specialDungeons;
 if(before===undefined)return true;
 return object(after)&&after.version===1&&object(after.clears)&&Object.entries(before.clears).every(([id,n])=>integer(after.clears[id],n));
}
