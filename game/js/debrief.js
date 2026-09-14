import { validEliteContext } from './elites.js?v=0.20.0';
export const METRICS=['damage','healing','taken','controls','interrupts','skills'];
export function newMetrics(team){return {version:1,reason:'ongoing',heroes:Object.fromEntries(team.map(u=>[u.id,Object.fromEntries(METRICS.map(k=>[k,0]))])),dot:0,environment:0,medicine:0};}
export function contribution(b,u,key,n=1){const row=u?.side==='team'&&b.metrics?.heroes[u.id];if(row)row[key]+=n;}
export function reportDamage(b,source,target,loss){const n=Math.min(target.hp,loss);contribution(b,source,'damage',n);contribution(b,target,'taken',n);}
export function reportHealing(b,source,n){contribution(b,source,'healing',n);}
export function reportOtherDamage(b,target,loss,kind){const n=Math.min(target.hp,loss);contribution(b,target,'taken',n);if(b.metrics&&((kind==='dot'&&target.side==='enemy')||kind==='environment'))b.metrics[kind]+=n;}
export function saveDebrief(s,b,wounded){s.lastBattle={at:s.clock,context:{...b.context},outcome:b.outcome,elapsed:b.elapsed||0,troops:b.expedition?.troops||0,wounded:Math.max(0,(s.camp?.wounded||0)-wounded),team:b.team.map(({id,hp,maxHp})=>({id,hp,maxHp})),...(b.metrics?{metrics:b.metrics}:{})};}
export function validateDebrief(s,d,check){
 const num=(v,max=1000000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max,obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const metrics=(m,ids)=>{check(obj(m)&&m.version===1&&['ongoing','team','enemy','objective','timeout','manual'].includes(m.reason)&&obj(m.heroes),'复盘统计');check(Object.keys(m.heroes).length===ids.length&&ids.every(id=>obj(m.heroes[id])),'复盘人物');for(const row of Object.values(m.heroes))for(const k of METRICS)check(num(row[k]),'贡献数值');for(const k of ['dot','environment','medicine'])check(num(m[k]),'复盘汇总');};
 if(s.battle?.metrics!==undefined)metrics(s.battle.metrics,s.battle.team.map(u=>u.id));
 const r=s.lastBattle;if(r===undefined)return;
 check(obj(r)&&num(r.at,s.clock)&&['victory','defeat','retreat'].includes(r.outcome)&&num(r.elapsed,180000)&&num(r.troops,100)&&num(r.wounded,r.troops),'最近战果');check(obj(r.context)&&(r.context.type==='elite'?validEliteContext(r.context):['story','camp','frontier','dungeon','event','rotation'].includes(r.context.type))&&typeof r.context.id==='string'&&/^[a-z][a-z0-9_]*$/.test(r.context.id),'复盘来源');check(Array.isArray(r.team)&&r.team.length>=1&&r.team.length<=3&&new Set(r.team.map(u=>u.id)).size===r.team.length,'复盘队伍');for(const u of r.team)check(d.by.heroes[u.id]&&num(u.maxHp,1000000)&&u.maxHp>0&&num(u.hp,u.maxHp),'复盘气血');if(r.metrics!==undefined)metrics(r.metrics,r.team.map(u=>u.id));
}
