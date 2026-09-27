import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {freshCamp} from '../public/game/js/camp.js';
import {RESOURCE_ROUTES,resourceReward} from '../public/game/js/resource-dungeons-data.js';
import {DAILY_ROUTES,ALL_DAILY_ROUTES,rotationPlan,rotationCalendar,dailyUses,finishRotation,validRotationContext} from '../public/game/js/rotations.js';
import {sweepQuote,mastery} from '../public/game/js/sweep.js';
import {STOCK_CAP} from '../public/game/js/production.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const at=day=>Date.parse(day+'T12:00:00+08:00'),act=(s,type,a={},now=s.clock)=>dispatch(d,s,{type,...a},now),start=(s,id,tier=1)=>act(s,'rotationStart',{kind:'daily',id,tier});
function fixture(day='2026-09-07'){
 const s=newGame(d,at(day),456789);s.camp=freshCamp();s.camp.buildings={hall:4,farm:2,lumber:2,barracks:4,clinic:2,market:2};s.camp.mode='army';s.camp.deployment=137;s.camp.tactic='assault';s.camp.food=0;s.player.silver=10000;s.battleSkillMode='auto';s.team=['wusong','linchong','wuyong'];
 for(const id of s.team){s.heroes[id]={status:'owned',level:40,exp:0,quality:2};for(const skill of d.by.heroes[id].skills){const flag=d.by.skills[skill].training?.flag;if(flag)s.progress.flags[flag]=true;}}
 return s;
}
function complete(s,outcome='victory'){
 for(let tick=0;tick<181&&!s.battle.outcome;tick++)advanceBattle(s,d,1000);
 assert.equal(s.battle.outcome,outcome,s.battle.context.id+' tier '+s.battle.context.tier);return act(s,'finishBattle');
}
const stock=(s,key)=>key==='silver'?s.player.silver:key==='herb'?(s.inventory.herb||0):s.camp[key];
const setStock=(s,key,n)=>{if(key==='silver')s.player.silver=n;else if(key==='herb')s.inventory.herb=n;else s.camp[key]=n;};
const stocks=s=>({silver:s.player.silver,food:s.camp.food,wood:s.camp.wood,herb:s.inventory.herb||0});
const expected={silver:[300,700,1400],grain:[60,140,280],timber:[40,95,190],herbs:[6,14,28]};
assert.deepEqual(DAILY_ROUTES.map(r=>r.id),['ore','manual','stable']);assert.equal(ALL_DAILY_ROUTES.length,7);assert.deepEqual(RESOURCE_ROUTES.map(r=>r.id),Object.keys(expected));
for(const bad of [['ore',1],['unknown',1],['silver',0],['silver',4],['silver',1.5],['silver','1']])assert.equal(resourceReward(...bad),null);
for(const r of RESOURCE_ROUTES)for(let tier=1;tier<=3;tier++){
 const s=fixture(),before=JSON.stringify(s),p=rotationPlan(s,'daily',r.id,tier),reward=resourceReward(r.id,tier),amount=expected[r.id][tier-1];
 assert.equal(JSON.stringify(s),before,'Planning is pure');assert.equal(p.reason,'');assert.equal(p.resource,true);assert.equal(p.stamina,10);assert.equal(p.food,0);assert.equal(p.troops,0);assert.equal(p.level,(tier-1)*10+1);assert.equal(p.hall,tier);
 assert.deepEqual(reward,r.resourceKey==='herb'?{items:{herb:amount}}:{[r.resourceKey]:amount});
 let n=start(s,r.id,tier);assert.equal(n.player.stamina,90);assert.equal(dailyUses(n,r.id),1);assert.equal(n.battle.expedition.troops,0);assert.ok(n.battle.team.every(u=>!u.corps||u.corps.troops===0));assert.equal(n.camp.food,0);assert.equal(n.camp.mode,'army');assert.equal(n.camp.deployment,137);assert.deepEqual(gameSnapshot(n,d),n);assert.deepEqual(importSave(exportSave(n,{id:1,name:'资源交战'},d),d).state,n);
 n=complete(n);const wanted=stocks(s);wanted[r.resourceKey]+=amount;assert.deepEqual(stocks(n),wanted,r.id+' pays its fixed tier reward');assert.equal(n.camp.troops,0);assert.equal(n.camp.wounded,0);assert.equal(n.camp.fallen||0,0);assert.equal(n.camp.mode,s.camp.mode);assert.equal(n.camp.deployment,s.camp.deployment);assert.deepEqual(n.heroes,s.heroes,'No fixed experience reward');
 const inventory={...s.inventory};if(r.resourceKey==='herb')inventory.herb=(inventory.herb||0)+amount;assert.deepEqual(n.inventory,inventory,'No recruitment or extra materials');assert.deepEqual(gameSnapshot(n,d),n);assert.deepEqual(importSave(exportSave(n,{id:1,name:'资源奖励'},d),d).state,n);const settled=JSON.stringify(n);assert.throws(()=>act(n,'finishBattle'));assert.equal(JSON.stringify(n),settled,'Settlement cannot repeat');
}
// A newly owned level-one guide can recover basic resources with no food or soldiers.
for(const r of RESOURCE_ROUTES){let s=newGame(d,at('2026-09-07'),456789);s.camp=freshCamp();s.camp.food=0;s.team=['baisheng'];s.heroes.baisheng={status:'owned',level:1,exp:0};s.battleSkillMode='auto';const before=stock(s,r.resourceKey);s=complete(start(s,r.id));assert.equal(stock(s,r.resourceKey),before+expected[r.id][0]);assert.equal(s.camp.mode,'army');}
// Resources open every day; a shared quota belongs to each route, not each tier.
for(let day=7;day<=13;day++)for(const r of RESOURCE_ROUTES)assert.equal(rotationPlan(fixture('2026-09-'+day.toString().padStart(2,'0')),'daily',r.id).reason,'');
for(const r of RESOURCE_ROUTES){let s=fixture(),before=stocks(s);for(let tier=1;tier<=3;tier++)s=act(act(start(s,r.id,tier),'battleRetreat'),'finishBattle');assert.deepEqual(stocks(s),before);assert.equal(s.player.stamina,70);assert.equal(dailyUses(s,r.id),3);assert.throws(()=>start(s,r.id),/3 次/);assert.equal(rotationPlan(s,'daily',RESOURCE_ROUTES.find(x=>x.id!==r.id).id).reason,'');}
let weak=fixture();weak.team=['shiqian'];weak.heroes.shiqian={status:'owned',level:21,exp:0};const weakStock=stocks(weak);weak=complete(start(weak,'herbs',3),'defeat');assert.deepEqual(stocks(weak),weakStock);assert.equal(dailyUses(weak,'herbs'),1);assert.equal(mastery(weak,'herbs',3),0);
// Existing soldiers are untouched, even when the saved army configuration is active.
let army=fixture();army.camp.troops=80;army.camp.wounded=7;const originalCamp={...army.camp};army=complete(start(army,'silver'));for(const key of ['troops','wounded','mode','deployment','tactic','food'])assert.equal(army.camp[key],originalCamp[key]);assert.equal(army.camp.fallen||0,0);
for(const [change,reason] of [[s=>delete s.camp,/建立寨子/],[s=>s.team=[],/出阵好汉/],[s=>s.camp.buildings.hall=1,/聚义厅 3/],[s=>s.team.forEach(id=>s.heroes[id].level=20),/21 级/],[s=>s.player.stamina=9,/体力不足/]]){const s=fixture();change(s);const raw=JSON.stringify(s);assert.throws(()=>start(s,'grain',3),reason);assert.equal(JSON.stringify(s),raw);}
// Reject overflow before charging, while accepting an exact fit for every resource.
for(const r of RESOURCE_ROUTES)for(let tier=1;tier<=3;tier++){
 const amount=expected[r.id][tier-1],s=fixture();setStock(s,r.resourceKey,STOCK_CAP-amount+1);const before=JSON.stringify(s);assert.throws(()=>start(s,r.id,tier),/库存/);assert.equal(JSON.stringify(s),before);assert.equal(s.campaign,undefined);
 setStock(s,r.resourceKey,STOCK_CAP-amount);const n=complete(start(s,r.id,tier));assert.equal(stock(n,r.resourceKey),STOCK_CAP);assert.deepEqual(gameSnapshot(n,d),n);
}
// UTC+8 midnight keeps an in-flight battle's paid attempt on its entry date.
let cross=fixture();cross.clock=Date.parse('2026-09-07T23:59:59+08:00');cross.lastRegen=cross.clock;cross=start(cross,'grain');cross=act(cross,'refresh',{},Date.parse('2026-09-08T00:00:00+08:00'));assert.equal(cross.battle.context.period,'2026-09-07');assert.equal(cross.campaign.daily.date,'2026-09-07');assert.deepEqual(gameSnapshot(cross,d),cross);cross=complete(cross);assert.equal(dailyUses(cross,'grain'),0);assert.equal(cross.camp.food,60);cross=start(cross,'grain');assert.equal(cross.campaign.daily.date,'2026-09-08');assert.equal(dailyUses(cross,'grain'),1);
// Two genuine stable victories unlock only their own difficulty; sweeps rerun combat.
for(const r of RESOURCE_ROUTES){
 let s=fixture();assert.match(sweepQuote(s,d,{id:r.id,tier:1,count:1}).reason,/两次/);s=complete(start(s,r.id));assert.equal(mastery(s,r.id,1),1);s=complete(start(s,r.id));assert.equal(mastery(s,r.id,1),2);assert.equal(mastery(s,r.id,2),0);
 s=act(s,'refresh',{},at('2026-09-08'));s.battleSkillMode='manual';const a={id:r.id,tier:1,count:3},before=JSON.stringify(s),q=sweepQuote(s,d,a);assert.equal(q.reason,'');assert.equal(JSON.stringify(s),before);assert.equal(q.summary.food,0);assert.equal(q.summary.stamina,30);assert.equal(q.summary.fallen,0);assert.equal(q.summary.wounded,0);
 const gains={silver:0,food:0,wood:0};if(r.resourceKey!=='herb')gains[r.resourceKey]=expected[r.id][0]*3;assert.deepEqual(q.summary.resourceGains,gains);assert.deepEqual(q.summary.items,r.resourceKey==='herb'?{herb:18}:{});assert.ok(Object.values(q.summary.experience).every(n=>n===0));assert.deepEqual(JSON.parse(q.signature).summary.resourceGains,gains);
 const n=act(s,'rotationSweep',{...a,expected:q.signature});let sequential=structuredClone(s);sequential.battleSkillMode='auto';for(let i=0;i<3;i++)sequential=complete(start(sequential,r.id));sequential.battleSkillMode='manual';for(const key of ['heroes','inventory','camp','player','campaign','rng','lastBattle','battleSkillMode'])assert.deepEqual(n[key],sequential[key],r.id+' sweep matches three real battles: '+key);assert.deepEqual(gameSnapshot(n,d),n);assert.deepEqual(importSave(exportSave(n,{id:1,name:'资源扫荡'},d),d).state,n);
 const changed=structuredClone(s);setStock(changed,r.resourceKey,stock(changed,r.resourceKey)+1);const raw=JSON.stringify(changed);assert.throws(()=>act(changed,'rotationSweep',{...a,expected:q.signature}),/重新预览/);assert.equal(JSON.stringify(changed),raw);
 const full=structuredClone(s);setStock(full,r.resourceKey,STOCK_CAP-expected[r.id][0]*2);const fullBefore=JSON.stringify(full);assert.match(sweepQuote(full,d,a).reason,/库存/);assert.equal(JSON.stringify(full),fullBefore,'An unaffordable later sweep never partly charges');
}
let bad=fixture();bad.campaign={version:1,daily:{date:rotationCalendar(bad.clock).date,uses:{silver:1}},weekly:{},mastery:{silver_1:2}};assert.deepEqual(gameSnapshot(bad,d),bad);
for(const mutate of [s=>s.campaign.daily.uses.unknown=1,s=>s.campaign.daily.uses.silver=4,s=>s.campaign.mastery.unknown_1=2,s=>s.campaign.mastery.silver_4=2,s=>s.campaign.mastery.silver_1=3]){const s=structuredClone(bad);mutate(s);assert.throws(()=>gameSnapshot(s,d));}
for(const c of [{id:'unknown',tier:1},{id:'silver',tier:4},{id:'silver',tier:1,period:'2026-02-30'}])assert.equal(!!validRotationContext({type:'rotation',kind:'daily',period:'2026-09-07',...c}),false);
bad=start(fixture(),'silver');bad.camp.troops=1;bad.battle.expedition.troops=1;assert.throws(()=>gameSnapshot(bad,d),/资源历练/);
bad=start(fixture(),'silver');bad.battle.team[0].corps.troops=1;assert.throws(()=>gameSnapshot(bad,d));
bad=complete(start(fixture(),'silver'));bad.lastBattle.troops=1;assert.throws(()=>gameSnapshot(bad,d),/资源历练/);
// Hero passives remain active in the zero-soldier formation; reserve smoke is not consumed.
let prepared=act(act(fixture(),'realmOpen'),'expansionOpen');prepared.inventory.smoke_pack=2;prepared=act(prepared,'smokeReady');prepared.realm.relics=['drum'];prepared.realm.equipped='drum';prepared.realm.paths={linchong:'guard'};prepared.expansion.personal.linchong=true;
let resourceBattle=start(prepared,'grain');assert.equal(resourceBattle.inventory.smoke_pack,2);assert.equal(resourceBattle.expansion.smoke,true);assert.equal(resourceBattle.battle.expansion.smoke,false);assert.equal(resourceBattle.battle.realm.relic,'drum');assert.equal(resourceBattle.battle.realm.paths.linchong,'guard');assert.ok(resourceBattle.battle.expansion.personal.includes('linchong'));assert.ok(resourceBattle.battle.team.find(u=>u.id==='linchong').statuses.some(x=>x.id==='guard'));assert.deepEqual(gameSnapshot(resourceBattle,d),resourceBattle);
resourceBattle=complete(resourceBattle);assert.equal(resourceBattle.inventory.smoke_pack,2);assert.equal(resourceBattle.expansion.smoke,true);
// Legacy progress remains byte-for-byte meaningful, without inventing resource records.
for(const s of [fixture(),{...fixture(),campaign:{version:1,daily:{date:'2026-09-06',uses:{ore:2}},weekly:{},mastery:{ore_1:2}}}])assert.deepEqual(importSave(exportSave(s,{id:1,name:'旧档'},d),d).state,s);
// A medicine use, late finish or fallen hero cannot grant a stable-clear mark.
for(const extra of [{elapsed:60001,itemReadyAt:0,team:[{hp:1}]},{elapsed:1000,itemReadyAt:5000,team:[{hp:1}]},{elapsed:1000,itemReadyAt:0,team:[{hp:0}]}]){const s=fixture();s.campaign={version:1,daily:{date:'2026-09-07',uses:{silver:1}},weekly:{}};finishRotation(s,{outcome:'victory',...extra,context:{type:'rotation',kind:'daily',id:'silver',tier:1,period:'2026-09-07'}});assert.equal(mastery(s,'silver',1),0);}
console.log('Resource dungeons: all 12 real rewards, all-week access, independent shared tier quotas, defeat/retreat, duplicate settlement, zero-food army configuration, stock caps, UTC+8 midnight, genuine mastery, immutable real-combat sweep parity, stale/overflow rejection, no extra rewards and portable legacy saves passed.');
