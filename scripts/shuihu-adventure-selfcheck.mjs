import {delveOption} from '../public/game/js/delve-events.js';
import assert from 'node:assert/strict';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {PERSONAL} from '../public/game/js/expansion-data.js';
import {adventurePreserved} from '../public/game/js/adventure-save.js';
import {honors,recordBuildFeats,selectedHonor} from '../public/game/js/adventure.js';
import {BUILD_GUIDES} from '../public/game/js/tactics-data.js';
import {journeyAbsorb} from '../public/game/js/journey-combat.js';
import {newEquipment} from '../public/game/js/item.js';
import {recommendedHolder,lootHighlights} from '../public/game/js/loot-ui.js';
import {tacticsAfterHit,tacticsHealing} from '../public/game/js/tactics-combat.js';
import {reportHealing,reportDamage} from '../public/game/js/debrief.js';
const copy=structuredClone,round=s=>assert.deepEqual(gameSnapshot(s,d),s);
function finish(s){s=act(s,'battleSkillMode',{mode:'auto'});for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);assert.equal(s.battle.outcome,'victory');return act(s,'finishBattle');}
export function adventureFixtures(){const samples=[];
 for(const id of ['mine','marsh','ruins']){let s=fixture(670,30),stamina=s.player.stamina,food=s.camp.food;s=act(s,'delveStart',{id,tier:1});const states=[copy(s)];round(s);assert.throws(()=>act(s,'team',{ids:['linchong']}));s=finish(s);states.push(copy(s));round(s);assert.equal(s.adventure.run.stage,1);assert.throws(()=>act(s,'finishBattle'));const previous=copy(s);s=act(s,'delveChoose',{id:'rescue'});assert.equal(s.battle.context.route,delveOption(previous.adventure.run,'rescue').route);round(s);s=finish(s);round(s);s=act(s,'delveChoose',{id:'cache'});s=finish(s);assert.equal(s.adventure.run,null);assert.equal(s.adventure.clears[id+'_1'],1);assert.equal(s.player.stamina,stamina);assert.equal(s.camp.food,food);round(s);states.push(copy(s));assert.equal(adventurePreserved(s,previous),false);samples.push(states);}
 let s=act(fixture(671,30),'delveStart',{id:'mine',tier:1});s=finish(s);const items=copy(s.inventory);s=act(s,'delveLeave');assert.deepEqual(s.inventory,items);round(s);assert.throws(()=>act(s,'delveChoose',{id:'rest'}));
 s=act(fixture(672,30),'delveStart',{id:'mine',tier:1});s=act(s,'battleRetreat');s=act(s,'finishBattle');assert.equal(s.adventure.run,null);round(s);
 for(const [id,m]of Object.entries(PERSONAL).filter(([,m])=>m.introduced===6)){let s=fixture(673,20);Object.assign(s.heroes[id],{status:'owned',level:20});s.team=[id,'linchong',m.healing?'wangjin':'baisheng'];s.battleSkillMode='auto';s=act(s,'personalStart',{id});const start=copy(s);s=finish(s);console.log('Personal',id,s.expansion.personal[id],s.lastBattle.metrics.heroes[id]);assert.equal(s.expansion.personal[id],true);round(s);samples.push([start,s]);}
 let fresh=fixture(674,20),before=copy(fresh);newEquipment(fresh,'field_bandage');assert.equal(recommendedHolder(fresh,d,fresh.equipment.at(-1)),'baisheng');assert.equal(lootHighlights(before,fresh,d)[0].rare,true);
 assert.equal(honors(fresh).some(h=>h.done),false);assert.throws(()=>act(fresh,'badgeSelect',{id:'master'}));

 const wear=(s,id,item)=>{const e=newEquipment(s,item);for(const old of s.equipment)if(old.hero===id&&d.by.equipments[old.item].type===d.by.equipments[item].type)old.hero=null;e.hero=id;};
 // Real encounters prove each build record can be earned, then survives exports and title selection.
 for(const [key,m]of Object.entries(BUILD_GUIDES)){
 let s=fixture(557,25);s.battleSkillMode='auto';s.specialDungeons={version:1,clears:{mine_1:5,marsh_1:5,ruins_1:5,mine_2:5,marsh_2:5,ruins_2:5},last:{id:'ruins',tier:1,outcome:'victory',at:s.clock,drops:[]}};s.team=[...m.heroes];for(const id of s.team){Object.assign(s.heroes[id],{status:'owned',level:25});for(const item of ['chain_armor','iron_helmet','leather_belt','swift_boots'])wear(s,id,item);}for(const item of m.gear)wear(s,key==='interrupt'?'yanqing':key==='cleanse'&&item==='reed_medicine_case'?'andaoquan':s.team[0],item);
 s=finish(act(s,'specialStart',{id:m.trial,tier:1}));const states=[];
 for(let n=0;n<3;n++){s=act(s,'specialStart',{id:m.trial,tier:2});if(key==='interrupt')s=act(s,'battleOrder',{kind:'reserve',value:true});s=finish(s);console.log('Honor',key,s.adventure?.feats,s.lastBattle.tacticsReport.counts);round(s);states.push(copy(s));}
 const badge=key==='cleanse'?'medic':key;assert.equal(s.adventure.feats[badge].count,3);s=act(s,'badgeSelect',{id:badge});assert.ok(selectedHonor(s));round(s);states.push(s);samples.push(states);
 }
 // Isolated hit/heal hooks: no trait before its condition, cooldown, and no overheal in accounting.
 let test=fixture(679,25);for(const item of ['field_bandage','thorn_coat','watchman_blade'])wear(test,'baisheng',item);test=act(test,'specialStart',{id:'mine',tier:1});const b=test.battle,u=b.team.find(u=>u.id==='baisheng'),t=b.team[0],enemy=b.enemy[0],api={reportHealing,reportDamage,absorb:journeyAbsorb};
 t.hp=100;const initial=t.hp;reportHealing(b,u,10,t);t.hp+=10;assert.ok(t.hp>initial+10);const gained=t.hp;reportHealing(b,u,10,t);t.hp+=10;assert.equal(t.hp,gained+10,'fieldcare cooldown');assert.equal(b.metrics.heroes.baisheng.healing,t.hp-initial,'actual healing including fieldcare');
 u.hp=Math.floor(u.maxHp*.3);u.statuses=[{id:'poison',value:1,expiresAt:10000,nextTickAt:2000}];tacticsAfterHit(b,enemy,u,true,1,api,false);assert.ok(!u.statuses.some(v=>v.id==='poison'));assert.ok(u.statuses.some(v=>v.id==='guard'));const hp=enemy.hp;tacticsAfterHit(b,u,enemy,true,1,api,false);assert.equal(enemy.hp,hp);enemy.statuses=[{id:'weaken',value:.1,expiresAt:10000}];tacticsAfterHit(b,u,enemy,true,1,api,false);assert.ok(enemy.hp<hp);const once=enemy.hp;tacticsAfterHit(b,u,enemy,true,1,api,false);assert.equal(enemy.hp,once);
 const invalid=copy(samples[0][1]);invalid.adventure.run.hp.linchong=10001;assert.throws(()=>gameSnapshot(invalid,d));invalid.adventure.run=null;invalid.adventure.badge='counter';assert.throws(()=>gameSnapshot(invalid,d));
 return samples;
}
if(process.argv[1]?.endsWith('shuihu-adventure-selfcheck.mjs')){adventureFixtures();console.log('Adventure loop PASS');}
