export function validateGrowthBattle(b,data,check){
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  check(b.rules===undefined||b.rules===2,'战斗规则版本');
  if(b.rules===undefined){
    for(const u of [...(b.team||[]),...(b.enemy||[])])check(u.training===undefined&&u.boss===undefined&&u.resistUntil===undefined,'旧战局不可混入新养成快照');
    return;
  }
  check(b.mode==='realtime'&&Array.isArray(b.team)&&Array.isArray(b.enemy),'养成战局格式');
  for(const u of b.team){
    const t=u.training,h=data.by.heroes[u.id];
    check(h&&object(t)&&object(t.levels)&&Array.isArray(u.skills)&&u.skills.length<=4&&new Set(u.skills).size===u.skills.length,'人物战斗养成快照');
    check(Object.keys(t.levels).length===u.skills.length&&u.skills.every(id=>h.skills.includes(id)&&integer(t.levels[id],1,5)),'战斗招式归属或等级');
    check(t.bond===null||(t.bond===u.id+'_bond'&&u.skills.includes(t.bond)),'战斗羁绊');
    check(u.skills.includes(u.id+'_bond')===(t.bond!==null),'羁绊快照缺失');
    if(b.guest)check(t.bond===null&&u.skills.every(id=>data.by.skills[id].training.tier==='base'&&t.levels[id]===1),'临时助阵不可借用养成');
    check(u.boss===undefined&&u.resistUntil===undefined,'我方不可带首领机制');
  }
  for(const u of b.enemy){
    check(u.training===undefined,'敌方不可带人物养成');
    if(u.boss!==undefined){const boss=u.boss,kind=({tiger_king:'tiger',bandit_chief:'chief',road_raider:'raider'})[u.model];
      check(['dungeon','rotation'].includes(b.context?.type)&&object(boss)&&kind&&boss.kind===kind&&integer(boss.phase,0,1)&&integer(boss.readyAt,0,190000)&&integer(boss.pendingAt,0,190000),'首领快照');
      if(u.hp>0&&!b.outcome)check((boss.pendingAt||boss.readyAt)>=b.elapsed,'首领行动时钟');
    }
    if(u.resistUntil!==undefined)check(u.boss&&integer(u.resistUntil,0,190000),'首领抗控时钟');
  }
}
