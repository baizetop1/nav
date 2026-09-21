import {ROUTE_BOSSES,EFFECT_LABELS,journeyConsequences} from './journey-data.js?v=0.44.0';
const active=b=>b.journey?.rules===2&&b.journey.combat,has=(b,id)=>!!active(b)&&b.journey.boons.includes(id);
const living=u=>u.hp>0,guarded=(b,u)=>b.orders?.stance==='guard'||u.statuses.some(s=>s.id==='guard'&&s.expiresAt>b.elapsed);
const log=(b,text)=>{b.log.push('【'+(b.elapsed/1000).toFixed(1)+'秒】'+text);if(b.log.length>120)b.log.shift();};
function ready(b,u,id){const x=active(b),key=u.id+':'+id;if((x.cooldowns[key]||0)>b.elapsed)return false;x.cooldowns[key]=b.elapsed+3000;return true;}
function count(b,id,n=1){active(b).counts[id]+=n;}
export function initializeJourneyCombat(b,j){if(j.rules!==2)return;b.journey.rules=2;b.journey.combat={version:1,shields:Object.fromEntries(b.team.map(u=>[u.id,0])),cooldowns:{},counts:Object.fromEntries(Object.keys(EFFECT_LABELS).map(id=>[id,0]))};const consequences=journeyConsequences(j);b.journey.consequence=consequences.pursuit?'pursuit':consequences.helped&&b.journey.kind==='boss'?'aid':'none';
 if(b.journey.kind==='boss'){for(const u of b.enemy)delete u.boss;const m=ROUTE_BOSSES[j.region],boss=b.enemy[0];boss.name=m.name;boss.hp=boss.maxHp=Math.round(boss.maxHp*1.6);boss.boss={kind:'journey_'+j.region,readyAt:2000,pendingAt:0,phase:0};b.enemy[1].name=m.escort;log(b,'【首领情报】'+m.warning);}
 if(b.journey.consequence==='aid'){for(const u of b.team.filter(living)){u.hp=Math.min(u.maxHp,u.hp+Math.round(u.maxHp*.12));u.rage=Math.min(100,u.rage+10);}log(b,'【商旅报恩】向导送来援助：在阵好汉恢复 12% 气血，怒气 +10。');}
 if(b.journey.consequence==='pursuit')log(b,'【辎重追兵】搜索遗货引来一名追兵；本段胜利暂存碎银与精铁增加 20%。');
}
export function journeyHealing(b,source,n,target){if(!active(b)||n<=0||source?.side!=='team'||target?.side!=='team'||!living(target))return;
 if(has(b,'heal_guard')){const shields=active(b).shields,amount=Math.max(0,Math.min(Math.floor(target.maxHp*.15)-shields[target.id],Math.floor(n*.4)));shields[target.id]+=amount;if(amount){count(b,'heal_guard');log(b,'【回春护体】'+target.name+'护盾 +'+amount+'。');}}
 if(has(b,'battle_hymn')&&target.rage<100&&ready(b,target,'battle_hymn')){const n=Math.min(8,100-target.rage);target.rage+=n;count(b,'battle_hymn');log(b,'【济困振气】'+target.name+'怒气 +'+n+'。');}}
export function journeyAbsorb(b,target,loss){if(!active(b)||target.side!=='team')return loss;const shields=active(b).shields,n=Math.min(shields[target.id],loss);shields[target.id]-=n;if(n){count(b,'absorbed',n);log(b,'【护盾吸收】'+target.name+'抵去 '+n+' 点伤害。');}return loss-n;}
export function journeyDamageFactor(b,u,target,normal){return active(b)&&b.journey.kind==='boss'&&b.journey.region==='mountain'&&u.side==='team'&&normal&&target===b.enemy[0]&&b.enemy[1]?.hp>0?.55:1;}
function extraDamage(b,u,target,amount,name,api){if(!living(u)||!target||!living(target))return;const loss=Math.min(target.hp,Math.max(1,Math.round(amount)));api.reportDamage(b,u,target,loss);target.hp-=loss;target.rage=Math.min(100,target.rage+10);log(b,'【'+name+'】'+u.name+'令'+target.name+'损失 '+loss+' 气血。');}
export function journeyAfterHit(b,u,target,api,normal,loss){if(!active(b)||!normal)return;
 if(u.side==='enemy'&&living(target)&&living(u)&&has(b,'riposte')&&guarded(b,target)&&ready(b,target,'riposte')){count(b,'riposte');extraDamage(b,target,u,target.attack*.6,'固守反击',api);}
 if(u.side!=='team'||!living(u)||!living(target))return;
 if(has(b,'shield_bash')&&active(b).shields[u.id]>0){const n=Math.min(active(b).shields[u.id],Math.floor(u.maxHp*.1));if(n){active(b).shields[u.id]-=n;count(b,'shield_bash');extraDamage(b,u,target,n,'借盾破阵',api);}}
 if(living(target)&&target.hp<target.maxHp*.5&&has(b,'pursuit_chain')&&ready(b,u,'pursuit_chain')){count(b,'pursuit_chain');extraDamage(b,u,target,u.attack*(has(b,'ambush')?.7:.4),'乘隙追击',api);}}
export function journeyInterrupt(b,u,target,api){if(!active(b))return;count(b,'bossInterrupts');if(!has(b,'rupture'))return;count(b,'rupture');for(const ally of b.team.filter(living))ally.rage=Math.min(100,ally.rage+12);extraDamage(b,u,target,u.attack*.8,'截势乘胜',api);log(b,'【截势乘胜】在阵好汉怒气 +12。');}
export function advanceJourneyBoss(state,u,api,strike){const b=state.battle,boss=u.boss;if(!boss.kind.startsWith('journey_'))return false;const m=ROUTE_BOSSES[b.journey.region];
 if(boss.pendingAt===b.elapsed){boss.pendingAt=0;boss.readyAt=b.elapsed+10000;if(u.statuses.some(s=>s.id==='stun')){count(b,'bossInterrupts');api.log(b,u.name+'【蓄势中断】本次'+m.move+'落空。');return true;}count(b,'bossCasts');const targets=b.team.filter(living);if(b.journey.region==='forest'){const escort=b.enemy[1]?.hp>0;api.log(b,escort?'【号令齐射】号令手引弓，全队受袭。':'【号令已断】齐射失去配合，仅袭前位。');for(const target of escort?targets:targets.slice(0,1))strike(state,u,target,{kind:'damage',rate:escort?1.1:1},m.move,api);}
 if(b.journey.region==='water'){const safe=b.orders?.stance==='guard';api.log(b,safe?'【稳住船阵】固守额外削减 55% 浪袭伤害。':'【回潮浪袭】浪头冲向全队。');for(const target of targets)strike(state,u,target,{kind:'damage',rate:1.2*(safe?.45:1)},m.move,api);}
 if(b.journey.region==='mountain')for(const target of targets.slice(0,2))strike(state,u,target,{kind:'damage',rate:1.4},m.move,api);
 }else if(!boss.pendingAt&&boss.readyAt===b.elapsed){boss.pendingAt=b.elapsed+m.windup;api.log(b,'【首领蓄势 · '+m.windup/1000+'秒】'+m.move+'：'+m.warning);}return true;}
