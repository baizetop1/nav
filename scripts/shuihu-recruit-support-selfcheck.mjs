import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {recruit} from '../public/game/js/hero.js';
import {weighted,pick,random} from '../public/game/js/utils.js';
import {canonicalHeroes,ordinaryHeroes,isWanderer} from '../public/game/js/roster.js';
import {supportState,supportWeek,recruitWeek,recruitOffers,SELECT_COST} from '../public/game/js/recruit-support.js';
import {recruitSupportPanel,supportReceipt} from '../public/game/js/recruit-support-ui.js';
import {freshCamp} from '../public/game/js/camp.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {CloudClient} from '../public/game/js/cloud.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))]))),now=Date.parse('2026-09-13T04:00:00Z');
const base=()=>{const s=newGame(d,now,81);s.inventory.recruit_order=1000;for(const h of d.heroes.filter(isWanderer))s.heroes[h.id].status='owned';return s;};
const act=(s,type,a={},time=s.clock)=>{const n=dispatch(d,s,{type,...a},time);assert.deepEqual(gameSnapshot(n,d),n);return n;};
const draw=s=>act(s,'recruit');
assert.deepEqual(d.config.balance.ordinaryRates,[{star:5,weight:1},{star:4,weight:6},{star:3,weight:23},{star:2,weight:45},{star:1,weight:25}]);
// Reference uses the original random calls and pity thresholds; safeguards must not consume RNG.
for(const seed of [1,17,81,345,98765]){
 const s=base();s.rng=seed;const ref={rng:s.rng,pity:{three:0,four:0,five:0}};
 for(let i=0;i<300;i++){
  let star=weighted(ref,d.config.balance.ordinaryRates).star;const p=ref.pity;if(p.five>=99)star=5;else if(p.four>=49)star=Math.max(star,4);else if(p.three>=19)star=Math.max(star,3);p.three=star>=3?0:p.three+1;p.four=star>=4?0:p.four+1;p.five=star===5?0:p.five+1;
  const h=pick(ref,ordinaryHeroes(d).filter(h=>h.star===star));recruit(s,d);assert.equal(s.recruit.lastResult.hero,h.id);assert.equal(s.rng,ref.rng);assert.deepEqual(s.recruit.pity,ref.pity);
 }
 assert.equal(supportState(s).tickets,30);assert.equal(supportState(s).points,300);assert.equal(supportState(s).dry,0);
}
let s=base(),old=structuredClone(s);for(let i=0;i<9;i++)s=draw(s);assert.equal(supportState(s).tickets,0);assert.equal(supportState(s).dry,9);const beforeTen=s;s=draw(s);assert.equal(supportState(s).tickets,1);assert.equal(supportState(s).points,10);assert.match(supportReceipt(beforeTen,s),/迎贤荐书 \+1/);
let single=old;for(let i=0;i<10;i++)single=draw(single);const ten=act(old,'recruitTen');for(const key of ['heroes','inventory','rng'])assert.deepEqual(ten[key],single[key]);assert.deepEqual(ten.recruit.pity,single.recruit.pity);assert.deepEqual(ten.recruit.support,single.recruit.support);assert.deepEqual(importSave(exportSave(ten,{id:1,name:'十连保障'},d),d).state,ten);
// Preserve old saves without fabricating historic misses or points.
old.recruit.total=500;assert.equal(gameSnapshot(old,d).recruit.support,undefined);const upgraded=draw(old);assert.equal(supportState(upgraded).dry,1);assert.equal(supportState(upgraded).points,1);
const low=canonicalHeroes(d).find(h=>h.star<=3),welcome=act(s,'recruitWelcome',{id:low.id});assert.equal(welcome.heroes[low.id].status,'owned');assert.equal(welcome.recruit.support.tickets,0);assert.equal(welcome.rng,s.rng);assert.equal(welcome.recruit.total,s.recruit.total);assert.deepEqual(welcome.recruit.pity,s.recruit.pity);assert.throws(()=>act(welcome,'recruitWelcome',{id:low.id}),/尚未入寨/);
const five=canonicalHeroes(d).find(h=>h.star===5);assert.throws(()=>act(s,'recruitWelcome',{id:five.id}),/一至三星/);assert.throws(()=>act(s,'recruitSelect',{id:five.id}),/先与/);
// All five price tiers are exact and cannot consume points on rejected invitations.
for(let star=1;star<=5;star++){let v=base();for(let i=0;i<60;i++)recruit(v,d);const h=canonicalHeroes(d).find(h=>h.star===star);v.heroes[h.id].status='known';const n=act(v,'recruitSelect',{id:h.id});assert.equal(n.recruit.support.points,60-SELECT_COST[star]);assert.equal(n.heroes[h.id].status,'owned');assert.equal(n.rng,v.rng);assert.throws(()=>act(n,'recruitSelect',{id:h.id}),/尚未入寨/);}
let poor=structuredClone(s);poor.heroes[five.id].status='known';const raw=JSON.stringify(poor);assert.throws(()=>act(poor,'recruitSelect',{id:five.id}),/积分不足/);assert.equal(JSON.stringify(poor),raw);
// A normal joined result clears the dry streak; an exclusive draw never changes it.
let joined=structuredClone(beforeTen);for(const h of canonicalHeroes(d))joined.heroes[h.id].status='known';joined=draw(joined);assert.equal(joined.recruit.support.dry,0);assert.equal(joined.recruit.support.tickets,0);assert.equal(joined.recruit.support.points,9);
let exclusive=structuredClone(beforeTen);exclusive.heroes.wusong.status='known';exclusive.inventory.wusong_order=100;let misses=0,ref={rng:exclusive.rng};for(let i=0;i<25;i++){const n=random(ref),target='wusong';let h;if(misses>=4||n<.25)h=d.by.heroes[target];else if(n<.30)h=pick(ref,canonicalHeroes(d).filter(h=>h.star===5&&h.id!==target));else h=pick(ref,canonicalHeroes(d).filter(h=>h.star<5&&h.id!==target));misses=h.id===target?0:misses+1;exclusive=act(exclusive,'recruit',{id:target});assert.equal(exclusive.recruit.lastResult.hero,h.id);assert.equal(exclusive.rng,ref.rng);assert.equal(exclusive.recruit.fate[target],misses);assert.equal(exclusive.recruit.support.dry,9);assert.equal(exclusive.recruit.support.tickets,0);}
let complete=structuredClone(s);for(const h of canonicalHeroes(d).filter(h=>h.star<=3))complete.heroes[h.id].status='owned';complete=act(complete,'recruitWelcomeConvert');assert.equal(complete.recruit.support.points,20);assert.equal(complete.recruit.support.tickets,0);assert.throws(()=>act(complete,'recruitWelcomeConvert'),/尚无/);assert.throws(()=>act(s,'recruitWelcomeConvert'),/仍有/);
// Weekly progress counts real work and victories, not clicks on previews or losses.
let week=base();week.camp=freshCamp();week.camp.mode='solo';week.camp.food=10000;week.camp.buildings.hall=3;week.camp.buildings.farm=1;week.team=['linchong'];week.heroes.linchong={status:'owned',level:30,exp:0};week.battleSkillMode='auto';
for(let i=0;i<3;i++)week=act(week,'campWork');assert.equal(supportWeek(week).work,3);
week=act(act(act(week,'campRaid',{id:'woods'}),'battleRetreat'),'finishBattle');assert.equal(supportWeek(week).wins,0);
for(let i=0;i<5;i++){week=act(week,'campRaid',{id:'woods'});for(let t=0;t<180&&!week.battle.outcome;t++)advanceBattle(week,d,1000);assert.equal(week.battle.outcome,'victory');week=act(week,'finishBattle');}assert.equal(recruitOffers(week,d)[0].reason,'');
let claimed=act(week,'recruitSupply',{id:'week'});assert.equal(claimed.inventory.recruit_order,week.inventory.recruit_order+2);assert.throws(()=>act(claimed,'recruitSupply',{id:'week'}),/已领取/);
assert.equal(recruitWeek(Date.parse('2026-09-13T15:59:59Z')),'2026-09-07');assert.equal(recruitWeek(Date.parse('2026-09-13T16:00:00Z')),'2026-09-14');let next=act(claimed,'refresh',{},Date.parse('2026-09-13T16:00:00Z'));assert.equal(supportWeek(next).work,0);assert.equal(supportWeek(next).wins,0);assert.throws(()=>act(next,'recruitSupply',{id:'week'}),/本周/);next=act(next,'campWork');assert.equal(supportWeek(next).work,1);assert.equal(supportWeek(next).claimed,false);
// Old completed chapters/dungeons receive the new finite bonus once, with persistent claims.
let done=base();for(const c of d.chapters)done.progress.flags[c.completeFlag]=true;for(const x of d.dungeons)done.progress.clears[x.id]=1;const orders=done.inventory.recruit_order;for(const q of recruitOffers(done,d).filter(q=>q.id!=='week')){assert.equal(q.reason,'');done=act(done,'recruitSupply',{id:q.id});assert.throws(()=>act(done,'recruitSupply',{id:q.id}),/已领取/);}assert.equal(done.inventory.recruit_order-orders,d.chapters.length*2+d.dungeons.length);assert.deepEqual(importSave(exportSave(done,{id:1,name:'补给'},d),d).state,done);
assert.throws(()=>act(base(),'recruitSupply',{id:'first_missing'}));assert.throws(()=>act(base(),'recruitSupply',{id:'chapter_volume_one'}),/完成本卷/);
for(const mutate of [v=>v.recruit.support.dry=10,v=>v.recruit.support.points=-1,v=>v.recruit.support.tickets=999,v=>v.recruit.support.claims=['first_missing'],v=>v.recruit.support.week={period:'2026-09-15',work:3,wins:5,claimed:true}]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>gameSnapshot(bad,d),/招贤/);}
assert.match(recruitSupportPanel(s,d,String,()=>''),/抽取概率不变/);
// Actual Worker with isolated SQLite: cloud roundtrip, missing-capability preflight, downgrade guard.
const {build}=await import('esbuild'),{DatabaseSync}=await import('node:sqlite'),{fileURLToPath}=await import('node:url');const bundle=await build({entryPoints:[fileURLToPath(new URL('../cloud/shuihu/worker.js',import.meta.url))],bundle:true,format:'esm',platform:'browser',write:false});const worker=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default,db=new DatabaseSync(':memory:');
try{db.exec(readFileSync(new URL('../cloud/shuihu/schema.sql',import.meta.url),'utf8'));const DB={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}},admin='A'.repeat(64),env={DB,KEY_PEPPER:'recruit-test-only-32-character-pepper',ADMIN_KEY:admin},req=(path,method='GET',key=admin,body,rev)=>worker.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',...(rev===undefined?{}:{'If-Match':'"'+rev+'"'})},body:body===undefined?undefined:JSON.stringify(body)}),env);
 const caps=await (await req('/v1/game-version')).json();assert.equal(caps.recruitSupport,1);let key,slot=0;const rev=2;
 for(const state of [ten,welcome,claimed,done]){slot++;key=(await (await req('/v1/admin/slots/'+slot+'/key','POST',admin,{})).json()).key;const up=await req('/v1/slots/'+slot,'PUT',key,{name:'招贤保障',state},1);assert.equal(up.status,200,await up.text());assert.deepEqual((await (await req('/v1/slots/'+slot,'GET',key)).json()).state,state);}
 const stripped=structuredClone(done);delete stripped.recruit.support;assert.equal((await req('/v1/slots/'+slot,'PUT',key,{name:'旧页面',state:stripped},rev)).status,409);assert.deepEqual((await (await req('/v1/slots/'+slot,'GET',key)).json()).state,done);
 delete caps.recruitSupport;const calls=[],client=new CloudClient('https://test.invalid',d,async(url,options)=>{calls.push(options.method);return Response.json(caps);});await assert.rejects(()=>client.upload(1,rev,done,'新进度'),/0.30.0/);assert.deepEqual(calls,['GET']);
}finally{db.close();}
console.log('Recruit support PASS: 1500 expanded-pool ordinary rolls with original tier odds, 25 exact exclusive rolls, RNG and pity preserved, single/ten equivalence, welcome/reset/conversion, five point prices, atomic rejections, real weekly work/wins and Monday reset, finite legacy chapter/dungeon bonuses, portable validation, Worker roundtrip and downgrade/preflight guards.');
