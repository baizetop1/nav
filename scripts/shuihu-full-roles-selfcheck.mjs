import assert from 'node:assert/strict';
import {d,fixture,act} from './shuihu-campaign-fixtures.mjs';
import {startBattle,advanceBattle,castSkill} from '../public/game/js/battle.js';
import {HERO_ROLES,validateRoles} from '../public/game/js/hero-roles.js';
import {EXTRA_ROLES,ROLE_PATTERNS} from '../public/game/js/hero-role-data.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {recommendLineups,roleReadiness,combatCapabilities,fullLineupAdvice} from '../public/game/js/lineup-model.js';
import {rosterSelection} from '../public/game/js/roster-ui.js';
import {prepareSortie} from '../public/game/js/sortie.js';
export const samples=[];
assert.equal(d.heroes.length,172);assert.equal(d.heroes.filter(h=>h.group!=='external').length,108);assert.deepEqual(Object.keys(HERO_ROLES).sort(),d.heroes.map(h=>h.id).sort());assert.equal(new Set(Object.values(HERO_ROLES).map(m=>m.name)).size,172);
function begin(id,terrain='land',team=[id]){const s=fixture();s.team=team;s.battleSkillMode='manual';for(const key of team)Object.assign(s.heroes[key],{status:'owned',level:30,exp:0});startBattle(s,d,{enemies:['road_raider'],context:{type:'dungeon',id:'yezhulin',terrain}});for(const u of [...s.battle.team,...s.battle.enemy])u.nextAttackAt=100000;s.battle.enemy[0].boss.readyAt=100000;s.battle.enemy[0].hp=s.battle.enemy[0].maxHp=50000;return s;}
const unit=(s,id)=>s.battle.team.find(u=>u.id===id),copy=s=>structuredClone(s),old=s=>{const v=copy(s);v.battle.roles={version:2,counts:{},cooldowns:{}};return v;};
const tick=(s,actor)=>{actor.nextAttackAt=s.battle.elapsed+1000;advanceBattle(s,d,1000);};
function damageSetup(s,id,kind,on=true){const b=s.battle,u=unit(s,id),t=b.enemy[0];if(kind==='healthy')u.hp=Math.floor(u.maxHp*(on?.9:.5));if(kind==='high')t.hp=Math.floor(t.maxHp*(on?.9:.5));if(kind==='low')t.hp=Math.floor(t.maxHp*(on?.4:.9));if(kind==='hurt')u.hp=Math.floor(u.maxHp*(on?.4:.9));if(kind==='early')b.elapsed=on?0:8000;if(kind==='late')b.elapsed=on?15000:0;if(kind==='boss'&&!on)delete t.boss;if(kind==='armor'&&on)t.statuses.push({id:'armor_break',value:1,expiresAt:b.elapsed+4000});if(kind==='control'&&on)t.statuses.push({id:'weaken',value:.1,expiresAt:b.elapsed+4000});if(kind==='guarded'&&on)u.statuses.push({id:'guard',value:.1,expiresAt:b.elapsed+4000});if(kind==='water')b.context.terrain=on?'water':'land';if(kind==='mountain')b.context.terrain=on?'mountain':'land';}
for(const [id,m]of Object.entries(EXTRA_ROLES)){
 assert.ok(ROLE_PATTERNS[m.kind],id);let s=begin(id),u=unit(s,id),t=s.battle.enemy[0],negative;
 if(m.event==='opening'){
  const team=m.kind==='opening_rear'?['baisheng',id]:[id,'baisheng'];s=begin(id,m.kind==='opening_water_rage'?'water':'land',team);u=unit(s,id);
  if(m.kind==='opening_front')assert.equal(u.statuses.find(x=>x.id==='guard').value,m.value);
  if(m.kind==='opening_rear')assert.equal(s.battle.team[0].statuses.find(x=>x.id==='guard').value,m.value);
  if(m.kind.includes('rage')||m.kind==='opening_rally')assert.ok(s.battle.team.every(x=>x.rage===m.value));
  if(m.kind==='opening_front')negative=begin(id,'land',['baisheng',id]);if(m.kind==='opening_rear')negative=begin(id,'land',[id,'baisheng']);if(m.kind==='opening_water_rage')negative=begin(id);
 }else if(m.event==='damage'){
  damageSetup(s,id,m.kind);const baseline=old(s);tick(s,u);tick(baseline,unit(baseline,id));assert.ok(s.battle.metrics.heroes[id].damage>baseline.battle.metrics.heroes[id].damage,id+' actual increased damage');
  negative=begin(id);damageSetup(negative,id,m.kind,false);tick(negative,unit(negative,id));
 }else if(m.event==='taken'){
  u.defense=0;t.attack=100;
  if(m.kind==='taken_guard')u.hp=Math.floor(u.maxHp*.4)+1;else u.statuses=[{id:'guard',value:.1,expiresAt:8000}];
  const baseline=old(s);tick(s,t);tick(baseline,baseline.battle.enemy[0]);
  if(m.kind==='taken_guard'){assert.equal(u.hp,unit(baseline,id).hp);assert.equal(u.statuses.find(x=>x.id==='guard').value,m.value);tick(s,t);tick(baseline,baseline.battle.enemy[0]);assert.ok(u.hp>unit(baseline,id).hp);}else assert.equal(u.rage,unit(baseline,id).rage+m.value);
  negative=begin(id);unit(negative,id).hp=1;tick(negative,negative.battle.enemy[0]);
 }else if(m.event==='heal'){
  s=begin(id,'land',[id,'linchong']);u=unit(s,id);const ally=s.battle.team[1];ally.hp=100;ally.rage=90;ally.statuses=[{id:'weaken',value:.1,expiresAt:4000}];u.rage=100;
  const skill=u.skills.map(k=>d.by.skills[k]).find(k=>k.type!=='passive'&&k.effect.kind==='heal');assert.ok(skill,id+' reachable healing');const baseline=old(s);castSkill(s,d,id,skill.id);castSkill(baseline,d,id,skill.id);assert.ok(s.battle.metrics.heroes[id].healing>0,id);
  if(m.kind==='heal_guard')assert.ok(ally.statuses.some(x=>x.id==='guard'&&x.value>=m.value));if(m.kind==='heal_rage')assert.ok(ally.rage>baseline.battle.team[1].rage);if(m.kind==='heal_cleanse')assert.ok(!ally.statuses.some(x=>x.id==='weaken'));
 }else if(m.event==='hit'){
  u.attacks=2;if(m.kind==='after_heal')u.hp=Math.floor(u.maxHp*.5);const baseline=old(s);tick(s,u);tick(baseline,unit(baseline,id));
  if(m.kind==='after_sunder')assert.ok(t.statuses.some(x=>x.id==='armor_break'));
  if(m.kind==='after_weaken')assert.ok(t.statuses.some(x=>x.id==='weaken'&&x.value===m.value));
  if(m.kind==='after_guard')assert.ok(u.statuses.some(x=>x.id==='guard'&&x.value===m.value));
  if(m.kind==='after_rage')assert.equal(u.rage,unit(baseline,id).rage+m.value);
  if(m.kind==='after_heal'){assert.ok(u.hp>unit(baseline,id).hp);assert.equal(u.hp-unit(baseline,id).hp,s.battle.metrics.heroes[id].healing);}
  negative=begin(id);tick(negative,unit(negative,id));
 }else if(m.event==='interrupt'){
  s=begin(id,'land',[id,'linchong']);u=unit(s,id);t=s.battle.enemy[0];t.boss.pendingAt=3000;u.rage=100;const skill=u.skills.map(k=>d.by.skills[k]).find(k=>k.training?.profile==='interrupt');assert.ok(skill,id+' reachable interrupt');castSkill(s,d,id,skill.id);assert.equal(t.boss.pendingAt,0);
  if(m.kind==='interrupt_guard')assert.ok(s.battle.team.every(x=>x.statuses.some(y=>y.id==='guard'&&y.value>=m.value)));if(m.kind==='interrupt_rage')assert.equal(s.battle.team[1].rage,m.value);if(m.kind==='interrupt_sunder')assert.ok(t.statuses.some(x=>x.id==='armor_break'));
  negative=begin(id);unit(negative,id).rage=100;castSkill(negative,d,id,skill.id);
 }
 assert.ok(s.battle.roles.counts[id]>0,id+' must actually trigger');if(negative)assert.equal(negative.battle.roles.counts[id],undefined,id+' must not trigger without condition');
 assert.deepEqual(gameSnapshot(s,d),s,id+' snapshot');const restored=importSave(exportSave(s,{id:1,name:id},d),d).state;assert.deepEqual(restored,s,id+' file roundtrip');const resume=copy(s);advanceBattle(resume,d,1000);advanceBattle(restored,d,1000);assert.deepEqual(restored,resume,id+' deterministic resume');
 const legacy=old(s);const restoredOld=importSave(exportSave(legacy,{id:1,name:'旧本领'},d),d).state;tick(restoredOld,unit(restoredOld,id));assert.equal(restoredOld.battle.roles.counts[id],undefined,id+' no retroactive v3 effects');
 const guest=fixture();startBattle(guest,d,{enemies:['bandit'],guest:{id,level:30},context:{type:'story',id:'wusong_story'}});assert.equal(guest.battle.roles,undefined,id+' guest exclusion');
 const report=act(s,'battleRetreat');const ended=act(report,'finishBattle');assert.equal(ended.lastBattle.roleReport.version,3);assert.ok(ended.lastBattle.roleReport.counts[id]>0,id+' saved report');samples.push({id,battle:s,settled:ended});
}
// Recommendations respect ownership, off-duty availability, unlock levels, context and preview immutability.
let s=fixture();for(const h of d.heroes)Object.assign(s.heroes[h.id],{status:'owned',level:30,exp:0});s.team=['linchong','baisheng','wangjin'];let q=prepareSortie(s,d,{type:'campRaid',id:'woods'});const before=JSON.stringify(s),teams=recommendLineups(s,d,q.battle);assert.ok(teams.length>=3);for(const r of teams){assert.equal(new Set(r.team).size,3);assert.ok(r.team.every(id=>s.heroes[id].status==='owned'));assert.equal(prepareSortie(s,d,{type:'campRaid',id:'woods'},{team:r.team,mode:'solo',tactic:'guard',deployment:20}).reason,'');}assert.equal(JSON.stringify(s),before);
s.affairs={mission:{hero:teams[0].team[0]}};s.realm.squad={team:[teams[0].team[1]]};for(const r of recommendLineups(s,d,q.battle))assert.ok(r.team.every(id=>id!==s.affairs.mission.hero&&!s.realm.squad.team.includes(id)));
const low=begin('heqi');low.battle.team[0].skills=['heqi_active'];assert.match(roleReadiness(low.battle,low.battle.team[0],d),/尚未解锁/);const mage=begin('gongsunsheng');mage.battle.team[0].skills=['gongsunsheng_active'];assert.match(roleReadiness(mage.battle,mage.battle.team[0],d),/尚未解锁/);
assert.ok(rosterSelection(fixture(),d,{query:'青龙破坚'}).all.some(h=>h.id==='guansheng'));assert.ok(rosterSelection(fixture(),d,{query:'破甲'}).all.length>10);
const shielding=begin('linchong','land',['linchong','guosheng']);for(const u of shielding.battle.team)u.skills=[];assert.match(fullLineupAdvice(shielding.battle,d).join(' '),/没有能保护他的/);assert.equal(combatCapabilities({id:'huyanzhuo',skills:['huyanzhuo_advanced']},d).heal,false,'Protect is a shield, not healing');
const fake=copy(samples[0].battle);fake.battle.roles.version=4;assert.throws(()=>gameSnapshot(fake,d));fake.battle.roles.version=2;assert.throws(()=>gameSnapshot(fake,d));
console.log('Full roles PASS: 172/172 roster definitions (108+64), 160 new roles triggered in actual battles with file roundtrip, deterministic resume, v2/guest isolation and reports; condition failures and available-roster recommendations.');
