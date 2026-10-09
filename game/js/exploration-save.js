import {MARSH_NODES,MARSH_FLAGS,marshHas,marshGate} from './marsh-data.js?v=0.69.0';
import {REGION_NODES,REGION_FLAGS,REGION_BUILDINGS,REGION_CONTACTS,regionHas,regionGate} from './exploration-data.js?v=0.69.0';
export const hasExploration=s=>s.exploration!==undefined;
export function validateExploration(s,check){const x=s.exploration;if(x===undefined)return;const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),list=(v,allowed)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>allowed.includes(id)),num=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 check(!!s.camp&&obj(x)&&x.version===1&&Object.keys(x).filter(k=>!['activeRegion','marsh'].includes(k)).sort().join(',')==='buildings,contacts,flags,pending,position,version,visited,visiting','区域探索记录');
 check(x.activeRegion===undefined||x.activeRegion==='mine'||x.activeRegion==='marsh'&&obj(x.marsh),'当前探索地区');
 check(list(x.flags,REGION_FLAGS)&&list(x.visited,Object.keys(REGION_NODES))&&x.visited.includes('entrance')&&x.visited.includes(x.position)&&!regionGate(s,x.position)&&x.visited.every(id=>!regionGate(s,id)),'区域地点与进度');
 check(list(x.buildings,Object.keys(REGION_BUILDINGS))&&(!x.buildings.length||s.camp.buildings.hall>=2)&&typeof x.visiting==='boolean','区域营建与寻访');
 for(const [flag,need]of Object.entries({rescued:'won_chamber',surveyed:'rescued',commission:'met',invited:'won_vault',cache:'won_vault',won_vault:'commission'}))if(regionHas(s,flag))check(regionHas(s,need),'区域事件先后');
 if(regionHas(s,'met'))check(['known','available','owned'].includes(s.heroes.tanglong.status),'汤隆相识');if(regionHas(s,'invited'))check(s.heroes.tanglong.status==='owned','汤隆入寨');
 for(const id of ['rail','chamber','vault'])if(regionHas(s,'won_'+id))check((s.specialDungeons?.clears[REGION_NODES[id].battle+'_1']||0)>0,'区域战绩');
 check(obj(x.contacts)&&Object.keys(x.contacts).sort().join(',')===Object.keys(REGION_CONTACTS).sort().join(','),'地区寻访记录');for(const p of Object.values(x.contacts))check(obj(p)&&Object.keys(p).sort().join(',')==='cycles,earned'&&num(p.cycles,7)&&num(p.earned,10000000),'地区寻访计数');
 if(x.marsh!==undefined){
  const m=x.marsh;
  check(obj(m)&&m.version===1&&Object.keys(m).sort().join(',')==='flags,pending,position,version,visited','芦苇泽探索记录');
  check(list(m.flags,MARSH_FLAGS)&&list(m.visited,Object.keys(MARSH_NODES))&&m.visited.includes('landing')&&m.visited.includes(m.position)&&m.visited.every(id=>!marshGate(s,id)),'芦苇泽地点与进度');
  for(const [flag,needs]of Object.entries({rescued:['met'],tended:['rescued'],won_nest:['tended'],invited:['won_nest'],cache:['won_nest']}))if(marshHas(s,flag))check(needs.every(k=>marshHas(s,k)),'芦苇泽事件先后');
  if(marshHas(s,'rescued'))check(marshHas(s,'won_reeds')||marshHas(s,'won_poison'),'药农救治水路');
  if(marshHas(s,'met'))check(['known','available','owned'].includes(s.heroes.andaoquan.status)&&m.visited.includes('hut'),'安道全相识');
  if(marshHas(s,'invited'))check(s.heroes.andaoquan.status==='owned','安道全入寨');
  if(marshHas(s,'tended'))check(m.visited.includes('garden'),'药圃整修地点');
  for(const id of ['reeds','poison','nest'])if(marshHas(s,'won_'+id))check(m.visited.includes(id)&&(s.specialDungeons?.clears[MARSH_NODES[id].battle+'_1']||0)>0,'芦苇泽战绩');
  if(marshHas(s,'won_nest'))check((s.specialDungeons?.clears.marsh_1||0)>=5,'沉船入口');
  if(m.pending!==null){const n=MARSH_NODES[m.pending?.node],b=s.battle;check(obj(m.pending)&&Object.keys(m.pending).join(',')==='node'&&!!n?.battle&&m.position===m.pending.node&&x.pending===null&&x.activeRegion==='marsh'&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===n.route&&!s.adventure?.run,'芦苇泽待结算战斗');}
 }
 if(x.pending!==null){const n=REGION_NODES[x.pending?.node],b=s.battle;check(obj(x.pending)&&Object.keys(x.pending).join(',')==='node'&&!!n?.battle&&x.position===x.pending.node&&(x.activeRegion||'mine')==='mine'&&!x.marsh?.pending&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===n.route&&!s.adventure?.run,'区域待结算战斗');}
}
export function explorationPreserved(a,b){const x=a.exploration,y=b?.exploration;return !x||!!y&&Array.isArray(y.flags)&&Array.isArray(y.visited)&&Array.isArray(y.buildings)&&!!y.contacts&&x.flags.every(k=>y.flags.includes(k))&&x.visited.every(k=>y.visited.includes(k))&&x.buildings.every(k=>y.buildings.includes(k))&&Object.entries(x.contacts).every(([k,p])=>y.contacts[k]?.earned>=p.earned)&&(!x.marsh||!!y.marsh&&Array.isArray(y.marsh.flags)&&Array.isArray(y.marsh.visited)&&x.marsh.flags.every(k=>y.marsh.flags.includes(k))&&x.marsh.visited.every(k=>y.marsh.visited.includes(k)));}
