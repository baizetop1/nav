import {battleSkillMode} from './battle.js?v=0.69.0';
import {storyObjective} from './story-guide.js?v=0.69.0';
import {LESSONS} from './lessons-data.js?v=0.69.0';

// Guidance is derived from real progress. Only the display preference is local.
export const guideKey=(s,slot)=>'baize_shuihu_guide:'+slot+':'+s.startedAt;
export function guideEnabled(s,value){
 if(value==='on'||value==='off')return value==='on';
 return !s.progress.flags.volume_complete&&(s.camp?.sorties||0)<3&&(s.camp?.buildings.hall||1)<=2&&Math.max(1,...Object.values(s.heroes).filter(h=>h.status==='owned').map(h=>h.level))<15;
}
const target=(type,extra={})=>({type,...extra});
export function guidance(s,d,screen,section='',paused=false){
 const step=(id,title,text,targets)=>({id,title,text,targets});
 if(['welcome','save','menu','chronicle'].includes(screen))return null;
 if(screen==='camp'&&section==='grainRoad'){const x=s.grainRoad;return !x?.won?step('grain-road','先选一种办法','护送偏向长期供粮；侦察后剿匪收获居中；强攻缴获多，但敌军更强。点出征方案先看敌情，取消不扣资源。',[target('grainRoadBattle')]):!x.investment?step('grain-invest','用战果安排后续经营','粮仓增加供粮，救护站接回伤兵。二选一建成后保留，物资不足可先采集。',[target('grainRoadInvest')]):null;}
 if(screen==='battle'){
  const b=s.battle;if(!b||b.outcome)return null;
  if(b.context.type==='lesson'){
   const id=b.context.id;
   if(id==='guard')return b.orders?.stance==='guard'?step('guard-wait','等教习出招',paused?'已切换固守。点继续交战，接住一次攻击就完成。':'已切换固守，等教习打来即可。',[target('ui_battlePause')]):step('guard','先切换固守','点收势固守，再继续交战。不必击倒教习。',[target('battleOrder',{kind:'stance',value:'guard'})]);
   if(id==='heal')return step('heal','给白胜疗伤','点乡路照应，实际恢复气血就完成练习。',[target('battleSkill',{hero:'baisheng',id:LESSONS.heal.skill})]);
   const pending=b.enemy.some(e=>e.boss?.pendingAt>b.elapsed);
   return step('interrupt-'+pending,'截住敌人蓄势',pending?'敌人正在蓄势，点王进的招式打断。':paused?'先点继续交战，等敌人蓄势时再用打断招式。':'等敌人蓄势，打断按钮亮起后再点。',[pending?target('battleSkill',{hero:'wangjin',id:LESSONS.interrupt.skill}):target('ui_battlePause')]);
  }
  if(battleSkillMode(s)==='manual')return step('skill-mode','普攻自动，招式要另选','想先熟悉流程，可点自动技能，由好汉自行施招；也可保留手动，自己点招式。',[target('battleSkillMode',{mode:'auto'})]);
  return step('battle','看清敌情再出手',paused?'战斗已暂停。点继续交战；需要调整时可再暂停。':'队伍正在交战。金边按钮可暂停观察，战斗结束会自动弹出结果。',[target('ui_battlePause')]);
 }
 if(screen==='scheme')return step('scheme','先看军汉的反应','每次安排都会改变局面。先让军汉疲累、放下戒心，再收网。',[]);
 if(screen==='event')return step('event','先选眼前这一件事','读完选项再作决定，处理后才能继续上路。',[]);
 if(screen==='camp'&&section==='lessons'){
  const next=Object.keys(LESSONS).find(id=>!s.lessons?.completed.includes(id));
  return next?step('lesson-'+next,'练一项就能上路','可先练“'+LESSONS[next].name+'”。完成后继续主线，其他课程以后再练。',[target('lessonStart',{id:next})]):step('lessons-done','三项演武都已完成','已经学会固守、治疗和打断。继续主线吧；再次练习不会发奖励。',[target('ui_storyResume')]);
 }
 const tips={
  'camp:duties':['gather','先选要补的物资','每次只扣 5 体力，按钮上方就是本次所得。采集完可点主线继续上路。',[target('campWork')]],
  'camp:buildings':['build','先看所需木材和碎银','点建造或扩建才会扣费。材料不足，可到采集物资补齐。',[target('campBuild')]],
  'camp:troops':['troops','伤兵先治，再补新兵','募兵要花粮草和碎银。先看剩余兵额，出征时还可调整随行人数。',[target('campHeal'),target('campRecruit')]],
  'heroes:training':['training','先看升级预览','选好汉，再选经验丹数量。预览会显示等级和属性变化，确认才用丹。',[target('ui_batchPreview',{kind:'experience'})]],
  'heroes:formation':['formation','安排出阵好汉','最多三人。先配上能承伤和能治疗的好汉，再回主线。',[]],
  'bag:supplies':['supplies','体力不足时用补给','先看恢复量和今日上限，确认后才消耗道具。',[target('ui_provisionUse')]],
  'recruit:ordinary':['recruit','先看招募消耗','先看招募令数量和概率，再决定招一次还是十次。',[]],
  'forge:craft':['forge','先选需要的装备','查看材料和银两，确认后才打造。材料不足可先去副本收集。',[]]
 };
 const tip=tips[screen+':'+section];if(tip)return step(...tip);
 if(screen!=='map'&&!(screen==='camp'&&(!section||section==='home')))return null;
 const g=storyObjective(s,d),place=g.map?d.by.maps[g.map].name:null;
 if(screen==='camp')return step('home','先沿主线走','金边按钮通向当前剧情。采集、招贤和营建可以随时回来做。',[target('ui_storyResume')]);
 if(g.view)return step('need-'+g.view+'-'+g.section,g.title,g.reason||g.detail,[target('ui_storyResume')]);
 if(g.map!==s.location)return step('travel-'+g.map,'下一站：'+place,'点金边按钮前往'+place+'，到达后会提示当地要办的事。',[target('ui_storyResume')]);
 if(g.action)return step('action-'+g.action.id,g.title,g.detail,[g.action,target('ui_journeyScene',{tab:'people'})]);
 if(g.story){const progress=s.progress.stories[g.story];return step('story-'+g.story+'-'+(progress?.step||'start'),progress?'接着说下去':'开始这段故事',progress?'选一项回应。若要交战，先看清出征准备；打完后还要继续这段对话。':'点金边的剧情按钮，与当地人物交谈。',[target('story',{id:g.story}),target('ui_journeyScene',{tab:'here'})]);}
 return step('mainline-'+g.chapter,g.title,g.detail,[target('startScheme'),target('ui_storyResume')]);
}
export function guidePanel(g,enabled,esc){
 if(!g)return '';
 if(!enabled)return '<div class="onboarding-guide guide-closed"><button type="button" data-guide-toggle>开启操作指引</button></div>';
 return '<aside class="onboarding-guide" aria-label="操作指引" data-guide-step="'+esc(g.id)+'"><div><strong>'+esc(g.title)+'</strong><button type="button" data-guide-toggle aria-label="收起操作指引">收起</button></div><p id="operation-guide-text">'+esc(g.text)+'</p><nav>'+(g.targets.length?'<button type="button" data-guide-locate>定位按钮</button>':'')+'<button type="button" data-command="'+esc(JSON.stringify({type:'ui_storyResume'}))+'">'+(g.id==='home'?'查看主线':'接回主线')+'</button></nav></aside>';
}
export function highlightGuidance(root,g){
 for(const el of root.querySelectorAll('[data-guide-target]')){el.removeAttribute('data-guide-target');if(el.getAttribute('aria-describedby')==='operation-guide-text')el.removeAttribute('aria-describedby');}
 if(!g)return [];
 const buttons=[...root.querySelectorAll('#main button[data-command]')].filter(b=>!b.closest('.onboarding-guide')&&!b.disabled);
 for(const match of g.targets){const selected=buttons.filter(b=>{try{const a=JSON.parse(b.dataset.command);return Object.entries(match).every(([k,v])=>a[k]===v);}catch{return false;}}).filter(b=>!b.closest('[hidden]'));
  if(selected.length){for(const b of selected){b.dataset.guideTarget='true';b.setAttribute('aria-describedby','operation-guide-text');}return selected;}
 }
 return [];
}
