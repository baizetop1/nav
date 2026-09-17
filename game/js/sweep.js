import { totalExperience } from './progression.js?v=0.31.0';
import { dispatch } from './core.js?v=0.31.0';
import { advanceBattle } from './battle.js?v=0.31.0';
import { dailyUses, rotationPlan, rotationCalendar } from './rotations.js?v=0.31.0';
import { requireRule, journal } from './utils.js?v=0.31.0';
export const mastery=(s,id,tier)=>s.campaign?.mastery?.[id+'_'+tier]||0;
export function sweepReason(s,id,tier,count=1){
 if(s.battle||s.scheme||s.event)return '先结束当前交战或际遇';
 if(!Number.isInteger(count)||count<1||count>3)return '扫荡次数须为 1—3';
 const p=rotationPlan(s,'daily',id,tier);
 return p.reason|| (mastery(s,id,tier)<2?'本难度需两次稳定通关：60 秒内、全员存活、不用药':count+dailyUses(s,id)>3?'今日剩余次数不足':'');
}
export function sweepQuote(s,d,a){
 try{
  requireRule(a.kind===undefined||a.kind==='daily','周本不能扫荡。');const reason=sweepReason(s,a.id,a.tier,a.count);requireRule(!reason,reason);
  let next=s,fallen=0,wounded=0,food=0;const mode=s.battleSkillMode;
  for(let i=0;i<a.count;i++){
   const before=next;next=dispatch(d,next,{type:'rotationStart',kind:'daily',id:a.id,tier:a.tier},s.clock);food+=before.camp.food-next.camp.food;next.battleSkillMode='auto';
   for(let tick=0;tick<180&&!next.battle.outcome;tick++)advanceBattle(next,d,1000);
   requireRule(next.battle.outcome==='victory','当前配置无法稳定完成第 '+(i+1)+' 场，请先正常挑战或调整阵容。本次预览不扣任何资源。');
   next=dispatch(d,next,{type:'finishBattle'},s.clock);fallen+=next.lastBattle?.fallen||0;wounded+=next.lastBattle?.wounded||0;
  }
  next.battleSkillMode=mode;
  const items=Object.fromEntries(Object.entries(next.inventory).map(([id,n])=>[id,n-(s.inventory[id]||0)]).filter(([,n])=>n));
  const experience=Object.fromEntries(s.team.map(id=>[id,totalExperience(next.heroes[id])-totalExperience(s.heroes[id])]));
  const summary={count:a.count,food,stamina:a.count*10,fallen,wounded,items,experience};
  const signature=JSON.stringify({id:a.id,tier:a.tier,date:rotationCalendar(s.clock).date,revision:s.revision,rng:s.rng,team:s.team,summary,uses:dailyUses(s,a.id),remaining:[next.player.stamina,next.camp.food,next.camp.troops,next.camp.wounded],finalRng:next.rng});
  return {next,summary,signature,reason:''};
 }catch(e){return {reason:e.message};}
}
export function applySweep(s,d,a){const q=sweepQuote(s,d,a);requireRule(!q.reason,q.reason);requireRule(typeof a.expected==='string'&&a.expected===q.signature,'阵容、资源或日期已变化，请重新预览扫荡。');journal(q.next,'【材料扫荡】完成 '+a.count+' 场；体力 '+q.summary.stamina+'、粮草 '+q.summary.food+'，伤兵 '+q.summary.wounded+'、阵亡 '+q.summary.fallen+'。仍共用每日三次挑战额度。');return q.next;}
