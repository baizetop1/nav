import {meets} from './map.js?v=0.83.0';
import {deployedTroops} from './logistics.js?v=0.83.0';
import {difficultyQuote} from './difficulty.js?v=0.83.0';
const UNLOCK_TEXT={jingyanggang:'完成景阳冈打虎',huangnigang:'完成黄泥冈主线',yezhulin:'完成黄泥冈主线或野猪林救援',shanshenmiao:'完成黄泥冈主线或风雪山神庙',zhujiazhuang:'完成黄泥冈主线',chai_escort:'完成柴庄避难',qingzhou_patrol:'完成杨志护道',spirit_trial:'聚义厅达到 2 级',immortal_trial:'聚义厅达到 4 级'};
export function storyRevisitUnlocked(state,dungeon){
 if(!dungeon)return false;
 if(state.camp&&(state.camp.buildings.hall||0)>=Math.min(5,1+Math.floor(dungeon.level/10)))return true;
 return (state.progress.clears[dungeon.id]||0)>0||meets(state,dungeon.condition)||(dungeon.entrances||[]).some(entry=>meets(state,entry.condition));
}
const revisitUnlockText=dungeon=>(UNLOCK_TEXT[dungeon.id]||'完成此地主线')+(['spirit_trial','immortal_trial'].includes(dungeon.id)?'':'，或聚义厅达到 '+Math.min(5,1+Math.floor(dungeon.level/10))+' 级');
export function storyRevisitList(state,data){return data.dungeons.map(dungeon=>({...dungeon,unlocked:storyRevisitUnlocked(state,dungeon),unlockText:revisitUnlockText(dungeon),remaining:Math.max(0,dungeon.limit-(state.daily.dungeons[dungeon.id]||0)),clears:state.progress.clears[dungeon.id]||0}));}
export function storyRevisitQuote(state,data,id){
 const dungeon=data.by.dungeons[id],unlocked=storyRevisitUnlocked(state,dungeon),troops=dungeon?.kind==='scheme'?0:deployedTroops(state),food=state.camp?.mode==='army'?Math.ceil(troops/2):0;
 let reason=!dungeon?'没有这处历练':!unlocked?revisitUnlockText(dungeon):state.battle||state.scheme||state.event?'先结束当前战局':!state.team.length?'先安排出阵好汉':Math.max(...state.team.map(hero=>state.heroes[hero].level))<dungeon.level?'队中至少一人达到 '+dungeon.level+' 级':(state.daily.dungeons[id]||0)>=dungeon.limit?'今日次数已用完':state.player.stamina<dungeon.cost?'体力不足':dungeon.kind!=='scheme'&&state.camp?.mode==='army'&&!troops?'请募兵或改为独行':(state.camp?.food||0)<food?'粮草不足':'';
 const reward=dungeon?data.by.rewards[dungeon.reward]:null;
 return {dungeon,unlocked,reason,stamina:dungeon?.cost||0,food,troops,remaining:dungeon?Math.max(0,dungeon.limit-(state.daily.dungeons[id]||0)):0,reward,difficulty:dungeon&&dungeon.kind!=='scheme'?difficultyQuote(state,data,{type:'dungeon',id},dungeon.scale):null};
}
