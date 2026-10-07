import {CHRONICLES,CHRONICLE_RANK_CAP,patrolRule,patrolStrength} from './chronicle-data.js?v=0.68.0';
import {chronicleForgeQuote,chroniclePerks,chronicleObjective} from './chronicle.js?v=0.68.0';
import {journeyQuote} from './journey.js?v=0.68.0';
import {JOURNEYS,JOURNEY_TIERS} from './journey-data.js?v=0.68.0';
import {routeBalance} from './journey-rewards.js?v=0.68.0';
import {routeDropTable,planSummary} from './journey-campaign-ui.js?v=0.68.0';
function patrolStrengthNote(rank){const q=patrolStrength(rank);return '<p class="note">本阶敌军倍率：气血 ×'+q.hp.toFixed(2)+'、攻击 ×'+q.attack.toFixed(2)+'、防御 ×'+q.defense.toFixed(2)+'（已计入本阶规则，在绝险及所选契约基础上计算）。</p>';}
function departure(s,q,btn){return '<p class="note">启程消耗：体力 '+q.stamina+'、粮草 '+q.food+'；备战另计，途中战斗仍需粮草。</p>'+planSummary(s,btn);}
const go={type:'ui_section',view:'realm',id:'chronicles'};
const names={wood:'木材',food:'粮草',silver:'碎银',iron:'精铁'};
const resources=(s,d,cost)=>Object.entries(cost).map(([id,n])=>(names[id]||d.by.items[id]?.name||id)+' '+n+' / 现有 '+(id==='silver'?s.player.silver:['wood','food'].includes(id)?s.camp?.[id]||0:s.inventory[id]||0)).join(' · ');
const enough=(s,cost)=>Object.entries(cost).every(([id,n])=>(id==='silver'?s.player.silver:['wood','food'].includes(id)?s.camp?.[id]||0:s.inventory[id]||0)>=n);
const rewards=(d,r)=>Object.entries(r).map(([id,n])=>d.by.items[id].name+' '+n).join('、');
export function chronicleBanner(s,btn){const g=chronicleObjective(s);return '<div class="chronicle-banner"><div><strong>'+ (g?.title||'商路行记')+'</strong><span>'+(g?.text||'青石古道、芦荡渡口、断崖粮道，还有人等你再来。')+'</span></div>'+btn(g?.label||'翻开行记',go,'secondary')+'</div>';}
export function chronicleRunNote(s,j){const p=j.chronicle;if(!p)return '';return '<aside class="chronicle-run"><strong>'+(p.kind==='story'?CHRONICLES[p.region].chapters[p.chapter].title:'商路巡守 · 第 '+p.rank+' 阶')+'</strong><p>'+(p.kind==='patrol'?patrolRule(p.rank).text+'</p>'+patrolStrengthNote(p.rank)+'<p>':p.choice==='shelter'?'本章要事：在行旅节点选择护送，再走通整条路线。':'本章要事：击败至少一处强敌辎重，再走通整条路线。')+'</p>'+(p.kind==='story'?'<span class="note">'+((p.choice==='shelter'?j.decisions.includes('event:rescue'):j.path.includes('elite'))?'要事已办妥，走完归路即可回寨动工。':'要事尚未完成；途中收队不算完成本章。')+'</span>':'<span class="note">走通后路契合计 +'+(4+Math.ceil(p.rank/2))+'；另按原概率判定随机掉落。</span>')+'</aside>';}
export function chroniclePanel(s,d,esc,btn,selected){
 const r=s.realm?.journey?.chronicle,a=r?.active,id=Object.hasOwn(CHRONICLES,selected)?selected:a?.region||'forest',m=CHRONICLES[id],route=r?.routes[id]||{choices:[],patrol:0,forged:0},chapter=route.choices.length,job=a?.region===id?a:null,perks=chroniclePerks(s,id);
 let body='';
 if(a&&!job)body+='<p class="notice">已接下'+JOURNEYS[a.region].name+'的事务。可先办完，或回该路搁下委托。</p>'+btn('查看已接事务',{type:'ui_chronicleRegion',id:a.region},'secondary');
 if(chapter<3){
  const ch=m.chapters[chapter],hall=chapter+2;
  body+='<article class="chronicle-story"><p class="kicker">第 '+(chapter+1)+' 章 / 3</p><h2>'+ch.title+'</h2><p class="prose">'+ch.intro+'</p>';
  if(job?.ready){body+='<p class="notice">委托已办妥，材料齐全就能动工。</p><p class="note">'+resources(s,d,ch.cost)+'</p>'+btn('动工 · 完成本章',{type:'chronicleBuild'},'primary',!enough(s,ch.cost))+(!enough(s,ch.cost)?btn('回寨筹集材料',{type:'ui_section',view:'camp',id:'production'},'secondary'):'');}
  else if(job){
   const q=journeyQuote(s,id,chapter+1);body+='<p><b>'+ch.choices[job.choice].label+'</b>：'+ch.choices[job.choice].text+'</p><p class="note">'+JOURNEY_TIERS[chapter+1].name+'或更高难度。'+(q.reason||'按已保存的备战方案启程；本趟定向带回营建补给。')+'</p>'+departure(s,q,btn)+btn('启程 · '+JOURNEY_TIERS[chapter+1].name+' · 体力 '+q.stamina,{type:'journeyStart',region:id,tier:chapter+1,goal:'camp'},'primary',!!q.reason)+btn('调整队伍',{type:'ui_section',view:'heroes',id:'formation'},'secondary')+btn('选择更高难度',{type:'ui_section',view:'realm',id:'journey'},'secondary');
  }else{
   body+='<p class="note">聚义厅 '+hall+' 级 · '+JOURNEY_TIERS[chapter+1].name+'。'+((s.camp?.buildings.hall||0)<hall?'先扩建聚义厅再接委托。':'接委托不扣物资；回寨动工时才付材料。')+'</p><div class="chronicle-choices">'+Object.entries(ch.choices).map(([key,v])=>'<div>'+btn(v.label,{type:'chronicleAccept',region:id,choice:key},'secondary',!!a||(s.camp?.buildings.hall||0)<hall)+'<p class="note">'+v.text+'</p><p class="note">建成后：本路'+(key==='shelter'?'每场胜利恢复 3% 气血。':'每场开战怒气 +5。')+'</p></div>').join('')+'</div>';
  }
  body+='<details data-fold="chronicle-cost-'+id+'"><summary>营建材料与本章酬劳</summary><p>'+resources(s,d,ch.cost)+'</p><p>完成本章：'+rewards(d,ch.reward)+'，各章仅领一次。</p></details></article>';
 }else{
  const rank=job?.rank||Math.min(CHRONICLE_RANK_CAP,route.patrol+1),rule=patrolRule(rank),q=journeyQuote(s,id,3);
  body+='<article class="chronicle-story"><h2>商路巡守 · 第 '+rank+' 阶</h2><p>'+rule.name+'：'+rule.text+'</p>'+patrolStrengthNote(rank)+'<p class="note">从绝险路线启程，每阶保留五段行程与路口选择。已通过 '+route.patrol+'/'+CHRONICLE_RANK_CAP+' 阶；可重打已通阶次。</p>'+(job?'<p class="note">'+(q.reason||'备战方案仍可在出行筹备调整。')+'</p>'+departure(s,q,btn)+btn('启程 · 体力 '+q.stamina,{type:'journeyStart',region:id,tier:3,goal:'arms'},'primary',!!q.reason)+btn('调整阵容',{type:'ui_section',view:'heroes',id:'formation'},'secondary'):btn('筹备第 '+rank+' 阶',{type:'chroniclePatrol',region:id,rank},'primary',!!a))+'<p class="note">走通必得路契 '+(4+Math.ceil(rank/2))+'，以及绝险暂存所得、定向物资；本阶首通另得材料自选匣 1'+([4,8].includes(rank)?'、招贤令 1':'')+(rank===8?'、登仙印 1':'')+'。提前收队没有路契与首奖。</p><details data-fold="chronicle-patrol-'+id+'"><summary>选择已通阶次 / 查看随机掉落</summary><div class="chronicle-ranks">'+Array.from({length:CHRONICLE_RANK_CAP},(_,i)=>btn('第 '+(i+1)+' 阶',{type:'chroniclePatrol',region:id,rank:i+1},'secondary',!!a||i>route.patrol)).join('')+'</div>'+routeDropTable(id,d)+'</details></article>';
  const forge=chronicleForgeQuote(s,id),step=forge.step,e=d.by.equipments[m.equipment];
  body+='<article class="chronicle-forge"><h2>'+e.name+'图谱 · '+route.forged+'/3</h2><p class="note">本路同型装备的属性额外提高 '+(route.forged*15)+'%；每次淬炼再加 15%，最多 45%。强化与开战特效不变。</p>'+(step?'<p class="note">需巡守 '+step.rank+' 阶 · '+step.marks+' 路契（现有 '+routeBalance(s,id)+'） · 精铁 '+step.iron+' · 碎银 '+step.silver+'</p>'+btn('淬炼图谱',{type:'chronicleForge',region:id},'primary',!!forge.reason)+(forge.reason?'<p class="note">'+forge.reason+'</p>':''):'<p class="note">三次淬炼已完成。</p>')+btn('兑换本路装备',{type:'ui_section',view:'realm',id:'rewards'},'secondary')+'</article>';
 }
 if(job)body+='<details data-fold="chronicle-cancel"><summary>暂时搁下此事</summary><p class="note">'+(job.ready?'本章已办妥；搁下后重接需要重新出征。':'已完成的工程和巡守成绩保留。')+'</p>'+btn('搁下委托',{type:'chronicleCancel'},'secondary')+'</details>';
 if(chapter)body+='<details data-fold="chronicle-history-'+id+'"><summary>已建工程 '+chapter+'/3 · 查看往事</summary><p class="note">本路开战怒气 +'+perks.rage+'，胜利后恢复 '+perks.heal/100+'% 气血；退阵者不复活。</p>'+route.choices.map((choice,i)=>'<h3>'+m.chapters[i].title+' · '+m.chapters[i].choices[choice].label+'</h3><p>'+m.chapters[i].choices[choice].ending+'</p>').join('')+'</details>';
 return '<section class="realm-panel chronicle-panel" data-page-section="realm:chronicles"><div class="chronicle-title"><h1>商路行记</h1><span>'+Object.values(r?.routes||{}).reduce((n,v)=>n+v.choices.length,0)+'/9 章</span></div><nav class="chronicle-tabs" aria-label="行记路线">'+Object.entries(CHRONICLES).map(([key,value])=>btn(value.name,{type:'ui_chronicleRegion',id:key},'secondary').replace('<button ','<button aria-current="'+(key===id?'page':'false')+'" ')).join('')+'</nav>'+body+'</section>';
}

export function chronicleReceipt(before,after){const a=before.realm?.journey?.chronicle?.active;if(a?.kind==='story'&&a.ready&&(after.realm?.journey?.chronicle?.routes[a.region]?.choices.length||0)>a.chapter){const ch=CHRONICLES[a.region].chapters[a.chapter];return '<section class="campaign-receipt"><h3>'+ch.title+'</h3><p>'+ch.choices[a.choice].ending+'</p></section>';}const p=after.realm?.journey?.chronicle?.active;if(!before.realm?.journey?.chronicle?.active?.ready&&p?.kind==='story'&&p.ready)return '<section class="campaign-receipt"><h3>委托办妥</h3><p>回到商路行记，备齐材料即可动工。</p></section>';return '';}
