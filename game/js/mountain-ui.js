import {MOUNTAIN_NODES,mountainHas,mountainGate,mountainGoal} from './mountain-data.js?v=0.84.0';
import {mountainPath,mountainFightQuote,mountainTask} from './mountain.js?v=0.84.0';
import {specialDropTable} from './special-dungeons.js?v=0.84.0';
export function mountainPanel(s,d,esc,btn,selected){
 const x=s.exploration.mountain,here=x.position,id=Object.hasOwn(MOUNTAIN_NODES,selected)?selected:here,n=MOUNTAIN_NODES[id],has=k=>mountainHas(s,k);
 const action=(label,type,key,style='secondary',disabled=false,extra={})=>btn(label,{type,region:'mountain',...(key?{id:key}:{}),...extra},style,disabled);
 const heading='<header class="region-heading"><h2>断崖粮道</h2><span>所在：'+MOUNTAIN_NODES[here].name+'</span></header>';
 const roads='歇棚 ↔ 断车坡 ↔ 乱石隘 ↔ 截粮营<br>歇棚 ↔ 矿脉 ↔ 栈道 ↔ 截粮营';
 if(!selected){const goal=mountainGoal(s),map='<nav class="region-map" aria-label="断崖粮道地点">'+Object.entries(MOUNTAIN_NODES).map(([key,m])=>action(m.name+' · '+(here===key?'所在':mountainGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),'ui_regionInspect',key).replace('<button ','<button aria-pressed="'+(here===key)+'" ')).join('')+'</nav>';
  return '<section class="region-panel region-overview" data-exploration-region="mountain">'+heading+map+'<p class="note region-roads">'+roads+(has('ladder')?'<br>近路已通：歇棚 ↔ 栈道':'')+'</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+(goal.command?btn(goal.label,goal.command,'primary'):action('跟进此事','ui_regionInspect',goal.node,'primary'))+btn('采集派遣',{type:'ui_idleOpen',region:'mountain'},'secondary')+'</div></section>';
 }
 let text=n.text;
 if(id==='shelter'&&has('cargo'))text=has('invited')?'粮车又从棚前经过，车夫把路上的消息留给歇脚的人。项充已经回寨。':'车夫套好了骡子，项充收起药布，站在棚边等你。';
 if(id==='shelter'&&has('return_met'))text=has('return_paid')?'车夫添了一把柴，粮车按日子过隘。棚前留着一块木牌，写着下一趟发车的时辰。':has('won_convoy')?'后车也下了山。车夫看见你，放下手中的碗，快步迎了过来。':'车夫把来信抄在棚柱上，回程的粮车还在山里。项充已经先去隘口了。';
 if(id==='pass'&&has('scouted'))text='盾牌上的裂缝已被项充画在石上。崖壁上的旧路也标清了，正面和高处都能接近营地。';
 if(id==='pass'&&has('road_checked'))text='石后留下两排脚印，一路走到车尾。项充把团牌提在手里：这回得留心绕到最后的人。';
 if(id==='vein'&&has('surveyed'))text='矿层两端插着木签。采集的人沿红砂向里掘，不再白挖坡上的碎石。';
 if(id==='cliff'&&has('ladder'))text='梯扣嵌进石槽，新横木踩上去不晃了。由此可回歇棚，也能绕到营地上方。';
 if(id==='hold'&&has('won_hold'))text=has('cargo')?'粮车已经送走。营里偶尔又聚起劫粮人，可以再来清理。':'大盾倒在门边，几辆粮车都还完好。车夫牵着骡子等你开门。';
 let body='<p>'+esc(text)+'</p><p class="note">'+esc(n.purpose)+'</p>';
 if(n.battle){const gear=specialDropTable(n.battle,1).filter(r=>r.kind==='equipment').slice(0,2);body+='<p class="note">敌人：'+(id==='hold'?'截粮头目、执盾匪徒、持刀匪徒':id==='pass'?'执盾匪徒、持刀匪徒、长枪匪徒、增援盾兵':'执盾匪徒、持刀匪徒、长枪匪徒')+'</p><p class="note">'+gear.map(r=>d.by.equipments[r.id].name+' '+Number((r.rate*100).toFixed(2))+'%').join(' · ')+'；其他物品见掉落表。</p>';
  if(id==='pass')body+='<p class="note">多一名盾兵，全敌气血 +10%、开场护阵 30% 持续 8 秒。胜利另得精铁 1。</p>';
  if(id==='hold')body+='<p class="notice">正面：头目举盾蓄势 3 秒。期间用破甲招式或守炉重锤破去护阵，可阻止重击并使他破甲 6 秒；也可打断。高处绕行：不举盾，改为较轻的单体突刺，但全敌速度 +15%。</p>';
 }
 if(here!==id){const gate=mountainGate(s,id),path=mountainPath(s,id);body+='<p class="note">'+esc(gate||'路线：'+path.map(k=>MOUNTAIN_NODES[k].name).join(' → '))+'</p>'+action('前往'+n.name,'regionMove',id,'primary',!!gate);}
 else{
  const task=(label,key)=>{const reason=mountainTask(s,key);return '<div class="region-action">'+action(label,'regionDo',key,'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
  if(n.battle){const q=mountainFightQuote(s,id);body+='<div class="actions">'+action(id==='hold'?'正面攻营':'挑战粮匪','regionBattle',id,'primary',!!q.reason);
   if(id==='hold'){const high=mountainFightQuote(s,id,'highpath');body+=action('高处绕行','regionBattle',id,'secondary',!!high.reason,{approach:'highpath'});}
   if(id==='hold'&&has('road_checked')){const follow=mountainFightQuote(s,id,'convoy');body+=action('护粮回程','regionBattle',id,'secondary',!!follow.reason,{approach:'convoy'});}
   body+=btn('全部掉落',{type:'ui_specialView',id:n.battle,tier:1,tab:'drops'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');
   if(id==='hold')body+=(has('ladder')?'':action('去修通栈道','ui_regionInspect','cliff'))+'<p class="note">绕行胜利另得赤铜砂 1；两路随机掉落相同。不耗体力、粮草，不带兵。</p>';
  }
  if(id==='shelter'){
   if(!has('met'))body+=task('与项充交谈','meet');else if(!has('invited'))body+=task(s.heroes.xiangchong.status==='owned'?'与项充回寨':'邀请项充入寨','invite');else body+=btn('回寨找项充',{type:'ui_section',view:'camp',id:'exploration',region:'mountain'},'primary');
   if(has('cargo'))body+='<p class="note">粮车恢复往来，歇棚能买补给。</p>'+btn('看看歇棚货摊',{type:'ui_section',view:'bag',id:'shop'},'secondary');
  }
  if(id==='shelter'&&has('invited')){if(!has('return_met'))body+=task('读车夫留下的信','return');else if(has('won_convoy')&&!has('return_paid'))body+=task('给车夫报平安 · 收下谢礼','thanks');else if(has('return_paid'))body+='<p class="note">车夫的谢礼已收：赤铜砂 4、项充信物 2、强化符 1。护粮回程仍可挑战，每次胜利另得熟皮 1。</p>';else body+=action('跟进粮车下落','ui_regionInspect',has('road_checked')?'hold':'pass','primary');}
  if(id==='pass'&&has('return_met')&&!has('road_checked'))body+=task('查看车辙与脚印','checkroad');
  if(id==='pass'&&!has('scouted'))body+=task('随项充查看敌情','scout');
  if(id==='vein')body+=has('surveyed')?'<p class="note">赤铜砂每批额外 +1。矿砂炉需赤铜砂 6、磁铁砂 6；集市 2 级可打造束带。</p><div class="actions">'+btn('查看稳步束带',{type:'ui_regionalRecipe',id:'mountain'},'primary')+btn('派遣采矿',{type:'ui_idleOpen',region:'mountain'},'secondary')+'</div>':task('标记矿脉 · 带回赤铜砂 4','survey');
  if(id==='cliff')body+=has('ladder')?'<p class="note">栈道已修好，高处绕行不再耗料。</p>'+action('查看截粮营','ui_regionInspect','hold','primary'):task('修通栈道 · 赤铜砂 3、木材 2','ladder')+btn('缺木材？去集市',{type:'ui_section',view:'bag',id:'shop'},'secondary');
  if(id==='hold'&&has('road_checked'))body+='<p class="notice">护粮回程：多一名绕后伏兵。头目蓄势后夹击最后一位同伴；击倒最末位伏兵或打断可阻止，固守使本招减伤 50%。胜利另得熟皮 1；首次回歇棚报平安可取一次谢礼。</p>';
  if(id==='hold'&&!has('cargo'))body+=task('交还粮车 · 收取谢礼','cargo');
 }
 return '<section class="region-panel" data-exploration-region="mountain">'+heading+'<div class="actions">'+action('返回粮道图','ui_regionOpen')+'</div><article class="region-detail"><h3>'+n.name+'</h3>'+body+'</article><details><summary>山路与地区变化</summary><p class="note">'+roads+(has('ladder')?'<br>近路：歇棚 ↔ 栈道':'')+'</p><p>隘口：'+(has('scouted')?'已探明':'待探')+' · 矿脉：'+(has('surveyed')?'已标记':'未标记')+' · 栈道：'+(has('ladder')?'已修通':'未修通')+' · 粮车：'+(has('cargo')?'已送回':'被扣在营中')+'</p></details><div class="actions">'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'mountain'},'secondary')+btn('派遣采集',{type:'ui_idleOpen',region:'mountain'},'secondary')+'</div></section>';
}
