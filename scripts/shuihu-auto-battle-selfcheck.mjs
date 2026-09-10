import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {startBattle,advanceBattle,attackInterval,castSkill,skillReason,addStatus,useBattleItem,battleItemQuote,retreatBattle,BATTLE_LIMIT_MS} from '../public/game/js/battle.js';
import {parseSave,validateSave,SaveStore,SAVE_KEY,BACKUP_KEY} from '../public/game/js/save.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
export const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
export function battleFixture(){
  const s=newGame(data,Date.now(),54321);s.team=['wusong','baisheng'];
  for(const id of s.team){s.heroes[id].status='owned';s.heroes[id].level=10;}
  s.inventory.jinchuangyao=10;s.inventory.huiqisan=10;s.inventory.jiedudan=10;
  startBattle(s,data,{enemies:['bandit_chief'],context:{type:'event',id:'road_bandits'}});return s;
}
const advance=(s,ms)=>{while(ms>0){const delta=Math.min(ms,1000);advanceBattle(s,data,delta);ms-=delta;}return s;};
const tank=()=>{const s=battleFixture();for(const u of [...s.battle.team,...s.battle.enemy]){u.hp=100000;u.maxHp=100000;u.attack=10;u.defense=100;u.strategy=10;}return s;};
const fast=tank(),f=fast.battle.team[0],slow=fast.battle.enemy[0];
f.speed=1000;f.nextAttackAt=attackInterval(f);slow.speed=0;slow.nextAttackAt=attackInterval(slow);
advance(fast,2700);assert.equal(f.attacks,3);assert.equal(slow.attacks,0,'No shared turn queue');advance(fast,300);assert.equal(slow.attacks,1);
const sliced=tank(),batched=structuredClone(sliced);for(let i=0;i<40;i++)advanceBattle(sliced,data,250);advance(batched,10000);
assert.deepEqual(sliced.battle,batched.battle);assert.equal(sliced.rng,batched.rng,'Timer partitioning cannot change random results');
const automatic=tank();for(const u of automatic.battle.team)u.rage=100;const items=structuredClone(automatic.inventory);advance(automatic,20000);
assert.deepEqual(automatic.inventory,items);assert.ok(!automatic.battle.log.some(line=>/武松施展|白胜施展/.test(line)),'No friendly auto-skills');assert.equal(automatic.battle.team[0].rage,100);
const manual=tank(),hero=manual.battle.team[0];hero.rage=100;
const elapsed=manual.battle.elapsed,attackTimes=[...manual.battle.team,...manual.battle.enemy].map(u=>u.nextAttackAt),enemyHP=manual.battle.enemy[0].hp;
castSkill(manual,data,'wusong','wusong_active');assert.ok(manual.battle.enemy[0].hp<enemyHP);assert.equal(hero.rage,40);assert.equal(hero.skillReadyAt,5000);assert.equal(manual.battle.elapsed,elapsed);assert.deepEqual([...manual.battle.team,...manual.battle.enemy].map(u=>u.nextAttackAt),attackTimes);
const charged=JSON.stringify(manual);assert.throws(()=>castSkill(manual,data,'wusong','wusong_active'),/调息/);assert.equal(JSON.stringify(manual),charged);
assert.throws(()=>castSkill(manual,data,'baisheng','wusong_active'));assert.throws(()=>castSkill(manual,data,'wusong','wusong_passive'));assert.throws(()=>castSkill(manual,data,'bandit_chief_0','bandit_cut'));
hero.hp-=600;const beforeDrug=hero.hp;useBattleItem(manual,data,'jinchuangyao');assert.equal(hero.hp,beforeDrug+300);assert.equal(manual.inventory.jinchuangyao,9);assert.equal(manual.battle.elapsed,elapsed);assert.deepEqual([...manual.battle.team,...manual.battle.enemy].map(u=>u.nextAttackAt),attackTimes);
const drugged=JSON.stringify(manual);assert.throws(()=>useBattleItem(manual,data,'huiqisan'),/间隔/);assert.equal(JSON.stringify(manual),drugged);advance(manual,3000);assert.equal(manual.battle.itemReadyAt,3000);assert.ok(manual.battle.team.some(u=>u.attacks>0),'Medicine never stops basic attacks');
const healthy=battleFixture();healthy.battle.team[1].rage=100;const pristine=JSON.stringify(healthy);assert.throws(()=>useBattleItem(healthy,data,'jinchuangyao'),/暂无需要/);assert.throws(()=>castSkill(healthy,data,'baisheng','baisheng_active'),/无需恢复/);assert.equal(JSON.stringify(healthy),pristine);
healthy.battle.team[0].hp-=200;castSkill(healthy,data,'baisheng','baisheng_active');assert.equal(healthy.battle.team[0].hp,healthy.battle.team[0].maxHp);assert.equal(healthy.battle.team[1].rage,50);
const ailments=tank(),victim=ailments.battle.team[0];for(const u of [...ailments.battle.team,...ailments.battle.enemy])u.nextAttackAt=10000;
addStatus(victim,{id:'poison',turns:2,value:35},0);addStatus(victim,{id:'poison',turns:2,value:35},0);addStatus(victim,{id:'stun',turns:1,value:0},0);
assert.equal(skillReason(ailments.battle,victim,data.by.skills.wusong_active),'眩晕中');const full=victim.hp;
advance(ailments,1999);assert.equal(victim.hp,full);advance(ailments,1);assert.equal(victim.hp,full-70);assert.ok(!victim.statuses.some(s=>s.id==='stun'));
advance(ailments,2000);assert.equal(victim.hp,full-140);assert.equal(victim.statuses.length,0);
addStatus(victim,{id:'rage',turns:2,value:.2},ailments.battle.elapsed);addStatus(victim,{id:'armor_break',turns:2,value:.3},ailments.battle.elapsed);useBattleItem(ailments,data,'jiedudan');assert.deepEqual(victim.statuses.map(s=>s.id),['rage'],'Cleanse only removes harmful effects');
const dead=battleFixture();dead.battle.team[0].hp=0;dead.battle.team[0].rage=100;assert.equal(skillReason(dead.battle,dead.battle.team[0],data.by.skills.wusong_active),'已退阵');assert.ok(battleItemQuote(dead,data,'huiqisan').target.id==='baisheng');
const idle=battleFixture(),idleBattle=structuredClone(idle.battle),later=dispatch(data,idle,{type:'refresh'},idle.clock+86400000);assert.deepEqual(later.battle,idleBattle,'Real-world clock refresh does not simulate offline combat');
for(const delta of [-1,0,1.5,1001,Infinity])assert.throws(()=>advanceBattle(idle,data,delta));
assert.throws(()=>dispatch(data,idle,{type:'turn',id:'attack'}),'Old turn actions are not executable');
const ended=tank();advance(ended,BATTLE_LIMIT_MS);assert.equal(ended.battle.outcome,'retreat');assert.equal(ended.battle.elapsed,BATTLE_LIMIT_MS);const stopped=JSON.stringify(ended);advanceBattle(ended,data,1000);assert.equal(JSON.stringify(ended),stopped);assert.throws(()=>useBattleItem(ended,data,'huiqisan'));assert.throws(()=>castSkill(ended,data,'wusong','wusong_active'));
const victory=battleFixture();victory.battle.enemy[0].hp=1;victory.battle.team[0].rage=100;castSkill(victory,data,'wusong','wusong_active');assert.equal(victory.battle.outcome,'victory');const finished=dispatch(data,victory,{type:'finishBattle'},victory.clock);assert.equal(finished.stats.battleWin,1);assert.throws(()=>dispatch(data,finished,{type:'finishBattle'},finished.clock));
const retreat=battleFixture();retreatBattle(retreat);assert.equal(retreat.battle.outcome,'retreat');const collected=dispatch(data,retreat,{type:'finishBattle'},retreat.clock);assert.equal(collected.stats.battleWin||0,0);
const legacy=battleFixture();delete legacy.battle.rules;for(const u of legacy.battle.team)delete u.training;legacy.battle.round=3;delete legacy.battle.mode;delete legacy.battle.elapsed;delete legacy.battle.itemReadyAt;
for(const u of [...legacy.battle.team,...legacy.battle.enemy]){delete u.attacks;delete u.nextAttackAt;delete u.skillReadyAt;}
legacy.battle.team[0].hp-=120;legacy.battle.team[0].rage=70;legacy.battle.team[0].statuses=[{id:'poison',turns:2,value:35}];legacy.battle.log=['【第 2 回合】旧战报保留'];
const legacyRaw=JSON.stringify(legacy),upgraded=parseSave(legacyRaw,data);assert.equal(upgraded.battle.mode,'realtime');assert.equal(upgraded.battle.round,undefined);assert.equal(upgraded.battle.elapsed,0);
for(const key of ['hp','rage','attack','defense'])assert.equal(upgraded.battle.team[0][key],legacy.battle.team[0][key]);
assert.equal(upgraded.battle.team[0].statuses[0].expiresAt,4000);for(const key of ['inventory','progress','recruit','team'])assert.deepEqual(upgraded[key],legacy[key]);assert.ok(upgraded.battle.log.includes('【第 2 回合】旧战报保留'));assert.deepEqual(parseSave(JSON.stringify(upgraded),data),upgraded);
const memory=new Map([[SAVE_KEY,legacyRaw]]),store=new SaveStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},data);store.write(store.load().state);assert.equal(memory.get(BACKUP_KEY),legacyRaw);
for(const mutate of [s=>s.battle.mode='fake',s=>s.battle.elapsed=-1,s=>s.battle.team[0].nextAttackAt=-1,s=>s.battle.itemReadyAt=Infinity,s=>s.battle.team[0].skillReadyAt=-1,s=>s.battle.team[0].statuses[0].expiresAt=-1,s=>s.battle.team[0].statuses[0].nextTickAt=-1,s=>s.battle.team[1].id=s.battle.team[0].id]){const bad=structuredClone(upgraded);mutate(bad);assert.throws(()=>parseSave(JSON.stringify(bad),data));}
for(const saved of [manual,automatic,ailments,upgraded,victory,retreat]){validateSave(saved,data);assert.deepEqual(parseSave(JSON.stringify(saved),data),saved);}
const ui=render({state:battleFixture(),data,view:'map'});for(const text of ['强攻','防守','回合','type&quot;:&quot;turn'])assert.ok(!ui.includes(text));for(const text of ['正在自动交战','阵中用药','乡路照应','景阳冈','battleSkill','battleItem','ui_battlePause'])assert.ok(ui.includes(text));
assert.ok(render({state:battleFixture(),data,view:'map',battlePaused:true}).includes('交战已暂停'));
console.log('Shuihu auto battle: independent clocks, deterministic slices, no automatic skills/items, immediate manual effects, cooldowns, timed statuses, pause-safe clock, atomic results, legacy battle migration and UI passed.');
export {legacyRaw};
