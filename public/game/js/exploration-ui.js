import {crossRegionLink,crossRegionScene} from './cross-region-ui.js?v=0.82.0';
import {minePeople,mineCompanionNode} from './mine-companion-ui.js?v=0.82.0';
import {mineCompanionGoal} from './mine-companion-data.js?v=0.82.0';
import {revisitWorkPanel} from './region-revisit-ui.js?v=0.82.0';
import {revisitSpec,revisitHas} from './region-revisit-data.js?v=0.82.0';
import {dialogTabs,dialogPanel} from './dialog-pages.js?v=0.82.0';
import {explorationMaterialSource} from './exploration-goals.js?v=0.82.0';
import {mountainPanel} from './mountain-ui.js?v=0.82.0';
import {mountainHas} from './mountain-data.js?v=0.82.0';
import {waterPanel} from './water-ui.js?v=0.82.0';
import {waterHas} from './water-data.js?v=0.82.0';
import {forestPanel} from './forest-ui.js?v=0.82.0';
import {forestHas} from './forest-data.js?v=0.82.0';
import {ruinsPanel} from './ruins-ui.js?v=0.82.0';
import {ruinsHas} from './ruins-data.js?v=0.82.0';
import {marshPanel,marshDecoctPanel} from './marsh-ui.js?v=0.82.0';
import {marshHas} from './marsh-data.js?v=0.82.0';
import {EXPLORATION_REGIONS,activeRegion} from './exploration-data.js?v=0.82.0';
import {REGION_NODES,REGION_BUILDINGS,REGION_CONTACTS,regionHas,regionGate,regionBuilt,mineGoal,MINE_SMELT} from './exploration-data.js?v=0.82.0';
import {regionPath,regionFightQuote,regionBuildQuote,regionTask,mineSmeltQuote} from './exploration.js?v=0.82.0';
export function regionPanel(s,d,esc,btn,selected){
 const active=activeRegion(s),tabs='<nav class="region-tabs" aria-label="探索地区">'+Object.entries(EXPLORATION_REGIONS).map(([region,name])=>btn(({mine:'旧矿洞',marsh:'芦苇泽',ruins:'荒祠',forest:'古道',water:'渡口',mountain:'粮道'})[region]||name,{type:'regionOpen',region},'secondary',!s.camp).replace('<button ','<button title="'+esc(name)+'" aria-label="'+esc(name)+'" aria-pressed="'+(region===active)+'" ')).join('')+'</nav>';
 const cross=crossRegionScene(s,d,esc,btn,selected);if(cross)return tabs+cross;
 return tabs+(!selected&&['marsh','forest','water'].includes(active)?crossRegionLink(s,btn):'')+(active==='mountain'?mountainPanel(s,d,esc,btn,selected):active==='water'?waterPanel(s,d,esc,btn,selected):active==='forest'?forestPanel(s,d,esc,btn,selected):active==='ruins'?ruinsPanel(s,d,esc,btn,selected):active==='marsh'?marshPanel(s,d,esc,btn,selected):minePanel(s,d,esc,btn,selected));
}
function minePanel(s,d,esc,btn,selected){
 const x=s.exploration,id=Object.hasOwn(REGION_NODES,selected)?selected:x?.position||'entrance',m=REGION_NODES[id],here=x?.position||'entrance',has=k=>regionHas(s,k),gate=regionGate(s,id),goal=mineGoal(s);
 if(!x)return '<section class="region-panel"><h2>旧矿洞</h2><p>矿车、炉房和塌方石室相连。进去找找人，也能带些矿料回来。</p><p class="note">位置和发现会保留。普通挑战不耗体力、粮草，不带兵。</p>'+btn('进入旧矿洞',{type:'regionOpen'},'primary',!s.camp)+'</section>';
 const map='<nav class="region-map" aria-label="旧矿洞地点">'+Object.entries(REGION_NODES).map(([key,n])=>btn(n.name+' · '+(here===key?'所在':regionGate(s,key)?'待探明':x.visited.includes(key)?'去过':'可前往'),{type:'ui_regionInspect',id:key},'secondary').replace('<button ','<button aria-pressed="'+(id===key)+'" ')).join('')+'</nav>';
 if(!selected)return '<section class="region-panel region-overview"><header class="region-heading"><h2>旧矿洞</h2><span>所在：'+REGION_NODES[here].name+'</span></header>'+map+minePeople(s,btn)+'<p class="note region-roads">矿口 → 运矿道 → 旧炉房 → 矿头藏室<br>矿口 → 塌方石室 → 深层矿脉 → 藏室</p><p class="region-goal">'+esc(goal.text)+'</p><div class="actions">'+btn(goal.label||'查看下一步',goal.command||{type:'ui_regionInspect',id:goal.node},'primary')+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'mine'},'secondary')+'</div></section>';
 const companion=mineCompanionNode(s,id,esc,btn);
 const scene=companion?.scene||(id==='rail'&&has('return_met')?(has('cart_checked')?'铁扣和车辙都指向藏室，矿车还得从这条轨道推出来。':'轨道旁有一道新拖痕，枕木间掉着半枚铁扣。'):id==='furnace'&&has('return_paid')?'汤隆拿矿样试过火候，把好砂挑在一边。老杜正教来运矿的人认夹石。':id==='furnace'&&has('invited')?'汤隆又回了炉房，手边搁着半截车轴。他说老杜托人带了话。':id==='vault'&&has('cart_checked')?(has('won_orecart')?'夺回的矿车已推上轨道。深处仍有劫矿匪，可以再次截矿取料。':'矿车停在石厅里，后头有人把料包递给头目。'):id==='chamber'&&has('rescued')?'木门已经扶正。老杜回了寨子，留下的矿脉位置已标在图上。':id==='vault'&&has('won_vault')?'矿头已退，工具箱就在门后。矿口的货郎也回来支摊了。':m.text);
 let body='<p>'+esc(scene)+'</p>';
 const task=(label,key)=>{const reason=regionTask(s,key);return '<div class="region-action">'+btn(label,{type:'regionDo',id:key},'primary',!!reason)+(reason?'<small>'+esc(reason)+'</small>':'')+'</div>';};
 const fight=(approach='direct')=>{const q=regionFightQuote(s,id,approach);return '<div class="actions">'+btn(approach==='orecart'?'截矿夺车':'挑战'+(id==='vault'?'矿头':'守卫'),{type:'regionBattle',id,...(approach==='orecart'?{approach}:{})},'primary',!!q.reason)+btn('全部掉落',{type:'ui_specialView',id:m.battle,tier:1,tab:'drops',...(approach==='orecart'?{route:approach}:{})},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'');};
 if(here!==id){const path=regionPath(s,id);body+='<p class="note">'+esc(gate||'路线：'+path.map(k=>REGION_NODES[k].name).join(' → '))+'</p>'+btn('前往'+m.name,{type:'regionMove',id},'primary',!!gate);}
 else if(companion)body+=companion.body;
 else{
  if(id==='rail'&&has('return_met')&&!has('cart_checked'))body+=task('查看矿车车辙','checkcart');
  if(id==='chamber'&&!has('rescued'))body+=has('won_chamber')?task('救出矿工','rescue'):fight();
  if(id==='vein')body+=has('surveyed')?'<p class="note">已勘察：派遣每批磁铁砂 +1。</p>'+btn('去炉房找汤隆',{type:'regionMove',id:'furnace'},'primary'):task('勘察并标记矿脉','survey');
  if(id==='furnace'){
   if(!has('met'))body+=task('与汤隆交谈','meet');
   else if(!has('commission')){if(!has('repair_supplies'))body+=task('取老杜备下的修炉料','repair');body+=task('修炉 · 磁铁砂 3、精铁 2','commission');if(has('repair_supplies')&&regionTask(s,'commission'))body+=btn('派遣补齐材料',{type:'ui_idleOpen',region:'mine'},'secondary');}
   else if(!has('invited'))body+=has('won_vault')?task(s.heroes.tanglong.status==='owned'?'与汤隆办妥此事':'邀请汤隆入寨','invite')+btn('追踪汤隆',{type:'goalSet',kind:'invite',id:'tanglong'},'secondary'):btn('去藏室取工具',{type:'regionMove',id:'vault'},'primary');
   else if(!has('return_met'))body+=task('听老杜的口信','return');
   else if(!has('cart_checked'))body+=btn('去运矿道查看',{type:'regionMove',id:'rail'},'primary');
   else if(!has('won_orecart'))body+=btn('去藏室夺回矿车',{type:'regionMove',id:'vault'},'primary');
   else if(!has('return_paid'))body+=task('交矿样 · 收下谢礼','thanks');
   else body+=btn('回寨选矿淬料',{type:'ui_section',view:'camp',id:'exploration',region:'mine',building:'forge'},'primary');
  }
  if(id==='vault'){
   if(has('cart_checked')){body+='<p class="note">胜利必得磁铁砂 1；其他材料与守炉重锤独立随机掉落。先击倒最末位运料匪可断供，或用打断截住补给。</p>'+fight('orecart');if(has('won_orecart')&&!has('return_paid'))body+=btn('回炉房交矿样',{type:'regionMove',id:'furnace'},'primary');body+='<details><summary>普通矿头挑战</summary>'+fight()+'</details>';}
   else if(!has('won_vault'))body+=fight();
   else body+=btn('回炉房找汤隆',{type:'regionMove',id:'furnace'},'primary')+'<details><summary>再次挑战矿头</summary>'+fight()+'</details>';
   if(!has('cache'))body+=task('查看工具箱 · 强化符 1','cache');
  }
  if(id==='rail')body+=has('return_met')?'<details><summary>再次清理运矿道</summary>'+fight()+'</details>':fight();
  if(id==='chamber'&&has('rescued'))body+='<details><summary>挑战封炉守卫 · 另得精铁</summary>'+fight()+'</details>';
  if(id==='entrance')body+=has('won_vault')?'<p class="note">货郎每日换精铁一批。今日'+(s.daily.counters.region_trade?'已换。':'可换。')+'</p>'+btn('换精铁 3 · 碎银 60',{type:'regionTrade'},'primary',s.player.silver<60||s.daily.counters.region_trade>0)+btn('买补给',{type:'ui_section',view:'bag',id:'shop'},'secondary'):'<p class="note">清走矿头，货郎才敢回来。</p>';
 }
 return '<section class="region-panel mine-detail-panel"><header class="region-heading"><h2>'+m.name+'</h2>'+btn('返回矿图',{type:'ui_regionOpen'},'secondary')+'</header><article class="region-detail" aria-label="'+m.name+'">'+body+'</article><div class="region-detail-tools"><details><summary>道路与用途</summary><p class="note">所在：'+REGION_NODES[here].name+'</p><p class="note">'+esc(m.purpose)+'</p><p class="note">矿口 ↔ 运矿道 ↔ 旧炉房 ↔ 矿头藏室<br>矿口 ↔ 塌方石室 ↔ 深层矿脉 ↔ 藏室</p></details>'+btn('回寨',{type:'ui_section',view:'camp',id:'exploration',region:'mine'},'secondary')+btn('采集派遣',{type:'ui_idleOpen',region:'mine'},'secondary')+'</div></section>';
}
export function mineSmeltPanel(s,d,esc,btn){const q=mineSmeltQuote(s);return '<details class="mine-smelt" '+(regionHas(s,'return_paid')?'open':'')+'><summary>汤隆 · 选矿淬料</summary><p class="note">淬炼钢可打守路长枪、护额铁盔等兵甲。每日淬一块，与军需淬钢共用每日八次上限。</p><p class="note">'+Object.entries(MINE_SMELT.items).map(([id,n])=>d.by.items[id].name+' '+(s.inventory[id]||0)+'/'+n).join(' · ')+' · 碎银 '+s.player.silver+'/25</p><div class="actions">'+btn('淬炼钢 ×1',{type:'regionSmelt'},'primary',!!q.reason)+btn('打造护额铁盔',{type:'ui_forgeTarget',id:'guard_helmet'},'secondary')+'</div>'+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'')+'</details>';}
const REGION_SHORT_NAMES={mine:'旧矿洞',marsh:'芦苇泽',ruins:'荒祠',forest:'古道',water:'渡口',mountain:'粮道'};
function regionCampContext(s,selected,visitor){
 visitor=Object.hasOwn(EXPLORATION_REGIONS,visitor)?visitor:'mine';
 const has=k=>regionHas(s,k),clinic=regionBuilt(s,'clinic'),lodge=regionBuilt(s,'lodge'),forge=regionBuilt(s,'forge');
 selected=Object.hasOwn(REGION_BUILDINGS,selected)?selected:({mine:'forge',marsh:'clinic',ruins:'lodge',forest:'lodge',water:'clinic',mountain:'forge'}[visitor]);
 const statuses={
  mountain:!mountainHas(s,'met')?'项充在粮道歇棚照看车夫。':!mountainHas(s,'invited')?'粮车还没送回，项充在山下等你。':forge?'项充教人铸带扣：稳步束带少用赤铜砂 1，粮道每批碎铁 +1。':'项充已经回寨。矿砂炉建成后，他会教人铸带扣、拣铁料。',
  water:!waterHas(s,'met')?'阮小七在渡口鱼棚补网，几个船户还扣在对岸。':!waterHas(s,'invited')?'阮小七等你救出船户，再一起回寨。':clinic?'阮小七教人拧苇绳、编药包：野营药包少用苇丝 1，渡口每批粗布 +1。':'阮小七带着渔网回寨了。配药间建成后，他会教人编结实的药包、收拾包布。',
  forest:!forestHas(s,'met')?'时迁在古道茶棚查看商队的车辙。':!forestHas(s,'invited')?'时迁还在古道。追回货物后，到茶棚邀他回寨。':lodge?'时迁教人裁藤缝衣：斥候短褐少用山藤 1，古道每批皮革 +1。':'时迁带着包袱回寨了。客舍建成后，他会教人裁藤缝衣、收拾皮料。',
  mine:has('liyun_met')?mineCompanionGoal(s).text:has('return_paid')?'李云到了矿口，见矿梁开裂，想请你帮忙换掉旧梁。汤隆仍可在矿砂炉淬料。':has('invited')?'汤隆带回老杜的口信：矿车在路上不见了。回旧炉房问问。':!has('rescued')?'老杜还困在旧矿洞石室里。':lodge?'老杜住进了客舍，开始教采集人手辨认矿石。旧矿洞每批碎铁 +1。':'老杜在院里养伤：“腿不碍事了，修好客舍，我就留下教人认矿。”',
  marsh:marshHas(s,'return_paid')?'药圃的进水沟已疏通。安道全每日在配药间煎一份药引，清渠除蛇可重复取泽兰。':marshHas(s,'invited')?'冯伯捎来发黄的泽兰。回草庐听口信，查查进水沟。':!marshHas(s,'met')?'安道全在芦苇泽的采药草庐，药农正等着救治。':!marshHas(s,'invited')?'安道全还在草庐照看药农，等你取回沉船药箱。':clinic?'安道全在配药间整理方子：金疮膏少用泽兰 1，芦苇泽每批药草 +1。':'安道全已带药箱回寨。配药间建成后，他能改进泽兰用量、指点采药。',
  ruins:!ruinsHas(s,'met')?'荒祠的残钟楼下有人吹笛，去见见他。':!ruinsHas(s,'invited')?'乐和还在残钟楼，等你找回内室里的谱册。':lodge?'乐和在客舍抄写碑文。武学残页配方少用拓片 1，荒祠每批粗布 +1。':'乐和带着谱册回寨了。客舍建成后，他能帮忙整理碑文、照看收料。'
 };
 const people={mine:'汤隆、李云与老杜',marsh:'安道全与冯伯',ruins:'乐和',forest:'时迁',water:'阮小七',mountain:'项充'};
 const id=selected,b=REGION_BUILDINGS[id],built=regionBuilt(s,id),mine=visitor==='mine'&&id==='forge';
 const extra=id==='forge'&&visitor==='mountain'?'办妥项充委托后：稳步束带少用赤铜砂 1，粮道每批碎铁 +1。':id==='clinic'?(visitor==='water'?'办妥阮小七委托后：药包少用苇丝 1，渡口每批粗布 +1。':'办妥安道全的芦苇泽委托后：金疮膏少用泽兰 1，芦苇泽每批药草 +1。'):id==='lodge'?(visitor==='forest'?'办妥时迁委托后：古道每批皮革 +1，斥候短褐少用山藤 1。':'救出老杜后，旧矿洞每批碎铁 +1；办妥乐和委托后，荒祠每批粗布 +1、残页配方少用拓片 1。'):'';
 return {visitor,id,b,built,mine,extra,people,status:revisitSpec(visitor)&&revisitHas(s,visitor,'invited')?(revisitHas(s,visitor,'return_paid')?revisitSpec(visitor).use:revisitSpec(visitor).intro):statuses[visitor]};
}
function regionCampMaterials(s,d,b){return [
 {id:'campWood',name:'营建木材',stock:s.camp?.wood||0,needed:b.wood},
 {id:'silver',name:'碎银',stock:s.player.silver,needed:b.silver},
 ...Object.entries(b.items).map(([id,needed])=>({id,name:d.by.items[id].name,stock:s.inventory[id]||0,needed}))
];}
export function explorationCamp(s,d,esc,btn,selected,visitor=activeRegion(s)){
 const c=regionCampContext(s,selected,visitor),{id,b,built,mine,people}=c;visitor=c.visitor;
 const q=regionBuildQuote(s,id);
 const controls='<div class="region-camp-controls"><label>江湖故人<select data-region-visitor>'+Object.entries(EXPLORATION_REGIONS).map(([key,name])=>'<option value="'+key+'" '+(visitor===key?'selected':'')+'>'+name+' · '+people[key]+'</option>').join('')+'</select></label><label>地区扩建<select data-region-building>'+Object.entries(REGION_BUILDINGS).map(([key,r])=>'<option value="'+key+'" '+(id===key?'selected':'')+'>'+r.name+'</option>').join('')+'</select></label></div>';
 const cost='<dl class="region-camp-cost" aria-label="营建材料：持有 / 所需">'+regionCampMaterials(s,d,b).map(r=>'<div><dt>'+esc(r.name)+'</dt><dd '+(r.stock<r.needed?'class="material-short"':'')+' aria-label="'+esc(r.name+'，持有 '+r.stock+'，需要 '+r.needed)+'">'+r.stock+' / '+r.needed+'</dd></div>').join('')+'</dl>';
 const work=revisitSpec(visitor)?.building===id&&built?revisitWorkPanel(s,d,esc,btn,visitor):visitor==='marsh'&&id==='clinic'&&built?marshDecoctPanel(s,d,esc,btn):mine&&built?mineSmeltPanel(s,d,esc,btn):'<p class="note">'+esc(b.text)+'</p>'+(built?'':cost+(q.reason?'<p class="note">'+esc(q.reason)+'</p>':'')+'<div class="actions">'+btn('扩建',{type:'regionBuild',id},'primary',!!q.reason)+btn('追踪材料',{type:'goalSet',kind:'regionBuild',id},'secondary')+((s.camp?.buildings.hall||0)<2?btn('升级聚义厅',{type:'ui_section',view:'camp',id:'buildings'},'secondary'):'')+'</div>');
 const info=btn('故人与材料',{type:'ui_regionCampInfo',region:visitor,building:id},'secondary').replace('<button ','<button data-region-camp-open aria-haspopup="dialog" aria-controls="region-camp-info" ');
 return '<section class="region-camp'+(mine?' mine-forge-page':'')+'">'+controls+'<article class="idle-card" data-region-building-card="'+id+'"><h3>'+esc(b.name)+(built?' · 已建成':'')+'</h3>'+work+'</article><div class="region-camp-footer">'+info+btn('材料用途',{type:'ui_idleTab',id:'use',region:visitor},'secondary')+btn('去'+REGION_SHORT_NAMES[visitor],{type:'ui_regionOpen',region:visitor},'secondary')+'</div></section>';
}
export function regionCampInfoDialog(s,d,esc,btn,selected,visitor=activeRegion(s)){
 const {visitor:region,id,b,built,mine,extra,people,status}=regionCampContext(s,selected,visitor),tab=built?'people':'materials';
 const person='<h3>'+esc(people[region])+'</h3><p>'+esc(status)+'</p><h3>'+esc(b.name)+(built?' · 已建成':'')+'</h3><p>'+esc(b.text)+'</p>'+(extra?'<p>'+esc(extra)+'</p>':'')+(mine&&!built?'<p class="note">完成矿车委托后，矿砂炉还能每日选矿淬料。</p>':'');
 const materials='<p class="note">'+esc(b.name)+(built?'已建成，下列材料也可继续采集。':' · 持有 / 扩建所需')+'</p><ul class="region-material-sources">'+regionCampMaterials(s,d,b).map(r=>{const source=explorationMaterialSource(s,r.id);return '<li><div><strong>'+esc(r.name)+'</strong><span class="'+(!built&&r.stock<r.needed?'material-short':'')+'">'+r.stock+(built?'':' / '+r.needed)+'</span></div><div><small>'+(!built?(r.stock<r.needed?'还差 '+(r.needed-r.stock):'已备齐'):'')+'</small>'+btn(source.label,source.command,'secondary')+'</div></li>';}).join('')+'</ul>';
 return '<dialog id="region-camp-info" class="compact-dialog region-camp-info" data-dialog-layout="grid" aria-labelledby="region-camp-info-title"><header class="dialog-header"><h2 id="region-camp-info-title" tabindex="-1">'+esc(EXPLORATION_REGIONS[region])+'</h2><button type="button" class="secondary" data-region-camp-close aria-label="关闭故人与材料">×</button></header>'+dialogTabs('region-camp-info',{people:'故人近况',materials:'材料来源'},tab)+'<div class="dialog-body">'+dialogPanel('region-camp-info','people',person,tab)+dialogPanel('region-camp-info','materials',materials,tab)+'</div><footer class="dialog-footer"><div class="actions">'+btn('去'+REGION_SHORT_NAMES[region],{type:'ui_regionOpen',region},'primary')+'<button type="button" class="secondary" data-region-camp-close>返回营建</button></div></footer></dialog>';
}
export function contactLine(s,d,region,btn){const x=s.exploration,hero=REGION_CONTACTS[region];return '<details class="contact-panel"><summary>顺路寻访 · '+d.by.heroes[hero].name+'</summary><p class="note">开启后，每累计采集四小时带回 1 枚信物，最多暂存 2 枚；与材料一起领取。不自动招募，不改变抽取概率。'+(x?.visiting?'当前已走访 '+(x.contacts[region].cycles*30)+'/240 分钟。':'')+'</p>'+btn(x?.visiting?'停止顺路寻访':'开启顺路寻访',{type:'regionVisits',enabled:!x?.visiting},'secondary')+'</details>';}
