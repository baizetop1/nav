import assert from 'node:assert/strict';
import {d,fixture as baseFixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle,attackInterval} from '../public/game/js/battle.js';
import {attributes} from '../public/game/js/hero.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {routeBalance} from '../public/game/js/journey-rewards.js';
import {CHRONICLES,CHRONICLE_RANK_CAP,FORGE_STEPS,chronicleGearMultiplier,patrolRule} from '../public/game/js/chronicle-data.js';
import {chroniclePerks,chronicleForgeQuote,chronicleObjective} from '../public/game/js/chronicle.js';

const regions=Object.keys(CHRONICLES);
const copy=structuredClone;
const amount=(s,id)=>s.inventory[id]||0;
const chronicle=s=>s.realm.journey.chronicle;
const record=(s,region='forest')=>chronicle(s).routes[region];
const reload=s=>importSave(exportSave(s,{id:1,name:'商路行记回归'},d),d).state;
function unchanged(s,type,a={},pattern){const before=copy(s);assert.throws(()=>act(s,type,a),pattern);assert.deepEqual(s,before);}
function fixture(seed=81){
 const s=baseFixture(seed,40);
 s.camp.buildings.hall=5;s.camp.buildings.barracks=5;s.camp.mode='army';s.camp.deployment=1000;s.camp.troops=1000;
 s.camp.food=100000;s.camp.wood=100000;s.player.silver=100000;s.player.stamina=150;s.inventory.iron=10000;s.battleSkillMode='auto';
 s.growth={version:1,skills:{},mounts:{}};
 for(const id of s.team){
  s.heroes[id].quality=2;s.growth.mounts[id]={rank:5,intimacy:100,riding:true};
  for(const skill of d.by.heroes[id].skills)if(d.by.skills[skill].training)s.growth.skills[skill]=5;
  for(const item of ['monk_staff','chain_armor','tactics_book'])s.equipment.push({uid:'eq_'+s.nextEquipment++,item,plus:5,hero:id});
 }
 return gameSnapshot(s,d);
}
// Restock only the reusable test fixture's supplies between real expeditions.
// Chapter state, marks, rewards, inventory prizes and all combat outcomes are earned by dispatch.
function restock(s){s=copy(s);s.player.stamina=150;s.camp.troops=1000;s.camp.wounded=0;return s;}
function pickBoon(s){const offers=s.realm.trek.journey.offers;if(!offers.length)return s;const id=['focus','heal_guard','battle_hymn','shield','vigor','riposte','rupture','forager'].find(id=>offers.includes(id))||offers[0];return act(s,'journeyChoice',{id});}
function win(s){for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory',JSON.stringify({route:s.realm.trek.journey.region,job:s.realm.trek.journey.chronicle,kind:s.battle.journey.kind,team:s.battle.team.map(u=>[u.id,u.hp]),enemy:s.battle.enemy.map(u=>[u.id,u.hp])}));return act(s,'finishBattle');}
function walk(s,{rescue=true,elite=true}={}){
 while(s.realm.trek.node<5){
  s=pickBoon(s);const choices=s.realm.trek.route[s.realm.trek.node];
  const kind=rescue&&choices.includes('event')?'event':elite&&choices.includes('elite')?'elite':choices.find(k=>['camp','trade','cache'].includes(k))||choices.find(k=>k!=='event')||choices[0];
  s=act(s,'journeyNode',{kind,choice:{event:'rescue',camp:'rest',trade:'pass',cache:'arms'}[kind]});if(s.battle)s=win(s);
 }
 return s;
}
function start(s,region='forest',tier=3){return act(restock(s),'journeyStart',{region,tier,goal:'arms',itinerary:'steady',preparation:'none',challenge:'none'});}
function firstFight(s){s=pickBoon(s);return act(s,'journeyNode',{kind:'fight'});}
function patrol(s,rank,region='forest'){
 s=act(restock(s),'chroniclePatrol',{region,rank});s=start(s,region,3);assert.equal(s.realm.trek.journey.chronicle.rank,rank);
 s=walk(s,{elite:false});assert.notEqual(chronicle(s).active,null);const before=copy(s),best=record(s,region).patrol,marks=routeBalance(s,region);
 s=act(s,'journeyReturn');assert.equal(record(s,region).patrol,Math.max(best,rank));assert.equal(chronicle(s).active,null);
 assert.equal(routeBalance(s,region)-marks,4+Math.ceil(rank/2));
 assert.equal(amount(s,'material_choice')-amount(before,'material_choice'),rank>best?1:0);
 assert.equal(amount(s,'recruit_order')-amount(before,'recruit_order'),rank>best&&[4,8].includes(rank)?1:0);
 assert.equal(amount(s,'immortal_seal')-amount(before,'immortal_seal'),rank>best&&rank===8?1:0);
 assert.deepEqual(act(reload(before),'journeyReturn'),s);unchanged(s,'journeyReturn');return s;
}

// Data contracts and neutral helpers also work with saves predating chronicles.
assert.equal(CHRONICLE_RANK_CAP,8);assert.equal(FORGE_STEPS.length,3);
for(const region of regions){const route=CHRONICLES[region];assert.equal(route.chapters.length,3);assert.equal(chronicleGearMultiplier({},route.equipment),1);for(const [i,chapter] of route.chapters.entries()){
 assert.ok([...chapter.intro].length>=60&&[...chapter.intro].length<=100);assert.deepEqual(Object.keys(chapter.choices),['shelter','watch']);assert.notEqual(chapter.choices.shelter.ending,chapter.choices.watch.ending);
 assert.equal(chapter.reward.recruit_order,1);assert.equal(chapter.reward.material_choice,1);assert.equal(chapter.reward.immortal_seal||0,i===2?1:0);
}}
assert.equal(chronicleGearMultiplier({},'oak_staff'),1);
for(const region of regions)for(let forged=0;forged<=3;forged++)assert.equal(chronicleGearMultiplier({realm:{journey:{chronicle:{routes:{[region]:{forged}}}}}},CHRONICLES[region].equipment),1+.15*forged);
assert.deepEqual(Array.from({length:8},(_,i)=>patrolRule(i+1).id),['raid','rampart','attrition','raid','rampart','attrition','raid','rampart']);
const copiedRule=patrolRule(1);copiedRule.attack=99;assert.equal(patrolRule(1).attack,1.08);

// Accept/cancel are transactional, and an existing expedition cannot gain a retroactive job.
let fresh=fixture();assert.deepEqual(reload(fresh),fresh);unchanged(fresh,'chronicleAccept',{region:'__proto__',choice:'shelter'});unchanged(fresh,'chronicleAccept',{region:'forest',choice:'fake'});unchanged(fresh,'chroniclePatrol',{region:'forest',rank:1});
const lowHall=copy(fresh);lowHall.camp.buildings.hall=1;for(const h of Object.values(lowHall.heroes))delete h.quality;unchanged(lowHall,'chronicleAccept',{region:'forest',choice:'shelter'});
let accepted=act(fresh,'chronicleAccept',{region:'forest',choice:'shelter'});assert.deepEqual(reload(accepted),accepted);assert.equal(chronicle(accepted).active.ready,false);assert.ok(chronicleObjective(accepted));unchanged(accepted,'chronicleBuild');
const cancelled=act(accepted,'chronicleCancel');assert.equal(chronicle(cancelled).active,null);assert.deepEqual(record(cancelled),{choices:[],patrol:0,forged:0});
const unassigned=start(fresh,'forest',1);assert.equal(unassigned.realm.trek.journey.chronicle,undefined);unchanged(unassigned,'chronicleAccept',{region:'forest',choice:'watch'});unchanged(unassigned,'chronicleCancel');
let early=start(accepted,'forest',1);unchanged(early,'chronicleCancel');unchanged(early,'chronicleAccept',{region:'water',choice:'watch'});const originalJob=copy(chronicle(early).active);early=act(early,'journeyReturn');assert.deepEqual(chronicle(early).active,originalJob);assert.equal(record(early).choices.length,0);
let lost=firstFight(start(accepted,'forest',1));lost=act(act(lost,'battleRetreat'),'finishBattle');assert.equal(lost.realm.trek,null);assert.equal(chronicle(lost).active.ready,false);assert.equal(record(lost).choices.length,0);
let wrongRoute=act(walk(start(accepted,'water',1)),'journeyReturn');assert.equal(chronicle(wrongRoute).active.ready,false);assert.equal(record(wrongRoute).choices.length,0);
let missingRescue=act(walk(start(accepted,'forest',1),{rescue:false}),'journeyReturn');assert.equal(chronicle(missingRescue).active.ready,false);
let watchAccepted=act(fresh,'chronicleAccept',{region:'forest',choice:'watch'});let missingElite=act(walk(start(watchAccepted,'forest',1),{elite:false}),'journeyReturn');assert.equal(chronicle(missingElite).active.ready,false);

// Every chapter is completed in the engine; rewards appear only when its project is built.
let built=fresh;
for(const [regionIndex,region] of regions.entries())for(let chapter=0;chapter<3;chapter++){
 const choice=(chapter+regionIndex)%2?'watch':'shelter',definition=CHRONICLES[region].chapters[chapter];
 built=act(restock(built),'chronicleAccept',{region,choice});assert.equal(chronicle(built).active.chapter,chapter);
 if(chapter){const wrongTier=start(built,region,chapter);assert.equal(wrongTier.realm.trek.journey.chronicle,undefined);assert.equal(chronicle(act(walk(wrongTier),'journeyReturn')).active.ready,false);}
 let traveling=start(built,region,chapter+1);assert.deepEqual(reload(traveling),traveling);assert.equal(traveling.realm.trek.journey.chronicle.choice,choice);
 traveling=walk(traveling);assert.equal(chronicle(traveling).active.ready,false);unchanged(traveling,'chronicleBuild');
 const returned=act(traveling,'journeyReturn');assert.deepEqual(act(reload(traveling),'journeyReturn'),returned);assert.equal(chronicle(returned).active.ready,true);assert.equal(record(returned,region).choices.length,chapter);assert.deepEqual(reload(returned),returned);
 for(const key of Object.keys(definition.cost)){const poor=copy(returned);if(key==='wood'||key==='food')poor.camp[key]=definition.cost[key]-1;else if(key==='silver')poor.player.silver=definition.cost[key]-1;else poor.inventory[key]=definition.cost[key]-1;unchanged(poor,'chronicleBuild');}
 const before=copy(returned);built=act(returned,'chronicleBuild');assert.deepEqual(record(built,region).choices,Array.from({length:chapter+1},(_,i)=>(i+regionIndex)%2?'watch':'shelter'));assert.equal(chronicle(built).active,null);
 for(const [key,n] of Object.entries(definition.reward))assert.equal(amount(built,key)-amount(before,key),n);
 assert.equal(before.camp.wood-built.camp.wood,definition.cost.wood);assert.equal(before.player.silver-built.player.silver,definition.cost.silver);assert.equal(before.inventory.iron-built.inventory.iron,definition.cost.iron);unchanged(built,'chronicleBuild');
}
assert.ok(regions.every(region=>record(built,region).choices.length===3));assert.deepEqual(reload(built),built);unchanged(built,'chronicleAccept',{region:'forest',choice:'shelter'});unchanged(built,'chroniclePatrol',{region:'forest',rank:2});

// Saved project choices alter real opening rage and after-victory healing, without reviving anyone.
const withProjects=copy(built),withoutProjects=copy(built);record(withProjects).choices=['shelter','shelter','watch'];record(withoutProjects).choices=[];
const perks=chroniclePerks(withProjects,'forest');assert.ok(perks);
let projectFight=firstFight(start(withProjects,'forest',3)),plainFight=firstFight(start(withoutProjects,'forest',3));
for(let i=0;i<projectFight.battle.team.length;i++)assert.equal(projectFight.battle.team[i].rage-plainFight.battle.team[i].rage,5);
// Isolate the settlement formula from damage/boon RNG; these are unit tests, not the progression proof above.
for(const s of [projectFight,plainFight]){s.battle.team[0].hp=0;s.battle.team[1].hp=Math.floor(s.battle.team[1].maxHp*.4);s.battle.enemy.forEach(u=>u.hp=0);s.battle.outcome='victory';}
projectFight=act(projectFight,'finishBattle');plainFight=act(plainFight,'finishBattle');assert.equal(projectFight.realm.trek.hp[projectFight.team[0]],0);assert.equal(projectFight.realm.trek.hp[projectFight.team[1]]-plainFight.realm.trek.hp[plainFight.team[1]],600);
const deadStart=start(withProjects,'forest',3);deadStart.realm.trek.hp[deadStart.team[0]]=0;const deadFight=firstFight(deadStart);const livingReference=firstFight(start(withoutProjects,'forest',3));assert.equal(deadFight.battle.team[0].hp,0);assert.equal(deadFight.battle.team[0].rage,livingReference.battle.team[0].rage);

// Patrol scaling uses identical existing tier-3 enemies and boons at every rank.
for(let rank=1;rank<=8;rank++){
 const unlocked=copy(built);record(unlocked).patrol=rank-1;const assigned=act(unlocked,'chroniclePatrol',{region:'forest',rank});const boosted=firstFight(start(assigned,'forest',3)),normal=firstFight(start(unlocked,'forest',3));const rule=patrolRule(rank),scale=1+.18*rank+.055*rank*rank;
 assert.deepEqual(boosted.battle.journey.chronicle,boosted.realm.trek.journey.chronicle);
 for(let i=0;i<boosted.battle.enemy.length;i++){const u=boosted.battle.enemy[i],v=normal.battle.enemy[i];assert.equal(u.attack,Math.round(v.attack*(1+.12*rank+.022*rank*rank)*rule.attack));assert.equal(u.defense,Math.round(v.defense*(1+.10*rank)*rule.defense));assert.equal(u.maxHp,Math.round(v.maxHp*scale*rule.hp));assert.equal(u.speed,Math.round(v.speed*rule.speed));assert.equal(u.rage,rule.rage);assert.equal(u.nextAttackAt,attackInterval(u));if(rule.guard)assert.ok(u.statuses.some(x=>x.id==='guard'&&x.value===rule.guard&&x.expiresAt===6000));}
 assert.deepEqual(reload(boosted),boosted);
 if(rule.guard){const expired=copy(boosted);expired.battleSkillMode='manual';for(const u of [...expired.battle.team,...expired.battle.enemy]){u.nextAttackAt=120000;u.rage=0;}for(let i=0;i<6;i++)advanceBattle(expired,d,1000);assert.ok(expired.battle.enemy.every(u=>!u.statuses.some(x=>x.id==='guard')));} 
 const resumed=reload(boosted),sliced=copy(boosted);for(let i=0;i<40&&!resumed.battle.outcome;i++)advanceBattle(resumed,d,50);for(let i=0;i<2&&!sliced.battle.outcome;i++)advanceBattle(sliced,d,1000);assert.deepEqual(resumed,sliced);
}

// A level-25 party with unstrengthened gear exercises the entry rank at ordinary progression.
// Its observed result is reported; a loss must keep the commission and must not award patrol prizes.
let ordinary=copy(built);ordinary.camp.deployment=200;ordinary.growth={version:1,skills:{},mounts:{}};
for(const id of ordinary.team)Object.assign(ordinary.heroes[id],{level:25,quality:0,exp:0});for(const e of ordinary.equipment)e.plus=0;
ordinary=act(ordinary,'chroniclePatrol',{region:'forest',rank:1});ordinary=start(ordinary,'forest',3);const ordinaryPrizes={material_choice:amount(ordinary,'material_choice'),immortal_seal:amount(ordinary,'immortal_seal')};
let ordinaryOutcome='victory';
while(ordinary.realm.trek&&ordinary.realm.trek.node<5){ordinary=pickBoon(ordinary);const choices=ordinary.realm.trek.route[ordinary.realm.trek.node],kind=choices.find(k=>['event','camp','trade','cache'].includes(k))||choices[0];ordinary=act(ordinary,'journeyNode',{kind,choice:{event:'rescue',camp:'rest',trade:'pass',cache:'arms'}[kind]});if(ordinary.battle){for(let i=0;i<180&&!ordinary.battle.outcome;i++)advanceBattle(ordinary,d,1000);ordinaryOutcome=ordinary.battle.outcome;ordinary=act(ordinary,'finishBattle');}}
if(ordinaryOutcome==='victory'){ordinary=act(ordinary,'journeyReturn');assert.equal(record(ordinary).patrol,1);}else {assert.equal(record(ordinary).patrol,0);assert.equal(chronicle(ordinary).active.rank,1);for(const [id,n] of Object.entries(ordinaryPrizes))assert.equal(amount(ordinary,id),n);assert.deepEqual(reload(ordinary),ordinary);}

// Real first-clear and repeat patrols earn exactly the published rewards and fund all forge steps.
let veteran=built;unchanged(veteran,'chronicleForge',{region:'forest'});
const missingGear=copy(veteran);record(missingGear).patrol=2;unchanged(missingGear,'chronicleForge',{region:'forest'},/装备/);
for(const rank of [0,9,1.5,'1'])unchanged(veteran,'chroniclePatrol',{region:'forest',rank});
veteran=act(veteran,'journeyExchange',{region:'forest',choice:'gear'});const routeGear=veteran.equipment.find(e=>e.item===CHRONICLES.forest.equipment);veteran=act(veteran,'equip',{id:routeGear.uid,hero:'baisheng'});
for(let rank=1;rank<=8;rank++){
 veteran=patrol(veteran,rank);
 const step=FORGE_STEPS[record(veteran).forged];
 if(step&&rank===step.rank){
  while(routeBalance(veteran,'forest')<step.marks)veteran=patrol(veteran,rank);
  const before=copy(veteran);for(const field of ['iron','silver','marks']){const poor=copy(veteran);if(field==='iron')poor.inventory.iron=step.iron-1;else if(field==='silver')poor.player.silver=step.silver-1;else poor.realm.journey.rewards.spent.forest=poor.realm.journey.rewards.earned.forest-step.marks+1;unchanged(poor,'chronicleForge',{region:'forest'});}
  assert.equal(chronicleForgeQuote(veteran,'forest').reason,'');veteran=act(veteran,'chronicleForge',{region:'forest'});assert.equal(record(veteran).forged,record(before).forged+1);assert.equal(routeBalance(before,'forest')-routeBalance(veteran,'forest'),step.marks);assert.equal(before.inventory.iron-veteran.inventory.iron,step.iron);assert.equal(before.player.silver-veteran.player.silver,step.silver);assert.equal(chronicleGearMultiplier(veteran,CHRONICLES.forest.equipment),1+.15*record(veteran).forged);assert.ok(attributes(veteran,'baisheng',d).attack>attributes(before,'baisheng',d).attack);assert.deepEqual(attributes(veteran,'linchong',d),attributes(before,'linchong',d));assert.deepEqual(reload(veteran),veteran);
 }
}
assert.equal(record(veteran).patrol,8);assert.equal(record(veteran).forged,3);unchanged(veteran,'chronicleForge',{region:'forest'});unchanged(veteran,'chroniclePatrol',{region:'forest',rank:9});
for(const rank of [1,4,8])veteran=patrol(veteran,rank);
for(const region of ['water','mountain'])veteran=patrol(veteran,1,region);
assert.deepEqual(reload(veteran),veteran);
// A route blueprint applies to every owned copy, while ordinary gear remains unchanged.
const copies=copy(veteran);for(const e of copies.equipment)if(e.hero==='linchong'&&d.by.equipments[e.item].type==='weapon')e.hero=null;copies.equipment.push({uid:'eq_'+copies.nextEquipment++,item:CHRONICLES.forest.equipment,plus:5,hero:'linchong'});const unForged=copy(copies);record(unForged).forged=0;
for(const id of ['linchong','baisheng']){assert.ok(attributes(copies,id,d).attack>attributes(unForged,id,d).attack);assert.ok(attributes(copies,id,d).speed>attributes(unForged,id,d).speed);}assert.deepEqual(attributes(copies,'wangjin',d),attributes(unForged,'wangjin',d));assert.deepEqual(reload(copies),copies);
console.log('Ordinary level-25 / +0 gear / 200-troop patrol rank 1: '+ordinaryOutcome);
console.log('Chronicle PASS: nine actual story journeys and project rewards, objective/tier/region gates, atomic resource failures, cancellation/no retroactive jobs, persistent healing/rage, all patrol rank multipliers, portable deterministic combat, real first/repeat patrol rewards, three mark-funded forge steps and global equipped-attribute effects.');



