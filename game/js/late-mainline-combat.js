import {LATE_MISSIONS,LATE_BOSSES,lateMissionPlan} from './late-mainline-data.js?v=0.69.0';
const log=(b,text)=>{b.log.push('【'+(b.elapsed/1000).toFixed(1)+'秒】'+text);if(b.log.length>120)b.log.shift();};
export function initializeLateBattle(s,b,d){
 const p=lateMissionPlan(s,b.context.id,d);if(!p)return;
 b.mainline={version:1,wave:0,shields:Object.fromEntries(b.team.map(u=>[u.id,Math.round(u.maxHp*p.shield)])),escort:p.escort?{hp:p.escort.hp,nextAt:p.escort.pulse}:null};
 if(p.boss){const u=b.enemy.find(u=>u.model===p.boss);if(u)u.rage=p.bossRage||0;}
 if(p.shield)log(b,'准备生效：全队获得 '+Math.round(p.shield*100)+'% 最大气血护盾。');
 if(p.waveHeal)log(b,'补给生效：每批增援到来前，在阵好汉恢复 '+Math.round(p.waveHeal*100)+'% 气血；退阵者不复活。');
 if(p.escort)log(b,'护送 '+p.escort.name+'，完整度 '+p.escort.hp+'。优先击退射手；固守可减半护送损失。');
 log(b,'本战共 '+(p.waves.length+1)+' 波敌军，兵粮与体力只在出发时扣除。');
}
export function lateAbsorb(b,target,loss){
 if(!b.mainline||target.side!=='team')return loss;
 const n=Math.min(loss,b.mainline.shields[target.id]||0);b.mainline.shields[target.id]-=n;
 if(n)log(b,target.name+'的护盾挡下 '+n+' 点伤害。');return loss-n;
}
export const lateTimes=b=>b.mainline?.escort?[b.mainline.escort.nextAt]:[];
export function advanceLateObjective(s,d){
 const b=s.battle,x=b.mainline;if(!x?.escort||x.escort.nextAt!==b.elapsed)return;
 const p=lateMissionPlan(s,b.context.id,d),e=p.escort;x.escort.nextAt+=e.pulse;
 if(b.enemy.some(u=>u.model===e.source&&u.hp>0&&!u.statuses.some(z=>z.id==='stun'))){
  const n=Math.ceil(e.damage*(b.orders?.stance==='guard'?.5:1));x.escort.hp=Math.max(0,x.escort.hp-n);log(b,e.name+'遭到射击，完整度 -'+n+'（剩余 '+x.escort.hp+'）。');
 }
}
export function advanceLateWave(s,d,makeEnemies){
 const b=s.battle,x=b.mainline;if(!x||b.enemy.some(u=>u.hp>0))return false;
 const p=lateMissionPlan(s,b.context.id,d),next=p.waves[x.wave];if(!next)return false;
 x.wave++;b.enemy=makeEnemies(d,next,p.scale,b.elapsed);
 for(const u of b.enemy)if(LATE_BOSSES[u.model])u.boss={kind:LATE_BOSSES[u.model],readyAt:b.elapsed+6000,pendingAt:0,phase:0};
 if(b.orders)b.orders.focus=null;
 if(p.waveHeal)for(const u of b.team)if(u.hp>0)u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*p.waveHeal));
 log(b,'第 '+(x.wave+1)+' / '+(p.waves.length+1)+' 波敌军赶到。'+(p.waveHeal?'补给已送至阵前。':''));
 return true;
}
export function validateLateBattle(s,d,check){
 const b=s.battle;if(!b)return;const m=LATE_MISSIONS[b.context?.id?.replace(/^echo_/,'')],x=b.mainline;
 if(!m){check(x===undefined,'非主线战局不可带后五卷战况');return;}
 check(['story','replay'].includes(b.context.type)&&x&&x.version===1&&Object.keys(x).every(k=>['version','wave','shields','escort'].includes(k)),'后五卷战况格式');
 const p=lateMissionPlan(s,b.context.id,d),integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 check(integer(x.wave,p.waves.length),'主线增援波次');
 const current=[...(x.wave?p.waves[x.wave-1]:p.enemies)];if(!x.wave&&b.context.type==='replay'&&b.context.challenge==='ambush')while(current.length<5)current.push('road_raider');
 check(b.enemy.length===current.length&&b.enemy.every((u,i)=>u.model===current[i]),'当前波敌阵与选择不符');
 check(x.shields&&typeof x.shields==='object'&&!Array.isArray(x.shields)&&Object.keys(x.shields).length===b.team.length&&b.team.every(u=>integer(x.shields[u.id],Math.round(u.maxHp*p.shield))),'主线护盾');
 if(!p.escort)check(x.escort===null,'此战没有护送目标');
 else{const e=x.escort;check(e&&Object.keys(e).every(k=>['hp','nextAt'].includes(k))&&integer(e.hp,p.escort.hp)&&integer(e.nextAt,180000+p.escort.pulse)&&e.nextAt>=(b.outcome?0:b.elapsed)&&e.nextAt%p.escort.pulse===0,'主线护送状态');}
 if(b.outcome==='victory')check(x.wave===p.waves.length&&(!x.escort||x.escort.hp>0)&&b.enemy.every(u=>u.hp===0),'主线胜利目标');
}
