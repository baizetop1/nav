import {PROMOTION_ITEMS,PROMOTION_CORE_RATES} from './promotion-data.js?v=0.83.0';
import {promotionDropPool,promotionDropRate} from './promotion-drops.js?v=0.83.0';
import {SPECIAL_DUNGEONS,SPECIAL_TIERS,specialPlan} from './special-dungeons.js?v=0.83.0';
import {dungeonEntry} from './map.js?v=0.83.0';
const percent=n=>Number((n*100).toFixed(2))+'%';
export function promotionCoreSourceRows(s,d,itemId){
 const core=PROMOTION_ITEMS[itemId];if(!core)return [];
 const rows=[],contextRows=[];
 for(const id of core.special)for(const tier of [1,2,3])contextRows.push({context:{type:'special',id,tier},name:SPECIAL_DUNGEONS[id].name+' · '+SPECIAL_TIERS[tier].name,reason:specialPlan(s,id,tier).reason,command:{type:'ui_specialView',id,tier,tab:'drops',category:'core'},cost:'不耗体力、粮草'});
 const dungeon=d.by.dungeons[core.dungeon];if(dungeon){const used=s.daily.dungeons[dungeon.id]||0;contextRows.push({context:{type:'dungeon',id:dungeon.id},name:dungeon.name,reason:!dungeonEntry(s,dungeon)?'先满足主线或聚义厅开放条件':used>=dungeon.limit?'今日次数用完':!s.team.some(id=>s.heroes[id].level>=dungeon.level)?'队中一人 '+dungeon.level+' 级':s.player.stamina<dungeon.cost?'体力不足':'',command:{type:'ui_sourceDungeon',id:dungeon.id},cost:'体力 '+dungeon.cost+' · 今日 '+used+'/'+dungeon.limit});}
 for(const row of contextRows){const pool=promotionDropPool(s,d,row.context),available=pool.some(r=>r.item===core.item),focused=pool.length===1&&available,base=promotionDropRate(row.context),rate=available?base/pool.length:0;
  rows.push({key:'promotion:'+row.context.type+':'+row.context.id+':'+(row.context.tier||1),name:row.name,mode:'核心材料',detail:'胜利定向掉落 '+percent(base)+'；命中 1 份，另有 25% 多得 1 份。'+(focused?'当前已定向此人。':'先追踪此材料或'+d.by.heroes[core.hero].name+'升品，即可定向；未追踪时从该地人物材料池中抽取。')+' '+row.cost+'。不要求本人上阵。',command:row.command,reason:row.reason,rate,min:1,max:2,priority:2});
 }
 return rows;
}
export function promotionCoreUses(d,itemId){const core=PROMOTION_ITEMS[itemId];return core?[{name:d.by.heroes[core.hero].name+' · 品阶突破',command:{type:'ui_section',view:'heroes',id:'quality',hero:core.hero}}]:[];}
