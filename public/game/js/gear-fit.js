import {roleKind} from './lineup-model.js?v=0.69.0';
import {GEAR_TRAITS} from './tactics-data.js?v=0.69.0';
import {unlockReason} from './growth.js?v=0.69.0';
import {away} from './progression-paths.js?v=0.69.0';
export function gearFit(s,d,e,id){
 const h=d.by.heroes[id],trait=GEAR_TRAITS[e.item];if(!h||s.heroes[id]?.status!=='owned')return null;
 const skills=h.skills.map(k=>d.by.skills[k]).filter(k=>k.type!=='passive'&&!unlockReason(s,k));
 const interrupt=skills.some(k=>k.training?.profile==='interrupt'),heal=skills.some(k=>k.effect.kind==='heal'&&k.effect.rate>0);
 if(!trait)return {ready:true,text:'此件以基础属性为主，可按穿戴后的属性和套装变化取舍。'};
 if(['follow','recover','rally','weaken'].includes(trait.kind))return {ready:interrupt,text:interrupt?'已解锁打断招式；遇到首领蓄势时由本人打断，才能触发此件。':'本人尚无已解锁的打断招式，此件打断特效暂不能触发。'};
 if(trait.kind==='fieldcare')return {ready:heal,text:heal?'已解锁治疗；只有治疗后仍低于半血的伤者才会获得额外恢复。':'本人没有已解锁的治疗招式，暂不能触发此束带。'};
 if(trait.kind==='cleanse')return {ready:heal,text:heal?'已有恢复气血的招式；实际治到伤者时，才能触发解毒与护阵。':'本人尚无已解锁的恢复招式，此件治疗特效暂不能触发。'};
 if(['counter','cover'].includes(trait.kind)){
  const kind=roleKind(id),personal=s.expansion?.personal?.[id];
  const innate=['taken_guard','after_guard'].includes(kind)||kind==='opening_front'&&s.team[0]===id||kind==='interrupt_guard'&&interrupt||personal&&['linchong','songwan'].includes(id);
  const allies=s.team.includes(id)?s.team:[id];
  const support=allies.some(k=>{const active=d.by.heroes[k].skills.map(v=>d.by.skills[v]).filter(v=>v.type!=='passive'&&!unlockReason(s,v)),heals=active.some(v=>v.effect.kind==='heal'&&v.effect.rate>0);return active.some(v=>['protect','shelter','discipline','triage'].includes(v.training?.profile))||heals&&(roleKind(k)==='heal_guard'||k==='houjian'&&s.expansion?.personal?.[k]||s.equipment.some(x=>x.hero===k&&x.item==='reed_medicine_case'))||roleKind(k)==='opening_rear'&&allies.length>1&&allies.at(-1)===k&&allies[0]===id;});
  const shield=innate||support||s.equipment.some(x=>x.hero===id&&x.item==='bastion_armor'&&d.by.equipments[x.item].type!==d.by.equipments[e.item].type)||s.expansion?.styles?.[id]==='guard';
  return {ready:!!shield,text:shield?'队伍有护阵来源；穿戴者身有护阵且受到直接攻击时触发。':'需要先安排护阵来源，例如叠片甲、守势本领或保护招式。只堆防御不会触发。'};
 }
 if(trait.kind==='press')return {ready:true,text:'需要同伴或自身先造成破甲、虚弱，再由普攻追击。'};if(trait.kind==='tenacity')return {ready:true,text:'低于半血受击后可解毒止血；无法复活已退阵的好汉。'};
 return {ready:true,text:trait.kind==='shatter'?'普攻可以移除敌方护阵，适合矿洞守卫；敌人没有护阵时不会触发。':'第三次普攻获得护阵，可与反击兵器配合；眩晕会拖慢触发。'};
}
export function gearFitPanel(s,d,e,id,btn,esc){
 const q=gearFit(s,d,e,id);if(!q||!GEAR_TRAITS[e.item])return '';
 const candidates=d.heroes.filter(h=>s.heroes[h.id].status==='owned'&&!away(s,h.id)&&h.id!==id&&gearFit(s,d,e,h.id)?.ready).sort((a,b)=>Number(s.team.includes(b.id))-Number(s.team.includes(a.id))||s.heroes[b.id].level-s.heroes[a.id].level).slice(0,3);
 return '<section class="gear-fit"><p class="note">'+esc(q.text)+'</p>'+(candidates.length?'<div class="actions">'+candidates.map(h=>btn('改看'+h.name,{type:'ui_fitCompare',id:e.uid,hero:h.id},'secondary')).join('')+'</div>':'')+'</section>';
}
