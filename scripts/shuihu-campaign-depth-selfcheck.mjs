import assert from 'node:assert/strict';
import {d,fixture,act,win} from './shuihu-campaign-fixtures.mjs';
import {advanceBattle} from '../public/game/js/battle.js';
import {PERSONAL} from '../public/game/js/expansion-data.js';
import {PERSONAL_TRAITS} from '../public/game/js/tactics-data.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {specialPlan,specialDropTable} from '../public/game/js/special-dungeons.js';
import {SPECIAL_ROUTES,routeAllowed} from '../public/game/js/special-routes.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {newEquipment} from '../public/game/js/item.js';
import {mentorshipQuote,mentorshipPlan,mentorshipYield} from '../public/game/js/mentorship.js';
import {gearFit} from '../public/game/js/gear-fit.js';
import {replayChallengeResult} from '../public/game/js/replay-challenges.js';
import {completeLateRoute} from './shuihu-late-mainline-selfcheck.mjs';
import {replaysPreserved} from '../public/game/js/replays-save.js';
import {hasCampaignDepth} from '../public/game/js/campaign-depth.js';
import {tacticsAfterHit,tacticsHealing,specialBossMove} from '../public/game/js/tactics-combat.js';
import {reportDamage,reportHealing} from '../public/game/js/debrief.js';
import {journeyAbsorb} from '../public/game/js/journey-combat.js';
const copy=structuredClone,roundtrip=s=>assert.deepEqual(importSave(exportSave(s,{id:1,name:'深度测试'},d),d).state,s);
export function personalFixtures(){const samples=[];for(const [id,m]of Object.entries(PERSONAL).filter(([,m])=>m.introduced===5)){
 let s=fixture(590,20);s.battleSkillMode='auto';Object.assign(s.heroes[id],{status:'owned',level:20});s.team=[id,'linchong','baisheng'];if(m.healing)s.team=[id,'linchong','wangjin'];
 const base=copy(s),q=prepareSortie(s,d,{type:'personalStart',id});assert.equal(q.reason,'');assert.deepEqual(s,base);s=act(s,'personalStart',{id});assert.ok(hasCampaignDepth(s));const start=copy(s);roundtrip(s);
 for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);
 console.log('Trial',id,s.battle.outcome,s.battle.metrics.heroes[id]);s=act(s,'finishBattle');assert.equal(s.expansion.personal[id],true,id);roundtrip(s);assert.throws(()=>act(s,'personalStart',{id}),/已经完成/);samples.push([start,s]);
}return samples;}
export function depthFixtures(){const rows=personalFixtures();for(const [route,r]of Object.entries(SPECIAL_ROUTES).filter(([,r])=>r.introduced===2))for(const id of r.areas){
 let s=fixture(590,30);s.battleSkillMode='auto';if(id!==r.areas[0])for(let i=0;i<5;i++)s=win(act(s,'specialStart',{id:r.areas[0],tier:1}));
 assert.equal(routeAllowed(route,id),true);const old=copy(s),drops=specialDropTable(id,1),q=prepareSortie(s,d,{type:'specialStart',id,tier:1,route});assert.equal(q.reason,'');assert.deepEqual(s,old);s=act(s,'specialStart',{id,tier:1,route});
 if(route==='oreguard')assert.ok(s.battle.enemy.every(u=>u.statuses.some(v=>v.id==='guard'&&v.value===.45)));
 if(route==='poisonbank')assert.ok(s.battle.team.every(u=>u.statuses.some(v=>v.id==='poison')));
 assert.equal(s.battle.expedition.troops,0);assert.deepEqual(specialDropTable(id,1),drops);const start=copy(s);advanceBattle(s,d,1000);roundtrip(s);s=win(s);roundtrip(s);assert.deepEqual(s.player,old.player);assert.deepEqual(s.camp,old.camp);assert.equal(s.specialDungeons.last.bonus.count,r.amount);assert.throws(()=>act(s,'finishBattle'));rows.push([start,s]);
 const invalid=copy(start);invalid.battle.context.id=route==='oreguard'?'marsh':'mine';assert.throws(()=>gameSnapshot(invalid,d));
 let retreat=act(old,'specialStart',{id,tier:1,route});retreat=act(retreat,'battleRetreat');retreat=act(retreat,'finishBattle');assert.equal(retreat.specialDungeons.last.bonus,null);assert.deepEqual(retreat.inventory,old.inventory);
}
 const completed=completeLateRoute().s;for(const challenge of ['pair','swift','intact']){
 let s=copy(completed);if(challenge==='pair')s=act(s,'team',{ids:s.team.slice(0,2)});
 s.battleSkillMode='auto';const before=copy(s);s=act(s,'replayStart',{id:'v8_rescue',tier:2,challenge});const start=copy(s);advanceBattle(s,d,1000);roundtrip(s);
 for(let n=0;n<180&&!s.battle.outcome;n++)advanceBattle(s,d,1000);
 const result=replayChallengeResult(s.battle);assert.equal(result.complete,true,challenge+JSON.stringify(result));s=act(s,'finishBattle');roundtrip(s);
 assert.equal(s.replays.challenges['v8_rescue_2_'+challenge].count,1);assert.deepEqual(s.inventory,before.inventory);assert.deepEqual(s.progress,before.progress);assert.deepEqual(s.player,before.player);
 const bad=copy(s);delete bad.replays.challenges;assert.equal(replaysPreserved(s,bad),false);const slow=copy(start);slow.battle.elapsed=61000;slow.battle.outcome='victory';if(challenge==='swift')assert.equal(replayChallengeResult(slow.battle).complete,false);rows.push([start,s]);
}
 assert.throws(()=>act(completed,'replayStart',{id:'v8_rescue',tier:1,challenge:'swift'}));assert.throws(()=>act(completed,'replayStart',{id:'v8_rescue',tier:2,challenge:'pair'}));
 return rows;
}
if(process.argv[1]?.endsWith('shuihu-campaign-depth-selfcheck.mjs')){
 const rows=depthFixtures();let s=fixture(590,40);Object.assign(s.heroes.duqian,{status:'owned',level:10,exp:0});const plan=mentorshipPlan(s,d,'linchong','duqian'),yieldXp=mentorshipYield(s,d,'linchong','duqian');assert.ok(yieldXp>600);let used=0;while(s.heroes.duqian.level<plan.target){if((s.daily.counters.heroMentor||0)>=3)s=act({...s,clock:s.clock+86400000},'refresh');const q=mentorshipQuote(s,d,'linchong','duqian');assert.equal(q.reason,'');s=act(s,'heroMentor',{mentor:q.mentor,student:q.student,expected:q.signature});used++;}assert.equal(used,plan.sessions);assert.equal(s.heroes.linchong.level,40);
 const gear=newEquipment(s,'reed_medicine_case');assert.equal(gearFit(s,d,gear,'linchong').ready,false);assert.equal(gearFit(s,d,gear,'baisheng').ready,true);
 let regional=completeLateRoute().s;regional.battleSkillMode='auto';for(const [route,id]of [['oreguard','mine'],['poisonbank','marsh'],['warbell','ruins']])for(const tier of [1,2,3]){regional=act(regional,'specialStart',{id,tier,route});if(route==='warbell'){const probe=copy(regional),b=probe.battle,u=b.enemy[0];for(const e of b.enemy)e.hp=Math.floor(e.maxHp*.5);b.elapsed=u.boss.readyAt;specialBossMove(probe,u,{log:()=>{}},()=>{});assert.equal(u.boss.pendingAt,b.elapsed+3000);b.elapsed=u.boss.pendingAt;specialBossMove(probe,u,{log:()=>{}},()=>{});assert.ok(b.enemy.every(e=>e.hp>e.maxHp*.5));}regional=win(regional);assert.equal(regional.specialDungeons.last.bonus.count,SPECIAL_ROUTES[route].amount*tier);roundtrip(regional);}
 const guarded=copy(s);guarded.team=['linchong'];const spear=newEquipment(guarded,'bastion_spear');assert.equal(gearFit(guarded,d,spear,'linchong').ready,true);guarded.team=['shiqian'];assert.equal(gearFit(guarded,d,spear,'shiqian').ready,false);guarded.team=['shiqian','baisheng'];assert.equal(gearFit(guarded,d,spear,'shiqian').ready,true);
 const api={reportDamage,reportHealing,absorb:journeyAbsorb};for(const id of ['songwan','houjian','shien']){let v=fixture(591,20);Object.assign(v.heroes[id],{status:'owned',level:20});v.team=[id,'baisheng'];v=act(v,'expansionOpen');v.expansion.personal[id]=true;v=act(v,'specialStart',{id:'mine',tier:1});const b=v.battle,u=b.team[0],t=b.enemy[0];
 if(id==='songwan'){u.hp=Math.floor(u.maxHp*.4);tacticsAfterHit(b,t,u,true,1,api,false);assert.ok(u.statuses.some(v=>v.id==='guard'&&v.value===.25));tacticsAfterHit(b,t,u,true,1,api,false);assert.equal(b.tactics.counts[id+'_personal'],1);}
 if(id==='houjian'){const ally=b.team[1];tacticsHealing(b,u,ally,0);assert.equal(b.tactics.counts[id+'_personal'],undefined);tacticsHealing(b,u,ally,1);assert.ok(ally.statuses.some(v=>v.id==='guard'&&v.value===.12));}
 if(id==='shien'){t.statuses.push({id:'bleeding',value:1,expiresAt:4000,nextTickAt:2000});const hp=t.hp;tacticsAfterHit(b,u,t,true,1,api,false);assert.ok(t.hp<hp);const now=t.hp;tacticsAfterHit(b,u,t,true,1,api,false);assert.equal(t.hp,now);}
 roundtrip(v);
 }
 console.log('Campaign depth PASS: '+rows.length+' real encounter pairs; new personal objectives, routes, challenge honor, restrictions, no extra loot, old state preservation, scaled mentorship and trait effects.');
}
