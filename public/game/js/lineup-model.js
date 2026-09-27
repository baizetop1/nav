import {HERO_ROLES} from './hero-roles.js?v=0.52.0';
import {unlockReason} from './growth.js?v=0.52.0';
import {waterBattle} from './frontier-data.js?v=0.52.0';
import {battleTerrain} from './strategy-data.js?v=0.52.0';
import {CORPS} from './corps-data.js?v=0.52.0';
const baseKinds={songjiang:'heal_rage',wuyong:'control',luzhishen:'taken_guard',huarong:'high',wusong:'last',ruanxiaoqi:'water_guard',linchong:'opening_front',tanglong:'taken_rage',baisheng:'heal_guard',andaoquan:'heal_cleanse',shiqian:'low',wangjin:'interrupt_weaken'};
export const roleKind=id=>HERO_ROLES[id]?.kind||baseKinds[id];
export function combatCapabilities(u,d,b){
 const skills=u.skills.map(id=>d.by.skills[id]).filter(s=>s&&s.type!=='passive'),kind=roleKind(u.id),h=d.by.heroes[u.id];
 const interrupt=skills.some(s=>s.training?.profile==='interrupt');
 const heal=skills.some(s=>s.effect.kind==='heal'&&s.training?.profile!=='protect')||!!b?.depth&&CORPS[u.id]?.profile==='medic',guard=['opening_front','opening_rear','taken_guard','after_guard'].includes(kind)||kind==='water_guard'&&!!b&&waterBattle(b)||kind==='heal_guard'&&heal||kind==='interrupt_guard'&&interrupt||!!b?.depth&&CORPS[u.id]?.profile==='naval'&&waterBattle(b)||skills.some(s=>['protect','shelter','discipline'].includes(s.training?.profile));
 const armor=!!b?.depth&&CORPS[u.id]?.profile==='archer'||kind==='after_sunder'||kind==='interrupt_sunder'&&interrupt||skills.some(s=>s.effect.status?.id==='armor_break');
 const control=kind==='after_weaken'||kind==='interrupt_weaken'&&interrupt||skills.some(s=>['weaken','control','wave'].includes(s.training?.profile)||['stun','weaken'].includes(s.effect.status?.id));
 return {heal,guard,interrupt,armor,control,armorUse:kind==='armor',controlUse:kind==='control',water:CORPS[u.id]?.profile==='naval'||['water','water_guard','opening_water_rage'].includes(kind),damage:h.type!=='support',front:h.type==='defender'&&kind!=='opening_rear'||kind==='opening_front'};
}
export function roleReadiness(b,u,d){
 const m=HERO_ROLES[u.id],k=roleKind(u.id),c=combatCapabilities(u,d,b);if(u.hp<=0)return '已退阵，本次不生效。';
 if(m.introduced===3&&b.roles?.version!==3)return '本战沿用旧本领规则，新本领在下次正式出阵生效。';
 if((m.event==='heal'||k.startsWith('heal_'))&&!c.heal)return '尚未解锁可用治疗招式，本领暂不能触发；先提高等级并查看招式解锁条件。';
 if(k.startsWith('interrupt_')&&!c.interrupt)return '尚未解锁直接打断招式，本领暂不能触发；先查看招式解锁条件。';
 if(['water','water_guard','opening_water_rage'].includes(k)&&!waterBattle(b))return '当前非水域，这项本领本次不生效。';
 if(k==='mountain'&&battleTerrain(b)!=='mountain')return '当前非山地，这项本领本次不生效。';
 if(k==='opening_front'&&b.team[0]!==u)return '未排首位，开场护阵不生效。';
 if(k==='opening_rear'&&(b.team.length<2||b.team[b.team.length-1]!==u))return '需要至少两人出阵且本人排末位。';
 if(k.startsWith('interrupt_')&&!b.enemy.some(t=>t.boss))return '敌方无蓄势首领，本领本次没有触发目标。';
 return ''; 
}
export function fullLineupAdvice(b,d){
 if(!b||b.guest)return [];const party=b.team.filter(u=>u.hp>0),caps=party.map(u=>combatCapabilities(u,d,b)),tips=[];
 if(!caps.some(c=>c.heal))tips.push('队中无人会治疗，可换一位医者或带药出战。');
 if(b.enemy.some(u=>u.boss)&&!caps.some(c=>c.interrupt))tips.push('无人能打断敌将蓄势，需靠护阵或固守抵挡。');
 const join=arr=>arr.map(u=>u.name).join('、');
 const armor=party.filter((u,i)=>caps[i].armor),au=party.filter((u,i)=>caps[i].armorUse),control=party.filter((u,i)=>caps[i].control),cu=party.filter((u,i)=>caps[i].controlUse&&u.id!=='wuyong');
 if(au.length)tips.push(armor.length?join(armor)+'可提供破甲，配合'+join(au)+'集火同一目标。':join(au)+'需要破甲目标，但本队尚无可用破甲来源。');
 if(cu.length)tips.push(control.length?join(control)+'可提供控制或削弱，配合'+join(cu)+'在状态持续时集火。':join(cu)+'需要眩晕或削弱，但本队尚无可用来源。');
 const guarded=party.filter(u=>roleKind(u.id)==='guarded');for(const target of guarded)tips.push(party.some(source=>canProtect(source,target,b,d))?target.name+'有可用护阵配合，可在护阵持续时加强普攻。':target.name+'需要护阵，但当前没有能保护他的已解锁来源。');
 for(const u of party){const m=HERO_ROLES[u.id];if(!m.introduced)continue;const text=roleReadiness(b,u,d);if(/未|非|需要|无蓄势/.test(text))tips.push(u.name+'：'+text);}
 return tips;
}
const styles=[
 {id:'steady',name:'稳守续航',slots:['front','heal','damage'],text:'前排承伤、治疗接应，第三位负责输出。'},
 {id:'armor',name:'破甲集火',slots:['armor','armorUse','heal'],text:'先破甲再集火，保留治疗位。'},
 {id:'control',name:'控场衔接',slots:['control','controlUse','damage'],text:'先控制或削弱敌人，再集中攻击；状态消失后需重新施招。'},
 {id:'water',name:'水域互援',slots:['water','heal','water'],text:'两名水战人物与治疗配合，适合当前水域。'},
 {id:'interrupt',name:'截招攻坚',slots:['front','interrupt','damage'],text:'前排接敌、保留打断招式应对首领。'}
];
export function recommendLineups(s,d,b){
 if(!b||b.guest)return [];
 const candidates=d.heroes.filter(h=>s.heroes[h.id]?.status==='owned'&&s.affairs?.mission?.hero!==h.id&&!s.realm?.squad?.team.includes(h.id)).map(h=>{const u={id:h.id,skills:h.skills.filter(id=>!unlockReason(s,d.by.skills[id]))};return {id:h.id,cap:combatCapabilities(u,d,b),score:s.heroes[h.id].level*10+h.star};}).sort((a,c)=>c.score-a.score||a.id.localeCompare(c.id));
 const results=[];for(const style of styles){if(style.id==='water'&&!waterBattle(b)||style.id==='interrupt'&&!b.enemy.some(e=>e.boss))continue;const team=[];for(const slot of style.slots){const choice=candidates.find(c=>!team.includes(c.id)&&c.cap[slot]);if(!choice)break;team.push(choice.id);}const front=team.find(id=>roleKind(id)==='opening_front');if(front){team.splice(team.indexOf(front),1);team.unshift(front);}const rear=team.find(id=>roleKind(id)==='opening_rear');if(rear){team.splice(team.indexOf(rear),1);team.push(rear);}if(team.length!==3||results.some(r=>r.team.join(',')===team.join(',')))continue;results.push({...style,team});}
 return results;
}

export function canProtect(source,target,b,d){const kind=roleKind(source.id),cap=combatCapabilities(source,d,b),skills=source.skills.map(id=>d.by.skills[id]).filter(s=>s&&s.type!=='passive');
 if(target.statuses?.some(s=>s.id==='guard'&&s.expiresAt>b.elapsed))return true;
 if(skills.some(s=>['protect','shelter','discipline','triage'].includes(s.training?.profile)))return true;
 if(kind==='heal_guard'&&cap.heal||kind==='water_guard'&&waterBattle(b)||kind==='interrupt_guard'&&cap.interrupt&&b.enemy.some(e=>e.boss)||b.depth&&CORPS[source.id]?.profile==='naval'&&waterBattle(b))return true;
 if(kind==='opening_rear')return b.team.length>1&&b.team[b.team.length-1]===source&&b.team[0]===target;
 return source===target&&(['taken_guard','after_guard'].includes(kind)||kind==='opening_front'&&b.team[0]===source);
}
