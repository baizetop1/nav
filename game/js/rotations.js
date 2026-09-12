import { requireRule, journal } from './utils.js?v=0.9.0';

export const DAILY_ROUTES=[
  {id:'ore',name:'铁石山道',days:[1,4,0],enemies:['soldier','guard'],reward:{iron:4,cloth:3,scrap_iron:3},use:'铁与布用于打造装备，碎铁用于装备强化。'},
  {id:'manual',name:'演武旧场',days:[2,5,0],enemies:['bandit','bandit_chief'],reward:{martial_pages:4,exp_pill:2},use:'武学残页用于招式升级与升品，经验丹用于提升好汉等级。'},
  {id:'stable',name:'牧野护运',days:[3,6,0],enemies:['road_raider','bandit'],reward:{mount_feed:4,mount_token:2},use:'草料用于培养坐骑亲密度，驯骑凭记用于坐骑升阶。'},
];
export const WEEKLY_ROUTES=[
  {id:'siege',name:'破阵攻坚',enemies:['guard','bandit_chief'],terrain:'land',tip:'重甲守军护住寨门，谋攻与破甲更有效。'},
  {id:'convoy',name:'千里护粮',enemies:['road_raider','soldier'],terrain:'land',tip:'游骑绕后截粮，准备远射与护阵应对。'},
  {id:'tide',name:'水泊争锋',enemies:['bandit','bandit_chief'],terrain:'water',tip:'水路混战，水战特性与稳健补给更有用。'},
  {id:'fortress',name:'连营拔寨',enemies:['guard','road_raider','bandit_chief'],terrain:'land',tip:'混合敌军连续压阵，安排控制、恢复和输出。'},
];
const datePattern=/^\d{4}-\d{2}-\d{2}$/,periodPattern=/^\d{4}-(0[1-9]|1[0-2])-([1-4])$/;
const validDate=value=>typeof value==='string'&&datePattern.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function rotationCalendar(now){
  const d=new Date(now+8*3600000),year=d.getUTCFullYear(),month=d.getUTCMonth()+1,day=d.getUTCDate(),week=Math.min(4,Math.floor((day-1)/7)+1),ym=year+'-'+String(month).padStart(2,'0');
  const start=Date.UTC(year,month-1,(week-1)*7+1)-8*3600000,end=(week===4?Date.UTC(year,month,1):Date.UTC(year,month-1,week*7+1))-8*3600000;
  return {date:ym+'-'+String(day).padStart(2,'0'),weekday:d.getUTCDay(),period:ym+'-'+week,week,start,end,route:WEEKLY_ROUTES[week-1]};
}
export const weeklyScore=(tier,elapsed,hp)=>tier*1000000+hp*100+Math.max(0,180-Math.ceil(elapsed/1000));
export function rotationProgress(s){return s.campaign||{version:1,daily:{date:rotationCalendar(s.clock).date,uses:{}},weekly:{}};}
export function dailyUses(s,id){const p=rotationProgress(s);return p.daily.date===rotationCalendar(s.clock).date?p.daily.uses[id]||0:0;}
export function rotationPlan(s,kind,id,tier=1){
  const cal=rotationCalendar(s.clock),weekly=kind==='weekly',route=weekly?cal.route:DAILY_ROUTES.find(r=>r.id===id),record=rotationProgress(s).weekly[cal.period];
  requireRule(['daily','weekly'].includes(kind)&&route&&route.id===id,'这处轮换历练尚未开放。');
  requireRule(Number.isInteger(tier)&&tier>=1&&tier<=(weekly?5:3),'历练难度无效。');
  const level=weekly?5+tier*5:(tier-1)*10+1,hall=weekly?Math.ceil(tier/2)+1:tier,stamina=weekly?15:10;
  const n=s.camp?.mode==='army'?Math.min(s.camp.troops,s.camp.deployment):0,food=weekly?5+Math.ceil(n/2):Math.ceil(n/2);
  let reason=!s.camp?'先建立寨子':!s.team.length?'先安排出阵好汉':s.camp.buildings.hall<hall?`需要聚义厅 ${hall} 级`:Math.max(...s.team.map(id=>s.heroes[id].level))<level?`队中一人需要 ${level} 级`:'';
  if(!reason&&!weekly&&!route.days.includes(cal.weekday))reason='今日未开放，可查看七日轮换表';
  if(!reason&&!weekly&&dailyUses(s,id)>=3)reason='今日此处已挑战 3 次';
  if(!reason&&weekly&&tier>(record?.tier||0)+1)reason='先通关上一层';
  if(!reason&&s.player.stamina<stamina)reason='体力不足';
  if(!reason&&s.camp.mode==='army'&&!n)reason='先募兵或改为英雄独行';
  if(!reason&&s.camp.food<food)reason='出征粮草不足';
  return {route,weekly,tier,level,hall,stamina,food,troops:n,reason,scale:weekly?.8+tier*.7:.55+(tier-1)*1.2,period:weekly?cal.period:cal.date};
}
export function enterRotation(s,kind,id,tier){
  const plan=rotationPlan(s,kind,id,tier);requireRule(!plan.reason,plan.reason);
  s.campaign??=rotationProgress(s);const p=s.campaign,cal=rotationCalendar(s.clock);
  if(p.daily.date!==cal.date)p.daily={date:cal.date,uses:{}};
  if(!plan.weekly)p.daily.uses[id]=(p.daily.uses[id]||0)+1;
  s.player.stamina-=plan.stamina;s.camp.food-=plan.food;
  return plan;
}
export function finishRotation(s,b){
  if(b.outcome!=='victory')return null;
  const {kind,id,tier,period}=b.context;
  if(kind==='daily'){const r=DAILY_ROUTES.find(r=>r.id===id);journal(s,`【材料历练】${r.name} ${tier} 阶完成。`);return {items:Object.fromEntries(Object.entries(r.reward).map(([k,n])=>[k,n*tier]))};}
  const p=s.campaign,old=p.weekly[period],hp=Math.floor(b.team.reduce((n,u)=>n+u.hp/u.maxHp,0)/b.team.length*1000),score=weeklyScore(tier,b.elapsed,hp),first=tier>(old?.tier||0);
  if(!old||score>old.score)p.weekly[period]={tier,score,elapsed:b.elapsed,hp};
  const keys=Object.keys(p.weekly).sort();while(keys.length>48)delete p.weekly[keys.shift()];
  journal(s,`【周本战绩】第 ${tier} 层 · ${score} 分。${first?'本层首次通关，领取养成材料。':'已记录较佳成绩，本层首通奖励不重复发放。'}`);
  return first?{items:{spirit_essence:2,immortal_seal:1,martial_pages:5,mount_token:2}}:null;
}
export function validRotationContext(c){
  if(c?.type!=='rotation'||!Number.isInteger(c.tier))return false;
  if(c.kind==='daily')return DAILY_ROUTES.some(r=>r.id===c.id)&&validDate(c.period)&&c.tier>=1&&c.tier<=3;
  const m=periodPattern.exec(c.period);return c.kind==='weekly'&&m&&WEEKLY_ROUTES[Number(m[2])-1].id===c.id&&c.tier>=1&&c.tier<=5;
}
export function validateCampaign(s,check){
  if(s.campaign===undefined){check(s.battle?.context.type!=='rotation','轮换战局进度');return;}
  const p=s.campaign;check(s.camp&&p&&p.version===1&&p.daily&&validDate(p.daily.date)&&p.daily.uses&&typeof p.daily.uses==='object'&&!Array.isArray(p.daily.uses)&&p.weekly&&typeof p.weekly==='object'&&!Array.isArray(p.weekly),'轮换进度');
  for(const [id,n] of Object.entries(p.daily.uses))check(DAILY_ROUTES.some(r=>r.id===id)&&Number.isInteger(n)&&n>=0&&n<=3,'材料本次数');
  check(Object.keys(p.weekly).length<=48,'周本历史长度');
  for(const [period,r] of Object.entries(p.weekly))check(periodPattern.test(period)&&r&&Number.isInteger(r.tier)&&r.tier>=1&&r.tier<=5&&Number.isInteger(r.elapsed)&&r.elapsed>=0&&r.elapsed<=180000&&Number.isInteger(r.hp)&&r.hp>=0&&r.hp<=1000&&r.score===weeklyScore(r.tier,r.elapsed,r.hp),'周本成绩');
  check(s.scheme?.context.type!=='rotation','轮换战局类型');
  if(s.battle?.context.type==='rotation'){
    const c=s.battle.context;check(validRotationContext(c)&&!s.battle.guest,'轮换战局');
    check(c.kind==='daily'?p.daily.date===c.period&&(p.daily.uses[c.id]||0)>0:c.tier<=(p.weekly[c.period]?.tier||0)+1,'轮换挑战记录');
  }
}
export function rankSnapshots(rows,now){
  const {period}=rotationCalendar(now),entries=[];
  for(const row of rows){try{const state=JSON.parse(row.raw);validateCampaign(state,(ok)=>{if(!ok)throw Error('Invalid score');});const r=state.campaign?.weekly[period];if(r)entries.push({id:row.id,tier:r.tier,score:r.score});}catch{}}
  entries.sort((a,b)=>b.score-a.score||a.id-b.id);let rank=0;return {period,entries:entries.map((r,i)=>{if(!i||r.score!==entries[i-1].score)rank=i+1;return {...r,rank};})};
}
