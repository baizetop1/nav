import { meets } from './map.js?v=0.54.0';
import { hasOwn, requireRule, count, journal } from './utils.js?v=0.54.0';
import { grant } from './item.js?v=0.54.0';

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
const flags={volume_six_complete:'完成第六卷《高唐救援》',volume_seven_complete:'完成第七卷《破连环马》',v7_reported:'听取水泊急报',v7_scouted:'到芦湾土岗观察骑阵',v7_probe_done:'渡口试阵得胜并确认',v7_prepared:'在营后铁棚选定反制办法',v7_break_done:'破开骑阵并确认',v7_final_done:'击退主军并确认',v7_settled:'回营议事',volume_five_complete:'完成第五卷《三打祝家庄》',v6_prepared:'完成高唐行营整备',v6_outer_done:'夺取外哨并确认',v6_prison_done:'打通牢城并确认',v6_final_done:'击败高廉并确认',volume_four_complete:'完成第四卷《三山聚义》',v5_prepared:'完成行营整备',v5_route_known:'查清盘陀迷径',v5_first_done:'一打外哨得胜并确认',v5_east_cut:'截断东援并确认',v5_west_cut:'截住西粮并确认',v5_second_done:'二打破门得胜并确认',v5_third_done:'三打内院得胜并确认',volume_three_complete:'完成第三卷《梁山初聚》',v4_erlong_allied:'与二龙山结盟',v4_taohua_allied:'与桃花山结盟',v4_baihu_allied:'与白虎山结盟',volume_two_complete:'完成第二卷《逼上梁山》',v3_settled:'在寨民新居确认安寨',v3_grain_done:'打通粮道并确认战果',v3_timber_done:'打通木道并确认战果',v3_ferry_done:'夺回接驳口并确认战果',v3_defended:'守住寨门并确认战果',dongxi_rumor:'在郓城酒肆打听东溪村',tracks_found:'在枯树林查看脚印',trail_followed:'在虎踪继续追踪',seven_stars:'完成七星聚义',huangni_complete:'完成智取生辰纲',volume_complete:'完成第一卷聚义目标',lin_tolerant:'推进林冲东京往事',lu_complete:'完成鲁智深野猪林往事',lin_cangzhou:'推进林冲沧州往事',snow_evidence:'在风雪山道察看脚印',lin_temple:'完成风雪山神庙往事',chai_refuge:'完成柴进收留相助的往事'};
const routeFlags={v8_chosen:'选定曾头市第一件要办的事',v8_priority_rescue:'选定先救受伤商旅',v8_priority_evidence:'选定先查劫粮口供',v8_priority_supply:'选定先截北坡粮车',v9_chosen:'议定大名救援路线',v9_covert:'选定暗线接应',v9_assault:'选定正攻城门',v10_allocated:'议定粮仓余粮的用途',v10_supply:'选定热饭药汤补给',v10_defense:'选定加桩补盾防守',v11_homeland:'在十一卷确认护乡',v11_charter:'在十一卷确认受诏立约',v11_decided:'核完两份诏书并确认答复',v12_chosen:'确认终章去路',v12_stay:'选定留守水泊',v12_sea:'选定有序迁海',v12_return:'选定按约护送归民',v12_ending_stay:'完成守泊护乡结局',v12_ending_sea:'完成渡海安家结局',v12_ending_return:'完成护民归乡结局',v12_settled:'核完名册并交代同行者的去处'};
function flagText(id,d){
 if(flags[id]||routeFlags[id])return flags[id]||routeFlags[id];
 const chapter=d.chapters.find(c=>c.completeFlag===id);if(chapter)return '完成第'+chapter.number+'卷《'+chapter.title+'》';
 const requirement=d.chapters.flatMap(c=>c.requirements).find(r=>r.condition?.flag===id);if(requirement)return requirement.label;
 const story=d.stories.find(m=>Object.values(m.steps).some(step=>step.choices.some(c=>c.effects?.some(e=>e.type==='flag'&&e.id===id))));
 return story?'完成“'+story.title+'”并确认':'推进相关人物往事';
}
export function conditionText(condition,d){
  if(!condition)return '道路通畅';
  return Object.entries(condition).filter(([k])=>!['count','status'].includes(k)).map(([key,v])=>{
    if(key==='all'||key==='any')return '('+v.map(c=>conditionText(c,d)).join(key==='all'?'，且':'，或')+')';
    if(key==='flag')return flagText(v,d);
    if(key==='notFlag')return '尚未'+flagText(v,d);
    if(key==='time')return v==='night'?'夜间通行':'白日通行';
    if(key==='item')return '携带'+d.by.items[v].name+' ×'+(condition.count||1);
    if(key==='campBuilding')return ({hall:'聚义厅',farm:'农田',lumber:'伐木场',clinic:'医馆',barracks:'兵营',market:'集市'}[v]||v)+'达到 '+condition.count+' 级';
    if(key==='campMode')return v==='solo'?'英雄独行':'英雄带兵';
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
export const LOCAL_BENEFITS={v5_store:{name:'归居药圃',description:'归人照料药圃，每日分来药草。',flag:'volume_five_complete',reward:{items:{herb:2}}},
  v3_granary:{name:'粮仓慰劳',description:'粮道畅通后，乡人每日赠村酒 1。',flag:'v3_grain_done',reward:{items:{wine:1}}},
  v3_forest:{name:'材场余料',description:'木道畅通后，每日收取碎铁 2。',flag:'v3_timber_done',reward:{items:{scrap_iron:2}}},
  v3_water:{name:'渡口草料',description:'渡船接驳后，每日收取精制草料 2。',flag:'v3_ferry_done',reward:{items:{mount_feed:2}}},
  forge:{name:'铁匠赠料',description:'与老师傅切磋手艺，获精铁 2。',reward:{items:{iron:2}}},
  recruit:{name:'馆中荐书',description:'拜访招贤馆，获招贤令碎片 2。',reward:{items:{recruit_shard:2}}},
  stable:{name:'马夫赠草',description:'帮马夫照看脚力，获精制草料 2。',reward:{items:{mount_feed:2}}},
  training:{name:'校场观摩',description:'观摩寨中操练，获武学残页 2。',reward:{items:{martial_pages:2}}},
  herbs:{name:'坡上采药',description:'沿坡采集药草，获药草 3。',reward:{items:{herb:3}}},
  tavern:{name:'酒肆相赠',description:'与乡人叙旧，获村酒 1。',reward:{items:{wine:1}}},
  office:{name:'协理告示',description:'帮忙整理告示，获碎银 60。',reward:{silver:60}},
};
export function claimLocalBenefit(s,d){
  const b=LOCAL_BENEFITS[s.location],key='visit_bonus_'+s.location;requireRule(b,'这里没有每日探访酬谢。');requireRule(!b.flag||s.progress.flags[b.flag],'先完成此地事务，再领取每日酬谢。');requireRule(!s.daily.counters[key],'今日已领过此地酬谢，明日再来。');
  count(s,key);grant(s,b.reward,d);journal(s,`【地方探访】${d.by.maps[s.location].name} · ${b.description}`);
}
