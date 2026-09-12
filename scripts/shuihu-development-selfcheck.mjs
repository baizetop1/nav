import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,dispatch} from '../public/game/js/core.js';
import {collections,prepareData} from '../public/game/js/data.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';
import {dutyQuote,CAMP_GOALS,goalReady,searchEquipment,equipmentPool} from '../public/game/js/camp-development.js';
import {render} from '../public/game/js/ui.js';
import {gains} from '../public/game/js/rewards-ui.js';
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const act=(s,type,extra={})=>{const next=dispatch(data,s,{type,...extra},s.clock);validateSave(next,data);assert.deepEqual(gameSnapshot(next,data),next);return next;};
let s=act(newGame(data,Date.now(),1283),'campFound');
for(const id of ['lumber','farm','barracks'])s=act(s,'campBuild',{id});
assert.throws(()=>act(s,'campClaim',{id:'fort'}));
assert.ok(goalReady(s,CAMP_GOALS[0]));const rewardBefore=structuredClone(s);s=act(s,'campClaim',{id:'foundation'});
assert.equal(s.camp.wood-rewardBefore.camp.wood,40);assert.throws(()=>act(s,'campClaim',{id:'foundation'}));
s=act(s,'campSteward',{id:'baisheng'});assert.equal(s.progress.flags.camp_steward_baisheng,true);
assert.throws(()=>act(s,'campSteward',{id:'wuyong'}),'Unknown heroes cannot produce resources');
const q=dutyQuote(s,'food'),base=dutyQuote(s);assert.ok(q.food>base.food&&q.wood<base.wood&&q.silver<base.silver);
const workBefore=structuredClone(s);s=act(s,'campWork',{id:'food'});assert.equal(s.camp.food-workBefore.camp.food,q.food);assert.equal(s.heroes.baisheng.exp,25);assert.equal(s.player.stamina,95);
assert.ok(gains(workBefore,s,data).some(r=>r.name==='白胜 · 历练'&&r.amount===25));
const snap=JSON.stringify(s);assert.throws(()=>act(s,'campWork',{id:'unknown'}));assert.equal(JSON.stringify(s),snap);
s=act(s,'campWork',{id:'wood'});assert.equal(s.heroes.baisheng.level,2);assert.equal(s.heroes.baisheng.exp,15);
s=act(s,'campSteward',{id:null});assert.equal(s.progress.flags.camp_steward_baisheng,undefined);
const noSteward=structuredClone(s);s=act(s,'campWork');assert.deepEqual(s.heroes,noSteward.heroes);
// Choices affect the real battle, not just the enemy-intel copy.
s.camp.buildings.hall=3;s.camp.troops=20;s.camp.food=1000;s.player.stamina=100;
const formation=tactic=>act(s,'campFormation',{mode:'army',deployment:20,tactic});
const convoyGuard=act(formation('guard'),'campRaid',{id:'convoy'}),convoyBalanced=act(formation('balanced'),'campRaid',{id:'convoy'});
assert.ok(convoyGuard.battle.team[0].defense>convoyBalanced.battle.team[0].defense);
function victory(state){for(const u of state.battle.enemy)u.hp=0;for(const u of state.battle.team)u.hp=Math.floor(u.maxHp/2);state.battle.outcome='victory';return act(state,'finishBattle');}
const guarded=victory(convoyGuard),balanced=victory(convoyBalanced);assert.ok(guarded.camp.wounded<balanced.camp.wounded);
assert.equal(guarded.stats.camp_win_convoy,1);assert.ok(goalReady(guarded,CAMP_GOALS.find(g=>g.id==='convoy')));
assert.throws(()=>act(guarded,'finishBattle'));
const retreat=act(act(formation('balanced'),'campRaid',{id:'fort'}),'battleRetreat'),end=act(retreat,'finishBattle');assert.equal(end.equipment.length,s.equipment.length);assert.equal(end.stats.camp_win_fort,undefined);
// Draws are independent of rendering, may miss, and handle a full inventory.
const loot=structuredClone(s);let hit=0;
for(let i=0;i<4000;i++){loot.equipment=[];searchEquipment(loot,data,2);if(loot.equipment.length){hit++;assert.ok(equipmentPool(data,2).some(e=>e.id===loot.equipment[0].item));}}
assert.ok(hit>850&&hit<1150,`Observed ${hit}/4000 drops`);
loot.equipment=Array.from({length:200},(_,i)=>({uid:'eq_'+i,item:'oak_staff',hero:null,plus:0}));loot.rng=1;const iron=loot.inventory.scrap_iron||0;searchEquipment(loot,data,3);assert.equal(loot.equipment.length,200);assert.equal(loot.inventory.scrap_iron-iron,6);
for(const g of CAMP_GOALS){const state=structuredClone(s);state.camp.buildings={hall:3,farm:1,lumber:1,barracks:1,clinic:1,market:1};state.camp.sorties=2;state.stats.camp_win_convoy=1;state.stats.camp_win_fort=1;delete state.progress.flags['camp_goal_'+g.id];const done=act(state,'campClaim',{id:g.id});assert.throws(()=>act(done,'campClaim',{id:g.id}));}
for(const view of ['camp','heroes']){const html=render({state:s,data,view});assert.ok(html.includes(view==='camp'?'建寨志':'委派为寨务主事'));}
const invalid=structuredClone(s);invalid.progress.flags.camp_steward_wuyong=true;assert.throws(()=>validateSave(invalid,data));
console.log(`Development: duty tradeoffs, steward experience/levels, one-time goals, real tactics/casualties, retreat, portable snapshots, loot capacity and 4,000 random draws (${hit} drops) passed.`);
