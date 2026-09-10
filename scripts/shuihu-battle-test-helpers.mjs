import {dispatch} from '../public/game/js/core.js';
import {skillReason,battleItemQuote} from '../public/game/js/battle.js';
// Test-only player: simulate time, then deliberately choose skills and medicine.
// The actual browser never auto-casts friendly skills or auto-consumes items.
export function battleStep(data,state,delta=500){
  let s=dispatch(data,state,{type:'battleTick',delta},state.clock);
  for(const u of [...s.battle.team]){
    if(s.battle.outcome)break;
    for(const id of u.skills){const unit=s.battle.team.find(v=>v.id===u.id);if(!skillReason(s.battle,unit,data.by.skills[id]))s=dispatch(data,s,{type:'battleSkill',hero:u.id,id},s.clock);if(s.battle.outcome)break;}
  }
  if(!s.battle.outcome&&s.battle.team.some(u=>u.hp>0&&u.hp<u.maxHp*.5)&&!battleItemQuote(s,data,'jinchuangyao').reason)s=dispatch(data,s,{type:'battleItem',id:'jinchuangyao'},s.clock);
  return s;
}
