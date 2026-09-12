import { requireRule, journal } from './utils.js?v=0.12.0';
import { CORPS } from './corps-data.js?v=0.12.0';
import { promotionQuote } from './quality.js?v=0.12.0';

export { CORPS };
export const CORPS_PROFILES={
  assault:{name:'冲阵',text:'随行时伤害 +4% / 8% / 12%。'},
  shield:{name:'坚壁',text:'随行时防御 +6% / 12% / 18%。'},
  archer:{name:'齐射',text:'随行时对满半血敌人伤害 +5% / 10% / 15%。'},
  scout:{name:'疾行',text:'随行时速度 +5% / 10% / 15%。'},
  naval:{name:'水战',text:'随行参与水域战场时伤害 +8% / 16% / 24%。'},
  medic:{name:'救护',text:'随行时自身气血 +6% / 12% / 18%。'}
};
export const corpsRank=(s,id)=>s.development?.corps?.[id]||1;
const active=s=>s.battle||s.scheme||s.event;
export function corpsQuote(s,id){
  const rank=corpsRank(s,id),cost={silver:rank*300,items:{iron:rank*4,cloth:rank*3,scrap_iron:rank*5,martial_pages:rank*2}};
  const reason=!CORPS[id]||s.heroes[id]?.status!=='owned'?'先迎这位好汉入寨':rank>=3?'已达精锐三阶':!s.camp||s.camp.buildings.barracks<rank||s.camp.buildings.hall<rank+1?`须聚义厅 ${rank+1} 级、兵营 ${rank} 级`:s.player.silver<cost.silver||Object.entries(cost.items).some(([k,n])=>(s.inventory[k]||0)<n)?'练兵材料或碎银不足':active(s)?'先结束当前战局或际遇':'';
  return {rank,cost,reason};
}
export function ensureDevelopment(s){return s.development??={version:1,corps:{},presets:{},goal:null,ledger:[]};}
export function targetQuote(s,d,goal=s.development?.goal){
  if(!goal)return null;
  if(goal.kind==='promotion'){const q=promotionQuote(s,goal.id);return {name:d.by.heroes[goal.id].name+'升品',cost:q.cost,reason:q.reason,view:'heroes'};}
  if(goal.kind==='corps'){const q=corpsQuote(s,goal.id);return {name:CORPS[goal.id].name+'练兵',cost:q.rank<3?q.cost:null,reason:q.reason,view:'heroes'};}
  const e=d.by.equipments[goal.id];return {name:'打造'+e.name,cost:e.recipe,view:'forge'};
}
export function developmentAction(s,d,a){
  const dev=ensureDevelopment(s);
  if(a.type==='corpsTrain'){
    const q=corpsQuote(s,a.id);requireRule(!q.reason,q.reason);s.player.silver-=q.cost.silver;for(const [id,n] of Object.entries(q.cost.items))s.inventory[id]-=n;dev.corps[a.id]=q.rank+1;
    journal(s,`【专属练兵】${d.by.heroes[a.id].name} · ${CORPS[a.id].name}升至 ${q.rank+1} 阶。部队随将出征，共用寨中兵额。`);
  }else if(a.type==='presetSave'){
    requireRule([1,2,3].includes(a.slot)&&s.camp&&s.team.length,'先建寨并安排出阵好汉。');
    const {mode,tactic,deployment}=s.camp;dev.presets[a.slot]={team:[...s.team],mode,tactic,deployment};journal(s,`【阵容】已将当前英雄与军令存为阵容 ${a.slot}。`);
  }else if(a.type==='presetLoad'){
    const p=dev.presets[a.slot];requireRule([1,2,3].includes(a.slot)&&p&&s.camp,'此阵容尚未保存。');requireRule(p.team.every(id=>s.heroes[id]?.status==='owned'),'阵容中有尚未入寨的好汉。');
    s.formationPending=JSON.stringify(s.team)!==JSON.stringify(p.team)||s.formationPending;s.team=[...p.team];Object.assign(s.camp,{mode:p.mode,tactic:p.tactic,deployment:p.deployment});journal(s,`【阵容】已启用阵容 ${a.slot}。兵力不足时仅派实际在营乡勇。`);
  }else if(a.type==='goalSet'){
    requireRule(['promotion','corps','craft'].includes(a.kind)&&(a.kind==='craft'?d.by.equipments[a.id]:s.heroes[a.id]?.status==='owned'),'无法追踪这个目标。');dev.goal={kind:a.kind,id:a.id};journal(s,'【养成目标】已在寨子与历练页置顶材料清单。');
  }else if(a.type==='goalClear'){dev.goal=null;
  }else if(a.type==='scrapSmelt'){
    requireRule((s.inventory.scrap_iron||0)>=5&&s.player.silver>=20,'重熔需要碎铁 5、碎银 20。');s.inventory.scrap_iron-=5;s.player.silver-=20;s.inventory.iron=(s.inventory.iron||0)+2;journal(s,'【回炉重熔】碎铁 5、碎银 20，炼得精铁 2。');
  }else throw new Error('未知养成操作。');
}
const dateKey=now=>new Date(now+8*3600000).toISOString().slice(0,10);
export function recordLedger(before,s){
  const date=dateKey(s.clock),dev=ensureDevelopment(s);
  let row=dev.ledger.find(r=>r.date===date);if(!row){row={date,gained:{},spent:{},wins:0,losses:0,recruits:0};dev.ledger.push(row);dev.ledger=dev.ledger.slice(-2);}
  const stocks=v=>({silver:v.player.silver,wood:v.camp?.wood||0,food:v.camp?.food||0,...v.inventory});
  const old=stocks(before),now=stocks(s);
  for(const id of new Set([...Object.keys(old),...Object.keys(now)])){const n=(now[id]||0)-(old[id]||0);if(n){const bucket=n>0?row.gained:row.spent;bucket[id]=Math.min(10000000,(bucket[id]||0)+Math.abs(n));}}
  for(const [field,key] of [['wins','battleWin'],['losses','battleLoss'],['recruits','recruit']])row[field]=Math.min(10000000,row[field]+Math.max(0,(s.stats[key]||0)-(before.stats[key]||0)));
}
export function validateDevelopment(s,d,check){
  const dev=s.development,obj=v=>v&&typeof v==='object'&&!Array.isArray(v),num=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  if(dev!==undefined){
    check(obj(dev)&&dev.version===1&&obj(dev.corps)&&obj(dev.presets)&&Array.isArray(dev.ledger)&&dev.ledger.length<=2,'寨中养成');
    for(const [id,n] of Object.entries(dev.corps))check(CORPS[id]&&s.heroes[id]?.status==='owned'&&num(n,2,3)&&s.camp?.buildings.hall>=n&&s.camp?.buildings.barracks>=n-1,'专属兵阶');
    for(const [id,p] of Object.entries(dev.presets))check(['1','2','3'].includes(id)&&s.camp&&obj(p)&&Array.isArray(p.team)&&p.team.length>0&&p.team.length<=3&&new Set(p.team).size===p.team.length&&p.team.every(id=>s.heroes[id]?.status==='owned')&&['army','solo'].includes(p.mode)&&['balanced','assault','guard'].includes(p.tactic)&&num(p.deployment,1,100),'阵容预设');
    const g=dev.goal;check(g===null||(obj(g)&&['promotion','corps','craft'].includes(g.kind)&&(g.kind==='craft'?!!d.by.equipments[g.id]:s.heroes[g.id]?.status==='owned')),'材料目标');
    let last='';for(const r of dev.ledger){check(obj(r)&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date>last&&r.date<=dateKey(s.clock),'小结日期');last=r.date;for(const k of ['gained','spent']){check(obj(r[k]),'小结材料');for(const [id,n] of Object.entries(r[k]))check((['silver','wood','food'].includes(id)||d.by.items[id])&&num(n,1,10000000),'小结数量');}for(const k of ['wins','losses','recruits'])check(num(r[k],0,10000000),'小结次数');}
  }
  const b=s.battle;if(!b)return;
  for(const u of [...(b.team||[]),...(b.enemy||[])]){
    if(b.martial!==2||u.side!=='team'){check(u.corps===undefined&&u.training?.quality===undefined,'旧战局或敌人不可混入专属兵快照');continue;}
    check(!b.guest&&!!s.camp&&num(u.training?.quality,0,2),'品阶战斗快照');
    if(b.expedition){const c=u.corps,m=CORPS[u.id];check(obj(c)&&c.id===u.id&&c.arm===m.arm&&num(c.rank,1,3)&&num(c.troops,0,100),'专属部队快照');}
    else check(u.corps===undefined,'未随军的兵种快照');
  }
  if(b.martial===2&&b.expedition)check(b.team.reduce((n,u)=>n+u.corps.troops,0)===b.expedition.troops,'各部兵力合计');
}
