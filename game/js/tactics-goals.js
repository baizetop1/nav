import {phaseGoal} from './progression-paths.js?v=0.66.0';
import {unlockReason} from './growth.js?v=0.66.0';
import {BUILD_GUIDES,GEAR_TRAITS} from './tactics-data.js?v=0.66.0';
import {SPECIAL_DUNGEONS} from './special-dungeons-data.js?v=0.66.0';
import {PERSONAL} from './expansion-data.js?v=0.66.0';
const page=(view,id,hero)=>({type:'ui_section',view,id,...(hero?{hero}:{})});
export function gearGoal(s,d,id){const m=d.by.equipments[id],owned=s.equipment.some(e=>e.item===id),area=Object.entries(SPECIAL_DUNGEONS).find(([,x])=>x.drops.some(r=>r.kind==='equipment'&&r.id===id));
 const where=area?.[1],key=area?.[0],clears=s.specialDungeons?.clears||{},locked=where?.parent&&(clears[where.parent+'_1']||0)<5;
 return {text:m.name+(owned?'：已有':'：未得')+(locked?'；入口 '+(clears[where.parent+'_1']||0)+'/5 次':''),done:owned,label:owned?'查看装备':area?(locked?'寻找入口':'查看掉落'):'准备打造',command:owned?{type:'ui_gearModel',id}:area?{type:'ui_specialView',id:locked?where.parent:key,tier:1,tab:'overview'}:{type:'ui_forgeTarget',id}};
}
export function tacticsGoal(s,d,g){
 if(g.kind==='phase')return phaseGoal(s,d,g.id);
 if(g.kind==='gear')return {name:'寻找'+d.by.equipments[g.id].name,steps:[gearGoal(s,d,g.id)],note:GEAR_TRAITS[g.id]?.text||'概率掉落不保证指定次数获得。'};
 if(g.kind==='personal'){const id=g.id,m=PERSONAL[id],owned=s.heroes[id]?.status==='owned';return {name:d.by.heroes[id].name+' · '+m.name,note:m.reward,steps:[{text:'本人达到 10 级（当前 '+s.heroes[id].level+'）',done:owned&&s.heroes[id].level>=10,label:'培养人物',command:page('heroes','training',id)},{text:'聚义厅达到 2 级',done:s.camp?.buildings.hall>=2,label:'扩建聚义厅',command:page('camp','buildings')},{text:'完成专属任务',done:!!s.expansion?.personal[id],label:'查看任务与条件',command:page('heroes','tasks',id)}]};}
 const m=BUILD_GUIDES[g.id];if(!m)return null;
 const rows=[];
 if(m.gear.some(id=>d.by.equipments[id].source==='forge'))rows.push({text:'聚义厅 3 级、集市 2 级',done:s.camp?.buildings.hall>=3&&s.camp?.buildings.market>=2,label:'准备营建',command:page('camp','buildings')});
 if(g.id==='interrupt'){const ready=d.heroes.find(h=>s.heroes[h.id].status==='owned'&&h.skills.some(id=>d.by.skills[id].training?.profile==='interrupt'&&!unlockReason(s,d.by.skills[id])));rows.push({text:'培养一位有打断招式的好汉'+(ready?'：'+ready.name:''),done:!!ready,label:'查看打断招式',command:page('heroes','skills',ready?.id||'yanqing')});}
 rows.push(...m.gear.map(id=>gearGoal(s,d,id)));const hasGear=m.gear.some(id=>s.equipment.some(e=>e.item===id&&e.hero&&s.team.includes(e.hero)));
 rows.push({text:'将至少一件路线装备交给出阵好汉',done:hasGear,label:'穿戴装备',command:page('bag','equipment')});
 const n=s.specialDungeons?.clears[m.trial+'_1']||0,parent=SPECIAL_DUNGEONS[m.trial].parent,entry=(s.specialDungeons?.clears[parent+'_1']||0)>=5;
 rows.push({text:'通关'+SPECIAL_DUNGEONS[m.trial].name+' · 寻常（历史 '+n+' 次）',done:n>0,label:entry?'前往密室':'寻找密室入口',command:{type:'ui_specialView',id:entry?m.trial:parent,tier:1,tab:'overview'}});
 return {name:m.name,note:m.text+' 集齐不是入场要求，可提前试阵。',steps:rows};
}

