import {heroAbsence,heroPosting} from './hero-availability.js?v=0.91.0';
import {professionProfile,WORK_CYCLE,WORK_OFFLINE_CAP,WORK_STOCK_CAP,WORK_RESOURCE_NAMES} from './camp-work-data.js?v=0.91.0';
import {requireRule,journal} from './utils.js?v=0.91.0';
export {professionProfile,WORK_CYCLE,WORK_OFFLINE_CAP};
const keys=['herb','cloth','food'],zero=()=>({herb:0,cloth:0,food:0});
const owned=(s,id)=>!!id&&s.heroes[id]?.status==='owned';
const make=s=>s.campWork??={version:1,clinic:{hero:null,enabled:false,auto:false,lastAt:s.clock,carry:0,budget:zero(),treated:0,spent:zero(),revision:0}};
const bump=c=>{c.revision++;};
const stock=(s,key)=>key==='food'?s.camp.food:s.inventory[key]||0;
const add=(s,key,n)=>{if(key==='food')s.camp.food+=n;else s.inventory[key]=(s.inventory[key]||0)+n;};
function treatmentCost(id,n){return {herb:Math.ceil(n/(['andaoquan','liangxing'].includes(id)?2:1)),cloth:Math.ceil(n/(id==='andaoquan'?6:4)),food:n};}
function treatmentCapacity(s,hero,profile){const v=s.heroes[hero],base=hero==='andaoquan'?12:hero==='liangxing'?6:3+Math.floor((profile.rarity-1)/2);return (base+Math.max(0,(s.camp?.buildings.clinic||0)-1)*2+Math.floor(((v?.level||1)-1)/10)+(v?.quality||0))*(s.realm?.branches.clinic==='recovery'?2:1);}
export function clinicQuote(s,d){
 const c=s.campWork?.clinic,hero=c?.hero||null,profile=professionProfile(d.by.heroes[hero]),wounded=s.camp?.wounded||0,budget=c?.budget||zero(),capacity=profile&&owned(s,hero)?treatmentCapacity(s,hero,profile):0;
 let status='working',reason='';
 if(!s.camp||!(s.camp.buildings.clinic>0)){status='disabled';reason='先建成医馆。';}
 else if(!owned(s,hero)){status='unassigned';reason='尚未安排坐诊好汉。';}
 else if(!c.enabled){status='disabled';reason='自动诊疗已关闭。';}
 else if(heroPosting(s,hero,'clinic')){status='conflict';reason=heroPosting(s,hero,'clinic')+'，先卸下原职。';}
 else if(heroAbsence(s,hero)){status='absent';reason=heroAbsence(s,hero)+'，归寨后恢复坐诊。';}
 else if(!wounded){status='idle';reason='暂无伤兵，正在整理药材。';}
 let available=0;
 if(status==='working')for(let n=Math.min(capacity,wounded,WORK_STOCK_CAP-(c.treated||0),WORK_STOCK_CAP-(s.camp.troops||0));n>0;n--){const cost=treatmentCost(hero,n);if(keys.every(k=>budget[k]>=cost[k]&&(c.spent[k]||0)+cost[k]<=WORK_STOCK_CAP)){available=n;break;}}
 if(status==='working'&&!available){status='empty';reason=keys.some(k=>budget[k]<treatmentCost(hero,1)[k])?'专用物资不足，诊疗已暂停。':'诊疗累计数已达上限。';}
 const active=status==='working';
 return {hero,profile,status,active,reason,capacity,cost:treatmentCost(hero,available||Math.min(capacity,wounded)||1),budget:{...budget},available,wounded,treated:c?.treated||0,spent:{...(c?.spent||zero())},enabled:!!c?.enabled,auto:!!c?.auto,carry:c?.carry||0,waitMs:active?Math.max(0,WORK_CYCLE-(c?.carry||0)):0};
}
export const clinicStatus=clinicQuote;
export function clinicBatchCost(s,d){const c=s.campWork?.clinic,h=d.by.heroes[c?.hero],profile=professionProfile(h);return h&&owned(s,h.id)?treatmentCost(h.id,treatmentCapacity(s,h.id,profile)):zero();}
function assignAutomatic(s,d){const c=s.campWork?.clinic;if(!c?.auto||c.hero||!(s.camp?.buildings.clinic>0))return false;const hero=['andaoquan','liangxing'].find(id=>d.by.heroes[id]&&owned(s,id)&&!heroAbsence(s,id)&&!heroPosting(s,id,'clinic'));if(!hero)return false;c.hero=hero;c.enabled=true;c.carry=0;c.lastAt=s.clock;journal(s,'【医馆坐诊】'+d.by.heroes[hero].name+'接手空岗。诊疗只使用已拨入医馆的物资。');return true;}
// Called at clock boundaries only; quotes and scene animation never settle work.
export function accrueCampWork(s,d){
 const c=s.campWork?.clinic;if(!c)return;const old=JSON.stringify(c),elapsed=Math.max(0,s.clock-c.lastAt),dt=Math.min(WORK_OFFLINE_CAP,elapsed);c.lastAt=Math.max(c.lastAt,s.clock);
 let q=clinicQuote(s,d),treated=0;if(!q.active)c.carry=0;
 else {let time=c.carry+dt;while(time>=WORK_CYCLE&&q.active){time-=WORK_CYCLE;const cost=treatmentCost(c.hero,q.available);for(const key of keys){c.budget[key]-=cost[key];c.spent[key]+=cost[key];}s.camp.wounded-=q.available;s.camp.troops+=q.available;c.treated+=q.available;treated+=q.available;q=clinicQuote(s,d);}c.carry=q.active?time:0;}
 if(treated)journal(s,'【医馆归营】'+d.by.heroes[c.hero].name+'照料的 '+treated+' 名伤兵已归营；未加入正在交战的部队。');
 assignAutomatic(s,d);if(JSON.stringify(c)!==old)bump(c);
}
// New casualties and returning workers start here, never at a historical timestamp.
export function syncCampWorkBoundary(s,d,previous){const c=s.campWork?.clinic;if(!c)return;const old=JSON.stringify(c);if((s.camp?.wounded||0)>(previous.camp?.wounded||0)||!clinicQuote(s,d).active)c.carry=0;c.lastAt=s.clock;assignAutomatic(s,d);if(JSON.stringify(c)!==old)bump(c);}
export function campWorkAction(s,d,a){
 requireRule(s.camp,'先建立寨子。');requireRule(s.camp.buildings.clinic>0,'先建成医馆。');const c=make(s).clinic;
 if(a.type==='campWorkAssign'){
  requireRule(a.hero===null||owned(s,a.hero),'只能安排已入寨的好汉。');requireRule(a.hero===null||!heroAbsence(s,a.hero),'这位好汉正在外派或交战，归寨后再安排。');requireRule(a.hero===null||!heroPosting(s,a.hero,'clinic'),'这位好汉已有任职，请先卸下原职。');c.hero=a.hero;c.carry=0;c.lastAt=s.clock;
  journal(s,a.hero?'【医馆坐诊】'+d.by.heroes[a.hero].name+'已接手。':'【医馆坐诊】已撤下坐诊人手。');
 }else if(a.type==='campWorkToggle'){
  requireRule(typeof a.enabled==='boolean','请选择有效的诊疗开关。');c.enabled=a.enabled;c.carry=0;c.lastAt=s.clock;journal(s,c.enabled?'医馆自动诊疗已开启；只用专用物资。':'医馆自动诊疗已暂停，已拨物资保留。');
 }else if(a.type==='campWorkAuto'){
  requireRule(typeof a.enabled==='boolean','请选择有效的空岗安排。');c.auto=a.enabled;assignAutomatic(s,d);journal(s,c.auto?'空岗时优先安排未任职的安道全或梁杏，已有人手时保持原安排。':'医馆空岗自动安排已关闭。');
 }else if(a.type==='campWorkFund'){
  const requested=Object.fromEntries(keys.map(k=>[k,a[k]??0]));requireRule(keys.every(k=>Number.isSafeInteger(requested[k])&&requested[k]>=0&&requested[k]<=WORK_STOCK_CAP)&&keys.some(k=>requested[k]>0),'拨入物资须为非负整数，至少拨入一种。');
  requireRule(keys.every(k=>requested[k]<=stock(s,k)),'可拨入物资不足。');requireRule(keys.every(k=>c.budget[k]+requested[k]<=WORK_STOCK_CAP),'医馆专用物资已满。');for(const k of keys){add(s,k,-requested[k]);c.budget[k]+=requested[k];}journal(s,'【医馆备药】'+keys.filter(k=>requested[k]).map(k=>WORK_RESOURCE_NAMES[k]+' +'+requested[k]).join('、')+'。');
 }else if(a.type==='campWorkWithdraw'){
  let total=0;for(const k of keys){const n=Math.min(c.budget[k],Math.max(0,WORK_STOCK_CAP-stock(s,k)));c.budget[k]-=n;add(s,k,n);total+=n;}requireRule(total>0,'没有可退回的物资，或对应库存已满。');journal(s,'【医馆退库】可容纳的专用物资已退回；库存放不下的仍保留。');
 }else throw new Error('未知驻寨工作安排。');
 bump(c);
}
