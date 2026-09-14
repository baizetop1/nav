// Shared by reward settlement, item previews and the character panel.
// Existing levels and remaining experience are retained; no retroactive repricing.
export function experienceToNext(level) {
  if(!Number.isSafeInteger(level)||level<1)throw Error('无效的人物等级。');
  return 100 + 15 * level + level * level;
}
export function experienceResult(hero,amount,cap) {
  if(!Number.isSafeInteger(amount)||amount<0)throw Error('无效的历练经验。');
  let level=hero.level,exp=hero.exp+amount;
  while(level<cap&&exp>=experienceToNext(level)){exp-=experienceToNext(level);level++;}
  const overflow=level>=cap?exp:0;
  return {level,exp:level>=cap?0:exp,overflow};
}
export const ATTRIBUTE_NAMES={hp:'气血',attack:'攻击',defense:'防御',speed:'速度',strategy:'谋略'};
