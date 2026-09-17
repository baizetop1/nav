import { hasOwn } from './utils.js?v=0.32.0';
import { experienceToNext } from './progression.js?v=0.32.0';
import { CHAPTER_MISSIONS, isChapterBattle } from './volume-three-data.js?v=0.32.0';
// Fixed stage rewards: stronger heroes never inflate repeatable low-tier yields.
const DAILY_EXPERIENCE={ore:[120,240,420],manual:[180,360,600],stable:[120,240,420]};
export function dailyExperience(id,tier){return hasOwn(DAILY_EXPERIENCE,id)&&Number.isInteger(tier)?DAILY_EXPERIENCE[id][tier-1]||0:0;}
export function battleExperience(b){
  if(!b||b.guest)return 0;
  if(isChapterBattle(b))return experienceToNext(CHAPTER_MISSIONS[b.context.id].level);
  return b.context?.type==='rotation'&&b.context.kind==='daily'?dailyExperience(b.context.id,b.context.tier):0;
}
