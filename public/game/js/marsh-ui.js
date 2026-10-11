import {MARSH_NODES,marshHas,marshGate,marshGoal,MARSH_DECOCT} from './marsh-data.js?v=0.82.0';
import {marshPath,marshFightQuote,marshTask,marshDecoctQuote} from './marsh.js?v=0.82.0';
import {specialDropTable} from './special-dungeons.js?v=0.82.0';
import {SPECIAL_ROUTES} from './special-routes.js?v=0.82.0';
export function marshPanel(s,d,esc,btn,selected){
 const x=s.exploration.marsh,here=x.position,id=Object.hasOwn(MARSH_NODES,selected)?selected:here,n=MARSH_NODES[id],has=k=>marshHas(s,k);
 const action=(label,type,key,style='secondary',disabled=false,extra={})=>btn(label,{type,region:'marsh',...(key?{id:key}:{}),...extra},style,disabled);
 const heading='<header class="region-heading"><h2>芦苇泽</h2><span>所在：'+MARSH_NODES[here].name+'</span></header>';
 if(!selected){
  const goal=marshGoal(s),map='<nav class="region-map" aria-label="芦苇泽地点">'+Object.entries(MARSH_NODES).map(([key,m])=>action(m.name+' · '+(here===key?'所在':marshGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),'ui_regionInspect',key).replace('<button ','<button aria-pressed="'+(here===key)+'" ')).join('')+'</nav>';
  return '<section class="region-panel region-overview" data-exploration-region="marsh">'+heading+map+'<p class="note region-roads">渡头 ↔ 苇道／草庐／毒水湾 ↔ 药圃 ↔ 蛇巢</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+(goal.command?btn(goal.label,goal.command,'primary'):action('跟进此事','ui_regionInspect',goal.node,'primary'))+btn('采集派遣',{type:'ui_idleOpen',region:'marsh'},'secondary')+'</div></section>';
 }
 let text=n.text;
 if(id==='hut'&&has('met')&&!has('rescued'))text=has('care_supplies')?'备用药料已取出。安道全等着你递药。':'安道全在替冯伯裹伤，门后的木箱里还有一份药料。';
 if(id==='hut'&&has('return_paid'))text='药桌上多了几罐新药。安道全留下用量，让人每日送一批泽兰回寨。';
 else if(id==='hut'&&has('invited'))text=has('return_met')?'冯伯把几畦药苗托付给你，自己留在草庐晾药。':'冯伯捎来了发黄的泽兰。安道全回草庐看了一趟，托你查查进水沟。';
 else if(id==='hut'&&has('rescued'))text='冯伯能扶着桌子走动了。安道全惦记着沉船里那几箱没泡水的药。';
 if(id==='garden'&&has('tended'))text=has('return_paid')?'沟水清了，冯伯把采药路重新踏实。还会有蛇游来，可去沉船清理。':has('return_met')?'泽兰的根泡在浑水里，上游不时漂来蛇蜕。先沿进水沟找一找。':'水顺着新开的沟渠流走，泽兰叶片重新挺了起来。';
 if(id==='nest'&&has('source_checked'))text=has('won_reedvenom')?'堵口的枯苇已经拖开。仍有蛇游进船底，可再来清理、采些泽兰。':'赤背大蛇堵住了沟口，浑水还在往药圃里倒灌。';
 else if(id==='nest'&&has('won_nest'))text='蛇群退去了。大药箱已经捆好，船尾另有一只小药箱。';
 let extra='',body='<p>'+esc(text)+'</p>';
 const task=(label,key)=>{const reason=marshTask(s,key);return '<div class="region-action">'+action(label,'regionDo',key,'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
 if(here!==id){const gate=marshGate(s,id),path=marshPath(s,id);body+='<p class="note">'+esc(gate||'路线：'+path.map(k=>MARSH_NODES[k].name).join(' → '))+'</p>'+action('前往'+n.name,'regionMove',id,'primary',!!gate);}
 else{
  if(n.battle){
   const repeat=id==='nest'&&has('source_checked'),approach=repeat?'reedvenom':'direct',q=marshFightQuote(s,id,approach);
   const fight=(mode,label)=>{const quote=marshFightQuote(s,id,mode);return action(label,'regionBattle',id,'primary',!!quote.reason,mode==='direct'?{}:{approach:mode})+(quote.reason?'<p class="note">'+esc(quote.reason)+'</p>':'');};
   body+='<p class="note">体力 0 · 粮草 0 · 好汉小队出战</p>';
   if(id==='poison')body+='<p class="note">开场中毒，胜利另得药草 3；可用解毒丹。</p>';
   if(repeat)body+='<p class="note">蓄势时先解毒，可避开重毒；也可打断或固守。胜利另得泽兰 1。</p>';
   else if(id==='nest')body+='<p class="note">水路清过一次即可取药；首蛇蓄势时可用打断。</p>';
   body+='<div class="actions">'+fight(approach,repeat?'清渠除蛇':id==='nest'?'登船取药':'挑战蛇群')+btn('全部掉落',{type:'ui_specialView',id:n.battle,tier:1,tab:'drops',...(repeat?{route:'reedvenom'}:{})},'secondary')+'</div>';
   if(id==='nest'&&has('won_nest')&&!has('invited'))body+=action('回草庐交药箱','regionMove','hut','primary');
   if(repeat&&has('won_reedvenom')&&!has('return_paid'))body+=action('回草庐交泽兰','regionMove','hut','primary');
   const gear=specialDropTable(n.battle,1).filter(r=>r.kind==='equipment').slice(0,2),enemies=[...q.dungeon.enemies,...(n.route&&SPECIAL_ROUTES[n.route].enemy?[SPECIAL_ROUTES[n.route].enemy]:[])];
   extra+='<h3>敌情与掉落</h3><p class="note">敌人：'+enemies.map((k,i)=>repeat&&i===0?'赤背首蛇':d.by.enemies[k].name).join('、')+'</p><p class="note">'+esc(repeat?SPECIAL_ROUTES.reedvenom.text:n.purpose)+'</p><p class="note">'+gear.map(r=>d.by.equipments[r.id].name+' '+Number((r.rate*100).toFixed(2))+'%').join(' · ')+'</p>'+(repeat?fight('direct','普通药船挑战'):'');
  }
  if(id==='hut'){
   if(!has('met'))body+=task('与安道全交谈','meet');
   else if(!has('rescued')){
    const options='<p class="note">任选一种：药草 '+(s.inventory.herb||0)+'/6、粗布 '+(s.inventory.cloth||0)+'/2；或解毒丹 '+(s.inventory.jiedudan||0)+'/1。</p><div class="actions">'+action('用药草救治','regionDo','treatHerbs','primary',!!marshTask(s,'treatHerbs'))+action('用成药救治','regionDo','treatAntidote','secondary',!!marshTask(s,'treatAntidote'))+'</div>';
    body+=!has('care_supplies')?task('取备用药料 · 仅一次','supplies')+'<details><summary>用自备药料救治</summary>'+options+'</details>':options;
   }else if(!has('tended'))body+=action('去药圃清沟护苗','regionMove','garden','primary');
   else if(!has('won_nest'))body+=action('去沉船取药箱','regionMove','nest','primary');
   else if(!has('invited'))body+=task(s.heroes.andaoquan.status==='owned'?'交还药箱':'邀请安道全入寨','invite');
   else if(!has('return_met'))body+=task('听冯伯的口信','return');
   else if(!has('source_checked'))body+=action('去药圃查水沟','regionMove','garden','primary');
   else if(!has('won_reedvenom'))body+=action('去沉船清渠除蛇','regionMove','nest','primary');
   else if(!has('return_paid'))body+=task('交泽兰 · 收下谢礼','thanks');
   else body+='<p class="note">每日可用泽兰 4、药草 2、碎银 20，煎浓制药引 1。</p>'+btn('回寨煎药',{type:'ui_section',view:'camp',id:'exploration',region:'marsh',building:'clinic'},'primary');
  }
  if(id==='garden'){
   if(!has('tended'))body+=task('清沟护苗 · 木料 3、粗布 1','tend');
   else if(!has('won_nest'))body+=action('去沉船取药箱','regionMove','nest','primary');
   else if(!has('invited'))body+=action('回草庐交药箱','regionMove','hut','primary');
   else if(has('return_met')&&!has('source_checked'))body+=task('查看进水沟','checkwater');
   else if(has('source_checked')&&!has('won_reedvenom'))body+=action('去沉船清渠除蛇','regionMove','nest','primary');
   else if(has('won_reedvenom')&&!has('return_paid'))body+=action('回草庐交泽兰','regionMove','hut','primary');
   else body+='<p class="note">药圃已恢复：派遣每批泽兰 +1。</p>'+btn('派遣采药',{type:'ui_idleOpen',region:'marsh'},'primary');
  }
  if(id==='nest'&&has('won_nest')&&!has('cache'))extra+='<h3>船尾小药箱 · 尚未取</h3>'+task('取药引 2、解毒丹 2','cache');
  if(id==='landing')body+=action('去采药草庐','regionMove','hut','primary');
 }
 return '<section class="region-panel" data-exploration-region="marsh"><header class="region-heading"><h2>'+n.name+'</h2>'+action('回泽地图','ui_regionOpen')+'</header><article class="region-detail">'+body+'</article><details><summary>敌情、藏物与采集</summary>'+extra+'<p class="note">渡头 ↔ 浅水苇道／采药草庐／毒水湾 ↔ 泽兰药圃 ↔ 沉船蛇巢</p><p>药农：'+(has('rescued')?'已救治':'待救治')+' · 药圃：'+(has('tended')?'已恢复':'待整修')+' · 安道全：'+(has('invited')?'已回寨':has('met')?'已相识':'未相识')+' · 水沟：'+(has('return_paid')?'已清理':has('return_met')?'待查探':'尚未重访')+'</p><div class="actions">'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'marsh',building:'clinic'},'secondary')+btn('派遣采药',{type:'ui_idleOpen',region:'marsh'},'secondary')+'</div></details></section>';
}
export function marshDecoctPanel(s,d,esc,btn){const q=marshDecoctQuote(s);return '<section class="marsh-decoct"><h4>安道全 · 泽兰煎药</h4><p class="note">药引用于金疮膏、醒神散、壮骨汤。每日一罐，共用军需煎药八次上限。</p><p class="note">'+Object.entries(MARSH_DECOCT.items).map(([id,n])=>esc(d.by.items[id].name)+' '+(s.inventory[id]||0)+'/'+n).join(' · ')+' · 碎银 '+s.player.silver+'/20</p><div class="actions">'+btn('浓制药引 ×1',{type:'regionDecoct'},'primary',!!q.reason)+btn('查看药品配方',{type:'ui_section',view:'bag',id:'craft',category:'medicines'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'')+'</section>';}
