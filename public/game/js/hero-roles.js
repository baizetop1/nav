const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const HERO_ROLES={
 linchong:{name:'枪阵先护',text:'站在首位时，开场自身获得 12% 护阵，持续 6 秒。适合承接第一轮攻击。'},
 tanglong:{name:'铁胆蓄势',text:'处于固守或护阵时受到实际伤害，怒气 +4；每 3 秒最多一次。'},
 baisheng:{name:'乡路照应',text:'招式产生有效治疗时，为受疗者提供 8% 护阵，持续 4 秒；每 6 秒最多一次。'},
 andaoquan:{name:'辨症施治',text:'招式产生有效治疗时，额外清除受疗者一项流血、中毒、眩晕、破甲或削弱；每 6 秒最多一次。'},
 shiqian:{name:'乘隙取势',text:'普攻气血低于一半的敌人，伤害增加 15%。适合手动集火受伤目标。'},
 wangjin:{name:'截势教头',text:'主动招式实际打断蓄势后，使该敌人攻击降低 15%，持续 6 秒。过早施招不触发。'}
};
const active=b=>b.roles?.version===1&&!b.guest;
function log(b,text){b.log.push('【人物本领】'+text);if(b.log.length>120)b.log.shift();}
function ready(b,u,ms){if((b.roles.cooldowns[u.id]||0)>b.elapsed)return false;b.roles.cooldowns[u.id]=b.elapsed+ms;return true;}
function count(b,id){b.roles.counts[id]=(b.roles.counts[id]||0)+1;}
function buff(b,u,id,value,ms){const old=u.statuses.find(s=>s.id===id);if(old){old.value=Math.max(old.value,value);old.expiresAt=Math.max(old.expiresAt,b.elapsed+ms);}else u.statuses.push({id,value,expiresAt:b.elapsed+ms});}
export function initializeRoles(b,s){if(b.guest)return;b.roles={version:1,cooldowns:{},counts:{}};if(b.team[0]?.id==='linchong'&&b.team[0].hp>0&&s?.realm?.trek?.hp?.linchong!==0&&s?.expansion?.run?.hp?.linchong!==0){buff(b,b.team[0],'guard',.12,6000);count(b,'linchong');log(b,'林冲居前结枪阵，护阵 12% · 6 秒。');}}
export function roleDamageFactor(b,u,target,normal){if(active(b)&&normal&&u.side==='team'&&u.id==='shiqian'&&target.hp<target.maxHp*.5){count(b,u.id);return 1.15;}return 1;}
export function roleTaken(b,u,n){if(!active(b)||u.side!=='team'||u.id!=='tanglong'||n<=0||u.hp<=n||u.rage>=100)return;if((b.orders?.stance==='guard'||u.statuses.some(s=>s.id==='guard'&&s.expiresAt>b.elapsed))&&ready(b,u,3000)){const gain=Math.min(4,100-u.rage);u.rage+=gain;count(b,u.id);log(b,'汤隆稳住铁胆，怒气 +'+gain+'。');}}
export function roleHeal(b,u,target,n){if(!active(b)||u?.side!=='team'||!target||target.hp<=0||n<=0)return;if(u.id==='baisheng'&&ready(b,u,6000)){buff(b,target,'guard',.08,4000);count(b,u.id);log(b,'白胜照应'+target.name+'，护阵 8% · 4 秒。');}if(u.id==='andaoquan'){const i=target.statuses.findIndex(s=>['bleeding','poison','stun','armor_break','weaken'].includes(s.id));if(i>=0&&ready(b,u,6000)){target.statuses.splice(i,1);count(b,u.id);log(b,'安道全辨症，为'+target.name+'清除一项负面状态。');}}}
export function roleInterrupt(b,u,target){if(active(b)&&u.id==='wangjin'){buff(b,target,'weaken',.15,6000);count(b,u.id);log(b,'王进截势，敌方攻击降低 15% · 6 秒。');}}
export function roleCard(id){const m=HERO_ROLES[id];return m?'<section class="realm-card hero-role"><h3>'+m.name+'</h3><p class="note">'+m.text+' 本领随本人正式出阵生效，剧情助阵和演武教习不借用。</p></section>':'';}
export function roleReport(r){const c=r.roleReport?.counts;if(!c)return '';return '<section><h3>人物本领</h3><p class="note">'+(Object.entries(c).map(([id,n])=>HERO_ROLES[id].name+' '+n+' 次').join(' · ')||'本战没有达到本领触发条件。')+'</p></section>';}
export function validateRoles(s,check){const valid=(r,ids)=>{check(r&&r.version===1&&r.counts&&typeof r.counts==='object'&&!Array.isArray(r.counts),'人物本领记录');for(const [id,n]of Object.entries(r.counts))check(own(HERO_ROLES,id)&&ids.includes(id)&&Number.isSafeInteger(n)&&n>=0&&n<=100000,'人物本领计数');};if(s.battle?.roles){const b=s.battle;check(!b.guest&&b.rules===2,'人物本领来源');valid(b.roles,b.team.map(u=>u.id));check(b.roles.cooldowns&&typeof b.roles.cooldowns==='object'&&!Array.isArray(b.roles.cooldowns),'本领冷却');for(const [id,n]of Object.entries(b.roles.cooldowns))check(['baisheng','andaoquan','tanglong'].includes(id)&&b.team.some(u=>u.id===id)&&Number.isSafeInteger(n)&&n>=0&&n<=b.elapsed+6000,'本领冷却时钟');}if(s.lastBattle?.roleReport)valid(s.lastBattle.roleReport,s.lastBattle.team.map(u=>u.id));}

