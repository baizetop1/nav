import {RUINS_NODES,RUINS_FLAGS,ruinsHas,ruinsGate,ruinsRoute} from './ruins-data.js?v=0.82.1';
export function validateRuins(s,check){
 const x=s.exploration,r=x?.ruins;if(r===undefined)return;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const list=(v,allowed)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>allowed.includes(id));
 check(obj(r)&&r.version===1&&Object.keys(r).sort().join(',')==='flags,pending,position,version,visited','荒祠探索记录');
 check(list(r.flags,RUINS_FLAGS)&&list(r.visited,Object.keys(RUINS_NODES))&&r.visited.includes('gate')&&r.visited.includes(r.position)&&r.visited.every(id=>!ruinsGate(s,id)),'荒祠地点与进度');
 for(const [flag,needs]of Object.entries({heard:['met'],rubbed:['heard'],won_vault:['rubbed'],invited:['won_vault'],cache:['won_vault']}))if(ruinsHas(s,flag))check(needs.every(k=>ruinsHas(s,k)),'荒祠事件先后');
 if(ruinsHas(s,'rubbing_supplies'))check(ruinsHas(s,'heard')&&r.visited.includes('bell'),'拓碑备用布');
 if(ruinsHas(s,'heard'))check(ruinsHas(s,'won_court')||ruinsHas(s,'won_passage'),'辨声前清出道路');
 if(ruinsHas(s,'met'))check(['known','available','owned'].includes(s.heroes.yuehe.status)&&r.visited.includes('bell'),'乐和相识');
 if(ruinsHas(s,'invited'))check(s.heroes.yuehe.status==='owned','乐和入寨');
 if(ruinsHas(s,'rubbed'))check(r.visited.includes('stele'),'残碑拓写地点');
 for(const id of ['court','passage','vault'])if(ruinsHas(s,'won_'+id))check(r.visited.includes(id)&&(s.specialDungeons?.clears[RUINS_NODES[id].battle+'_1']||0)>0,'荒祠战绩');
 if(ruinsHas(s,'won_vault'))check((s.specialDungeons?.clears.ruins_1||0)>=1,'地宫内室入口');
 if(r.pending!==null){const n=Object.hasOwn(RUINS_NODES,r.pending?.node)?RUINS_NODES[r.pending.node]:null,b=s.battle;
  check(obj(r.pending)&&Object.keys(r.pending).sort().join(',')===(r.pending.approach===undefined?'node':'approach,node')&&(r.pending.approach===undefined||r.pending.approach==='bellbreak'&&r.pending.node==='vault'&&ruinsHas(s,'trace_checked'))&&!!n?.battle&&r.position===r.pending.node&&x.pending===null&&!x.mountain?.pending&&!x.marsh?.pending&&!x.forest?.pending&&!x.water?.pending&&x.activeRegion==='ruins'&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===ruinsRoute(r.pending.node,r.pending.approach)&&!s.adventure?.run,'荒祠待结算战斗');
 }
}
