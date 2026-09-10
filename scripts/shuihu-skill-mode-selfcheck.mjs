import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {startBattle,advanceBattle,addStatus,castSkill,setBattleSkillMode,battleSkillMode} from '../public/game/js/battle.js';
import {parseSave} from '../public/game/js/save.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const data=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))])));
function fixture(){
  const s=newGame(data,Date.now(),31415);s.team=['wusong','baisheng'];for(const id of s.team)s.heroes[id].status='owned';
  s.inventory.jinchuangyao=10;s.inventory.huiqisan=10;s.inventory.jiedudan=10;
  startBattle(s,data,{enemies:['bandit_chief'],context:{type:'event',id:'road_bandits'}});
  for(const u of [...s.battle.team,...s.battle.enemy]){u.maxHp=10000;u.hp=10000;u.attack=20;u.defense=50;u.nextAttackAt=8000;u.rage=100;}
  return s;
}
function advance(s,ms,step=1000,d=data){while(ms>0){const n=Math.min(ms,step);advanceBattle(s,d,n);ms-=n;}return s;}
const autoCount=s=>s.battle.log.filter(t=>t.includes('【自动技能】')).length;
const manual=fixture(),legacy=structuredClone(manual);delete legacy.battleSkillMode;
for(const s of [manual,legacy]){assert.equal(battleSkillMode(s),'manual');advance(s,7000);assert.equal(autoCount(s),0);assert.equal(s.battle.team[0].rage,100);}
assert.equal(battleSkillMode(parseSave(JSON.stringify(legacy),data)),'manual');
const chosen=fixture(),before=JSON.stringify(chosen);
const automatic=dispatch(data,chosen,{type:'battleSkillMode',mode:'auto'},chosen.clock);
assert.equal(JSON.stringify(chosen),before,'Mode selection is transactional');assert.equal(automatic.battleSkillMode,'auto');assert.equal(automatic.battle.elapsed,0);assert.equal(automatic.battle.team[0].rage,100,'Selecting mode does not cast while paused');
const once=automatic.battle.log.length;setBattleSkillMode(automatic,'auto');assert.equal(automatic.battle.log.length,once,'No repeated selection log');
const inventory=structuredClone(automatic.inventory);advance(automatic,1);assert.equal(autoCount(automatic),1);assert.equal(automatic.battle.team[0].rage,40);assert.equal(automatic.battle.team[0].skillReadyAt,5000);assert.equal(automatic.battle.team[1].rage,100,'No healing an uninjured team');
assert.deepEqual(automatic.inventory,inventory);assert.ok(automatic.battle.log.some(t=>t.includes('【0.0秒】【自动技能】武松')));
automatic.battle.team[0].rage=100;advance(automatic,4998);assert.equal(autoCount(automatic),1);advance(automatic,1);assert.equal(autoCount(automatic),2);assert.equal(automatic.battle.team[0].skillReadyAt,10000,'Auto skills fire exactly when cooldown ends, without waiting for the next basic attack');
const stunned=fixture();setBattleSkillMode(stunned,'auto');addStatus(stunned.battle.team[0],{id:'stun',turns:1,value:0},0);advance(stunned,1999);assert.equal(autoCount(stunned),0);advance(stunned,1);assert.equal(autoCount(stunned),1);assert.equal(stunned.battle.team[0].skillReadyAt,7000);
const poisoned=fixture();setBattleSkillMode(poisoned,'auto');poisoned.battle.team[0].rage=0;addStatus(poisoned.battle.team[0],{id:'poison',turns:2,value:100},0);advance(poisoned,2000);assert.equal(poisoned.battle.team[0].hp,10000);assert.equal(poisoned.battle.team[1].rage,50);assert.ok(poisoned.battle.log.some(t=>t.includes('白胜施展【乡路照应】')));
const dead=fixture();dead.battle.team[0].hp=0;setBattleSkillMode(dead,'auto');advance(dead,7000);assert.equal(autoCount(dead),0,'Dead units cannot cast or be resurrected by normal heals');
const poor=fixture();poor.battle.team[0].rage=59;setBattleSkillMode(poor,'auto');advance(poor,7999);assert.equal(autoCount(poor),0);assert.equal(poor.battle.team[0].rage,59);
const override=fixture();setBattleSkillMode(override,'auto');castSkill(override,data,'wusong','wusong_active');const cost=override.battle.team[0].rage,cd=override.battle.team[0].skillReadyAt;advance(override,1000);assert.equal(override.battle.team[0].rage,cost);assert.equal(override.battle.team[0].skillReadyAt,cd);assert.equal(autoCount(override),0,'Manual input and automation share a cooldown');
const toggled=fixture();setBattleSkillMode(toggled,'auto');advance(toggled,1);toggled.battle.team[0].rage=100;setBattleSkillMode(toggled,'manual');const modeLog=toggled.battle.log.length;advance(toggled,6000);assert.equal(autoCount(toggled),1);assert.equal(toggled.battle.team[0].rage,100);assert.equal(toggled.battle.team[0].skillReadyAt,5000,'Switching never resets cooldown');assert.ok(toggled.battle.log.length>=modeLog);
setBattleSkillMode(toggled,'auto');advance(toggled,1);assert.equal(autoCount(toggled),2);assert.equal(toggled.battle.team[0].skillReadyAt,11001);
const simultaneous=fixture();setBattleSkillMode(simultaneous,'auto');simultaneous.battle.team[0].hp-=200;advance(simultaneous,1);assert.equal(autoCount(simultaneous),2);assert.ok(simultaneous.battle.log.filter(t=>t.includes('【自动技能】'))[0].includes('武松'));assert.ok(simultaneous.battle.log.filter(t=>t.includes('【自动技能】'))[1].includes('白胜'));
const multi=fixture(),multiData=structuredClone(data);multiData.by.skills.combo_second={...multiData.by.skills.wusong_active,id:'combo_second',name:'测试第二招'};multi.battle.team[0].skills=[...multi.battle.team[0].skills,'combo_second'];setBattleSkillMode(multi,'auto');advance(multi,1,1,multiData);assert.equal(autoCount(multi),1,'At most one cast per hero per decision');assert.ok(!multi.battle.log.some(t=>t.includes('测试第二招')));
for(const seed of [1,31415,87654321]){
  const a=fixture();a.rng=seed;for(const u of [...a.battle.team,...a.battle.enemy]){u.maxHp=100000;u.hp=90000;}setBattleSkillMode(a,'auto');addStatus(a.battle.team[0],{id:'stun',turns:2,value:0},0);addStatus(a.battle.team[1],{id:'poison',turns:2,value:35},0);
  const b=structuredClone(a),c=structuredClone(a);advance(a,30000,1);advance(b,30000,237);advance(c,30000,1000);assert.deepEqual(a,b);assert.deepEqual(b,c,'Independent of UI timer slice sizes');
}
const won=fixture();won.battle.enemy[0].hp=1;setBattleSkillMode(won,'auto');advance(won,1);assert.equal(won.battle.outcome,'victory');assert.equal(autoCount(won),1);const final=JSON.stringify(won);advance(won,5000);assert.equal(JSON.stringify(won),final);
const settled=dispatch(data,won,{type:'finishBattle'},won.clock);assert.equal(settled.battleSkillMode,'auto');assert.equal(settled.stats.battleWin,1);assert.throws(()=>dispatch(data,settled,{type:'finishBattle'},settled.clock));startBattle(settled,data,{enemies:['bandit'],context:{type:'event',id:'road_bandits'}});assert.equal(battleSkillMode(settled),'auto','Next battle retains the per-save choice');
for(const mode of ['all','AUTO',null,true,{},1]){const s=fixture(),raw=JSON.stringify(s);assert.throws(()=>dispatch(data,s,{type:'battleSkillMode',mode},s.clock));assert.equal(JSON.stringify(s),raw);assert.throws(()=>parseSave(JSON.stringify({...s,battleSkillMode:mode}),data));}
assert.throws(()=>setBattleSkillMode(won,'manual'));assert.throws(()=>setBattleSkillMode(newGame(data),'auto'));
for(const s of [automatic,stunned,poisoned,dead,poor,override,toggled,won,settled]){
  assert.deepEqual(parseSave(JSON.stringify(s),data),s);assert.deepEqual(gameSnapshot(s,data),s);
  const copy=importSave(exportSave(s,{id:1,name:'技能模式测试'},data),data).state;assert.equal(copy.battleSkillMode,'auto');assert.deepEqual(copy,s);
}
const offline=dispatch(data,automatic,{type:'refresh'},automatic.clock+86400000);assert.deepEqual(offline.battle,automatic.battle,'Offline time never casts skills');
const ui=render({state:automatic,data,view:'map',battlePaused:true});for(const t of ['手动技能','自动技能','aria-pressed="true"','药品始终手动','本档记住选择','交战已暂停'])assert.ok(ui.includes(t));
assert.equal(data.config.version,2);
console.log('Shuihu skill modes: manual default/legacy, deterministic automation, cooldown/stun/rage/target gates, healing, manual override, mode switch, victory, no automatic medicines, save/export parity and paused UI passed.');
