import {mountainHas} from './mountain-data.js?v=0.84.0';
import {waterHas} from './water-data.js?v=0.84.0';
import {forestHas} from './forest-data.js?v=0.84.0';
import {ruinsHas} from './ruins-data.js?v=0.84.0';
import {marshHas} from './marsh-data.js?v=0.84.0';
import {regionHas,regionBuilt} from './exploration-data.js?v=0.84.0';
import {GATHERING_REGIONS,REGIONAL_RECIPES,gatheringProgress} from './gathering-data.js?v=0.84.0';
import {IDLE_ROUTES,idleUnlocked} from './idle-data.js?v=0.84.0';
import {regionalQuote} from './gathering.js?v=0.84.0';
import {corpsQuote} from './development.js?v=0.84.0';
import {promotionQuote} from './quality.js?v=0.84.0';
import {away} from './progression-paths.js?v=0.84.0';
export function gatheringDiscovery(s,id,d){
 const m=GATHERING_REGIONS[id],p=gatheringProgress(s,id),main=Object.keys(IDLE_ROUTES[id].items)[0];
 return '<details class="gathering-discovery"><summary>采集点 · '+m.site+' · '+(p.runs>=3?'已发现':p.runs+'/3 趟')+'</summary><p class="note">'+(p.runs>=3?'已发现：':'累计走通本地区三次发现，')+d.by.items[m.item].name+'每批 +1。'+(p.best>=2?'险路已通：':'通关本地区第二难度后，')+d.by.items[main].name+'每批 +1。采集不会增加探索次数。</p>'+(id==='mine'?'<p class="note">亲自勘察矿脉：'+(regionHas(s,'surveyed')?'已完成，磁铁砂每批另加 1。':'可在区域地图中完成，磁铁砂每批另加 1。')+(regionBuilt(s,'lodge')&&regionHas(s,'rescued')?'老杜已安置，碎铁每批另加 1。':'')+(regionHas(s,'liyun_invited')?'李云已教会人手检修矿架，碎铁每批另加 1。':'')+'</p>':id==='marsh'?'<p class="note">药圃整修：'+(marshHas(s,'tended')?'已完成，泽兰每批另加 1。':'可在芦苇泽区域地图完成，泽兰每批另加 1。')+(marshHas(s,'invited')&&regionBuilt(s,'clinic')?'安道全已整理药方，药草每批另加 1。':'')+'</p>':id==='mountain'?'<p class="note">矿脉标记：'+(mountainHas(s,'surveyed')?'已完成，赤铜砂每批另加 1。':'可在粮道地图完成，赤铜砂每批另加 1。')+(mountainHas(s,'invited')&&regionBuilt(s,'forge')?'项充已教人拣铁料，碎铁每批另加 1。':'')+'</p>':id==='water'?'<p class="note">留芽割苇：'+(waterHas(s,'tended')?'已完成，苇丝每批另加 1。':'可在渡口地图完成，苇丝每批另加 1。')+(waterHas(s,'invited')&&regionBuilt(s,'clinic')?'阮小七已教会包布编法，粗布每批另加 1。':'')+'</p>':id==='forest'?'<p class="note">藤坡标记：'+(forestHas(s,'tended')?'已完成，山藤每批另加 1。':'可在古道地图完成，山藤每批另加 1。')+(forestHas(s,'invited')&&regionBuilt(s,'lodge')?'时迁已在客舍整理皮料，皮革每批另加 1。':'')+'</p>':id==='ruins'?'<p class="note">残碑拓写：'+(ruinsHas(s,'rubbed')?'已完成，拓片每批另加 1。':'可在荒祠地图完成，拓片每批另加 1。')+(ruinsHas(s,'invited')&&regionBuilt(s,'lodge')?'乐和已在客舍整理收料，粗布每批另加 1。':'')+'</p>':'')+'</details>';
}
export function regionalRecipePanel(s,d,btn,selected){
 const id=Object.hasOwn(REGIONAL_RECIPES,selected)?selected:'mine',q=regionalQuote(s,d,id),r=q.recipe;
 const options=Object.entries(IDLE_ROUTES).map(([key,v])=>'<option value="'+key+'" '+(key===id?'selected':'')+'>'+v.name+' · '+(key===id?q.model.name:(REGIONAL_RECIPES[key].kind==='equipment'?d.by.equipments:d.by.items)[REGIONAL_RECIPES[key].output].name)+'</option>').join('');
 return '<section class="regional-recipe" data-regional-recipe="'+id+'"><label>地区配方<select data-regional-recipe-select>'+options+'</select></label><article class="idle-card"><h3>'+q.model.name+' ×'+r.count+'</h3><p class="note">'+r.use+'</p>'+(id==='mountain'&&mountainHas(s,'invited')&&regionBuilt(s,'forge')?'<p class="note">项充的带扣样式：赤铜砂从 6 减为 5；矿砂炉另省碎银 20%。每日仍可打造 2 件。</p>':id==='marsh'&&marshHas(s,'invited')&&regionBuilt(s,'clinic')?'<p class="note">安道全的药方：泽兰消耗从 4 减为 3；配药间另省药草 1。次数与成品数量不变。</p>':id==='water'&&waterHas(s,'invited')&&regionBuilt(s,'clinic')?'<p class="note">阮小七的编法：苇丝消耗从 6 减为 5；配药间另省药草 1。与普通药包加工共用每日 2 次。</p>':id==='forest'&&forestHas(s,'invited')&&regionBuilt(s,'lodge')?'<p class="note">时迁教人裁藤：山藤消耗从 6 减为 5。每日仍可打造 2 件。</p>':id==='ruins'&&ruinsHas(s,'invited')&&regionBuilt(s,'lodge')?'<p class="note">乐和帮忙整理：拓片消耗从 6 减为 5。每次仍得武学残页 2，与普通加工共用每日次数。</p>':'')+'<p class="note">'+({market:'集市',clinic:'医馆'}[r.building])+' 2 级 · 今日 '+q.used+'/'+q.limit+' 次'+(r.kind==='item'?'，与普通加工共用次数。':'。')+'</p><p>碎银 '+s.player.silver+'/'+r.silver+'</p><p>'+Object.entries(r.items).map(([key,n])=>d.by.items[key].name+' '+(s.inventory[key]||0)+'/'+n).join(' · ')+'</p><p role="status">'+(q.reason||'材料已齐，可以'+(r.kind==='equipment'?'打造。':'加工。'))+'</p><div class="actions">'+btn(r.kind==='equipment'?'打造一件':'加工一份',{type:'regionalCraft',id},'primary',!!q.reason)+btn('追踪所需材料',{type:'goalSet',kind:'regional',id},'secondary')+btn('前往'+IDLE_ROUTES[id].name+'采集',{type:'ui_idleOpen',region:id},'secondary')+'</div></article></section>';
}
export function gatheringSuggestions(s,d,region){
 const recipes=Object.keys(REGIONAL_RECIPES).map(id=>({id,...regionalQuote(s,d,id)})).sort((a,b)=>Number(!b.reason)-Number(!a.reason)||Number(b.id===region)-Number(a.id===region));
 const heroes=[];
 if(!s.battle&&!s.scheme&&!s.event&&!s.realm?.trek&&!s.expansion?.run){
  const owned=d.heroes.filter(h=>s.heroes[h.id].status==='owned'&&!away(s,h.id)).sort((a,b)=>Number(s.team.includes(b.id))-Number(s.team.includes(a.id))||s.heroes[b.id].level-s.heroes[a.id].level);
  for(const h of owned){const corps=corpsQuote(s,h.id),quality=promotionQuote(s,h.id);if(!corps.reason)heroes.push({hero:h.id,label:h.name+' · 专属部队可升至 '+(corps.rank+1)+' 阶',section:'corps'});else if(!quality.reason)heroes.push({hero:h.id,label:h.name+' · 可突破'+quality.next.name+'品',section:'quality'});if(heroes.length===2)break;}
 }
 return {recipes,heroes};
}
export function gatheringUsesPanel(s,d,esc,btn,region){
 const {recipes,heroes}=gatheringSuggestions(s,d,region),ready=recipes.filter(q=>!q.reason),rows=ready.length?ready.slice(0,2):recipes.slice(0,1);
 return '<section class="gathering-uses"><h3>'+(ready.length?'现在能做':'下一份成品')+'</h3>'+rows.map(q=>'<article class="idle-card"><h3>'+esc(q.model.name)+' ×'+q.recipe.count+'</h3><p class="note">'+(q.reason?esc(q.reason):'材料已齐 · '+IDLE_ROUTES[q.id].name+'配方')+'</p>'+btn(q.reason?'查看配方与缺料':'查看'+(q.recipe.kind==='equipment'?'打造':'加工'),{type:'ui_regionalRecipe',id:q.id},'primary')+'</article>').join('')+(heroes.length?'<article class="idle-card"><h3>可以培养的好汉</h3>'+heroes.map(h=>'<div class="gathering-ready"><span>'+esc(h.label)+'</span>'+btn('查看',{type:'ui_section',view:'heroes',id:h.section,hero:h.hero},'secondary')+'</div>').join('')+'</article>':'<p class="note">尚无材料齐备的练兵或升品项目。</p>')+'<p class="note">各项目按现有库存单独计算。打造或培养前可查看消耗。</p>'+btn('查看全部地区配方',{type:'ui_regionalRecipe',id:region||rows[0].id},'secondary')+'</section>';
}
