import {prepareSortie} from '../public/game/js/sortie.js';
import assert from 'node:assert/strict';
import {d,fixture as baseFixture,act} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle,useBattleItem} from '../public/game/js/battle.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {SPECIAL_DUNGEONS,SPECIAL_TIERS,specialDropTable,validSpecialContext,specialPlan,enterSpecial,finishSpecial} from '../public/game/js/special-dungeons.js';
const ids=Object.keys(SPECIAL_DUNGEONS),copy=structuredClone,MAX=10000000;
const reload=s=>importSave(exportSave(s,{id:1,name:'寻宝副本回归'},d),d).state;
function fixture(seed=301,level=40){const s=baseFixture(seed,level);s.player.stamina=0;s.camp.food=0;s.camp.troops=200;s.camp.mode='army';s.battleSkillMode='auto';return gameSnapshot(s,d);}
function reject(s,type,a={},pattern){const before=copy(s);assert.throws(()=>act(s,type,a),pattern);assert.deepEqual(s,before);}
function win(s,step=1000){for(let n=0;n<180000/step&&!s.battle.outcome;n++)advanceBattle(s,d,step);assert.equal(s.battle.outcome,'victory',JSON.stringify({context:s.battle.context,team:s.battle.team.map(u=>u.hp),enemy:s.battle.enemy.map(u=>u.hp)}));return s;}
function untouched(before,after){assert.deepEqual(after.player,before.player);assert.deepEqual(after.camp,before.camp);assert.deepEqual(after.heroes,before.heroes);assert.deepEqual(after.stats,before.stats);assert.deepEqual(after.daily,before.daily);assert.deepEqual(after.recruit,before.recruit);assert.deepEqual(after.progress,before.progress);}

// Every displayed probability is the probability used by settlement. Each row is independent.
assert.equal(ids.length,3);assert.deepEqual(Object.keys(SPECIAL_TIERS),['1','2','3']);
const pool=new Set();
for(const id of ids)for(const tier of [1,2,3]){
 const rows=specialDropTable(id,tier);assert.ok(rows.length>=12);assert.equal(new Set(rows.map(r=>r.kind+':'+r.id)).size,rows.length);
 for(const r of rows){assert.ok(r.rate>0&&r.rate<1);assert.ok(Number.isInteger(r.min)&&Number.isInteger(r.max)&&r.min>=1&&r.min<=r.max);pool.add(r.kind+':'+r.id);
  assert.ok(!['recruit_order','recruit_shard','immortal_seal','dark_iron','blueprint','skill_page'].includes(r.id));if(r.kind==='equipment'){assert.ok(d.by.equipments[r.id]);assert.notEqual(d.by.equipments[r.id].source,'journey');assert.equal(r.max,1);}else assert.ok(d.by.items[r.id]);
 }
 const snapshot=copy(rows);rows[0].rate=0;rows[0].max=999;assert.deepEqual(specialDropTable(id,tier),snapshot);
 const c={type:'special',id,tier,terrain:SPECIAL_DUNGEONS[id].terrain};assert.ok(validSpecialContext(c));assert.ok(!validSpecialContext({...c,extra:1}));assert.ok(!validSpecialContext({...c,terrain:'land'}));assert.ok(!validSpecialContext({...c,tier:String(tier)}));
}
assert.ok(pool.size>=25);assert.deepEqual(specialDropTable('__proto__',1),[]);assert.ok(!validSpecialContext({type:'special',id:'__proto__',tier:1,terrain:'forest'}));

// Entry is free and transactional, including every locked difficulty and inventory limit.
let fresh=fixture();const beforePlan=copy(fresh);assert.equal(specialPlan(fresh,'mine',1).reason,'');assert.deepEqual(fresh,beforePlan);
reject(fresh,'specialStart',{id:'__proto__',tier:1});reject(fresh,'specialStart',{id:'mine',tier:'1'});reject(fresh,'specialStart',{id:'mine',tier:0});reject(fresh,'specialStart',{id:'mine',tier:4});reject(fresh,'specialStart',{id:'mine',tier:2},/上一难度/);
let low=fixture(5,4);reject(low,'specialStart',{id:'mine',tier:1},/5 级/);low=copy(fresh);delete low.camp;assert.match(specialPlan(low,'mine',1).reason,/建立寨子/);
low=copy(fresh);low.camp.buildings.hall=1;assert.match(specialPlan(low,'mine',2).reason,/聚义厅/);
const noTeam=copy(fresh);noTeam.team=[];reject(noTeam,'specialStart',{id:'mine',tier:1},/出阵/);
const needed=specialPlan(fresh,'mine',1).requiredSlots;assert.equal(needed,5);
const full=copy(fresh);while(full.equipment.length<201-needed)full.equipment.push({uid:'eq_'+full.nextEquipment++,item:'oak_staff',plus:0,hero:null});reject(full,'specialStart',{id:'mine',tier:1},/装备空位/);full.equipment.pop();assert.equal(specialPlan(full,'mine',1).reason,'');
const packed=copy(fresh);packed.inventory.scrap_iron=MAX;reject(packed,'specialStart',{id:'mine',tier:1},/材料接近存储上限/);assert.deepEqual(reload(packed),packed);

// All nine combinations are real battles. A zero-stamina, zero-food army save still sends zero troops.
let all=fresh;
for(const id of ids)for(const tier of [1,2,3]){
 const before=copy(all);all=act(all,'specialStart',{id,tier});untouched(before,all);assert.equal(all.battle.expedition.troops,0);assert.ok(all.battle.team.every(u=>u.corps.troops===0));assert.equal(all.battle.depth.terrain,SPECIAL_DUNGEONS[id].terrain);
 assert.deepEqual(reload(all),all);const ending=win(all),completed=act(ending,'finishBattle');assert.deepEqual(act(reload(ending),'finishBattle'),completed);untouched(before,completed);assert.equal(completed.specialDungeons.clears[id+'_'+tier],1);assert.equal(completed.battle,null);assert.equal(completed.lastBattle.troops,0);assert.equal(completed.specialDungeons.last.outcome,'victory');
 for(const r of completed.specialDungeons.last.drops){assert.equal(r.stored,r.count);if(r.kind==='item')assert.equal((completed.inventory[r.id]||0)-(before.inventory[r.id]||0),r.count);else assert.equal(completed.equipment.filter(e=>e.item===r.id).length-before.equipment.filter(e=>e.item===r.id).length,r.count);}
 assert.deepEqual(reload(completed),completed);reject(completed,'finishBattle');all=completed;
}
const replayBefore=all.specialDungeons.clears.mine_1;all=act(win(act(all,'specialStart',{id:'mine',tier:1})),'finishBattle');assert.equal(all.specialDungeons.clears.mine_1,replayBefore+1);

// A saved solo preset can change heroes/tactics without altering the normal army deployment.
const army=fixture(982);army.camp.mode='army';army.camp.deployment=400;const armyBefore=copy(army);
const preview=prepareSortie(army,d,{type:'specialStart',id:'mine',tier:1},{team:['wangjin','baisheng'],mode:'solo',deployment:50,tactic:'balanced'});
assert.equal(preview.reason,'');assert.equal(preview.next.camp.mode,'army');assert.equal(preview.next.camp.deployment,400);assert.deepEqual(preview.next.team,['wangjin','baisheng']);assert.equal(preview.battle.expedition.troops,0);assert.deepEqual(preview.cost,{stamina:0,food:0});assert.deepEqual(army,armyBefore);assert.deepEqual(reload(preview.next),preview.next);

// Restoring halfway through a fight preserves its opening effects, timing, RNG and loot.
const opened=act(fixture(871),'specialStart',{id:'marsh',tier:1});advanceBattle(opened,d,1000);const restored=reload(opened);const smooth=act(win(copy(opened),250),'finishBattle'),chunked=act(win(restored,1000),'finishBattle');assert.deepEqual(smooth,chunked);
const repeat=copy(smooth);assert.throws(()=>finishSpecial(repeat,d,opened.battle),/待结算/);assert.deepEqual(repeat,smooth);

// Defeat/retreat award nothing, and may be immediately retried. Medicines remain opt-in paid items.
let retreat=act(fixture(973),'specialStart',{id:'mine',tier:1});const beforeRetreat=copy(retreat);retreat=act(act(retreat,'battleRetreat'),'finishBattle');untouched(beforeRetreat,retreat);assert.deepEqual(retreat.inventory,beforeRetreat.inventory);assert.deepEqual(retreat.equipment,beforeRetreat.equipment);assert.deepEqual(retreat.specialDungeons.last.drops,[]);assert.deepEqual(retreat.specialDungeons.clears,{});assert.equal(specialPlan(retreat,'mine',1).reason,'');assert.deepEqual(reload(retreat),retreat);
let defeated=act(fixture(971),'specialStart',{id:'mine',tier:1});for(const u of defeated.battle.team)u.hp=0;advanceBattle(defeated,d,1000);assert.equal(defeated.battle.outcome,'defeat');const beforeDefeat=copy(defeated);defeated=act(defeated,'finishBattle');untouched(beforeDefeat,defeated);assert.deepEqual(defeated.inventory,beforeDefeat.inventory);assert.deepEqual(defeated.equipment,beforeDefeat.equipment);assert.deepEqual(defeated.specialDungeons.last.drops,[]);
let medicine=fixture(444);medicine.inventory.jinchuangyao=2;medicine=act(medicine,'specialStart',{id:'mine',tier:1});medicine.battle.team[0].hp-=200;useBattleItem(medicine,d,'jinchuangyao');assert.equal(medicine.inventory.jinchuangyao,1);assert.equal(medicine.battle.metrics.medicineUses,1);medicine=act(act(medicine,'battleRetreat'),'finishBattle');assert.equal(medicine.inventory.jinchuangyao,1);
let smoke=fixture(441);smoke.inventory.smoke_pack=1;smoke.expansion={version:1,recipes:[],personal:{linchong:true},combos:{},diplomacy:{},coopClaims:{},run:null,smoke:true};smoke=act(smoke,'specialStart',{id:'mine',tier:1});assert.equal(smoke.inventory.smoke_pack,1);assert.equal(smoke.expansion.smoke,true);assert.equal(smoke.battle.expansion.smoke,false);assert.ok(smoke.battle.expansion.personal.includes('linchong'));assert.deepEqual(reload(smoke),smoke);

// Monte Carlo exercises actual finishSpecial (not a second implementation of the roll).
const samples=30000,statistics=[];
for(const id of ids){const s=fixture(19073),tier=3,table=specialDropTable(id,tier),hits=Object.fromEntries(table.map(r=>[r.id,0]));let empty=0,joint=0;
 s.specialDungeons={version:1,clears:{[id+'_1']:1,[id+'_2']:1},last:null};
 for(let run=0;run<samples;run++){s.inventory={};s.equipment=[];s.journal=[];const b=s.battle={context:{type:'special',id,tier,terrain:SPECIAL_DUNGEONS[id].terrain},outcome:'victory'};const result=finishSpecial(s,d,b);if(!result.drops.length)empty++;for(const r of result.drops){const model=table.find(t=>t.id===r.id);assert.ok(r.count>=model.min&&r.count<=model.max);assert.equal(r.stored,r.count);hits[r.id]++;}if(result.drops.some(r=>r.id===table[0].id)&&result.drops.some(r=>r.id===table[1].id))joint++;}
 for(const r of table){const sigma=Math.sqrt(samples*r.rate*(1-r.rate));assert.ok(Math.abs(hits[r.id]-samples*r.rate)<7*sigma+2,id+'/'+r.id+' empirical probability');}
 const pEmpty=table.reduce((p,r)=>p*(1-r.rate),1);assert.ok(empty>0);assert.ok(Math.abs(empty-samples*pEmpty)<7*Math.sqrt(samples*pEmpty*(1-pEmpty))+2);const pJoint=table[0].rate*table[1].rate;assert.ok(Math.abs(joint-samples*pJoint)<7*Math.sqrt(samples*pJoint*(1-pJoint))+2);statistics.push({id,runs:samples,empty,expectedEmpty:Number((samples*pEmpty).toFixed(1))});
}

// Capacity safety remains non-destructive even if a caller corrupts capacity during battle.
let overflow=fixture(13);enterSpecial(overflow,d,{id:'mine',tier:1});overflow.rng=1;overflow.inventory.scrap_iron=MAX;const previousInventory=copy(overflow.inventory);overflow.battle.outcome='victory';const overflowResult=finishSpecial(overflow,d,overflow.battle);for(const [id,n]of Object.entries(previousInventory))assert.ok(overflow.inventory[id]>=n);assert.ok(overflow.inventory.scrap_iron<=MAX);assert.ok(overflowResult.drops.some(r=>r.stored<r.count));assert.equal(overflow.battle,null);
let fullEquipmentProof=false;
for(let seed=1;seed<=100&&!fullEquipmentProof;seed++){const full=fixture(seed);enterSpecial(full,d,{id:'mine',tier:1});while(full.equipment.length<200)full.equipment.push({uid:'eq_'+full.nextEquipment++,item:'oak_staff',plus:0,hero:null});const original=copy(full.equipment);full.battle.outcome='victory';const result=finishSpecial(full,d,full.battle);assert.deepEqual(full.equipment,original);assert.equal(full.battle,null);fullEquipmentProof=result.drops.some(r=>r.kind==='equipment'&&r.stored===0);}
assert.ok(fullEquipmentProof);
console.log('Special dungeon checks passed: 3 dungeons / 9 real fights / '+pool.size+' unique drops / '+samples*ids.length+' deterministic loot trials.',statistics);
