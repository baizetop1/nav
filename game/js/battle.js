import { attributes, gainExp } from './hero.js';
import { bounded, count, pick, random, requireRule } from './utils.js';

const alive = unit => unit.hp > 0;
export function damage(attack, defense, rate, variance = 1, critical = false) {
  return Math.max(1, Math.round(Math.max(1, attack * rate - defense * .5) * variance * (critical ? 1.5 : 1)));
}
export function addStatus(unit, status) {
  if (status.id === 'poison') { unit.statuses.push({ ...status }); return; }
  const old = unit.statuses.find(s => s.id === status.id);
  if (old) old.turns = Math.max(old.turns, status.turns); else unit.statuses.push({ ...status });
}
const has = (unit, id) => unit.statuses.some(s => s.id === id);
const log = (battle, text) => { battle.log.push(text); if (battle.log.length > 120) battle.log.shift(); };
function unit(id, name, attribute, skills, side) { return { id, name, ...attribute, maxHp:attribute.hp, rage:0, skills, side, statuses:[] }; }
export function startBattle(state, data, { enemies, guest, scale = 1, context }) {
  requireRule(!state.battle && !state.scheme, '先结束当前战局。');
  const team = guest ? [unit(guest.id, data.by.heroes[guest.id].name, attributes(state,guest.id,data,guest.level,false),data.by.heroes[guest.id].skills,'team')]
    : state.team.map(id => unit(id,data.by.heroes[id].name,attributes(state,id,data),data.by.heroes[id].skills,'team'));
  requireRule(team.length > 0, '先与白胜相识、邀他作向导，或在招贤馆招募好汉并编队。');
  state.battle = { round:1, team, enemy:enemies.map((id,i) => {
    const e = data.by.enemies[id], stats = Object.fromEntries(Object.entries(e.attribute).map(([key,value]) => [key,Math.round(value * (key === 'speed' ? 1 : scale))]));
    return { ...unit(id+'_'+i,e.name,stats,e.skills,'enemy'),model:id };
  }),context,guest:!!guest,outcome:null,log:['【交战开始】你在阵后指挥，好汉各按位置迎敌。'] };
}
function act(unit, opponents, friends, command, state, data) {
  const b = state.battle;
  for (const status of unit.statuses) {
    if (status.id === 'bleeding' || status.id === 'poison') {
      const loss = status.id === 'bleeding' ? Math.max(1,Math.round(unit.maxHp * .02)) : status.value;
      unit.hp = Math.max(0,unit.hp-loss); log(b,`${unit.name}【${status.id === 'bleeding'?'流血':'中毒'}】损失 ${loss} 点气血。`);
    }
  }
  const stunned = has(unit,'stun');
  // Status duration is consumed on this unit's action, not prematurely at round end.
  const expire = () => { unit.statuses = unit.statuses.map(s=>({...s,turns:s.turns-1})).filter(s=>s.turns>0); };
  if (!alive(unit)) { expire(); return; }
  if (stunned) { log(b,`${unit.name}【眩晕】一时无法行动。`); expire(); return; }
  if (!opponents.some(alive)) { expire(); return; }
  if (unit.side === 'team' && (command === 'guard' || command === 'item')) { unit.rage=bounded(unit.rage+20,0,100);log(b,`${unit.name}收势守阵，怒气 +20。`);expire();return; }
  let skill;
  if (unit.side === 'team') {
    const active = unit.skills.map(id=>data.by.skills[id]).filter(s=>s.type!=='passive');
    skill = active.find(s=>unit.rage>=s.cost && (command==='scheme'?s.type==='strategy'||s.effect.kind==='heal':s.type!=='strategy'));
    if (command === 'scheme' && !skill) { unit.rage=bounded(unit.rage+20,0,100);log(b,`${unit.name}蓄势观察，怒气 +20；本回合留意对方破绽。`);expire();return; }
  } else if (unit.rage >= 40) skill = data.by.skills[pick(state,unit.skills)];
  if (skill) unit.rage -= skill.cost; else unit.rage = bounded(unit.rage+10,0,100);
  const effect = skill?.effect || {kind:'damage',rate:1};
  if (effect.kind === 'heal') {
    const target = friends.filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    const heal = Math.min(target.maxHp-target.hp,Math.round(target.maxHp*effect.rate)); target.hp += heal;
    log(b,`${unit.name}施展【${skill.name}】，照应${target.name}，回复 ${heal} 点气血。`);
    expire();return;
  }
  // Front positions absorb most attacks; the third position is a safer strategist slot.
  const targets = opponents.filter(alive), target = random(state)<.8 ? targets[0] : pick(state,targets);
  const critical = random(state)<.05;
  const def = target.defense * (has(target,'armor_break')?.7:1);
  const attack = (effect.kind==='strategy'?unit.strategy:unit.attack) * (has(unit,'rage')?1.2:1);
  let loss=damage(attack,def,effect.rate,.9+random(state)*.2,critical);
  if (unit.side==='enemy') {
    if (command==='guard' || command==='item') loss=Math.max(1,Math.round(loss*.5));
    if (command==='scheme') loss=Math.max(1,Math.round(loss*.8));
    if (unit.model.startsWith('tiger')) {
      const phase=(b.round-1)%3;
      if ((phase===0&&command==='guard')||(phase===2&&command==='scheme')) { loss=Math.max(1,Math.round(loss*.4));log(b,'判断得当，大虫的凶势被避开。'); }
    }
  } else if (b.enemy.some(e=>e.model.startsWith('tiger')) && (b.round-1)%3===1 && command==='attack') loss=Math.round(loss*1.25);
  target.hp=Math.max(0,target.hp-loss);target.rage=bounded(target.rage+15,0,100);
  log(b,`${unit.name}${skill?'施展【'+skill.name+'】':'挺身进击'}，${critical?'【暴击】':''}${target.name}损失 ${loss} 点气血。`);
  if (effect.status && alive(target)) { addStatus(target,effect.status);log(b,`${target.name}受到【${statusName(effect.status.id)}·${effect.status.turns}回合】。`); }
  if (!alive(target)) log(b,`${target.name}已无力再战。`);
  expire();
}
export function statusName(id) { return ({bleeding:'流血',poison:'中毒',armor_break:'破甲',stun:'眩晕',rage:'狂怒'})[id] || id; }
export function takeTurn(state, data, command, itemId) {
  const b = state.battle;
  requireRule(b && !b.outcome, '当前没有可指挥的战斗。');
  requireRule(['attack','guard','scheme','item','retreat'].includes(command),'无效指令。');
  if (command==='retreat') { b.outcome='retreat';log(b,'你下令退回安全处。此战未取胜，已消耗的药物与历练次数不会返还。');return; }
  if (command==='item') {
    const item=data.by.items[itemId];requireRule(item && (item.effect.hp||item.effect.rage||item.effect.cleanse),'这件物品不能在战斗中使用。');
    requireRule(state.inventory[itemId]>0,'行囊中没有这件药物。');
    const living=b.team.filter(alive);
    let target = item.effect.cleanse ? living.find(u=>u.statuses.length) : item.effect.rage ? [...living].sort((a,b)=>a.rage-b.rage)[0] : [...living].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    requireRule(target && (item.effect.cleanse?target.statuses.length:item.effect.rage?target.rage<100:target.hp<target.maxHp),'目前没有需要此药的同伴，不消耗道具或回合。');
    state.inventory[itemId]--;
    if(item.effect.hp)target.hp=Math.min(target.maxHp,target.hp+item.effect.hp);
    if(item.effect.rage)target.rage=Math.min(100,target.rage+item.effect.rage);
    if(item.effect.cleanse)target.statuses=[];
    log(b,`你让人将${item.name}交给${target.name}，众好汉同时收势掩护。`);
  }
  log(b,`【第 ${b.round} 回合】`);
  const queue=[...b.team,...b.enemy].filter(alive).sort((a,b)=>b.speed-a.speed);
  if(queue.length>1&&queue[0].speed-queue[1].speed>30) {queue[0].rage=Math.min(100,queue[0].rage+5);log(b,`${queue[0].name}凭速度占得先机，怒气 +5。`);}
  for(const u of queue) { if(alive(u)) act(u,u.side==='team'?b.enemy:b.team,u.side==='team'?b.team:b.enemy,command,state,data); if(!b.team.some(alive)||!b.enemy.some(alive))break; }
  if(!b.team.some(alive)) {b.outcome='defeat';log(b,'众好汉渐渐支撑不住。你只得收拢人手退下，记住这次交战的门道。');}
  else if(!b.enemy.some(alive)) {b.outcome='victory';log(b,'敌阵已散，此战得胜。');}
  else if(b.round>=100){b.outcome='retreat';log(b,'交战已久，双方难分胜负，你下令撤出。');}
  else b.round++;
}
