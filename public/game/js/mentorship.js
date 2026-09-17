import { attributes, gainExp } from './hero.js?v=0.32.0';
import { experienceToNext, experienceResult, ATTRIBUTE_NAMES } from './progression.js?v=0.32.0';
import { count, journal, requireRule } from './utils.js?v=0.32.0';
export const MENTOR_LIMIT=3;
export function mentorshipQuote(s,d,mentor,student){
  const m=s.heroes[mentor],h=s.heroes[student],used=s.daily.counters.heroMentor||0;
  const cost={stamina:5,food:20,silver:100},target=m?Math.min(d.config.balance.heroLevelCap,m.level-3):0;
  let reason=!s.camp?'先建立寨子。':s.camp.buildings.hall<2||s.camp.buildings.barracks<1?'需要聚义厅 2 级、兵营 1 级。':!d.by.heroes[mentor]||m?.status!=='owned'?'请选择已入寨的教习。':!d.by.heroes[student]||h?.status!=='owned'?'请选择已入寨的学员。':mentor===student?'教习与学员须为不同好汉。':m.level<10?'教习须达到 10 级。':h.level>=target?'学员须低于教习至少 4 级；传习最多追至教习等级减 3。':s.battle||s.scheme||s.event?'先结束当前交战、计策或际遇。':(s.affairs?.mission&&[mentor,student].includes(s.affairs.mission.hero))||s.realm?.squad?.team.some(id=>[mentor,student].includes(id))?'外派好汉须先接回，再参加传习。':used>=MENTOR_LIMIT?'今日三次传习已用完。':s.player.stamina<cost.stamina?'体力不足，需要 5 点。':s.camp.food<cost.food?'粮草不足，需要 20。':s.player.silver<cost.silver?'碎银不足，需要 100。':'';
  const matched=!!(d.by.heroes[mentor]&&d.by.heroes[student]&&d.by.heroes[mentor].type===d.by.heroes[student].type);
  let amount=0,next=null,rows=[];
  if(!reason){
    let remaining=-h.exp;for(let level=h.level;level<target;level++)remaining+=experienceToNext(level);
    const offered=Math.floor((200+m.level*10+(s.camp.buildings.barracks-1)*40)*(matched?1.2:1));
    amount=Math.min(offered,Math.max(0,remaining));
    if(!amount)reason='现有经验已足够达到本次传习上限，请先通过历练结算。';
    else{
      next=experienceResult(h,amount,d.config.balance.heroLevelCap);
      const after={...s,heroes:{...s.heroes,[student]:{...h,level:next.level,exp:next.exp}}},oldStats=attributes(s,student,d),newStats=attributes(after,student,d);
      rows=[{name:'学员等级',value:h.level+' → '+next.level},{name:'本次历练',value:'+'+amount},{name:'传习后经验',value:next.exp+' / '+experienceToNext(next.level)},...Object.entries(ATTRIBUTE_NAMES).map(([key,name])=>({name,value:oldStats[key]+' → '+newStats[key]}))];
    }
  }
  const signature=JSON.stringify({mentor,student,date:s.daily.date,used,cost,target,matched,amount,rows});
  return {mentor,student,used,remaining:Math.max(0,MENTOR_LIMIT-used),cost,target,matched,amount,next,rows,reason,signature};
}
export function mentorHero(s,d,a){
  const q=mentorshipQuote(s,d,a.mentor,a.student);requireRule(!q.reason,q.reason);requireRule(a.expected===q.signature,'传习条件已变化，请重新预览。');
  s.player.stamina-=q.cost.stamina;s.player.silver-=q.cost.silver;s.camp.food-=q.cost.food;
  gainExp(s,a.student,q.amount,d);count(s,'heroMentor');
  journal(s,'【演武传习】'+d.by.heroes[a.mentor].name+'指点'+d.by.heroes[a.student].name+'，学员历练 +'+q.amount+'；体力 -5、粮草 -20、碎银 -100。今日 '+(q.used+1)+' / '+MENTOR_LIMIT+' 次。');
}
