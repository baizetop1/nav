import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';
import {SPECIAL_DUNGEONS,specialDropTable} from '../public/game/js/special-dungeons-data.js';
const copy=structuredClone;
const base=()=>{const s=fixture(192,40);s.camp.buildings.hall=3;return s;};
const empty=()=>({version:1,clears:{},last:null});
const makeStart=(id='mine',tier=1)=>{
 const s=base();s.specialDungeons=empty();
 if(tier>1){for(let n=1;n<tier;n++)s.specialDungeons.clears[id+'_'+n]=1;s.specialDungeons.last={id,tier:tier-1,outcome:'victory',at:s.clock,drops:[]};}
 return act(s,'specialStart',{id,tier});
};
const invalid=(source,change)=>{const s=copy(source);change(s);assert.throws(()=>validateSave(s,d),/存档校验失败/);return s;};
const legacy=base();assert.equal(gameSnapshot(legacy,d).specialDungeons,undefined);
const starts=[];for(const id of Object.keys(SPECIAL_DUNGEONS).filter(id=>!SPECIAL_DUNGEONS[id].parent))for(const tier of [1,2,3]){
 const s=makeStart(id,tier);assert.equal(s.battle.context.type,'special');assert.equal(s.battle.expedition.troops,0);assert.deepEqual(gameSnapshot(s,d),s);
 assert.deepEqual(importSave(exportSave(s,{id:1,name:'特殊副本',cloud:null},d),d).state,s);starts.push(s);
}
const battle=starts[0],settling=copy(battle);for(let i=0;i<180&&!settling.battle.outcome;i++)advanceBattle(settling,d,1000);assert.equal(settling.battle.outcome,'victory');const settled=act(settling,'finishBattle');
assert.equal(settled.battle,null);assert.equal(settled.specialDungeons.clears.mine_1,1);assert.equal(settled.lastBattle.context.type,'special');assert.deepEqual(gameSnapshot(settled,d),settled);
let ordinary=act(settled,'campRaid',{id:'woods'});for(let i=0;i<180&&!ordinary.battle.outcome;i++)advanceBattle(ordinary,d,1000);assert.equal(ordinary.battle.outcome,'victory');ordinary=act(ordinary,'finishBattle');assert.equal(ordinary.lastBattle.context.type,'camp');assert.deepEqual(ordinary.specialDungeons,settled.specialDungeons);assert.deepEqual(gameSnapshot(ordinary,d),ordinary);
const receipt=copy(settled),first=specialDropTable('mine',1)[0];receipt.specialDungeons.last.drops=[{kind:first.kind,id:first.id,count:first.min,stored:first.min}];assert.deepEqual(gameSnapshot(receipt,d),receipt);
const malformed=[
 invalid(battle,s=>delete s.specialDungeons),invalid(battle,s=>s.specialDungeons.extra=true),invalid(battle,s=>s.specialDungeons.clears.wrong_1=1),invalid(battle,s=>s.specialDungeons.clears.mine_1=-1),invalid(battle,s=>s.specialDungeons.clears.mine_2=1),
 invalid(battle,s=>s.battle.context.terrain='water'),invalid(battle,s=>s.battle.context.tier=4),invalid(battle,s=>s.battle.context.extra=true),invalid(battle,s=>s.battle.expedition.troops=1),invalid(battle,s=>s.battle.guest=true),
 invalid(receipt,s=>s.specialDungeons.last.drops[0].id='recruit_order'),invalid(receipt,s=>s.specialDungeons.last.drops[0].count=first.max+1),invalid(receipt,s=>s.specialDungeons.last.drops[0].stored=first.min+1),invalid(receipt,s=>s.specialDungeons.last.drops[0].extra=true),invalid(receipt,s=>s.specialDungeons.last.drops.push(copy(s.specialDungeons.last.drops[0]))),
 invalid(receipt,s=>s.specialDungeons.last.outcome='defeat'),invalid(receipt,s=>s.specialDungeons.last.at=s.clock+1),invalid(receipt,s=>s.lastBattle.context.id='ruins'),invalid(receipt,s=>s.lastBattle.troops=1),invalid(receipt,s=>s.specialDungeons.last=null)
];
const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default;
const db=new DatabaseSync(':memory:');
try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};
 const admin='C'.repeat(64),env={DB,KEY_PEPPER:'special-tests-pepper-longer-than-32-characters',ADMIN_KEY:admin};
 const request=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await request('/v1/game-version','GET',admin)).json();assert.equal(caps.specialDungeons,1);
 let slot,key,rev;const openSlot=async id=>{slot=id;key=(await(await request('/v1/admin/slots/'+slot+'/key','POST',admin,{})).json()).key;rev=1;};await openSlot(1);
 const upload=state=>request('/v1/slots/'+slot,'PUT',key,{name:'特殊副本',state},rev);
 const roundtrip=async state=>{const res=await upload(state);assert.equal(res.status,200,await res.text());rev++;const res2=await request('/v1/slots/'+slot,'GET',key);assert.equal(res2.status,200);assert.deepEqual((await res2.json()).state,state);};
 const rejectStable=async(state,status)=>{const before=db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),res=await upload(state);assert.equal(res.status,status,await res.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=?').get(slot),before);};
 await roundtrip(legacy);for(const bad of malformed)await rejectStable(bad,400);
 await roundtrip(battle);await roundtrip(settling);await roundtrip(settled);await roundtrip(receipt);
 for(const change of [s=>delete s.specialDungeons,s=>delete s.specialDungeons.clears.mine_1,s=>s.specialDungeons.clears.mine_1=0]){const bad=copy(settled);change(bad);await rejectStable(bad,409);}
 const failed=copy(settled);failed.specialDungeons.last={id:'mine',tier:1,outcome:'defeat',at:failed.clock,drops:[]};failed.lastBattle.outcome='defeat';await roundtrip(failed);
 const retreat=copy(failed);retreat.specialDungeons.last.outcome='retreat';retreat.lastBattle.outcome='retreat';await roundtrip(retreat);
 await roundtrip(settled);const again=act(settled,'specialStart',{id:'mine',tier:1});await roundtrip(again);
 for(const [i,s] of starts.slice(1).entries()){await openSlot(i+2);await roundtrip(s);}
 await openSlot(10);await roundtrip(settled);await roundtrip(ordinary);
 let writes=0;const older={...caps};delete older.specialDungeons;
 const client=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json(older);});
 const onlyBattle=copy(battle);delete onlyBattle.specialDungeons;const onlyReport=copy(settled);delete onlyReport.specialDungeons;
 for(const s of [battle,settled,onlyBattle,onlyReport])await assert.rejects(()=>client.upload(1,rev,s,'特殊副本'),/0.50.0/);
 await assert.doesNotReject(()=>client.cooperate(1,rev));assert.equal(writes,0);
 console.log('Special dungeon cloud PASS: 9 live battle/file/SQLite roundtrips, real victory settlement, strict contexts and drop-table validation, unchanged cloud data on rejected writes, monotonic clears, replaceable receipts, old-service preflight; no database migration.');
}finally{db.close();}
