import {regionBonus} from './exploration-data.js?v=0.69.0';
import {GATHERING_REGIONS,gatheringProgress} from './gathering-data.js?v=0.69.0';
import {HERO_SPECIALTIES} from './strategy-data.js?v=0.69.0';
export const IDLE_CYCLE=30*60000,IDLE_CAP=8*3600000;
export const IDLE_ROUTES={
 mine:{name:'旧矿洞',kind:'special',job:'workshop',items:{scrap_iron:2,iron:1},use:'碎铁配木材可加工精铁；精铁用于练兵、强化与打造。'},
 marsh:{name:'芦苇泽',kind:'special',job:'farm',items:{herb:2,cloth:1},use:'药草与布匹可制作补给，备好后再去挑战首领。'},
 ruins:{name:'荒祠地宫',kind:'special',job:'lumber',items:{cloth:2,horse_feed:1},use:'布匹用于军需加工，草料用于坐骑培养。'},
 forest:{name:'青石古道',kind:'journey',job:'lumber',items:{leather:2,herb:1},use:'皮革用于装备加工，药草用于制作补给。'},
 water:{name:'芦荡渡口',kind:'journey',job:'farm',items:{cloth:2,herb:1},use:'布匹与药草用于军需加工和出行补给。'},
 mountain:{name:'断崖粮道',kind:'journey',job:'workshop',items:{scrap_iron:2,iron:1},use:'碎铁可加工精铁，供练兵、强化与打造使用。'}
};
export const idleUnlocked=(s,id)=>!!IDLE_ROUTES[id]&&(IDLE_ROUTES[id].kind==='special'?[1,2,3].some(t=>(s.specialDungeons?.clears[id+'_'+t]||0)>0):(s.realm?.journey?.best[id]||0)>0);
export function idleRates(region,hero,s){const r=IDLE_ROUTES[region],p=gatheringProgress(s,region),items={...r.items};if(HERO_SPECIALTIES[hero]?.job===r.job)items[Object.keys(items)[0]]++;if(p.best>=2)items[Object.keys(items)[0]]++;const bonus=regionBonus(s,region);items[Object.keys(items)[0]]+=bonus.base;items[GATHERING_REGIONS[region].item]=(p.runs>=3?2:1)+bonus.special;return items;}
export const idleHero=s=>s.idleDispatch?.mission?.hero;
export const idleAvailable=(s,id)=>s.heroes[id]?.status==='owned'&&!s.team.includes(id)&&s.affairs?.mission?.hero!==id&&!s.realm?.squad?.team.includes(id)&&!s.realm?.trek?.team.includes(id)&&!s.expansion?.run?.team.includes(id)&&!s.progress.flags['camp_steward_'+id]&&!Object.values(s.frontier?.stations||{}).some(v=>v.worker==='hero:'+id)&&!Object.values(s.frontier?.posts||{}).some(v=>v.guard===id)&&idleHero(s)!==id;
