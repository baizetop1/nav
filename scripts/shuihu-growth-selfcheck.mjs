import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {attributes} from '../public/game/js/hero.js';
import {unlockReason,skillLevel,skillUpgradeQuote,mountQuote,battleSkill} from '../public/game/js/growth.js';
import {startBattle,castSkill,advanceBattle,addStatus,setBattleSkillMode,skillReason,retreatBattle} from '../public/game/js/battle.js';
import {validateSave,parseSave} from '../public/game/js/save.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {render} from '../public/game/js/ui.js';
const root=new URL('../public/game/data/',import.meta.url);
const raw=Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'))]));
export const data=prepareData(raw);
export function growthFixture(ids=['wusong','luzhishen','wuyong'],seed=20260910){
  const s=newGame(data,new Date('2026-09-10T10:00:00+08:00').getTime(),seed);
  s.player.silver=1000000;s.location='stable';s.progress.visited.push('stable');s.team=ids;
  for(const h of data.heroes){s.heroes[h.id].status='owned';s.heroes[h.id].level=25;}
  for(const skill of data.skills)if(skill.training?.flag)s.progress.flags[skill.training.flag]=true;
  for(const id of ['martial_pages','mount_feed','mount_token','iron','exp_pill'])s.inventory[id]=5000;
  // Existing growth tests start with earned contracts; dungeon acquisition has its own integration suite.
  for(const h of data.heroes)s.inventory[h.mount.contract]=1;
  return s;
}
const act=(s,type,extra={})=>{const next=dispatch(data,s,{type,...extra},s.clock);validateSave(next,data);return next;};
export function advance(s,ms,step=1000){while(ms>0&&!s.battle.outcome){const dt=Math.min(ms,step);advanceBattle(s,data,dt);ms-=dt;}return s;}
function fight(ids,enemy='bandit_chief',dungeon=false){const s=growthFixture(ids);startBattle(s,data,{enemies:[enemy],context:dungeon?{type:'dungeon',id:'yezhulin'}:{type:'event',id:'road_bandits'}});return s;}
function tank(s){for(const u of [...s.battle.team,...s.battle.enemy]){u.hp=u.maxHp=100000;u.attack=100;u.defense=80;u.strategy=100;u.nextAttackAt=10000;}for(const u of s.battle.team)u.rage=100;return s;}

assert.equal(data.heroes.length,108);assert.equal(data.skills.filter(s=>s.training).length,432);
for(const h of data.heroes){
  assert.equal(h.skills.length,4);assert.equal(new Set(h.skills).size,4);assert.ok(h.mount.name);
  assert.equal(h.skills.filter(id=>data.by.skills[id].type!=='passive').length,2);
  assert.ok(data.by.items[h.id+'_manual']);
  const s=newGame(data);assert.match(unlockReason(s,data.by.skills[h.id+'_advanced']),/入寨/);
  s.heroes[h.id].status='owned';assert.match(unlockReason(s,data.by.skills[h.id+'_advanced']),/8/);
  s.heroes[h.id].level=8;assert.ok(unlockReason(s,data.by.skills[h.id+'_advanced']));
  s.progress.flags[data.by.skills[h.id+'_advanced'].training.flag]=true;
  assert.equal(unlockReason(s,data.by.skills[h.id+'_advanced']),'');
}
for(const mutate of [r=>r.heroes[0].skills.pop(),r=>r.skills[0].training.hero='wusong',r=>r.skills[0].training.profile='anything']){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>prepareData(bad));}

// Every upgrade is paid, capped, persisted and usable only by its own hero.
let trained=growthFixture();
for(const h of data.heroes){
  trained=act(trained,'mountAdopt',{id:h.id});
  for(let i=0;i<8;i++)trained=act(trained,'mountFeed',{id:h.id});
  trained=act(trained,'mountRank',{id:h.id});trained=act(trained,'mountRank',{id:h.id});
  assert.equal(unlockReason(trained,data.by.skills[h.id+'_bond']),'');
  trained.inventory[h.id+'_manual']=100;
  for(const id of h.skills){
    const beforeSilver=trained.player.silver,beforePills=trained.inventory.exp_pill;
    trained=act(trained,'skillUpgrade',{id});assert.equal(skillLevel(trained,id),2);
    assert.equal(trained.player.silver,beforeSilver-150);assert.equal(trained.inventory.exp_pill,beforePills-1);
  }
}
const skillId='wusong_advanced';for(let i=0;i<3;i++)trained=act(trained,'skillUpgrade',{id:skillId});
assert.equal(skillLevel(trained,skillId),5);assert.match(skillUpgradeQuote(trained,data.by.skills[skillId]).reason,/上限/);
const beforeCap=JSON.stringify(trained);assert.throws(()=>act(trained,'skillUpgrade',{id:skillId}),/上限/);assert.equal(JSON.stringify(trained),beforeCap);
const poor=growthFixture();poor.player.silver=0;const beforePoor=JSON.stringify(poor);assert.throws(()=>act(poor,'skillUpgrade',{id:'wusong_active'}));assert.equal(JSON.stringify(poor),beforePoor);
const notOwned=growthFixture();notOwned.heroes.wusong.status='known';assert.throws(()=>act(notOwned,'skillBook',{id:'wusong'}));
let book=growthFixture(),pages=book.inventory.martial_pages;book=act(book,'skillBook',{id:'baisheng'});assert.equal(book.inventory.martial_pages,pages-2);assert.equal(book.inventory.baisheng_manual,1);
const beforeAttrs=attributes(trained,'wusong',data);let walking=act(trained,'mountRide',{id:'wusong'});assert.match(unlockReason(walking,data.by.skills.wusong_bond),/骑乘/);assert.ok(attributes(walking,'wusong',data).attack<beforeAttrs.attack);assert.equal(skillLevel(walking,'wusong_bond'),2);walking=act(walking,'mountRide',{id:'wusong'});assert.deepEqual(attributes(walking,'wusong',data),beforeAttrs);
assert.ok(mountQuote(growthFixture(),'wusong','mountFeed').reason);const away=growthFixture();away.location='tavern';assert.equal(mountQuote(away,'wusong','mountAdopt',data).reason,'','Held contracts can be redeemed away from the stable');
let maximum=structuredClone(trained);maximum=act(maximum,'mountRank',{id:'wusong'});maximum=act(maximum,'mountRank',{id:'wusong'});assert.throws(()=>act(maximum,'mountRank',{id:'wusong'}),/5 阶/);for(let i=0;i<2;i++)maximum=act(maximum,'mountFeed',{id:'wusong'});assert.throws(()=>act(maximum,'mountFeed',{id:'wusong'}),/已满/);

let drill=growthFixture();const stamina=drill.player.stamina,initialPages=drill.inventory.martial_pages,tokens=drill.inventory.mount_token;
for(let i=0;i<3;i++)drill=act(drill,'martialDrill');assert.equal(drill.player.stamina,stamina-30);assert.equal(drill.inventory.martial_pages,initialPages+6);assert.equal(drill.inventory.mount_token,tokens+1);
assert.throws(()=>act(drill,'martialDrill'),/三次/);const waited=act(drill,'wait');assert.throws(()=>act(waited,'martialDrill'),/三次/);
const tomorrow=dispatch(data,drill,{type:'refresh'},drill.clock+86400000);assert.equal(tomorrow.daily.counters.martialDrill,undefined);act(tomorrow,'martialDrill');
for(const dungeon of data.dungeons){const reward=data.by.rewards[dungeon.reward];assert.equal(reward.guaranteed.martial_pages,3);assert.equal(reward.guaranteed.mount_feed,2);assert.equal(reward.guaranteed.mount_token,1);}
const winner=fight(['wusong'],'bandit_chief',true);winner.battle.enemy[0].hp=1;winner.battle.team[0].rage=100;castSkill(winner,data,'wusong','wusong_active');const won=act(winner,'finishBattle');assert.equal(won.inventory.martial_pages,winner.inventory.martial_pages+3);assert.throws(()=>act(won,'finishBattle'));

// All 108 advanced moves and all 108 riding triggers execute and survive round trips.
for(const h of data.heroes){
  const s=structuredClone(trained);s.team=[h.id];startBattle(s,data,{enemies:['bandit_chief'],context:{type:'event',id:'road_bandits'}});tank(s);s.battle.team[0].hp-=30000;
  const u=s.battle.team[0];assert.equal(u.skills.length,4);assert.equal(u.training.bond,h.id+'_bond');
  const cost=data.by.skills[h.id+'_advanced'].cost;castSkill(s,data,h.id,h.id+'_advanced');
  assert.ok(u.rage>=100-cost&&u.rage<=100);assert.equal(u.skillReadyAt,7000);
  const atCast=JSON.stringify(s);assert.throws(()=>castSkill(s,data,h.id,h.id+'_advanced'),/调息/);assert.equal(JSON.stringify(s),atCast);
  advance(s,14000);assert.ok(s.battle.log.some(l=>l.includes('人骑羁绊')),h.name+' has a real bond trigger');validateSave(s,data);assert.deepEqual(gameSnapshot(s,data),s);
  const frozen=structuredClone(u.training);for(const type of ['skillUpgrade','mountFeed','mountRide','skillBook','martialDrill'])assert.throws(()=>act(s,type,{id:type==='skillUpgrade'?h.skills[0]:h.id}));assert.deepEqual(u.training,frozen);
}
// Specific mechanics: combo precondition, control, protection, weakening/rage,
// cleanse, aimed armor bypass, back-line pressure, and interruptible bosses.
const plain=tank(fight(['wusong'])),bleeding=structuredClone(plain);addStatus(bleeding.battle.enemy[0],{id:'bleeding',value:1,turns:2},0);
castSkill(plain,data,'wusong','wusong_advanced');castSkill(bleeding,data,'wusong','wusong_advanced');assert.ok(bleeding.battle.enemy[0].hp<plain.battle.enemy[0].hp);assert.ok(bleeding.battle.log.some(l=>l.includes('流血衔接')));
const protect=tank(fight(['luzhishen','wusong']));castSkill(protect,data,'luzhishen','luzhishen_advanced');assert.equal(protect.battle.team[0].statuses.find(s=>s.id==='guard').value,.4);assert.ok(protect.battle.team[1].statuses.some(s=>s.id==='guard'));assert.ok(protect.battle.team[0].statuses.some(s=>s.id==='taunt'));advance(protect,4000);assert.ok(!protect.battle.team[0].statuses.length);
const trick=tank(fight(['wuyong','wusong']));trick.battle.team[1].rage=0;castSkill(trick,data,'wuyong','wuyong_advanced');assert.equal(trick.battle.team[1].rage,10);assert.ok(trick.battle.enemy[0].statuses.some(s=>s.id==='weaken'));
const cleanse=tank(fight(['gongsunsheng','wusong']));addStatus(cleanse.battle.team[1],{id:'poison',value:20,turns:2},0);castSkill(cleanse,data,'gongsunsheng','gongsunsheng_advanced');assert.equal(cleanse.battle.team[1].statuses.length,0);assert.throws(()=>castSkill(cleanse,data,'wusong','gongsunsheng_advanced'));
const boss=tank(fight(['yanqing','linchong'],'tiger_king',true));advance(boss,6000);assert.equal(boss.battle.enemy[0].boss.pendingAt,8000);assert.ok(boss.battle.log.some(l=>l.includes('首领蓄势')));castSkill(boss,data,'yanqing','yanqing_advanced');assert.equal(boss.battle.enemy[0].boss.pendingAt,0);assert.equal(boss.battle.enemy[0].boss.readyAt,16000);validateSave(boss,data);
const controlled=tank(fight(['linchong'],'tiger_king',true));castSkill(controlled,data,'linchong','linchong_advanced');assert.equal(controlled.battle.enemy[0].statuses.find(s=>s.id==='stun').expiresAt,1500);assert.equal(controlled.battle.enemy[0].resistUntil,5500);
const resistant=tank(fight(['linchong','ruanxiaoqi'],'tiger_king',true));castSkill(resistant,data,'linchong','linchong_advanced');castSkill(resistant,data,'ruanxiaoqi','ruanxiaoqi_advanced');assert.ok(resistant.battle.log.some(l=>l.includes('抗控')));assert.equal(resistant.battle.enemy[0].statuses.find(s=>s.id==='stun').expiresAt,1500);
const interrupted=tank(fight(['linchong'],'tiger_king',true));advance(interrupted,7000);castSkill(interrupted,data,'linchong','linchong_advanced');advance(interrupted,1000);assert.ok(interrupted.battle.log.some(l=>l.includes('蓄势中断')));assert.ok(!interrupted.battle.log.some(l=>l.includes('施展【虎啸扑阵】')));
const upgradedHit=tank(fight(['wusong'])),basicHit=structuredClone(upgradedHit);upgradedHit.battle.team[0].training.levels.wusong_advanced=5;castSkill(upgradedHit,data,'wusong','wusong_advanced');castSkill(basicHit,data,'wusong','wusong_advanced');assert.ok(upgradedHit.battle.enemy[0].hp<basicHit.battle.enemy[0].hp,'Upgraded levels change actual damage, not only the label');
const resolves=tank(fight(['baisheng'],'tiger_king',true));advance(resolves,8000);assert.ok(resolves.battle.log.some(l=>l.includes('虎啸扑阵')));
const enraged=tank(fight(['baisheng'],'tiger_king',true));enraged.battle.enemy[0].hp=40000;advance(enraged,6000);assert.equal(enraged.battle.enemy[0].boss.phase,1);
const chief=tank(fight(['wusong'],'bandit_chief',true));advance(chief,8000);assert.ok(chief.battle.enemy[0].statuses.some(s=>s.id==='guard'));
const raider=tank(fight(['wusong','baisheng'],'road_raider',true));advance(raider,8000);assert.equal(raider.battle.team[0].hp,100000);assert.ok(raider.battle.team[1].hp<100000);
// Saving/loading cannot grant a second trigger or change timer partition results.
const sliced=tank(fight(['linchong','wuyong','luzhishen'],'tiger_king',true));setBattleSkillMode(sliced,'auto');const batched=structuredClone(sliced);advance(sliced,18000,137);advance(batched,18000);assert.deepEqual(sliced,batched);const resumed=parseSave(JSON.stringify(sliced),data);advance(sliced,7000);advance(resumed,7000,200);assert.deepEqual(sliced,resumed);

const legacy=fight(['wusong']);delete legacy.growth;delete legacy.battle.rules;for(const u of legacy.battle.team){delete u.training;u.skills=data.by.heroes[u.id].skills.slice(0,2);}const old=parseSave(JSON.stringify(legacy),data);assert.equal(old.battle.rules,undefined);assert.deepEqual(old.battle,legacy.battle);assert.equal(old.growth,undefined);advance(old,5000);assert.ok(!old.battle.log.some(l=>/人骑羁绊|首领蓄势/.test(l)));
const guest=structuredClone(trained);startBattle(guest,data,{enemies:['tiger'],guest:{id:'wusong',level:12},context:{type:'event',id:'road_bandits'}});assert.equal(guest.battle.team[0].skills.length,2);assert.ok(Object.values(guest.battle.team[0].training.levels).every(n=>n===1));
assert.deepEqual(importSave(exportSave(trained,{id:1,name:'养成回归'},data),data).state,trained);
const secret=structuredClone(trained);secret.growth.token='do-not-export';secret.growth.mounts.wusong.password='do-not-export';assert.ok(!JSON.stringify(gameSnapshot(secret,data)).includes('do-not-export'));
for(const mutate of [s=>s.growth.version=9,s=>s.growth.skills.wusong_active=99,s=>s.growth.mounts.wusong.rank=6,s=>s.growth.mounts.wusong.intimacy=-1,s=>s.growth.mounts.wusong.riding='yes',s=>s.growth.skills.bandit_cut=2,s=>s.growth.mounts.bandit={rank:1,intimacy:0,riding:true}]){const bad=structuredClone(trained);mutate(bad);assert.throws(()=>parseSave(JSON.stringify(bad),data));}
for(const mutate of [s=>s.battle.rules=99,s=>s.battle.team[0].training.levels.wusong_active=6,s=>s.battle.team[0].training.bond='linchong_bond',s=>s.battle.enemy[0].boss.pendingAt=-1]){const bad=structuredClone(boss);mutate(bad);assert.throws(()=>parseSave(JSON.stringify(bad),data));}
const ui=render({state:trained,data,view:'heroes'});for(const h of data.heroes){const detail=render({state:trained,data,view:'heroes',roster:{selected:h.id}});for(const id of h.skills)assert.ok(detail.includes(data.by.skills[id].name));}for(const text of ['skillUpgrade','mountFeed','mountRank','martialDrill','材料去哪里找','亲密'])assert.ok(ui.includes(text));
console.log('Shuihu growth: all 108 heroes/432 moves, paid capped upgrades, unlocks, 108 mounts/bonds, material sources/limits, live effects, boss telegraphs/counters, snapshot/legacy/cloud projection, atomic guards and UI passed.');
