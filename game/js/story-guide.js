import {chapterStory,ENDING_DEFINITIONS} from './late-mainline-data.js?v=0.64.0';
import {chapterBattlePlan} from './volume-three.js?v=0.64.0';
import {meets} from './map.js?v=0.64.0';
import {routeTo,conditionText} from './world-map.js?v=0.64.0';

// Derived entirely from the current save: reloading or travelling cannot lose the objective.
export function storyObjective(s,d){
 const chapter=d.chapters.find(c=>!s.progress.flags[c.completeFlag])||d.chapters[d.chapters.length-1];
 const point=(title,map,detail,extra={})=>({title,map,detail,...extra});
 const screen=(title,view,section,detail)=>({title,view,section,detail});
 const seen=new Set();
 const sources=new Map();
 function register(id,entry){if(!sources.has(id))sources.set(id,[]);sources.get(id).push(entry);}
 for(const map of d.maps)for(const action of map.actions)for(const e of action.effects||[])if(e.type==='flag')register(e.id,{map,action});
 for(const model of d.stories)for(const step of Object.values(model.steps))for(const choice of step.choices)for(const e of choice.effects||[])if(e.type==='flag')register(e.id,{model,step,choice});
 for(const model of d.chapters)register(model.completeFlag,{chapter:model});
 function sourceNeed(source,path){
  if(source.chapter)return distance({all:source.chapter.requirements.map(r=>r.condition)},path);
  if(source.action)return distance(source.action.condition,path);
  if(s.progress.stories[source.model.id]?.status==='completed')return Infinity;
  return distance({all:[source.model.condition,source.step.condition,source.choice.condition].filter(Boolean)},path);
 }
 // Completed choices cannot supply another branch's flag. Compare reachable providers before choosing an any-clause.
 function distance(c,path=new Set()){
  if(!c||meets(s,c))return 0;
  if(c.notFlag&&s.progress.flags[c.notFlag])return Infinity;
  if(c.all)return c.all.reduce((n,x)=>n+distance(x,path),0);
  if(c.any)return Math.min(...c.any.map(x=>distance(x,path)));
  if(c.flag){
   if(path.has(c.flag))return Infinity;
   const next=new Set(path);next.add(c.flag);
   return Math.min(...(sources.get(c.flag)||[]).map(source=>1+sourceNeed(source,next)));
  }
  return 1;
 }
 function condition(c){
  if(!c||meets(s,c))return null;
  if(c.all)return condition(c.all.find(x=>!meets(s,x)));
  if(c.any){
   const choices=c.any.map(value=>({value,cost:distance(value)})).filter(x=>Number.isFinite(x.cost)).sort((a,b)=>a.cost-b.cost);
   for(const {value} of choices){const need=condition(value);if(need)return need;}
   return null;
  }
  if(c.flag){
   if(c.flag==='huangni_complete')return point('智取生辰纲','ridge','到黄泥冈顶商议计策；失败后可重新安排。');
   const p=provider(c.flag);if(p)return p;
  }
  if(c.campBuilding)return screen('完善寨子设施','camp','buildings',conditionText(c,d));
  if(c.campMode)return screen('调整出征方式','camp','formation',conditionText(c,d));
  if(c.ownedCount)return screen('迎入更多好汉','recruit','ordinary','已入寨 '+Object.values(s.heroes).filter(h=>h.status==='owned').length+' / '+c.ownedCount+'；可用招贤令，也可在名册直接邀请。');
  if(c.heroLevel)return screen('培养主力好汉','heroes','training','至少一名正式好汉达到 '+c.heroLevel+' 级。');
  if(c.prestige||c.stat==='clears')return screen(c.prestige?'积累江湖威望':'完成历练','trials','daily',c.prestige?'当前威望 '+s.player.prestige+' / '+c.prestige:'历练已完成 '+(s.stats.clears||0)+' / '+(c.count||1)+' 次；胜利结算后继续。');
  if(c.item)return screen('准备所需物品','bag',d.by.items[c.item]?.price?'shop':'materials',conditionText(c,d));
  if(c.hero){const h=d.by.heroes[c.hero];return point('结识'+h.name,h.meetMap,'在当地与'+h.title+'交谈。');}
  return null;
 }
 function provider(flag){
  const key='flag:'+flag;if(seen.has(key))return null;seen.add(key);
  const candidates=(sources.get(flag)||[]).map(source=>({source,cost:sourceNeed(source,new Set([flag]))})).filter(x=>Number.isFinite(x.cost)).sort((a,b)=>a.cost-b.cost);
  for(const {source} of candidates){
   if(source.action)return condition(source.action.condition)||point(source.action.label,source.map.id,source.action.text,{action:{type:'mapAction',id:source.action.id}});
   if(source.chapter){const req=source.chapter.requirements.find(r=>!meets(s,r.condition)),need=req&&condition(req.condition);if(need)return need;}
   else{const need=story(source.model.id);if(need)return need;}
  }
  return null;
 }
 function battleNeed(id){
  if(!chapterStory(id))return null;
  const q=chapterBattlePlan(s,id);if(!q.model)return null;
  if(!s.camp||s.camp.buildings.hall<q.model.hall)return screen('聚义厅升至 '+q.model.hall+' 级','camp','buildings','本战需要聚义厅 '+q.model.hall+' 级；在营建设施查看所需木材和银两。');
  if(!s.team.length)return screen('安排出阵好汉','heroes','formation','本战至少需要一名 '+q.model.level+' 级好汉在出阵队伍中。');
  if(!s.team.some(id=>s.heroes[id].level>=q.model.level))return screen('主力达到 '+q.model.level+' 级','heroes','training','队中至少一人达到 '+q.model.level+' 级；已有高等级好汉也可直接编入出阵队伍。');
  if(s.player.stamina<q.stamina)return screen('补足出征体力','bag','supplies','本战需体力 '+q.stamina+'，当前 '+s.player.stamina+'；可使用补给或等候恢复。');
  if(s.camp.food<q.food)return screen('备足出征粮草','camp','duties','当前带兵方案需粮草 '+q.food+'，现有 '+s.camp.food+'；可回寨筹粮或减少随行兵力。');
  if(s.camp.mode==='army'&&!q.troops)return screen('补充随行兵力','camp','formation','当前选择带兵出征，但没有可随行兵员；可去募兵医治，也可改为独行。');
  return null;
 }
 function story(id){
  const m=d.by.stories[id],p=s.progress.stories[id];if(!m||p?.status==='completed'||seen.has('story:'+id))return null;seen.add('story:'+id);
  if(!p)return condition(m.condition)||(m.steps[m.start].choices.some(c=>c.battle)?battleNeed(id):null)||point('开始 · '+m.title,m.map,chapterStory(id)?'前往'+d.by.maps[m.map].name+'，查看“'+m.title+'”。':'到达后选择“开始剧情 / 查看此地事务”。',{story:id});
  const step=m.steps[p.step];
  if(id==='wusong_story'&&p.step==='trail'){
   if(!s.progress.flags.tracks_found)return point('查看巨大的脚印','drywood','武松已在山道等候。先去枯树林查看脚印，才能找到虎踪。',{action:{type:'mapAction',id:'tracks'},story:id});
   if(!s.progress.flags.trail_followed)return point('沿虎踪继续追踪','tracks','脚印已找到。到虎踪点击“继续追踪”，深林道路随后开放。',{action:{type:'mapAction',id:'follow'},story:id});
  }
  const unmet=condition(step.condition);if(unmet)return {...unmet,reason:step.hint||'先办完眼前的事，再继续'+m.title+'。'};
  if(step.choices.some(c=>c.battle)){const need=battleNeed(id);if(need)return need;}
  const available=step.choices.filter(c=>meets(s,c.condition));
  if(!available.length){const need=condition(step.choices[0]?.condition);if(need)return {...need,reason:step.hint||m.title+'尚有条件未满足。'};}
  return point('继续 · '+m.title,step.map,step.hint||'到达后继续剧情，获胜后需领取酬劳。',{story:id});
 }
 let goal;
 const last=s.lastBattle,waiting=last?.context.type==='story'&&chapterStory(last.context.id)&&last.outcome==='victory'&&s.progress.stories[last.context.id]?.status==='active'&&s.progress.stories[last.context.id]?.step===last.context.next;
 if(waiting)goal=story(last.context.id);
 if(chapter.number===1){
  if(!s.progress.flags.tiger_complete)goal=story('wusong_story');
  else if(!s.progress.flags.huangni_complete)goal=!s.progress.flags.dongxi_rumor?provider('dongxi_rumor'):!s.progress.flags.seven_stars?story('seven_stars_story'):point('智取生辰纲','ridge','七星已聚齐，到黄泥冈顶商议取纲的计策。');
 }
 if(!goal){const req=chapter.requirements.find(r=>!meets(s,r.condition));goal=req?(condition(req.condition)||screen(req.label,'chronicle',null,'查看本卷条件，完成后自动结卷。')):screen('本卷目标已完成','chronicle',null,'本卷往事与后续篇章可在梁山志查看。');}
 if(s.progress.flags.volume_twelve_complete){const ending=Object.values(ENDING_DEFINITIONS).find(e=>s.progress.flags[e.flag]);goal=screen('主线已完结','chronicle',null,(ending?'已记下“'+ending.name+'”。':'十二卷同行已经落幕。')+'可在梁山志重读结局，也可继续经营、培养与历练。');}
 // Resolve a locked route's first prerequisite, rather than pointing into a dead end.
 if(goal.map&&!routeTo(s,d,goal.map)){
  const path=routeTo(s,d,goal.map,true)||[];let from=s.location;
  for(const to of path){
   const link=d.by.maps[from].links.find(l=>l.target===to);
   if(!meets(s,link.condition)){
    const need=condition(link.condition);
    if(need)goal={...need,reason:'前往'+d.by.maps[goal.map].name+'前，需要'+conditionText(link.condition,d)+'。'};
    break;
   }
   from=to;
  }
 }
 return {...goal,chapter:chapter.number,chapterTitle:chapter.title,done:chapter.requirements.filter(r=>meets(s,r.condition)).length,total:chapter.requirements.length,route:goal.map?routeTo(s,d,goal.map):null};
}
export function storyGuide(s,d,esc,btn,compact=false,local=false){const g=storyObjective(s,d);if(local&&g.map===s.location&&!g.action&&(g.story||g.title==='智取生辰纲'))return '<section class="story-guide story-guide-arrived" aria-label="当前主线目标"><div class="guide-heading"><span>第 '+g.chapter+' 卷 · '+esc(g.chapterTitle)+'</span><small>'+g.done+'/'+g.total+' 项目标</small></div><h2>'+esc(g.title)+'</h2><span class="note">已抵达 · '+esc(d.by.maps[g.map].name)+'，在下方继续</span></section>';return '<section class="story-guide" aria-label="当前主线目标"><div class="guide-heading"><span>第 '+g.chapter+' 卷 · '+esc(g.chapterTitle)+'</span><small>'+g.done+'/'+g.total+' 项目标</small></div><h2>'+esc(g.title)+'</h2>'+(!compact?'<p>'+esc(g.reason||g.detail)+'</p>':'')+'<div class="guide-action"><span>'+(g.map?'目的地：'+esc(d.by.maps[g.map].name):'去处：'+esc({camp:'寨子',heroes:'好汉',bag:'行囊',trials:'历练',recruit:'招贤',chronicle:'梁山志'}[g.view]||'江湖'))+'</span>'+btn(g.map===s.location&&g.action?g.title:g.map===s.location?'继续故事':g.map?'前往':'前往',g.map===s.location&&g.action?g.action:{type:'ui_storyResume'},'primary')+'</div></section>';}
