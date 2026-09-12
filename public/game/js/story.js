import { count, journal, requireRule } from './utils.js?v=0.15.0';
import { meets } from './map.js?v=0.15.0';
import { knowHero } from './hero.js?v=0.15.0';
import { gainItem, pay } from './item.js?v=0.15.0';
import { startBattle } from './battle.js?v=0.15.0';
export function effects(state, values=[], data) {
  for(const e of values) {
    if(e.type==='flag')state.progress.flags[e.id]=true;
    else if(e.type==='hero')knowHero(state,e.id,e.status,data);
    else if(e.type==='item')gainItem(state,e.id,e.amount,data);
    else if(e.type==='currency')state.player[e.id]=Math.max(0,state.player[e.id]+e.amount);
    else throw new Error('未知剧情效果。');
  }
}
export function visit(state, target, data) {
  requireRule(data.by.maps[target],'未找到此地点。');state.location=target;state.worldMinute=(state.worldMinute+30)%1440;
  if(!state.progress.visited.includes(target)){state.progress.visited.push(target);count(state,'discover');journal(state,'初访'+data.by.maps[target].name+'。');}
}
export function storyAction(state, data, id, choiceId) {
  const model=data.by.stories[id];requireRule(model,'未找到此段剧情。');
  let progress=state.progress.stories[id];
  if(!progress){requireRule(model.map===state.location&&meets(state,model.condition),'尚未到这段剧情的开端。');progress=state.progress.stories[id]={status:'active',step:model.start};}
  requireRule(progress.status==='active','这段往事已记入梁山志，不会重复领取奖励。');
  const step=model.steps[progress.step];requireRule(step.map===state.location&&meets(state,step.condition),'请先探路，抵达故事中的地点。');
  if(!choiceId){journal(state,step.text);return;}
  const choice=step.choices.find(c=>c.id===choiceId);requireRule(choice,'此处没有这个选择。');
  requireRule(meets(state,choice.condition),'尚不具备这个选择的条件。');
  pay(state,choice.cost);
  if(choice.battle){startBattle(state,data,{...choice.battle,context:{type:'story',id,next:choice.next}});return;}
  effects(state,choice.effects,data);
  if(choice.finish){progress.status='completed';journal(state,'【'+model.title+'】已记入梁山志。');}
  else progress.step=choice.next;
  if(choice.goMap)visit(state,choice.goMap,data);
}
