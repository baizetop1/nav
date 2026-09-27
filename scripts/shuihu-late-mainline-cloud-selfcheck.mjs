import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {d,act,travel,complete as seventhComplete} from './shuihu-volume-seven-selfcheck.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {staminaCap} from '../public/game/js/logistics.js';
import {meets} from '../public/game/js/map.js';
import {routeTo} from '../public/game/js/world-map.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave,SaveStore} from '../public/game/js/save.js';
import {hasLateMainline,lateMainlinePreserved} from '../public/game/js/late-mainline-save.js';
import {LATE_MISSIONS} from '../public/game/js/late-mainline-data.js';
const copy=structuredClone,late=id=>/^v(?:8|9|10|11|12)_/.test(id),models=d.stories.filter(m=>late(m.id));
assert.equal(d.chapters.length,12);assert.ok(models.length>=25);
const legacy=seventhComplete('hook',{level:40,quality:2}).s;
legacy.camp.buildings.hall=5;legacy.camp.buildings.barracks=5;legacy.camp.troops=1000-legacy.camp.wounded;legacy.camp.deployment=600;legacy.camp.food=1000000;legacy.player.silver=500000;
for(const id of legacy.team)for(const skill of d.by.heroes[id].skills.slice(0,3))legacy.growth.skills[skill]=5;
assert.ok(!hasLateMainline(legacy));assert.deepEqual(gameSnapshot(legacy,d),legacy);
const legacyRaw=JSON.stringify(legacy),heroes=copy(legacy.heroes),growth=copy(legacy.growth);
assert.deepEqual(importSave(exportSave(legacy,{id:1,name:'七卷旧档'},d),d).state,legacy);assert.equal(JSON.stringify(legacy),legacyRaw);
const routes=[];
function runRoute({priority,approach,allocation,decision,ending}){
 let s=copy(legacy);const states=[];let firstBattle,escortBattle,multiwave,retreated,preEnding;
 const capture=label=>{assert.deepEqual(gameSnapshot(s,d),s,label);assert.deepEqual(importSave(exportSave(s,{id:1,name:label},d),d).state,s,label);states.push({label,state:copy(s)});};
 const preferred=[priority,approach,allocation,decision,ending];
 for(let count=0;count<100&&!s.progress.flags.volume_twelve_complete;count++){
  const candidates=models.filter(m=>s.progress.stories[m.id]?.status!=='completed'&&meets(s,m.condition)&&routeTo(s,d,m.steps[s.progress.stories[m.id]?.step||m.start].map));
  assert.ok(candidates.length,'reachable next late story at '+s.location);
  const m=candidates[0],step=m.steps[s.progress.stories[m.id]?.step||m.start];s=travel(s,step.map);
  const choices=step.choices.filter(c=>meets(s,c.condition)),choice=choices.find(c=>preferred.includes(c.id))||choices[0];assert.ok(choice,m.id+' choice');
  if(choice.battle){
   s.player.stamina=staminaCap(s);while(s.camp.wounded)s=act(s,'campHeal');while(s.camp.troops<600)s=act(s,'campRecruit',{amount:50});
   s=act(s,'chapterBattle',{id:m.id,choice:choice.id});capture(m.id+' 开局');
   if(!firstBattle){firstBattle=copy(s);retreated=act(act(copy(s),'battleRetreat'),'finishBattle');assert.deepEqual(gameSnapshot(retreated,d),retreated);}
   if(s.battle.mainline?.escort&&!escortBattle)escortBattle=copy(s);
   const seenWaves=new Set([s.battle.mainline?.wave]);
   for(let n=0;n<180&&!s.battle.outcome;n++){
    const source=LATE_MISSIONS[m.id].escort?.source,focus=s.battle.enemy.find(u=>u.hp>0&&u.model===source)||s.battle.enemy.find(u=>u.hp>0&&u.boss)||s.battle.enemy.find(u=>u.hp>0);
    if(focus&&s.battle.orders?.focus!==focus.id)s=act(s,'battleOrder',{kind:'focus',target:focus.id});
    if(source&&s.battle.orders?.stance!=='guard'&&(s.battle.orders?.readyAt||0)<=s.battle.elapsed)s=act(s,'battleOrder',{kind:'stance',value:'guard'});
    advanceBattle(s,d,1000);
    if(n===0)capture(m.id+' 途中');
    if(!seenWaves.has(s.battle.mainline?.wave)){seenWaves.add(s.battle.mainline?.wave);capture(m.id+' 后续波次');if(!multiwave)multiwave=copy(s);}
   }
   assert.equal(s.battle.outcome,'victory',m.id+' '+ending+' '+s.battle.log.slice(-10).join('\n'));capture(m.id+' 胜利待结算');
   s=act(s,'finishBattle');capture(m.id+' 结算待确认');
  }else{
   if((choice.effects||[]).some(e=>e.type==='flag'&&e.id==='v12_settled'))preEnding=copy(s);
   s=act(s,'story',{id:m.id,choice:choice.id});capture(m.id+' '+choice.id);
  }
 }
 assert.equal(s.progress.flags.volume_twelve_complete,true);assert.equal(s.progress.flags['v12_ending_'+ending],true);assert.ok(preEnding&&multiwave&&escortBattle);
 for(const [id,h] of Object.entries(heroes))if(h.status==='owned')assert.deepEqual(s.heroes[id],h,'owned training preserved '+id);
 assert.deepEqual(s.growth,growth,'late story rewards do not change training');
 const result={ending,states,firstBattle,escortBattle,multiwave,retreated,preEnding,complete:copy(s)};routes.push(result);return result;
}
const stay=runRoute({priority:'rescue',approach:'covert',allocation:'supply',decision:'homeland',ending:'stay'});
const sea=runRoute({priority:'evidence',approach:'assault',allocation:'defense',decision:'homeland',ending:'sea'});
const back=runRoute({priority:'supply',approach:'covert',allocation:'defense',decision:'charter',ending:'return'});
let defeated=copy(stay.states.find(row=>row.label.startsWith('v8_choose ')).state);defeated.team=['linchong'];defeated.heroes.linchong.quality=0;defeated.growth.skills={};defeated.camp.mode='solo';defeated.player.stamina=staminaCap(defeated);defeated=travel(defeated,d.by.stories.v8_rescue.map);defeated=act(defeated,'chapterBattle',{id:'v8_rescue',choice:'fight'});
for(let n=0;n<180&&!defeated.battle.outcome;n++)advanceBattle(defeated,d,1000);
assert.equal(defeated.battle.outcome,'defeat');const afterDefeat=act(copy(defeated),'finishBattle');assert.deepEqual(gameSnapshot(defeated,d),defeated);assert.deepEqual(gameSnapshot(afterDefeat,d),afterDefeat);
const memory=new Map(),store=new SaveStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},d);store.load();store.write(legacy);store.write(stay.multiwave);assert.deepEqual(store.load().state,stay.multiwave);assert.deepEqual(store.backup(),legacy);
const malformed=[],invalid=(source,change,label)=>{const s=copy(source);change(s);assert.throws(()=>validateSave(s,d),/存档校验失败/,label);malformed.push(s);};
invalid(stay.complete,s=>delete s.progress.flags.volume_seven_complete,'prior chapter');
invalid(stay.complete,s=>s.progress.flags.v8_unknown=true,'unknown flag');
invalid(stay.complete,s=>delete s.progress.flags.v8_chosen,'missing choice');
invalid(stay.complete,s=>s.progress.flags.v8_priority_supply=true,'exclusive choice');
invalid(stay.complete,s=>delete s.progress.stories.v8_choose,'missing source');
invalid(stay.complete,s=>s.progress.stories.v8_choose.status='active','finished source active');
invalid(stay.complete,s=>delete s.progress.flags.volume_twelve_complete,'repeat chapter reward');
invalid(stay.complete,s=>s.progress.flags.v12_ending_sea=true,'exclusive ending');
invalid(stay.complete,s=>{delete s.progress.flags.v12_stay;s.progress.flags.v12_return=true;},'decision mismatch');
invalid(stay.complete,s=>delete s.progress.flags.v8_final_done,'incomplete chapter');
for(const [key,value] of [['next','fight'],['terrain','invalid'],['id','v8_choose'],['extra',true]])invalid(stay.firstBattle,s=>s.battle.context[key]=value,'battle context '+key);
invalid(stay.firstBattle,s=>delete s.progress.stories[s.battle.context.id],'battle source');
invalid(stay.firstBattle,s=>s.progress.stories[s.battle.context.id].step='settle','battle story stage');
invalid(stay.firstBattle,s=>s.location='v8_camp','battle location');
invalid(stay.firstBattle,s=>delete s.battle.mainline,'missing mainline');
invalid(stay.firstBattle,s=>s.battle.mainline.wave=999,'unknown wave');
invalid(stay.firstBattle,s=>s.battle.mainline.shields.invalid=1,'unknown shield owner');
invalid(stay.escortBattle,s=>s.battle.mainline.escort.hp=101,'escort hp');
invalid(sea.multiwave,s=>s.battle.mainline.wave=0,'wave roster mismatch');
invalid(stay.complete,s=>s.lastBattle.context.id='v12_choose','report source');
assert.ok(lateMainlinePreserved(legacy,stay.complete,d));assert.ok(!lateMainlinePreserved(stay.complete,legacy,d));assert.ok(!lateMainlinePreserved(stay.complete,sea.complete,d));
const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};
 const admin='E'.repeat(64),env={DB,KEY_PEPPER:'late-mainline-test-pepper-longer-than-32-characters',ADMIN_KEY:admin};
 const request=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await request('/v1/game-version','GET',admin)).json();assert.equal(caps.chapters,12);
 let slot,key,rev;const open=async id=>{slot=id;key=(await(await request('/v1/admin/slots/'+slot+'/key','POST',admin,{})).json()).key;rev=1;};
 const upload=state=>request('/v1/slots/'+slot,'PUT',key,{name:'后五卷兼容自检',state},rev);
 const roundtrip=async(state,label='')=>{const res=await upload(state);assert.equal(res.status,200,label+' '+await res.text());rev++;const got=await request('/v1/slots/'+slot,'GET',key);assert.equal(got.status,200);assert.deepEqual((await got.json()).state,state,label);};
 const reject=async(state,status)=>{const before=db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),history=db.prepare('SELECT count(*) AS n FROM history WHERE slot=?').get(slot);const res=await upload(state);assert.equal(res.status,status,await res.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),before);assert.deepEqual(db.prepare('SELECT count(*) AS n FROM history WHERE slot=?').get(slot),history);};
 await open(1);for(const bad of malformed)await reject(bad,400);await roundtrip(legacy);
 for(const {state,label} of stay.states)await roundtrip(state,label);
 await reject(legacy,409);await reject(stay.preEnding,409);await reject(sea.complete,409);await reject(back.complete,409);
 const missingEarlyChapter=copy(stay.complete);delete missingEarlyChapter.progress.flags.volume_two_complete;await reject(missingEarlyChapter,409);
 for(const [i,r] of [sea,back].entries()){await open(i+2);for(const {state,label} of r.states)await roundtrip(state,label);}
 await open(4);await roundtrip(stay.preEnding);const prior=rev;await roundtrip(stay.complete);const rollback=await request('/v1/slots/4/rollback','POST',key,{revision:prior},rev);assert.equal(rollback.status,200,await rollback.text());rev++;assert.deepEqual((await(await request('/v1/slots/4','GET',key)).json()).state,stay.preEnding);
 await open(5);await roundtrip(stay.firstBattle);await roundtrip(stay.retreated);await roundtrip(stay.firstBattle);
 await open(6);await roundtrip(defeated);await roundtrip(afterDefeat);await roundtrip(stay.firstBattle);
 const variants=[stay.firstBattle,stay.multiwave,stay.complete,sea.complete,back.complete];
 for(const field of ['flag','chapter','location','visited','story','battle','report','mainline']){const s=copy(legacy);if(field==='flag')s.progress.flags.v8_chosen=true;if(field==='chapter')s.progress.flags.volume_twelve_complete=true;if(field==='location')s.location='v12_camp';if(field==='visited')s.progress.visited.push('v8_camp');if(field==='story')s.progress.stories.v8_choose={status:'active',step:'start'};if(field==='battle')s.battle=copy(stay.firstBattle.battle);if(field==='report')s.lastBattle=copy(stay.complete.lastBattle);if(field==='mainline')s.battle={context:{type:'story',id:'huangni'},mainline:{version:1}};variants.push(s);}
 let writes=0;for(const chapters of [undefined,7,8,9,10,11]){const client=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json({...caps,chapters});});for(const state of variants)await assert.rejects(()=>client.upload(1,1,state,'后五卷'),/0.52.0.*无需数据库迁移/);}assert.equal(writes,0);
 let projected;const current=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT'){writes++;projected=JSON.parse(options.body).state;}return Response.json(caps);});await current.upload(1,1,sea.complete,'现行服务');assert.equal(writes,1);assert.deepEqual(projected,sea.complete);
 const coopCalls=[],legacyCoop=new CloudClient('https://test.invalid',d,async(url,options)=>{coopCalls.push({url,method:options.method});return Response.json(options.method==='GET'?{cooperative:1,chapters:7}:{ok:true});});assert.deepEqual(await legacyCoop.cooperate(1,1),{ok:true});assert.deepEqual(coopCalls.map(c=>c.method),['GET','POST']);assert.ok(coopCalls[1].url.endsWith('/v1/slots/1/cooperate'),'chapter capability gate applies only to uploads');
 console.log('Late mainline cloud PASS: three real endings; '+routes.reduce((n,r)=>n+r.states.length,0)+' battle/story snapshots survive local/file/SQLite cloud roundtrips; '+malformed.length+' malformed saves rejected without slot/history writes; normal uploads preserve chapter/route/ending progress, explicit history rollback and defeat/retreat/retry retained; old capabilities receive zero PUTs; no database migration.');
}finally{db.close();}
