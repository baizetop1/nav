import {CAMP_PEOPLE,CAMP_PROJECTS,LIFE_THRESHOLDS} from './camp-life-data.js?v=0.83.0';
import {away} from './hero-availability.js?v=0.83.0';
import {regionBuilt} from './exploration-data.js?v=0.83.0';
import {sourceStock} from './source-goals.js?v=0.83.0';
import {gainExp} from './hero.js?v=0.83.0';
import {requireRule,journal} from './utils.js?v=0.83.0';
export const lifeBusy=s=>!!(s.battle||s.scheme||s.event||s.realm?.trek||s.expansion?.run||s.adventure?.run);
const has=(o,k)=>Object.hasOwn(o,k);
export const lifePlace=(s,id)=>({tanglong:regionBuilt(s,'forge')?'矿砂炉':'临时炉台',andaoquan:regionBuilt(s,'clinic')?'配药间':'药棚',yuehe:regionBuilt(s,'lodge')?'客舍':'廊下'}[id]||CAMP_PEOPLE[id]?.place);
export const salvageable=(s,d,e)=>!!e&&!e.hero&&!e.locked&&!e.plus&&!e.refine&&!d.by.equipments[e.item]?.source&&d.by.equipments[e.item]?.tier<=2;
export const lifePeople=s=>Object.keys(CAMP_PEOPLE).filter(id=>s.heroes[id]?.status==='owned');
export const lifePerson=(s,id)=>s.campLife?.people[id]||{talks:0,jobs:0,lastWork:''};
export const lifeBase=s=>!s.camp?'先建立寨子。':lifeBusy(s)?'先结束这趟行程。':'';
export function costReason(s,cost){return Object.entries(cost).some(([id,n])=>sourceStock(s,id)<n)?'材料还没备齐。':'';}
const stockRoom=(s,reward)=>Object.entries(reward).every(([id,n])=>sourceStock(s,id)+n<=10000000);
export function talkQuote(s,id){const p=lifePerson(s,id),m=has(CAMP_PEOPLE,id)&&CAMP_PEOPLE[id],scene=m?.scenes[p.talks];return {scene,index:p.talks,reason:lifeBase(s)||(!m||s.heroes[id]?.status!=='owned'?'这位好汉尚未入寨。':away(s,id)?'人在外头，等他回寨再聊。':!scene?'这几件事已说过了。':p.jobs<LIFE_THRESHOLDS[p.talks]?'再帮他办 '+(LIFE_THRESHOLDS[p.talks]-p.jobs)+' 次小事。':p.talks===2&&!stockRoom(s,{[id+'_token']:1})?'信物库存已满。':'')};}
export function jobQuote(s,id){const p=lifePerson(s,id),m=has(CAMP_PEOPLE,id)&&CAMP_PEOPLE[id];return {cost:m?.cost||{},reward:m?.reward||{},reason:lifeBase(s)||(!m||s.heroes[id]?.status!=='owned'?'这位好汉尚未入寨。':away(s,id)?'这位好汉尚未归寨。':!p.talks?'先聊聊近况。':p.jobs>=1000000?'办事记录已满。':p.lastWork===s.daily.date?'今天已经帮过忙了。':(s.daily.counters.life_jobs||0)>=2?'今日两件小事已办妥。':!stockRoom(s,m.reward)?'所得材料库存已满。':costReason(s,m.cost))};}
export function projectQuote(s,id){const r=has(CAMP_PROJECTS,id)&&CAMP_PROJECTS[id];return {cost:r?.cost||{},reason:lifeBase(s)||(!r?'请选择营建项目。':s.campLife?.projects.includes(id)?'已经置办。':!regionBuilt(s,r.building)?'先在探索营建修好这处建筑。':s.camp.buildings.hall<2?'聚义厅需要 2 级。':costReason(s,r.cost))};}
export function serviceQuote(s,d,id,target){const r=has(CAMP_PROJECTS,id)&&CAMP_PROJECTS[id];let reason=lifeBase(s)||(!r?'请选择建筑。':!s.campLife?.projects.includes(id)?'先置办'+r.name+'。':s.daily.counters['life_'+id]?'今天已经办过了。':''),cost={},reward={},n=0;
 if(id==='forge'){const e=s.equipment.find(e=>e.uid===target);reward={iron:3,scrap_iron:4};reason=reason||(!e?'选择一件闲置兵甲。':e.hero||e.locked?'穿戴中或锁定的兵甲不能拆。':e.plus>0||e.refine>0?'此件已经强化或精修，请用行囊中的拆解功能。':d.by.equipments[e.item].source||d.by.equipments[e.item].tier>2?'拆料台只收普通凡品、良品兵甲。':!stockRoom(s,reward)?'回收材料库存已满。':'');}
 if(id==='clinic'){n=Math.min(20,s.camp?.wounded||0);cost={herb:2,cloth:1,campFood:Math.ceil(n/2)};reason=reason||(!n?'没有需要治疗的伤兵。':costReason(s,cost));}
 if(id==='lodge'){cost={martial_pages:2,campFood:10};n=300;reason=reason||(!s.heroes[target]||s.heroes[target].status!=='owned'?'选择一名入寨好汉。':s.team.includes(target)||away(s,target)?'需安排未出阵且在寨的好汉。':s.heroes[target].level>=d.config.balance.heroLevelCap?'这位好汉已经满级。':costReason(s,cost));}
 return {reason,cost,reward,n};
}
function move(s,id,n){if(id==='silver')s.player.silver+=n;else if(id==='campWood')s.camp.wood+=n;else if(id==='campFood')s.camp.food+=n;else s.inventory[id]=(s.inventory[id]||0)+n;}
export function lifeAction(s,d,a){const id=a.id;let q;if(a.type==='lifeTalk')q=talkQuote(s,id);else if(a.type==='lifeJob')q=jobQuote(s,id);else if(a.type==='lifeBuild')q=projectQuote(s,id);else if(a.type==='lifeService')q=serviceQuote(s,d,id,a.target);else throw Error('没有这项寨务。');requireRule(!q.reason,q.reason);
 const x=s.campLife??={version:1,people:{},projects:[]};
 if(a.type==='lifeTalk'){const p=x.people[id]??={talks:0,jobs:0,lastWork:''};p.talks++;if(p.talks===3)move(s,id+'_token',1);journal(s,q.scene[1]+(p.talks===3?' '+d.by.heroes[id].name+'信物 +1。':''));return;}
 for(const [key,n]of Object.entries(q.cost||{}))move(s,key,-n);
 if(a.type==='lifeJob'){const p=x.people[id];p.jobs++;p.lastWork=s.daily.date;s.daily.counters.life_jobs=(s.daily.counters.life_jobs||0)+1;for(const [key,n]of Object.entries(q.reward))move(s,key,n);journal(s,CAMP_PEOPLE[id].job+'已办好。'+Object.entries(q.reward).map(([key,n])=>(key==='campFood'?'粮草':d.by.items[key].name)+' +'+n).join('、')+'。');return;}
 if(a.type==='lifeBuild'){x.projects.push(id);journal(s,CAMP_PROJECTS[id].name+'已经安置好。');return;}
 s.daily.counters['life_'+id]=1;
 if(id==='forge'){s.equipment=s.equipment.filter(e=>e.uid!==a.target);for(const [key,n]of Object.entries(q.reward))move(s,key,n);journal(s,'旧兵甲已拆开。收回精铁 3、碎铁 4。');}
 if(id==='clinic'){s.camp.wounded-=q.n;s.camp.troops+=q.n;journal(s,q.n+' 名伤兵完成诊疗，已归队。');}
 if(id==='lodge'){gainExp(s,a.target,q.n,d);journal(s,d.by.heroes[a.target].name+'在客舍听完讲习，历练 +300。');}
}
