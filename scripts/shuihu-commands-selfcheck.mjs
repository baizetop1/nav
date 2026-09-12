import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {startBattle,advanceBattle,castSkill} from '../public/game/js/battle.js';
import {growthHit} from '../public/game/js/growth-battle.js';
import {damage,addStatus,statusName} from '../public/game/js/battle.js';
import {battleOrder,equipmentMatches} from '../public/game/js/commands.js';
import {validateSave} from '../public/game/js/save.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {render,recruitDialog} from '../public/game/js/ui.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const at=Date.parse('2026-09-12T12:00:00+08:00');
function fixture(seed=19282){const s=newGame(d,at,seed);for(const h of d.heroes){s.heroes[h.id]={status:'known',level:20,exp:0};}s.heroes.baisheng.status='owned';s.team=['baisheng'];s.inventory.recruit_order=100;s.inventory.iron=50;s.player.silver=10000;return s;}
const act=(s,type,a={})=>{const n=dispatch(d,s,{type,...a},s.clock);validateSave(n,d);assert.deepEqual(gameSnapshot(n,d),n);return n;};
// Same RNG stream, ordinary pity (including guarantees), rewards and hero status as ten singles.
for(const seed of [1,51,413,19282]){
 const initial=fixture(seed);initial.recruit.pity={three:19,four:49,five:99};
 let singles=structuredClone(initial);const receipts=[];
 for(let i=0;i<10;i++){singles=act(singles,'recruit');receipts.push(singles.recruit.lastResult);}
 const ten=act(initial,'recruitTen');
 for(const key of ['rng','heroes','team','inventory','player','stats','daily'])assert.deepEqual(ten[key],singles[key],key);
 assert.deepEqual(ten.recruit.pity,singles.recruit.pity);assert.deepEqual(ten.recruit.lastBatch,receipts);
 assert.equal(ten.inventory.recruit_order,90);assert.equal(initial.recruit.total,0);assert.equal(ten.recruit.total,10);
 assert.equal(d.by.heroes[receipts[0].hero].star,5);assert.equal(act(ten,'recruit').recruit.lastBatch,undefined);
 const html=recruitDialog(ten.recruit.lastBatch,d);assert.equal((html.match(/batch-draw/g)||[]).length,10);
}
const unknown=newGame(d,at,123);unknown.inventory.recruit_order=10;assert.ok(act(unknown,'recruitTen').recruit.lastBatch.every(r=>r.kind==='clue'));
const poor=fixture();poor.inventory.recruit_order=9;const raw=JSON.stringify(poor);assert.throws(()=>act(poor,'recruitTen'),/10 张/);assert.equal(JSON.stringify(poor),raw);
assert.throws(()=>act(fixture(),'recruitTen',{id:'baisheng'}),/普通/);
let s=act(fixture(),'equipLock',{id:'eq_1',locked:true});const lockedRaw=JSON.stringify(s);
assert.throws(()=>act(s,'dismantle',{id:'eq_1'}),/锁定/);assert.equal(JSON.stringify(s),lockedRaw);
s=act(s,'strengthen',{id:'eq_1'});assert.equal(s.equipment[0].locked,true);assert.equal(s.equipment[0].plus,1);
s=act(s,'equip',{id:'eq_1',hero:'baisheng'});assert.equal(s.equipment[0].hero,'baisheng');
assert.equal(equipmentMatches(s.equipment[0],d,{state:'free'}),false);assert.equal(equipmentMatches(s.equipment[0],d,{state:'locked'}),true);
assert.equal(equipmentMatches(s.equipment[0],d,{type:'armor'}),false);assert.equal(equipmentMatches(s.equipment[0],d,{query:'不存在'}),false);
assert.match(render({state:s,data:d,view:'forge',gear:{query:'不存在'}}),/没有符合条件的装备/);
s=act(s,'equipLock',{id:'eq_1',locked:false});assert.throws(()=>act(s,'dismantle',{id:'eq_1'}),/卸下/);
s=act(s,'equip',{id:'eq_1',hero:null});const count=s.equipment.length;s=act(s,'dismantle',{id:'eq_1'});assert.equal(s.equipment.length,count-1);
// A real growth battle, including legacy absence, target fallback and taunt priority.
function fight(){const v=fixture();v.heroes.yanqing.status='owned';v.team=['yanqing'];for(const sk of d.heroes.find(h=>h.id==='yanqing').skills){const flag=d.by.skills[sk].training?.flag;if(flag)v.progress.flags[flag]=true;}
 startBattle(v,d,{enemies:['bandit','tiger_king'],scale:5,context:{type:'dungeon',id:'jingyanggang'}});return v;}
const api={data:d,damage,addStatus,statusName,log(b,t){b.log.push(t);}};
let f=fight();assert.equal(f.battle.orders,undefined);validateSave(f,d);
f=act(f,'battleOrder',{kind:'focus',target:f.battle.enemy[1].id});const hp=f.battle.enemy.map(u=>u.hp);
growthHit(f,f.battle.team[0],undefined,d,api);assert.equal(f.battle.enemy[0].hp,hp[0]);assert.ok(f.battle.enemy[1].hp<hp[1]);
f.battle.enemy[0].statuses.push({id:'taunt',value:1,expiresAt:4000});const tauntHp=f.battle.enemy[0].hp;
growthHit(f,f.battle.team[0],undefined,d,api);assert.ok(f.battle.enemy[0].hp<tauntHp);
f.battle.enemy[0].statuses=[];f.battle.enemy[1].hp=0;const fallback=f.battle.enemy[0].hp;growthHit(f,f.battle.team[0],undefined,d,api);assert.ok(f.battle.enemy[0].hp<fallback);
assert.throws(()=>act(f,'battleOrder',{kind:'focus',target:f.battle.enemy[1].id}),/仍在阵中/);
let normal=fight(),guard=structuredClone(normal);guard=act(guard,'battleOrder',{kind:'stance',value:'guard'});
assert.throws(()=>act(guard,'battleOrder',{kind:'stance',value:'balanced'}),/3 秒/);
for(const v of [normal,guard]){battleOrder(v,{kind:'focus',target:v.battle.enemy[1].id});growthHit(v,v.battle.team[0],undefined,d,api);}
const nLoss=normal.battle.enemy[1].maxHp-normal.battle.enemy[1].hp,gLoss=guard.battle.enemy[1].maxHp-guard.battle.enemy[1].hp;assert.ok(Math.abs(gLoss-nLoss*.8)<=1);
const nHp=normal.battle.team[0].hp,gHp=guard.battle.team[0].hp;
for(const v of [normal,guard])growthHit(v,v.battle.enemy[0],undefined,d,api);
assert.ok(Math.abs((gHp-guard.battle.team[0].hp)-(nHp-normal.battle.team[0].hp)*.8)<=1);
guard.battle.elapsed=3000;guard.battle.team.forEach(u=>u.nextAttackAt=4000);guard.battle.enemy.forEach(u=>u.nextAttackAt=4000);guard=act(guard,'battleOrder',{kind:'stance',value:'balanced'});
// Preserve interrupt rage before telegraph, then automatically spend it to cancel the real boss.
let interrupt=fight();interrupt.battleSkillMode='auto';interrupt.battle.team[0].rage=100;
interrupt=act(interrupt,'battleOrder',{kind:'reserve',value:true});advanceBattle(interrupt,d,100);
assert.equal(interrupt.battle.team[0].rage,100);assert.equal(interrupt.battle.team[0].skillReadyAt,0);
const boss=interrupt.battle.enemy[1];boss.boss.pendingAt=1100;boss.boss.readyAt=0;
advanceBattle(interrupt,d,100);assert.equal(boss.boss.pendingAt,0);assert.ok(interrupt.battle.team[0].rage<100);assert.ok(interrupt.battle.log.some(x=>x.includes('截脉打断')));
let manual=fight();manual.battle.team[0].rage=100;battleOrder(manual,{kind:'reserve',value:true});castSkill(manual,d,'yanqing',manual.battle.team[0].skills.find(id=>d.by.skills[id].type!=='passive'));assert.ok(manual.battle.team[0].rage<100);
let slices=fight();slices=act(slices,'battleOrder',{kind:'stance',value:'guard'});slices.battleSkillMode='auto';const coarse=structuredClone(slices),fine=structuredClone(slices);
for(let i=0;i<10;i++)advanceBattle(coarse,d,1000);for(let i=0;i<100;i++)advanceBattle(fine,d,100);assert.deepEqual(coarse,fine);assert.deepEqual(gameSnapshot(coarse,d),coarse);
const invalid=[v=>v.commandVersion=2,v=>v.equipment[0].locked='true',v=>{v.recruit.lastBatch=[];},v=>{v.battle.orders.focus='fake';},v=>{v.battle.orders.readyAt=v.battle.elapsed+3001;}];
for(const mutate of invalid){const v=structuredClone(slices);mutate(v);assert.throws(()=>validateSave(v,d));}
const calls=[],client=new CloudClient('https://save.example.com',d,async(_url,o)=>{calls.push(o.method);return Response.json({frontier:1,development:1,rotations:1});});
await assert.rejects(()=>client.upload(1,1,slices,'军令'),/0.12.0/);assert.deepEqual(calls,['GET']);
console.log('Commands: ten/single RNG+pity equivalence, atomic shortage, receipts, locks, filters, focus/taunt/fallback, guard tradeoff/cooldown, reserved/manual interrupts, timer slicing, portable round trips and cloud capability guard passed.');

