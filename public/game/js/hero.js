import { bounded, count, journal, pick, random, requireRule, weighted } from './utils.js?v=0.3.0';
import { heroRank } from './map.js?v=0.3.0';
export function knowHero(state, id, status, data) {
  const hero = state.heroes[id];
  if (heroRank[status] > heroRank[hero.status]) { hero.status = status; journal(state, `${data.by.heroes[id].name}：${({heard:'听闻',known:'相识',available:'可招贤',owned:'已入寨'})[status]}。`); }
}
export function ownHero(state, id, data) {
  const hero = state.heroes[id];
  if (hero.status === 'owned') { state.inventory[id+'_token'] = (state.inventory[id+'_token'] || 0) + 3; state.player.merit += 15; journal(state, `${data.by.heroes[id].name}已在寨中，旧友送来信物三枚、功勋十五。`); return; }
  knowHero(state, id, 'owned', data);
  if (state.team.length < 3) state.team.push(id);
  journal(state, `${data.by.heroes[id].title}·${data.by.heroes[id].name}正式入寨。`);
}
export function attributes(state, id, data, level = state.heroes[id].level, withEquipment = true) {
  const model = data.by.heroes[id], result = { ...model.attribute };
  for (const key of Object.keys(result)) result[key] += model.growth[key] * (level - 1);
  if (withEquipment) for (const equip of state.equipment.filter(e => e.hero === id)) {
    for (const [key, amount] of Object.entries(data.by.equipments[equip.item].attribute)) result[key] += Math.round(amount * (1 + equip.plus * .1));
  }
  for (const skillId of model.skills) {
    const effect = data.by.skills[skillId].effect;
    if (effect.kind === 'attribute') result[effect.attribute] = Math.round(result[effect.attribute] * (1 + effect.rate));
  }
  return result;
}
export function gainExp(state, id, amount, data) {
  const h = state.heroes[id]; if (h.status !== 'owned') return;
  h.exp += amount;
  const before = h.level;
  while (h.level < data.config.balance.heroLevelCap && h.exp >= 20 + h.level * 15) { h.exp -= 20 + h.level * 15; h.level++; }
  if (h.level === data.config.balance.heroLevelCap) h.exp = 0;
  if (before !== h.level) journal(state, `${data.by.heroes[id].name}的历练更进一层：${before} → ${h.level}级。`);
}
export function rollOrdinary(state, data) {
  const counters = state.recruit.pity;
  let star = weighted(state, data.config.balance.ordinaryRates).star;
  if (counters.five >= 99) star = 5;
  else if (counters.four >= 49) star = Math.max(star, 4);
  else if (counters.three >= 19) star = Math.max(star, 3);
  counters.three = star >= 3 ? 0 : counters.three + 1;
  counters.four = star >= 4 ? 0 : counters.four + 1;
  counters.five = star === 5 ? 0 : counters.five + 1;
  return star;
}
export function recruit(state, data, target) {
  let chosen;
  if (target) {
    requireRule(data.by.heroes[target] && heroRank[state.heroes[target].status] >= 2, '先在江湖与此人相识，再行专属招贤。');
    requireRule(state.inventory[target+'_order'] > 0, '尚无这位好汉的专属招贤令。');
    state.inventory[target+'_order']--;
    const n = random(state), misses = state.recruit.fate[target] || 0;
    if (misses >= 4 || n < .25) chosen = data.by.heroes[target];
    else if (n < .30) chosen = pick(state, data.heroes.filter(h => h.star === 5 && h.id !== target));
    else chosen = pick(state, data.heroes.filter(h => h.star < 5 && h.id !== target));
    state.recruit.fate[target] = chosen.id === target ? 0 : misses + 1;
  } else {
    requireRule(state.inventory.recruit_order > 0, '尚无招贤令，可从差事、剧情或集市取得。');
    state.inventory.recruit_order--;
    const star = rollOrdinary(state, data);
    chosen = pick(state, data.heroes.filter(h => h.star === star));
  }
  const previousStatus=state.heroes[chosen.id].status;
  const previousTokens=state.inventory[chosen.id+'_token']||0,previousMerit=state.player.merit;
  state.recruit.total++; count(state, 'recruit');
  if (heroRank[state.heroes[chosen.id].status] < 2) {
    knowHero(state, chosen.id, 'heard', data);
    state.inventory[chosen.id+'_token'] = (state.inventory[chosen.id+'_token'] || 0) + 2;
    journal(state, `${chosen.title}·${chosen.name}尚未与你相识。来人带回两枚信物，仍需亲自寻访。`);
  } else ownHero(state, chosen.id, data);
  // A factual receipt of this draw, separate from flavour text and later chapter rewards.
  state.recruit.lastResult={hero:chosen.id,target:target||null,kind:heroRank[previousStatus]<2?'clue':previousStatus==='owned'?'duplicate':'joined',tokens:(state.inventory[chosen.id+'_token']||0)-previousTokens,merit:state.player.merit-previousMerit,inTeam:previousStatus!=='owned'&&state.heroes[chosen.id].status==='owned'&&state.team.includes(chosen.id),number:state.recruit.total};
  return chosen.id;
}
export function syncAvailability(state, data) {
  for (const h of data.heroes) if (state.heroes[h.id].status === 'known' && ((state.inventory[h.id+'_token'] || 0) >= 10 || (state.inventory[h.id+'_order'] || 0) > 0)) knowHero(state, h.id, 'available', data);
}
