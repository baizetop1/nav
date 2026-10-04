import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {d,fixture,act,win} from './shuihu-campaign-fixtures.mjs';
import {attributes} from '../public/game/js/hero.js';
import {applySets} from '../public/game/js/equipment-sets.js';
import {FORGE_EQUIPMENT,FORGE_RECIPES,forgeCatalog} from '../public/game/js/forge-catalog.js';
import {RECIPES} from '../public/game/js/provisions.js';
import {specialDropTable} from '../public/game/js/special-dungeons-data.js';
import {exportSave,importSave} from '../public/game/js/portable.js';
import {CloudClient} from '../public/game/js/cloud.js';
const copy=structuredClone,base=fixture(190,30);base.player.silver=100000;
for(const id of ['iron','cloth','wood','skill_page','tempered_steel','woven_linen','cured_hide'])base.inventory[id]=100;
let s=copy(base);
const reject=(s,type,args,re)=>{const b=copy(s);assert.throws(()=>act(s,type,args),re);assert.deepEqual(s,b);};
for(const id of FORGE_RECIPES){
 reject(s,'provisionCraft',{id},/配方/);s=act(s,'provisionUnlock',{id});const before=copy(s),r=RECIPES[id];s=act(s,'provisionCraft',{id});assert.equal(s.inventory[id],(before.inventory[id]||0)+1);assert.equal(before.player.silver-s.player.silver,r.silver);for(const [raw,n] of Object.entries(r.items))assert.equal(before.inventory[raw]-s.inventory[raw],n);
 const full=copy(s);full.inventory[id]=10000000;reject(full,'provisionCraft',{id},/上限/);
 const limited=copy(s);limited.daily.counters['craft_'+id]=r.limit;reject(limited,'provisionCraft',{id},/次数/);
}
const learned=copy(s);s.inventory.dark_iron=30;s.inventory.blueprint=6;
for(const id of FORGE_EQUIPMENT){
 reject(s,'buyEquip',{id},/只能/);const low=copy(s);low.camp.buildings.hall=2;reject(low,'craftEquip',{id},/聚义厅/);
 const empty=copy(s);empty.inventory.blueprint=0;reject(empty,'craftEquip',{id},/材料/);
 const before=copy(s),e=d.by.equipments[id];s=act(s,'craftEquip',{id});assert.equal(before.player.silver-s.player.silver,240);for(const [raw,n] of Object.entries(e.recipe.items))assert.equal(before.inventory[raw]-s.inventory[raw],n);assert.equal(s.equipment.at(-1).item,id);
}
const craftState=copy(s),dress=ids=>{let r=copy(craftState);for(const id of ids)r=act(r,'equip',{id:r.equipment.find(e=>e.item===id).uid,hero:'linchong'});return r;};
const guard=dress(FORGE_EQUIPMENT.slice(0,3)),quick=dress(FORGE_EQUIPMENT.slice(3)),ga=attributes(guard,'linchong',d),qa=attributes(quick,'linchong',d);
assert.ok(ga.hp>qa.hp&&ga.defense>qa.defense);assert.ok(qa.speed>ga.speed&&qa.attack>ga.attack);
for(const [count,expected] of [[1,{hp:100,defense:100}],[2,{hp:100,defense:108}],[3,{hp:110,defense:108}]]){const z=dress(FORGE_EQUIPMENT.slice(0,count)),stats={hp:100,defense:100};applySets(z,'linchong',stats);assert.deepEqual(stats,expected);}
for(const state of [guard,quick]){let b=act(state,'specialStart',{id:'mine',tier:1});const unit=b.battle.team.find(u=>u.id==='linchong');assert.ok(unit);b=win(b);assert.equal(b.specialDungeons.clears.mine_1,1);assert.deepEqual(importSave(exportSave(b,{id:1,name:'打造测试'},d),d).state,b);}
const locked=act(guard,'equipLock',{id:guard.equipment.find(e=>e.item==='bastion_spear').uid,locked:true});reject(locked,'dismantle',{id:locked.equipment.find(e=>e.item==='bastion_spear').uid},/锁定/);
for(const [where,id] of [['mine','dark_iron'],['mine','blueprint'],['ruins','blueprint'],['ruins','skill_page']])assert.ok(specialDropTable(where,1).some(e=>e.id===id&&e.rate>0&&e.rate<1));
const html=forgeCatalog(base,d,(label,a)=>'<button data-command='+JSON.stringify(a)+'>'+label+'</button>',String);assert.match(html,/新式兵甲/);assert.match(html,/ui_recipeSource/);assert.match(html,/ui_specialView/);assert.ok(!html.includes('undefined'));assert.ok(!html.includes('购买 · 0'));
const bundle=await build({entryPoints:[new URL('../cloud/shuihu/worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,format:'esm',platform:'browser',write:false});const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default;
const db=new DatabaseSync(':memory:');try{
 db.exec(fs.readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};
 const admin='F'.repeat(64),env={DB,KEY_PEPPER:'forge-testing-pepper-more-than-thirty-two',ADMIN_KEY:admin};
 const request=(path,method,key,body,rev)=>{db.exec('DELETE FROM rate_limits');return worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);};
 const caps=await(await request('/v1/game-version','GET',admin)).json();assert.equal(caps.forgeExpansion,1);const key=(await(await request('/v1/admin/slots/1/key','POST',admin,{})).json()).key;
 let rev=1;for(const state of [base,learned,guard,quick]){const res=await request('/v1/slots/1','PUT',key,{name:'打造',state},rev);assert.equal(res.status,200,await res.text());rev++;const saved=await(await request('/v1/slots/1','GET',key)).json();assert.deepEqual(saved.state,state);}
 const before=db.prepare('SELECT revision,raw FROM slots WHERE id=1').get();const response=await request('/v1/slots/1','PUT',key,{name:'旧配方',state:base},rev);assert.equal(response.status,409,await response.text());assert.deepEqual(db.prepare('SELECT revision,raw FROM slots WHERE id=1').get(),before);
 let writes=0;const older={...caps};delete older.forgeExpansion;const client=new CloudClient('https://test.invalid',d,async(_,options)=>{if(options.method==='PUT')writes++;return Response.json(older);});
 for(const state of [learned,guard])await assert.rejects(()=>client.upload(1,rev,state,'打造'),/0.55.0/);assert.equal(writes,0);
 console.log('Forge PASS: three recipes and exact costs; six crafted items; rejected free purchase; two/three-piece real stats and combat; capacity/daily limits; file and SQLite roundtrip; old-service gate and learned-recipe preservation.');
}finally{db.close();}
