import {CHRONICLES,CHRONICLE_RANK_CAP,FORGE_STEPS,patrolRule,patrolStrength} from './chronicle-data.js?v=0.54.0';
import {JOURNEYS} from './journey-data.js?v=0.54.0';
import {routeBalance,openRouteRewards} from './journey-rewards.js?v=0.54.0';
import {gainItem} from './item.js?v=0.54.0';
import {rotationCalendar} from './rotations.js?v=0.54.0';
import {attackInterval} from './battle.js?v=0.54.0';
import {requireRule,hasOwn,journal} from './utils.js?v=0.54.0';
export function chronicleRecord(s){
 s.realm.journey??={version:1,best:{},weekly:{period:rotationCalendar(s.clock).period,tickets:0},last:null};
 return s.realm.journey.chronicle??={version:1,routes:Object.fromEntries(Object.keys(CHRONICLES).map(id=>[id,{choices:[],patrol:0,forged:0}])),active:null};
}
export function chroniclePerks(s,region){const choices=s.realm?.journey?.chronicle?.routes[region]?.choices||[];return {rage:choices.filter(x=>x==='watch').length*5,heal:choices.filter(x=>x==='shelter').length*300};}
export function chronicleForgeQuote(s,region){
 const route=s.realm?.journey?.chronicle?.routes[region],step=FORGE_STEPS[route?.forged||0],model=CHRONICLES[region];
 const reason=!hasOwn(CHRONICLES,region)?'请选择一条商路。':!route||route.choices.length<3?'先完成这条商路的三章行记。':!step?'此图谱已完成三次淬炼。':route.patrol<step.rank?'先通关本路巡守第 '+step.rank+' 阶。':!s.equipment.some(e=>e.item===model.equipment)?'先兑换一件本路专属装备。':routeBalance(s,region)<step.marks?'路契不足，还差 '+(step.marks-routeBalance(s,region))+'。':(s.inventory.iron||0)<step.iron?'精铁不足。':s.player.silver<step.silver?'碎银不足。':'';
 return {reason,step,level:route?.forged||0};
}
function marks(s,region,n){const r=openRouteRewards(s);requireRule((r.earned[region]||0)+n<=10000000,'路契已达存储上限。');r.earned[region]=(r.earned[region]||0)+n;}
export function chronicleAction(s,d,a){
 requireRule(s.camp&&s.realm,'先建立寨子。');requireRule(!s.realm.trek&&!s.expansion?.run,'先结束本趟远征。');
 requireRule(['chronicleAccept','chronicleBuild','chronicleCancel','chroniclePatrol','chronicleForge'].includes(a.type),'没有这项商路事务。');
 const r=chronicleRecord(s);
 if(a.type==='chronicleCancel'){requireRule(r.active,'目前没有接下的商路事务。');r.active=null;journal(s,'商路事务暂且搁下，已修成的工程与巡守成绩保留。');return;}
 if(a.type==='chronicleBuild'){
  const job=r.active;requireRule(job?.kind==='story'&&job.ready,'先完成这章委托，走通商路回寨。');
  const route=r.routes[job.region],chapter=CHRONICLES[job.region].chapters[job.chapter];requireRule(route.choices.length===job.chapter,'此章工程已完成。');
  for(const [id,n]of Object.entries(chapter.cost)){const have=id==='silver'?s.player.silver:['wood','food'].includes(id)?s.camp[id]:s.inventory[id]||0;requireRule(have>=n,'营建材料不足。');}
  for(const [id,n]of Object.entries(chapter.reward))requireRule((s.inventory[id]||0)+n<=10000000,'奖励物资已达存储上限。');
  for(const [id,n]of Object.entries(chapter.cost)){if(id==='silver')s.player.silver-=n;else if(['wood','food'].includes(id))s.camp[id]-=n;else s.inventory[id]-=n;}
  route.choices.push(job.choice);for(const [id,n]of Object.entries(chapter.reward))gainItem(s,id,n,d);
  journal(s,'【'+chapter.title+'】'+chapter.choices[job.choice].ending);journal(s,'【商路营建】'+CHRONICLES[job.region].project+' '+route.choices.length+'/3；'+(job.choice==='shelter'?'本路每场胜利后，未退阵好汉多恢复 3% 气血。':'本路每场开战，未退阵好汉多得 5 点怒气。'));r.active=null;return;
 }
 requireRule(hasOwn(CHRONICLES,a.region),'请选择一条商路。');const route=r.routes[a.region];
 if(a.type==='chronicleForge'){
  const q=chronicleForgeQuote(s,a.region);requireRule(!q.reason,q.reason);s.player.silver-=q.step.silver;s.inventory.iron-=q.step.iron;
  const rewards=openRouteRewards(s);rewards.spent[a.region]=(rewards.spent[a.region]||0)+q.step.marks;route.forged++;
  journal(s,'【图谱淬炼】'+d.by.equipments[CHRONICLES[a.region].equipment].name+'图谱 '+route.forged+'/3，同型装备属性额外提高 '+(route.forged*15)+'%。强化等级不变。');return;
 }
 requireRule(!r.active,'先办完或搁下已接的商路事务。');
 if(a.type==='chronicleAccept'){
  const chapter=route.choices.length;requireRule(chapter<3,'这条商路的行记已经完成。');requireRule(['shelter','watch'].includes(a.choice),'请选择接应行旅或清除强敌。');requireRule(s.camp.buildings.hall>=chapter+2,'聚义厅须达 '+(chapter+2)+' 级。');
  r.active={kind:'story',region:a.region,chapter,choice:a.choice,ready:false};journal(s,'【商路行记】'+CHRONICLES[a.region].chapters[chapter].title+'：'+CHRONICLES[a.region].chapters[chapter].choices[a.choice].text+'接下之后的行程才记入进度。');return;
 }
 requireRule(route.choices.length===3,'先修成这条商路的三章工程。');requireRule(Number.isInteger(a.rank)&&a.rank>=1&&a.rank<=CHRONICLE_RANK_CAP&&a.rank<=route.patrol+1,'先完成上一阶巡守。');
 r.active={kind:'patrol',region:a.region,rank:a.rank};journal(s,'【商路巡守】'+JOURNEYS[a.region].name+'第 '+a.rank+' 阶；'+patrolRule(a.rank).text+'启程前仍可调整队伍。');
}
export function captureChronicle(s,region,tier){const a=s.realm?.journey?.chronicle?.active;if(!a||a.region!==region||a.kind==='story'&&(a.ready||tier<a.chapter+1)||a.kind==='patrol'&&tier!==3)return null;return a.kind==='story'?{kind:a.kind,region,chapter:a.chapter,choice:a.choice}:{kind:a.kind,region,rank:a.rank};}
export function applyChronicleBattle(s,b,j){
 const perks=chroniclePerks(s,j.region);for(const u of b.team)if(u.hp>0)u.rage=Math.min(100,u.rage+perks.rage);
 if(perks.rage)b.log.push('【商路哨所】在阵好汉怒气 +'+perks.rage+'。');
 if(!j.chronicle)return;b.journey.chronicle={...j.chronicle};if(j.chronicle.kind!=='patrol')return;
 const rank=j.chronicle.rank,q=patrolRule(rank),scale=patrolStrength(rank);
 for(const u of b.enemy){u.hp=u.maxHp=Math.round(u.maxHp*scale.hp);u.attack=Math.round(u.attack*scale.attack);u.defense=Math.round(u.defense*scale.defense);u.speed=Math.round(u.speed*q.speed);u.nextAttackAt=attackInterval(u);u.rage=Math.min(100,u.rage+q.rage);if(q.guard){const guard=u.statuses.find(x=>x.id==='guard');if(guard){guard.value=Math.max(guard.value,q.guard);guard.expiresAt=Math.max(guard.expiresAt,6000);}else u.statuses.push({id:'guard',value:q.guard,expiresAt:6000});}}
 b.log.push('【第 '+rank+' 阶巡守 · '+q.name+'】'+q.text);
}
export function settleChronicle(s,d,j,complete){
 if(!j.chronicle)return;const r=s.realm.journey.chronicle,a=r.active,p=j.chronicle;
 requireRule(a&&a.region===p.region&&a.kind===p.kind&&(p.kind==='story'?a.chapter===p.chapter&&a.choice===p.choice:a.rank===p.rank),'商路目标与本趟行程不符。');
 if(!complete){journal(s,'【商路行记】本趟未走通，委托仍在，可整备后重试。');return;}
 if(p.kind==='story'){
  const qualified=p.choice==='shelter'?j.decisions.includes('event:rescue'):j.path.includes('elite');
  if(qualified){a.ready=true;journal(s,'【商路行记】委托办妥。回到商路行记，备齐材料便可动工。');}
  else journal(s,'【商路行记】路线虽已走通，本章仍需'+(p.choice==='shelter'?'在行旅节点选择护送':'击败一处强敌辎重')+'；下趟再办。');return;
 }
 const route=r.routes[p.region],first=p.rank>route.patrol;route.patrol=Math.max(route.patrol,p.rank);marks(s,p.region,Math.ceil(p.rank/2));
 if(first){gainItem(s,'material_choice',1,d);if(p.rank===4||p.rank===8)gainItem(s,'recruit_order',1,d);if(p.rank===8)gainItem(s,'immortal_seal',1,d);}
 journal(s,'【商路巡守】第 '+p.rank+' 阶已通，额外路契 +'+Math.ceil(p.rank/2)+(first?'；本阶首奖已入库。':'；首奖已领，不重复发放。'));r.active=null;
}
export function chronicleObjective(s){const r=s.realm?.journey?.chronicle,a=r?.active;return a?{title:a.kind==='story'?CHRONICLES[a.region].chapters[a.chapter].title:JOURNEYS[a.region].name+' · 第 '+a.rank+' 阶巡守',text:a.kind==='story'?(a.ready?'委托已办妥，回行记备料动工。':CHRONICLES[a.region].chapters[a.chapter].choices[a.choice].text):patrolRule(a.rank).text,command:{type:'ui_section',view:'realm',id:'chronicles'},label:a.kind==='story'&&a.ready?'备料动工':'查看商路目标'}:null;}
