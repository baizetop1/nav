import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {auditFirstSession,d} from './shuihu-first-session-selfcheck.mjs';
import {dispatch} from '../public/game/js/core.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {mineCompanionGoal,mineCompanionHas,hasMineCompanion} from '../public/game/js/mine-companion-data.js';
import {regionFightQuote,regionTask} from '../public/game/js/exploration.js';
import {explorationPreserved} from '../public/game/js/exploration-save.js';
import {regionBonus,mineGoal} from '../public/game/js/exploration-data.js';
import {explorationGoalQuote,explorerChoices} from '../public/game/js/exploration-goals.js';
import {specialPlan} from '../public/game/js/special-dungeons.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {idleRates,IDLE_CYCLE} from '../public/game/js/idle-data.js';
import {idleQuote} from '../public/game/js/idle.js';
export {d};
const copy=structuredClone;
export const act=(s,type,a={})=>dispatch(d,s,{type,...a},s.clock);
const move=(s,id)=>act(s,'regionMove',{id}),task=(s,id)=>act(s,'regionDo',{id:'liyun_'+id});
const round=s=>assert.deepEqual(importSave(exportSave(s,{id:1,name:'矿洞新友'},d),d).state,s);
const reject=(s,fn,re)=>{const before=JSON.stringify(s);assert.throws(()=>fn(s),re);assert.equal(JSON.stringify(s),before,'rejected action keeps original save');};
export function fight(s,focus=true){s=act(s,'battleSkillMode',{mode:'auto'});if(focus)s=act(s,'battleOrder',{kind:'focus',target:s.battle.enemy.at(-1).id});for(let i=0;i<181&&!s.battle.outcome;i++)s=act(s,'battleTick',{delta:1000});assert.equal(s.battle.outcome,'victory',JSON.stringify({context:s.battle.context,team:s.battle.team.map(u=>[u.name,u.hp]),enemy:s.battle.enemy.map(u=>[u.name,u.hp])}));return act(s,'finishBattle');}
export function companionRun(seed=81){
 const states={};let s=auditFirstSession(seed).state;states.before=copy(s);const mark=k=>{round(s);states[k]=copy(s);};
 s=act(s,'regionOpen',{region:'mine'});s=move(s,'entrance');s=task(s,'meet');mark('met');
 s=move(s,'chamber');s=task(s,'survey');mark('checked');
 s=move(s,'furnace');s=task(s,'hoops');mark('ready');
 s=move(s,'rail');s=act(s,'regionBattle',{id:'rail',approach:'timberguard'});mark('pending');
 s=fight(s);mark('won');s=move(s,'chamber');s=task(s,'brace');mark('braced');s=task(s,'invite');mark('complete');return states;
}
export function verifyCompanion(){
 const states=companionRun(),{before,met,checked,ready,pending,won,braced,complete}=states;
 assert.equal(hasMineCompanion(before),false);assert.equal(mineCompanionGoal(before).node,'entrance');assert.equal(mineGoal(before).node,'entrance');
 assert.equal(before.heroes.liyun.status==='owned',false);assert.equal(met.heroes.liyun.status,'known');assert.equal(complete.heroes.liyun.status,'owned');assert.equal(complete.heroes.liyun.level,1);assert.deepEqual(complete.team,before.team,'full team is never replaced');assert.equal(complete.recruit.total,before.recruit.total);assert.equal(complete.inventory.recruit_order,before.inventory.recruit_order);assert.equal(complete.inventory.liyun_token,(before.inventory.liyun_token||0)+2);
 for(const s of [met,checked,ready,braced])assert.equal(s.player.silver,before.player.silver);assert.equal(complete.player.stamina,before.player.stamina);assert.equal(complete.camp.food,before.camp.food);assert.deepEqual(ready.inventory,before.inventory,'quest tools use salvaged shaft, not player inventory');assert.deepEqual(braced.inventory,won.inventory,'delivered quest timber is not charged twice');
 assert.equal(won.specialDungeons.last.bonus.id,'wood');assert.equal(won.specialDungeons.last.bonus.stored,1);assert.ok(mineCompanionHas(won,'liyun_won'));assert.equal(won.exploration.pending,null);assert.equal(pending.battle.enemy.at(-1).name,'夺木骑匪');assert.equal(pending.battle.enemy.at(-1).model,'road_raider');assert.equal(pending.battle.expedition.troops,0);
 for(const [s,job,re]of [[before,'survey',/矿口/],[met,'hoops',/裂梁/],[checked,'brace',/护送/],[ready,'invite',/支架/],[complete,'invite',/办妥/]])reject(s,v=>task(v,job),re);
 reject(ready,v=>task(v,'survey'),/办妥/);reject(ready,v=>task(v,'invite'),/支架/);reject(braced,v=>task({...v,exploration:{...v.exploration,position:'entrance'}},'invite'),/塌方石室/);
 const locked=copy(before);locked.exploration.flags=locked.exploration.flags.filter(k=>k!=='return_paid');assert.match(regionTask(locked,'liyun_meet'),/矿车/);assert.match(specialPlan(before,'mine',1,'timberguard').reason,/铁箍/);assert.match(regionFightQuote(ready,'vault','timberguard').reason,/路线/);
 const previewAt=move(ready,'rail'),original=copy(previewAt),preview=prepareSortie(previewAt,d,{type:'regionBattle',id:'rail',approach:'timberguard'},undefined,previewAt.clock);assert.deepEqual(previewAt,original);assert.equal(preview.reason,'');assert.deepEqual(preview.cost,{stamina:0,food:0});assert.equal(preview.battle.enemy.length,4);
 const retreated=act(act(pending,'battleRetreat'),'finishBattle');round(retreated);assert.equal(mineCompanionHas(retreated,'liyun_won'),false);assert.deepEqual(retreated.inventory,ready.inventory);assert.equal(retreated.exploration.pending,null);
 let weak=copy(ready);weak.team=['baisheng'];weak=act(weak,'specialStart',{id:'mine',tier:1,route:'timberguard'});weak.battle.team[0].hp=1;for(let n=0;n<180&&!weak.battle.outcome;n++)weak=act(weak,'battleTick',{delta:1000});assert.equal(weak.battle.outcome,'defeat');weak=act(weak,'finishBattle');assert.equal(mineCompanionHas(weak,'liyun_won'),false);assert.deepEqual(weak.inventory,ready.inventory);round(weak);
 const ordinary=fight(act(ready,'specialStart',{id:'mine',tier:1}));assert.equal(mineCompanionHas(ordinary,'liyun_won'),false,'ordinary mine clears cannot replace escort');
 const generic=fight(act(ready,'specialStart',{id:'mine',tier:1,route:'timberguard'}));assert.ok(mineCompanionHas(generic,'liyun_won'));round(generic);
 const repeat=fight(act(complete,'specialStart',{id:'mine',tier:1,route:'timberguard'}));assert.equal(repeat.specialDungeons.last.bonus.stored,1);assert.equal(repeat.inventory.liyun_token,complete.inventory.liyun_token);assert.deepEqual(repeat.exploration.flags,complete.exploration.flags);round(repeat);
 const owned=copy(braced);Object.assign(owned.heroes.liyun,{status:'owned',level:20,exp:7});owned.inventory.liyun_token=4;const kept=task(owned,'invite');assert.deepEqual(kept.heroes.liyun,owned.heroes.liyun);assert.equal(kept.inventory.liyun_token,6);assert.equal(kept.player.merit,owned.player.merit,'does not trigger duplicate recruitment reward');round(kept);
 const capped=copy(braced);capped.inventory.liyun_token=9999999;reject(capped,v=>task(v,'invite'),/库存/);const exact=copy(braced);exact.inventory.liyun_token=9999998;assert.equal(task(exact,'invite').inventory.liyun_token,10000000);
 const full=copy(ready);full.inventory.wood=9999999;reject(full,v=>act(v,'specialStart',{id:'mine',tier:1,route:'timberguard'}),/上限/);
 assert.equal(regionBonus(complete,'mine').base-regionBonus(braced,'mine').base,1);assert.equal(idleRates('mine','liyun',complete).scrap_iron-idleRates('mine','liyun',braced).scrap_iron,1);assert.equal(idleQuote(complete,'mine','liyun').reason,'');
 // Existing bank remains untouched; the next complete batch receives the new bonus.
 let idle=act({...braced,heroes:{...braced.heroes,liyun:{...braced.heroes.liyun,status:'owned'}}},'idleSend',{region:'mine',hero:'liyun'});idle=dispatch(d,idle,{type:'refresh'},idle.clock+IDLE_CYCLE);const bank=copy(idle.idleDispatch.bank);idle=task(idle,'invite');assert.deepEqual(idle.idleDispatch.bank,bank);const rate=idleRates('mine','liyun',idle);idle=dispatch(d,idle,{type:'refresh'},idle.clock+IDLE_CYCLE);assert.equal(idle.idleDispatch.bank.scrap_iron,bank.scrap_iron+rate.scrap_iron);round(idle);
 // Maximum stacking (specialist + tier 2 + guesthouse + repaired supports) still exports.
 let max=copy(complete);max.exploration.buildings.push('lodge');max.gathering.regions.mine.best=2;max.specialDungeons.clears.mine_2=1;max.heroes.tanglong.level=15;max.team=max.team.filter(id=>id!=='tanglong');max=act(max,'idleSend',{region:'mine',hero:'tanglong'});max=dispatch(d,max,{type:'refresh'},max.clock+16*IDLE_CYCLE);assert.equal(max.idleDispatch.bank.scrap_iron,96);round(max);max=act(max,'idleRecall');round(max);
 assert.equal(explorerChoices(d,'invite').some(c=>c.id==='liyun'),true);let tracked=act(before,'goalSet',{kind:'invite',id:'liyun'});assert.equal(explorationGoalQuote(tracked,d).next.command.node,'entrance');round(tracked);assert.ok(hasMineCompanion(tracked));assert.equal(explorationGoalQuote(complete,d,{kind:'invite',id:'liyun'}).done,true);
 for(const mutate of [s=>s.exploration.flags=s.exploration.flags.filter(k=>k!=='liyun_hoops'),s=>s.exploration.flags.push('liyun_invited'),s=>delete s.exploration.pending.approach,s=>s.exploration.pending.node='vault']){const bad=copy(pending);mutate(bad);assert.throws(()=>gameSnapshot(bad,d));}
 assert.ok(explorationPreserved(before,complete));assert.equal(explorationPreserved(complete,before),false);
 for(const seed of [1,7]){const r=companionRun(seed);assert.equal(r.complete.heroes.liyun.status,'owned');console.log('Mine companion natural progression',seed,r.won.lastBattle.elapsed);}
 console.log('Mine companion PASS: real first-session squad, shared mine chain, cancellable preview, retreat/defeat, normal vs escort clears, repeat loot, owned hero preservation, capped rewards, idle gains and bank cap, targeted source and save roundtrip.');return states;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const states=verifyCompanion();fs.mkdirSync('artifacts/mine-companion',{recursive:true});for(const [name,state]of Object.entries(states))fs.writeFileSync('artifacts/mine-companion/'+name+'.json',JSON.stringify(state));}
