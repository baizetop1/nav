import {MARSH_NODES,marshHas,marshGate,marshGoal} from './marsh-data.js?v=0.69.0';
import {marshPath,marshFightQuote,marshTask} from './marsh.js?v=0.69.0';
import {specialDropTable} from './special-dungeons.js?v=0.69.0';
import {SPECIAL_ROUTES} from './special-routes.js?v=0.69.0';
export function marshPanel(s,d,esc,btn,selected){
 const x=s.exploration.marsh,here=x.position,id=Object.hasOwn(MARSH_NODES,selected)?selected:here,n=MARSH_NODES[id],has=k=>marshHas(s,k);
 const action=(label,type,key,style='secondary',disabled=false)=>btn(label,{type,region:'marsh',...(key?{id:key}:{})},style,disabled);
 const heading='<header class="region-heading"><h2>芦苇泽</h2><span>所在：'+MARSH_NODES[here].name+'</span></header>';
 const back=action('回泽地图','ui_regionOpen');
 if(!selected){
  const goal=marshGoal(s),map='<nav class="region-map" aria-label="芦苇泽地点">'+Object.entries(MARSH_NODES).map(([key,m])=>action(m.name+' · '+(here===key?'所在':marshGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),'ui_regionInspect',key).replace('<button ','<button aria-pressed="'+(here===key)+'" ')).join('')+'</nav>';
  return '<section class="region-panel region-overview" data-exploration-region="marsh">'+heading+map+'<p class="note region-roads">渡头 ↔ 苇道／草庐／毒水湾 ↔ 药圃 ↔ 蛇巢</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+action('跟进此事','ui_regionInspect',goal.node,'primary')+btn('采集派遣',{type:'ui_idleOpen',region:'marsh'},'secondary')+'</div></section>';
 }
 let text=n.text;
 if(id==='hut'&&has('invited'))text='药桌收拾干净了，安道全已带着药箱回寨。冯伯留了一壶凉茶，让过路人歇脚。';
 else if(id==='hut'&&has('rescued'))text='冯伯能扶着桌子走动了。安道全收起绷带，惦记着沉船里那几箱没泡水的药。';
 if(id==='garden'&&has('tended'))text='水顺着新开的沟渠流走，泽兰叶片重新挺了起来。冯伯在畦边留下了采收记号。';
 if(id==='nest'&&has('won_nest'))text='船板上的蛇群退去了。大药箱已经捆好，船尾还留着几只破篓；再来仍可能遇到蛇群。';
 let body='<p>'+esc(text)+'</p><p class="note">'+esc(n.purpose)+'</p>';
 if(here!==id){const gate=marshGate(s,id),path=marshPath(s,id);body+='<p class="note">'+esc(gate||'路线：'+path.map(k=>MARSH_NODES[k].name).join(' → '))+'</p>'+action('前往'+n.name,'regionMove',id,'primary',!!gate);}
 else{
  const task=(label,key)=>{const reason=marshTask(s,key);return '<div class="region-action">'+action(label,'regionDo',key,'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
  if(n.battle){
   const q=marshFightQuote(s,id),gear=specialDropTable(n.battle,1).filter(r=>r.kind==='equipment').slice(0,2),enemies=[...q.dungeon.enemies,...(n.route?[SPECIAL_ROUTES[n.route].enemy]:[])];
   body+='<p class="note">敌人：'+enemies.map(k=>d.by.enemies[k].name).join('、')+'</p><p class="note">'+gear.map(r=>d.by.equipments[r.id].name+' '+Number((r.rate*100).toFixed(2))+'%').join(' · ')+'</p>';
   if(id==='poison')body+='<p class="notice">涉水毒伤：每 2 秒损失 3% 最大气血，共 4 次。解毒丹可在战斗中使用。胜利必得药草 3。</p>';
   if(id==='nest')body+='<p class="note">浅水苇道与毒水湾合计通关 '+(s.specialDungeons?.clears.marsh_1||0)+'/5 趟；首蛇蓄势时可用打断。</p>';
   body+='<div class="actions">'+action(id==='nest'?'登船取药':'挑战蛇群','regionBattle',id,'primary',!!q.reason)+btn('全部掉落',{type:'ui_specialView',id:n.battle,tier:1,tab:'drops'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');
  }
  if(id==='hut'){
   if(!has('met'))body+=task('与安道全交谈','meet');
   else if(!has('rescued'))body+='<p class="note">任选一种救治方法，只交一次材料。</p>'+task('用药草救治 · 药草 6、粗布 2','treatHerbs')+task('用成药救治 · 解毒丹 1','treatAntidote');
   else if(!has('invited'))body+=task(s.heroes.andaoquan.status==='owned'?'交还药箱':'邀请安道全入寨','invite');
   else body+='<p>安道全已把药方带回寨中。配药间建成后，金疮膏少用泽兰 1 份，芦苇泽每批药草 +1。</p>'+btn('回寨查看配药间',{type:'ui_section',view:'camp',id:'exploration'},'primary');
  }
  if(id==='garden')body+=has('tended')?'<p>药圃已恢复：芦苇泽派遣每批泽兰额外 +1。此前暂存不追补。</p>'+btn('派遣采药',{type:'ui_idleOpen',region:'marsh'},'primary'):task('清沟护苗 · 木材 3、粗布 1','tend');
  if(id==='nest'&&!has('cache'))body+=task('收好小药箱 · 浓制药引 2、解毒丹 2','cache');
  if(id==='landing')body+='<p>'+(has('rescued')?'冯伯能下地了。他指明的药圃已标在地图上。':'草庐里有人受了毒伤，安道全正在等药。')+'</p>'+action('查看草庐','ui_regionInspect','hut','primary');
 }
 return '<section class="region-panel" data-exploration-region="marsh">'+heading+'<div class="actions">'+back+'</div><article class="region-detail"><h3>'+n.name+'</h3>'+body+'</article><details><summary>水路与地区变化</summary><p class="note">渡头 ↔ 浅水苇道／采药草庐／毒水湾 ↔ 泽兰药圃 ↔ 沉船蛇巢</p><p>药农：'+(has('rescued')?'已救治':'待救治')+' · 药圃：'+(has('tended')?'已恢复':'待整修')+' · 安道全：'+(has('invited')?'已回寨':has('met')?'已相识':'未相识')+'</p></details><div class="actions">'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration'},'secondary')+btn('派遣采药',{type:'ui_idleOpen',region:'marsh'},'secondary')+'</div></section>';
}
