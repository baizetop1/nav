import {FOREST_NODES,FOREST_FLAGS,forestHas,forestGate,forestRoute} from './forest-data.js?v=0.91.0';
export const hasForest=s=>s.exploration?.forest!==undefined||Object.keys(s.specialDungeons?.clears||{}).some(k=>/^forest(camp)?_[123]$/.test(k))||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>['forest','forestcamp'].includes(c?.id));
export function validateForest(s,check){const x=s.exploration,f=x?.forest;if(f===undefined)return;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),list=(v,allowed)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(k=>allowed.includes(k));
 check(obj(f)&&f.version===1&&Object.keys(f).sort().join(',')==='flags,pending,position,version,visited','古道探索记录');
 check(list(f.flags,FOREST_FLAGS)&&list(f.visited,Object.keys(FOREST_NODES))&&f.visited.includes('post')&&f.visited.includes(f.position)&&f.visited.every(id=>!forestGate(s,id)),'古道地点与进度');
 for(const [flag,needs]of Object.entries({scouted:['met'],sabotaged:['scouted'],won_camp:['scouted'],cargo:['won_camp'],invited:['cargo']}))if(forestHas(s,flag))check(needs.every(k=>forestHas(s,k)),'古道事件先后');
 for(const flag of ['scouted','tended'])if(forestHas(s,flag))check(forestHas(s,'won_fork')||forestHas(s,'won_watch'),'古道清路战绩');
 if(forestHas(s,'met'))check(['known','available','owned'].includes(s.heroes.shiqian.status),'时迁相识');if(forestHas(s,'invited'))check(s.heroes.shiqian.status==='owned','时迁入寨');
 for(const [flag,place]of Object.entries({scouted:'watch',tended:'ridge',sabotaged:'trail',cargo:'camp'}))if(forestHas(s,flag))check(f.visited.includes(place),'古道事件地点');
 for(const id of ['fork','watch','camp'])if(forestHas(s,'won_'+id))check(f.visited.includes(id)&&(s.specialDungeons?.clears[FOREST_NODES[id].battle+'_1']||0)>0,'古道战绩');
 if(f.pending!==null){const p=f.pending,n=Object.hasOwn(FOREST_NODES,p?.node)?FOREST_NODES[p.node]:null,b=s.battle;check(obj(p)&&Object.keys(p).sort().join(',')==='approach,node'&&!!n?.battle&&['frontal','quiet','crossfire'].includes(p.approach)&&(p.approach!=='quiet'||p.node==='camp'&&forestHas(s,'sabotaged'))&&(p.approach!=='crossfire'||p.node==='camp'&&forestHas(s,'trace_checked'))&&f.position===p.node&&x.pending===null&&!x.mountain?.pending&&!x.marsh?.pending&&!x.ruins?.pending&&!x.water?.pending&&x.activeRegion==='forest'&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===forestRoute(p.node,p.approach)&&!s.adventure?.run,'古道待结算战斗');}
}
