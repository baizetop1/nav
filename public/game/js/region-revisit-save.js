import {REGION_REVISITS,revisitHas,revisitCounter,revisitByRoute} from './region-revisit-data.js?v=0.84.0';
export function validateRegionRevisits(s,check){for(const [region,r]of Object.entries(REGION_REVISITS)){const x=s.exploration?.[region],has=k=>revisitHas(s,region,k);
 for(const [flag,need]of Object.entries({return_met:'invited',trace_checked:'return_met',won_return:'trace_checked',return_paid:'won_return'}))if(has(flag))check(has(need),'重访事件先后');
 for(const [flag,place]of Object.entries({return_met:r.home,trace_checked:r.trace,return_paid:r.home}))if(has(flag))check(x.visited.includes(place),'重访事件地点');
 if(has('won_return'))check((s.specialDungeons?.clears[r.dungeon+'_1']||0)>=2||[2,3].some(t=>(s.specialDungeons?.clears[r.dungeon+'_'+t]||0)>0),'重访挑战战绩');
 const n=s.daily.counters[revisitCounter(region)];if(n!==undefined)check(Number.isInteger(n)&&n>=0&&n<=1&&(!n||has('return_paid')&&s.exploration.buildings.includes(r.building)&&(s.daily.counters['craft_'+r.output]||0)>=n),'重访每日加工');
 }
 for(const c of [s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last]){const pair=revisitByRoute(c?.route);if(pair)check(c.id===pair[1].dungeon&&revisitHas(s,pair[0],'trace_checked')&&(!(c===s.specialDungeons?.last&&c.outcome==='victory')||revisitHas(s,pair[0],'won_return')),'重访战斗前置');}
}
export function revisitPreserved(a,b){return Object.entries(REGION_REVISITS).every(([region,r])=>{const k=revisitCounter(region),n=a.daily?.counters[k]||0;return !n||!!b?.daily&&b.daily.date>=a.daily.date&&(b.daily.date>a.daily.date||(b.daily.counters[k]||0)>=n&&(b.daily.counters['craft_'+r.output]||0)>=(a.daily.counters['craft_'+r.output]||0));});}
