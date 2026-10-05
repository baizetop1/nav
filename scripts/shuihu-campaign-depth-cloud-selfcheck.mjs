
import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';
import {d,fixture,act,win} from './shuihu-campaign-fixtures.mjs';import {newEquipment} from '../public/game/js/item.js';import {CloudClient} from '../public/game/js/cloud.js';import {advanceBattle} from '../public/game/js/battle.js';import {gameSnapshot} from '../public/game/js/portable.js';
import {depthFixtures} from './shuihu-campaign-depth-selfcheck.mjs';
const samples=depthFixtures();
const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false}),worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}},admin='A'.repeat(64),env={DB,KEY_PEPPER:'tactics-test-pepper-at-least-thirty-two-characters',ADMIN_KEY:admin};
const req=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
const caps=await(await req('/v1/game-version','GET',admin)).json();assert.equal(caps.campaignDepth,1);assert.equal(caps.release,d.config.release);
let slot=0;for(const states of samples){slot++;const key=(await(await req('/v1/admin/slots/'+slot+'/key','POST',admin,{})).json()).key;let rev=1;
 for(const state of states){const res=await req('/v1/slots/'+slot,'PUT',key,{name:'人物路线挑战',state},rev++);assert.equal(res.status,200,await res.text());assert.deepEqual((await(await req('/v1/slots/'+slot,'GET',key)).json()).state,gameSnapshot(state,d));}
 const last=states.at(-1),old=structuredClone(last);if(old.replays?.challenges)delete old.replays.challenges;else if(old.lastBattle.context.kind==='personal')delete old.expansion.personal[old.lastBattle.context.id];else delete old.specialDungeons.clears[old.specialDungeons.last.id+'_1'];
 const before=db.prepare('SELECT raw,revision FROM slots WHERE id=?').get(slot);const res=await req('/v1/slots/'+slot,'PUT',key,{name:'旧页面',state:old},rev);assert.ok([400,409].includes(res.status),await res.text());assert.deepEqual(db.prepare('SELECT raw,revision FROM slots WHERE id=?').get(slot),before);
}
let puts=0;const legacy={...caps};delete legacy.campaignDepth;const client=new CloudClient('https://test.invalid',d,async(_,o)=>{if(o.method==='PUT')puts++;return Response.json(legacy);});for(const states of samples)for(const state of states)await assert.rejects(()=>client.upload(1,1,state,'旧服务'),/0.59.0/);assert.equal(puts,0);
console.log('Campaign depth cloud PASS: 15 in-flight/finished encounter pairs roundtrip; challenges/task/clear downgrade rejected without write; old Worker blocked before PUT; no migration.');
}finally{db.close();}
