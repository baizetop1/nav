import {GATHERING_REGIONS,historicGathering} from './gathering-data.js?v=0.69.0';
const materialIds=Object.values(GATHERING_REGIONS).map(v=>v.item);
export const hasGathering=s=>s.gathering!==undefined||materialIds.some(id=>s.inventory?.[id]>0||s.idleDispatch?.bank?.[id]>0);
export function validateGathering(s,check){
 const x=s.gathering;if(x===undefined){check(!hasGathering(s),'地区采集记录缺失');return;}
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),num=v=>Number.isSafeInteger(v)&&v>=0&&v<=3;
 check(!!s.camp&&obj(x)&&x.version===1&&Object.keys(x).sort().join(',')==='regions,version'&&obj(x.regions)&&Object.keys(x.regions).sort().join(',')===Object.keys(GATHERING_REGIONS).sort().join(','),'地区采集记录');
 for(const [id,p]of Object.entries(x.regions)){const h=historicGathering(s,id);check(obj(p)&&Object.keys(p).sort().join(',')==='best,runs'&&num(p.runs)&&num(p.best)&&p.best<=h.best&&p.runs>=p.best&&(p.runs>0)===(p.best>0),'采集点探索进度');if(GATHERING_REGIONS[id].dungeons)check(p.runs<=h.runs,'采集点通关次数');}
}
export function gatheringPreserved(a,b){return !a.gathering||!!b.gathering&&Object.entries(a.gathering.regions).every(([id,p])=>(b.gathering.regions?.[id]?.runs??-1)>=p.runs&&(b.gathering.regions?.[id]?.best??-1)>=p.best);}
