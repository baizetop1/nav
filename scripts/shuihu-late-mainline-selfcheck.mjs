import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {d,complete as completeSeventh} from './shuihu-volume-seven-selfcheck.mjs';
import {dispatch} from '../public/game/js/core.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {newEquipment} from '../public/game/js/item.js';
import {routeTo} from '../public/game/js/world-map.js';
import {prepareSortie} from '../public/game/js/sortie.js';
import {CHAPTER_MISSIONS} from '../public/game/js/volume-three-data.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {parseSave} from '../public/game/js/save.js';
export {d};

export const PROFILES = {
 spirit:{team:['linchong','luzhishen','songjiang'],quality:1,label:'灵品40 · 林冲/鲁智深/宋江'},
 ordinary:{team:['wusong','yangzhi','songjiang'],quality:0,label:'凡品40 · 武松/杨志/宋江'},
 ordinary_guard:{team:['wusong','luzhishen','songjiang'],quality:0,label:'凡品40 · 护众对照'}
};
const slots=['long_spear','iron_helmet','tiger_armor','leather_belt','swift_boots','river_charm'];
const rareIds=['recruit_order','spirit_essence','immortal_seal'];
const rare=s=>Object.fromEntries(rareIds.map(id=>[id,s.inventory[id]||0]));
const cultivation=s=>({heroes:Object.fromEntries(s.team.map(id=>[id,{level:s.heroes[id].level,quality:s.heroes[id].quality||0}])),growth:structuredClone(s.growth),equipment:structuredClone(s.equipment)});
export const act=(s,type,fields={})=>dispatch(d,s,{type,...fields},s.clock);
export function travel(s,id){if(s.location===id)return s;assert.ok(routeTo(s,d,id),'reachable '+id);return act(s,'travel',{id});}
export function story(s,id,choice='finish'){s=travel(s,d.by.stories[id].map);return act(s,'story',{id,choice});}
export function roundtrip(s,label='后五卷检查点'){
 assert.deepEqual(gameSnapshot(s,d),s,'snapshot preserves all state');
 const next=importSave(exportSave(s,{id:1,name:label},d),d).state;assert.deepEqual(next,s,'portable save is lossless');return next;
}
export function lateFixture({profile='spirit',mode='army',seed=97}={}){
 // Complete the actual seventh-volume combat and settlement before entering new content.
 let s=completeSeventh('hook',{mode:'army',quality:1,level:40,seed}).s;
 const setup=PROFILES[profile];assert.ok(setup,'known fixture profile');s.team=[...setup.team];
 for(const id of setup.team){s.heroes[id]={status:'owned',level:40,exp:0,quality:setup.quality};for(const skill of d.by.heroes[id].skills.slice(0,3))s.growth.skills[skill]=2;}
 for(const e of s.equipment)e.hero=null;
 for(const hero of s.team)for(const id of slots){const e=newEquipment(s,id);e.plus=3;e.hero=hero;}
 s.camp.mode=mode;s.camp.deployment=300;s.camp.troops=600;s.camp.food=50000;s.player.silver=300000;
 Object.assign(s.inventory,{jinchuangyao:30,huiqisan:12,jiedudan:12,herb:100});s.battleSkillMode='auto';
 return roundtrip(s,'第七卷完成 · 后五卷起档');
}
export function resupply(s,id){
 const mission=CHAPTER_MISSIONS[id];assert.ok(mission,'registered chapter battle '+id);
 if(s.player.stamina<mission.stamina)s=dispatch(d,s,{type:'refresh'},s.clock+(100-s.player.stamina)*d.config.balance.regenMs);
 if(s.camp.mode==='army'){while(s.camp.wounded)s=act(s,'campHeal');while(s.camp.troops<300)s=act(s,'campRecruit',{amount:50});}
 return s;
}
export function beginFight(s,id){
 s=resupply(s,id);s=travel(s,d.by.stories[id].map);const original=JSON.stringify(s);
 const q=prepareSortie(s,d,{type:'chapterBattle',id,choice:'fight'});assert.equal(q.reason,'',id+' preparation');assert.equal(JSON.stringify(s),original,'preview consumes nothing');
 const before={stamina:s.player.stamina,food:s.camp.food};s=act(s,'chapterBattle',{id,choice:'fight'});
 assert.equal(s.player.stamina,before.stamina-q.cost.stamina);assert.equal(s.camp.food,before.food-q.cost.food);assert.ok(s.battle.mainline,'late campaign combat extension');
 assert.equal(s.battle.mainline.wave,0);assert.equal(s.battle.expedition.troops,s.camp.mode==='solo'?0:300);
 return s;
}
export function conduct(s,{id=s.battle?.context.id,medicines=true,orders=true,reloadAt=4000}={}){
 let reloaded=false,medicineUses=0,highestWave=0,steps=0;
 while(!s.battle.outcome&&steps++<181){
  let b=s.battle;highestWave=Math.max(highestWave,b.mainline.wave);
  if(orders){
   const mission=CHAPTER_MISSIONS[id],source=mission.escort?.source;
   // Stop escort damage, then remove healers and support before feeding rage to the boss.
   const focus=b.enemy.find(u=>u.hp>0&&u.model===source)||b.enemy.find(u=>u.hp>0&&!u.boss&&u.skills.includes('guard_wall'))||b.enemy.find(u=>u.hp>0&&!u.boss)||b.enemy.find(u=>u.hp>0);
   if(focus&&b.orders?.focus!==focus.id)s=act(s,'battleOrder',{kind:'focus',target:focus.id});
   b=s.battle;if(source&&b.orders?.stance!=='guard'&&(b.orders?.readyAt||0)<=b.elapsed)s=act(s,'battleOrder',{kind:'stance',value:'guard'});
  }
  b=s.battle;
  if(medicines&&s.inventory.jinchuangyao>0&&b.itemReadyAt<=b.elapsed&&b.team.some(u=>u.hp>0&&u.hp/u.maxHp<.35)){
   s=act(s,'battleItem',{id:'jinchuangyao'});medicineUses++;
  }
  advanceBattle(s,d,1000);
  if(!reloaded&&s.battle.elapsed>=reloadAt&&!s.battle.outcome){s=roundtrip(s,'战中断线恢复 · '+id);reloaded=true;}
 }
 const b=s.battle;
 return {s,report:{id,priority:['rescue','evidence','supply'].find(x=>s.progress.flags['v8_priority_'+x]),branch:s.progress.flags.v9_assault?'assault':'covert',allocation:s.progress.flags.v10_defense?'defense':'supply',mode:s.camp.mode,quality:s.heroes[s.team[0]].quality||0,team:s.team.join('/'),outcome:b.outcome,ms:b.elapsed,waves:Math.max(highestWave,b.mainline.wave)+1,hp:b.team.reduce((n,u)=>n+u.hp,0),escort:b.mainline.escort?.hp??null,medicine:medicineUses}};
}
export function fight(s,id,{reports,expect='victory',beforeFight,...options}={}){
 if(beforeFight)beforeFight(structuredClone(s),id);
 s=beginFight(s,id);s=roundtrip(s,'出征检查点 · '+id);const wallet={stamina:s.player.stamina,food:s.camp.food,...rare(s)},done=id+'_done';
 assert.equal(s.progress.flags[done],undefined,'combat has not committed story completion');
 const played=conduct(s,{id,...options});s=played.s;if(reports)reports.push(played.report);
 assert.equal(s.battle.outcome,expect,id+' '+JSON.stringify(played.report)+'\n'+s.battle.log.slice(-16).join('\n'));
 assert.equal(s.player.stamina,wallet.stamina,'waves do not charge extra stamina');assert.equal(s.camp.food,wallet.food,'waves do not charge extra food');
 for(const id of rareIds)assert.equal(s.inventory[id]||0,wallet[id],'combat cannot issue chapter rare rewards');
 s=act(s,'finishBattle');assert.throws(()=>act(s,'finishBattle'),'battle settlement is one-time');
 if(expect==='victory'){
  assert.equal(s.progress.stories[id].step,'settle');assert.equal(s.progress.flags[done],undefined,'victory waits for explicit story confirmation');
  assert.throws(()=>act(s,'chapterBattle',{id,choice:'fight'}));s=story(s,id);assert.equal(s.progress.flags[done],true);assert.throws(()=>story(s,id));
 }else{assert.equal(s.progress.stories[id].step,'fight');assert.equal(s.progress.flags[done],undefined);}
 return roundtrip(s,'战后检查点 · '+id);
}
export function closeChapter(s,number,id,choice='finish'){
 const chapter=d.chapters.find(c=>c.number===number),before=rare(s);s=story(s,id,choice);assert.equal(s.progress.flags[chapter.completeFlag],true);
 assert.equal((s.inventory.recruit_order||0)-before.recruit_order,2);assert.equal((s.inventory.spirit_essence||0)-before.spirit_essence,5);assert.equal((s.inventory.immortal_seal||0)-before.immortal_seal,number>=10?1:0);
 assert.throws(()=>story(s,id,choice),'chapter story reward is one-time');
 s=act(s,'recruitSupply',{id:'chapter_'+chapter.id});assert.equal(s.inventory.recruit_order-before.recruit_order,4,'chapter plus support total four orders');
 assert.throws(()=>act(s,'recruitSupply',{id:'chapter_'+chapter.id}),'chapter support is one-time');return roundtrip(s,'第'+number+'卷完成');
}
export function finishEight(s,priority='rescue',options={}){
 s=story(s,'v8_choose',priority);
 for(const name of ['rescue','evidence','supply'].filter(name=>name!==priority))assert.equal(routeTo(s,d,d.by.stories['v8_'+name].map),null,'must perform selected task first');
 for(const name of [priority,...['rescue','evidence','supply'].filter(name=>name!==priority)])s=fight(s,'v8_'+name,options);
 s=fight(s,'v8_final',options);return closeChapter(s,8,'v8_settle');
}
export function finishNine(s,branch='covert',options={}){
 s=story(s,'v9_choose',branch);for(const id of ['v9_gate','v9_prison','v9_escape'])s=fight(s,id,options);return closeChapter(s,9,'v9_settle');
}
export function finishTen(s,allocation='supply',options={}){
 s=story(s,'v10_report');s=fight(s,'v10_escort',options);s=story(s,'v10_allocate',allocation);s=fight(s,'v10_ford',options);return closeChapter(s,10,'v10_gather');
}
export function prepareEleven(s,options={}){
 s=story(s,'v11_report');s=fight(s,'v11_escort',options);s=fight(s,'v11_grain',options);s=story(s,'v11_plain');return story(s,'v11_covenant');
}
export function finishEleven(s,branch='homeland',options={}){
 if(!s.progress.flags.v11_plain_read)s=prepareEleven(s,options);
 const before={inventory:structuredClone(s.inventory),player:structuredClone(s.player),flags:structuredClone(s.progress.flags)};
 s=story(s,'v11_reply',branch);s=story(s,'v11_reply','back');
 assert.deepEqual(s.inventory,before.inventory,'looking and cancelling never pays');assert.deepEqual(s.player,before.player);assert.deepEqual(s.progress.flags,before.flags,'looking and cancelling never locks a route');
 s=story(s,'v11_reply',branch);return closeChapter(s,11,'v11_reply','confirm_'+branch);
}
export function finishTwelve(s,ending='stay',options={}){
 s=story(s,'v12_choose',ending);const before={inventory:structuredClone(s.inventory),flags:structuredClone(s.progress.flags)};s=story(s,'v12_choose','back');
 assert.deepEqual(s.inventory,before.inventory);assert.deepEqual(s.progress.flags,before.flags);s=story(s,'v12_choose',ending);s=story(s,'v12_choose','confirm');
 for(const other of ['stay','sea','return'].filter(x=>x!==ending))assert.equal(routeTo(s,d,'v12_'+other+'_first_site'),null,'unchosen final route remains locked');
 for(const stage of ['first','second','third'])s=fight(s,'v12_'+ending+'_'+stage,options);
 s=story(s,'v12_epilogue','read_'+ending);s=closeChapter(s,12,'v12_epilogue');assert.equal(s.progress.flags['v12_ending_'+ending],true);
 assert.equal(['stay','sea','return'].filter(route=>s.progress.flags['v12_ending_'+route]).length,1);return s;
}
export function completeLateRoute({profile='spirit',mode='army',priority='rescue',branch='covert',allocation='supply',ending='stay',reports=[],seed=97,beforeFight}={}){
 let s=lateFixture({profile,mode,seed});const before=cultivation(s),options={reports,beforeFight};s=finishEight(s,priority,options);s=finishNine(s,branch,options);s=finishTen(s,allocation,options);s=finishEleven(s,ending==='return'?'charter':'homeland',options);s=finishTwelve(s,ending,options);assert.deepEqual(cultivation(s),before,'story preserves existing cultivation');return {s,reports};
}

let cachedBattleFixtures;
export function lateBattleFixtures(){
 if(!cachedBattleFixtures){
  const checkpoints={};
  for(const ending of ['stay','sea','return'])completeLateRoute({ending,beforeFight:(s,id)=>{checkpoints[id]??=s;}});
  assert.equal(Object.keys(checkpoints).length,20,'all late battle IDs have genuine narrative checkpoints');cachedBattleFixtures=checkpoints;
 }
 return structuredClone(cachedBattleFixtures);
}
function freezeAttacks(s){
 s.battleSkillMode='manual';for(const u of [...s.battle.team,...s.battle.enemy]){u.nextAttackAt=179000;u.skillReadyAt=179000;u.statuses=[];if(u.boss){u.boss.readyAt=179000;u.boss.pendingAt=0;}}
}
export function checkMechanics(base){
 let chosen=story(structuredClone(base),'v8_choose','rescue');let first=beginFight(chosen,'v8_rescue');const start=structuredClone(first);
 freezeAttacks(first);advanceBattle(first,d,1000);advanceBattle(first,d,1000);advanceBattle(first,d,1000);advanceBattle(first,d,1000);assert.equal(first.battle.mainline.escort.hp,88,'living source deals 12 per four seconds');
 let guarded=act(structuredClone(start),'battleOrder',{kind:'stance',value:'guard'});freezeAttacks(guarded);for(let i=0;i<4;i++)advanceBattle(guarded,d,1000);assert.equal(guarded.battle.mainline.escort.hp,94,'guard halves escort damage');
 let cleared=structuredClone(start);freezeAttacks(cleared);cleared.battle.enemy.find(u=>u.model==='v8_crossbow').hp=0;for(let i=0;i<8;i++)advanceBattle(cleared,d,1000);assert.equal(cleared.battle.mainline.escort.hp,100,'dead source stops escort damage');
 let exhausted=structuredClone(start);freezeAttacks(exhausted);for(let i=0;i<40&&!exhausted.battle.outcome;i++)advanceBattle(exhausted,d,1000);assert.equal(exhausted.battle.mainline.escort.hp,0);assert.equal(exhausted.battle.outcome,'defeat','escort loss defeats a healthy party');
 let retreat=act(start,'battleRetreat');retreat=act(retreat,'finishBattle');assert.equal(retreat.progress.flags.v8_rescue_done,undefined);assert.equal(retreat.progress.stories.v8_rescue.step,'fight');retreat=roundtrip(retreat,'撤退检查点');assert.equal(prepareSortie(retreat,d,{type:'chapterBattle',id:'v8_rescue',choice:'fight'}).reason,'','retreat allows retry');
 const failed=structuredClone(chosen);failed.team=['baisheng'];failed.heroes.baisheng={status:'owned',level:40,exp:0,quality:0};fight(failed,'v8_rescue',{expect:'defeat',medicines:false,orders:false});
 const restored=roundtrip(start,'战中无时间补算');assert.equal(restored.battle.elapsed,0);assert.deepEqual(restored.battle.mainline,start.battle.mainline);
 return {chosen,start};
}
export function checkPreparations(base){
 const variants={};for(const priority of ['rescue','evidence','supply']){
  let s=story(structuredClone(base),'v8_choose',priority);for(const name of [priority,...['rescue','evidence','supply'].filter(x=>x!==priority)])s=fight(s,'v8_'+name);
  s=beginFight(s,'v8_final');variants[priority]=s.battle;
 }
 assert.equal(variants.rescue.enemy.length,3);assert.equal(variants.evidence.enemy.length,3);assert.equal(variants.supply.enemy.length,2);
 for(const u of variants.rescue.team)assert.equal(variants.rescue.mainline.shields[u.id],Math.round(u.maxHp*.1));
 assert.equal(variants.rescue.enemy.find(u=>u.model==='v8_shiwengong').rage,30);assert.equal(variants.evidence.enemy.find(u=>u.model==='v8_shiwengong').rage,15);
 for(const id of ['evidence','supply'])assert.ok(Object.values(variants[id].mainline.shields).every(value=>value===0),'preparations never stack');
}
export function checkWaves(state){
 let s=story(structuredClone(state),'v10_report');s=beginFight(s,'v10_escort');freezeAttacks(s);
 s.battle.team[0].hp=0;for(const u of s.battle.team.slice(1)){u.hp=Math.round(u.maxHp*.6);u.rage=37;}
 const before=s.battle.team.map(u=>({id:u.id,hp:u.hp,rage:u.rage}));for(const u of s.battle.enemy)u.hp=0;
 advanceBattle(s,d,1);assert.equal(s.battle.mainline.wave,1);assert.equal(s.battle.outcome,null);assert.deepEqual(s.battle.team.map(u=>({id:u.id,hp:u.hp,rage:u.rage})),before,'wave preserves living HP/rage and never revives dead heroes');
 assert.equal(s.battle.enemy.length,2);assert.ok(s.battle.enemy.every(u=>u.nextAttackAt>s.battle.elapsed),'new wave attacks are scheduled after entry');
 let second=story(structuredClone(state),'v10_report');second=fight(second,'v10_escort');
 for(const allocation of ['supply','defense']){
  let p=story(structuredClone(second),'v10_allocate',allocation);p=beginFight(p,'v10_ford');freezeAttacks(p);
  if(allocation==='defense')for(const u of p.battle.team)assert.equal(p.battle.mainline.shields[u.id],Math.round(u.maxHp*.15));
  else{
   for(const u of p.battle.team){u.hp=Math.round(u.maxHp*.4);u.rage=37;}p.battle.team[0].hp=0;
   const initial=p.battle.team.map(u=>u.hp);for(const u of p.battle.enemy)u.hp=0;advanceBattle(p,d,1);
   assert.equal(p.battle.mainline.wave,1);assert.equal(p.battle.team[0].hp,0);for(let i=1;i<p.battle.team.length;i++)assert.equal(p.battle.team[i].hp,initial[i]+Math.round(p.battle.team[i].maxHp*.15),'supply heals surviving heroes at wave change');
  }
 }
}

export function checkTiming(eighth){
 let base=story(structuredClone(eighth),'v9_choose','assault');base=beginFight(base,'v9_gate');
 const simulate=(initial,slice)=>{const s=structuredClone(initial);for(let i=0;i<20000&&!s.battle.outcome;i++)advanceBattle(s,d,slice);assert.equal(s.battle.outcome,'victory');return s;};
 const broad=simulate(base,1000),fine=simulate(base,137);
 assert.deepEqual(fine.battle,broad.battle,'splitting elapsed time preserves all wave, skill, unit and log events');assert.equal(fine.rng,broad.rng,'slice size never changes RNG consumption');
 // A final DOT tick kills wave zero precisely at the global combat deadline.
 // There is still a complete second enemy wave; this cannot count as victory.
 const deadline=structuredClone(base);deadline.battleSkillMode='manual';deadline.battle.elapsed=179000;
 for(const u of [...deadline.battle.team,...deadline.battle.enemy]){u.nextAttackAt=181000;u.skillReadyAt=181000;u.statuses=[];}
 for(const u of deadline.battle.enemy)u.hp=0;
 const last=deadline.battle.enemy[0];last.hp=1;last.statuses=[{id:'poison',value:1,expiresAt:182000,nextTickAt:180000}];
 const stamina=deadline.player.stamina,food=deadline.camp.food;
 advanceBattle(deadline,d,1000);assert.equal(deadline.battle.elapsed,180000);assert.equal(deadline.battle.outcome,'retreat','a pending wave at the deadline cannot become a victory');assert.equal(deadline.battle.metrics.reason,'timeout');
 assert.equal(deadline.progress.flags.v9_gate_done,undefined);assert.equal(deadline.player.stamina,stamina);assert.equal(deadline.camp.food,food);
 let failed=act(deadline,'finishBattle');assert.equal(failed.progress.stories.v9_gate.step,'fight');assert.equal(failed.progress.flags.v9_gate_done,undefined);roundtrip(failed,'时限后仍有援军 · 未通关');
 const finalTick=structuredClone(base);finalTick.battleSkillMode='manual';for(const u of finalTick.battle.enemy)u.hp=0;advanceBattle(finalTick,d,1);assert.equal(finalTick.battle.mainline.wave,1);
 finalTick.battle.elapsed=179000;for(const u of [...finalTick.battle.team,...finalTick.battle.enemy]){u.nextAttackAt=181000;u.skillReadyAt=181000;u.statuses=[];if(u.boss){u.boss.readyAt=181000;u.boss.pendingAt=0;}}
 for(const u of finalTick.battle.enemy)u.hp=0;finalTick.battle.enemy[0].hp=1;finalTick.battle.enemy[0].statuses=[{id:'poison',value:1,expiresAt:182000,nextTickAt:180000}];
 advanceBattle(finalTick,d,1000);assert.equal(finalTick.battle.outcome,'victory','clearing the final required wave at the deadline still counts');roundtrip(finalTick,'时限末刻最后一波胜利');
 let escort=story(finishNine(structuredClone(eighth)),'v10_report');escort=beginFight(escort,'v10_escort');escort=act(escort,'battleOrder',{kind:'stance',value:'guard'});
 const slow=simulate(escort,1000),fast=simulate(escort,137);assert.deepEqual(fast.battle,slow.battle,'escort pulses and three waves are slice-invariant');assert.equal(fast.rng,slow.rng);
}
export function runGrid({profiles=['spirit','ordinary'],priorities=['rescue','evidence','supply'],branches=['covert','assault'],allocations=['supply','defense'],endings=['stay','sea','return']}={}){
 const reports=[],results=[];
 for(const profile of profiles){const base=lateFixture({profile}),before=cultivation(base);
  for(const priority of priorities){const eighth=finishEight(structuredClone(base),priority,{reports});
   for(const branch of branches){const ninth=finishNine(structuredClone(eighth),branch,{reports});
    for(const allocation of allocations){const tenth=finishTen(structuredClone(ninth),allocation,{reports}),prepared=prepareEleven(tenth,{reports});
     for(const ending of endings){let s=finishEleven(structuredClone(prepared),ending==='return'?'charter':'homeland',{reports});s=finishTwelve(s,ending,{reports});
      assert.deepEqual(cultivation(s),before,'story preserves existing cultivation');results.push({profile,priority,branch,allocation,ending,orders:s.inventory.recruit_order,essence:s.inventory.spirit_essence,seals:s.inventory.immortal_seal});
     }
    }
   }
  }
 }
 return {reports,results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 assert.equal(d.chapters.length,12,'all twelve volumes are present');
 const smoke=process.argv.includes('--smoke'),grid=runGrid(smoke?{profiles:['spirit'],priorities:['rescue'],branches:['covert'],allocations:['supply'],endings:['stay']}:{});
 console.table(Object.entries(Object.groupBy(grid.reports,r=>r.quality+':'+r.id)).map(([group,rows])=>({group,battles:rows.length,maxMs:Math.max(...rows.map(r=>r.ms)),minHp:Math.min(...rows.map(r=>r.hp)),minEscort:rows[0].escort===null?null:Math.min(...rows.map(r=>r.escort)),maxMedicine:Math.max(...rows.map(r=>r.medicine))})));console.log('Real combat completed '+grid.results.length+' mainline combinations / '+grid.reports.length+' battles.');
 if(!smoke){const base=lateFixture();checkMechanics(base);checkPreparations(base);const ninth=finishNine(finishEight(structuredClone(base)));checkWaves(ninth);checkTiming(finishEight(structuredClone(base)));const solo=completeLateRoute({mode:'solo',priority:'supply',branch:'covert',allocation:'defense',ending:'sea'});console.log('Solo route completed: '+solo.reports.length+' battles.');}
 console.log('Late-mainline PASS: real combat, branch locks, route cancellation, win-confirm progression, one-time chapter plus support rewards, portable checkpoints and preserved cultivation.');
}







