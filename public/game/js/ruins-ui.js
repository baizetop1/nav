import {revisitPanel} from './region-revisit-ui.js?v=0.83.0';
import {RUINS_NODES,ruinsHas,ruinsGate,ruinsGoal} from './ruins-data.js?v=0.83.0';
import {ruinsPath,ruinsFightQuote,ruinsTask} from './ruins.js?v=0.83.0';
import {specialDropTable} from './special-dungeons.js?v=0.83.0';
import {SPECIAL_ROUTES} from './special-routes.js?v=0.83.0';
export function ruinsPanel(s,d,esc,btn,selected){
 const x=s.exploration.ruins,here=x.position,id=Object.hasOwn(RUINS_NODES,selected)?selected:here,n=RUINS_NODES[id],has=k=>ruinsHas(s,k);
 const action=(label,type,key,style='secondary',disabled=false)=>btn(label,{type,region:'ruins',...(key?{id:key}:{})},style,disabled);
 const heading='<header class="region-heading"><h2>荒祠地宫</h2><span>所在：'+RUINS_NODES[here].name+'</span></header>';
 const roads='山门 ↔ 破殿 ↔ 石室 ↔ 内室<br>山门 ↔ 钟楼 ↔ 夹道 ↔ 石室';
 if(!selected){
  const goal=ruinsGoal(s),map='<nav class="region-map" aria-label="荒祠地宫地点">'+Object.entries(RUINS_NODES).map(([key,m])=>action(m.name+' · '+(here===key?'所在':ruinsGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),'ui_regionInspect',key).replace('<button ','<button aria-pressed="'+(here===key)+'" ')).join('')+'</nav>';
  return '<section class="region-panel region-overview" data-exploration-region="ruins">'+heading+map+'<p class="note region-roads">'+roads+(has('heard')?'<br>已发现：山门东墙 ↔ 残碑石室':'')+'</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+(goal.command?btn(goal.label,goal.command,'primary'):action('跟进此事','ui_regionInspect',goal.node,'primary'))+btn('采集派遣',{type:'ui_idleOpen',region:'ruins'},'secondary')+'</div></section>';
 }
 let text=n.text;
 if(id==='gate'&&has('heard'))text='东墙的藤蔓已经拨开，矮门直通残碑石室。再来时不必绕过破殿。';
 if(id==='bell'&&has('invited'))text='钟楼里只剩风声。乐和把谱册带回了寨子，临走还在门边画了个指路的箭头。';
 else if(id==='bell'&&has('heard'))text='乐和在钟沿做了记号：“东墙那道门通了。谱册若找着了，替我带出来。”';
 if(id==='stele'&&has('rubbed'))text='碑面已经擦净，步法与枪架看得清楚。采集的人照着你留下的记号拓写，旧纸叠在干燥的石台上。';
 if(id==='vault'&&has('won_vault'))text='书箱已经搬到门边，谱册也找到了。余匪还会回来，日后仍可到这里寻找兵书。';
 let body='<p>'+esc(text)+'</p><p class="note">'+esc(n.purpose)+'</p>';
 if(n.battle){
  const q=ruinsFightQuote(s,id),enemies=[...q.dungeon.enemies,...(n.route?[SPECIAL_ROUTES[n.route].enemy]:[])];
  const gear=specialDropTable(n.battle,1).filter(row=>row.kind==='equipment').slice(0,2);
  body+='<p class="note">敌人：'+enemies.map(key=>d.by.enemies[key].name).join('、')+'</p><p class="note">'+gear.map(row=>d.by.equipments[row.id].name+' '+Number((row.rate*100).toFixed(2))+'%').join(' · ')+'；其余掉落可查看完整表。</p>';
  if(id==='passage')body+='<p class="notice">鸣钟援阵：敌气血 +15%、速度 +10%。头目蓄势 3 秒后给全敌回血 15%。胜利必得粗布 2；其他掉落随机。</p>';
  if(id==='vault')body+='<p class="note">破殿与夹道合计 '+Math.min(1,s.specialDungeons?.clears.ruins_1||0)+'/1 趟。开战后可在阵前指挥中选“保留打断招式”。</p>';
 }
 if(here!==id){
  const gate=ruinsGate(s,id),path=ruinsPath(s,id);
  body+='<p class="note">'+esc(gate||'路线：'+path.map(key=>RUINS_NODES[key].name).join(' → '))+'</p>'+action('前往'+n.name,'regionMove',id,'primary',!!gate);
 }else{
  const task=(label,key)=>{const reason=ruinsTask(s,key);return '<div class="region-action">'+action(label,'regionDo',key,'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
  if(n.battle){const q=ruinsFightQuote(s,id);body+='<div class="actions">'+action(id==='vault'?'进内室取谱':'挑战盗匪','regionBattle',id,'primary',!!q.reason)+btn('全部掉落',{type:'ui_specialView',id:n.battle,tier:1,tab:'drops'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');}
  if(id==='gate')body+=action('去钟楼看看','ui_regionInspect','bell','primary');
  if(id==='bell'){
   if(!has('met'))body+=task('与乐和交谈','meet');
   else if(!has('heard'))body+=task('听钟辨路','listen');
   else if(!has('rubbed'))body+=(has('rubbing_supplies')?'':task('取拓碑备用布 · 仅一次','paper'))+action('去石室拓碑','regionMove','stele','primary');
   else if(!has('invited'))body+=task(s.heroes.yuehe.status==='owned'?'交还谱册':'邀请乐和入寨','invite');
   else body+='<p>客舍建成后：荒祠派遣每批粗布 +1，武学残页配方少用拓片 1。</p>'+btn('回寨找乐和',{type:'ui_section',view:'camp',id:'exploration',region:'ruins'},'primary');
  }
  if(id==='stele')body+=has('rubbed')?'<p>拓片每批额外 +1。可整理成武学残页，用于抄录招式书或练兵。</p><div class="actions">'+btn('查看武学残页配方',{type:'ui_regionalRecipe',id:'ruins'},'primary')+btn('派遣采集',{type:'ui_idleOpen',region:'ruins'},'secondary')+'</div>':task('拓写残碑 · 粗布 2','rubbing');
  if(id==='vault'&&!has('cache'))body+=task('收好书箱 · 技能残页 2、武学残页 3','cache');
 }
 if(id==='bell'&&has('heard')&&!has('rubbed')&&here===id){const reason=ruinsTask(s,'paper');return '<section class="region-panel" data-exploration-region="ruins"><header class="region-heading"><h2>残钟楼</h2>'+action('返回地图','ui_regionOpen')+'</header><article class="region-detail"><p>乐和指着谱册的包布：“缺布就先用这个，够拓两份。”</p><p class="note">拓碑需要粗布 2 · 持有 '+(s.inventory.cloth||0)+'</p><div class="actions">'+(has('rubbing_supplies')?'':action('取备用布 · 仅一次','regionDo','paper','primary',!!reason))+action('去石室拓碑','regionMove','stele','secondary')+'</div>'+(reason&&!has('rubbing_supplies')?'<p class="note">'+esc(reason)+'</p>':'')+'</article><details><summary>钟楼与道路</summary>'+body+'</details></section>';}
 const revisit=revisitPanel(s,d,esc,btn,'ruins',id,RUINS_NODES,body);if(revisit)return revisit;
 return '<section class="region-panel" data-exploration-region="ruins">'+heading+'<div class="actions">'+action('返回祠图','ui_regionOpen')+'</div><article class="region-detail"><h3>'+n.name+'</h3>'+body+'</article><details><summary>道路与地区变化</summary><p class="note">山门 ↔ 破殿 ↔ 石室 ↔ 内室<br>山门 ↔ 钟楼 ↔ 夹道 ↔ 石室'+(has('heard')?'<br>东墙暗门：山门 ↔ 石室':'')+'</p><p>暗门：'+(has('heard')?'已找到':'未找到')+' · 残碑：'+(has('rubbed')?'已拓写':'待拓写')+' · 乐和：'+(has('invited')?'已回寨':has('met')?'已相识':'未相识')+'</p></details><div class="actions">'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'ruins'},'secondary')+btn('派遣采集',{type:'ui_idleOpen',region:'ruins'},'secondary')+'</div></section>';
}
