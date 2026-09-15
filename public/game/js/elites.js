import { deployedTroops, troopShares, heroCommand } from './logistics.js?v=0.26.0';
import { startBattle } from './battle.js?v=0.26.0';
import { attachTroops } from './camp.js?v=0.26.0';
import { grant } from './item.js?v=0.26.0';
import { requireRule, count, journal, hasOwn } from './utils.js?v=0.26.0';
export const ELITES={
 siege:{name:'精英·铁壁营',level:20,hall:3,terrain:'land',enemies:['guard','bandit_chief'],scale:3.8,reward:{iron:8,scrap_iron:10,martial_pages:4},use:'精铁用于强化，碎铁用于练兵，残页用于招式与升品。'},
 convoy:{name:'精英·长路护粮',level:25,hall:4,terrain:'land',enemies:['road_raider','soldier'],scale:4.3,reward:{exp_pill:4,cloth:6,spirit_essence:2},use:'经验丹培养新人，布匹用于装备，灵蕴用于升品。'},
 tide:{name:'精英·潮生渡',level:30,hall:5,terrain:'water',enemies:['guard','road_raider'],scale:7.5,reward:{mount_feed:8,mount_token:6,spirit_essence:2},use:'草料与驯骑凭记用于坐骑，灵蕴用于升品。'}
};
export function elitePlan(s,id,kind='normal'){
 const model=hasOwn(ELITES,id)?ELITES[id]:null,hard=kind==='hard',used=s.daily.counters['elite_'+id]||0,n=deployedTroops(s),food=10+Math.ceil(n/2),stamina=hard?25:20;
 let reason=!model||!['normal','hard'].includes(kind)?'未知精英挑战。':!s.camp?'先建立寨子。':s.battle||s.scheme||s.event?'先结束当前交战或际遇。':s.camp.buildings.hall<model.hall?'聚义厅须达 '+model.hall+' 级。':!s.team.length?'先安排出阵好汉。':Math.max(...s.team.map(id=>s.heroes[id].level))<model.level?'队中一人须达 '+model.level+' 级。':used>=3?'今日此精英副本三次机会已用完。':s.player.stamina<stamina?'体力不足。':s.camp.food<food?'粮草不足。':s.camp.mode==='army'&&!n?'请先募兵，或改为英雄独行。':'';
 const reward=model?Object.fromEntries(Object.entries(model.reward).map(([id,n])=>[id,Math.floor(n*(hard?1.5:1))])):{};
 return {model,kind,used,food,stamina,troops:n,reward,scale:model?.scale*(hard?1.3:1),reason,first:!s.progress.flags['elite_first_'+id+'_'+kind]};
}
export function enterElite(s,d,a){const q=elitePlan(s,a.id,a.kind);requireRule(!q.reason,q.reason);s.player.stamina-=q.stamina;s.camp.food-=q.food;count(s,'elite_'+a.id);startBattle(s,d,{enemies:q.model.enemies,scale:q.scale,context:{type:'elite',id:a.id,kind:q.kind,terrain:q.model.terrain}});attachTroops(s,q.troops);journal(s,'【精英出征】'+q.model.name+' · '+(a.kind==='hard'?'禁药挑战：不能使用战斗药品，治疗技能仍可用。':'普通难度。'));}
export function finishElite(s,d,b){const model=ELITES[b.context.id],hard=b.context.kind==='hard',flag='elite_first_'+b.context.id+'_'+b.context.kind,items=Object.fromEntries(Object.entries(model.reward).map(([id,n])=>[id,Math.floor(n*(hard?1.5:1))]));if(!s.progress.flags[flag]){items.immortal_seal=(items.immortal_seal||0)+(hard?2:1);s.progress.flags[flag]=true;}grant(s,{items,exp:hard?900:600},d);count(s,'elite_win_'+b.context.id);journal(s,'【精英归寨】'+model.name+'已破，材料与历练入账；各难度首胜额外登仙印仅领一次。');}
export function validEliteContext(c){return !!c&&c.type==='elite'&&hasOwn(ELITES,c.id)&&['normal','hard'].includes(c.kind)&&c.terrain===ELITES[c.id].terrain;}
