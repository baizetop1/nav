import { upcomingSkills } from './growth-preview.js?v=0.44.0';
import { budgetPanel } from './economy.js?v=0.44.0';
import { experienceToNext, ATTRIBUTE_NAMES } from './progression.js?v=0.44.0';
import { attributes } from './hero.js?v=0.44.0';
export function experienceLabel(h,cap){return h.level>=cap?'已满级 · '+cap+' 级':h.level+'级 · 经验 '+h.exp+' / '+experienceToNext(h.level);}
export function progressionPanel(s,d,id){
  const h=s.heroes[id],model=d.by.heroes[id],cap=d.config.balance.heroLevelCap,full=h.level>=cap,need=full?0:Math.max(0,experienceToNext(h.level)-h.exp),pill=d.by.items.exp_pill.effect.exp;
  const current=attributes(s,id,d),nextState={...s,heroes:{...s.heroes,[id]:{...h,level:Math.min(cap,h.level+1)}}},next=attributes(nextState,id,d);
  const row=(label,values)=>'<p class="note"><b>'+label+'</b> '+Object.entries(ATTRIBUTE_NAMES).map(([k,n])=>n+' '+values(k)).join(' · ')+'</p>';
  return '<section class="hero-progression" aria-label="等级成长"><p class="note">'+(full?'已达 '+cap+' 级上限，经验丹不会继续消耗。':'距下一级还需 '+need+' 经验；仅用经验丹约需 '+Math.ceil(need/pill)+' 颗。')+'</p>'+(!full?'<progress value="'+Math.min(h.exp,experienceToNext(h.level))+'" max="'+experienceToNext(h.level)+'" aria-label="人物升级经验"></progress>':'')+'<details data-fold="progression-'+id+'"><summary>查看升级属性与经验梯度</summary>'+row('当前等级基础：',k=>model.attribute[k]+model.growth[k]*(h.level-1))+row('每级基础成长：',k=>'+'+model.growth[k])+(!full?row('下一级面板预计：',k=>current[k]+' → '+next[k]):'')+'<p class="note">上方面板已计入装备、招式、套装、坐骑与品质；下一级预估保持当前配置，包含等级解锁的属性招式，实战另计兵种、军令与临时效果。</p><p class="note">每颗经验丹提供 '+pill+' 经验。升级需求逐级增加：1→2 级需 '+experienceToNext(1)+'，10→11 级需 '+experienceToNext(10)+'，20→21 级需 '+experienceToNext(20)+'，30→31 级需 '+experienceToNext(30)+'。</p><p class="note">旧档保留已有等级和剩余经验，后续升级使用新梯度。凡、灵、仙使用相同经验曲线，升品不重置等级。</p>'+upcomingSkills(s,d,id)+'</details>'+(!full?budgetPanel(s,d,id):'')+'</section>';
}
