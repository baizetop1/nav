import {GEAR_TRAITS,traitText} from './tactics-data.js?v=0.58.0';
import {requireRule,journal} from './utils.js?v=0.58.0';
export function refineQuote(s,id,material){const e=s.equipment.find(e=>e.uid===id),rank=(e?.refine||0)+1,candidates=s.equipment.filter(x=>x.uid!==id&&x.item===e?.item&&!x.hero&&!x.locked&&!(x.refine>0)&&x.plus===0),copy=material?candidates.find(x=>x.uid===material):candidates[0],silver=rank*100,scrap=rank*5;
 const reason=!e||!Object.hasOwn(GEAR_TRAITS,e.item)?'这件装备没有可精修的特效':rank>3?'已达精修三阶':!copy?'需要一件未穿戴、未锁定、未强化和未精修的同款装备':s.player.silver<silver?'碎银不足':(s.inventory.scrap_iron||0)<scrap?'碎铁不足':'';
 return {e,copy,rank,silver,scrap,reason};
}
export function refineEquipment(s,d,a){const q=refineQuote(s,a.id,a.material);requireRule(!!a.material&&!q.reason,q.reason||'请选择要消耗的同款装备');s.player.silver-=q.silver;s.inventory.scrap_iron-=q.scrap;s.equipment=s.equipment.filter(e=>e.uid!==q.copy.uid);q.e.refine=q.rank;journal(s,d.by.equipments[q.e.item].name+'精修至 '+q.rank+' 阶，消耗同款 '+q.copy.uid+'、碎铁 '+q.scrap+'、碎银 '+q.silver+'。');}
export function refinePanel(s,d,e,btn){if(!GEAR_TRAITS[e.item])return '';const q=refineQuote(s,e.uid);return '<details class="gear-refine"><summary>精修特效 · '+(e.refine||0)+'/3 阶</summary><p class="note">'+traitText(e)+'</p>'+(q.rank<=3?'<p class="note">消耗同款 1 件、碎铁 '+q.scrap+'、碎银 '+q.silver+'；必定成功。锁定、穿戴、强化或精修过的装备不会选作材料。</p>'+ (q.copy?'<p>本次材料：'+d.by.equipments[q.copy.item].name+'（'+q.copy.uid+'）</p>':'')+'<p class="note">'+q.reason+'</p>'+btn('确认消耗并精修',{type:'equipRefine',id:e.uid,material:q.copy?.uid},'secondary',!!q.reason):'<p class="note">已达三阶。</p>')+'</details>';}

