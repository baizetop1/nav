import {CROSS_TASKS,CROSS_REWARDS,CROSS_WORK,crossHas,crossTaskReason} from './cross-region-data.js?v=0.82.0';
import {WORKSHOP_RECIPES} from './supplies-data.js?v=0.82.0';
import {requireRule,journal} from './utils.js?v=0.82.0';
export function crossAction(s,a){
 const reason=crossTaskReason(s,a.id);requireRule(!reason,reason);
 const x=s.exploration.crossRegion??={version:1,flags:[]};x.flags.push(CROSS_TASKS[a.id].flag);
 journal(s,CROSS_TASKS[a.id].text);
 if(a.id==='deliver'){for(const [id,n]of Object.entries(CROSS_REWARDS))s.inventory[id]=(s.inventory[id]||0)+n;journal(s,'药已入库：安道全、时迁、阮小七信物各 1，金疮膏 1、浓制药引 2。医馆可每日合配一份行药。');}
}
export function crossWorkQuote(s){const r=CROSS_WORK;return {reason:!s.camp?'先建立寨子。':s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run?'先结束交战或行程。':!crossHas(s,'delivered')?'先把药船护送回寨。':s.camp.buildings.clinic<2?'医馆需要 2 级。':(s.daily.counters[r.counter]||0)>=r.limit?'今日已合配行药，明日再来。':(s.daily.counters['craft_'+r.output]||0)>=WORKSHOP_RECIPES[r.output].limit?'今日金疮膏加工次数已用完。':(s.inventory[r.output]||0)>=10000000?'金疮膏库存已满。':s.player.silver<r.silver?'还缺碎银 '+(r.silver-s.player.silver)+'。':Object.entries(r.items).some(([k,n])=>(s.inventory[k]||0)<n)?'泽兰、苇丝或药草还没备齐。':''};}
export function crossWork(s){const q=crossWorkQuote(s);requireRule(!q.reason,q.reason);const r=CROSS_WORK;for(const [id,n]of Object.entries(r.items))s.inventory[id]-=n;s.player.silver-=r.silver;s.inventory[r.output]=(s.inventory[r.output]||0)+1;s.daily.counters[r.counter]=1;s.daily.counters['craft_'+r.output]=(s.daily.counters['craft_'+r.output]||0)+1;journal(s,'安道全调好药膏，装进小七编的苇袋里。金疮膏 1 已收好；今日合配过了。');}
export function finishCrossRegion(s,b){if(b.context.route==='medicineboat'&&b.outcome==='victory'&&!crossHas(s,'won')){s.exploration.crossRegion.flags.push('won');journal(s,'小七把药船拖过浅水，箱子里的纸包还干着。回寨交给安道全吧。');}}
