import assert from 'node:assert/strict';
import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';
import {d,fixture} from './shuihu-campaign-fixtures.mjs';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {parseSave,SaveStore} from '../public/game/js/save.js';
import {campWorkPreserved} from '../public/game/js/camp-work-save.js';
import {heroAbsence,heroPosting} from '../public/game/js/hero-availability.js';
import {idleAvailable} from '../public/game/js/idle-data.js';import {squadAvailable} from '../public/game/js/squads.js';
const clinic=s=>({version:1,clinic:{hero:'andaoquan',enabled:true,auto:false,lastAt:s.clock,carry:12345,budget:{herb:12,cloth:8,food:24},treated:0,spent:{herb:0,cloth:0,food:0},revision:1}});
const base=fixture(),configured=structuredClone(base);configured.campWork=clinic(base);
assert.equal(gameSnapshot(base,d).campWork,undefined);assert.deepEqual(gameSnapshot(configured,d),configured);
assert.deepEqual(importSave(exportSave(configured,{id:1,name:'驻寨测试'},d),d).state,configured);
const storage=new Map(),store=new SaveStore({getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},d);store.write(configured);assert.deepEqual(store.load().state,configured);
const assertBad=mutate=>{const s=structuredClone(configured);mutate(s.campWork);assert.throws(()=>parseSave(JSON.stringify(s),d),/医馆|寨内/);};
for(const mutate of [x=>x.extra=1,x=>x.version=2,x=>x.clinic.extra=1,x=>x.clinic.hero='not_a_hero',x=>x.clinic.budget.herb=-1,x=>x.clinic.budget.extra=1,x=>delete x.clinic.spent.cloth,x=>x.clinic.lastAt++,x=>x.clinic.carry=1800000,x=>x.clinic.revision=1.5,x=>x.clinic.treated=10000001,x=>x.clinic.auto='yes'])assertBad(mutate);
// Main-team selection alone retains the clinic; only actual departures pause it.
configured.team.push('andaoquan');configured.team.shift();assert.equal(heroAbsence(configured,'andaoquan'),'');assert.equal(heroPosting(configured,'andaoquan'),'医馆坐诊');assert.equal(heroPosting(configured,'andaoquan','clinic'),'');
for(const [key,value]of [['idleDispatch',{mission:{hero:'andaoquan'}}],['affairs',{mission:{hero:'andaoquan'}}],['realm',{squad:{team:['andaoquan']}}],['realm',{trek:{team:['andaoquan']}}],['expansion',{run:{team:['andaoquan']}}],['adventure',{run:{team:['andaoquan']}}],['battle',{guest:false,team:[{id:'andaoquan'}]}]]){const s=structuredClone(configured);s[key]=value;assert.ok(heroAbsence(s,'andaoquan'));}
const guest=structuredClone(configured);guest.battle={guest:true,team:[{id:'andaoquan'}]};assert.equal(heroAbsence(guest,'andaoquan'),'');
const conflict=structuredClone(configured);conflict.frontier={version:1,lastAt:conflict.clock,stations:Object.fromEntries(['farm','lumber','workshop'].map(id=>[id,{worker:null,carry:0,bank:0}])),posts:{}};conflict.frontier.stations.farm.worker='hero:andaoquan';assert.equal(heroPosting(conflict,'andaoquan','clinic'),'生产任职');assert.deepEqual(gameSnapshot(conflict,d).campWork,configured.campWork);
const standby=structuredClone(configured);standby.team=standby.team.filter(id=>id!=='andaoquan');assert.equal(idleAvailable(standby,'andaoquan'),false);assert.equal(squadAvailable(standby,'andaoquan'),false);assert.equal(idleAvailable(standby,'andaoquan',{ignoreClinic:true}),true);
const progressed=structuredClone(configured);progressed.campWork.clinic.revision++;progressed.campWork.clinic.treated=3;progressed.campWork.clinic.spent={herb:3,cloth:3,food:6};progressed.campWork.clinic.budget={herb:9,cloth:5,food:18};progressed.campWork.clinic.lastAt+=1000;progressed.clock+=1000;progressed.campWork.clinic.carry=23456;
assert.equal(campWorkPreserved(configured,progressed),true);assert.equal(campWorkPreserved(progressed,configured),false);assert.equal(campWorkPreserved(progressed,base),false);
const lost=structuredClone(progressed);lost.campWork.clinic.budget.herb=0;assert.equal(campWorkPreserved(progressed,lost),false);const lostCarry=structuredClone(progressed);lostCarry.campWork.clinic.carry=0;assert.equal(campWorkPreserved(progressed,lostCarry),false);
// Returning a budget is valid with a new revision; lifetime care totals remain.
const refunded=structuredClone(progressed);refunded.campWork.clinic.revision++;refunded.campWork.clinic.budget={herb:0,cloth:0,food:0};refunded.campWork.clinic.carry=0;assert.equal(campWorkPreserved(progressed,refunded),true);
const bundle=await build({entryPoints:[fileURLToPath(new URL('../cloud/shuihu/worker.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}},admin='A'.repeat(64),env={DB,KEY_PEPPER:'camp-work-local-test-pepper-at-least-thirty-two-characters',ADMIN_KEY:admin};
 const req=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await req('/v1/game-version','GET',admin)).json();assert.equal(caps.campWork,1);
 const key=(await(await req('/v1/admin/slots/1/key','POST',admin,{})).json()).key;let revision=1;
 const upload=async(state,status=200)=>{const before=db.prepare('SELECT raw,revision FROM slots WHERE id=1').get(),res=await req('/v1/slots/1','PUT',key,{name:'驻寨工作测试',state},revision);assert.equal(res.status,status,await res.text());if(status===200){revision++;const download=await(await req('/v1/slots/1','GET',key)).json();assert.deepEqual(download.state,gameSnapshot(state,d));}else assert.deepEqual(db.prepare('SELECT raw,revision FROM slots WHERE id=1').get(),before);};
 await upload(base);await upload(configured);await upload(progressed);await upload(configured,409);await upload(base,409);await upload(lost,409);await upload(lostCarry,409);const malformed=structuredClone(progressed);malformed.campWork.clinic.carry=1800000;malformed.campWork.clinic.revision++;await upload(malformed,400);await upload(refunded);
 let puts=0;const oldCaps={...caps};delete oldCaps.campWork;const oldClient=new CloudClient('https://test.invalid',d,async(_,o)=>{if(o.method==='PUT')puts++;return Response.json(oldCaps);});await assert.rejects(()=>oldClient.upload(1,1,progressed,'旧服务'),/医馆预算/);assert.equal(puts,0);await oldClient.upload(1,1,base,'旧档');assert.equal(puts,1);
 console.log('Camp work cloud PASS: optional legacy, strict shape, local/portable/Worker roundtrip, actual absence, exclusive posts, old overlap readable, budget/carry rollback blocked, refund accepted, old Worker blocked before PUT; no schema migration.');
}finally{db.close();}
