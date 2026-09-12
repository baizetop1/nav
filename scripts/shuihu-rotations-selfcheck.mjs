import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {advanceBattle,startBattle} from '../public/game/js/battle.js';
import {freshCamp,attachTroops} from '../public/game/js/camp.js';
import {rotationCalendar,DAILY_ROUTES,WEEKLY_ROUTES,rotationPlan,weeklyScore,rankSnapshots} from '../public/game/js/rotations.js';
import {ARMS,heroTrait,armFactor,martialFactor} from '../public/game/js/martial.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {validateSave} from '../public/game/js/save.js';
import {CloudClient} from '../public/game/js/cloud.js';
const root=new URL('../public/game/data/',import.meta.url),d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root)))])));
const at=day=>Date.parse(day+'T12:00:00+08:00'),act=(s,type,a={})=>dispatch(d,s,{type,...a},s.clock);
function fixture(day){const s=newGame(d,at(day),456789);s.camp=freshCamp();s.camp.buildings={hall:4,farm:2,lumber:2,barracks:4,clinic:2,market:2};s.camp.mode='solo';s.battleSkillMode='auto';s.camp.food=10000;s.player.silver=10000;s.team=['wusong','linchong','wuyong'];for(const id of s.team){s.heroes[id]={status:'owned',level:30,exp:0,quality:2};for(const skill of d.by.heroes[id].skills){const flag=d.by.skills[skill].training?.flag;if(flag)s.progress.flags[flag]=true;}}return s;}
function win(s){let n=0;while(!s.battle.outcome&&n++<181)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory',s.battle.context.id+' tier '+s.battle.context.tier+' attainable');return act(s,'finishBattle');}
// Four monthly periods, including short/leap months and midnight at UTC+8.
for(const [date,week] of [['2026-09-01',1],['2026-09-07',1],['2026-09-08',2],['2026-09-14',2],['2026-09-15',3],['2026-09-21',3],['2026-09-22',4],['2026-09-30',4],['2028-02-29',4]])assert.equal(rotationCalendar(at(date)).week,week);
assert.equal(rotationCalendar(Date.parse('2026-09-07T15:59:59Z')).week,1);assert.equal(rotationCalendar(Date.parse('2026-09-07T16:00:00Z')).week,2);assert.equal(rotationCalendar(at('2026-12-31')).period,'2026-12-4');assert.equal(rotationCalendar(at('2027-01-01')).period,'2027-01-1');
const base=fixture('2026-09-06');for(const r of DAILY_ROUTES)for(let tier=1;tier<=3;tier++){
 const input=structuredClone(base),before=structuredClone(input.inventory);let s=act(input,'rotationStart',{kind:'daily',id:r.id,tier});assert.equal(s.campaign.daily.uses[r.id],1);assert.equal(s.player.stamina,90);assert.deepEqual(gameSnapshot(s,d),s,'Mid-battle snapshot retains rotation and martial rules');
 s=win(s);for(const [id,n] of Object.entries(r.reward))assert.equal(s.inventory[id]-(before[id]||0),n*tier);assert.throws(()=>act(s,'finishBattle'));
}
let monday=fixture('2026-09-07');const raw=JSON.stringify(monday);assert.throws(()=>act(monday,'rotationStart',{kind:'daily',id:'manual',tier:1}),/今日未开放/);assert.equal(JSON.stringify(monday),raw);
for(let n=0;n<3;n++){monday=act(monday,'rotationStart',{kind:'daily',id:'ore',tier:1});monday=act(act(monday,'battleRetreat'),'finishBattle');}assert.throws(()=>act(monday,'rotationStart',{kind:'daily',id:'ore',tier:1}),/3 次/);assert.equal(monday.inventory.iron,base.inventory.iron,'Retreat consumes attempt without materials');
const tuesday=dispatch(d,monday,{type:'refresh'},at('2026-09-08'));assert.equal(act(tuesday,'rotationStart',{kind:'daily',id:'manual',tier:1}).campaign.daily.date,'2026-09-08');
// Each of the four weekly bosses is beatable, progresses sequentially, and pays once per layer.
for(let i=0;i<4;i++){
 let s=fixture('2026-09-'+String(i*7+1).padStart(2,'0')),period=rotationCalendar(s.clock).period,id=WEEKLY_ROUTES[i].id;
 assert.throws(()=>act(s,'rotationStart',{kind:'weekly',id,tier:2}),/上一层/);
 for(let tier=1;tier<=5;tier++){s.player.stamina=100;s=win(act(s,'rotationStart',{kind:'weekly',id,tier}));assert.equal(s.campaign.weekly[period].tier,tier);}
 const mats=structuredClone(s.inventory),best=s.campaign.weekly[period].score;s.player.stamina=100;s=win(act(s,'rotationStart',{kind:'weekly',id,tier:1}));assert.deepEqual(s.inventory,mats);assert.equal(s.campaign.weekly[period].score,best);assert.deepEqual(importSave(exportSave(s,{id:1,name:'周本进度'},d),d).state,s);
}
// Finishing over the boundary credits entry's period, never the new period.
let cross=act(fixture('2026-09-07'),'rotationStart',{kind:'weekly',id:'siege',tier:1});cross=dispatch(d,cross,{type:'refresh'},at('2026-09-08'));cross=win(cross);assert.ok(cross.campaign.weekly['2026-09-1']);assert.equal(cross.campaign.weekly['2026-09-2'],undefined);
const fake=structuredClone(cross);fake.campaign.weekly['2026-09-1'].score++;assert.throws(()=>validateSave(fake,d),/周本成绩/);
const rankState=fixture('2026-09-08');rankState.campaign={version:1,daily:{date:'2026-09-08',uses:{}},weekly:{'2026-09-2':{tier:2,elapsed:120000,hp:500,score:weeklyScore(2,120000,500)}}};
const rows=rankSnapshots([{id:3,raw:JSON.stringify(rankState),name:'SECRET',key_hash:'SECRET'}, {id:1,raw:JSON.stringify(rankState)},{id:2,raw:'bad JSON'},{id:4,raw:JSON.stringify(cross)}],rankState.clock);
assert.deepEqual(rows.entries.map(x=>[x.id,x.rank]),[[1,1],[3,1]]);assert.deepEqual(Object.keys(rows.entries[0]).sort(),['id','rank','score','tier']);assert.ok(!JSON.stringify(rows).includes('SECRET'));
// All 108 have a visible trait; counter cycles affect actual attacks.
for(const h of d.heroes)assert.equal(heroTrait(h).length,2);assert.equal(armFactor('infantry','ranged'),1.2);assert.equal(armFactor('ranged','infantry'),.85);assert.equal(armFactor('neutral','infantry'),1);
function firstHit(arm){const s=fixture('2026-09-08');s.team=['linchong'];s.camp.arm=arm;startBattle(s,d,{enemies:['guard'],scale:5,context:{type:'camp',id:'woods'}});attachTroops(s,10);while(s.battle.team[0].attacks===0)advanceBattle(s,d,1000);return s.battle.enemy[0].maxHp-s.battle.enemy[0].hp;}
assert.ok(firstHit('cavalry')>firstHit('infantry'));assert.ok(firstHit('infantry')>firstHit('ranged'));
const lone=fixture('2026-09-08');lone.team=['wusong'];startBattle(lone,d,{enemies:['guard'],context:{type:'camp',id:'woods'}});assert.equal(martialFactor(lone.battle,lone.battle.team[0],lone.battle.enemy[0],d),1.2);
assert.throws(()=>act(base,'campFormation',{mode:'solo',tactic:'balanced',deployment:1,arm:'neutral'}));
// Refuse a new-format upload to an old backend before issuing any PUT.
const calls=[],client=new CloudClient('https://save.example.com',d,async(url,opts)=>{calls.push(opts.method);return Response.json({release:'0.8.1'});});await assert.rejects(()=>client.upload(1,1,cross,'周本'),/0.9.0/);assert.deepEqual(calls,['GET']);
console.log('Rotations: UTC+8 daily/monthly boundaries, 9 daily tiers, all 20 weekly layers, paid attempts, repeat/retreat guards, cross-period settlement, save roundtrip, anonymous tied ranks, actual counters, traits and old-backend guard passed.');
