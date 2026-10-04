
import assert from 'node:assert/strict';
import {d,fixture,act,win} from './shuihu-campaign-fixtures.mjs';
import {newEquipment} from '../public/game/js/item.js';
import {advanceBattle,castSkill} from '../public/game/js/battle.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {PERSONAL} from '../public/game/js/expansion-data.js';
import {GEAR_TRAITS,BUILD_GUIDES} from '../public/game/js/tactics-data.js';
import {refineQuote} from '../public/game/js/equipment-refine.js';
import {tacticsGoal} from '../public/game/js/tactics-goals.js';
import {tacticsAfterHit,tacticsHealing,tacticsInterrupt} from '../public/game/js/tactics-combat.js';
import {reportDamage,reportHealing} from '../public/game/js/debrief.js';
import {journeyAbsorb} from '../public/game/js/journey-combat.js';
import {prepareSortie} from '../public/game/js/sortie.js';
const copy=structuredClone;
function ready(seed=557,level=25){let s=fixture(seed,level);s.battleSkillMode='auto';s.specialDungeons={version:1,clears:{mine_1:5,marsh_1:5,ruins_1:5,mine_2:5,marsh_2:5,ruins_2:5},last:{id:'ruins',tier:1,outcome:'victory',at:s.clock,drops:[]}};s.inventory.scrap_iron=500;return s;}
function wear(s,hero,id){const e=newEquipment(s,id);for(const old of s.equipment)if(old.hero===hero&&d.by.equipments[old.item].type===d.by.equipments[id].type)old.hero=null;e.hero=hero;return e;}
const api={reportDamage,reportHealing,absorb:journeyAbsorb};
const invalid=(s,f)=>{const bad=copy(s);f(bad);assert.throws(()=>gameSnapshot(bad,d));};
for(const [id,m]of Object.entries(BUILD_GUIDES)){
 let s=ready(557,25);s.team=[...m.heroes];for(const h of s.team)Object.assign(s.heroes[h],{status:'owned',level:25});
 for(const h of s.team)for(const eq of ['chain_armor','iron_helmet','leather_belt','swift_boots'])wear(s,h,eq);
 if(id==='counter')for(const eq of m.gear)wear(s,s.team[0],eq);
 if(id==='interrupt')for(const eq of ['skirmish_blade','skirmish_coat','skirmish_tally'])wear(s,'yanqing',eq);
 if(id==='cleanse')wear(s,'andaoquan','reed_medicine_case');
 if(id!=='counter')s=win(act(s,'specialStart',{id:m.trial,tier:1}));const before=copy(s);s=act(s,'specialStart',{id:m.trial,tier:id!=='counter'?2:1});if(id==='interrupt')s=act(s,'battleOrder',{kind:'reserve',value:true});
 const whole=copy(s),sliced=copy(s);for(let i=0;i<20&&!whole.battle.outcome;i++)advanceBattle(whole,d,1000);for(let i=0;i<80&&!sliced.battle.outcome;i++)advanceBattle(sliced,d,250);assert.deepEqual(whole,sliced,'timer slicing '+id);
 for(let i=0;i<12&&!s.battle.outcome;i++)advanceBattle(s,d,1000);const loaded=gameSnapshot(s,d);assert.deepEqual(loaded,s,'resume '+id);
 for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory',id);assert.ok(Object.values(s.battle.tactics.counts).some(n=>n>0),'actual trait activation '+id);
 console.log('Build battle',id,s.battle.elapsed,s.battle.tactics.counts);
 invalid(s,x=>x.battle.tactics.gear[s.team[0]][0]={item:'constructor',rank:0});
 s=act(s,'finishBattle');assert.deepEqual(s.player,before.player);assert.deepEqual(s.camp,before.camp);assert.ok(Object.keys(s.lastBattle.tacticsReport.counts).length);
}
// Direct event checks exercise guard/cleanse cooldowns without relying on lucky targeting.
let s=ready();for(const id of Object.keys(GEAR_TRAITS)){if(['bastion_spear','bastion_armor','bastion_mirror'].includes(id))wear(s,'linchong',id);}wear(s,'baisheng','reed_medicine_case');s=act(s,'specialStart',{id:'minechief',tier:1});const b=s.battle,u=b.team[0],enemy=b.enemy[0];u.statuses.push({id:'guard',value:.2,expiresAt:4000});const hp=enemy.hp;
tacticsAfterHit(b,enemy,u,true,1,api,true);assert.ok(enemy.hp<hp);const after=enemy.hp;tacticsAfterHit(b,enemy,u,true,1,api,true);assert.equal(enemy.hp,after,'counter cooldown');
const medic=b.team[1];u.statuses.push({id:'poison',value:4,expiresAt:6000,nextTickAt:2000});tacticsHealing(b,medic,u,0);assert.ok(u.statuses.some(x=>x.id==='poison'));tacticsHealing(b,medic,u,20);assert.ok(!u.statuses.some(x=>x.id==='poison'));assert.ok(u.statuses.some(x=>x.id==='guard'));
// Personal rewards do not exist before completion, and shared effects do not stack twice.
{
 const make=()=>{const test=copy(b);test.tactics={version:1,gear:{},cooldowns:{},counts:{}};test.expansion={personal:[]};test.elapsed=0;return test;};
 let test=make(),healer=test.team[0],patient=test.team[1];healer.id='songjiang';patient.rage=0;tacticsHealing(test,healer,patient,50);assert.equal(patient.rage,0,'unearned reward');
 test.expansion.personal=['songjiang'];tacticsHealing(test,healer,patient,0);assert.equal(patient.rage,0,'no overheal reward');tacticsHealing(test,healer,patient,50);assert.equal(patient.rage,6);tacticsHealing(test,healer,patient,50);assert.equal(patient.rage,6,'personal cooldown');test.elapsed=6000;tacticsHealing(test,healer,patient,50);assert.equal(patient.rage,12);
 test=make();const striker=test.team[0],foe=test.enemy[0];striker.id='yanqing';striker.hp=striker.maxHp-200;test.expansion.personal=['yanqing'];test.tactics.gear.yanqing=[{item:'skirmish_blade',rank:0},{item:'skirmish_coat',rank:0},{item:'skirmish_tally',rank:0},{item:'vault_strategy',rank:0}];
 tacticsInterrupt(test,striker,foe,api);assert.equal(test.tactics.counts.yanqing_skirmish_blade,1);assert.equal(test.tactics.counts.yanqing_personal,undefined,'same kind not doubled');assert.equal(test.tactics.counts.yanqing_skirmish_coat,1);assert.equal(test.tactics.counts.yanqing_skirmish_tally,1);assert.equal(foe.statuses.find(s=>s.id==='weaken').value,.2);
 const health=striker.hp,damage=foe.hp;tacticsInterrupt(test,striker,foe,api);assert.equal(striker.hp,health);assert.equal(foe.hp,damage);
 test=make();const breaker=test.team[0],shielded=test.enemy[0];test.tactics.gear[breaker.id]=[{item:'furnace_hammer',rank:3}];shielded.statuses=[{id:'guard',value:.2,expiresAt:12000}];tacticsAfterHit(test,breaker,shielded,true,10,api,false);assert.equal(shielded.statuses.length,0);const until=test.tactics.cooldowns[breaker.id+'_furnace_hammer'];assert.equal(until,Math.round(8000/1.45));shielded.statuses=[{id:'guard',value:.2,expiresAt:12000}];test.elapsed=until-1;tacticsAfterHit(test,breaker,shielded,true,10,api,false);assert.equal(shielded.statuses.length,1);test.elapsed=until;tacticsAfterHit(test,breaker,shielded,true,10,api,false);assert.equal(shielded.statuses.length,0);
}
// Explicit duplicate and inventory safeguards.
s=ready();const target=wear(s,'linchong','bastion_spear'),locked=newEquipment(s,target.item);locked.locked=true;s.commandVersion=1;const upgraded=newEquipment(s,target.item);upgraded.plus=1;assert.ok(refineQuote(s,target.uid).reason);const material=newEquipment(s,target.item),gold=s.player.silver;assert.throws(()=>act(s,'equipRefine',{id:target.uid,material:locked.uid}));
s=act(s,'equipRefine',{id:target.uid,material:material.uid});assert.equal(s.equipment.find(e=>e.uid===target.uid).refine,1);assert.equal(s.player.silver,gold-100);assert.ok(!s.equipment.some(e=>e.uid===material.uid));assert.ok(s.equipment.some(e=>e.uid===locked.uid));assert.throws(()=>act(s,'equipRefine',{id:target.uid,material:material.uid}));
for(let i=2;i<=3;i++){const extra=newEquipment(s,target.item);s=act(s,'equipRefine',{id:target.uid,material:extra.uid});}assert.match(refineQuote(s,target.uid).reason,/三阶/);invalid(s,x=>x.equipment.find(e=>e.uid===target.uid).refine=4);
const q=prepareSortie(s,d,{type:'specialStart',id:'minechief',tier:1});assert.equal(q.reason,'');assert.deepEqual(q.next.battle.tactics.gear.linchong,[{item:'bastion_spear',rank:3}]);assert.equal(s.battle,null);
// Goal state survives projection, and only owned personal tasks can be tracked.
for(const kind of ['build','gear','personal']){const id=kind==='build'?'counter':kind==='gear'?'reed_medicine_case':'linchong';s=act(s,'goalSet',{kind,id});assert.ok(tacticsGoal(s,d,s.development.goal).steps.length);}
assert.throws(()=>act(s,'goalSet',{kind:'craft',id:'reed_medicine_case'}));assert.throws(()=>act(s,'goalSet',{kind:'build',id:'constructor'}));
// Six real victories must meet their specified objectives; no synthetic completion flags.
for(const id of Object.keys(PERSONAL).filter(id=>PERSONAL[id].introduced===4)){
 let x=ready(723,20);Object.assign(x.heroes[id],{status:'owned',level:20});x.team=[id,'baisheng','linchong'];if(id==='songjiang')x.team=[id,'linchong','wangjin'];
 x=act(x,'personalStart',{id});for(let i=0;i<180&&!x.battle.outcome;i++)advanceBattle(x,d,1000);
 console.log('Personal trial',id,x.battle.outcome,x.battle.metrics.heroes[id]);x=act(x,'finishBattle');assert.equal(x.expansion.personal[id],true,id);assert.ok(x.journal.some(r=>r.text===undefined||r.text.includes('专属任务完成')));assert.throws(()=>act(x,'personalStart',{id}),/已经完成/);
}
console.log('Tactics PASS: real build victories, timer invariance, midfight save, trigger conditions, duplicate safety, goals and 6 personal trials.');
