import {dungeonArt} from './dungeon-art-ui.js?v=0.91.0';
import {itemArt} from './item-art-ui.js?v=0.91.0';
import {renderBattleStage} from './battle-stage-ui.js?v=0.91.0';
import {companionHub} from './region-companions-ui.js?v=0.91.0';
import {heroAptitude,starPosition,aptitudeBadge} from './hero-aptitude.js?v=0.91.0';
import {recruitBannerPanel} from './recruit-banner-ui.js?v=0.91.0';
import {recruitmentBanner,recruitStar} from './recruitment-banner.js?v=0.91.0';
import {heroTier,tierBadge} from './hero-tiers.js?v=0.91.0';
import {sourceBrowser,currentGoalPage} from './source-ui.js?v=0.91.0';
import {workPanels} from './work-panels.js?v=0.91.0';
import {battleField} from './battle-field-ui.js?v=0.91.0';
import {regionPanel} from './exploration-ui.js?v=0.91.0';
import {guidance,guidePanel} from './onboarding.js?v=0.91.0';
import {journeyScenePage,journeySceneEntry,journeyScenePicture,schemeScenePage} from './journey-scenes-ui.js?v=0.91.0';
import {hasJourneyScene} from './journey-scenes.js?v=0.91.0';
import {selectedHonor} from './adventure.js?v=0.91.0';
import {returnToEncounter} from './progression-paths-ui.js?v=0.91.0';
import {replayChallengePanel} from './replay-challenges.js?v=0.91.0';
import {battleThreatPanel} from './battle-threat-ui.js?v=0.91.0';
import {phasePanel,starterPanel,budgetPanel,replacementPanel} from './progression-paths-ui.js?v=0.91.0';
import {buildGuidePanel,gearTraitLine} from './tactics-ui.js?v=0.91.0';
import {refinePanel} from './equipment-refine.js?v=0.91.0';
import {forgeCatalog} from './forge-catalog.js?v=0.91.0';
import {resourceLinks} from './resource-dungeons-ui.js?v=0.91.0';
import {lateMissionCard,lateBattleStatus} from './late-mainline-ui.js?v=0.91.0';
import {lateStory,chapterStory} from './late-mainline-data.js?v=0.91.0';
import {lateMainlineBoard,chapterIntroduction,lateEndingText} from './late-mainline-board.js?v=0.91.0';
import {mainlinePlanPanel} from './mainline-ui.js?v=0.91.0';
import {volumeSevenBoard,seventhMissionCard} from './volume-seven-ui.js?v=0.91.0';
import {chronicleGearMultiplier} from './chronicle-data.js?v=0.91.0';
import {inventoryBrowser} from './inventory-ui.js?v=0.91.0';
import {heroDossier} from './folio-ui.js?v=0.91.0';
import {campaignBattleStatus} from './journey-campaign-ui.js?v=0.91.0';
import {roleCard,roleBattlePanel} from './hero-roles.js?v=0.91.0';
import {lessonBattlePanel} from './opening-ui.js?v=0.91.0';
import {journeyBattlePanel} from './journey-tactics-ui.js?v=0.91.0';
import {BOONS,JOURNEYS} from './journey-data.js?v=0.91.0';
import {personalProgressPanel} from './personal-tasks.js?v=0.91.0';
import {storyGuide,storyObjective} from './story-guide.js?v=0.91.0';
import { recruitSupportPanel } from './recruit-support-ui.js?v=0.91.0';
import {CORPS} from './development.js?v=0.91.0';
import {pageSection,sectionNavigation,sectionPicker} from './page-sections.js?v=0.91.0';
import { frontierMap } from './frontier-ui.js?v=0.91.0';
import {personalTaskPanel} from './expansion-ui.js?v=0.91.0';
import { retreatForecast } from './fieldcraft-ui.js?v=0.91.0';
import { volumeSixBoard, sixthMissionCard } from './volume-six-ui.js?v=0.91.0';
import {staminaPanel,inventoryPanel,recipePanel,provisionSources} from './provisions-ui.js?v=0.91.0';
import { staminaCap } from './logistics.js?v=0.91.0';
import { isExternal, isWanderer } from './roster.js?v=0.91.0';
import { fifthMissionCard, fifthLocalHelp, volumeFiveBoard } from './volume-five-ui.js?v=0.91.0';
import { fourthMissionCard, fourthLocalHelp, volumeFourBoard } from './volume-four-ui.js?v=0.91.0';
import { chapterMissionCard, thirdLocalHelp, volumeThreeBoard } from './volume-three-ui.js?v=0.91.0';
import { chroniclePanel } from './hero-chronicles.js?v=0.91.0';
import { progressionPanel, experienceLabel } from './progression-ui.js?v=0.91.0';
import { debriefPanel } from './sortie-ui.js?v=0.91.0';
import { batchButtons } from './batch-ui.js?v=0.91.0';
import { equipmentComparison } from './management-ui.js?v=0.91.0';
import { objectivePanel } from './strategy-ui.js?v=0.91.0';
import { ordersPanel, equipmentFilters, recruitBatchDialog } from './commands-ui.js?v=0.91.0';
import { equipmentMatches } from './commands.js?v=0.91.0';
import { corpsPanel, presetsPanel, targetPanel, setPanel, setsCatalog } from './development-ui.js?v=0.91.0';
import {talentPanel} from './talents.js?v=0.91.0';
import { realmPanel } from './realm-ui.js?v=0.91.0';
import { rotationsPage } from './rotations-ui.js?v=0.91.0';
import { traitCard } from './martial-ui.js?v=0.91.0';
import { helpersBoard } from './helpers-ui.js?v=0.91.0';
import { rosterBoard, qualityPanel, qualityTrials, invitation } from './roster-ui.js?v=0.91.0';
import { qualityOf, QUALITIES } from './quality.js?v=0.91.0';
import { worldMap, localBenefit } from './world-map-ui.js?v=0.91.0';
import { saveBoxPage } from './savebox-ui.js?v=0.91.0';
import { attributes } from './hero.js?v=0.91.0';
import { exits, meets, heroRank, dungeonEntry } from './map.js?v=0.91.0';
import { isBusy, questReady } from './core.js?v=0.91.0';
import { statusName, skillReason, battleItemQuote, enemySkill, BATTLE_ITEMS, battleSkillMode } from './battle.js?v=0.91.0';
import { strengthenQuote } from './item.js?v=0.91.0';
import { icon, actionIcon } from './icons.js?v=0.91.0';
import { heroStewardCard } from './camp-development-ui.js?v=0.91.0';
import { heroGrowth, growthSources, stableMounts, dungeonMountLoot } from './growth-ui.js?v=0.91.0';
import { campPage, portrait } from './camp-ui.js?v=0.91.0';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
// Story prose and rule paragraphs share escaping, but have distinct visual weight.
const storyParagraphs=text=>String(text||'').split(/\n\s*\n/).filter(Boolean).map(part=>{const rule=part.startsWith('（')&&part.endsWith('）');return '<p class="'+(rule?'note story-rules':'prose')+'">'+esc(rule?part.slice(1,-1):part)+'</p>';}).join('');
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
    if(!p)return model.map===s.location&&meets(s,model.condition)?`<article class="card"><h2>${esc(model.title)}</h2>${btn(/^v[34567]_/.test(id)?'查看此地事务':'开始剧情',{type:'story',id})}</article>`:'';
    const step=model.steps[p.step];if(step.map!==s.location)return '';if(!meets(s,step.condition))return `<article class="card"><h2>${esc(model.title)}</h2><p>${esc(step.hint||'还有前面的事情没办完，可查看主线指引。')}</p></article>`;
    return `<article class="card"><p class="kicker">${esc(model.title)} · 进行中</p>${storyParagraphs(step.text)}${step.choices.some(c=>c.battle)?(lateStory(id)?lateMissionCard(s,d,id,esc):id.startsWith('v7_')?seventhMissionCard(s,d,id):id.startsWith('v6_')?sixthMissionCard(s,d,id):id.startsWith('v5_')?fifthMissionCard(s,d,id):id.startsWith('v4_')?fourthMissionCard(s,d,id):chapterMissionCard(s,d,id)):''}<div class="actions">${step.choices.map(c=>btn(c.label,{type:chapterStory(id)&&c.battle?'chapterBattle':'story',id,choice:c.id},'primary',!meets(s,c.condition))).join('')}</div></article>`;
  }).join('');
}
export function isFirstArrival(s){return s.location==='yuncheng'&&s.progress.visited.length===1&&s.progress.visited[0]==='yuncheng'&&s.recruit.total===0&&Object.values(s.heroes).every(h=>h.status==='unknown')&&!Object.keys(s.progress.actions).length&&!Object.keys(s.progress.flags).length;}
function locationScene(s,d){
  const m=d.by.maps[s.location],links=exits(s,d),paths=list=>list.map(l=>btn(d.by.maps[l.target].name,{type:'move',id:l.target})).join('');
  if(m.id!=='yuncheng')return `<section class="location">${storyParagraphs(m.description)}<p class="subhead">可往何处</p><div class="paths">${paths(links)}</div></section>`;
  const doors=[
    ['tavern','酒肆传闻','酒肆门口，一个汉子放下酒担，招呼你进去喝一碗。','event'],
    ['office','县衙告示','新贴的榜文前围着行人，差役说起冈上的虎患。','quests'],
    ['gate','江湖消息','城门边的行脚客刚歇下担子，带来东溪村的消息。','map']
  ];
  return `<section class="location town-scene">${storyParagraphs(m.description)}<h2 class="subhead">${isFirstArrival(s)?'城中去处':'郓城县'}</h2><div class="story-doors">${doors.filter(([id])=>links.some(l=>l.target===id)).map(([id,label,copy,symbol])=>`<button type="button" class="story-door" data-command="${esc(JSON.stringify({type:'move',id}))}" aria-label="${label}">${icon(symbol)}<span><strong>${label}</strong><span>${copy}</span></span><span class="door-arrow" aria-hidden="true">›</span></button>`).join('')}</div><details class="fold-section" data-fold="city-paths"><summary>城中去处</summary><p class="note">街上有铁铺、马厩和招贤馆。</p><div class="paths">${paths(links.filter(l=>!doors.some(([id])=>id===l.target)))}</div></details></section>`;
}
function localVoices(s){
  if(s.location==='office')return `<article class="town-notice"><p class="kicker">郓城县衙 · 榜文</p><h2>县衙告示</h2><p class="prose">近闻景阳冈虎患伤人，过往客商须结伴而行，切莫贪赶夜路。</p><p class="note">榜文边缘被雨水泡皱，下面还压着几张旧告示。</p></article>`;
  if(s.location==='gate')return `<article class="card"><h2>江湖消息</h2><p class="prose">行脚客拢了拢草鞋：“东溪村的晁保正，待客最是仗义。若往景阳冈走，可得先打听清楚山路。”</p><p class="note">${s.progress.flags.dongxi_rumor?'你已听掌柜说过溪边乡路，可以往东溪村访客，也可沿官道去探景阳冈的消息。':'官道通向景阳冈；东溪村的乡路还不熟，不妨先回郓城酒肆，向掌柜打听东溪村。'}</p></article>`;
  if(s.location==='tavern')return '<h2 class="subhead">酒肆传闻</h2><p class="note">邻桌正在谈论东溪村，卖酒的汉子也凑过来听。</p>';
  return '';
}
function searchCard(s){return `<article class="card"><h2>江湖寻访</h2><p class="note">寻访耗体力 2；每处际遇每日一次。今日已访 ${s.daily.counters.search||0}/12 回。等候可改变游戏昼夜，不加速真实体力恢复。</p><div class="actions">${btn('四下寻访',{type:'search'},'secondary',s.player.stamina<2||(s.daily.counters.search||0)>=12)}${btn('等候半日',{type:'wait'})}</div></article>`;}
const journeySections={region:'区域探索',story:'剧情行路',atlas:'江湖地图',explore:'当地探索',territory:'领地据点'};
function journeyNavigation(s,d,section){return '<nav class="journey-sections" aria-label="江湖功能分区">'+Object.entries(journeySections).map(([id,label])=>'<button type="button" data-map-section="'+id+'" aria-current="'+(section===id?'page':'false')+'">'+label+'</button>').join('')+'</nav><p class="journey-location">当前所在：'+esc(d.by.maps[s.location].name)+'</p>';}
function continuingStories(s,d){const rows=d.stories.filter(m=>s.progress.stories[m.id]?.status==='active').filter(m=>m.steps[s.progress.stories[m.id].step]?.map!==s.location);if(!rows.length)return '';return '<section class="journey-next"><h2 class="subhead">接下来去哪里</h2>'+rows.map(m=>{const step=m.steps[s.progress.stories[m.id].step];return '<p><b>'+esc(m.title)+'</b> · '+esc(d.by.maps[step.map].name)+'</p>'+(step.hint?'<p class="note">'+esc(step.hint)+'</p>':'')+btn('查看路线 · '+d.by.maps[step.map].name,{type:'ui_mapInspect',id:step.map},'secondary');}).join('')+'</section>';}
function localStoryPage(s,d){const m=d.by.maps[s.location],completed=m.stories.filter(id=>s.progress.stories[id]?.status==='completed');return '<section id="map-local">'+storyGuide(s,d,esc,btn,false,true)+title(m.name+' · 剧情',m.region+' · '+(s.worldMinute>=1080||s.worldMinute<360?'夜色渐深':'白日行路'),'卷'+(d.by.chapters[m.chapter]?.number||1))+journeyScenePicture(s.location,esc,true)+
  '<div class="journey-story" id="journey-story">'+storyCards(s,d)+
  '<details class="local-optional" data-fold="local-optional"><summary>当地人物与传闻</summary>'+m.actions.filter(a=>meets(s,a.condition)&&(!a.once||!s.progress.actions[a.id])).map(a=>btn(a.label,{type:'mapAction',id:a.id},'secondary')).join(' ')+
  d.heroes.filter(h=>h.meetMap===s.location&&meets(s,h.meetCondition)&&heroRank[s.heroes[h.id].status]<2).map(h=>btn(h.id==='baisheng'?'与卖酒汉子交谈':h.id==='shiqian'?'与窗边瘦汉交谈':'与'+h.title+'交谈',{type:'meet',id:h.id})).join(' ')+
  (s.location==='tavern'&&s.heroes.baisheng.status==='known'&&!s.progress.flags.guide?'<article class="card"><h2>乡人相助</h2><p>白胜放下酒担：“这一带我熟，要去哪儿？我带路。”</p>'+btn('邀白胜作向导',{type:'guide'},'primary')+'</article>':'')+
  '</details>'+ (s.location==='ridge'&&s.progress.flags.seven_stars&&!s.progress.flags.huangni_complete?'<article class="card"><h2>智取生辰纲</h2><p>吴用叫众人到树荫下，商议如何让押纲军士喝下药酒。</p>'+btn('商议计策',{type:'startScheme'},'primary')+'</article>':'')+'</div>'+
  fifthLocalHelp(s)+fourthLocalHelp(s)+thirdLocalHelp(s,d)+continuingStories(s,d)+'<details data-fold="local-roads"><summary>自由行路与地点介绍</summary>'+locationScene(s,d)+localVoices(s)+'</details>'+
  (s.location==='forge'?nav('进入打造与强化','forge'):s.location==='recruit'?nav('进入招贤','recruit'):s.location==='office'?nav('查看主线与今日差事','quests'):s.location==='stable'?nav('为好汉领骑与养成','heroes'):'')+
  (completed.length?'<details class="fold-section" data-fold="local-completed"><summary>此地已完成的往事 · '+completed.length+'</summary>'+completed.map(id=>'<p class="note">'+esc(d.by.stories[id].title)+'已记入梁山志。</p>').join('')+nav('查看梁山志','chronicle')+'</details>':'')+'</section>';}
function localExplorationPage(s,d){const m=d.by.maps[s.location];return '<section id="map-explore">'+title(m.name+' · 探索','探访酬谢、坐骑与当地副本')+localBenefit(s,btn)+(s.location==='stable'?stableMounts(s,d,esc,btn):'')+m.dungeons.map(id=>{const x=d.by.dungeons[id],open=dungeonEntry(s,x);return `<article class="card"><h2 class="dungeon-title">${dungeonArt('story',x.id,{map:x.map})}<span>${esc(x.name)} <span class="badge">历练</span></span></h2><p class="note">${esc(x.description)}</p>${dungeonMountLoot(s,d,id,esc)}<p class="meta">队中一人达到 ${x.level}级 · 体力 ${x.cost} · 今日 ${s.daily.dungeons[id]||0}/${x.limit} 次</p>${btn(open?'开始历练':'需先完成此地剧情',{type:'dungeon',id},'secondary',!open||s.team.length===0||Math.max(...s.team.map(id=>s.heroes[id].level))<x.level||(s.daily.dungeons[id]||0)>=x.limit||s.player.stamina<x.cost)}</article>`;}).join('')+searchCard(s)+'</section>';}
function mapPage(s,d,mapTarget,mapSection='story',sceneRequest){const section=Object.prototype.hasOwnProperty.call(journeySections,mapSection)?mapSection:'story';return journeyNavigation(s,d,section)+'<div class="journey-content" data-journey-section="'+section+'">'+(section==='region'?regionPanel(s,d,esc,btn,sceneRequest):section==='atlas'?worldMap(s,d,mapTarget,esc,btn):section==='explore'?localExplorationPage(s,d):section==='territory'?'<section class="realm-map-link"><h2>地区商情与势力</h2><p>三路治安、商会关系与委托在山河经营中查看。</p>'+nav('前往山河经营','realm')+'</section>'+ (frontierMap(s,d,esc,btn)||'<p class="note">先建立寨子，再开办经营拓土。</p>'):mapSection==='scene'&&hasJourneyScene(s.location)?journeyScenePage(s,d,esc,btn,portrait,sceneRequest):journeySceneEntry(s,esc,btn)+localStoryPage(s,d))+'</div>';}
function heroCard(s,d,h,mode='all'){
  const v=s.heroes[h.id],owned=v.status==='owned';
  if(['training','corps','quality','skills','talents'].includes(mode)){
   const panels={training:()=>workPanels('培养内容',[['升级',stats(attributes(s,h.id,d))+progressionPanel(s,d,h.id,true)+'<div class="actions">'+[1,5,10].map(count=>btn('用 '+count+' 颗',{type:'ui_batchPreview',kind:'experience',id:h.id,count},count===1?'primary':'secondary',!s.inventory.exp_pill||v.level>=d.config.balance.heroLevelCap)).join('')+btn('演武传习',{type:'ui_campJump',id:'camp-mentorship'},'secondary')+'</div>'],['成长与预算',progressionPanel(s,d,h.id)],['人物本领',roleCard(h.id)]]),corps:()=>corpsPanel(s,d,h,btn),quality:()=>qualityPanel(s,d,h,esc,btn),skills:()=> (isWanderer(h)?btn('3 枚信物 → 专属招式书',{type:'skillBook',id:h.id,source:'tokens'},'secondary',(s.inventory[h.id+'_token']||0)<3):'')+heroGrowth(s,d,h,esc,btn)+'<details data-fold="growth-sources"><summary>材料来源</summary>'+growthSources(s,d,esc,btn)+'</details>',talents:()=>workPanels('本领分工',[['战斗本领',traitCard(h)+talentPanel(s,d,h,btn)],['装备套装',setPanel(s,d,h.id)],['寨中任职',heroStewardCard(s,d,h,btn)]])};
   return '<article class="card hero-card focused-hero">'+portrait(h,true)+'<h2>'+esc(h.name)+' · '+v.level+'级 '+aptitudeBadge(h)+'</h2>'+(owned?panels[mode]():invitation(s,h,btn,d))+'</article>';
  }
  if(mode==='overview')return heroDossier(s,d,h,esc,btn,portrait,invitation);
  if(mode==='tasks')return '<article class="card hero-card">'+portrait(h)+'<h2>'+esc(h.title)+' · '+esc(h.name)+'</h2><p class="meta">'+(isWanderer(h)?'江湖散人 · 不占正册座次':isExternal(h)?'外传人物 · 不占正册座次':h.starSign+' · 第 '+h.seat+' 席')+' · '+statusLabels[v.status]+(owned?' · '+experienceLabel(v,d.config.balance.heroLevelCap):'')+'</p>'+(mode==='tasks'?btn('信物来源',{type:'ui_sources',id:h.id+'_token'},'secondary')+(owned?personalTaskPanel(s,d,h,btn)+'<details data-fold="hero-record-'+h.id+'"><summary>成长记录与奖励</summary>'+chroniclePanel(s,d,h,btn)+'</details>':'<p>此人入寨后可查看人物任务。</p>')+'<details data-fold="hero-biography-'+h.id+'"><summary>人物往事</summary><p>'+esc(h.story)+'</p>'+heroArc(s,d,h.id)+'</details>':(owned?stats(attributes(s,h.id,d)):invitation(s,h,btn))+'<p class="note">'+esc(h.story)+'</p>'+'<p class="note">专属兵种：'+esc(CORPS[h.id]?.name||'待查')+'</p>'+btn('查看培养与兵种',{type:'ui_section',view:'heroes',id:'training',hero:h.id},'primary')+btn('查看人物任务',{type:'ui_section',view:'heroes',id:'tasks',hero:h.id},'secondary',!owned))+'</article>';
  return `<article class="card hero-card">${portrait(h)}<h2>${esc(h.title)} · ${esc(h.name)}<span class="badge">${statusLabels[v.status]}</span></h2>
    <p class="meta">${isWanderer(h)?'江湖散人 · 不占正册座次':isExternal(h)?'外传人物 · 不占正册座次':h.starSign+' · 第 '+h.seat+' 席'} · ${QUALITIES[qualityOf(v)].name}品 · 招募 ${'★'.repeat(heroTier(h).rarity)} · ${owned?experienceLabel(v,d.config.balance.heroLevelCap):'当期抽中即入寨'}</p>
    ${owned?stats(attributes(s,h.id,d))+progressionPanel(s,d,h.id)+btn('赠 1 颗经验丹 · 先预览（现有 '+(s.inventory.exp_pill||0)+'）',{type:'ui_batchPreview',kind:'experience',id:h.id,count:1},'secondary',!s.inventory.exp_pill||v.level>=d.config.balance.heroLevelCap)+batchButtons(h.id,'experience',btn)+btn('去寨中演武传习',{type:'ui_campJump',id:'camp-mentorship'},'text-action'):`<p class="note">可在${esc(d.by.maps[h.meetMap].name)}寻访${h.meetCondition?'，还须推进相关主线':''}。</p>`}
    ${s.affairs?.mission?.hero===h.id?'<p class="notice">此人正在外派，请到寨子接回后再安排出阵或任职。</p>':''}${traitCard(h)}${corpsPanel(s,d,h,btn)}${owned?setPanel(s,d,h.id):''}${invitation(s,h,btn)}${owned?qualityPanel(s,d,h,esc,btn):stats(attributes(s,h.id,d,1,false))}${heroStewardCard(s,d,h,btn)}${owned&&mode==='all'?chroniclePanel(s,d,h,btn):''}${talentPanel(s,d,h,btn)}${mode==='all'?personalTaskPanel(s,d,h,btn):''}<details data-fold="hero-${h.id}"><summary>人物往事与招式</summary><p class="note">${esc(h.story)}</p>${heroArc(s,d,h.id)}
      ${owned&&isWanderer(h)?`<div class="actions">${btn('3 枚信物 → 专属招式书',{type:'skillBook',id:h.id,source:'tokens'},'secondary',(s.inventory[h.id+'_token']||0)<3)}</div>`:''}<p class="meta">信物 ${s.inventory[h.id+'_token']||0}/${isWanderer(h)?3:10}${isWanderer(h)?' · 三枚换一本专属招式书':isExternal(h)?' · 外传直接邀请':' · 专属令 '+(s.inventory[h.id+'_order']||0)}</p>
      ${heroGrowth(s,d,h,esc,btn)}
    </details></article>`;
}
function heroesPage(s,d,roster={},requested){const section=pageSection('heroes',requested),owned=d.heroes.filter(h=>s.heroes[h.id].status==='owned'),selected=d.by.heroes[roster.selected]||owned.find(h=>h.id===s.team[0])||owned[0];let content;
  if(section==='profile'&&selected)return '<section data-page-section="heroes:profile"><div class="dossier-navigation">'+btn('返回名册',{type:'ui_section',view:'heroes',id:'roster'},'secondary')+'<label class="section-hero-picker"><span class="sr-only">选择好汉</span><select id="section-hero" aria-label="切换人物档案">'+d.heroes.filter(h=>s.heroes[h.id].status==='owned'||h.id===selected.id).map(h=>'<option value="'+h.id+'" '+(h.id===selected.id?'selected':'')+'>'+esc(h.name)+' · '+statusLabels[s.heroes[h.id].status]+'</option>').join('')+'</select></label></div><section id="roster-detail" aria-label="人物详情">'+heroDossier(s,d,selected,esc,btn,portrait,invitation,roster.dossierTab)+'</section></section>';
  if(section==='roster')content=rosterBoard(s,d,roster,esc,btn,(s,d,h)=>heroCard(s,d,h,'overview'));
  else if(section==='formation')content=starterPanel(s,d,btn)+replacementPanel(s,d,btn)+(owned.length?`<section class="location"><h2 class="subhead">出阵次序 · 最多三人</h2><p class="note">前两位迎敌，第三位居后照应。</p><div class="team-fields">${[0,1,2].map(i=>`<label>第 ${i+1} 位<select id="team-${i}" aria-label="第${i+1}位出阵好汉">${heroOptions(s,d,s.team[i],'选择好汉',true)}</select></label>`).join('')}</div>${btn('保存阵容',{type:'ui_team'},'primary')}</section>`:'<p class="note">在下方点将录选择好汉，可查看当期招募和人物事件。</p>')+presetsPanel(s,d,btn);
  else content=selected?'<label class="section-hero-picker">选择好汉<select id="section-hero">'+d.heroes.filter(h=>s.heroes[h.id].status==='owned'||h.id===selected.id).map(h=>'<option value="'+h.id+'" '+(h.id===selected.id?'selected':'')+'>'+esc(h.name)+' · '+statusLabels[s.heroes[h.id].status]+'</option>').join('')+'</select></label><section id="roster-detail" aria-label="人物详情">'+heroCard(s,d,selected,section==='profile'?'overview':section)+'</section>':'<p class="note">先从名册或招贤馆迎入一位好汉，再安排培养和人物任务。</p>'+btn('查看好汉名册',{type:'ui_section',view:'heroes',id:'roster'},'primary');
  return sectionNavigation('heroes',section,btn).replace('class="page-sections"','class="page-sections '+(['roster','quality'].includes(section)?'roster-section-nav':'')+'"')+'<section data-page-section="heroes:'+section+'">'+title('我的好汉','108 将、外传与散人 · 凡灵仙养成','','heroes')+content+'</section>';}
function equipmentList(s,d,forge=false,filter={}){const comparison=equipmentComparison(s,d,filter.comparison,btn,esc);if(comparison)return returnToEncounter(s,btn)+comparison;return returnToEncounter(s,btn)+equipmentFilters(s,d,filter,btn,esc)+'<div class="equipment-inventory">'+s.equipment.filter(e=>equipmentMatches(e,d,filter)).map(e=>{const m=d.by.equipments[e.item],quote=strengthenQuote(s,d,e);return `<article class="card" data-gear="${e.uid}" data-locked="${!!e.locked}"><h3>${itemArt(m,{kind:'equipment'})}${e.locked?'【已锁定】':''}${esc(m.quality)} · ${esc(m.name)} +${e.plus}</h3><p class="meta">${e.hero?'由'+d.by.heroes[e.hero].name+'穿戴':'行囊中'} · ${Object.entries(m.attribute).map(([key,n])=>({attack:'攻击',hp:'气血',defense:'防御',speed:'速度',strategy:'谋略'})[key]+(n>=0?' +':' ')+Math.round(n*(1+e.plus*.1)*chronicleGearMultiplier(s,e.item))).join(' / ')}</p>${gearTraitLine(e)}${refinePanel(s,d,e,btn)}${['journey','forge','special'].includes(m.source)?'<p class="note">'+esc(m.description)+(chronicleGearMultiplier(s,e.item)>1?' · 图谱淬炼 +'+Math.round((chronicleGearMultiplier(s,e.item)-1)*100)+'%，已计入上方属性。':'')+'</p>':''}<label>交给<select id="holder-${e.uid}" aria-label="${m.name}穿戴者">${heroOptions(s,d,e.hero,'卸下收回')}</select></label>${btn('对比后穿戴',{type:'ui_equip',id:e.uid},'secondary')}${btn(e.locked?'解除锁定':'锁定装备',{type:'equipLock',id:e.uid,locked:!e.locked},'secondary')}${forge?`<div class="actions">${btn('强化：碎银 '+quote.cost.silver+'、精铁 '+quote.cost.items.iron+(e.plus>=5?'、强化符 1（八成可成）':'（必成）'),{type:'strengthen',id:e.uid},'secondary',e.plus>=quote.cap)}${btn('分解成碎铁',{type:'ui_dismantle',id:e.uid},'text-action',!!e.hero||!!e.locked)}</div>`:''}</article>`;}).join('')+'</div>';}
function bagPage(s,d,gear={},requested){const section=pageSection('bag',requested),shop=true;let content;
 if(section==='sources')return sourceBrowser(s,d,esc,btn,gear.sources);
 if(section==='target')return currentGoalPage(s,d,esc,btn);
 if(section==='supplies')content=inventoryBrowser(s,d,esc,btn,['补给','战斗药品'],gear.inventory)+'<details class="folio-more" data-fold="bag-stamina"><summary>体力补给与酬劳</summary>'+staminaPanel(s,d,btn)+provisionSources(s,d,btn)+'</details>';
 else if(section==='materials')content=resourceLinks(s,btn)+inventoryBrowser(s,d,esc,btn,['招贤','养成','材料与线索'],gear.inventory);
 else if(section==='equipment')content='<h2 class="subhead">随身装备 · '+s.equipment.length+' 件</h2>'+equipmentList(s,d,false,gear)+nav('前往打造与强化','forge');
 else if(section==='craft')content='<div id="supply-recipes-anchor">'+recipePanel(s,d,btn,true,gear.recipeCategory,gear.recipeTarget)+'</div>'+`<details class="fold-section" data-fold="materials"><summary>材料合成</summary><div class="actions">${btn('10 招贤碎片 → 招贤令',{type:'exchange',id:'order'},'secondary')}${btn('3 药草 → 2 金创药',{type:'exchange',id:'medicine'},'secondary')}${btn('20 生辰纲残册 → 失落财货',{type:'exchange',id:'ledger'},'secondary')}${btn('5 强化符碎片 → 强化符',{type:'exchange',id:'charm'},'secondary')}</div></details>`;
 else content=`<details class="fold-section" data-fold="shop" data-default-open><summary>随时采买</summary><div class="batch-shop"><label>批量采买物品<select id="batch-shop-item">${['jinchuangyao','huiqisan','jiedudan','exp_pill','wine','iron','cloth','night_clothes','recruit_order'].map(id=>`<option value="${id}">${d.by.items[id].name} · ${d.by.items[id].price}银 / 份</option>`).join('')}</select></label>${btn('预览采买 5 份',{type:'ui_batchShop',count:5},'secondary')}${btn('预览采买 10 份',{type:'ui_batchShop',count:10},'secondary')}</div>${shop?`<p class="note">招贤令每日限购三张。</p><div class="actions">${['jinchuangyao','huiqisan','jiedudan','exp_pill','wine','iron','cloth','night_clothes','recruit_order'].map(id=>btn(`${d.by.items[id].name} · ${d.by.items[id].price}银`,{type:'buy',id},'secondary')).join('')}</div>`:'<p class="note">到郓城集市、铁匠铺、酒肆、招贤馆或药草坡才可交易。</p>'+nav('返回江湖','map')}</details>`;
 return sectionNavigation('bag',section,btn)+'<section data-page-section="bag:'+section+'">'+title('行囊','使用物品与整理装备','','bag')+content+'</section>';}
function forgePage(s,d,gear={},requested){
  const section=pageSection('forge',requested),panels={equipment:()=>equipmentList(s,d,true,gear)+`<details class="fold-section" data-fold="forge-rules"><summary>强化规则</summary><p>基础 +1～+5 必成；山神庙往事后可向铁匠请教，解锁 +6～+10。进阶强化八成可成，失败消耗材料但不降级、不毁装备。穿戴中的装备不能分解。</p></details>`,craft:()=>forgeCatalog(s,d,btn,esc,gear.forgeCategory,gear.forgeTarget),sets:()=>setsCatalog(s,d,btn),goals:()=>targetPanel(s,d,btn)+phasePanel(s,d,btn)+buildGuidePanel(s,d,btn)};
 return sectionPicker('forge',section,btn)+title('铁匠铺','强化、打造与图鉴分开查看','','forge')+'<section data-page-section="forge:'+section+'">'+panels[section]()+'</section>';
}
function recruitPage(s,d,target='',roster={},requested){
 const banner=recruitmentBanner(d,s.clock),candidates=banner.headliners,selected=candidates.find(h=>h.id===target)||candidates.find(h=>s.inventory[h.id+'_order']>0)||candidates[0];
 const section=pageSection('recruit',requested),panels={ordinary:()=>recruitBannerPanel(s,d,esc,btn,portrait),exclusive:()=>'<section class="recruit-target location"><h2 class="subhead">当期专属招贤</h2><p class="note">专属令只用于本期正册人物；无须先相识。已有令和缘分保留到下次到访。</p><label>选择人物<select id="recruit-target">'+candidates.map(h=>'<option value="'+h.id+'" '+(h.id===selected?.id?'selected':'')+'>'+esc(h.name)+(heroAptitude(h)?' · '+heroAptitude(h).name:'')+' · 专属令 '+(s.inventory[h.id+'_order']||0)+'</option>').join('')+'</select></label>'+(selected?portrait(selected,true)+'<h3>'+esc(selected.title)+' · '+esc(selected.name)+' '+aptitudeBadge(selected)+'</h3><p class="note recruit-target-identity">五星正册 · '+starPosition(selected)+' · '+({fighter:'先锋',defender:'护阵',ranger:'游击',strategist:'谋士',support:'辅佐'})[selected.type]+' '+btn('查看本领',{type:'ui_rosterSelect',id:selected.id,tab:'ability'},'text-action')+'</p><p class="note">信物 '+(s.inventory[selected.id+'_token']||0)+'/10 · 专属令 '+(s.inventory[selected.id+'_order']||0)+' · 缘分 '+(s.recruit.fate[selected.id]||0)+'/4</p><div class="actions">'+btn('合成专属令',{type:'craftOrder',id:selected.id},'secondary',(s.inventory[selected.id+'_token']||0)<10)+btn('专属招贤',{type:'recruit',id:selected.id,bannerId:banner.id},'primary',!s.inventory[selected.id+'_order'])+'</div>':'<p class="note">本期暂无专属人物。</p>')+'<details><summary>专属招贤概率</summary><p>目标 25%、其他当期正册 5%、当期低星人物 70%。连续四次未得目标，下一次必得。重复人物转为本人信物三枚、功勋十五。</p></details></section>',support:()=>recruitSupportPanel(s,d,esc,btn),helpers:()=>helpersBoard(s,btn),roster:()=>rosterBoard(s,d,roster,esc,btn,(s,d,h)=>heroCard(s,d,h,'overview'))};
 return sectionPicker('recruit',section,btn)+'<section data-page-section="recruit:'+section+'">'+panels[section]()+'</section>';
}
function rewardText(r,d){return [...['silver','merit','prestige'].filter(k=>r[k]).map(k=>({silver:'碎银',merit:'功勋',prestige:'威望'})[k]+' ×'+r[k]),...Object.entries(r.items||{}).map(([id,n])=>d.by.items[id].name+' ×'+n)].join('，');}

function activeChapter(s,d){return d.chapters.find(c=>!s.progress.flags[c.completeFlag])||d.chapters[d.chapters.length-1];}
function heroArc(s,d,id){const stage=d.config.heroArcs.find(a=>a.hero===id)?.stages.find(v=>s.progress.flags[v.flag]);return stage?`<p class="progress-label">人物心境：${esc(stage.label)}</p>`:'';}
function journeyClues(s,d){
  const active=d.stories.filter(m=>s.progress.stories[m.id]?.status==='active');
  return active.length?`<details class="fold-section" data-fold="journey-clues"><summary>进行中的往事 · ${active.length} 段</summary>${active.map(m=>{const step=m.steps[s.progress.stories[m.id].step];return `<p><b>${esc(m.title)}</b> · 下一处：${esc(d.by.maps[step.map].name)}。${esc(step.hint||'循地图行路，在当地续记往事。')}</p>`;}).join('')}</details>`:'';
}
function questDestination(s,d,q){
 const stat=q.goal?.stat;let command,label='前往完成';
 if(stat==='clear_jingyanggang'){command={type:'ui_storyRevisit',id:'jingyanggang'};label='前往景阳冈历练';}
 else if(stat==='recruit'){command={type:'ui_section',view:'recruit',id:'ordinary'};label='前往当期招募';}
 else if(stat==='battleWin'||stat==='bandits'){command={type:'ui_section',view:'trials',id:stat==='bandits'?'story':'resources'};label='前往副本';}
 else if(stat==='formationBattle'){command={type:'ui_section',view:'heroes',id:'formation'};label='调整出阵队伍';}
 else if(stat?.startsWith('gain_')){command={type:'ui_sources',id:stat.slice(5),amount:q.goal.amount};label='查看物品来源';}
 else if(stat==='strengthen'){command={type:'ui_section',view:'forge',id:'equipment'};label='前往装备强化';}
 else if(stat==='event'||stat==='news'){command={type:'ui_mapInspect',id:'tavern'};label='前往酒肆寻访';}
 else if(stat==='discover'){command={type:'ui_mapInspect',id:'gate'};label='查看江湖地图';}
 return command?'<div class="quest-destination">'+btn(label,command,'primary')+'</div>':'';
}
function questCard(s,d,q){
  const daily=q.type==='daily',claimed=(daily?s.daily.claimed:s.progress.claims).includes(q.id),ready=questReady(s,q);
  return `<article class="card"><h3>${esc(q.name)}${claimed?'<span class="badge">已办妥</span>':''}</h3><p>${esc(q.description)}</p><p class="meta">${daily?'进度 '+Math.min(q.goal.amount,s.daily.counters[q.goal.stat]||0)+'/'+q.goal.amount+' · ':''}酬劳：${rewardText(q.reward,d)}</p>${!claimed&&!ready?questDestination(s,d,q):''}${btn(claimed?'酬劳已领':ready?'领取酬劳':'尚待办妥',{type:'quest',id:q.id},'secondary',claimed||!ready)}</article>`;
}
function questsPage(s,d,selected=''){
 const daily=d.quests.filter(q=>q.type==='daily'&&s.daily.ids.includes(q.id)),current=daily.find(q=>q.id===selected)||daily.find(q=>!s.daily.claimed.includes(q.id))||daily[0];
 const pending=d.quests.filter(q=>q.type==='main'&&!s.progress.claims.includes(q.id)&&meets(s,d.by.chapters[q.chapter].condition));
 const other=d.quests.filter(q=>q.type==='main'&&!pending.includes(q));
 return '<section class="quests-compact"><header class="section-top"><h2>'+icon('quests')+'今日差事</h2><span>已领取 '+s.daily.claimed.length+' / 3</span></header>'+(current?'<label>选择差事<select id="quest-focus">'+daily.map(q=>'<option value="'+q.id+'" '+(q.id===current.id?'selected':'')+'>'+esc(q.name)+' · '+(s.daily.claimed.includes(q.id)?'已领':questReady(s,q)?'可领奖':'进行中')+'</option>').join('')+'</select></label>'+questCard(s,d,current):'<p>今天没有待办差事。</p>')+(s.daily.claimed.length===3?btn(s.daily.bonus?'今日额外酬劳已领':'领取今日额外酬劳',{type:'dailyBonus'},'primary',s.daily.bonus):'<p class="note quest-bonus-note">领齐三份差事，可再领碎银、招贤令碎片和驯骑凭记。</p>')+'<details class="quest-main-more"><summary>主线酬劳 · '+pending.length+' 项未领取</summary>'+pending.map(q=>questCard(s,d,q)).join('')+journeyClues(s,d)+'<details><summary>已领与后续主线</summary>'+other.map(q=>questCard(s,d,q)).join('')+'</details></details></section>';
}
function chroniclePage(s,d){
  const current=activeChapter(s,d),journal=[...s.journal].reverse();
  const entries=list=>`<ul class="plain-list">${list.map(e=>`<li><time>${esc(new Date(e.at).toLocaleString('zh-CN'))}</time>${esc(e.text)}</li>`).join('')}</ul>`;
  const chapter=c=>`<section class="complete"><h2>第${c.number}卷 · ${esc(c.title)} · ${s.progress.flags[c.completeFlag]?'卷终':meets(s,c.condition)?'已开启':'待前卷完成'}</h2>${storyParagraphs(s.progress.flags[c.completeFlag]?(c.number===12?lateEndingText(s)||c.ending:c.ending):c.number>=8?chapterIntroduction(c):c.number===7?'高唐救援后，从城南接应点返回水泊。观阵、试阵，选择一种反制办法，再迎击骑军；不要求指定好汉。':c.number===6?'从庄后粮仓前往高唐。可先辨阵、截援，再打通牢城接回柴进。':c.number===5?'从三山联合营进入。整备、探路、一打、断援或断粮、二打、三打，最后安置归人；已有营建直接计入。':c.number===4?'从水泊盟亭进入，三路顺序自选。每寨通过一种方式结盟，聚义厅达到 3 级后联合守寨，不要求指定好汉。':c.number===3?'从金沙渡进入，完善寨子、打通粮木水路、守住寨门并立约。已有建设直接计入，不要求指定好汉。':c.number===2?'第一卷卷终后，从梁山渡口可前往东京。四段人物往事均完成后结卷，不要求已招募这四人。':'从郓城起步，相识、历练、聚义。')}<ol>${c.requirements.map(r=>`<li class="${meets(s,r.condition)?'progress-label':''}">${meets(s,r.condition)?'已成':'尚待'} · ${esc(r.label)}</li>`).join('')}</ol></section>`;
  return title('白泽梁山志','进度、目标与往事','','chronicle')+debriefPanel(s.lastBattle,d,esc)+(s.progress.flags.volume_seven_complete?lateMainlineBoard(s,d,esc,btn):s.progress.flags.volume_six_complete?volumeSevenBoard(s,d,btn):s.progress.flags.volume_five_complete?volumeSixBoard(s,d,btn):s.progress.flags.volume_four_complete?volumeFiveBoard(s,d,btn):s.progress.flags.volume_three_complete?volumeFourBoard(s,d,btn):volumeThreeBoard(s,d,btn))+chapter(current)+mainlinePlanPanel(s,d,esc)+
    `<details class="fold-section" data-fold="overview"><summary>山寨概况与眼下线索</summary>${overview(s,d)}</details>`+journeyClues(s,d)+
    `<details class="fold-section" data-fold="other-chapters"><summary>其他篇章</summary>${d.chapters.filter(c=>c.id!==current.id).map(chapter).join('')}<p class="note">坐骑与专属招式已开放，可在好汉详情养成；寨子页已开放营建、募兵与远征。</p></details><h2 class="subhead">最近记事</h2>${entries(journal.slice(0,15))}
    ${journal.length>15?`<details class="fold-section" data-fold="older-journal"><summary>更早的记事 · ${journal.length-15} 条</summary>${entries(journal.slice(15))}</details>`:''}
    <p class="note">保留最近三百条详细记事；人物、主线与通关累计不会截断。建寨记事始于 ${esc(new Date(s.startedAt).toLocaleString('zh-CN'))}。</p>`;
}

export function battleStage(options){return renderBattleStage(options,esc,btn,portrait);}
function battlePage(s,d){const b=s.battle;return '<section class="live-battle battle-launcher"><h1>阵前交战</h1><p>'+esc(b?.outcome?'本场交战已结束，正在收拢队伍。':'此战尚未结束，打开战场后可继续交战。')+'</p>'+btn('打开战场',{type:'ui_battleOpen'},'primary')+'</section>';}
function hasStun(u){return u.statuses.some(s=>s.id==='stun');}
function schemePage(s,d){return schemeScenePage(s,d,esc,btn);}
function eventPage(s,d){const e=d.by.events[s.event.id];return title(e.name,'路上际遇','','event')+`<section class="location">${storyParagraphs(e.text)}<div class="actions">${e.options.map(c=>btn(c.label,{type:'eventChoice',id:c.id},'secondary')).join('')}</div></section>`;}

function overview(s,d){
  const owned=Object.values(s.heroes).filter(h=>h.status==='owned').length,chapter=activeChapter(s,d),next=d.quests.find(q=>q.type==='main'&&q.chapter===chapter.id&&!s.progress.claims.includes(q.id)&&!questReady(s,q));
  return `<section class="overview"><h2 class="subhead">此刻的梁山</h2>${[['寨主',selectedHonor(s)||s.player.title],['正式好汉',owned+' / '+d.heroes.length],['探访地点',s.progress.visited.length+' / '+d.maps.length],['历练得胜',(s.stats.clears||0)+' 回'],['威望',s.player.prestige],['功勋',s.player.merit],['当前据点',s.player.liangshanLevel?'梁山初立':'尚未落脚']].map(([a,b])=>`<div class="ledger-line"><span>${a}</span><b>${esc(b)}</b></div>`).join('')}
    <h2 class="subhead">眼下线索</h2><p>${esc(next?.description||(s.progress.flags[chapter.completeFlag]?'本卷已完成，可领取未领酬劳，或继续历练、招贤。':'继续沿地图探路，也可到差事页领取已办妥的酬劳。'))}</p>
    ${!owned?'<p>先到郓城酒肆与白胜交谈，可邀他引路。临时助阵不等于正式入寨。</p>':''}${nav('查看差事','quests')}</section>`;
}
function pageResources(s,screen){
  const rows={camp:[['碎银',s.player.silver],['体力',s.player.stamina+'/'+staminaCap(s)]],map:[['体力',s.player.stamina+'/'+staminaCap(s)],['出阵',s.team.length+'/3']],companions:[['出阵',s.team.length+'/3'],['经验丹',s.inventory.exp_pill||0]],heroes:[['已入寨',Object.values(s.heroes).filter(h=>h.status==='owned').length+' 位'],['经验丹',s.inventory.exp_pill||0]],bag:[['碎银',s.player.silver],['体力',s.player.stamina+'/'+staminaCap(s)]],forge:[['碎银',s.player.silver],['精铁',s.inventory.iron||0],['强化符',s.inventory.strength_charm||0]],quests:[['威望',s.player.prestige],['功勋',s.player.merit]]}[screen]||[];
  return rows.length?`<div class="resources" aria-label="当前功能相关资源">${rows.some(([name])=>name==='碎银')?btn('获取碎银',{type:'ui_resourceSource',id:'silver'}):''}${rows.some(([name])=>name==='体力')?btn('补充体力',{type:'ui_section',view:'bag',id:'supplies'}):''}${rows.map(([name,value])=>`<span>${icon(({体力:'energy',出阵:'heroes',已入寨:'heroes',经验丹:'medicine',碎银:'coins',精铁:'forge',强化符:'ticket',威望:'medal',功勋:'medal'})[name])}<span>${name}</span><b>${value}</b></span>`).join('')}</div>`:'';
}
export function render({state:s,data:d,guideActive=false,view,status='',error='',locked=false,notice='',recruitTarget='',entered=true,battlePaused=false,battlePauseReason='',saveBox={},battleSpeed=.5,mapTarget=null,mapSection='story',pageSections={},roster={},leaderboard={},gear={}}){
  const busy=isBusy(s),tabs=[['camp','寨子'],['map','江湖'],['companions','人物篇章'],['realm','山河'],['heroes','好汉'],['trials','历练'],['bag','行囊'],['recruit','招贤'],['forge','打造'],['quests','差事'],['chronicle','梁山志'],['save','存档']];
  const screen=['welcome','save','chronicle','menu'].includes(view)?view:s.battle?'battle':s.scheme?'scheme':s.event?'event':view;
  let content=screen==='companions'?companionHub(s,d,esc,btn,pageSections.companion):screen==='realm'?realmPanel(s,d,esc,btn,pageSections.realm,pageSections.chronicleRegion):screen==='trials'?rotationsPage(s,d,esc,btn,leaderboard,pageSections.trials):screen==='camp'?campPage(s,d,esc,btn,pageSections.camp,pageSections.scene,pageSections.grainRoute,pageSections):screen==='save'?saveBoxPage(s,status,locked,saveBox,pageSections.save):screen==='chronicle'?chroniclePage(s,d):screen==='battle'?battlePage(s,d,battlePaused,battlePauseReason,locked,battleSpeed):screen==='scheme'?schemePage(s,d):screen==='event'?eventPage(s,d):screen==='heroes'?heroesPage(s,d,roster,pageSections.heroes):screen==='bag'?bagPage(s,d,gear,pageSections.bag):screen==='forge'?forgePage(s,d,gear,pageSections.forge):screen==='recruit'?recruitPage(s,d,recruitTarget,roster,pageSections.recruit):screen==='quests'?questsPage(s,d,pageSections.questFocus):mapPage(s,d,mapTarget,mapSection,pageSections.journeyScene);
  if(screen==='menu')content=title('全部功能','选择后直接进入')+'<div class="function-grid main-function-grid">'+tabs.map(([id,label])=>'<button type="button" class="secondary" data-view="'+id+'" '+(busy&&!['map','save','chronicle'].includes(id)?'disabled':'')+'>'+icon(id)+'<span>'+label+'</span></button>').join('')+'</div>';
  if(screen==='welcome')content=`<section class="intro opening"><p class="kicker">水泊梁山 · 白手立寨</p><h1>从郓城上路。</h1><div class="intro-line" aria-hidden="true"></div><div class="opening-lines"><p>白胜领来几个乡人，在山脚支起棚子。</p><p>景阳冈有虎，却有个喝了酒的汉子执意上山。先去三碗不过冈看看。</p><div class="camp-faces">${['baisheng','wusong','linchong','wuyong'].map(id=>portrait(d.by.heroes[id])).join('')}</div></div><div class="opening-actions">${btn('开始游戏',{type:'ui_start'},'primary')}${nav('读取存档','save')}</div><p class="note">开始游戏后自动保存到本机。</p></section>`;
  const active=['battle','scheme','event'].includes(screen)?'map':screen;
  const prologue=screen==='welcome'||(!entered&&screen==='save'),arrival=screen==='map'&&isFirstArrival(s);
  const navigation=`<nav class="tabs" aria-label="游戏页面">${tabs.map(([id,label])=>`<button type="button" data-view="${id}" aria-current="${active===id?'page':'false'}" ${busy&&!['map','save','chronicle'].includes(id)?'disabled':''}>${icon(id)}<span>${label}</span></button>`).join('')}<button type="button" class="mobile-menu-nav" data-view="menu" aria-haspopup="dialog" aria-controls="function-menu" aria-expanded="false" aria-current="${!['camp','map','heroes','bag'].includes(active)?'page':'false'}"><span aria-hidden="true">☷</span><span>更多</span></button></nav>`;
  return `<div class="shell focus-layout viewport-shell${screen==='battle'?' in-battle':''}${prologue?' prologue-layout':arrival?' arrival-layout':''}">
    <header class="masthead"><div class="brand"><span class="seal" aria-hidden="true">白泽</span><strong>白泽水浒</strong></div><div class="mast-links"><span class="edition">v${esc(d.config.release)}</span><button type="button" class="theme-switch" data-theme-toggle aria-label="切换昼夜配色" aria-pressed="false"><span class="theme-day">夜间</span><span class="theme-night">日间</span></button><a href="../">返回导航</a>${prologue?'':'<button type="button" class="masthead-more" data-view="menu" aria-haspopup="dialog" aria-controls="function-menu" aria-expanded="false">更多 <span aria-hidden="true">▾</span></button>'}</div></header>
    <div class="resource-strip">${prologue?'<span class="strip-note">十二卷主线</span>':(selectedHonor(s)?'<span class="honor-label">'+esc(selectedHonor(s))+'</span>':'')+(pageResources(s,screen)||'<span class="strip-note">江湖</span>')}</div>
    <div class="layout viewport-layout">
      <aside class="rail" id="game-navigation">${prologue?'<p class="prelude-navigation">可开始新游戏<br>或读取存档</p>':navigation}</aside>
      <main class="main" id="main" tabindex="-1" data-screen="${esc(screen)}" data-guided="${guideActive}">
        ${error?`<div class="notice error" role="alert">${esc(error)}</div>`:''}
        ${notice?`<p class="notice action-notice" role="status">${esc(notice)}</p>`:''}
        ${screen!=='save'&&(locked||(status&&!status.startsWith('已保存')&&screen!=='welcome'))?`<p class="warning" role="status">${esc(status)}</p>`:''}
        ${prologue?'':guidePanel(guidance(s,d,screen,screen==='map'?mapSection:pageSection(screen,pageSections[screen])||'',battlePaused),guideActive,esc)}
        ${content}
        ${!entered&&screen==='save'&&!locked?nav('返回卷首','welcome'):''}
      </main>
    </div>
    <footer class="footer"><span>${locked?'存档冲突 · 请到存档页处理':status.startsWith('已保存')?'已保存到本机':prologue?'独立本机存档':'尚未保存 · 请先导出进度'}</span>${prologue?'<span>水泊经营 · 无付费</span>':nav('存档管理','save')}</footer>
  </div>`;
}
export function importDialog(state){return `<dialog id="import-confirm" aria-labelledby="import-title"><h2 id="import-title">导入这个存档？</h2><p>此存档记录到 ${esc(new Date(state.clock).toLocaleString('zh-CN'))}。</p><p>威望 ${state.player.prestige}，正式好汉 ${Object.values(state.heroes).filter(h=>h.status==='owned').length} 名。</p><p class="note">确认后替换当前游戏进度，并备份原来的有效存档。不影响学习系统。建议先导出当前进度。</p><div class="actions">${btn('确认导入并替换',{type:'ui_confirmImport'},'primary')}${btn('取消',{type:'ui_cancelImport'},'secondary')}</div></dialog>`;}
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
    <div class="result-hero">${portrait(hero)}<span class="result-seal" aria-hidden="true">${joined?'义':result.kind==='duplicate'?'缘':'信'}</span><p class="result-stars" aria-label="${heroTier(hero).rarity}星好汉">${'★'.repeat(heroTier(hero).rarity)}</p><p class="result-name">${esc(hero.name)}</p><p class="result-title">${esc(hero.title)}</p><p class="result-identity">${tierBadge(hero)} ${aptitudeBadge(hero)} ${starPosition(hero)}</p></div>
    <p id="recruit-result-description">${copy}</p>
    ${result.tokens?`<div class="result-rewards"><p>${esc(data.by.items[result.hero+'_token'].name)} <strong>×${result.tokens}</strong></p>${result.merit?`<p>功勋 <strong>+${result.merit}</strong></p>`:''}</div>`:''}
    ${result.kind==='clue'?`<p class="note">可在${esc(data.by.maps[hero.meetMap].name)}继续寻访，按当地交谈或剧情提示相识。十枚信物可合成专属令，在该人物的活动期间使用。</p>`:''}
    ${result.target&&result.target!==result.hero?`<p class="note">招贤目标：${esc(data.by.heroes[result.target].name)}；本次获得：${esc(hero.name)}。</p>`:''}
    <p class="meta">本次消耗：${esc(cost)} ×1 · 第 ${result.number} 次招贤</p>
    <p id="recruit-result-save" class="note" role="status"></p>
    <div class="actions result-actions"><button type="button" class="primary with-icon" data-result-action="close">${icon('check')}<span>知道了</span></button><button type="button" class="secondary with-icon" data-result-action="heroes">${icon('heroes')}<span>查看好汉</span></button></div>
  </dialog>`;
}
