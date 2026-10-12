import {MINE_COMPANION_TASKS,mineCompanionHas,mineCompanionGoal,mineCompanionTask} from './mine-companion-data.js?v=0.82.1';
import {specialPlan} from './special-dungeons.js?v=0.82.1';
export function minePeople(s,btn){const has=k=>mineCompanionHas(s,k),next=mineCompanionGoal(s);
 return '<nav class="mine-people" aria-label="矿洞人物">'+btn('汤隆 · '+(has('invited')?'已入寨':has('met')?'委托中':'待相识'),{type:'ui_regionOpen',region:'mine',node:'furnace'},'secondary')+btn('李云 · '+(has('liyun_invited')?'已入寨':has('liyun_met')?'委托中':next?'可结识':'矿车后'),{type:'ui_regionOpen',region:'mine',node:has('liyun_invited')?'chamber':next?.node||'entrance'},'secondary',!next)+'</nav>';
}
export function mineCompanionNode(s,id,esc,btn){
 const has=k=>mineCompanionHas(s,k);if(!has('return_paid'))return null;
 const task=(key,extra='')=>{const q=mineCompanionTask(s,key),t=MINE_COMPANION_TASKS[key];return '<div class="actions">'+btn(key==='liyun_invite'&&s.heroes.liyun.status==='owned'?'与李云办妥此事':t.label,{type:'regionDo',id:key},'primary',!!q)+extra+'</div>'+(q?'<p class="note">'+esc(q)+'</p>':'');};
 const go=(node,label)=>btn(label,{type:'regionMove',id:node},'primary');
 if(id==='entrance'&&!has('liyun_met'))return {scene:'一个青眼汉子把短尺横在车前：“梁头掉灰了，车先停一停。”老杜认得他，叫了声李都头。',body:task('liyun_meet',btn('追踪李云',{type:'goalSet',kind:'invite',id:'liyun'},'secondary'))+'<details><summary>矿口货郎</summary>'+btn('换精铁 3 · 碎银 60',{type:'regionTrade'},'secondary',s.player.silver<60||s.daily.counters.region_trade>0)+btn('买补给',{type:'ui_section',view:'bag',id:'shop'},'secondary')+'</details>'};
 if(id==='entrance'&&has('liyun_met')&&!has('liyun_invited')){const next=mineCompanionGoal(s);return {scene:next.text,body:go(next.node,'继续李云委托')+'<details><summary>矿口货郎</summary>'+btn('换精铁 3 · 碎银 60',{type:'regionTrade'},'secondary',s.player.silver<60||s.daily.counters.region_trade>0)+btn('买补给',{type:'ui_section',view:'bag',id:'shop'},'secondary')+'</details>'};}
 if(id==='chamber'&&has('liyun_met')){
  if(!has('liyun_checked'))return {scene:'李云把灯递给你，自己蹲在梁脚旁。旧梁斜着，裂口里夹着新落的灰。',body:task('liyun_survey')};
  if(!has('liyun_hoops'))return {scene:'梁宽和地脚都量好了。李云要换两根粗木，再箍上铁。',body:go('furnace','去炉房找汤隆')};
  if(!has('liyun_won'))return {scene:'铁箍已放在墙边，支架还差木料。李云留在这里支起临时撑木。',body:go('rail','去运矿道接木料')};
  if(!has('liyun_braced'))return {scene:'木料已送进石室。李云试好地脚，汤隆也带着锤子来了。',body:task('liyun_brace')+'<p class="note">用送回的专用木料修架，不扣行囊材料。</p>'};
  if(!has('liyun_invited'))return {scene:'老杜推车试过，新梁稳稳当当。李云正在收短尺，身旁只一个小包袱。',body:task('liyun_invite')+'<p class="note">办妥后：李云入寨、信物 2；矿洞派遣每批碎铁 +1。</p>'};
  return {scene:'新梁下多了一道墨线。李云教过矿工，看见梁脚离线，就要停工检修。',body:'<p class="note">李云已入寨，矿洞派遣每批碎铁 +1。</p><div class="actions">'+btn('查看李云',{type:'ui_section',view:'heroes',id:'profile',hero:'liyun'},'primary')+btn('安排采集',{type:'ui_idleOpen',region:'mine'},'secondary')+'</div>'};
 }
 if(id==='furnace'&&has('liyun_checked')&&!has('liyun_hoops'))return {scene:'李云把梁宽记在短尺上。汤隆从废料里拣出半根车轴：“够打铁箍了。”',body:task('liyun_hoops')+'<p class="note">汤隆用旧车轴改打，不用另交精铁。</p>'};
 if(id==='furnace'&&has('liyun_hoops')&&!has('liyun_invited'))return {scene:has('liyun_won')?'汤隆把铁箍交给李云，自己提上锤子：“我也去搭把手。”':'汤隆把铁箍摞在门边。运木车快到了，先去矿道接应。',body:go(has('liyun_won')?'chamber':'rail',has('liyun_won')?'回石室立支架':'去运矿道接木料')};
 if(id==='rail'&&has('liyun_hoops')){const q=specialPlan(s,'mine',1,'timberguard');return {scene:has('liyun_won')?'运木的车常走这条矿道。再护送一趟，可留下一份多余的木材。':'运木的车停在岔口。守路的匪徒挡在前面，还有一骑在车后徘徊。',body:(has('liyun_won')&&!has('liyun_invited')?go('chamber','回石室找李云'):'')+'<p class="note">最后一位夺木骑匪会绕击后排，可先集火他。</p><div class="actions">'+btn('护送木料',{type:'regionBattle',id:'rail',approach:'timberguard'},'primary',!!q.reason)+btn('全部掉落',{type:'ui_specialView',id:'mine',tier:1,tab:'drops',route:'timberguard'},'secondary')+'</div><p class="note">胜利必得木材 1，其他物品随机掉落。体力 0、粮草 0。</p>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'')};}
 return null;
}
