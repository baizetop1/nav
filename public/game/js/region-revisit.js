import {REGION_REVISITS,revisitSpec,revisitHas,revisitCounter} from './region-revisit-data.js?v=0.82.1';
import {WORKSHOP_RECIPES} from './supplies-data.js?v=0.82.1';
import {requireRule,journal} from './utils.js?v=0.82.1';
const TASKS={return:'return_met',investigate:'trace_checked',thanks:'return_paid'};
export function revisitTask(s,region,id){const r=revisitSpec(region);if(!r||!Object.hasOwn(TASKS,id))return null;const x=s.exploration?.[region],place=id==='investigate'?r.trace:r.home;
 if(x?.flags.includes(TASKS[id]))return '这件事已经办妥。';
 if(x?.position!==place)return '先到委托所在地点。';
 if(id==='return'&&!revisitHas(s,region,'invited'))return '先完成首次委托，邀请好汉入寨。';
 if(id==='investigate'&&!revisitHas(s,region,'return_met'))return '先听故人说完这件事。';
 if(id==='thanks'&&!revisitHas(s,region,'won_return'))return '先完成'+r.title+'。';
 if(id==='thanks'&&Object.entries(r.rewards).some(([key,n])=>(s.inventory[key]||0)+n>10000000))return '谢礼库存已满，整理后再领。';return '';
}
export function revisitAction(s,region,id){const reason=revisitTask(s,region,id);if(reason===null)return false;requireRule(!reason,reason);const r=REGION_REVISITS[region];if(id==='thanks')for(const [key,n]of Object.entries(r.rewards))s.inventory[key]=(s.inventory[key]||0)+n;s.exploration[region].flags.push(TASKS[id]);journal(s,id==='return'?r.intro:id==='investigate'?r.traceText:r.thanksText);return true;}
export function revisitWorkQuote(s,region){const r=revisitSpec(region);return {reason:!r?'没有这项加工。':!s.camp?'先建立寨子。':s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run?'先结束交战或行程。':!revisitHas(s,region,'return_paid')?'先完成'+r.title+'，回去交还失物。':!s.exploration.buildings.includes(r.building)?'先建好'+(r.building==='clinic'?'配药间':'客舍')+'。':(s.daily.counters[revisitCounter(region)]||0)>=1?'今日已加工，明日再来。':(s.daily.counters['craft_'+r.output]||0)>=WORKSHOP_RECIPES[r.output].limit?'今日共同加工额度已用完。':(s.inventory[r.output]||0)>=10000000?'成品库存已满。':s.player.silver<r.silver?'需要碎银 '+r.silver+'。':Object.entries(r.items).some(([key,n])=>(s.inventory[key]||0)<n)?'材料不足，备齐后再来。':''};}
export function revisitWork(s,region){const q=revisitWorkQuote(s,region);requireRule(!q.reason,q.reason);const r=REGION_REVISITS[region];for(const [id,n]of Object.entries(r.items))s.inventory[id]-=n;s.player.silver-=r.silver;s.inventory[r.output]=(s.inventory[r.output]||0)+1;s.daily.counters[revisitCounter(region)]=1;s.daily.counters['craft_'+r.output]=(s.daily.counters['craft_'+r.output]||0)+1;journal(s,r.work+'已完成，成品收入行囊。今日加工一次，明日再来。');}
