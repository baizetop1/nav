import {revisitPanel} from './region-revisit-ui.js?v=0.83.0';
import {WATER_NODES,waterHas,waterGate,waterGoal} from './water-data.js?v=0.83.0';
import {waterPath,waterFightQuote,waterTask} from './water.js?v=0.83.0';
import {specialDropTable} from './special-dungeons.js?v=0.83.0';
export function waterPanel(s,d,esc,btn,selected){
 const x=s.exploration.water,here=x.position,id=Object.hasOwn(WATER_NODES,selected)?selected:here,n=WATER_NODES[id],has=k=>waterHas(s,k);
 const action=(label,type,key,style='secondary',disabled=false,extra={})=>btn(label,{type,region:'water',...(key?{id:key}:{}),...extra},style,disabled);
 const heading='<header class="region-heading"><h2>芦荡渡口</h2><span>所在：'+WATER_NODES[here].name+'</span></header>';
 const roads='鱼棚 ↔ 浅滩 ↔ 回水湾 ↔ 水寨<br>鱼棚 ↔ 苇滩 ↔ 泊船桩 ↔ 水寨';
 if(!selected){const goal=waterGoal(s),map='<nav class="region-map" aria-label="芦荡渡口地点">'+Object.entries(WATER_NODES).map(([key,m])=>action(m.name+' · '+(here===key?'所在':waterGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),'ui_regionInspect',key).replace('<button ','<button aria-pressed="'+(here===key)+'" ')).join('')+'</nav>';
  return '<section class="region-panel region-overview" data-exploration-region="water">'+heading+map+'<p class="note region-roads">'+roads+(has('charted')?'<br>已发现：鱼棚 ↔ 旧泊船桩':'')+'</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+(goal.command?btn(goal.label,goal.command,'primary'):action('跟进此事','ui_regionInspect',goal.node,'primary'))+btn('采集派遣',{type:'ui_idleOpen',region:'water'},'secondary')+'</div></section>';
 }
 let text=n.text;
 if(id==='dock'&&has('rescued'))text=has('invited')?'船户们又撑起了篷，鱼棚边摆着药包和干粮。阮小七已回寨，渡船照常来往。':'船老大正补船篷。阮小七把渔网收进篓里，等你一起回寨。';
 if(id==='bend'&&has('charted'))text='湾口插着几根细竹，连成一条能行船的水道。顺着竹标走，就不会陷进回水里。';
 if(id==='reeds'&&has('tended'))text='老苇已经做了记号，新芽留在岸边。采集的人知道该割哪一片。';
 if(id==='stakes'&&has('moored'))text='新换的横木稳稳压在桩上，苇绳绕了几道。涨水时，船也能在这里系住。';
 if(id==='fort'&&has('won_fort'))text=has('rescued')?'船户都已回岸。空水寨偶尔又聚起几伙水匪，可以再来搜寻。':'栈桥上的守卫散了。船户隔着木栏招手，绳扣就在门边。';
 let body='<p>'+esc(text)+'</p><p class="note">'+esc(n.purpose)+'</p>';
 if(n.battle){const gear=specialDropTable(n.battle,1).filter(r=>r.kind==='equipment').slice(0,2);body+='<p class="note">敌人：'+(id==='fort'?'水寨头目、栈桥守卫、水匪':id==='bend'?'水匪、船上守卫、接舷追兵':'水匪、船上守卫')+'</p><p class="note">'+gear.map(r=>d.by.equipments[r.id].name+' '+Number((r.rate*100).toFixed(2))+'%').join(' · ')+'；其他物品见掉落表。</p>';
  if(id==='bend')body+='<p class="note">接舷多一名守卫，全敌气血 +10%。胜利另得粗布 2，其他物品随机。</p>';
  if(id==='fort')body+='<p class="notice">头目蓄势 3 秒后掀浪，攻击全队并使怒气 -20。切换固守可额外减轻本招 60% 伤害、保住怒气；系缆可减轻 20% 并保住怒气。两者可叠加，也可打断。</p>';
 }
 if(here!==id){const gate=waterGate(s,id),path=waterPath(s,id);body+='<p class="note">'+esc(gate||'路线：'+path.map(k=>WATER_NODES[k].name).join(' → '))+'</p>'+action('前往'+n.name,'regionMove',id,'primary',!!gate);}
 else{
  const task=(label,key)=>{const reason=waterTask(s,key);return '<div class="region-action">'+action(label,'regionDo',key,'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
  if(n.battle){const q=waterFightQuote(s,id);body+='<div class="actions">'+action(id==='fort'?'直接攻寨':'挑战水匪','regionBattle',id,'primary',!!q.reason);
   if(id==='fort'){const tied=waterFightQuote(s,id,'moored');body+=action('系缆攻寨','regionBattle',id,'secondary',!!tied.reason,{approach:'moored'});}
   body+=btn('全部掉落',{type:'ui_specialView',id:n.battle,tier:1,tab:'drops'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');
   if(id==='fort')body+=(has('moored')?'':action('去整修泊船桩','ui_regionInspect','stakes'))+'<p class="note">系缆胜利另得苇丝 1；两条路线的随机掉落相同。不耗体力、粮草，不带兵。</p>';
  }
  if(id==='dock'){
   if(!has('met'))body+=task('与阮小七交谈','meet');else if(!has('invited'))body+=task(s.heroes.ruanxiaoqi.status==='owned'?'与阮小七回寨':'邀请阮小七入寨','invite');else body+=btn('回寨找阮小七',{type:'ui_section',view:'camp',id:'exploration',region:'water'},'primary');
   if(has('rescued'))body+='<p class="note">渡船已复航，鱼棚能买补给。</p>'+btn('看看鱼棚货摊',{type:'ui_section',view:'bag',id:'shop'},'secondary');
  }
  if(id==='bend'&&!has('charted'))body+=task('随阮小七测水','chart');
  if(id==='reeds')body+=has('tended')?'<p class="note">苇丝每批额外 +1。配药间需苇丝 6、泽兰 6；医馆 2 级可制作药包。</p><div class="actions">'+btn('查看野营药包',{type:'ui_regionalRecipe',id:'water'},'primary')+btn('派遣割苇',{type:'ui_idleOpen',region:'water'},'secondary')+'</div>':task('留芽割苇 · 带回苇丝 4','tend');
  if(id==='stakes')body+=has('moored')?'<p class="note">泊船处已修好，攻寨可选择系缆。以后不再耗料。</p>'+action('查看芦荡水寨','ui_regionInspect','fort','primary'):task('整修船桩 · 苇丝 3、木材 2','moor')+btn('缺木材？去集市',{type:'ui_section',view:'bag',id:'shop'},'secondary');
  if(id==='fort'&&!has('rescued'))body+=task('救出船户 · 收取谢礼','rescue');
 }
 const revisit=revisitPanel(s,d,esc,btn,'water',id,WATER_NODES,body);if(revisit)return revisit;
 return '<section class="region-panel" data-exploration-region="water">'+heading+'<div class="actions">'+action('返回渡口图','ui_regionOpen')+'</div><article class="region-detail"><h3>'+n.name+'</h3>'+body+'</article><details><summary>水道与地区变化</summary><p class="note">'+roads+(has('charted')?'<br>近路：鱼棚 ↔ 旧泊船桩':'')+'</p><p>水道：'+(has('charted')?'已测明':'待探')+' · 苇滩：'+(has('tended')?'已标记':'未标记')+' · 船桩：'+(has('moored')?'已整修':'未整修')+' · 渡船：'+(has('rescued')?'已复航':'被扣在水寨')+'</p></details><div class="actions">'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'water'},'secondary')+btn('派遣采集',{type:'ui_idleOpen',region:'water'},'secondary')+'</div></section>';
}
