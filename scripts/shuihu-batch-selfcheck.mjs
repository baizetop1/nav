import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {batchQuote} from '../public/game/js/batch.js';
import {gains} from '../public/game/js/rewards-ui.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
function fixture(){const s=newGame(d,Date.UTC(2026,8,12,0),17);s.camp=freshCamp();s.camp.buildings.hall=5;s.camp.mode='solo';s.heroes.linchong={status:'owned',level:15,exp:0};s.team=['linchong'];s.inventory.exp_pill=30;s.inventory.mount_feed=20;s.inventory.martial_pages=40;s.player.silver=20000;s.growth={version:1,skills:{},mounts:{linchong:{rank:1,intimacy:0,riding:true}}};return s;}
function command(s,a){const q=batchQuote(s,d,a);return {type:'batchApply',...a,count:q.count,expected:q.signature};}
const run=(s,a)=>{const n=dispatch(d,s,a,s.clock);assert.deepEqual(gameSnapshot(n,d),n);return n;};
for(const [kind,id,single] of [['experience','linchong',{type:'use',id:'exp_pill',hero:'linchong'}],['manual','linchong',{type:'skillBook',id:'linchong'}],['feed','linchong',{type:'mountFeed',id:'linchong'}],['buy','iron',{type:'buy',id:'iron'}]]){
  const s=fixture(),before=JSON.stringify(s),a={kind,id,count:5},q=batchQuote(s,d,a);assert.equal(JSON.stringify(s),before,'Preview is read-only');assert.equal(q.count,5);const batch=run(s,command(s,a));let sequential=s;for(let i=0;i<5;i++)sequential=run(sequential,single);
  for(const k of ['heroes','inventory','player','growth','stats','daily','rng'])assert.deepEqual(batch[k],sequential[k],kind+' matches single operations');
  assert.equal(batch.journal.filter(r=>r.text.startsWith('【批量办理】')).length,1);assert.equal(batch.journal.length,s.journal.length+1,'One batch adds one log entry');
  assert.deepEqual(importSave(exportSave(batch,{id:1,name:'批量养成'},d),d).state,batch);
}
let s=fixture();s.heroes.linchong.level=d.config.balance.heroLevelCap-1;s.heroes.linchong.exp=20+s.heroes.linchong.level*15-1;
let a={kind:'experience',id:'linchong',count:10},q=batchQuote(s,d,a);assert.equal(q.count,1);let n=run(s,command(s,a));assert.equal(n.heroes.linchong.level,d.config.balance.heroLevelCap);assert.equal(n.inventory.exp_pill,s.inventory.exp_pill-1);assert.equal(batchQuote(n,d,a).count,0);
s=fixture();s.growth.mounts.linchong.intimacy=95;a={kind:'feed',id:'linchong',count:10};q=batchQuote(s,d,a);assert.equal(q.count,1);n=run(s,command(s,a));assert.equal(n.growth.mounts.linchong.intimacy,100);assert.equal(n.inventory.mount_feed,19);assert.ok(gains(s,n,d).some(r=>r.name.includes('亲密')&&r.amount===5));
s=fixture();s.daily.counters.buyOrder=2;a={kind:'buy',id:'recruit_order',count:10};assert.equal(batchQuote(s,d,a).count,1);n=run(s,command(s,a));assert.equal(n.daily.counters.buyOrder,3);assert.equal(batchQuote(n,d,a).count,0);
s=fixture();s.inventory.martial_pages=5;a={kind:'manual',id:'linchong',count:5};assert.equal(batchQuote(s,d,a).count,2);n=run(s,command(s,a));assert.equal(n.inventory.martial_pages,1);assert.equal(n.inventory.linchong_manual,2);
s=fixture();a={kind:'buy',id:'iron',count:10};const stale=command(s,a);s.player.silver=0;const old=JSON.stringify(s);assert.throws(()=>run(s,stale),/碎银/);assert.equal(JSON.stringify(s),old,'Failed apply never partly spends');
s=fixture();a={kind:'feed',id:'linchong',count:5};const changed=command(s,a);s.growth.mounts.linchong.intimacy=10;assert.throws(()=>run(s,changed),/重新查看/);assert.equal(s.inventory.mount_feed,20);
for(const count of [0,-1,1.5,11,Infinity,'5'])assert.throws(()=>batchQuote(fixture(),d,{kind:'manual',id:'linchong',count}));
assert.throws(()=>batchQuote(fixture(),d,{kind:'strengthen',id:'eq_1',count:5}));assert.equal(batchQuote(fixture(),d,{kind:'buy',id:'linchong_order',count:5}).count,0);
s=fixture();s.inventory.iron=10000000;assert.equal(batchQuote(s,d,{kind:'buy',id:'iron',count:5}).count,0);
s=fixture();s=run(s,{type:'campRaid',id:'woods'});assert.equal(batchQuote(s,d,{kind:'manual',id:'linchong',count:5}).count,0);assert.throws(()=>run(s,{type:'batchApply',kind:'manual',id:'linchong',count:5,expected:''}),/交战/);
s=fixture();s.inventory.linchong_manual=10;n=run(s,{type:'skillUpgrade',id:d.by.heroes.linchong.skills[0]});assert.ok(gains(s,n,d).some(r=>r.name.includes('招式等级')));
console.log('Batch: preview immutability, four single-operation parity checks, level/intimacy caps, daily shop limits, shortage adjustment, stale preview rejection, atomic failure, invalid inputs, inventory cap, battle lock, receipts and portable saves passed.');
