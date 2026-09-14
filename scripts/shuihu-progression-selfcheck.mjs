import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {gainExp,attributes} from '../public/game/js/hero.js';
import {experienceToNext,experienceResult,ATTRIBUTE_NAMES} from '../public/game/js/progression.js';
import {progressionPanel,experienceLabel} from '../public/game/js/progression-ui.js';
import {batchQuote} from '../public/game/js/batch.js';
import {grant} from '../public/game/js/item.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const cap=d.config.balance.heroLevelCap;
function fixture(level=1,exp=0){const s=newGame(d,Date.UTC(2026,8,14),17);s.heroes.linchong={status:'owned',level,exp};s.team=['linchong'];s.inventory.exp_pill=500;return s;}
const costs=[116,200,350,800,1450,2206];assert.deepEqual([1,5,10,20,30,39].map(experienceToNext),costs);
const total=Array.from({length:cap-1},(_,i)=>experienceToNext(i+1)).reduce((a,b)=>a+b,0);assert.equal(total,36140);assert.equal(Math.ceil(total/300),121);
for(let lv=2;lv<cap;lv++)assert.ok(experienceToNext(lv)>experienceToNext(lv-1));
for(let lv=1;lv<cap;lv++){
  const s=fixture(lv);gainExp(s,'linchong',experienceToNext(lv)-1,d);assert.equal(s.heroes.linchong.level,lv);gainExp(s,'linchong',1,d);assert.deepEqual(s.heroes.linchong,{status:'owned',level:lv+1,exp:0});
  assert.equal(gameSnapshot(s,d).heroes.linchong.level,lv+1);
}
let s=fixture();gainExp(s,'linchong',300,d);assert.equal(s.heroes.linchong.level,3);assert.equal(s.heroes.linchong.exp,50);
s=fixture();gainExp(s,'linchong',total-1,d);assert.equal(s.heroes.linchong.level,39);gainExp(s,'linchong',1,d);assert.equal(s.heroes.linchong.level,40);assert.equal(s.heroes.linchong.exp,0);
for(const quality of [undefined,0,1,2])assert.deepEqual(experienceResult({level:30,exp:79,quality},300,40),{level:30,exp:379,overflow:0});
for(const lv of [1,10,20,30,39,40]){
  const old=fixture(lv,lv===40?0:20+lv*15-1),raw=JSON.stringify(old),stats=attributes(old,'linchong',d),saved=gameSnapshot(old,d);
  assert.deepEqual(saved.heroes,old.heroes);assert.deepEqual(attributes(saved,'linchong',d),stats);assert.equal(JSON.stringify(old),raw);
  assert.deepEqual(importSave(exportSave(old,{id:1,name:'旧档成长'},d),d).state.heroes,old.heroes);
}
for(const count of [1,5,10])for(const level of [1,10,20,39]){
  const before=fixture(level),raw=JSON.stringify(before),a={kind:'experience',id:'linchong',count},q=batchQuote(before,d,a);assert.equal(JSON.stringify(before),raw);
  const after=dispatch(d,before,{type:'batchApply',...a,count:q.count,expected:q.signature},before.clock);
  let direct=before;for(let i=0;i<q.count;i++)direct=dispatch(d,direct,{type:'use',id:'exp_pill',hero:'linchong'},direct.clock);
  assert.deepEqual(after.heroes,direct.heroes);assert.deepEqual(after.inventory,direct.inventory);
  for(const [key,name] of Object.entries(ATTRIBUTE_NAMES))assert.equal(q.rows.find(r=>r.name===name).value,attributes(before,'linchong',d)[key]+' → '+attributes(after,'linchong',d)[key]);
}
s=fixture(39,experienceToNext(39)-1);let q=batchQuote(s,d,{kind:'experience',id:'linchong',count:10});assert.equal(q.count,1);assert.equal(q.rows.find(r=>r.name==='满级溢出（不保留）').value,'299 经验');
assert.equal(batchQuote(fixture(40),d,{kind:'experience',id:'linchong',count:10}).count,0);
assert.throws(()=>dispatch(d,fixture(40),{type:'use',id:'exp_pill',hero:'linchong'},fixture().clock),/等级上限/);
assert.equal(batchQuote({...fixture(),inventory:{}},d,{kind:'experience',id:'linchong',count:1}).count,0);
s=fixture();const a={kind:'experience',id:'linchong',count:1};q=batchQuote(s,d,a);s.heroes.linchong.exp=100;assert.throws(()=>dispatch(d,s,{type:'batchApply',...a,expected:q.signature},s.clock),/重新查看/);
s=fixture();const remaining=s.inventory.exp_pill;grant(s,{exp:300},d);assert.equal(s.heroes.linchong.level,3);assert.equal(s.inventory.exp_pill,remaining);
const ownedBefore=s.heroes.songjiang.level;gainExp(s,'songjiang',5000,d);assert.equal(s.heroes.songjiang.level,ownedBefore);
assert.match(progressionPanel(fixture(20),d,'linchong'),/800 经验/);assert.match(experienceLabel(fixture(40).heroes.linchong,40),/已满级/);
const ui=readFileSync(new URL('../public/game/js/ui.js',import.meta.url),'utf8');assert.ok(ui.includes("{type:'ui_batchPreview',kind:'experience',id:h.id,count:1}"));assert.ok(!ui.includes('20+v.level*15'));
console.log('Progression PASS: 39 exact boundaries, 36,140 total XP, old-save levels/XP/stats preserved, single/batch preview parity and immutability, stat deltas, overflow, caps, stale preview, reward parity, ownership and display.');
