import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {clone,hasOwn} from '../public/game/js/utils.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {parseSave} from '../public/game/js/save.js';
import {campNotices} from '../public/game/js/camp-overview.js';
import {equipmentComparison,affairsPanel} from '../public/game/js/management-ui.js';
import {presetReason} from '../public/game/js/development.js';
import {verifiedPanel} from '../public/game/js/verified-ui.js';
import {rotationsPage} from '../public/game/js/rotations-ui.js';
const rawData=Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))]));
const native=globalThis.structuredClone,own=Object.hasOwn,at=Array.prototype.at;
const now=Date.UTC(2026,8,12,0);
function fixture(d){const s=newGame(d,now,345);s.camp=freshCamp();s.camp.buildings={hall:5,farm:3,lumber:3,barracks:5,clinic:3,market:3};s.camp.food=10000;s.camp.wood=10000;s.camp.mode='solo';s.player.silver=10000;s.team=['linchong','luzhishen'];for(const id of s.team)s.heroes[id]={status:'owned',level:30,exp:0};return s;}
function play(d){let s=fixture(d);const snapshots=[];const act=(type,a={})=>{s=dispatch(d,s,{type,...a},s.clock);snapshots.push(gameSnapshot(s,d));};act('move',{id:'tavern'});act('use',{id:'exp_pill',hero:'linchong'});act('campWork');act('campWork');act('campWork');act('affairChoice',{choice:'supplies'});act('campRaid',{id:'woods'});while(!s.battle.outcome)act('battleTick',{delta:1000});act('finishBattle');return snapshots;}
const expected=play(prepareData(native(rawData)));
try{
  globalThis.structuredClone=undefined;Object.hasOwn=undefined;Array.prototype.at=undefined;
  const d=prepareData(clone(rawData));
  assert.deepEqual(play(d),expected,'Fallback preserves exact seeded gameplay and battle results');
  const shared={n:1},value={a:shared,b:shared,missing:undefined,list:[,undefined]};value.self=value;
  const copy=clone(value);assert.notEqual(copy.a,shared);assert.equal(copy.a,copy.b);assert.equal(copy.self,copy);assert.ok(hasOwn(copy,'missing'));assert.ok(!hasOwn(copy.list,0));assert.ok(hasOwn(copy.list,1));
  const proto=clone(JSON.parse('{"__proto__":{"polluted":true}}'));assert.ok(hasOwn(proto,'__proto__'));assert.equal({}.polluted,undefined);
  assert.throws(()=>clone({fn(){}}));
  let s=fixture(d),act=(type,a={},clock=s.clock)=>s=dispatch(d,s,{type,...a},clock);
  act('presetSave',{slot:1});act('campWork');act('campWork');act('campWork');act('affairChoice',{choice:'dispatch',hero:'linchong'});
  let before=JSON.stringify(s);assert.match(presetReason(s,1),/外派/);assert.throws(()=>dispatch(d,s,{type:'presetLoad',slot:1},s.clock),/外派/);assert.equal(JSON.stringify(s),before);assert.deepEqual(gameSnapshot(s,d),s);
  const notices=campNotices(s,d);assert.ok(notices.some(n=>/林冲外派中/.test(n.label)));assert.equal(JSON.stringify(s),before,'Overview never claims or modifies progress');
  act('refresh',{},s.clock+600000);assert.ok(campNotices(s,d).some(n=>/已归来/.test(n.label)));
  assert.throws(()=>dispatch(d,s,{type:'presetLoad',slot:1},s.clock),/外派/,'Deadline does not bypass manual collection');
  const file=exportSave(s,{id:1,name:'兼容测试',cloud:null},d);assert.deepEqual(importSave(file,d).state,s);
  act('affairCollect');act('presetLoad',{slot:1});assert.deepEqual(s.team,['linchong','luzhishen']);assert.ok(!campNotices(s,d).some(n=>n.target==='camp-affairs'));
  before=JSON.stringify(s);assert.match(equipmentComparison(s,d,{id:'eq_1',hero:'linchong'},()=>'',String),/穿戴前后对比/);assert.equal(JSON.stringify(s),before);
  const old=readFileSync(new URL('./fixtures/shuihu-v1-save.json',import.meta.url),'utf8');const migrated=parseSave(old,d);assert.equal(migrated.version,2);assert.deepEqual(gameSnapshot(migrated,d),migrated);
  act('frontierStart');s.frontier.stations.farm.bank=2;s.frontier.posts.forest={guard:null,safeAt:s.clock,threat:true,carry:0,bank:0};s.camp.wounded=3;
  const tasks=campNotices(s,d);assert.ok(tasks.some(n=>n.target==='camp-production'));assert.ok(tasks.some(n=>n.target==='frontier-map'));assert.ok(tasks.some(n=>n.target==='camp-resources'));
  const pending=fixture(d);pending.affairs={version:1,lastDay:1,resolved:0,pending:{kind:'caravan',day:1},mission:null};for(const id of pending.team)pending.heroes[id].level=1;
  let disabled=false;const html=affairsPanel(pending,d,(label,a,k,off)=>{if(a.type==='ui_affairDispatch')disabled=off;return '';});assert.ok(disabled);assert.match(html,/暂无可外派/);assert.match(html,/id="camp-affairs"/);
  const board={loading:false,error:'进度榜失败',verifiedLoading:true,verifiedError:'演武榜失败',data:null,verified:null};let busy=false;
  const verified=verifiedPanel(board,(_l,_a,_k,off)=>{busy=off;return '';},String);assert.ok(busy);assert.match(verified,/演武榜失败/);assert.doesNotMatch(verified,/进度榜失败/);
  const full=rotationsPage(s,d,String,()=>'',board),progress=full.slice(full.indexOf('id="rank-rotation"'));assert.match(progress,/进度榜失败/);assert.doesNotMatch(progress,/演武榜失败/);
}finally{globalThis.structuredClone=native;Object.hasOwn=own;Array.prototype.at=at;}
console.log('Polish: missing browser APIs, seeded full battle parity, safe isolated cloning, legacy migration, export/import, external mission preset guard, immutable camp reminders and separate ranking states passed.');
