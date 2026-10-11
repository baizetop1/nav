import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';
import {companionRun,d,act} from './shuihu-mine-companion-selfcheck.mjs';import {CloudClient} from '../public/game/js/cloud.js';import {gameSnapshot} from '../public/game/js/portable.js';
const states=companionRun();
const bundle=await build({entryPoints:[fileURLToPath(new URL('../cloud/shuihu/worker.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',write:false}),worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}},admin='A'.repeat(64),env={DB,KEY_PEPPER:'mine-companion-local-test-pepper-at-least-thirty-two-characters',ADMIN_KEY:admin};
 const req=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await req('/v1/game-version','GET',admin)).json();assert.equal(caps.mineCompanion,1);assert.equal(caps.release,d.config.release);
 const key=(await(await req('/v1/admin/slots/1/key','POST',admin,{})).json()).key;let rev=1;
 for(const state of Object.values(states)){const res=await req('/v1/slots/1','PUT',key,{name:'矿洞两位故人',state},rev++);assert.equal(res.status,200,await res.text());assert.deepEqual((await(await req('/v1/slots/1','GET',key)).json()).state,gameSnapshot(state,d));}
 const before=db.prepare('SELECT raw,revision FROM slots WHERE id=1').get();
 for(const state of [states.before,states.braced]){const res=await req('/v1/slots/1','PUT',key,{name:'旧页面进度',state},rev);assert.equal(res.status,409,await res.text());assert.deepEqual(db.prepare('SELECT raw,revision FROM slots WHERE id=1').get(),before);}
 const key2=(await(await req('/v1/admin/slots/2/key','POST',admin,{})).json()).key;
 for(const mutate of [s=>s.exploration.flags=s.exploration.flags.filter(k=>k!=='liyun_hoops'),s=>s.exploration.flags.push('liyun_invited'),s=>delete s.exploration.pending.approach,s=>s.exploration.pending.node='chamber']){const state=structuredClone(states.pending);mutate(state);const res=await req('/v1/slots/2','PUT',key2,{name:'无效委托',state},1);assert.equal(res.status,400,await res.text());}
 let puts=0;const legacy={...caps};delete legacy.mineCompanion;const client=new CloudClient('https://test.invalid',d,async(_,o)=>{if(o.method==='PUT')puts++;return Response.json(legacy);});
 const tracked=act(states.before,'goalSet',{kind:'invite',id:'liyun'});for(const state of [...Object.values(states).slice(1),tracked])await assert.rejects(()=>client.upload(1,1,state,'旧服务'),/李云矿洞委托/);assert.equal(puts,0);
 await client.upload(1,1,states.before,'尚未见李云');assert.equal(puts,1,'existing mine saves still work with earlier compatible Workers');
 console.log('Mine companion cloud PASS: all stages and pending battle roundtrip, once-only progress cannot roll back, malformed states rejected, old Worker blocked before PUT for quests and target-only saves, existing database schema.');
}finally{db.close();}
