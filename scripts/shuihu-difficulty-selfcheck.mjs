import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp,attachTroops} from '../public/game/js/camp.js';
import {startBattle,advanceBattle,makeEnemyUnits} from '../public/game/js/battle.js';
import {difficultyCurve,difficultyQuote,difficultyLabel,DIFFICULTY_PROFILES} from '../public/game/js/difficulty.js';
import {storyRevisitList,storyRevisitQuote,storyRevisitUnlocked} from '../public/game/js/story-revisits.js';
import {enterSpecial} from '../public/game/js/special-dungeons.js';
import {battleOrder} from '../public/game/js/commands.js';
import {newEquipment} from '../public/game/js/item.js';
import {CHAPTER_MISSIONS} from '../public/game/js/volume-three-data.js';
import {initializeLateBattle,advanceLateWave} from '../public/game/js/late-mainline-combat.js';
import {lateMissionPlan} from '../public/game/js/late-mainline-data.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {parseSave} from '../public/game/js/save.js';
import {enemyIntel} from '../public/game/js/martial-ui.js';
import {startRealmBattle} from '../public/game/js/realm.js';
const data=prepareData(Object.fromEntries(['config',...collections].map(name=>[name,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+name+'.json',import.meta.url)))])));
const seeds=[1,9,27,81,183];
function fixture(level=25,quality=1,seed=1,gear=false){
 const s=newGame(data,Date.parse('2026-10-13T04:00:00Z'),seed);s.camp=freshCamp();s.camp.buildings={hall:5,barracks:5,clinic:5,farm:5,lumber:5,market:5};s.camp.mode='solo';s.camp.food=20000;s.camp.wood=1000;s.player.stamina=100;s.player.silver=10000;s.team=['linchong','baisheng','wusong'];s.battleSkillMode='auto';
 for(const id of s.team){Object.assign(s.heroes[id],{status:'owned',level,quality,exp:0});if(gear)for(const item of ['iron_saber','chain_armor','iron_helmet','jade']){newEquipment(s,item);Object.assign(s.equipment.at(-1),{hero:id,plus:5});}}
 s.specialDungeons={version:1,clears:{mine_1:1,mine_2:1,mine_3:1,minechief_1:1,minechief_2:1},last:null};return s;
}
function finish(s){for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,data,1000);return {outcome:s.battle.outcome,elapsed:s.battle.elapsed,hp:s.battle.team.reduce((sum,u)=>sum+u.hp/u.maxHp,0)};}
for(let level=2;level<=40;level++){
 const old=difficultyCurve(level-1),next=difficultyCurve(level);for(const key of ['hp','attack','defense','strategy','speed'])assert.ok(next[key]>old[key],key+' grows with the fixed stage level');
 assert.ok(next.hp>next.attack&&next.attack>next.defense,'Health grows faster than damage and armor');
}
assert.deepEqual(difficultyCurve(400),difficultyCurve(40),'Encounter level respects the current progression cap');
const s=fixture(15,1),boosted=fixture(40,2,1,true);
const contexts=[{type:'dungeon',id:'yezhulin'},{type:'rotation',kind:'daily',id:'silver',tier:3},{type:'rotation',kind:'weekly',id:'fortress',tier:5},{type:'special',id:'minechief',tier:3},{type:'story',id:'v7_final'},{type:'elite',id:'tide',kind:'hard'}];
const scales=[2.2,2.95,4.3,3.1,6.2,9.75];
for(const [i,c] of contexts.entries())assert.deepEqual(difficultyQuote(s,data,c,scales[i]),difficultyQuote(boosted,data,c,scales[i]),'A player upgrade cannot strengthen a fixed encounter');
for(const [family,p] of Object.entries(DIFFICULTY_PROFILES))assert.ok(p.hp!==p.attack,family+' has separate stat weights');
for(const type of ['resource','daily','weekly','special']){
 const rows=[1,2,3].map(tier=>difficultyQuote(s,data,type==='special'?{type:'special',id:'mine',tier}:{type:'rotation',kind:type==='weekly'?'weekly':'daily',id:type==='resource'?'silver':'ore',tier},type==='special'?[.72,1.65,3.1][tier-1]:type==='weekly'?.8+tier*.7:.55+(tier-1)*1.2));
 for(let i=1;i<rows.length;i++)for(const key of ['hp','attack','defense'])assert.ok(rows[i].multipliers[key]>rows[i-1].multipliers[key],type+' tiers increase '+key);
}
for(const group of ['solo','small','mortal']){let previous=null;for(const tier of [1,2,3,4,5]){const state=fixture(40,group==='mortal'?0:2),context={type:'realm',kind:'challenge',id:group,tier,terrain:'land'},quote=difficultyQuote(state,data,context,1+tier*.7);assert.ok(quote.level<=40,'Challenge recommendations stay within the playable level cap');assert.equal(quote.level,[15,20,25,30,35][tier-1]);assert.equal(quote.quality,[0,1,1,2,2][tier-1]);if(group==='mortal'){assert.equal(quote.recommendedQuality,0);assert.match(difficultyLabel(quote),/凡品/,'The mortal-only group recommends an admissible party');}startBattle(state,data,{enemies:['guard','bandit_chief'],scale:1+tier*.7,context});const units=state.battle.enemy;if(previous)for(const [i,u]of units.entries())for(const key of ['maxHp','attack','defense','strategy'])assert.ok(u[key]>previous[i][key],'Every real challenge layer increases '+key+' in '+group);previous=structuredClone(units);}}
const regular=difficultyQuote(s,data,{type:'story',id:'v3_ferry'},1.8),scouted=difficultyQuote(s,data,{type:'story',id:'v3_ferry'},1.8*.85);
for(const key of ['hp','attack','defense','strategy'])assert.ok(Math.abs(scouted.multipliers[key]/regular.multipliers[key]-.85)<1e-9,'Scouting still lowers '+key+' by 15%');
const raw=makeEnemyUnits(data,['guard'],2)[0];assert.equal(raw.maxHp,data.by.enemies.guard.attribute.hp*2);assert.equal(raw.speed,data.by.enemies.guard.attribute.speed,'Legacy enemy creation keeps the former numeric API');
const guest=fixture();startBattle(guest,data,{enemies:['tiger'],guest:{id:'wusong',level:8},context:{type:'story',id:'wusong_story',next:'settle'}});assert.equal(guest.battle.difficultyRules,undefined);for(const key of Object.keys(data.by.enemies.tiger.attribute))assert.equal(guest.battle.enemy[0][key],data.by.enemies.tiger.attribute[key],'Guest tiger stats are preserved');
assert.equal(difficultyQuote(s,data,{type:'lesson',id:'interrupt'},1).version,0,'Teaching lessons preserve their scripted enemy');
const waveState=fixture(40,2),id='v12_stay_third',p=lateMissionPlan(waveState,id,data),choice=Object.values(data.by.stories[id].steps).flatMap(step=>step.choices).find(c=>c.battle);
startBattle(waveState,data,{enemies:p.enemies,scale:p.scale,context:{type:'story',id,next:choice.next,terrain:p.terrain}});attachTroops(waveState,0);initializeLateBattle(waveState,waveState.battle,data);
const oldWave=structuredClone(waveState);delete oldWave.battle.difficultyRules;
const warmWave=fixture(40,2),warmContext={type:'replay',id:'echo_'+id,tier:1,terrain:p.terrain},warmPlan=lateMissionPlan(warmWave,warmContext.id,data,1);
startBattle(warmWave,data,{enemies:warmPlan.enemies,scale:warmPlan.scale,context:warmContext});attachTroops(warmWave,0);initializeLateBattle(warmWave,warmWave.battle,data);
function assertWarmup(warm,normal,label){for(const [i,u]of warm.enemy.entries())for(const key of ['maxHp','attack','defense','strategy'])assert.ok(Math.abs(u[key]-normal.enemy[i][key]*.65)<=1,label+' genuinely reduces '+key+' to 65%');}
assertWarmup(warmWave.battle,waveState.battle,'Initial warmup wave');for(const u of warmWave.battle.enemy)u.hp=0;warmWave.battle.elapsed=12000;assert.equal(advanceLateWave(warmWave,data,makeEnemyUnits),true);

for(const state of [waveState,oldWave]){for(const u of state.battle.enemy)u.hp=0;state.battle.elapsed=12000;assert.equal(advanceLateWave(state,data,makeEnemyUnits),true);}
assert.equal(oldWave.battle.enemy[0].maxHp,Math.round(data.by.enemies[p.waves[0][0]].attribute.hp*p.scale),'An old active battle retains legacy reinforcement stats');
assert.deepEqual(waveState.battle.enemy.map(u=>u.maxHp),makeEnemyUnits(data,p.waves[0],difficultyQuote(waveState,data,waveState.battle.context,p.scale)).map(u=>u.maxHp),'New reinforcement waves follow the initial fixed profile');
assert.equal(waveState.battle.enemy[0].nextAttackAt>12000,true);assertWarmup(warmWave.battle,waveState.battle,'Warmup reinforcements');
const realmFixture=fixture(20,1);delete realmFixture.specialDungeons;const ordinary=dispatch(data,realmFixture,{type:'realmOpen'},realmFixture.clock);ordinary.realm.relations.villages=20;const urgent=structuredClone(ordinary);startRealmBattle(ordinary,data,{id:'jingyang',kind:'raid'});startRealmBattle(urgent,data,{id:'jingyang',kind:'commission'});for(const [i,u]of urgent.battle.enemy.entries())for(const key of ['maxHp','attack','defense','strategy'])assert.ok(Math.abs(u[key]-ordinary.battle.enemy[i][key]*1.3)<=1,'The same-region urgent commission retains its 30% increase in '+key);
const saveFixture=fixture(15,1);delete saveFixture.specialDungeons;const saved=dispatch(data,saveFixture,{type:'rotationStart',kind:'daily',id:'silver',tier:2},s.clock);
assert.equal(saved.battle.difficultyRules,1);const snapshot=gameSnapshot(saved,data);assert.equal(snapshot.battle.difficultyRules,1,'New difficulty marker survives portable snapshots');assert.deepEqual(snapshot,saved);assert.deepEqual(parseSave(JSON.stringify(saved),data),saved);
const intel=enemyIntel(saveFixture,data,['road_raider','bandit'],1.75,{type:'rotation',kind:'daily',id:'silver',tier:2});for(const u of saved.battle.enemy)for(const [label,key] of [['气血','maxHp'],['攻击','attack'],['防御','defense']])assert.ok(intel.includes(label+' '+u[key]),'Passive enemy preview agrees with actual encounter '+key);assert.ok(intel.includes('建议 11 级'),'The passive preview exposes the intended stage level');
const oldSaved=structuredClone(saved);delete oldSaved.battle.difficultyRules;oldSaved.battle.enemy=makeEnemyUnits(data,['road_raider','bandit'],1.75);assert.deepEqual(parseSave(JSON.stringify(oldSaved),data).battle,oldSaved.battle,'Old active battle reload does not rescale or heal enemy units');
const reports=[];
assert.equal(difficultyQuote(s,data,{type:'dungeon',id:'immortal_trial'},3.3).quality,1,'The ascension-material stage is intended for spirit heroes, before their first immortal promotion');
for(const seed of seeds){
 const easy=fixture(5,0,seed);enterSpecial(easy,data,{id:'mine',tier:1});const er=finish(easy);assert.equal(er.outcome,'victory','Starter party can farm normal mine');assert.ok(er.elapsed>0&&er.elapsed<60000,'A strong starter party finishes normal combat promptly');
 const weak=fixture(15,0,seed);weak.heroes.wusong.level=25;enterSpecial(weak,data,{id:'mine',tier:3});assert.equal(finish(weak).outcome,'defeat','One leveled hero cannot carry an underprepared party through deep mine');
 const promoted=fixture(25,1,seed);enterSpecial(promoted,data,{id:'mine',tier:3});assert.equal(finish(promoted).outcome,'victory','Promotion makes a previously dangerous regular stage farmable');
 const rush=fixture(25,1,seed,true);enterSpecial(rush,data,{id:'minechief',tier:3});assert.equal(finish(rush).outcome,'defeat','Blind focus against the boss and healing guard is costly');
 const focused=fixture(25,1,seed,true);enterSpecial(focused,data,{id:'minechief',tier:3});battleOrder(focused,{kind:'focus',target:focused.battle.enemy.find(u=>u.model==='guard').id});const fr=finish(focused);assert.equal(fr.outcome,'victory','Removing the healing guard changes the result with identical levels and gear');
 const weekly=fixture(30,2,seed);startBattle(weekly,data,{enemies:['guard','bandit_chief','road_raider'],scale:4.3,context:{type:'rotation',kind:'weekly',id:'fortress',tier:5,period:'2026-10-4'}});assert.equal(finish(weekly).outcome,'defeat','Upper weekly floors retain a distinct challenge');
 const trained=fixture(40,2,seed,true);startBattle(trained,data,{enemies:['guard','bandit_chief','road_raider'],scale:4.3,context:{type:'rotation',kind:'weekly',id:'fortress',tier:5,period:'2026-10-4'}});const tr=finish(trained);assert.equal(tr.outcome,'victory','A prepared late game party can clear the upper weekly floor');
 const trial=fixture(30,1,seed,true),trialModel=data.by.dungeons.immortal_trial;startBattle(trial,data,{enemies:trialModel.enemy,scale:trialModel.scale,context:{type:'dungeon',id:trialModel.id}});attachTroops(trial,0);battleOrder(trial,{kind:'focus',target:trial.battle.enemy.find(u=>u.model==='guard').id});const ar=finish(trial);assert.equal(ar.outcome,'victory','A spirit party can obtain ascension materials without already owning an immortal hero');
 reports.push({seed,easyMs:er.elapsed,focusedBossMs:fr.elapsed,lateWeeklyMs:tr.elapsed,firstAscensionTrialMs:ar.elapsed});
}
const locked=newGame(data,s.clock,17);locked.camp=freshCamp();locked.camp.buildings.hall=1;assert.equal(storyRevisitUnlocked(locked,data.by.dungeons.chai_escort),false,'A low-level hall and unfinished story do not open advanced dungeons');
locked.progress.flags.chai_refuge=true;locked.location='yuncheng';assert.equal(storyRevisitList(locked,data).find(m=>m.id==='chai_escort').unlocked,true,'Completed story entrances remain listed after leaving');assert.equal(storyRevisitQuote(locked,data,'chai_escort').reward.id,data.by.rewards[data.by.dungeons.chai_escort.reward].id);
delete locked.progress.flags.chai_refuge;locked.progress.clears.chai_escort=1;assert.equal(storyRevisitUnlocked(locked,data.by.dungeons.chai_escort),true,'Historical first clears preserve access');
const hallUnlocked=newGame(data,s.clock,19);hallUnlocked.camp=freshCamp();hallUnlocked.camp.buildings.hall=3;assert.equal(storyRevisitUnlocked(hallUnlocked,data.by.dungeons.chai_escort),true,'Existing hall-level access remains available without replaying old story requirements');
console.log('Fixed encounter difficulty: separate profiles, monotonic tiers, scouting, real wins/losses, tactical focus, unchanged guest/tutorial and legacy waves; story dungeon retention passed.');console.log(JSON.stringify(reports));
