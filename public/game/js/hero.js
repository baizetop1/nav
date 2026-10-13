import {tierAttributes} from './hero-tiers.js?v=0.83.0';
import {chronicleGearMultiplier} from './chronicle-data.js?v=0.83.0';
import { recordRecruitSupport } from './recruit-support.js?v=0.83.0';
import { isExternal } from './roster.js?v=0.83.0';
import { recruitmentBanner, recruitStar } from './recruitment-banner.js?v=0.83.0';
import { experienceResult } from './progression.js?v=0.83.0';
import { applySets } from './equipment-sets.js?v=0.83.0';
import { qualityOf, QUALITIES } from './quality.js?v=0.83.0';
import { bounded, count, journal, pick, random, requireRule, weighted } from './utils.js?v=0.83.0';
import { heroRank } from './map.js?v=0.83.0';
import { unlockReason, skillLevel, trainedSkill } from './growth.js?v=0.83.0';
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
  const model = data.by.heroes[id], result = withEquipment ? tierAttributes(model,level) : { ...model.attribute };
  if(!withEquipment)for (const key of Object.keys(result)) result[key] += model.growth[key] * (level - 1);
  if (withEquipment) for (const equip of state.equipment.filter(e => e.hero === id)) {
    for (const [key, amount] of Object.entries(data.by.equipments[equip.item].attribute)) result[key] += Math.round(amount * (1 + equip.plus * .1) * chronicleGearMultiplier(state,equip.item));
  }
  for (const skillId of model.skills) {
    const skill=data.by.skills[skillId];
    // A temporary story guest never borrows the player's permanent training.
    if(skill.training?.tier!=='base'&&unlockReason(state,skill,!withEquipment))continue;
    const effect = trainedSkill(skill,withEquipment?skillLevel(state,skillId):1).effect;
    if (effect.kind === 'attribute') result[effect.attribute] = Math.round(result[effect.attribute] * (1 + effect.rate));
  }
  if(withEquipment)applySets(state,id,result);
  const mount=withEquipment&&state.growth?.mounts[id];
  if(mount?.riding){for(const key of ['hp','attack'])result[key]=Math.round(result[key]*(1+.02*mount.rank));result.speed+=mount.rank*2;}
  if(withEquipment){const q=QUALITIES[qualityOf(state.heroes[id])];for(const key of Object.keys(result))result[key]=Math.round(result[key]*(key==='speed'?q.speed:q.power));}
  return result;
}
export function gainExp(state, id, amount, data) {
  const h = state.heroes[id]; if (h.status !== 'owned') return;
  const before = h.level;
  const next=experienceResult(h,amount,data.config.balance.heroLevelCap);
  h.level=next.level;h.exp=next.exp;
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
export function recruit(state, data, target, bannerId) {
  const banner=recruitmentBanner(data,state.clock);
  requireRule(bannerId===undefined||bannerId===banner.id,'招贤活动已换期，请刷新页面查看当期人物；招贤令与保底已保留。');
  let chosen;
  if (target) {
    const hero=data.by.heroes[target];
    requireRule(hero&&!isExternal(hero),'外传人物在当期活动招贤或完成人物委托后入寨。');
    requireRule(banner.byStar[5].some(h=>h.id===target),'这位好汉未在本期招贤中，专属令保留至其活动开启。');
    requireRule(state.inventory[target+'_order'] > 0, '尚无这位好汉的专属招贤令。');
    state.inventory[target+'_order']--;
    const n = random(state), misses = state.recruit.fate[target] || 0;
    if (misses >= 4 || n < .25) chosen = hero;
    else if (n < .30) chosen = pick(state, banner.byStar[5].filter(h=>h.id!==target));
    else chosen = pick(state, banner.heroes.filter(h=>recruitStar(h)<5));
    state.recruit.fate[target] = chosen.id === target ? 0 : misses + 1;
  } else {
    requireRule(state.inventory.recruit_order > 0, '尚无招贤令，可从差事、剧情或集市取得。');
    state.inventory.recruit_order--;
    const star = rollOrdinary(state, data);
    chosen = pick(state, banner.byStar[star]);
  }
  const previousStatus=state.heroes[chosen.id].status;
  const previousTokens=state.inventory[chosen.id+'_token']||0,previousMerit=state.player.merit;
  state.recruit.rules=2;state.recruit.total++; count(state, 'recruit');
  ownHero(state, chosen.id, data);
  state.recruit.lastResult={hero:chosen.id,target:target||null,kind:previousStatus==='owned'?'duplicate':'joined',tokens:(state.inventory[chosen.id+'_token']||0)-previousTokens,merit:state.player.merit-previousMerit,inTeam:previousStatus!=='owned'&&state.heroes[chosen.id].status==='owned'&&state.team.includes(chosen.id),number:state.recruit.total};
  recordRecruitSupport(state,state.recruit.lastResult);
  return chosen.id;
}
export function syncAvailability(state, data) {
  for (const h of data.heroes) if (state.heroes[h.id].status === 'known' && ((state.inventory[h.id+'_token'] || 0) >= 10 || (state.inventory[h.id+'_order'] || 0) > 0)) knowHero(state, h.id, 'available', data);
}
