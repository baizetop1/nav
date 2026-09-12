import { CAMP_GOALS, goalReady, goalClaimed } from './camp-development.js?v=0.15.0';
import { questReady } from './core.js?v=0.15.0';

// Read-only overview: visiting the camp never spends resources or claims rewards.
export function campNotices(s,d){
  if(!s.camp)return [];
  const list=[],m=s.affairs?.mission;
  if(m)list.push({label:d.by.heroes[m.hero].name+(s.clock>=m.readyAt?'已归来，待接回':'外派中 · 约 '+Math.ceil((m.readyAt-s.clock)/60000)+' 分钟'),target:'camp-affairs'});
  else if(s.affairs?.pending)list.push({label:'有一件寨中来报待处理',target:'camp-affairs'});
  const goals=CAMP_GOALS.filter(g=>!goalClaimed(s,g)&&goalReady(s,g)).length;
  if(goals)list.push({label:goals+' 项建寨酬劳可领取',target:'camp-goals'});
  const quests=d.quests.filter(q=>q.type==='daily'?s.daily.ids.includes(q.id)&&!s.daily.claimed.includes(q.id)&&questReady(s,q):!s.progress.claims.includes(q.id)&&questReady(s,q)).length;
  if(quests)list.push({label:quests+' 项差事酬劳可领取',view:'quests'});
  const f=s.frontier;
  if(f){
    const materials=Object.entries(f.stations).some(([id,row])=>id!=='workshop'&&row.bank>0)||Object.values(f.posts).some(p=>!p.threat&&p.bank>0);
    const workshop=f.stations.workshop.bank>0&&(s.inventory.scrap_iron||0)>=2&&s.camp.wood>=2;
    if(materials||workshop)list.push({label:'生产已备妥，可收取或加工',target:'camp-production'});
    const threats=Object.values(f.posts).filter(p=>p.threat).length;
    if(threats)list.push({label:threats+' 处据点告急，等待解围',target:'frontier-map'});
  }
  if(s.camp.wounded)list.push({label:s.camp.wounded+' 名伤兵待治疗'+(!s.camp.buildings.clinic?' · 需建医馆':''),target:'camp-resources'});
  return list;
}
export function campOverview(s,d,btn){
  const list=campNotices(s,d);
  return `<section class="camp-overview"><h2>回寨待办</h2><p class="note">只列当前可处理事项；酬劳和物资由你确认领取。</p>${list.length?`<div class="camp-notices">${list.map(n=>n.view?`<button type="button" class="secondary" data-view="${n.view}">${n.label}</button>`:btn(n.label,{type:'ui_campJump',id:n.target},'secondary')).join('')}</div>`:'<p class="note">暂无待领酬劳或来报，可安排寨务、培养好汉或查看历练日历。</p>'}</section>`;
}
