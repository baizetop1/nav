import {CROSS_FLAGS,CROSS_TASKS,CROSS_WORK,crossHas,crossAvailable} from './cross-region-data.js?v=0.82.1';
export function validateCrossRegion(s,check){
 const x=s.exploration?.crossRegion,n=s.daily?.counters?.[CROSS_WORK.counter];
 if(x!==undefined){check(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')==='flags,version'&&x.version===1&&Array.isArray(x.flags)&&x.flags.length>0&&new Set(x.flags).size===x.flags.length&&x.flags.every(k=>CROSS_FLAGS.includes(k)),'跨地区共事记录');check(crossAvailable(s),'共事三地前置');
  for(let i=0;i<CROSS_FLAGS.length;i++)if(crossHas(s,CROSS_FLAGS[i]))check(CROSS_FLAGS.slice(0,i).every(k=>crossHas(s,k)),'共事事件先后');
  for(const t of Object.values(CROSS_TASKS))if(t.region&&crossHas(s,t.flag))check(s.exploration[t.region].visited.includes(t.node),'共事到访地点');
  if(crossHas(s,'won'))check([1,2,3].reduce((n,t)=>n+(s.specialDungeons?.clears['waterfort_'+t]||0),0)>=3,'护药战绩');
 }
 if(n!==undefined)check(Number.isInteger(n)&&n>=0&&n<=1&&(!n||crossHas(s,'delivered')&&s.camp.buildings.clinic>=2&&(s.daily.counters.craft_jinchuang_gao||0)>=n),'共事合配行药');
 for(const c of [s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last])if(c?.route==='medicineboat')check(c.id==='waterfort'&&crossHas(s,'prepared')&&(c!==s.specialDungeons?.last||c.outcome!=='victory'||crossHas(s,'won')),'药船战斗前置');
}
export function crossPreserved(a,b){const x=a.exploration?.crossRegion,y=b?.exploration?.crossRegion,n=a.daily?.counters?.[CROSS_WORK.counter]||0;return (!x||!!y&&Array.isArray(y.flags)&&x.flags.every(k=>y.flags.includes(k)))&&(!n||!!b?.daily&&b.daily.date>=a.daily.date&&(b.daily.date>a.daily.date||(b.daily.counters[CROSS_WORK.counter]||0)>=n&&(b.daily.counters.craft_jinchuang_gao||0)>=(a.daily.counters.craft_jinchuang_gao||0)));}
