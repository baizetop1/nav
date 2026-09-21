import assert from 'node:assert/strict';
import {d,fixture,act,walk} from './shuihu-journey-selfcheck.mjs';
import {ROUTE_PRIZES,routeBalance} from '../public/game/js/journey-rewards.js';
import {journeyNextGoal} from '../public/game/js/journey-goals-ui.js';
import {equipmentPool} from '../public/game/js/camp-development.js';
import {startBattle,advanceBattle} from '../public/game/js/battle.js';
import {freshCamp} from '../public/game/js/camp.js';
import {attributes} from '../public/game/js/hero.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {gains} from '../public/game/js/rewards-ui.js';
import {CloudClient} from '../public/game/js/cloud.js';
export let earned=act(fixture(81,40),'journeyTarget',{region:'forest'});earned.progress.flags.camp_goal_foundation=true;earned.progress.flags.camp_goal_first_win=true;
assert.equal(earned.realm.journey.rewards.target,'forest');assert.equal(routeBalance(earned,'forest'),0);
assert.throws(()=>act(earned,'journeyExchange',{region:'forest',choice:'gear'}),/不足/);
assert.throws(()=>act(earned,'journeyTarget',{region:'__proto__'}));
for(const region of Object.keys(ROUTE_PRIZES))for(const tier of [1,2,3]){earned.player.stamina=150;earned.camp.mode='army';earned.camp.deployment=200;earned.camp.troops=400;earned.camp.wounded=0;earned=act(earned,'journeyStart',{region,tier,goal:'arms'});assert.throws(()=>act(earned,'journeyExchange',{region,choice:'gear'}),/远征/);earned=walk(earned);const old=routeBalance(earned,region);earned=importSave(exportSave(earned,{id:1,name:'待归寨'},d),d).state;const before=structuredClone(earned);earned=act(earned,'journeyReturn');assert.equal(routeBalance(earned,region),old+tier+1);assert.ok(gains(before,earned,d).some(x=>x.name===ROUTE_PRIZES[region].name&&x.amount===tier+1));assert.throws(()=>act(earned,'journeyReturn'));}
assert.deepEqual(earned.realm.journey.rewards.earned,{forest:9,water:9,mountain:9});
export let equipped=structuredClone(earned);
for(const [region,m] of Object.entries(ROUTE_PRIZES)){
 for(const type of ['craftEquip','buyEquip'])assert.throws(()=>act(equipped,type,{id:m.equipment}),/路契/);
 assert.throws(()=>act(equipped,'goalSet',{kind:'craft',id:m.equipment}));assert.ok(!equipmentPool(d,3).some(e=>e.id===m.equipment));
 const prior=structuredClone(equipped);equipped=act(equipped,'journeyExchange',{region,choice:'gear'});assert.equal(routeBalance(equipped,region),3);const e=equipped.equipment.at(-1);assert.equal(e.item,m.equipment);assert.equal(e.locked,true);assert.ok(gains(prior,equipped,d).some(x=>x.name.includes(m.title)));assert.throws(()=>act(equipped,'dismantle',{id:e.uid}),/锁定/);equipped=act(equipped,'equip',{id:e.uid,hero:'baisheng'});assert.throws(()=>act(equipped,'journeyExchange',{region,choice:'gear'}),/不足/);
}
assert.ok(attributes(equipped,'baisheng',d).attack>attributes(earned,'baisheng',d).attack);
const supplies=act(equipped,'journeyExchange',{region:'forest',choice:'supplies'});assert.equal(routeBalance(supplies,'forest'),1);assert.equal(supplies.inventory.herb-(equipped.inventory.herb||0),3);assert.equal(supplies.inventory.iron-equipped.inventory.iron,2);
const full=structuredClone(earned);full.equipment=Array.from({length:200},(_,i)=>({uid:'eq_'+(i+1),item:'oak_staff',plus:0,hero:null}));full.nextEquipment=201;const unchanged=structuredClone(full);assert.throws(()=>act(full,'journeyExchange',{region:'forest',choice:'gear'}),/200/);assert.deepEqual(full,unchanged);
const badChanges=[s=>s.realm.journey.rewards.spent.forest=10,s=>s.realm.journey.rewards.earned.water=-1,s=>s.realm.journey.rewards.earned.fake=2,s=>s.realm.journey.rewards.target='invalid',s=>s.realm.journey.rewards.version=2,s=>delete s.realm.journey.best.water];
for(const change of badChanges){const bad=structuredClone(earned);change(bad);assert.throws(()=>gameSnapshot(bad,d));}
const legacy=structuredClone(earned);delete legacy.realm.journey.rewards;assert.deepEqual(gameSnapshot(legacy,d),legacy);
const early=act(act(fixture(),'journeyStart',{region:'forest',tier:1,goal:'arms'}),'journeyReturn');assert.equal(routeBalance(early,'forest'),0);
const idle=structuredClone(equipped);idle.camp.mode='solo';let fighting=act(idle,'campRaid',{id:'woods'});const u=fighting.battle.team[0];assert.equal(u.rage,20);assert.ok(u.statuses.some(x=>x.id==='guard'&&x.value===.15&&x.expiresAt===8000));assert.ok(fighting.battle.enemy[0].statuses.some(x=>x.id==='weaken'&&x.value===.15&&x.expiresAt===6000));assert.equal(fighting.battle.team[1].rage,0);
let reload=importSave(exportSave(fighting,{id:1,name:'开场特效'},d),d).state;assert.deepEqual(reload,fighting);for(const x of [fighting,reload])for(const v of [...x.battle.team,...x.battle.enemy])v.nextAttackAt=120000;
for(let i=0;i<9;i++){advanceBattle(fighting,d,1000);advanceBattle(reload,d,1000);}assert.deepEqual(reload,fighting);assert.ok(!fighting.battle.team[0].statuses.some(x=>x.id==='guard'));assert.ok(!fighting.battle.enemy[0].statuses.some(x=>x.id==='weaken'));
const guest=structuredClone(idle);startBattle(guest,d,{enemies:['bandit'],guest:{id:'baisheng',level:15},context:{type:'story',id:'wusong_story'}});assert.equal(guest.battle.team[0].rage,0);assert.equal(guest.battle.team[0].statuses.length,0);assert.equal(guest.battle.enemy[0].statuses.length,0);
const bench=structuredClone(idle);bench.team=['shiqian'];const solo=act(bench,'campRaid',{id:'woods'});assert.equal(solo.battle.team[0].rage,0);assert.equal(solo.battle.enemy[0].statuses.length,0);
// Real damage reduction, with identical units/RNG and only opening statuses changed.
const withGear=act(idle,'campRaid',{id:'woods'}),noStatus=structuredClone(withGear);for(const x of [withGear,noStatus]){x.battleSkillMode='manual';x.battle.team.forEach(v=>v.nextAttackAt=120000);x.battle.enemy[0].nextAttackAt=1000;x.battle.enemy[0].attack=500;}noStatus.battle.enemy[0].statuses=[];noStatus.battle.team[0].statuses=[];advanceBattle(withGear,d,1000);advanceBattle(noStatus,d,1000);assert.ok(withGear.battle.team.reduce((n,v)=>n+v.hp,0)>noStatus.battle.team.reduce((n,v)=>n+v.hp,0));
const fresh=fixture();fresh.camp=freshCamp();assert.match(journeyNextGoal(fresh,d).title,/木料/);fresh.camp.buildings.lumber=1;assert.match(journeyNextGoal(fresh,d).title,/口粮/);fresh.camp.buildings.farm=1;fresh.camp.sorties=1;fresh.progress.flags.camp_goal_first_win=true;assert.match(journeyNextGoal(fresh,d).title,/聚义厅/);fresh.camp.buildings.hall=2;fresh.camp.mode='solo';fresh.camp.food=200;fresh.team=['baisheng'];fresh.heroes.baisheng.level=1;assert.match(journeyNextGoal(fresh,d).text,/还需.*经验/);fresh.heroes.baisheng.level=8;assert.match(journeyNextGoal(fresh,d).text,/还需走通 3 趟/);assert.equal(journeyNextGoal(earned,d).command.id,'rewards');
let writes=0;const oldServer=new CloudClient('https://test.invalid',d,async(_,opts)=>{if(opts.method==='PUT')writes++;return {ok:true,json:async()=>({journeyTactics:1,journeys:1})};});await assert.rejects(()=>oldServer.upload(1,1,equipped,'路线装备'),/0.39.0/);assert.equal(writes,0);
console.log('Route rewards PASS: 9 real routes, tiers 2/3/4 marks, exact-once settlement, exchange costs, capacity rollback, exclusive acquisition, opening effects and expiry, guests/bench exclusion, portable resume, malformed saves and old service blocked, actionable early goals.');



