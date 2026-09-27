import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave,SaveStore} from '../public/game/js/save.js';
import {RESOURCE_ROUTES} from '../public/game/js/resource-dungeons-data.js';
import {hasResourceDungeons,resourceDungeonsPreserved} from '../public/game/js/resource-dungeons-save.js';
import {sweepQuote} from '../public/game/js/sweep.js';
const copy=structuredClone;
const base=()=>{
 const s=fixture(530,40);s.camp.buildings.hall=4;s.battleSkillMode='auto';s.team=['wusong','linchong','wuyong'];
 for(const id of s.team){Object.assign(s.heroes[id],{status:'owned',level:40,exp:0,quality:2});for(const skill of d.by.heroes[id].skills){const flag=d.by.skills[skill].training?.flag;if(flag)s.progress.flags[flag]=true;}}
 return s;
};
const legacy=base();assert.equal(hasResourceDungeons(legacy),false);assert.deepEqual(gameSnapshot(legacy,d),legacy);
const memory=new Map(),store=new SaveStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},d);assert.equal(store.load().status,'empty');store.write(legacy);
let previous=copy(legacy),snapshotCount=0;
const localRoundtrip=(s,label)=>{
 const before=JSON.stringify(s);assert.deepEqual(gameSnapshot(s,d),s,label);
 assert.deepEqual(importSave(exportSave(s,{id:1,name:label},d),d).state,s,label);
 store.write(s);assert.deepEqual(store.load().state,s,label);assert.deepEqual(store.backup(),previous,label+' local backup');
 previous=copy(s);assert.equal(JSON.stringify(s),before,label+' unchanged source');snapshotCount++;
};
const runs=[];
for(const route of RESOURCE_ROUTES)for(const tier of [1,2,3]){
 const states=[],capture=(state,phase)=>{const label=route.id+' '+tier+' '+phase;localRoundtrip(state,label);states.push({label,state:copy(state)});};
 let s=base();
 for(let attempt=1;attempt<=2;attempt++){
  s=act(s,'rotationStart',{kind:'daily',id:route.id,tier});assert.equal(hasResourceDungeons(s),true);
  if(attempt===1){capture(s,'start');advanceBattle(s,d,100);assert.equal(s.battle.outcome,null);capture(s,'in progress');}
  for(let tick=0;tick<180&&!s.battle.outcome;tick++)advanceBattle(s,d,1000);
  assert.equal(s.battle.outcome,'victory',route.id+' '+tier+' genuine win');
  if(attempt===1)capture(s,'pending settlement');
  s=act(s,'finishBattle');capture(s,'settled '+attempt);
 }
 assert.equal(s.campaign.mastery[route.id+'_'+tier],2,route.id+' '+tier+' two stable wins');
 const before=JSON.stringify(s),action={id:route.id,tier,count:1},quote=sweepQuote(s,d,action);assert.equal(quote.reason,'');assert.equal(JSON.stringify(s),before,'sweep preview keeps source');
 s=act(s,'rotationSweep',{...action,expected:quote.signature});assert.equal(s.campaign.daily.uses[route.id],3);assert.equal(s.lastBattle.context.id,route.id);assert.equal(s.lastBattle.outcome,'victory');capture(s,'sweep');
 runs.push({route:route.id,tier,states});
}
const first=runs[0].states[0].state,settled=runs[0].states.find(v=>v.label.endsWith('settled 1')).state,swept=runs[0].states.at(-1).state;
const malformed=[],invalid=(source,change,label)=>{const s=copy(source);change(s);assert.throws(()=>validateSave(s,d),/存档校验失败/,label);assert.throws(()=>gameSnapshot(s,d),/存档校验失败/,label);malformed.push({label,state:s});};
for(const id of ['unknown','silver_1','Silver'])invalid(first,s=>s.campaign.daily.uses[id]=1,'invalid daily id '+id);
for(const n of [-1,4,1.5,'1'])invalid(first,s=>s.campaign.daily.uses.silver=n,'invalid daily uses '+n);
for(const key of ['unknown_1','silver_0','silver_4','silver_01','silver'])invalid(settled,s=>s.campaign.mastery[key]=1,'invalid mastery key '+key);
for(const n of [0,3,1.5,'2'])invalid(settled,s=>s.campaign.mastery.silver_1=n,'invalid mastery value '+n);
for(const value of [null,[]])invalid(settled,s=>s.campaign.mastery=value,'invalid mastery object');
invalid(first,s=>s.battle.context.id='unknown','invalid battle id');
invalid(first,s=>s.battle.context.kind='weekly','invalid battle kind');
invalid(first,s=>s.battle.context.tier=4,'invalid battle tier');
invalid(first,s=>s.battle.context.period='2026-02-30','invalid battle date');
invalid(first,s=>delete s.campaign.daily.uses.silver,'missing battle attempt');
invalid(settled,s=>s.lastBattle.context.id='unknown','invalid report id');
invalid(settled,s=>s.lastBattle.context.kind='weekly','invalid report kind');
invalid(settled,s=>s.lastBattle.context.tier=4,'invalid report tier');
// Each valid representation independently needs the capability, including zero-use keys
// that an older validator does not recognize and battle/report-only stale clients.
const variants=runs.flatMap(run=>[run.states[0].state,run.states.at(-1).state]);
for(const id of RESOURCE_ROUTES.map(route=>route.id)){
 for(const value of [0,1]){const s=copy(legacy);s.campaign={version:1,daily:{date:'2026-09-21',uses:{[id]:value}},weekly:{}};assert.equal(hasResourceDungeons(s),true);variants.push(s);}
 for(const tier of [1,2,3]){const s=copy(legacy);s.campaign={version:1,daily:{date:'2026-09-21',uses:{}},weekly:{},mastery:{[id+'_'+tier]:1}};assert.equal(hasResourceDungeons(s),true);variants.push(s);}
 const battleOnly=copy(legacy);battleOnly.battle=copy(first.battle);battleOnly.battle.context.id=id;assert.equal(hasResourceDungeons(battleOnly),true);variants.push(battleOnly);
 const reportOnly=copy(legacy);reportOnly.lastBattle=copy(settled.lastBattle);reportOnly.lastBattle.context.id=id;assert.equal(hasResourceDungeons(reportOnly),true);variants.push(reportOnly);
}
const oldMaterial=act(base(),'rotationStart',{kind:'daily',id:'ore',tier:1});
for(let tick=0;tick<180&&!oldMaterial.battle.outcome;tick++)advanceBattle(oldMaterial,d,1000);
assert.equal(oldMaterial.battle.outcome,'victory');const oldSettled=act(oldMaterial,'finishBattle');
invalid(first,s=>s.battle.expedition.troops=1,'resource battle cannot deploy troops');
invalid(settled,s=>s.lastBattle.troops=1,'resource report cannot deploy troops');
invalid(settled,s=>{s.lastBattle.troops=1;s.lastBattle.wounded=1;},'resource report cannot wound troops');
invalid(settled,s=>{s.lastBattle.troops=1;s.lastBattle.fallen=1;},'resource report cannot lose troops');
const emptyCampaign=copy(legacy);emptyCampaign.campaign={version:1,daily:{date:'2026-09-21',uses:{}},weekly:{},mastery:{}};
for(const s of [legacy,emptyCampaign,oldMaterial,oldSettled])assert.equal(hasResourceDungeons(s),false);
// Only resource progress is protected, with calendar rollover distinct from rollback.
const shiftDate=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
const guarded=copy(swept);delete guarded.lastBattle;
guarded.campaign.daily.uses={ore:1,...Object.fromEntries(RESOURCE_ROUTES.map(r=>[r.id,2]))};
guarded.campaign.mastery={ore_1:2,...Object.fromEntries(RESOURCE_ROUTES.flatMap(r=>[1,2,3].map(tier=>[r.id+'_'+tier,2])))};
assert.deepEqual(gameSnapshot(guarded,d),guarded);
const regressions=[],regression=(change,label)=>{const s=copy(guarded);change(s);assert.deepEqual(gameSnapshot(s,d),s,label+' otherwise valid');assert.equal(resourceDungeonsPreserved(guarded,s),false,label);regressions.push({state:s,label});};
for(const route of RESOURCE_ROUTES){
 for(const tier of [1,2,3]){const key=route.id+'_'+tier;regression(s=>delete s.campaign.mastery[key],'remove '+key);regression(s=>s.campaign.mastery[key]=1,'reduce '+key);}
 regression(s=>delete s.campaign.daily.uses[route.id],'remove same-day '+route.id);regression(s=>s.campaign.daily.uses[route.id]=1,'reduce same-day '+route.id);
}
regression(s=>delete s.campaign.mastery,'remove resource mastery');regression(s=>delete s.campaign,'remove resource campaign');
regression(s=>s.campaign.daily.date=shiftDate(s.campaign.daily.date,-1),'calendar rollback with preserved counts');
regression(s=>{s.campaign.daily.date=shiftDate(s.campaign.daily.date,-1);s.campaign.daily.uses={ore:1};},'calendar rollback with reset counts');
const nextDay=copy(guarded);nextDay.clock+=86400000;nextDay.campaign.daily={date:shiftDate(guarded.campaign.daily.date,1),uses:{ore:1}};
assert.deepEqual(gameSnapshot(nextDay,d),nextDay);assert.equal(resourceDungeonsPreserved(guarded,nextDay),true,'next day resets paid attempts');assert.equal(resourceDungeonsPreserved(nextDay,guarded),false,'a newer calendar cannot be overwritten by the previous day');
const lostAfterMidnight=copy(nextDay);delete lostAfterMidnight.campaign.mastery.silver_1;assert.equal(resourceDungeonsPreserved(guarded,lostAfterMidnight),false,'new date still preserves mastery');regressions.push({state:lostAfterMidnight,label:'mastery lost across midnight'});
for(const [before,after] of [['2026-09-30','2026-10-01'],['2026-12-31','2027-01-01']]){const a=copy(guarded),b=copy(nextDay);a.campaign.daily.date=before;b.campaign.daily.date=after;assert.equal(resourceDungeonsPreserved(a,b),true,'month/year rollover');assert.equal(resourceDungeonsPreserved(b,a),false,'month/year reversal');}
const zero=copy(legacy);zero.campaign={version:1,daily:{date:'2026-09-21',uses:{silver:0}},weekly:{}};const noZero=copy(zero);delete noZero.campaign.daily.uses.silver;assert.equal(resourceDungeonsPreserved(zero,noZero),true,'zero-use keys may be omitted');
const materialOnly=copy(guarded);delete materialOnly.campaign.mastery.ore_1;delete materialOnly.campaign.daily.uses.ore;assert.equal(resourceDungeonsPreserved(guarded,materialOnly),true,'helper does not extend old material restrictions');assert.equal(resourceDungeonsPreserved(oldSettled,legacy),true,'legacy materials do not invoke the resource guard');
const advancing=copy(guarded),prior=copy(guarded);prior.campaign.mastery.silver_1=1;advancing.campaign.daily.uses.silver=3;assert.equal(resourceDungeonsPreserved(prior,advancing),true,'new attempts and mastery can grow');
const guardRaw=JSON.stringify(guarded);assert.equal(resourceDungeonsPreserved(guarded,copy(guarded)),true);assert.equal(JSON.stringify(guarded),guardRaw,'guard is read-only');
const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};
 const admin='F'.repeat(64),env={DB,KEY_PEPPER:'resource-dungeons-tests-pepper-longer-than-32-characters',ADMIN_KEY:admin};
 const request=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await request('/v1/game-version','GET',admin)).json();assert.equal(caps.resourceDungeons,1);
 let slot,key,rev;const open=async id=>{slot=id;const response=await request('/v1/admin/slots/'+slot+'/key','POST',admin,{}),value=await response.json();assert.equal(response.status,200,JSON.stringify(value));key=value.key;rev=1;};
 const upload=state=>request('/v1/slots/'+slot,'PUT',key,{name:'基础资源副本',state},rev);
 const roundtrip=async(state,label)=>{const res=await upload(state);assert.equal(res.status,200,label+' '+await res.text());rev++;const got=await request('/v1/slots/'+slot,'GET',key);assert.equal(got.status,200);assert.deepEqual((await got.json()).state,state,label);};
 await open(13);await roundtrip(legacy,'legacy');
 for(const {label,state} of malformed){const before=db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),history=db.prepare('SELECT count(*) AS n FROM history WHERE slot=?').get(slot),res=await upload(state);assert.equal(res.status,400,label+' '+await res.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),before,label);assert.deepEqual(db.prepare('SELECT count(*) AS n FROM history WHERE slot=?').get(slot),history,label);}
 for(const [index,run] of runs.entries()){await open(index+1);for(const {label,state} of run.states)await roundtrip(state,label);}
 await open(14);await roundtrip(oldMaterial,'old material battle');await roundtrip(oldSettled,'old material settlement');
 // PUT rejects a valid but older snapshot without changing either slot data or history.
 await open(15);
 const historic=copy(guarded);historic.campaign.daily.date=shiftDate(guarded.campaign.daily.date,-1);historic.campaign.daily.uses={silver:1};for(const key of Object.keys(historic.campaign.mastery))if(key!=='ore_1')historic.campaign.mastery[key]=1;
 await roundtrip(historic,'older valid resource progress');const historicRevision=rev;await roundtrip(guarded,'protected resource progress');
 const rejectRegression=async(state,label)=>{const before=db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),history=db.prepare('SELECT count(*) AS n FROM history WHERE slot=?').get(slot),res=await upload(state);assert.equal(res.status,409,label+' '+await res.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),before,label+' preserves slot');assert.deepEqual(db.prepare('SELECT count(*) AS n FROM history WHERE slot=?').get(slot),history,label+' preserves history');};
 for(const {state,label} of regressions)await rejectRegression(state,label);
 await roundtrip(nextDay,'normal forward reset');await rejectRegression(guarded,'older calendar after reset');
 const rolledBack=await request('/v1/slots/'+slot+'/rollback','POST',key,{revision:historicRevision},rev);assert.equal(rolledBack.status,200,await rolledBack.text());rev++;assert.deepEqual((await(await request('/v1/slots/'+slot,'GET',key)).json()).state,historic,'explicit rollback can restore valid older dates and lower mastery');
 let writes=0;
 for(const resourceDungeons of [undefined,0,'1']){const older={...caps,resourceDungeons};if(resourceDungeons===undefined)delete older.resourceDungeons;const client=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json(older);});for(const state of variants)await assert.rejects(()=>client.upload(1,1,state,'基础资源副本'),/0\.53\.0.*本机进度已保留.*无需数据库迁移/);}
 assert.equal(writes,0,'old worker receives zero PUTs for resource saves');
 const older={...caps};delete older.resourceDungeons;
 const sent=[],legacyClient=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')sent.push(JSON.parse(options.body).state);return Response.json(older);});
 for(const s of [legacy,emptyCampaign,oldMaterial,oldSettled])await legacyClient.upload(1,1,s,'旧材料本');assert.deepEqual(sent,[legacy,emptyCampaign,oldMaterial,oldSettled]);
 let projected;const current=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT'){writes++;projected=JSON.parse(options.body).state;}return Response.json(caps);});await current.upload(1,1,swept,'扫荡云档');assert.equal(writes,1);assert.deepEqual(projected,swept);
 const coopCalls=[],coopClient=new CloudClient('https://test.invalid',d,async(url,options)=>{coopCalls.push({url,method:options.method});return Response.json(options.method==='GET'?{cooperative:1}:{ok:true});});assert.deepEqual(await coopClient.cooperate(1,1),{ok:true});assert.deepEqual(coopCalls.map(call=>call.method),['GET','POST']);assert.ok(coopCalls[1].url.endsWith('/v1/slots/1/cooperate'));
 console.log('Resource dungeon cloud PASS: 12 real three-tier runs with stable victories and sweeps; '+snapshotCount+' local/file/SQLite snapshots; '+malformed.length+' malformed saves rejected without slot/history writes; '+(regressions.length+1)+' valid regressions receive 409; next-day reset and authorized rollback remain available; old capability receives zero resource PUTs; legacy material saves and cooperation remain compatible; no database migration.');
}finally{db.close();}
