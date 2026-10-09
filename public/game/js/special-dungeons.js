import {recordGatheringClear} from './gathering.js?v=0.69.0';
import {gatheringRegion} from './gathering-data.js?v=0.69.0';
import {SPECIAL_ROUTES,routeReward,routeAllowed} from './special-routes.js?v=0.69.0';
import {SPECIAL_DUNGEONS,SPECIAL_TIERS,specialDropTable,validSpecialContext} from './special-dungeons-data.js?v=0.69.0';
import {startBattle,addStatus,attackInterval} from './battle.js?v=0.69.0';
import {attachTroops} from './camp.js?v=0.69.0';
import {newEquipment} from './item.js?v=0.69.0';
import {hasOwn,requireRule,journal,random} from './utils.js?v=0.69.0';
export {SPECIAL_DUNGEONS,SPECIAL_TIERS,specialDropTable,validSpecialContext};
const LIMIT=10000000,EQUIPMENT_LIMIT=200;
export function specialRecord(s){return s.specialDungeons??={version:1,clears:{},last:null};}
export function specialPlan(s,id,tier,route){
 const dungeon=hasOwn(SPECIAL_DUNGEONS,id)?SPECIAL_DUNGEONS[id]:null,difficulty=Number.isInteger(tier)&&hasOwn(SPECIAL_TIERS,tier)?SPECIAL_TIERS[tier]:null,drops=specialDropTable(id,tier),requiredSlots=drops.filter(r=>r.kind==='equipment').reduce((n,r)=>n+r.max,0);
 let reason=!routeAllowed(route,id)?'无效的副本路线。':!dungeon||!difficulty?'请选择副本和难度。':!s.camp?'先建立寨子。':s.battle||s.scheme||s.event?'先结束当前交战、计策或际遇。':s.realm?.trek||s.expansion?.run?'先走完当前远征。':!s.team.length?'先安排出阵好汉。':s.team.some(h=>s.heroes[h]?.status!=='owned')?'出阵队伍中有未入寨的好汉。':s.team.some(h=>s.affairs?.mission?.hero===h||s.realm?.squad?.team.includes(h))?'出阵好汉仍在外派，请先接回。':s.camp.buildings.hall<difficulty.hall?'聚义厅需要 '+difficulty.hall+' 级。':!s.team.some(h=>s.heroes[h].level>=difficulty.level)?'出阵队伍至少需要一位 '+difficulty.level+' 级好汉。':dungeon.parent&&(s.specialDungeons?.clears[dungeon.parent+'_'+tier]||0)<5?'先通关'+SPECIAL_DUNGEONS[dungeon.parent].name+'同难度 5 次，寻找入口。':tier>1&&!(s.specialDungeons?.clears[id+'_'+(tier-1)]>0)?'先通关本副本的上一难度。':(s.specialDungeons?.clears[id+'_'+tier]||0)>=LIMIT?'本难度通关次数已达存储上限。':s.equipment.length+requiredSlots>EQUIPMENT_LIMIT?'请先整理行囊，至少留出 '+requiredSlots+' 个装备空位。':s.nextEquipment+requiredSlots>LIMIT?'装备编号已达存储上限。':'';
 if(!reason&&drops.some(r=>r.kind==='item'&&(s.inventory[r.id]||0)+r.max>LIMIT))reason='部分掉落材料接近存储上限，请先使用或加工。';
 const bonus=routeReward(route,tier);if(!reason&&bonus&&(s.inventory[bonus.id]||0)+bonus.count+(drops.find(r=>r.id===bonus.id)?.max||0)>LIMIT)reason='路线奖励将超过材料上限，请先整理行囊。';
 return {reason,dungeon,difficulty,tier,route,bonus,stamina:0,food:0,drops,requiredSlots};
}
export function enterSpecial(s,d,a){
 const q=specialPlan(s,a.id,a.tier,a.route);requireRule(!q.reason,q.reason);specialRecord(s);
 startBattle(s,d,{enemies:q.route?[...q.dungeon.enemies,SPECIAL_ROUTES[q.route].enemy]:q.dungeon.enemies,scale:q.difficulty.scale,context:{type:'special',id:a.id,tier:a.tier,terrain:q.dungeon.terrain,...(q.route?{route:q.route}:{})}});attachTroops(s,0);
 const b=s.battle;if(a.id==='marshnest')b.enemy[0].boss={kind:'chief',readyAt:6000,pendingAt:0,phase:0};for(const u of b.enemy)u.hp=u.maxHp=Math.round(u.maxHp*q.dungeon.hp[a.tier-1]);
 if(a.id==='mine')addStatus(b.enemy[0],{id:'guard',value:.2,turns:5},0);
 if(a.id==='marsh')for(const u of b.enemy)if(u.model==='snake')u.rage=70;
 if(a.id==='ruins'){b.enemy[0].rage=50;for(const u of b.enemy.slice(1)){u.speed=Math.round(u.speed*1.2);u.nextAttackAt=attackInterval(u);}}
 if(a.id==='minechief'){addStatus(b.enemy[0],{id:'guard',value:.3,turns:6},0);for(const u of b.enemy.slice(1))u.rage=60;}
 if(a.id==='marshnest')for(const u of b.enemy){if(u.model==='snake')u.rage=90;else{u.speed=Math.round(u.speed*1.3);u.nextAttackAt=attackInterval(u);}}
 if(a.id==='ruinsvault'){b.enemy[0].rage=80;for(const u of b.enemy.slice(1)){u.speed=Math.round(u.speed*1.35);u.nextAttackAt=attackInterval(u);}}
 if(q.route){const r=SPECIAL_ROUTES[q.route];for(const u of b.enemy){u.hp=u.maxHp=Math.round(u.maxHp*r.hp);u.speed=Math.round(u.speed*r.speed);u.nextAttackAt=attackInterval(u);}if(q.route==='supplies')b.enemy.at(-1).rage=90;if(q.route==='oreguard')for(const u of b.enemy)addStatus(u,{id:'guard',value:.45,turns:6},0);if(q.route==='poisonbank')for(const u of b.team)addStatus(u,{id:'poison',value:Math.max(1,Math.round(u.maxHp*.03)),turns:4},0);b.log.push('【'+r.name+'】'+r.text);}
 b.log.push('【'+q.dungeon.name+' · '+q.difficulty.name+'】'+q.dungeon.rule);
 journal(s,'进入'+q.dungeon.name+'（'+q.difficulty.name+'）。只由好汉出战，不耗体力与粮草；战斗用药按实际使用扣除。');
 return q;
}
export function finishSpecial(s,d,b){
 requireRule(s.battle===b&&validSpecialContext(b?.context)&&['victory','defeat','retreat'].includes(b.outcome),'没有待结算的寻宝副本。');
 const {id,tier}=b.context,record=specialRecord(s),drops=[],cursor={rng:s.rng};
 if(b.outcome==='victory'){
  recordGatheringClear(s,gatheringRegion(id),tier);
  requireRule((record.clears[id+'_'+tier]||0)<LIMIT,'本难度通关次数已达存储上限。');
  for(const row of specialDropTable(id,tier))if(random(cursor)<row.rate){
   const count=row.min+(row.max>row.min?Math.floor(random(cursor)*(row.max-row.min+1)):0);
   const stored=row.kind==='equipment'?Math.max(0,Math.min(count,EQUIPMENT_LIMIT-s.equipment.length-drops.filter(r=>r.kind==='equipment').reduce((n,r)=>n+r.stored,0),LIMIT-s.nextEquipment-drops.filter(r=>r.kind==='equipment').reduce((n,r)=>n+r.stored,0))):Math.max(0,Math.min(count,LIMIT-(s.inventory[row.id]||0)));
   drops.push({kind:row.kind,id:row.id,count,stored});
  }
  for(const row of drops){if(row.kind==='equipment'){for(let n=0;n<row.stored;n++)newEquipment(s,row.id);}else if(row.stored)s.inventory[row.id]=(s.inventory[row.id]||0)+row.stored;}
  record.clears[id+'_'+tier]=(record.clears[id+'_'+tier]||0)+1;s.rng=cursor.rng;
 }
 let bonus=null;if(b.context.route&&b.outcome==='victory'){const q=routeReward(b.context.route,tier),stored=Math.max(0,Math.min(q.count,LIMIT-(s.inventory[q.id]||0)));s.inventory[q.id]=(s.inventory[q.id]||0)+stored;bonus={...q,stored};journal(s,'【路线收获】'+d.by.items[q.id].name+' ×'+stored+'。');}
 record.last={id,tier,outcome:b.outcome,at:s.clock,drops,...(b.context.route?{route:b.context.route,bonus}:{})};
 const name=SPECIAL_DUNGEONS[id].name;
 if(b.outcome!=='victory')journal(s,'【'+name+'】'+(b.outcome==='retreat'?'已撤离':'未能通过')+'，没有带回物品，可随时再来。');
 else if(!drops.length)journal(s,'【'+name+'】已通关。'+(bonus?'除路线材料外，没有其他收获。':'这趟没有找到可带走的物品。'));
 else{journal(s,'【'+name+'】'+drops.map(r=>(r.kind==='equipment'?d.by.equipments:d.by.items)[r.id].name+' ×'+r.stored).join('、')+'。');if(drops.some(r=>r.stored<r.count))journal(s,'行囊容量不足，'+drops.filter(r=>r.stored<r.count).map(r=>(r.kind==='equipment'?d.by.equipments:d.by.items)[r.id].name+' '+(r.count-r.stored)+' 件').join('、')+'未能入库；原有物品均已保留。');}
 s.battle=null;return record.last;
}
