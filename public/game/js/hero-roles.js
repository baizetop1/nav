import {EXTRA_ROLES} from './hero-role-data.js?v=0.64.0';
import {extraOpening,extraDamage,extraTaken,extraHeal,extraAfterHit,extraInterrupt} from './hero-role-effects.js?v=0.64.0';
export {extraAfterHit as roleAfterHit};
import {waterBattle} from './frontier-data.js?v=0.64.0';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const HERO_ROLES={
 songjiang:{name:'济困振心',text:'本人造成有效治疗时，受疗者额外获得最多 8 怒气；每 6 秒最多一次。满血或满怒不触发。'},
 wuyong:{name:'借隙谋攻',text:'普攻命中处于削弱、破甲或眩晕中的敌人，伤害增加 12%。可配合控制与破甲同伴。'},
 luzhishen:{name:'危阵不退',text:'受到直接伤害后仍在阵中，且气血不高于 40% 时，自身获得 18% 护阵，持续 5 秒；每战一次，从后续伤害开始减免。'},
 huarong:{name:'先声夺阵',text:'普攻气血不低于 75% 的敌人，伤害增加 12%。适合先削减强敌气血。'},
 wusong:{name:'独敌决胜',text:'敌方仅剩一人在阵时，普攻伤害增加 12%。适合先清理随从，再集火强敌。'},
 ruanxiaoqi:{name:'护舟接阵',text:'水域战斗开场，为在阵同伴提供 10% 护阵，持续 4 秒；陆地不触发。同类护阵取较强值。'},
 linchong:{name:'枪阵先护',text:'站在首位时，开场自身获得 12% 护阵，持续 6 秒。适合承接第一轮攻击。'},
 tanglong:{name:'铁胆蓄势',text:'处于固守或护阵时受到实际伤害，怒气 +4；每 3 秒最多一次。'},
 baisheng:{name:'乡路照应',text:'本人造成有效治疗时，为受疗者提供 8% 护阵，持续 4 秒；每 6 秒最多一次。'},
 andaoquan:{name:'辨症施治',text:'本人造成有效治疗时，额外清除受疗者一项流血、中毒、眩晕、破甲或削弱；每 6 秒最多一次。'},
 shiqian:{name:'乘隙取势',text:'普攻气血低于一半的敌人，伤害增加 15%。适合手动集火受伤目标。'},
 wangjin:{name:'截势教头',text:'主动招式实际打断蓄势后，使该敌人攻击降低 15%，持续 6 秒。过早施招不触发。'}
};
const SECOND=new Set(Object.keys(HERO_ROLES));
Object.assign(HERO_ROLES,EXTRA_ROLES);
const LEGACY=new Set(['linchong','tanglong','baisheng','andaoquan','shiqian','wangjin']);
const active=b=>[1,2,3].includes(b.roles?.version)&&!b.guest;
const expanded=b=>active(b)&&b.roles.version>=2;
function log(b,text){b.log.push('【人物本领】'+text);if(b.log.length>120)b.log.shift();}
function ready(b,u,ms){if((b.roles.cooldowns[u.id]||0)>b.elapsed)return false;b.roles.cooldowns[u.id]=b.elapsed+ms;return true;}
function count(b,id){b.roles.counts[id]=(b.roles.counts[id]||0)+1;}
function buff(b,u,id,value,ms){const old=u.statuses.find(s=>s.id===id);if(old){old.value=Math.max(old.value,value);old.expiresAt=Math.max(old.expiresAt,b.elapsed+ms);}else u.statuses.push({id,value,expiresAt:b.elapsed+ms});}
export function initializeRoles(b,s){
 if(b.guest)return;
 b.roles={version:3,cooldowns:{},counts:{}};
 const living=b.team.filter(u=>u.hp>0&&!(b.context.type==='realm'&&b.context.kind==='trek'&&s?.realm?.trek?.hp?.[u.id]===0)&&!(b.context.kind==='defense'&&s?.expansion?.run?.hp?.[u.id]===0));
 if(b.team[0]?.id==='linchong'&&living.includes(b.team[0])){buff(b,b.team[0],'guard',.12,6000);count(b,'linchong');log(b,'林冲居前结枪阵，护阵 12% · 6 秒。');}
 extraOpening(b,living);
 if(waterBattle(b)&&living.some(u=>u.id==='ruanxiaoqi')){for(const ally of living)buff(b,ally,'guard',.10,4000);count(b,'ruanxiaoqi');log(b,'阮小七护舟接阵，全队护阵 10% · 4 秒。');}
}
export function roleDamageFactor(b,u,target,normal){
 if(!active(b)||!normal||u.side!=='team'||u.hp<=0)return 1;
 let factor=extraDamage(b,u,target,normal);
 if(u.id==='shiqian'&&target.hp<target.maxHp*.5)factor=1.15;
 if(expanded(b)){
  if(u.id==='wuyong'&&target.statuses.some(x=>['weaken','armor_break','stun'].includes(x.id)&&x.expiresAt>b.elapsed))factor=1.12;
  if(u.id==='huarong'&&target.hp>=target.maxHp*.75)factor=1.12;
  if(u.id==='wusong'&&b.enemy.filter(x=>x.hp>0).length===1)factor=1.12;
 }
 if(factor>1&&!EXTRA_ROLES[u.id])count(b,u.id);
 return factor;
}
export function roleTaken(b,u,n){extraTaken(b,u,n);if(expanded(b)&&u.side==='team'&&u.id==='luzhishen'&&n>0&&u.hp>n&&(u.hp-n)<=u.maxHp*.4&&!b.roles.counts.luzhishen){buff(b,u,'guard',.18,5000);count(b,u.id);log(b,'鲁智深危阵不退，护阵 18% · 5 秒，本战仅一次。');}if(!active(b)||u.side!=='team'||u.id!=='tanglong'||n<=0||u.hp<=n||u.rage>=100)return;if((b.orders?.stance==='guard'||u.statuses.some(s=>s.id==='guard'&&s.expiresAt>b.elapsed))&&ready(b,u,3000)){const gain=Math.min(4,100-u.rage);u.rage+=gain;count(b,u.id);log(b,'汤隆稳住铁胆，怒气 +'+gain+'。');}}
export function roleHeal(b,u,target,n){extraHeal(b,u,target,n);if(!active(b)||u?.side!=='team'||!target||target.hp<=0||n<=0)return;if(expanded(b)&&u.id==='songjiang'&&target.rage<100&&ready(b,u,6000)){const gain=Math.min(8,100-target.rage);target.rage+=gain;count(b,u.id);log(b,'宋江济困振心，'+target.name+'怒气 +'+gain+'。');}if(u.id==='baisheng'&&ready(b,u,6000)){buff(b,target,'guard',.08,4000);count(b,u.id);log(b,'白胜照应'+target.name+'，护阵 8% · 4 秒。');}if(u.id==='andaoquan'){const i=target.statuses.findIndex(s=>['bleeding','poison','stun','armor_break','weaken'].includes(s.id));if(i>=0&&ready(b,u,6000)){target.statuses.splice(i,1);count(b,u.id);log(b,'安道全辨症，为'+target.name+'清除一项负面状态。');}}}
export function roleInterrupt(b,u,target){extraInterrupt(b,u,target);if(active(b)&&u.id==='wangjin'){buff(b,target,'weaken',.15,6000);count(b,u.id);log(b,'王进截势，敌方攻击降低 15% · 6 秒。');}}
export function roleCard(id){const m=HERO_ROLES[id];return m?'<section class="realm-card hero-role"><h3>'+m.name+'</h3><p class="note">'+m.text+' 本领随本人正式出阵生效，剧情助阵和演武教习不借用；有效治疗含招式与战斗援护，不含药品。</p></section>':'';}
const available=(version,id)=>version===3||version===2&&SECOND.has(id)||version===1&&LEGACY.has(id);
export function roleReport(r){const rec=r.roleReport;if(!rec)return '';return '<section><h3>人物本领</h3>'+r.team.map(u=>{const m=HERO_ROLES[u.id];return '<p class="note">'+m.name+' · '+(available(rec.version,u.id)?(rec.counts[u.id]||0)+' 次'+(rec.counts[u.id]?'':' · 条件未满足或无需施加效果'):'本战沿用旧规则，尚未启用')+'</p>';}).join('')+'</section>';}
export function roleBattlePanel(b){if(!b.roles||b.guest)return '';return '<details class="battle-role-status" data-fold="battle-role-status"><summary>人物本领 · 触发与冷却</summary>'+b.team.map(u=>'<p class="note">'+u.name+' · '+HERO_ROLES[u.id].name+'：'+(!available(b.roles.version,u.id)?'旧战未启用':u.hp<=0?'已退阵':(b.roles.counts[u.id]||0)+' 次'+((b.roles.cooldowns[u.id]||0)>b.elapsed?' · 冷却 '+((b.roles.cooldowns[u.id]-b.elapsed)/1000).toFixed(1)+' 秒':' · 按条件触发'))+'</p>').join('')+'</details>';}
export function validateRoles(s,check){const valid=(r,ids)=>{check(r&&[1,2,3].includes(r.version)&&r.counts&&typeof r.counts==='object'&&!Array.isArray(r.counts),'人物本领记录');for(const [id,n]of Object.entries(r.counts))check(own(HERO_ROLES,id)&&(r.version===3||r.version===2&&SECOND.has(id)||r.version===1&&LEGACY.has(id))&&ids.includes(id)&&Number.isSafeInteger(n)&&n>=0&&n<=100000,'人物本领计数');};if(s.battle?.roles){const b=s.battle;check(!b.guest&&b.rules===2,'人物本领来源');valid(b.roles,b.team.map(u=>u.id));check(b.roles.cooldowns&&typeof b.roles.cooldowns==='object'&&!Array.isArray(b.roles.cooldowns),'本领冷却');for(const [id,n]of Object.entries(b.roles.cooldowns))check((['baisheng','andaoquan','tanglong'].includes(id)||b.roles.version>=2&&id==='songjiang'||b.roles.version===3&&['heal','hit'].includes(EXTRA_ROLES[id]?.event)||b.roles.version===3&&EXTRA_ROLES[id]?.kind==='taken_rage')&&b.team.some(u=>u.id===id)&&Number.isSafeInteger(n)&&n>=0&&n<=b.elapsed+6000,'本领冷却时钟');}if(s.lastBattle?.roleReport)valid(s.lastBattle.roleReport,s.lastBattle.team.map(u=>u.id));}

