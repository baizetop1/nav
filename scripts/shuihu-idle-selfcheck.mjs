import assert from 'node:assert/strict';
import {d,fixture,act,win,walk} from './shuihu-campaign-fixtures.mjs';
import {dispatch} from '../public/game/js/core.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {IDLE_ROUTES,IDLE_CYCLE,IDLE_CAP,idleRates,idleUnlocked,idleAvailable} from '../public/game/js/idle-data.js';
import {idlePreserved} from '../public/game/js/idle-save.js';
import {idlePanel} from '../public/game/js/idle-ui.js';
import {squadAvailable} from '../public/game/js/squads.js';
export {d};
export const samples=[];
export function unlocked(region='mine'){let s=fixture(711,30);s.battleSkillMode='auto';if(IDLE_ROUTES[region].kind==='special')s=win(act(s,'specialStart',{id:region,tier:1}));else {s=act(s,'journeyStart',{region,tier:1,goal:'camp'});s=walk(s);s=act(s,'journeyReturn');}assert.ok(idleUnlocked(s,region));return s;}
export function advance(s,time){const n=dispatch(d,s,{type:'refresh'},s.clock+time);assert.deepEqual(gameSnapshot(n,d),n);return n;}
for(const region of Object.keys(IDLE_ROUTES)){let s=unlocked(region),before=structuredClone(s),hero='tanglong';assert.ok(idleAvailable(s,hero));s=act(s,'idleSend',{region,hero});assert.deepEqual(s.player,before.player);assert.deepEqual(s.camp,before.camp);assert.deepEqual(s.inventory,before.inventory);const start=structuredClone(s),stages=[start];assert.equal(squadAvailable(s,hero),false);assert.throws(()=>act(s,'idleSend',{region,hero:'shiqian'}));assert.throws(()=>act(s,'idleCollect'));assert.throws(()=>act(s,'team',{ids:[hero]}),/派遣/);assert.throws(()=>act(s,'use',{id:'exp_pill',hero}),/派遣/);assert.throws(()=>act(s,'grainRoadScout',{hero}),/派遣/);assert.throws(()=>act(s,'heroMentor',{mentor:hero,student:'baisheng'}),/派遣/);assert.throws(()=>act(s,'heroMentor',{mentor:'baisheng',student:hero}),/派遣/);assert.throws(()=>act(s,'frontierAssign',{id:'lumber',worker:'hero:'+hero}),/派遣/);
 s=advance(s,IDLE_CYCLE-1);assert.deepEqual(s.idleDispatch.bank,{});s=advance(s,1);assert.deepEqual(s.idleDispatch.bank,idleRates(region,hero));stages.push(s);s=importSave(exportSave(s,{id:1,name:'挂机'},d),d).state;let fine=start;for(let i=0;i<16;i++)fine=advance(fine,IDLE_CYCLE);const long=advance(start,30*3600000);assert.deepEqual(long.idleDispatch.bank,fine.idleDispatch.bank);assert.equal(long.idleDispatch.earned,fine.idleDispatch.earned);assert.deepEqual(long.idleDispatch.bank,Object.fromEntries(Object.entries(idleRates(region,hero)).map(([id,n])=>[id,n*16])));s=long;stages.push(s);const material={...s.inventory};s=act(s,'idleCollect');assert.deepEqual(s.idleDispatch.bank,{});for(const [id,n]of Object.entries(long.idleDispatch.bank))assert.equal(s.inventory[id]-(material[id]||0),n);assert.equal(s.idleDispatch.mission.hero,hero);assert.throws(()=>act(s,'idleCollect'));stages.push(s);s=advance(s,IDLE_CYCLE+5000);const recalled=act(s,'idleRecall');assert.equal(recalled.idleDispatch.mission,null);assert.deepEqual(recalled.idleDispatch.bank,{});assert.ok(idleAvailable(recalled,hero));stages.push(recalled);assert.ok(idlePreserved(start,recalled));assert.equal(idlePreserved(recalled,start),false);samples.push(stages);}
let s=fixture();assert.equal(idleUnlocked(s,'mine'),false);assert.throws(()=>act(s,'idleSend',{region:'mine',hero:'tanglong'}),/通关/);assert.equal(s.idleDispatch,undefined);assert.deepEqual(gameSnapshot(s,d),s);
// Inventory full never destroys material or traps the dispatched hero.
s=act(unlocked(),'idleSend',{region:'mine',hero:'tanglong'});s=advance(s,IDLE_CYCLE);const stock={...s.idleDispatch.bank};for(const id of Object.keys(stock))s.inventory[id]=10000000;assert.throws(()=>act(s,'idleCollect'),/库存已满/);s=act(s,'idleRecall');assert.equal(s.idleDispatch.mission,null);assert.deepEqual(s.idleDispatch.bank,stock);assert.ok(idleAvailable(s,'tanglong'));assert.throws(()=>act(s,'idleSend',{region:'mine',hero:'tanglong'}),/暂存/);for(const [id,n]of Object.entries(stock))s.inventory[id]-=n;s=act(s,'idleCollect');assert.deepEqual(s.idleDispatch.bank,{});
// Staffing and active roster cannot be double booked; spare ordinary heroes remain eligible.
for(const assign of [x=>x.team.push('tanglong'),x=>x.progress.flags.camp_steward_tanglong=true,x=>{x=Object.assign(x,act(x,'frontierStart'));x.frontier.stations.lumber.worker='hero:tanglong';}]){const x=unlocked();assign(x);assert.equal(idleAvailable(x,'tanglong'),false);assert.throws(()=>act(x,'idleSend',{region:'mine',hero:'tanglong'}));}
for(const change of [x=>x.idleDispatch.mission.lastAt=x.clock+1,x=>x.idleDispatch.mission.region='missing',x=>x.idleDispatch.bank.recruit_order=1,x=>x.idleDispatch.bank.scrap_iron=99,x=>x.idleDispatch.mission.carry=IDLE_CYCLE,x=>x.team.push('tanglong')]){const bad=structuredClone(samples[0][1]);change(bad);assert.throws(()=>gameSnapshot(bad,d));}
// Tracking a goal is allowed while away; actual training and roster changes remain blocked.
s=act(unlocked(),'idleSend',{region:'mine',hero:'tanglong'});
const sent=structuredClone(s);
for(const kind of ['corps','promotion']){
 s=act(s,'goalSet',{kind,id:'tanglong'});
 assert.deepEqual(s.development.goal,{kind,id:'tanglong'});
 assert.deepEqual(s.idleDispatch,sent.idleDispatch);
 assert.deepEqual(s.heroes,sent.heroes);
 assert.deepEqual(s.inventory,sent.inventory);
 assert.deepEqual(s.camp,sent.camp);
 assert.deepEqual(s.player,sent.player);
}
s=act(s,'goalClear');assert.equal(s.development.goal,null);
assert.throws(()=>act(s,'goalSet',{kind:'corps',id:'missing'}),/目标/);
assert.throws(()=>act(s,'corpsTrain',{id:'tanglong'}),/派遣/);
assert.throws(()=>act(s,'team',{ids:['tanglong']}),/派遣/);
// The full-bank message follows actual capacity, including partial claims at the inventory limit.
const panel=x=>idlePanel(x,d,v=>v,()=>'',{idleTab:'dispatch'});
assert.match(panel(s),/下一批约 30 分钟/);
s=advance(s,IDLE_CAP);const full=structuredClone(s);
assert.match(panel(s),/暂存已满，领取后继续积累/);assert.doesNotMatch(panel(s),/下一批/);
s=advance(s,15*60000);assert.deepEqual(s.idleDispatch.bank,full.idleDispatch.bank);
assert.match(panel(s),/暂存已满/);assert.doesNotMatch(panel(s),/下一批/);
s=act(s,'idleCollect');assert.deepEqual(s.idleDispatch.bank,{});
assert.match(panel(s),/下一批约 15 分钟/);assert.doesNotMatch(panel(s),/暂存已满/);
s=advance(s,15*60000);assert.deepEqual(s.idleDispatch.bank,idleRates('mine','tanglong'));
s=act(s,'idleCollect');assert.deepEqual(s.idleDispatch.bank,{});assert.throws(()=>act(s,'idleCollect'));
const partial=structuredClone(full);partial.inventory.scrap_iron=10000000;
s=act(partial,'idleCollect');assert.deepEqual(s.idleDispatch.bank,{scrap_iron:48});
assert.match(panel(s),/下一批/);assert.doesNotMatch(panel(s),/暂存已满/);
s=advance(s,IDLE_CYCLE);assert.deepEqual(s.idleDispatch.bank,{scrap_iron:48,iron:1,magnetite_sand:1});
assert.ok(idleRates('mine','tanglong').scrap_iron>IDLE_ROUTES.mine.items.scrap_iron);
console.log('Idle PASS: six real clears unlock dispatch, zero stamina/food/troop cost, specialty yield, 30-minute batches, 8-hour cap, partition invariance, no duplicates, safe recall at full inventory, assignment exclusions, goal tracking while away, full-bank status and collection recovery, portable saves, old saves and invalid-state rejection.');
