import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {verifyAutoBattle} from '../cloud/shuihu/verified-battle.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const bundle=await build({entryPoints:[fileURLToPath(new URL('../cloud/shuihu/worker.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',write:false});
const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default;
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));for(let i=0;i<2;i++)db.exec(readFileSync(new URL('../cloud/shuihu/migrations/0002_verified_ranking.sql',import.meta.url),'utf8'));assert.equal(db.prepare('SELECT count(*) AS n FROM slots').get().n,20);
let race=false;
const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){if(race&&sql.startsWith('INSERT INTO verified_scores')){race=false;db.prepare('UPDATE slots SET revision=revision+1 WHERE id=7').run();}return db.prepare(sql).run(...args);}};}};
const admin='A'.repeat(64),env={DB,KEY_PEPPER:'test-only-pepper-32-characters-long',ADMIN_KEY:admin,ALLOWED_ORIGINS:'https://baizeone.top'};
let now=Date.parse('2026-09-03T12:00:00+08:00'),ip=0;Date.now=()=>now;
async function req(path,method='GET',key,body,revision){const headers={Origin:'https://baizeone.top','CF-Connecting-IP':'192.0.2.'+(++ip)};if(key)headers.Authorization='Bearer '+key;if(body)headers['Content-Type']='application/json';if(revision!==undefined)headers['If-Match']='"'+revision+'"';const r=await worker.fetch(new Request('https://save.example.com'+path,{method,headers,body:body?JSON.stringify(body):undefined}),env);return {status:r.status,body:await r.json()};}
const key=(await req('/v1/admin/slots/7/key','POST',admin)).body.key;
const s=newGame(d,now,333);s.camp=freshCamp();s.camp.buildings={hall:5,farm:5,lumber:5,barracks:5,clinic:5,market:5};s.camp.troops=100;s.camp.deployment=100;s.camp.food=10000;s.camp.tactic='guard';s.team=['guansheng','huarong','gongsunsheng'];for(const id of s.team)s.heroes[id]={status:'owned',level:30,exp:0,quality:2};
const fakeRecord={tier:5,hp:1000,elapsed:0,score:5100180};s.campaign={version:1,daily:{date:'2026-09-03',uses:{}},weekly:{'2026-09-1':fakeRecord}};
assert.equal((await req('/v1/slots/7','PUT',key,{name:'演武测试',state:s},1)).status,200);
assert.deepEqual((await req('/v1/verified-leaderboard')).body.entries,[],'Uploaded fabricated scores cannot enter verified board');
assert.equal((await req('/v1/slots/7/verify','POST',undefined,{tier:1},2)).status,401);
assert.equal((await req('/v1/slots/7/verify','POST',key,{tier:1},1)).status,412);
assert.equal((await req('/v1/slots/7/verify','POST',key,{tier:5},2)).status,400);
now+=61000;
const cloudBefore=(await req('/v1/slots/7','GET',key)).body;
for(const day of [3,10,17,24]){
 now=Date.parse('2026-09-'+day.toString().padStart(2,'0')+'T12:00:00+08:00');
 assert.deepEqual((await req('/v1/verified-leaderboard')).body.entries,[],'New period starts empty');
 for(let tier=1;tier<=5;tier++){const r=await req('/v1/slots/7/verify','POST',key,{tier,score:999999999,hp:1000,elapsed:0},2);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.outcome,'victory','Day '+day+' tier '+tier);assert.ok(r.body.elapsed>0);assert.ok(r.body.score<999999999);assert.equal(r.body.best.tier,tier);}
 const ranking=(await req('/v1/verified-leaderboard')).body;assert.equal(ranking.verified,true);assert.equal(ranking.entries.length,1);assert.equal(ranking.entries[0].tier,5);assert.equal(ranking.entries[0].rank,1);assert.ok(!JSON.stringify(ranking).includes(key));
}
assert.deepEqual((await req('/v1/slots/7','GET',key)).body,cloudBefore,'Exhibitions never spend or rewrite save resources');
now+=61000;const best=(await req('/v1/verified-leaderboard')).body;const repeat=await req('/v1/slots/7/verify','POST',key,{tier:1},2);assert.equal(repeat.status,200);assert.deepEqual((await req('/v1/verified-leaderboard')).body,best,'Lower repeats cannot replace best or grant rewards');
// Rebuild ignores RNG, saved battle mode, forged week record and client clock.
const source=JSON.stringify(s),a=verifyAutoBattle(d,source,1,null,now,7788),forged=structuredClone(s);forged.rng=4444;forged.clock+=864000000;forged.daily.date='2099-01-01';forged.battleSkillMode='manual';assert.deepEqual(verifyAutoBattle(d,JSON.stringify(forged),1,null,now,7788),a);
now+=61000;race=true;const lost=await req('/v1/slots/7/verify','POST',key,{tier:1},2);assert.equal(lost.status,412);assert.deepEqual((await req('/v1/verified-leaderboard')).body,best);
assert.equal(db.prepare('SELECT count(*) AS n FROM verified_scores').get().n,4);
console.log('Verified ranking: real Worker/D1 migration, auth/CAS, fabricated scores ignored, all 20 weekly layers independently simulated, server calendar/seed, public anonymous ranking, no save spending/rewards, best-only duplicates and concurrent update protection passed.');
