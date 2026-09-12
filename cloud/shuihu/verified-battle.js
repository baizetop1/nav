import { gameSnapshot } from '../../public/game/js/portable.js';
import { dispatch } from '../../public/game/js/core.js';
import { advanceBattle } from '../../public/game/js/battle.js';
import { rotationCalendar, weeklyScore } from '../../public/game/js/rotations.js';
export function verifyAutoBattle(data,raw,tier,record,now,seed){
 if(!Number.isInteger(tier)||tier<1||tier>5||tier>(record?.tier||0)+1)throw Error('服务器演武须从第一层依次通关。');
 const s=gameSnapshot(JSON.parse(raw),data),cal=rotationCalendar(now);
 if(!s.camp||s.battle||s.scheme||s.event)throw Error('请上传已建寨且已经收兵的进度，再参加演武。');
 // Ignore client scores, battle units, RNG and wall clock. Rebuild combat from the saved roster.
 s.clock=now;s.lastRegen=now;s.startedAt=Math.min(s.startedAt,now);s.daily.date=cal.date;s.rng=seed||1;s.battleSkillMode='auto';
 if(s.frontier){s.frontier.lastAt=now;for(const p of Object.values(s.frontier.posts))p.safeAt=Math.min(p.safeAt,now);}
 s.campaign={version:1,daily:{date:cal.date,uses:{}},weekly:record?{[cal.period]:{tier:record.tier,score:record.score,elapsed:record.elapsed,hp:record.hp}}:{}};
 // An exhibition does not spend either local or cloud resources, and grants no items.
 s.player.stamina=100;s.camp.food=10000000;
 const played=dispatch(data,s,{type:'rotationStart',kind:'weekly',id:cal.route.id,tier},now);
 for(let step=0;step<180&&!played.battle.outcome;step++)advanceBattle(played,data,1000);
 const b=played.battle;if(!b.outcome)throw Error('演武未正常结束。');
 const hp=Math.floor(b.team.reduce((n,u)=>n+u.hp/u.maxHp,0)/b.team.length*1000);
 return {period:cal.period,tier,outcome:b.outcome,elapsed:b.elapsed,hp,score:b.outcome==='victory'?weeklyScore(tier,b.elapsed,hp):0,log:b.log.slice(-8)};
}
export function verifiedBoard(rows,period){const list=[...rows].sort((a,b)=>b.score-a.score||a.slot-b.slot);let rank=0;return {period,verified:true,entries:list.map((r,i)=>{if(!i||r.score!==list[i-1].score)rank=i+1;return {id:r.slot,tier:r.tier,score:r.score,rank};})};}
