// Runs the actual Worker against in-memory SQLite. No production D1 or network calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {promotionQuote} from '../public/game/js/quality.js';
import {PROMOTION_CORES} from '../public/game/js/promotion-data.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))])));
const act=(s,type,a={})=>{const next=dispatch(d,s,{type,...a},s.clock);assert.deepEqual(gameSnapshot(next,d),next);return next;};
function fixture(){const s=newGame(d,Date.parse('2026-10-13T12:00:00Z'),731);s.camp=freshCamp();s.camp.mode='solo';s.camp.buildings.hall=4;s.camp.food=10000;s.camp.wood=1000;s.player.silver=10000;s.player.stamina=100;s.team=['linchong'];for(const id of ['linchong','ruanxiaoqi'])Object.assign(s.heroes[id],{status:'owned',level:30,exp:0});s.inventory.recruit_order=10;return s;}
const base=fixture(),core=PROMOTION_CORES.ruanxiaoqi,withCore=structuredClone(base);withCore.inventory[core.item]=3;
const supplied=structuredClone(withCore);for(const[id,n]of Object.entries(promotionQuote(supplied,'ruanxiaoqi').cost.items))supplied.inventory[id]=n;
const promoted=act(supplied,'heroPromote',{id:'ruanxiaoqi'});assert.equal(promoted.progress.flags.promotion_cores_v1,true);assert.equal(promoted.inventory[core.item],0);assert.equal(promoted.heroes.ruanxiaoqi.quality,1);
const recruited=act(promoted,'recruit');assert.equal(recruited.recruit.rules,2);
const started=act(recruited,'specialStart',{id:'mine',tier:1});assert.equal(started.battle.difficultyRules,1);
const progressing=structuredClone(started);advanceBattle(progressing,d,1000);assert.equal(progressing.battle.difficultyRules,1);assert.ok(progressing.battle.elapsed>0);
for(const state of [base,withCore,promoted,recruited,started,progressing])assert.deepEqual(importSave(exportSave(state,{id:1,name:'规则升级'},d),d).state,state);
const bundle=await build({entryPoints:[fileURLToPath(new URL('../cloud/shuihu/worker.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}},admin='A'.repeat(64),env={DB,KEY_PEPPER:'new-rules-local-test-pepper-at-least-thirty-two-characters',ADMIN_KEY:admin};
 const req=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await req('/v1/game-version','GET',admin)).json();for(const feature of ['recruitmentBanners','promotionCores','difficultyTiers'])assert.equal(caps[feature],1);
 const key=(await(await req('/v1/admin/slots/1/key','POST',admin,{})).json()).key;let rev=1;
 const upload=async(state,status=200)=>{const before=db.prepare('SELECT raw,revision FROM slots WHERE id=1').get(),res=await req('/v1/slots/1','PUT',key,{name:'招贤升品难度',state},rev),body=await res.text();assert.equal(res.status,status,body);if(status===200){rev++;const downloaded=(await(await req('/v1/slots/1','GET',key)).json()).state;assert.deepEqual(downloaded,gameSnapshot(state,d));}else assert.deepEqual(db.prepare('SELECT raw,revision FROM slots WHERE id=1').get(),before);};
 for(const state of [base,withCore,supplied,promoted,recruited,started,progressing])await upload(state);
 const droppedBattle=structuredClone(progressing);delete droppedBattle.battle.difficultyRules;await upload(droppedBattle,409);
 const droppedBanner=structuredClone(progressing);delete droppedBanner.recruit.rules;await upload(droppedBanner,409);
 const droppedPromotion=structuredClone(progressing);delete droppedPromotion.progress.flags.promotion_cores_v1;await upload(droppedPromotion,409);
 const corruptKey=(await(await req('/v1/admin/slots/3/key','POST',admin,{})).json()).key;
 const rejectFresh=async(state)=>{const before=db.prepare('SELECT raw,revision FROM slots WHERE id=3').get(),res=await req('/v1/slots/3','PUT',corruptKey,{name:'坏数据',state},1);assert.equal(res.status,400,await res.text());assert.deepEqual(db.prepare('SELECT raw,revision FROM slots WHERE id=3').get(),before);};
 const malformedBattle=structuredClone(progressing);malformedBattle.battle.difficultyRules=2;await rejectFresh(malformedBattle);
 const malformedRecruit=structuredClone(progressing);malformedRecruit.recruit.rules=3;await rejectFresh(malformedRecruit);
 const malformedItem=structuredClone(progressing);malformedItem.inventory.core_nonexistent=1;await rejectFresh(malformedItem);
 const finished=act(act(progressing,'battleRetreat'),'finishBattle');assert.equal(finished.battle,null);await upload(finished);
 let puts=0;for(const [feature,state]of [['promotionCores',withCore],['recruitmentBanners',recruited],['difficultyTiers',started]]){
  const oldCaps={...caps};delete oldCaps[feature];const calls=[],client=new CloudClient('https://test.invalid',d,async(_,o)=>{calls.push(o.method);if(o.method==='PUT')puts++;return Response.json(oldCaps);});
  await assert.rejects(()=>client.upload(1,1,state,'旧服务'),/0\.83|活动招贤|升品|难度/);assert.deepEqual(calls,['GET']);
 }
 assert.equal(puts,0);
 const legacyCaps={...caps};delete legacyCaps.promotionCores;delete legacyCaps.recruitmentBanners;delete legacyCaps.difficultyTiers;const calls=[],compatible=new CloudClient('https://test.invalid',d,async(_,o)=>{calls.push(o.method);return Response.json(legacyCaps);});await compatible.upload(1,1,base,'旧规则存档');assert.deepEqual(calls,['GET','PUT']);
 // A genuinely preexisting marker-free battle can still travel, including its original stats.
 const legacyFight=structuredClone(started);delete legacyFight.battle.difficultyRules;delete legacyFight.recruit.rules;delete legacyFight.progress.flags.promotion_cores_v1;const legacyKey=(await(await req('/v1/admin/slots/2/key','POST',admin,{})).json()).key;
 const first=await req('/v1/slots/2','PUT',legacyKey,{name:'旧战局',state:legacyFight},1);assert.equal(first.status,200,await first.text());assert.deepEqual((await(await req('/v1/slots/2','GET',legacyKey)).json()).state.battle,legacyFight.battle);
 console.log('v0.83 cloud PASS: actual Worker/SQLite core inventory and paid promotion, recruitment rules2, live difficultyRules1 and portable roundtrips; old-page marker deletion and malformed snapshots atomically rejected; legitimate battle finish accepted; all three old Worker guards fire before PUT; legacy saves/fights preserved; original schema only.');
}finally{db.close();}
