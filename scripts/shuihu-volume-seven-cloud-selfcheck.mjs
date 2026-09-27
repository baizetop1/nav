import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {staminaCap} from '../public/game/js/logistics.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';
import {ready as chapterReady,travel as chapterTravel,fight as chapterFight,story as chapterStory} from './shuihu-volume-seven-selfcheck.mjs';
import {seventhVolumePreserved} from '../public/game/js/volume-seven-save.js';
import {hasSeventhVolume} from '../public/game/js/volume-seven-data.js';
const copy=structuredClone;
const base=()=>{const s=fixture(519,40);s.camp.buildings.hall=5;s.camp.buildings.barracks=5;s.camp.mode='army';s.camp.troops=1000;s.camp.deployment=600;s.camp.food=100000;s.player.silver=50000;s.inventory.iron=30;s.inventory.cloth=30;s.inventory.wood=30;s.team=['linchong','luzhishen','songjiang'];for(const id of s.team)Object.assign(s.heroes[id],{status:'owned',level:40,exp:0,quality:2});s.growth={version:1,skills:Object.fromEntries(s.team.flatMap(id=>d.by.heroes[id].skills.slice(0,3).map(k=>[k,3]))),mounts:{}};for(const flag of ['volume_complete','volume_two_complete','volume_three_complete','volume_four_complete','volume_five_complete','volume_six_complete'])s.progress.flags[flag]=true;s.location='v6_refuge';s.progress.visited.push('v6_refuge');s.battleSkillMode='auto';return s;};
const legacy=base();assert.ok(!hasSeventhVolume(legacy));assert.deepEqual(gameSnapshot(legacy,d),legacy);
const states=[],capture=s=>{assert.deepEqual(gameSnapshot(s,d),s);assert.deepEqual(importSave(exportSave(s,{id:1,name:'破连环马'},d),d).state,s);states.push(copy(s));return s;};
const travel=(s,id)=>s.location===id?s:act(s,'travel',{id});
const story=(s,id,choice)=>act(travel(s,d.by.stories[id].map),'story',{id,choice});
let firstBattle,settling,complete,prepared,retreated,afterProbe,finalBattle;
function route(choice){let s=base();s=capture(story(s,'v7_report','finish'));s=capture(story(s,'v7_scout','finish'));
 for(const id of ['v7_probe','v7_cut','v7_break','v7_final']){
  if(id==='v7_cut'){s=capture(story(s,'v7_prepare',choice));if(!prepared)prepared=copy(s);}
  s.player.stamina=staminaCap(s);s=travel(s,d.by.stories[id].map);s=capture(act(s,'chapterBattle',{id,choice:'fight'}));
  if(!firstBattle){firstBattle=copy(s);retreated=capture(act(act(copy(s),'battleRetreat'),'finishBattle'));}
  if(id==='v7_final'&&!finalBattle)finalBattle=copy(s);
  for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);
  assert.equal(s.battle.outcome,'victory',id+' '+choice+' '+s.battle.log.slice(-8).join('\n'));s=capture(s);if(!settling)settling=copy(s);s=capture(act(s,'finishBattle'));if(id==='v7_probe'&&!afterProbe)afterProbe=copy(s);s=capture(story(s,id,'finish'));
 }
 s=capture(story(s,'v7_settle','finish'));assert.equal(s.progress.flags.volume_seven_complete,true);assert.equal(s.progress.flags['v7_'+choice],true);if(!complete)complete=copy(s);return s;
}
const hook=route('hook'),trench=route('trench');
const invalid=(source,change)=>{const s=copy(source);change(s);assert.throws(()=>validateSave(s,d),/存档校验失败/);return s;};
const malformed=[
 invalid(complete,s=>delete s.progress.flags.volume_six_complete),invalid(complete,s=>s.progress.flags.v7_unknown=true),invalid(complete,s=>delete s.progress.flags.v7_prepared),invalid(complete,s=>s.progress.flags.v7_trench=true),invalid(complete,s=>delete s.progress.flags.v7_hook),invalid(complete,s=>delete s.progress.stories.v7_prepare),invalid(complete,s=>s.progress.stories.v7_prepare.status='active'),invalid(complete,s=>delete s.progress.flags.v7_probe_done),invalid(complete,s=>s.progress.stories.v7_probe.step='fight'),invalid(complete,s=>delete s.progress.flags.v7_final_done),
 invalid(firstBattle,s=>s.battle.context.next='fight'),invalid(firstBattle,s=>s.battle.context.terrain='forest'),invalid(firstBattle,s=>s.battle.context.id='v7_report'),invalid(firstBattle,s=>s.battle.context.extra=true),invalid(firstBattle,s=>delete s.progress.stories.v7_probe),invalid(firstBattle,s=>s.progress.stories.v7_probe.step='settle'),invalid(firstBattle,s=>s.location='v7_camp'),
 invalid(complete,s=>s.lastBattle.context.id='v7_report'),invalid(complete,s=>s.lastBattle.context.next='fight'),invalid(complete,s=>s.lastBattle.context.terrain='water'),invalid(afterProbe,s=>s.progress.stories.v7_probe.step='fight')
];
// Legal interrupted paths: optional victories can be claimed later; losses can be retried.
const boundaryStates=[],boundary=(state,label)=>{assert.deepEqual(importSave(exportSave(state,{id:1,name:label},d),d).state,state);boundaryStates.push({state:copy(state),label});return state;};
for(const wonCut of [false,true]){
 let s=chapterTravel(chapterReady('trench'),'v7_road');s=boundary(act(s,'story',{id:'v7_cut'}),'截援已查看');
 if(wonCut){s=act(s,'chapterBattle',{id:'v7_cut',choice:'fight'});for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory');s=boundary(act(s,'finishBattle'),'截援待领奖');}
 const old=copy(s);s=chapterFight(s,'v7_break');s=chapterFight(s,'v7_final');s=chapterTravel(s,'v7_camp');s=boundary(chapterStory(s,'v7_settle'),'可选事务未收尾但主线已结卷');assert.equal(seventhVolumePreserved(old,s,d),true);
 s=chapterTravel(s,'v7_road');const raw=JSON.stringify(s);assert.throws(()=>act(s,'chapterBattle',{id:'v7_cut',choice:'fight'}));assert.equal(JSON.stringify(s),raw);
 if(wonCut){s=boundary(chapterStory(s,'v7_cut'),'决战后领取已赢截援酬劳');assert.equal(s.progress.flags.v7_aid_cut,true);}
 s=act(s,'campRaid',{id:'woods'});for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory');s=boundary(act(s,'finishBattle'),'普通战役替换终局复盘');assert.equal(seventhVolumePreserved(old,s,d),true);
}
let defeated=chapterTravel(chapterReady('hook'),'v7_field');defeated.team=['linchong'];defeated.camp.mode='solo';defeated.heroes.linchong.quality=0;defeated.growth.skills={};defeated=act(defeated,'chapterBattle',{id:'v7_break',choice:'fight'});for(let n=0;n<180&&!defeated.battle.outcome;n++)advanceBattle(defeated,d,1000);assert.equal(defeated.battle.outcome,'defeat');defeated=boundary(defeated,'败战待结算');defeated=boundary(act(defeated,'finishBattle'),'败战结算后');defeated.team=['linchong','luzhishen','songjiang'];defeated.camp.mode='army';defeated.camp.deployment=300;boundary(chapterFight(defeated,'v7_break'),'整备重试得胜');
const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};
 const admin='D'.repeat(64),env={DB,KEY_PEPPER:'volume-seven-test-pepper-longer-than-32-characters',ADMIN_KEY:admin};
 const request=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await request('/v1/game-version','GET',admin)).json();assert.equal(caps.chapters,d.chapters.length);assert.ok(caps.chapters>=7);
 let slot,key,rev;const openSlot=async id=>{slot=id;key=(await(await request('/v1/admin/slots/'+slot+'/key','POST',admin,{})).json()).key;rev=1;};await openSlot(1);
 const upload=state=>request('/v1/slots/'+slot,'PUT',key,{name:'破连环马',state},rev);
 const roundtrip=async state=>{const res=await upload(state);assert.equal(res.status,200,await res.text());rev++;const got=await request('/v1/slots/'+slot,'GET',key);assert.equal(got.status,200);assert.deepEqual((await got.json()).state,state);};
 const rejectStable=async(state,status)=>{const before=db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),res=await upload(state);assert.equal(res.status,status,await res.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),before);};
 await roundtrip(legacy);for(const bad of malformed)await rejectStable(bad,400);
 await roundtrip(firstBattle);const battleRevision=rev;await roundtrip(retreated);await rejectStable(firstBattle,409);const retryRollback=await request('/v1/slots/'+slot+'/rollback','POST',key,{revision:battleRevision},rev);assert.equal(retryRollback.status,200,await retryRollback.text());rev++;assert.deepEqual((await(await request('/v1/slots/'+slot,'GET',key)).json()).state,firstBattle);await roundtrip(settling);await roundtrip(afterProbe);await rejectStable(firstBattle,409);await roundtrip(prepared);await roundtrip(finalBattle);await roundtrip(complete);
 await rejectStable(legacy,409);await rejectStable(prepared,409);await rejectStable(trench,409);
 const beforeReport=copy(complete);delete beforeReport.lastBattle;await roundtrip(beforeReport);await roundtrip(complete);
 // Explicit history rollback remains available even after chapter completion.
 const history=await(await request('/v1/slots/'+slot+'/history','GET',key)).json();const prior=history.history.find(h=>h.cloudRevision===rev-4);assert.ok(prior);const rolled=await request('/v1/slots/'+slot+'/rollback','POST',key,{revision:prior.cloudRevision},rev);assert.equal(rolled.status,200,await rolled.text());rev++;const restored=(await(await request('/v1/slots/'+slot,'GET',key)).json()).state;assert.equal(restored.progress.flags.volume_seven_complete,undefined);assert.equal(restored.progress.flags.v7_hook,true);assert.deepEqual(restored,prepared);
 await openSlot(2);await roundtrip(trench);for(const [i,{state}] of boundaryStates.entries()){await openSlot(i+3);await roundtrip(state);}
 let writes=0;const older={...caps,chapters:6},client=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json(older);});
 const variants=[firstBattle,complete];for(const field of ['flag','location','visited','story','battle','report']){const s=base();if(field==='flag')s.progress.flags.v7_hook=true;if(field==='location')s.location='v7_camp';if(field==='visited')s.progress.visited.push('v7_camp');if(field==='story')s.progress.stories.v7_report={status:'active',step:'start'};if(field==='battle')s.battle=copy(firstBattle.battle);if(field==='report')s.lastBattle=copy(complete.lastBattle);variants.push(s);}
 for(const s of variants)await assert.rejects(()=>client.upload(1,rev,s,'第七卷'),/0.51.0/);assert.equal(writes,0);
 console.log('Volume seven cloud PASS: both routes and all real battle stages/file roundtrips; isolated SQLite uploads/downloads, 21 malformed cross-state rejections, monotonic chapter/choice protection, explicit rollback retained, interrupted optional stories and defeat/retry saves survive, old six-volume worker receives zero PUTs; no database migration.');
}finally{db.close();}
