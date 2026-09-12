import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp,attachTroops} from '../public/game/js/camp.js';
import {startBattle,advanceBattle,damage,addStatus,statusName} from '../public/game/js/battle.js';
import {growthHit} from '../public/game/js/growth-battle.js';
import {HERO_SPECIALTIES,STYLES,BONDS,MECHANICS,activeBonds} from '../public/game/js/strategy-data.js';
import {strategyFactor,initializeStrategy} from '../public/game/js/strategy.js';
import {stationYield,CYCLE} from '../public/game/js/frontier.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';
import {CloudClient} from '../public/game/js/cloud.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
function fixture(date='2026-09-13'){const s=newGame(d,Date.parse(date+'T12:00:00+08:00'),93472);s.camp=freshCamp();s.camp.buildings={hall:5,farm:3,lumber:3,barracks:5,clinic:3,market:3};s.camp.food=10000;s.camp.wood=10000;s.camp.troops=30;s.camp.mode='solo';s.player.silver=10000;s.inventory.iron=100;s.inventory.martial_pages=100;s.team=['linchong'];for(const h of d.heroes)s.heroes[h.id]={status:'owned',level:30,exp:0};return s;}
const act=(s,type,a={},now=s.clock)=>{const n=dispatch(d,s,{type,...a},now);validateSave(n,d);assert.deepEqual(gameSnapshot(n,d),n);return n;};
function battle(s,terrain='land',troops=0){startBattle(s,d,{enemies:['guard','road_raider'],scale:5,context:{type:'frontier',id:terrain==='water'?'ferry':terrain==='mountain'?'quarry':terrain==='forest'?'woods':'farm',kind:'capture',terrain}});attachTroops(s,troops);return s;}
assert.equal(Object.keys(HERO_SPECIALTIES).length,108);
for(const h of d.heroes){const p=HERO_SPECIALTIES[h.id];assert.ok(STYLES[p.style]);assert.ok(['land','forest','water','mountain'].includes(p.terrain));assert.ok(['farm','lumber','workshop'].includes(p.job));}
// Every pair/trio is reachable within the 3-hero formation, with no phantom activation.
for(const g of BONDS){assert.ok(g.heroes.length<=3);assert.ok(g.heroes.every(id=>d.by.heroes[id]));assert.ok(activeBonds(g.heroes,g.terrain||'land').includes(g));assert.ok(!activeBonds(g.heroes.slice(1),g.terrain||'land').includes(g));if(g.terrain)assert.ok(!activeBonds(g.heroes,'land').includes(g));}
let before=fixture();before.team=['linchong','luzhishen'];startBattle(before,d,{enemies:['guard'],context:{type:'camp',id:'fort'}});const stats=before.battle.team.map(u=>u.defense);initializeStrategy(before,before.battle);before.battle.team.forEach((u,i)=>assert.equal(u.defense,Math.round(stats[i]*1.12)));
let p=act(fixture(),'drillTrain',{id:'linchong',choice:'assault'});assert.equal(p.player.silver,9800);assert.equal(p.inventory.martial_pages,97);assert.equal(p.inventory.iron,97);const raw=JSON.stringify(p);assert.throws(()=>act(p,'drillTrain',{id:'linchong',choice:'assault'}));assert.equal(JSON.stringify(p),raw);
const army=fixture(),trained=structuredClone(p);for(const s of [army,trained]){startBattle(s,d,{enemies:['guard'],context:{type:'camp',id:'fort'}});attachTroops(s,10);}assert.equal(trained.battle.team[0].attack,Math.round(army.battle.team[0].attack*1.12));assert.equal(trained.battle.team[0].defense,Math.round(army.battle.team[0].defense*.92));
const solo=fixture(),soloTrained=structuredClone(p);for(const s of [solo,soloTrained]){startBattle(s,d,{enemies:['guard'],context:{type:'camp',id:'fort'}});attachTroops(s,0);}assert.equal(soloTrained.battle.team[0].attack,solo.battle.team[0].attack);
p=act(p,'drillTrain',{id:'linchong',choice:'guard'});assert.equal(p.player.silver,9600);p=act(p,'drillTrain',{id:'linchong',choice:null});assert.equal(p.strategy.drills.linchong,undefined);assert.equal(p.player.silver,9600);
const poor=fixture();poor.inventory.iron=2;assert.throws(()=>act(poor,'drillTrain',{id:'linchong',choice:'guard'}),/精铁/);assert.equal(poor.player.silver,10000);
// Matching assignment creates actual queued material and stops adding specialty while away.
let production=act(fixture(),'frontierStart');const base=stationYield(production,d,'workshop');production=act(production,'frontierAssign',{id:'workshop',worker:'hero:tanglong'});assert.equal(stationYield(production,d,'workshop'),base+2);production=act(production,'refresh',{},production.clock+CYCLE);assert.equal(production.frontier.stations.workshop.bank,3);production=act(production,'team',{ids:['tanglong']});production=act(production,'campRaid',{id:'woods'});assert.equal(stationYield(production,d,'workshop'),base);
// All six combat styles execute their actual effects, including their terrain condition.
const api={data:d,damage,addStatus,statusName,log(b,t){b.log.push(t);}};
for(const style of Object.keys(STYLES)){
 const id=Object.keys(HERO_SPECIALTIES).find(id=>HERO_SPECIALTIES[id].style===style),s=fixture();s.team=[id];battle(s,HERO_SPECIALTIES[id].terrain);const b=s.battle,u=b.team[0],target=b.enemy[0];u.attacks=2;target.rage=80;u.hp=Math.floor(u.maxHp/3);
 if(style==='assault')assert.ok(strategyFactor(b,u,target,false)>1.2);
 if(style==='shield')assert.equal(strategyFactor(b,target,u,false),.88);
 const hp=u.hp;growthHit(s,u,undefined,d,api);
 if(style==='archer')assert.ok(b.enemy.some(e=>e.statuses.some(v=>v.id==='armor_break')));
 if(style==='scout')assert.ok(b.log.some(v=>v.includes('【扰阵】')));
 if(style==='medic')assert.ok(u.hp>hp);
 if(style==='naval')assert.ok(u.statuses.some(v=>v.id==='guard'));
}
function rotation(id){const dates={siege:'2026-09-03',convoy:'2026-09-10',tide:'2026-09-17',fortress:'2026-09-24'},s=fixture(dates[id]||'2026-09-13');return act(s,'rotationStart',{kind:dates[id]?'weekly':'daily',id,tier:1});}
function quiet(s){for(const u of [...s.battle.team,...s.battle.enemy]){u.hp=u.maxHp=100000;u.nextAttackAt=180001;if(u.boss){u.boss.readyAt=180001;u.boss.pendingAt=0;}}return s;}
function tick(s,ms,step=1000){for(let i=0;i<ms&&!s.battle.outcome;i+=step)advanceBattle(s,d,Math.min(step,ms-i));return s;}
let escort=quiet(rotation('stable')),guarded=structuredClone(escort);guarded=act(guarded,'battleOrder',{kind:'stance',value:'guard'});tick(escort,6000);tick(guarded,6000);assert.equal(escort.battle.depth.objective.integrity,76);assert.equal(guarded.battle.depth.objective.integrity,88);
const oldItems={...escort.inventory};tick(escort,30000);assert.equal(escort.battle.outcome,'defeat');escort=act(escort,'finishBattle');assert.deepEqual(escort.inventory,oldItems);assert.equal(escort.campaign.daily.uses.stable,1);
let timed=quiet(rotation('manual'));tick(timed,45000);assert.equal(timed.battle.elapsed,45000);assert.equal(timed.battle.outcome,'defeat');assert.match(timed.battle.log.join('\n'),/目标失败/);
let tides=quiet(rotation('tide'));const beforeHp=tides.battle.team[0].hp;tick(tides,10000);assert.equal(tides.battle.team[0].hp,beforeHp-5000);
let sea=rotation('tide');sea=act(act(sea,'battleRetreat'),'finishBattle');sea=act(sea,'team',{ids:['ruanxiaoqi']});sea=quiet(act(sea,'rotationStart',{kind:'weekly',id:'tide',tier:1}));tick(sea,10000);assert.equal(sea.battle.team[0].hp,97500);
let forts=quiet(rotation('fortress'));forts.battle.enemy[0].hp=0;forts.battle.enemy[1].hp=50000;tick(forts,12000);assert.equal(forts.battle.enemy[0].hp,0);assert.equal(forts.battle.enemy[1].hp,58000);tick(forts,36000);assert.equal(forts.battle.depth.objective.waves,3);assert.equal(forts.battle.depth.objective.nextAt,0);
const ore=rotation('ore'),u=ore.battle.team[0],target=ore.battle.enemy[0];assert.equal(strategyFactor(ore.battle,u,target,true)/strategyFactor(ore.battle,u,target,false),.75);ore.battle.enemy.find(e=>e.model==='guard').hp=0;assert.equal(strategyFactor(ore.battle,u,target,true),strategyFactor(ore.battle,u,target,false));
for(const id of Object.keys(MECHANICS)){const a=quiet(rotation(id)),b=structuredClone(a);tick(a,50000,1000);tick(b,50000,100);assert.deepEqual(a,b,id+' exact event slicing');validateSave(a,d);assert.deepEqual(gameSnapshot(a,d),a);}
let legacy=rotation('manual');delete legacy.battle.depth;delete legacy.strategy;legacy=quiet(legacy);tick(legacy,46000);assert.equal(legacy.battle.outcome,null);assert.deepEqual(gameSnapshot(legacy,d),legacy);
for(const mutate of [s=>s.strategy.drills.fake='guard',s=>s.battle.depth.terrain='fake',s=>s.battle.depth.objective.integrity=-1,s=>s.battle.depth.objective.nextAt=7]){const s=rotation('stable');mutate(s);assert.throws(()=>validateSave(s,d));}
const calls=[],client=new CloudClient('https://save.example.com',d,async(_url,o)=>{calls.push(o.method);return Response.json({commands:1,frontier:1,development:1,rotations:1});});await assert.rejects(()=>client.upload(1,1,rotation('stable'),'新机制'),/0.13.0/);assert.deepEqual(calls,['GET']);
console.log('Strategy: all 108 specialties, 12 reachable bonds, paid drill tradeoffs, production/absence, six real style effects, all 7 objective timers, escort failure/no rewards, tide mitigation, finite reinforcement, time slicing, old battles, corruption and cloud guards passed.');
