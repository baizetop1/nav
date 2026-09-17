import { totalExperience } from './progression.js?v=0.32.0';
import { dailyExperience } from './growth-rewards.js?v=0.32.0';
export const GROWTH_MILESTONES=[10,15,20,30,40];
export function growthBudget(s,d,id,target){
  const h=s.heroes[id],cap=d.config.balance.heroLevelCap;
  target=Math.max(h.level,Math.min(cap,target));
  const exp=Math.max(0,totalExperience({level:target,exp:0})-totalExperience(h)),pill=d.by.items.exp_pill,pills=Math.ceil(exp/pill.effect.exp),ownedPills=s.inventory.exp_pill||0,usablePills=Math.min(ownedPills,pills),missingPills=pills-usablePills;
  return {target,exp,pills,silver:pills*pill.price,ownedPills,usablePills,missingPills,missingSilver:missingPills*pill.price};
}
export function budgetPanel(s,d,id){
  const h=s.heroes[id];
  return '<details class="fold-section" data-fold="growth-budget-'+id+'"><summary>培养预算 · 到下一阶段还需多少</summary>'+GROWTH_MILESTONES.filter(level=>level>h.level).map(level=>{
    const q=growthBudget(s,d,id,level);
    return '<p class="note">到 '+level+' 级：还需 '+q.exp+' 经验，纯用丹约 '+q.pills+' 颗；背包可用 '+q.usablePills+' 颗，还缺 '+q.missingPills+' 颗'+(q.missingPills?'，补买需 '+q.missingSilver+' 碎银':'，无需补买')+'。</p>';
  }).join('')+'<p class="note">背包共有 '+(s.inventory.exp_pill||0)+' 颗经验丹，每颗 '+d.by.items.exp_pill.effect.exp+' 经验。预算已扣当前经验与背包丹药；全寨共用，尚未分配给任何英雄。培养多人时不能重复计算这些丹药。最后一颗可能有剩余经验，满级溢出不保留。不含升品、招式或练兵材料。</p><p class="note">第三至六卷战役胜利按关卡等级发放参战经验，失败不发放。材料本胜利也给经验；出征、差事、寨务和传习可减少实际用丹。</p><p class="note">演武旧场一 / 二 / 三阶每次胜利获 2 / 4 / 6 颗丹，参战好汉每人另获 '+[1,2,3].map(t=>dailyExperience('manual',t)).join(' / ')+' 经验。每次消耗 10 体力；周二、五、日开放，每个开放日三档共用三次。</p></details>';
}
