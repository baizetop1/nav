import {journeyHealing} from './journey-combat.js?v=0.44.0';
import {COMBOS,PERSONAL,LAYOUTS} from './expansion-data.js?v=0.44.0';
import {addStatus,attackInterval} from './battle.js?v=0.44.0';
import {contribution} from './debrief.js?v=0.44.0';
export function initializeExpansion(s,b){if(!s.expansion||b.guest||b.expansion)return;const x=s.expansion;b.expansion={version:1,smoke:false,personal:b.team.filter(u=>x.personal[u.id]).map(u=>u.id),combos:Object.fromEntries(Object.entries(COMBOS).filter(([id,m])=>(x.combos[id]||0)>=3&&m.team.every(id=>b.team.some(u=>u.id===id))).map(([id])=>[id,{count:0,readyAt:0}]))};
 if(x.smoke){s.inventory.smoke_pack--;x.smoke=false;b.expansion.smoke=true;b.log.push('【行军烟幕】已携带一包，本场主动撤退兵损减少 25%；无论是否使用，结束后不返还。');}
 for(const u of b.team){if(!b.expansion.personal.includes(u.id))continue;const m=PERSONAL[u.id];if(m.hp){u.maxHp=Math.round(u.maxHp*(1+m.hp));u.hp=u.maxHp;}if(m.speed){u.speed=Math.round(u.speed*(1+m.speed));u.nextAttackAt=attackInterval(u);}if(m.rage)u.rage=Math.min(100,u.rage+m.rage);if(m.armyDefense&&u.corps?.troops)u.defense=Math.round(u.defense*(1+m.armyDefense));if(u.id==='linchong')addStatus(u,{id:'guard',value:.04,turns:4},0);if(u.id==='ruanxiaoqi'&&b.depth?.terrain==='water')u.defense=Math.round(u.defense*1.05);}
 const r=x.run;if(b.context.kind==='defense'&&r){if(r.layout==='wall')for(const u of b.team)u.defense=Math.round(u.defense*1.12);if(r.layout==='archer')for(const u of b.enemy)u.hp=Math.max(1,Math.floor(u.hp*.92));if(r.layout==='trap')for(const u of b.enemy){u.speed=Math.max(1,Math.floor(u.speed*.85));u.nextAttackAt=attackInterval(u);}b.log.push('【寨防】'+LAYOUTS[r.layout].name+'：'+LAYOUTS[r.layout].text);}
 const localFaction=({yuncheng:'merchants',jingyang:'villages',dongxi:'river'})[b.context.id];if(b.context.type==='realm'&&localFaction&&x.diplomacy[b.context.id+'_'+s.daily.date.slice(0,7)]===localFaction){for(const u of b.team)u.rage=Math.min(100,u.rage+5);b.log.push('【乡盟声援】本地支持者协助出征，全队初始怒气 +5。');}}
export const personalFactor=(b,u,normal)=>normal&&u.side==='team'&&u.id==='huarong'&&b.expansion?.personal.includes(u.id)?1.05:1;
function shareContribution(b,party,kind,total){party.forEach((u,i)=>contribution(b,u,kind,Math.floor(total/party.length)+(i<total%party.length?1:0)));}
export function advanceCombos(b){
 if(!b.expansion||b.outcome)return;
 for(const [id,record]of Object.entries(b.expansion.combos)){
  const m=COMBOS[id],party=m.team.map(id=>b.team.find(u=>u.id===id));
  if(record.count>=2||record.readyAt>b.elapsed||party.some(u=>!u||u.hp<=0||u.rage<20||u.statuses.some(v=>v.id==='stun')))continue;
  const injured=[...b.team].filter(u=>u.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(m.kind==='heal'&&(!injured||injured.hp/injured.maxHp>.7))continue;
  if(m.kind==='scout'&&!b.enemy.slice(1).some(u=>u.hp>0))continue;
  const target=m.kind==='scout'?[...b.enemy].reverse().find(u=>u.hp>0):b.enemy.find(u=>u.hp>0&&(id!=='bow'||u.statuses.some(v=>v.id==='armor_break')||u.boss?.pendingAt>b.elapsed));
  if(!target||id==='water'&&b.depth?.terrain!=='water'||id==='erlong'&&!Object.values(b.metrics?.heroes||{}).some(v=>v.taken>0))continue;
  for(const u of party)u.rage-=20;
  record.count++;record.readyAt=b.elapsed+15000;
  if(m.kind==='heal'){
   const restored=Math.min(injured.maxHp-injured.hp,Math.round(injured.maxHp*.08));injured.hp+=restored;
   shareContribution(b,party,'healing',restored);journeyHealing(b,party[0],restored,injured);
   b.log.push('【组合互助】'+m.name+'为'+injured.name+'恢复 '+restored+' 点气血。');
  }else{
   if(m.kind==='scout')target.rage=Math.max(0,target.rage-10);
   const loss=Math.min(target.hp,Math.max(1,Math.round(party.reduce((n,u)=>n+u.attack,0)*.35-target.defense*.3)));target.hp-=loss;
   shareContribution(b,party,'damage',loss);
   b.log.push('【组合合击】'+m.name+'令'+target.name+'损失 '+loss+' 点气血。');
  }
 }
}

export const personalHealingFactor=(b,u)=>u.side==='team'&&b.expansion?.personal.includes(u.id)?1+(PERSONAL[u.id]?.heal||0):1;
