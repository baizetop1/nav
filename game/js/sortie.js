import {RESOURCE_ROUTES} from './resource-dungeons-data.js?v=0.54.0';
import { dispatch } from './core.js?v=0.54.0';
export const SORTIES=['specialStart','campRaid','dungeon','rotationStart','frontierAttack','affairBattle','eliteStart','chapterBattle','realmBattle','challengeStart','personalStart','ventureNext'];
export function prepareSortie(s,d,action,setup,now=s.clock){
 const heroOnly=action.type==='specialStart'||action.type==='rotationStart'&&action.kind==='daily'&&RESOURCE_ROUTES.some(r=>r.id===action.id);
 let next=s;
 try{
  if(!SORTIES.includes(action.type))throw new Error('此入口不属于可准备的出征。');
  if(setup){next=dispatch(d,next,{type:'team',ids:setup.team},now);if(next.camp)next=dispatch(d,next,{type:'campFormation',mode:heroOnly?s.camp.mode:setup.mode,tactic:setup.tactic,deployment:heroOnly?s.camp.deployment:setup.deployment,arm:next.camp.arm||'infantry'},now);}
  next=dispatch(d,next,action,now);
  const b=next.battle,scheme=!!next.scheme,cost={stamina:s.player.stamina-next.player.stamina,food:(s.camp?.food||0)-(next.camp?.food||0)};
  // Preview uses the real entry rules but never writes or advances the battle.
  const signature=JSON.stringify({context:b?.context||next.scheme?.context,team:b?.team||next.team.map(id=>[id,next.heroes[id].level]),enemy:b?.enemy,cost,stamina:next.player.stamina,food:next.camp?.food,expedition:b?.expedition,expansion:b?.expansion});
  return {next,battle:b,scheme,cost,signature,reason:''};
 }catch(e){return {reason:e.message,next:null};}
}
