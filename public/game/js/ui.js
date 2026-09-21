import {campaignBattleStatus} from './journey-campaign-ui.js?v=0.44.0';
import {roleCard} from './hero-roles.js?v=0.44.0';
import {lessonBattlePanel} from './opening-ui.js?v=0.44.0';
import {journeyBattlePanel} from './journey-tactics-ui.js?v=0.44.0';
import {BOONS,JOURNEYS} from './journey-data.js?v=0.44.0';
import {personalProgressPanel} from './personal-tasks.js?v=0.44.0';
import {storyGuide,storyObjective} from './story-guide.js?v=0.44.0';
import { recruitSupportPanel } from './recruit-support-ui.js?v=0.44.0';
import {CORPS} from './development.js?v=0.44.0';
import {pageSection,sectionNavigation,sectionPicker} from './page-sections.js?v=0.44.0';
import { frontierMap } from './frontier-ui.js?v=0.44.0';
import {personalTaskPanel} from './expansion-ui.js?v=0.44.0';
import { retreatForecast } from './fieldcraft-ui.js?v=0.44.0';
import { volumeSixBoard, sixthMissionCard } from './volume-six-ui.js?v=0.44.0';
import {staminaPanel,inventoryPanel,recipePanel,provisionSources} from './provisions-ui.js?v=0.44.0';
import { staminaCap } from './logistics.js?v=0.44.0';
import { isExternal, isWanderer } from './roster.js?v=0.44.0';
import { fifthMissionCard, fifthLocalHelp, volumeFiveBoard } from './volume-five-ui.js?v=0.44.0';
import { fourthMissionCard, fourthLocalHelp, volumeFourBoard } from './volume-four-ui.js?v=0.44.0';
import { chapterMissionCard, thirdLocalHelp, volumeThreeBoard } from './volume-three-ui.js?v=0.44.0';
import { chroniclePanel } from './hero-chronicles.js?v=0.44.0';
import { progressionPanel, experienceLabel } from './progression-ui.js?v=0.44.0';
import { debriefPanel } from './sortie-ui.js?v=0.44.0';
import { batchButtons } from './batch-ui.js?v=0.44.0';
import { equipmentComparison } from './management-ui.js?v=0.44.0';
import { objectivePanel } from './strategy-ui.js?v=0.44.0';
import { ordersPanel, equipmentFilters, recruitBatchDialog } from './commands-ui.js?v=0.44.0';
import { equipmentMatches } from './commands.js?v=0.44.0';
import { corpsPanel, presetsPanel, targetPanel, setPanel, setsCatalog } from './development-ui.js?v=0.44.0';
import {talentPanel} from './talents.js?v=0.44.0';
import { realmPanel } from './realm-ui.js?v=0.44.0';
import { rotationsPage } from './rotations-ui.js?v=0.44.0';
import { traitCard } from './martial-ui.js?v=0.44.0';
import { helpersBoard } from './helpers-ui.js?v=0.44.0';
import { rosterBoard, qualityPanel, qualityTrials, invitation } from './roster-ui.js?v=0.44.0';
import { qualityOf, QUALITIES } from './quality.js?v=0.44.0';
import { worldMap, localBenefit } from './world-map-ui.js?v=0.44.0';
import { saveBoxPage } from './savebox-ui.js?v=0.44.0';
import { attributes } from './hero.js?v=0.44.0';
import { exits, meets, heroRank, dungeonEntry } from './map.js?v=0.44.0';
import { isBusy, questReady } from './core.js?v=0.44.0';
import { statusName, skillReason, battleItemQuote, enemySkill, BATTLE_ITEMS, battleSkillMode } from './battle.js?v=0.44.0';
import { strengthenQuote } from './item.js?v=0.44.0';
import { icon, actionIcon } from './icons.js?v=0.44.0';
import { heroStewardCard } from './camp-development-ui.js?v=0.44.0';
import { heroGrowth, growthSources, stableMounts, dungeonMountLoot } from './growth-ui.js?v=0.44.0';
import { campPage, portrait } from './camp-ui.js?v=0.44.0';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const btn=(label,command,kind='text-action',disabled=false)=>{const symbol=icon(actionIcon(command));return `<button type="button" class="${kind}${symbol?' with-icon':''}" data-command="${esc(JSON.stringify(command))}" ${disabled?'disabled':''}>${symbol}<span>${esc(label)}</span></button>`;};
const nav=(label,view)=>`<button type="button" class="text-action with-icon" data-view="${view}" aria-label="${esc(label)}">${icon(view)}<span>${esc(label)}</span></button>`;
const stats=a=>`<div class="statline">${Object.entries({气血:a.hp,攻击:a.attack,防御:a.defense,速度:a.speed,谋略:a.strategy}).map(([k,v])=>`<span>${k} ${v}</span>`).join('')}</div>`;
const title=(name,sub='',chapter='',symbol='map')=>`<div class="section-top"><div><p class="kicker">${esc(sub)}</p><h1 class="page-title">${icon(symbol)}<span>${esc(name)}</span></h1></div><span class="chapter-no">${esc(chapter)}</span></div>`;
const statusLabels={unknown:'未闻',heard:'听闻',known:'相识',available:'可招贤',owned:'已入寨'};
function heroOptions(s,d,selected='',empty='选择好汉',forTeam=false){return `<option value="">${empty}</option>`+d.heroes.filter(h=>s.heroes[h.id].status==='owned').map(h=>`<option value="${h.id}" ${selected===h.id?'selected':''} ${forTeam&&(s.affairs?.mission?.hero===h.id||s.realm?.squad?.team.includes(h.id))?'disabled':''}>${h.name} · ${s.heroes[h.id].level}级${(s.affairs?.mission?.hero===h.id||s.realm?.squad?.team.includes(h.id))?' · 外派中':''}</option>`).join('');}
function storyCards(s,d) {
  return d.by.maps[s.location].stories.map(id=>{
    const model=d.by.stories[id],p=s.progress.stories[id];
    if(p?.status==='completed')return '';
    if(!p)return model.map===s.location&&meets(s,model.condition)?`<article class="card"><h2>${esc(model.title)}</h2>${btn(/^v[3456]_/.test(id)?'查看此地事务':'开始这段相识',{type:'story',id})}</article>`:'';
    const step=model.steps[p.step];if(step.map!==s.location)return '';if(!meets(s,step.condition))return `<article class="card"><h2>${esc(model.title)}</h2><p>${esc(step.hint||'请先推进相关人物的往事，再回来续记。')}</p></article>`;
    return `<article class="card"><p class="kicker">${esc(model.title)} · 往事进行中</p><p class="prose">${esc(step.text)}</p>${step.choices.some(c=>c.battle)?(id.startsWith('v6_')?sixthMissionCard(s,d,id):id.startsWith('v5_')?fifthMissionCard(s,d,id):id.startsWith('v4_')?fourthMissionCard(s,d,id):chapterMissionCard(s,d,id)):''}<div class="actions">${step.choices.map(c=>btn(c.label,{type:/^v[3456]_/.test(id)&&c.battle?'chapterBattle':'story',id,choice:c.id},'primary',!meets(s,c.condition))).join('')}</div></article>`;
  }).join('');
}
export function isFirstArrival(s){return s.location==='yuncheng'&&s.progress.visited.length===1&&s.progress.visited[0]==='yuncheng'&&s.recruit.total===0&&Object.values(s.heroes).every(h=>h.status==='unknown')&&!Object.keys(s.progress.actions).length&&!Object.keys(s.progress.flags).length;}
function locationScene(s,d){
  const m=d.by.maps[s.location],links=exits(s,d),paths=list=>list.map(l=>btn(d.by.maps[l.target].name,{type:'move',id:l.target})).join('');
  if(m.id!=='yuncheng')return `<section class="location"><p class="prose">${esc(m.description)}</p><p class="subhead">可往何处</p><div class="paths">${paths(links)}</div></section>`;
  const doors=[
    ['tavern','酒肆传闻','半卷酒旗，一桌闲话。卖酒的汉子正向你招手。','event'],
    ['office','县衙告示','新贴的榜文前围着行人，差役说起冈上的虎患。','quests'],
    ['gate','江湖消息','城门边的行脚客刚歇下担子，带来东溪村的消息。','map']
  ];
  return `<section class="location town-scene"><p class="prose">${esc(m.description)}</p><h2 class="subhead">${isFirstArrival(s)?'初来乍到，先听听这座城。':'故地重来，且听一回新旧传闻。'}</h2><div class="story-doors">${doors.filter(([id])=>links.some(l=>l.target===id)).map(([id,label,copy,symbol])=>`<button type="button" class="story-door" data-command="${esc(JSON.stringify({type:'move',id}))}" aria-label="${label}">${icon(symbol)}<span><strong>${label}</strong><span>${copy}</span></span><span class="door-arrow" aria-hidden="true">›</span></button>`).join('')}</div><details class="fold-section" data-fold="city-paths"><summary>城中去处</summary><p class="note">若要置办行装、寻访脚力或邀贤，可循街前往。</p><div class="paths">${paths(links.filter(l=>!doors.some(([id])=>id===l.target)))}</div></details></section>`;
}
function localVoices(s){
  if(s.location==='office')return `<article class="town-notice"><p class="kicker">郓城县衙 · 榜文</p><h2>县衙告示</h2><p class="prose">近闻景阳冈虎患伤人，过往客商须结伴而行，切莫贪赶夜路。</p><p class="note">一旁老者摇头：“告示贴了几回，不知何时才有人除得这患。”你记下了景阳冈这个地名。</p></article>`;
  if(s.location==='gate')return `<article class="card"><h2>江湖消息</h2><p class="prose">行脚客拢了拢草鞋：“东溪村的晁保正，待客最是仗义。若往景阳冈走，可得先打听清楚山路。”</p><p class="note">${s.progress.flags.dongxi_rumor?'你已听掌柜说过溪边乡路，可以往东溪村访客，也可沿官道去探景阳冈的消息。':'官道通向景阳冈；东溪村的乡路还不熟，不妨先回郓城酒肆，向掌柜打听东溪村。'}</p></article>`;
  if(s.location==='tavern')return '<h2 class="subhead">酒肆传闻</h2><p class="note">要一碗茶，且听邻桌说些什么；也可先与卖酒汉子叙话。</p>';
  return '';
}
function searchCard(s){return `<article class="card"><h2>江湖寻访</h2><p class="note">寻访耗体力 2；每处际遇每日一次。今日已访 ${s.daily.counters.search||0}/12 回。等候可改变游戏昼夜，不加速真实体力恢复。</p><div class="actions">${btn('四下寻访',{type:'search'},'secondary',s.player.stamina<2||(s.daily.counters.search||0)>=12)}${btn('等候半日',{type:'wait'})}</div></article>`;}
const journeySections={story:'剧情行路',atlas:'江湖地图',explore:'当地探索',territory:'领地据点'};
function journeyNavigation(s,d,section){return '<nav class="journey-sections" aria-label="江湖功能分区">'+Object.entries(journeySections).map(([id,label])=>'<button type="button" data-map-section="'+id+'" aria-current="'+(section===id?'page':'false')+'">'+label+'</button>').join('')+'</nav><p class="journey-location">当前所在：'+esc(d.by.maps[s.location].name)+'</p>';}
function continuingStories(s,d){const rows=d.stories.filter(m=>s.progress.stories[m.id]?.status==='active').filter(m=>m.steps[s.progress.stories[m.id].step]?.map!==s.location);if(!rows.length)return '';return '<section class="journey-next"><h2 class="subhead">接下来去哪里</h2>'+rows.map(m=>{const step=m.steps[s.progress.stories[m.id].step];return '<p><b>'+esc(m.title)+'</b> · '+esc(d.by.maps[step.map].name)+'</p>'+(step.hint?'<p class="note">'+esc(step.hint)+'</p>':'')+btn('查看路线 · '+d.by.maps[step.map].name,{type:'ui_mapInspect',id:step.map},'secondary');}).join('')+'</section>';}
function localStoryPage(s,d){const m=d.by.maps[s.location],completed=m.stories.filter(id=>s.progress.stories[id]?.status==='completed');return '<section id="map-local">'+storyGuide(s,d,esc,btn,false,true)+title(m.name+' · 剧情',m.region+' · '+(s.worldMinute>=1080||s.worldMinute<360?'夜色渐深':'白日行路'),'卷'+(d.by.chapters[m.chapter]?.number||1))+
  '<div class="journey-story" id="journey-story">'+storyCards(s,d)+
  '<details class="local-optional" data-fold="local-optional"><summary>当地人物与传闻</summary>'+m.actions.filter(a=>meets(s,a.condition)&&(!a.once||!s.progress.actions[a.id])).map(a=>btn(a.label,{type:'mapAction',id:a.id},'secondary')).join(' ')+
  d.heroes.filter(h=>h.meetMap===s.location&&meets(s,h.meetCondition)&&heroRank[s.heroes[h.id].status]<2).map(h=>btn(h.id==='baisheng'?'与卖酒汉子交谈':h.id==='shiqian'?'与窗边瘦汉交谈':'与'+h.title+'交谈',{type:'meet',id:h.id})).join(' ')+
  (s.location==='tavern'&&s.heroes.baisheng.status==='known'&&!s.progress.flags.guide?'<article class="card"><h2>乡人相助</h2><p>白胜拍了拍酒担：“乡道我熟，可先替你照应行路。”</p>'+btn('邀白胜作向导',{type:'guide'},'primary')+'</article>':'')+
  '</details>'+ (s.location==='ridge'&&s.progress.flags.seven_stars&&!s.progress.flags.huangni_complete?'<article class="card"><h2>智取生辰纲</h2><p>你负责察看时机，吴用、晁盖等人依计行事。这里不靠强攻。</p>'+btn('商议冈上的安排',{type:'startScheme'},'primary')+'</article>':'')+'</div>'+
  fifthLocalHelp(s)+fourthLocalHelp(s)+thirdLocalHelp(s,d)+continuingStories(s,d)+'<details data-fold="local-roads"><summary>自由行路与地点介绍</summary>'+locationScene(s,d)+localVoices(s)+'</details>'+
  (s.location==='forge'?nav('进入打造与强化','forge'):s.location==='recruit'?nav('进入招贤','recruit'):s.location==='office'?nav('查看主线与今日差事','quests'):s.location==='stable'?nav('为好汉领骑与养成','heroes'):'')+
  (completed.length?'<details class="fold-section" data-fold="local-completed"><summary>此地已完成的往事 · '+completed.length+'</summary>'+completed.map(id=>'<p class="note">'+esc(d.by.stories[id].title)+'已记入梁山志。</p>').join('')+nav('查看梁山志','chronicle')+'</details>':'')+'</section>';}
function localExplorationPage(s,d){const m=d.by.maps[s.location];return '<section id="map-explore">'+title(m.name+' · 探索','探访酬谢、坐骑与当地副本')+localBenefit(s,btn)+(s.location==='stable'?stableMounts(s,d,esc,btn):'')+m.dungeons.map(id=>{const x=d.by.dungeons[id],open=dungeonEntry(s,x);return `<article class="card"><h2>${esc(x.name)}<span class="badge">历练</span></h2><p class="note">${esc(x.description)}</p>${dungeonMountLoot(s,d,id,esc)}<p class="meta">队中一人达到 ${x.level}级 · 体力 ${x.cost} · 今日 ${s.daily.dungeons[id]||0}/${x.limit} 次</p>${btn(open?'开始历练':'需先完成此地剧情',{type:'dungeon',id},'secondary',!open||s.team.length===0||Math.max(...s.team.map(id=>s.heroes[id].level))<x.level||(s.daily.dungeons[id]||0)>=x.limit||s.player.stamina<x.cost)}</article>`;}).join('')+searchCard(s)+'</section>';}
function mapPage(s,d,mapTarget,mapSection='story'){const section=Object.prototype.hasOwnProperty.call(journeySections,mapSection)?mapSection:'story';return journeyNavigation(s,d,section)+'<div class="journey-content" data-journey-section="'+section+'">'+(section==='atlas'?worldMap(s,d,mapTarget,esc,btn):section==='explore'?localExplorationPage(s,d):section==='territory'?'<section class="realm-map-link"><h2>地区商情与势力</h2><p>三路治安、商会关系与委托在山河经营中查看。</p>'+nav('前往山河经营','realm')+'</section>'+ (frontierMap(s,d,esc,btn)||'<p class="note">先建立寨子，再开办经营拓土。</p>'):localStoryPage(s,d))+'</div>';}
function heroCard(s,d,h,mode='all'){
  const v=s.heroes[h.id],owned=v.status==='owned';
  if(['training','corps','quality','skills','talents'].includes(mode)){
   const panels={training:()=>roleCard(h.id)+stats(attributes(s,h.id,d))+progressionPanel(s,d,h.id)+btn('赠经验丹 · 先预览',{type:'ui_batchPreview',kind:'experience',id:h.id,count:1},'primary',!s.inventory.exp_pill||v.level>=d.config.balance.heroLevelCap)+batchButtons(h.id,'experience',btn)+btn('去演武传习',{type:'ui_campJump',id:'camp-mentorship'},'secondary'),corps:()=>corpsPanel(s,d,h,btn),quality:()=>qualityPanel(s,d,h,esc,btn),skills:()=> (isWanderer(h)?btn('3 枚信物 → 专属招式书',{type:'skillBook',id:h.id,source:'tokens'},'secondary',(s.inventory[h.id+'_token']||0)<3):'')+heroGrowth(s,d,h,esc,btn)+'<details data-fold="growth-sources"><summary>材料来源</summary>'+growthSources(s,d,esc,btn)+'</details>',talents:()=>traitCard(h)+talentPanel(s,d,h,btn)+setPanel(s,d,h.id)+heroStewardCard(s,d,h,btn)};
   return '<article class="card hero-card focused-hero">'+portrait(h,true)+'<h2>'+esc(h.name)+'</h2>'+(owned?panels[mode]():invitation(s,h,btn))+'</article>';
  }
  if(mode==='overview'||mode==='tasks')return '<article class="card hero-card">'+portrait(h)+'<h2>'+esc(h.title)+' · '+esc(h.name)+'</h2><p class="meta">'+(isWanderer(h)?'江湖散人 · 不占正册座次':isExternal(h)?'外传人物 · 不占正册座次':h.starSign+' · 第 '+h.seat+' 席')+' · '+statusLabels[v.status]+(owned?' · '+experienceLabel(v,d.config.balance.heroLevelCap):'')+'</p>'+(mode==='tasks'?(owned?chroniclePanel(s,d,h,btn)+personalTaskPanel(s,d,h,btn):'<p>此人入寨后可查看人物任务。</p>')+'<details data-fold="hero-biography-'+h.id+'"><summary>人物往事</summary><p>'+esc(h.story)+'</p>'+heroArc(s,d,h.id)+'</details>':(owned?stats(attributes(s,h.id,d)):invitation(s,h,btn))+'<p class="note">'+esc(h.story)+'</p>'+'<p class="note">专属兵种：'+esc(CORPS[h.id]?.name||'待查')+'</p>'+btn('查看培养与兵种',{type:'ui_section',view:'heroes',id:'training',hero:h.id},'primary')+btn('查看人物任务',{type:'ui_section',view:'heroes',id:'tasks',hero:h.id},'secondary',!owned))+'</article>';
  return `<article class="card hero-card">${portrait(h)}<h2>${esc(h.title)} · ${esc(h.name)}<span class="badge">${statusLabels[v.status]}</span></h2>
    <p class="meta">${isWanderer(h)?'江湖散人 · 不占正册座次':isExternal(h)?'外传人物 · 不占正册座次':h.starSign+' · 第 '+h.seat+' 席'} · ${QUALITIES[qualityOf(v)].name}品 · 资质 ${'★'.repeat(h.star)} · ${owned?experienceLabel(v,d.config.balance.heroLevelCap):isWanderer(h)?'普通招贤抽中即入寨':'先相识，再以信物邀贤'}</p>
    ${owned?stats(attributes(s,h.id,d))+progressionPanel(s,d,h.id)+btn('赠 1 颗经验丹 · 先预览（现有 '+(s.inventory.exp_pill||0)+'）',{type:'ui_batchPreview',kind:'experience',id:h.id,count:1},'secondary',!s.inventory.exp_pill||v.level>=d.config.balance.heroLevelCap)+batchButtons(h.id,'experience',btn)+btn('去寨中演武传习',{type:'ui_campJump',id:'camp-mentorship'},'text-action'):`<p class="note">可在${esc(d.by.maps[h.meetMap].name)}寻访${h.meetCondition?'，还须推进相关主线':''}。</p>`}
    ${s.affairs?.mission?.hero===h.id?'<p class="notice">此人正在外派，请到寨子接回后再安排出阵或任职。</p>':''}${traitCard(h)}${corpsPanel(s,d,h,btn)}${owned?setPanel(s,d,h.id):''}${invitation(s,h,btn)}${owned?qualityPanel(s,d,h,esc,btn):stats(attributes(s,h.id,d,1,false))}${heroStewardCard(s,d,h,btn)}${owned&&mode==='all'?chroniclePanel(s,d,h,btn):''}${talentPanel(s,d,h,btn)}${mode==='all'?personalTaskPanel(s,d,h,btn):''}<details data-fold="hero-${h.id}"><summary>人物往事与招式</summary><p class="note">${esc(h.story)}</p>${heroArc(s,d,h.id)}
      ${owned&&isWanderer(h)?`<div class="actions">${btn('3 枚信物 → 专属招式书',{type:'skillBook',id:h.id,source:'tokens'},'secondary',(s.inventory[h.id+'_token']||0)<3)}</div>`:''}<p class="meta">信物 ${s.inventory[h.id+'_token']||0}/${isWanderer(h)?3:10}${isWanderer(h)?' · 三枚换一本专属招式书':isExternal(h)?' · 外传直接邀请':' · 专属令 '+(s.inventory[h.id+'_order']||0)}</p>
      ${heroGrowth(s,d,h,esc,btn)}
    </details></article>`;
}
function heroesPage(s,d,roster={},requested){const section=pageSection('heroes',requested),owned=d.heroes.filter(h=>s.heroes[h.id].status==='owned'),selected=d.by.heroes[roster.selected]||owned.find(h=>h.id===s.team[0])||owned[0];let content;
  if(section==='roster')content=rosterBoard(s,d,roster,esc,btn,(s,d,h)=>heroCard(s,d,h,'overview'));
  else if(section==='formation')content=(owned.length?`<section class="location"><h2 class="subhead">出阵次序 · 最多三人</h2><p class="note">前两位迎敌，第三位居后照应。</p><div class="team-fields">${[0,1,2].map(i=>`<label>第 ${i+1} 位<select id="team-${i}" aria-label="第${i+1}位出阵好汉">${heroOptions(s,d,s.team[i],'选择好汉',true)}</select></label>`).join('')}</div>${btn('保存阵容',{type:'ui_team'},'primary')}</section>`:'<p class="note">在下方点将录选择好汉，可查看直接迎贤条件。</p>')+presetsPanel(s,d,btn);
  else content=selected?'<label class="section-hero-picker">选择好汉<select id="section-hero">'+d.heroes.filter(h=>s.heroes[h.id].status==='owned'||h.id===selected.id).map(h=>'<option value="'+h.id+'" '+(h.id===selected.id?'selected':'')+'>'+esc(h.name)+' · '+statusLabels[s.heroes[h.id].status]+'</option>').join('')+'</select></label><section id="roster-detail" aria-label="人物详情">'+heroCard(s,d,selected,section==='profile'?'overview':section)+'</section>'+(section==='quality'?qualityTrials(s,d,btn):''):'<p class="note">先从名册或招贤馆迎入一位好汉，再安排培养和人物任务。</p>'+btn('查看好汉名册',{type:'ui_section',view:'heroes',id:'roster'},'primary');
  return sectionNavigation('heroes',section,btn)+'<section data-page-section="heroes:'+section+'">'+title('我的好汉','108 将、外传与散人 · 凡灵仙养成','','heroes')+content+'</section>';}
function equipmentList(s,d,forge=false,filter={}){return equipmentComparison(s,d,filter.comparison,btn,esc)+equipmentFilters(s,d,filter,btn,esc)+'<div class="equipment-inventory">'+s.equipment.filter(e=>equipmentMatches(e,d,filter)).map(e=>{const m=d.by.equipments[e.item],quote=strengthenQuote(s,d,e);return `<article class="card" data-gear="${e.uid}" data-locked="${!!e.locked}"><h3>${e.locked?'【已锁定】':''}${esc(m.quality)} · ${esc(m.name)} +${e.plus}</h3><p class="meta">${e.hero?'由'+d.by.heroes[e.hero].name+'穿戴':'行囊中'} · ${Object.entries(m.attribute).map(([key,n])=>({attack:'攻击',hp:'气血',defense:'防御',speed:'速度',strategy:'谋略'})[key]+' +'+Math.round(n*(1+e.plus*.1))).join(' / ')}</p>${m.source==='journey'?'<p class="note">'+esc(m.description)+'</p>':''}<label>交给<select id="holder-${e.uid}" aria-label="${m.name}穿戴者">${heroOptions(s,d,e.hero,'卸下收回')}</select></label>${btn('对比后穿戴',{type:'ui_equip',id:e.uid},'secondary')}${btn(e.locked?'解除锁定':'锁定装备',{type:'equipLock',id:e.uid,locked:!e.locked},'secondary')}${forge?`<div class="actions">${btn('强化：碎银 '+quote.cost.silver+'、精铁 '+quote.cost.items.iron+(e.plus>=5?'、强化符 1（八成可成）':'（必成）'),{type:'strengthen',id:e.uid},'secondary',e.plus>=quote.cap)}${btn('分解成碎铁',{type:'ui_dismantle',id:e.uid},'text-action',!!e.hero||!!e.locked)}</div>`:''}</article>`;}).join('')+'</div>';}
function bagPage(s,d,gear={},requested){const section=pageSection('bag',requested),shop=true;let content;
 if(section==='supplies')content=staminaPanel(s,d,btn)+inventoryPanel(s,d,esc,btn,['补给','战斗药品'])+provisionSources(s,d,btn);
 else if(section==='materials')content=inventoryPanel(s,d,esc,btn,['招贤','养成','材料与线索']);
 else if(section==='equipment')content='<h2 class="subhead">随身装备 · '+s.equipment.length+' 件</h2>'+equipmentList(s,d,false,gear)+nav('前往打造与强化','forge');
 else if(section==='craft')content='<div id="supply-recipes-anchor">'+recipePanel(s,d,btn,true)+'</div>'+`<details class="fold-section" data-fold="materials"><summary>材料合成</summary><div class="actions">${btn('10 招贤碎片 → 招贤令',{type:'exchange',id:'order'},'secondary')}${btn('3 药草 → 2 金创药',{type:'exchange',id:'medicine'},'secondary')}${btn('20 生辰纲残册 → 失落财货',{type:'exchange',id:'ledger'},'secondary')}${btn('5 强化符碎片 → 强化符',{type:'exchange',id:'charm'},'secondary')}</div></details>`;
 else content=`<details class="fold-section" data-fold="shop" data-default-open><summary>随时采买</summary><div class="batch-shop"><label>批量采买物品<select id="batch-shop-item">${['jinchuangyao','huiqisan','jiedudan','exp_pill','wine','iron','cloth','night_clothes','recruit_order'].map(id=>`<option value="${id}">${d.by.items[id].name} · ${d.by.items[id].price}银 / 份</option>`).join('')}</select></label>${btn('预览采买 5 份',{type:'ui_batchShop',count:5},'secondary')}${btn('预览采买 10 份',{type:'ui_batchShop',count:10},'secondary')}</div>${shop?`<p class="note">招贤令每日限购三张。</p><div class="actions">${['jinchuangyao','huiqisan','jiedudan','exp_pill','wine','iron','cloth','night_clothes','recruit_order'].map(id=>btn(`${d.by.items[id].name} · ${d.by.items[id].price}银`,{type:'buy',id},'secondary')).join('')}</div>`:'<p class="note">到郓城集市、铁匠铺、酒肆、招贤馆或药草坡才可交易。</p>'+nav('返回江湖','map')}</details>`;
 return sectionNavigation('bag',section,btn)+'<section data-page-section="bag:'+section+'">'+title('行囊','使用物品与整理装备','','bag')+content+'</section>';}
function forgePage(s,d,gear={},requested){
  const section=pageSection('forge',requested),panels={equipment:()=>equipmentList(s,d,true,gear)+`<details class="fold-section" data-fold="forge-rules"><summary>强化规则</summary><p>基础 +1～+5 必成；山神庙往事后可向铁匠请教，解锁 +6～+10。进阶强化八成可成，失败消耗材料但不降级、不毁装备。穿戴中的装备不能分解。</p></details>`,craft:()=>`<details class="fold-section" data-fold="forge-catalog" data-default-open><summary>打造与购买基础装备</summary>${d.equipments.filter(e=>e.source!=='journey').map(e=>`<article class="card"><h3>${esc(e.quality)} · ${esc(e.name)}</h3><p class="meta">打造：${e.recipe.silver}银，${Object.entries(e.recipe.items).map(([id,n])=>d.by.items[id].name+' ×'+n).join('，')}</p><div class="actions">${btn('打造',{type:'craftEquip',id:e.id},'secondary')}${btn('购买 · '+e.price*2+'银',{type:'buyEquip',id:e.id})}</div></article>`).join('')}</details>
    `,sets:()=>setsCatalog(s,d,btn),goals:()=>targetPanel(s,d,btn)};
 return sectionPicker('forge',section,btn)+title('铁匠铺','强化、打造与图鉴分开查看','','forge')+'<section data-page-section="forge:'+section+'">'+panels[section]()+'</section>';
}
function recruitPage(s,d,target='',roster={},requested){
  const at=true,candidates=d.heroes.filter(h=>!isExternal(h)&&heroRank[s.heroes[h.id].status]>=1);
  const selected=candidates.find(h=>h.id===target)||candidates.find(h=>s.inventory[h.id+'_order']>0)||candidates[0];
  const section=pageSection('recruit',requested),panels={ordinary:()=>`<section class="location"><h2 class="subhead">普通招贤</h2><p>招贤令 <strong>×${s.inventory.recruit_order||0}</strong></p><p class="note">普通招贤包含正册 108 将与 ${d.heroes.filter(isWanderer).length} 位江湖散人（一至三星）。散人首次抽中直接入寨；正册人物仍需相识，未相识时带回线索与信物。故事外传人物在名册中直接邀请。各星级概率与保底不变，同星人物均分该档概率。</p><div class="actions">${btn('使用一张招贤令',{type:'recruit'},'primary',!at||!s.inventory.recruit_order)}${btn('十连招贤 · 10 张令',{type:'recruitTen'},'secondary',(s.inventory.recruit_order||0)<10)}</div><p class="note">十连与单抽共享原有概率及星级保底；连续十次普通招贤无新人时，另赠迎贤荐书，可在“招贤补给”自选低星好汉。</p></section>
    <details class="fold-section" data-fold="recruit-rules"><summary>招贤规则与保底</summary><p>普通招贤：五星 1%、四星 6%、三星 23%、二星 45%、一星 25%。连续未得三星 ${s.recruit.pity.three}/20、四星 ${s.recruit.pity.four}/50、五星 ${s.recruit.pity.five}/100；达到次数必得相应档次或以上的结果。</p><p>专属招贤：目标 25%、其他五星 5%、其余 70%。连续四次未得目标后，下一次必得。未相识者仍只送来两枚信物，重复好汉化为三枚对应信物与功勋十五。无付费招贤。</p></details>`,exclusive:()=>`<section class="location"><h2 class="subhead">专属招贤</h2>${selected?`<label for="recruit-target">邀请哪位好汉</label><select id="recruit-target">${candidates.map(h=>`<option value="${h.id}" ${h.id===selected.id?'selected':''}>${esc(h.name)} · ${statusLabels[s.heroes[h.id].status]} · 专属令 ${s.inventory[h.id+'_order']||0}</option>`).join('')}</select>
      <div class="recruit-target"><h3>${esc(selected.title)} · ${esc(selected.name)}</h3><p class="meta">信物 ${s.inventory[selected.id+'_token']||0}/10 · 专属令 ${s.inventory[selected.id+'_order']||0} · 缘分 ${s.recruit.fate[selected.id]||0}/4</p>
      ${heroRank[s.heroes[selected.id].status]<2?'<p class="note">尚未相识，请先在江湖寻访。</p>':''}
      <div class="actions">${btn('合成专属令',{type:'craftOrder',id:selected.id},'secondary',(s.inventory[selected.id+'_token']||0)<10)}${btn('专属招贤',{type:'recruit',id:selected.id},'primary',!at||heroRank[s.heroes[selected.id].status]<2||!s.inventory[selected.id+'_order'])}</div></div>`:'<p class="note">尚无人物线索。先在江湖结识好汉，或用普通招贤获得线索。</p>'}</section>
    `,support:()=>recruitSupportPanel(s,d,esc,btn),helpers:()=>helpersBoard(s,btn),roster:()=>rosterBoard(s,d,roster,esc,btn,(s,d,h)=>heroCard(s,d,h,'overview'))};
 return sectionPicker('recruit',section,btn)+title('招贤馆','按需选择招贤、补给或直接迎贤','','recruit')+'<section data-page-section="recruit:'+section+'">'+panels[section]()+'</section>';
}
function rewardText(r,d){return [...['silver','merit','prestige'].filter(k=>r[k]).map(k=>({silver:'碎银',merit:'功勋',prestige:'威望'})[k]+' ×'+r[k]),...Object.entries(r.items||{}).map(([id,n])=>d.by.items[id].name+' ×'+n)].join('，');}

function activeChapter(s,d){return d.chapters.find(c=>!s.progress.flags[c.completeFlag])||d.chapters[d.chapters.length-1];}
function heroArc(s,d,id){const stage=d.config.heroArcs.find(a=>a.hero===id)?.stages.find(v=>s.progress.flags[v.flag]);return stage?`<p class="progress-label">人物心境：${esc(stage.label)}</p>`:'';}
function journeyClues(s,d){
  const active=d.stories.filter(m=>s.progress.stories[m.id]?.status==='active');
  return active.length?`<details class="fold-section" data-fold="journey-clues"><summary>进行中的往事 · ${active.length} 段</summary>${active.map(m=>{const step=m.steps[s.progress.stories[m.id].step];return `<p><b>${esc(m.title)}</b> · 下一处：${esc(d.by.maps[step.map].name)}。${esc(step.hint||'循地图行路，在当地续记往事。')}</p>`;}).join('')}</details>`:'';
}
function questCard(s,d,q){
  const daily=q.type==='daily',claimed=(daily?s.daily.claimed:s.progress.claims).includes(q.id),ready=questReady(s,q);
  return `<article class="card"><h3>${esc(q.name)}${claimed?'<span class="badge">已办妥</span>':''}</h3><p>${esc(q.description)}</p><p class="meta">${daily?'进度 '+Math.min(q.goal.amount,s.daily.counters[q.goal.stat]||0)+'/'+q.goal.amount+' · ':''}酬劳：${rewardText(q.reward,d)}</p>${btn(claimed?'酬劳已领':ready?'领取酬劳':'尚待办妥',{type:'quest',id:q.id},'secondary',claimed||!ready)}</article>`;
}
function questsPage(s,d){
  const daily=d.quests.filter(q=>q.type==='daily'&&s.daily.ids.includes(q.id));
  const pending=d.quests.filter(q=>q.type==='main'&&!s.progress.claims.includes(q.id)&&meets(s,d.by.chapters[q.chapter].condition));
  const other=d.quests.filter(q=>q.type==='main'&&!pending.includes(q));
  return title('今日江湖','当前差事 · '+s.daily.date,'','quests')+
    `<section><h2 class="subhead">今日差事 · 已领取 ${s.daily.claimed.length}/3</h2>${daily.map(q=>questCard(s,d,q)).join('')}<div class="actions">${btn(s.daily.bonus?'今日额外酬劳已领':'领齐三份差事后的额外酬劳',{type:'dailyBonus'},'primary',s.daily.bonus||s.daily.claimed.length!==3)}</div></section>
    <section><h2 class="subhead">待办主线</h2>${pending.length?pending.map(q=>questCard(s,d,q)).join(''):'<p class="note">当前已开启的主线酬劳均已领取。</p>'}</section>`+journeyClues(s,d)+
    `<details class="fold-section" data-fold="other-quests"><summary>已领酬劳与后续主线 · ${other.length} 项</summary>${other.map(q=>questCard(s,d,q)).join('')}</details><p class="note">每日按本机日期更新，不重置主线。${nav('查看卷终目标','chronicle')}</p>`;
}
function chroniclePage(s,d){
  const current=activeChapter(s,d),journal=[...s.journal].reverse();
  const entries=list=>`<ul class="plain-list">${list.map(e=>`<li><time>${esc(new Date(e.at).toLocaleString('zh-CN'))}</time>${esc(e.text)}</li>`).join('')}</ul>`;
  const chapter=c=>`<section class="complete"><h2>第${c.number}卷 · ${esc(c.title)} · ${s.progress.flags[c.completeFlag]?'卷终':meets(s,c.condition)?'已开启':'待前卷完成'}</h2><p>${s.progress.flags[c.completeFlag]?esc(c.ending):c.number===5?'从三山联合营进入。整备、探路、一打、断援或断粮、二打、三打，最后安置归人；已有营建直接计入。':c.number===4?'从水泊盟亭进入，三路顺序自选。每寨通过一种方式结盟，聚义厅达到 3 级后联合守寨，不要求指定好汉。':c.number===3?'从金沙渡进入，完善寨子、打通粮木水路、守住寨门并立约。已有建设直接计入，不要求指定好汉。':c.number===2?'第一卷卷终后，从梁山渡口可前往东京。四段人物往事均完成后结卷，不要求已招募这四人。':'从郓城起步，相识、历练、聚义。'}</p><ol>${c.requirements.map(r=>`<li class="${meets(s,r.condition)?'progress-label':''}">${meets(s,r.condition)?'已成':'尚待'} · ${esc(r.label)}</li>`).join('')}</ol></section>`;
  return title('白泽梁山志','进度、目标与往事','','chronicle')+debriefPanel(s.lastBattle,d,esc)+(s.progress.flags.volume_five_complete?volumeSixBoard(s,d,btn):s.progress.flags.volume_four_complete?volumeFiveBoard(s,d,btn):s.progress.flags.volume_three_complete?volumeFourBoard(s,d,btn):volumeThreeBoard(s,d,btn))+chapter(current)+
    `<details class="fold-section" data-fold="overview"><summary>山寨概况与眼下线索</summary>${overview(s,d)}</details>`+journeyClues(s,d)+
    `<details class="fold-section" data-fold="other-chapters"><summary>其他篇章</summary>${d.chapters.filter(c=>c.id!==current.id).map(chapter).join('')}<p class="note">坐骑与专属招式已开放，可在好汉详情养成；寨子页已开放营建、募兵与远征。</p></details><h2 class="subhead">最近记事</h2>${entries(journal.slice(0,15))}
    ${journal.length>15?`<details class="fold-section" data-fold="older-journal"><summary>更早的记事 · ${journal.length-15} 条</summary>${entries(journal.slice(15))}</details>`:''}
    <p class="note">保留最近三百条详细记事；人物、主线与通关累计不会截断。建寨记事始于 ${esc(new Date(s.startedAt).toLocaleString('zh-CN'))}。</p>`;
}

function battlePage(s,d,paused,pauseReason,locked,battleSpeed=.5){
  if(s.battle.context.type==='lesson')return lessonBattlePanel(s,d,btn,paused,locked);
  const b=s.battle,seconds=at=>(Math.max(0,at-b.elapsed)/1000).toFixed(1),time=Math.floor(b.elapsed/1000),stopped=paused||locked,auto=battleSkillMode(s)==='auto';
  const skillButtons=u=>u.skills.map(id=>d.by.skills[id]).filter(k=>k.type!=='passive').map(k=>{
    const reason=skillReason(b,u,k);return `<div class="battle-skill">${btn(k.name+(u.training?' · '+u.training.levels[k.id]+'级':''),{type:'battleSkill',hero:u.id,id:k.id},'secondary',stopped||!!reason)}<p class="meta">${esc(reason||'可施展 · 怒气 '+k.cost)}</p></div>`;
  }).join('');
  return `<section class="live-battle">${title(b.context.type==='story'?d.by.stories[b.context.id].title+' · 剧情战':'阵前交战',b.guest?b.team.map(u=>u.name).join('、')+'临时助阵，战后不自动入寨':'普攻自动进行 · 技能与药物由你调度','','battle')}
    ${campaignBattleStatus(s)+journeyBattlePanel(b,btn,locked,esc)}${b.journey&&b.journey.rules!==2?`<p class="note">${JOURNEYS[b.journey.region].name} · 第 ${b.context.tier}/5 段 · 本趟战法：${b.journey.boons.map(id=>BOONS[id].name).join('、')}</p>`:''}${retreatForecast(b)}<div class="battle-transport"><p class="battle-state" role="status">${b.outcome?({victory:'此战得胜',defeat:'暂且收兵',retreat:'已撤出战斗'})[b.outcome]:stopped?'交战已暂停':'正在自动交战'}</p><span class="battle-time" aria-label="交战时长">${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}</span><div class="battle-running" ${b.outcome?'hidden':''}>${btn(paused?'继续交战':'暂停交战',{type:'ui_battlePause'},'secondary',locked)}${btn('撤退',{type:'battleRetreat'},'text-action',locked)}</div></div>
    <div class="battle-speed" role="group" aria-label="战斗速度"><span>战斗速度</span>${[.5,1,2].map(speed=>`<button class="secondary" data-command="${esc(JSON.stringify({type:'ui_battleSpeed',speed}))}" aria-pressed="${battleSpeed===speed}">${speed}×${speed===.5?' 慢速':''}</button>`).join('')}</div>
    ${b.expedition?`<p class="note">${b.expedition.troops?'随行乡勇 '+b.expedition.troops+' 人':'英雄独行'} · ${({balanced:'稳扎稳打',assault:'强攻破阵',guard:'结阵固守'})[b.expedition.tactic]} · 结算时统计伤兵。</p>`:''}
    <div class="skill-mode" role="group" aria-label="技能释放方式"><span>技能释放</span>${[['manual','手动技能'],['auto','自动技能']].map(([mode,label])=>`<button type="button" class="secondary" data-command="${esc(JSON.stringify({type:'battleSkillMode',mode}))}" aria-pressed="${battleSkillMode(s)===mode}" ${locked||b.outcome?'disabled':''}><span>${label}</span></button>`).join('')}</div>
    <p class="skill-mode-hint note">${auto?'自动技能：条件满足时优先已解锁进阶招，否则使用基础招；仍可手动抢先释放。':'手动技能：只自动普攻，招式由你点击释放。'}药品始终手动。本档记住选择。${b.rules!==2?'旧战局沿用原有招式规则，收兵后的新战斗启用养成。':''}</p>
    <p class="battle-hint note">${stopped&&!b.outcome?esc(pauseReason||'点击继续交战后，双方才会继续出手。'):'双方按各自速度持续普攻；技能共用人物调息，不会自动消耗药物。'}</p>
    ${personalProgressPanel(b,esc)}${objectivePanel(b)}${ordersPanel(s,d,btn,esc,locked)}<div class="battle-grid">${[['我方',b.team],['敌方',b.enemy]].map(([label,units])=>`<section><h2 class="subhead">${label}</h2>${units.map(u=>`<div class="battle-unit${u.hp<=0?' unit-down':''}" data-unit="${esc(u.id)}"><div class="ledger-line">${u.side==='team'?portrait(d.by.heroes[u.id],true):''}<strong>${esc(u.name)}</strong><span>${u.hp}/${u.maxHp}${b.journey?.combat?.shields[u.id]?` · 盾 ${b.journey.combat.shields[u.id]}`:''}</span></div><progress value="${u.hp}" max="${u.maxHp}" aria-label="${esc(u.name)}气血"></progress><p class="meta">怒气 ${u.rage}/100 · ${u.hp<=0?'已退阵':b.outcome?'已收势':'出手 '+seconds(u.nextAttackAt)+'秒'}</p><p class="unit-status">${u.statuses.map(v=>`【${statusName(v.id)} ${seconds(v.expiresAt)}秒】`).join('')||'—'}</p>${u.side==='team'?skillButtons(u):`<p class="enemy-intent">${u.hp<=0||b.outcome?'':u.boss?.pendingAt?'首领蓄势 · '+seconds(u.boss.pendingAt)+'秒（可打断）':hasStun(u)?'眩晕中，暂不能出手':esc(enemySkill(b,u,d)?.name||'普通进击')}</p>`}</div>`).join('')}</section>`).join('')}</div>
    <section class="battle-medicines battle-running" ${b.outcome?'hidden':''}><h2 class="subhead">阵中用药</h2><div class="medicine-grid">${BATTLE_ITEMS.map(id=>{const q=battleItemQuote(s,d,id);return `<div>${btn(d.by.items[id].name+' ×'+(s.inventory[id]||0),{type:'battleItem',id},'secondary',stopped||!!q.reason)}<p class="meta">${esc(q.reason||'交给'+q.target.name)}</p></div>`;}).join('')}</div><p class="note">药效立即生效，不占用普攻；药物共用 3 秒间隔，基础招调息 5 秒，进阶招调息 7 秒（共用人物调息）。暂停时冷却也停止。</p></section>
    <div class="battle-end actions" ${b.outcome?'':'hidden'}>${btn(b.outcome==='victory'?'收获战果，继续前行':'收兵，再作安排',{type:'finishBattle'},'primary',!b.outcome||locked)}</div>
    </section>`;
}
function hasStun(u){return u.statuses.some(s=>s.id==='stun');}
function schemePage(s,d){const q=s.scheme,m=d.by.schemes[q.id];return title(m.name,'察看暑热与人心 · 第 '+q.turn+' / '+m.maxTurns+' 次安排','','scheme')+`<section class="location"><p class="prose">${q.values.alert>=50?'杨志握紧了刀柄，目光一直追着酒担。':q.values.fatigue>=60?'军汉汗流浃背，几乎抬不起担子。':q.values.trust>=50?'军汉看着枣客饮酒，神色渐缓。':'军汉虽想歇脚，杨志却仍紧盯四周。'}</p><p class="note">你看不到人心的刻度，只能从言行作判断。先等暑热与疲劳，再以自然的举动消去疑心。</p></section><div class="actions">${q.outcome?btn(q.outcome==='success'?'收下信物，记入梁山志':'退出重整计策',{type:'finishScheme'},'primary'):m.choices.map(c=>btn(c.label,{type:'scheme',id:c.id},'secondary')).join('')+btn('判断时机已到，收网',{type:'scheme',id:'finish'},'primary')+btn('暂退',{type:'scheme',id:'retreat'})}</div>`;}
function eventPage(s,d){const e=d.by.events[s.event.id];return title(e.name,'路上际遇','','event')+`<section class="location"><p class="prose">${esc(e.text)}</p><div class="actions">${e.options.map(c=>btn(c.label,{type:'eventChoice',id:c.id},'secondary')).join('')}</div></section>`;}

function overview(s,d){
  const owned=Object.values(s.heroes).filter(h=>h.status==='owned').length,chapter=activeChapter(s,d),next=d.quests.find(q=>q.type==='main'&&q.chapter===chapter.id&&!s.progress.claims.includes(q.id)&&!questReady(s,q));
  return `<section class="overview"><h2 class="subhead">此刻的梁山</h2>${[['寨主',s.player.title],['正式好汉',owned+' / '+d.heroes.length],['探访地点',s.progress.visited.length+' / '+d.maps.length],['历练得胜',(s.stats.clears||0)+' 回'],['威望',s.player.prestige],['功勋',s.player.merit],['当前据点',s.player.liangshanLevel?'梁山初立':'尚未落脚']].map(([a,b])=>`<div class="ledger-line"><span>${a}</span><b>${esc(b)}</b></div>`).join('')}
    <h2 class="subhead">眼下线索</h2><p>${esc(next?.description||(s.progress.flags[chapter.completeFlag]?'本卷已完成，可领取未领酬劳，或继续历练、招贤。':'继续沿地图探路，也可到差事页领取已办妥的酬劳。'))}</p>
    ${!owned?'<p>先到郓城酒肆与白胜交谈，可邀他引路。临时助阵不等于正式入寨。</p>':''}${nav('查看差事','quests')}</section>`;
}
function pageResources(s,screen){
  const rows={camp:[['碎银',s.player.silver],['体力',s.player.stamina+'/'+staminaCap(s)]],map:[['体力',s.player.stamina+'/'+staminaCap(s)],['出阵',s.team.length+'/3']],heroes:[['已入寨',Object.values(s.heroes).filter(h=>h.status==='owned').length+' 位'],['经验丹',s.inventory.exp_pill||0]],bag:[['碎银',s.player.silver],['体力',s.player.stamina+'/'+staminaCap(s)]],forge:[['碎银',s.player.silver],['精铁',s.inventory.iron||0],['强化符',s.inventory.strength_charm||0]],quests:[['威望',s.player.prestige],['功勋',s.player.merit]]}[screen]||[];
  return rows.length?`<div class="resources" aria-label="当前功能相关资源">${rows.some(([name])=>name==='体力')?btn('补充体力',{type:'ui_section',view:'bag',id:'supplies'}):''}${rows.map(([name,value])=>`<span>${icon(({体力:'energy',出阵:'heroes',已入寨:'heroes',经验丹:'medicine',碎银:'coins',精铁:'forge',强化符:'ticket',威望:'medal',功勋:'medal'})[name])}<span>${name}</span><b>${value}</b></span>`).join('')}</div>`:'';
}
export function render({state:s,data:d,view,status='',error='',locked=false,notice='',recruitTarget='',entered=true,battlePaused=false,battlePauseReason='',saveBox={},activity=null,battleSpeed=.5,mapTarget=null,mapSection='story',pageSections={},roster={},leaderboard={},gear={}}){
  const busy=isBusy(s),tabs=[['camp','寨子'],['map','江湖'],['realm','山河'],['heroes','好汉'],['trials','历练'],['bag','行囊'],['recruit','招贤'],['forge','打造'],['quests','差事'],['chronicle','梁山志'],['save','存档']];
  const screen=['welcome','save','chronicle','menu'].includes(view)?view:s.battle?'battle':s.scheme?'scheme':s.event?'event':view;
  let content=screen==='realm'?realmPanel(s,d,esc,btn,pageSections.realm):screen==='trials'?rotationsPage(s,d,esc,btn,leaderboard,pageSections.trials):screen==='camp'?campPage(s,d,esc,btn,pageSections.camp):screen==='save'?saveBoxPage(s,status,locked,saveBox,pageSections.save):screen==='chronicle'?chroniclePage(s,d):screen==='battle'?battlePage(s,d,battlePaused,battlePauseReason,locked,battleSpeed):screen==='scheme'?schemePage(s,d):screen==='event'?eventPage(s,d):screen==='heroes'?heroesPage(s,d,roster,pageSections.heroes):screen==='bag'?bagPage(s,d,gear,pageSections.bag):screen==='forge'?forgePage(s,d,gear,pageSections.forge):screen==='recruit'?recruitPage(s,d,recruitTarget,roster,pageSections.recruit):screen==='quests'?questsPage(s,d):mapPage(s,d,mapTarget,mapSection);
  if(screen==='menu')content=title('全部功能','选择后直接进入')+'<div class="function-grid main-function-grid">'+tabs.map(([id,label])=>'<button type="button" class="secondary" data-view="'+id+'" '+(busy&&!['map','save','chronicle'].includes(id)?'disabled':'')+'>'+icon(id)+'<span>'+label+'</span></button>').join('')+'</div>';
  if(screen==='welcome')content=`<section class="intro opening"><p class="kicker">水泊梁山 · 白手立寨</p><h1>从一座寨子开始。</h1><div class="intro-line" aria-hidden="true"></div><div class="opening-lines"><p>先安顿乡人，修农田、伐木场与兵营。</p><p>再聚英雄，带兵出征，或单骑走江湖。</p><div class="camp-faces">${['baisheng','wusong','linchong','wuyong'].map(id=>portrait(d.by.heroes[id])).join('')}</div></div><div class="opening-actions">${btn('立寨，开一番事业',{type:'ui_start'},'primary')}${nav('接续旧卷','save')}</div><p class="note">从营建到出征，由你安排。立寨后开始本机保存。</p></section>`;
  const active=['battle','scheme','event'].includes(screen)?'map':screen;
  const prologue=screen==='welcome'||(!entered&&screen==='save'),arrival=screen==='map'&&isFirstArrival(s);
  const navigation=`<nav class="tabs" aria-label="游戏页面">${tabs.map(([id,label])=>`<button type="button" data-view="${id}" aria-current="${active===id?'page':'false'}" ${busy&&!['map','save','chronicle'].includes(id)?'disabled':''}>${icon(id)}<span>${label}</span></button>`).join('')}<button type="button" class="mobile-menu-nav" data-view="menu" aria-current="${!['camp','map','heroes','bag'].includes(active)?'page':'false'}"><span aria-hidden="true">☷</span><span>更多</span></button></nav>`;
  const entries=activity||[...s.journal.slice(-200).map((e,id)=>({...e,id,kind:'journey'})),...(notice?[{id:'notice',text:notice,at:s.clock,kind:'journey'}]:[])];
  return `<div class="shell focus-layout viewport-shell${screen==='battle'?' in-battle':''}${prologue?' prologue-layout':arrival?' arrival-layout':''}">
    <header class="masthead"><div class="brand"><span class="seal" aria-hidden="true">白泽</span><strong>白泽水浒</strong></div><div class="mast-links"><span class="edition">v${esc(d.config.release)}</span><a href="../">返回导航</a></div></header>
    <div class="resource-strip">${prologue?'<span class="strip-note">一页文字 · 六卷江湖</span>':pageResources(s,screen)||'<span class="strip-note">只看眼前事 · 江湖留痕于日志</span>'}</div>
    <div class="layout viewport-layout">
      <aside class="rail" id="game-navigation">${prologue?'<p class="prelude-navigation">尚未入卷<br>可先接续旧卷</p>':navigation}</aside>
      <main class="main" id="main" tabindex="-1" data-screen="${esc(screen)}">
        ${error?`<div class="notice error" role="alert">${esc(error)}</div>`:''}
        ${screen!=='save'&&(locked||(status&&!status.startsWith('已保存')&&screen!=='welcome'))?`<p class="warning" role="status">${esc(status)}</p>`:''}
        ${content}
        ${!entered&&screen==='save'&&!locked?nav('返回卷首','welcome'):''}
      </main>
      ${activityPanel(entries,!prologue)}
    </div>
    <footer class="footer"><span>${locked?'存档冲突 · 请到存档页处理':status.startsWith('已保存')?'已保存到本机':prologue?'独立本机存档':'尚未保存 · 请先导出进度'}</span>${prologue?'<span>水泊经营 · 无付费</span>':nav('存档管理','save')}</footer>
  </div>`;
}
function activityPanel(entries,available){
  const labels={journey:'江湖',battle:'交战',scheme:'计策'};
  return `<aside class="activity-panel" id="activity-panel" aria-labelledby="activity-title">
    <header class="activity-heading"><button type="button" class="log-toggle" data-log-toggle aria-controls="activity-log" aria-expanded="false">展开日志</button><h2 id="activity-title">${icon('chronicle')}<span>江湖日志</span></h2><button type="button" class="log-latest" data-log-latest aria-label="日志回到最新">${icon('download')}<span>回到最新</span></button></header>
    <div class="log-controls"><button type="button" data-log-pause>冻结阅读</button><button type="button" data-log-filter>查看完整战报</button></div>
    <div class="activity-list" id="activity-log" role="log" aria-live="off" aria-label="江湖与交战日志" tabindex="0">
      ${available&&entries.length?entries.map(e=>`<article class="activity-entry" data-log-entry="${esc(e.id)}"><p class="activity-meta"><span>${labels[e.kind]||'江湖'}</span><time>${esc(new Date(e.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))}</time></p><p class="activity-text">${esc(e.text)}</p></article>`).join(''):'<p class="activity-empty">江湖尚静，等你落笔。<br>入卷后的经历会记在这里。</p>'}
    </div>
    <p class="activity-caption" id="activity-caption">江湖日志 · 可回到最新</p>
  </aside>`;
}
export function importDialog(state){return `<dialog id="import-confirm" aria-labelledby="import-title"><h2 id="import-title">确认接续这份梁山志？</h2><p>此存档记录到 ${esc(new Date(state.clock).toLocaleString('zh-CN'))}。</p><p>威望 ${state.player.prestige}，正式好汉 ${Object.values(state.heroes).filter(h=>h.status==='owned').length} 名。</p><p class="note">确认后替换当前游戏进度，并备份原来的有效存档。不影响学习系统。建议先导出当前进度。</p><div class="actions">${btn('确认导入并替换',{type:'ui_confirmImport'},'primary')}${btn('取消',{type:'ui_cancelImport'},'secondary')}</div></dialog>`;}
export function recruitDialog(result,data){
  if(Array.isArray(result))return recruitBatchDialog(result,data,esc,portrait);
  const hero=data.by.heroes[result.hero],joined=result.kind==='joined';
  const label=joined?'好汉入寨':result.kind==='duplicate'?'故友来访':'英雄传闻';
  const copy=joined?(result.inTeam?'已正式加入梁山，并补入当前出阵队伍。':'已正式加入梁山。当前队伍已满，可到好汉页调整阵容。'):result.kind==='duplicate'?'这位好汉已在寨中，本次相逢转为信物与功勋，不会重复增加人数。':'尚未与你相识，本次带回的是线索与信物，并未入寨。';
  const cost=result.target?data.by.heroes[result.target].name+'专属招贤令':'普通招贤令';
  return `<dialog id="recruit-result" class="recruit-result" aria-labelledby="recruit-result-title" aria-describedby="recruit-result-description">
    <button type="button" class="result-close" data-result-action="close" aria-label="关闭招贤结果">×</button>
    <p class="kicker">招贤馆 · ${result.target?'专属相邀':'英雄来信'}</p>
    <h2 id="recruit-result-title" tabindex="-1">${label}</h2>
    <div class="result-hero">${portrait(hero)}<span class="result-seal" aria-hidden="true">${joined?'义':result.kind==='duplicate'?'缘':'信'}</span><p class="result-stars" aria-label="${hero.star}星好汉">${'★'.repeat(hero.star)}</p><p class="result-name">${esc(hero.name)}</p><p class="result-title">${esc(hero.title)}</p></div>
    <p id="recruit-result-description">${copy}</p>
    ${result.tokens?`<div class="result-rewards"><p>${esc(data.by.items[result.hero+'_token'].name)} <strong>×${result.tokens}</strong></p>${result.merit?`<p>功勋 <strong>+${result.merit}</strong></p>`:''}</div>`:''}
    ${result.kind==='clue'?`<p class="note">可在${esc(data.by.maps[hero.meetMap].name)}继续寻访，按当地交谈或剧情提示相识。十枚信物可合成专属令，相识后再行专属招贤。</p>`:''}
    ${result.target&&result.target!==result.hero?`<p class="note">此番所邀：${esc(data.by.heroes[result.target].name)}；回应来访者：${esc(hero.name)}。本次结果遵循现有专属招贤规则。</p>`:''}
    <p class="meta">本次消耗：${esc(cost)} ×1 · 第 ${result.number} 次招贤</p>
    <p id="recruit-result-save" class="note" role="status"></p>
    <div class="actions result-actions"><button type="button" class="primary with-icon" data-result-action="close">${icon('check')}<span>知道了</span></button><button type="button" class="secondary with-icon" data-result-action="heroes">${icon('heroes')}<span>查看好汉</span></button></div>
  </dialog>`;
}
