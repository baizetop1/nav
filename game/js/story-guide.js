import {meets} from './map.js?v=0.44.0';
import {routeTo,conditionText} from './world-map.js?v=0.44.0';

// Derived entirely from the current save: reloading or travelling cannot lose the objective.
export function storyObjective(s,d){
 const chapter=d.chapters.find(c=>!s.progress.flags[c.completeFlag])||d.chapters[d.chapters.length-1];
 const point=(title,map,detail,extra={})=>({title,map,detail,...extra});
 const screen=(title,view,section,detail)=>({title,view,section,detail});
 const seen=new Set();
 function condition(c){
  if(!c||meets(s,c))return null;
  if(c.all)return condition(c.all.find(x=>!meets(s,x)));
  if(c.any)return condition(c.any[0]);
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
  for(const map of d.maps)for(const a of map.actions)if(a.effects?.some(e=>e.type==='flag'&&e.id===flag))return condition(a.condition)||point(a.label,map.id,a.text,{action:{type:'mapAction',id:a.id}});
  const model=d.stories.find(m=>Object.values(m.steps).some(step=>step.choices.some(c=>c.effects?.some(e=>e.type==='flag'&&e.id===flag))));
  return model?story(model.id):null;
 }
 function story(id){
  const m=d.by.stories[id],p=s.progress.stories[id];if(!m||p?.status==='completed'||seen.has('story:'+id))return null;seen.add('story:'+id);
  if(!p)return condition(m.condition)||point('开始 · '+m.title,m.map,'到达后选择“开始这段相识 / 查看此地事务”。',{story:id});
  const step=m.steps[p.step];
  if(id==='wusong_story'&&p.step==='trail'){
   if(!s.progress.flags.tracks_found)return point('查看巨大的脚印','drywood','武松已在山道等候。先去枯树林查看脚印，才能找到虎踪。',{action:{type:'mapAction',id:'tracks'},story:id});
   if(!s.progress.flags.trail_followed)return point('沿虎踪继续追踪','tracks','脚印已找到。到虎踪点击“继续追踪”，深林道路随后开放。',{action:{type:'mapAction',id:'follow'},story:id});
  }
  const unmet=condition(step.condition);if(unmet)return {...unmet,reason:step.hint||'先完成前置事务，再回来续接'+m.title+'。'};
  const available=step.choices.filter(c=>meets(s,c.condition));
  if(!available.length){const need=condition(step.choices[0]?.condition);if(need)return {...need,reason:step.hint||m.title+'尚有条件未满足。'};}
  return point('继续 · '+m.title,step.map,step.hint||'到达后继续当前剧情选择；战后请记得确认战果。',{story:id});
 }
 let goal;
 if(chapter.number===1){
  if(!s.progress.flags.tiger_complete)goal=story('wusong_story');
  else if(!s.progress.flags.huangni_complete)goal=!s.progress.flags.dongxi_rumor?provider('dongxi_rumor'):!s.progress.flags.seven_stars?story('seven_stars_story'):point('智取生辰纲','ridge','七星已聚齐，到黄泥冈顶商议取纲的计策。');
 }
 if(!goal){const req=chapter.requirements.find(r=>!meets(s,r.condition));goal=req?(condition(req.condition)||screen(req.label,'chronicle',null,'查看本卷条件，完成后自动结卷。')):screen('本卷目标已完成','chronicle',null,'六卷往事与后续经营可在梁山志查看。');}
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
export function storyGuide(s,d,esc,btn,compact=false,local=false){const g=storyObjective(s,d);if(local&&g.map===s.location&&!g.action&&(g.story||g.title==='智取生辰纲'))return '<section class="story-guide story-guide-arrived" aria-label="当前主线目标"><div class="guide-heading"><span>第 '+g.chapter+' 卷 · '+esc(g.chapterTitle)+'</span><small>'+g.done+'/'+g.total+' 项目标</small></div><h2>'+esc(g.title)+'</h2><span class="note">已抵达 · '+esc(d.by.maps[g.map].name)+'，在下方继续</span></section>';return '<section class="story-guide" aria-label="当前主线目标"><div class="guide-heading"><span>第 '+g.chapter+' 卷 · '+esc(g.chapterTitle)+'</span><small>'+g.done+'/'+g.total+' 项目标</small></div><h2>'+esc(g.title)+'</h2>'+(!compact?'<p>'+esc(g.reason||g.detail)+'</p>':'')+'<div class="guide-action"><span>'+(g.map?'目的地：'+esc(d.by.maps[g.map].name):'办理：'+esc({camp:'寨子',heroes:'好汉',bag:'行囊',trials:'历练',recruit:'招贤',chronicle:'梁山志'}[g.view]||'江湖'))+'</span>'+btn(g.map===s.location&&g.action?g.title:g.map===s.location?'续接当前剧情':g.map?'前往目标地点':'前往办理',g.map===s.location&&g.action?g.action:{type:'ui_storyResume'},'primary')+'</div></section>';}
