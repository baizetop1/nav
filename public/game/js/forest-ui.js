import {revisitPanel} from './region-revisit-ui.js?v=0.82.2';
import {FOREST_NODES,forestHas,forestGate,forestGoal} from './forest-data.js?v=0.82.2';
import {forestPath,forestFightQuote,forestTask} from './forest.js?v=0.82.2';
import {specialDropTable} from './special-dungeons.js?v=0.82.2';
import {SPECIAL_ROUTES} from './special-routes.js?v=0.82.2';
export function forestPanel(s,d,esc,btn,selected){
 const x=s.exploration.forest,here=x.position,id=Object.hasOwn(FOREST_NODES,selected)?selected:here,n=FOREST_NODES[id],has=k=>forestHas(s,k);
 const action=(label,type,key,style='secondary',disabled=false,extra={})=>btn(label,{type,region:'forest',...(key?{id:key}:{}),...extra},style,disabled);
 const heading='<header class="region-heading"><h2>青石古道</h2><span>所在：'+FOREST_NODES[here].name+'</span></header>';
 const roads='茶棚 ↔ 岔路 ↔ 哨台 ↔ 营地<br>茶棚 ↔ 藤坡 ↔ 小径 ↔ 营地';
 if(!selected){const goal=forestGoal(s),map='<nav class="region-map" aria-label="青石古道地点">'+Object.entries(FOREST_NODES).map(([key,m])=>action(m.name+' · '+(here===key?'所在':forestGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),'ui_regionInspect',key).replace('<button ','<button aria-pressed="'+(here===key)+'" ')).join('')+'</nav>';
  return '<section class="region-panel region-overview" data-exploration-region="forest">'+heading+map+'<p class="note region-roads">'+roads+(has('scouted')?'<br>已发现：茶棚 ↔ 林后小径':'')+'</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+(goal.command?btn(goal.label,goal.command,'primary'):action('跟进此事','ui_regionInspect',goal.node,'primary'))+btn('采集派遣',{type:'ui_idleOpen',region:'forest'},'secondary')+'</div></section>';
 }
 let text=n.text;
 if(id==='post'&&has('cargo'))text=has('invited')?'桌凳重新摆好了。商队在茶棚歇脚，时迁已回寨，掌柜正把新到的药包摆上桌。':'货物都点过了。掌柜重新摆好桌凳，时迁在棚下喝茶，脚边放着收拾好的包袱。';
 if(id==='ridge'&&has('tended'))text='新藤留在架上，能割的老藤系了布条。采集人照着记号动手，不再连根扯断。';
 if(id==='trail'&&has('sabotaged'))text='铃舌被山藤牢牢缠住，风吹也不响。落叶掩好了脚印，这条路随时可以再走。';
 if(id==='watch'&&has('scouted'))text='时迁在树根刻了箭头，指向营后。往回走还能抄近路到茶棚。';
 if(id==='camp'&&has('won_camp'))text=has('cargo')?'商队的货箱已经搬走，空营里又来了零散盗匪。仍可来搜寻衣料和轻装兵器。':'头目退走了，商队的货箱还在棚下。绳头上留着茶棚掌柜的布记号。';
 let body='<p>'+esc(text)+'</p><p class="note">'+esc(n.purpose)+'</p>';
 if(n.battle){const q=forestFightQuote(s,id),enemies=[...q.dungeon.enemies,...(n.route&&SPECIAL_ROUTES[n.route].enemy?[SPECIAL_ROUTES[n.route].enemy]:[])],gear=specialDropTable(n.battle,1).filter(r=>r.kind==='equipment').slice(0,2);body+='<p class="note">敌人：'+(id==='camp'?'劫道头目、传令哨、守卫':enemies.map(k=>d.by.enemies[k].name).join('、'))+'</p><p class="note">'+gear.map(r=>d.by.equipments[r.id].name+' '+Number((r.rate*100).toFixed(2))+'%').join(' · ')+'；材料与其他物品见掉落表。</p>';
  if(id==='watch')body+='<p class="note">哨台多一名骑匪，全敌气血、速度 +10%。胜利必得碎铁 2，其他物品随机。</p>';
  if(id==='camp')body+='<p class="notice">头目蓄势 3 秒后齐射全队。先击倒第二位传令哨，或留招打断；拆铃后可选潜入，只承受单体攻击。</p>';
 }
 if(here!==id){const gate=forestGate(s,id),path=forestPath(s,id);body+='<p class="note">'+esc(gate||'路线：'+path.map(k=>FOREST_NODES[k].name).join(' → '))+'</p>'+action('前往'+n.name,'regionMove',id,'primary',!!gate);}
 else{
  const task=(label,key)=>{const reason=forestTask(s,key);return '<div class="region-action">'+action(label,'regionDo',key,'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
  if(n.battle){const q=forestFightQuote(s,id);body+='<div class="actions">'+action(id==='camp'?'正面攻营':'挑战劫匪','regionBattle',id,'primary',!!q.reason);
   if(id==='camp'){const quiet=forestFightQuote(s,id,'quiet');body+=action('后路潜入','regionBattle',id,'secondary',!!quiet.reason,{approach:'quiet'});}
   body+=btn('全部掉落',{type:'ui_specialView',id:n.battle,tier:1,tab:'drops'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');
   if(id==='camp'&&!has('sabotaged'))body+=action('去小径拆铃','ui_regionInspect','trail')+'<p class="note">潜入胜利另得山藤 1；两条路线的随机掉落表相同。</p>';
  }
  if(id==='post'){
   if(!has('met'))body+=task('与时迁交谈','meet');else if(!has('invited'))body+=task(s.heroes.shiqian.status==='owned'?'与时迁回寨':'邀请时迁入寨','invite');else body+=btn('回寨找时迁',{type:'ui_section',view:'camp',id:'exploration',region:'forest'},'primary');
   if(has('cargo'))body+='<p class="note">货摊又开张了，可直接买补给。</p>'+btn('看看货摊',{type:'ui_section',view:'bag',id:'shop'},'secondary');
  }
  if(id==='watch'&&!has('scouted'))body+=task('随时迁查探哨位','scout');
  if(id==='ridge')body+=has('tended')?'<p class="note">山藤每批额外 +1。客舍用山藤 6、拓片 6；短褐可在集市 2 级后打造。</p><div class="actions">'+btn('查看斥候短褐',{type:'ui_regionalRecipe',id:'forest'},'primary')+btn('派遣采藤',{type:'ui_idleOpen',region:'forest'},'secondary')+'</div>':task('标记藤坡 · 带回山藤 3','tend');
  if(id==='trail')body+=has('sabotaged')?'<p class="note">警铃已固定，前往营地可选后路潜入。以后不再消耗山藤。</p>'+action('查看藏货营地','ui_regionInspect','camp','primary'):task('固定警铃 · 山藤 2','sabotage');
  if(id==='camp'&&!has('cargo'))body+=task('取回商队货物 · 收取谢礼','cargo');
 }
 const revisit=revisitPanel(s,d,esc,btn,'forest',id,FOREST_NODES,body);if(revisit)return revisit;
 return '<section class="region-panel" data-exploration-region="forest">'+heading+'<div class="actions">'+action('返回古道图','ui_regionOpen')+'</div><article class="region-detail"><h3>'+n.name+'</h3>'+body+'</article><details><summary>道路与地区变化</summary><p class="note">'+roads+(has('scouted')?'<br>近路：茶棚 ↔ 林后小径':'')+'</p><p>藤坡：'+(has('tended')?'已标记':'未标记')+' · 警铃：'+(has('sabotaged')?'已固定':'尚在')+' · 商队：'+(has('cargo')?'已回来':'等待追回货物')+'</p></details><div class="actions">'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'forest'},'secondary')+btn('派遣采集',{type:'ui_idleOpen',region:'forest'},'secondary')+'</div></section>';
}
