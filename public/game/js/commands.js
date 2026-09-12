import { requireRule } from './utils.js?v=0.15.0';

export const freshOrders=()=>({version:1,focus:null,stance:'balanced',reserve:false,readyAt:0});
export function battleOrder(state,action){
  const b=state.battle;
  requireRule(b?.rules===2&&b.mode==='realtime'&&!b.outcome,'当前战局不能调度军令。');
  const o=b.orders||freshOrders();
  if(action.kind==='focus'){
    requireRule(action.target===null||b.enemy.some(u=>u.id===action.target&&u.hp>0),'请选择仍在阵中的敌人。');
    o.focus=action.target;
  }else if(action.kind==='stance'){
    requireRule(['balanced','guard'].includes(action.value),'无效的攻守安排。');
    requireRule(o.readyAt<=b.elapsed,'攻守调整后需等待 3 秒。');
    requireRule(o.stance!==action.value,'已采用这一安排。');
    o.stance=action.value;o.readyAt=b.elapsed+3000;
  }else if(action.kind==='reserve'){
    requireRule(typeof action.value==='boolean','无效的留招安排。');o.reserve=action.value;
  }else throw new Error('无效的军令。');
  state.commandVersion=1;b.orders=o;
  const focus=b.enemy.find(u=>u.id===o.focus)?.name||'自由迎敌';
  b.log.push(`【${(b.elapsed/1000).toFixed(1)}秒】【军令】${focus} · ${o.stance==='guard'?'收势固守':'正常攻守'} · ${o.reserve?'保留打断':'照常施招'}。`);
  if(b.log.length>120)b.log.shift();
}
export const orderDamageFactor=b=>b.orders?.stance==='guard'?.8:1;
export function autoOrderAllows(b,u,skill,data){
  if(!b.orders?.reserve||!u.skills.some(id=>data.by.skills[id].type!=='passive'&&data.by.skills[id].training?.profile==='interrupt'))return true;
  // Keep all rage for the unlocked interrupt, rather than spend it on a basic skill.
  return skill.training?.profile==='interrupt'&&b.enemy.some(v=>v.hp>0&&v.boss?.pendingAt);
}
export function equipmentMatches(e,data,filter={}){
  const m=data.by.equipments[e.item];
  return (!filter.query||m.name.includes(filter.query.trim()))&&
    (!filter.type||filter.type==='all'||m.type===filter.type)&&
    (!filter.quality||filter.quality==='all'||m.quality===filter.quality)&&
    (!filter.state||filter.state==='all'||(filter.state==='worn'?!!e.hero:filter.state==='bag'?!e.hero:filter.state==='locked'?!!e.locked:filter.state==='free'?!e.locked&&!e.hero:false));
}
export function validateCommands(s,check){
  check(s.commandVersion===undefined||s.commandVersion===1,'调度版本');
  const marked=s.commandVersion===1;
  for(const e of s.equipment)check(e.locked===undefined||(marked&&typeof e.locked==='boolean'),'装备锁定');
  const batch=s.recruit.lastBatch;
  if(batch!==undefined){
    check(marked&&Array.isArray(batch)&&batch.length===10,'十连记录');
    check(batch.every((r,i)=>r&&r.target===null&&r.number===s.recruit.total-9+i),'十连顺序');
    check(s.recruit.lastResult&&['hero','target','kind','number','inTeam','tokens','merit'].every(k=>batch[9][k]===s.recruit.lastResult[k]),'十连末次结果');
  }
  const b=s.battle,o=b?.orders;
  if(o!==undefined){
    check(marked&&o&&o.version===1&&b.rules===2&&b.mode==='realtime','战场调度');
    check(o.focus===null||b.enemy.some(u=>u.id===o.focus),'集火目标');
    check(['balanced','guard'].includes(o.stance)&&typeof o.reserve==='boolean','攻守留招');
    check(Number.isSafeInteger(o.readyAt)&&o.readyAt>=0&&o.readyAt<=b.elapsed+3000,'军令冷却');
  }
}
