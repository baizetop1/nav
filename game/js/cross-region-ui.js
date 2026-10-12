import {CROSS_STORY,CROSS_WORK,crossStep,crossHas,crossAvailable,crossPrerequisite,crossTaskReason,crossCommand} from './cross-region-data.js?v=0.82.1';
import {crossWorkQuote} from './cross-region.js?v=0.82.1';
import {explorationResume,explorationMaterialSource} from './exploration-goals.js?v=0.82.1';
import {waterFightQuote} from './water.js?v=0.82.1';
const map=(region,node)=>({type:'ui_regionOpen',region,...(node?{node}:{})});
export function crossRegionLink(s,btn){return s.camp?btn(crossHas(s,'delivered')?'药船 · 配药与护送':crossHas(s,'accepted')?'药船 · 继续共事':'三地故人 · 药船消息',crossCommand(),'text-action').replace('<button ','<button data-cross-region-link '):'';}
export function crossRegionPanel(s,d,esc,btn,embedded=false){
 const g=crossStep(s),missing=crossPrerequisite(s),tracked=s.development?.goal?.kind==='crossRegion';
 const header='<header class="region-heading"><h2>药船夜渡</h2><span>'+(!crossAvailable(s)?'尚未接下':crossHas(s,'delivered')?'已办妥':g.number+' / 5')+'</span></header>';
 const route='<div class="cross-route" aria-label="共事人物与地区"><span>芦苇泽 · 安道全</span><span>古道 · 时迁</span><span>渡口 · 阮小七</span></div>';
 let body='';
 if(!s.camp)body='<p>先建起寨子，再去江湖结识他们。</p>'+btn('去建寨',{type:'ui_section',view:'camp',id:'home'},'primary');
 else if(missing){const next=explorationResume(s,missing,true);body='<p>三地的旧事办妥后，安道全会请你找一条失联的药船。</p><ul class="cross-prerequisites">'+Object.entries(CROSS_STORY.regions).map(([region,name])=>'<li>'+(s.exploration?.[region]?.flags.includes('return_paid')?'✓ ':'○ ')+name+'重访</li>').join('')+'</ul><p class="note">'+esc(next.text)+'</p>'+btn(next.label,next.command,'primary');}
 else if(g.id==='done'){
  const r=CROSS_WORK,q=crossWorkQuote(s);body='<p class="note">安道全的方子，小七的药袋。</p><h3>合配行药 · 金疮膏 ×1</h3><p class="note">回复单人气血；每日合配 1 次，共用金疮膏 3 次额度。</p><dl class="cross-cost">'+Object.entries(r.items).map(([id,n])=>'<div><dt>'+esc(d.by.items[id].name)+'</dt><dd>'+(s.inventory[id]||0)+' / '+n+'</dd></div>').join('')+'<div><dt>碎银</dt><dd>'+s.player.silver+' / '+r.silver+'</dd></div></dl><div class="actions">'+btn('合配行药',{type:'regionCrossWork'},'primary',!!q.reason)+btn('再去护药',map('water','fort'),'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'')+'<div class="cross-tools">'+(s.camp.buildings.clinic<2?btn('升级医馆',{type:'ui_section',view:'camp',id:'buildings'},'text-action'):Object.keys(r.items).filter(id=>(s.inventory[id]||0)<r.items[id]).slice(0,1).map(id=>{const source=explorationMaterialSource(s,id);return btn('找'+d.by.items[id].name,source.command,'text-action');}).join(''))+'</div>';
 }else{
  const text={accept:'安道全搁下药杵：“药船晚了两天，茶棚那边也没送信。帮我跑一趟？”',trace:'去古道哨台找时迁。药商的车最后从那儿经过，他认得沿路的记号。',prepare:'时迁找到药箱封条，拖痕一直到了水边。先去鱼棚找阮小七，借船接货。',battle:g.text,deliver:g.text}[g.id];
  body='<p>'+esc(text)+'</p>';
  const here=!g.region||(s.exploration.activeRegion===g.region&&s.exploration[g.region]?.position===g.node);
  if(!here)body+='<p class="note">下一处：'+CROSS_STORY.regions[g.region]+' · '+g.place+'</p>'+btn('前往'+g.place,{type:'regionCrossTravel'},'primary');
  else if(g.id==='battle'){const q=waterFightQuote(s,'fort','medicineboat');body+='<p class="note">体力 0 · 不带兵 · 必得药草 2，其余随机掉落</p><div class="actions">'+btn('护送药船',{type:'regionBattle',region:'water',id:'fort',approach:'medicineboat'},'primary',!!q.reason)+btn('敌情与掉落',{type:'ui_specialView',id:'waterfort',tier:1,route:'medicineboat',tab:'drops'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');}
  else{const reason=crossTaskReason(s,g.id);body+='<p class="note">'+(g.id==='deliver'?'谢礼：三人信物各 1、金疮膏 1、浓制药引 2。只领一次。':'所在：'+g.place)+'</p>'+btn(g.label,{type:'regionCrossTask',id:g.id},'primary',!!reason)+(reason?'<p class="note">'+esc(reason)+'</p>':'');}
 }
 const tools=crossHas(s,'delivered')?'':'<div class="cross-tools">'+(!tracked?btn('追踪这件事',{type:'goalSet',kind:'crossRegion',id:'medicineboat'},'text-action'):'')+btn(embedded?'当地地图':'查看地区图',map(g.region||'marsh'),'text-action')+'</div>';
 return '<section class="cross-region-panel" data-cross-region>'+header+route+'<article class="region-detail">'+body+'</article>'+tools+'</section>';
}
export function crossRegionScene(s,d,esc,btn,selected){
 if(!selected||!crossAvailable(s)||!crossHas(s,'accepted'))return '';
 const g=crossStep(s),active=s.exploration.activeRegion;
 if(!crossHas(s,'delivered')&&(g.region===active&&g.node===selected||crossHas(s,'won')&&active==='water'&&selected==='fort'))return crossRegionPanel(s,d,esc,btn,true);
 if(crossHas(s,'delivered')&&active==='water'&&selected==='fort'){
  const here=s.exploration.water.position==='fort',q=waterFightQuote(s,'fort','medicineboat');
  return '<section class="cross-region-panel" data-cross-region><header class="region-heading"><h2>芦荡水寨</h2>'+btn('返回渡口图',map('water'),'secondary')+'</header><article class="region-detail"><h3>药船夜渡 · 可重复</h3><p>哨铃已拆，小七备好了船缆。水寨外仍有拦药的匪徒。</p><p class="note">先压住最末位弩手，可止住两次连射，让头目破甲。体力 0，不带兵；必得药草 2，其余随机。</p><div class="actions">'+(here?btn('护送药船',{type:'regionBattle',region:'water',id:'fort',approach:'medicineboat'},'primary',!!q.reason):btn('前往水寨',{type:'regionMove',region:'water',id:'fort'},'primary'))+btn('全部掉落',{type:'ui_specialView',id:'waterfort',tier:1,route:'medicineboat',tab:'drops'},'secondary')+'</div>'+(here&&q.reason?'<p class="note">'+esc(q.reason)+'</p>':'')+'</article><div class="cross-tools">'+btn('回寨配药',crossCommand(),'text-action')+btn('夺回渡船',{type:'ui_specialView',id:'waterfort',tier:1,route:'backwash',tab:'overview'},'text-action')+btn('普通水寨',{type:'ui_specialView',id:'waterfort',tier:1,tab:'overview'},'text-action')+'</div></section>';
 }
 return '';
}
