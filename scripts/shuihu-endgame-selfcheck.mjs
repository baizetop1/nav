import {equipmentPool} from '../public/game/js/camp-development.js';
import {RECIPES} from '../public/game/js/provisions.js';
import {newEquipment} from '../public/game/js/item.js';
import assert from 'node:assert/strict';
import {fixture,d,act,win} from './shuihu-campaign-fixtures.mjs';
import {completeLateRoute} from './shuihu-late-mainline-selfcheck.mjs';
import {advanceBattle,useBattleItem} from '../public/game/js/battle.js';
import {gameSnapshot} from '../public/game/js/portable.js';
import {SPECIAL_DUNGEONS,specialPlan,specialDropTable} from '../public/game/js/special-dungeons.js';
import {PERSONAL} from '../public/game/js/expansion-data.js';
import {expansion} from '../public/game/js/expansion-state.js';
import {personalFactor} from '../public/game/js/expansion-combat.js';
import {replayUnlocked,replayMissions} from '../public/game/js/replays-data.js';
import {economyQuote} from '../public/game/js/sortie-economy.js';
import {prepareSortie} from '../public/game/js/sortie.js';
const clone=structuredClone;
assert.ok(equipmentPool(d,3).every(e=>!e.source),'exclusive equipment excluded from generic drops');
assert.ok(RECIPES.dark_iron.silver+RECIPES.tempered_steel.silver<d.by.items.dark_iron.price,'using farmed materials costs less silver');
assert.ok(RECIPES.blueprint.silver+Object.entries(RECIPES.blueprint.items).reduce((n,[id,q])=>n+d.by.items[id].price*q,0)<d.by.items.blueprint.price);

const invalid=(s,f)=>{const bad=clone(s);f(bad);assert.throws(()=>gameSnapshot(bad,d));};
let area=fixture(642,40);area.battleSkillMode='auto';area.player.stamina=0;area.camp.food=0;
for(const hero of area.team)for(const id of ['long_spear','iron_helmet','tiger_armor','leather_belt','swift_boots','river_charm']){const e=newEquipment(area,id);e.hero=hero;e.plus=3;}
const hidden=Object.keys(SPECIAL_DUNGEONS).filter(id=>SPECIAL_DUNGEONS[id].parent);
assert.equal(hidden.length,3);
for(const id of hidden){const parent=SPECIAL_DUNGEONS[id].parent;assert.match(specialPlan(area,id,1).reason,/5 次/);for(const tier of [1,2,3]){
 for(let i=0;i<5;i++)area=win(act(area,'specialStart',{id:parent,tier}));
 const before=clone(area);area=act(area,'specialStart',{id,tier});assert.equal(area.battle.expedition.troops,0);assert.deepEqual(gameSnapshot(area,d),area);console.log('Hidden fight',id,tier);area=win(area);assert.equal(area.specialDungeons.clears[id+'_'+tier],1);assert.deepEqual(area.player,before.player);assert.deepEqual(area.camp,before.camp);
 }
 const model=specialDropTable(id,1).find(x=>x.kind==='equipment').id;assert.throws(()=>act(area,'craftEquip',{id:model}),/掉落/);assert.throws(()=>act(area,'buyEquip',{id:model}),/掉落/);
 invalid(area,s=>s.specialDungeons.clears[parent+'_1']=4);
}
console.log('Hidden chambers: 45 parent fights + 9 elite fights, unlocks, zero costs, exclusive equipment, portable save PASS');
let hero=fixture(649,30);expansion(hero);hero.expansion.personal.linchong=true;const money=hero.player.silver;
hero=act(hero,'personalStyle',{id:'linchong',style:'force'});assert.equal(hero.player.silver,money);
let fight=act(hero,'specialStart',{id:'mine',tier:1});assert.equal(personalFactor(fight.battle,fight.battle.team[0],false),1.08);assert.equal(personalFactor(fight.battle,fight.battle.team[0],true),1);invalid(fight,s=>s.battle.expansion.styles.linchong='guard');assert.throws(()=>act(fight,'personalStyle',{id:'linchong',style:'guard'}));
hero=act(hero,'personalStyle',{id:'linchong',style:'guard'});assert.equal(hero.player.silver,money-50);fight=act(hero,'specialStart',{id:'mine',tier:1});assert.ok(fight.battle.team[0].statuses.some(x=>x.id==='guard'&&x.value>=.08));assert.deepEqual(gameSnapshot(fight,d),fight);assert.throws(()=>act(hero,'personalStyle',{id:'wangjin',style:'force'}));
for(const id of Object.keys(PERSONAL).filter(id=>PERSONAL[id].introduced===3)){let s=fixture(650,20);s.heroes[id]={status:'owned',level:20,exp:0};const m=PERSONAL[id];s.team=m.solo?[id]:[id,'baisheng','linchong'];if(m.troops){s.camp.mode='army';s.camp.troops=100;s.camp.deployment=100;}s=act(s,'personalStart',{id});s.battleSkillMode='auto';for(let i=0;i<180&&!s.battle.outcome;i++)advanceBattle(s,d,1000);const result=s.battle; s=act(s,'finishBattle');assert.equal(s.expansion.personal[id],true,id+' task completes');}
console.log('Personal styles: free first choice, paid respec, combat modifiers and validation PASS');
const finished=completeLateRoute().s;assert.ok(finished.progress.flags.volume_twelve_complete);
const official=clone({progress:finished.progress,player:finished.player,camp:finished.camp,inventory:finished.inventory,heroes:finished.heroes,stats:finished.stats,daily:finished.daily,equipment:finished.equipment,recruit:finished.recruit});
let replay=finished;let fought=0;
for(const id of Object.keys(replayMissions).filter(id=>replayUnlocked(replay,id))){replay=act(replay,'replayStart',{id,tier:1});assert.deepEqual(gameSnapshot(replay,d),replay);assert.throws(()=>useBattleItem(replay,d,'jinchuangyao'),/回顾/);for(let i=0;i<180&&!replay.battle.outcome;i++)advanceBattle(replay,d,1000);assert.equal(replay.battle.outcome,'victory',id);replay=act(replay,'finishBattle');fought++;}
assert.deepEqual({progress:replay.progress,player:replay.player,camp:replay.camp,inventory:replay.inventory,heroes:replay.heroes,stats:replay.stats,daily:replay.daily,equipment:replay.equipment,recruit:replay.recruit},official);
invalid(replay,s=>s.replays.best.bad_1=1);invalid(replay,s=>s.replays.clears.bad_1=1);
let retry=act(replay,'replayStart',{id:'v12_sea_third',tier:2});for(let i=0;i<4;i++)advanceBattle(retry,d,1000);let restored=gameSnapshot(retry,d);for(let i=0;i<180&&!restored.battle.outcome;i++)advanceBattle(restored,d,1000);restored=act(restored,'finishBattle');assert.ok(restored.replays.clears.v12_sea_third_1);
console.log('Replay: '+fought+' real victories, 3 endings, formal progress/resources unchanged, mid-battle reload PASS');
for(const level of [10,25,40])for(const soldiers of [0,50,200]){let s=fixture(700,level);s.battleSkillMode='auto';s.camp.troops=soldiers;s.camp.mode=soldiers?'army':'solo';s.camp.deployment=Math.max(1,soldiers);const q=prepareSortie(s,d,{type:'campRaid',id:'woods'});assert.equal(q.reason,'');const b=q.next;for(let i=0;i<180&&!b.battle.outcome;i++)advanceBattle(b,d,1000);const ledger=economyQuote(s,b.battle,q.cost),done=act(b,'finishBattle');assert.equal(done.player.silver-s.player.silver,ledger.rewardSilver);assert.equal(done.camp.food-s.camp.food,ledger.rewardFood-q.cost.food);assert.equal(done.camp.fallen-(s.camp.fallen||0),ledger.fallen);console.log('Economy',level,soldiers,{silver:ledger.netSilver,food:ledger.netFood,fallen:ledger.fallen});}
let discounted=fixture(888,25);discounted.camp.mode='army';discounted.camp.deployment=100;discounted.camp.troops=100;discounted.realm.branches.barracks='recruits';const preview=prepareSortie(discounted,d,{type:'campRaid',id:'fort'}),quote=economyQuote(discounted,preview.battle,preview.cost,{outcome:'defeat',health:0,elapsed:60000});assert.ok(quote.fallen>0);assert.equal(quote.replaceSilver,quote.fallen*2);assert.equal(quote.netSilver,-quote.replaceSilver);
console.log('Endgame selfcheck PASS');
