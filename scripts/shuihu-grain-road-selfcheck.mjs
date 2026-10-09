import assert from 'node:assert/strict';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {grainDelivery,grainIncome} from '../public/game/js/grain-road-data.js';
import {grainRoadPreserved} from '../public/game/js/grain-road-save.js';
export {d};
export function base(seed=81,level=8){let s=fixture(seed,level);s.camp.mode='army';s.camp.troops=60;s.camp.deployment=60;s.battleSkillMode='auto';return s;}
export function fought(s){for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.deepEqual(gameSnapshot(s,d),s);return s;}
export const samples=[];
for(const id of ['escort','scout','assault']){let s=base();const stages=[];if(id==='scout'){const before=s;s=act(s,'grainRoadScout',{hero:'baisheng'});assert.equal(before.player.stamina-s.player.stamina,2);assert.throws(()=>act(s,'grainRoadScout',{hero:'shiqian'}));stages.push(s);}
 const old=structuredClone(s),q=prepareSortie(s,d,{type:'grainRoadBattle',id});assert.equal(q.reason,'');assert.deepEqual(s,old,'preview/cancel is read-only');assert.equal(q.cost.stamina,6);assert.equal(q.cost.food,({escort:6,scout:8,assault:10})[id]+15);s=q.next;assert.deepEqual(gameSnapshot(s,d),s);stages.push(structuredClone(s));
 s=importSave(exportSave(s,{id:1,name:'粮路'},d),d).state;s=fought(s);assert.equal(s.battle.outcome,'victory',id);const before=structuredClone(s);stages.push(structuredClone(s));s=act(s,'finishBattle');assert.ok(s.grainRoad.won);assert.equal(s.grainRoad.last.fallen,s.lastBattle.fallen);assert.equal(s.grainRoad.last.wounded,s.lastBattle.wounded);assert.equal(s.camp.food-before.camp.food,id==='escort'?Math.floor(180*(.5+s.grainRoad.last.cargo/200)):id==='scout'?210:260);assert.throws(()=>act(s,'finishBattle'));assert.throws(()=>act(s,'grainRoadBattle',{id}));assert.throws(()=>act(s,'campRaid',{id:'grain_'+id}));stages.push(s);
 for(const investment of ['granary','infirmary']){let x=act(s,'grainRoadInvest',{id:investment});assert.throws(()=>act(x,'grainRoadInvest',{id:investment}));assert.throws(()=>act(x,'grainRoadCollect'));x.camp.wounded+=15;x.camp.troops-=15;x.clock+=4.5*86400000;x.lastRegen=x.clock;assert.deepEqual(grainDelivery(x),{days:3,food:3*grainIncome(x),healed:investment==='infirmary'?15:0});const food=x.camp.food,wounded=x.camp.wounded;x=act(x,'grainRoadCollect');assert.equal(x.camp.food-food,3*grainIncome(x));assert.equal(wounded-x.camp.wounded,investment==='infirmary'?15:0);assert.equal(x.clock-x.grainRoad.lastAt,.5*86400000);assert.throws(()=>act(x,'grainRoadCollect'));assert.ok(grainRoadPreserved(s,x));assert.equal(grainRoadPreserved(x,s),false);stages.push(x);}
 samples.push(stages.slice(0,-1));console.log('Grain route',id,'cargo',s.grainRoad.last.cargo,'wounded',s.lastBattle.wounded,'fallen',s.lastBattle.fallen,'seconds',s.lastBattle.elapsed/1000);
}
// Retreat consumes resources and settles casualties, permits a different route; scouting persists.
let r=act(base(),'grainRoadScout',{hero:'baisheng'});r=act(r,'grainRoadBattle',{id:'assault'});advanceBattle(r,d,1000);r=act(act(r,'battleRetreat'),'finishBattle');assert.equal(r.grainRoad.won,false);assert.equal(r.grainRoad.scout,'baisheng');r=act(r,'grainRoadBattle',{id:'scout'});r=act(fought(r),'finishBattle');assert.ok(r.grainRoad.won);assert.equal(r.grainRoad.attempts,2);
// Scout selection has actual cost and enemy-stat consequences.
const common=act(base(),'grainRoadScout',{hero:'linchong'}),expert=act(base(),'grainRoadScout',{hero:'baisheng'});assert.equal(expert.player.stamina-common.player.stamina,2);assert.ok(act(expert,'grainRoadBattle',{id:'scout'}).battle.enemy[0].maxHp<act(common,'grainRoadBattle',{id:'scout'}).battle.enemy[0].maxHp);
// Original saves retain their shape; fresh camp has a free choice of solo formation.
let fresh=dispatch(d,newGame(d,Date.now(),2),{type:'campFound'});assert.equal(fresh.grainRoad,undefined);assert.deepEqual(gameSnapshot(fresh,d),fresh);const q=prepareSortie(fresh,d,{type:'grainRoadBattle',id:'escort'},{team:fresh.team,mode:'solo',deployment:1,tactic:'guard'});assert.equal(q.reason,'');
for(const change of [x=>x.grainRoad.won=false,x=>x.grainRoad.last.cargo=101,x=>x.grainRoad.scout='missing',x=>x.grainRoad.lastAt=x.clock+1,x=>x.grainRoad.investment='fake',x=>x.grainRoad.last.fallen=1001]){const bad=structuredClone(samples[0].at(-1));change(bad);assert.throws(()=>gameSnapshot(bad,d));}
console.log('Grain-road PASS: real battles, preview, cancel, save resume, scout impact, route retry, one-time rewards, casualty settlement, both investments, capped income, old saves and invalid states.');

// A poorly prepared assault loses soldiers; changing to escort remains a viable recovery.
let weak=base(81,1);weak.team=['baisheng'];weak.camp.troops=10;weak.camp.deployment=10;weak=fought(act(weak,'grainRoadBattle',{id:'assault'}));assert.equal(weak.battle.outcome,'defeat');weak=act(weak,'finishBattle');assert.ok(weak.lastBattle.fallen>0);const retained=weak.camp.food;weak=act(weak,'campFormation',{mode:'solo',deployment:1,tactic:'guard'});weak=fought(act(weak,'grainRoadBattle',{id:'escort'}));assert.equal(weak.battle.outcome,'victory');weak=act(weak,'finishBattle');assert.equal(weak.grainRoad.attempts,2);assert.ok(weak.camp.food>retained);samples.push([weak]);
