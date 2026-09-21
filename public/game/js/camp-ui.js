import {lessonsPanel} from './opening-ui.js?v=0.44.0';
import {journeyHome} from './journey-ui.js?v=0.44.0';
import {pageSection,sectionPicker,sectionHome} from './page-sections.js?v=0.44.0';
import {storyGuide} from './story-guide.js?v=0.44.0';
import {recruitPrice} from './realm-buildings.js?v=0.44.0';
import {reservedTroops} from './squads.js?v=0.44.0';
import { supplyBoard } from './supplies.js?v=0.44.0';
import { staminaCap, barracksCapacity, commandCapacity, deployedTroops } from './logistics.js?v=0.44.0';
import { mentorshipPanel } from './mentorship-ui.js?v=0.44.0';
import { campOverview } from './camp-overview.js?v=0.44.0';
import { affairsPanel } from './management-ui.js?v=0.44.0';
import { productionPanel, frontierMap } from './frontier-ui.js?v=0.44.0';
import { corpsLine, presetsPanel, targetPanel, ledgerPanel } from './development-ui.js?v=0.44.0';
import { ARMS } from './martial.js?v=0.44.0';
import { enemyIntel } from './martial-ui.js?v=0.44.0';
import { dutyBoard, goalBoard, raidIntel, equipmentLoot } from './camp-development-ui.js?v=0.44.0';
import { BUILDINGS, TACTICS, RAIDS, buildingQuote } from './camp.js?v=0.44.0';
import { dungeonMountLoot } from './growth-ui.js?v=0.44.0';
import { icon } from './icons.js?v=0.44.0';

const portraitText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const portrait=(h,small=false)=>h.portrait?`<span class="hero-portrait portrait-${h.id}${small?' portrait-small':''}"><img src="${h.portrait}" alt="${portraitText(h.name)}人物像" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center 20%"></span>`:`<span class="hero-portrait portrait-${h.id}${h.introducedIn===3?' portrait-new':''}${small?' portrait-small':''}" role="img" aria-label="${portraitText(h.name)}人物卡">${h.introducedIn===3?`<span class="portrait-monogram"><b>${portraitText(h.name.slice(0,1))}</b><small>立绘待补</small></span>`:''}</span>`;
export function campPage(s,d,esc,btn,requested){
  const c=s.camp;
  if(!c)return `<section class="camp-arrival"><p class="kicker">水泊初起 · 自立门户</p><h1>先有一座寨，再聚天下义。</h1><p class="prose">聚义厅已经选好地基。请白胜带乡人落脚，修起农田与伐木场，再让英雄带兵出征。</p><div class="camp-faces">${['baisheng','wusong','linchong','wuyong'].map(id=>portrait(d.by.heroes[id])).join('')}</div>${btn('建立自己的寨子',{type:'campFound'},'primary')}<p class="note">已有英雄、坐骑和剧情进度保留。寨务与江湖历练可自由选择。</p></section>`;
  const n=deployedTroops(s);
  const next=!c.buildings.lumber?'先修伐木场，后续扩建就有稳定木料。':!c.buildings.farm?'再修农田，为募兵和出征储粮。':!c.buildings.barracks?'建起兵营，让乡勇跟随好汉出征。':!c.troops?'募一队乡勇，或选择英雄独行去山林清剿。':'经营寨务补给，出征带回木粮，再扩建聚义厅迎贤。';
  const section=pageSection('camp',requested),panels={preparation:()=>'<h1>寨中备战</h1><p>设施不只增加产量，也能为下一趟游历提供选择。</p><article class="realm-card"><h2>伐木场 2 级 · 修制路标</h2><p>付木材 20、碎银 30，本趟战斗粮耗降低 20%。</p></article><article class="realm-card"><h2>医馆 2 级 · 随军医囊</h2><p>付草药 3、布匹 2，每场胜利后在阵英雄恢复 8% 气血。</p></article><article class="realm-card"><h2>兵营 2 级 · 出征合练</h2><p>付粮草 25、碎银 40，每场开战怒气 +10。</p></article><p class="note">每趟最多选择一项，也可免费轻装出行。仅启程扣费，途中不可更换。</p>'+btn('安排下一趟备战',{type:'ui_section',view:'realm',id:'planning'},'primary')+btn('营建设施',{type:'ui_section',view:'camp',id:'buildings'},'secondary'),
 lessons:()=>lessonsPanel(s,btn),
 home:()=>journeyHome(s,btn,d)+storyGuide(s,d,esc,btn,true)+sectionHome('camp',btn),notices:()=>campOverview(s,d,btn),
 buildings:()=>`    <h2 class="subhead">营建 · 先安居，再聚义</h2><div class="building-grid">${Object.entries(BUILDINGS).map(([id,b],i)=>{const lv=c.buildings[id],q=buildingQuote(c,id),locked=lv>=5||(id!=='hall'&&lv>=c.buildings.hall);return `<article class="building-card ${lv?'built':''}"><div class="building-heading">${icon(['chronicle','energy','forge','heroes','medicine','coins'][i])}<span>${b.name}</span><b>${lv?'Lv.'+lv:'待建'}</b></div><p>${b.description}</p><p class="meta">${lv>=5?'已建至满级':`木材 ${q.wood} · 碎银 ${q.silver}`}</p>${btn(lv>=5?'已满级':locked?'先扩建聚义厅':lv?'扩建':'建造',{type:'campBuild',id},'secondary',locked||c.wood<q.wood||s.player.silver<q.silver)}</article>`;}).join('')}</div>
`,troops:()=>`    <section class="camp-status" id="camp-resources"><p>${next}</p><div class="camp-stock">${[['木材',c.wood],['粮草',c.food],['碎银',s.player.silver],['乡勇',c.troops],['伤兵',c.wounded]].map(([k,v])=>`<span>${k}<b>${v}</b></span>`).join('')}</div>
      <div class="actions">${btn('募兵 · 最多 10 人',{type:'campRecruit'},'secondary',!c.buildings.barracks||c.troops+c.wounded+reservedTroops(s)>=barracksCapacity(c))}${btn('募兵 50 人',{type:'campRecruit',amount:50},'secondary',!c.buildings.barracks||c.troops+c.wounded+reservedTroops(s)>=barracksCapacity(c))}${btn('募兵 100 人',{type:'campRecruit',amount:100},'secondary',!c.buildings.barracks||c.troops+c.wounded+reservedTroops(s)>=barracksCapacity(c))}${btn('治疗伤兵',{type:'campHeal'},'secondary',!c.buildings.clinic||!c.wounded)}</div><p class="note">兵额 ${c.troops+c.wounded+reservedTroops(s)} / ${barracksCapacity(c)}（分队在外 ${reservedTroops(s)}） · 募兵每人粮 2、银 ${recruitPrice(s)}；治疗每人粮 1。累计阵亡 ${c.fallen||0} 人，不能治疗复活。</p><details class="camp-rulebook" data-fold="camp-rulebook"><summary>统兵与体力成长规则</summary><p class="note">当前阵容统兵上限 ${commandCapacity(s)} 人（全军最多 1000）；每位好汉基础 150，每升 1 级 +10，灵／仙各累计 +50／100。兵力的战斗增益递减，粮耗和伤亡按实际人数计算。</p><p class="note">体力上限 ${staminaCap(s)}：基础 100，聚义厅每升一级 +10，最高等级好汉每跨过 5 级门槛 +5（6、11、16…级）。扩容不立即补满体力。</p></details></section>`,formation:()=>`    <section class="camp-orders"><h2>点将出征</h2><button type="button" class="secondary" data-view="trials">每日材料本与本期周本</button><div class="camp-team">${s.team.map(id=>`<div>${portrait(d.by.heroes[id],true)}<span>${d.by.heroes[id].name} · ${s.heroes[id].level}级</span></div>`).join('')}${btn('调整英雄阵容',{type:'ui_section',view:'heroes',id:'formation'},'text-action')}</div>
      <div class="team-fields"><label>作战方式<select id="camp-mode"><option value="army" ${c.mode==='army'?'selected':''}>英雄带兵</option><option value="solo" ${c.mode==='solo'?'selected':''}>英雄独行（不带兵）</option></select></label><label>出征乡勇<input id="camp-deployment" type="number" min="1" max="1000" value="${c.deployment}"></label><label>军令<select id="camp-tactic">${Object.entries(TACTICS).map(([id,t])=>`<option value="${id}" ${c.tactic===id?'selected':''}>${t.name}</option>`).join('')}</select></label></div>${btn('保存出征配置',{type:'ui_campFormation'},'secondary')}${corpsLine(s,d)}${presetsPanel(s,d,btn)}
      <p class="note">当前：${c.mode==='army'?n+' 名乡勇随行':'英雄独行'} · ${TACTICS[c.tactic].name}。乡勇增强攻击、防御和气血；强攻攻击 +20%、防御 -15%，固守攻击 -10%、防御 +25%。强攻伤兵较多，固守较少。要单英雄出战，请在好汉页仅留一人。</p>
</section>`,raids:()=>`      <div class="raid-grid">${Object.entries(RAIDS).map(([id,r])=>`<details class="card raid-choice" data-fold="raid-choice-${id}"><summary>${r.name}</summary><p>${r.description}</p><p class="meta">敌军：${r.enemy.map(e=>d.by.enemies[e].name).join('、')}</p>${raidIntel(s,d,id)}${enemyIntel(s,d,r.enemy,r.scale)}<p class="meta">聚义厅 ${r.level}级 · 体力 8 · 粮草 ${r.food+Math.ceil(n/2)}</p><p class="note">胜利：木材 ${r.wood}、粮草 ${id==='convoy'?55:15}、碎银 ${r.silver}、功勋 8、每位出阵英雄历练 ${r.exp}、经验丹 1、武学残页 1</p>${equipmentLoot(d,r.level)}${btn('出征',{type:'campRaid',id},'primary',c.buildings.hall<r.level||!s.team.length||s.player.stamina<8||c.food<r.food+Math.ceil(n/2)||(c.mode==='army'&&!n))}</details>`).join('')}</div>
    <details class="fold-section" data-fold="camp-dungeons"><summary>副本远征 · 坐骑契独立掉率 20%</summary><p class="note">聚义厅等级逐步开放远征。战斗副本沿用上方出征配置；计策副本靠安排取胜，不派兵。失败或撤退不掉契。</p>${d.dungeons.map(x=>{const level=Math.min(5,1+Math.floor(x.level/10)),open=c.buildings.hall>=level;return `<article class="card"><h3>${esc(x.name)}</h3>${dungeonMountLoot(s,d,x.id,esc)}<p class="meta">聚义厅 ${level}级 · 英雄 ${x.level}级 · 体力 ${x.cost} · 今日 ${s.daily.dungeons[x.id]||0}/${x.limit} 次</p>${btn('开始远征',{type:'dungeon',id:x.id},'secondary',!open||!s.team.length||Math.max(...s.team.map(id=>s.heroes[id].level))<x.level||s.player.stamina<x.cost||(s.daily.dungeons[x.id]||0)>=x.limit)}</article>`;}).join('')}</details>
`,
 duties:()=>dutyBoard(s,d,btn,portrait),affairs:()=>affairsPanel(s,d,btn),
 production:()=>productionPanel(s,d,btn)+(s.frontier?frontierMap(s,d,esc,btn):''),
 goals:()=>goalBoard(s,d,btn),supply:()=>supplyBoard(s,d,btn),mentorship:()=>mentorshipPanel(s,d,esc,btn),
 ledger:()=>targetPanel(s,d,btn)+ledgerPanel(s,d)
 };
 return (section==='home'?'':sectionPicker('camp',section,btn))+(section==='home'?'<div class="home-banner"><strong>白泽寨</strong><span>'+c.buildings.hall+' 级 · 寨务第 '+c.day+' 日</span></div>':`<div class="section-top"><div><p class="kicker">水泊梁山 · 寨务第 ${c.day} 日</p><h1 class="page-title">${icon('chronicle')}白泽寨</h1></div><span class="camp-rank">${c.buildings.hall} 级寨子</span></div>
`)+'<section data-page-section="camp:'+section+'">'+panels[section]()+'</section>';
}
