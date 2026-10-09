import {EXTRA_ROLES} from './hero-role-data.js?v=0.69.0';
import {waterBattle} from './frontier-data.js?v=0.69.0';
import {battleTerrain} from './strategy-data.js?v=0.69.0';
const spec=(b,u)=>b.roles?.version===3&&!b.guest&&u?.side==='team'&&u.hp>0?EXTRA_ROLES[u.id]:null;
const has=(b,u,id)=>u.statuses.some(s=>s.id===id&&s.expiresAt>b.elapsed);
const living=b=>b.team.filter(u=>u.hp>0);
const count=(b,u)=>{b.roles.counts[u.id]=(b.roles.counts[u.id]||0)+1;};
function note(b,u,m){b.log.push('【人物本领】'+u.name+' · '+m.name+'触发。');if(b.log.length>120)b.log.shift();}
function ready(b,u,ms=6000){if((b.roles.cooldowns[u.id]||0)>b.elapsed)return false;b.roles.cooldowns[u.id]=b.elapsed+ms;return true;}
function buff(b,u,id,value,ms){const old=u.statuses.find(s=>s.id===id);if(old){old.value=Math.max(old.value,value);old.expiresAt=Math.max(old.expiresAt,b.elapsed+ms);}else{if(u.statuses.length>=100)return false;u.statuses.push({id,value,expiresAt:b.elapsed+ms});}return true;}
function rage(u,n){const gain=Math.min(n,100-u.rage);u.rage+=gain;return gain>0;}
export function extraOpening(b,party){for(const u of party){const m=spec(b,u);if(!m||m.event!=='opening')continue;let done=false;
 if(m.kind==='opening_front'&&b.team[0]===u)done=buff(b,u,'guard',m.value,6000);
 if(m.kind==='opening_rear'&&b.team.length>1&&b.team[b.team.length-1]===u&&party.includes(b.team[0]))done=buff(b,b.team[0],'guard',m.value,4000);
 if(m.kind==='opening_rally'||m.kind==='opening_water_rage'&&waterBattle(b))for(const ally of party)done=rage(ally,m.value)||done;
 if(done){count(b,u);note(b,u,m);}
}}
export function extraDamage(b,u,t,normal){const m=spec(b,u);if(!m||m.event!=='damage'||!normal)return 1;const k=m.kind;
 const yes=k==='healthy'?u.hp>u.maxHp*.7:k==='high'?t.hp>=t.maxHp*.75:k==='low'?t.hp<t.maxHp*.5:k==='hurt'?u.hp<=u.maxHp*.5:k==='early'?b.elapsed<8000:k==='late'?b.elapsed>=15000:k==='boss'?!!t.boss:k==='armor'?has(b,t,'armor_break'):k==='control'?has(b,t,'stun')||has(b,t,'weaken'):k==='guarded'?has(b,u,'guard'):k==='water'?waterBattle(b):k==='mountain'?battleTerrain(b)==='mountain':false;
 if(!yes)return 1;count(b,u);return 1+m.value;
}
export function extraTaken(b,u,n){const m=spec(b,u);if(!m||m.event!=='taken'||n<=0||u.hp<=n)return;
 if(m.kind==='taken_guard'&&!b.roles.counts[u.id]&&u.hp-n<=u.maxHp*.4&&buff(b,u,'guard',m.value,4000)){count(b,u);note(b,u,m);}
 if(m.kind==='taken_rage'&&u.rage<100&&(b.orders?.stance==='guard'||has(b,u,'guard'))&&ready(b,u,3000)){rage(u,m.value);count(b,u);note(b,u,m);}
}
export function extraHeal(b,u,t,n){const m=spec(b,u);if(!m||m.event!=='heal'||!t||t.hp<=0||n<=0)return;
 if(m.kind==='heal_rage'&&t.rage>=100)return;
 const bad=t.statuses.findIndex(s=>['bleeding','poison','stun','armor_break','weaken'].includes(s.id)&&s.expiresAt>b.elapsed);
 if(m.kind==='heal_cleanse'&&bad<0)return;
 if(!ready(b,u))return;
 let done=false;if(m.kind==='heal_guard')done=buff(b,t,'guard',m.value,4000);if(m.kind==='heal_rage')done=rage(t,m.value);if(m.kind==='heal_cleanse'){t.statuses.splice(bad,1);done=true;}
 if(done){count(b,u);note(b,u,m);}
}
export function extraAfterHit(b,u,t,normal,loss,api){const m=spec(b,u);if(!m||m.event!=='hit'||!normal||loss<=0||(u.attacks+1)%3!==0)return;
 if(['after_sunder','after_weaken'].includes(m.kind)&&t.hp<=0)return;
 if(m.kind==='after_rage'&&u.rage>=100||m.kind==='after_heal'&&u.hp>=u.maxHp)return;
 if(!ready(b,u))return;
 let done=false;
 if(m.kind==='after_sunder')done=buff(b,t,'armor_break',1,3000);
 if(m.kind==='after_weaken')done=buff(b,t,'weaken',m.value,3000);
 if(m.kind==='after_guard')done=buff(b,u,'guard',m.value,3000);
 if(m.kind==='after_rage')done=rage(u,m.value);
 if(m.kind==='after_heal'){const n=Math.min(u.maxHp-u.hp,Math.max(1,Math.round(u.maxHp*m.value)));api.reportHealing(b,u,n,u);u.hp+=n;done=true;}
 if(done){count(b,u);note(b,u,m);}
}
export function extraInterrupt(b,u,t){const m=spec(b,u);if(!m||m.event!=='interrupt')return;let done=false;
 if(m.kind==='interrupt_sunder'&&t.hp>0)done=buff(b,t,'armor_break',1,4000);
 if(m.kind==='interrupt_guard')for(const ally of living(b))done=buff(b,ally,'guard',m.value,4000)||done;
 if(m.kind==='interrupt_rage')for(const ally of living(b))done=rage(ally,m.value)||done;
 if(done){count(b,u);note(b,u,m);}
}
