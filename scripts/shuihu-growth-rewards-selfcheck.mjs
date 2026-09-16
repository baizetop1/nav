import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {CHAPTER_MISSIONS} from '../public/game/js/volume-three-data.js';
import {battleExperience,dailyExperience} from '../public/game/js/growth-rewards.js';
import {totalExperience,experienceToNext} from '../public/game/js/progression.js';
import {growthBudget,budgetPanel} from '../public/game/js/economy.js';
import {mentorshipQuote} from '../public/game/js/mentorship.js';
import {mentorshipPanel} from '../public/game/js/mentorship-ui.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {sweepQuote} from '../public/game/js/sweep.js';
import {sweepDialog} from '../public/game/js/sweep-ui.js';
import {sortieDialog} from '../public/game/js/sortie-ui.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {gains} from '../public/game/js/rewards-ui.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const now=Date.parse('2026-09-13T04:00:00Z');
function fixture(level=35){
 const s=newGame(d,now,81);s.camp=freshCamp();s.camp.buildings={hall:4,barracks:5,clinic:3,farm:3,lumber:3,market:3};s.camp.food=30000;s.camp.troops=1000;s.camp.deployment=300;s.player.silver=10000;s.team=['linchong','luzhishen','songjiang'];s.battleSkillMode='auto';
 for(const id of s.team)s.heroes[id]={status:'owned',level,exp:0,quality:level>=30?2:level>=15?1:0};s.heroes.huarong={status:'owned',level:5,exp:70};
 return s;
}
const act=(s,type,a={})=>{const n=dispatch(d,s,{type,...a},s.clock);assert.deepEqual(gameSnapshot(n,d),n);return n;};
function fight(s){for(let t=0;t<180&&!s.battle.outcome;t++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory',s.battle.context.id);return s;}
function chapter(id,level=35){
 const s=fixture(level),m=d.by.stories[id];
 // Isolate each real battle at a valid active step; narrative paths are covered by the volume suites.
 for(const flag of ['volume_complete','volume_two_complete','volume_three_complete','volume_four_complete','volume_five_complete','v4_erlong_allied','v4_erlong_medics','v4_taohua_allied','v4_taohua_engines','v4_baihu_allied','v4_baihu_initiative'])s.progress.flags[flag]=true;
 const [step,v]=Object.entries(m.steps).find(([,step])=>step.choices.some(c=>c.battle));s.location=v.map;s.progress.visited.push(v.map);s.progress.stories[id]={status:'active',step};
 const choice=v.choices.find(c=>c.battle).id;return {s,action:{type:'chapterBattle',id,choice}};
}
const table=[];
for(const [id,m] of Object.entries(CHAPTER_MISSIONS)){
 const {s,action}=chapter(id),q=prepareSortie(s,d,action),raw=JSON.stringify(s);assert.equal(q.reason,'',id);assert.equal(JSON.stringify(s),raw);
 const expected=experienceToNext(m.level);assert.equal(battleExperience(q.battle),expected);assert.match(sortieDialog(s,d,action,null,q,String,()=>''),new RegExp('每名参战好汉 '+expected+' 经验'));
 let active=act(s,action.type,action);active=importSave(exportSave(active,{id:1,name:'成长结算战中'},d),d).state;fight(active);const done=act(active,'finishBattle');
 for(const hero of s.team)assert.equal(totalExperience(done.heroes[hero])-totalExperience(s.heroes[hero]),expected,id+' '+hero);
 assert.deepEqual(done.heroes.huarong,s.heroes.huarong,'Only participants earn XP');assert.equal(gains(active,done,d).find(r=>r.name==='林冲 · 历练').amount,expected);
 assert.throws(()=>act(done,'finishBattle'));assert.throws(()=>act(done,action.type,action),'Story cannot replay its completed battle step');assert.deepEqual(importSave(exportSave(done,{id:1,name:'成长结算'},d),d).state,done);
 table.push({mission:id,level:m.level,experience:expected});
}
for(const outcome of ['retreat','defeat']){
 const {s,action}=chapter('v3_grain');let active=act(s,action.type,action);
 if(outcome==='retreat')active=act(active,'battleRetreat');else{for(const u of active.battle.team)u.hp=0;advanceBattle(active,d,1000);assert.equal(active.battle.outcome,'defeat');}
 const done=act(active,'finishBattle');assert.deepEqual(done.heroes,s.heroes);assert.deepEqual(done.inventory,s.inventory);assert.equal(done.player.stamina,s.player.stamina-8);
}
const capped=chapter('v6_final',39);for(const id of capped.s.team)capped.s.heroes[id].exp=experienceToNext(39)-1;const full=act(fight(act(capped.s,capped.action.type,capped.action)),'finishBattle');for(const id of full.team){assert.equal(full.heroes[id].level,40);assert.equal(full.heroes[id].exp,0);}assert.equal(gains(capped.s,full,d).find(r=>r.name==='林冲 · 历练').amount,1);
assert.equal(battleExperience({guest:true,context:{type:'story',id:'v3_grain'}}),0);assert.equal(battleExperience({context:{type:'story',id:'jingyang'}}),0);assert.equal(battleExperience({context:{type:'rotation',kind:'weekly',id:'siege',tier:1}}),0);
for(const [id,expected] of [['ore',[120,240,420]],['manual',[180,360,600]],['stable',[120,240,420]]])for(let tier=1;tier<=3;tier++){
 const s=fixture(),active=fight(act(s,'rotationStart',{kind:'daily',id,tier})),done=act(active,'finishBattle');for(const hero of s.team)assert.equal(totalExperience(done.heroes[hero])-totalExperience(s.heroes[hero]),expected[tier-1]);assert.equal(done.campaign.daily.uses[id],1);assert.deepEqual(done.heroes.huarong,s.heroes.huarong);
}
let s=fixture(),start=structuredClone(s);for(let i=0;i<3;i++)s=act(act(act(s,'rotationStart',{kind:'daily',id:'ore',tier:1}),'battleRetreat'),'finishBattle');assert.deepEqual(s.heroes,start.heroes);assert.throws(()=>act(s,'rotationStart',{kind:'daily',id:'ore',tier:2}),/3 次/);
// Sweep previews and manual battles must carry the same level changes into every subsequent fight.
s=fixture(21);s.campaign={version:1,daily:{date:'2026-09-13',uses:{}},weekly:{},mastery:{manual_3:2}};s.heroes.linchong={status:'owned',level:39,exp:experienceToNext(39)-1,quality:2};const a={id:'manual',tier:3,count:3},raw=JSON.stringify(s),q=sweepQuote(s,d,a);assert.equal(q.reason,'');assert.equal(JSON.stringify(s),raw);assert.deepEqual(q.summary.experience,{linchong:1,luzhishen:1800,songjiang:1800});assert.match(sweepDialog(q,a,d,String,()=>''),/林冲 \+1 经验/);
const swept=act(s,'rotationSweep',{...a,expected:q.signature});let manual=s;for(let i=0;i<3;i++)manual=act(fight(act(manual,'rotationStart',{kind:'daily',id:'manual',tier:3})),'finishBattle');for(const key of ['heroes','inventory','campaign','camp'])assert.deepEqual(swept[key],manual[key]);assert.equal(swept.player.stamina,s.player.stamina-30);assert.throws(()=>act(swept,'rotationStart',{kind:'daily',id:'manual',tier:1}),/3 次/);
// Budget is read-only, subtracts current XP and a shared inventory, and never quotes negative shopping.
for(const count of [0,3,1000]){s=fixture(20);s.heroes.linchong.exp=70;s.inventory.exp_pill=count;const before=JSON.stringify(s),budget=growthBudget(s,d,'linchong',30),required=Array.from({length:10},(_,i)=>experienceToNext(20+i)).reduce((a,b)=>a+b,0)-70;assert.equal(budget.exp,required);assert.equal(budget.pills,Math.ceil(required/300));assert.equal(budget.usablePills,Math.min(count,budget.pills));assert.equal(budget.missingPills,Math.max(0,budget.pills-count));assert.equal(budget.missingSilver,budget.missingPills*100);assert.equal(JSON.stringify(s),before);assert.match(budgetPanel(s,d,'linchong'),/全寨共用/);assert.equal(growthBudget(s,d,'linchong',20).missingSilver,0);}
// The same away lock covers both mentorship roles, even when confirming an older valid preview.
for(const id of ['linchong','huarong']){s=fixture(20);const good=mentorshipQuote(s,d,'linchong','huarong');assert.equal(good.reason,'');s.realm={squad:{team:[id]}};const before=JSON.stringify(s);assert.match(mentorshipQuote(s,d,'linchong','huarong').reason,/外派/);assert.throws(()=>act(s,'heroMentor',{mentor:'linchong',student:'huarong',expected:good.signature}),/外派/);assert.equal(JSON.stringify(s),before);assert.match(mentorshipPanel(s,d,String,()=>''),new RegExp('value="'+id+'"[^>]*disabled'));}
// Continuous combat-growth benchmark. Buildings, story prerequisites and a finite training
// inventory are fixtures; this is not a fresh-save economy or full narrative playthrough.
const route=['v3_grain','v3_timber','v3_ferry','v3_defense','v4_erlong_pact','v4_taohua_pact','v4_baihu_pact','v4_union','v5_probe','v5_cut_east','v5_cut_west','v5_second','v5_third','v6_outer','v6_cut','v6_rescue','v6_final'];
let journey=fixture(10);journey.inventory.exp_pill=300;
Object.assign(journey.progress.flags,chapter('v3_grain').s.progress.flags,{v3_scouted:true,v5_east_cut:true,v5_west_cut:true,v5_inside_support:true,v6_aid_cut:true,v6_smoke_known:true});
const journeyStart=structuredClone(journey),ledger=[];
for(const id of route){
 const level=CHAPTER_MISSIONS[id].level;
 for(const hero of journey.team)while(journey.heroes[hero].level<level)journey=act(journey,'use',{id:'exp_pill',hero});
 // A rest day uses the real regen path, and injury treatment pays real food costs.
 if(journey.player.stamina<CHAPTER_MISSIONS[id].stamina)journey=dispatch(d,journey,{type:'refresh'},journey.clock+86400000);
 while(journey.camp.wounded)journey=act(journey,'campHeal');
 const model=d.by.stories[id],[step,v]=Object.entries(model.steps).find(([,step])=>step.choices.some(c=>c.battle));journey.location=v.map;if(!journey.progress.visited.includes(v.map))journey.progress.visited.push(v.map);journey.progress.stories[id]={status:'active',step};
 const before=journey;journey=act(fight(act(journey,'chapterBattle',{id,choice:v.choices.find(c=>c.battle).id})),'finishBattle');
 ledger.push({mission:id,heroLevel:journey.heroes.linchong.level,heroXP:journey.heroes.linchong.exp,pillsUsed:300-journey.inventory.exp_pill,foodSpent:before.camp.food-journey.camp.food});
}
assert.ok(journey.inventory.exp_pill>0);assert.ok(journey.camp.food>0);assert.equal(journey.heroes.linchong.level,35);assert.equal(journey.heroes.luzhishen.level,35);assert.equal(journey.heroes.songjiang.level,35);
const noStoryXP=Math.ceil((totalExperience({level:34,exp:0})-totalExperience({level:10,exp:0}))/300)*3;
assert.ok(300-journey.inventory.exp_pill<noStoryXP);
assert.deepEqual(importSave(exportSave(journey,{id:1,name:'连续战役成长基准'},d),d).state,journey);
console.table(ledger);console.log(JSON.stringify({benchmark:'17 consecutive chapter battles; preconfigured buildings, prerequisites and 300 pills',newPillsUsed:300-journey.inventory.exp_pill,oldZeroChapterXPBudgetTo34:noStoryXP,endingLevels:journey.team.map(id=>journey.heroes[id].level),foodConsumed:journeyStart.camp.food-journey.camp.food,fallen:journey.camp.fallen||0}));
const nativeHasOwn=Object.hasOwn;try{Object.hasOwn=undefined;assert.equal(dailyExperience('manual',3),600);assert.equal(dailyExperience('__proto__',1),0);}finally{Object.hasOwn=nativeHasOwn;}
console.table(table);console.log('Growth rewards PASS: all chapter battle payouts and save roundtrips, no repeat/loss/guest/weekly XP, capped receipts, 9 daily tiers, shared daily caps, real 3-battle sweep/manual parity, shared-inventory budgets and stale away-mentor rejection.');


