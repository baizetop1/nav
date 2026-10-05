import {PERSONAL} from './expansion-data.js?v=0.64.0';
import {SPECIAL_DUNGEONS} from './special-dungeons-data.js?v=0.64.0';
import {replaysPreserved} from './replays-save.js?v=0.64.0';
const gear=['furnace_hammer','reed_medicine_case','vault_strategy'];
export const hasEndgame=s=>!!s.replays||!!s.expansion?.styles||Object.keys(s.expansion?.personal||{}).some(id=>PERSONAL[id]?.introduced>=3)||[s.battle,s.lastBattle].some(b=>b?.context.type==='replay'||PERSONAL[b?.context.id]?.introduced===3||SPECIAL_DUNGEONS[b?.context.id]?.parent)||Object.keys(s.specialDungeons?.clears||{}).some(k=>SPECIAL_DUNGEONS[k.slice(0,-2)]?.parent)||s.equipment.some(e=>gear.includes(e.item));
export const endgamePreserved=(a,b)=>replaysPreserved(a,b)&&Object.entries(a.expansion?.personal||{}).every(([k,v])=>!v||b.expansion?.personal?.[k]===true)&&Object.keys(a.expansion?.styles||{}).every(k=>!!b.expansion?.styles?.[k]);
