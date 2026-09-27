import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {dispatch} from '../public/game/js/core.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';

import {expandedSupplyState} from './shuihu-supplies-selfcheck.mjs';
const copy=structuredClone;
const emptyChronicle=()=>({version:1,routes:Object.fromEntries(['forest','water','mountain'].map(id=>[id,{choices:[],patrol:0,forged:0}])),active:null});
const recordFixture=()=>{const s=act(fixture(),'journeyPlan',{itinerary:'steady',preparation:'none'});s.camp.buildings.hall=4;s.realm.journey.best={forest:3,water:3,mountain:3};s.realm.journey.chronicle=emptyChronicle();return s;};
const bind=(s)=>{const a=s.realm.journey.chronicle.active,j=s.realm.trek?.journey;if(a&&j&&j.region===a.region&&j.tier>=(a.kind==='story'?a.chapter+1:3)&&!a.ready){j.chronicle=a.kind==='story'?{kind:a.kind,region:a.region,chapter:a.chapter,choice:a.choice}:{...a};if(s.battle?.journey)s.battle.journey.chronicle=copy(j.chronicle);}return s;};
const start=(s,region='forest',tier=1)=>bind(dispatch(d,s,{type:'journeyStart',region,tier,goal:'practice'},s.clock));
const fight=s=>{s=dispatch(d,s,{type:'journeyChoice',id:s.realm.trek.journey.offers[0]},s.clock);return bind(dispatch(d,s,{type:'journeyNode',kind:'fight'},s.clock));};
const checkInvalid=(state,mutate)=>{const bad=copy(state);mutate(bad);assert.throws(()=>validateSave(bad,d),/存档校验失败/);return bad;};

const legacy=fixture();assert.equal(gameSnapshot(legacy,d).realm.journey,undefined);
const pristine=recordFixture();assert.deepEqual(gameSnapshot(pristine,d),pristine);
for(const change of [s=>s.realm.journey.chronicle.extra=true,s=>s.realm.journey.chronicle.routes.forest.extra=true,s=>s.realm.journey.chronicle.routes.extra={choices:[],patrol:0,forged:0},s=>s.realm.journey.chronicle.routes.forest.choices=['unknown'],s=>s.realm.journey.chronicle.routes.forest.forged=1,s=>s.realm.journey.chronicle.routes.forest.patrol=1,s=>s.realm.journey.chronicle.active={kind:'patrol',region:'forest',rank:1}])checkInvalid(pristine,change);
const story=copy(pristine);story.realm.journey.chronicle.active={kind:'story',region:'forest',chapter:0,choice:'shelter',ready:false};
for(const change of [s=>s.realm.journey.chronicle.active.chapter=1,s=>s.realm.journey.chronicle.active.extra=true,s=>s.camp.buildings.hall=1,s=>{s.realm.journey.best={};s.realm.journey.chronicle.active.ready=true;}])checkInvalid(story,change);
const readyStory=copy(story);readyStory.realm.journey.chronicle.active.ready=true;
const laterStory=copy(story);laterStory.realm.journey.chronicle.routes.forest.choices=['watch'];laterStory.realm.journey.chronicle.active.chapter=1;
for(const ordinary of [start(story,'water'),start(readyStory),start(laterStory)]){assert.equal(ordinary.realm.trek.journey.chronicle,undefined);assert.deepEqual(gameSnapshot(ordinary,d),ordinary);}
const running=start(story),battle=fight(running);
for(const change of [s=>delete s.realm.journey.chronicle,s=>delete s.realm.trek.journey.chronicle,s=>delete s.battle.journey.chronicle,s=>s.realm.trek.journey.chronicle.choice='watch',s=>s.battle.journey.chronicle.choice='watch',s=>s.battle.journey.chronicle.extra=true,s=>s.realm.journey.chronicle.active=null])checkInvalid(battle,change);
const built=copy(pristine);built.realm.journey.chronicle.routes.forest={choices:['shelter','watch','shelter'],patrol:6,forged:3};
for(const change of [s=>s.camp.buildings.hall=3,s=>s.realm.journey.best.forest=2,s=>s.realm.journey.chronicle.routes.forest.patrol=5,s=>s.realm.journey.chronicle.active={kind:'patrol',region:'forest',rank:8},s=>s.realm.journey.chronicle.routes.forest.forged=4])checkInvalid(built,change);
const patrol=copy(built);patrol.realm.journey.chronicle.active={kind:'patrol',region:'forest',rank:7};const patrolRun=start(patrol,'forest',3),patrolBattle=fight(patrolRun);
const exported=exportSave(patrolBattle,{id:1,name:'巡防存档',cloud:null},d);assert.deepEqual(importSave(exported,d).state,patrolBattle);

const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default;
const db=new DatabaseSync(':memory:');
try{
  db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};
  const admin='A'.repeat(64),env={DB,KEY_PEPPER:'chronicle-tests-pepper-longer-than-32-chars',ADMIN_KEY:admin};
  const request=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
  const caps=await(await request('/v1/game-version','GET',admin)).json();assert.equal(caps.chronicleRoutes,1);
  let slot,key,rev;const openSlot=async id=>{slot=id;key=(await(await request('/v1/admin/slots/'+slot+'/key','POST',admin,{})).json()).key;rev=1;};await openSlot(1);
  const upload=state=>request('/v1/slots/'+slot,'PUT',key,{name:'路线篇章',state},rev);
  const roundtrip=async state=>{const res=await upload(state);assert.equal(res.status,200,await res.text());rev++;const get=await request('/v1/slots/'+slot,'GET',key);assert.equal(get.status,200);assert.deepEqual((await get.json()).state,state);};
  const rejectStable=async(state,status)=>{const before=db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),res=await upload(state);assert.equal(res.status,status,await res.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),before);};
  await roundtrip(legacy);
  for(const bad of [checkInvalid(pristine,s=>s.realm.journey.chronicle.routes.forest.forged=1),checkInvalid(patrol,s=>s.realm.journey.chronicle.active.rank=8),checkInvalid(battle,s=>s.battle.journey.chronicle.choice='watch')])await rejectStable(bad,400);
  await roundtrip(pristine);await roundtrip(story);await roundtrip(running);await roundtrip(battle);
  const outcome=copy(battle);outcome.battle.outcome='victory';await roundtrip(outcome);outcome.battle.outcome='retreat';await roundtrip(outcome);
  await openSlot(2);await roundtrip(patrol);await roundtrip(patrolRun);await roundtrip(patrolBattle);await openSlot(3);await roundtrip(built);
  for(const change of [s=>delete s.realm.journey.chronicle,s=>s.realm.journey.chronicle.routes.forest.choices.pop(),s=>s.realm.journey.chronicle.routes.forest.choices[0]='watch',s=>s.realm.journey.chronicle.routes.forest.patrol--,s=>s.realm.journey.chronicle.routes.forest.forged--]){const bad=copy(built);change(bad);await rejectStable(bad,409);}
  const ready=copy(built);ready.realm.journey.chronicle.active={kind:'story',region:'water',chapter:0,choice:'watch',ready:true};await roundtrip(ready);
  const restarted=copy(ready);restarted.realm.journey.chronicle.active.ready=false;await roundtrip(restarted);await roundtrip(ready);
  const changed=copy(ready);changed.realm.journey.chronicle.active={kind:'story',region:'mountain',chapter:0,choice:'shelter',ready:false};await roundtrip(changed);await roundtrip(ready);
  const strippedReady=copy(ready);delete strippedReady.realm.journey.chronicle;await rejectStable(strippedReady,409);
  const completed=copy(ready);completed.realm.journey.chronicle.routes.water.choices.push('watch');completed.realm.journey.chronicle.active=null;await roundtrip(completed);
  completed.realm.journey.chronicle.active={kind:'story',region:'water',chapter:1,choice:'shelter',ready:true};await roundtrip(completed);completed.realm.journey.chronicle.active=null;await roundtrip(completed);
  let writes=0;const older={...caps};delete older.chronicleRoutes;
  const client=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json(older);});
  const onlyRun=copy(running);delete onlyRun.realm.journey.chronicle;const onlyBattle=copy(battle);delete onlyBattle.realm.journey.chronicle;delete onlyBattle.realm.trek.journey.chronicle;
  for(const state of [pristine,running,battle,onlyRun,onlyBattle])await assert.rejects(()=>client.upload(1,rev,state,'云档'),/0.49.0/);
  const missingWorkshop={...caps};delete missingWorkshop.workshopSupplies;
  const workshopClient=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json(missingWorkshop);});
  for(const state of [copy(expandedSupplyState),{...fixture(),equipment:[...fixture().equipment,{uid:'eq_999',item:'guard_pike',plus:0,hero:null}],nextEquipment:1000},{...fixture(),inventory:{...fixture().inventory,tempered_steel:1}}])await assert.rejects(()=>workshopClient.upload(1,rev,state,'军需'),/0.49.0/);
  assert.equal(caps.workshopSupplies,1);await openSlot(4);await roundtrip(copy(expandedSupplyState));
  assert.equal(writes,0);assert.equal(db.prepare('SELECT revision FROM slots WHERE id=?').get(slot).revision,rev);
  console.log('Chronicle Worker PASS: optional legacy saves, exact records and snapshots, story/patrol/battle/file roundtrips, forged/rank/cross-state validation, old-service preflight, irreversible-progress downgrade rejection, cancellation/reselection/build progression; SQLite only, no migration.');
}finally{db.close();}
