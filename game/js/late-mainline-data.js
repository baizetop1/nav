import {missions as first} from './volumes-eight-ten-content.js?v=0.58.0';
import {missions as last,ENDING_DEFINITIONS} from './volumes-eleven-twelve-content.js?v=0.58.0';
export {ENDING_DEFINITIONS};
export const LATE_MISSIONS={...first,...last};
export const lateStory=id=>/^v(?:8|9|10|11|12)_/.test(id||'');
export const chapterStory=id=>/^v(?:[3-9]|1[012])_/.test(id||'');
export const LATE_BOSSES={v8_shiwengong:'raider',v9_captain:'chief',v9_jailer:'chief',v10_commander:'raider',v11_grain_chief:'chief',v12_siege_captain:'chief',v12_water_captain:'raider',v12_levy_captain:'chief',v12_rear_captain:'raider'};
export const LATE_ARMS={v8_shiwengong:'cavalry',v8_crossbow:'ranged',v8_runner:'cavalry',v9_messenger:'ranged',v9_crossbow:'ranged',v10_raider_archer:'ranged',v10_pursuer:'cavalry',v11_marksman:'ranged',v12_siege_bow:'ranged',v12_firebow:'ranged',v12_road_bow:'ranged'};
export function lateMissionPlan(s,id,d,tier=s.battle?.context.tier){
 const replay=id?.startsWith('echo_');if(replay)id=id.slice(5);
 const m=LATE_MISSIONS[id];if(!m)return null;
 const base=Object.values(d.by.stories[id].steps).flatMap(x=>x.choices).find(c=>c.battle).battle.enemies;
 const variant=Object.entries(m.variants||{}).find(([flag])=>s.progress.flags[flag])?.[1]||{};
 const p={...m,...variant,enemies:[...(variant.enemies||base)],waves:(variant.waves||m.waves||[]).map(x=>[...x]),escort:m.escort?{...m.escort,damage:Math.round(m.escort.damage*(variant.escortDamageMultiplier||1))}:null,shield:0,waveHeal:0};
 for(const effect of Object.values(m.preparation||{}))if(s.progress.flags[effect.flag]){
  if(effect.removeEnemy)p.enemies=p.enemies.filter(x=>x!==effect.removeEnemy);
  if(effect.shield)p.shield=effect.shield;if(effect.waveHeal)p.waveHeal=effect.waveHeal;
  if(effect.rageReduction)p.bossRage=Math.max(0,(p.bossRage||0)-effect.rageReduction);
 }
 if(replay)p.scale*=tier===2?1:.65;return p;
}
