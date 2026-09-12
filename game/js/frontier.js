import { POSTS, STATIONS, CYCLE, OFFLINE_CAP, SAFE_TIME } from './frontier-data.js?v=0.12.0';
import { requireRule, journal } from './utils.js?v=0.12.0';
import { hasHelper, HELPERS } from './helpers.js?v=0.12.0';
export { POSTS, STATIONS, CYCLE, OFFLINE_CAP, SAFE_TIME };
export function beginFrontier(s){requireRule(s.camp,'先建立寨子。');requireRule(!s.frontier,'寨务生产已经开办。');s.frontier={version:1,lastAt:s.clock,stations:Object.fromEntries(Object.keys(STATIONS).map(id=>[id,{worker:null,carry:0,bank:0}])),posts:{}};journal(s,'【经营拓土】开办农田、伐木与冶铁生产。半小时为一批，最多累计八小时；据点图已标出各路敌情。');}
export const personOwned=(s,token)=>typeof token==='string'&&(token.startsWith('hero:')?s.heroes[token.slice(5)]?.status==='owned':token.startsWith('helper:')&&HELPERS.some(h=>'helper:'+h.id===token)&&hasHelper(s,token.slice(7)));
export const away=(s,id)=>!!s.battle&&!s.battle.guest&&s.battle.team.some(u=>u.id===id);
export const workerActive=(s,token)=>personOwned(s,token)&&(!token.startsWith('hero:')||!away(s,token.slice(5)));
export function stationedAt(s,token){if(!s.frontier)return null;for(const [id,v] of Object.entries(s.frontier.stations))if(v.worker===token)return STATIONS[id].name;for(const [id,v] of Object.entries(s.frontier.posts))if(v.guard&&'hero:'+v.guard===token)return POSTS[id].name;return null;}
export function guardReady(s,id){const p=s.frontier?.posts[id],h=s.heroes[p?.guard];return !!p?.guard&&h?.status==='owned'&&!away(s,p.guard)&&h.level>=POSTS[id].level;}
export function stationYield(s,d,id){const station=STATIONS[id],row=s.frontier?.stations[id],lv=s.camp?.buildings[station.building]||0;if(!lv)return 0;const token=row?.worker;
  if(id==='workshop')return 1+(workerActive(s,token)?1:0);
  let bonus=0;if(workerActive(s,token)){if(token.startsWith('hero:'))bonus=d.by.heroes[token.slice(5)].type==='support'?3:2;else{const h=HELPERS.find(h=>'helper:'+h.id===token);bonus=h.bonus[station.resource]?3:1;}}
  return 1+lv+bonus;
}
export function accrueFrontier(s,d){const f=s.frontier;if(!f)return;const elapsed=Math.max(0,s.clock-f.lastAt),dt=Math.min(OFFLINE_CAP,elapsed),from=f.lastAt;f.lastAt=s.clock;
  for(const [id,row] of Object.entries(f.stations)){const rate=stationYield(s,d,id);if(!rate)continue;const n=Math.floor((row.carry+dt)/CYCLE);row.carry=(row.carry+dt)%CYCLE;row.bank=Math.min(Math.max(row.bank,16*rate),row.bank+n*rate);}
  for(const [id,p] of Object.entries(f.posts)){
    if(p.threat)continue;const guarded=guardReady(s,id),until=guarded?from+dt:Math.min(from+dt,p.safeAt+SAFE_TIME),time=Math.max(0,until-from);
    const n=Math.floor((p.carry+time)/CYCLE);p.carry=(p.carry+time)%CYCLE;p.bank=Math.min(16*POSTS[id].yield,p.bank+n*POSTS[id].yield);
    if(guarded)p.safeAt=s.clock;else if(s.clock>=p.safeAt+SAFE_TIME){p.threat=true;journal(s,`【据点告急】${POSTS[id].name}补给线遭袭，暂缓生产与通行。派出队伍解围后恢复，已积累物资保留。`);}
  }
}
export function postPlan(s,id){const m=POSTS[id],p=s.frontier?.posts[id],n=s.camp?.mode==='army'?Math.min(s.camp.troops,s.camp.deployment):0,food=6+Math.ceil(n/2);let reason=!m?'没有此据点':!s.frontier?'先在寨子开办经营拓土':p&&!p.threat?'已经控制，暂时无需出征':s.camp.buildings.hall<m.hall?`聚义厅需要 ${m.hall} 级`:!s.team.length?'请安排出阵好汉':Math.max(...s.team.map(id=>s.heroes[id].level))<m.level?`队中一人需要 ${m.level} 级`:!p&&m.parents.length&&!m.parents.some(id=>s.frontier.posts[id]&&!s.frontier.posts[id].threat)?'须先打通任一前置据点的补给路线':s.player.stamina<10?'体力不足':s.camp.mode==='army'&&!n?'请先募兵或改为独行':s.camp.food<food?'粮草不足':'';return {reason,troops:n,food,kind:p?'defend':'capture',model:m};}
export function enterPost(s,id){const q=postPlan(s,id);requireRule(!q.reason,q.reason);s.player.stamina-=10;s.camp.food-=q.food;return q;}
const amount=(s,id)=>id==='silver'?s.player.silver:['wood','food'].includes(id)?s.camp[id]:s.inventory[id]||0;
function add(s,id,n){n=Math.max(0,Math.min(n,10000000-amount(s,id)));if(id==='silver')s.player.silver+=n;else if(['wood','food'].includes(id))s.camp[id]+=n;else s.inventory[id]=(s.inventory[id]||0)+n;return n;}
export function finishPost(s,b){if(b.outcome!=='victory')return;const {id,kind}=b.context,m=POSTS[id];if(kind==='capture'){requireRule(!s.frontier.posts[id],'该据点已占领。');s.frontier.posts[id]={guard:null,safeAt:s.clock,threat:false,carry:0,bank:0};for(const [k,n] of Object.entries(m.first))add(s,k,n);journal(s,`【占领】${m.name}归我寨控制。首占物资已收好，六小时内安排守将可维持运输。`);}else{const p=s.frontier.posts[id];requireRule(p?.threat,'此据点不需要解围。');p.threat=false;p.safeAt=s.clock;journal(s,`【解围】${m.name}恢复生产与通行。此次不重复发放首占物资。`);}}
export function frontierAction(s,d,a){if(a.type==='frontierStart'){beginFrontier(s);return;}requireRule(s.frontier,'先开办经营拓土。');const f=s.frontier;
  if(a.type==='frontierAssign'){
    requireRule(Object.hasOwn(STATIONS,a.id)&&s.camp.buildings[STATIONS[a.id].building]>0,'先建成对应设施。');requireRule(a.worker===null||personOwned(s,a.worker),'此人尚未入寨。');requireRule(a.worker===null||!stationedAt(s,a.worker)||f.stations[a.id].worker===a.worker,'此人已有驻守或任职，请先撤下原职。');f.stations[a.id].worker=a.worker;journal(s,`【生产任职】${STATIONS[a.id].name}已${a.worker?'安排人手':'改为乡人自理'}。`);
  }else if(a.type==='frontierGuard'){
    const p=f.posts[a.id];requireRule(p,'先占领据点。');requireRule(a.hero===null||s.heroes[a.hero]?.status==='owned','守将需要已入寨好汉。');requireRule(a.hero===null||!stationedAt(s,'hero:'+a.hero)||p.guard===a.hero,'此人已有任职或驻守，请先撤下原职。');p.guard=a.hero;journal(s,`【留守】${POSTS[a.id].name}已${a.hero?'调整守将':'撤下守将'}。敌袭已发生时仍需出征解围。`);
  }else if(a.type==='frontierCollect'){
    let gathered=0;for(const [id,row] of Object.entries(f.stations)){if(id==='workshop')continue;const n=add(s,STATIONS[id].resource,row.bank);row.bank-=n;gathered+=n;}
    for(const [id,p] of Object.entries(f.posts))if(!p.threat){const n=add(s,POSTS[id].resource,p.bank);p.bank-=n;gathered+=n;}
    const workshop=f.stations.workshop,batches=Math.min(workshop.bank,Math.floor((s.inventory.scrap_iron||0)/2),Math.floor(s.camp.wood/2),10000000-(s.inventory.iron||0));if(batches){s.inventory.scrap_iron-=2*batches;s.camp.wood-=2*batches;add(s,'iron',batches);workshop.bank-=batches;gathered+=batches;}
    requireRule(gathered>0,'暂时没有可收取产出；工坊还需每批碎铁 2、木材 2。');journal(s,'【生产入库】收取已完成物资；工坊按现有原料加工，不足部分保留待加工。');
  }else throw new Error('未知经营指令。');
}
export function validateFrontier(s,d,check){const f=s.frontier,obj=v=>v&&typeof v==='object'&&!Array.isArray(v),num=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  if(f!==undefined){check(!!s.camp&&obj(f)&&f.version===1&&num(f.lastAt,s.clock)&&obj(f.stations)&&Object.keys(f.stations).length===3&&obj(f.posts),'领地经营');const assigned=new Set();
    for(const id of Object.keys(STATIONS)){const r=f.stations[id];check(obj(r)&&num(r.carry,CYCLE-1)&&num(r.bank,256)&&(r.worker===null||personOwned(s,r.worker)),'生产队列');if(r.worker){check(!assigned.has(r.worker)&&s.camp.buildings[STATIONS[id].building]>0,'生产任职');assigned.add(r.worker);}}
    for(const [id,p] of Object.entries(f.posts)){check(POSTS[id]&&obj(p)&&typeof p.threat==='boolean'&&num(p.safeAt,s.clock)&&num(p.carry,CYCLE-1)&&num(p.bank,16*POSTS[id].yield)&&(p.guard===null||s.heroes[p.guard]?.status==='owned'),'据点驻守');if(p.guard){check(!assigned.has('hero:'+p.guard),'重复驻守');assigned.add('hero:'+p.guard);}}
  }
  const b=s.battle;if(!b)return;check(b.frontierRules===undefined||b.frontierRules===1,'部队战法版本');if(b.frontierRules===1)check(b.martial===2&&!b.guest,'新部队战法');
  if(b.context?.type==='frontier'){const c=b.context,m=POSTS[c.id];check(f&&m&&!b.guest&&['capture','defend'].includes(c.kind)&&c.terrain===m.terrain&&(c.kind==='capture'?!f.posts[c.id]:f.posts[c.id]?.threat),'据点战局');}
}
