import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {AFFAIRS} from '../public/game/js/affairs.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {equipmentComparison} from '../public/game/js/management-ui.js';
import {attributes} from '../public/game/js/hero.js';
import {CloudClient} from '../public/game/js/cloud.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
function fixture(){const s=newGame(d,Date.now(),345);s.camp=freshCamp();s.camp.buildings={hall:5,farm:3,lumber:3,barracks:5,clinic:3,market:3};s.camp.food=10000;s.camp.wood=10000;s.camp.mode='solo';s.player.silver=10000;s.team=['linchong','luzhishen'];for(const id of s.team)s.heroes[id]={status:'owned',level:30,exp:0};return s;}
const act=(s,type,a={},now=s.clock)=>{const n=dispatch(d,s,{type,...a},now);assert.deepEqual(gameSnapshot(n,d),n);return n;};
const work=s=>act(s,'campWork');
let s=fixture();s=work(work(s));assert.equal(s.affairs,undefined);s=work(s);assert.equal(s.affairs.pending.kind,'caravan');const pending=structuredClone(s.affairs.pending);s=work(s);assert.deepEqual(s.affairs.pending,pending,'Unprocessed report is retained');
const poor=structuredClone(s);poor.player.silver=0;const raw=JSON.stringify(poor);assert.throws(()=>act(poor,'affairChoice',{choice:'supplies'}));assert.equal(JSON.stringify(poor),raw);
for(const kind of Object.keys(AFFAIRS)){const v=fixture();v.affairs={version:1,lastDay:v.camp.day,pending:{kind,day:v.camp.day},mission:null,resolved:0};const done=act(v,'affairChoice',{choice:'supplies'});assert.equal(done.affairs.pending,null);assert.equal(done.affairs.resolved,1);assert.throws(()=>act(done,'affairChoice',{choice:'supplies'}));}
let mission=act(s,'affairChoice',{choice:'dispatch',hero:'linchong'});assert.ok(!mission.team.includes('linchong'));assert.throws(()=>act(mission,'team',{ids:['linchong']}),/外派/);assert.throws(()=>act(mission,'campSteward',{id:'linchong'}),/外派/);assert.throws(()=>act(mission,'affairCollect'),/尚未/);
mission=act(mission,'refresh',{},mission.clock+600000);const oldIron=mission.inventory.iron||0;mission=act(mission,'affairCollect');assert.equal(mission.inventory.iron,oldIron+3);assert.equal(mission.affairs.mission,null);assert.throws(()=>act(mission,'affairCollect'));mission=act(mission,'team',{ids:['linchong']});
let stationed=act(s,'campSteward',{id:'linchong'});assert.throws(()=>act(stationed,'affairChoice',{choice:'dispatch',hero:'linchong'}),/撤下/);
let fight=fixture();fight.affairs={version:1,lastDay:1,pending:{kind:'raiders',day:1},mission:null,resolved:0};fight=act(fight,'affairBattle');assert.equal(fight.battle.context.affair,1);const before=fight.player.prestige;while(!fight.battle.outcome)advanceBattle(fight,d,1000);assert.equal(fight.battle.outcome,'victory');fight=act(fight,'finishBattle');assert.equal(fight.player.prestige,before+20);assert.equal(fight.affairs.pending,null);assert.throws(()=>act(fight,'affairBattle'));
let retreat=fixture();retreat.affairs={version:1,lastDay:1,pending:{kind:'raiders',day:1},mission:null,resolved:0};retreat=act(act(act(retreat,'affairBattle'),'battleRetreat'),'finishBattle');assert.equal(retreat.affairs.pending.kind,'raiders');assert.equal(retreat.player.prestige,0);
// Preview is immutable and matches the real transfer, including the previous owner's loss.
let equip=fixture();equip=act(equip,'equip',{id:'eq_1',hero:'linchong'});const immutable=JSON.stringify(equip),preview=equipmentComparison(equip,d,{id:'eq_1',hero:'luzhishen'},()=>'',String);assert.equal(JSON.stringify(equip),immutable);assert.match(preview,/林冲/);assert.match(preview,/鲁智深/);const after=act(equip,'equip',{id:'eq_1',hero:'luzhishen'});assert.ok(attributes(after,'linchong',d).attack<attributes(equip,'linchong',d).attack);assert.ok(attributes(after,'luzhishen',d).attack>attributes(equip,'luzhishen',d).attack);
const calls=[],client=new CloudClient('https://save.example.com',d,async(_url,o)=>{calls.push(o.method);return Response.json({strategy:1,commands:1,frontier:1,development:1,rotations:1});});await assert.rejects(()=>client.upload(1,1,s,'寨事'),/0.14.0/);assert.deepEqual(calls,['GET']);
console.log('Management: scheduled reports, all resource choices, atomic shortage, mission exclusion/return, real raid success and retreat, no duplicate rewards, immutable two-owner gear comparison and portable/cloud guards passed.');
