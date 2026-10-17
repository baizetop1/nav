import {professionProfile} from './camp-work-data.js?v=0.91.0';
// Level and quality bonuses are bounded and require the hero to be present.
export function stewardshipBonus(s,id){const h=s.heroes[id];return h?.status==='owned'?20+Math.floor((h.level-1)/5)*2+(h.quality||0)*5:0;}
export function workerGrowth(s,id){const h=s.heroes[id];return h?.status==='owned'?Math.floor((h.level-1)/10)+(h.quality||0):0;}

// Small bounded integers preserve existing station banks and processing costs.
export function productionWorkBonus(s,hero,job){
 const p=professionProfile(hero);if(!p||s.heroes[hero.id]?.status!=='owned')return {rarity:0,specialty:0,profile:p};
 const rarity=[0,0,1,1,2,3][p.rarity],specialty=p.implemented&&p.job===job?2:0;
 return {rarity,specialty,profile:p};
}
