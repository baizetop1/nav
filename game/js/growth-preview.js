import { attributes } from './hero.js?v=0.32.0';
import { heroCommand, staminaCap } from './logistics.js?v=0.32.0';
import { ATTRIBUTE_NAMES } from './progression.js?v=0.32.0';
import { unlockReason } from './growth.js?v=0.32.0';
export function growthDelta(before,after,d,id){const x=attributes(before,id,d),y=attributes(after,id,d);return [...Object.entries(ATTRIBUTE_NAMES).map(([k,name])=>({name,value:x[k]+' → '+y[k]})),{name:'个人统兵上限',value:heroCommand(before,id)+' → '+heroCommand(after,id)},{name:'寨主体力上限',value:staminaCap(before)+' → '+staminaCap(after)}];}
export function gainedSkills(before,after,d,id){return d.by.heroes[id].skills.map(k=>d.by.skills[k]).filter(k=>unlockReason(before,k)&&!unlockReason(after,k)).map(k=>k.name);}
export function promotionPreview(s,d,id){const h=s.heroes[id];if(h.status!=='owned'||(h.quality||0)>=2)return '';const after={...s,heroes:{...s.heroes,[id]:{...h,quality:(h.quality||0)+1}}};return '<details data-fold="promotion-preview-'+id+'"><summary>查看本次升品提升</summary>'+growthDelta(s,after,d,id).map(r=>'<p class="note">'+r.name+'：'+r.value+'</p>').join('')+'<p class="note">保持等级、装备、坐骑和招式不变；体力扩容不补充当前体力。满足下方条件并点击升品才扣材料。</p></details>';}
export function upcomingSkills(s,d,id){const remaining=d.by.heroes[id].skills.map(k=>d.by.skills[k]).filter(k=>unlockReason(s,k));return '<p class="note"><b>后续招式：</b>'+ (remaining.map(k=>k.name+'（'+k.training.level+'级；'+unlockReason(s,k)+'）').join('；')||'当前四项招式均已解锁，可继续升级招式。')+'</p>';}
