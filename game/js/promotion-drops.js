import {companionByDungeon} from './region-companions-data.js?v=0.91.0';
import {PROMOTION_CORES,PROMOTION_ITEMS,PROMOTION_CORE_RATES,PROMOTION_CORE_DOUBLE_RATE} from './promotion-data.js?v=0.91.0';
import {random,journal} from './utils.js?v=0.91.0';
const LIMIT=10000000;
// A tracked recipe directs the ingredient roll; no hero is forced into the fighting team.
export function promotionDropPool(s,d,context){
 if(!context||!['special','dungeon'].includes(context.type))return [];
 if(context.type==='special'&&!Object.hasOwn(PROMOTION_CORE_RATES,context.tier))return [];
 const chapter=context.type==='special'&&companionByDungeon(context.id);if(chapter)return context.tier===1&&PROMOTION_CORES[chapter.hero]?[PROMOTION_CORES[chapter.hero]]:[];
 const pool=d.heroes.map(h=>PROMOTION_CORES[h.id]).filter(Boolean).filter(r=>context.type==='special'?r.special.includes(context.id):r.dungeon===context.id);
 const goal=s.development?.goal,focused=goal?.kind==='promotion'?PROMOTION_CORES[goal.id]:goal?.kind==='stock'?PROMOTION_ITEMS[goal.id]:null;
 const directed=focused&&pool.find(r=>r.hero===focused.hero);if(directed)return [directed];
 const owned=pool.filter(r=>s.heroes[r.hero]?.status==='owned');return owned.length?owned:pool;
}
export function promotionDropRate(context){return context?.type==='special'?PROMOTION_CORE_RATES[context.tier]||0:context?.type==='dungeon'?.5:0;}
// Pure loot preview: callers apply the returned rng only during the victory transaction.
export function computePromotionDrops(s,d,b){
 const cursor={rng:s.rng},drops=[];
 if(!b||b.outcome!=='victory'||b.guest)return {drops,rng:cursor.rng};
 const pool=promotionDropPool(s,d,b.context),rate=promotionDropRate(b.context);if(!pool.length||!rate)return {drops,rng:cursor.rng};
 if(random(cursor)<rate){
  const core=pool.length===1?pool[0]:pool[Math.floor(random(cursor)*pool.length)],count=1+(random(cursor)<PROMOTION_CORE_DOUBLE_RATE?1:0),stored=Math.max(0,Math.min(count,LIMIT-(s.inventory[core.item]||0)));
  drops.push({kind:'item',id:core.item,count,stored});
 }
 return {drops,rng:cursor.rng};
}
// Call once from the existing settlement, before clearing the battle. No repeat-award state.
export function awardPromotionDrops(s,d,b){
 const result=computePromotionDrops(s,d,b);s.rng=result.rng;
 for(const row of result.drops)if(row.stored)s.inventory[row.id]=(s.inventory[row.id]||0)+row.stored;
 if(result.drops.length)journal(s,'【升品材料】'+result.drops.map(row=>d.by.items[row.id].name+' ×'+row.stored).join('、')+'。');
 return result.drops;
}
