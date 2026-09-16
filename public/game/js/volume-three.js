import { sixthEnemyList, applySixthPreparation } from './volume-six-data.js?v=0.29.0';
import { deployedTroops } from './logistics.js?v=0.29.0';
import { fifthEnemyList, applySiegePreparation } from './volume-five-data.js?v=0.29.0';
import { applyAllianceSupport } from './volume-four-data.js?v=0.29.0';
import { CHAPTER_MISSIONS } from './volume-three-data.js?v=0.29.0';
export { CHAPTER_MISSIONS };
import { startBattle } from './battle.js?v=0.29.3';
import { attachTroops } from './camp.js?v=0.29.3';
import { hasOwn, requireRule, journal } from './utils.js?v=0.29.0';
export function chapterBattlePlan(s,id){const m=hasOwn(CHAPTER_MISSIONS,id)?CHAPTER_MISSIONS[id]:null,n=deployedTroops(s),food=8+Math.ceil(n/2),scouted=!!(m?.intel&&s.progress.flags.v3_scouted);
 const sixth=id.startsWith('v6_'),fifth=id.startsWith('v5_'),fourth=id.startsWith('v4_'),prior=sixth?'volume_five_complete':fifth?'volume_four_complete':fourth?'volume_three_complete':'volume_two_complete',reason=!m?'没有此章战役。':!s.progress.flags[prior]?(sixth?'先完成第五卷。':fifth?'先完成第四卷。':fourth?'先完成第三卷。':'先完成第二卷。'):!s.camp?'先建立寨子。':s.camp.buildings.hall<(m.hall||1)?'聚义厅须达 '+m.hall+' 级。':s.battle||s.scheme||s.event?'先结束当前战局或际遇。':!s.team.length?'先安排出阵好汉。':!s.team.some(id=>s.heroes[id].level>=m.level)?'队中一人须达 '+m.level+' 级。':s.player.stamina<m.stamina?'体力不足。':s.camp.food<food?'粮草不足。':s.camp.mode==='army'&&!n?'请先募兵，或改为英雄独行。':'';
 return {model:m,reason,troops:n,food,stamina:m?.stamina||0,scale:(m?.scale||1)*(scouted?.85:1),scouted};}
export function startChapterBattle(s,d,id,choice){const q=chapterBattlePlan(s,id);requireRule(!q.reason,q.reason);s.player.stamina-=q.stamina;s.camp.food-=q.food;startBattle(s,d,{...choice.battle,enemies:sixthEnemyList(s,id,fifthEnemyList(s,id,choice.battle.enemies)),scale:q.scale,context:{type:'story',id,next:choice.next,terrain:q.model.terrain}});attachTroops(s,q.troops);applyAllianceSupport(s,s.battle);applySiegePreparation(s,s.battle);applySixthPreparation(s,s.battle);journal(s,(id.startsWith('v6_')?'【高唐救援出征】':id.startsWith('v5_')?'【三打祝家庄出征】':id.startsWith('v4_')?'【三山聚义出征】':'【梁山初聚出征】')+d.by.stories[id].title+' · 体力 -'+q.stamina+'、粮草 -'+q.food+(q.scouted?'。望哨情报生效，敌军气血、攻击、防御、谋略降低 15%。':'。'));
}
export function hasThirdVolume(s){return s.progress.visited.some(id=>id.startsWith('v3_'))||Object.keys(s.progress.stories).some(id=>id.startsWith('v3_'))||s.battle?.context.id?.startsWith('v3_')||s.lastBattle?.context.id?.startsWith('v3_')||!!s.progress.flags.volume_three_complete;}
