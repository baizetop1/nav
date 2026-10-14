import {validateCrossRegion,crossPreserved} from './cross-region-save.js?v=0.84.0';
import {MINE_COMPANION_TASKS,mineCompanionHas} from './mine-companion-data.js?v=0.84.0';
import {validateRegionRevisits,revisitPreserved} from './region-revisit-save.js?v=0.84.0';
import {validateMountain} from './mountain-save.js?v=0.84.0';
import {validateWater} from './water-save.js?v=0.84.0';
import {validateForest} from './forest-save.js?v=0.84.0';
import {validateRuins} from './ruins-save.js?v=0.84.0';
import {MARSH_NODES,MARSH_FLAGS,marshHas,marshGate,marshRoute} from './marsh-data.js?v=0.84.0';
import {REGION_NODES,REGION_FLAGS,REGION_BUILDINGS,REGION_CONTACTS,regionHas,regionGate,mineRoute} from './exploration-data.js?v=0.84.0';
export const hasExploration=s=>s.exploration!==undefined;
export function validateExploration(s,check){validateCrossRegion(s,check);validateRegionRevisits(s,check);const x=s.exploration;if(x===undefined)return;const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),list=(v,allowed)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>allowed.includes(id)),num=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 check(!!s.camp&&obj(x)&&x.version===1&&Object.keys(x).filter(k=>!['crossRegion','activeRegion','marsh','ruins','forest','water','mountain'].includes(k)).sort().join(',')==='buildings,contacts,flags,pending,position,version,visited,visiting','区域探索记录');
 check(x.activeRegion===undefined||x.activeRegion==='mine'||x.activeRegion==='marsh'&&obj(x.marsh)||x.activeRegion==='ruins'&&obj(x.ruins)||x.activeRegion==='forest'&&obj(x.forest)||x.activeRegion==='water'&&obj(x.water)||x.activeRegion==='mountain'&&obj(x.mountain),'当前探索地区');
 check(list(x.flags,REGION_FLAGS)&&list(x.visited,Object.keys(REGION_NODES))&&x.visited.includes('entrance')&&x.visited.includes(x.position)&&!regionGate(s,x.position)&&x.visited.every(id=>!regionGate(s,id)),'区域地点与进度');
 check(list(x.buildings,Object.keys(REGION_BUILDINGS))&&(!x.buildings.length||s.camp.buildings.hall>=2)&&typeof x.visiting==='boolean','区域营建与寻访');
 for(const [flag,need]of Object.entries({rescued:'won_chamber',surveyed:'rescued',commission:'met',invited:'won_vault',cache:'won_vault',won_vault:'commission',repair_supplies:'surveyed',return_met:'invited',cart_checked:'return_met',won_orecart:'cart_checked',return_paid:'won_orecart'}))if(regionHas(s,flag))check(regionHas(s,need),'区域事件先后');
 if(regionHas(s,'repair_supplies'))check(regionHas(s,'met'),'修炉料领取');
 if(regionHas(s,'return_met'))check(regionHas(s,'rescued')&&regionHas(s,'surveyed'),'矿洞重访前置');
 for(const [flag,place]of Object.entries({repair_supplies:'furnace',return_met:'furnace',cart_checked:'rail',return_paid:'furnace'}))if(regionHas(s,flag))check(x.visited.includes(place),'矿洞事件地点');
 if(regionHas(s,'won_orecart'))check((s.specialDungeons?.clears.minechief_1||0)>=2||[2,3].some(t=>(s.specialDungeons?.clears['minechief_'+t]||0)>0),'矿车战绩');
 if(s.daily.counters.mine_smelt!==undefined)check(num(s.daily.counters.mine_smelt,1)&&(!s.daily.counters.mine_smelt||regionHas(s,'return_paid')&&x.buildings.includes('forge')&&(s.daily.counters.craft_tempered_steel||0)>=1),'矿砂炉加工');
 if(regionHas(s,'met'))check(['known','available','owned'].includes(s.heroes.tanglong.status),'汤隆相识');if(regionHas(s,'invited'))check(s.heroes.tanglong.status==='owned','汤隆入寨');
 for(const id of ['rail','chamber','vault'])if(regionHas(s,'won_'+id))check((s.specialDungeons?.clears[REGION_NODES[id].battle+'_1']||0)>0,'区域战绩');
 check(obj(x.contacts)&&Object.keys(x.contacts).sort().join(',')===Object.keys(REGION_CONTACTS).sort().join(','),'地区寻访记录');for(const p of Object.values(x.contacts))check(obj(p)&&Object.keys(p).sort().join(',')==='cycles,earned'&&num(p.cycles,7)&&num(p.earned,10000000),'地区寻访计数');
 validateRuins(s,check);validateForest(s,check);validateWater(s,check);validateMountain(s,check);
 if(s.daily.counters.marsh_decoct!==undefined)check(num(s.daily.counters.marsh_decoct,1)&&(!s.daily.counters.marsh_decoct||marshHas(s,'return_paid')&&x.buildings.includes('clinic')&&(s.daily.counters.craft_medicinal_extract||0)>=1),'配药间煎药');
 if(x.marsh!==undefined){
  const m=x.marsh;
  check(obj(m)&&m.version===1&&Object.keys(m).sort().join(',')==='flags,pending,position,version,visited','芦苇泽探索记录');
  check(list(m.flags,MARSH_FLAGS)&&list(m.visited,Object.keys(MARSH_NODES))&&m.visited.includes('landing')&&m.visited.includes(m.position)&&m.visited.every(id=>!marshGate(s,id)),'芦苇泽地点与进度');
  for(const [flag,needs]of Object.entries({rescued:['met'],tended:['rescued'],won_nest:['tended'],invited:['won_nest'],cache:['won_nest'],care_supplies:['met'],return_met:['invited'],source_checked:['return_met'],won_reedvenom:['source_checked'],return_paid:['won_reedvenom']}))if(marshHas(s,flag))check(needs.every(k=>marshHas(s,k)),'芦苇泽事件先后');
  if(marshHas(s,'care_supplies'))check(marshHas(s,'won_reeds')||marshHas(s,'won_poison'),'备用药料水路');
  for(const [flag,place]of Object.entries({care_supplies:'hut',return_met:'hut',source_checked:'garden',return_paid:'hut'}))if(marshHas(s,flag))check(m.visited.includes(place),'芦苇泽重访地点');
  if(marshHas(s,'won_reedvenom'))check((s.specialDungeons?.clears.marshnest_1||0)>=2||[2,3].some(t=>(s.specialDungeons?.clears['marshnest_'+t]||0)>0),'清渠除蛇战绩');
  if(marshHas(s,'rescued'))check(marshHas(s,'won_reeds')||marshHas(s,'won_poison'),'药农救治水路');
  if(marshHas(s,'met'))check(['known','available','owned'].includes(s.heroes.andaoquan.status)&&m.visited.includes('hut'),'安道全相识');
  if(marshHas(s,'invited'))check(s.heroes.andaoquan.status==='owned','安道全入寨');
  if(marshHas(s,'tended'))check(m.visited.includes('garden'),'药圃整修地点');
  for(const id of ['reeds','poison','nest'])if(marshHas(s,'won_'+id))check(m.visited.includes(id)&&(s.specialDungeons?.clears[MARSH_NODES[id].battle+'_1']||0)>0,'芦苇泽战绩');
  if(marshHas(s,'won_nest'))check((s.specialDungeons?.clears.marsh_1||0)>=1,'沉船入口');
  if(m.pending!==null){const n=MARSH_NODES[m.pending?.node],b=s.battle;check(obj(m.pending)&&Object.keys(m.pending).sort().join(',')===(m.pending.approach===undefined?'node':'approach,node')&&(m.pending.approach===undefined||m.pending.approach==='reedvenom'&&m.pending.node==='nest'&&marshHas(s,'source_checked'))&&!!n?.battle&&m.position===m.pending.node&&x.pending===null&&!x.ruins?.pending&&!x.forest?.pending&&!x.water?.pending&&!x.mountain?.pending&&x.activeRegion==='marsh'&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===marshRoute(m.pending.node,m.pending.approach)&&!s.adventure?.run,'芦苇泽待结算战斗');}
 }
 for(const task of Object.values(MINE_COMPANION_TASKS))if(mineCompanionHas(s,task.flag))check(mineCompanionHas(s,task.needs)&&x.visited.includes(task.node),'李云委托前置与地点');
 if(mineCompanionHas(s,'liyun_met'))check(['known','available','owned'].includes(s.heroes.liyun.status),'李云相识状态');
 if(mineCompanionHas(s,'liyun_invited'))check(s.heroes.liyun.status==='owned','李云入寨状态');
 if(mineCompanionHas(s,'liyun_won'))check(mineCompanionHas(s,'liyun_hoops')&&[1,2,3].some(t=>(s.specialDungeons?.clears['mine_'+t]||0)>=(t===1?2:1)),'护送木料通关记录');
 if(x.pending!==null){const n=REGION_NODES[x.pending?.node],b=s.battle;check(obj(x.pending)&&Object.keys(x.pending).sort().join(',')===(x.pending.approach===undefined?'node':'approach,node')&&(x.pending.approach===undefined||(x.pending.approach==='orecart'&&x.pending.node==='vault'&&regionHas(s,'cart_checked')||x.pending.approach==='timberguard'&&x.pending.node==='rail'&&regionHas(s,'liyun_hoops')))&&!!n?.battle&&x.position===x.pending.node&&(x.activeRegion||'mine')==='mine'&&!x.marsh?.pending&&!x.ruins?.pending&&!x.forest?.pending&&!x.water?.pending&&!x.mountain?.pending&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===mineRoute(x.pending.node,x.pending.approach)&&!s.adventure?.run,'区域待结算战斗');}
}
export function explorationPreserved(a,b){const x=a.exploration,y=b?.exploration;return crossPreserved(a,b)&&revisitPreserved(a,b)&&(!x||!!y&&(!(a.daily?.counters.marsh_decoct>0)||!!b?.daily&&b.daily.date>=a.daily.date&&(b.daily.date>a.daily.date||b.daily.counters?.marsh_decoct>=a.daily.counters.marsh_decoct&&(b.daily.counters?.craft_medicinal_extract||0)>=(a.daily.counters.craft_medicinal_extract||0)))&&Array.isArray(y.flags)&&Array.isArray(y.visited)&&Array.isArray(y.buildings)&&!!y.contacts&&x.flags.every(k=>y.flags.includes(k))&&x.visited.every(k=>y.visited.includes(k))&&x.buildings.every(k=>y.buildings.includes(k))&&Object.entries(x.contacts).every(([k,p])=>y.contacts[k]?.earned>=p.earned)&&['marsh','ruins','forest','water','mountain'].every(id=>!x[id]||!!y[id]&&Array.isArray(y[id].flags)&&Array.isArray(y[id].visited)&&x[id].flags.every(k=>y[id].flags.includes(k))&&x[id].visited.every(k=>y[id].visited.includes(k))));}
