import {companionSpec} from '../public/game/js/region-companions-data.js';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {prepareData,collections} from '../public/game/js/data.js';
import {newGame,dispatch} from '../public/game/js/core.js';
import {freshCamp} from '../public/game/js/camp.js';
import {gameSnapshot,exportSave,importSave} from '../public/game/js/portable.js';
import {promotionQuote,promoteHero,QUALITIES} from '../public/game/js/quality.js';
import {PROMOTION_CORES,PROMOTION_ITEMS,PROMOTION_CORE_COSTS,PROMOTION_CORE_RATES} from '../public/game/js/promotion-data.js';
import {promotionDropPool,computePromotionDrops,awardPromotionDrops} from '../public/game/js/promotion-drops.js';
import {promotionCoreSourceRows,promotionCoreUses} from '../public/game/js/promotion-sources.js';
import {qualityEmblem,qualitySteps,promotionCorePanel} from '../public/game/js/promotion-ui.js';
import {finishSpecial} from '../public/game/js/special-dungeons.js';
import {advanceBattle} from '../public/game/js/battle.js';
import {attributes} from '../public/game/js/hero.js';
import {specialReceipt} from '../public/game/js/special-dungeons-ui.js';
import {SPECIAL_DUNGEONS,specialDropTable} from '../public/game/js/special-dungeons-data.js';
const d=prepareData(Object.fromEntries(['config',...collections].map(n=>[n,JSON.parse(readFileSync(new URL('../public/game/data/'+n+'.json',import.meta.url),'utf8'))])));
function fixture(id='ruanxiaoqi'){const s=newGame(d,Date.parse('2026-10-13T12:00:00Z'),713);s.camp=freshCamp();s.camp.mode='solo';s.camp.buildings.hall=4;s.player.silver=50000;s.team=['linchong'];Object.assign(s.heroes.linchong,{status:'owned',level:30,exp:0});Object.assign(s.heroes[id],{status:'owned',level:30,exp:0});s.development={version:1,corps:{},presets:{},goal:{kind:'promotion',id},ledger:[]};return s;}
assert.equal(Object.keys(PROMOTION_CORES).length,d.heroes.length);
assert.equal(Object.keys(PROMOTION_ITEMS).length,d.heroes.length);
assert.equal(new Set(Object.values(PROMOTION_CORES).map(r=>r.name)).size,d.heroes.length);
const homes=new Set();
for(const h of d.heroes){
 const r=PROMOTION_CORES[h.id];assert.equal(r.hero,h.id);assert.equal(d.by.items[r.item].hero,h.id);assert.equal(d.by.items[r.item].price,0);assert.equal(d.by.items[r.item].type,'material');assert.ok(d.by.dungeons[r.dungeon]);
 for(const id of r.special){assert.ok(SPECIAL_DUNGEONS[id]);homes.add(id);assert.ok(promotionDropPool(fixture(h.id),d,{type:'special',id,tier:1}).some(c=>c.hero===h.id));}
 const s=fixture(h.id),q=promotionQuote(s,h.id);assert.equal(q.core.required,3);assert.equal(q.cost.items[r.item],3);assert.match(q.reason,new RegExp(r.name.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')));
 for(const [id,n] of Object.entries(q.cost.items))s.inventory[id]=n;
 assert.equal(promotionQuote(s,h.id).reason,'');const fundedSilver=s.player.silver;s.player.silver=q.cost.silver-1;const poorBefore=JSON.stringify(s);assert.throws(()=>promoteHero(s,d,h.id),/碎银不足/);assert.equal(JSON.stringify(s),poorBefore,'Unaffordable promotion leaves every field unchanged');s.player.silver=fundedSilver;const beforeLevel=s.heroes[h.id].level,beforeExp=s.heroes[h.id].exp,beforeSilver=s.player.silver;
 promoteHero(s,d,h.id);assert.equal(s.heroes[h.id].quality,1);assert.equal(s.heroes[h.id].level,beforeLevel);assert.equal(s.heroes[h.id].exp,beforeExp);assert.equal(s.player.silver,beforeSilver-q.cost.silver);assert.equal(s.inventory[r.item],0);
 const immortal=promotionQuote(s,h.id);assert.equal(immortal.cost.items[r.item],8);assert.deepEqual(Object.fromEntries(Object.entries(immortal.cost.items).filter(([id])=>id!==r.item)),QUALITIES[2].cost.items);
 const other=d.heroes.find(x=>x.id!==h.id);s.inventory[PROMOTION_CORES[other.id].item]=999;assert.ok(promotionQuote(s,h.id).reason,'Another hero core cannot pay this recipe');
 for(const [id,n] of Object.entries(immortal.cost.items))s.inventory[id]=n;const beforeImmortalSilver=s.player.silver;promoteHero(s,d,h.id);assert.equal(s.player.silver,beforeImmortalSilver-immortal.cost.silver);assert.equal(s.heroes[h.id].quality,2);assert.equal(promotionQuote(s,h.id).cost,undefined);
 const saved=gameSnapshot(s,d);assert.equal(saved.heroes[h.id].quality,2);assert.equal(importSave(exportSave(s,{id:1,name:'升品检查'},d),d).state.heroes[h.id].quality,2);
 const rows=promotionCoreSourceRows(fixture(h.id),d,r.item);assert.equal(rows.length,7+(companionSpec(h.id)?1:0));assert.ok(rows.every(row=>row.command&&row.detail.includes('不要求本人上阵')));assert.equal(promotionCoreUses(d,r.item)[0].command.hero,h.id);
}
assert.equal(homes.size,12);assert.deepEqual(PROMOTION_CORE_COSTS,{1:3,2:8});
const s=fixture(),core=PROMOTION_CORES.ruanxiaoqi,b={outcome:'victory',guest:false,context:{type:'special',id:core.special[0],tier:1}};
assert.ok(!s.team.includes('ruanxiaoqi'),'A weak recruit is not forced to join the battle');assert.deepEqual(promotionDropPool(s,d,b.context).map(r=>r.hero),['ruanxiaoqi']);
const before=JSON.stringify(s),preview=computePromotionDrops(s,d,b);assert.equal(JSON.stringify(s),before);assert.deepEqual(computePromotionDrops(s,d,b),preview);
const unrelated={...b,context:{type:'special',id:'mine',tier:1}};assert.ok(!promotionDropPool(s,d,unrelated.context).some(r=>r.hero==='ruanxiaoqi'));
for(const outcome of ['defeat','retreat',null])assert.deepEqual(computePromotionDrops(s,d,{...b,outcome}),{drops:[],rng:s.rng});
for(const type of ['story','event','lesson','camp','rotation','replay'])assert.deepEqual(computePromotionDrops(s,d,{...b,context:{type,id:core.special[0],tier:1}}),{drops:[],rng:s.rng});
assert.deepEqual(computePromotionDrops(s,d,{...b,guest:true}),{drops:[],rng:s.rng});
for(const tier of [1,2,3]){
 const trial=fixture();trial.rng=38276094;let hits=0,twos=0,amount=0;
 for(let i=0;i<12000;i++){const result=computePromotionDrops(trial,d,{...b,context:{...b.context,tier}});trial.rng=result.rng;for(const row of result.drops){assert.equal(row.id,core.item);assert.ok([1,2].includes(row.count));assert.equal(row.stored,row.count);hits++;twos+=row.count===2;amount+=row.count;}}
 assert.ok(Math.abs(hits/12000-PROMOTION_CORE_RATES[tier])<.02);assert.ok(Math.abs(twos/hits-.25)<.03);assert.ok(amount>hits);
}
const apply=fixture();apply.rng=1001;const expected=computePromotionDrops(apply,d,b),rows=awardPromotionDrops(apply,d,b);assert.deepEqual(rows,expected.drops);assert.equal(apply.rng,expected.rng);assert.equal(apply.inventory[core.item],rows[0].stored);assert.match(apply.journal.at(-1).text,/升品材料/);
const full=fixture();full.rng=1001;full.inventory[core.item]=10000000;assert.equal(awardPromotionDrops(full,d,b)[0].stored,0);assert.equal(full.inventory[core.item],10000000);
const stock=fixture();stock.development.goal={kind:'stock',id:core.item,amount:3};assert.deepEqual(promotionDropPool(stock,d,b.context).map(r=>r.hero),['ruanxiaoqi']);
assert.equal(promotionCoreSourceRows(s,d,'iron').length,0);assert.equal(promotionCoreUses(d,'iron').length,0);assert.ok(qualityEmblem(0).includes('<rect'));assert.ok(qualityEmblem(1).includes('M28 4'));assert.ok(qualityEmblem(2).includes('<circle'));assert.ok(qualitySteps(1).includes('灵品 · 当前'));
const text=(label)=>'<button>'+label+'</button>';assert.ok(promotionCorePanel(s,d,'ruanxiaoqi',String,text).includes(core.name));
// The real settlement must add the same one core roll as the standalone preview.
const settlementRuns=[];let actualDrops=0;
for(let i=1;i<=16;i++){
 let run=fixture();run.rng=i*382719;run.battleSkillMode='auto';run=dispatch(d,run,{type:'specialStart',id:core.special[0],tier:1},run.clock);
 for(let n=0;n<180&&!run.battle.outcome;n++)advanceBattle(run,d,1000);
 assert.equal(run.battle.outcome,'victory');const b=structuredClone(run.battle),simulation=structuredClone(run);finishSpecial(simulation,d,simulation.battle);const predicted=computePromotionDrops(simulation,d,b),beforeCore=run.inventory[core.item]||0;
 const settled=dispatch(d,run,{type:'finishBattle'},run.clock),gained=(settled.inventory[core.item]||0)-beforeCore;
 assert.equal(gained,predicted.drops.reduce((n,r)=>n+r.stored,0));assert.equal(settled.rng,predicted.rng);assert.equal(settled.progress.flags.promotion_cores_v1===true,gained>0);assert.equal(settled.battle,null);assert.deepEqual(gameSnapshot(settled,d),settled);
 const snapshot=JSON.stringify(settled);assert.throws(()=>dispatch(d,settled,{type:'finishBattle'},settled.clock));assert.equal(JSON.stringify(settled),snapshot);
 const receipt=specialReceipt(run,settled,d,String);if(gained)assert.ok(receipt.includes(core.name),'core material is visible in the real battle receipt');assert.equal(JSON.stringify(settled),snapshot,'receipt cannot award or alter inventory');
 actualDrops+=gained;settlementRuns.push({seed:i*382719,seconds:b.elapsed/1000,gained,marker:!!settled.progress.flags.promotion_cores_v1});
}
assert.ok(actualDrops>0);
// Compare the three hero tiers using identical fighter role, levels and qualities, no gear.
const tierExamples=['wusong','wangjin',d.heroes.find(h=>h.obtain.type==='wanderer'&&h.type==='fighter').id],tierComparison=[];
for(const level of [1,15,30])for(const quality of [0,1,2]){
 if(level<QUALITIES[quality].level)continue;
 const same=fixture();same.equipment=[];same.growth=undefined;for(const id of tierExamples)Object.assign(same.heroes[id],{status:'owned',level,exp:0,quality});
 const stats=tierExamples.map(id=>attributes(same,id,d));for(const key of ['hp','attack','defense'])assert.ok(stats[0][key]>stats[1][key]&&stats[1][key]>stats[2][key],key+' '+level+' quality '+quality);
 tierComparison.push({level,quality,rows:tierExamples.map((id,i)=>({hero:id,hp:stats[i].hp,attack:stats[i].attack,defense:stats[i].defense}))});
}
const output=new URL('../artifacts/promotion-083/',import.meta.url);mkdirSync(output,{recursive:true});writeFileSync(new URL('integration-report.json',output),JSON.stringify({heroes:d.heroes.length,coreCosts:PROMOTION_CORE_COSTS,rates:PROMOTION_CORE_RATES,settlementRuns,actualDrops,tierComparison},null,2)+'\n');
console.log('Promotion cores PASS: '+d.heroes.length+' personal recipes, 12 special dungeon homes, all sources navigable, 3/8 exact costs and own ingredients, old qualities preserved, pure deterministic loot, 40/55/70% separate rolls, 25% doubles, target selection without forced party, failures/guests rejected, capacity, stock tracking, 16 real once-only victory settlements and same-role three-tier strength.');
