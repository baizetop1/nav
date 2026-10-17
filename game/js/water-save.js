import {crossHas} from './cross-region-data.js?v=0.91.0';
import {WATER_NODES,WATER_FLAGS,waterHas,waterGate,waterRoute} from './water-data.js?v=0.91.0';
export const hasWater=s=>s.exploration?.water!==undefined||Object.keys(s.specialDungeons?.clears||{}).some(k=>/^water(fort)?_[123]$/.test(k))||[s.battle?.context,s.lastBattle?.context,s.specialDungeons?.last].some(c=>['water','waterfort'].includes(c?.id));
export function validateWater(s,check){const x=s.exploration,w=x?.water;if(w===undefined)return;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),list=(v,allowed)=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(k=>allowed.includes(k));
 check(obj(w)&&w.version===1&&Object.keys(w).sort().join(',')==='flags,pending,position,version,visited','渡口探索记录');
 check(list(w.flags,WATER_FLAGS)&&list(w.visited,Object.keys(WATER_NODES))&&w.visited.includes('dock')&&w.visited.includes(w.position)&&w.visited.every(id=>!waterGate(s,id)),'渡口地点与进度');
 for(const [flag,needs]of Object.entries({charted:['met'],moored:['charted'],won_fort:['charted'],rescued:['won_fort'],invited:['rescued']}))if(waterHas(s,flag))check(needs.every(k=>waterHas(s,k)),'渡口事件先后');
 for(const flag of ['charted','tended'])if(waterHas(s,flag))check(waterHas(s,'won_shoal')||waterHas(s,'won_bend'),'渡口清路战绩');
 if(waterHas(s,'met'))check(['known','available','owned'].includes(s.heroes.ruanxiaoqi.status),'阮小七相识');if(waterHas(s,'invited'))check(s.heroes.ruanxiaoqi.status==='owned','阮小七入寨');
 for(const [flag,place]of Object.entries({charted:'bend',tended:'reeds',moored:'stakes',rescued:'fort'}))if(waterHas(s,flag))check(w.visited.includes(place),'渡口事件地点');
 for(const id of ['shoal','bend','fort'])if(waterHas(s,'won_'+id))check(w.visited.includes(id)&&(s.specialDungeons?.clears[WATER_NODES[id].battle+'_1']||0)>0,'渡口战绩');
 if(w.pending!==null){const p=w.pending,n=Object.hasOwn(WATER_NODES,p?.node)?WATER_NODES[p.node]:null,b=s.battle;check(obj(p)&&Object.keys(p).sort().join(',')==='approach,node'&&!!n?.battle&&['direct','moored','backwash','medicineboat'].includes(p.approach)&&(p.approach!=='moored'||p.node==='fort'&&waterHas(s,'moored'))&&(p.approach!=='backwash'||p.node==='fort'&&waterHas(s,'trace_checked'))&&(p.approach!=='medicineboat'||p.node==='fort'&&crossHas(s,'prepared'))&&w.position===p.node&&x.pending===null&&!x.mountain?.pending&&!x.marsh?.pending&&!x.ruins?.pending&&!x.forest?.pending&&x.activeRegion==='water'&&b?.context.type==='special'&&b.context.id===n.battle&&b.context.tier===1&&b.context.route===waterRoute(p.node,p.approach)&&!s.adventure?.run,'渡口待结算战斗');}
}
