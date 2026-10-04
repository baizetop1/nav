import {roleKind} from './lineup-model.js?v=0.58.0';
import {experienceToNext} from './progression.js?v=0.58.0';
import {unlockReason} from './growth.js?v=0.58.0';
import {GEAR_TRAITS} from './tactics-data.js?v=0.58.0';
const page=(view,id,hero)=>({type:'ui_section',view,id,...(hero?{hero}:{})});
export const PHASES={company:'立寨成队',arms:'第一套战法兵甲',story:'走完前两卷'};
export const away=(s,id)=>s.affairs?.mission?.hero===id||!!s.realm?.squad?.team.includes(id)||!!s.realm?.trek?.team.includes(id)||!!s.expansion?.run?.team.includes(id);
export function starterTeam(s,d){
 const pool=d.heroes.filter(h=>s.heroes[h.id].status==='owned'&&!away(s,h.id)).sort((a,b)=>s.heroes[b.id].level-s.heroes[a.id].level||a.id.localeCompare(b.id));
 const skills=h=>h.skills.map(id=>d.by.skills[id]).filter(k=>!unlockReason(s,k)&&k.type!=='passive');
 const selected=[],take=predicate=>{const h=pool.find(x=>!selected.includes(x.id)&&predicate(x));if(h)selected.push(h.id);return h;};
 const tank=take(h=>h.type==='defender'||roleKind(h.id)==='opening_front'),healer=take(h=>skills(h).some(k=>k.effect.kind==='heal'&&k.training?.profile!=='protect'));
 take(h=>skills(h).some(k=>k.training?.profile==='interrupt'));while(selected.length<Math.min(pool.length,3))take(()=>true);
 if(healer&&selected.length===3){selected.splice(selected.indexOf(healer.id),1);selected.push(healer.id);}
 return {team:selected,tank:tank?.id,healer:healer?.id,missing:[!tank?'缺少前排承伤者':'',!healer?'缺少治疗招式':'',selected.length<3?'尚未凑齐三人':''].filter(Boolean)};
}
export function growthBudget(s,d,id,target){const h=s.heroes[id];target=Math.min(d.config.balance.heroLevelCap,target||([10,15,20,30,40,60].find(n=>n>h.level)||d.config.balance.heroLevelCap));let exp=-h.exp;for(let i=h.level;i<target;i++)exp+=experienceToNext(i);exp=Math.max(0,exp);return {target,exp,pills:Math.ceil(exp/d.by.items.exp_pill.effect.exp),owned:s.inventory.exp_pill||0};}
export function phaseGoal(s,d,id){
 const team=s.team,low=team.find(id=>s.heroes[id].level<10)||team[0],geared=team.length===3&&team.every(id=>['weapon','armor'].every(type=>s.equipment.some(e=>e.hero===id&&d.by.equipments[e.item].type===type))),trait=s.equipment.find(e=>GEAR_TRAITS[e.item]);
 const row=(text,done,label,command)=>({text,done:!!done,label,command});
 if(id==='company')return {name:PHASES[id],note:'先用已入寨的人物配队。白胜可以治疗，杜迁和宋万可承伤；不必等待高星抽取。基础兵器与衣甲没有新式特效。',steps:[row('三名好汉出阵',team.length===3,'配队与补位',page('heroes','formation')),row('出阵三人均达到 10 级',team.length===3&&team.every(id=>s.heroes[id].level>=10),'培养等级',page('heroes','training',low)),row('每人穿戴兵器与衣甲',geared,'整理装备',page('forge','equipment')),row('资源副本全员存活速胜（60秒内，不用药）',Object.keys(s.campaign?.mastery||{}).some(k=>['silver','grain','timber','herbs'].some(id=>k.startsWith(id+'_'))),'基础资源',page('trials','resources'))]};
 if(id==='arms')return {name:PHASES[id],note:'先做一件有用的战法装备，不要求凑齐套装。缺稀有图纸时，基础装备仍可继续强化和转交。',steps:[row('聚义厅 3 级、集市 2 级',s.camp?.buildings.hall>=3&&s.camp?.buildings.market>=2,'营建设施',page('camp','buildings')),row('获得一件战法装备',!!trait,'打造拒马枪',{type:'ui_forgeTarget',id:'bastion_spear'}),row('将战法装备交给出阵好汉',s.equipment.some(e=>GEAR_TRAITS[e.item]&&team.includes(e.hero)),'穿戴装备',page('forge','equipment')),row('通关任意密室',Object.keys(s.specialDungeons?.clears||{}).some(k=>/^(minechief|marshnest|ruinsvault)_/.test(k)),'寻找密室',{type:'ui_specialView',id:'mine',tier:1,tab:'overview'})]};
 return {name:PHASES.story,note:'不设每日截止或额外领奖。沿当前剧情继续，已完成的章节会自动记入。',steps:d.chapters.slice(0,2).map(c=>row(c.title||c.name||c.id,s.progress.flags[c.completeFlag],'继续主线',{type:'ui_storyResume'}))};
}
export const hasProgressionPaths=s=>s.development?.goal?.kind==='phase'||!!s.battle?.context?.route||!!s.specialDungeons?.last?.route;
