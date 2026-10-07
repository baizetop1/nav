import {meets} from './map.js?v=0.68.0';
export const isHarbor=id=>['liangshan','ferry'].includes(id);
export function harborMoment(s){
 if(!isHarbor(s.location))return null;
 const f=s.progress.flags;
 if(f.volume_two_complete)return {label:'同上梁山',text:'渡船已经拢岸。有人接过行李，朝山道指了指：“都在上头等着，去聚义厅罢。”'};
 if(f.lin_departure)return {label:'渡船离岸',text:'船篙点开水面，林冲随船往对岸去了。芦苇遮住了他的身影，岸上只剩几圈水纹。'};
 if(f.lin_tolerant)return {label:'渡口候船',text:'船家把船靠向岸边：“这趟要去哪里？”你看过沿途的路，想起还有几件托付的事没办。'};
 if(f.volume_complete)return {label:'东京来信',text:'船家递来一封东京的信：“那边托人捎来的。”信里提到禁军林教头。你收好信，问清了去东京的路。'};
 if(f.huangni_complete)return {label:'水泊落脚',text:'灶上正煮着粥，船家让你先到棚下歇脚：“安顿好同行的人，再动身罢。水上的路，我替你看着。”'};
 return {label:'渡口',text:'船家正把缆绳系上木桩。水泊对面起了薄雾，等船的人往棚下挪了挪。'};
}
export function harborObjectives(s,d){
 const chapter=d.chapters.find(c=>!s.progress.flags[c.completeFlag])||d.chapters.at(-1);
 const rows=chapter.requirements.map(r=>{const c=r.condition,done=meets(s,c);let amount='',command=null,action='';
  if(c.ownedCount){amount=Object.values(s.heroes).filter(h=>h.status==='owned').length+' / '+c.ownedCount;command={type:'ui_section',view:'recruit',id:'ordinary'};action='去招贤';}
  else if(c.stat==='clears'){amount=(s.stats.clears||0)+' / '+c.count;command={type:'ui_section',view:'trials',id:'daily'};action='去历练';}
  else if(c.prestige){amount=s.player.prestige+' / '+c.prestige;command={type:'ui_section',view:'trials',id:'daily'};action='去历练';}
  return {...r,done,amount,command,action};});
 return {chapter,rows,complete:!!s.progress.flags[chapter.completeFlag],done:rows.filter(r=>r.done).length};
}
export function harborBusiness(s,d,esc,btn,goal){
 const b=harborObjectives(s,d),pending=b.rows.filter(r=>!r.done);
 return '<div class="harbor-business"><p class="harbor-progress">第 '+b.chapter.number+' 卷 · '+esc(b.chapter.title)+' <b>'+b.done+' / '+b.rows.length+'</b></p>'+pending.map(r=>'<div class="harbor-task"><span>'+esc(r.label)+(r.amount?'<small>'+esc(r.amount)+'</small>':'')+'</span>'+(r.command?btn(r.action,r.command,'secondary'):'')+'</div>').join('')+(pending.some(r=>r.command)?'':'<div class="journey-scene-actions">'+btn(goal.map?'前往'+d.by.maps[goal.map].name:goal.title,{type:'ui_storyResume'},'primary')+'</div>')+'<details class="harbor-completed"><summary>已办妥 '+b.done+' 项</summary>'+b.rows.filter(r=>r.done).map(r=>'<p>'+esc(r.label)+'</p>').join('')+'</details></div>';
}
