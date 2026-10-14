import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {heroAptitude,aptitudeSilver} from '../public/game/js/hero-aptitude.js';
import {tierAttributes} from '../public/game/js/hero-tiers.js';
import {attributes,gainExp,recruit} from '../public/game/js/hero.js';
import {skillUpgradeQuote} from '../public/game/js/growth.js';
import {promotionQuote,QUALITIES} from '../public/game/js/quality.js';
import {startBattle} from '../public/game/js/battle.js';
import {parseSave} from '../public/game/js/save.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {hasHeroAptitudes,gameplayRulesPreserved} from '../public/game/js/gameplay-rules.js';
import {recruitmentBanner,recruitStar} from '../public/game/js/recruitment-banner.js';
import {weighted,pick} from '../public/game/js/utils.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))])));
const now=Date.parse('2026-10-14T04:00:00Z'),examples=['linchong','chaijin','tanglong','wangjin','tianmao'];
const rate={linchong:1,chaijin:.9,tanglong:.8,wangjin:1,tianmao:1},power={linchong:1.16,chaijin:1.08,tanglong:1,wangjin:1,tianmao:1};
// These prepared inventories isolate cost accounting; they are not a new-player walkthrough.
function costFixture(id){const s=newGame(d,now,581);s.camp=freshCamp();s.camp.mode='solo';s.camp.buildings.hall=4;s.player.silver=50000;s.commandVersion=1;s.team=[id];s.growth={version:1,skills:{},mounts:{}};Object.assign(s.heroes[id],{status:'owned',level:30,exp:17,quality:0});s.inventory[id+'_manual']=20;s.inventory.exp_pill=30;return s;}
const act=(s,a)=>dispatch(d,s,a,s.clock);
function noAptitudeData(id){return {...d,by:{...d.by,heroes:{...d.by.heroes,[id]:{...d.by.heroes[id],id:'aptitude_baseline'}}}};}
function unchangedFailure(s,a){const raw=JSON.stringify(s);assert.throws(()=>act(s,a));assert.equal(JSON.stringify(s),raw,'rejected '+a.type+' is fully atomic');assert.equal(hasHeroAptitudes(s),false);}
const rawDefinitions=JSON.stringify(d.heroes);
// Identical attributes and role leave only the aptitude difference: no speed bonus.
for(const level of [1,15,30]){
 const common={type:'fighter',group:'tiangang',attribute:{hp:2000,attack:200,defense:200,speed:130,strategy:200},growth:{hp:100,attack:20,defense:20,speed:4,strategy:20}};
 const baseline=tierAttributes({...common,id:'aptitude_baseline'},level);
 for(const id of ['linchong','chaijin','tanglong']){const stats=tierAttributes({...common,id},level);for(const key of ['hp','attack','defense','strategy'])assert.ok(Math.abs(stats[key]-baseline[key]*power[id])<=1,id+' '+key+' only gains its base aptitude bonus');assert.equal(stats.speed,baseline.speed);}
}
// Real character models keep quality/passives. Equipment is added after aptitude.
for(const id of examples){
 const s=costFixture(id),baselineData=noAptitudeData(id),raw=JSON.stringify(s),bare=attributes(s,id,d),oldBare=attributes(s,id,baselineData);
 assert.equal(bare.speed,oldBare.speed);if(power[id]===1)assert.deepEqual(bare,oldBare);else for(const key of ['hp','attack','defense','strategy'])assert.ok(Math.abs(bare[key]-oldBare[key]*power[id])<=2,id+' '+key+' preserves passive rounding');
 assert.equal(JSON.stringify(s),raw,'attribute reads preserve investments and do not set gameplay flags');
 const guest=attributes(s,id,d,30,false),oldGuest=attributes(s,id,baselineData,30,false);assert.deepEqual(guest,oldGuest,'temporary guests never borrow aptitude');
 s.equipment=[{uid:'eq_1',item:'oak_staff',plus:3,hero:id,locked:true}];s.nextEquipment=2;
 const geared=attributes(s,id,d),oldGeared=attributes(s,id,baselineData);
 for(const key of Object.keys(geared))assert.ok(Math.abs((geared[key]-bare[key])-(oldGeared[key]-oldBare[key]))<=1,id+' '+key+' equipment contribution is not multiplied by aptitude');
 assert.equal(hasHeroAptitudes(s),false);
}
// Currency rounding applies to silver only, with no discount for external/wanderer heroes.
for(const id of examples){assert.equal(aptitudeSilver(d.by.heroes[id],151),Math.ceil(151*rate[id]));assert.equal(aptitudeSilver(id,151),Math.ceil(151*rate[id]));}
let costActions=0;
for(const id of examples){
 const s=costFixture(id),skill=d.by.skills[d.by.heroes[id].skills[0]],q=skillUpgradeQuote(s,skill);
 assert.equal(q.reason,'');assert.equal(q.cost.silver,Math.ceil(150*rate[id]));assert.deepEqual(q.cost.items,{[id+'_manual']:1,exp_pill:1});
 const before=structuredClone(s),after=act(s,{type:'skillUpgrade',id:skill.id});costActions++;
 assert.equal(after.player.silver,before.player.silver-q.cost.silver);assert.equal(after.inventory[id+'_manual'],before.inventory[id+'_manual']-1);assert.equal(after.inventory.exp_pill,before.inventory.exp_pill-1);assert.equal(after.growth.skills[skill.id],2);assert.deepEqual(after.heroes,before.heroes);assert.deepEqual(after.equipment,before.equipment);assert.equal(after.rng,before.rng);assert.equal(hasHeroAptitudes(after),!!heroAptitude(d.by.heroes[id]));
 const q2=skillUpgradeQuote(after,skill);assert.equal(q2.cost.silver,Math.ceil(300*rate[id]));assert.deepEqual(q2.cost.items,{[id+'_manual']:2,exp_pill:2});
 for(const shortage of ['silver','manual','pill']){const bad=costFixture(id);if(shortage==='silver')bad.player.silver=q.cost.silver-1;if(shortage==='manual')bad.inventory[id+'_manual']=0;if(shortage==='pill')bad.inventory.exp_pill=0;unchangedFailure(bad,{type:'skillUpgrade',id:skill.id});}
 let promoting=costFixture(id);
 for(const quality of [1,2]){
  const quote=promotionQuote(promoting,id),core=quote.core.item;
  assert.equal(quote.cost.silver,Math.ceil(QUALITIES[quality].cost.silver*rate[id]));assert.equal(quote.core.required,quality===1?3:8);
  assert.deepEqual(quote.cost.items,{[core]:quality===1?3:8,...QUALITIES[quality].cost.items},'aptitude never discounts personal cores or common ingredients');
  for(const [item,n]of Object.entries(quote.cost.items))promoting.inventory[item]=n+7;
  assert.equal(promotionQuote(promoting,id).reason,'');
  for(const shortage of ['silver','core','common']){const bad=structuredClone(promoting);if(shortage==='silver')bad.player.silver=quote.cost.silver-1;if(shortage==='core')bad.inventory[core]=quote.core.required-1;if(shortage==='common')bad.inventory.spirit_essence=quote.cost.items.spirit_essence-1;const raw=JSON.stringify(bad);assert.throws(()=>act(bad,{type:'heroPromote',id}));assert.equal(JSON.stringify(bad),raw,'promotion shortage must preserve every resource and prior quality');}
  const previous=structuredClone(promoting);promoting=act(promoting,{type:'heroPromote',id});costActions++;
  assert.equal(promoting.heroes[id].quality,quality);assert.equal(promoting.player.silver,previous.player.silver-quote.cost.silver);for(const item of Object.keys(quote.cost.items))assert.equal(promoting.inventory[item],7);
  assert.equal(promoting.heroes[id].level,previous.heroes[id].level);assert.equal(promoting.heroes[id].exp,previous.heroes[id].exp);assert.deepEqual(promoting.growth,previous.growth);assert.deepEqual(promoting.equipment,previous.equipment);assert.equal(promoting.rng,previous.rng);assert.equal(hasHeroAptitudes(promoting),!!heroAptitude(d.by.heroes[id]));
  assert.equal(gameSnapshot(promoting,d).progress.flags.hero_aptitude_v1,promoting.progress.flags.hero_aptitude_v1);
 }
}
// Experience uses the same shared thresholds regardless of aptitude.
const experience=[];for(const id of examples){const s=costFixture(id);Object.assign(s.heroes[id],{level:10,exp:50,quality:0});gainExp(s,id,500,d);experience.push({level:s.heroes[id].level,exp:s.heroes[id].exp});assert.equal(hasHeroAptitudes(s),false);}for(const result of experience)assert.deepEqual(result,experience[0]);
// Already-owned levels, training, equipment, mounts and cultivation survive loading.
for(const id of examples){
 const old=costFixture(id);old.heroes[id].quality=1;old.growth.skills[d.by.heroes[id].skills[0]]=3;old.growth.skills[d.by.heroes[id].skills[2]]=2;old.growth.mounts[id]={rank:3,intimacy:80,riding:true};old.equipment=[{uid:'eq_1',item:'oak_staff',plus:3,hero:id,locked:true}];old.nextEquipment=2;
 const raw=JSON.stringify(old),loaded=parseSave(raw,d,now),snap=gameSnapshot(old,d),portable=importSave(exportSave(old,{id:1,name:'旧投入'},d),d).state;
 for(const saved of [loaded,snap,portable]){assert.deepEqual(saved.heroes,old.heroes);assert.deepEqual(saved.growth,old.growth);assert.deepEqual(saved.equipment,old.equipment);assert.equal(hasHeroAptitudes(saved),false);assert.ok(!Object.hasOwn(saved.heroes[id],'aptitude'));}
 assert.equal(JSON.stringify(old),raw);
}
// New formal battles mark use of aptitude. External-only teams and story guests do not.
for(const id of examples){const before=costFixture(id),after=act(before,{type:'dungeon',id:'jingyanggang'});assert.equal(hasHeroAptitudes(before),false);assert.equal(hasHeroAptitudes(after),!!heroAptitude(d.by.heroes[id]));assert.ok(after.battle);assert.equal(gameSnapshot(after,d).progress.flags.hero_aptitude_v1,after.progress.flags.hero_aptitude_v1);}
const guest=costFixture('linchong');startBattle(guest,d,{enemies:['bandit'],guest:{id:'linchong',level:30},context:{type:'event',id:d.events[0].id}});assert.equal(hasHeroAptitudes(guest),false);
// An old ongoing realtime battle keeps its saved attributes, not freshly derived aptitude.
const ongoing=costFixture('linchong');startBattle(ongoing,d,{enemies:['bandit'],context:{type:'event',id:d.events[0].id}});delete ongoing.progress.flags.hero_aptitude_v1;ongoing.battle.team[0].attack=123;ongoing.battle.team[0].defense=89;ongoing.battle.team[0].hp=Math.min(456,ongoing.battle.team[0].maxHp);
const savedBattle=structuredClone(ongoing.battle);assert.notEqual(savedBattle.team[0].attack,attributes(ongoing,'linchong',d).attack);for(const saved of [parseSave(JSON.stringify(ongoing),d,now),gameSnapshot(ongoing,d),importSave(exportSave(ongoing,{id:1,name:'旧战局'},d),d).state]){assert.deepEqual(saved.battle,savedBattle);assert.equal(hasHeroAptitudes(saved),false);}
const marked=act(costFixture('linchong'),{type:'skillUpgrade',id:'linchong_active'}),restored=importSave(exportSave(marked,{id:1,name:'资质培养'},d),d).state;
assert.ok(hasHeroAptitudes(restored));assert.ok(gameplayRulesPreserved(marked,restored));const stripped=structuredClone(restored);delete stripped.progress.flags.hero_aptitude_v1;assert.equal(gameplayRulesPreserved(marked,stripped),false);assert.equal(gameplayRulesPreserved(stripped,restored),true);
// Recruitment still consumes exactly the original RNG rolls, dated pool and pity rules.
assert.deepEqual(d.config.balance.ordinaryRates,[{star:5,weight:1},{star:4,weight:6},{star:3,weight:23},{star:2,weight:45},{star:1,weight:25}]);
const aptitudeBanner=recruitmentBanner(d,now);assert.match(aptitudeBanner.id,/-v2$/);assert.deepEqual(aptitudeBanner.headliners.map(h=>heroAptitude(h).id),['A','B','C']);assert.deepEqual(aptitudeBanner.headliners.map(h=>h.id),['sunli','xiangchong','liyun']);
let draws=0;const seen=new Set();for(const seed of [1,81,93287]){
 const s=newGame(d,now,seed);s.rng=seed;s.inventory.recruit_order=150;const banner=recruitmentBanner(d,now),reference={rng:seed,pity:{three:0,four:0,five:0}};
 for(let i=0;i<120;i++){
  let star=weighted(reference,d.config.balance.ordinaryRates).star;const pity=reference.pity;if(pity.five>=99)star=5;else if(pity.four>=49)star=Math.max(star,4);else if(pity.three>=19)star=Math.max(star,3);pity.three=star>=3?0:pity.three+1;pity.four=star>=4?0:pity.four+1;pity.five=star===5?0:pity.five+1;
  const expected=pick(reference,banner.byStar[star]);recruit(s,d);assert.equal(s.recruit.lastResult.hero,expected.id);assert.equal(recruitStar(d.by.heroes[s.recruit.lastResult.hero]),star);assert.equal(s.heroes[expected.id].status,'owned');assert.equal(s.rng,reference.rng);assert.deepEqual(s.recruit.pity,pity);assert.equal(hasHeroAptitudes(s),false,'a draw does not generate or mark a random aptitude');seen.add(star);draws++;
 }
}assert.equal(seen.size,5);assert.equal(JSON.stringify(d.heroes),rawDefinitions,'tests never modify production definitions');
console.log('Aptitude gameplay PASS: '+costActions+' real skill/promotion actions across A/B/C/external/wanderer; base-only power, unscaled equipment/speed/guests, silver-only discounts, original core3/8/ingredients/experience, atomic failures, unchanged old investments and realtime battles, actual battle flags, portable preservation, '+draws+' exact-RNG original-odds dated draws.');
