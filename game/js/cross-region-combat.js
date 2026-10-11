export function prepareMedicineBoat(b,addStatus){if(b.context.route!=='medicineboat')return;b.enemy[0].name='劫药头目';b.enemy.at(-1).name='夺药弩手';addStatus(b.enemy.at(-1),{id:'stun',value:1,turns:3},0);for(const u of b.team)addStatus(u,{id:'guard',value:.2,turns:4},0);b.log.push('【同伴接应】时迁剪断哨绳，弩手迟了六秒；阮小七稳住船身，全队前八秒减伤 20%。');}
export function medicineBoatMove(state,u,api,strike){const b=state.battle;if(b.context.route!=='medicineboat')return false;const boss=u.boss,active=(v,id)=>v.statuses.some(s=>s.id===id&&s.expiresAt>b.elapsed);
 if(!boss.pendingAt&&boss.readyAt===b.elapsed){boss.pendingAt=b.elapsed+3000;api.log(b,'【首领蓄势 · 3秒】头目指向伤重的同伴，弩手将连射两箭。先击倒或眩晕弩手，也可打断头目、切换固守。');return true;}
 if(boss.pendingAt!==b.elapsed)return true;boss.pendingAt=0;boss.readyAt=b.elapsed+12000;
 if(active(u,'stun')){api.log(b,'【蓄势中断】头目没能发出号令。');return true;}
 const archer=b.enemy.at(-1);if(archer.hp<=0||active(archer,'stun')){api.addStatus(u,{id:'armor_break',value:1,turns:3},b.elapsed);api.log(b,'【弩手失援】药船驶过射口，头目破甲六秒。');return true;}
 for(let i=0;i<2;i++){const target=b.team.filter(t=>t.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];if(target)strike(state,archer,target,{kind:'damage',rate:b.orders?.stance==='guard'?.5:1},'夺药连射',api);}api.log(b,'【夺药连射】弩手射出两箭。固守可减轻本招一半伤害。');return true;
}
export const medicineBoatThreat=b=>b.context.route==='medicineboat'?['夺药连射','最后一名弩手连射气血比例最低者两次。击倒或眩晕弩手可让头目破甲六秒；也可打断头目，或固守减伤 50%。']:null;
