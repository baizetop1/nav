export const hasRecruitmentBanners=s=>s.recruit?.rules===2;
export const hasPromotionCores=s=>!!s.progress?.flags?.promotion_cores_v1||Object.entries(s.inventory||{}).some(([id,n])=>id.startsWith('core_')&&n>0);
export const hasDifficultyTiers=s=>s.battle?.difficultyRules===1;
export function gameplayRulesPreserved(before,after){
 if(before.recruit?.rules===2&&after.recruit?.rules!==2)return false;
 if(before.progress?.flags?.promotion_cores_v1&&!after.progress?.flags?.promotion_cores_v1)return false;
 const b=before.battle,a=after.battle;
 if(b?.difficultyRules===1&&a&&b.context.type===a.context.type&&b.context.id===a.context.id&&a.difficultyRules!==1)return false;
 return true;
}
