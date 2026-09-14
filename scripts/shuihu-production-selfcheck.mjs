import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {CYCLE} from '../public/game/js/frontier.js';
import {collectionQuote,workshopQuote,STOCK_CAP} from '../public/game/js/production.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
function fixture(){let s=newGame(d,new Date(2026,8,14,12).getTime(),781);s.camp=freshCamp();s.camp.buildings={hall:3,farm:2,lumber:2,barracks:2,market:2,clinic:1};s.camp.wood=100;s.camp.food=100;s.inventory.scrap_iron=20;s.inventory.iron=3;s=dispatch(d,s,{type:'frontierStart'},s.clock);s.frontier.stations.farm.bank=7;s.frontier.stations.lumber.bank=9;s.frontier.stations.workshop.bank=8;s.frontier.posts.quarry={guard:null,safeAt:s.clock,carry:0,bank:4,threat:false};return s;}
const action=q=>q.kind==='collect'?{type:'frontierCollect',expected:q.signature}:{type:'frontierProcess',count:q.count,expected:q.signature};
const run=(s,q,now=s.clock)=>{const n=dispatch(d,s,action(q),now);assert.deepEqual(gameSnapshot(n,d),n);return n;};
let s=fixture(),raw=JSON.stringify(s),q=collectionQuote(s);assert.equal(q.reason,'');assert.deepEqual(q.totals,{food:7,wood:9,scrap_iron:4});assert.equal(JSON.stringify(s),raw);
let n=run(s,q);assert.equal(n.camp.food,107);assert.equal(n.camp.wood,109);assert.equal(n.inventory.scrap_iron,24);assert.equal(n.inventory.iron,3);assert.equal(n.frontier.stations.workshop.bank,8);assert.deepEqual(n.player,s.player);assert.equal(collectionQuote(n).moves.length,0);
q=workshopQuote(n,5);const before=JSON.stringify(n);assert.equal(q.count,5);assert.equal(JSON.stringify(n),before);let processed=run(n,q);assert.equal(processed.inventory.iron,8);assert.equal(processed.inventory.scrap_iron,14);assert.equal(processed.camp.wood,99);assert.equal(processed.frontier.stations.workshop.bank,3);assert.deepEqual(processed.player,n.player);
assert.deepEqual(importSave(exportSave(processed,{id:1,name:'工坊订单'},d),d).state,processed);
for(const requested of [1,5,10,'all']){const f=fixture(),plan=workshopQuote(f,requested);assert.equal(plan.count,Math.min(requested==='all'?8:requested,8));const end=run(f,plan);assert.equal(end.inventory.iron-f.inventory.iron,plan.count);assert.equal(f.camp.wood-end.camp.wood,plan.count*2);assert.equal(f.inventory.scrap_iron-end.inventory.scrap_iron,plan.count*2);}
s=fixture();s.inventory.scrap_iron=3;q=workshopQuote(s,10);assert.equal(q.count,1);n=run(s,q);assert.equal(n.inventory.scrap_iron,1);assert.equal(n.frontier.stations.workshop.bank,7);assert.match(workshopQuote(n).reason,/碎铁不足/);
s=fixture();s.camp.wood=3;assert.equal(workshopQuote(s).count,1);s.camp.wood=1;assert.match(workshopQuote(s).reason,/木材不足/);
s=fixture();s.inventory.iron=STOCK_CAP-1;q=workshopQuote(s);assert.equal(q.count,1);n=run(s,q);assert.equal(n.inventory.iron,STOCK_CAP);assert.match(workshopQuote(n).reason,/库存已满/);
s=fixture();s.camp.food=STOCK_CAP-2;s.frontier.posts.farm={guard:null,safeAt:s.clock,threat:false,carry:0,bank:10};q=collectionQuote(s);assert.equal(q.totals.food,2);assert.equal(q.left.food,15);n=run(s,q);assert.equal(n.camp.food,STOCK_CAP);assert.equal(n.frontier.stations.farm.bank,5);assert.equal(n.frontier.posts.farm.bank,10);
s=fixture();s.frontier.posts.quarry.threat=true;q=collectionQuote(s);assert.equal(q.totals.scrap_iron,undefined);assert.equal(q.blocked.length,1);n=run(s,q);assert.equal(n.frontier.posts.quarry.bank,4);
for(const mutate of [v=>v.inventory.scrap_iron--,v=>v.camp.wood--,v=>v.frontier.stations.workshop.bank++,v=>v.inventory.iron++]){s=fixture();q=workshopQuote(s,1);mutate(s);raw=JSON.stringify(s);assert.throws(()=>run(s,q),/重新预览/);assert.equal(JSON.stringify(s),raw);}
s=fixture();q=collectionQuote(s);s.camp.wood++;assert.throws(()=>run(s,q),/重新预览/);
s=fixture();q=workshopQuote(s,1);assert.throws(()=>run(s,q,s.clock+CYCLE),/重新预览/);const fresh=dispatch(d,s,{type:'refresh'},s.clock+CYCLE),freshQuote=workshopQuote(fresh,1);assert.doesNotThrow(()=>run(s,freshQuote,s.clock+CYCLE),'A fresh preview can confirm after production accrues');
for(const count of [0,-1,1.5,257,NaN,'5',null])assert.throws(()=>workshopQuote(fixture(),count));
s=fixture();s.frontier.stations.workshop.bank=0;assert.match(workshopQuote(s).reason,/暂无/);assert.throws(()=>run(s,workshopQuote(s)));
s=fixture();s.battle={};assert.match(collectionQuote(s).reason,/交战/);assert.match(workshopQuote(s).reason,/交战/);assert.throws(()=>run(s,workshopQuote(s)));
s=fixture();delete s.frontier;assert.match(collectionQuote(s).reason,/开办/);assert.match(workshopQuote(s).reason,/开办/);
console.log('Production PASS: raw-only collection, exact workshop costs, four quantities, shortage adjustment, stock caps without loss, threatened posts, immutable previews, stale/elapsed-production recovery, transactional failure, busy guard and portable saves.');
