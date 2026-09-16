import { STATIONS, POSTS } from './frontier-data.js?v=0.29.0';
import { requireRule, journal } from './utils.js?v=0.29.0';
export const STOCK_CAP=10000000;
export const RESOURCE_NAMES={food:'粮草',wood:'木材',silver:'碎银',scrap_iron:'碎铁',iron:'精铁'};
const stock=(s,id)=>id==='silver'?s.player.silver:['wood','food'].includes(id)?s.camp[id]:s.inventory[id]||0;
const busy=s=>s.battle||s.scheme||s.event;
export function collectionQuote(s){
  const moves=[],totals={},left={},blocked=[];let reason=!s.frontier?'先开办经营拓土。':busy(s)?'先结束当前交战、计策或际遇。':'';
  if(!reason){
    const plan=(group,id,row,resource)=>{const room=STOCK_CAP-stock(s,resource)-(totals[resource]||0),amount=Math.min(row.bank,Math.max(0,room));if(amount){moves.push({group,id,resource,amount});totals[resource]=(totals[resource]||0)+amount;}if(row.bank>amount)left[resource]=(left[resource]||0)+row.bank-amount;};
    for(const [id,row] of Object.entries(s.frontier.stations))if(id!=='workshop')plan('stations',id,row,STATIONS[id].resource);
    for(const [id,row] of Object.entries(s.frontier.posts))if(row.threat){if(row.bank)blocked.push(POSTS[id].name);}else plan('posts',id,row,POSTS[id].resource);
    if(!moves.length)reason=Object.keys(left).length?'对应库存已满，产出保留在原处。':blocked.length?'据点补给遭袭，解围后才能收取暂存物资。':'暂时没有可收取的原料；工坊加工请单独下单。';
  }
  const rows=Object.entries(totals).map(([id,n])=>({name:RESOURCE_NAMES[id],value:'+'+n+'（'+stock(s,id)+' → '+(stock(s,id)+n)+'）'}));
  return {kind:'collect',moves,totals,left,blocked,rows,reason,signature:JSON.stringify({moves,rows})};
}
export function workshopQuote(s,requested='all'){
  requireRule(requested==='all'||Number.isSafeInteger(requested)&&requested>=1&&requested<=256,'加工数量须为 1—256 的整数。');
  const bank=s.frontier?.stations.workshop.bank||0,wood=s.camp?.wood||0,scrap=s.inventory.scrap_iron||0,iron=s.inventory.iron||0;
  const available=Math.max(0,Math.min(bank,Math.floor(wood/2),Math.floor(scrap/2),STOCK_CAP-iron)),count=Math.min(requested==='all'?available:requested,available);
  let reason=!s.frontier?'先开办经营拓土。':busy(s)?'先结束当前交战、计策或际遇。':!bank?'工坊暂无加工额度，等待生产后再来。':iron>=STOCK_CAP?'精铁库存已满，额度与原料保留。':wood<2?'木材不足，每批需要木材 2。':scrap<2?'碎铁不足，每批需要碎铁 2。':'';
  const actual=reason?0:count,rows=actual?[{name:'木材',value:wood+' → '+(wood-actual*2)+'（消耗 '+actual*2+'）'},{name:'碎铁',value:scrap+' → '+(scrap-actual*2)+'（消耗 '+actual*2+'）'},{name:'精铁',value:iron+' → '+(iron+actual)+'（获得 '+actual+'）'},{name:'工坊额度',value:bank+' → '+(bank-actual)}]:[];
  return {kind:'workshop',requested,count:actual,available,bank,rows,reason,signature:JSON.stringify({count:actual,rows})};
}
export function productionAction(s,a){
  const q=a.type==='frontierCollect'?collectionQuote(s):workshopQuote(s,a.count);
  requireRule(!q.reason,q.reason);
  // Internal collection calls may omit a preview; browser collection always supplies one.
  if(a.type!=='frontierCollect'||a.expected!==undefined)requireRule(a.expected===q.signature,'物资或加工额度已变化，请重新预览。');
  if(a.type==='frontierCollect'){
    for(const m of q.moves){s.frontier[m.group][m.id].bank-=m.amount;if(m.resource==='silver')s.player.silver+=m.amount;else if(['wood','food'].includes(m.resource))s.camp[m.resource]+=m.amount;else s.inventory[m.resource]=(s.inventory[m.resource]||0)+m.amount;}
    journal(s,'【生产入库】'+Object.entries(q.totals).map(([id,n])=>RESOURCE_NAMES[id]+' +'+n).join('、')+'；工坊原料与额度保留，按需另行加工。');
  }else{
    requireRule(Number.isSafeInteger(a.count)&&q.count===a.count,'加工条件已变化，请重新预览。');
    s.camp.wood-=q.count*2;s.inventory.scrap_iron-=q.count*2;s.inventory.iron=(s.inventory.iron||0)+q.count;s.frontier.stations.workshop.bank-=q.count;
    journal(s,'【工坊交付】加工 '+q.count+' 批：木材 -'+q.count*2+'、碎铁 -'+q.count*2+'、精铁 +'+q.count+'。');
  }
}
