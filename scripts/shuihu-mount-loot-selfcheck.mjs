import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {startBattle} from '../public/game/js/battle.js';
import {random} from '../public/game/js/utils.js';
import {mountQuote} from '../public/game/js/growth.js';
import {parseSave,validateSave} from '../public/game/js/save.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const raw=Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))]));
export const data=prepareData(raw);
export function fixture(){
 const s=newGame(data,new Date('2026-09-10T10:00:00+08:00').getTime(),5821);s.team=['wusong','luzhishen','baisheng'];
 for(const h of data.heroes)s.heroes[h.id]={status:'owned',level:40,exp:0};
 for(const dungeon of data.dungeons)if(dungeon.condition?.flag)s.progress.flags[dungeon.condition.flag]=true;
 s.player.silver=10000;s.inventory.mount_token=50;s.inventory.mount_feed=10;s.inventory.iron=100;s.location='stable';
 return s;
}
const act=(s,type,extra={})=>{const result=dispatch(data,s,{type,...extra},s.clock);validateSave(result,data);return result;};
const contracts=s=>Object.fromEntries(Object.entries(s.inventory).filter(([id,n])=>id.endsWith('_mount_contract')&&n>0));
function enter(s,id){s=structuredClone(s);s.location=data.by.dungeons[id].map;return act(s,'dungeon',{id});}
function defeatFoes(s){
 // Strengthened fixture units speed the test; all damage and reward settlement
 // still go through the actual combat engine and transactional dispatcher.
 for(const u of s.battle.team){u.attack=100000;u.hp=u.maxHp=100000;}
 for(let n=0;n<30&&!s.battle.outcome;n++)s=act(s,'battleTick',{delta:1000});
 assert.equal(s.battle.outcome,'victory');return s;
}
function forceDrops(s,id){const count=data.heroes.filter(h=>h.mount.dungeon===id&&!s.growth?.mounts[h.id]&&!s.inventory[h.mount.contract]).length;for(let seed=1;seed<1000000;seed++){const r={rng:seed};if(Array.from({length:count},()=>random(r)).every(n=>n<.2)){s.rng=seed;return s;}}throw Error('No fixture seed');}
function win(s,id){
 s=enter(s,id);
 if(s.scheme){for(let n=0;n<5;n++)s=act(s,'scheme',{id:'original'});s=act(s,'scheme',{id:'finish'});assert.equal(s.scheme.outcome,'success');s=act(forceDrops(s,id),'finishScheme');}
 else{s=defeatFoes(s);s=act(forceDrops(s,id),'finishBattle');}
 return s;
}
assert.equal(data.heroes.length,14);assert.equal(new Set(data.heroes.map(h=>h.mount.contract)).size,14);
assert.equal(new Set(data.heroes.map(h=>h.mount.dungeon)).size,7);
assert.equal(data.items.filter(i=>i.id.endsWith('_mount_contract')).length,14);
for(const h of data.heroes){
 assert.ok(data.by.dungeons[h.mount.dungeon]);assert.equal(data.by.items[h.mount.contract].price,0);
 const s=fixture(),before=JSON.stringify(s),q=mountQuote(s,h.id,'mountAdopt',data);
 assert.ok(q.reason.includes(data.by.dungeons[h.mount.dungeon].name));assert.throws(()=>act(s,'mountAdopt',{id:h.id}),/先通关/);assert.equal(JSON.stringify(s),before,'Money and rank tokens alone cannot buy a mount');
 assert.throws(()=>act(s,'buy',{id:h.mount.contract}));assert.throws(()=>act(s,'use',{id:h.mount.contract}));
}
for(const mutate of [r=>r.heroes[0].mount.dungeon='missing',r=>r.heroes[0].mount.contract='mount_token',r=>r.items.find(i=>i.id==='songjiang_mount_contract').price=1]){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>prepareData(bad));}

for(const dungeon of data.dungeons){
 const drops=data.heroes.filter(h=>h.mount.dungeon===dungeon.id);let s=win(fixture(),dungeon.id);
 assert.deepEqual(contracts(s),Object.fromEntries(drops.map(h=>[h.mount.contract,1])),dungeon.name+' drops only its own contracts');
 assert.ok(s.journal.some(e=>e.text.includes('副本寻骑')));assert.throws(()=>act(s,dungeon.kind==='scheme'?'finishScheme':'finishBattle'));
 const pages=s.inventory.martial_pages;s=win(s,dungeon.id);assert.ok(drops.every(h=>s.inventory[h.mount.contract]===1));assert.equal(s.inventory.martial_pages,pages+3,'Repeat clears still give growth materials');
 assert.deepEqual(gameSnapshot(s,data),s);assert.deepEqual(importSave(exportSave(s,{id:1,name:'副本坐骑契'},data),data).state,s);
 for(const h of drops){
  s.location='yuncheng';assert.throws(()=>act(s,'mountAdopt',{id:h.id}),/马厩/);s.location='stable';
  const silver=s.player.silver,tokens=s.inventory.mount_token;s=act(s,'mountAdopt',{id:h.id});
  assert.equal(s.inventory[h.mount.contract],0);assert.deepEqual(s.growth.mounts[h.id],{rank:1,intimacy:0,riding:true});assert.equal(s.player.silver,silver);assert.equal(s.inventory.mount_token,tokens);
  const snapshot=JSON.stringify(s);assert.throws(()=>act(s,'mountAdopt',{id:h.id}),/已有/);assert.equal(JSON.stringify(s),snapshot);
 }
 s=win(s,dungeon.id);assert.ok(drops.every(h=>s.inventory[h.mount.contract]===0),'Owned mounts do not drop again');assert.throws(()=>enter(s,dungeon.id),/次数/);
}

let unknown=fixture();unknown.heroes.shiqian.status='unknown';unknown=win(unknown,'jingyanggang');assert.equal(unknown.inventory.shiqian_mount_contract,1);unknown.location='stable';assert.throws(()=>act(unknown,'mountAdopt',{id:'shiqian'}),/入寨/);assert.equal(unknown.inventory.shiqian_mount_contract,1);
const empty=fixture();let training=empty;for(let i=0;i<3;i++)training=act(training,'martialDrill');assert.deepEqual(contracts(training),{});
for(const id of training.daily.ids){const q=data.by.quests[id];training.daily.counters[q.goal.stat]=q.goal.amount;training=act(training,'quest',{id});}training=act(training,'dailyBonus');assert.deepEqual(contracts(training),{},'Daily tasks cannot bypass dungeon drops');
const old=fixture();old.progress.clears.jingyanggang=20;old.growth={version:1,skills:{},mounts:{wusong:{rank:3,intimacy:80,riding:true}}};const loaded=parseSave(JSON.stringify(old),data);assert.deepEqual(loaded,old);assert.deepEqual(contracts(loaded),{},'Loading historical clears cannot mint contracts');let retained=act(loaded,'mountRide',{id:'wusong'});retained=act(retained,'mountFeed',{id:'wusong'});assert.equal(retained.growth.mounts.wusong.intimacy,90);
const reclaimed=win(loaded,'jingyanggang');assert.equal(reclaimed.inventory.wusong_mount_contract,undefined);assert.equal(reclaimed.inventory.baisheng_mount_contract,1,'Old players without a mount earn one on their next victory');
let loss=enter(fixture(),'jingyanggang');for(const u of loss.battle.team)u.hp=0;loss=act(loss,'battleTick',{delta:1});assert.equal(loss.battle.outcome,'defeat');loss=act(loss,'finishBattle');assert.deepEqual(contracts(loss),{});
let retreat=enter(fixture(),'jingyanggang');retreat=act(retreat,'battleRetreat');retreat=act(retreat,'finishBattle');assert.deepEqual(contracts(retreat),{});
let failedScheme=enter(fixture(),'huangnigang');failedScheme=act(failedScheme,'scheme',{id:'retreat'});failedScheme=act(failedScheme,'finishScheme');assert.deepEqual(contracts(failedScheme),{});
const event=fixture();startBattle(event,data,{enemies:['bandit'],context:{type:'event',id:'road_bandits'}});const eventWon=act(defeatFoes(event),'finishBattle');assert.deepEqual(contracts(eventWon),{},'Random encounters are not dungeon clears');
const html=render({state:fixture(),data,view:'map'});for(const text of ['副本寻骑','坐骑契','景阳冈历练','风雪山神庙历练','待副本获得'])assert.ok(html.includes(text));
const earned=win(fixture(),'jingyanggang');earned.location='stable';assert.ok(render({state:earned,data,view:'map'}).includes('可凭契领骑'));earned.location='jingyang';assert.ok(render({state:earned,data,view:'map'}).includes('坐骑契掉落'));assert.ok(render({state:earned,data,view:'heroes'}).includes('领骑仅消耗坐骑契 1 张'));
console.log('Shuihu mount loot: 14 contracts / seven dungeons, real combat and scheme settlement, no shop/drill bypass, no duplicates, zero currency adoption, unowned hero drops, failure/retreat guards, old mount preservation, export/import and source UI passed.');
