import fs from 'node:fs';import assert from 'node:assert/strict';import {prepareData,collections} from '../public/game/js/data.js';import {newGame,dispatch} from '../public/game/js/core.js';import {freshCamp} from '../public/game/js/camp.js';import {advanceBattle} from '../public/game/js/battle.js';import {PERSONAL,COMBOS} from '../public/game/js/expansion-data.js';import {personalProgress} from '../public/game/js/personal-tasks.js';import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
export const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(fs.readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url)))])));
const teams={baisheng:['baisheng','shiqian'],shiqian:['shiqian'],zhugui:['zhugui','baisheng'],tanglong:['tanglong','zhugui'],andaoquan:['andaoquan','luzhishen'],luzhishen:['luzhishen','baisheng']};
export function fixture(id,seed=81,level=15){let s=newGame(d,Date.parse('2026-09-21T04:00:00Z'),seed);s.camp=freshCamp();s.camp.buildings={hall:3,barracks:3,clinic:2,farm:2,lumber:2,market:2};s.camp.troops=200;s.camp.deployment=id==='tanglong'?80:50;s.camp.mode=id==='tanglong'?'army':'solo';s.camp.food=10000;s.player.silver=5000;s.team=teams[id]||[id];s.battleSkillMode='auto';for(const h of s.team)Object.assign(s.heroes[h],{status:'owned',level,exp:0});s.progress.flags.guide=true;for(const item of ['huiqisan','jinchuangyao'])s.inventory[item]=5;s=dispatch(d,s,{type:'realmOpen'},s.clock);return dispatch(d,s,{type:'expansionOpen'},s.clock);}
export const act=(s,type,a={})=>{const n=dispatch(d,s,{type,...a},s.clock);assert.deepEqual(gameSnapshot(n,d),n);return n;};

import {prepareSortie} from '../public/game/js/sortie.js';
import {initializeExpansion,advanceCombos} from '../public/game/js/expansion-combat.js';
import {castSkill} from '../public/game/js/battle.js';
import {CloudClient} from '../public/game/js/cloud.js';
import {gains} from '../public/game/js/rewards-ui.js';
const winners={};
for(const id of Object.keys(teams)){
 for(const seed of [1,7,19,81,115]){
  const base=fixture(id,seed),original=structuredClone(base),q=prepareSortie(base,d,{type:'personalStart',id},undefined,base.clock);
  assert.equal(q.reason,'');assert.deepEqual(base,original);assert.equal(q.cost.stamina,10);
  let s=act(base,'personalStart',{id});assert.equal(s.daily.counters.personal_attempt,1);
  assert.equal(s.player.stamina,base.player.stamina-10);assert.equal(s.camp.food,base.camp.food-5-Math.ceil((id==='tanglong'?80:0)/2));
  for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);
  assert.equal(s.battle.outcome,'victory',id);assert.equal(personalProgress(s.battle).complete,true,id+' '+seed);
  assert.deepEqual(importSave(exportSave(s,{id:1,name:'实战'},d),d).state,s);
  const end=act(s,'finishBattle');assert.equal(end.expansion.personal[id],true);assert.equal(end.inventory[id+'_manual'],(s.inventory[id+'_manual']||0)+2);assert.equal(end.inventory.spirit_essence,(s.inventory.spirit_essence||0)+2);assert.ok(gains(s,end,d).some(r=>JSON.stringify(r).includes('本领强化')));
  assert.equal(personalProgress(end.lastBattle).complete,true);assert.throws(()=>act(end,'personalStart',{id}),/完成/);assert.throws(()=>act(end,'finishBattle'),/胜负/);winners[id]=end;
 }
}
// Support objectives remain attainable after overlevelling; prizes stay fixed.
for(const level of [30,40])for(const id of Object.keys(teams)){let s=act(fixture(id,81,level),'personalStart',{id});for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);assert.equal(personalProgress(s.battle).complete,true,id+' level '+level);s=act(s,'finishBattle');assert.equal(s.inventory[id+'_manual'],2);assert.equal(s.inventory.spirit_essence,2);}
// Invalid configurations and cancelled previews never consume an attempt or resources.
for(const [id,change]of [['shiqian',s=>{s.team.push('baisheng');s.heroes.baisheng.status='owned';}],['zhugui',s=>s.team=['zhugui']],['tanglong',s=>s.camp.deployment=79],['luzhishen',s=>s.team.reverse()]]){const s=fixture(id);change(s);const before=structuredClone(s);assert.ok(prepareSortie(s,d,{type:'personalStart',id}).reason);assert.throws(()=>act(s,'personalStart',{id}));assert.deepEqual(s,before);}
let limited=fixture('shiqian');for(let i=0;i<3;i++){limited=act(limited,'personalStart',{id:'shiqian'});limited=act(act(limited,'battleRetreat'),'finishBattle');}assert.equal(limited.daily.counters.personal_attempt,3);assert.ok(!limited.expansion.personal.shiqian);assert.throws(()=>act(limited,'personalStart',{id:'shiqian'}),/每天/);
// Rage medicine counts as use even though it restores no HP; a victory alone is insufficient.
let failed=act(fixture('zhugui'),'personalStart',{id:'zhugui'});failed=act(failed,'battleItem',{id:'huiqisan'});assert.equal(failed.battle.metrics.medicine,0);assert.equal(failed.battle.metrics.medicineUses,1);assert.deepEqual(importSave(exportSave(failed,{id:1,name:'用药'},d),d).state,failed);
const corrupt=structuredClone(failed);delete corrupt.battle.metrics.medicineUses;assert.throws(()=>gameSnapshot(corrupt,d),/用药记录/);
for(let i=0;i<180&&!failed.battle.outcome;i++)advanceBattle(failed,d,1000);assert.equal(failed.battle.outcome,'victory');assert.equal(personalProgress(failed.battle).complete,false);failed=act(failed,'finishBattle');assert.ok(!failed.expansion.personal.zhugui);assert.match(failed.message,/用药|目标|战斗药品/);
// New stat bonuses apply once, to their owner, and persist through snapshots.
for(const id of ['shiqian','zhugui','tanglong','luzhishen']){
 const normal=fixture(id),enhanced=structuredClone(normal);enhanced.expansion.personal[id]=true;
 const a=act(normal,'campRaid',{id:'woods'}),b=act(enhanced,'campRaid',{id:'woods'}),u=a.battle.team.find(u=>u.id===id),v=b.battle.team.find(u=>u.id===id);
 if(id==='shiqian')assert.equal(v.speed,Math.round(u.speed*1.05));if(id==='zhugui')assert.equal(v.rage,u.rage+10);if(id==='tanglong')assert.equal(v.defense,Math.round(u.defense*1.05));if(id==='luzhishen'){assert.equal(v.maxHp,Math.round(u.maxHp*1.05));assert.equal(v.hp,v.maxHp);}
 const stable=structuredClone(b);initializeExpansion(b,b.battle);assert.deepEqual(b,stable);assert.deepEqual(gameSnapshot(b,d),b);
 if(id==='tanglong'){normal.camp.mode=enhanced.camp.mode='solo';const n=act(normal,'campRaid',{id:'woods'}),e=act(enhanced,'campRaid',{id:'woods'});assert.equal(n.battle.team[0].defense,e.battle.team[0].defense);}
}
for(const id of ['baisheng','andaoquan']){
 const base=fixture(id),bonus=structuredClone(base);bonus.expansion.personal[id]=true;
 const plain=act(base,'campRaid',{id:'woods'}),enhanced=act(bonus,'campRaid',{id:'woods'});
 for(const state of [plain,enhanced]){state.battle.team[0].hp=1;state.battle.team[0].rage=100;castSkill(state,d,id,id+'_active');}
 assert.ok(enhanced.battle.metrics.heroes[id].healing>plain.battle.metrics.heroes[id].healing);assert.equal(enhanced.battle.metrics.medicine,0);
}
// Low-star combinations consume rage, share genuine contribution and keep two-use limits.
for(const combo of ['guide','scouts']){
 const base=fixture('baisheng');base.team=COMBOS[combo].team;for(const id of base.team)Object.assign(base.heroes[id],{status:'owned',level:15,exp:0});base.expansion.combos[combo]=3;
 const s=act(base,'campRaid',{id:'fort'}),b=s.battle;for(const u of b.team)u.rage=100;
 if(combo==='guide'){advanceCombos(b);assert.equal(b.expansion.combos[combo].count,0);b.team[0].hp=Math.floor(b.team[0].maxHp*.5);}
 if(combo==='scouts')b.enemy.at(-1).rage=30;
 const before=structuredClone(b);advanceCombos(b);assert.equal(b.expansion.combos[combo].count,1);assert.ok(b.team.every(u=>u.rage===80));advanceCombos(b);assert.equal(b.expansion.combos[combo].count,1);
 if(combo==='guide'){const amount=b.team[0].hp-before.team[0].hp;assert.equal(amount,Math.round(b.team[0].maxHp*.08));assert.equal(Object.values(b.metrics.heroes).reduce((n,m)=>n+m.healing,0),amount);}else {assert.equal(b.enemy.at(-1).rage,20);assert.ok(b.enemy.at(-1).hp<before.enemy.at(-1).hp);assert.equal(b.enemy[0].hp,before.enemy[0].hp);}
 assert.deepEqual(gameSnapshot(s,d),s);
 b.elapsed=15000;if(combo==='guide')b.team[0].hp=Math.floor(b.team[0].maxHp*.5);advanceCombos(b);assert.equal(b.expansion.combos[combo].count,2);b.elapsed=30000;advanceCombos(b);assert.equal(b.expansion.combos[combo].count,2);
}
// Existing saves/battles without the optional medicine counter continue loading.
const old=act(fixture('baisheng'),'campRaid',{id:'woods'});delete old.battle.metrics.medicineUses;assert.deepEqual(gameSnapshot(old,d),old);
let writes=0;const client=new CloudClient('https://test.invalid',d,async(url,options)=>{if(options.method==='PUT')writes++;return {ok:true,json:async()=>({})};});await assert.rejects(()=>client.upload(1,1,winners.baisheng,'任务'),/0.36.0/);assert.equal(writes,0);
console.log('Personal trials PASS: 30 real wins at level 15 with ordinary heroes/no gear or medicine, immutable previews, entry rules, shared attempt cap, exactly-once rewards, truthful goals, portable saves, six active bonuses, both low-star combos and old-cloud preflight.');
