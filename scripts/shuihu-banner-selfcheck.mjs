import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {recruit} from '../public/game/js/hero.js';
import {weighted,pick,random} from '../public/game/js/utils.js';
import {freshCamp} from '../public/game/js/camp.js';
import {recruitmentBanner,recruitmentSchedule,recruitStar} from '../public/game/js/recruitment-banner.js';
import {heroAptitude} from '../public/game/js/hero-aptitude.js';
import {supportState,welcomeCandidates,SELECT_COST} from '../public/game/js/recruit-support.js';
import {recruitBannerPanel} from '../public/game/js/recruit-banner-ui.js';
import {recruitSupportPanel} from '../public/game/js/recruit-support-ui.js';
import {render} from '../public/game/js/ui.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))])));
const now=Date.parse('2026-10-13T04:00:00Z'),base=(time=now)=>{const s=newGame(d,time,1398103);s.inventory.recruit_order=10000;return s;},act=(s,type,a={},time=s.clock)=>dispatch(d,s,{type,...a},time);
assert.deepEqual(d.config.balance.ordinaryRates,[{star:5,weight:1},{star:4,weight:6},{star:3,weight:23},{star:2,weight:45},{star:1,weight:25}]);
const rawStars=d.heroes.map(h=>h.star),b=recruitmentBanner(d,now),active=new Set(b.heroes.map(h=>h.id));
assert.equal(b.slot,1);assert.equal(b.heroes.length,17);assert.equal(active.size,17);assert.equal(b.headliners.length,3);
for(const star of [1,2,3,4,5])assert.ok(b.byStar[star].every(h=>recruitStar(h)===star));
assert.ok(b.byStar[5].every(h=>h.group!=='external'));assert.ok(b.byStar[4].every(h=>h.obtain.type==='external'));assert.ok([1,2,3].every(star=>b.byStar[star].every(h=>h.obtain.type==='wanderer')));
const year=new Set(),annualGrades={A:0,B:0,C:0};
for(let month=0;month<12;month++){
 const schedule=recruitmentSchedule(d,Date.UTC(2026,month,5)),monthlyGrades={A:0,B:0,C:0};
 for(const period of schedule){
  assert.match(period.id,/-v2$/,'changed pools have a different command identity from 0.83 pages');
  assert.deepEqual(period.headliners.map(h=>heroAptitude(h).id),period.slot<2?['A','B','C']:['B','B','C']);
  assert.equal(period.heroes.length,17);assert.equal(new Set(period.heroes.map(h=>h.id)).size,17);
  for(const h of period.headliners){assert.ok(!year.has(h.id));year.add(h.id);monthlyGrades[heroAptitude(h).id]++;annualGrades[heroAptitude(h).id]++;}
 }
 assert.deepEqual(monthlyGrades,{A:2,B:4,C:3},'each month mixes all three aptitudes');
}
assert.equal(year.size,108);assert.deepEqual(annualGrades,{A:24,B:48,C:36});
assert.deepEqual([...year].sort(),d.heroes.filter(h=>h.group!=='external').map(h=>h.id).sort());
assert.deepEqual(b.headliners.map(h=>h.id),['sunli','xiangchong','liyun'],'October 11–20 has explicit A/B/C headliners');
for(const month of [1,3,9,11]){const schedule=recruitmentSchedule(d,Date.UTC(2028,month,5));assert.equal(schedule[0].endAt,schedule[1].startAt);assert.equal(schedule[1].endAt,schedule[2].startAt);for(const p of schedule){assert.equal(recruitmentBanner(d,p.startAt).id,p.id);assert.equal(recruitmentBanner(d,p.endAt-1).id,p.id);assert.notEqual(recruitmentBanner(d,p.endAt).id,p.id);}}
assert.equal(recruitmentBanner(d,Date.parse('2026-10-10T15:59:59Z')).slot,0);assert.equal(recruitmentBanner(d,Date.parse('2026-10-10T16:00:00Z')).slot,1);
// Real reducer draws always join unknown heroes and cannot leave the current dated pool.
const seenStars=new Set();for(const seed of [1,31,81,93287,3888888]){const s=base();s.rng=seed;const reference={rng:seed,pity:{three:0,four:0,five:0}};for(let i=0;i<500;i++){let star=weighted(reference,d.config.balance.ordinaryRates).star;const p=reference.pity;if(p.five>=99)star=5;else if(p.four>=49)star=Math.max(star,4);else if(p.three>=19)star=Math.max(star,3);p.three=star>=3?0:p.three+1;p.four=star>=4?0:p.four+1;p.five=star===5?0:p.five+1;const expected=pick(reference,b.byStar[star]);recruit(s,d);assert.equal(s.recruit.lastResult.hero,expected.id);assert.equal(s.heroes[expected.id].status,'owned');assert.equal(s.recruit.lastResult.kind==='clue',false);assert.equal(s.rng,reference.rng);assert.deepEqual(s.recruit.pity,reference.pity);assert.ok(active.has(expected.id));seenStars.add(star);}}assert.equal(seenStars.size,5);
let s=base();s.recruit.pity.five=99;const guaranteed=act(s,'recruit');assert.equal(recruitStar(d.by.heroes[guaranteed.recruit.lastResult.hero]),5);assert.equal(guaranteed.recruit.lastResult.kind,'joined');assert.equal(s.recruit.pity.five,99,'transaction does not mutate input');
let single=s;for(let i=0;i<10;i++)single=act(single,'recruit');const ten=act(s,'recruitTen');for(const key of ['heroes','inventory','rng'])assert.deepEqual(ten[key],single[key]);assert.deepEqual(ten.recruit.pity,single.recruit.pity);assert.ok(ten.recruit.lastBatch.every(r=>active.has(r.hero)&&r.kind!=='clue'));assert.deepEqual(importSave(exportSave(ten,{id:1,name:'活动十连'},d),d).state,ten);
const target=b.byStar[5][0].id;let exclusive=base();exclusive.inventory[target+'_order']=5;exclusive.recruit.fate[target]=4;exclusive=act(exclusive,'recruit',{id:target});assert.equal(exclusive.heroes[target].status,'owned');assert.equal(exclusive.recruit.lastResult.hero,target);assert.equal(exclusive.recruit.fate[target],0);
const inactive=d.heroes.find(h=>h.group!=='external'&&!active.has(h.id)).id;let rejected=base();rejected.inventory[inactive+'_order']=10;const raw=JSON.stringify(rejected);assert.throws(()=>act(rejected,'recruit',{id:inactive}),/未在本期/);assert.equal(JSON.stringify(rejected),raw);
// Dedicated recruitment still uses 25% target, 5% other featured five-star,
// otherwise a current lower rarity; the fifth miss guarantees the target.
const dedicated=base();dedicated.rng=9813;dedicated.inventory[target+'_order']=500;
const dedicatedReference={rng:dedicated.rng,misses:0},dedicatedKinds=new Set(),ordinaryPity=structuredClone(dedicated.recruit.pity);
for(let i=0;i<400;i++){const n=random(dedicatedReference);let expected;if(dedicatedReference.misses>=4||n<.25){expected=d.by.heroes[target];dedicatedKinds.add('target');}else if(n<.30){expected=pick(dedicatedReference,b.byStar[5].filter(h=>h.id!==target));dedicatedKinds.add('other-five');}else{expected=pick(dedicatedReference,b.heroes.filter(h=>recruitStar(h)<5));dedicatedKinds.add('lower');}dedicatedReference.misses=expected.id===target?0:dedicatedReference.misses+1;recruit(dedicated,d,target,b.id);assert.equal(dedicated.recruit.lastResult.hero,expected.id);assert.equal(dedicated.rng,dedicatedReference.rng);assert.equal(dedicated.recruit.fate[target],dedicatedReference.misses);assert.deepEqual(dedicated.recruit.pity,ordinaryPity);}
assert.equal(dedicatedKinds.size,3);assert.equal(dedicated.inventory[target+'_order'],100);
// A 0.83 page for the same dates must be rejected before the new pool spends resources.
const oldPage=base();oldPage.recruit.total=100;oldPage.recruit.support={version:1,dry:0,tickets:1,points:100,claims:[],week:null};oldPage.inventory[b.headliners[0].id+'_order']=5;oldPage.recruit.fate[b.headliners[0].id]=4;
const oldBannerId=b.id.replace(/-v2$/,'');
for(const action of [{type:'recruit'},{type:'recruitTen'},{type:'recruit',id:b.headliners[0].id},{type:'recruitWelcome',id:b.byStar[1][0].id},{type:'recruitSelect',id:b.byStar[4][0].id},{type:'recruitWelcomeConvert'}]){const input=JSON.stringify(oldPage);assert.throws(()=>act(oldPage,action.type,{...action,bannerId:oldBannerId}),/已换期.*刷新/);assert.equal(JSON.stringify(oldPage),input,'same-date old-page '+action.type+' preserves resources/RNG/pity/fate');}
const directOld=structuredClone(oldPage),directBefore=JSON.stringify(directOld);assert.throws(()=>recruit(directOld,d,undefined,oldBannerId),/已换期/);assert.equal(JSON.stringify(directOld),directBefore);
// Switching periods keeps counters, points, vouchers and old dedicated orders.
const before=structuredClone(ten.recruit),next=act(ten,'refresh',{},b.endAt);assert.deepEqual(next.recruit,before);assert.notEqual(recruitmentBanner(d,next.clock).id,b.id);
let support=base();for(const h of b.heroes)support.heroes[h.id].status='owned';for(let i=0;i<70;i++)recruit(support,d);assert.equal(supportState(support).points,70);assert.equal(supportState(support).tickets,7);
for(const star of [1,2,3,4,5]){const state=structuredClone(support),h=b.byStar[star][0];state.heroes[h.id].status='unknown';const points=act(state,'recruitSelect',{id:h.id});assert.equal(points.heroes[h.id].status,'owned');assert.equal(points.recruit.support.points,70-SELECT_COST[star]);assert.equal(points.rng,state.rng);assert.deepEqual(points.recruit.pity,state.recruit.pity);}
const voucher=structuredClone(support),low=b.byStar[1][0];voucher.heroes[low.id].status='unknown';assert.ok(welcomeCandidates(voucher,d).some(h=>h.id===low.id));const invited=act(voucher,'recruitWelcome',{id:low.id});assert.equal(invited.heroes[low.id].status,'owned');assert.equal(invited.recruit.support.tickets,6);assert.throws(()=>act(voucher,'recruitWelcome',{id:inactive}),/本期/);assert.throws(()=>act(voucher,'recruitSelect',{id:inactive}),/本期/);
// A saved historical clue receipt stays importable; this change does not rewrite old outcomes.
const legacy=base();legacy.recruit.total=1;legacy.heroes.songjiang.status='heard';legacy.inventory.songjiang_token=2;legacy.recruit.lastResult={hero:'songjiang',target:null,kind:'clue',tokens:2,merit:0,number:1,inTeam:false};assert.deepEqual(gameSnapshot(legacy,d),legacy);
// Silver-only invitation is removed; earned external commissions still work.
const camp=base();camp.camp=freshCamp();camp.camp.buildings.hall=5;camp.camp.work=100;camp.player.silver=50000;for(const id of ['lujunyi',b.byStar[1][0].id]){const input=JSON.stringify(camp);assert.throws(()=>act(camp,'campInvite',{id}),/碎银不能/);assert.equal(JSON.stringify(camp),input);}
camp.heroes.chaogai.status='known';camp.progress.flags.external_chaogai_helped=true;camp.inventory.chaogai_token=10;const earned=act(camp,'campInvite',{id:'chaogai'});assert.equal(earned.heroes.chaogai.status,'owned');assert.equal(earned.inventory.chaogai_token,0);assert.equal(earned.player.silver,camp.player.silver-600);
const html=recruitBannerPanel(base(),d,String,()=>'<button>招贤</button>',h=>'<img src="'+h.portrait+'">');assert.match(html,/10月11日—20日/);assert.ok(b.headliners.every(h=>html.includes(h.name)));assert.match(html,/首次抽中直接入寨/);assert.ok(!html.includes('人物仍需相识'));assert.deepEqual(d.heroes.map(h=>h.star),rawStars);
// An activity card rendered before midnight cannot spend in a different saved-clock pool.
const edge=base(b.endAt-1),edgeBanner=recruitmentBanner(d,edge.clock);edge.recruit.total=100;edge.recruit.support={version:1,dry:0,tickets:1,points:100,claims:[],week:null};edge.inventory[edgeBanner.headliners[0].id+'_order']=5;edge.recruit.fate[edgeBanner.headliners[0].id]=4;
for(const action of [
 {type:'recruit',bannerId:edgeBanner.id},
 {type:'recruitTen',bannerId:edgeBanner.id},
 {type:'recruit',id:edgeBanner.headliners[0].id,bannerId:edgeBanner.id},
 {type:'recruitWelcome',id:edgeBanner.byStar[1][0].id,bannerId:edgeBanner.id},
 {type:'recruitSelect',id:edgeBanner.byStar[4][0].id,bannerId:edgeBanner.id},
 {type:'recruitWelcomeConvert',bannerId:edgeBanner.id}
]){const input=JSON.stringify(edge);assert.throws(()=>dispatch(d,edge,action,b.endAt),/已换期.*刷新/);assert.equal(JSON.stringify(edge),input,'stale '+action.type+' keeps orders, support, RNG, pity, fate, clock and heroes atomic');}
const direct=structuredClone(edge);direct.clock=b.endAt;const directRaw=JSON.stringify(direct);assert.throws(()=>recruit(direct,d,undefined,edgeBanner.id),/已换期/);assert.equal(JSON.stringify(direct),directRaw,'low-level mismatch precedes RNG and spending');
// Fresh UI ids work at the boundary, while internal callers may omit ids.
const refreshed=act(edge,'refresh',{},b.endAt),freshBanner=recruitmentBanner(d,refreshed.clock);assert.notEqual(freshBanner.id,edgeBanner.id);const currentDraw=act(refreshed,'recruit',{bannerId:freshBanner.id});assert.equal(currentDraw.inventory.recruit_order,refreshed.inventory.recruit_order-1);assert.ok(freshBanner.heroes.some(h=>h.id===currentDraw.recruit.lastResult.hero));const currentTen=act(refreshed,'recruitTen',{bannerId:freshBanner.id});assert.equal(currentTen.inventory.recruit_order,refreshed.inventory.recruit_order-10);assert.equal(currentTen.recruit.lastBatch.length,10);
// Old voucher/points records gain the new rule marker only after successful activity actions.
const legacySupport=base();legacySupport.recruit.total=100;legacySupport.recruit.support={version:1,dry:0,tickets:1,points:100,claims:[],week:null};assert.equal(legacySupport.recruit.rules,undefined);
const claimedStates=[];for(const [type,id]of [['recruitWelcome',b.byStar[1][0].id],['recruitSelect',b.byStar[4][0].id]]){const input=JSON.stringify(legacySupport),after=act(legacySupport,type,{id,bannerId:b.id});assert.equal(after.recruit.rules,2);assert.equal(after.heroes[id].status,'owned');assert.equal(after.rng,legacySupport.rng);assert.deepEqual(after.recruit.pity,legacySupport.recruit.pity);assert.equal(JSON.stringify(legacySupport),input);assert.deepEqual(gameSnapshot(after,d),after);claimedStates.push(after);}
const allLow=structuredClone(legacySupport);for(const h of b.heroes.filter(h=>recruitStar(h)<=3))allLow.heroes[h.id].status='owned';const converted=act(allLow,'recruitWelcomeConvert',{bannerId:b.id});assert.equal(converted.recruit.rules,2);assert.equal(converted.recruit.support.tickets,0);assert.equal(converted.recruit.support.points,110);assert.equal(converted.rng,allLow.rng);claimedStates.push(converted);
for(const [type,mutate,id]of [['recruitWelcome',x=>x.recruit.support.tickets=0,b.byStar[1][0].id],['recruitSelect',x=>x.recruit.support.points=0,b.headliners[0].id],['recruitWelcomeConvert',()=>{},undefined]]){const bad=structuredClone(legacySupport);mutate(bad);const input=JSON.stringify(bad);assert.throws(()=>act(bad,type,{id,bannerId:b.id}));assert.equal(JSON.stringify(bad),input);assert.equal(bad.recruit.rules,undefined,'failure cannot add activity marker');}
let oldWorkerPuts=0;const oldWorker=new CloudClient('https://test.invalid',d,async(_,o)=>{if(o.method==='PUT')oldWorkerPuts++;return Response.json({rosterVersion:d.config.rosterVersion,heroes:d.heroes.length});});for(const state of claimedStates)await assert.rejects(()=>oldWorker.upload(1,1,state,'旧活动兑换'),/0\.83\.0.*活动招贤/);assert.equal(oldWorkerPuts,0);
// Rendered commands carry the exact displayed period; no bridge is allowed to discard it.
const uiActions=[],uiButton=(label,a)=>{uiActions.push(a);return '<button>'+label+'</button>';};recruitBannerPanel(edge,d,String,uiButton,()=>'<span></span>');assert.equal(uiActions.filter(a=>['recruit','recruitTen'].includes(a.type)).length,2);assert.ok(uiActions.filter(a=>['recruit','recruitTen'].includes(a.type)).every(a=>a.bannerId===edgeBanner.id));
uiActions.length=0;recruitSupportPanel(legacySupport,d,String,uiButton);assert.ok(uiActions.filter(a=>['ui_recruitWelcome','ui_recruitSelect'].includes(a.type)).every(a=>a.bannerId===b.id));assert.equal(uiActions.filter(a=>['ui_recruitWelcome','ui_recruitSelect'].includes(a.type)).length,2);uiActions.length=0;recruitSupportPanel(allLow,d,String,uiButton);assert.equal(uiActions.find(a=>a.type==='recruitWelcomeConvert').bannerId,b.id);
const exclusiveHtml=render({state:edge,data:d,view:'recruit',pageSections:{recruit:'exclusive'},recruitTarget:edgeBanner.headliners[0].id}),commands=[...exclusiveHtml.matchAll(/data-command="([^"]+)"/g)].map(m=>JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&')));assert.equal(commands.find(a=>a.type==='recruit'&&a.id===edgeBanner.headliners[0].id).bannerId,edgeBanner.id);
console.log('Recruit banner PASS: China date edges/leap months, yearly108rotation with monthly2A4B3C and versioned same-date stale-page rejection, allfamilytiers,2500seededfeaturedonlydraws with originalodds/pity, unknownjoin, 400 exact-RNG original dedicated-odds/pity draws and offperiodrejection,10drawatomicity, currentonlyvouchers/points, six stale-period actions atomic, legacy support success markers and old-Worker guards, UI period ids, oldreceipts/portable, rejected silverinvites and earnedexternalinvitation.');
