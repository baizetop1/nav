import { meets } from './map.js?v=0.15.0';
import { hasOwn, requireRule, count, journal } from './utils.js?v=0.15.0';
import { grant } from './item.js?v=0.15.0';

// Route search includes the half-hour spent on each road, so a night-only path
// cannot be traversed in daylight by selecting a distant destination.
export function routeTo(s,d,target,ignoreConditions=false){
  if(!hasOwn(d.by.maps,target))return null;
  const queue=[{id:s.location,minute:s.worldMinute,path:[]}],seen=new Set();
  for(let i=0;i<queue.length;i++){
    const node=queue[i],key=node.id+':'+(ignoreConditions?0:node.minute);
    if(seen.has(key))continue;seen.add(key);
    if(node.id===target)return node.path;
    for(const link of d.by.maps[node.id].links){
      // No circling to pass time automatically; waiting is an explicit action.
      if(link.target===s.location||node.path.includes(link.target))continue;
      if(!ignoreConditions&&!meets({...s,location:node.id,worldMinute:node.minute},link.condition))continue;
      queue.push({id:link.target,minute:(node.minute+30)%1440,path:[...node.path,link.target]});
    }
  }
  return null;
}
const flags={dongxi_rumor:'在郓城酒肆打听东溪村',tracks_found:'在枯树林查看脚印',trail_followed:'在虎踪继续追踪',seven_stars:'完成七星聚义',huangni_complete:'完成智取生辰纲',volume_complete:'完成第一卷聚义目标',lin_tolerant:'推进林冲东京往事',lu_complete:'完成鲁智深野猪林往事',lin_cangzhou:'推进林冲沧州往事',snow_evidence:'在风雪山道察看脚印',lin_temple:'完成风雪山神庙往事',chai_refuge:'完成柴进收留相助的往事'};
export function conditionText(condition,d){
  if(!condition)return '道路通畅';
  return Object.entries(condition).filter(([k])=>!['count','status'].includes(k)).map(([key,v])=>{
    if(key==='all'||key==='any')return '('+v.map(c=>conditionText(c,d)).join(key==='all'?'，且':'，或')+')';
    if(key==='flag')return flags[v]||'推进相关人物往事';
    if(key==='time')return v==='night'?'夜间通行':'白日通行';
    if(key==='item')return '携带'+d.by.items[v].name+' ×'+(condition.count||1);
    if(key==='prestige')return '威望达到 '+v;
    if(key==='hero')return '结识'+d.by.heroes[v].name;
    return '满足相关探索条件';
  }).join('，且');
}
export function routeBarriers(s,d,path){
  let from=s.location,minute=s.worldMinute;const result=[];
  for(const to of path||[]){const link=d.by.maps[from].links.find(l=>l.target===to);if(!meets({...s,location:from,worldMinute:minute},link.condition))result.push(d.by.maps[from].name+' → '+d.by.maps[to].name+'：'+conditionText(link.condition,d));from=to;minute=(minute+30)%1440;}
  return result;
}
export const LOCAL_BENEFITS={
  forge:{name:'铁匠赠料',description:'与老师傅切磋手艺，获精铁 2。',reward:{items:{iron:2}}},
  recruit:{name:'馆中荐书',description:'拜访招贤馆，获招贤令碎片 2。',reward:{items:{recruit_shard:2}}},
  stable:{name:'马夫赠草',description:'帮马夫照看脚力，获精制草料 2。',reward:{items:{mount_feed:2}}},
  training:{name:'校场观摩',description:'观摩寨中操练，获武学残页 2。',reward:{items:{martial_pages:2}}},
  herbs:{name:'坡上采药',description:'沿坡采集药草，获药草 3。',reward:{items:{herb:3}}},
  tavern:{name:'酒肆相赠',description:'与乡人叙旧，获村酒 1。',reward:{items:{wine:1}}},
  office:{name:'协理告示',description:'帮忙整理告示，获碎银 60。',reward:{silver:60}},
};
export function claimLocalBenefit(s,d){
  const b=LOCAL_BENEFITS[s.location],key='visit_bonus_'+s.location;requireRule(b,'这里没有每日探访酬谢。');requireRule(!s.daily.counters[key],'今日已领过此地酬谢，明日再来。');
  count(s,key);grant(s,b.reward,d);journal(s,`【地方探访】${d.by.maps[s.location].name} · ${b.description}`);
}
