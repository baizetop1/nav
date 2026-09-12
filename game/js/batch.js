import { clone, journal, requireRule } from './utils.js?v=0.15.0';
import { itemAction } from './item.js?v=0.15.0';
import { growthAction } from './growth.js?v=0.15.0';

const kinds={experience:'赠经验丹',manual:'抄录招式书',feed:'喂养坐骑',buy:'采买物资'};
export const SHOP_ITEMS=['jinchuangyao','huiqisan','jiedudan','exp_pill','wine','iron','cloth','night_clothes','recruit_order'];
function single(s,d,a){
  if(a.kind==='experience')itemAction(s,d,{type:'use',id:'exp_pill',hero:a.id});
  else if(a.kind==='manual')growthAction(s,d,{type:'skillBook',id:a.id});
  else if(a.kind==='feed')growthAction(s,d,{type:'mountFeed',id:a.id});
  else if(a.kind==='buy'){requireRule(SHOP_ITEMS.includes(a.id),'此物不支持批量采买。');itemAction(s,d,{type:'buy',id:a.id});}
  else throw new Error('没有这项批量办理方式。');
  requireRule(Object.values(s.inventory).every(n=>n<=10000000),'材料数量已达存档上限。');
}
export function batchChanges(before,after,d,a){
  const rows=[],names={silver:'碎银'};
  const old={silver:before.player.silver,...before.inventory},next={silver:after.player.silver,...after.inventory};
  for(const id of new Set([...Object.keys(old),...Object.keys(next)])){
    const delta=(next[id]||0)-(old[id]||0);
    if(delta)rows.push({name:names[id]||d.by.items[id].name,value:(delta>0?'+':'')+delta});
  }
  if(a.kind==='experience'){
    const x=before.heroes[a.id],y=after.heroes[a.id];
    rows.push({name:d.by.heroes[a.id].name+'等级',value:x.level+' → '+y.level});
    rows.push({name:'当前等级历练',value:x.exp+' → '+y.exp+(y.level>=d.config.balance.heroLevelCap?'（已满级）':'')});
  }
  if(a.kind==='feed')rows.push({name:d.by.heroes[a.id].mount.name+'亲密',value:before.growth.mounts[a.id].intimacy+' → '+after.growth.mounts[a.id].intimacy});
  return rows;
}
export function batchQuote(s,d,a){
  requireRule(Number.isInteger(a.count)&&a.count>=1&&a.count<=10,'每批数量须为 1—10。');
  requireRule(Object.prototype.hasOwnProperty.call(kinds,a.kind),'没有这项批量办理方式。');
  let after=clone(s),count=0,reason='';
  if(s.battle||s.scheme||s.event)reason='先结束当前战局或际遇，再办理养成与采买。';
  else for(let i=0;i<a.count;i++){
    const next=clone(after);
    try{single(next,d,a);after=next;count++;}catch(e){reason=e.message;break;}
  }
  const rows=count?batchChanges(s,after,d,a):[];
  const title=kinds[a.kind],signature=JSON.stringify({kind:a.kind,id:a.id,count,rows});
  return {count,reason,rows,title,signature};
}
export function batchApply(s,d,a){
  const q=batchQuote(s,d,a);
  requireRule(q.count===a.count&&q.count>0,q.reason||'资源或条件已经变化，请重新预览。');
  requireRule(a.expected===q.signature,'办理结果已变化，请重新查看数量与消耗。');
  // dispatch owns the transaction clone. Any failure discards every preceding step.
  const log=s.journal.slice();
  for(let i=0;i<a.count;i++)single(s,d,a);
  s.journal=log;journal(s,`【批量办理】${q.title} ${a.count} 次，${q.rows.map(r=>r.name+' '+r.value).join('；')}。`);
}
