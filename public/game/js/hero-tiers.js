import {heroAptitude} from './hero-aptitude.js?v=0.84.0';
// Collection tier is separate from cultivation quality and historical aptitude.
export const HERO_TIERS={
 canonical:{id:'canonical',name:'正册',rarity:5,power:1.2,description:'梁山一百零八将'},
 external:{id:'external',name:'外传',rarity:4,power:.9,description:'江湖外传人物'},
 wanderer:{id:'wanderer',name:'散人',power:.65,description:'乡勇与江湖散人'}
};
const BASE={fighter:{hp:900,attack:110,defense:60,speed:70,strategy:40},defender:{hp:1100,attack:90,defense:90,speed:50,strategy:40},ranger:{hp:760,attack:100,defense:50,speed:95,strategy:50},support:{hp:800,attack:70,defense:60,speed:65,strategy:95},strategist:{hp:700,attack:55,defense:50,speed:80,strategy:125}};
const GROWTH={fighter:{hp:42,attack:7,defense:3,speed:3,strategy:2},defender:{hp:50,attack:5,defense:5,speed:2,strategy:2},ranger:{hp:38,attack:7,defense:3,speed:4,strategy:2},support:{hp:40,attack:4,defense:4,speed:3,strategy:7},strategist:{hp:30,attack:3,defense:3,speed:3,strategy:9}};
export function heroTier(hero){const tier=hero?.group!=='external'?HERO_TIERS.canonical:hero.obtain?.type==='wanderer'?HERO_TIERS.wanderer:HERO_TIERS.external;return {...tier,rarity:tier.rarity||hero.star};}
export function tierAttributes(hero,level){
 const tier=heroTier(hero),power=tier.power*(heroAptitude(hero)?.power||1),result={};
 for(const key of Object.keys(hero.attribute)){
  const base=tier.id==='canonical'?Math.max(hero.attribute[key],BASE[hero.type][key]):hero.attribute[key];
  const growth=tier.id==='canonical'?Math.max(hero.growth[key],GROWTH[hero.type][key]):hero.growth[key];
  result[key]=Math.round((base+growth*(level-1))*(key==='speed'?1:power));
 }
 return result;
}
export function tierBadge(hero){const tier=heroTier(hero);return '<span class="hero-tier hero-tier-'+tier.id+'" aria-label="'+tier.name+'，'+tier.rarity+'星档">'+tier.name+'</span>';}
